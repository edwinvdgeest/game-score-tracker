"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./dark-mode-toggle";

const navItems = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/suggest", label: "Suggestie", emoji: "🎲" },
  { href: "/history", label: "Historie", emoji: "📜" },
  { href: "/achievements", label: "Badges", emoji: "🏅" },
  { href: "/games", label: "Spellen", emoji: "📋" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t z-50"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="max-w-md mx-auto flex items-center">
        {navItems.map((item) => {
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
        <div className="pr-2">
          <DarkModeToggle />
        </div>
      </div>
    </nav>
  );
}
