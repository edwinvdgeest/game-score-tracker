import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Toaster } from "@/components/ui/sonner";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Spelscores 🎲",
  description: "Score tracker voor Edwin & Lisanne",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={nunito.variable}>
      <body className="min-h-screen antialiased pb-20" style={{ backgroundColor: "var(--background)" }}>
        <main className="max-w-md mx-auto px-4 pt-6">{children}</main>
        <Nav />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
