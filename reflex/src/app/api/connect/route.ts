import { NextResponse, type NextRequest } from "next/server";
import { connectImap, type ImapConfig } from "@/lib/reflex/imap";

export const dynamic = "force-dynamic";

// POST /api/connect
// Body: ImapConfig (host, port, user, password, secure, folder, limit)
// Returns: { token, tested, countInFolder, error? }
// The token is a session handle; the password stays in memory only.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const cfg = body as Partial<ImapConfig>;
  if (!cfg.host || !cfg.user || !cfg.password) {
    return NextResponse.json(
      { error: "host, user, and password are required" },
      { status: 400 }
    );
  }
  const config: ImapConfig = {
    host: String(cfg.host),
    port: Number(cfg.port) || 993,
    user: String(cfg.user),
    password: String(cfg.password),
    secure: cfg.secure !== false,
    folder: cfg.folder || "INBOX",
    limit: Math.min(Math.max(Number(cfg.limit) || 30, 1), 200),
  };

  const result = await connectImap(config);
  const status = result.error ? 400 : 200;
  return NextResponse.json(result, { status });
}
