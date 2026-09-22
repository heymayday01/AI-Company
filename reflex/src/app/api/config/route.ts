import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  getReviewThreshold,
  setReviewThreshold,
} from "@/lib/reflex/config";
import { assignBucket, topCandidates, type Distribution } from "@/lib/reflex/schema";

export const dynamic = "force-dynamic";

// GET /api/config — current threshold
export async function GET() {
  return NextResponse.json({ reviewThreshold: await getReviewThreshold() });
}

// POST /api/config — update threshold AND re-bucket every email so the board
// reflects the new gate live.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { reviewThreshold } = body as { reviewThreshold?: number };
  if (typeof reviewThreshold !== "number" || !Number.isFinite(reviewThreshold)) {
    return NextResponse.json({ error: "reviewThreshold must be a number" }, { status: 400 });
  }
  const v = await setReviewThreshold(reviewThreshold);

  // Re-bucket every email from its stored distribution + noul scores.
  const emails = await db.email.findMany();
  let changed = 0;
  for (const e of emails) {
    const distribution: Distribution = JSON.parse(e.distribution);
    const maxProb = Math.max(...Object.values(distribution));
    const newBucket = assignBucket(
      {
        category: e.category as never,
        confidence: maxProb,
        attention: e.attention,
        actionNeeded: e.actionNeeded,
        fromHuman: e.fromHuman,
        consequence: e.consequence,
        churnSignal: e.churnSignal,
        distribution,
        topCandidates: topCandidates(distribution, 3),
        latencyMs: 0,
        source: "llm",
      },
      v
    );
    if (newBucket !== e.bucket) {
      changed++;
      await db.email.update({
        where: { id: e.id },
        data: { bucket: newBucket, confidence: maxProb },
      });
    }
  }

  return NextResponse.json({ reviewThreshold: v, reBuckets: changed });
}
