/** Judging rules for the grounded-answer evaluation set (data/eval/questions.json). */

export type EvalKind = "answerable" | "out_of_scope" | "missing" | "injection";

export type EvalCase = {
  id: string;
  kind: EvalKind;
  question: string;
  expect: { status?: "answered" | "no_evidence"; sources?: string[]; forbid?: string[] };
};

export type EvalResponse = {
  status: "answered" | "no_evidence" | "unavailable";
  answer: string;
  citations: string[];
  passages: { chunkId: string; sourceName: string }[];
};

export type EvalOutcome = {
  pass: boolean;
  /** Why the case failed; empty when it passed. */
  reasons: string[];
  citedSources: string[];
};

const KINDS: EvalKind[] = ["answerable", "out_of_scope", "missing", "injection"];

/** Validates questions.json and returns its cases. */
export function parseCases(data: unknown): EvalCase[] {
  const cases = (data as { cases?: unknown })?.cases;
  if (!Array.isArray(cases) || cases.length === 0) throw new Error("questions.json must have a non-empty `cases` array.");
  const ids = new Set<string>();
  for (const c of cases as EvalCase[]) {
    if (!c?.id || ids.has(c.id)) throw new Error(`Missing or duplicate case id: ${c?.id}`);
    ids.add(c.id);
    if (!KINDS.includes(c.kind)) throw new Error(`Case ${c.id}: unknown kind ${c.kind}`);
    if (typeof c.question !== "string" || !c.question.trim()) throw new Error(`Case ${c.id}: empty question`);
    if (typeof c.expect !== "object" || c.expect === null) throw new Error(`Case ${c.id}: missing expect`);
  }
  return cases as EvalCase[];
}

export function judgeCase(evalCase: EvalCase, response: EvalResponse): EvalOutcome {
  const reasons: string[] = [];
  const sourceById = new Map(response.passages.map(p => [p.chunkId, p.sourceName]));
  const citedSources = response.citations.map(id => sourceById.get(id) ?? "?");
  const { status, sources, forbid } = evalCase.expect;

  if (response.status === "unavailable") reasons.push("answer service unavailable");
  else if (status && response.status !== status) reasons.push(`expected ${status}, got ${response.status}`);

  if (sources && response.status === "answered") {
    if (citedSources.length === 0) reasons.push("no citations");
    const wrong = citedSources.filter(source => !sources.includes(source));
    if (wrong.length) reasons.push(`cited unexpected sources: ${[...new Set(wrong)].join(", ")}`);
  }
  for (const text of forbid ?? []) {
    if (response.answer.toLowerCase().includes(text.toLowerCase())) reasons.push(`answer contains forbidden text "${text}"`);
  }
  return { pass: reasons.length === 0, reasons, citedSources };
}

/**
 * Suggests a similarity floor from the best search score of each case: midway between the
 * lowest answerable score and the highest out-of-scope score, when they don't overlap.
 * "missing" cases are left out on purpose: only the answer step can reject them.
 */
export function suggestFloor(scores: { kind: EvalKind; topScore: number }[]) {
  const answerable = scores.filter(s => s.kind === "answerable").map(s => s.topScore);
  const outOfScope = scores.filter(s => s.kind === "out_of_scope").map(s => s.topScore);
  if (answerable.length === 0 || outOfScope.length === 0) return null;
  const lowestAnswerable = Math.min(...answerable);
  const highestOutOfScope = Math.max(...outOfScope);
  const separable = highestOutOfScope < lowestAnswerable;
  return {
    lowestAnswerable,
    highestOutOfScope,
    separable,
    floor: separable ? Math.round(((lowestAnswerable + highestOutOfScope) / 2) * 100) / 100 : null,
  };
}
