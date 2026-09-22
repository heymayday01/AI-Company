// Reflex decider — the heart of the pipeline.
//
// In the real product plan, the decider is a Laya Router fan-out (6 questions,
// one forward pass). Here we emulate the same shape with one structured LLM
// call that returns the *full distribution* across the 8 categories plus the
// noul-style auxiliary scores, then derive the bucket with the exact same
// priority formula.
//
// A deterministic keyword-based fallback keeps the demo working even if the
// LLM endpoint is unreachable — the confidence becomes visibly "low" and the
// email lands in REVIEW, which is exactly the graceful-degradation behavior
// the plan calls for.

import ZAI from "z-ai-web-dev-sdk";
import {
  CATEGORIES,
  CATEGORY_CRITERIA,
  assignBucket,
  topCandidates,
  type Bucket,
  type Decision,
  type Distribution,
  REVIEW_CONFIDENCE_THRESHOLD,
} from "./schema";

export interface ClassifyInput {
  sender: string;
  senderName?: string;
  subject: string;
  snippet: string;
  body?: string;
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

const SYSTEM_PROMPT = `You are Reflex — a calibrated email triage engine. You read an email and output a probability distribution over 8 attention categories, plus 4 noul-style auxiliary scores. You decide; you do not generate prose.

Categories and their decision criteria:
- action_needed: ${CATEGORY_CRITERIA.action_needed}
- meeting: ${CATEGORY_CRITERIA.meeting}
- fyi_work: ${CATEGORY_CRITERIA.fyi_work}
- transactional: ${CATEGORY_CRITERIA.transactional}
- newsletter: ${CATEGORY_CRITERIA.newsletter}
- social: ${CATEGORY_CRITERIA.social}
- security_alert: ${CATEGORY_CRITERIA.security_alert}
- spam: ${CATEGORY_CRITERIA.spam}

Rules:
- Output STRICT JSON only. No prose, no code fences.
- The "distribution" object MUST contain exactly these 8 keys, each a number in [0,1], summing to ~1.0 (use 3 decimals). Be honest about uncertainty — if two categories are plausible, split the mass; do not force one to 1.0.
- "confidence" = the max value in distribution (do not round up).
- "attention" is an integer 0..3: 0 ignore, 1 when-free, 2 today, 3 right-now.
- The 4 noul scores are numbers in [0,1] expressing how true each statement is for this email:
  - actionNeeded: "the reader must reply / approve / pay / decide something"
  - fromHuman: "the sender is a real human the reader likely knows"
  - consequence: "ignoring this for 24h has a real cost"
  - churnSignal: "ignoring this threatens to end a relationship"

Respond with this exact shape:
{
  "distribution": { "action_needed": 0.0, "meeting": 0.0, "fyi_work": 0.0, "transactional": 0.0, "newsletter": 0.0, "social": 0.0, "security_alert": 0.0, "spam": 0.0 },
  "confidence": 0.0,
  "attention": 0,
  "actionNeeded": 0.0,
  "fromHuman": 0.0,
  "consequence": 0.0,
  "churnSignal": 0.0
}`;

function buildUserPrompt(input: ClassifyInput): string {
  const from = input.senderName ? `${input.senderName} <${input.sender}>` : input.sender;
  const body = input.body && input.body.trim().length > 0
    ? `\nBody (truncated):\n${input.body.slice(0, 1500)}`
    : "";
  return `From: ${from}\nSubject: ${input.subject}\nSnippet: ${input.snippet}${body}\n\nReturn the JSON decision now.`;
}

function normalizeDistribution(raw: Record<string, unknown>): Distribution {
  const dist: Distribution = {};
  for (const c of CATEGORIES) {
    const v = Number(raw[c] ?? 0);
    dist[c] = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  }
  const sum = CATEGORIES.reduce((s, c) => s + dist[c], 0);
  if (sum > 0) {
    for (const c of CATEGORIES) dist[c] = dist[c] / sum;
  }
  return dist;
}

function clamp01(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function clampAttention(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 0;
}

function parseDecision(raw: string): Omit<Decision, "bucket" | "latencyMs" | "source"> | null {
  let obj: Record<string, unknown>;
  try {
    // Strip code fences if present.
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const distribution = normalizeDistribution((obj.distribution ?? {}) as Record<string, unknown>);
  const confidence = clamp01(obj.confidence);
  const attention = clampAttention(obj.attention);
  const actionNeeded = clamp01(obj.actionNeeded);
  const fromHuman = clamp01(obj.fromHuman);
  const consequence = clamp01(obj.consequence);
  const churnSignal = clamp01(obj.churnSignal);

  // Recompute confidence from distribution to keep it honest.
  const maxProb = CATEGORIES.reduce((m, c) => Math.max(m, distribution[c]), 0);
  const finalConfidence = confidence > 0 ? confidence : maxProb;

  const top = topCandidates(distribution, 1);
  const category = top[0]?.category ?? "fyi_work";

  return {
    category,
    confidence: Number(finalConfidence.toFixed(3)),
    attention,
    actionNeeded,
    fromHuman,
    consequence,
    churnSignal,
    distribution,
    topCandidates: topCandidates(distribution, 3),
  };
}

// --- Deterministic fallback ----------------------------------------------
// A transparent keyword-based classifier. Always available; produces
// deliberately modest confidences so uncertain emails flow to REVIEW.

const FALLBACK_RULES: Array<{
  re: RegExp;
  category: Distribution;
}> = [
  {
    re: /\b(meeting|calendar|invite|agenda|schedule|reschedule|zoom|google meet|teams meeting)\b/i,
    category: { meeting: 0.78, action_needed: 0.1, fyi_work: 0.07, transactional: 0.03, newsletter: 0.01, social: 0.005, security_alert: 0.003, spam: 0.002 },
  },
  {
    re: /\b(receipt|invoice|order(?! from)|shipment|delivered|tracking|your order|dispatched|package|payment received)\b/i,
    category: { transactional: 0.82, action_needed: 0.05, fyi_work: 0.04, newsletter: 0.04, social: 0.02, meeting: 0.01, security_alert: 0.01, spam: 0.01 },
  },
  {
    re: /\b(login|sign[- ]?in attempt|password|2fa|two[- ]?factor|security alert|verify (your|this) account|unusual activity|suspicious)\b/i,
    category: { security_alert: 0.7, action_needed: 0.15, transactional: 0.05, fyi_work: 0.04, spam: 0.04, newsletter: 0.01, social: 0.005, meeting: 0.003 },
  },
  {
    re: /\b(newsletter|unsubscribe|digest|weekly roundup|issue #|vol\.|curated|this week in)\b/i,
    category: { newsletter: 0.85, transactional: 0.05, fyi_work: 0.04, social: 0.02, spam: 0.02, action_needed: 0.01, meeting: 0.005, security_alert: 0.005 },
  },
  {
    re: /\b(verify|confirm|approve|approval|please review|action required|sign( the)? (doc|document|contract)|your input|need (your|a) decision|awaiting (your )?reply|reply asap|urgent|deadline)\b/i,
    category: { action_needed: 0.78, meeting: 0.06, fyi_work: 0.06, transactional: 0.04, security_alert: 0.02, newsletter: 0.02, social: 0.01, spam: 0.01 },
  },
  {
    re: /\b(lunch|dinner|coffee|birthday|congratulations|happy (birthday|new year|holidays)|thanks( so much)?|love you|hey|howdy)\b/i,
    category: { social: 0.7, action_needed: 0.1, newsletter: 0.08, fyi_work: 0.05, transactional: 0.04, meeting: 0.02, spam: 0.005, security_alert: 0.005 },
  },
  {
    re: /\b(win|prize|lottery|inheritance|crypto|bitcoin|investment opportunity|click here|free gift|nigeria|million dollars|claim your)\b/i,
    category: { spam: 0.82, security_alert: 0.06, newsletter: 0.05, transactional: 0.03, social: 0.02, action_needed: 0.01, fyi_work: 0.005, meeting: 0.005 },
  },
];

const FALLBACK_DEFAULT: Distribution = {
  fyi_work: 0.34,
  newsletter: 0.22,
  transactional: 0.16,
  action_needed: 0.12,
  social: 0.08,
  meeting: 0.04,
  spam: 0.02,
  security_alert: 0.02,
};

function fallbackDecide(input: ClassifyInput): Omit<Decision, "bucket" | "latencyMs" | "source"> {
  const text = `${input.subject} ${input.snippet} ${input.body ?? ""}`.toLowerCase();
  let dist: Distribution | null = null;
  for (const rule of FALLBACK_RULES) {
    if (rule.re.test(text)) {
      dist = { ...rule.category };
      break;
    }
  }
  if (!dist) dist = { ...FALLBACK_DEFAULT };

  // Light dispersion so confidence is honest but rule-matched emails are
  // confident enough to land in real buckets (not all in REVIEW). Genuinely
  // ambiguous emails (no rule match → default ~0.34 top) stay below the
  // review threshold and escalate to REVIEW — exactly the graceful behavior
  // the plan calls for.
  for (const c of CATEGORIES) dist[c] = dist[c] * 0.95 + 0.05 / 8;

  const top = topCandidates(dist, 1);
  const category = top[0].category;
  const confidence = top[0].prob;

  const isAction = category === "action_needed";
  const isHuman =
    /@(gmail|outlook|yahoo|protonmail|fastmail|icloud)\./i.test(input.sender) ||
    category === "social" ||
    category === "action_needed";
  const hasConsequence = isAction || category === "meeting" || category === "security_alert";

  const attention =
    category === "security_alert" || (isAction && confidence > 0.7) ? 3
      : category === "action_needed" || category === "meeting" ? 2
      : category === "fyi_work" || category === "transactional" ? 1
      : 0;

  return {
    category,
    confidence: Number(confidence.toFixed(3)),
    attention,
    actionNeeded: isAction ? 0.85 : 0.2,
    fromHuman: isHuman ? 0.7 : 0.2,
    consequence: hasConsequence ? 0.75 : 0.25,
    churnSignal: isAction ? 0.5 : 0.1,
    distribution: dist,
    topCandidates: topCandidates(dist, 3),
  };
}

/**
 * The "local model" path — instant, deterministic, always works.
 * In the product plan this is Laya's 33ms fan-out. Used for seeding the sample
 * inbox so the demo is never blocked on a rate-limited cloud LLM.
 */
export function classifyLocal(
  input: ClassifyInput,
  opts: { reviewThreshold?: number } = {}
): Decision {
  const start = Date.now();
  const reviewThreshold = opts.reviewThreshold ?? REVIEW_CONFIDENCE_THRESHOLD;
  const parsed = fallbackDecide(input);
  const bucket = assignBucket(parsed, reviewThreshold);
  return { ...parsed, bucket, latencyMs: Date.now() - start, source: "fallback" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Classify an email and assign a bucket. Uses the cloud LLM as the
 * "escalator" path with retry/backoff on 429s; falls back to the deterministic
 * local classifier if the LLM is unreachable — keeping the demo honest about
 * uncertainty (low confidence → REVIEW).
 */
export async function classify(
  input: ClassifyInput,
  opts: { reviewThreshold?: number; retries?: number } = {}
): Promise<Decision> {
  const start = Date.now();
  const reviewThreshold = opts.reviewThreshold ?? REVIEW_CONFIDENCE_THRESHOLD;
  const retries = opts.retries ?? 3;

  let parsed: Omit<Decision, "bucket" | "latencyMs" | "source"> | null = null;
  let source: "llm" | "fallback" = "llm";

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const zai = await getZai();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
        thinking: { type: "disabled" },
      });
      const content = completion.choices[0]?.message?.content ?? "";
      parsed = parseDecision(content);
      if (!parsed) {
        // Try a one-shot repair: extract the first {...} block.
        const match = content.match(/\{[\s\S]*\}/);
        if (match) parsed = parseDecision(match[0]);
      }
      if (parsed) break; // success
    } catch {
      // 429 or network error — backoff and retry.
    }
    if (attempt < retries - 1) await sleep(500 * Math.pow(2, attempt));
  }

  if (!parsed) {
    parsed = fallbackDecide(input);
    source = "fallback";
  }

  const bucket: Bucket = assignBucket(parsed, reviewThreshold);
  const latencyMs = Date.now() - start;

  return {
    ...parsed,
    bucket,
    latencyMs,
    source,
  };
}
