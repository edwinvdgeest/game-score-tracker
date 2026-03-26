"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./dark-mode-toggle";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";

const baseNavItems = [
  { href: "/", label: "Loggen", emoji: "🎮" },
  { href: "/dashboard", label: "Scores", emoji: "🏆" },
  { href: "/suggest", label: "Suggestie", emoji: "🎲" },
  { href: "/history", label: "Historie", emoji: "📜" },
  { href: "/achievements", label: "Badges", emoji: "🏅" },
  { href: "/games", label: "Spellen", emoji: "📋" },
];

export function Nav() {
  const pathname = usePathname();
  const { marathon } = useActiveMarathon();

  // Marathon tab: altijd zichtbaar, met badge als actief
  const navItems = [
    ...baseNavItems,
    {
      href: "/marathon",
      label: "Marathon",
      emoji: "🏁",
      badge: marathon !== null && marathon !== undefined,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t z-50"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="max-w-md mx-auto flex items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/marathon" && pathname.startsWith("/marathon"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center py-3 text-xs font-bold transition-colors relative",
                isActive ? "text-coral" : "text-muted-foreground hover:text-foreground"
              )}
              style={{ color: isActive ? "var(--color-coral)" : undefined }}
            >
              <span className="text-2xl mb-0.5 relative">
                {item.emoji}
                {"badge" in item && item.badge && (
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
        <div className="pr-2">
          <DarkModeToggle />
        </div>
      </div>
    </nav>
  );
}
