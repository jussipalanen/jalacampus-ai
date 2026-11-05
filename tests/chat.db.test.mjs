import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { handleChatRequest } from "../src/lib/chat-api.ts";
import { migrate } from "../src/lib/db/migrate.ts";
import { embedPendingChunks } from "../src/lib/embed-chunks.ts";
import { checkAnswer } from "../src/lib/grounded-answer.ts";
import { ingestDocument } from "../src/lib/ingestion.ts";
import { searchChunks } from "../src/lib/search.ts";
import { createFakeEmbedder } from "./helpers/fake-embedder.mjs";

// Same guard as the other DB tests: these tests drop and truncate tables.
const url = process.env.TEST_DATABASE_URL;
if (process.env.REQUIRE_DATABASE_TESTS === "1" && !url) {
  throw new Error("REQUIRE_DATABASE_TESTS=1 but TEST_DATABASE_URL is not set.");
}
if (url && !new URL(url).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a database whose name ends in _test.");
}

describe("PostgreSQL chat flow with a mocked jussi-aibot", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let pool;
  let client;
  const embedder = createFakeEmbedder();

  before(async () => {
    pool = new pg.Pool({ connectionString: url, max: 2 });
    client = await pool.connect();
    await client.query("DROP TABLE IF EXISTS document_chunks, documents, schema_migrations");
    await migrate(client);
    // Synthetic fixtures.
    await ingestDocument(client, { sourceName: "kirjasto.txt", text: "Kirjasto on avoinna arkisin kello 8–20." });
    await ingestDocument(client, { sourceName: "liikunta.txt", text: "Kuntosali on avoinna joka päivä." });
    await embedPendingChunks(client, embedder);
  });

  after(async () => {
    client?.release();
    await pool?.end();
  });

  const chat = answer => handleChatRequest(
    new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ question: "Milloin kirjasto on avoinna?" }) }),
    {
      enabled: true,
      allow: () => true,
      floor: 0,
      search: question => searchChunks(client, embedder, question, { limit: 8 }),
      answer,
    },
  );

  test("stored chunk ids flow to jussi-aibot and back as citations", async () => {
    let sent;
    const body = await (await chat(async (_question, passages) => {
      sent = passages;
      return checkAnswer({ status: "answered", answer: "Kirjasto on avoinna arkisin [1].", citations: [passages[0].id] }, passages);
    })).json();

    const { rows } = await client.query(
      "SELECT c.id FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE d.source_name = 'kirjasto.txt'");
    assert.equal(sent[0].id, rows[0].id);
    assert.equal(sent[0].source, "kirjasto.txt");
    assert.equal(body.status, "answered");
    assert.deepEqual(body.citations, [rows[0].id]);
    assert.deepEqual(body.passages.map(p => p.chunkId), sent.map(p => p.id));
  });

  test("a citation that was never sent is rejected end to end", async t => {
    t.mock.method(console, "warn", () => {});
    const body = await (await chat(async (_question, passages) =>
      checkAnswer({ status: "answered", answer: "Keksitty [1].", citations: ["not-a-stored-chunk"] }, passages))).json();
    assert.equal(body.status, "no_evidence");
    assert.deepEqual(body.citations, []);
  });
});
