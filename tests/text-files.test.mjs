import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chunkDocument } from "../src/lib/chunking.ts";
import { collectTextFiles, readTextFile } from "../src/lib/text-files.ts";

const withTempDir = async fn => {
  const dir = await mkdtemp(join(tmpdir(), "jalacampus-"));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
};

test("collects .txt files from directories, sorted and de-duplicated", () => withTempDir(async dir => {
  await writeFile(join(dir, "b.txt"), "B");
  await writeFile(join(dir, "a.TXT"), "A");
  await writeFile(join(dir, "kuva.png"), "x");
  const files = await collectTextFiles([dir, join(dir, "b.txt")]);
  assert.deepEqual(files, [join(dir, "a.TXT"), join(dir, "b.txt")]);
  await assert.rejects(collectTextFiles([join(dir, "kuva.png")]), /Only UTF-8 \.txt/);
}));

test("reads UTF-8 text without truncation and rejects invalid or oversized files", () => withTempDir(async dir => {
  const long = "ä".repeat(30_000);
  await writeFile(join(dir, "pitka.txt"), long);
  assert.deepEqual(await readTextFile(join(dir, "pitka.txt")), { path: join(dir, "pitka.txt"), sourceName: "pitka.txt", text: long });

  await writeFile(join(dir, "latin1.txt"), Buffer.from([0x70, 0xe4, 0x69]));
  await assert.rejects(readTextFile(join(dir, "latin1.txt")), /not valid UTF-8/);
  await writeFile(join(dir, "iso.txt"), Buffer.alloc(2 * 1024 * 1024 + 1, 0x61));
  await assert.rejects(readTextFile(join(dir, "iso.txt")), /larger than 2 MB/);
}));

test("sample corpus is synthetic Finnish text that chunks cleanly", async () => {
  const paths = await collectTextFiles([new URL("../data/samples", import.meta.url).pathname]);
  assert.ok(paths.length >= 5);
  for (const path of paths) {
    const { text } = await readTextFile(path);
    assert.match(text, /^Kuvitteellinen JalaCampus-korkeakoulu – /, path);
    assert.ok(chunkDocument(text).chunks.length >= 1);
  }
});
