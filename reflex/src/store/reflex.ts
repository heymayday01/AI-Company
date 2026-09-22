"use client";

import { create } from "zustand";
import type { EmailDTO, CalibrationStats } from "@/lib/reflex/types";

export type ViewId = "board" | "review" | "stats" | "settings";

interface ReflexState {
  emails: EmailDTO[];
  stats: CalibrationStats | null;
  reviewThreshold: number;
  loading: boolean;
  digest: string;
  digestLoading: boolean;
  digestEmpty: boolean;
  digestDegraded: boolean;
  lastTriage: { latencyMs: number; source: "llm" | "fallback" } | null;
  selectedEmailId: string | null;

  // Navigation
  view: ViewId;
  setView: (v: ViewId) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;

  // IMAP connection state
  connectionToken: string | null;
  connection: import("@/lib/reflex/imap").ConnectionInfo | null;
  connecting: boolean;
  syncing: boolean;
  syncError: string | null;

  setEmails: (emails: EmailDTO[]) => void;
  setStats: (stats: CalibrationStats | null) => void;
  setThreshold: (t: number) => void;
  setLoading: (b: boolean) => void;
  setDigest: (
    digest: string,
    opts?: { empty?: boolean; degraded?: boolean }
  ) => void;
  setDigestLoading: (b: boolean) => void;
  setLastTriage: (t: { latencyMs: number; source: "llm" | "fallback" } | null) => void;
  setSelectedEmailId: (id: string | null) => void;
  setConnection: (c: import("@/lib/reflex/imap").ConnectionInfo | null) => void;
  setConnecting: (b: boolean) => void;
  setSyncing: (b: boolean) => void;
  setSyncError: (e: string | null) => void;

  upsertEmail: (e: EmailDTO) => void;
  updateEmailBucket: (id: string, bucket: EmailDTO["bucket"]) => void;
  removeEmail: (id: string) => void;

