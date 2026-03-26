"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./dark-mode-toggle";

const mainNavItems = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/marathon", label: "Marathon", emoji: "🏁" },
  { href: "/games", label: "Spellen", emoji: "📋" },
];

const moreItems = [
  { href: "/history", label: "Historie", emoji: "📜" },
  { href: "/achievements", label: "Badges", emoji: "🏅" },
  { href: "/suggest", label: "Suggestie", emoji: "🎲" },
];

export function Nav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  const moreActive = moreItems.some((item) => pathname === item.href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t z-50"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="max-w-md mx-auto flex items-center">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center py-3 text-xs font-bold transition-colors",
                isActive ? "text-coral" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ color: isActive ? "var(--color-coral)" : undefined }}
            >
              <span className="text-2xl mb-0.5">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Meer tab met popover */}
        <div ref={moreRef} className="flex-1 relative flex flex-col items-center">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "w-full flex flex-col items-center py-3 text-xs font-bold transition-colors",
              moreActive || moreOpen ? "text-coral" : "text-muted-foreground hover:text-foreground"
            )}
            style={{ color: moreActive || moreOpen ? "var(--color-coral)" : undefined }}
          >
            <span className="text-2xl mb-0.5">⋯</span>
            Meer
          </button>

          {moreOpen && (
            <div
              className="absolute bottom-full mb-2 right-0 rounded-xl shadow-lg border overflow-hidden min-w-[140px]"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              {moreItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-colors",
                      isActive ? "text-coral" : "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ color: isActive ? "var(--color-coral)" : undefined }}
                  >
                    <span>{item.emoji}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="pr-2">
          <DarkModeToggle />
        </div>
      </div>
    </nav>
  );
}
