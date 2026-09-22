import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { classify } from "@/lib/reflex/classify";
import { getReviewThreshold } from "@/lib/reflex/config";
import { seedIfEmpty } from "@/lib/reflex/seed";
import type { Email } from "@prisma/client";

export const dynamic = "force-dynamic";

interface EmailRow extends Email {
  corrections: { id: string }[];
}

function serialize(e: EmailRow) {
  return {
    id: e.id,
    sender: e.sender,
    senderName: e.senderName,
    subject: e.subject,
    snippet: e.snippet,
    body: e.body ?? "",
    category: e.category,
    attention: e.attention,
    bucket: e.bucket,
    confidence: e.confidence,
    topCandidates: JSON.parse(e.topCandidates) as { category: string; prob: number }[],
    distribution: JSON.parse(e.distribution) as Record<string, number>,
    actionNeeded: e.actionNeeded,
    fromHuman: e.fromHuman,
    consequence: e.consequence,
    churnSignal: e.churnSignal,
    isSample: e.isSample,
    source: e.source,
    corrected: e.corrections.length > 0,
    createdAt: e.createdAt,
    triagedAt: e.triagedAt,
  };
}

// GET /api/emails?bucket=NOW  → list (optionally filtered)
export async function GET(req: NextRequest) {
  await seedIfEmpty();
  const bucket = req.nextUrl.searchParams.get("bucket");
  const rows = await db.email.findMany({
    include: { corrections: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    ...(bucket ? { where: { bucket } } : {}),
  });
  return NextResponse.json({ emails: rows.map(serialize) });
}

// POST /api/emails  → add an email, triage it, return the decision
export async function POST(req: NextRequest) {
  await seedIfEmpty();
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

  const created = await db.email.create({
    data: {
      sender,
      senderName: senderName ?? null,
      subject,
      snippet: finalSnippet,
      body: emailBody ?? finalSnippet,
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
      source: decision.source === "llm" ? "llm" : "fallback",
    },
    include: { corrections: { select: { id: true } } },
  });

  return NextResponse.json({
    email: serialize(created),
    decision: {
      latencyMs: decision.latencyMs,
      source: decision.source,
      reviewThreshold,
    },
  });
}
