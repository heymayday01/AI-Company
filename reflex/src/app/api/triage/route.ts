import { NextResponse, type NextRequest } from "next/server";
import { classify } from "@/lib/reflex/classify";
import { getReviewThreshold } from "@/lib/reflex/config";

export const dynamic = "force-dynamic";

// POST /api/triage — dry-run classification. Does NOT persist.
// Body: { sender, senderName?, subject, snippet, body? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { sender, senderName, subject, snippet, body: emailBody } = body as {
    sender?: string;
    senderName?: string;
    subject?: string;
    snippet?: string;
    body?: string;
  };
  if (!sender || !subject) {
    return NextResponse.json(
      { error: "sender and subject are required" },
      { status: 400 }
    );
  }
  const finalSnippet = (snippet ?? "").trim() || subject.slice(0, 200);
  const reviewThreshold = await getReviewThreshold();
  const decision = await classify(
    { sender, senderName, subject, snippet: finalSnippet, body: emailBody },
    { reviewThreshold }
  );
  return NextResponse.json({
    decision: {
      category: decision.category,
      confidence: decision.confidence,
      attention: decision.attention,
      bucket: decision.bucket,
      actionNeeded: decision.actionNeeded,
      fromHuman: decision.fromHuman,
      consequence: decision.consequence,
      churnSignal: decision.churnSignal,
      distribution: decision.distribution,
      topCandidates: decision.topCandidates,
      latencyMs: decision.latencyMs,
      source: decision.source,
      reviewThreshold,
    },
  });
}
