import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { root, cache, save } from "./paths.mjs";

const exec = promisify(execFile);
export const legacyManifestPath = path.join(cache, "deploy", "legacy.json");
const safePath = (file) =>
  file &&
  !file.startsWith("/") &&
  !/[\x00-\x1f\x7f\\]/.test(file) &&
  !file.split("/").some((part) => !part || part === "." || part === "..");

async function blobHash(directory, object) {
  const child = spawn("git", ["cat-file", "blob", object], {
    cwd: directory,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const completion = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Cannot read legacy Git object")),
    );
  });
  child.stderr.resume();
  const digest = createHash("sha256");
  await Promise.all([
    (async () => {
      for await (const chunk of child.stdout) digest.update(chunk);
    })(),
    completion,
  ]);
  return digest.digest("hex");
}

export async function createLegacyManifest({
  directory = root,
  revision = "HEAD",
  output = legacyManifestPath,
} = {}) {
  const { stdout: resolved } = await exec(
    "git",
    ["rev-parse", "--verify", `${revision}^{commit}`],
    { cwd: directory },
  );
  const commit = resolved.trim();
  const { stdout } = await exec(
    "git",
    ["ls-tree", "-r", "-z", "--full-tree", commit],
    { cwd: directory, maxBuffer: 16 * 1024 * 1024 },
  );
  const entries = stdout
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const match = /^(100644|100755) blob ([a-f0-9]+)\t(.+)$/.exec(line);
      return match && safePath(match[3])
        ? { object: match[2], path: match[3] }
        : null;
    })
    .filter(Boolean);
  const queue = entries.values();
  const hashes = {};
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (const entry of queue)
        hashes[entry.path] = {
          sha256: await blobHash(directory, entry.object),
        };
    }),
  );
  // This known legacy generated map was not necessarily committed with its pages.
  const generatedMap = "content/info/media-map.json";
  if (!hashes[generatedMap]) {
    try {
      hashes[generatedMap] = {
        sha256: createHash("sha256")
          .update(await readFile(path.join(directory, generatedMap)))
          .digest("hex"),
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const manifest = {
    version: 1,
    revision: commit,
    files: Object.fromEntries(
      Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
  await save(output, JSON.stringify(manifest, null, 2));
  return manifest;
}
