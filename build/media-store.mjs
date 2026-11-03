import path from "node:path";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  cp,
  rename,
  rm,
  access,
  lstat,
} from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { files, root, save } from "./paths.mjs";

const directories = ["projects", "video", "misc"];
const exists = (file) =>
  access(file).then(
    () => true,
    (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    },
  );
const digest = (value) => createHash("sha256").update(value).digest("hex");
const safeMediaPath = (file) =>
  /^(?:projects|video|misc)\//.test(file) &&
  !/[\x00-\x1f\x7f\\]/.test(file) &&
  !file.split("/").some((part) => !part || part === "." || part === "..");

async function noSymlinks(directory, file) {
  let cursor = path.resolve(directory);
  for (const part of ["", ...file.split("/")]) {
    if (part) cursor = path.join(cursor, part);
    try {
      if ((await lstat(cursor)).isSymbolicLink())
        throw new Error("Media restore refuses symlinks");
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
  }
}

export async function backupMedia(
  destination,
  content = path.join(root, "content"),
) {
  destination = path.resolve(destination);
  content = path.resolve(content);
  if (
    destination === content ||
    destination.startsWith(`${content}${path.sep}`)
  )
    throw new Error("Media backup must be outside source content");
  if (await exists(destination))
    throw new Error(
      "Backup destination already exists; choose a new directory",
    );
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.pending-${process.pid}`;
  await mkdir(temporary);
  try {
    const inventory = {};
    for (const directory of directories) {
      const source = path.join(content, directory);
      if (!(await exists(source))) continue;
      for (const file of await files(source)) {
        if (file.split("/").some((part) => part.startsWith("."))) continue;
        const relative = `${directory}/${file}`;
        if (!safeMediaPath(relative))
          throw new Error("Unsafe original media filename");
        const target = path.join(temporary, relative);
        await mkdir(path.dirname(target), { recursive: true });
        await cp(path.join(source, file), target);
        inventory[relative] = digest(await readFile(target));
      }
    }
    await save(
      path.join(temporary, "media-backup.json"),
      JSON.stringify({ version: 1, files: inventory }, null, 2),
    );
    await rename(temporary, destination);
    return Object.keys(inventory).length;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function restoreMedia(
  source,
  content = path.join(root, "content"),
) {
  await files(source);
  const manifest = JSON.parse(
    await readFile(path.join(source, "media-backup.json"), "utf8"),
  );
  if (
    manifest.version !== 1 ||
    !manifest.files ||
    Array.isArray(manifest.files)
  )
    throw new Error("Invalid media backup");
  const pending = [];
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!safeMediaPath(file) || !/^[a-f0-9]{64}$/.test(expected))
      throw new Error("Unsafe media backup entry");
    await noSymlinks(content, file);
    if (digest(await readFile(path.join(source, file))) !== expected)
      throw new Error(`Backup checksum mismatch: ${file}`);
    const target = path.join(content, file);
    if (await exists(target)) {
      if (digest(await readFile(target)) !== expected)
        throw new Error(`Existing local media differs: ${file}`);
    } else pending.push(file);
  }
  for (const file of pending) {
    const target = path.join(content, file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(source, file), target, {
      force: false,
      errorOnExist: true,
    });
  }
  return pending.length;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [action, option, directory] = process.argv.slice(2);
  if (action === "backup" && option === "--to" && directory)
    console.log(
      `Backed up ${await backupMedia(directory)} original media/font files. Originals unchanged.`,
    );
  else if (action === "restore" && option === "--from" && directory)
    console.log(
      `Restored ${await restoreMedia(directory)} missing media/font files. Existing files preserved.`,
    );
  else
    throw new Error(
      "Use media:backup -- --to DIRECTORY or media:restore -- --from DIRECTORY",
    );
}
