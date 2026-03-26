import { NextResponse } from "next/server";
import { getGuestPlayers } from "@/lib/queries";

export async function GET() {
  try {
    const guests = await getGuestPlayers();
    return NextResponse.json(guests);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
