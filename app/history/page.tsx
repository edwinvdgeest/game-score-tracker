import { getAllSessions, getPlayers } from "@/lib/queries";
import { HistoryClient } from "@/components/history/history-client";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let data: [
    Awaited<ReturnType<typeof getAllSessions>>,
    Awaited<ReturnType<typeof getPlayers>>,
  ];
  try {
    data = await Promise.all([getAllSessions(), getPlayers()]);
  } catch {
    return <SetupBanner />;
  }
  const [sessions, players] = data;

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
