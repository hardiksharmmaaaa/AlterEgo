import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "KU Alter Ego — Meet the you you haven’t met yet",
  description: "Choose one of six UAE-inspired worlds, make one photo, and leave with a private AI alter ego.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090611",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
