"use client";

import { motion } from "framer-motion";
import {
  MoreHorizontal,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BUCKETS,
  BUCKET_META,
  type Bucket,
} from "@/lib/reflex/schema";
import type { EmailDTO } from "@/lib/reflex/types";
import { useReflex } from "@/store/reflex";
import { spring } from "@/lib/reflex/motion";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ListRow({ email, index }: { email: EmailDTO; index: number }) {
  const setSelectedEmailId = useReflex((s) => s.setSelectedEmailId);
  const selectedEmailId = useReflex((s) => s.selectedEmailId);
  const correctBucket = useReflex((s) => s.correctBucket);
  const deleteEmail = useReflex((s) => s.deleteEmail);

  const isSelected = selectedEmailId === email.id;
  const meta = BUCKET_META[email.bucket];
  const initials = (email.senderName ?? email.sender)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.snug, delay: Math.min(index * 0.02, 0.25) }}
      whileTap={{ scale: 0.985 }}
      onClick={() => setSelectedEmailId(email.id)}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-200",
        isSelected
          ? "bg-primary/10"
          : "hover:bg-foreground/[0.04]"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          isSelected
            ? "bg-primary/15 text-primary"
            : "bg-foreground/[0.06] text-muted-foreground"
        )}
      >
        {initials || "?"}
      </div>

      {/* Main content — Apple Mail anatomy: sender+time row, then subject, then snippet */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate text-[13px]",
                isSelected ? "font-semibold text-primary" : "font-medium text-foreground"
              )}
            >
              {email.senderName ?? email.sender}
            </span>
            {email.category === "security_alert" && (
              <ShieldAlert className="h-3 w-3 shrink-0 text-red-500" />
            )}
            {email.corrected && (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
            )}
          </div>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {timeAgo(email.createdAt)}
          </span>
        </div>

        {/* Subject */}
        <div className="mt-0.5 truncate text-[13px] text-foreground/90">
          {email.subject}
        </div>

        {/* Snippet */}
        <div className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
          {email.snippet}
        </div>
      </div>

      {/* Right rail — minimal: bucket dot only (Apple's unread dot) */}
      <div className="flex shrink-0 items-center gap-2 self-start pt-1.5">
        {/* Bucket color dot — Apple's "unread" indicator equivalent */}
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} title={meta.label} />

        {/* Hover-revealed actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/[0.06] group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Email actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="glass w-44"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              Move to bucket
            </DropdownMenuLabel>
            {BUCKETS.map((b: Bucket) => {
              const m = BUCKET_META[b];
              return (
                <DropdownMenuItem
                  key={b}
                  disabled={b === email.bucket}
                  onSelect={() => correctBucket(email.id, b)}
                  className="gap-2 text-xs"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                  {m.label}
                  {b === email.bucket && (
                    <CheckCircle2 className="ml-auto h-3 w-3 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => deleteEmail(email.id)}
              className="gap-2 text-xs text-red-600 focus:text-red-700 dark:text-red-400"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
