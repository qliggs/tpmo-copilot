# TPMO Copilot

A personal AI assistant that reads years of TPM documentation and live portfolio data, then answers questions in plain English — like having a second brain that knows both your work history and what's happening right now.

**Live:** [https://tpmo-copilot.vercel.app](https://tpmo-copilot.vercel.app)

---

## What It Does

Ask it a question in plain English. It reads the right data source, finds the most relevant information, and synthesizes a structured answer with citations back to the exact source.

**Example queries (real outputs):**

> _"What were my biggest accomplishments in the Snowflake migration?"_

Returns a structured breakdown across program delivery and technical outcomes — program architecture, enterprise readiness orchestration, failover night execution, stakeholder alignment, post-cutover stabilization — with citations pointing to the exact document sections it pulled from.

> _"How many High priority projects does Endpoint Engineering own? And what are their deliverables?"_

Returns a live structured table from the Notion Book of Work — initiative, status, size, resources, quarter, and full deliverable text — synthesized from the actual portfolio database. 17.8 seconds.

> _"Tell me more about the first one."_

With conversational memory active, follow-up questions build on prior context automatically. No repeating yourself.

---

## Architecture

### Dual-Source Intelligence

TPMO Copilot reasons over two independent data sources:

| Source | Content | Query Mode |
|---|---|---|
| Obsidian vault (33 docs, ~1,066 nodes) | Historical projects, retrospectives, accomplishments, interview prep | Mode A — PageIndex RAG |
| Notion Book of Work (64 projects) | Live portfolio: current status, teams, priorities, resources | Mode B — SQL synthesis |

### Vectorless RAG (PageIndex)

Instead of embedding documents into vectors, an AI builds a **hierarchical JSON tree** representing each document's structure. Retrieval works by reasoning over that tree — no vector database, no embedding costs, no re-indexing.

```
Document
  └── Root node (summary of entire document)
       ├── Section node (summary of major section)
       │    ├── Subsection node (summary + raw_text)
       │    └── Subsection node (summary + raw_text)
       └── Section node
            └── Subsection node (summary + raw_text)
```

Trees are built once during ingestion and reused for every query. The query pipeline only reads `raw_text` from the final selected nodes — everything before that is reasoning over summaries.

### 3-Step Query Pipeline (Mode A — Vault RAG)

```
User Question
      ↓
Step 1 — Document Selector        OpenRouter (DeepSeek V3)
  Reads root summaries of all 33 document trees (~1 sentence each)
  Returns top 5 most relevant document IDs
      ↓
Step 2 — Node Selector            OpenRouter (Qwen3 30B)
  Reads full trees of 5 selected documents
  Returns top 8 most relevant node IDs
      ↓
Step 3 — Answer Generator         Claude Sonnet (streaming)
  Reads raw_text of 8 selected nodes
  Synthesizes structured answer with source citations
  Streams token-by-token to the UI
      ↓
Response + Citations + Reasoning Trace
```

### Dual-Mode Query Routing

```
User Question
      ↓
Mode Detector (keyword classifier — no LLM call, no added latency)
      │
      ├── Portfolio signals detected?
      │         │
      │         ├── hasPortfolioData() → records exist → Mode B (SQL → Claude)
      │         └── hasPortfolioData() → 0 results → Mode A (RAG pipeline)
      │
      └── No portfolio signals → Mode A (RAG pipeline)
```

The two-pass fallback prevents present-tense questions about historical projects ("What's the status of the Snowflake migration?") from returning empty portfolio results — it checks the database first, then falls through to vault RAG if nothing matches.

### Hybrid Inference

Each pipeline task routes to the cheapest capable model:

| Task | Model | Provider | Cost |
|---|---|---|---|
| Tree building (ingestion) | DeepSeek Chat V3 | OpenRouter | ~$0.002/doc |
| Step 1 — Doc Selection | DeepSeek Chat V3 | OpenRouter | ~$0.001/query |
| Step 2 — Node Selection | Qwen3 30B A3B | OpenRouter | ~$0.003/query |
| Step 3 — Answer Generation | Claude Sonnet | Anthropic | ~$0.006/query |
| **Total** | | | **~$0.01/query** |

Answer generation stays on Claude Sonnet — quality matters for the user-facing output. The savings on Steps 1+2 subsidize keeping the best model where it counts.

**Fallback chains (automatic, no user action required):**
- Query Steps 1+2: OpenRouter → Anthropic
- Ingestion: OpenRouter → Anthropic (streaming)
- `INFERENCE_MODE=claude-only` reverts all steps to Anthropic (debug mode)

### Streaming (V2)

The answer generator streams token-by-token via Server-Sent Events. The API route runs on Vercel Edge Runtime to bypass the 10-second serverless timeout.

```
Steps 1+2 complete (blocking, ~20-30s)
      ↓
Typing indicator appears in UI
      ↓
Step 3 begins streaming
      ↓
First tokens arrive in UI (~30-40s from query submission)
      ↓
Answer fills in progressively
      ↓
Sources + latency appear on stream close
```

SSE wire format:
```
data: {"type":"chunk","text":"The "}
data: {"type":"chunk","text":"Snowflake "}
data: {"type":"sources","sources":[...]}
data: {"type":"done","latencyMs":48000,"reasoning":"..."}
```

### Conversational Memory (V2)

Session-scoped history stored in Supabase. Every query and response is written to `conversation_history`. The last 10 turns are passed as context on each new query.

```
Turn 1: "What projects does Endpoint Engineering own?" → answer saved
Turn 2: "Tell me more about the first one"
  → getHistory(sessionId) fetches last 10 turns
  → formatHistoryForPrompt() builds context block
  → enriched query sent to all 3 pipeline steps
  → answer correctly references Employee Empowerment
```

Session IDs are generated client-side (`crypto.randomUUID()`) and stored in React state. Sessions reset on page refresh — intentional, keeps sessions clean.

### Authentication (V2)

NextAuth v5 with credentials provider. Single-user, hardcoded credentials via environment variables.

- `/` (landing page) — public
- `/login` — public
- `/chat` — protected
- `/admin` — protected
- `/dashboard` — protected
- `/api/query` — unchanged (existing auth)
- `/api/sync` — unchanged (INGEST_SECRET header)

Login uses `window.location.href` for hard navigation post-auth to avoid a middleware cookie race condition where `router.push()` soft navigation arrives at the edge before the session cookie is visible.

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| UI Components | Aceternity (GlowingEffect, StickyScrollReveal), shadcn/ui |
| Auth | NextAuth v5 (credentials provider, JWT sessions) |
| AI — Steps 1+2 | OpenRouter (DeepSeek V3, Qwen3 30B) |
| AI — Step 3 | Anthropic Claude (claude-sonnet-4-6), streaming |
| Database | Supabase (PostgreSQL + JSONB) |
| Portfolio Data | Notion REST API |
| Ingestion CLI | TypeScript, tsx, custom vault reader |
| Deployment | Vercel Edge Runtime, CI/CD via GitHub |
| Knowledge Source | Obsidian markdown vault (33 docs, ~1,066 nodes) |
| Portfolio Source | Notion Book of Work (64 projects) |

---

## Ingestion Pipeline

A CLI tool processes the Obsidian vault and builds PageIndex trees:

```bash
# Ingest full vault
npm run ingest -- --vault "/path/to/vault"

# Single file
npm run ingest -- --file "/path/to/file.md"

# Force re-ingest (bypass hash check)
npm run ingest -- --file "/path/to/file.md" --force

# Dry run (no DB writes)
npm run ingest -- --file "/path/to/file.md" --dry-run
```

SHA256 hash-based delta detection — unchanged files are skipped automatically. The vault auto-ingests every 8 hours via macOS launchd (`com.tpmo.obsidian-ingest.plist`).

---

## Notion Sync

Portfolio data syncs from Notion via REST API:

- **Manual:** Admin panel (`/admin`) → "Sync from Notion Now"
- **Automatic:** Nightly at 6am UTC via Vercel cron (`vercel.json`)

---

## Supabase Schema

```sql
-- Vault documents (one row per indexed .md file)
documents (id, filepath, title, content_hash, word_count, tags, source_type, metadata, created_at, updated_at)

-- PageIndex trees (one row per document, full hierarchical JSON)
doc_trees (id, document_id, tree jsonb, node_count, max_depth, created_at, updated_at)

-- Query audit trail
query_log (id, query, docs_selected, nodes_selected, reasoning_trace, answer, latency_ms, created_at)

-- Notion Book of Work projects
projects (id, notion_id, name, team, priority, status, tshirt_size, resources_needed,
          quarter, theme, notes, raw_notion_properties jsonb, last_synced_at, created_at, updated_at)

-- Notion sync audit trail
sync_log (id, synced_at, records_added, records_updated, records_unchanged, records_total, triggered_by, error)

-- Conversational memory (V2)
conversation_history (id, session_id, role, content, query_id, created_at)
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API (Step 3 + ingestion fallback) |
| `OPENROUTER_API_KEY` | OpenRouter (Steps 1, 2, ingestion primary) |
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_BOW_DATABASE_ID` | Book of Work database ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side writes) |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` |
| `OPENROUTER_DOC_SELECT_MODEL` | `deepseek/deepseek-chat-v3-0324` |
| `OPENROUTER_NODE_SELECT_MODEL` | `qwen/qwen3-30b-a3b` |
| `INFERENCE_MODE` | `hybrid` or `claude-only` |
| `INGEST_SECRET` | Auth token for `/api/sync` route |
| `CRON_SECRET` | Auth token for Vercel cron |
| `AUTH_SECRET` | NextAuth secret (random hex, `openssl rand -hex 32`) |
| `AUTH_URL` | `https://tpmo-copilot.vercel.app` |
| `AUTH_USERNAME` | Login username |
| `AUTH_PASSWORD` | Login password |
| `MEMORY_WINDOW_TURNS` | `10` (conversation history depth) |
| `MAX_DOCS_PER_QUERY` | `5` |
| `MAX_NODES_PER_DOC` | `8` |

