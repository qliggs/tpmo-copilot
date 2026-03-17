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
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-4 rounded-md">
      <svg viewBox="0 0 500 360" className="w-full h-full" fill="none">
        <NeonGlowFilter />
        {/* User Question */}
        <rect x="125" y="8" width="250" height="36" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="32" textAnchor="middle" fill={LABEL_COLOR} fontSize="14" fontFamily="monospace">User Question</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="44" x2="250" y2="66" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,62 250,70 255,62" fill={ACCENT_LINE} />
        </g>

        {/* Step 1 */}
        <rect x="50" y="74" width="400" height="54" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="68" y="96" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Step 1</text>
        <text x="68" y="116" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">Doc Selector — DeepSeek V3 — 27 docs → top 5</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="128" x2="250" y2="150" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,146 250,154 255,146" fill={ACCENT_LINE} />
        </g>

        {/* Step 2 */}
        <rect x="50" y="158" width="400" height="54" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="68" y="180" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Step 2</text>
        <text x="68" y="200" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">Node Selector — Qwen3 30B — 5 docs → top 8</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="212" x2="250" y2="234" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,230 250,238 255,230" fill={ACCENT_LINE} />
        </g>

        {/* Step 3 */}
        <rect x="50" y="242" width="400" height="54" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="68" y="264" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Step 3</text>
        <text x="68" y="284" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">Answer Gen — Claude Sonnet — 8 nodes → answer</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="296" x2="250" y2="318" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,314 250,322 255,314" fill={ACCENT_LINE} />
        </g>

        {/* Response */}
        <rect x="100" y="326" width="300" height="30" rx="6" fill={BOX_FILL} stroke="rgba(226,232,240,0.25)" />
        <text x="250" y="346" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Response + Citations</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagram 2 — The Ingestion Pipeline
// ---------------------------------------------------------------------------

function IngestionDiagram() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-4 rounded-md">
      <svg viewBox="0 0 500 360" className="w-full h-full" fill="none">
        <NeonGlowFilter />
        {/* Obsidian files */}
        <rect x="100" y="10" width="300" height="36" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="34" textAnchor="middle" fill={LABEL_COLOR} fontSize="14" fontFamily="monospace">Obsidian .md files</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="46" x2="250" y2="70" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,66 250,74 255,66" fill={ACCENT_LINE} />
        </g>

        {/* vault-reader */}
        <rect x="60" y="78" width="380" height="54" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="102" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontFamily="monospace">vault-reader.ts</text>
        <text x="250" y="122" textAnchor="middle" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">SHA256 delta detection</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="132" x2="250" y2="156" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,152 250,160 255,152" fill={ACCENT_LINE} />
        </g>

        {/* tree-builder */}
        <rect x="60" y="164" width="380" height="54" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="188" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontFamily="monospace">tree-builder.ts</text>
        <text x="250" y="208" textAnchor="middle" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">AI builds PageIndex JSON tree</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="218" x2="250" y2="242" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,238 250,246 255,238" fill={ACCENT_LINE} />
        </g>

        {/* validate */}
        <rect x="100" y="250" width="300" height="36" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="274" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontFamily="monospace">validate-tree.ts</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="286" x2="250" y2="310" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,306 250,314 255,306" fill={ACCENT_LINE} />
        </g>

        {/* Supabase */}
        <rect x="70" y="318" width="360" height="32" rx="6" fill={BOX_FILL} stroke="rgba(226,232,240,0.25)" />
        <text x="250" y="340" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Supabase — documents + doc_trees</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagram 3 — Dual-Source Routing
// ---------------------------------------------------------------------------

