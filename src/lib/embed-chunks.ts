import type { ClientBase } from "pg";
import type { Embedder } from "./embeddings.ts";

export const EMBED_BATCH_SIZE = 50;

/**
 * Embeds chunks that have no embedding, or one from a different model, in batches.
 * Safe to re-run: already-embedded chunks are skipped. Each batch is committed on its own,
 * so a failure (for example a rate limit) keeps the progress made so far.
 * Do not run several instances at once; they would embed the same chunks twice.
 */
export async function embedPendingChunks(
  client: ClientBase,
  embedder: Embedder,
  { batchSize = EMBED_BATCH_SIZE }: { batchSize?: number } = {},
): Promise<number> {
  let embedded = 0;
  for (;;) {
    const { rows } = await client.query<{ id: string; content: string; source_name: string }>(
      `SELECT c.id, c.content, d.source_name
       FROM document_chunks c JOIN documents d ON d.id = c.document_id
       WHERE c.embedding_model IS DISTINCT FROM $1
       ORDER BY c.document_id, c.ordinal
       LIMIT $2`,
      [embedder.model, batchSize],
    );
    if (rows.length === 0) return embedded;

    const vectors = await embedder.embed(
      rows.map(row => ({ kind: "document", title: row.source_name, text: row.content })),
    );
    if (vectors.length !== rows.length) throw new Error("Embedder returned the wrong number of vectors.");
    await client.query(
      `UPDATE document_chunks c SET embedding = u.embedding::vector, embedding_model = $3
       FROM unnest($1::text[], $2::text[]) AS u(id, embedding)
       WHERE c.id = u.id`,
      [rows.map(row => row.id), vectors.map(vector => `[${vector.join(",")}]`), embedder.model],
    );
    embedded += rows.length;
  }
}
