import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DocumentError, extractDocument, MAX_UPLOAD_BYTES } from "../src/lib/document-preview.ts";

const upload = (name, content, type = "") => new File([content], name, { type });

test("valid UTF-8 text is extracted without altering Finnish content", async () => {
  const result = await extractDocument(upload("ohje.txt", "  Opiskelun ohjeet: ääkköset.  ", "text/plain"));
  assert.deepEqual(result, { text: "Opiskelun ohjeet: ääkköset.", truncated: false });
});

test("rejects unsupported, empty, oversized, and malformed text files", async () => {
  for (const file of [
    upload("bad.docx", "test"),
    upload("empty.txt", ""),
    upload("large.txt", new Uint8Array(MAX_UPLOAD_BYTES + 1)),
    upload("invalid.txt", new Uint8Array([0xff])),
    upload("binary.txt", "ab\0cd"),
  ]) {
    await assert.rejects(extractDocument(file), DocumentError);
  }
});

test("extracts a synthetic PDF and rejects invalid PDF bytes", async () => {
  const bytes = readFileSync(new URL("./fixtures/sample.pdf", import.meta.url));
  const result = await extractDocument(upload("sample.pdf", bytes, "application/pdf"));
  assert.match(result.text, /Synthetic campus guide/);
  await assert.rejects(extractDocument(upload("fake.pdf", "not a pdf", "application/pdf")), DocumentError);
});
