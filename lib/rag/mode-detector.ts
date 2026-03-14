// Mode Detector — lightweight classifier for RAG pipeline routing
// Determines whether a query should use:
//   Mode A: Obsidian vault RAG (existing 3-step pipeline)
//   Mode B: Portfolio query (structured project data from Notion)
//
// Returns "portfolio" as a HINT only — the orchestrator must verify
// that matching projects exist before committing to Mode B.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueryMode = "vault" | "portfolio";

// ---------------------------------------------------------------------------
// Constants — strong-signal patterns that suggest portfolio mode
// ---------------------------------------------------------------------------

/** High-confidence: these alone are strong enough to suggest portfolio mode. */
const STRONG_PORTFOLIO_PATTERNS: readonly RegExp[] = [
  /\b(this\s+quarter|next\s+quarter|current\s+quarter)\b/i,
  /\bQ[1-4]\s+\d{4}\b/i,
  /\bbook\s+of\s+work\b/i,
  /\bportfolio\s+(status|overview|summary|report|health)\b/i,
  /\b(current|active|ongoing)\s+(projects?|initiatives?|portfolio)\b/i,
  /\bcurrent\s+sprint\b/i,
  /\bright\s+now\b/i,
  /\bhow\s+many\s+(projects?|initiatives?)\b/i,
  /\b(at\s+risk|behind\s+schedule|slipping|overdue)\s+(projects?|initiatives?)\b/i,
  /\b(headcount|staffing|allocation)\s+(across|for|by)\b/i,
  /\bcapacity\s+(report|overview|this|next|across)\b/i,
];

/** Medium-confidence: require a portfolio-context modifier to trigger. */
const PORTFOLIO_SUBJECT_PATTERNS: readonly RegExp[] = [
  /\bproject\s+(status|list|portfolio|overview|summary)\b/i,
  /\bpriority\s+(projects?|initiatives?|list)\b/i,
  /\bwhich\s+(projects?|initiatives?|teams?)\s+(are|is|have)\b/i,
  /\b(t-?shirt|size)\s+(breakdown|distribution|of\s+projects?)\b/i,
  /\bwhat\s+(is|are)\s+\w+\s+team\s+working\s+on\b/i,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a user query as vault (Mode A) or portfolio (Mode B).
 * Uses keyword pattern matching — no LLM call needed.
 *
 * IMPORTANT: "portfolio" is a hint. The orchestrator verifies against
 * Supabase and falls back to vault if no matching projects are found.
 */
export function detectQueryMode(question: string): QueryMode {
  for (const pattern of STRONG_PORTFOLIO_PATTERNS) {
    if (pattern.test(question)) {
      return "portfolio";
    }
  }

  for (const pattern of PORTFOLIO_SUBJECT_PATTERNS) {
    if (pattern.test(question)) {
      return "portfolio";
    }
  }

  return "vault";
}
