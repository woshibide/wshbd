import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
  stat,
  symlink,
  chmod,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createLegacyManifest, legacyManifestPath } from "../build/legacy.mjs";
import {
  deploy,
  deploymentOptions,
  safeRelative,
  planPruning,
} from "../build/deploy.mjs";

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );
test("deployment configuration requires explicit destination and respects overrides", async () => {
  const environment = {
    DEPLOY_HOST: "deploy@server.example",
    DEPLOY_PATH: "/srv/www/portfolio",
    DEPLOY_STATE_DIR: "/srv/deploy-state",
  };
  assert.deepEqual(deploymentOptions([], environment), {
    host: environment.DEPLOY_HOST,
    destination: environment.DEPLOY_PATH,
    stateDirectory: environment.DEPLOY_STATE_DIR,
    legacyManifestFile: legacyManifestPath,
    dryRun: false,
    retentionDays: null,
  });
  const overridden = deploymentOptions(
    ["--host", "other@server.example", "--path", "/srv/www/other", "--dry-run"],
    environment,
  );
  assert.equal(overridden.host, "other@server.example");
  assert.equal(overridden.destination, "/srv/www/other");
  assert.equal(overridden.dryRun, true);
  assert.throws(() => deploymentOptions([], {}), /DEPLOY_HOST and DEPLOY_PATH/);
  assert.throws(
    () => deploymentOptions([], { DEPLOY_HOST: environment.DEPLOY_HOST }),
    /DEPLOY_HOST and DEPLOY_PATH/,
  );
  await assert.rejects(
    deploy({ source: "/nonexistent", destination: environment.DEPLOY_PATH }),
    /Deployment host is required/,
  );
});

async function fixture(t) {
  const temporary = await mkdtemp("/private/tmp/portfolio-deploy-test-");
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, "source");
  const destination = path.join(temporary, "remote");
  const stateDirectory = path.join(temporary, "state");
  await mkdir(source);
  await mkdir(destination);
  await writeFile(
    path.join(source, "index.html"),
    "<!doctype html><html><head><title>Test</title></head><body>Hello</body></html>",
  );
  return { source, destination, stateDirectory, local: true };
}
test("dry-run leaves destination and state unchanged", async (t) => {
  const options = await fixture(t);
  await writeFile(path.join(options.destination, "server-only.txt"), "keep");
  await deploy({ ...options, dryRun: true });
  assert.equal(
    await exists(path.join(options.destination, "index.html")),
    false,
  );
  assert.equal(await exists(options.stateDirectory), false);
  assert.equal(
    await readFile(path.join(options.destination, "server-only.txt"), "utf8"),
    "keep",
  );
});

