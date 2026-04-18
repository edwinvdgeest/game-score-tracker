import { NextResponse } from "next/server";
import { getPreGameHype } from "@/lib/queries";

/** GET /api/pre-game?game_id=...&player_ids=a,b,c&starter_id=x */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("game_id");
    const playerIdsRaw = searchParams.get("player_ids");
    const starterId = searchParams.get("starter_id");

    if (!gameId || !playerIdsRaw) {
      return NextResponse.json({ facts: [] });
    }

    const playerIds = playerIdsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (playerIds.length === 0) {
      return NextResponse.json({ facts: [] });
    }

    const result = await getPreGameHype({
      gameId,
      playerIds,
      starterId: starterId || null,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
