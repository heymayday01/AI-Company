import { NextResponse, type NextRequest } from "next/server";
import { syncImap, getConnectionInfo } from "@/lib/reflex/imap";

export const dynamic = "force-dynamic";

// POST /api/sync
// Body: { token }
// Fetches the most recent N emails from the connected mailbox and triages them.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { token } = body as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const result = await syncImap(token);
  const status = result.error ? 400 : 200;
  return NextResponse.json(
    { ...result, connection: getConnectionInfo(token) },
    { status }
  );
}
