import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { releaseNotes } from "../scripts/release-notes.mjs";

test("published version has nonempty release notes", () => {
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  assert.match(releaseNotes(`v${version}`, version, changelog), /Added/);
});

test("rejects wrong tags and missing changelog sections", () => {
  const changelog = "## [0.1.0] - 2026-11-03\n\n- First release.\n";
  assert.throws(() => releaseNotes("v0.2.0", "0.1.0", changelog));
  assert.throws(() => releaseNotes("0.1.0", "0.1.0", changelog));
  assert.throws(() => releaseNotes("v0.1.0", "0.1.0", "## [Unreleased]\n"));
});
