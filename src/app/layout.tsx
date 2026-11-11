import type { Metadata, Viewport } from "next";
import { SITE, allowIndexing, siteUrl } from "@/lib/site";
import "./globals.css";

const indexable = allowIndexing();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author }],
  creator: SITE.author,
  keywords: ["korkeakoulu", "tietoavustaja", "opinto-opas", "kurssihaku", "RAG", "tekoäly", "Next.js"],
  alternates: { canonical: "/" },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: SITE.locale,
  },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "light",
  // The on-screen keyboard shrinks the layout instead of overlaying it, so the chat's top bar and input
  // stay visible while typing (Chromium on Android; iOS Safari ignores it).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fi"><body className="antialiased">{children}</body></html>;
}
