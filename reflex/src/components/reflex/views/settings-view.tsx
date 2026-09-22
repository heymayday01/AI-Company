"use client";

import {
  Mail,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useReflex } from "@/store/reflex";
import { ConnectFlowDialog } from "../connect-flow-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function timeAgo(ts: number | null): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleString();
}

export function SettingsView() {
  const connection = useReflex((s) => s.connection);
  const syncing = useReflex((s) => s.syncing);
  const syncMailbox = useReflex((s) => s.syncMailbox);
  const disconnectMailbox = useReflex((s) => s.disconnectMailbox);
  const reseed = useReflex((s) => s.reseed);
  const clearSamples = useReflex((s) => s.clearSamples);
  const emails = useReflex((s) => s.emails);
  const reviewThreshold = useReflex((s) => s.reviewThreshold);
  const updateThreshold = useReflex((s) => s.updateThreshold);

  const sampleCount = emails.filter((e) => e.isSample).length;
  const realCount = emails.filter((e) => !e.isSample).length;

  async function handleSync() {
    const res = await syncMailbox();
    if (res.ok) {
      toast.success("Sync complete", {
        description: `Triaged ${res.triaged} new · skipped ${res.skipped}.`,
      });
    } else {
      toast.error("Sync failed", { description: res.error });
    }
  }

  async function handleDisconnect() {
    await disconnectMailbox();
    toast.message("Disconnected", {
      description: "Password was never on disk. Triaged emails remain.",
    });
  }

  async function handleReseed() {
    await reseed();
    toast.success("Sample inbox reseeded");
  }

  async function handleClearSamples() {
    await clearSamples();
    toast.success("Sample emails cleared");
  }

  async function handleThreshold(value: number[]) {
    const v = value[0];
    if (typeof v !== "number") return;
    await updateThreshold(v);
    toast.success(`Threshold → ${v.toFixed(2)}`, {
      description: "Every email re-bucketed.",
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Connection card */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                connection
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {connection ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {connection ? "Mailbox connected" : "Connect your mailbox"}
              </h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {connection
                  ? `${connection.user} · ${connection.host}`
                  : "Pull your real emails via IMAP. Password stays in server memory only — never written to disk."}
              </p>
            </div>
          </div>
          {connection && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Live
            </span>
          )}
        </div>

        {connection ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-lg border border-white/10 bg-white/20 p-2.5 dark:bg-white/5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Folder
                </div>
                <div className="mt-0.5 font-mono">{connection.folder}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/20 p-2.5 dark:bg-white/5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last sync
                </div>
                <div className="mt-0.5">{timeAgo(connection.lastSyncAt)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/20 p-2.5 dark:bg-white/5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Synced emails
                </div>
                <div className="mt-0.5 font-mono">
                  {connection.lastSyncCount}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/20 p-2.5 dark:bg-white/5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Connected since
                </div>
                <div className="mt-0.5">
                  {new Date(connection.connectedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {connection.lastError && (
              <div className="flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {connection.lastError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 gap-1.5"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="gap-1.5"
              >
                <WifiOff className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <ConnectFlowDialog />
          </div>
        )}
      </section>

      {/* Threshold */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Review threshold</h3>
            <p className="text-[12px] text-muted-foreground">
              Confidences below this go to REVIEW.
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
      </section>

      {/* Data + danger zone */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Data</h3>
            <p className="text-[12px] text-muted-foreground">
              {realCount} from your inbox · {sampleCount} sample emails in
              pipeline.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            onClick={handleClearSamples}
            disabled={sampleCount === 0}
            className="w-full justify-start gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear sample emails
            <span className="ml-auto text-[10px] text-muted-foreground">
              {sampleCount} to remove
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={handleReseed}
            className="w-full justify-start gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reseed sample inbox
            <span className="ml-auto text-[10px] text-muted-foreground">
              reset to 20 demos
            </span>
          </Button>
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/10 p-3 dark:bg-white/5 text-[11px] text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium text-foreground">
                  Privacy:
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Your IMAP password lives only in the dev server process memory.
              </TooltipContent>
            </Tooltip>
            <span className="ml-1">
              IMAP password is in server memory only — never in the database.
              Email content is triaged locally; the cloud LLM fires only when
              you triage a pasted email or generate the digest.
            </span>
          </div>
        </TooltipProvider>
      </section>
    </div>
  );
}
