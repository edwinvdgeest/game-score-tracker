import { getGamesWithStats } from "@/lib/queries";
import { GameList } from "@/components/games/game-list";
import { AddGameForm } from "@/components/games/add-game-form";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let games: Awaited<ReturnType<typeof getGamesWithStats>>;
  try {
    games = await getGamesWithStats();
  } catch {
    return <SetupBanner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-black"
          style={{ color: "var(--foreground)" }}
        >
          Spellen 🎲
        </h1>
        <p
          className="font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          {games.filter((g) => !g.is_archived).length} spellen in de lijst
        </p>
      </div>
      <AddGameForm />
      <GameList games={games} />
    </div>
  );
}
