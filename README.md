# TPMO Copilot

A personal AI assistant that reads years of TPM documentation and live portfolio data, then answers questions in plain English — like having a second brain that knows both your work history and what's happening right now.

**Live:** https://tpmo-copilot.vercel.app

---

## What It Does

Ask it a question in plain English. It reads the right data source, finds the most relevant information, and synthesizes a structured answer with citations.

**Example queries (real outputs):**

> *"What were my biggest accomplishments in the Snowflake migration?"*

Returns a structured breakdown of contribution categories — program architecture, enterprise readiness, failover execution, stakeholder alignment, and post-cutover stabilization — with citations to the exact document sections it pulled from.

> *"How many High priority projects does Endpoint Engineering own?"*

Returns a live table of projects pulled from the Notion Book of Work — current status, size, resources, and quarter — synthesized from the actual portfolio database.

> *"What are 3 projects that would look best to TPM recruiters?"*

Cross-document synthesis pulling from the Projects Portfolio, Resume, and Interview Cheat Sheet simultaneously.

---

## Architecture

### Dual-Source Intelligence

TPMO Copilot reasons over two independent data sources:

| Source | Content | Query Mode |
|---|---|---|
| Obsidian vault (33 docs) | Historical projects, retrospectives, accomplishments, interview prep | Mode A — PageIndex RAG |
| Notion Book of Work (64 projects) | Live portfolio: current status, teams, priorities, resources | Mode B — SQL synthesis |

### Vectorless RAG (PageIndex)

Instead of embedding documents into vectors, an AI builds a **hierarchical JSON tree** representing each document's structure. Retrieval works by reasoning over that structure — no vector database, no embedding costs, no re-indexing.

### 3-Step Query Pipeline (Mode A — Vault)

```
User Question
      ↓
Step 1 — Document Selector       OpenRouter (DeepSeek V3)
  Reads root summaries of all document trees
  Returns top 5 most relevant documents
      ↓
Step 2 — Node Selector           OpenRouter (Qwen3 30B)
  Reads full trees of selected documents
  Returns top 8 most relevant sections
      ↓
Step 3 — Answer Generator        Claude Sonnet
  Reads raw content of selected sections
  Synthesizes structured answer with source citations
      ↓
Response with citations to exact document + section
```

### Dual-Mode Query Routing

```
User Question
      ↓
Mode Detector (keyword classifier, no LLM call)
      │
      ├── Portfolio signals detected? ──► hasPortfolioData() check
      │         │                               │
      │         ├── Records found ──────────► Mode B (SQL → Claude)
      │         └── No records ──────────────► Mode A (RAG pipeline)
      │
      └── No portfolio signals ────────────► Mode A (RAG pipeline)
```

### Hybrid Inference

Each pipeline task routes to the cheapest capable model:

| Task | Model | Provider | Cost |
|---|---|---|---|
| Tree building (ingestion) | DeepSeek Chat V3 | OpenRouter | ~$0.002/doc |
| Step 1 — Doc Selection | DeepSeek Chat V3 | OpenRouter | ~$0.001/query |
| Step 2 — Node Selection | Qwen3 30B A3B | OpenRouter | ~$0.003/query |
| Step 3 — Answer Generation | Claude Sonnet | Anthropic | ~$0.006/query |
| **Total** | | | **~$0.01/query** |

Answer generation stays on Claude Sonnet — quality matters for user-facing output.

### Fallback Chains

Every step has automatic provider fallback:
- Query Steps 1+2: OpenRouter → Anthropic
- Ingestion: OpenRouter → Anthropic (streaming)
- `INFERENCE_MODE=claude-only` reverts to full Anthropic routing (debug mode)

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| AI — Steps 1+2 | OpenRouter (DeepSeek V3, Qwen3 30B) |
| AI — Step 3 | Anthropic Claude (claude-sonnet-4-6) |
| Database | Supabase (PostgreSQL + JSONB) |
| Portfolio Data | Notion REST API |
| Ingestion CLI | TypeScript, tsx, custom vault reader |
| Deployment | Vercel (CI/CD via GitHub) |
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

# Dry run (no DB writes)
npm run ingest -- --file "/path/to/file.md" --dry-run
```

SHA256 hash-based delta detection — unchanged files are skipped automatically. Vault auto-ingests every 8 hours via macOS launchd.

---

## Notion Sync

Portfolio data syncs from Notion via REST API:

- **Manual:** Admin panel → "Sync from Notion Now"
- **Automatic:** Nightly at 6am UTC via Vercel cron

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` |
| `OPENROUTER_DOC_SELECT_MODEL` | `deepseek/deepseek-chat-v3-0324` |
| `OPENROUTER_NODE_SELECT_MODEL` | `qwen/qwen3-30b-a3b` |
| `INFERENCE_MODE` | `hybrid` or `claude-only` |
| `INGEST_SECRET` | Auth token for sync API route |
| `CRON_SECRET` | Auth token for Vercel cron |
| `MAX_DOCS_PER_QUERY` | `5` |
| `MAX_NODES_PER_DOC` | `8` |

---

## Roadmap

| Version | Description | Status |
|---|---|---|
| V0 | Vectorless RAG over Obsidian vault | ✅ Complete |
| V0.5 | Hybrid inference — OpenRouter + Anthropic, 90% cost reduction | ✅ Complete |
| V1 | Notion integration — live portfolio data + dual-mode routing | ✅ Complete |
| V2 | Streaming responses + conversational memory | 🔜 Next |
| V3 | Discord interface + proactive alerts | Planned |

---

## Engineering Notes

**Why vectorless RAG (PageIndex)?** No vector database infrastructure, no embedding costs, no re-embedding on document updates. Retrieval works by reasoning over AI-generated hierarchical summaries rather than cosine similarity.

**Why OpenRouter over direct provider APIs?** Single key, single billing account, 300+ models. A provider outage or pricing change requires one env var update, not a dependency migration.

**Why keep Claude for answer generation?** Steps 1 and 2 are ranking/filtering tasks — structured, deterministic, commodity work. Step 3 is synthesis — the output users judge quality by. The cost savings from routing Steps 1+2 to cheaper models subsidize keeping the best model where it matters.

**Why Notion over a custom database?** Notion already had the Book of Work structured as a proper database. First-class REST API, native editing UI, no data migration required. The integration required an API connection, not a rebuild.

**How does the two-pass fallback work?** If the mode detector classifies a query as "portfolio", the orchestrator first calls `hasPortfolioData()` — a lightweight Supabase count query. If 0 records match, the query falls through to the vault RAG pipeline automatically. This prevents present-tense questions about historical projects from returning empty portfolio results.

---

*Built by Quentin Liggins — Technical Program Manager, LendingTree*  
*GitHub: github.com/qliggs/tpmo-copilot*
