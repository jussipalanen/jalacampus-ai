import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { judgeCase, parseCases, suggestFloor } from "../src/lib/eval.ts";

const passages = [{ chunkId: "c1", sourceName: "kirjasto.txt" }, { chunkId: "c2", sourceName: "liikunta.txt" }];
const answerable = { id: "a", kind: "answerable", question: "q", expect: { status: "answered", sources: ["kirjasto.txt"] } };

test("the shipped evaluation set is valid and its expected sources exist", () => {
  const cases = parseCases(JSON.parse(readFileSync(new URL("../data/eval/questions.json", import.meta.url), "utf8")));
  assert.ok(cases.length >= 20);
  for (const kind of ["answerable", "out_of_scope", "missing", "injection"]) {
    assert.ok(cases.some(c => c.kind === kind), `no ${kind} cases`);
  }
  for (const source of new Set(cases.flatMap(c => c.expect.sources ?? []))) {
    assert.ok(existsSync(new URL(`../data/samples/${source}`, import.meta.url)), `${source} is not in data/samples`);
  }
});

test("answerable cases need an answer citing only the expected sources", () => {
  assert.equal(judgeCase(answerable, { status: "answered", answer: "x [1]", citations: ["c1"], passages }).pass, true);
  assert.deepEqual(judgeCase(answerable, { status: "answered", answer: "x [1]", citations: ["c2"], passages }).reasons,
    ["cited unexpected sources: liikunta.txt"]);
  assert.deepEqual(judgeCase(answerable, { status: "no_evidence", answer: "-", citations: [], passages }).reasons,
    ["expected answered, got no_evidence"]);
  assert.deepEqual(judgeCase(answerable, { status: "unavailable", answer: "-", citations: [], passages }).reasons,
    ["answer service unavailable"]);
});

test("no_evidence cases and forbidden text", () => {
  const missing = { id: "m", kind: "missing", question: "q", expect: { status: "no_evidence" } };
  assert.equal(judgeCase(missing, { status: "no_evidence", answer: "-", citations: [], passages: [] }).pass, true);
  assert.equal(judgeCase(missing, { status: "answered", answer: "x [1]", citations: ["c1"], passages }).pass, false);

  const injection = { id: "i", kind: "injection", question: "q", expect: { forbid: ["HAKKEROITU"] } };
  assert.equal(judgeCase(injection, { status: "no_evidence", answer: "-", citations: [], passages }).pass, true);
  assert.deepEqual(judgeCase(injection, { status: "answered", answer: "hakkeroitu [1]", citations: ["c1"], passages }).reasons,
    ['answer contains forbidden text "HAKKEROITU"']);
});

test("invalid evaluation files are rejected", () => {
  assert.throws(() => parseCases({ cases: [] }));
  assert.throws(() => parseCases({ cases: [answerable, answerable] }), /duplicate/);
  assert.throws(() => parseCases({ cases: [{ ...answerable, kind: "other" }] }), /unknown kind/);
});

test("floor suggestion sits between out-of-scope and answerable scores", () => {
  const scores = [
    { kind: "answerable", topScore: 0.71 }, { kind: "answerable", topScore: 0.8 },
    { kind: "out_of_scope", topScore: 0.57 }, { kind: "out_of_scope", topScore: 0.6 },
    { kind: "missing", topScore: 0.72 },
  ];
  assert.deepEqual(suggestFloor(scores), { lowestAnswerable: 0.71, highestOutOfScope: 0.6, separable: true, floor: 0.66 });
  assert.equal(suggestFloor([{ kind: "answerable", topScore: 0.6 }, { kind: "out_of_scope", topScore: 0.65 }]).floor, null);
  assert.equal(suggestFloor([{ kind: "missing", topScore: 0.7 }]), null);
});
