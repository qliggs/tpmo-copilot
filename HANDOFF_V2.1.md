# TPMO Copilot — Handoff Doc: V2 Complete, V2.1 Ready to Build

**Date:** March 2026
**Author:** Quentin Liggins (qliggs)
**Status:** V0 Done | V0.5 Done | V1 Done | V2 Done | V2.1 Ready to Build

---

## 1. Where Everything Stands

### What's Live

- **Production URL:** https://tpmo-copilot.vercel.app
- **Local dev:** `npm run dev` → http://localhost:3000
- **GitHub:** https://github.com/qliggs/tpmo-copilot (branch: `main`)
- **Supabase:** project `tpmo-copilot` (org: quentin-dev, region: West US / Oregon)

### Vault State

- 33 documents indexed in Supabase
- ~1,066 total nodes across all PageIndex trees
- Auto-ingests every 8 hours via macOS launchd (`com.tpmo.obsidian-ingest.plist`)
- Delta detection active — unchanged files skipped on re-ingest

### Portfolio State

- 64 Notion projects synced to Supabase `projects` table
- Nightly sync at 6am UTC via Vercel cron
- Manual sync available at `/admin` → "Sync from Notion Now"

### Validated Queries (All Working in Production)

- "What were my biggest accomplishments in the Snowflake migration?" — Mode A (vault RAG)
- "How many High priority projects does Endpoint Engineering own?" — Mode B (Notion SQL)
- "Tell me more about the first one" — conversational memory (follow-up works)
- "What quarter does that land in?" — memory persists across turns

---

## 2. Full Account & Infrastructure Inventory

### Accounts

| Service | Account | Notes |
|---|---|---|
| Anthropic | API key: tpmo-copilot | Step 3 (answer gen) + ingestion fallback |
| OpenRouter | API key: tpmo-copilot | Steps 1, 2 + ingestion primary |
| Supabase | org: quentin-dev, project: tpmo-copilot | PostgreSQL + JSONB |
| Vercel | team: qliggs-projects, project: tpmo-copilot | Hobby plan, auto-deploy on push |
| GitHub | repo: github.com/qliggs/tpmo-copilot | Public, MIT license |
| Notion | Integration: tpmo-copilot | Book of Work DB connected |
| Ollama | Installed on Mac Mini | qwen2.5:7b pulled — inactive in chain |

### Infrastructure

| Component | Details |
|---|---|
| Hosting | Vercel, auto-deploys on `git push origin main` |
| Runtime | Edge Runtime on `/api/query` (`export const runtime = 'edge'`) |
| Database | Supabase cloud, 6 tables (see schema section) |
| CI/CD | GitHub → Vercel (automatic) |
| Vault ingest | launchd on Mac Mini, every 8 hours |
| Build | Next.js 16 with Turbopack, ~30s build time |

---

## 3. Complete Environment Variables

Set in: `.env.local` (project root), `ingestion/.env`, Vercel dashboard

| Variable | Value / Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API — Step 3 + ingestion fallback |
| `OPENROUTER_API_KEY` | OpenRouter — Steps 1, 2, ingestion primary |
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_BOW_DATABASE_ID` | Book of Work database ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` |
| `OPENROUTER_DOC_SELECT_MODEL` | `deepseek/deepseek-chat-v3-0324` |
| `OPENROUTER_NODE_SELECT_MODEL` | `qwen/qwen3-30b-a3b` |
| `INFERENCE_MODE` | `hybrid` |
| `INGEST_SECRET` | `tpmo-ingest-2026` |
| `CRON_SECRET` | Auth token for Vercel cron |
| `AUTH_SECRET` | NextAuth secret (random hex) |
| `AUTH_URL` | `https://tpmo-copilot.vercel.app` |
| `AUTH_USERNAME` | Login username |
| `AUTH_PASSWORD` | Login password |
| `MEMORY_WINDOW_TURNS` | `10` |
| `MAX_DOCS_PER_QUERY` | `5` |
| `MAX_NODES_PER_DOC` | `8` |

