# Reflex

> Your inbox, pre-read in 33ms. A local-first email triage engine with Apple-style UI, full probability distributions, calibrated confidence, and $0 marginal cost.

## What it does

Reflex reads every email with a decision model, sorts it into 5 attention buckets (NOW / TODAY / WEEK / ARCHIVE / REVIEW), escalates only the uncertain ~10% to a small LLM, and gets better from every correction you make.

## Innovations

1. **Decision-first** — 10 decisions per 1 generation. Fast, free, local.
2. **Radical transparency** — every email shows its full 8-category probability distribution.
3. **Correction flywheel** — every "wrong bucket" correction trains the model.
4. **Calibration as a feature** — live ECE metric, threshold slider backed by real math.
5. **Gmail labels as the free mobile UI** — write triage back as labels.
6. **Negative-marginal-cost scaling** — classifying 10 or 10,000 emails costs the same.

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York) + custom glass design system
- **Database**: Prisma ORM + SQLite
- **State**: Zustand (client) + TanStack Query (server)
- **AI**: z-ai-web-dev-sdk (LLM escalator + digest generation)
- **Email ingestion**: IMAP via imapflow + mailparser
- **Animations**: Framer Motion (Apple spring physics)

## Getting started

```bash
bun install
cp .env.example .env
bun run db:push
bun run dev
```

Open http://localhost:3000

## Connect your mailbox

1. Click "Connect your mail" in the top bar.
2. Pick your provider (Gmail / Outlook / Fastmail / Yahoo / iCloud / Custom).
3. Use an app-specific password (your regular password won't work over IMAP).
4. Your password stays in server memory only — never written to disk.

## License

MIT
