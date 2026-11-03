import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { cache } from "./paths.mjs";

export async function withBuildLock(action) {
  await mkdir(cache, { recursive: true });
  const lock = path.join(cache, "build.lock");
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    throw new Error(
      "Another build or deployment snapshot is running. Remove .cache/build.lock only after confirming it has stopped.",
    );
  }
  try {
    return await action();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
