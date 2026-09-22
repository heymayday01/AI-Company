"use client";

import { useMemo } from "react";
import { ShieldQuestion, ArrowRight, Sparkles } from "lucide-react";
import { EmailCard } from "../email-card";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/reflex/schema";
import { useReflex } from "@/store/reflex";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReviewView() {
  const emails = useReflex((s) => s.emails);
  const loading = useReflex((s) => s.loading);
  const reviewThreshold = useReflex((s) => s.reviewThreshold);
  const setView = useReflex((s) => s.setView);

  const reviewEmails = useMemo(
    () =>
      emails
        .filter((e) => e.bucket === "REVIEW")
        .sort((a, b) => a.confidence - b.confidence),
    [emails]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading review queue…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Explanation banner */}
      <div className="glass flex items-start gap-3 rounded-2xl p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
          <ShieldQuestion className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Why these are here</h3>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            Reflex escalates any email whose top-category confidence is below{" "}
            <span className="font-mono font-semibold text-violet-600 dark:text-violet-400">
              {reviewThreshold.toFixed(2)}
            </span>
            . Look at the full distribution yourself, then either accept a
            bucket or move it. Tune the threshold in Calibration.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setView("stats")}
        >
          Tune
        </Button>
      </div>

      {/* Review cards */}
      {reviewEmails.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">Inbox is clean</h3>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            No uncertain decisions right now. Every email landed in a confident
            bucket — or you already reviewed them all.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviewEmails.map((e) => (
            <EmailCard key={e.id} email={e} />
          ))}
        </div>
      )}

      {/* Bucket legend */}
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Move to bucket
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUCKETS.map((b: Bucket) => (
            <div
              key={b}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/20 px-2 py-1.5 dark:bg-white/5"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", BUCKET_META[b].dot)} />
              <div className="min-w-0">
                <div className="text-[11px] font-medium">{BUCKET_META[b].label}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {BUCKET_META[b].description}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          Use the ⋯ menu on any card to move it. Each correction trains the
          flywheel.
        </p>
      </div>
    </div>
  );
}
