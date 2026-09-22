import { NextResponse } from "next/server";
import { computeCalibrationStats } from "@/lib/reflex/calibration";
import { getReviewThreshold } from "@/lib/reflex/config";

export const dynamic = "force-dynamic";

// GET /api/stats — calibration snapshot
export async function GET() {
  const stats = await computeCalibrationStats();
  const reviewThreshold = await getReviewThreshold();
  return NextResponse.json({ stats, reviewThreshold });
}
