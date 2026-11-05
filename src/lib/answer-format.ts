/** Client-safe helpers for showing a grounded answer and its sources. */

export type AnswerSegment = { type: "text"; text: string } | { type: "cite"; n: number };

/**
 * Splits an answer into plain text and `[n]` citation markers. Only markers that point
 * into the citation list (1..citationCount) become citations; anything else stays text.
 * The result is rendered as React text and links, never as HTML.
 */
export function splitAnswer(answer: string, citationCount: number): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let last = 0;
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1]);
    if (n < 1 || n > citationCount) continue;
    if (match.index > last) segments.push({ type: "text", text: answer.slice(last, match.index) });
    segments.push({ type: "cite", n });
    last = match.index + match[0].length;
  }
  if (last < answer.length) segments.push({ type: "text", text: answer.slice(last) });
  return segments;
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
