// Answer Generator — Stage 3 of the RAG pipeline
// Extracts raw_text for selected nodes from the JSONB tree,
// assembles context with source attribution, and calls Claude to answer.

import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude } from "@/lib/claude";
import type { SelectedNode } from "./node-selector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Source {
  readonly filename: string;
  readonly section_path: readonly string[];
}

export interface AnswerResult {
  readonly answer: string;
  readonly sources: readonly Source[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a knowledgeable assistant with access to specific documents. Answer the question using ONLY the provided document sections. Be specific and cite your sources.

Rules:
- Only use information from the provided context sections
- If the context doesn't contain enough information, say so clearly
- Be specific — include names, dates, metrics, and details when available
- Always end with a Sources section listing: Document name > Section path`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TreeNodeRecord {
  readonly node_id: string;
  readonly title: string;
  readonly raw_text: string;
  readonly children: readonly TreeNodeRecord[];
}

/**
 * Recursively search a tree for a node by node_id.
 * Returns the raw_text if found, null otherwise.
 */
function findNodeText(
  nodes: readonly Record<string, unknown>[],
  targetId: string,
): string | null {
  for (const node of nodes) {
    if (node.node_id === targetId) {
      return String(node.raw_text ?? "");
    }

    const children = node.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      const found = findNodeText(children, targetId);
      if (found !== null) return found;
    }
  }

  return null;
}

/**
 * Fetch raw_text for a set of selected nodes from their document trees.
 * Groups by document_id to minimize Supabase calls.
 */
async function fetchNodeTexts(
  selectedNodes: readonly SelectedNode[],
  supabase: SupabaseClient,
): Promise<ReadonlyMap<string, string>> {
  // Group node IDs by document
  const docNodeMap = new Map<string, SelectedNode[]>();
  for (const node of selectedNodes) {
    const existing = docNodeMap.get(node.document_id) ?? [];
    docNodeMap.set(node.document_id, [...existing, node]);
  }

  const textMap = new Map<string, string>();

  // Fetch each document's tree and extract node texts
  for (const [documentId, nodes] of docNodeMap) {
    const { data, error } = await supabase
      .from("doc_trees")
      .select("tree_json")
      .eq("document_id", documentId)
      .maybeSingle();

    if (error || !data) {
      console.warn(`Could not fetch tree for document ${documentId}: ${error?.message}`);
      continue;
    }

    const treeJson = data.tree_json as Record<string, unknown>;
    const treeNodes = treeJson.nodes as Record<string, unknown>[] | undefined;

    if (!Array.isArray(treeNodes)) continue;

    for (const node of nodes) {
      const text = findNodeText(treeNodes, node.node_id);
      if (text !== null) {
        textMap.set(node.node_id, text);
      }
    }
  }

  return textMap;
}

/**
 * Assemble the context string from selected nodes with source attribution.
 */
function assembleContext(
  selectedNodes: readonly SelectedNode[],
  nodeTexts: ReadonlyMap<string, string>,
): string {
  const sections: string[] = [];

  for (const node of selectedNodes) {
    const text = nodeTexts.get(node.node_id);
    if (!text) continue;

    const pathStr = node.path.join(" > ");
    sections.push(
      `[Document: ${node.filename}] [Section: ${pathStr}]\n${text}`,
    );
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Extract sources from the selected nodes (deduplicated).
 */
function buildSources(selectedNodes: readonly SelectedNode[]): readonly Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const node of selectedNodes) {
    const key = `${node.filename}::${node.path.join(">")}`;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push(Object.freeze({
        filename: node.filename,
        section_path: node.path,
      }));
    }
  }

  return sources;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stage 3: Generate an answer using the selected nodes as context.
 * Fetches raw_text from the JSONB trees, assembles context with attribution,
 * and calls Claude to produce a cited answer.
 */
export async function generateAnswer(
  question: string,
  selectedNodes: readonly SelectedNode[],
  supabase: SupabaseClient,
): Promise<AnswerResult> {
  if (selectedNodes.length === 0) {
    return Object.freeze({
      answer: "I couldn't find any relevant document sections to answer this question.",
      sources: [],
    });
  }

  // Fetch raw_text for all selected nodes
  const nodeTexts = await fetchNodeTexts(selectedNodes, supabase);

  // Build context
  const context = assembleContext(selectedNodes, nodeTexts);

  if (context.length === 0) {
    return Object.freeze({
      answer: "I found relevant documents but couldn't extract the section content.",
      sources: [],
    });
  }

  // Call Claude
  const userMessage = `Question: ${question}\n\nContext:\n${context}`;
  const answer = await callClaude(SYSTEM_PROMPT, userMessage, 4_096);

  return Object.freeze({
    answer,
    sources: buildSources(selectedNodes),
  });
}
