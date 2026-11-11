import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "../lib/site.ts";

/**
 * Production may be crawled, except the POST-only API routes. Preview deployments are kept out entirely,
 * so their URLs don't compete with production in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  if (!allowIndexing()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/chat", "/api/search", "/api/documents/"] },
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
