import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JalaCampus AI | Korkeakoulun tietoavustaja",
  description: "Suomenkielinen korkeakoulun tekoälyavustajan työnäyte.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fi"><body className="antialiased">{children}</body></html>;
}
