import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parse } from "parse5";
import { stage, files } from "./paths.mjs";
import { nonPublicFile } from "./publication.mjs";

const walk = (node) => [node, ...(node.childNodes || []).flatMap(walk)];
export async function checkSite(directory = stage) {
  const publicFiles = await files(directory);
  const known = new Set(publicFiles);
  const failures = new Set();
  const checkReference = (reference, file) => {
    if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) return;
    const url = new URL(reference, `https://local.invalid/${file}`);
    let target;
    try {
      target = decodeURIComponent(url.pathname).replace(/^\//, "");
    } catch {
      failures.add(`${file}: malformed URL ${reference}`);
      return;
    }
    if (
      !known.has(target) &&
      !known.has(`${target.replace(/\/$/, "")}/index.html`) &&
      !(target === "" && known.has("index.html"))
    )
      failures.add(`${file}: missing ${reference}`);
  };
  for (const file of publicFiles) {
    if (nonPublicFile(file)) failures.add(`Non-public file in output: ${file}`);
    const projectMedia = /^content\/projects\/([^/]+)\//.exec(file);
    if (projectMedia && !known.has(`archive/${projectMedia[1]}/index.html`))
      failures.add(`Media without a public project page: ${file}`);
    if (file.startsWith("web-essays/")) continue;
    if (file.endsWith(".html")) {
      const html = await readFile(path.join(directory, file), "utf8");
      const tree = parse(html);
      for (const node of walk(tree))
        for (const attribute of node.attrs || []) {
          if (
            [
              "href",
              "src",
              "poster",
              "data-src",
              "data-poster",
              "data-mobile-src",
              "data-desktop-src",
            ].includes(attribute.name)
          )
            checkReference(attribute.value, file);
          if (["srcset", "data-srcset"].includes(attribute.name))
            for (const candidate of attribute.value.split(","))
              checkReference(candidate.trim().split(/\s+/)[0], file);
          if (attribute.name === "data-media")
            for (const media of JSON.parse(attribute.value)) {
              checkReference(media.path, file);
              if (media.poster) checkReference(media.poster, file);
            }
        }
      if (/\{\{|\{%|PLACEHOLDER/.test(html) && !file.startsWith("web-essays/"))
        failures.add(`${file}: unresolved template token`);
      if (/\n{100}/.test(html)) failures.add(`${file}: excessive blank lines`);
    }
    if (file.endsWith(".css")) {
      const css = await readFile(path.join(directory, file), "utf8");
      for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g))
        checkReference(match[1], file);
    }
  }
  if (failures.size)
    throw new Error(
      `Public output validation failed:\n${[...failures].slice(0, 50).join("\n")}${failures.size > 50 ? `\n...${failures.size} failures` : ""}`,
    );
  console.log(
    `Verified ${publicFiles.filter((file) => file.endsWith(".html") && !file.startsWith("web-essays/")).length} portfolio HTML pages and local asset references; web essays preserved unchanged.`,
  );
  return publicFiles;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await checkSite();
