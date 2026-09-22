import { NextResponse, type NextRequest } from "next/server";
import { getConnectionInfo, type ProviderPreset, PROVIDER_PRESETS } from "@/lib/reflex/imap";

export const dynamic = "force-dynamic";

// GET /api/sync-status?token=...  → connection info + provider presets
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const connection = getConnectionInfo(token);
  const presets: ProviderPreset[] = PROVIDER_PRESETS;
  return NextResponse.json({ connection, presets });
}