---

## 4. Current Architecture (V2)

### Query Pipeline

```
User question → POST /api/query (Edge Runtime)
  → reads X-Session-ID header
  → getHistory(sessionId) from conversation_history
  → formatHistoryForPrompt() — enriches query with last 10 turns
  → Step 1: document-selector.ts → OpenRouter (DeepSeek V3) → top 5 docs
  → Step 2: node-selector.ts → OpenRouter (Qwen3 30B) → top 8 nodes
  → Step 3: answer-generator.ts → Claude Sonnet (streaming)
  → SSE stream: chunk → sources → done
  → saveMessage(user + assistant) to conversation_history
  → query_log write (after stream closes)
  → Chat UI renders progressively
```

### Mode B (Portfolio) Query Path

```
User question → mode-detector.ts → portfolio signals detected
  → hasPortfolioData() Supabase count query
  → records exist: streamPortfolioAnswer()
    → SQL query against projects table
    → Claude Sonnet synthesizes structured answer (streaming)
  → 0 records: fall through to Mode A (vault RAG)
```

### Ingestion Pipeline

```
npm run ingest -- --vault /path OR launchd every 8h
  → vault-reader.ts (SHA256 delta detection)
  → tree-builder.ts (OpenRouter DeepSeek V3 → Anthropic streaming fallback)
  → validate-tree.ts
  → supabase-client.ts (upsert documents + doc_trees)
```

### Provider Fallback Chains

- Query Steps 1+2: OpenRouter → Anthropic
- Ingestion tree building: OpenRouter → Anthropic (streaming)
- `INFERENCE_MODE=claude-only`: All steps → Anthropic only (V0 behavior, debug)

---

## 5. File Structure (Current, V2)

```
/Users/quentinligginsjr/Claude Code/tpmo-copilot/
├── .env.local
├── vercel.json                             # Nightly cron at 6am UTC
├── middleware.ts                           # Protects /chat, /admin, /dashboard
├── auth.ts                                 # NextAuth v5 config
├── components.json                         # shadcn/ui config
│
├── app/
│   ├── (landing)/
│   │   └── page.tsx                        # Landing page (public)
│   ├── chat/
│   │   └── page.tsx                        # Chat interface (protected)
│   ├── admin/
│   │   └── page.tsx                        # Admin panel (protected)
│   ├── dashboard/
│   │   └── page.tsx                        # Portfolio dashboard (protected)
│   ├── login/
│   │   └── page.tsx                        # Login page (public)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts     # NextAuth API route
│   │   ├── query/route.ts                  # POST /api/query — Edge Runtime
│   │   ├── sync/route.ts                   # POST /api/sync — Notion sync trigger
│   │   └── health/route.ts                 # GET /api/health
│   └── globals.css                         # Graphite + Arctic design tokens
│
├── components/
│   ├── AppNav.tsx                          # Persistent nav — Chat/Dashboard/Admin
│   ├── ChatInterface.tsx                   # Main chat UI, SSE reader, streaming
│   ├── SessionProvider.tsx                 # NextAuth session context wrapper
│   ├── landing/
│   │   ├── Nav.tsx                         # Landing page nav
│   │   ├── Hero.tsx                        # Animated cycling headline
│   │   ├── Features.tsx                    # GlowingEffect feature cards
│   │   ├── HowItWorks.tsx                  # StickyScrollReveal + pipeline SVGs
│   │   └── Footer.tsx
│   └── ui/
│       ├── glowing-effect.tsx              # Aceternity — mouse-tracking glow
│       ├── sticky-scroll-reveal.tsx        # Aceternity — scroll-animated content
│       └── button.tsx                      # shadcn/ui button
│
├── lib/
│   ├── claude.ts                           # Anthropic client, callClaude(), streamClaude()
│   ├── openrouter.ts                       # OpenRouter client (OpenAI-compatible)
│   ├── supabase.ts                         # supabase (anon) + supabaseAdmin (service role)
│   ├── conversation.ts                     # saveMessage(), getHistory(), formatHistoryForPrompt()
│   ├── types.ts                            # Shared TypeScript interfaces
│   ├── utils.ts                            # shadcn/ui utilities
│   └── rag/
│       ├── index.ts                        # runRAGQuery() + streamRAGQuery() orchestrators
│       ├── document-selector.ts            # Step 1 — OpenRouter in hybrid mode
│       ├── node-selector.ts                # Step 2 — OpenRouter in hybrid mode
│       ├── answer-generator.ts             # Step 3 — Claude Sonnet (blocking + streaming)
│       ├── mode-detector.ts                # Keyword classifier — vault vs portfolio
│       └── portfolio-query.ts             # Mode B — SQL synthesis + streaming
│
├── ingestion/
│   ├── .env
│   └── src/
│       ├── index.ts                        # CLI entry point
│       ├── vault-reader.ts                 # SHA256 delta detection
│       ├── tree-builder.ts                 # OpenRouter → Anthropic chain
│       ├── supabase-client.ts
│       ├── ollama-client.ts                # Inactive, preserved for future
│       ├── openrouter-client.ts            # Active primary for ingestion
│       └── utils/
│           ├── markdown-parser.ts
│           └── validate-tree.ts
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql           # documents, doc_trees, query_log
        ├── 002_projects_and_sync_log.sql    # projects, sync_log
        └── 003_conversation_history.sql     # conversation_history
```