---

## Roadmap

| Version | Description | Status |
|---|---|---|
| V0 | Vectorless RAG over Obsidian vault (Anthropic only) | ✅ Complete |
| V0.5 | Hybrid inference — OpenRouter + Anthropic, 90% cost reduction | ✅ Complete |
| V1 | Notion integration — live portfolio data, dual-mode routing, launchd automation | ✅ Complete |
| V2 | Auth, streaming, conversational memory, UI/UX redesign, portfolio dashboard | ✅ Complete |
| V2.1 | Portfolio Intelligence Dashboard — Gantt, capacity, engineer tracking | 🔜 Next |
| V3 | Intelligence layer — proactive alerts, cross-source synthesis, richer data |Planned |
| V4 | Platform — Discord, Slack, digest, multi-user | Planned |

---

## Engineering Notes

**Why vectorless RAG (PageIndex)?** No vector database infrastructure, no embedding costs, no re-embedding on document updates. Retrieval works by reasoning over AI-generated hierarchical summaries rather than cosine similarity. Trees are built once and reused indefinitely.

**Why OpenRouter over direct provider APIs?** Single key, single billing account, 300+ models. A provider outage or pricing change requires one env var update, not a dependency migration. The OpenAI-compatible interface means client code is identical across providers.

**Why keep Claude for answer generation?** Steps 1 and 2 are ranking and filtering tasks — structured, deterministic, commodity work. Step 3 is synthesis — the output users judge quality by. The cost savings from routing Steps 1+2 to cheaper models (~$0.004/query) subsidize keeping the best model where it matters.

**Why Edge Runtime for streaming?** Vercel Hobby plan has a 10-second timeout on serverless functions. The query pipeline takes 40-160 seconds. Edge Runtime with `maxDuration: 300` is the only way to stream long responses without the connection being cut.

**Why `window.location.href` instead of `router.push()` for login redirect?** Next.js App Router's `router.push()` performs a soft client-side navigation. The middleware runs in the edge runtime where the just-set session cookie may not yet be visible, causing a silent redirect back to `/login`. Hard navigation with `window.location.href` sends a full HTTP request with the cookie included, so middleware sees it correctly.

**Why Notion over a custom database for portfolio data?** Notion already had the Book of Work structured as a proper database with a first-class REST API. No data migration required, no custom editing UI to build. The integration is a sync job, not a rebuild.

---

_Built by Quentin Liggins — Technical Program Manager, LendingTree_
_GitHub: github.com/qliggs/tpmo-copilot_
