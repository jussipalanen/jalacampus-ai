import { createPool } from "../src/lib/db/client.ts";
import { embedPendingChunks } from "../src/lib/embed-chunks.ts";
import { createGeminiEmbedder } from "../src/lib/embeddings.ts";
import { ingestDocument } from "../src/lib/ingestion.ts";
import { collectTextFiles, readTextFile } from "../src/lib/text-files.ts";

// Usage: npm run db:ingest -- <file.txt|directory> [...]
// Embedding sends chunk text to the Gemini API: only ingest synthetic or licensed public documents.
const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: npm run db:ingest -- <file.txt|directory> [...]");
  process.exit(2);
}
const files = await Promise.all((await collectTextFiles(paths)).map(readTextFile));

const pool = createPool();
const client = await pool.connect();
try {
  for (const file of files) {
    const result = await ingestDocument(client, { sourceName: file.sourceName, text: file.text });
    console.log(`${result.status.padEnd(9)} ${file.sourceName} (${result.chunkCount} ${result.chunkCount === 1 ? "chunk" : "chunks"})`);
  }
  if (process.env.GEMINI_API_KEY) {
    const embedder = createGeminiEmbedder({ apiKey: process.env.GEMINI_API_KEY });
    console.log(`Embedded ${await embedPendingChunks(client, embedder)} chunks with ${embedder.model}.`);
  } else {
    console.log("GEMINI_API_KEY is not set: chunks were stored without embeddings. Run npm run db:embed later.");
  }
} finally {
  client.release();
  await pool.end();
}
