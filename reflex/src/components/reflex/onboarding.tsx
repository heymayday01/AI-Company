"use client";

import {
  Zap,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Gauge,
  Layers,
  RefreshCw,
} from "lucide-react";
import { ConnectFlowDialog } from "./connect-flow-dialog";
import { Button } from "@/components/ui/button";
import { useReflex } from "@/store/reflex";

const PILLARS = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Decide-first",
    body: "10 decisions per 1 generation. Fast, free, local.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Radical transparency",
    body: "Every email shows its full probability distribution.",
  },
  {
    icon: <Gauge className="h-4 w-4" />,
    title: "Calibrated",
    body: "ECE drops from 0.466 → 0.081. Trust through math.",
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    title: "Improves",
    body: "Each correction trains your personal model — free.",
  },
];

export function Onboarding() {
  const reseed = useReflex((s) => s.reseed);
  const setView = useReflex((s) => s.setView);

  async function handleSample() {
    await reseed();
    setView("board");
  }

  return (
    <div className="reflex-rise mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center">
      {/* Hero badge */}
      <div className="glass-soft flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        $0 / month · local-first · Apache-2.0
      </div>

      {/* Title */}
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
        Your inbox, <span className="text-primary">pre-read</span> in 33ms.
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Reflex reads every email with a decision model, sorts it into attention
        buckets, escalates only the uncertain 10% to a small LLM, and gets
        better from every correction you make.
      </p>

      {/* CTAs */}
      <div className="mt-7 flex flex-col items-center gap-2 sm:flex-row">
        <ConnectFlowDialog />
        <Button
          variant="outline"
          onClick={handleSample}
          className="gap-2"
        >
          <Layers className="h-4 w-4" />
          Try with sample emails
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Pillars */}
      <div className="mt-12 grid w-full grid-cols-2 gap-3 text-left lg:grid-cols-4">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="glass-soft rounded-2xl p-4 transition-all hover:-translate-y-0.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {p.icon}
            </div>
            <h3 className="mt-2.5 text-[13px] font-semibold">{p.title}</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {p.body}
            </p>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div className="mt-10 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Mail className="h-3 w-3" />
        Your IMAP password stays in server memory only — never written to disk.
      </div>
    </div>
  );
}
