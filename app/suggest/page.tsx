import { getGameSuggestion } from "@/lib/queries";
import { GameSuggester } from "@/components/suggest/game-suggester";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function SuggestPage() {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let candidates: Awaited<ReturnType<typeof getGameSuggestion>>;
  try {
    candidates = await getGameSuggestion();
  } catch {
    return <SetupBanner />;
  }

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
}
