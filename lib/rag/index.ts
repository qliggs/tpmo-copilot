// RAG Pipeline Orchestrator
// Runs the 3-step reasoning-based retrieval pipeline:
//   1. Document selection (catalog navigation)
//   2. Node selection (tree navigation per document)
//   3. Answer generation (context assembly + Claude)
// Logs results to query_log table in Supabase.

import { supabaseAdmin as getAdmin } from "@/lib/supabase";
import { selectDocuments } from "./document-selector";
import { selectNodes, type SelectedNode } from "./node-selector";
import { generateAnswer, type Source } from "./answer-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RAGResult {
  readonly answer: string;
  readonly sources: readonly Source[];
  readonly reasoning: string;
  readonly latency_ms: number;
  readonly total_llm_calls: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function elapsed(start: number): number {
  return Math.round(performance.now() - start);
}

/** Log the query result to the query_log table. */
async function logQuery(
  question: string,
  result: RAGResult,
): Promise<void> {
  try {
    const { error } = await getAdmin().from("query_log").insert({
      question,
      answer: result.answer,
      docs_selected: result.sources.map((s) => s.filename),
      nodes_selected: [],
      reasoning: result.reasoning,
      latency_ms: result.latency_ms,
      total_llm_calls: result.total_llm_calls,
    });

    if (error) {
      console.warn(`[rag] Failed to log query: ${error.message}`);
    }
  } catch (err) {
    // Don't fail the whole pipeline if logging fails
    console.warn("[rag] Query logging error:", err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the full 3-step RAG pipeline for a question.
 *
 * Step 1: Select relevant documents from the catalog
 * Step 2: Navigate each document's tree to find specific nodes
 * Step 3: Assemble context from node raw_text and generate answer
 *
 * Returns the answer, sources, reasoning trace, latency, and LLM call count.
 */
export async function runRAGQuery(question: string): Promise<RAGResult> {
  const start = performance.now();
  const reasoningParts: string[] = [];
  let llmCalls = 0;

  // -- Step 1: Document Selection -------------------------------------------
  const docResult = await selectDocuments(question, getAdmin());
  llmCalls++;
  reasoningParts.push(`[Document Selection] ${docResult.thinking}`);

  if (docResult.selected.length === 0) {
    const result: RAGResult = Object.freeze({
      answer: "No relevant documents found in the knowledge base.",
      sources: [],
      reasoning: reasoningParts.join("\n\n"),
      latency_ms: elapsed(start),
      total_llm_calls: llmCalls,
    });
    await logQuery(question, result);
    return result;
  }

  // -- Step 2: Node Selection (per document) --------------------------------
  const allNodes: SelectedNode[] = [];

  for (const doc of docResult.selected) {
    const nodeResult = await selectNodes(
      question,
      doc.document_id,
      doc.filename,
      getAdmin(),
    );
    llmCalls++;
    reasoningParts.push(
      `[Node Selection: ${doc.filename}] ${nodeResult.thinking}`,
    );
    allNodes.push(...nodeResult.nodes);
  }

  if (allNodes.length === 0) {
    const result: RAGResult = Object.freeze({
      answer: "Found relevant documents but couldn't identify specific sections to answer from.",
      sources: [],
      reasoning: reasoningParts.join("\n\n"),
      latency_ms: elapsed(start),
      total_llm_calls: llmCalls,
    });
    await logQuery(question, result);
    return result;
  }

  // -- Step 3: Answer Generation --------------------------------------------
  const answerResult = await generateAnswer(question, allNodes, getAdmin());
  llmCalls++;
  reasoningParts.push("[Answer Generation] Context assembled and answer generated.");

  const result: RAGResult = Object.freeze({
    answer: answerResult.answer,
    sources: answerResult.sources,
    reasoning: reasoningParts.join("\n\n"),
    latency_ms: elapsed(start),
    total_llm_calls: llmCalls,
  });

  // Log to Supabase (fire-and-forget, don't block response)
  await logQuery(question, result);

  return result;
}
