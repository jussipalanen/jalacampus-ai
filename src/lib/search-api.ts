import { EmbeddingError } from "./embeddings.ts";
import { MAX_QUERY_LENGTH, type SearchResult } from "./search.ts";

const MAX_BODY_BYTES = 4_096;

export type SearchApiDeps = {
  /** False when the database or Gemini key is not configured. */
  enabled: boolean;
  allow(clientKey: string): boolean;
  search(query: string): Promise<SearchResult[]>;
};

const error = (message: string, status: number) => Response.json({ error: message }, { status });

/** Framework-independent handler for POST /api/search; user-facing messages are Finnish. */
export async function handleSearchRequest(request: Request, deps: SearchApiDeps): Promise<Response> {
  if (!deps.enabled) {
    return error("Haku ei ole käytössä tässä ympäristössä. Se vaatii tietokannan ja Gemini-avaimen.", 503);
  }
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!deps.allow(clientKey)) return error("Liian monta hakua. Odota hetki ja yritä uudelleen.", 429);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return error("Pyyntö on liian suuri.", 413);
  let query: unknown;
  try {
    query = (JSON.parse(raw) as { query?: unknown })?.query;
  } catch {
    return error("Virheellinen pyyntö.", 400);
  }
  const text = typeof query === "string" ? query.trim() : "";
  if (!text || Array.from(text).length > MAX_QUERY_LENGTH) {
    return error(`Kysymyksen pituuden tulee olla 1–${MAX_QUERY_LENGTH} merkkiä.`, 400);
  }

  try {
    return Response.json({ results: await deps.search(text) });
  } catch (cause) {
    console.error("Search failed:", cause instanceof Error ? cause.message : cause);
    return cause instanceof EmbeddingError
      ? error("Hakupalvelu ei vastannut. Yritä hetken kuluttua uudelleen.", 502)
      : error("Haku ei ole juuri nyt käytettävissä.", 503);
  }
}
