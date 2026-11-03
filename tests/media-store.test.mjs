import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { backupMedia, restoreMedia } from "../build/media-store.mjs";

test("media backup restores missing originals and rejects corruption or local conflicts", async (t) => {
  const temporary = await mkdtemp("/private/tmp/portfolio-media-test-");
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const original = path.join(temporary, "original");
  const backup = path.join(temporary, "backup");
  const restored = path.join(temporary, "restored");
  await mkdir(path.join(original, "projects/P01"), { recursive: true });
  await writeFile(path.join(original, "projects/P01/1.webp"), "original image");
  assert.equal(await backupMedia(backup, original), 1);
  assert.equal(await restoreMedia(backup, restored), 1);
  assert.equal(await restoreMedia(backup, restored), 0);
  assert.equal(
    await readFile(path.join(restored, "projects/P01/1.webp"), "utf8"),
    "original image",
  );
  await writeFile(path.join(restored, "projects/P01/1.webp"), "new local edit");
  await assert.rejects(
    restoreMedia(backup, restored),
    /Existing local media differs/,
  );
  assert.equal(
    await readFile(path.join(restored, "projects/P01/1.webp"), "utf8"),
    "new local edit",
  );
  await writeFile(path.join(backup, "projects/P01/1.webp"), "corrupt backup");
  await assert.rejects(restoreMedia(backup, restored), /checksum mismatch/);
});
