"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Gauge,
  Target,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useReflex } from "@/store/reflex";
import { BUCKETS, BUCKET_META } from "@/lib/reflex/schema";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function MetricCard({
  icon,
  label,
  value,
  hint,
  accent,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent: string;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "bad"
      ? "text-rose-600 dark:text-rose-400"
      : accent;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-2 font-mono text-2xl font-bold tabular-nums", toneClass)}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

function ReliabilityDiagram({
  predictions,
}: {
  predictions: { confidence: number; correct: boolean }[];
}) {
  const bins = 10;
  const counts = useMemo(() => {
    const arr = Array.from({ length: bins }, (_, i) => ({
      lo: i / bins,
      hi: (i + 1) / bins,
      n: 0,
      acc: 0,
      conf: 0,
    }));
    for (const p of predictions) {
      let idx = Math.floor(p.confidence * bins);
      if (idx >= bins) idx = bins - 1;
      arr[idx].n++;
      arr[idx].acc += p.correct ? 1 : 0;
      arr[idx].conf += p.confidence;
    }
    return arr.map((b) => ({
      ...b,
      avgAcc: b.n ? b.acc / b.n : 0,
      avgConf: b.n ? b.conf / b.n : 0,
    }));
  }, [predictions]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-24 items-end gap-1">
        {counts.map((b, i) => {
          const accH = Math.round(b.avgAcc * 100);
          const confH = Math.round(b.avgConf * 100);
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className="group relative flex h-full flex-1 cursor-default flex-col justify-end overflow-hidden rounded-md bg-muted/50">
                  <div
                    className="absolute bottom-0 w-full bg-muted-foreground/25"
                    style={{ height: `${confH}%` }}
                  />
                  <div
                    className={cn(
                      "relative w-full",
                      b.n === 0
                        ? "bg-transparent"
                        : b.avgAcc >= b.avgConf - 0.1
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    )}
                    style={{ height: `${b.n === 0 ? 0 : Math.max(2, accH)}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {b.n === 0
                  ? `Bin ${i + 1}: empty`
                  : `Bin ${i + 1}: ${b.n} emails · acc ${(b.avgAcc * 100).toFixed(0)}% · conf ${(b.avgConf * 100).toFixed(0)}%`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export function StatsView() {
  const stats = useReflex((s) => s.stats);
  const reviewThreshold = useReflex((s) => s.reviewThreshold);
  const updateThreshold = useReflex((s) => s.updateThreshold);
  const emails = useReflex((s) => s.emails);

  // Digest
  const digest = useReflex((s) => s.digest);
  const digestLoading = useReflex((s) => s.digestLoading);
  const digestEmpty = useReflex((s) => s.digestEmpty);
  const digestDegraded = useReflex((s) => s.digestDegraded);
  const generateDigest = useReflex((s) => s.generateDigest);

  const predictions = useMemo(
    () =>
      emails.map((e) => ({
        confidence: e.confidence,
        correct: !e.corrected,
      })),
    [emails]
  );

  async function handleThreshold(value: number[]) {
    const v = value[0];
    if (typeof v !== "number") return;
    await updateThreshold(v);
    toast.success(`Review threshold → ${v.toFixed(2)}`, {
      description: "Every email re-bucketed against the new gate.",
    });
  }

  async function handleDigest() {
    await generateDigest();
    if (digestEmpty) {
      toast.message("NOW bucket is empty", {
        description: "Nothing to summarize — triage an email first.",
      });
    } else if (digestDegraded) {
      toast.warning("Degraded digest", {
        description: "LLM unreachable; using a deterministic summary.",
      });
    } else {
      toast.success("Digest generated");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Metric bento */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-3 w-3" />}
          label="Triaged"
          value={stats ? String(stats.totalEmails) : "—"}
          hint="Emails in pipeline"
          accent="text-foreground"
        />
        <MetricCard
          icon={<Target className="h-3 w-3" />}
          label="Accuracy"
          value={stats ? `${(stats.accuracy * 100).toFixed(0)}%` : "—"}
          hint="1 − corrections / total"
          accent=""
          tone={
            stats && stats.accuracy >= 0.85
              ? "good"
              : stats && stats.accuracy >= 0.7
              ? "warn"
              : "bad"
          }
        />
        <MetricCard
          icon={<Gauge className="h-3 w-3" />}
          label="ECE"
          value={stats ? stats.ece.toFixed(3) : "—"}
          hint="Calibration error (lower = better)"
          accent=""
          tone={
            stats && stats.ece <= 0.15
              ? "good"
              : stats && stats.ece <= 0.3
              ? "warn"
              : "bad"
          }
        />
        <MetricCard
          icon={<Layers className="h-3 w-3" />}
          label="Review rate"
          value={stats ? `${(stats.reviewRate * 100).toFixed(0)}%` : "—"}
          hint="% escalated to you"
          accent=""
          tone={
            stats && stats.reviewRate <= 0.1
              ? "good"
              : stats && stats.reviewRate <= 0.2
              ? "warn"
              : "bad"
          }
        />
      </div>

      {/* Bucket distribution + reliability */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Bucket distribution */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold">Bucket distribution</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Where your emails land right now.
          </p>
          {stats && stats.bucketCounts ? (
            <div className="space-y-2">
              {BUCKETS.map((b) => {
                const count = stats.bucketCounts[b] ?? 0;
                const total = stats.totalEmails || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={b} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[11px] font-medium">
                      {BUCKET_META[b].label}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                        className={cn("h-full rounded-full", BUCKET_META[b].dot)}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </div>

        {/* Reliability diagram */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold">Reliability</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">
            10-bin: bar = accuracy · faint = confidence. Closer = more
            calibrated.
          </p>
          <ReliabilityDiagram predictions={predictions} />
        </div>
      </div>

      {/* Threshold */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Review-confidence threshold</h3>
            <p className="text-[11px] text-muted-foreground">
              Lower = more aggressive · Higher = more cautious.
            </p>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">
            {reviewThreshold.toFixed(2)}
          </span>
        </div>
        <Slider
          value={[reviewThreshold]}
          onValueChange={(v) => updateThreshold(v[0])}
          onValueCommit={handleThreshold}
          min={0.3}
          max={0.95}
          step={0.01}
          className="mt-4"
        />
      </div>

      {/* Daily digest */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Daily attention digest</h3>
              <p className="text-[11px] text-muted-foreground">
                The only generative path. One paragraph over the NOW bucket.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDigest}
            disabled={digestLoading}
            className="gap-1.5"
          >
            {digestLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {digestLoading ? "Generating…" : "Generate"}
          </Button>
        </div>
        <div className="mt-3 min-h-[60px]">
          {digestLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-9/12" />
            </div>
          ) : digest ? (
            <div>
              {digestDegraded && (
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Degraded (deterministic fallback — LLM unreachable).
                </div>
              )}
              <p className="whitespace-pre-line text-[13px] leading-relaxed">
                {digest}
              </p>
            </div>
          ) : (
            <div className="flex h-[60px] items-center justify-center text-[11px] text-muted-foreground">
              Click generate to summarize what needs you today.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
