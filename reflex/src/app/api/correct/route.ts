import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { BUCKETS, type Bucket } from "@/lib/reflex/schema";
import { getReviewThreshold } from "@/lib/reflex/config";
import { computeCalibrationStats, recordSnapshot } from "@/lib/reflex/calibration";

export const dynamic = "force-dynamic";

// POST /api/correct — record a "wrong bucket" correction and re-bucket.
// Body: { emailId, toBucket }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { emailId, toBucket } = body as { emailId?: string; toBucket?: string };
  if (!emailId || !toBucket) {
    return NextResponse.json(
      { error: "emailId and toBucket are required" },
      { status: 400 }
    );
  }
  if (!BUCKETS.includes(toBucket as Bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  const email = await db.email.findUnique({
    where: { id: emailId },
    include: { corrections: { orderBy: { createdAt: "desc" } } },
  });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const fromBucket = email.bucket;

  // Record the correction.
  await db.correction.create({
    data: { emailId, fromBucket, toBucket: toBucket as Bucket },
  });

  // Re-bucket the email using the new threshold so future views reflect it.
  const reviewThreshold = await getReviewThreshold();
  const updated = await db.email.update({
    where: { id: emailId },
    data: { bucket: toBucket as Bucket },
  });

  // Recompute calibration stats and persist a snapshot (flywheel turn).
  const stats = await computeCalibrationStats();
  await recordSnapshot(stats);

  return NextResponse.json({
    email: {
      id: updated.id,
      bucket: updated.bucket,
      fromBucket,
      toBucket: updated.bucket,
    },
    stats,
    reviewThreshold,
  });
}
