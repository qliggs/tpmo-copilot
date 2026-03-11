// Document Selector — Stage 1 of the RAG pipeline
// Fetches a lightweight catalog of all documents and their top-level tree
// summaries, then asks Claude to select the most relevant documents.

import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude } from "@/lib/claude";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectedDocument {
  readonly document_id: string;
  readonly filename: string;
  readonly reason: string;
}

export interface DocumentSelectionResult {
  readonly selected: readonly SelectedDocument[];
  readonly thinking: string;
}

interface CatalogEntry {
  readonly document_id: string;
  readonly filename: string;
  readonly title: string;
  readonly summary: string;
  readonly top_nodes: readonly { title: string; summary: string }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DOCS = parseInt(process.env.MAX_DOCS_PER_QUERY ?? "5", 10);

const SYSTEM_PROMPT = `You are a document navigator. Given a user's question and a catalog of available documents (each with a title and high-level summary), identify which 1-3 documents are most likely to contain the answer.

Return JSON only: { "selected": [{ "document_id": "string", "filename": "string", "reason": "string" }], "thinking": "string" }

Rules:
- Select 1-3 documents maximum
- Prefer documents whose summaries mention specific entities, metrics, or topics from the question
- The "thinking" field should explain your reasoning briefly
- Return ONLY valid JSON. No markdown fences.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip raw_text and deep children from tree nodes, keeping only top-level summaries. */
function extractTopLevelSummaries(
  treeJson: Record<string, unknown>,
): readonly { title: string; summary: string }[] {
  const nodes = treeJson.nodes as readonly Record<string, unknown>[] | undefined;
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node) => ({
    title: String(node.title ?? ""),
    summary: String(node.summary ?? ""),
  }));
}

/**
 * Parse a JSON response from Claude, stripping markdown fences if present.
 */
function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stage 1: Select which documents are relevant to the question.
 * Builds a lightweight catalog from documents + top-level tree summaries,
 * then asks Claude to pick the best matches.
 */
export async function selectDocuments(
  question: string,
  supabase: SupabaseClient,
): Promise<DocumentSelectionResult> {
  // Fetch all documents
  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id, filename, title, metadata");

  if (docsError) {
    throw new Error(`Failed to fetch documents: ${docsError.message}`);
  }

  if (!docs || docs.length === 0) {
    return { selected: [], thinking: "No documents in the knowledge base." };
  }

  // Fetch all doc_trees (lightweight: document_id + tree_json)
  const { data: trees, error: treesError } = await supabase
    .from("doc_trees")
    .select("document_id, tree_json");

  if (treesError) {
    throw new Error(`Failed to fetch doc_trees: ${treesError.message}`);
  }

  // Build a lookup: document_id -> tree
  const treeMap = new Map<string, Record<string, unknown>>();
  for (const tree of trees ?? []) {
    treeMap.set(tree.document_id, tree.tree_json as Record<string, unknown>);
  }

  // Build catalog
  const catalog: CatalogEntry[] = docs.map((doc) => {
    const tree = treeMap.get(doc.id);
    return {
      document_id: doc.id,
      filename: doc.filename,
      title: doc.title ?? doc.filename,
      summary: tree ? String((tree as Record<string, unknown>).summary ?? "") : "",
      top_nodes: tree ? extractTopLevelSummaries(tree) : [],
    };
  });

  // Call Claude
  const userMessage = `Question: ${question}\n\nDocument Catalog:\n${JSON.stringify(catalog, null, 2)}`;
  const raw = await callClaude(SYSTEM_PROMPT, userMessage);
  const parsed = parseJsonResponse<{ selected: SelectedDocument[]; thinking: string }>(raw);

  // Cap results
  const capped = parsed.selected.slice(0, MAX_DOCS);

  return Object.freeze({
    selected: capped,
    thinking: parsed.thinking,
  });
}
