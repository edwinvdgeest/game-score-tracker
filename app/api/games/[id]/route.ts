import { NextRequest, NextResponse } from "next/server";
import { updateGame, updateGameMetadata } from "@/lib/queries";
import {
  createGameSchema,
  updateGameTextSchema,
  type GameMetadataPatch,
} from "@/lib/schemas";
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

const patchGameSchema = z
  .object({
    is_favorite: z.boolean().optional(),
    is_archived: z.boolean().optional(),
  })
  .extend(updateGameTextSchema.shape);

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

    const patch: GameMetadataPatch & { is_favorite?: boolean; is_archived?: boolean } = {
      ...parsed.data,
    };

    // Zodra iemand met de hand een tekst aanpast, gaat het slot erop. Dat is het
    // hele clobber-contract: zowel de seed-migratie als het automatisch verrijken
    // laten een vergrendelde rij met rust.
    if ("description" in parsed.data || "rules_summary" in parsed.data) {
      patch.text_source = "handmatig";
      patch.text_locked = true;
    }

    const game = await updateGameMetadata(id, patch);
    return NextResponse.json(game);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
