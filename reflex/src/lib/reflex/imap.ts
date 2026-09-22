// Reflex IMAP connector — pulls real emails from your mailbox and feeds them
// through the same triage pipeline. Connection config lives IN MEMORY ONLY:
// the password is never persisted to the database. The user re-enters it each
// session (or we keep it for the process lifetime of the dev server).
//
// Provider presets cover the common cases (Gmail, Outlook, Fastmail, Yahoo,
// iCloud, ProtonMail-bridge, generic IMAP). Gmail & Yahoo require an
// app-specific password; we surface that in the UI.

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/lib/db";
import { classifyLocal } from "./classify";
import { getReviewThreshold } from "./config";

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean; // true = TLS
  folder: string; // e.g. "INBOX"
  limit: number; // how many recent emails to fetch
}

export interface ProviderPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  folder: string;
  note?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "gmail",
    label: "Gmail",
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    folder: "INBOX",
    note: "Requires a Gmail App Password (2FA → Account → App passwords). Your regular password will not work.",
  },
  {
    id: "outlook",
    label: "Outlook / Office 365",
    host: "outlook.office365.com",
    port: 993,
    secure: true,
    folder: "Inbox",
    note: "Personal Microsoft accounts may need an app password. Work/school accounts usually work directly.",
  },
  {
    id: "fastmail",
    label: "Fastmail",
    host: "imap.fastmail.com",
    port: 993,
    secure: true,
    folder: "INBOX",
    note: "Use your Fastmail app password (Settings → Passwords & Security).",
  },
  {
    id: "yahoo",
    label: "Yahoo",
    host: "imap.mail.yahoo.com",
    port: 993,
    secure: true,
    folder: "INBOX",
    note: "Requires a Yahoo app password (Account → Account security).",
  },
  {
    id: "icloud",
    label: "iCloud Mail",
    host: "imap.mail.me.com",
    port: 993,
    secure: true,
    folder: "INBOX",
    note: "Requires an iCloud app-specific password (Apple ID → Sign-In & Security).",
  },
  {
    id: "protonmail",
    label: "ProtonMail (Bridge)",
    host: "127.0.0.1",
    port: 1143,
    secure: false,
    folder: "INBOX",
    note: "Requires the Proton Mail Bridge app running locally. Use your Bridge-generated password.",
  },
  {
    id: "custom",
    label: "Custom IMAP",
    host: "",
    port: 993,
    secure: true,
    folder: "INBOX",
  },
];

// In-memory connection store — keyed by a session token (cuid). The token is
// returned to the client and stored in a cookie/localStorage. The password
// is NEVER written to the database.
interface StoredConnection {
  config: ImapConfig;
  connectedAt: number;
  lastSyncAt: number | null;
  lastSyncCount: number;
  lastError: string | null;
}

const connections = new Map<string, StoredConnection>();

