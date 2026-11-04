import { getPool } from "@/lib/db/client";
import { createGeminiEmbedder } from "@/lib/embeddings";
import { createRateLimiter } from "@/lib/rate-limit";
import { searchChunks } from "@/lib/search";
import { handleSearchRequest } from "@/lib/search-api";

export const runtime = "nodejs";

// Per server process; see src/lib/rate-limit.ts for its limits.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(request: Request) {
  return handleSearchRequest(request, {
    enabled: Boolean(process.env.DATABASE_URL && process.env.GEMINI_API_KEY),
    allow: key => limiter.allow(key),
    async search(query) {
      const embedder = createGeminiEmbedder({ apiKey: process.env.GEMINI_API_KEY, maxRetries: 1, timeoutMs: 15_000 });
      const client = await getPool().connect();
      try {
        return await searchChunks(client, embedder, query);
      } finally {
        client.release();
      }
    },
  });
}
