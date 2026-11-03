import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { pathToFileURL } from "node:url";
import { root, stage } from "./paths.mjs";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
export async function serve({ directory = stage, port = 4173 } = {}) {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      if (
        pathname.split("/").some((part) => part.startsWith(".")) ||
        /\/(?:node_modules|build|src|tests)(?:\/|$)/.test(pathname)
      ) {
        response.writeHead(404);
        response.end();
        return;
      }
      let file = path.resolve(directory, `.${pathname}`);
      if (!file.startsWith(`${directory}${path.sep}`) && file !== directory)
        throw new Error("Invalid path");
      let status = 200;
      let info;
      try {
        info = await stat(file);
      } catch {
        file = path.join(directory, "errors/404/index.html");
        status = 404;
        info = await stat(file);
      }
      if (info.isDirectory()) {
        if (!pathname.endsWith("/")) {
          response.writeHead(301, {
            Location: `${pathname}/${new URL(request.url, "http://localhost").search}`,
          });
          response.end();
          return;
        }
        file = path.join(file, "index.html");
      }
      let body = await readFile(file);
      const mime = types[path.extname(file)] || "application/octet-stream";
      const headers = {
        "Content-Type": mime,
        "Cache-Control": "no-cache",
        "Accept-Ranges": "bytes",
      };
      if (request.headers.range && status === 200) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
        if (!match) {
          response.writeHead(416);
          response.end();
          return;
        }
        const start = Number(match[1]);
        const end = Math.min(
          Number(match[2] || body.length - 1),
          body.length - 1,
        );
        if (start > end) {
          response.writeHead(416, {
            "Content-Range": `bytes */${body.length}`,
          });
          response.end();
          return;
        }
        headers["Content-Range"] = `bytes ${start}-${end}/${body.length}`;
        body = body.subarray(start, end + 1);
        status = 206;
      } else if (
        /^(?:text\/|application\/(?:json|xml)|image\/svg)/.test(mime)
      ) {
        const accepted = request.headers["accept-encoding"] || "";
        if (accepted.includes("br")) {
          body = brotliCompressSync(body, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
          });
          headers["Content-Encoding"] = "br";
        } else if (accepted.includes("gzip")) {
          body = gzipSync(body);
          headers["Content-Encoding"] = "gzip";
        }
        headers.Vary = "Accept-Encoding";
      }
      response.writeHead(status, { ...headers, "Content-Length": body.length });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  console.log(
    `Preview: http://127.0.0.1:${server.address().port} (${directory})`,
  );
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const value = (key) => args[args.indexOf(key) + 1];
  if (args.includes("--watch")) {
    const { build } = await import("./build.mjs");
    await build();
    const { watch } = await import("node:fs");
    let timer;
    let pending = Promise.resolve();
    for (const input of ["src", "content/info"])
      watch(path.join(root, input), { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          pending = pending.then(build).catch(console.error);
        }, 150);
      });
  }
  await serve({
    directory: args.includes("--root") ? path.resolve(value("--root")) : stage,
    port: Number(args.includes("--port") ? value("--port") : 4173),
  });
}
