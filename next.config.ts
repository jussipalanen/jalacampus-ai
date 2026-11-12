import type { NextConfig } from "next";
import { NO_INDEX } from "./src/lib/site.ts";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Every response, including images, the share image and API JSON, asks search engines not to index it.
  headers: async () => [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: NO_INDEX }] }],
};

export default nextConfig;
