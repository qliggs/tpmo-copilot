// Mode Detector — lightweight classifier for RAG pipeline routing
// Determines whether a query should use:
//   Mode A: Obsidian vault RAG (existing 3-step pipeline)
//   Mode B: Portfolio query (structured project data from Notion)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueryMode = "vault" | "portfolio";

// ---------------------------------------------------------------------------
// Constants — keyword patterns that signal portfolio mode
// ---------------------------------------------------------------------------

const PORTFOLIO_PATTERNS: readonly RegExp[] = [
  // Status/progress queries
  /\b(current|active|ongoing)\s+(status|state|progress|projects?)\b/i,
  /\bstatus\s+(of|update|report|overview)\b/i,
  /\bproject\s+(status|list|portfolio|overview|summary)\b/i,

  // Capacity/resource queries
  /\b(capacity|resources?|headcount|staffing|allocation)\b/i,
  /\bhow\s+many\s+(projects?|initiatives?|resources?)\b/i,

  // Risk/timeline queries
  /\b(at\s+risk|behind\s+schedule|delayed|slipping|overdue)\b/i,
  /\b(timeline|deadline|end\s+date|start\s+date|due\s+date)\b/i,

  // Quarterly/planning queries
  /\b(this\s+quarter|next\s+quarter|Q[1-4])\b/i,
  /\bbook\s+of\s+work\b/i,
  /\bportfolio\b/i,

  // Team/priority queries about current work
  /\bwhat\s+(is|are)\s+\w+\s+(team|working\s+on)\b/i,
  /\bwhich\s+(projects?|initiatives?|teams?)\b/i,
  /\bpriority\s+(projects?|initiatives?|list)\b/i,

  // Size/t-shirt queries
  /\b(t-?shirt|size|small|medium|large|xl)\s+(projects?|initiatives?)\b/i,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a user query as vault (Mode A) or portfolio (Mode B).
 * Uses keyword pattern matching — no LLM call needed.
 */
export function detectQueryMode(question: string): QueryMode {
  for (const pattern of PORTFOLIO_PATTERNS) {
    if (pattern.test(question)) {
      return "portfolio";
    }
  }
  return "vault";
}
