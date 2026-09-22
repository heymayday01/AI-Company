"use client";

import { motion } from "framer-motion";
import { Inbox, ShieldAlert, User, Bot, Zap, AlertTriangle, HeartCrack } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_UI,
  BUCKET_META,
  ATTENTION_LABELS,
} from "@/lib/reflex/schema";
import { useReflex } from "@/store/reflex";
import type { EmailDTO } from "@/lib/reflex/types";

function FullDistribution({ email }: { email: EmailDTO }) {
  const sorted = CATEGORIES.map((c) => ({
    category: c,
    prob: email.distribution[c] ?? 0,
  })).sort((a, b) => b.prob - a.prob);

  return (
    <div className="space-y-1.5">
      {sorted.map(({ category, prob }) => {
        const ui = CATEGORY_UI[category];
        const label = CATEGORY_LABELS[category];
        const pct = Math.round(prob * 100);
        const isTop = category === email.category;
        return (
          <div key={category}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className={isTop ? "font-semibold" : "text-muted-foreground"}>
                {isTop && <span className="mr-1">▸</span>}
                {label}
              </span>
              <span className="font-mono">{(prob * 100).toFixed(1)}%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
                className={`h-full rounded-full ${ui.bar}`}
              />
            </div>
          </div>
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
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          {icon}
          {label}
        </div>
        <span
          className={`font-mono text-xs font-bold ${
            active
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          }`}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            active ? "bg-emerald-500" : "bg-slate-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function EmailDetailSheet() {
  const selectedEmailId = useReflex((s) => s.selectedEmailId);
  const emails = useReflex((s) => s.emails);
  const setSelectedEmailId = useReflex((s) => s.setSelectedEmailId);

  const email: EmailDTO | null = selectedEmailId
    ? emails.find((e) => e.id === selectedEmailId) ?? null
    : null;

  const meta = email ? BUCKET_META[email.bucket] : null;

  return (
    <Sheet
      open={!!email}
      onOpenChange={(o) => !o && setSelectedEmailId(null)}
    >
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {email && meta ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">Why this bucket?</SheetTitle>
              <SheetDescription>
                The full decision distribution — what Reflex actually scored
                this email on, transparently.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Header: sender + bucket */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Final bucket
                  </span>
                  <Badge variant="outline" className="gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {email.subject}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  From {email.senderName ?? ""}{" "}
                  <span className="font-mono">&lt;{email.sender}&gt;</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">Top category:</span>
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[email.category as keyof typeof CATEGORY_LABELS]}
                  </Badge>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono font-bold">
                    {(email.confidence * 100).toFixed(0)}% conf
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">Attention:</span>
                  <span className="font-medium">
                    {ATTENTION_LABELS[email.attention] ?? "—"}
                  </span>
                </div>
              </div>

              {/* Snippet / body */}
              <div className="rounded-lg border p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Inbox className="h-3 w-3" />
                  Body
                </div>
                <p className="whitespace-pre-line text-[12px] leading-relaxed text-foreground/90">
                  {email.body || email.snippet}
                </p>
              </div>

              {/* Full distribution */}
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Full category distribution (8 options)
                </div>
                <FullDistribution email={email} />
              </div>

              <Separator />

              {/* Noul scores */}
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Noul-style auxiliary scores
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NoulScore
                    label="action_needed"
                    value={email.actionNeeded}
                    description="Must the reader reply / approve / pay / decide?"
                    icon={<Zap className="h-3 w-3" />}
                  />
                  <NoulScore
                    label="from_human"
                    value={email.fromHuman}
                    description="Is the sender a real human the reader likely knows?"
                    icon={
                      email.fromHuman > 0.5 ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )
                    }
                  />
                  <NoulScore
                    label="consequence"
                    value={email.consequence}
                    description="Does ignoring for 24h have a real cost?"
                    icon={<AlertTriangle className="h-3 w-3" />}
                  />
                  <NoulScore
                    label="churn_signal"
                    value={email.churnSignal}
                    description="Does ignoring threaten to end a relationship?"
                    icon={<HeartCrack className="h-3 w-3" />}
                  />
                </div>
              </div>

              {email.category === "security_alert" && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Flagged as a security alert. Verify the sender domain
                    manually before clicking any link.
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>No email selected</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
