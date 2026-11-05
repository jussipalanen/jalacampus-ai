import { createRateLimiter } from "@/lib/rate-limit";
import { handleSearchRequest } from "@/lib/search-api";
import { DEFAULT_SEARCH_LIMIT } from "@/lib/search";
import { searchWithGemini } from "@/lib/server-search";

export const runtime = "nodejs";

// Per server process; see src/lib/rate-limit.ts for its limits.
const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(request: Request) {
  return handleSearchRequest(request, {
    enabled: Boolean(process.env.DATABASE_URL && process.env.GEMINI_API_KEY),
    allow: key => limiter.allow(key),
    search: query => searchWithGemini(query, DEFAULT_SEARCH_LIMIT),
  });
}
