import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const cache = path.join(root, ".cache");
export const stage = path.join(cache, "site");
export const origin = "https://its-pyotr.com";
export const legacyAssets = [
  "styles/styles.css",
  "styles/sections.css",
  "scripts/scripts.js",
  "scripts/utils.js",
  "scripts/video-player.js",
];
export const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Chromium.app/Contents/MacOS/Chromium";
export const posix = (value) => value.split(path.sep).join("/");
export const json = async (file) => JSON.parse(await readFile(file, "utf8"));
export async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, value);
}
export async function files(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = posix(path.join(prefix, entry.name));
    if (entry.isDirectory())
      result.push(...(await files(path.join(directory, entry.name), name)));
    else if (entry.isFile()) result.push(name);
    else
      throw new Error(
        `Symlinks and special files are not public build inputs: ${name}`,
      );
  }
  return result.sort();
}