  fetchEmails: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchConfig: () => Promise<void>;
  addEmail: (input: {
    sender: string;
    senderName?: string;
    subject: string;
    snippet?: string;
    body?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  correctBucket: (
    id: string,
    toBucket: EmailDTO["bucket"]
  ) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  updateThreshold: (t: number) => Promise<void>;
  generateDigest: () => Promise<void>;
  reseed: () => Promise<void>;
  connectMailbox: (cfg: import("@/lib/reflex/imap").ImapConfig) => Promise<{ ok: boolean; error?: string; countInFolder?: number }>;
  syncMailbox: () => Promise<{ ok: boolean; error?: string; fetched?: number; triaged?: number; skipped?: number }>;
  disconnectMailbox: () => Promise<void>;
  fetchSyncStatus: () => Promise<void>;
  clearSamples: () => Promise<void>;
}

export const useReflex = create<ReflexState>((set, get) => ({
  emails: [],
  stats: null,
  reviewThreshold: 0.65,
  loading: true,
  digest: "",
  digestLoading: false,
  digestEmpty: false,
  digestDegraded: false,
  lastTriage: null,
  selectedEmailId: null,
  view: "board",
  sidebarOpen: false,
  connectionToken: null,
  connection: null,
  connecting: false,
  syncing: false,
  syncError: null,

  setEmails: (emails) => set({ emails }),
  setStats: (stats) => set({ stats }),
  setThreshold: (reviewThreshold) => set({ reviewThreshold }),
  setLoading: (loading) => set({ loading }),
  setDigest: (digest, opts) =>
    set({
      digest,
      digestEmpty: !!opts?.empty,
      digestDegraded: !!opts?.degraded,
    }),
  setDigestLoading: (digestLoading) => set({ digestLoading }),
  setLastTriage: (lastTriage) => set({ lastTriage }),
  setSelectedEmailId: (selectedEmailId) => set({ selectedEmailId }),
  setView: (view) => set({ view, sidebarOpen: false }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setConnection: (connection) => set({ connection }),
  setConnecting: (connecting) => set({ connecting }),
  setSyncing: (syncing) => set({ syncing }),
  setSyncError: (syncError) => set({ syncError }),

  upsertEmail: (e) =>
    set((s) => {
      const idx = s.emails.findIndex((x) => x.id === e.id);
      const next = [...s.emails];
      if (idx >= 0) next[idx] = e;
      else next.unshift(e);
      return { emails: next };
    }),
  updateEmailBucket: (id, bucket) =>
    set((s) => ({
      emails: s.emails.map((e) => (e.id === id ? { ...e, bucket } : e)),
    })),
  removeEmail: (id) =>
    set((s) => ({ emails: s.emails.filter((e) => e.id !== id) })),

  fetchEmails: async () => {
    try {
      const res = await fetch("/api/emails");
      const data = await res.json();
      set({ emails: data.emails ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
  fetchStats: async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      set({ stats: data.stats, reviewThreshold: data.reviewThreshold });
    } catch {
      /* noop */
    }
  },
  fetchConfig: async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      set({ reviewThreshold: data.reviewThreshold });
    } catch {
      /* noop */
    }
  },

  addEmail: async (input) => {
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.error ?? "Failed to triage" };
      }
      const data = await res.json();
      get().upsertEmail(data.email);
      set({
        lastTriage: {
          latencyMs: data.decision.latencyMs,
          source: data.decision.source,
        },
      });
      get().fetchStats();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  },

  correctBucket: async (id, toBucket) => {
    const prev = get().emails.find((e) => e.id === id);
    if (!prev) return;
    // Optimistic update.
    get().updateEmailBucket(id, toBucket);
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: id, toBucket }),
      });
      if (!res.ok) {
        get().updateEmailBucket(id, prev.bucket); // rollback
        return;
      }
      const data = await res.json();
      set({
        stats: data.stats,
        emails: get().emails.map((e) =>
          e.id === id ? { ...e, corrected: true } : e
        ),
      });
    } catch {
      get().updateEmailBucket(id, prev.bucket);
    }
  },

  deleteEmail: async (id) => {
    const prev = get().emails;
    get().removeEmail(id);
    try {
      await fetch(`/api/emails/${id}`, { method: "DELETE" });
      get().fetchStats();
    } catch {
      set({ emails: prev });
    }
  },

  updateThreshold: async (t) => {
    set({ reviewThreshold: t });
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewThreshold: t }),
      });
      if (!res.ok) return;
      // Re-bucket happened server-side; refresh emails + stats.
      get().fetchEmails();
      get().fetchStats();
    } catch {
      /* noop */
    }
  },

  generateDigest: async () => {
    set({ digestLoading: true });
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      const data = await res.json();
      set({
        digest: data.digest ?? "",
        digestEmpty: !!data.empty,
        digestDegraded: !!data.degraded,
      });
    } finally {
      set({ digestLoading: false });
    }
  },

  reseed: async () => {
    set({ loading: true });
    try {
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      await Promise.all([get().fetchEmails(), get().fetchStats()]);
    } finally {
      set({ loading: false });
    }
  },

  connectMailbox: async (cfg) => {
    set({ connecting: true, syncError: null });
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        const err = data.error ?? "Connection failed";
        set({ syncError: err });
        return { ok: false, error: err };
      }
      // Persist the token in localStorage so a page refresh remembers the
      // connection (the password itself stays server-side in memory only).
      if (typeof window !== "undefined") {
        window.localStorage.setItem("reflex.connectionToken", data.token);
      }
      set({ connectionToken: data.token, syncError: null });
      await get().fetchSyncStatus();
      return { ok: true, countInFolder: data.countInFolder };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Network error";
      set({ syncError: err });
      return { ok: false, error: err };
    } finally {
      set({ connecting: false });
    }
  },

  syncMailbox: async () => {
    const token = get().connectionToken;
    if (!token) {
      const err = "Not connected to a mailbox";
      set({ syncError: err });
      return { ok: false, error: err };
    }
    set({ syncing: true, syncError: null });
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error ?? "Sync failed";
        set({ syncError: err });
        // If the token is invalid, clear it.
        if (/not connected|token/i.test(err)) {
          set({ connectionToken: null, connection: null });
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("reflex.connectionToken");
          }
        }
        return { ok: false, error: err };
      }
      await get().fetchSyncStatus();
      await Promise.all([get().fetchEmails(), get().fetchStats()]);
      return {
        ok: true,
        fetched: data.fetched,
        triaged: data.triaged,
        skipped: data.skipped,
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "Network error";
      set({ syncError: err });
      return { ok: false, error: err };
    } finally {
      set({ syncing: false });
    }
  },

  disconnectMailbox: async () => {
    const token = get().connectionToken;
    if (token) {
      try {
        await fetch("/api/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch {
        /* noop */
      }
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("reflex.connectionToken");
    }
    set({ connectionToken: null, connection: null, syncError: null });
  },

  fetchSyncStatus: async () => {
    const token = get().connectionToken;
    if (!token) {
      set({ connection: null });
      return;
    }
    try {
      const res = await fetch(`/api/sync-status?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      set({ connection: data.connection ?? null });
      if (!data.connection) {
        // Token is stale — clear it.
        set({ connectionToken: null });
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("reflex.connectionToken");
        }
      }
    } catch {
      /* noop */
    }
  },

  clearSamples: async () => {
    try {
      await fetch("/api/clear-samples", { method: "POST" });
      await Promise.all([get().fetchEmails(), get().fetchStats()]);
    } catch {
      /* noop */
    }
  },
}));
