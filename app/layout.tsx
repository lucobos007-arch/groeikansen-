import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Groeikansen — AI marktbriefing",
  description:
    "Persoonlijke AI-analist die hoog-potentiële groeiaandelen vindt. Research, geen financieel advies.",
  manifest: "/manifest.webmanifest",
  applicationName: "Groeikansen",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Groeikansen",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
