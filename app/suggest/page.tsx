import { getGameSuggestion } from "@/lib/queries";
import { GameSuggester } from "@/components/suggest/game-suggester";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

interface SuggestPageProps {
  /** `players` komt mee vanaf de homepage, waar het aantal deelnemers al aangevinkt stond. */
  searchParams: Promise<{ players?: string }>;
}

/** Aantal spelers uit de URL, of null als er niets bruikbaars staat. */
function parsePlayers(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  // De keuzeknoppen op deze pagina lopen van 2 tot 6; daarbuiten filteren we niet voor.
  if (Number.isNaN(parsed) || parsed < 2 || parsed > 6) return null;
  return parsed;
}

export default async function SuggestPage({ searchParams }: SuggestPageProps) {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let data: [Awaited<ReturnType<typeof getGameSuggestion>>, { players?: string }];
  try {
    data = await Promise.all([getGameSuggestion(), searchParams]);
  } catch {
    return <SetupBanner />;
  }
  const [candidates, resolvedParams] = data;

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
      <GameSuggester
        initialCandidates={candidates}
        initialPlayerCount={parsePlayers(resolvedParams.players)}
      />
    </div>
  );
}
