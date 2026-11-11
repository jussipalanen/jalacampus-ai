import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/logo-mark";
import { SITE } from "@/lib/site";

export const alt = "JalaCampus AI – suomenkielinen korkeakoulun tietoavustaja";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview image shown when the site is shared (Open Graph and X/Twitter). */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#f8fafc", color: "#0f172a", borderTop: "16px solid #2563eb" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <LogoMark size={104} radius={26} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>JalaCampus<span style={{ color: "#2563eb", marginLeft: 16 }}>AI</span></div>
          <div style={{ fontSize: 32, color: "#475569" }}>{SITE.tagline}</div>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 38, lineHeight: 1.35, maxWidth: 1000 }}>
        Kysy korkeakoulun ohjeista ja saat vastauksen lähteineen. Hae kursseja opinto-oppaasta.
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#475569" }}>
        <span style={{ padding: "8px 20px", borderRadius: 999, background: "#fffbeb", color: "#92400e", border: "2px solid #fde68a" }}>Esittelyversio</span>
        <span style={{ padding: "8px 20px" }}>Kuvitteellinen aineisto · {SITE.author}</span>
      </div>
    </div>,
    size,
  );
}
