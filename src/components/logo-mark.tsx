import { LOGO_PATHS } from "@/lib/site";

/** The logo as plain SVG for generated images (next/og), where Lucide components can't be used. */
export function LogoMark({ size, radius }: { size: number; radius: number }) {
  return <div style={{ width: size, height: size, borderRadius: radius, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {LOGO_PATHS.map(d => <path key={d} d={d} />)}
    </svg>
  </div>;
}
