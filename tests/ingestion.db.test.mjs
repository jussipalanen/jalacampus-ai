import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { chunkDocument } from "../src/lib/chunking.ts";
import { migrate } from "../src/lib/db/migrate.ts";
import { ingestDocument } from "../src/lib/ingestion.ts";

// These tests DROP and TRUNCATE tables, so they only run against a database whose name ends in "_test".
const url = process.env.TEST_DATABASE_URL;
const required = process.env.REQUIRE_DATABASE_TESTS === "1";
if (required && !url) throw new Error("REQUIRE_DATABASE_TESTS=1 but TEST_DATABASE_URL is not set.");
if (url && !new URL(url).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a database whose name ends in _test.");
}

// Synthetic fixture: fabricated study guide text, long enough for several chunks.
const GUIDE = Array.from({ length: 40 }, (_, i) =>
  `Kohta ${i + 1}. Kuvitteellisen korkeakoulun opiskelija ilmoittautuu lukukaudelle opintohallinnon järjestelmässä. 🙂`,
).join("\n");

const countRows = async (client, table) =>
  Number((await client.query(`SELECT count(*) FROM ${table}`)).rows[0].count);

describe("PostgreSQL ingestion", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let pool;
  let client;

  before(async () => {
    pool = new pg.Pool({ connectionString: url, max: 4 });
    client = await pool.connect();
    await client.query("DROP TABLE IF EXISTS document_chunks, documents, schema_migrations");
  });

  after(async () => {
    client?.release();
    await pool?.end();
  });

  beforeEach(async () => {
    await migrate(client);
    await client.query("TRUNCATE documents CASCADE");
  });

  test("migrations apply once and are tracked", async () => {
    await client.query("DROP TABLE IF EXISTS document_chunks, documents, schema_migrations");
    assert.deepEqual(await migrate(client), ["001_documents.sql", "002_chunk_embeddings.sql"]);
    assert.deepEqual(await migrate(client), []);
    const { rows } = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    assert.equal(rows.length, 1);
  });

  test("ingestion stores ordered chunks with the chunker's stable IDs", async () => {
    const expected = chunkDocument(GUIDE);
    const result = await ingestDocument(client, { sourceName: "opinto-opas.txt", text: GUIDE });
    assert.deepEqual(result, { documentId: expected.documentId, status: "created", chunkCount: expected.chunks.length });
    assert.ok(expected.chunks.length > 1);

    const { rows } = await client.query(
      "SELECT id, document_id, ordinal, content, embedding FROM document_chunks ORDER BY ordinal",
    );
    assert.deepEqual(
      rows.map(row => ({ id: row.id, documentId: row.document_id, ordinal: row.ordinal, text: row.content })),
      expected.chunks,
    );
    assert.ok(rows.every(row => row.embedding === null));
  });

  test("re-ingesting the same normalized content does not duplicate rows", async () => {
    const first = await ingestDocument(client, { sourceName: "opinto-opas.txt", text: GUIDE });
    const second = await ingestDocument(client, {
      sourceName: "kopio.txt",
      text: `  ${GUIDE.replaceAll("\n", "\r\n")}\n`,
    });
    assert.equal(second.status, "unchanged");
    assert.equal(second.documentId, first.documentId);
    assert.equal(second.chunkCount, first.chunkCount);
    assert.equal(await countRows(client, "documents"), 1);
    assert.equal(await countRows(client, "document_chunks"), first.chunkCount);
    const { rows } = await client.query("SELECT source_name FROM documents");
    assert.equal(rows[0].source_name, "opinto-opas.txt");
  });

  test("concurrent ingestion of the same content creates it exactly once", async () => {
    const clients = await Promise.all([pool.connect(), pool.connect(), pool.connect()]);
    try {
      const results = await Promise.all(
        clients.map((c, i) => ingestDocument(c, { sourceName: `rinnakkainen-${i}.txt`, text: GUIDE })),
      );
      assert.deepEqual(results.map(r => r.status).sort(), ["created", "unchanged", "unchanged"]);
      assert.equal(await countRows(client, "documents"), 1);
      assert.equal(await countRows(client, "document_chunks"), results[0].chunkCount);
    } finally {
      clients.forEach(c => c.release());
    }
  });

  test("invalid input is rejected without writing rows", async () => {
    await assert.rejects(ingestDocument(client, { sourceName: "  ", text: GUIDE }), RangeError);
    await assert.rejects(ingestDocument(client, { sourceName: "tyhja.txt", text: "   " }));
    await assert.rejects(ingestDocument(client, { sourceName: "nul.txt", text: "a\0b" }));
    assert.equal(await countRows(client, "documents"), 0);
  });
});
