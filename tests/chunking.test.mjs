import test from "node:test";
import assert from "node:assert/strict";
import { chunkDocument } from "../src/lib/chunking.ts";

test("same normalized document produces stable chunk IDs", () => {
  const first = chunkDocument("  Opinto-opas\r\n".repeat(80), 80, 10);
  const second = chunkDocument("  Opinto-opas\n".repeat(80), 80, 10);
  assert.deepEqual(first, second);
  assert.ok(first.chunks.length > 1);
  assert.deepEqual(first.chunks.map(chunk => chunk.ordinal), first.chunks.map((_, index) => index));
});

test("long text chunks overlap and preserve Unicode characters", () => {
  const result = chunkDocument("🙂".repeat(25), 10, 3);
  assert.ok(result.chunks.length > 1);
  for (const chunk of result.chunks) {
    assert.ok(Array.from(chunk.text).length <= 10);
    assert.doesNotMatch(chunk.text, /\ufffd/u);
  }
  assert.equal(result.chunks[0].text.slice(-6), result.chunks[1].text.slice(0, 6));
});

test("empty input and invalid chunk parameters are rejected", () => {
  assert.throws(() => chunkDocument("  "));
  assert.throws(() => chunkDocument("hello", 10, 10), RangeError);
  assert.throws(() => chunkDocument("hello", 1, 0), RangeError);
});