---

## 6. Supabase Schema (Current, V2)

```sql
-- documents: one row per vault file
documents (id uuid PK, filepath text UNIQUE, title, content_hash, word_count,
           tags text[], source_type, metadata jsonb, created_at, updated_at)

-- doc_trees: one PageIndex tree per document
doc_trees (id uuid PK, document_id uuid REFERENCES documents,
           tree jsonb, node_count int, max_depth int, created_at, updated_at)

-- query_log: full audit trail
query_log (id uuid PK, query, docs_selected uuid[], nodes_selected text[],
           reasoning_trace, answer, latency_ms int, created_at)

-- projects: Notion Book of Work (synced)
projects (id uuid PK, notion_id text UNIQUE, name, team, priority, status,
          tshirt_size, resources_needed numeric, quarter, theme, notes,
          raw_notion_properties jsonb, last_synced_at, created_at, updated_at)

-- sync_log: Notion sync audit
sync_log (id uuid PK, synced_at, records_added, records_updated,
          records_unchanged, records_total, triggered_by, error)

-- conversation_history: session-scoped memory (V2)
conversation_history (id uuid PK, session_id text NOT NULL,
                      role text CHECK (role IN ('user','assistant')),
                      content text, query_id uuid, created_at)
-- Index: idx_conversation_session ON conversation_history(session_id, created_at)
```

---

## 7. Known Issues / Open Items

| Item | Notes |
|---|---|
| Response latency | 40-160s end-to-end. Streaming masks this for UX but pipeline speed is unchanged. Address in V2.1+ with parallelism or faster models. |
| No streaming on `INFERENCE_MODE=claude-only` | Fallback path returns blocking response. Edge case, low priority. |
| Ollama inactive | qwen2.5:7b produces 0% summaries — unusable for retrieval. Infrastructure wired, model insufficient. May revisit as local models improve. |
| Pre-existing TS warning | Duplicate `resolve` identifier in `ingestion/src/index.ts` — pre-existing, non-blocking. |
| Dashboard data freshness | Portfolio data max 24h stale (nightly cron). Webhook-triggered sync deferred to end of V2.1 after business logic is stable. |
| No drag-reorder on dashboard | Current `/dashboard` table is read-only. Stack ranking / reorder is a V2.1 feature. |

