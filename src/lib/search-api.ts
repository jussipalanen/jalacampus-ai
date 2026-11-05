import { clientKey, errorResponse, readQuestion, searchFailure } from "./api-request.ts";
import type { SearchResult } from "./search.ts";

export type SearchApiDeps = {
  /** False when the database or Gemini key is not configured. */
  enabled: boolean;
  allow(clientKey: string): boolean;
  search(query: string): Promise<SearchResult[]>;
};

/** Framework-independent handler for POST /api/search; user-facing messages are Finnish. */
export async function handleSearchRequest(request: Request, deps: SearchApiDeps): Promise<Response> {
  if (!deps.enabled) {
    return errorResponse("Haku ei ole käytössä tässä ympäristössä. Se vaatii tietokannan ja Gemini-avaimen.", 503, "disabled");
  }
  if (!deps.allow(clientKey(request))) return errorResponse("Liian monta hakua. Odota hetki ja yritä uudelleen.", 429);

  const query = await readQuestion(request, "query");
  if (query instanceof Response) return query;

  try {
    return Response.json({ results: await deps.search(query) });
  } catch (cause) {
    return searchFailure(cause);
  }
}
