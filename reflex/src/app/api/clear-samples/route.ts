import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/clear-samples
// Deletes all sample (seeded) emails so only real, synced emails remain.
export async function POST() {
  // Delete corrections on sample emails first (FK constraint), then the emails.
  const samples = await db.email.findMany({
    where: { isSample: true },
    select: { id: true },
  });
  if (samples.length > 0) {
    await db.correction.deleteMany({
      where: { emailId: { in: samples.map((s) => s.id) } },
    });
    await db.email.deleteMany({ where: { isSample: true } });
  }
  return NextResponse.json({ removed: samples.length });
}