---

## 8. What V2.1 Builds

V2.1 is the **Portfolio Intelligence Dashboard** — merging the work from the standalone `tpmo-dashboard` project into TPMO Copilot with a clean data architecture and the Graphite + Arctic design system.

### Critical Prerequisite (Do First, Before Any Code)

**Rebuild the Notion Engineers Database.** The existing Engineers DB is not structured for reliable capacity modeling. Rebuild with:

| Field | Type | Notes |
|---|---|---|
| Name | Title | Full name |
| Team | Select | Endpoint Engineering, Productivity Apps, Infrastructure, Service Desk, NetOps, TPMO |
| Capacity | Number | FTE fraction (1.0 = full time, 0.5 = part time) |
| Active | Checkbox | Currently on team |
| Notes | Text | Split assignments, contractor status |

Once rebuilt, add `NOTION_ENGINEERS_DATABASE_ID` to all env locations.

### New Env Vars for V2.1

```
NOTION_ENGINEERS_DATABASE_ID=     # Rebuilt engineers DB
```

### New Supabase Tables for V2.1

```sql
-- Migration: 004_engineers.sql
CREATE TABLE engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id text UNIQUE NOT NULL,
  name text NOT NULL,
  team text,
  capacity numeric DEFAULT 1.0,    -- FTE fraction
  active boolean DEFAULT true,
  notes text,
  raw_notion_properties jsonb,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### V2.1 Build Scope

1. Rebuild Notion Engineers DB (manual prerequisite — no code)
2. `004_engineers.sql` migration in Supabase
3. Extend `lib/notion-sync.ts` to sync engineers alongside projects
4. `/dashboard` redesign — modular collapsible panels, Graphite + Arctic
5. Gantt chart component — multiple views (date, initiative, quarter, H1, H2, annual), deliverable-level rows, hover tooltips, drag-to-reorder
6. Capacity heatmap — team load by month vs FTE availability
7. Named Engineers tab — who is allocated to what and at what %
8. Risk signals panel — overallocation, stalled high-priority, on-hold
9. Copilot integration — "who is over-allocated in Q2?" answers from live engineer data
10. (End of V2.1 consideration) Webhook-triggered Notion sync for real-time data

### What NOT to Rebuild from tpmo-dashboard

- `rosterConfig.ts` hardcoded engineers — replace with Supabase from Notion
- Blue color scheme — full Graphite + Arctic
- Non-modular layout — every section should be a collapsible panel
- Settings panel complexity — simplify; keep T-shirt sizes and thresholds only
- Cascade delay propagation engine — too complex, lower priority for V2.1

---

## 9. Key Commands

```bash
# Start local dev server
cd "/Users/quentinligginsjr/Claude Code/tpmo-copilot"
npm run dev

# Ingest full vault
npm run ingest -- --vault "/Users/quentinligginsjr/Obsidian/TPMO/TPMO/TPMO"

# Ingest single file
npm run ingest -- --file "/path/to/file.md"

# Force re-ingest (bypass hash check)
npm run ingest -- --file "/path/to/file.md" --force

# Dry run (no DB writes)
npm run ingest -- --file "/path/to/file.md" --dry-run

# Deploy
git add -A && git commit -m "message" && git push origin main

# Check build
npm run build

# Confirm Ollama (if needed)
curl http://localhost:11434/api/tags
```

---

## 10. Claude Code Session Starter for V2.1

Paste this at the start of a new Claude Code session:

```
I'm building TPMO Copilot V2.1 — Portfolio Intelligence Dashboard.

Project location: /Users/quentinligginsjr/Claude Code/tpmo-copilot
Stack: Next.js 16, TypeScript, Tailwind, Supabase (PostgreSQL + JSONB),
Anthropic Claude API, OpenRouter, Vercel Edge Runtime
GitHub: https://github.com/qliggs/tpmo-copilot
Live URL: https://tpmo-copilot.vercel.app

