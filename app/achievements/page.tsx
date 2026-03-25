import { getPlayerAchievements } from "@/lib/queries";
import { AchievementsClient } from "@/components/achievements/achievements-client";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const playerAchievements = await getPlayerAchievements();

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
