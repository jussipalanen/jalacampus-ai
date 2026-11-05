import { getPool } from "./db/client.ts";
import { createGeminiEmbedder } from "./embeddings.ts";
import { searchChunks, type SearchResult } from "./search.ts";

/** Server-side only: searches with the Gemini embedder and the shared database pool. */
export async function searchWithGemini(query: string, limit: number): Promise<SearchResult[]> {
  const embedder = createGeminiEmbedder({ apiKey: process.env.GEMINI_API_KEY, maxRetries: 1, timeoutMs: 15_000 });
  const client = await getPool().connect();
  try {
    return await searchChunks(client, embedder, query, { limit });
  } finally {
    client.release();
  }
}
