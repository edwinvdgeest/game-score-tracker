"use client";

import { toast } from "sonner";

interface ShareButtonProps {
  /** Tekstsamenvatting die gedeeld of gekopieerd wordt. */
  summary: string;
  year: number;
}

/**
 * Deelt de samenvatting via de Web Share API, met de klembord als terugvaloptie.
 *
 * Geen canvas-export of html2canvas: dat zijn een nieuwe dependency plus font- en
 * dark-mode-problemen voor een app met twee gebruikers. De kaart zelf is
 * screenshot-vriendelijk, en dat is in de praktijk hoe dit gedeeld wordt.
 */
export function ShareButton({ summary, year }: ShareButtonProps) {
  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Spelscores ${year}`,
          text: summary,
          url,
        });
        return;
      } catch {
        // Gebruiker heeft het deelvenster geannuleerd, of delen mislukte. Val terug op
        // kopiëren in plaats van een foutmelding te geven.
      }
    }

    try {
      await navigator.clipboard.writeText(`${summary}\n${url}`);
      toast.success("Samenvatting gekopieerd 📋");
    } catch {
      toast.error("Kon niet delen of kopiëren.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="w-full py-3 rounded-2xl font-bold text-sm text-white cursor-pointer"
      style={{ backgroundColor: "var(--color-coral)" }}
    >
      📤 Deel dit overzicht
    </button>
  );
}
