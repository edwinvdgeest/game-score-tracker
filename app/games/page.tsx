import { getGames } from "@/lib/queries";
import { GameList } from "@/components/games/game-list";
import { AddGameForm } from "@/components/games/add-game-form";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  try {
    const games = await getGames();

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
            {games.length} spellen in de lijst
          </p>
        </div>
        <AddGameForm />
        <GameList games={games} />
      </div>
    );
  } catch {
    return <SetupBanner />;
  }
}
