import { createPool } from "../src/lib/db/client.ts";
import { embedPendingChunks } from "../src/lib/embed-chunks.ts";
import { createGeminiEmbedder } from "../src/lib/embeddings.ts";

// Sends chunk text to the Gemini API: only use synthetic or licensed public documents.
const embedder = createGeminiEmbedder({ apiKey: process.env.GEMINI_API_KEY });
const pool = createPool();
const client = await pool.connect();
try {
  const count = await embedPendingChunks(client, embedder);
  console.log(count ? `Embedded ${count} chunks with ${embedder.model}.` : "All chunks are already embedded.");
} finally {
  client.release();
  await pool.end();
}
