import { NextResponse } from "next/server";
import { getPlayers, getAllPlayers, createPlayer } from "@/lib/queries";
import { createPlayerSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    // ?include_inactive=1 is voor de beheerpagina; de rest van de app wil alleen de
    // spelers die nog meedoen.
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "1";
    const players = includeInactive ? await getAllPlayers() : await getPlayers();
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
    const input = createPlayerSchema.parse(body);
    const player = await createPlayer(input);
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
