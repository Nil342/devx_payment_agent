# AP Agent — AI-Powered Accounts Payable

An AI agent system for enterprise AP teams that automates invoice risk assessment, vendor intelligence, exception tracking, and audit trails using Groq LLM agents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from $PORT)
- `pnpm --filter @workspace/ap-agent run dev` — run the frontend (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `GROQ_API_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Recharts, Wouter
- API: Express 5 at `/api`
- DB: PostgreSQL + Drizzle ORM
- AI: Groq SDK (llama-3.3-70b-versatile) — 6 specialized agents
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — DB schema (vendors, invoices, exceptions, decisions, memory_events, settings)
- `artifacts/api-server/src/agents/` — AI agents (ocr, memory, risk, routing, explanation, orchestrator)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/ap-agent/src/pages/` — React pages (dashboard, invoices, vendors, exceptions, memory, decisions, settings)
- `artifacts/ap-agent/src/index.css` — Theme (white glassmorphism, blue primary)

## Architecture decisions

- Groq agents are chained: OCR → Memory fetch → Risk → Routing → Explanation → Memory write
- All amounts stored as numeric strings in DB to avoid float precision issues
- Invoice analysis is on-demand (POST /invoices/:id/analyze) — not auto-run on creation
- Seed data via executeSql (not pnpm run seed) because @workspace/db can't be resolved via npx tsx from the scripts package
- Trust scores and risk scores are 0-100 integers; dispute rates are percentages

## Product

- **Dashboard**: stats overview (28 invoices, ₹85L total), risk distribution chart, recent activity, top vendors
- **Invoice Inbox**: filterable list with status/risk/search; click to open detail with full AI analysis
- **Vendor Intelligence**: trust scores (38–94), dispute rates, invoice history, AI intelligence summaries
- **Exception Log**: 10 seeded exceptions (tax mismatches, duplicates, disputes) with severity and resolution status
- **Memory Explorer**: 18 AI memory events with semantic search via Groq
- **Decision Audit**: 8 seeded AI decisions with action, confidence %, and reasoning
- **Settings**: approval mode, thresholds (auto-approve, manager review, CFO review), notifications

## Gotchas

- Seed data loaded directly via executeSql — see `.agents/memory/` for context
- The `scripts` package cannot resolve `@workspace/db` via npx tsx; use a seed route or executeSql instead
- API server binds to $PORT (assigned by workflow), not hardcoded 5000

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