test("public-file validation also protects excluded passthrough folders", async (t) => {
  const options = await fixture(t);
  await mkdir(path.join(options.source, "web-essays"));
  await writeFile(
    path.join(options.source, "web-essays/.env.local"),
    "DUMMY_TEST_VALUE=example",
  );
  await assert.rejects(deploy({ ...options, dryRun: true }), /Non-public file/);
  assert.equal(await exists(options.stateDirectory), false);
});
test("sync updates changed files, removes only owned stale pages, retains old assets", async (t) => {
  const options = await fixture(t);
  await writeFile(path.join(options.source, "old.html"), "<p>Old</p>");
  await writeFile(path.join(options.source, "old.css"), "body{color:red}");
  await writeFile(path.join(options.destination, "server-only.txt"), "keep");
  await deploy(options);
  const originalMtime = (
    await stat(path.join(options.destination, "index.html"))
  ).mtimeMs;
  await chmod(path.join(options.destination, "index.html"), 0o600);
  await writeFile(
    path.join(options.source, "index.html"),
    await readFile(path.join(options.source, "index.html")),
  );
  const unchanged = await deploy(options);
  assert.equal(unchanged.changes.trim(), "");
  assert.equal(
    (await stat(path.join(options.destination, "index.html"))).mtimeMs,
    originalMtime,
  );
  assert.equal(
    (await stat(path.join(options.destination, "index.html"))).mode & 0o777,
    0o600,
  );
  await rm(path.join(options.source, "old.html"));
  await rm(path.join(options.source, "old.css"));
  await writeFile(path.join(options.source, "index.html"), "<p>Updated</p>");
  await deploy(options);
  assert.equal(
    await readFile(path.join(options.destination, "index.html"), "utf8"),
    "<p>Updated</p>",
  );
  assert.equal(
    (await stat(path.join(options.destination, "index.html"))).mode & 0o777,
    0o600,
  );
  assert.equal(await exists(path.join(options.destination, "old.html")), false);
  assert.equal(await exists(path.join(options.destination, "old.css")), true);
  assert.equal(
    await readFile(path.join(options.destination, "server-only.txt"), "utf8"),
    "keep",
  );
});
test("failed transfer does not prune or advance manifest", async (t) => {
  const options = await fixture(t);
  await writeFile(path.join(options.source, "old.html"), "<p>Old</p>");
  await deploy(options);
  const previous = await readFile(
    path.join(options.stateDirectory, "manifest.json"),
    "utf8",
  );
  await rm(path.join(options.source, "old.html"));
  await assert.rejects(
    deploy({
      ...options,
      beforeTransfer: async (snapshot) => {
        await rm(path.join(snapshot, "index.html"));
      },
    }),
    /rsync exited/,
  );
  assert.equal(await exists(path.join(options.destination, "old.html")), true);
  assert.equal(
    await readFile(path.join(options.stateDirectory, "manifest.json"), "utf8"),
    previous,
  );
  assert.equal(await exists(path.join(options.stateDirectory, "lock")), false);
});
test("deployment uses an immutable snapshot while local output is replaced", async (t) => {
  const options = await fixture(t);
  const expected = await readFile(
    path.join(options.source, "index.html"),
    "utf8",
  );
  await deploy({
    ...options,
    beforeTransfer: async () => {
      await rm(options.source, { recursive: true });
      await mkdir(options.source);
      await writeFile(
        path.join(options.source, "index.html"),
        "<p>Concurrent rebuild</p>",
      );
    },
  });
  assert.equal(
    await readFile(path.join(options.destination, "index.html"), "utf8"),
    expected,
  );
});

test("hiding a published project retires its optimized media without a cache TTL", async (t) => {
  const options = await fixture(t);
  const page = "archive/H01/index.html";
  const derivative = "content/optimized/private-project.webp";
  for (const [file, body] of [
    [page, "<p>Public project</p>"],
    [derivative, "project preview"],
  ]) {
    await mkdir(path.dirname(path.join(options.source, file)), {
      recursive: true,
    });
    await writeFile(path.join(options.source, file), body);
  }
  await deploy({ ...options, projectAssets: { [derivative]: ["H01"] } });
  await rm(path.join(options.source, page));
  await rm(path.join(options.source, derivative));
  await deploy(options);
  assert.equal(await exists(path.join(options.destination, derivative)), false);
});

async function legacyFixture(t) {
  const options = await fixture(t);
  const owned = {
    "index.html": "<p>Old website</p>",
    "archive/H01/index.html": "<p>Hidden project</p>",
    "content/projects/H01/1.webp": "old private media",
    "content/info/archive.json": '{"private":true}',
    "scripts/node/old-builder.js": "old build source",
    "old.css": "body{color:red}",
  };
  for (const [file, body] of Object.entries(owned)) {
    await mkdir(path.dirname(path.join(options.destination, file)), {
      recursive: true,
    });
    await writeFile(path.join(options.destination, file), body);
  }
  const git = (args) =>
    execFileSync("git", ["-C", options.destination, ...args], {
      stdio: "pipe",
    });
  git(["init", "--quiet"]);
  git(["add", "."]);
  git([
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "--no-gpg-sign",
    "-m",
    "Legacy website fixture",
  ]);
  const legacyManifest = await createLegacyManifest({
    directory: options.destination,
    output: path.join(path.dirname(options.destination), "legacy.json"),
  });
  await writeFile(
    path.join(options.destination, "unknown.txt"),
    "keep unknown server file",
  );
  return { ...options, legacyManifest };
}

