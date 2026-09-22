"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldAlert,
  User,
  Bot,
  Zap,
  AlertTriangle,
  HeartCrack,
  Clock,
  Check,
  CheckCircle2,
} from "lucide-react";
import {
  BUCKETS,
  BUCKET_META,
  CATEGORY_LABELS,
  CATEGORY_UI,
  ATTENTION_LABELS,
  type Bucket,
} from "@/lib/reflex/schema";
import { useReflex } from "@/store/reflex";
import type { EmailDTO } from "@/lib/reflex/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { spring, useStaggerContainer, useStaggerItem } from "@/lib/reflex/motion";

function FullDistribution({ email }: { email: EmailDTO }) {
  const sorted = Object.entries(email.distribution)
    .map(([category, prob]) => ({ category, prob }))
    .sort((a, b) => b.prob - a.prob);
  const item = useStaggerItem(8);

  return (
    <div className="space-y-2.5">
      {sorted.map(({ category, prob }, i) => {
        const ui = CATEGORY_UI[category as keyof typeof CATEGORY_UI];
        const label = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
        const pct = Math.round(prob * 100);
        const isTop = category === email.category;
        return (
          <motion.div key={category} variants={item} custom={i}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className={cn("flex items-center gap-1.5", isTop ? "font-semibold" : "text-muted-foreground")}>
                {isTop && <span className="text-primary">▸</span>}
                {label}
              </span>
              <span className="font-mono text-[13px] tabular-nums">
                {(prob * 100).toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={spring.smooth}
                className={cn("h-full rounded-full", ui?.bar ?? "bg-slate-400")}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function NoulScore({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  const pct = Math.round(value * 100);
  const active = value > 0.5;
  const item = useStaggerItem(8);
  return (
    <motion.div variants={item} className="rounded-2xl border border-white/10 bg-white/20 p-3.5 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-medium">
          {icon}
          {label}
        </div>
        <span
          className={cn(
            "font-mono text-[13px] font-bold tabular-nums",
            active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
          )}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={spring.smooth}
          className={cn("h-full rounded-full", active ? "bg-emerald-500" : "bg-slate-400")}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function EmailDetailPage() {
  const selectedEmailId = useReflex((s) => s.selectedEmailId);
  const emails = useReflex((s) => s.emails);
  const setSelectedEmailId = useReflex((s) => s.setSelectedEmailId);
  const correctBucket = useReflex((s) => s.correctBucket);
  const setView = useReflex((s) => s.setView);

  const email: EmailDTO | null = selectedEmailId
    ? emails.find((e) => e.id === selectedEmailId) ?? null
    : null;

  const meta = email ? BUCKET_META[email.bucket] : null;
  const container = useStaggerContainer(0.06, 10);

  // Escape closes the detail (Apple Mail behavior).
  useEffect(() => {
    if (!email) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEmailId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [email, setSelectedEmailId]);

  if (!email || !meta) return null;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={spring.snug}
        onClick={() => setSelectedEmailId(null)}
        className="glass-soft group mb-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to inbox
      </motion.button>

      {/* ONE cohesive page — a single glass surface with internal section flow. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="glass overflow-hidden rounded-[1.75rem]"
      >
        {/* Top accent = bucket color, full bleed */}
        <div className={cn("h-1 w-full", meta.dot)} />

        <motion.div variants={container} initial="hidden" animate="show" className="px-6 py-6 sm:px-8 sm:py-7">
              {/* Hero: sender + subject */}
              <motion.div variants={container} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {(email.senderName ?? email.sender)
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold leading-tight">
                      {email.senderName ?? email.sender}
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      {email.fromHuman > 0.6 ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                      <span className="truncate font-mono">{email.sender}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full bg-white/30 px-2.5 py-1 text-[11px] font-medium dark:bg-white/10",
                    meta.accent
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>
              </motion.div>

              {/* Subject — the page H1, generous size like Mail.app */}
              <motion.h1
                variants={container}
                className="mt-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
              >
                {email.subject}
              </motion.h1>

              {/* Meta — minimal: confidence + attention only */}
              <motion.div
                variants={container}
                className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {(email.confidence * 100).toFixed(0)}%
                  </span>
                  <span>confidence</span>
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ATTENTION_LABELS[email.attention] ?? "—"}
                </span>
                {email.corrected && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      corrected
                    </span>
                  </>
                )}
              </motion.div>

              {/* Divider */}
              <div className="my-6 h-px w-full bg-border" />

              {/* Body — the email itself, at a generous readable size */}
              <motion.div variants={container}>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                  {email.body || email.snippet}
                </p>
              </motion.div>

              {/* Divider */}
              <div className="my-6 h-px w-full bg-border" />

              {/* Full distribution */}
              <motion.div variants={container}>
                <SectionLabel>Full distribution · 8 categories</SectionLabel>
                <p className="mb-4 mt-2 text-[12px] text-muted-foreground">
                  The complete probability breakdown — what Reflex scored this email on.
                </p>
                <FullDistribution email={email} />
              </motion.div>

              {/* Divider */}
              <div className="my-6 h-px w-full bg-border" />

              {/* Noul scores */}
              <motion.div variants={container}>
                <SectionLabel>Noul-style auxiliary scores</SectionLabel>
                <p className="mb-4 mt-2 text-[12px] text-muted-foreground">
                  Four yes/no judgments that feed the priority formula.
                </p>
                <motion.div
                  variants={container}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <NoulScore
                    label="action_needed"
                    value={email.actionNeeded}
                    description="Must the reader reply / approve / pay / decide something?"
                    icon={<Zap className="h-3.5 w-3.5" />}
                  />
                  <NoulScore
                    label="from_human"
                    value={email.fromHuman}
                    description="Is the sender a real human the reader likely knows?"
                    icon={
                      email.fromHuman > 0.5 ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )
                    }
                  />
                  <NoulScore
                    label="consequence"
                    value={email.consequence}
                    description="Does ignoring this for 24h have a real cost?"
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  />
                  <NoulScore
                    label="churn_signal"
                    value={email.churnSignal}
                    description="Does ignoring threaten to end a relationship?"
                    icon={<HeartCrack className="h-3.5 w-3.5" />}
                  />
                </motion.div>
              </motion.div>

              {email.category === "security_alert" && (
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-200/50 bg-red-50/40 p-3.5 text-[12px] text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Security alert. Verify the sender domain manually before clicking any link.</span>
                </div>
              )}

              {/* Divider */}
              <div className="my-6 h-px w-full bg-border" />

              {/* Quick-move */}
              <motion.div variants={container}>
                <div className="mb-1 flex items-baseline justify-between">
                  <SectionLabel>Move to bucket</SectionLabel>
                </div>
                <p className="mb-4 mt-2 text-[12px] text-muted-foreground">
                  Wrong bucket? Move it. Each correction trains the flywheel.
                </p>
                <motion.div
                  variants={container}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-5"
                >
                  {BUCKETS.map((b: Bucket) => {
                    const m = BUCKET_META[b];
                    const active = b === email.bucket;
                    return (
                      <motion.button
                        key={b}
                        variants={container}
                        whileTap={{ scale: 0.95 }}
                        transition={spring.snug}
                        onClick={() => correctBucket(email.id, b)}
                        disabled={active}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-[11px] font-medium transition-all hover:-translate-y-0.5",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-white/20 hover:bg-white/40 dark:bg-white/5 dark:hover:bg-white/10"
                        )}
                        title={m.label}
                      >
                        <span className={cn("h-2 w-2 rounded-full", m.dot)} />
                        {m.label}
                        {active && <Check className="h-3 w-3" />}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Bottom: contextual shortcuts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-5 flex items-center justify-center gap-2 pb-2"
          >
            <Button
              variant="ghost"
              size="sm"
              className="glass-soft gap-1.5 rounded-full"
              onClick={() => {
                setSelectedEmailId(null);
                setView("stats");
              }}
            >
              Tune threshold
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="glass-soft gap-1.5 rounded-full"
              onClick={() => {
                setSelectedEmailId(null);
                setView("settings");
              }}
            >
              Mailbox settings
            </Button>
          </motion.div>
      </div>
  );
}
