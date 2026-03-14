// Node Selector — Stage 2 of the RAG pipeline
// Given a selected document, fetches its full tree (without raw_text),
// then asks Claude to navigate the hierarchy and pick the most relevant nodes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude } from "@/lib/claude";
import { callOpenRouter, TruncatedResponseError } from "@/lib/openrouter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectedNode {
  readonly node_id: string;
  readonly document_id: string;
  readonly filename: string;
  readonly path: readonly string[];
  readonly reason: string;
}

export interface NodeSelectionResult {
  readonly nodes: readonly SelectedNode[];
  readonly thinking: string;
}

/** Tree node shape without raw_text — used for the navigation prompt. */
interface SkeletonNode {
  readonly node_id: string;
  readonly depth: number;
  readonly title: string;
  readonly summary: string;
  readonly page_ref: number;
  readonly children: readonly SkeletonNode[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_NODES = parseInt(process.env.MAX_NODES_PER_DOC ?? "8", 10);
const INFERENCE_MODE = process.env.INFERENCE_MODE ?? "claude-only";
const NODE_SELECT_MODEL = process.env.OPENROUTER_NODE_SELECT_MODEL ?? "qwen/qwen3-30b-a3b";

/**
 * Route the LLM call based on INFERENCE_MODE.
 * "hybrid"      → OpenRouter (Qwen3 30B)
 * "claude-only"  → Anthropic (Claude Sonnet) — V0 behavior
 */
async function callLLM(system: string, userMessage: string): Promise<string> {
  if (INFERENCE_MODE === "hybrid") {
    return callOpenRouter(system, userMessage, NODE_SELECT_MODEL);
  }
  return callClaude(system, userMessage);
}

const SYSTEM_PROMPT = `You are navigating a document's hierarchical table of contents. Given a question and this document's tree structure (summaries only, no full text), identify which specific nodes most likely contain the answer.

Reason step by step through the tree hierarchy. Consider both the node summaries and the parent-child relationships.

Return JSON only: { "nodes": [{ "node_id": "string", "path": ["Section", "Subsection"], "reason": "string" }], "thinking": "string" }

Rules:
- Select the most specific nodes that contain the answer (prefer leaf nodes over parents when the answer is in a subsection)
- path should be the hierarchical breadcrumb from root to the selected node
- The "thinking" field should trace your navigation through the tree
- Return ONLY valid JSON. No markdown fences.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively strip raw_text from a tree, keeping the navigation skeleton. */
function stripRawText(node: Record<string, unknown>): SkeletonNode {
  const children = Array.isArray(node.children)
    ? (node.children as Record<string, unknown>[]).map(stripRawText)
    : [];

  return {
    node_id: String(node.node_id ?? ""),
    depth: Number(node.depth ?? 0),
    title: String(node.title ?? ""),
    summary: String(node.summary ?? ""),
    page_ref: Number(node.page_ref ?? 0),
    children,
  };
}

/**
 * Parse a JSON response from an LLM, stripping markdown fences if present.
 * Returns the parsed value or null if the JSON is malformed.
 */
function parseJsonResponse<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn(
      `[node-selector] JSON parse failed: ${err instanceof Error ? err.message : err}`,
      `\n  Raw (first 200 chars): ${cleaned.slice(0, 200)}`,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stage 2: Select which nodes within a document are relevant to the question.
 * Fetches the document's tree, strips raw_text, and asks Claude to navigate it.
 */
export async function selectNodes(
  question: string,
  documentId: string,
  filename: string,
  supabase: SupabaseClient,
): Promise<NodeSelectionResult> {
  // Fetch the full tree
  const { data, error } = await supabase
    .from("doc_trees")
    .select("tree_json")
    .eq("document_id", documentId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to fetch tree for document ${documentId}: ${error?.message}`);
  }

  const treeJson = data.tree_json as Record<string, unknown>;
  const rawNodes = treeJson.nodes as Record<string, unknown>[] | undefined;

  if (!rawNodes || rawNodes.length === 0) {
    return { nodes: [], thinking: "Document tree has no nodes." };
  }

  // Build skeleton (no raw_text)
  const skeleton = {
    title: String(treeJson.title ?? ""),
    summary: String(treeJson.summary ?? ""),
    nodes: rawNodes.map(stripRawText),
  };

  // Call LLM with retry on truncation or malformed JSON
  const userMessage = `Question: ${question}\n\nDocument: ${filename}\n\nTree Structure:\n${JSON.stringify(skeleton, null, 2)}`;
  const maxAttempts = 2;

  type ParsedNodeResult = {
    nodes: { node_id: string; path: string[]; reason: string }[];
    thinking: string;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await callLLM(SYSTEM_PROMPT, userMessage);
      const parsed = parseJsonResponse<ParsedNodeResult>(raw);

      if (!parsed || !Array.isArray(parsed.nodes)) {
        if (attempt < maxAttempts) {
          console.warn(`[node-selector] Malformed response for ${filename}, retrying...`);
          continue;
        }
        return Object.freeze({
          nodes: [],
          thinking: `LLM returned malformed JSON for ${filename} after retries.`,
        });
      }

      const capped = parsed.nodes.slice(0, MAX_NODES).map((n) =>
        Object.freeze({
          node_id: n.node_id,
          document_id: documentId,
          filename,
          path: n.path,
          reason: n.reason,
        }),
      );

      return Object.freeze({
        nodes: capped,
        thinking: parsed.thinking ?? "",
      });
    } catch (err) {
      const isTruncated = err instanceof TruncatedResponseError;
      const isRetryable = isTruncated || (err instanceof SyntaxError);

      if (isRetryable && attempt < maxAttempts) {
        console.warn(
          `[node-selector] ${isTruncated ? "Truncated" : "Parse error"} for ${filename}, retrying (attempt ${attempt}/${maxAttempts})...`,
        );
        continue;
      }

      console.error(
        `[node-selector] Failed for ${filename} after ${attempt} attempt(s):`,
        err instanceof Error ? err.message : err,
      );
      return Object.freeze({
        nodes: [],
        thinking: `Node selection failed for ${filename}: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }

  // Unreachable, but TypeScript needs it
  return Object.freeze({ nodes: [], thinking: "Exhausted retries." });
}
