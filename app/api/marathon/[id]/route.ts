import { NextResponse } from "next/server";
import { endMarathon, getMarathonDetail } from "@/lib/queries";

/** GET /api/marathon/[id] — gedetailleerde marathon data */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getMarathonDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Marathon niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** PATCH /api/marathon/[id] — beëindig marathon */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const marathon = await endMarathon(id);
    return NextResponse.json(marathon);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
