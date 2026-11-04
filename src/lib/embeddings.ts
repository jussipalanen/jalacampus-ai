/** Server-side only: the Gemini API key must never reach client bundles. */

export const EMBEDDING_DIMENSIONS = 768;
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_BATCH_SIZE = 100;

export type EmbeddingInput =
  | { kind: "document"; title?: string; text: string }
  | { kind: "query"; text: string };

export interface Embedder {
  /** Stored with each vector so vectors from different models are never mixed. */
  readonly model: string;
  readonly dimensions: number;
  /** Returns one unit-length vector per input, in input order. */
  embed(inputs: EmbeddingInput[]): Promise<number[][]>;
}

export class EmbeddingError extends Error {}

/** gemini-embedding-2 takes the task as a text prefix instead of a `taskType` field. */
export function formatGeminiInput(input: EmbeddingInput): string {
  return input.kind === "query"
    ? `task: search result | query: ${input.text}`
    : `title: ${input.title?.trim() || "none"} | text: ${input.text}`;
}

export function normalize(vector: number[]): number[] {
  const norm = Math.hypot(...vector);
  if (!Number.isFinite(norm) || norm === 0) throw new EmbeddingError("Embedding vector has zero or invalid length.");
  return vector.map(value => value / norm);
}

type GeminiOptions = {
  apiKey: string | undefined;
  model?: string;
  dimensions?: number;
  maxRetries?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export function createGeminiEmbedder({
  apiKey,
  model = GEMINI_EMBEDDING_MODEL,
  dimensions = EMBEDDING_DIMENSIONS,
  maxRetries = 3,
  timeoutMs = 30_000,
  fetch: fetchImpl = globalThis.fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
}: GeminiOptions): Embedder {
  if (!apiKey) throw new EmbeddingError("GEMINI_API_KEY is not set.");
  const url = `${GEMINI_API_BASE}/${model}:batchEmbedContents`;

  async function embedBatch(inputs: EmbeddingInput[]): Promise<number[][]> {
    const body = JSON.stringify({
      requests: inputs.map(input => ({
        model: `models/${model}`,
        content: { parts: [{ text: formatGeminiInput(input) }] },
        output_dimensionality: dimensions,
      })),
    });
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey! },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return parseEmbeddings(await response.json(), inputs.length, dimensions);
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= maxRetries) {
        throw new EmbeddingError(`Gemini embedding request failed with HTTP ${response.status}.`);
      }
      await sleep(1_000 * 2 ** attempt);
    }
  }

  return {
    model,
    dimensions,
    async embed(inputs) {
      const vectors: number[][] = [];
      for (let start = 0; start < inputs.length; start += MAX_BATCH_SIZE) {
        vectors.push(...await embedBatch(inputs.slice(start, start + MAX_BATCH_SIZE)));
      }
      return vectors;
    },
  };
}

function parseEmbeddings(json: unknown, expectedCount: number, dimensions: number): number[][] {
  const embeddings = (json as { embeddings?: unknown })?.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== expectedCount) {
    throw new EmbeddingError("Gemini returned an unexpected number of embeddings.");
  }
  return embeddings.map(entry => {
    const values = (entry as { values?: unknown })?.values;
    if (!Array.isArray(values) || values.length !== dimensions || !values.every(Number.isFinite)) {
      throw new EmbeddingError(`Gemini returned an embedding that is not ${dimensions} finite numbers.`);
    }
    return normalize(values as number[]);
  });
}
