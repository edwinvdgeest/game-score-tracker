import { getPlayerAchievements } from "@/lib/queries";
import { AchievementsClient } from "@/components/achievements/achievements-client";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let playerAchievements: Awaited<ReturnType<typeof getPlayerAchievements>>;
  try {
    playerAchievements = await getPlayerAchievements();
  } catch {
    return <SetupBanner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Badges 🏅
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Jouw prestaties
        </p>
      </div>
      <AchievementsClient playerAchievements={playerAchievements} />
    </div>
  );
}
