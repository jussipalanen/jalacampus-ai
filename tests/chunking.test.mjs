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

test("overlapping chunks start and end on word boundaries", () => {
  // Unique words of varying length make a fixed-width overlap land mid-word.
  const words = Array.from({ length: 400 }, (_, i) => `sana${"x".repeat(i % 7)}${i}`);
  const text = words.join(" ");
  const known = new Set(words);
  const { chunks } = chunkDocument(text, 120, 30);
  assert.ok(chunks.length > 5);
  let previousEnd = 0;
  for (const [i, chunk] of chunks.entries()) {
    const tokens = chunk.text.split(" ");
    assert.ok(known.has(tokens[0]), `chunk ${i} starts mid-word: ${tokens[0]}`);
    assert.ok(known.has(tokens.at(-1)), `chunk ${i} ends mid-word: ${tokens.at(-1)}`);
    const start = text.indexOf(chunk.text);
    if (i > 0) assert.ok(start < previousEnd, `chunk ${i} does not overlap the previous chunk`);
    previousEnd = start + chunk.text.length;
  }
  assert.equal(previousEnd, text.length);
});
