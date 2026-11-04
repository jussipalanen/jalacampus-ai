import { createHash } from "node:crypto";
import { EMBEDDING_DIMENSIONS, normalize } from "../../src/lib/embeddings.ts";

/**
 * Deterministic, offline embedder for tests: a hashed bag of words, so texts sharing words
 * get similar vectors. Records every call in `calls`.
 */
export function createFakeEmbedder(model = "fake-embedding") {
  const calls = [];
  return {
    model,
    dimensions: EMBEDDING_DIMENSIONS,
    calls,
    async embed(inputs) {
      calls.push(inputs);
      return inputs.map(({ text }) => {
        const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
        vector[0] = 1e-6; // keeps the vector non-zero for empty word lists
        for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
          vector[createHash("sha256").update(word).digest().readUInt32BE(0) % EMBEDDING_DIMENSIONS] += 1;
        }
        return normalize(vector);
      });
    },
  };
}
