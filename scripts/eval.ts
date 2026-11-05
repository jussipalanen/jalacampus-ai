// Runs data/eval/questions.json through the /api/chat flow against real Gemini and jussi-aibot.
// Usage: npm run eval [-- <case-id> ...]   (uses EVAL_DATABASE_URL or TEST_DATABASE_URL; the database is RESET)
// Sends synthetic sample text and questions to Gemini; costs roughly two Gemini calls per case.
import { readFileSync } from "node:fs";
import { ANSWER_PASSAGES, handleChatRequest, parseSimilarityFloor } from "../src/lib/chat-api.ts";
import { createPool } from "../src/lib/db/client.ts";
import { migrate } from "../src/lib/db/migrate.ts";
import { embedPendingChunks } from "../src/lib/embed-chunks.ts";
import { createGeminiEmbedder } from "../src/lib/embeddings.ts";
import { judgeCase, parseCases, suggestFloor, type EvalKind, type EvalResponse } from "../src/lib/eval.ts";
import { createGroundedAnswerClient } from "../src/lib/grounded-answer.ts";
import { ingestDocument } from "../src/lib/ingestion.ts";
import { searchChunks } from "../src/lib/search.ts";
import { collectTextFiles, readTextFile } from "../src/lib/text-files.ts";

const url = process.env.EVAL_DATABASE_URL || process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  console.error("Set EVAL_DATABASE_URL or TEST_DATABASE_URL to a database whose name ends in _test; it will be reset.");
  process.exit(2);
}
const allCases = parseCases(JSON.parse(readFileSync("data/eval/questions.json", "utf8")));
const only = process.argv.slice(2);
const unknownIds = only.filter(id => !allCases.some(c => c.id === id));
if (unknownIds.length) {
  console.error(`Unknown case id(s): ${unknownIds.join(", ")}`);
  process.exit(2);
}
const cases = only.length ? allCases.filter(c => only.includes(c.id)) : allCases;
const embedder = createGeminiEmbedder({ apiKey: process.env.GEMINI_API_KEY });
const answers = createGroundedAnswerClient({ url: process.env.AIBOT_URL, apiKey: process.env.AIBOT_API_KEY });
const floor = parseSimilarityFloor(process.env.SIMILARITY_FLOOR);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const short = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max - 1)}…` : text).replace(/\s+/g, " ");

const pool = createPool(url);
const client = await pool.connect();
let failures = 0;
try {
  console.log(`Preparing ${new URL(url).pathname.slice(1)}: reset, migrate, ingest samples + fixtures, embed…`);
  await client.query("DROP TABLE IF EXISTS document_chunks, documents, schema_migrations");
  await migrate(client);
  for (const file of await Promise.all((await collectTextFiles(["data/samples", "data/eval/fixtures"])).map(readTextFile))) {
    await ingestDocument(client, { sourceName: file.sourceName, text: file.text });
  }
  console.log(`Embedded ${await embedPendingChunks(client, embedder)} chunks. Similarity floor: ${floor}\n`);

  const scores: { kind: EvalKind; topScore: number }[] = [];
  const tally = new Map<EvalKind, { pass: number; total: number }>();
  for (const evalCase of cases) {
    const results = await searchChunks(client, embedder, evalCase.question, { limit: ANSWER_PASSAGES });
    const topScore = results[0]?.score ?? 0;
    scores.push({ kind: evalCase.kind, topScore });

    let body: EvalResponse = { status: "unavailable", answer: "", citations: [], passages: [] };
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await handleChatRequest(
        new Request("http://eval.local/api/chat", { method: "POST", body: JSON.stringify({ question: evalCase.question }) }),
        { enabled: true, allow: () => true, floor, search: async () => results, answer: (q, p) => answers.answer(q, p) },
      );
      if (response.ok) body = await response.json() as EvalResponse;
      if (body.status !== "unavailable") break;
      await sleep(20_000); // Gemini free tier is often briefly overloaded
    }

    const outcome = judgeCase(evalCase, body);
    const stats = tally.get(evalCase.kind) ?? { pass: 0, total: 0 };
    tally.set(evalCase.kind, { pass: stats.pass + (outcome.pass ? 1 : 0), total: stats.total + 1 });
    if (!outcome.pass) failures++;
    const called = body.passages.length > 0 ? "" : " (below floor, no AI call)";
    console.log(`${outcome.pass ? "PASS" : "FAIL"}  ${evalCase.kind.padEnd(12)} ${evalCase.id.padEnd(28)} top ${topScore.toFixed(3)}  ${body.status}${called}`);
    console.log(`      Q: ${evalCase.question}`);
    console.log(`      A: ${short(body.answer)}${outcome.citedSources.length ? `  [${outcome.citedSources.join(", ")}]` : ""}`);
    if (!outcome.pass) console.log(`      ✗ ${outcome.reasons.join("; ")}`);
    await sleep(1_000);
  }

  console.log("\nSummary");
  for (const [kind, { pass, total }] of tally) console.log(`  ${kind.padEnd(12)} ${pass}/${total}`);
  console.log(`  total        ${cases.length - failures}/${cases.length}`);
  const suggestion = suggestFloor(scores);
  if (suggestion) {
    console.log(`\nTop scores: lowest answerable ${suggestion.lowestAnswerable.toFixed(3)}, highest out-of-scope ${suggestion.highestOutOfScope.toFixed(3)}.`);
    console.log(suggestion.separable
      ? `Suggested SIMILARITY_FLOOR: ${suggestion.floor} (current ${floor}).`
      : "The score ranges overlap: no floor separates them; rely on the answer step.");
  }
} finally {
  client.release();
  await pool.end();
}
process.exit(failures > 0 ? 1 : 0);
