import { clientKey, errorResponse, readQuestion, searchFailure } from "./api-request.ts";
import { NO_EVIDENCE_FI, type AnswerPassage, type GroundedAnswer } from "./grounded-answer.ts";
import type { SearchResult } from "./search.ts";

export const ANSWER_PASSAGES = 8;
/** Initial guess from manual tests (unrelated ≈ 0.57, real matches ≥ 0.70); tune with the evaluation set. */
export const DEFAULT_SIMILARITY_FLOOR = 0.6;
export const UNAVAILABLE_FI = "Vastausta ei voitu muodostaa juuri nyt. Alla ovat löydetyt kohdat.";

export type ChatResponse = {
  status: "answered" | "no_evidence" | "unavailable";
  answer: string;
  citations: string[];
  /** The passages sent for answering (above the similarity floor), for showing and linking citations. */
  passages: SearchResult[];
};

export type ChatApiDeps = {
  /** False unless the database, Gemini and jussi-aibot are all configured. */
  enabled: boolean;
  allow(clientKey: string): boolean;
  floor: number;
  search(question: string): Promise<SearchResult[]>;
  answer(question: string, passages: AnswerPassage[]): Promise<GroundedAnswer>;
};

/** SIMILARITY_FLOOR from the environment: unset means the default; anything else must be 0–1. */
export function parseSimilarityFloor(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_SIMILARITY_FLOOR;
  const floor = Number(value);
  if (!Number.isFinite(floor) || floor < 0 || floor > 1) throw new RangeError("SIMILARITY_FLOOR must be a number from 0 to 1.");
  return floor;
}

/** Framework-independent handler for POST /api/chat; user-facing messages are Finnish. */
export async function handleChatRequest(request: Request, deps: ChatApiDeps): Promise<Response> {
  if (!deps.enabled) {
    return errorResponse("Tekoälyvastaukset eivät ole käytössä tässä ympäristössä.", 503);
  }
  if (!deps.allow(clientKey(request))) return errorResponse("Liian monta kysymystä. Odota hetki ja yritä uudelleen.", 429);

  const question = await readQuestion(request, "question");
  if (question instanceof Response) return question;

  let results: SearchResult[];
  try {
    results = await deps.search(question);
  } catch (cause) {
    return searchFailure(cause);
  }

  const passages = results.filter(result => result.score >= deps.floor).slice(0, ANSWER_PASSAGES);
  if (passages.length === 0) {
    return Response.json({ status: "no_evidence", answer: NO_EVIDENCE_FI, citations: [], passages } satisfies ChatResponse);
  }

  try {
    const answer = await deps.answer(question, passages.map(p => ({ id: p.chunkId, source: p.sourceName, text: p.text })));
    return Response.json({ ...answer, passages } satisfies ChatResponse);
  } catch (cause) {
    console.error("Grounded answer failed:", cause instanceof Error ? cause.message : cause);
    return Response.json({ status: "unavailable", answer: UNAVAILABLE_FI, citations: [], passages } satisfies ChatResponse);
  }
}
