import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NO_INDEX, SITE, siteUrl, structuredData } from "../src/lib/site.ts";
import manifest from "../src/app/manifest.ts";
import robots, { AI_CRAWLERS } from "../src/app/robots.ts";

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
  assert.equal(siteUrl({}), "https://jalacampus-demo.jussialanen.com");
});

test("robots.txt blocks AI crawlers but lets search engines crawl to see noindex", () => {
  for (const env of [{ VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: undefined }]) {
    const [ai, everyone] = withEnv(env, robots).rules;
    assert.deepEqual(ai, { userAgent: AI_CRAWLERS, disallow: "/" });
    assert.equal(everyone.userAgent, "*");
    assert.equal(everyone.allow, "/"); // a crawler blocked here would never see noindex
    assert.deepEqual(everyone.disallow, ["/api/chat", "/api/search", "/api/documents/"]);
  }
  for (const bot of ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "PerplexityBot"]) assert.ok(AI_CRAWLERS.includes(bot), bot);
  assert.equal(robots().sitemap, undefined);
});

test("every response and the page metadata say noindex, and there is no sitemap", async () => {
  assert.match(NO_INDEX, /noindex/);
  assert.match(NO_INDEX, /nofollow/);
  const { default: config } = await import("../next.config.ts");
  const rules = await config.headers();
  assert.deepEqual(rules, [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: NO_INDEX }] }]);
  assert.match(source("src/app/layout.tsx"), /robots: \{ index: false, follow: false/);
  assert.throws(() => source("src/app/sitemap.ts"), { code: "ENOENT" });
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

test("layout declares canonical, Open Graph and noindex robots metadata", () => {
  const layout = source("src/app/layout.tsx");
  for (const field of ["metadataBase", "alternates: { canonical", "openGraph", "twitter", "themeColor", "robots: { index: false"]) {
    assert.ok(layout.includes(field), field);
  }
  assert.match(layout, /<html lang="fi">/);
});

test("no llms.txt is published, because AI crawlers are not invited", () => {
  assert.throws(() => source("public/llms.txt"), { code: "ENOENT" });
});
