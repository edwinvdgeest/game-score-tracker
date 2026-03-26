"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./dark-mode-toggle";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";

// PRIMARY_NAV is static; marathon badge is added dynamically in the component
const PRIMARY_NAV = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/marathon", label: "Marathon", emoji: "🏁" },
  { href: "/games", label: "Spellen", emoji: "📋" },
];

const MORE_NAV = [
  { href: "/history", label: "Historie", emoji: "📜" },
  { href: "/achievements", label: "Badges", emoji: "🏅" },
  { href: "/suggest", label: "Suggestie", emoji: "🎲" },
  { href: "/guests", label: "Gasten", emoji: "🎭" },
];

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV];

export function Nav() {
  const pathname = usePathname();
  const { marathon } = useActiveMarathon();
  const [meerOpen, setMeerOpen] = useState(false);
  const meerRef = useRef<HTMLDivElement>(null);

  // Sluit het menu als je buiten klikt
  useEffect(() => {
    if (!meerOpen) return;
    const handle = (e: MouseEvent) => {
      if (meerRef.current && !meerRef.current.contains(e.target as Node)) {
        setMeerOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [meerOpen]);

  // Sluit het menu bij routewijziging
  useEffect(() => {
    setMeerOpen(false);
  }, [pathname]);

  const meerActive = MORE_NAV.some((item) => pathname === item.href);

  return (
    <>
      {/* ── Mobile: vaste balk onderaan ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t z-50"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
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
          <div ref={meerRef} className="flex-1 relative">
            <button
              onClick={() => setMeerOpen((v) => !v)}
              className="w-full flex flex-col items-center py-3 text-xs font-bold transition-colors cursor-pointer"
              style={{ color: meerActive || meerOpen ? "var(--color-coral)" : "var(--muted-foreground)" }}
            >
              <span className="text-2xl mb-0.5">⋯</span>
              Meer
            </button>

            {/* Popover — opent omhoog */}
            {meerOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 rounded-2xl border shadow-lg overflow-hidden min-w-[160px]"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                {MORE_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-52 border-r z-50 py-6"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* App naam */}
        <div className="px-5 mb-6">
          <span className="text-2xl font-black" style={{ color: "var(--color-coral)" }}>
            🎲 Spelscores
          </span>
        </div>

        {/* Alle navigatie-items */}
        <div className="flex-1 flex flex-col gap-1 px-3">
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
