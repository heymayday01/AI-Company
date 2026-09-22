"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListRow } from "../list-row";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/reflex/schema";
import type { EmailDTO } from "@/lib/reflex/types";
import { useReflex } from "@/store/reflex";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/reflex/motion";

import { Search as SearchIcon, X as XIcon, Inbox as InboxIcon, SlidersHorizontal } from "lucide-react";

type FilterId = "all" | Bucket;

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "NOW", label: "Now" },
  { id: "TODAY", label: "Today" },
  { id: "WEEK", label: "Week" },
  { id: "ARCHIVE", label: "Archive" },
  { id: "REVIEW", label: "Review" },
];

function SectionHeader({ bucket, count }: { bucket: Bucket; count: number }) {
  const meta = BUCKET_META[bucket];
  return (
    <div className="sticky top-0 z-10 mb-1 mt-1 flex items-center justify-between gap-2 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", meta.accent)}>
          {meta.label}
        </span>
      </div>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">{count}</span>
    </div>
  );
}

function EmptyState({ hasSearch, hasFilter }: { hasSearch: boolean; hasFilter: boolean }) {
  if (hasSearch || hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchIcon className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold">No emails match</h3>
        <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
          Try a different search term or clear the bucket filter.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <InboxIcon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">Inbox is clean</h3>
      <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
        No emails in the pipeline. Connect your mailbox or triage a new email to get started.
      </p>
    </div>
  );
}

export function ListView() {
  const emails = useReflex((s) => s.emails);
  const loading = useReflex((s) => s.loading);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails.filter((e) => {
      if (filter !== "all" && e.bucket !== filter) return false;
      if (!q) return true;
      return (
        e.sender.toLowerCase().includes(q) ||
        (e.senderName ?? "").toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q)
      );
    });
  }, [emails, filter, query]);

  const grouped = useMemo(() => {
    const m: Record<Bucket, EmailDTO[]> = {
      NOW: [],
      TODAY: [],
      WEEK: [],
      ARCHIVE: [],
      REVIEW: [],
    };
    for (const e of filtered) m[e.bucket].push(e);
    for (const b of BUCKETS) m[b].sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
    return m;
  }, [filtered]);

  const visibleBuckets = BUCKETS.filter((b) => grouped[b].length > 0);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: emails.length };
    for (const b of BUCKETS) c[b] = emails.filter((e) => e.bucket === b).length;
    return c;
  }, [emails]);

  const hasSearch = query.trim().length > 0;
  const hasFilter = filter !== "all";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <InboxIcon className="mr-2 h-4 w-4 animate-pulse" />
        <span className="text-sm">Reading your inbox…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Search bar — Apple Mail signature: subtle gray field, no border */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="sticky top-0 z-20 mb-3 flex items-center gap-2 rounded-xl bg-foreground/[0.05] px-3.5 py-2.5"
      >
        <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {hasSearch && (
          <button
            onClick={() => setQuery("")}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground transition-colors hover:bg-foreground/15"
            aria-label="Clear search"
          >
            <XIcon className="h-3 w-3" />
          </button>
        )}
      </motion.div>

      {/* Filter chips — minimal: label only, active state in primary */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.smooth, delay: 0.05 }}
        className="mb-5 flex flex-wrap items-center gap-1.5"
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = counts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
              )}
            >
              {f.id !== "all" && active && (
                <span className={cn("h-1.5 w-1.5 rounded-full bg-primary-foreground/70")} />
              )}
              {f.label}
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums",
                  active ? "text-primary-foreground/60" : "text-muted-foreground/50"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={hasSearch} hasFilter={hasFilter} />
      ) : (
        <div className="space-y-5">
          {visibleBuckets.map((bucket) => (
            <section key={bucket}>
              <SectionHeader bucket={bucket} count={grouped[bucket].length} />
              <div className="space-y-0.5">
                {grouped[bucket].map((email, i) => (
                  <ListRow key={email.id} email={email} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Footer hint */}
      {filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted-foreground"
        >
          <SlidersHorizontal className="h-2.5 w-2.5" />
          <span>
            {filtered.length} of {emails.length} emails · click a row to inspect
          </span>
        </motion.div>
      )}
    </div>
  );
}
