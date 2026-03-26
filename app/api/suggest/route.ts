import { NextRequest, NextResponse } from "next/server";
import { getGameSuggestion } from "@/lib/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playersParam = searchParams.get("players");
    const playerCount = playersParam ? parseInt(playersParam, 10) : undefined;
    const games = await getGameSuggestion(
      playerCount && !isNaN(playerCount) && playerCount > 0 ? playerCount : undefined
    );
    return NextResponse.json(games);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
