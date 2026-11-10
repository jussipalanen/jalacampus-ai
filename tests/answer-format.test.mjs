import test from "node:test";
import assert from "node:assert/strict";
import { orderPassages, stripCitations, typedLength } from "../src/lib/answer-format.ts";

test("removes citation markers and the space before them", () => {
  assert.equal(stripCitations("Auki 8–20 [1]. Lauantaisin 10–16 [2][1].", 2), "Auki 8–20. Lauantaisin 10–16.");
  assert.equal(stripCitations("Katso ohje [1], [2] ja jatka.", 2), "Katso ohje ja jatka.");
  assert.equal(stripCitations("[1] Alku ja loppu [2]", 2), "Alku ja loppu");
});

test("markers outside the citation list stay plain text", () => {
  assert.equal(stripCitations("A [0] B [3] C [2]", 2), "A [0] B [3] C");
  assert.equal(stripCitations("Ei viitteitä.", 0), "Ei viitteitä.");
  assert.equal(stripCitations("", 1), "");
});

test("typing reveals text over time and stops at the full length", () => {
  assert.equal(typedLength(0, 100), 0);
  assert.equal(typedLength(1000, 100), 40);
  assert.equal(typedLength(60_000, 100), 100);
});

test("long answers finish typing within the time limit", () => {
  assert.equal(typedLength(6000, 5000), 5000);
  assert.equal(typedLength(3000, 5000), 2500);
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
