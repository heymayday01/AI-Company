"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Inbox as InboxIcon,
  ShieldQuestion,
  BarChart3,
  Settings as SettingsIcon,
  RefreshCw,
} from "lucide-react";
import { useReflex, type ViewId } from "@/store/reflex";
import { Button } from "@/components/ui/button";
import { AddEmailDialog } from "./add-email-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/reflex/motion";

const NAV: Array<{ id: ViewId; label: string; icon: React.ReactNode }> = [
  { id: "board", label: "Inbox", icon: <InboxIcon className="h-3.5 w-3.5" /> },
  { id: "review", label: "Review", icon: <ShieldQuestion className="h-3.5 w-3.5" /> },
  { id: "stats", label: "Calibration", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "settings", label: "Settings", icon: <SettingsIcon className="h-3.5 w-3.5" /> },
];

function SegmentedControl() {
  const view = useReflex((s) => s.view);
  const setView = useReflex((s) => s.setView);
  const emails = useReflex((s) => s.emails);
  const reviewCount = emails.filter((e) => e.bucket === "REVIEW").length;
  const activeIndex = Math.max(0, NAV.findIndex((n) => n.id === view));

  return (
    <div className="glass-soft relative flex items-center gap-0 rounded-full p-0.5">
      {/* Spring sliding indicator */}
      <motion.div
        layout
        transition={spring.snug}
        className="absolute inset-y-0.5 rounded-full bg-primary shadow-sm"
        style={{
          width: `calc((100% - 4px) / ${NAV.length})`,
          left: `calc(2px + (100% - 4px) * ${activeIndex} / ${NAV.length})`,
        }}
      />
      {NAV.map((item) => {
        const active = view === item.id;
        const badge = item.id === "review" && reviewCount > 0 ? reviewCount : null;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="hidden lg:inline">{item.label}</span>
            {badge !== null && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1 font-mono text-[9px] font-bold tabular-nums",
                  active ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MobileNav() {
  const view = useReflex((s) => s.view);
  const setView = useReflex((s) => s.setView);
  const [open, setOpen] = useState(false);
  const emails = useReflex((s) => s.emails);
  const reviewCount = emails.filter((e) => e.bucket === "REVIEW").length;

  return (
    <div className="relative md:hidden">
      <Button
        variant="ghost"
        size="sm"
        className="glass-soft gap-1.5 rounded-full px-3"
        onClick={() => setOpen((o) => !o)}
      >
        {NAV.find((n) => n.id === view)?.icon}
        <span className="text-xs">{NAV.find((n) => n.id === view)?.label}</span>
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="glass-strong absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl p-1">
            {NAV.map((item) => {
              const active = view === item.id;
              const badge = item.id === "review" && reviewCount > 0 ? reviewCount : null;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-white/30 dark:hover:bg-white/10"
                  )}
                >
                  {item.icon}
                  {item.label}
                  {badge !== null && (
                    <span className="ml-auto rounded-full bg-muted px-1 font-mono text-[9px] tabular-nums text-muted-foreground">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function FloatingTopbar() {
  const connection = useReflex((s) => s.connection);
  const syncing = useReflex((s) => s.syncing);
  const syncMailbox = useReflex((s) => s.syncMailbox);

  return (
    <header className="pointer-events-none sticky top-0 z-30 px-4 pt-3 lg:px-6">
      <div className="glass-strong pointer-events-auto mx-auto flex h-12 max-w-6xl items-center gap-3 rounded-2xl px-3 shadow-lg">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Zap className="h-3.5 w-3.5" fill="currentColor" />
          </div>
          <span className="hidden text-sm font-bold tracking-tight sm:inline">Reflex</span>
        </div>

        {/* Center: segmented control (desktop) */}
        <div className="mx-auto hidden md:block">
          <SegmentedControl />
        </div>

        {/* Mobile nav */}
        <div className="mx-auto md:hidden">
          <MobileNav />
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {connection && (
            <button
              onClick={() => void syncMailbox()}
              disabled={syncing}
              className={cn(
                "hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/30 px-2.5 py-1 text-[11px] font-medium transition-all hover:bg-white/50 sm:flex dark:bg-white/5 dark:hover:bg-white/10",
                syncing && "opacity-60"
              )}
              title={`Connected to ${connection.user}`}
            >
              <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync"}
            </button>
          )}
          <AddEmailDialog />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
