import { NextResponse, type NextRequest } from "next/server";
import { disconnect } from "@/lib/reflex/imap";

export const dynamic = "force-dynamic";

// POST /api/disconnect
// Body: { token }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { token } = body as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const ok = disconnect(token);
  return NextResponse.json({ ok });
}
