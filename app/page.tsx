import { getGamesSortedByRecent, getPlayers, getMemories } from "@/lib/queries";
import { SessionForm } from "@/components/quick-log/session-form";
import { SetupBanner } from "@/components/setup-banner";
import { MarathonStartButton } from "@/components/marathon/marathon-start-button";
import { MemoryCard } from "@/components/memories/memory-card";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ game?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let data: [
    Awaited<ReturnType<typeof getGamesSortedByRecent>>,
    Awaited<ReturnType<typeof getPlayers>>,
    Awaited<ReturnType<typeof getMemories>>,
    { game?: string },
  ];
  try {
    data = await Promise.all([
      getGamesSortedByRecent(),
      getPlayers(),
      getMemories(),
      searchParams,
    ]);
  } catch {
    return <SetupBanner />;
  }
  const [games, players, memory, resolvedParams] = data;

  const preselectedGameId = resolvedParams.game;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-black"
          style={{ color: "var(--foreground)" }}
        >
          Spelscores 🎲
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Wie wint er vandaag?
        </p>
      </div>
      {/* Alleen renderen als er echt een herinnering is — geen leeg kader. */}
      {memory && <MemoryCard memory={memory} />}
      <MarathonStartButton />
      <SessionForm games={games} players={players} preselectedGameId={preselectedGameId} />
    </div>
  );
}
