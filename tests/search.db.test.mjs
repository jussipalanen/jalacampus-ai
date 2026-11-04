import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { migrate } from "../src/lib/db/migrate.ts";
import { embedPendingChunks } from "../src/lib/embed-chunks.ts";
import { ingestDocument } from "../src/lib/ingestion.ts";
import { MAX_QUERY_LENGTH, searchChunks } from "../src/lib/search.ts";
import { createFakeEmbedder } from "./helpers/fake-embedder.mjs";

// Same guard as the other DB tests: these tests drop and truncate tables.
const url = process.env.TEST_DATABASE_URL;
if (process.env.REQUIRE_DATABASE_TESTS === "1" && !url) {
  throw new Error("REQUIRE_DATABASE_TESTS=1 but TEST_DATABASE_URL is not set.");
}
if (url && !new URL(url).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a database whose name ends in _test.");
}

// Synthetic fixtures; the fake embedder ranks by shared words.
const DOCS = {
  "kirjasto.txt": "Kirjasto on avoinna arkisin. Kirjaston kurssikirjat lainataan opiskelijakortilla.",
  "liikunta.txt": "Kuntosali on avoinna joka päivä. Salivuorot varataan liikuntapalvelusta.",
  "tentit.txt": "Tenttiin ilmoittaudutaan viikkoa ennen. Hylätyn tentin voi uusia kaksi kertaa.",
};

describe("PostgreSQL semantic search", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let pool;
  let client;

  before(async () => {
    pool = new pg.Pool({ connectionString: url, max: 2 });
    client = await pool.connect();
    await client.query("DROP TABLE IF EXISTS document_chunks, documents, schema_migrations");
    await migrate(client);
  });

  after(async () => {
    client?.release();
    await pool?.end();
  });

  beforeEach(async () => {
    await client.query("TRUNCATE documents CASCADE");
  });

  const ingestAll = async embedder => {
    for (const [sourceName, text] of Object.entries(DOCS)) await ingestDocument(client, { sourceName, text });
    await embedPendingChunks(client, embedder);
  };

  test("ranks the most similar chunk first with traceable IDs", async () => {
    const embedder = createFakeEmbedder();
    await ingestAll(embedder);
    const results = await searchChunks(client, embedder, "  Milloin kirjasto on avoinna?  ");

    assert.equal(results.length, 3);
    assert.equal(results[0].sourceName, "kirjasto.txt");
    assert.equal(results[0].text, DOCS["kirjasto.txt"]);
    assert.equal(results[0].ordinal, 0);
    assert.ok(results.every((r, i) => i === 0 || results[i - 1].score >= r.score));
    assert.ok(results[0].score > 0 && results[0].score <= 1 + 1e-9);

    const { rows: [stored] } = await client.query(
      "SELECT id, document_id FROM document_chunks WHERE content = $1", [DOCS["kirjasto.txt"]]);
    assert.equal(results[0].chunkId, stored.id);
    assert.equal(results[0].documentId, stored.document_id);
    assert.deepEqual(embedder.calls.at(-1), [{ kind: "query", text: "Milloin kirjasto on avoinna?" }]);
  });

  test("respects the limit and ignores chunks from other models or without embeddings", async () => {
    const embedder = createFakeEmbedder();
    await ingestAll(embedder);
    assert.equal((await searchChunks(client, embedder, "tentti", { limit: 1 })).length, 1);

    await ingestDocument(client, { sourceName: "uusi.txt", text: "Uusi kirjasto avataan pian." });
    assert.ok((await searchChunks(client, embedder, "kirjasto")).every(r => r.sourceName !== "uusi.txt"));
    assert.deepEqual(await searchChunks(client, createFakeEmbedder("other-model"), "kirjasto"), []);
  });

  test("returns an empty list when nothing is embedded", async () => {
    assert.deepEqual(await searchChunks(client, createFakeEmbedder(), "kirjasto"), []);
  });

  test("rejects invalid queries and limits before calling the embedder", async () => {
    const embedder = createFakeEmbedder();
    for (const [query, options] of [
      ["   ", {}],
      ["ä".repeat(MAX_QUERY_LENGTH + 1), {}],
      ["kirjasto", { limit: 0 }],
      ["kirjasto", { limit: 21 }],
      ["kirjasto", { limit: 2.5 }],
    ]) {
      await assert.rejects(searchChunks(client, embedder, query, options), RangeError);
    }
    assert.equal(embedder.calls.length, 0);
    assert.equal((await searchChunks(client, embedder, "ä".repeat(MAX_QUERY_LENGTH))).length, 0);
  });
});
