import test from "node:test";
import assert from "node:assert/strict";
import { createGeminiEmbedder, EmbeddingError, formatGeminiInput } from "../src/lib/embeddings.ts";

const API_KEY = "test-key-not-real";
const vector = (seed, length = 768) => Array.from({ length }, (_, i) => ((i * 7 + seed) % 13) - 6);

/** Mocked fetch that answers with `responses` in order and records each request. */
function mockFetch(responses) {
  const requests = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push({ url, headers: init.headers, body });
    const next = responses.shift() ?? { status: 200 };
    const payload = next.json ?? { embeddings: body.requests.map((_, i) => ({ values: vector(i) })) };
    return new Response(JSON.stringify(payload), { status: next.status ?? 200 });
  };
  return { fetch, requests };
}

const noSleep = async () => {};

test("documents and queries use the gemini-embedding-2 prompt formats", () => {
  assert.equal(formatGeminiInput({ kind: "query", text: "Milloin ilmoittaudun?" }),
    "task: search result | query: Milloin ilmoittaudun?");
  assert.equal(formatGeminiInput({ kind: "document", title: "opas.txt", text: "Ilmoittaudu ajoissa." }),
    "title: opas.txt | text: Ilmoittaudu ajoissa.");
  assert.equal(formatGeminiInput({ kind: "document", text: "Ilman otsikkoa." }), "title: none | text: Ilman otsikkoa.");
});

test("sends a batch request with the key in a header and returns unit vectors", async () => {
  const { fetch, requests } = mockFetch([]);
  const embedder = createGeminiEmbedder({ apiKey: API_KEY, fetch, sleep: noSleep });
  const vectors = await embedder.embed([{ kind: "query", text: "kurssit" }, { kind: "document", text: "opinto-opas" }]);

  assert.equal(requests.length, 1);
  const [request] = requests;
  assert.equal(request.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents");
  assert.equal(request.headers["x-goog-api-key"], API_KEY);
  assert.ok(!request.url.includes(API_KEY));
  assert.deepEqual(request.body.requests[0], {
    model: "models/gemini-embedding-2",
    content: { parts: [{ text: "task: search result | query: kurssit" }] },
    output_dimensionality: 768,
  });
  assert.equal(vectors.length, 2);
  for (const v of vectors) {
    assert.equal(v.length, 768);
    assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  }
});

test("splits large inputs into batches of at most 100 and keeps order", async () => {
  const { fetch, requests } = mockFetch([]);
  const embedder = createGeminiEmbedder({ apiKey: API_KEY, fetch, sleep: noSleep });
  const inputs = Array.from({ length: 230 }, (_, i) => ({ kind: "document", text: `osa ${i}` }));
  const vectors = await embedder.embed(inputs);
  assert.deepEqual(requests.map(r => r.body.requests.length), [100, 100, 30]);
  assert.equal(requests[2].body.requests[29].content.parts[0].text, "title: none | text: osa 229");
  assert.equal(vectors.length, 230);
  assert.deepEqual(await embedder.embed([]), []);
  assert.equal(requests.length, 3);
});

test("retries rate limits and server errors with backoff, then succeeds", async () => {
  const { fetch, requests } = mockFetch([{ status: 429, json: {} }, { status: 503, json: {} }]);
  const delays = [];
  const embedder = createGeminiEmbedder({ apiKey: API_KEY, fetch, sleep: async ms => { delays.push(ms); } });
  const vectors = await embedder.embed([{ kind: "query", text: "kirjasto" }]);
  assert.equal(vectors.length, 1);
  assert.equal(requests.length, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
});

test("fails without leaking the key after retries or on client errors", async () => {
  const exhausted = mockFetch(Array.from({ length: 5 }, () => ({ status: 429, json: {} })));
  const embedder = createGeminiEmbedder({ apiKey: API_KEY, fetch: exhausted.fetch, sleep: noSleep, maxRetries: 2 });
  await assert.rejects(embedder.embed([{ kind: "query", text: "x" }]), error =>
    error instanceof EmbeddingError && error.message.includes("429") && !error.message.includes(API_KEY));
  assert.equal(exhausted.requests.length, 3);

  const badRequest = mockFetch([{ status: 400, json: {} }]);
  const strict = createGeminiEmbedder({ apiKey: API_KEY, fetch: badRequest.fetch, sleep: noSleep });
  await assert.rejects(strict.embed([{ kind: "query", text: "x" }]), EmbeddingError);
  assert.equal(badRequest.requests.length, 1);
});

test("rejects malformed responses and a missing key", async () => {
  const cases = [
    { embeddings: [] },
    { embeddings: [{ values: vector(1, 767) }] },
    { embeddings: [{ values: [...vector(1, 767), "1"] }] },
    { embeddings: [{ values: new Array(768).fill(0) }] },
  ];
  for (const json of cases) {
    const { fetch } = mockFetch([{ json }]);
    const embedder = createGeminiEmbedder({ apiKey: API_KEY, fetch, sleep: noSleep });
    await assert.rejects(embedder.embed([{ kind: "query", text: "x" }]), EmbeddingError);
  }
  assert.throws(() => createGeminiEmbedder({ apiKey: undefined }), EmbeddingError);
  assert.throws(() => createGeminiEmbedder({ apiKey: "" }), EmbeddingError);
});
