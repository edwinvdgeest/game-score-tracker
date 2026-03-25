import { NextResponse } from "next/server";
import { getGameSuggestion } from "@/lib/queries";

export async function GET() {
  try {
    const games = await getGameSuggestion();
    return NextResponse.json(games);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
