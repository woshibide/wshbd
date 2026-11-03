import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "../build/build.mjs";
import { files, root, stage } from "../build/paths.mjs";
const digest = (value) => createHash("sha256").update(value).digest("hex");
async function outputHashes() {
  return Object.fromEntries(
    await Promise.all(
      (await files(stage))
        .filter((file) => !file.startsWith("content/"))
        .map(async (file) => [
          file,
          digest(await readFile(path.join(stage, file))),
        ]),
    ),
  );
}

test("repeated builds keep identical output and original fonts", async () => {
  const fontNames = (await files(path.join(root, "content/misc"))).filter(
    (file) => /\.(ttf|woff2?)$/.test(file),
  );
  const fonts = Object.fromEntries(
    await Promise.all(
      fontNames.map(async (name) => [
        name,
        digest(await readFile(path.join(root, "content/misc", name))),
      ]),
    ),
  );
  const first = await outputHashes();
  await build({ publish: false });
  assert.deepEqual(await outputHashes(), first);
  for (const [name, expected] of Object.entries(fonts))
    assert.equal(
      digest(await readFile(path.join(stage, "content/misc", name))),
      expected,
    );
});

test("invalid data fails before replacing published site", async () => {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "portfolio-build-test-"),
  );
  const input = path.join(temporary, "invalid-projects.json");
  const before = digest(await readFile(path.join(stage, "index.html")));
  try {
    await writeFile(input, "{broken json");
    await assert.rejects(build({ publish: false, projectsFile: input }));
    assert.equal(
      digest(await readFile(path.join(stage, "index.html"))),
      before,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("page asset selection excludes unrelated sections", async () => {
  const home = await readFile(path.join(stage, "index.html"), "utf8");
  assert.equal(home.includes("sections.css"), false);
  assert.equal(home.includes("?v="), false);
  assert.match(home, /styles\/home\.[A-Z0-9]+\.css/);
  assert.equal(home.includes("archive."), false);
  const selected = await readFile(
    path.join(stage, "selected/index.html"),
    "utf8",
  );
  assert.equal(selected.includes("something.js"), false);
  assert.equal(selected.includes("curtain"), false);
});

test("only projects explicitly marked shown: true get public pages", async () => {
  const { projects } = JSON.parse(
    await readFile(path.join(root, "content/info/archive.json"), "utf8"),
  );
  const expected = projects
    .filter((project) => project.shown === true)
    .map((project) => `archive/${project.id.toUpperCase()}/index.html`)
    .sort();
  const actual = (await files(path.join(stage, "archive")))
    .filter((file) => /^[A-Za-z]+\d+\/index\.html$/.test(file))
    .map((file) => `archive/${file}`)
    .sort();
  assert.deepEqual(actual, expected);
  const sitemap = await readFile(path.join(stage, "sitemap.xml"), "utf8");
  const sitemapProjects = [
    ...sitemap.matchAll(/<loc>[^<]*\/archive\/([A-Za-z]+\d+)\/<\/loc>/g),
  ]
    .map((match) => `archive/${match[1]}/index.html`)
    .sort();
  assert.deepEqual(sitemapProjects, expected);
});

test("public output excludes source metadata and hidden project media", async () => {
  const { projects } = JSON.parse(
    await readFile(path.join(root, "content/info/archive.json"), "utf8"),
  );
  const visible = new Set(
    projects
      .filter((project) => project.shown === true)
      .map((project) => project.id.toUpperCase()),
  );
  const output = await files(stage);
  assert.equal(
    output.some((file) => file.startsWith("content/info/")),
    false,
  );
  for (const file of output) {
    const project = /^content\/projects\/([^/]+)\//.exec(file);
    if (project)
      assert(
        visible.has(project[1]),
        `Hidden project media published: ${file}`,
      );
  }
});

test("web essays and legacy assets remain byte-for-byte unchanged", async () => {
  const legacy = [
    "styles/styles.css",
    "styles/sections.css",
    "scripts/scripts.js",
    "scripts/utils.js",
    "scripts/video-player.js",
  ];
  const passthrough = [
    ...(await files(path.join(root, "web-essays")))
      .filter((file) => !file.endsWith(".DS_Store"))
      .map((file) => `web-essays/${file}`),
    ...legacy,
  ];
  for (const file of passthrough)
    assert.deepEqual(
      await readFile(path.join(root, file)),
      await readFile(path.join(stage, file)),
      file,
    );
});
