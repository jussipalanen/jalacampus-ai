/** Public facts about the site, shared by metadata, robots, sitemap, manifest and structured data. */

const PRODUCTION_URL = "https://jalacampus-demo.jussialanen.com";

/**
 * The canonical origin. `NEXT_PUBLIC_SITE_URL` overrides it (e.g. a custom domain); Vercel production
 * builds expose `VERCEL_PROJECT_PRODUCTION_URL`. Everything else falls back to the known production URL,
 * so canonical links never point at a preview or localhost.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim()
    || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}` : "");
  return (configured || PRODUCTION_URL).replace(/\/+$/, "");
}

/** Search engines may index only the production deployment; previews and local builds on Vercel stay out. */
export const allowIndexing = (env: Record<string, string | undefined> = process.env) =>
  env.VERCEL_ENV === undefined || env.VERCEL_ENV === "production";

export const SITE = {
  name: "JalaCampus AI",
  title: "JalaCampus AI | Korkeakoulun tietoavustaja",
  tagline: "Korkeakoulun tietoavustaja",
  description:
    "Suomenkielinen korkeakoulun tietoavustajan demo: kysy kuvitteellisen korkeakoulun ohjeista ja saat vastauksen lähteineen, tai hae kursseja opinto-oppaasta.",
  author: "Jussi Alanen",
  locale: "fi_FI",
  language: "fi",
  themeColor: "#2563eb",
  backgroundColor: "#f8fafc",
} as const;

/** schema.org description of the site for search engines and AI assistants. */
export function structuredData(url = siteUrl()) {
  const author = { "@type": "Person", name: SITE.author };
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}/#website`, url, name: SITE.name, description: SITE.description, inLanguage: SITE.language, author },
      {
        "@type": "WebApplication",
        "@id": `${url}/#app`,
        url,
        name: SITE.name,
        description: SITE.description,
        inLanguage: SITE.language,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        featureList: [
          "Lähteisiin perustuvat vastaukset kuvitteellisen korkeakoulun ohjeista",
          "Kurssihaku kuvitteellisesta opinto-oppaasta",
          "PDF- ja TXT-dokumenttien esikatselu",
        ],
        author,
        isPartOf: { "@id": `${url}/#website` },
      },
    ],
  };
}

/** Lucide's graduation cap (24×24, stroked), the logo shown in the header, used for the icons and share image. */
export const LOGO_PATHS = [
  "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
  "M22 10v6",
  "M6 12.5V16a6 3 0 0 0 12 0v-3.5",
] as const;
