import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "../lib/site.ts";

/**
 * Crawlers that collect content for AI training, AI answers or AI search. Search engines may index the
 * demo; these may not. robots.txt is voluntary, so this only stops crawlers that honour it.
 * Google-Extended covers Gemini, not Search: AI Overviews use Googlebot and can't be excluded separately.
 */
export const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", // OpenAI
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", // Anthropic
  "Google-Extended", "Applebot-Extended", // opt-outs from Gemini and Apple AI training
  "CCBot", // Common Crawl, a common training source
  "PerplexityBot", "Perplexity-User",
  "Bytespider", "Amazonbot", "Meta-ExternalAgent", "FacebookBot",
  "cohere-ai", "cohere-training-data-crawler", "MistralAI-User", "DuckAssistBot", "Diffbot", "YouBot",
];

/**
 * Production may be crawled by search engines, except the POST-only API routes; AI crawlers are blocked.
 * Preview deployments are kept out entirely, so their URLs don't compete with production in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  if (!allowIndexing()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/api/chat", "/api/search", "/api/documents/"] },
    ],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
