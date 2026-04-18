import { NextResponse } from "next/server";
import { getSessionHighlights } from "@/lib/queries";

/** GET /api/sessions/[id]/highlights — feitjes voor de winnaar na een sessie */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionHighlights(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
