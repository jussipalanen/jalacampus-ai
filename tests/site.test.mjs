import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE, allowIndexing, siteUrl, structuredData } from "../src/lib/site.ts";
import manifest from "../src/app/manifest.ts";
import robots from "../src/app/robots.ts";
import sitemap from "../src/app/sitemap.ts";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function setEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** Runs `run` with some environment variables set (undefined removes one), then restores them. */
function withEnv(values, run) {
  const saved = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  setEnv(values);
  try { return run(); } finally { setEnv(saved); }
}

test("siteUrl prefers the configured URL, then Vercel's production URL, then the known production site", () => {
  assert.equal(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.fi/" }), "https://example.fi");
  assert.equal(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "jalacampus.example.app" }), "https://jalacampus.example.app");
  assert.equal(siteUrl({}), "https://jalacampus-ai.vercel.app");
});

test("only production and non-Vercel builds may be indexed", () => {
  assert.equal(allowIndexing({}), true);
  assert.equal(allowIndexing({ VERCEL_ENV: "production" }), true);
  assert.equal(allowIndexing({ VERCEL_ENV: "preview" }), false);
  assert.equal(allowIndexing({ VERCEL_ENV: "development" }), false);
});

test("robots.txt allows production except the POST-only APIs and blocks previews", () => {
  const production = withEnv({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined }, robots);
  assert.equal(production.rules.allow, "/");
  assert.deepEqual(production.rules.disallow, ["/api/chat", "/api/search", "/api/documents/"]);
  assert.equal(production.sitemap, "https://jalacampus-ai.vercel.app/sitemap.xml");
  const preview = withEnv({ VERCEL_ENV: "preview" }, robots);
  assert.deepEqual(preview.rules, { userAgent: "*", disallow: "/" });
  assert.equal(preview.sitemap, undefined);
});

test("sitemap lists the front page on the canonical origin", () => {
  const entries = withEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined }, sitemap);
  assert.deepEqual(entries.map(entry => entry.url), ["https://jalacampus-ai.vercel.app/"]);
});

test("the web app manifest is Finnish and uses the brand colours", () => {
  const m = manifest();
  assert.equal(m.lang, "fi");
  assert.equal(m.theme_color, "#2563eb");
  assert.equal(m.background_color, "#f8fafc");
  assert.ok(m.icons.some(icon => icon.src === "/icon.svg"));
});

test("structured data describes a free Finnish web application without contact details", () => {
  const data = structuredData("https://example.fi");
  const app = data["@graph"].find(node => node["@type"] === "WebApplication");
  assert.equal(app.inLanguage, "fi");
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.url, "https://example.fi");
  assert.doesNotMatch(JSON.stringify(data), /"email"|"telephone"/);
  assert.equal(SITE.description.length <= 160, true, "description fits a search result snippet");
});

test("layout declares canonical, Open Graph and per-environment robots metadata", () => {
  const layout = source("src/app/layout.tsx");
  for (const field of ["metadataBase", "alternates: { canonical", "openGraph", "twitter", "themeColor", "robots: indexable"]) {
    assert.ok(layout.includes(field), field);
  }
  assert.match(layout, /<html lang="fi">/);
});

test("llms.txt states that the institution and its data are fictional", () => {
  const text = source("public/llms.txt");
  assert.match(text, /^# JalaCampus AI/);
  assert.match(text, /fictional/);
  assert.doesNotMatch(text, /github\.com\/jussipalanen\/jalacampus-ai/); // the repository is private
});
