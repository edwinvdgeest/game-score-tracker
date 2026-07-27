"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./dark-mode-toggle";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";

// PRIMARY_NAV is static; marathon badge is added dynamically in the component.
//
// INVARIANT: PRIMARY_NAV + de "Meer"-knop = exact 5 tabs op mobiel. Voeg hier nooit een
// vijfde item toe — de onderste balk loopt dan over en taps komen niet meer aan (dat is
// eerder al twee keer misgegaan). Nieuwe pagina's gaan in MORE_NAV.
const PRIMARY_NAV = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/marathon", label: "Marathon", emoji: "🏁" },
  { href: "/games", label: "Spellen", emoji: "📋" },
];

const MORE_NAV = [
  { href: "/seasons", label: "Seizoen", emoji: "🏆" },
  { href: "/duel", label: "Duel", emoji: "⚔️" },
  { href: "/history", label: "Historie", emoji: "📜" },
  { href: "/achievements", label: "Badges", emoji: "🏅" },
  { href: "/suggest", label: "Suggestie", emoji: "🎲" },
  { href: "/players", label: "Spelers", emoji: "👥" },
];

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV];

export function Nav() {
  const pathname = usePathname();
  const { marathon } = useActiveMarathon();
  const [meerOpen, setMeerOpen] = useState(false);

  // Sluit het menu met Escape (buiten-tappen gaat via de overlay hieronder —
  // een document-level mousedown-listener is onbetrouwbaar op touch)
  useEffect(() => {
    if (!meerOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMeerOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [meerOpen]);

  // Sluit het menu bij routewijziging. Dit gebeurt tijdens de render in plaats van in
  // een effect: het is state die van de route afgeleid wordt, en een effect zou een
  // extra render kosten waarin het menu nog open staat.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMeerOpen(false);
  }

  const meerActive = MORE_NAV.some((item) => pathname === item.href);

  return (
    <>
      {/* ── Mobile: vaste balk onderaan ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t z-50 pb-[env(safe-area-inset-bottom)] touch-manipulation"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Tap-overlay: sluit het "Meer"-menu bij een tap ergens anders.
            Zit binnen de nav (z-50) maar achter de balk, dus boven alle pagina-inhoud. */}
        {meerOpen && (
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={() => setMeerOpen(false)}
            className="fixed inset-0 -z-10 cursor-default"
          />
        )}

        <div className="flex items-center">
          {PRIMARY_NAV.map((item) => {
            const isActive =
              item.href === "/marathon"
                ? pathname === "/marathon" || pathname.startsWith("/marathon/")
                : pathname === item.href;
            const showBadge = item.href === "/marathon" && marathon != null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center py-3 text-xs font-bold transition-colors"
                style={{ color: isActive ? "var(--color-coral)" : "var(--muted-foreground)" }}
              >
                <span className="text-2xl mb-0.5 relative">
                  {item.emoji}
                  {showBadge && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        borderColor: "var(--card)",
                      }}
                    />
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}

          {/* Meer knop met popover */}
          <div className="flex-1 relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={meerOpen}
              onClick={() => setMeerOpen((v) => !v)}
              className="w-full flex flex-col items-center py-3 text-xs font-bold transition-colors cursor-pointer"
              style={{ color: meerActive || meerOpen ? "var(--color-coral)" : "var(--muted-foreground)" }}
            >
              <span className="text-2xl mb-0.5">⋯</span>
              Meer
            </button>

            {/* Popover — opent omhoog, boven de tap-overlay */}
            {meerOpen && (
              <div
                role="menu"
                // max-h + scroll zodat de popover niet buiten beeld groeit als MORE_NAV
                // langer wordt — op een kleine telefoon opent hij vlak boven de balk.
                className="absolute bottom-full right-0 mb-2 z-10 rounded-2xl border shadow-lg overflow-hidden min-w-[160px] max-h-[60vh] overflow-y-auto"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                {MORE_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      // Sluit ook als je de al-actieve route tapt (dan verandert pathname niet)
                      onClick={() => setMeerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors",
                        isActive ? "font-extrabold" : "hover:bg-[var(--muted)]"
                      )}
                      style={{ color: isActive ? "var(--color-coral)" : "var(--foreground)" }}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      {item.label}
                    </Link>
                  );
                })}
                <div
                  className="flex items-center gap-3 px-4 py-3 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
                    Thema
                  </span>
                  <div className="ml-auto">
                    <DarkModeToggle />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Tablet/desktop: zijbalk links ── */}
      <nav
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-52 border-r z-50 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)]"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* App naam */}
        <div className="px-5 mb-6">
          <span className="text-2xl font-black" style={{ color: "var(--color-coral)" }}>
            🎲 Spelscores
          </span>
        </div>

        {/* Alle navigatie-items. Scrollbaar, want op een iPad in landscape is de hoogte
            krap en zou het thema-blok onderaan van het scherm geduwd worden. */}
        <div className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
          {ALL_NAV.map((item) => {
            const isActive =
              item.href === "/marathon"
                ? pathname === "/marathon" || pathname.startsWith("/marathon/")
                : pathname === item.href;
            const showBadge = item.href === "/marathon" && marathon != null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-colors",
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--color-coral)_12%,transparent)]"
                    : "hover:bg-[var(--muted)]"
                )}
                style={{ color: isActive ? "var(--color-coral)" : "var(--foreground)" }}
              >
                <span className="text-xl relative flex-shrink-0">
                  {item.emoji}
                  {showBadge && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        backgroundColor: "var(--color-coral)",
                        borderColor: "var(--card)",
                      }}
                    />
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Thema toggle onderaan */}
        <div
          className="mx-3 px-3 py-3 rounded-2xl border flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
            Thema
          </span>
          <DarkModeToggle />
        </div>
      </nav>
    </>
  );
}
