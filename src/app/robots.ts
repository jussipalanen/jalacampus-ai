import type { MetadataRoute } from "next";

/**
 * Crawlers that collect content for AI training, AI answers or AI search. They may not crawl anything.
 * robots.txt is voluntary, so this only stops crawlers that honour it.
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
 * The site is kept out of search results by `noindex` on every response (page metadata and the
 * X-Robots-Tag header in next.config.ts), not by robots.txt: a search engine must be allowed to crawl a page
 * to see its `noindex`, otherwise a linked URL can stay listed. So search engines may crawl (except the
 * POST-only APIs), and AI crawlers are disallowed entirely. There is no sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/api/chat", "/api/search", "/api/documents/"] },
    ],
  };
}
