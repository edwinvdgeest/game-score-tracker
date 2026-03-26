import { NextResponse } from "next/server";
import { getPlayers, createGuestPlayer } from "@/lib/queries";
import { createGuestPlayerSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function GET() {
  try {
    const players = await getPlayers();
    return NextResponse.json(players);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const input = createGuestPlayerSchema.parse(body);
    const player = await createGuestPlayer(input);
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
