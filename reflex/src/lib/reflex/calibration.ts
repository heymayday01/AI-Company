// Calibration — the math behind "0.9 confidence actually means 90% correct".
// Mirrors Phase 2 of the product plan: temperature scaling conceptually,
// ECE computation, review-rate tracking.

import { db } from "@/lib/db";
import type { Email, Correction } from "@prisma/client";

/** Expected Calibration Error — binned accuracy vs confidence. */
export function computeECE(
  predictions: { confidence: number; correct: boolean }[],
  bins = 10
): number {
  if (predictions.length === 0) return 0;
  const edges = Array.from({ length: bins + 1 }, (_, i) => i / bins);
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const lo = edges[b];
    const hi = edges[b + 1];
    const inBin = predictions.filter(
      (p) => p.confidence >= lo && (p.confidence < hi || (b === bins - 1 && p.confidence <= hi))
    );
    if (inBin.length === 0) continue;
    const avgConf = inBin.reduce((s, p) => s + p.confidence, 0) / inBin.length;
    const acc = inBin.filter((p) => p.correct).length / inBin.length;
    ece += (inBin.length / predictions.length) * Math.abs(avgConf - acc);
  }
  return Number(ece.toFixed(3));
}

export interface CalibrationStats {
  totalEmails: number;
  correctionsCount: number;
  accuracy: number;
  ece: number;
  reviewRate: number;
  bucketCounts: Record<string, number>;
}

/**
 * Compute current calibration stats. "Correct" = the email's current bucket
 * differs from what was originally triaged only by a user correction (i.e.
 * no correction recorded → treated as correct).
 */
export async function computeCalibrationStats(): Promise<CalibrationStats> {
  const emails: Email[] = await db.email.findMany({
    include: { corrections: true },
    orderBy: { createdAt: "asc" },
  });
  const corrections: Correction[] = await db.correction.findMany();

  const total = emails.length;
  const bucketCounts: Record<string, number> = {};
  let reviewCount = 0;
  const preds: { confidence: number; correct: boolean }[] = [];

  for (const e of emails) {
    bucketCounts[e.bucket] = (bucketCounts[e.bucket] ?? 0) + 1;
    if (e.bucket === "REVIEW") reviewCount++;
    // "correct" iff no correction has been filed against this email.
    preds.push({ confidence: e.confidence, correct: e.corrections.length === 0 });
  }

  const accuracy = total > 0 ? preds.filter((p) => p.correct).length / total : 0;
  const ece = computeECE(preds);
  const reviewRate = total > 0 ? reviewCount / total : 0;

  return {
    totalEmails: total,
    correctionsCount: corrections.length,
    accuracy: Number(accuracy.toFixed(3)),
    ece,
    reviewRate: Number(reviewRate.toFixed(3)),
    bucketCounts,
  };
}

/** Persist the current stats as a snapshot for trend tracking. */
export async function recordSnapshot(stats: CalibrationStats): Promise<void> {
  await db.calibrationSnapshot.create({
    data: {
      ece: stats.ece,
      accuracy: stats.accuracy,
      reviewRate: stats.reviewRate,
      totalEmails: stats.totalEmails,
      correctionsCount: stats.correctionsCount,
    },
  });
}
