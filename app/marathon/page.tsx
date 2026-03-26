"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";
import { LiveScoreboard } from "@/components/marathon/live-scoreboard";
import Link from "next/link";

function MarathonPageContent() {
  const params = useSearchParams();
  const { marathon, isLoading } = useActiveMarathon();

  // Prefer id from URL param (just after starting), fall back to active marathon
  const idFromParam = params.get("id");
  const marathonId = idFromParam ?? marathon?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-4xl">
        🏁
      </div>
    );
  }

  if (!marathonId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <span className="text-6xl">🏁</span>
        <h2 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
          Geen actieve marathon
        </h2>
        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Start een marathon vanaf de homepagina
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-2xl font-black text-white"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          Naar home
        </Link>
      </div>
    );
  }

  return <LiveScoreboard marathonId={marathonId} />;
}

export default function MarathonPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-4xl">🏁</div>}>
      <MarathonPageContent />
    </Suspense>
  );
}
