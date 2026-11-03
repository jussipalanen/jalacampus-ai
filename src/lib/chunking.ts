import { createHash } from "node:crypto";

export type DocumentChunk = {
  id: string;
  documentId: string;
  ordinal: number;
  text: string;
};

export const CHUNK_SIZE = 1_000;
export const CHUNK_OVERLAP = 150;

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function chunkDocument(input: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): {
  documentId: string;
  contentHash: string;
  chunks: DocumentChunk[];
} {
  if (!Number.isInteger(size) || size < 2 || !Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    throw new RangeError("Chunk size must be at least 2 and overlap must be smaller than size.");
  }
  const text = input.replace(/\r\n?/g, "\n").trim();
  if (!text) throw new Error("Document text is empty.");
  const characters = Array.from(text);
  const contentHash = hashText(text);
  const documentId = contentHash;
  const chunks: DocumentChunk[] = [];
  for (let start = 0; start < characters.length;) {
    let end = Math.min(start + size, characters.length);
    if (end < characters.length) {
      const minimum = start + Math.floor(size * 0.75);
      for (let i = end - 1; i >= minimum; i--) {
        if (/\s/u.test(characters[i])) { end = i + 1; break; }
      }
    }
    const part = characters.slice(start, end).join("").trim();
    if (part) {
      const ordinal = chunks.length;
      chunks.push({ id: hashText(`${documentId}\0${ordinal}\0${part}`), documentId, ordinal, text: part });
    }
    if (end === characters.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return { documentId, contentHash, chunks };
}
