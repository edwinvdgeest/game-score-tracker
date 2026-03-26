"use client";

import Link from "next/link";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";
import { useMarathonDetail } from "@/lib/hooks/useMarathon";

function BannerContent({ marathonId }: { marathonId: string }) {
  const { detail } = useMarathonDetail(marathonId);
  const count = detail?.sessions.length ?? 0;

  return (
    <Link
      href="/marathon"
      className="flex items-center justify-between px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: "var(--color-coral)" }}
    >
      <span>🏁 Marathon actief</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
        {count} {count === 1 ? "potje" : "potjes"} gespeeld →
      </span>
    </Link>
  );
}

export function MarathonBanner() {
  const { marathon } = useActiveMarathon();
  if (!marathon) return null;
  return <BannerContent marathonId={marathon.id} />;
}
