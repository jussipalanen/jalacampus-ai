import type { ClientBase } from "pg";
import type { Embedder } from "./embeddings.ts";

export const MAX_QUERY_LENGTH = 500;
export const DEFAULT_SEARCH_LIMIT = 5;
export const MAX_SEARCH_LIMIT = 20;

export type SearchResult = {
  chunkId: string;
  documentId: string;
  sourceName: string;
  ordinal: number;
  /** The full chunk text, at most CHUNK_SIZE characters. */
  text: string;
  /** Cosine similarity, higher is more similar. Not a calibrated relevance probability. */
  score: number;
};

/**
 * Ranks embedded chunks by cosine similarity to the query. Only chunks embedded with the
 * same model as `embedder` are compared, so vectors from different models are never mixed.
 */
export async function searchChunks(
  client: ClientBase,
  embedder: Embedder,
  query: string,
  { limit = DEFAULT_SEARCH_LIMIT }: { limit?: number } = {},
): Promise<SearchResult[]> {
  const text = query.trim();
  if (!text || Array.from(text).length > MAX_QUERY_LENGTH) {
    throw new RangeError(`Query must be 1–${MAX_QUERY_LENGTH} characters.`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
    throw new RangeError(`Limit must be an integer from 1 to ${MAX_SEARCH_LIMIT}.`);
  }
  const [vector] = await embedder.embed([{ kind: "query", text }]);
  const { rows } = await client.query<{
    id: string; document_id: string; source_name: string; ordinal: number; content: string; score: number;
  }>(
    `SELECT c.id, c.document_id, d.source_name, c.ordinal, c.content,
            1 - (c.embedding <=> $1::vector) AS score
     FROM document_chunks c JOIN documents d ON d.id = c.document_id
     WHERE c.embedding_model = $2
     ORDER BY c.embedding <=> $1::vector
     LIMIT $3`,
    [`[${vector.join(",")}]`, embedder.model, limit],
  );
  return rows.map(row => ({
    chunkId: row.id,
    documentId: row.document_id,
    sourceName: row.source_name,
    ordinal: row.ordinal,
    text: row.content,
    score: row.score,
  }));
}
