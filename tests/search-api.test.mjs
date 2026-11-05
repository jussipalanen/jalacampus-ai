import test from "node:test";
import assert from "node:assert/strict";
import { EmbeddingError } from "../src/lib/embeddings.ts";
import { createRateLimiter } from "../src/lib/rate-limit.ts";
import { handleSearchRequest } from "../src/lib/search-api.ts";

const RESULT = { chunkId: "c1", documentId: "d1", sourceName: "kirjasto.txt", ordinal: 0, text: "Kirjasto on auki.", score: 0.75 };

const post = (body, headers = {}) => new Request("http://localhost/api/search", {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

function deps(overrides = {}) {
  const queries = [];
  return {
    queries,
    enabled: true,
    allow: () => true,
    search: async query => { queries.push(query); return [RESULT]; },
    ...overrides,
  };
}

test("returns search results for a trimmed question", async () => {
  const d = deps();
  const response = await handleSearchRequest(post({ query: "  Milloin kirjasto on auki?  " }), d);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { results: [RESULT] });
  assert.deepEqual(d.queries, ["Milloin kirjasto on auki?"]);
});

test("is disabled with a Finnish notice when not configured", async () => {
  const d = deps({ enabled: false });
  const response = await handleSearchRequest(post({ query: "kirjasto" }), d);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error, /Haku ei ole käytössä/);
  assert.equal(body.code, "disabled");
  assert.equal(d.queries.length, 0);
});

test("rejects invalid input before searching", async () => {
  const cases = [
    [post("{ei json"), 400, /Virheellinen pyyntö/],
    [post({}), 400, /1–500 merkkiä/],
    [post({ query: 42 }), 400, /1–500 merkkiä/],
    [post({ query: "   " }), 400, /1–500 merkkiä/],
    [post({ query: "ä".repeat(501) }), 400, /1–500 merkkiä/],
    [post({ query: "a".repeat(5_000) }), 413, /liian suuri/],
  ];
  const d = deps();
  for (const [request, status, message] of cases) {
    const response = await handleSearchRequest(request, d);
    assert.equal(response.status, status);
    assert.match((await response.json()).error, message);
  }
  assert.equal(d.queries.length, 0);
});

test("rate limits per client address", async () => {
  const keys = [];
  const d = deps({ allow: key => { keys.push(key); return false; } });
  const response = await handleSearchRequest(post({ query: "kirjasto" }, { "x-forwarded-for": "203.0.113.5, 10.0.0.1" }), d);
  assert.equal(response.status, 429);
  await handleSearchRequest(post({ query: "kirjasto" }), d);
  assert.deepEqual(keys, ["203.0.113.5", "local"]);
  assert.equal(d.queries.length, 0);
});

test("maps embedding and database failures to Finnish errors without details", async t => {
  t.mock.method(console, "error", () => {});
  const gemini = await handleSearchRequest(post({ query: "kirjasto" }),
    deps({ search: async () => { throw new EmbeddingError("Gemini embedding request failed with HTTP 429."); } }));
  assert.equal(gemini.status, 502);
  assert.deepEqual(await gemini.json(), { error: "Hakupalvelu ei vastannut. Yritä hetken kuluttua uudelleen." });

  const db = await handleSearchRequest(post({ query: "kirjasto" }),
    deps({ search: async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:5432"); } }));
  assert.equal(db.status, 503);
  assert.deepEqual(await db.json(), { error: "Haku ei ole juuri nyt käytettävissä." });
});

test("rate limiter allows a fixed number of requests per window and key", () => {
  let time = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => time });
  assert.deepEqual([limiter.allow("a"), limiter.allow("a"), limiter.allow("a"), limiter.allow("b")], [true, true, false, true]);
  time = 1_000;
  assert.equal(limiter.allow("a"), true);
});
