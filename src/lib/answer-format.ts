/** Client-safe helpers for showing a grounded answer and its sources. */

const TYPING_CHARS_PER_MS = 0.04;
const TYPING_MAX_MS = 6000;

/**
 * Removes `[n]` citation markers, and the space or commas around a run of them, so the
 * answer reads as plain text. Only markers that point into the citation list
 * (1..citationCount) are removed; anything else stays text.
 */
export function stripCitations(answer: string, citationCount: number): string {
  return answer
    .replace(/\s*\[\d+\](?:[\s,]*\[\d+\])*/g, run => {
      const valid = [...run.matchAll(/\[(\d+)\]/g)].every(([, n]) => Number(n) >= 1 && Number(n) <= citationCount);
      return valid ? "" : run;
    })
    .trim();
}

/** How many characters of the answer are visible after `elapsedMs`. Long answers type faster so none takes over 6 s. */
export function typedLength(elapsedMs: number, length: number): number {
  const perMs = Math.max(TYPING_CHARS_PER_MS, length / TYPING_MAX_MS);
  return Math.min(length, Math.floor(elapsedMs * perMs));
}

/**
 * Cited passages first, numbered in citation order (matching the `[n]` markers),
 * followed by the remaining passages in their search order.
 */
export function orderPassages<P extends { chunkId: string }>(passages: P[], citations: string[]) {
  const byId = new Map(passages.map(p => [p.chunkId, p]));
  const cited = citations
    .map((id, index) => ({ n: index + 1, passage: byId.get(id) }))
    .filter((entry): entry is { n: number; passage: P } => entry.passage !== undefined);
  const citedIds = new Set(citations);
  return { cited, others: passages.filter(p => !citedIds.has(p.chunkId)) };
}
