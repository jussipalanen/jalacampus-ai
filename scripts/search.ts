import { createPool } from "../src/lib/db/client.ts";
import { createGeminiEmbedder } from "../src/lib/embeddings.ts";
import { searchChunks } from "../src/lib/search.ts";

// Usage: npm run db:search -- "Milloin kirjasto on auki?"
const query = process.argv.slice(2).join(" ");
if (!query.trim()) {
  console.error('Usage: npm run db:search -- "<kysymys>"');
  process.exit(2);
}
const embedder = createGeminiEmbedder({ apiKey: process.env.GEMINI_API_KEY });
const pool = createPool();
const client = await pool.connect();
try {
  const results = await searchChunks(client, embedder, query);
  if (results.length === 0) console.log("No embedded chunks found. Run npm run db:ingest first.");
  results.forEach((result, i) => {
    const excerpt = result.text.replace(/\s+/g, " ").slice(0, 160);
    console.log(`${i + 1}. ${result.score.toFixed(3)}  ${result.sourceName} #${result.ordinal}  ${result.chunkId.slice(0, 12)}\n   ${excerpt}…`);
  });
} finally {
  client.release();
  await pool.end();
}
