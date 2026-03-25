import { getGameSuggestion } from "@/lib/queries";
import { GameSuggester } from "@/components/suggest/game-suggester";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function SuggestPage() {
  try {
    const candidates = await getGameSuggestion();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
            Wat zullen we spelen? 🎲
          </h1>
          <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
            We kiezen een spel dat jullie een tijdje niet gespeeld hebben
          </p>
        </div>
        <GameSuggester initialCandidates={candidates} />
      </div>
    );
  } catch {
    return <SetupBanner />;
  }
}
