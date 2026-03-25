import { getGameStats } from "@/lib/queries";
import { GameDetailClient } from "@/components/games/game-detail-client";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface GameDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const { id } = await params;
  const stats = await getGameStats(id);

  if (!stats) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/games"
        className="inline-flex items-center gap-1 font-bold text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        ← Terug naar spellen
      </Link>
      <GameDetailClient stats={stats} />
    </div>
  );
}
