import { getAllSessions, getPlayers } from "@/lib/queries";
import { HistoryClient } from "@/components/history/history-client";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [sessions, players] = await Promise.all([getAllSessions(), getPlayers()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Geschiedenis 📜
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Alle gespeelde potjes
        </p>
      </div>
      <HistoryClient sessions={sessions} players={players} />
    </div>
  );
}
