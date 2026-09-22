"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { EmailCard } from "../email-card";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/reflex/schema";
import type { EmailDTO } from "@/lib/reflex/types";
import { useReflex } from "@/store/reflex";
import { cn } from "@/lib/utils";
import { Sparkles, Inbox, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const VISIBLE_CAP = 6; // max cards shown per column before "show all"

function BucketHeader({
  bucket,
  count,
  focused,
  onToggleFocus,
}: {
  bucket: Bucket;
  count: number;
  focused: boolean;
  onToggleFocus: () => void;
}) {
  const meta = BUCKET_META[bucket];
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        <h2 className={cn("text-xs font-bold uppercase tracking-wider", meta.accent)}>
          {meta.label}
        </h2>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
            count > 0 ? "bg-white/30 text-foreground dark:bg-white/10" : "bg-transparent text-muted-foreground/50"
          )}
        >
          {count}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 transition-opacity hover:bg-white/30 group-hover:opacity-100 dark:hover:bg-white/10"
        onClick={onToggleFocus}
        title={focused ? "Show all buckets" : "Focus this bucket"}
      >
        {focused ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function EmptyColumn({ bucket }: { bucket: Bucket }) {
  const meta = BUCKET_META[bucket];
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 p-4 text-center">
      <p className="text-[11px] text-muted-foreground/70">
        {bucket === "REVIEW"
          ? "Nothing uncertain — every decision was confident."
          : `Nothing in ${meta.label}.`}
      </p>
    </div>
  );
}

function Column({
  bucket,
  emails,
  focused,
  onToggleFocus,
}: {
  bucket: Bucket;
  emails: EmailDTO[];
  focused: boolean;
  onToggleFocus: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? emails : emails.slice(0, VISIBLE_CAP);
  const hidden = emails.length - visible.length;

  return (
    <section className="group flex min-h-0 flex-col">
      <BucketHeader
        bucket={bucket}
        count={emails.length}
        focused={focused}
        onToggleFocus={onToggleFocus}
      />
      <div className="reflex-fade-y flex-1 space-y-2 overflow-y-auto pr-0.5">
        <AnimatePresence mode="popLayout">
          {emails.length === 0 ? (
            <EmptyColumn key="empty" bucket={bucket} />
          ) : (
            visible.map((e) => <EmailCard key={e.id} email={e} />)
          )}
        </AnimatePresence>
        {hidden > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-center text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/30 dark:hover:bg-white/5"
          >
            + {hidden} more in {BUCKET_META[bucket].label}
          </button>
        )}
        {showAll && emails.length > VISIBLE_CAP && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full rounded-lg py-1.5 text-center text-[10px] font-medium text-muted-foreground hover:underline"
          >
            Collapse
          </button>
        )}
      </div>
    </section>
  );
}

export function BoardView() {
  const emails = useReflex((s) => s.emails);
  const loading = useReflex((s) => s.loading);
  const [focused, setFocused] = useState<Bucket | null>(null);

  const byBucket = useMemo(() => {
    const m: Record<Bucket, EmailDTO[]> = {
      NOW: [],
      TODAY: [],
      WEEK: [],
      ARCHIVE: [],
      REVIEW: [],
    };
    for (const e of emails) m[e.bucket].push(e);
    for (const b of BUCKETS) m[b].sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
    return m;
  }, [emails]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Inbox className="mr-2 h-4 w-4 animate-pulse" />
        <span className="text-sm">Reading your inbox…</span>
      </div>
    );
  }

  const visibleBuckets = focused ? [focused] : BUCKETS;

  return (
    <div className="flex h-full flex-col">
      {/* Focus-mode banner */}
      {focused && (
        <div className="mb-3 flex items-center justify-between rounded-xl glass-soft px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", BUCKET_META[focused].dot)} />
            <span className="text-xs font-medium">
              Focused on {BUCKET_META[focused].label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              · {byBucket[focused].length} email(s)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[11px]"
            onClick={() => setFocused(null)}
          >
            Show all buckets
          </Button>
        </div>
      )}

      {/* Board grid */}
      <div
        className={cn(
          "min-h-0 flex-1 grid gap-3",
          focused
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        )}
      >
        {visibleBuckets.map((b) => (
          <Column
            key={b}
            bucket={b}
            emails={byBucket[b]}
            focused={focused === b}
            onToggleFocus={() => setFocused((prev) => (prev === b ? null : b))}
          />
        ))}
      </div>

      {/* Digest hint */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/10 px-3 py-2 text-[11px] text-muted-foreground dark:bg-white/5">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <span>
          The <strong>daily digest</strong> (one short paragraph over the NOW
          bucket) is the only generative path. Generate it in Calibration.
        </span>
      </div>
    </div>
  );
}
