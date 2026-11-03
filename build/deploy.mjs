import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  rm,
  rename,
  lstat,
  mkdtemp,
  cp,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { files, root, stage, cache } from "./paths.mjs";
import { checkSite } from "./check.mjs";
import { withBuildLock } from "./lock.mjs";
import { privateRetirement, projectOwners } from "./publication.mjs";
import { createLegacyManifest, legacyManifestPath } from "./legacy.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;
export function safeRelative(file) {
  return (
    typeof file === "string" &&
    file.length > 0 &&
    !file.startsWith("/") &&
    !file.split("/").some((part) => part === ".." || part === "." || !part) &&
    !/[\x00-\x1f\x7f\\]/.test(file)
  );
}
function safeAbsolute(directory) {
  if (
    !directory?.startsWith("/") ||
    directory === "/" ||
    !safeRelative(directory.slice(1).replace(/\/$/, ""))
  )
    throw new Error(`Unsafe deployment directory: ${directory}`);
  return directory.replace(/\/$/, "");
}
export async function execute(command, args, { input, fail = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code !== 0 && fail
        ? reject(new Error(`${command} exited ${code}: ${stderr || stdout}`))
        : resolve({ code, stdout, stderr }),
    );
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
async function localAdapter(destination, state) {
  const noSymlinks = async (file) => {
    const parts = path.resolve(file).split(path.sep);
    let cursor = path.parse(file).root;
    for (const part of parts.filter(Boolean)) {
      cursor = path.join(cursor, part);
      try {
        if ((await lstat(cursor)).isSymbolicLink())
          throw new Error(`Deployment refuses symlink: ${cursor}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  };
  return {
    target: `${destination}/`,
    revision: async () =>
      (
        await execute("git", [
          "-C",
          destination,
          "rev-parse",
          "--verify",
          "HEAD",
        ])
      ).stdout.trim(),
    inspect: async (list) => {
      const result = {};
      for (const file of list) {
        await noSymlinks(path.join(destination, file));
        try {
          result[file] = hash(await readFile(path.join(destination, file)));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      return result;
    },
    read: async () => {
      try {
        return JSON.parse(
          await readFile(path.join(state, "manifest.json"), "utf8"),
        );
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    verify: async (list) => {
      for (const file of list) await noSymlinks(path.join(destination, file));
    },
    lock: async () => {
      await mkdir(state, { recursive: true });
      await mkdir(path.join(state, "lock"));
    },
    unlock: () =>
      rm(path.join(state, "lock"), { recursive: true, force: true }),
    remove: async (records, nextFiles) => {
      const removed = [];
      for (const item of records) {
        const absolute = path.join(destination, item.path);
        await noSymlinks(absolute);
        try {
          const actual = hash(await readFile(absolute));
          if (actual !== item.sha256) {
            if (privateRetirement(item.path, nextFiles, item.projects))
              throw new Error(
                `Private file changed during deployment: ${item.path}`,
              );
            console.warn(`Preserved server-modified file: ${item.path}`);
            continue;
          }
          await rm(absolute);
          removed.push(item.path);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      return removed;
    },
    commit: async (manifest) => {
      await writeFile(
        path.join(state, "manifest.next.json"),
        JSON.stringify(manifest, null, 2),
      );
      await rename(
        path.join(state, "manifest.next.json"),
        path.join(state, "manifest.json"),
      );
    },
  };
}
async function remoteAdapter(host, destination, state) {
  if (!/^(?:[a-zA-Z0-9_.-]+@)?[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(host))
    throw new Error("Invalid SSH host; use SSH config for ports/keys");
  const ssh = (script) =>
    execute(
      "ssh",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=10",
        "--",
        host,
        "sh",
        "-s",
      ],
      { input: `set -eu\n${script}\n` },
    );
  const symlinks = (list) =>
    `for rel in ${list.map(quote).join(" ")}; do cursor=${quote(destination)}; test ! -L "$cursor"; oldIFS=$IFS; IFS=/; set -f; for part in $rel; do cursor="$cursor/$part"; test ! -L "$cursor" || { echo "Refusing symlink: $cursor" >&2; exit 1; }; done; IFS=$oldIFS; set +f; done`;
  return {
    target: `${host}:${destination}/`,
    revision: async () =>
      (
        await ssh(`git -C ${quote(destination)} rev-parse --verify HEAD`)
      ).stdout.trim(),
    inspect: async (list) => {
      if (!list.length) return {};
      const { stdout } = await ssh(
        `${symlinks(list)}\n${list.map((file) => `if test -f ${quote(`${destination}/${file}`)}; then actual=$(sha256sum ${quote(`${destination}/${file}`)} | cut -d ' ' -f 1); printf '%s\\t%s\\n' ${quote(file)} "$actual"; fi`).join("\n")}`,
      );
      return Object.fromEntries(
        stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => line.split("\t")),
      );
    },
    read: async () => {
      const { stdout } = await ssh(
        `rsync --version >/dev/null\nif test -f ${quote(`${state}/manifest.json`)}; then cat ${quote(`${state}/manifest.json`)}; fi`,
      );
      return stdout.trim() ? JSON.parse(stdout) : null;
    },
    verify: async (list) => {
      if (list.length) await ssh(symlinks(list));
    },
    lock: () =>
      ssh(
        `mkdir -p ${quote(state)}\nmkdir ${quote(`${state}/lock`)} || { echo 'Another deployment is running, or previous lock needs inspection.' >&2; exit 1; }`,
      ),
    unlock: () => ssh(`rmdir ${quote(`${state}/lock`)}`),
    remove: async (records, nextFiles) => {
      if (!records.length) return [];
      const { stdout } = await ssh(
        `${symlinks(records.map((item) => item.path))}\n${records.map((item) => `file=${quote(`${destination}/${item.path}`)}\nif test -f "$file"; then actual=$(sha256sum "$file" | cut -d ' ' -f 1); if test "$actual" = ${quote(item.sha256)}; then rm -- "$file"; printf '%s\\n' ${quote(item.path)}; else printf '%s\\n' ${quote(`${privateRetirement(item.path, nextFiles, item.projects) ? "Private file changed during deployment" : "Preserved server-modified file"}: ${item.path}`)} >&2; ${privateRetirement(item.path, nextFiles, item.projects) ? "exit 1;" : ""} fi; fi`).join("\n")}`,
      );
      return stdout.trim().split("\n").filter(Boolean);
    },
    commit: async (manifest) => {
      const content = Buffer.from(JSON.stringify(manifest, null, 2)).toString(
        "base64",
      );
      await ssh(
        `printf '%s' ${quote(content)} | base64 -d > ${quote(`${state}/manifest.next.json`)}\nmv ${quote(`${state}/manifest.next.json`)} ${quote(`${state}/manifest.json`)}`,
      );
    },
  };
}
export function planPruning(
  previous,
  nextFiles,
  { now = Date.now(), retentionDays = null } = {},
) {
  const retained = new Map(
    (previous?.retained || []).map((item) => [item.path, item]),
  );
  for (const [file, info] of Object.entries(previous?.files || {}))
    if (!nextFiles[file] && !retained.has(file))
      retained.set(file, {
        path: file,
        sha256: info.sha256,
        ...(info.projects ? { projects: projectOwners(info.projects) } : {}),
        retiredAt: now,
      });
  for (const file of Object.keys(nextFiles)) retained.delete(file);
  const prune = [];
  const keep = [];
  for (const item of retained.values()) {
    if (!safeRelative(item.path) || !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error("Invalid previous deployment manifest");
    const metadata = /(?:\.html|sitemap\.xml|robots\.txt)$/.test(item.path);
    const expired =
      retentionDays !== null &&
      now - item.retiredAt >= retentionDays * 86400000;
    (metadata ||
    privateRetirement(item.path, nextFiles, item.projects) ||
    expired
      ? prune
      : keep
    ).push(item);
  }
  return { prune, keep };
}
export async function deploy({
  source = stage,
  host,
  destination,
  stateDirectory,
  local = false,
  dryRun = false,
  retentionDays = null,
  legacyManifest,
  projectAssets = {},
  beforeTransfer,
} = {}) {
  if (!local && !host)
    throw new Error(
      "Deployment host is required; no public default is configured.",
    );
  destination = safeAbsolute(destination);
  const state = safeAbsolute(
    stateDirectory ||
      `/var/lib/its-pyotr-deploy/${hash(destination).slice(0, 12)}`,
  );
  if (state === destination || state.startsWith(`${destination}/`))
    throw new Error("Deployment state must be outside public web root");
  if (
    retentionDays !== null &&
    (!Number.isFinite(retentionDays) || retentionDays < 0)
  )
    throw new Error(
      "Asset retention days must be nonnegative; omit when HTML cache lifetime is unknown",
    );
  const adapter = local
    ? await localAdapter(destination, state)
    : await remoteAdapter(host, destination, state);
  let locked = false;
  const temporary = await mkdtemp(path.join(os.tmpdir(), "portfolio-deploy-"));
  try {
    const snapshot = path.join(temporary, "site");
    let sourceProjects = projectAssets;
    const capture = async () => {
      await cp(source, snapshot, { recursive: true });
      if (path.resolve(source) === stage) {
        const record = JSON.parse(
          await readFile(path.join(cache, "build-manifest.json"), "utf8"),
        );
        if (!record.projectAssets)
          throw new Error(
            "Build publication ownership is missing; run npm run build locally",
          );
        sourceProjects = record.projectAssets;
      }
    };
    if (path.resolve(source) === stage) await withBuildLock(capture);
    else await capture();
    source = snapshot;
    await checkSite(source);
    const list = await files(source);
    const nextFiles = {};
    for (const file of list) {
      if (!safeRelative(file)) throw new Error(`Unsafe public path: ${file}`);
      nextFiles[file] = {
        sha256: hash(await readFile(path.join(source, file))),
      };
      const owners = projectOwners(sourceProjects[file]);
      if (owners.length) {
        if (owners.some((id) => !list.includes(`archive/${id}/index.html`)))
          throw new Error(
            `Project asset ownership has no public page: ${file}`,
          );
        nextFiles[file].projects = owners;
      }
    }
    if (!dryRun) {
      await adapter.lock();
      locked = true;
    }
    let previous = await adapter.read();
    let adopted = false;
    if (!previous && legacyManifest) {
      if (
        legacyManifest.version !== 1 ||
        !/^[a-f0-9]{40,64}$/.test(legacyManifest.revision)
      )
        throw new Error("Invalid legacy deployment inventory");
      const revision = await adapter.revision();
      if (revision !== legacyManifest.revision)
        throw new Error(
          `Server Git revision differs from legacy inventory. Run npm run deploy:prepare -- ${revision} locally, then retry the dry-run.`,
        );
      previous = {
        version: 1,
        destination,
        files: legacyManifest.files,
        retained: [],
      };
      adopted = true;
    }
    if (
      previous &&
      (previous.version !== 1 ||
        previous.destination !== destination ||
        !previous.files ||
        !Array.isArray(previous.retained))
    )
      throw new Error("Deployment manifest does not match destination");
    if (previous)
      for (const [file, info] of Object.entries(previous.files)) {
        if (!safeRelative(file) || !/^[a-f0-9]{64}$/.test(info.sha256))
          throw new Error("Invalid previous deployment manifest");
        projectOwners(info.projects);
      }
    const planned = planPruning(previous, nextFiles, { retentionDays });
    await adapter.verify([...list, ...planned.prune.map((item) => item.path)]);
    const actual = await adapter.inspect(
      planned.prune.map((item) => item.path),
    );
    const prune = [];
    const keep = [...planned.keep];
    for (const item of planned.prune) {
      if (!actual[item.path]) continue;
      if (actual[item.path] === item.sha256) {
        prune.push(item);
        continue;
      }
      if (privateRetirement(item.path, nextFiles, item.projects))
        throw new Error(
          `Cannot safely remove changed private file: ${item.path}`,
        );
      console.warn(`Preserved server-modified file: ${item.path}`);
      keep.push(item);
    }
    const phases = [
      list.filter((file) => !/(?:\.html|sitemap\.xml|robots\.txt)$/.test(file)),
      list.filter((file) => /(?:\.html|sitemap\.xml|robots\.txt)$/.test(file)),
    ];
    let changes = "";
    await beforeTransfer?.(source);
    for (let index = 0; index < phases.length; index++) {
      const include = path.join(temporary, `phase-${index}`);
      await writeFile(include, `${phases[index].join("\0")}\0`);
      if (!phases[index].length) continue;
      const result = await execute("rsync", [
        "--recursive",
        "--relative",
        "--checksum",
        "--no-perms",
        "--no-owner",
        "--no-group",
        "--delay-updates",
        "--itemize-changes",
        "--protect-args",
        "--from0",
        `--files-from=${include}`,
        ...(dryRun ? ["--dry-run"] : []),
        ...(!local ? ["--rsh=ssh -o BatchMode=yes -o ConnectTimeout=10"] : []),
        "--",
        `${source}/`,
        adapter.target,
      ]);
      changes += result.stdout;
    }
    console.log(changes || "No changed files.");
    for (const item of prune)
      console.log(`${dryRun ? "WOULD REMOVE" : "STALE"} ${item.path}`);
    if (!previous)
      console.log(
        "First deployment: unknown server files preserved; ownership begins with this snapshot.",
      );
    if (adopted)
      console.log(
        "Verified previous Git deployment; only matching inventory-owned stale files are eligible for cleanup.",
      );
    if (!dryRun) {
      const removed = await adapter.remove(prune, nextFiles);
      await adapter.commit({
        version: 1,
        destination,
        updatedAt: new Date().toISOString(),
        files: nextFiles,
        retained: [
          ...keep,
          ...prune.filter((item) => !removed.includes(item.path)),
        ],
      });
    }
    return {
      changes,
      prune: prune.map((item) => item.path),
      retained: keep.map((item) => item.path),
    };
  } finally {
    try {
      if (locked) await adapter.unlock();
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
}
export function deploymentOptions(args, environment = process.env) {
  const known = new Set([
    "--dry-run",
    "--host",
    "--path",
    "--state-dir",
    "--asset-retention-days",
    "--legacy-manifest",
  ]);
  for (let index = 0; index < args.length; index++) {
    if (!known.has(args[index]))
      throw new Error(`Unknown option: ${args[index]}`);
    if (args[index] !== "--dry-run") {
      if (!args[index + 1] || args[index + 1].startsWith("--"))
        throw new Error(`Missing value: ${args[index]}`);
      index++;
    }
  }
  const value = (key, fallback) =>
    args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
  const host = value("--host", environment.DEPLOY_HOST);
  const destination = value("--path", environment.DEPLOY_PATH);
  if (!host || !destination)
    throw new Error(
      "Set DEPLOY_HOST and DEPLOY_PATH in ignored .env.deploy.local, or pass --host and --path. See .env.example.",
    );
  return {
    host,
    destination,
    stateDirectory: value("--state-dir", environment.DEPLOY_STATE_DIR),
    legacyManifestFile: value(
      "--legacy-manifest",
      environment.DEPLOY_LEGACY_MANIFEST || legacyManifestPath,
    ),
    dryRun: args.includes("--dry-run"),
    retentionDays: args.includes("--asset-retention-days")
      ? Number(value("--asset-retention-days"))
      : null,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args[0] === "--prepare-legacy") {
    const manifest = await createLegacyManifest({
      revision: args[1] || "HEAD",
    });
    try {
      const file = path.join(root, ".env.deploy.local");
      const previous = (await readFile(file, "utf8")).replace(
        /^DEPLOY_LEGACY_REVISION=.*\n?/m,
        "",
      );
      await writeFile(
        file,
        `${previous.trimEnd()}\nDEPLOY_LEGACY_REVISION=${manifest.revision}\n`,
        { mode: 0o600 },
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    console.log(
      `Prepared private legacy inventory: ${Object.keys(manifest.files).length} tracked files. No server contacted.`,
    );
    process.exit(0);
  }
  try {
    process.loadEnvFile(path.join(root, ".env.deploy.local"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const options = deploymentOptions(args);
  try {
    options.legacyManifest = JSON.parse(
      await readFile(options.legacyManifestFile, "utf8"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (process.env.DEPLOY_LEGACY_REVISION)
      options.legacyManifest = await createLegacyManifest({
        revision: process.env.DEPLOY_LEGACY_REVISION,
        output: options.legacyManifestFile,
      });
  }
  const { build } = await import("./build.mjs");
  await build();
  await deploy(options);
}
