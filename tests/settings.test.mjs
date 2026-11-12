import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_SETTINGS, isDefaultSettings, parseSettings, serializeSettings } from "../src/lib/settings.ts";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("missing, broken or non-object stored settings give the defaults", () => {
  for (const raw of [null, undefined, "", "{", "null", "[]", "42", "\"large\""]) {
    assert.deepEqual(parseSettings(raw), DEFAULT_SETTINGS, String(raw));
  }
  assert.deepEqual(DEFAULT_SETTINGS, { typingAnimation: true, sourcesOpen: false, voiceInput: true, textSize: "normal" });
});

test("valid values are kept and each invalid value falls back on its own", () => {
  const stored = JSON.stringify({ typingAnimation: false, sourcesOpen: "yes", voiceInput: false, textSize: "huge", extra: 1 });
  assert.deepEqual(parseSettings(stored), { typingAnimation: false, sourcesOpen: false, voiceInput: false, textSize: "normal" });
  assert.equal(parseSettings(JSON.stringify({ textSize: "large" })).textSize, "large");
});

test("serializing stores only known keys and round-trips", () => {
  const settings = { typingAnimation: false, sourcesOpen: true, voiceInput: true, textSize: "large", extra: "x" };
  const raw = serializeSettings(settings);
  assert.equal(raw, '{"typingAnimation":false,"sourcesOpen":true,"voiceInput":true,"textSize":"large"}');
  assert.deepEqual(parseSettings(raw), { typingAnimation: false, sourcesOpen: true, voiceInput: true, textSize: "large" });
  assert.equal(isDefaultSettings(parseSettings(raw)), false);
  assert.equal(isDefaultSettings(parseSettings(null)), true);
});

test("the defaults can't be changed by accident", () => {
  assert.ok(Object.isFrozen(DEFAULT_SETTINGS));
});

test("Asetukset uses labelled native controls and announces a reset", () => {
  const view = source("src/components/settings-view.tsx");
  assert.match(view, /type="checkbox" role="switch" checked=\{checked\} onChange=\{[^}]*\} aria-describedby=/);
  assert.match(view, /<label htmlFor=\{id\}/);
  assert.match(view, /<fieldset aria-describedby=\{sizeHelp\}[^>]*>\s*<legend className="sr-only">Tekstin koko<\/legend>/);
  assert.match(view, /type="radio" name="text-size"/);
  assert.match(view, /<p role="status"[^>]*>\{notice\}<\/p>/);
  // Nothing in the view may suggest that settings are sent anywhere.
  assert.match(view, /tallentuvat vain tähän selaimeen, eikä niitä lähetetä palvelimelle/);
});

test("settings reach the chat and the page", () => {
  const chat = source("src/components/search-chat.tsx");
  assert.match(chat, /const showVoice = voice\.supported && voiceInput/);
  assert.match(chat, /if \(!voiceInput\) stopVoice\(\)/);
  assert.match(chat, /!typingAnimation \|\| prefersReducedMotion\(\)/);
  assert.match(chat, /useState\(sourcesOpen\)/);
  assert.match(source("src/components/app-shell.tsx"), /document\.documentElement\.dataset\.textSize = textSize/);
  assert.match(source("src/app/globals.css"), /html\[data-text-size="large"\] \{ font-size: 112\.5%; \}/);
});
