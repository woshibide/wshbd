import path from "node:path";
import { readFile, mkdir, cp, rename, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import nunjucks from "nunjucks";
import * as esbuild from "esbuild";
import { minify } from "html-minifier-terser";
import { parse, serialize } from "parse5";
import {
  root,
  cache,
  stage,
  origin,
  files,
  json,
  save,
  legacyAssets,
} from "./paths.mjs";
import { catalogue, exists, mediaDirectory } from "./media.mjs";
import { withBuildLock } from "./lock.mjs";
import { publicOriginal } from "./publication.mjs";

export const nodes = (node) => [
  node,
  ...(node.childNodes || []).flatMap(nodes),
];
export const attr = (node, name) =>
  node.attrs?.find((item) => item.name === name)?.value;
export const setAttr = (node, name, value) => {
  node.attrs ||= [];
  const item = node.attrs.find((item) => item.name === name);
  if (item) item.value = String(value);
  else node.attrs.push({ name, value: String(value) });
};
export const removeAttr = (node, name) => {
  node.attrs = (node.attrs || []).filter((item) => item.name !== name);
};
const cssGroups = {
  home: ["home", "home-intro"],
  about: ["intro", "lists", "about", "links", "footer", "images"],
  archive: ["intro", "archive", "footer", "images", "video"],
  selected: ["selected-video", "selected", "images", "motion"],
  project: ["project", "footer", "images", "video"],
  error: ["intro", "links"],
};
const templateEnvironment = () =>
  new nunjucks.Environment(
    new nunjucks.FileSystemLoader([
      path.join(root, "src"),
      path.join(root, "src/templates"),
    ]),
    {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
    },
  );
const compressHtml = (html) =>
  minify(html, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: false,
    minifyCSS: true,
    minifyJS: false,
    keepClosingSlash: true,
  });
