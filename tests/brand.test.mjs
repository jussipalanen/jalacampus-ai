import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("UI declares Finnish language", () => {
  const source = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(source, /<html lang="fi">/);
});

test("search UI does not present results as AI answers", () => {
  const source = readFileSync(new URL("../src/components/search-chat.tsx", import.meta.url), "utf8");
  assert.match(source, /Tekoälyn muotoilemat vastaukset toteutetaan seuraavassa vaiheessa/);
  assert.match(source, /Nämä ovat hakutuloksia, eivät tekoälyn vastaus/);
  assert.match(source, /Kysymys lähetetään Google Gemini -palveluun/);
});
