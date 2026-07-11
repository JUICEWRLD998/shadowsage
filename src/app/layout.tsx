import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { SuiProvider } from "@/components/providers/SuiProvider";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import "./globals.css";

/* Body / UI — Inter variable, optical sizing on */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-src",
});

/* Display — Outfit for premium headlines */
const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-display-src",
});

/* Mono — JetBrains Mono for stats, data, and Shadow's voice */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
  variable: "--font-mono-src",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://shadowsage.vercel.app";
const TITLE = "ShadowSage — Local AI football predictions";
const DESCRIPTION =
  "A QVAC-powered football prediction companion that learns your bias locally, spawns an adversarial Shadow, and prepares self-custodial USDt fan stakes with WDK.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: "%s · ShadowSage",
  },
  description: DESCRIPTION,
  applicationName: "ShadowSage",
  keywords: [
    "World Cup 2026",
    "local AI prediction",
    "QVAC",
    "WDK",
    "USDt",
    "cognitive bias",
    "football predictions",
    "ShadowSage",
  ],
  authors: [{ name: "ShadowSage" }],
  openGraph: {
    type: "website",
    url: APP_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "ShadowSage",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ShadowSage" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07070e",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <SuiProvider>
          <AuthProvider>
            <Navbar />
            <div className="app-shell">
              <AuthGate>{children}</AuthGate>
            </div>
          </AuthProvider>
        </SuiProvider>
      </body>
    </html>
  );
}
