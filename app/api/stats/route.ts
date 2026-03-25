import { NextResponse } from "next/server";
import { getStats } from "@/lib/queries";
import { periodFilterSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodRaw = searchParams.get("period") ?? "all";
    const period = periodFilterSchema.parse(periodRaw);
    const gameId = searchParams.get("game_id") ?? null;
    const stats = await getStats(period, gameId);
    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Ongeldig filter" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
