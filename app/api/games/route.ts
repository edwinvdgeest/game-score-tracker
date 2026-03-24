import { NextResponse } from "next/server";
import { getGames, createGame } from "@/lib/queries";
import { createGameSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function GET() {
  try {
    const games = await getGames();
    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = createGameSchema.parse(body);
    const game = await createGame(input);
    return NextResponse.json(game, { status: 201 });
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
