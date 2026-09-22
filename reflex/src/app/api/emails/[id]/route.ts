import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/emails/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await db.email.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.email.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