function normalizeProjects(raw, media) {
  if (!Array.isArray(raw.projects))
    throw new Error("archive.json must contain projects array");
  const occurrences = new Map();
  return raw.projects.map((project) => {
    if (!/^[A-Za-z]+\d+$/.test(project.id))
      throw new Error(`Invalid project id: ${project.id}`);
    for (const key of ["brand", "title", "date"])
      if (typeof project[key] !== "string")
        throw new Error(`${project.id}: missing ${key}`);
    const id = project.id.toUpperCase();
    const count = (occurrences.get(id) || 0) + 1;
    occurrences.set(id, count);
    const projectMedia = Object.entries(media)
      .filter(
        ([url]) =>
          url.startsWith(`/content/projects/${id}/`) &&
          !/-poster\.(webp|png|jpg)$/i.test(url),
      )
      .sort(([a], [b]) =>
        a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }),
      )
      .map(([, value]) => value);
    return {
      ...project,
      id,
      domId: count > 1 ? `${id}-${count}` : id,
      shown: project.shown === true,
      letter: id.match(/[A-Z]+/)[0],
      number: id.match(/\d+/)[0],
      tags: Array.isArray(project.hashtags)
        ? project.hashtags
        : String(project.hashtags || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
      media: projectMedia.length
        ? projectMedia
        : [
            {
              path: "/content/misc/non-image.svg",
              type: "image",
              width: 100,
              height: 100,
            },
          ],
      mediaJson: JSON.stringify(
        projectMedia.map(
          ({ path, type, width, height, srcset, poster, mime }) => ({
            path,
            type,
            width,
            height,
            srcset,
            poster,
            mime,
          }),
        ),
      ),
    };
  });
}
export function optimizeHtml(html, page, media) {
  const tree = parse(html);
  let firstImage = true;
  for (const node of nodes(tree)) {
    if (node.tagName === "a") {
      const href = attr(node, "href");
      if (href?.startsWith("/theatre"))
        setAttr(
          node,
          "href",
          href.replace("/theatre", "/selected/").replaceAll("//", "/"),
        );
      if (attr(node, "target") === "_blank")
        setAttr(node, "rel", "noopener noreferrer");
    }
    if (node.tagName === "img") {
      const source = attr(node, "src") || attr(node, "data-src");
      const item = media[source];
      if (item) {
        setAttr(node, "width", item.width);
        setAttr(node, "height", item.height);
        if (attr(node, "src")) setAttr(node, "src", item.path);
        if (item.srcset) {
          setAttr(
            node,
            attr(node, "data-src") ? "data-srcset" : "srcset",
            item.srcset,
          );
          setAttr(
            node,
            "sizes",
            page.kind === "about" ? "(max-width: 768px) 100vw, 50vw" : "100vw",
          );
        }
      }
      setAttr(node, "decoding", "async");
      if (!attr(node, "data-src") && !attr(node, "loading"))
        setAttr(node, "loading", firstImage ? "eager" : "lazy");
      firstImage = false;
    }
    if (node.tagName === "video" && page.kind === "home") {
      removeAttr(node, "autoplay");
      setAttr(node, "preload", "none");
      for (const source of nodes(node).filter(
        (child) => child.tagName === "source",
      )) {
        const item = media[attr(source, "src")];
        setAttr(
          node,
          "data-mobile-src",
          item?.encodes?.find((item) => item.label === "mobile")?.path ||
            attr(source, "src"),
        );
        setAttr(
          node,
          "data-desktop-src",
          item?.encodes?.find((item) => item.label === "desktop")?.path ||
            attr(source, "src"),
        );
        node.childNodes = node.childNodes.filter((child) => child !== source);
      }
    }
    if (
      node.tagName === "video" &&
      page.kind === "project" &&
      !attr(node, "data-src")
    ) {
      const source = nodes(node).find((child) => child.tagName === "source");
      const url = attr(node, "src") || attr(source || {}, "src");
      if (url) {
        setAttr(node, "data-src", url);
        removeAttr(node, "src");
        removeAttr(node, "autoplay");
        setAttr(node, "preload", "none");
        if (media[url]?.poster) setAttr(node, "poster", media[url].poster);
        if (source) removeAttr(source, "src");
      }
    }
  }
  return serialize(tree);
}
export async function build({
  publish = true,
  projectsFile = path.join(root, "content/info/archive.json"),
} = {}) {
  return withBuildLock(async () => {
    const temporary = path.join(cache, `site-${process.pid}`);
    try {
      await rm(temporary, { recursive: true, force: true });
      await mkdir(temporary, { recursive: true });
      const input = await json(projectsFile);
      const media = await catalogue();
      const projects = normalizeProjects(input, media);
      const visible = projects.filter((project) => project.shown);
      const visibleIds = new Set(visible.map((project) => project.id));
      if (new Set(visible.map((project) => project.id)).size !== visible.length)
        throw new Error("Duplicate visible project ids");
      for (const project of visible)
        if (
          !media[project.media[0].original || project.media[0].path] &&
          project.media[0].path === "/content/misc/non-image.svg"
        )
          throw new Error(`No media: ${project.id}`);
      for (const file of await files(path.join(root, "content"))) {
        if (!publicOriginal(file, visibleIds)) continue;
        const destination = path.join(temporary, "content", file);
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(path.join(root, "content", file), destination);
      }
      const projectAssets = {};
      for (const [original, item] of Object.entries(media)) {
        const project = /^\/content\/projects\/([^/]+)\//.exec(original);
        if (!project || !visibleIds.has(project[1])) continue;
        for (const url of [
          original,
          item.path,
          item.poster,
          ...(item.variants || []).map((variant) => variant.path),
          ...(item.encodes || []).map((encode) => encode.path),
        ]) {
          if (!url) continue;
          const file = url.replace(/^\//, "");
          projectAssets[file] ||= new Set();
          projectAssets[file].add(project[1]);
        }
      }
      const derived = new Set(
        Object.entries(media)
          .filter(([url]) =>
            publicOriginal(url.replace(/^\/content\//, ""), visibleIds),
          )
          .map(([, item]) => item)
          .flatMap((item) => [
            item.path,
            item.poster,
            ...(item.variants || []).map((item) => item.path),
            ...(item.encodes || []).map((item) => item.path),
          ])
          .filter((url) => url?.startsWith("/content/optimized/")),
      );
      for (const url of derived) {
        const file = path.basename(url);
        await mkdir(path.join(temporary, "content/optimized"), {
          recursive: true,
        });
        await cp(
          path.join(mediaDirectory, file),
          path.join(temporary, "content/optimized", file),
        );
      }
      await cp(path.join(root, "sw.js"), path.join(temporary, "sw.js"));
      const generated = path.join(cache, "entries");
      await mkdir(generated, { recursive: true });
      const entryPoints = { "styles/base": path.join(generated, "base.css") };
      await save(
        entryPoints["styles/base"],
        `@import ${JSON.stringify(path.join(root, "src/styles/base.css"))};\n@import ${JSON.stringify(path.join(root, "src/styles/type.css"))};\n@import ${JSON.stringify(path.join(root, "src/styles/accessibility.css"))};`,
      );
      for (const [kind, group] of Object.entries(cssGroups)) {
        const cssFile = path.join(generated, `${kind}.css`);
        await save(
          cssFile,
          group
            .map(
              (name) =>
                `@import ${JSON.stringify(path.join(root, "src/styles", `${name}.css`))};`,
            )
            .join("\n"),
        );
        entryPoints[`styles/${kind}`] = cssFile;
        const scriptFile = path.join(generated, `${kind}.js`);
        await save(
          scriptFile,
          [
            `import ${JSON.stringify(path.join(root, "src/scripts/common.js"))};`,
            ...(["home", "archive", "selected", "project", "about"].includes(
              kind,
            )
              ? [
                  `import ${JSON.stringify(path.join(root, "src/scripts", `${kind}.js`))};`,
                ]
              : []),
          ].join("\n"),
        );
        entryPoints[`scripts/${kind}`] = scriptFile;
      }
      const assets = await esbuild.build({
        entryPoints,
        outdir: temporary,
        bundle: true,
        minify: true,
        format: "esm",
        splitting: false,
        target: ["chrome120", "firefox121", "safari17"],
        entryNames: "[dir]/[name].[hash]",
        chunkNames: "scripts/shared.[hash]",
        metafile: true,
        plugins: [
          {
            name: "public-urls",
            setup(build) {
              build.onResolve({ filter: /^\// }, (args) =>
                args.kind === "url-token"
                  ? { path: args.path, external: true }
                  : undefined,
              );
              build.onResolve({ filter: /\.(?:woff2?|ttf)$/ }, (args) => ({
                path: args.path,
                external: true,
              }));
            },
          },
        ],
        logLevel: "warning",
      });
      const assetMap = {};
      for (const [file, info] of Object.entries(assets.metafile.outputs))
        if (info.entryPoint)
          assetMap[path.resolve(root, info.entryPoint)] =
            `/${path.relative(temporary, path.resolve(root, file)).split(path.sep).join("/")}`;
      const env = templateEnvironment();
      const commitTime = execFileSync("git", ["log", "-1", "--format=%cI"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
      const contentTime =
        execFileSync("git", ["log", "-1", "--format=%cI", "--", "content"], {
          cwd: root,
          encoding: "utf8",
        }).trim() || commitTime;
      const dateLabel = (date) =>
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Amsterdam",
          dateStyle: "medium",
          timeStyle: "short",
        })
          .format(new Date(date))
          .toUpperCase();
      const context = {
        origin,
        projects,
        selectedProjects: visible
          .filter((project) => project.selection === true)
          .reverse(),
        tags: [...new Set(projects.flatMap((project) => project.tags))],
        buildTimeIso: commitTime,
        buildTimeLabel: dateLabel(commitTime),
        contentTimeIso: contentTime,
        contentTimeLabel: dateLabel(contentTime),
      };
      const staticPages = await json(path.join(root, "src/pages.json"));
      if (
        staticPages.some(
          (page) =>
            page.kind === "project" || page.route.startsWith("/archive/"),
        )
      )
        throw new Error(
          "Archive pages must be generated from archive.json; project pages require shown: true.",
        );
      const pageDefinitions = [
        ...staticPages,
        {
          route: "/archive/",
          file: "archive/index.html",
          template: "pages/archive.njk",
          title: "ARCHIVE // PYOTR",
          kind: "archive",
        },
        {
          route: "/selected/",
          file: "selected/index.html",
          template: "pages/selected.njk",
          title: "SELECTED PROJECTS // PYOTR",
          kind: "selected",
          bodyClass: "selected-page",
        },
        ...visible.map((project, index) => ({
          route: `/archive/${project.id}/`,
          file: `archive/${project.id}/index.html`,
          template: "pages/project.njk",
          title: `${project.brand.toUpperCase()} × PYOTR`,
          kind: "project",
          bodyClass: "project-page",
          project,
          nextProject: visible[(index + 1) % visible.length],
        })),
        ...[400, 401, 403, 404, 500, 502, 503, 504].map((errorCode) => ({
          route: `/errors/${errorCode}/`,
          file: `errors/${errorCode}/index.html`,
          template: "pages/error.njk",
          title: `${errorCode} // PYOTR`,
          kind: "error",
          noindex: true,
          errorCode,
        })),
      ];
      const seen = new Set();
      for (const page of pageDefinitions) {
        if (seen.has(page.file))
          throw new Error(`Duplicate route: ${page.route}`);
        seen.add(page.file);
        const data = {
          ...context,
          description:
            page.description ||
            "Pyotr Goloub is a computational designer working across design and engineering.",
          ...page,
          canonical: new URL(page.route, origin).href,
          styles: [
            assetMap[entryPoints["styles/base"]],
            assetMap[entryPoints[`styles/${page.kind}`]],
          ],
          scripts: [assetMap[entryPoints[`scripts/${page.kind}`]]],
        };
        data.body = env.render(page.template, data);
        await save(
          path.join(temporary, page.file),
          await compressHtml(
            optimizeHtml(env.render("layout.njk", data), page, media),
          ),
        );
      }
      await cp(
        path.join(root, "web-essays"),
        path.join(temporary, "web-essays"),
        {
          recursive: true,
          filter: (file) => path.basename(file) !== ".DS_Store",
        },
      );
      for (const file of legacyAssets) {
        await mkdir(path.dirname(path.join(temporary, file)), {
          recursive: true,
        });
        await cp(path.join(root, file), path.join(temporary, file));
      }
      await save(
        path.join(temporary, "theatre/index.html"),
        await readFile(path.join(root, "src/templates/redirect.html"), "utf8"),
      );
      const sitemapRoutes = pageDefinitions
        .filter((page) => !page.noindex)
        .map((page) => page.route);
      await save(
        path.join(temporary, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapRoutes.map((route) => `<url><loc>${origin}${route}</loc></url>`).join("")}</urlset>`,
      );
      await save(
        path.join(temporary, "robots.txt"),
        `User-agent: *\nDisallow:\n\nSitemap: ${origin}/sitemap.xml\n`,
      );
      const { checkSite } = await import("./check.mjs");
      await checkSite(temporary);
      await rm(stage, { recursive: true, force: true });
      await rename(temporary, stage);
      const publicFiles = await files(stage);
      if (publish) {
        const previous = (await exists(path.join(cache, "published.json")))
          ? await json(path.join(cache, "published.json"))
          : [];
        // Committed output can outlive the local cache or a project's visibility.
        const archiveDirectory = path.join(root, "archive");
        const existingProjectPages = (await exists(archiveDirectory))
          ? (await files(archiveDirectory))
              .filter((file) => /^[A-Za-z]+\d+\/index\.html$/.test(file))
              .map((file) => `archive/${file}`)
          : [];
        for (const file of publicFiles) {
          if (file.startsWith("web-essays/") || legacyAssets.includes(file))
            continue;
          const destination = path.join(root, file);
          await mkdir(path.dirname(destination), { recursive: true });
          if (
            !(await exists(destination)) ||
            !(await readFile(destination)).equals(
              await readFile(path.join(stage, file)),
            )
          )
            await cp(path.join(stage, file), destination);
        }
        for (const file of new Set([...previous, ...existingProjectPages])) {
          if (publicFiles.includes(file)) continue;
          if (
            !file.startsWith("content/") ||
            file.startsWith("content/optimized/")
          )
            await rm(path.join(root, file), { force: true });
        }
        await save(
          path.join(cache, "published.json"),
          JSON.stringify(publicFiles, null, 2),
        );
      }
      await save(
        path.join(cache, "build-manifest.json"),
        JSON.stringify(
          {
            version: 1,
            files: publicFiles,
            routes: pageDefinitions.map((page) => page.route),
            assets: assetMap,
            projectAssets: Object.fromEntries(
              Object.entries(projectAssets)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([file, ids]) => [file, [...ids].sort()]),
            ),
          },
          null,
          2,
        ),
      );
      console.log(
        `Built ${publicFiles.filter((file) => file.endsWith(".html")).length} pages, ${publicFiles.length} public files. Fonts unchanged.`,
      );
      return { directory: stage, files: publicFiles };
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await build();
