import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { migrate } from "../src/lib/db/migrate.ts";
import { embedPendingChunks } from "../src/lib/embed-chunks.ts";
import { ingestDocument } from "../src/lib/ingestion.ts";
import { createFakeEmbedder } from "./helpers/fake-embedder.mjs";

// Same guard as ingestion.db.test.mjs: these tests drop and truncate tables.
const url = process.env.TEST_DATABASE_URL;
if (process.env.REQUIRE_DATABASE_TESTS === "1" && !url) {
  throw new Error("REQUIRE_DATABASE_TESTS=1 but TEST_DATABASE_URL is not set.");
}
if (url && !new URL(url).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a database whose name ends in _test.");
}

// Synthetic fixtures: fabricated campus texts.
const LIBRARY = Array.from({ length: 30 }, (_, i) =>
  `Kirjaston aukioloajat ${i + 1}: kuvitteellinen kampuskirjasto on avoinna arkisin ja lainaa kurssikirjoja.`).join("\n");
const SPORTS = "Kampusliikunnan vuorot varataan kuvitteellisesta liikuntapalvelusta viikkoa etukäteen.";

const embeddingStats = async client => (await client.query(`
  SELECT count(*)::int AS total,
         count(embedding)::int AS embedded,
         array_agg(DISTINCT embedding_model) FILTER (WHERE embedding_model IS NOT NULL) AS models
  FROM document_chunks`)).rows[0];

describe("PostgreSQL chunk embeddings", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
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

  test("the schema stores 768-dimension vectors with an HNSW cosine index", async () => {
    const { rows: [column] } = await client.query(`
      SELECT format_type(atttypid, atttypmod) AS type FROM pg_attribute
      WHERE attrelid = 'document_chunks'::regclass AND attname = 'embedding'`);
    assert.equal(column.type, "vector(768)");
    const { rows: [index] } = await client.query(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'document_chunks_embedding_idx'");
    assert.match(index.indexdef, /USING hnsw \(embedding vector_cosine_ops\)/);
  });

  test("embeds every pending chunk in batches with the source name as title", async () => {
    const { chunkCount } = await ingestDocument(client, { sourceName: "kirjasto.txt", text: LIBRARY });
    assert.ok(chunkCount > 2);
    const embedder = createFakeEmbedder();

    assert.equal(await embedPendingChunks(client, embedder, { batchSize: 2 }), chunkCount);
    assert.deepEqual(await embeddingStats(client), { total: chunkCount, embedded: chunkCount, models: ["fake-embedding"] });
    assert.ok(embedder.calls.every(batch => batch.length <= 2));
    assert.deepEqual(embedder.calls[0][0], {
      kind: "document",
      title: "kirjasto.txt",
      text: (await client.query("SELECT content FROM document_chunks ORDER BY ordinal LIMIT 1")).rows[0].content,
    });

    const { rows: [{ dims }] } = await client.query("SELECT vector_dims(embedding) AS dims FROM document_chunks LIMIT 1");
    assert.equal(dims, 768);
  });

  test("re-running embeds only new chunks, and a new model re-embeds everything", async () => {
    const { chunkCount } = await ingestDocument(client, { sourceName: "kirjasto.txt", text: LIBRARY });
    const embedder = createFakeEmbedder();
    await embedPendingChunks(client, embedder);
    assert.equal(await embedPendingChunks(client, embedder), 0);

    await ingestDocument(client, { sourceName: "liikunta.txt", text: SPORTS });
    assert.equal(await embedPendingChunks(client, embedder), 1);

    assert.equal(await embedPendingChunks(client, createFakeEmbedder("fake-embedding-v2")), chunkCount + 1);
    assert.deepEqual((await embeddingStats(client)).models, ["fake-embedding-v2"]);
  });

  test("a failing embedder keeps earlier batches and leaves the rest pending", async () => {
    const { chunkCount } = await ingestDocument(client, { sourceName: "kirjasto.txt", text: LIBRARY });
    const fake = createFakeEmbedder();
    let batches = 0;
    const flaky = { ...fake, embed: async inputs => { if (++batches === 2) throw new Error("rate limited"); return fake.embed(inputs); } };

    await assert.rejects(embedPendingChunks(client, flaky, { batchSize: 1 }), /rate limited/);
    assert.equal((await embeddingStats(client)).embedded, 1);
    assert.equal(await embedPendingChunks(client, fake, { batchSize: 1 }), chunkCount - 1);
  });

  test("the database rejects a vector without a model and vectors of the wrong size", async () => {
    await ingestDocument(client, { sourceName: "liikunta.txt", text: SPORTS });
    const zeros = n => `[${new Array(n).fill(0.1).join(",")}]`;
    await assert.rejects(client.query("UPDATE document_chunks SET embedding = $1::vector", [zeros(768)]), /check constraint/);
    await assert.rejects(
      client.query("UPDATE document_chunks SET embedding = $1::vector, embedding_model = 'x'", [zeros(3)]),
      /expected 768 dimensions/,
    );
  });
});
