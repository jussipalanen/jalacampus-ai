import type { ClientBase } from "pg";
import { chunkDocument } from "./chunking.ts";
import { withTransaction } from "./db/client.ts";

export const MAX_SOURCE_NAME_LENGTH = 255;

export type IngestResult = {
  documentId: string;
  status: "created" | "unchanged";
  chunkCount: number;
};

/**
 * Stores a document and its chunks in one transaction. The document ID is the hash of the
 * normalized text, so ingesting the same content again is a no-op that keeps the first source name.
 * Embeddings are not computed here; `document_chunks.embedding` stays NULL.
 */
export async function ingestDocument(
  client: ClientBase,
  input: { sourceName: string; text: string },
): Promise<IngestResult> {
  const sourceName = input.sourceName.trim();
  if (!sourceName || sourceName.length > MAX_SOURCE_NAME_LENGTH) {
    throw new RangeError(`Source name must be 1–${MAX_SOURCE_NAME_LENGTH} characters.`);
  }
  // PostgreSQL text columns cannot store NUL characters.
  if (input.text.includes("\0")) throw new Error("Document text contains NUL characters.");
  const { documentId, contentHash, chunks } = chunkDocument(input.text);

  return withTransaction(client, async () => {
    // Concurrent ingestion of the same content blocks here until the first transaction finishes.
    const inserted = await client.query(
      `INSERT INTO documents (id, source_name, content_sha256) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING id`,
      [documentId, sourceName, contentHash],
    );
    if (inserted.rowCount === 0) {
      const { rows } = await client.query<{ count: string }>(
        "SELECT count(*) FROM document_chunks WHERE document_id = $1",
        [documentId],
      );
      return { documentId, status: "unchanged", chunkCount: Number(rows[0].count) };
    }
    await client.query(
      `INSERT INTO document_chunks (id, document_id, ordinal, content)
       SELECT id, $2, ordinal, content FROM unnest($1::text[], $3::int[], $4::text[]) AS c(id, ordinal, content)`,
      [chunks.map(chunk => chunk.id), documentId, chunks.map(chunk => chunk.ordinal), chunks.map(chunk => chunk.text)],
    );
    return { documentId, status: "created", chunkCount: chunks.length };
  });
}
