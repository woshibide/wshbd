import path from "node:path";
import { createHash } from "node:crypto";
import { readFile, mkdir, stat, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { root, cache, files, json, save } from "./paths.mjs";

const imageTypes = /\.(?:webp|png|jpe?g|gif|svg|avif)$/i;
const videoTypes = /\.(?:mp4|webm|mov|m4v|ogv)$/i;
export const mediaDirectory = path.join(cache, "media");
export const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  );
const digest = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 16);
const mime = (file) =>
  ({
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/mp4",
    ".ogv": "video/ogg",
  })[path.extname(file).toLowerCase()];
export async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", (chunk) => {
      error = (error + chunk).slice(-5000);
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited ${code}: ${error}`)),
    );
  });
}
export async function catalogue() {
  let prepared = {};
  if (await exists(path.join(mediaDirectory, "manifest.json")))
    prepared = await json(path.join(mediaDirectory, "manifest.json"));
  const result = {};
  for (const file of await files(path.join(root, "content"))) {
    if (file.startsWith("optimized/")) continue;
    if (!imageTypes.test(file) && !videoTypes.test(file)) continue;
    const absolute = path.join(root, "content", file);
    const url = `/content/${file}`;
    const info = await stat(absolute);
    const cached = prepared[url];
    const same =
      cached &&
      cached.sourceSize === info.size &&
      cached.sourceMtime === info.mtimeMs;
    if (videoTypes.test(file)) {
      const poster = url.replace(/\.[^.]+$/, "-poster.webp");
      result[url] = {
        path: url,
        type: "video",
        mime: mime(file),
        ...((await exists(path.join(root, poster))) ? { poster } : {}),
        ...(same ? cached : {}),
      };
    } else {
      const metadata = await sharp(absolute, { animated: true }).metadata();
      result[url] = {
        path: url,
        original: url,
        type: "image",
        width: metadata.width,
        height: metadata.pageHeight || metadata.height,
        animated: (metadata.pages || 1) > 1,
        ...(same ? cached : {}),
      };
    }
  }
  return result;
}
export async function prepareMedia() {
  await mkdir(mediaDirectory, { recursive: true });
  const data = await catalogue();
  let count = 0;
  for (const [url, media] of Object.entries(data)) {
    const source = path.join(root, url);
    const info = await stat(source);
    const sourceHash = digest(await readFile(source));
    const key = digest(`${sourceHash}:responsive-v1:webp-q84:480,800,1400`);
    if (
      media.type === "image" &&
      !media.animated &&
      !url.endsWith(".svg") &&
      media.width > 480 &&
      (url.startsWith("/content/projects/") || url === "/content/misc/team.jpg")
    ) {
      const variants = [];
      for (const width of [480, 800, 1400].filter(
        (width) => width <= media.width,
      )) {
        const name = `${key}-${width}.webp`;
        if (!(await exists(path.join(mediaDirectory, name))))
          await sharp(source)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 84, effort: 5 })
            .toFile(path.join(mediaDirectory, name));
        variants.push({ path: `/content/optimized/${name}`, width });
      }
      media.path = variants.at(-1).path;
      media.srcset = [...variants, { path: url, width: media.width }]
        .filter(
          (item, index, all) =>
            all.findIndex((other) => other.width === item.width) === index,
        )
        .map((item) => `${item.path} ${item.width}w`)
        .join(", ");
      media.variants = variants;
    }
    if (
      media.type === "video" &&
      url.startsWith("/content/projects/") &&
      !media.poster
    ) {
      const name = `${sourceHash}-poster.webp`;
      if (!(await exists(path.join(mediaDirectory, name))))
        await run("ffmpeg", [
          "-v",
          "error",
          "-i",
          source,
          "-frames:v",
          "1",
          "-vf",
          "scale=640:-2",
          "-quality",
          "82",
          "-y",
          path.join(mediaDirectory, name),
        ]);
      media.poster = `/content/optimized/${name}`;
    }
    if (url === "/content/video/showreel-30fps.mp4") {
      media.encodes = [];
      for (const [label, width] of [
        ["mobile", 720],
        ["desktop", 1280],
      ]) {
        const name = `${sourceHash}-${label}-v1.mp4`;
        if (!(await exists(path.join(mediaDirectory, name))))
          await run("ffmpeg", [
            "-v",
            "error",
            "-i",
            source,
            "-an",
            "-vf",
            `scale=w='min(${width},iw)':h=-2`,
            "-c:v",
            "libx264",
            "-crf",
            "27",
            "-preset",
            "medium",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-y",
            path.join(mediaDirectory, name),
          ]);
        media.encodes.push({ label, path: `/content/optimized/${name}` });
      }
    }
    media.sourceSize = info.size;
    media.sourceMtime = info.mtimeMs;
    media.sourceHash = sourceHash;
    if (++count % 50 === 0) console.log(`Prepared ${count} media files`);
  }
  await save(
    path.join(mediaDirectory, "manifest.json"),
    JSON.stringify(data, null, 2),
  );
  console.log(`Prepared ${count} media files. Originals unchanged.`);
  return data;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await prepareMedia();
