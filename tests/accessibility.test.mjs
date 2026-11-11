import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("app shell has a skip link, a labelled menu and focus moves to the new view", () => {
  const shell = source("src/components/app-shell.tsx");
  assert.match(shell, /href="#sisalto"[^>]*>Siirry sisältöön/);
  assert.match(shell, /<main id="sisalto" tabIndex=\{-1\}/);
  assert.match(shell, /aria-expanded=\{mobileMenu\} aria-controls="main-menu"/);
  assert.match(shell, /<nav id="main-menu" aria-label="Päävalikko"/);
  assert.match(shell, /document\.getElementById\(heading \?\? ""\)\?\.focus\(\)/);
  for (const id of ["chat-heading", "documents-heading", "courses-heading", "settings-heading"]) {
    const files = ["src/components/search-chat.tsx", "src/components/document-library.tsx", "src/components/course-catalog.tsx", "src/components/app-shell.tsx"];
    assert.ok(files.some(file => new RegExp(`id="${id}"[^>]*tabIndex=\\{-1\\}`).test(source(file))), `${id} is focusable`);
  }
});

test("UI text avoids low-contrast slate-400 (placeholders and decorative icons excepted)", () => {
  for (const file of ["src/components/app-shell.tsx", "src/components/search-chat.tsx", "src/components/course-catalog.tsx", "src/components/document-library.tsx"]) {
    for (const line of source(file).split("\n")) {
      for (const [, cls] of line.matchAll(/className="([^"]*)"/g)) {
        if (/(^|\s)text-slate-400(\s|$)/.test(cls)) assert.match(line, /aria-hidden="true"/, `${file}: ${cls}`);
      }
    }
  }
  assert.match(source("src/app/globals.css"), /prefers-reduced-motion: reduce/);
});