test("first deployment retires verified legacy private files and preserves unknown files", async (t) => {
  const options = await legacyFixture(t);
  await deploy({ ...options, dryRun: true });
  assert.equal(await exists(options.stateDirectory), false);
  assert.equal(
    await exists(path.join(options.destination, "archive/H01/index.html")),
    true,
  );
  await deploy(options);
  for (const file of [
    "archive/H01/index.html",
    "content/projects/H01/1.webp",
    "content/info/archive.json",
    "scripts/node/old-builder.js",
  ])
    assert.equal(
      await exists(path.join(options.destination, file)),
      false,
      file,
    );
  assert.equal(
    await exists(path.join(options.destination, "unknown.txt")),
    true,
  );
  assert.equal(await exists(path.join(options.destination, "old.css")), true);
  assert.equal(await exists(path.join(options.destination, ".git")), true);
});

test("legacy revision mismatch or changed private files abort before uploads", async (t) => {
  const options = await legacyFixture(t);
  const original = await readFile(
    path.join(options.destination, "index.html"),
    "utf8",
  );
  await assert.rejects(
    deploy({
      ...options,
      legacyManifest: { ...options.legacyManifest, revision: "0".repeat(40) },
    }),
    /revision differs/,
  );
  await writeFile(
    path.join(options.destination, "content/projects/H01/1.webp"),
    "server-modified private media",
  );
  await assert.rejects(deploy(options), /changed private file/);
  assert.equal(
    await readFile(path.join(options.destination, "index.html"), "utf8"),
    original,
  );
  assert.equal(
    await exists(path.join(options.stateDirectory, "manifest.json")),
    false,
  );
});

test("private files edited during transfer stop cleanup without advancing ownership", async (t) => {
  const options = await legacyFixture(t);
  const privateFile = path.join(
    options.destination,
    "content/projects/H01/1.webp",
  );
  await assert.rejects(
    deploy({
      ...options,
      beforeTransfer: () => writeFile(privateFile, "concurrent server edit"),
    }),
    /Private file changed during deployment/,
  );
  assert.equal(await readFile(privateFile, "utf8"), "concurrent server edit");
  assert.equal(
    await exists(path.join(options.stateDirectory, "manifest.json")),
    false,
  );
});
test("concurrent deployment lock fails without transfer", async (t) => {
  const options = await fixture(t);
  await mkdir(path.join(options.stateDirectory, "lock"), { recursive: true });
  await assert.rejects(deploy(options), /EEXIST/);
  assert.equal(
    await exists(path.join(options.destination, "index.html")),
    false,
  );
  assert.equal(await exists(path.join(options.stateDirectory, "lock")), true);
});
test("server modifications and symlink destinations are protected", async (t) => {
  const options = await fixture(t);
  await writeFile(path.join(options.source, "old.html"), "<p>Old</p>");
  await deploy(options);
  await rm(path.join(options.source, "old.html"));
  await writeFile(
    path.join(options.destination, "old.html"),
    "<p>Server edit</p>",
  );
  await deploy(options);
  assert.equal(
    await readFile(path.join(options.destination, "old.html"), "utf8"),
    "<p>Server edit</p>",
  );
  await rm(path.join(options.destination, "index.html"));
  await symlink(
    path.join(options.source, "index.html"),
    path.join(options.destination, "index.html"),
  );
  await assert.rejects(deploy(options), /symlink/);
});
test("retention rules preserve cached assets until explicit expiry", () => {
  const previous = {
    files: {
      "page.html": { sha256: "a".repeat(64) },
      "asset.css": { sha256: "b".repeat(64) },
    },
    retained: [],
  };
  const first = planPruning(previous, {}, { now: 1000 });
  assert.deepEqual(
    first.prune.map((item) => item.path),
    ["page.html"],
  );
  assert.deepEqual(
    first.keep.map((item) => item.path),
    ["asset.css"],
  );
  const expired = planPruning(
    { files: {}, retained: first.keep },
    {},
    { now: 1000 + 2 * 86400000, retentionDays: 1 },
  );
  assert.deepEqual(
    expired.prune.map((item) => item.path),
    ["asset.css"],
  );
});
test("malformed ownership entries and unsafe paths are rejected", () => {
  for (const file of [
    "/etc/passwd",
    "../index.html",
    "a/../b",
    "a\\b",
    "a\nb",
    "",
    "a//b",
  ])
    assert.equal(safeRelative(file), false);
  assert.equal(safeRelative("archive/E16/index.html"), true);
  assert.throws(
    () =>
      planPruning({ files: { "../unsafe": { sha256: "a".repeat(64) } } }, {}),
    /Invalid/,
  );
});
