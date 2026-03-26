import { NextRequest, NextResponse } from "next/server";
import { updateGame } from "@/lib/queries";
import { createGameSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createGameSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ongeldige invoer", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const game = await updateGame(id, parsed.data);
    return NextResponse.json(game);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchGameSchema = z.object({
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ongeldige invoer", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const game = await updateGame(id, parsed.data);
    return NextResponse.json(game);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
