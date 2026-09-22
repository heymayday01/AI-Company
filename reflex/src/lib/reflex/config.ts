// Threshold config persistence — the "threshold slider backed by real ECE
// metrics" feature from Phase 2.

import { db } from "@/lib/db";
import { REVIEW_CONFIDENCE_THRESHOLD } from "./schema";

const SETTING_KEY = "review_confidence_threshold";

export async function getReviewThreshold(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return REVIEW_CONFIDENCE_THRESHOLD;
  const v = Number(row.value);
  return Number.isFinite(v) ? v : REVIEW_CONFIDENCE_THRESHOLD;
}

export async function setReviewThreshold(v: number): Promise<number> {
  const clamped = Math.max(0.3, Math.min(0.95, Number(v.toFixed(2))));
  await db.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: String(clamped) },
    update: { value: String(clamped) },
  });
  return clamped;
}
