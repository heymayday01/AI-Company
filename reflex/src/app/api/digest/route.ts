import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST /api/digest — generate the daily attention digest, the *only*
// generative path in Reflex. Summarizes the NOW bucket in one short paragraph.
export async function POST() {
  const nowEmails = await db.email.findMany({
    where: { bucket: "NOW" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  if (nowEmails.length === 0) {
    return NextResponse.json({
      digest: "",
      empty: true,
      count: 0,
    });
  }

  const items = nowEmails
    .map((e, i) => `${i + 1}. From ${e.senderName ?? e.sender}: "${e.subject}". ${e.snippet}`)
    .join("\n");

  const systemPrompt = `You are Reflex's daily attention digest writer. Write ONE short paragraph (3-6 sentences, ~80 words) summarizing what the user must act on today from the NOW bucket. Be specific (name senders, what's at stake). No fluff, no preamble. If anything is genuinely time-sensitive, say so. Plain text only.`;

  // Retry with exponential backoff for transient 429s.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const zai = await getZai();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: `NOW bucket items:\n${items}` },
        ],
        thinking: { type: "disabled" },
      });
      const digest = (completion.choices[0]?.message?.content ?? "").trim();
      if (digest) {
        return NextResponse.json({ digest, count: nowEmails.length });
      }
    } catch {
      // 429 or network — backoff and retry.
    }
    if (attempt < 2) await sleep(500 * Math.pow(2, attempt));
  }

  // Graceful degradation: a deterministic digest.
  const lines = nowEmails.map(
    (e) => `\u2022 ${e.senderName ?? e.sender} \u2014 ${e.subject}`
  );
  const digest = `${nowEmails.length} items in NOW:\n\n${lines.join("\n")}`;
  return NextResponse.json({ digest, count: nowEmails.length, degraded: true });
}
