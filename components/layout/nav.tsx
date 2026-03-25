"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/suggest", label: "Spelen?", emoji: "🎲" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/games", label: "Spellen", emoji: "📋" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="max-w-md mx-auto flex">
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
      </div>
    </nav>
  );
}
