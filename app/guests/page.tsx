import { GuestsClient } from "@/components/guests/guests-client";

export const metadata = {
  title: "Gasten beheren",
};

export default function GuestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Gasten beheren 🎭</h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Gastspelers worden bewaard zolang ze actief zijn. Ze tellen niet mee in het hoofd-leaderboard.
        </p>
      </div>
      <GuestsClient />
    </div>
  );
}
