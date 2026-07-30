import { NextResponse } from "next/server";
import { getGameRecap } from "@/lib/queries";

/** GET /api/games/[id]/recap — laatste uitslagen, stand en record van één spel. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recap = await getGameRecap(id);
    if (!recap) {
      return NextResponse.json({ error: "Spel niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(recap);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
