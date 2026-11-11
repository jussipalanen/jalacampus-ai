import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("UI declares Finnish language", () => {
  const source = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(source, /<html lang="fi">/);
});

test("chat UI labels AI answers and search results honestly", () => {
  const source = readFileSync(new URL("../src/components/search-chat.tsx", import.meta.url), "utf8");
  assert.match(source, /Tekoälyn muodostama vastaus – tarkista lähteet/);
  assert.match(source, /Nämä ovat hakutuloksia, eivät tekoälyn vastaus/);
  assert.match(source, /lähetetään Google Gemini -palveluun/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/); // model output is rendered as text only
});

test("course UI attributes results to the catalog, not to AI", () => {
  const source = readFileSync(new URL("../src/components/course-catalog.tsx", import.meta.url), "utf8");
  assert.match(source, /eivät tekoälyltä/);
  assert.match(source, /Lähde: \{data\.source\.name\}/);
  assert.match(source, /Lähde: \{source\.name\}, \{course\.code\}/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});
