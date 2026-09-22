"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
  KeyRound,
  Check,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useReflex } from "@/store/reflex";
import type { ImapConfig, ProviderPreset } from "@/lib/reflex/imap";
import { cn } from "@/lib/utils";

function presetList(): Array<ProviderPreset & { id: string }> {
  return [
    { id: "gmail", label: "Gmail", host: "imap.gmail.com", port: 993, secure: true, folder: "INBOX", note: "Requires a Gmail App Password (2FA → Account → App passwords). Your regular password will not work." },
    { id: "outlook", label: "Outlook / Office 365", host: "outlook.office365.com", port: 993, secure: true, folder: "Inbox", note: "Personal Microsoft accounts may need an app password. Work/school accounts usually work directly." },
    { id: "fastmail", label: "Fastmail", host: "imap.fastmail.com", port: 993, secure: true, folder: "INBOX", note: "Use your Fastmail app password (Settings → Passwords & Security)." },
    { id: "yahoo", label: "Yahoo", host: "imap.mail.yahoo.com", port: 993, secure: true, folder: "INBOX", note: "Requires a Yahoo app password (Account → Account security)." },
    { id: "icloud", label: "iCloud Mail", host: "imap.mail.me.com", port: 993, secure: true, folder: "INBOX", note: "Requires an iCloud app-specific password (Apple ID → Sign-In & Security)." },
    { id: "custom", label: "Custom IMAP", host: "", port: 993, secure: true, folder: "INBOX" },
  ];
}

type Step = 0 | 1 | 2;

const STEP_LABELS = ["Provider", "Sign in", "Sync"];

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  done || active
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1",
                  done ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProviderCard({
  preset,
  active,
  onClick,
}: {
  preset: ProviderPreset & { id: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {preset.label[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium">{preset.label}</span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {preset.host || "configure manually"}
        </span>
      </span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </button>
  );
}

export function ConnectFlowDialog() {
  const connectMailbox = useReflex((s) => s.connectMailbox);
  const syncMailbox = useReflex((s) => s.syncMailbox);
  const connecting = useReflex((s) => s.connecting);
  const syncing = useReflex((s) => s.syncing);
  const syncError = useReflex((s) => s.syncError);
  const fetchSyncStatus = useReflex((s) => s.fetchSyncStatus);
  const connectionToken = useReflex((s) => s.connectionToken);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [presetId, setPresetId] = useState("gmail");
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState(993);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [folder, setFolder] = useState("INBOX");
  const [limit, setLimit] = useState(30);

  // Restore token on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("reflex.connectionToken");
    if (stored) {
      useReflex.setState({ connectionToken: stored });
      fetchSyncStatus();
    }
  }, [fetchSyncStatus]);

  const presets = presetList();
  const activePreset = presets.find((p) => p.id === presetId);

  function selectPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setHost(p.host);
    setPort(p.port);
    setFolder(p.folder);
  }

  function reset() {
    setStep(0);
    setUser("");
    setPassword("");
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) reset();
  }

  async function handleConnect() {
    if (!host || !user || !password) return;
    const cfg: ImapConfig = {
      host,
      port: Number(port) || 993,
      user,
      password,
      secure: true,
      folder: folder || "INBOX",
      limit: Number(limit) || 30,
    };
    const res = await connectMailbox(cfg);
    if (res.ok) {
      setStep(2);
      // Auto-sync.
      setTimeout(() => void doSync(), 500);
    } else {
      toast.error("Connection failed", { description: res.error });
    }
  }

  async function doSync() {
    const res = await syncMailbox();
    if (res.ok) {
      toast.success("Sync complete", {
        description: `Triaged ${res.triaged} new email(s).`,
      });
    } else {
      toast.error("Sync failed", { description: res.error });
    }
  }

  function finish() {
    setOpen(false);
    reset();
    void fetchSyncStatus();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2">
          <Mail className="h-4 w-4" />
          Connect your mailbox
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Connect your mailbox
          </DialogTitle>
          <DialogDescription>
            Read your real emails over IMAP. Password stays in server memory
            only — never written to disk.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="py-3">
          <StepIndicator step={step} />
        </div>

        {/* Step 0: Provider */}
        {step === 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Choose your provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <ProviderCard
                  key={p.id}
                  preset={p}
                  active={presetId === p.id}
                  onClick={() => selectPreset(p.id)}
                />
              ))}
            </div>
            {activePreset?.note && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-[10px] leading-tight text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <KeyRound className="mt-0.5 h-3 w-3 shrink-0" />
                {activePreset.note}
              </p>
            )}
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button size="sm" onClick={() => setStep(1)} className="gap-1.5">
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="host" className="text-xs">
                  IMAP host
                </Label>
                <Input
                  id="host"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="port" className="text-xs">
                  Port
                </Label>
                <Input
                  id="port"
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user" className="text-xs">
                Email address
              </Label>
              <Input
                id="user"
                type="email"
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="you@gmail.com"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">
                App password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="folder" className="text-xs">
                  Folder
                </Label>
                <Input
                  id="folder"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="limit" className="text-xs">
                  Pull last N
                </Label>
                <Input
                  id="limit"
                  type="number"
                  min={1}
                  max={200}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {syncError && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {syncError}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(0)}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={connecting || !host || !user || !password}
                className="gap-1.5"
              >
                {connecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wifi className="h-3.5 w-3.5" />
                )}
                {connecting ? "Connecting…" : "Connect & test"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Sync */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-xl border bg-emerald-50/50 py-8 text-center dark:bg-emerald-950/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                {syncing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Check className="h-6 w-6" />
                )}
              </div>
              <h3 className="mt-3 text-sm font-semibold">
                {syncing
                  ? "Reading your inbox…"
                  : connectionToken
                  ? "Connected!"
                  : "Ready"}
              </h3>
              <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
                {syncing
                  ? "Triaging your most recent emails with the local decider."
                  : "Your mailbox is connected. You can sync again anytime from Settings."}
              </p>
            </div>

            {syncError && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {syncError}
              </div>
            )}

            <DialogFooter className="gap-2">
              {!syncing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={doSync}
                  className="gap-1.5"
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  Sync again
                </Button>
              )}
              <Button
                size="sm"
                onClick={finish}
                disabled={syncing}
                className="gap-1.5"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {syncing ? "Working…" : "Done"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
