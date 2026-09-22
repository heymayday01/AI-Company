// Reflex decision schema — v1.
// Mirrors the 8-category taxonomy and 5-bucket placement described in the
// product plan. Keeping this in one place makes the whole pipeline auditable.

export const CATEGORIES = [
  "action_needed",
  "meeting",
  "fyi_work",
  "transactional",
  "newsletter",
  "social",
  "security_alert",
  "spam",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  action_needed: "Action needed",
  meeting: "Meeting",
  fyi_work: "FYI · work",
  transactional: "Transactional",
  newsletter: "Newsletter",
  social: "Social",
  security_alert: "Security alert",
  spam: "Spam",
};

// Short human-readable criteria used to build the classifier prompt.
export const CATEGORY_CRITERIA: Record<Category, string> = {
  action_needed:
    "A real person is waiting on a reply, approval, decision, or payment from you.",
  meeting:
    "Calendar invite, scheduling request, agenda, or a meeting-related thread.",
  fyi_work:
    "Work context you should be aware of but no action is required from you.",
  transactional:
    "Receipt, shipping update, account notice, automated confirmation, or order status.",
  newsletter:
    "Bulk / promotional / digested content sent to many recipients.",
  social:
    "Personal/social message from a friend, family, or community platform.",
  security_alert:
    "Login attempt, password change, security warning, or 2FA prompt.",
  spam:
    "Unsolicited junk, phishing, scams, or content with no legitimate sender.",
};

export const BUCKETS = ["NOW", "TODAY", "WEEK", "ARCHIVE", "REVIEW"] as const;
export type Bucket = (typeof BUCKETS)[number];

// UI helpers (Tailwind class strings). Kept here so server + client agree.
export const CATEGORY_UI: Record<
  Category,
  { bar: string; text: string; bg: string; border: string }
> = {
  action_needed: {
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-900",
  },
  meeting: {
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900",
  },
  fyi_work: {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
  },
  transactional: {
    bar: "bg-teal-500",
    text: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-900",
  },
  newsletter: {
    bar: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-900",
  },
  social: {
    bar: "bg-pink-500",
    text: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-900",
  },
  security_alert: {
    bar: "bg-red-600",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-900",
  },
  spam: {
    bar: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-800",
  },
};

export const ATTENTION_LABELS = ["ignore", "when free", "today", "right now"];

export const BUCKET_META: Record<
  Bucket,
  { label: string; description: string; accent: string; dot: string }
> = {
  NOW: {
    label: "NOW",
    description: "Needs a reply or decision within hours.",
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  TODAY: {
    label: "TODAY",
    description: "Actionable, but not on fire. Handle today.",
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  WEEK: {
    label: "WEEK",
    description: "Read when free. No hard deadline.",
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  ARCHIVE: {
    label: "ARCHIVE",
    description: "Handled or never needed you. Filed.",
    accent: "text-slate-500 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  REVIEW: {
    label: "REVIEW",
    description: "Low-confidence decision — look yourself.",
    accent: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
};

export const REVIEW_CONFIDENCE_THRESHOLD = 0.65;

export interface CategoryProb {
  category: Category;
  prob: number;
}

export interface Distribution {
  [category: string]: number;
}

export interface Decision {
  category: Category;
  confidence: number;
  attention: number; // 0..3
  actionNeeded: number; // 0..1 (noul-style)
  fromHuman: number; // 0..1
  consequence: number; // 0..1
  churnSignal: number; // 0..1
  distribution: Distribution;
  topCandidates: CategoryProb[];
  bucket: Bucket;
  latencyMs: number;
  source: "llm" | "fallback";
}

export const SCHEMA_VERSION = 1;

/**
 * Reflex v1 priority logic — same formula as the product plan:
 *   NOW     = attention >= 3 AND (from_human > 0.6 OR consequence > 0.7)
 *   TODAY   = action_needed > 0.7 OR attention == 2
 *   WEEK    = attention == 1
 *   ARCHIVE = else
 *   REVIEW  = category confidence < reviewThreshold (overrides above)
 */
export function assignBucket(
  d: Omit<Decision, "bucket">,
  reviewThreshold = REVIEW_CONFIDENCE_THRESHOLD
): Bucket {
  if (d.confidence < reviewThreshold) return "REVIEW";
  if (d.attention >= 3 && (d.fromHuman > 0.6 || d.consequence > 0.7))
    return "NOW";
  if (d.actionNeeded > 0.7 || d.attention === 2) return "TODAY";
  if (d.attention === 1) return "WEEK";
  return "ARCHIVE";
}

export function topCandidates(d: Distribution, k = 3): CategoryProb[] {
  return Object.entries(d)
    .map(([category, prob]) => ({ category: category as Category, prob }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, k);
}