--- COMPLETED VERSIONS ---
V0: Vectorless RAG over Obsidian vault (33 docs, ~1,066 nodes, PageIndex trees)
V0.5: Hybrid inference — OpenRouter (Steps 1+2) + Claude Sonnet (Step 3), 90% cost reduction
V1: Notion integration — 64 projects synced, dual-mode routing (vault RAG vs portfolio SQL),
    launchd vault auto-ingest every 8 hours
V2: Auth (NextAuth v5), streaming (Edge Runtime SSE), conversational memory
    (Supabase conversation_history), UI/UX redesign (Graphite + Arctic),
    portfolio dashboard (stat cards, team load, risk signals, project table)

--- CURRENT INFRASTRUCTURE ---
Inference routing:
- Step 1 (document-selector.ts) → OpenRouter DeepSeek V3
- Step 2 (node-selector.ts) → OpenRouter Qwen3 30B
- Step 3 (answer-generator.ts) → Claude Sonnet streaming — do NOT change
- Ingestion (tree-builder.ts) → OpenRouter primary, Anthropic streaming fallback
- INFERENCE_MODE=hybrid in all env locations

Auth: NextAuth v5, middleware.ts protects /chat, /admin, /dashboard
Edge Runtime: export const runtime = 'edge' + export const maxDuration = 300
              in app/api/query/route.ts — do NOT remove

Supabase tables: documents, doc_trees, query_log, projects, sync_log, conversation_history

--- V2.1 TASK ---
Build the Portfolio Intelligence Dashboard — merging work from the standalone
tpmo-dashboard project into this codebase.

CRITICAL PREREQUISITE (must be done before any code):
The Notion Engineers DB has been rebuilt with a clean schema:
  Fields: Name (title), Team (select), Capacity (number, FTE fraction),
          Active (checkbox), Notes (text)
  New env var: NOTION_ENGINEERS_DATABASE_ID=[id]
  This must be set in .env.local and Vercel before starting.

What V2.1 needs to build:
1. supabase/migrations/004_engineers.sql — engineers table
2. Extend lib/notion-sync.ts to sync engineers alongside projects
3. /dashboard redesign — modular collapsible panels, full Graphite + Arctic
4. Gantt chart — multiple views, deliverable-level rows, hover tooltips,
   drag-to-reorder by priority
5. Capacity heatmap — team load by month vs FTE availability from engineers table
6. Named Engineers tab — allocation per engineer across quarters
7. Risk signals — overallocation, stalled high-priority, on-hold
8. Copilot integration — capacity questions answered from live engineer data

Design system (Graphite + Arctic):
  --bg-primary: #111318, --bg-secondary: #1A1D24, --bg-tertiary: #21252E
  --accent: #E2E8F0 (ice white), --accent-muted: #94A3B8
  --border: rgba(255,255,255,0.07)
  Semantic: success #10B981, warning #F59E0B, danger #EF4444
  NO blue, NO purple, NO orange.

Start by reading these files before writing anything:
- app/dashboard/page.tsx (current basic dashboard)
- lib/notion-sync.ts (extend for engineers)
- lib/supabase.ts
- middleware.ts
- app/api/query/route.ts (check edge runtime is still present)
```

---

## 11. Roadmap

```
V0   → Obsidian Knowledge RAG (Anthropic only)                   COMPLETE
V0.5 → Hybrid Inference Architecture                             COMPLETE
V1   → Notion Integration + Obsidian Automation                  COMPLETE
V2   → Auth + Streaming + Memory + UI/UX + Dashboard             COMPLETE
V2.1 → Portfolio Intelligence Dashboard (Gantt, Capacity, Eng)   ← BUILD NEXT
V3   → Intelligence Layer (Proactive alerts, cross-source)
V4   → Platform (Discord, Slack, Digest, Multi-User)
```
