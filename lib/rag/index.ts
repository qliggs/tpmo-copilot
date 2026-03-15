// RAG Pipeline Orchestrator
// Routes queries through two modes:
//   Mode A (vault): 3-step reasoning-based retrieval from Obsidian docs
//   Mode B (portfolio): Direct SQL query against the projects table
// Logs results to query_log table in Supabase.

import { supabaseAdmin as getAdmin } from "@/lib/supabase";
import { selectDocuments } from "./document-selector";
import { selectNodes, type SelectedNode } from "./node-selector";
import { generateAnswer, streamAnswer, type Source } from "./answer-generator";
import { detectQueryMode } from "./mode-detector";
import {
  queryPortfolio,
  streamPortfolioAnswer,
  hasPortfolioData,
} from "./portfolio-query";
import {
  getHistory,
  formatHistoryForPrompt,
  saveMessage,
} from "@/lib/conversation";

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
export async function runRAGQuery(
  question: string,
  sessionId?: string,
): Promise<RAGResult> {
  const start = performance.now();
  const reasoningParts: string[] = [];
  let llmCalls = 0;

  // -- Conversation Memory ----------------------------------------------------
  let enrichedQuestion = question;
  if (sessionId) {
    const history = await getHistory(sessionId);
    if (history.length > 0) {
      enrichedQuestion = formatHistoryForPrompt(history, question);
      reasoningParts.push(
        `[Memory] Loaded ${history.length} prior turns for context.`,
      );
    }
  }

  // -- Mode Detection ---------------------------------------------------------
  const mode = detectQueryMode(question);
  reasoningParts.push(`[Mode Detection] Query classified as: ${mode}`);

  // -- Mode B: Portfolio Query (with fallback to vault) ------------------------
  if (mode === "portfolio") {
    const hasData = await hasPortfolioData(getAdmin());

    if (hasData) {
      const portfolioResult = await queryPortfolio(enrichedQuestion, getAdmin());
      llmCalls++;
      reasoningParts.push(
        `[Portfolio Query] Queried ${portfolioResult.projectCount} projects from the Book of Work.`,
      );

      const result: RAGResult = Object.freeze({
        answer: portfolioResult.answer,
        sources: [{ filename: "Book of Work (Notion)", section_path: ["Portfolio Data"] }],
        reasoning: reasoningParts.join("\n\n"),
        latency_ms: elapsed(start),
        total_llm_calls: llmCalls,
      });

      await logQuery(question, result);
      if (sessionId) {
        await saveMessage(sessionId, "user", question);
        await saveMessage(sessionId, "assistant", result.answer);
      }
      return result;
    }

    // No portfolio data — fall back to vault RAG
    reasoningParts.push(
      "[Portfolio Fallback] No projects in database. Falling back to vault RAG.",
    );
  }

  // -- Mode A: Vault RAG (existing 3-step pipeline) ---------------------------

  // -- Step 1: Document Selection -------------------------------------------
  const docResult = await selectDocuments(enrichedQuestion, getAdmin());
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
      enrichedQuestion,
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
  const answerResult = await generateAnswer(enrichedQuestion, allNodes, getAdmin());
  llmCalls++;
  reasoningParts.push("[Answer Generation] Context assembled and answer generated.");

  const result: RAGResult = Object.freeze({
    answer: answerResult.answer,
    sources: answerResult.sources,
    reasoning: reasoningParts.join("\n\n"),
    latency_ms: elapsed(start),
    total_llm_calls: llmCalls,
  });

  await logQuery(question, result);
  if (sessionId) {
    await saveMessage(sessionId, "user", question);
    await saveMessage(sessionId, "assistant", result.answer);
  }

  return result;
}

/**
 * Streaming variant of runRAGQuery.
 *
 * Steps 1-2 run to completion (blocking), then Step 3 streams tokens
 * via the onChunk callback. Returns the full RAGResult once the stream
 * completes (needed for query logging).
 */
export async function streamRAGQuery(
  question: string,
  sessionId: string | undefined,
  onChunk: (text: string) => void,
): Promise<RAGResult> {
  const start = performance.now();
  const reasoningParts: string[] = [];
  let llmCalls = 0;

  // -- Conversation Memory ----------------------------------------------------
  let enrichedQuestion = question;
  if (sessionId) {
    const history = await getHistory(sessionId);
    if (history.length > 0) {
      enrichedQuestion = formatHistoryForPrompt(history, question);
      reasoningParts.push(
        `[Memory] Loaded ${history.length} prior turns for context.`,
      );
    }
  }

  // -- Mode Detection ---------------------------------------------------------
  const mode = detectQueryMode(question);
  reasoningParts.push(`[Mode Detection] Query classified as: ${mode}`);

  // -- Mode B: Portfolio Query (with fallback to vault) ------------------------
  if (mode === "portfolio") {
    const hasData = await hasPortfolioData(getAdmin());

    if (hasData) {
      const portfolioResult = await streamPortfolioAnswer(
        enrichedQuestion,
        getAdmin(),
        onChunk,
      );
      llmCalls++;
      reasoningParts.push(
        `[Portfolio Query] Queried ${portfolioResult.projectCount} projects from the Book of Work.`,
      );

      const result: RAGResult = Object.freeze({
        answer: portfolioResult.answer,
        sources: [
          {
            filename: "Book of Work (Notion)",
            section_path: ["Portfolio Data"],
          },
        ],
        reasoning: reasoningParts.join("\n\n"),
        latency_ms: elapsed(start),
        total_llm_calls: llmCalls,
      });

      await logQuery(question, result);
      if (sessionId) {
        await saveMessage(sessionId, "user", question);
        await saveMessage(sessionId, "assistant", result.answer);
      }
      return result;
    }

    reasoningParts.push(
      "[Portfolio Fallback] No projects in database. Falling back to vault RAG.",
    );
  }

  // -- Mode A: Vault RAG (Steps 1-2 blocking, Step 3 streaming) ---------------

  // -- Step 1: Document Selection -------------------------------------------
  const docResult = await selectDocuments(enrichedQuestion, getAdmin());
  llmCalls++;
  reasoningParts.push(`[Document Selection] ${docResult.thinking}`);

  if (docResult.selected.length === 0) {
    const fallback = "No relevant documents found in the knowledge base.";
    onChunk(fallback);
    const result: RAGResult = Object.freeze({
      answer: fallback,
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
      enrichedQuestion,
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
    const fallback =
      "Found relevant documents but couldn't identify specific sections to answer from.";
    onChunk(fallback);
    const result: RAGResult = Object.freeze({
      answer: fallback,
      sources: [],
      reasoning: reasoningParts.join("\n\n"),
      latency_ms: elapsed(start),
      total_llm_calls: llmCalls,
    });
    await logQuery(question, result);
    return result;
  }

  // -- Step 3: Streaming Answer Generation ----------------------------------
  const answerResult = await streamAnswer(
    enrichedQuestion,
    allNodes,
    getAdmin(),
    onChunk,
  );
  llmCalls++;
  reasoningParts.push(
    "[Answer Generation] Context assembled and answer streamed.",
  );

  const result: RAGResult = Object.freeze({
    answer: answerResult.answer,
    sources: answerResult.sources,
    reasoning: reasoningParts.join("\n\n"),
    latency_ms: elapsed(start),
    total_llm_calls: llmCalls,
  });

  await logQuery(question, result);
  if (sessionId) {
    await saveMessage(sessionId, "user", question);
    await saveMessage(sessionId, "assistant", result.answer);
  }
  return result;
}
