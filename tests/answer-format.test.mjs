import test from "node:test";
import assert from "node:assert/strict";
import { orderPassages, splitAnswer } from "../src/lib/answer-format.ts";

test("splits text and valid citation markers", () => {
  assert.deepEqual(splitAnswer("Auki 8–20 [1]. Lauantaisin 10–16 [2][1].", 2), [
    { type: "text", text: "Auki 8–20 " },
    { type: "cite", n: 1 },
    { type: "text", text: ". Lauantaisin 10–16 " },
    { type: "cite", n: 2 },
    { type: "cite", n: 1 },
    { type: "text", text: "." },
  ]);
});

test("markers outside the citation list stay plain text", () => {
  assert.deepEqual(splitAnswer("A [0] B [3] C [2]", 2), [
    { type: "text", text: "A [0] B [3] C " },
    { type: "cite", n: 2 },
  ]);
  assert.deepEqual(splitAnswer("Ei viitteitä.", 0), [{ type: "text", text: "Ei viitteitä." }]);
  assert.deepEqual(splitAnswer("", 1), []);
});

test("HTML in an answer is kept as text, not interpreted", () => {
  assert.deepEqual(splitAnswer("<b>x</b> [1]", 1), [{ type: "text", text: "<b>x</b> " }, { type: "cite", n: 1 }]);
});

test("cited passages come first in citation order, then the rest in search order", () => {
  const p = id => ({ chunkId: id });
  const { cited, others } = orderPassages([p("a"), p("b"), p("c"), p("d")], ["c", "a"]);
  assert.deepEqual(cited, [{ n: 1, passage: p("c") }, { n: 2, passage: p("a") }]);
  assert.deepEqual(others, [p("b"), p("d")]);
});

test("citations without a matching passage are skipped", () => {
  const { cited, others } = orderPassages([{ chunkId: "a" }], ["missing", "a"]);
  assert.deepEqual(cited, [{ n: 2, passage: { chunkId: "a" } }]);
  assert.deepEqual(others, []);
});
