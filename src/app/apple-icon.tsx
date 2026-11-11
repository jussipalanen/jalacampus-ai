import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/logo-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS: the logo on a full blue square (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(<LogoMark size={180} radius={0} />, size);
}
