"use client";

import { useState, type MouseEvent } from "react";
import { motion } from "framer-motion";
import {
  MoreHorizontal,
  ShieldAlert,
  Sparkles,
  User,
  Bot,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/reflex/motion";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CATEGORY_LABELS,
  CATEGORY_UI,
  BUCKETS,
  BUCKET_META,
  type Bucket,
} from "@/lib/reflex/schema";
import type { EmailDTO } from "@/lib/reflex/types";
import { useReflex } from "@/store/reflex";

const ATTENTION_LABELS = ["ignore", "when free", "today", "right now"];
const ATTENTION_COLORS = [
  "text-slate-400",
  "text-emerald-500",
  "text-amber-500",
  "text-rose-500",
];

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.85
      ? "text-emerald-600 dark:text-emerald-400"
      : confidence >= 0.65
      ? "text-amber-600 dark:text-amber-400"
      : "text-violet-600 dark:text-violet-400";
  return (
    <span className={cn("font-mono text-[11px] font-semibold tabular-nums", color)}>
      {pct}%
    </span>
  );
}

function ProbabilityBars({ email }: { email: EmailDTO }) {
  const top = email.topCandidates.slice(0, 3);
  return (
    <div className="space-y-1">
      {top.map((c, i) => {
        const ui = CATEGORY_UI[c.category as keyof typeof CATEGORY_UI];
        const label = CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category;
        const pct = Math.round(c.prob * 100);
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-20 shrink-0 truncate text-[10px] text-muted-foreground">{label}</div>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn("h-full rounded-full", ui?.bar ?? "bg-slate-400")}
              />
            </div>
            <div className="w-7 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
              {pct}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EmailCard({ email }: { email: EmailDTO }) {
  const correctBucket = useReflex((s) => s.correctBucket);
  const deleteEmail = useReflex((s) => s.deleteEmail);
  const setSelectedEmailId = useReflex((s) => s.setSelectedEmailId);
  const selectedEmailId = useReflex((s) => s.selectedEmailId);
  const [open, setOpen] = useState(false);

  const senderDisplay = email.senderName ?? email.sender;
  const initials = senderDisplay
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const isSelected = selectedEmailId === email.id;

  function handleMove(e: MouseEvent, x: number) {
    e.currentTarget.style.setProperty("--rx", `${x}px`);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={spring.snug}
        whileTap={{ scale: 0.97 }}
        onMouseMove={(e) => handleMove(e, e.nativeEvent.offsetX)}
      >
        <Card
          onClick={() => setSelectedEmailId(email.id)}
          className={cn(
            "reflex-spotlight glass-soft group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isSelected
              ? "ring-2 ring-primary/50 shadow-lg"
              : "hover:-translate-y-1 hover:shadow-xl hover:border-white/20"
          )}
        >
          {/* Left accent strip = bucket color */}
          <div className={cn("absolute inset-y-0 left-0 w-0.5", BUCKET_META[email.bucket].dot)} />

          <div className="p-3.5 pl-4">
            {/* Header row: sender + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {initials || "?"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold leading-tight">{senderDisplay}</div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {email.fromHuman > 0.6 ? (
                      <User className="h-2.5 w-2.5" />
                    ) : (
                      <Bot className="h-2.5 w-2.5" />
                    )}
                    <span className="truncate">{email.fromHuman > 0.6 ? "human" : "auto"}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {email.corrected && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>You corrected this bucket</TooltipContent>
                  </Tooltip>
                )}
                {email.category === "security_alert" && (
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                )}
                <DropdownMenu open={open} onOpenChange={setOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-white/40 group-hover:opacity-100 data-[state=open]:opacity-100 dark:hover:bg-white/10"
                      aria-label="Email actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="glass w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                      Move to bucket
                    </DropdownMenuLabel>
                    {BUCKETS.map((b: Bucket) => {
                      const meta = BUCKET_META[b];
                      return (
                        <DropdownMenuItem
                          key={b}
                          disabled={b === email.bucket}
                          onSelect={() => correctBucket(email.id, b)}
                          className="gap-2 text-xs"
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                          {b === email.bucket && (
                            <CheckCircle2 className="ml-auto h-3 w-3 text-muted-foreground" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setSelectedEmailId(email.id)}
                      className="gap-2 text-xs"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Inspect
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => deleteEmail(email.id)}
                      className="gap-2 text-xs text-red-600 focus:text-red-700 dark:text-red-400"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Subject + snippet */}
            <div className="mt-2 line-clamp-1 text-[13px] font-medium leading-snug">
              {email.subject}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {email.snippet}
            </div>

            {/* Probability bars */}
            <div className="mt-2.5 rounded-lg border border-white/10 bg-white/20 p-2 dark:bg-white/5">
              <ProbabilityBars email={email} />
            </div>

            {/* Footer: attention + confidence */}
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium",
                        ATTENTION_COLORS[email.attention]
                      )}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {ATTENTION_LABELS[email.attention]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Attention level</TooltipContent>
                </Tooltip>
                <span className="rounded bg-white/30 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground dark:bg-white/10">
                  {email.source === "llm" ? "LLM" : email.source === "fallback" ? "fallback" : "local"}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-muted-foreground" />
                    <ConfidenceMeter confidence={email.confidence} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Decision confidence</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
