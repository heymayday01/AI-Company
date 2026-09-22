"use client";

import { useState } from "react";
import { Zap, Loader2, AlertCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useReflex } from "@/store/reflex";

export function AddEmailDialog() {
  const addEmail = useReflex((s) => s.addEmail);
  const lastTriage = useReflex((s) => s.lastTriage);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sender, setSender] = useState("");
  const [senderName, setSenderName] = useState("");
  const [subject, setSubject] = useState("");
  const [snippet, setSnippet] = useState("");
  const [body, setBody] = useState("");

  function reset() {
    setSender("");
    setSenderName("");
    setSubject("");
    setSnippet("");
    setBody("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sender || !subject) return;
    setSubmitting(true);
    const res = await addEmail({
      sender,
      senderName: senderName || undefined,
      subject,
      snippet: snippet || undefined,
      body: body || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Email triaged", {
        description:
          lastTriage && lastTriage.source === "fallback"
            ? "Classified via fallback (LLM was unavailable)."
            : `Decided in ${lastTriage?.latencyMs ?? 0}ms.`,
      });
      setOpen(false);
      reset();
    } else {
      toast.error("Triage failed", { description: res.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Triage an email</span>
          <span className="sm:hidden">Triage</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Triage a new email
          </DialogTitle>
          <DialogDescription>
            Paste a raw email (or simulate one). Reflex runs the decider on it,
            stores the full distribution, and places it in a bucket.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="senderName" className="text-xs">
                Sender name
              </Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Priya Mendes"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sender" className="text-xs">
                Sender email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sender"
                type="email"
                required
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="priya@studio.com"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Re: Q3 contract — need sign-off by Friday"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="snippet" className="text-xs">
              Snippet (200 chars — used by the decider)
            </Label>
            <Textarea
              id="snippet"
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              placeholder="Hi — legal redlined the MSA. Two clauses still open…"
              className="min-h-[60px] text-xs"
              maxLength={400}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body" className="text-xs">
              Full body (optional — improves the decision)
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[80px] text-xs"
              placeholder="The full email body…"
            />
          </div>
          {lastTriage && lastTriage.source === "fallback" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Last classification used the deterministic fallback (LLM
                unreachable). The result will likely land in REVIEW — that&apos;s
                the graceful-degradation behavior.
              </span>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !sender || !subject}
              className="gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {submitting ? "Deciding…" : "Triage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
