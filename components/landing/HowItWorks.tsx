"use client";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

// ---------------------------------------------------------------------------
// Shared SVG styling constants
// ---------------------------------------------------------------------------

const BOX_FILL = "rgba(255,255,255,0.06)";
const BOX_STROKE = "rgba(255,255,255,0.12)";
const LABEL_COLOR = "#F2F2F4";
const DIM_COLOR = "#7A7A85";
const ACCENT_LINE = "rgba(232, 65, 122, 0.6)";

// Shared SVG glow filter for arrows/connectors
function NeonGlowFilter() {
  return (
    <defs>
      <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feFlood floodColor="#E8417A" floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Diagram 1 — The Query Pipeline
// ---------------------------------------------------------------------------

function QueryPipelineDiagram() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-3 rounded-md">
      <svg viewBox="0 0 280 220" className="w-full h-full" fill="none">
        <NeonGlowFilter />
        {/* User Question */}
        <rect x="70" y="4" width="140" height="26" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="21" textAnchor="middle" fill={LABEL_COLOR} fontSize="9" fontFamily="monospace">User Question</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="30" x2="140" y2="42" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,40 140,46 144,40" fill={ACCENT_LINE} />
        </g>

        {/* Step 1 */}
        <rect x="20" y="48" width="240" height="32" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="30" y="62" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Step 1</text>
        <text x="30" y="74" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">Doc Selector — DeepSeek V3 — 27 docs → top 5</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="80" x2="140" y2="92" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,90 140,96 144,90" fill={ACCENT_LINE} />
        </g>

        {/* Step 2 */}
        <rect x="20" y="98" width="240" height="32" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="30" y="112" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Step 2</text>
        <text x="30" y="124" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">Node Selector — Qwen3 30B — 5 docs → top 8 nodes</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="130" x2="140" y2="142" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,140 140,146 144,140" fill={ACCENT_LINE} />
        </g>

        {/* Step 3 */}
        <rect x="20" y="148" width="240" height="32" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="30" y="162" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Step 3</text>
        <text x="30" y="174" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">Answer Gen — Claude Sonnet — 8 nodes → answer</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="180" x2="140" y2="192" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,190 140,196 144,190" fill={ACCENT_LINE} />
        </g>

        {/* Response */}
        <rect x="60" y="198" width="160" height="20" rx="4" fill={BOX_FILL} stroke="rgba(226,232,240,0.25)" />
        <text x="140" y="212" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Response + Citations</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagram 2 — The Ingestion Pipeline
// ---------------------------------------------------------------------------

function IngestionDiagram() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-3 rounded-md">
      <svg viewBox="0 0 280 220" className="w-full h-full" fill="none">
        <NeonGlowFilter />
        {/* Obsidian files */}
        <rect x="60" y="6" width="160" height="26" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="23" textAnchor="middle" fill={LABEL_COLOR} fontSize="9" fontFamily="monospace">Obsidian .md files</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="32" x2="140" y2="46" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,44 140,50 144,44" fill={ACCENT_LINE} />
        </g>

        {/* vault-reader */}
        <rect x="30" y="52" width="220" height="30" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="66" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontFamily="monospace">vault-reader.ts</text>
        <text x="140" y="77" textAnchor="middle" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">SHA256 delta detection</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="82" x2="140" y2="96" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,94 140,100 144,94" fill={ACCENT_LINE} />
        </g>

        {/* tree-builder */}
        <rect x="30" y="102" width="220" height="30" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="116" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontFamily="monospace">tree-builder.ts</text>
        <text x="140" y="127" textAnchor="middle" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">AI builds PageIndex JSON tree</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="132" x2="140" y2="146" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,144 140,150 144,144" fill={ACCENT_LINE} />
        </g>

        {/* validate */}
        <rect x="60" y="152" width="160" height="26" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="169" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontFamily="monospace">validate-tree.ts</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="178" x2="140" y2="192" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,190 140,196 144,190" fill={ACCENT_LINE} />
        </g>

        {/* Supabase */}
        <rect x="40" y="198" width="200" height="20" rx="4" fill={BOX_FILL} stroke="rgba(226,232,240,0.25)" />
        <text x="140" y="212" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Supabase — documents + doc_trees</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagram 3 — Dual-Source Routing
// ---------------------------------------------------------------------------

function DualSourceDiagram() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-3 rounded-md">
      <svg viewBox="0 0 280 220" className="w-full h-full" fill="none">
        <NeonGlowFilter />
        {/* User Question */}
        <rect x="70" y="4" width="140" height="26" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="21" textAnchor="middle" fill={LABEL_COLOR} fontSize="9" fontFamily="monospace">User Question</text>

        <g filter="url(#neonGlow)">
          <line x1="140" y1="30" x2="140" y2="44" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,42 140,48 144,42" fill={ACCENT_LINE} />
        </g>

        {/* Mode Detector */}
        <rect x="50" y="50" width="180" height="26" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="65" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontFamily="monospace">Mode Detector — keyword classifier</text>

        {/* Branch lines */}
        <g filter="url(#neonGlow)">
          <line x1="100" y1="76" x2="100" y2="100" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="180" y1="76" x2="180" y2="100" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="96,98 100,104 104,98" fill={ACCENT_LINE} />
          <polygon points="176,98 180,104 184,98" fill={ACCENT_LINE} />
        </g>

        {/* Mode A */}
        <rect x="20" y="106" width="120" height="44" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="80" y="122" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Mode A — Vault RAG</text>
        <text x="80" y="134" textAnchor="middle" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">3-step pipeline</text>
        <text x="80" y="144" textAnchor="middle" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">Obsidian docs</text>

        {/* Mode B */}
        <rect x="150" y="106" width="120" height="44" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="210" y="122" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Mode B — Portfolio</text>
        <text x="210" y="134" textAnchor="middle" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">SQL query</text>
        <text x="210" y="144" textAnchor="middle" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">Notion data</text>

        {/* Merge lines */}
        <g filter="url(#neonGlow)">
          <line x1="80" y1="150" x2="80" y2="170" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="210" y1="150" x2="210" y2="170" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="80" y1="170" x2="210" y2="170" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="140" y1="170" x2="140" y2="184" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="136,182 140,188 144,182" fill={ACCENT_LINE} />
        </g>

        {/* Claude */}
        <rect x="40" y="190" width="200" height="26" rx="4" fill={BOX_FILL} stroke="rgba(226,232,240,0.25)" />
        <text x="140" y="207" textAnchor="middle" fill={LABEL_COLOR} fontSize="8" fontWeight="600" fontFamily="monospace">Claude Sonnet — Answer Generator</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagram 4 — Hybrid Inference Routing (table)
// ---------------------------------------------------------------------------

function InferenceTableDiagram() {
  const rows = [
    { task: "Tree Building", model: "DeepSeek V3", provider: "OpenRouter", cost: "$0.002/doc" },
    { task: "Doc Selection", model: "DeepSeek V3", provider: "OpenRouter", cost: "$0.001/q" },
    { task: "Node Select", model: "Qwen3 30B", provider: "OpenRouter", cost: "$0.003/q" },
    { task: "Answer Gen", model: "Claude Sonnet", provider: "Anthropic", cost: "$0.006/q" },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-3 rounded-md">
      <svg viewBox="0 0 280 200" className="w-full h-full" fill="none">
        {/* Header row */}
        <rect x="4" y="10" width="272" height="22" rx="3" fill="rgba(255,255,255,0.04)" />
        <text x="14" y="25" fill={DIM_COLOR} fontSize="7" fontWeight="600" fontFamily="monospace">TASK</text>
        <text x="90" y="25" fill={DIM_COLOR} fontSize="7" fontWeight="600" fontFamily="monospace">MODEL</text>
        <text x="175" y="25" fill={DIM_COLOR} fontSize="7" fontWeight="600" fontFamily="monospace">PROVIDER</text>
        <text x="245" y="25" fill={DIM_COLOR} fontSize="7" fontWeight="600" fontFamily="monospace">COST</text>

        {/* Data rows */}
        {rows.map((row, i) => {
          const y = 42 + i * 36;
          return (
            <g key={row.task}>
              <rect x="4" y={y} width="272" height="30" rx="3" fill={BOX_FILL} stroke={BOX_STROKE} />
              <text x="14" y={y + 19} fill={LABEL_COLOR} fontSize="8" fontFamily="monospace">{row.task}</text>
              <text x="90" y={y + 19} fill={LABEL_COLOR} fontSize="8" fontFamily="monospace">{row.model}</text>
              <text x="175" y={y + 19} fill={DIM_COLOR} fontSize="7" fontFamily="monospace">{row.provider}</text>
              <text x="245" y={y + 19} fill="rgba(226,232,240,0.8)" fontSize="8" fontWeight="600" fontFamily="monospace">{row.cost}</text>
            </g>
          );
        })}

        {/* Total */}
        <line x1="4" y1="190" x2="276" y2="190" stroke={BOX_STROKE} />
        <text x="175" y="204" fill={DIM_COLOR} fontSize="7" fontFamily="monospace">Total/query</text>
        <text x="245" y="204" fill={LABEL_COLOR} fontSize="9" fontWeight="600" fontFamily="monospace">~$0.01</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline step content for StickyScroll
// ---------------------------------------------------------------------------

const PIPELINE_SECTIONS = [
  {
    title: "3 steps. Narrowing precision.",
    description:
      "Every query flows through document selection, node selection, then answer generation. Each step narrows the context window so the final answer is grounded in the most relevant 8 content blocks — not entire documents.",
    content: <QueryPipelineDiagram />,
  },
  {
    title: "Documents become structured trees.",
    description:
      "The ingestion CLI walks your Obsidian vault, computes SHA256 hashes for delta detection, and calls an AI to build a PageIndex tree for each document. Trees are hierarchical JSON — root summary, section nodes, leaf content blocks. Built once, queried forever.",
    content: <IngestionDiagram />,
  },
  {
    title: "Vault history or live portfolio — automatically.",
    description:
      "A keyword classifier detects whether a question is about past projects (vault RAG) or current portfolio state (Notion SQL). A two-pass fallback ensures questions about historical projects never return empty portfolio results.",
    content: <DualSourceDiagram />,
  },
  {
    title: "Right model for each task.",
    description:
      "Not every task needs frontier model quality. Selection steps use fast, cheap models. Synthesis stays on Claude. Automatic fallback chains mean the system degrades gracefully if any provider is unavailable.",
    content: <InferenceTableDiagram />,
  },
];

// ---------------------------------------------------------------------------
// Section labels for the left-side context
// ---------------------------------------------------------------------------

const SECTION_LABELS = [
  "The Query Pipeline",
  "The Ingestion Pipeline",
  "Dual-Source Routing",
  "Hybrid Inference Routing",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <p className="font-mono text-sm tracking-widest text-text-muted uppercase">
            How It Works
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Under the hood
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-muted">
            Four architectural decisions that make TPMO Copilot fast, cheap,
            and accurate.
          </p>
        </div>

        {/* Section labels above the scroll */}
        <div className="hidden lg:flex gap-2 mb-4 justify-center">
          {SECTION_LABELS.map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/[0.07] px-3 py-1 font-mono text-[10px] text-text-muted"
            >
              {label}
            </span>
          ))}
        </div>

        <StickyScroll content={PIPELINE_SECTIONS} />
      </div>
    </section>
  );
}
