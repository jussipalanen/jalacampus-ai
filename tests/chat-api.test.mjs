import test from "node:test";
import assert from "node:assert/strict";
import { EmbeddingError } from "../src/lib/embeddings.ts";
import { DEFAULT_SIMILARITY_FLOOR, handleChatRequest, parseSimilarityFloor, UNAVAILABLE_FI } from "../src/lib/chat-api.ts";
import { AnswerServiceError, NO_EVIDENCE_FI } from "../src/lib/grounded-answer.ts";

const result = (id, score, sourceName = "kirjasto.txt") =>
  ({ chunkId: id, documentId: `doc-${id}`, sourceName, ordinal: 0, text: `Teksti ${id}`, score });
const RESULTS = [result("a", 0.8), result("b", 0.65, "liikunta.txt"), result("c", 0.5)];

const post = (body, headers = {}) => new Request("http://localhost/api/grounded-answer", {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

function deps(overrides = {}) {
  const calls = { search: [], answer: [] };
  return {
    calls,
    enabled: true,
    allow: () => true,
    floor: 0.6,
    search: async question => { calls.search.push(question); return RESULTS; },
    answer: async (question, passages) => {
      calls.answer.push({ question, passages });
      return { status: "answered", answer: "Kirjasto on auki [1].", citations: [passages[0].id] };
    },
    ...overrides,
  };
}

test("answers from passages above the floor and returns them for the UI", async () => {
  const d = deps();
  const response = await handleChatRequest(post({ question: "  Milloin kirjasto on auki?  " }), d);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    status: "answered", answer: "Kirjasto on auki [1].", citations: ["a"], passages: [RESULTS[0], RESULTS[1]],
  });
  assert.deepEqual(d.calls.search, ["Milloin kirjasto on auki?"]);
  assert.deepEqual(d.calls.answer[0].passages, [
    { id: "a", source: "kirjasto.txt", text: "Teksti a" },
    { id: "b", source: "liikunta.txt", text: "Teksti b" },
  ]);
});

test("nothing above the floor is no_evidence without calling jussi-aibot", async () => {
  const d = deps({ floor: 0.9 });
  const body = await (await handleChatRequest(post({ question: "Mikä on Suomen pääkaupunki?" }), d)).json();
  assert.deepEqual(body, { status: "no_evidence", answer: NO_EVIDENCE_FI, citations: [], passages: [] });
  assert.equal(d.calls.answer.length, 0);
});

test("jussi-aibot failures become 'unavailable' and keep the passages", async t => {
  t.mock.method(console, "error", () => {});
  for (const failure of [new AnswerServiceError("timed out"), new Error("bug")]) {
    const d = deps({ answer: async () => { throw failure; } });
    const response = await handleChatRequest(post({ question: "kirjasto" }), d);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(),
      { status: "unavailable", answer: UNAVAILABLE_FI, citations: [], passages: [RESULTS[0], RESULTS[1]] });
  }
});

test("search failures use the same Finnish errors as /api/search", async t => {
  t.mock.method(console, "error", () => {});
  const gemini = await handleChatRequest(post({ question: "kirjasto" }),
    deps({ search: async () => { throw new EmbeddingError("HTTP 503"); } }));
  assert.equal(gemini.status, 502);
  const db = await handleChatRequest(post({ question: "kirjasto" }),
    deps({ search: async () => { throw new Error("ECONNREFUSED"); } }));
  assert.equal(db.status, 503);
  assert.deepEqual(await db.json(), { error: "Haku ei ole juuri nyt käytettävissä." });
});

test("disabled, rate limited and invalid requests never search or answer", async () => {
  const disabled = deps({ enabled: false });
  const off = await handleChatRequest(post({ question: "kirjasto" }), disabled);
  assert.equal(off.status, 503);
  const offBody = await off.json();
  assert.match(offBody.error, /eivät ole käytössä/);
  assert.equal(offBody.code, "disabled");

  const limited = deps({ allow: () => false });
  assert.equal((await handleChatRequest(post({ question: "kirjasto" }), limited)).status, 429);

  const d = deps();
  for (const [request, status] of [
    [post("{"), 400], [post({ query: "kirjasto" }), 400], [post({ question: "   " }), 400],
    [post({ question: "ä".repeat(501) }), 400], [post({ question: "a".repeat(5_000) }), 413],
  ]) {
    assert.equal((await handleChatRequest(request, d)).status, status);
  }
  for (const x of [disabled, limited, d]) assert.deepEqual(x.calls, { search: [], answer: [] });
});

test("at most 8 passages are sent", async () => {
  const many = Array.from({ length: 12 }, (_, i) => result(`p${i}`, 0.9 - i * 0.01));
  const d = deps({ search: async () => many });
  await handleChatRequest(post({ question: "kirjasto" }), d);
  assert.equal(d.calls.answer[0].passages.length, 8);
});

test("SIMILARITY_FLOOR parsing", () => {
  assert.equal(parseSimilarityFloor(undefined), DEFAULT_SIMILARITY_FLOOR);
  assert.equal(parseSimilarityFloor(" "), DEFAULT_SIMILARITY_FLOOR);
  assert.equal(parseSimilarityFloor("0.55"), 0.55);
  for (const bad of ["abc", "-0.1", "1.5"]) assert.throws(() => parseSimilarityFloor(bad), RangeError);
});
