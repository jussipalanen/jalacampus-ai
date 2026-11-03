import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("UI declares Finnish language", () => {
  const source = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(source, /<html lang="fi">/);
});

test("AI demo does not claim implemented RAG", () => {
  const source = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /tekoälyhaku toteutetaan seuraavassa vaiheessa/);
});
