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
    const files = ["src/components/search-chat.tsx", "src/components/document-library.tsx", "src/components/course-catalog.tsx", "src/components/settings-view.tsx"];
    assert.ok(files.some(file => new RegExp(`id="${id}"[^>]*tabIndex=\\{-1\\}`).test(source(file))), `${id} is focusable`);
  }
});

test("UI text avoids low-contrast slate-400 (placeholders and decorative icons excepted)", () => {
  for (const file of ["src/components/app-shell.tsx", "src/components/search-chat.tsx", "src/components/course-catalog.tsx", "src/components/document-library.tsx", "src/components/settings-view.tsx"]) {
    for (const line of source(file).split("\n")) {
      for (const [, cls] of line.matchAll(/className="([^"]*)"/g)) {
        if (/(^|\s)text-slate-400(\s|$)/.test(cls)) assert.match(line, /aria-hidden="true"/, `${file}: ${cls}`);
      }
    }
  }
  assert.match(source("src/app/globals.css"), /prefers-reduced-motion: reduce/);
});

test("Keskustelu has a full-screen toggle that Esc closes and that hides the page chrome", () => {
  const chat = source("src/components/search-chat.tsx");
  // Toggle pattern: constant visible name (WCAG 2.5.3 Label in Name) plus aria-pressed.
  assert.match(chat, /aria-pressed=\{fullscreen\}/);
  assert.match(chat, /<span className="sr-only sm:not-sr-only">Koko näyttö<\/span>/);
  assert.match(chat, /event\.key === "Escape" && !event\.defaultPrevented\) onFullscreenChange\(false\)/);
  assert.match(chat, /h-dvh/);
  // Several answers must not create several identical "Vastaus" landmarks.
  assert.doesNotMatch(chat, /<section aria-label="Vastaus">/);
  const shell = source("src/components/app-shell.tsx");
  assert.match(shell, /const fullscreen = chatFullscreen && view === "Keskustelu"/);
  for (const part of ["<header", "<nav", "<footer"]) assert.match(shell, new RegExp(`\\{!fullscreen && ${part}`), part);
  assert.match(shell, /<SearchChat fullscreen=\{fullscreen\} onFullscreenChange=\{setChatFullscreen\} \/>/);
});

test("full-screen empty state can't overflow upwards and the top bar fits narrow phones", () => {
  const chat = source("src/components/search-chat.tsx");
  // justify-center on a scrolling column pushes overflow above the top edge, out of reach.
  assert.doesNotMatch(chat, /flex-col justify-center overflow-y-auto/);
  assert.match(chat, /fullscreen && !active \? "my-auto" : ""/);
  assert.match(chat, /<span className="sr-only sm:not-sr-only">Tyhjennä<\/span>/);
  assert.match(source("src/app/layout.tsx"), /interactiveWidget: "resizes-content"/);
});

test("example questions are available from a ? disclosure in the input bar", () => {
  const menu = source("src/components/example-questions-menu.tsx");
  assert.match(menu, /aria-expanded=\{open\} aria-controls=\{panelId\} aria-label="Esimerkkikysymykset"/);
  // Esc is claimed first (preventDefault) so it closes the menu without leaving full screen.
  assert.match(menu, /event\.key !== "Escape"\) return;\s*event\.preventDefault\(\);\s*setOpen\(false\);\s*trigger\.current\?\.focus\(\)/);
  assert.match(menu, /hidden=\{!open\}/);
  const chat = source("src/components/search-chat.tsx");
  assert.match(chat, /<ExampleQuestionsMenu questions=\{suggestions\} onPick=\{ask\} disabled=\{loading\} \/>/);
});
