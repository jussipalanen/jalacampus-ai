/** Server-side only: client for jussi-aibot `POST /v1/grounded-answer`. See docs/m3-rag-plan.md. */

export const NO_EVIDENCE_FI = "En löytänyt tähän vastausta dokumenteista.";
// jussi-aibot limits each Gemini attempt to 15 s and retries once on a fallback model (about 30 s worst case).
export const DEFAULT_ANSWER_TIMEOUT_MS = 35_000;
const MAX_ANSWER_CHARS = 4_000;

export type AnswerPassage = { id: string; source: string; text: string };

export type GroundedAnswer = {
  status: "answered" | "no_evidence";
  /** Finnish answer; `[n]` markers are 1-based positions in `citations`. */
  answer: string;
  /** Passage ids that were sent, in citation order. */
  citations: string[];
};

/** jussi-aibot could not be reached or answered unusably; the caller shows its fallback. */
export class AnswerServiceError extends Error {}

const noEvidence = (): GroundedAnswer => ({ status: "no_evidence", answer: NO_EVIDENCE_FI, citations: [] });

/**
 * Validates a jussi-aibot response and checks its citations a second time.
 * A malformed response throws AnswerServiceError. Any citation that is not one of the
 * passage ids sent, or a `[n]` marker beyond the citation list, makes the whole answer
 * untrusted, so it becomes `no_evidence` (and is logged) instead of being shown.
 */
export function checkAnswer(body: unknown, passages: AnswerPassage[]): GroundedAnswer {
  const data = body as { status?: unknown; answer?: unknown; citations?: unknown } | null;
  const valid = data !== null && typeof data === "object"
    && (data.status === "answered" || data.status === "no_evidence")
    && typeof data.answer === "string" && data.answer.length <= MAX_ANSWER_CHARS
    && Array.isArray(data.citations) && data.citations.every(id => typeof id === "string");
  if (!valid) throw new AnswerServiceError("jussi-aibot returned a malformed grounded answer.");

  const answer = (data.answer as string).trim();
  const citations = data.citations as string[];
  if (data.status === "no_evidence" || !answer || citations.length === 0) return noEvidence();

  const sent = new Set(passages.map(p => p.id));
  const markers = [...answer.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1]));
  const unknown = citations.filter(id => !sent.has(id));
  if (unknown.length > 0 || markers.some(n => n < 1 || n > citations.length)) {
    console.warn("Grounded answer rejected: citations do not match the passages sent.", { unknown: unknown.length });
    return noEvidence();
  }
  return { status: "answered", answer, citations };
}

export function createGroundedAnswerClient({
  url,
  apiKey,
  timeoutMs = DEFAULT_ANSWER_TIMEOUT_MS,
  fetch: fetchImpl = globalThis.fetch,
}: {
  url: string | undefined;
  apiKey: string | undefined;
  timeoutMs?: number;
  fetch?: typeof fetch;
}) {
  if (!url || !apiKey) throw new Error("AIBOT_URL and AIBOT_API_KEY must be set.");
  const endpoint = `${url.replace(/\/+$/, "")}/v1/grounded-answer`;

  return {
    async answer(question: string, passages: AnswerPassage[]): Promise<GroundedAnswer> {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ question, language: "fi", passages }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (cause) {
        const timedOut = cause instanceof Error && cause.name === "TimeoutError";
        throw new AnswerServiceError(timedOut ? "jussi-aibot timed out." : "jussi-aibot could not be reached.");
      }
      if (!response.ok) throw new AnswerServiceError(`jussi-aibot answered HTTP ${response.status}.`);
      return checkAnswer(await response.json().catch(() => null), passages);
    },
  };
}
