import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site.ts";

/** One page: the views are switched in place, so they share the front page's URL. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/`, changeFrequency: "weekly", priority: 1 }];
}