function newToken(): string {
  // Small random token (not crypto-grade — this is a demo session handle).
  return `conn_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export interface ConnectionInfo {
  token: string;
  user: string;
  host: string;
  folder: string;
  connectedAt: number;
  lastSyncAt: number | null;
  lastSyncCount: number;
  lastError: string | null;
}

function info(token: string, c: StoredConnection): ConnectionInfo {
  return {
    token,
    user: c.config.user,
    host: c.config.host,
    folder: c.config.folder,
    connectedAt: c.connectedAt,
    lastSyncAt: c.lastSyncAt,
    lastSyncCount: c.lastSyncCount,
    lastError: c.lastError,
  };
}

export function getConnection(token: string | null): StoredConnection | null {
  if (!token) return null;
  return connections.get(token) ?? null;
}

export function getConnectionInfo(token: string | null): ConnectionInfo | null {
  if (!token) return null;
  const c = connections.get(token);
  return c ? info(token, c) : null;
}

export function disconnect(token: string | null): boolean {
  if (!token) return false;
  return connections.delete(token);
}

export interface ConnectResult {
  token: string;
  tested: boolean;
  countInFolder: number;
  error?: string;
}

/**
 * Test the connection by listing the folder. Does NOT fetch emails yet.
 * On success, stores the config in memory and returns a session token.
 */
export async function connectImap(cfg: ImapConfig): Promise<ConnectResult> {
  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false as unknown as undefined, // silence
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock(cfg.folder);
    let countInFolder = 0;
    try {
      const status = (await client.status(cfg.folder, {
        messages: true,
      } as never)) as { messages?: number } | undefined;
      countInFolder = status?.messages ?? 0;
    } finally {
      lock.release();
    }
    await client.logout();

    const token = newToken();
    connections.set(token, {
      config: cfg,
      connectedAt: Date.now(),
      lastSyncAt: null,
      lastSyncCount: 0,
      lastError: null,
    });
    return { token, tested: true, countInFolder };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { token: "", tested: false, countInFolder: 0, error: msg };
  }
}

export interface SyncResult {
  fetched: number;
  triaged: number;
  skipped: number;
  error?: string;
}

/**
 * Fetch the most recent N emails from the connected mailbox, triage each
 * with the LOCAL decider (instant, free — the same Laya-equivalent path used
 * for the seed inbox), and persist them. Returns counts.
 *
 * We use the local classifier (not the cloud LLM) for sync because:
 *   (a) it keeps the user's inbox fully local — no email content leaves the
 *       process to a third-party LLM during bulk sync;
 *   (b) it's instant and free — a 100-email sync completes in milliseconds;
 *   (c) it matches the plan's "decision-first" principle: the LLM escalator
 *       only fires for genuinely uncertain REVIEW items.
 */
export async function syncImap(token: string): Promise<SyncResult> {
  const stored = connections.get(token);
  if (!stored) return { fetched: 0, triaged: 0, skipped: 0, error: "Not connected" };
  const cfg = stored.config;

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false as unknown as undefined,
  });

  try {
    await client.connect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stored.lastError = msg;
    return { fetched: 0, triaged: 0, skipped: 0, error: msg };
  }

  let fetched = 0;
  let triaged = 0;
  let skipped = 0;

  try {
    const lock = await client.getMailboxLock(cfg.folder);
    try {
      // Fetch the most recent `limit` messages — envelope + bodyStructure +
      // source so we can parse with mailparser for clean text.
      const limit = Math.max(1, Math.min(cfg.limit, 200));
      const status = (await client.status(cfg.folder, {
        messages: true,
      } as never)) as { messages?: number } | undefined;
      const total = status?.messages ?? 0;
      if (total === 0) {
        stored.lastError = null;
        stored.lastSyncAt = Date.now();
        stored.lastSyncCount = 0;
        return { fetched: 0, triaged: 0, skipped: 0 };
      }
      const startSeq = Math.max(1, total - limit + 1);

      // Pull the message ids/range.
      const messages = client.fetch(
        `${startSeq}:${total}`,
        { envelope: true, source: true, internalDate: true },
        { uid: false }
      );

      const reviewThreshold = await getReviewThreshold();

      for await (const msg of messages) {
        fetched++;
        try {
          const source = msg.source as Buffer | undefined;
          if (!source) {
            skipped++;
            continue;
          }
          const parsed = await simpleParser(source);
          const subject = parsed.subject ?? "(no subject)";
          const senderName =
            parsed.from?.value?.[0]?.name ??
            parsed.from?.text ??
            "";
          const senderAddr =
            parsed.from?.value?.[0]?.address ??
            parsed.from?.text ??
            "unknown@example.com";
          const snippet = (parsed.text ?? parsed.html ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 240);
          const body = parsed.text ?? "";
          const messageId = parsed.messageId ?? null;
          const internalDate = msg.internalDate
            ? new Date(msg.internalDate as string)
            : new Date();

          // Skip if we already have this message.
          if (messageId) {
            const existing = await db.email.findFirst({
              where: { gmailId: messageId },
            });
            if (existing) {
              skipped++;
              continue;
            }
          }

          const decision = classifyLocal(
            { sender: senderAddr, senderName, subject, snippet, body },
            { reviewThreshold }
          );

          await db.email.create({
            data: {
              gmailId: messageId,
              sender: senderAddr,
              senderName: senderName || null,
              subject,
              snippet: snippet || subject.slice(0, 240),
              body: body || snippet,
              category: decision.category,
              attention: decision.attention,
              bucket: decision.bucket,
              confidence: decision.confidence,
              topCandidates: JSON.stringify(decision.topCandidates),
              distribution: JSON.stringify(decision.distribution),
              actionNeeded: decision.actionNeeded,
              fromHuman: decision.fromHuman,
              consequence: decision.consequence,
              churnSignal: decision.churnSignal,
              schemaVersion: 1,
              isSample: false,
              source: "local",
              // Preserve the real received date for correct ordering.
              createdAt: internalDate,
              triagedAt: new Date(),
            },
          });
          triaged++;
        } catch {
          skipped++;
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stored.lastError = msg;
    return { fetched, triaged, skipped, error: msg };
  }

  stored.lastError = null;
  stored.lastSyncAt = Date.now();
  stored.lastSyncCount = triaged;
  return { fetched, triaged, skipped };
}
