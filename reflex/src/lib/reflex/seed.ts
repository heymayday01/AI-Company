// A realistic mixed inbox used to populate the dashboard on first run.
// Each sample is pre-classified by the decider at seed time so the board has
// content immediately; the user can then triage new (pasted) emails and
// file corrections to watch the flywheel turn.

import { db } from "@/lib/db";
import { classifyLocal } from "./classify";
import { topCandidates, type Distribution } from "./schema";

export interface SampleEmail {
  sender: string;
  senderName: string;
  subject: string;
  snippet: string;
  body?: string;
}

export const SAMPLE_EMAILS: SampleEmail[] = [
  {
    sender: "priya@northwind.studio",
    senderName: "Priya Mendes",
    subject: "Re: Q3 contract — need your sign-off by Friday",
    snippet:
      "Hi — legal redlined the MSA. Two clauses still open: liability cap and the auto-renewal. Can you review and approve by Friday EOD? We can't send to the client without it.",
    body:
      "Hi — legal redlined the MSA. Two clauses still open: liability cap and the auto-renewal. Can you review and approve by Friday EOD? We can't send to the client without it. Happy to jump on a call if anything is unclear.\n\nThanks,\nPriya",
  },
  {
    sender: "noreply@github.com",
    senderName: "GitHub",
    subject: "Security alert: new sign-in from Lagos, Nigeria",
    snippet:
      "We noticed a new sign-in to your account from a device we don't recognize. If this was you, you can ignore this email. Otherwise, please secure your account.",
    body:
      "We noticed a new sign-in to your account from a device we don't recognize.\n\nLocation: Lagos, Nigeria\nTime: 02:14 UTC\nBrowser: Chrome on Android\n\nIf this was you, you can ignore this email. Otherwise, please secure your account immediately.",
  },
  {
    sender: "calendar@schedule.northwind.studio",
    senderName: "Northwind Calendar",
    subject: "Meeting invite: Design review · Thu 14:00–15:00",
    snippet:
      "Priya Mendes invited you to a meeting. Agenda: walkthrough of the v2 dashboard, decide on the dark-mode palette, assign follow-ups.",
  },
  {
    sender: "tracking@bhippo.com",
    senderName: "Big Hippo Logistics",
    subject: "Your order #44218 has shipped",
    snippet:
      "Thanks for your order! Your package is on its way. Tracking: 1Z999AA10123456784. Estimated delivery: Tue–Thu this week.",
  },
  {
    sender: "weekly@tinyletter.com",
    senderName: "This Week in Local-First",
    subject: "This Week in Local-First — #47: the 33ms decider",
    snippet:
      "Issue #47. A round-up of the week's local-first reads. Plus: why decision-first beats generation-first for triage workloads.",
  },
  {
    sender: "marcus@oldfriends.org",
    senderName: "Marcus",
    subject: "Dinner Friday? That ramen place finally reopened",
    snippet:
      "Hey — the ramen place on 9th reopened after the renovation. Sarah and I are going Friday 8pm. You in?",
  },
  {
    sender: "billing@stripe.com",
    senderName: "Stripe Billing",
    subject: "Receipt for your Northwind Studio subscription — $0.00",
    snippet:
      "Thanks for your business. This is a receipt for your subscription. Amount paid: $0.00 (trial credit applied). No action required.",
  },
  {
    sender: "ledger@northwind.studio",
    senderName: "Northwind Ledger Bot",
    subject: "FYI: weekly burn report (read when free)",
    snippet:
      "No action needed. Weekly burn summary attached. Runway is stable at 14 months. CC'd for visibility.",
  },
  {
    sender: "anika@stratpartners.co",
    senderName: "Anika Rao",
    subject: "Following up — are we still on for the partnership call?",
    snippet:
      "Hi — I haven't heard back since our last note. We're trying to finalize Q3 partnerships this week. If we don't reconnect by Wed I'll assume you're passing.",
    body:
      "Hi — I haven't heard back since our last note. We're trying to finalize Q3 partnerships this week. If we don't reconnect by Wed I'll assume you're passing. Not trying to rush you, just want to be respectful of both our calendars.\n\nBest,\nAnika",
  },
  {
    sender: "promo@dailydeals.io",
    senderName: "Daily Deals",
    subject: "🎉 FLASH: 80% off everything — ends in 2 hours!!",
    snippet:
      "Don't miss out. Click here to claim your exclusive discount. Limited time. Act now. You've been specially selected.",
  },
  {
    sender: "design-team@northwind.studio",
    senderName: "Design Team (CC'd)",
    subject: "FYI: v3 mockups are in Figma — no action, just visibility",
    snippet:
      "Sharing the latest v3 dashboard mockups for visibility. No decisions needed from you this week. We'll bring options to next Friday's review.",
  },
  {
    sender: "notifications@linkedin.com",
    senderName: "LinkedIn",
    subject: "You appeared in 9 searches this week",
    snippet:
      "Your profile is trending. See who searched for you. Premium members get full names. Weekly digest.",
  },
  {
    sender: "support@northwind.studio",
    senderName: "Northwind Support",
    subject: "Action required: verify your domain for email routing",
    snippet:
      "To finish setting up email forwarding on your domain, please add the two TXT records below to your DNS within 72 hours. Routing will not start until verified.",
    body:
      "To finish setting up email forwarding on your domain, please add the two TXT records below to your DNS within 72 hours. Routing will not start until verified.\n\nRecord 1: @  TXT  \"v=spf1 include:_spf.northwind.studio ~all\"\nRecord 2: _dmarc TXT \"v=DMARC1; p=none;\"",
  },
  {
    sender: "daily@morningbrew.example",
    senderName: "Morning Brew",
    subject: "The 5 business stories you missed yesterday",
    snippet:
      "Today's brew: a chip war update, a stealth AI startup raising, and a retail earnings surprise. 4-min read. Unsubscribe at the bottom.",
  },
  {
    sender: "diego@makerslab.io",
    senderName: "Diego",
    subject: "re: the open-source release — should we wait?",
    snippet:
      "I think we ship v0.1 next week as planned. If you disagree, say so today; I'd rather not push the launch unilaterally.",
  },
  {
    sender: "no-reply@bank-secure-alert.online",
    senderName: "Bank Secure Alert",
    subject: "Urgent: your account has been suspended. Verify immediately.",
    snippet:
      "We have detected unusual activity. Your account will be suspended in 24h unless you verify your identity. Click here to confirm.",
  },
  {
    sender: "priya@northwind.studio",
    senderName: "Priya Mendes",
    subject: "Quick one — can you swap our 1:1 to 4pm Thursday?",
    snippet:
      "Conflict just popped up for our usual 3pm slot. 4pm work for you? Just need a yes/no so I can update the calendar.",
  },
  {
    sender: "receipts@northwind.studio",
    senderName: "Northwind Receipts",
    subject: "Receipt: $412.00 — Q3 invoicing software renewal",
    snippet:
      "Your annual subscription to Invoicer Pro has been renewed. Amount: $412.00. This is a receipt; no action required.",
  },
  {
    sender: "commits@github.com",
    senderName: "GitHub Commits",
    subject: "reflex: 14 new commits on main since you were away",
    snippet:
      "Diego pushed 14 commits to reflex/main while you were out. Three opened PRs awaiting review. No action required.",
  },
  {
    sender: "yuki@translations.co",
    senderName: "Yuki Tanaka",
    subject: "Your invoice is 23 days overdue — please reply",
    snippet:
      "Following up on invoice #2024-0881, $1,840, due on the 5th. I haven't received payment or a reply. Please let me know the status today.",
    body:
      "Hi — following up on invoice #2024-0881 for $1,840, due on the 5th. I haven't received payment or a reply yet. I'd really appreciate a quick update today so I know where we stand on my end too.\n\nThanks,\nYuki",
  },
];

