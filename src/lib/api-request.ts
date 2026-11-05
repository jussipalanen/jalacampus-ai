import { EmbeddingError } from "./embeddings.ts";
import { MAX_QUERY_LENGTH } from "./search.ts";

const MAX_BODY_BYTES = 4_096;

/**
 * A JSON error response with a Finnish, user-facing message. `code` is a stable,
 * machine-readable reason for clients, e.g. "disabled" when a feature isn't configured.
 */
export const errorResponse = (message: string, status: number, code?: string) =>
  Response.json(code ? { error: message, code } : { error: message }, { status });

/** Rate-limit key: the first X-Forwarded-For address, or "local" in development. */
export const clientKey = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/**
 * Reads a small JSON body and returns `body[field]` trimmed, or a Finnish error response.
 * The text must be 1–MAX_QUERY_LENGTH characters.
 */
export async function readQuestion(request: Request, field: string): Promise<string | Response> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return errorResponse("Pyyntö on liian suuri.", 413);
  let value: unknown;
  try {
    value = (JSON.parse(raw) as Record<string, unknown>)?.[field];
  } catch {
    return errorResponse("Virheellinen pyyntö.", 400);
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || Array.from(text).length > MAX_QUERY_LENGTH) {
    return errorResponse(`Kysymyksen pituuden tulee olla 1–${MAX_QUERY_LENGTH} merkkiä.`, 400);
  }
  return text;
}

/** Maps a search failure to a Finnish error without internal details; details go to the server log. */
export function searchFailure(cause: unknown): Response {
  console.error("Search failed:", cause instanceof Error ? cause.message : cause);
  return cause instanceof EmbeddingError
    ? errorResponse("Hakupalvelu ei vastannut. Yritä hetken kuluttua uudelleen.", 502)
    : errorResponse("Haku ei ole juuri nyt käytettävissä.", 503);
}
