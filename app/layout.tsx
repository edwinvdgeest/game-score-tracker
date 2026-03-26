import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { MarathonBanner } from "@/components/marathon/marathon-banner";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Spelscores 🎲",
  description: "Score tracker voor Edwin & Lisanne",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Spelscores",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={nunito.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased pb-20" style={{ backgroundColor: "var(--background)" }}>
        <ThemeProvider>
          <MarathonBanner />
          <OfflineBanner />
          <main className="max-w-md mx-auto px-4 pt-6">{children}</main>
          <Nav />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
