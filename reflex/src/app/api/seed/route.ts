import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedIfEmpty, SAMPLE_EMAILS } from "@/lib/reflex/seed";
import { classify } from "@/lib/reflex/classify";
import { getReviewThreshold } from "@/lib/reflex/config";

export const dynamic = "force-dynamic";

// POST /api/seed — seed the database with the sample inbox if empty.
// Pass { force: true } to wipe and reseed.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.force) {
    await db.correction.deleteMany();
    await db.email.deleteMany();
    await db.calibrationSnapshot.deleteMany();
  }
  const result = await seedIfEmpty();
  return NextResponse.json({
    seeded: result.seeded,
    available: SAMPLE_EMAILS.length,
    totalInDb: await db.email.count(),
    reviewThreshold: await getReviewThreshold(),
  });
}
