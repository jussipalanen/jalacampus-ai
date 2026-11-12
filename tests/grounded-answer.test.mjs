import test from "node:test";
import assert from "node:assert/strict";
import { AnswerServiceError, checkAnswer, createGroundedAnswerClient, DEFAULT_ANSWER_TIMEOUT_MS, NO_EVIDENCE_FI } from "../src/lib/grounded-answer.ts";

const PASSAGES = [
  { id: "chunk-library", source: "kirjasto.txt", text: "Kirjasto on avoinna arkisin kello 8–20." },
  { id: "chunk-sports", source: "liikunta.txt", text: "Kuntosali on avoinna joka päivä." },
];
const ANSWERED = { status: "answered", answer: "Kirjasto on auki arkisin kello 8–20 [1].", citations: ["chunk-library"] };
const NO_EVIDENCE = { status: "no_evidence", answer: NO_EVIDENCE_FI, citations: [] };

function mockFetch(respond) {
  const requests = [];
  const fetch = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) });
    return respond(url, init);
  };
  return { fetch, requests };
}

const json = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test("sends the question, Finnish language and passages with a bearer key", async () => {
  const { fetch, requests } = mockFetch(json(ANSWERED));
  const client = createGroundedAnswerClient({ url: "http://aibot.test:8080/", apiKey: "secret", fetch });
  assert.deepEqual(await client.answer("Milloin kirjasto on auki?", PASSAGES), ANSWERED);
  const [request] = requests;
  assert.equal(request.url, "http://aibot.test:8080/v1/grounded-answer");
  assert.equal(request.init.headers.authorization, "Bearer secret");
  assert.deepEqual(request.body, { question: "Milloin kirjasto on auki?", language: "fi", passages: PASSAGES });
  assert.ok(request.init.signal instanceof AbortSignal);
});

test("requires a URL and key", () => {
  assert.throws(() => createGroundedAnswerClient({ url: "", apiKey: "k" }), /AIBOT_URL/);
  assert.throws(() => createGroundedAnswerClient({ url: "http://x", apiKey: undefined }), /AIBOT_API_KEY/);
});

test("network errors, timeouts, HTTP errors and malformed bodies throw AnswerServiceError", async () => {
  const cases = [
    async () => { throw new TypeError("fetch failed"); },
    async () => { throw Object.assign(new Error("aborted"), { name: "TimeoutError" }); },
    json({ detail: "Rate limit exceeded" }, 429),
    json({ detail: "Gemini overloaded" }, 502),
    async () => new Response("<html>", { status: 200 }),
    json({ status: "maybe", answer: "x", citations: [] }),
    json({ status: "answered", answer: 5, citations: [] }),
    json({ status: "answered", answer: "x", citations: [1] }),
    json({ status: "answered", answer: "x".repeat(4001), citations: ["chunk-library"] }),
  ];
  for (const respond of cases) {
    const client = createGroundedAnswerClient({ url: "http://aibot.test", apiKey: "k", fetch: mockFetch(respond).fetch });
    await assert.rejects(client.answer("q", PASSAGES), AnswerServiceError);
  }
  const timeout = createGroundedAnswerClient({
    url: "http://aibot.test", apiKey: "k",
    fetch: mockFetch(async () => { throw Object.assign(new Error("aborted"), { name: "TimeoutError" }); }).fetch,
  });
  await assert.rejects(timeout.answer("q", PASSAGES), /timed out/);
});

test("no_evidence is passed through with the local Finnish sentence", () => {
  assert.deepEqual(checkAnswer({ ...NO_EVIDENCE, answer: "Something else" }, PASSAGES), NO_EVIDENCE);
});

test("second citation check: any unknown id or out-of-range marker makes the answer no_evidence", t => {
  const warn = t.mock.method(console, "warn", () => {});
  const untrusted = [
    { ...ANSWERED, citations: ["chunk-library", "chunk-invented"] },
    { ...ANSWERED, answer: "Kirjasto on auki [2].", citations: ["chunk-library"] },
    { ...ANSWERED, answer: "Kirjasto on auki [0].", citations: ["chunk-library"] },
  ];
  for (const body of untrusted) assert.deepEqual(checkAnswer(body, PASSAGES), NO_EVIDENCE);
  assert.equal(warn.mock.callCount(), 3);
});

test("an answer without citations or text is never shown as answered", () => {
  assert.deepEqual(checkAnswer({ ...ANSWERED, citations: [] }, PASSAGES), NO_EVIDENCE);
  assert.deepEqual(checkAnswer({ ...ANSWERED, answer: "   " }, PASSAGES), NO_EVIDENCE);
});

test("the default timeout outlasts jussi-aibot's worst case but stays short", () => {
  // jussi-aibot: 15 s per Gemini attempt, one retry on the fallback model.
  assert.ok(DEFAULT_ANSWER_TIMEOUT_MS > 30_000);
  assert.ok(DEFAULT_ANSWER_TIMEOUT_MS <= 40_000);
});