/**
 * Seed the DB if empty. Each sample is run through the live decider so the
 * distribution stored on disk is a real LLM (or fallback) result — the
 * dashboard shows authentic probabilities, not a static fixture.
 */
export async function seedIfEmpty(): Promise<{ seeded: number }> {
  const count = await db.email.count();
  if (count > 0) return { seeded: 0 };

  let seeded = 0;
  for (const s of SAMPLE_EMAILS) {
    const decision = classifyLocal({
      sender: s.sender,
      senderName: s.senderName,
      subject: s.subject,
      snippet: s.snippet,
      body: s.body,
    });
    const distribution: Distribution = decision.distribution;
    await db.email.create({
      data: {
        gmailId: null,
        sender: s.sender,
        senderName: s.senderName,
        subject: s.subject,
        snippet: s.snippet,
        body: s.body ?? s.snippet,
        category: decision.category,
        attention: decision.attention,
        bucket: decision.bucket,
        confidence: decision.confidence,
        topCandidates: JSON.stringify(decision.topCandidates),
        distribution: JSON.stringify(distribution),
        actionNeeded: decision.actionNeeded,
        fromHuman: decision.fromHuman,
        consequence: decision.consequence,
        churnSignal: decision.churnSignal,
        schemaVersion: 1,
        isSample: true,
        source: "local",
      },
    });
    seeded++;
  }
  return { seeded };
}

export { topCandidates };