function DualSourceDiagram() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-4 rounded-md">
      <svg viewBox="0 0 500 360" className="w-full h-full" fill="none">
        <NeonGlowFilter />
        {/* User Question */}
        <rect x="125" y="8" width="250" height="36" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="32" textAnchor="middle" fill={LABEL_COLOR} fontSize="14" fontFamily="monospace">User Question</text>

        <g filter="url(#neonGlow)">
          <line x1="250" y1="44" x2="250" y2="68" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,64 250,72 255,64" fill={ACCENT_LINE} />
        </g>

        {/* Mode Detector */}
        <rect x="80" y="76" width="340" height="36" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="250" y="100" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontFamily="monospace">Mode Detector — keyword classifier</text>

        {/* Branch lines */}
        <g filter="url(#neonGlow)">
          <line x1="170" y1="112" x2="170" y2="150" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="330" y1="112" x2="330" y2="150" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="165,146 170,154 175,146" fill={ACCENT_LINE} />
          <polygon points="325,146 330,154 335,146" fill={ACCENT_LINE} />
        </g>

        {/* Mode A */}
        <rect x="40" y="160" width="200" height="70" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="140" y="184" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Mode A — Vault RAG</text>
        <text x="140" y="204" textAnchor="middle" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">3-step pipeline</text>
        <text x="140" y="222" textAnchor="middle" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">Obsidian docs</text>

        {/* Mode B */}
        <rect x="260" y="160" width="200" height="70" rx="6" fill={BOX_FILL} stroke={BOX_STROKE} />
        <text x="360" y="184" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Mode B — Portfolio</text>
        <text x="360" y="204" textAnchor="middle" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">SQL query</text>
        <text x="360" y="222" textAnchor="middle" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">Notion data</text>

        {/* Merge lines */}
        <g filter="url(#neonGlow)">
          <line x1="140" y1="230" x2="140" y2="268" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="360" y1="230" x2="360" y2="268" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="140" y1="268" x2="360" y2="268" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <line x1="250" y1="268" x2="250" y2="296" stroke={ACCENT_LINE} strokeWidth="1.5" />
          <polygon points="245,292 250,300 255,292" fill={ACCENT_LINE} />
        </g>

        {/* Claude */}
        <rect x="70" y="304" width="360" height="40" rx="6" fill={BOX_FILL} stroke="rgba(226,232,240,0.25)" />
        <text x="250" y="330" textAnchor="middle" fill={LABEL_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">Claude Sonnet — Answer Generator</text>
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
    <div className="flex h-full w-full items-center justify-center bg-bg-surface p-4 rounded-md">
      <svg viewBox="0 0 500 320" className="w-full h-full" fill="none">
        {/* Header row */}
        <rect x="8" y="16" width="484" height="32" rx="4" fill="rgba(255,255,255,0.04)" />
        <text x="24" y="38" fill={DIM_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">TASK</text>
        <text x="160" y="38" fill={DIM_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">MODEL</text>
        <text x="310" y="38" fill={DIM_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">PROVIDER</text>
        <text x="430" y="38" fill={DIM_COLOR} fontSize="13" fontWeight="600" fontFamily="monospace">COST</text>

        {/* Data rows */}
        {rows.map((row, i) => {
          const y = 60 + i * 50;
          return (
            <g key={row.task}>
              <rect x="8" y={y} width="484" height="42" rx="4" fill={BOX_FILL} stroke={BOX_STROKE} />
              <text x="24" y={y + 27} fill={LABEL_COLOR} fontSize="13" fontFamily="monospace">{row.task}</text>
              <text x="160" y={y + 27} fill={LABEL_COLOR} fontSize="13" fontFamily="monospace">{row.model}</text>
              <text x="310" y={y + 27} fill={DIM_COLOR} fontSize="13" fontFamily="monospace">{row.provider}</text>
              <text x="430" y={y + 27} fill="rgba(226,232,240,0.8)" fontSize="13" fontWeight="600" fontFamily="monospace">{row.cost}</text>
            </g>
          );
        })}

        {/* Total */}
        <line x1="8" y1="275" x2="492" y2="275" stroke={BOX_STROKE} />
        <text x="310" y="298" fill={DIM_COLOR} fontSize="13" fontFamily="monospace">Total/query</text>
        <text x="430" y="298" fill={LABEL_COLOR} fontSize="15" fontWeight="600" fontFamily="monospace">~$0.01</text>
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
