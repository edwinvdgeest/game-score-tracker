import { getGamesSortedByRecent, getPlayers } from "@/lib/queries";
import { SessionForm } from "@/components/quick-log/session-form";
import { SetupBanner } from "@/components/setup-banner";
import { MarathonStartButton } from "@/components/marathon/marathon-start-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const [games, players] = await Promise.all([
      getGamesSortedByRecent(),
      getPlayers(),
    ]);

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
        <MarathonStartButton />
        <SessionForm games={games} players={players} />
      </div>
    );
  } catch {
    return <SetupBanner />;
  }
}
