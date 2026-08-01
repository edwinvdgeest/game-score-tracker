import { NextResponse } from "next/server";
import { getSessionRounds } from "@/lib/queries";

/** GET /api/sessions/[id]/rounds — het rondeverloop van één potje, voor /history */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rounds = await getSessionRounds(id);
    return NextResponse.json({ rounds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
