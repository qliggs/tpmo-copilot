// Tree Builder
// Core of the vectorless RAG approach. Calls Claude to build a hierarchical
// JSON tree representing a document's structure — an intelligent ToC with
// dense, retrieval-optimized summaries at every node.

import type Anthropic from "@anthropic-ai/sdk";
import type { VaultDocument } from "./vault-reader.js";
import { extractHeadingSkeleton } from "./utils/markdown-parser.js";
import { validateTree } from "./utils/validate-tree.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeNode {
  readonly node_id: string;
  readonly depth: number;
  readonly title: string;
  readonly summary: string;
  readonly page_ref: number;
  readonly raw_text: string;
  readonly children: readonly TreeNode[];
}

export interface DocumentTree {
  readonly doc_id: string;
  readonly title: string;
  readonly summary: string;
  readonly total_nodes: number;
  readonly nodes: readonly TreeNode[];
}

export interface TreeResult {
  readonly tree: DocumentTree;
  readonly node_count: number;
  readonly max_depth: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = "claude-sonnet-4-6-20250514";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

const SYSTEM_PROMPT = `You are building a structured index tree for a document retrieval system.
Your job is to analyze the document and produce a hierarchical JSON tree that represents its structure — like an intelligent Table of Contents.

Rules:
- Follow the document's NATURAL structure (headings, logical sections)
- Do NOT create artificial chunks of fixed size
- Each node must have a dense, retrieval-optimized summary (2-3 sentences) that includes: key entities, metrics, outcomes, decisions, names
- node_id must be unique within the document (use format: n_001, n_002...)
- raw_text contains the ACTUAL section text (not truncated)
- depth: 1 = top level section, 2 = subsection, 3 = sub-subsection
- page_ref: approximate sequential section number (1, 2, 3...)
- Include all meaningful content — don't skip bullet lists, tables, or data

Return ONLY valid JSON. No markdown fences. No explanation. Just the JSON object.

The JSON structure must be:
{
  "doc_id": "",
  "title": "document title",
  "summary": "2-3 sentence summary of the entire document",
  "total_nodes": <number>,
  "nodes": [
    {
      "node_id": "n_001",
      "depth": 1,
      "title": "Section Title",
      "summary": "Dense retrieval-optimized summary...",
      "page_ref": 1,
      "raw_text": "Full text of this section...",
      "children": []
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format the heading skeleton as a readable outline for the prompt. */
function formatSkeleton(doc: VaultDocument): string {
  const headings = extractHeadingSkeleton(doc.content);

  if (headings.length === 0) {
    return "(No headings detected — treat entire content as a single section)";
  }

  return headings
    .map((h) => `${"  ".repeat(h.depth - 1)}${"#".repeat(h.depth)} ${h.text}`)
    .join("\n");
}

/** Build the user prompt with document content and skeleton. */
function buildUserPrompt(doc: VaultDocument): string {
  const skeleton = formatSkeleton(doc);

  return `Build a PageIndex tree for this document.

DOCUMENT TITLE: ${doc.title}
FILENAME: ${doc.filename}

HEADING SKELETON:
${skeleton}

FULL DOCUMENT CONTENT:
${doc.content}`;
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Recursively count all nodes in a tree. */
function countNodes(nodes: readonly TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    count += countNodes(node.children);
  }
  return count;
}

/** Recursively find the maximum depth in a tree. */
function findMaxDepth(nodes: readonly TreeNode[], current: number = 0): number {
  let max = current;
  for (const node of nodes) {
    const nodeDepth = node.depth;
    if (nodeDepth > max) max = nodeDepth;
    const childMax = findMaxDepth(node.children, max);
    if (childMax > max) max = childMax;
  }
  return max;
}

/**
 * Attempt to parse JSON from the LLM response.
 * Strips markdown fences if the model wraps output despite instructions.
 */
function parseTreeJson(raw: string): DocumentTree {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  return JSON.parse(cleaned) as DocumentTree;
}

// ---------------------------------------------------------------------------
// Core: call Claude with retry + backoff
// ---------------------------------------------------------------------------

async function callClaude(
  anthropic: Anthropic,
  userPrompt: string,
  isRetry: boolean,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  if (isRetry) {
    messages.push(
      { role: "assistant", content: "I'll fix the JSON and return only valid JSON:" },
    );
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8_192,
    system: SYSTEM_PROMPT,
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textBlock.text;
}

async function callWithRetry(
  anthropic: Anthropic,
  userPrompt: string,
): Promise<DocumentTree> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const isRetry = attempt > 0;

    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`  Retry ${attempt}/${MAX_RETRIES - 1} after ${backoff}ms...`);
      await sleep(backoff);
    }

    try {
      const raw = await callClaude(anthropic, userPrompt, isRetry);
      return parseTreeJson(raw);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isRateLimit =
        lastError.message.includes("rate_limit") ||
        lastError.message.includes("429");
      const isJsonError = lastError instanceof SyntaxError;

      if (isRateLimit || isJsonError) {
        console.warn(`  Attempt ${attempt + 1} failed: ${lastError.message}`);
        continue;
      }

      // Non-retryable error
      throw lastError;
    }
  }

  throw new Error(
    `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a PageIndex tree for a document by calling Claude.
 * Pre-parses heading structure with remark, then sends to the LLM
 * for intelligent tree construction with retrieval-optimized summaries.
 */
export async function buildTree(
  doc: VaultDocument,
  anthropic: Anthropic,
): Promise<TreeResult> {
  console.log(`[TREE] Building tree: ${doc.filename} (${doc.word_count.toLocaleString()} words)...`);

  const userPrompt = buildUserPrompt(doc);
  const tree = await callWithRetry(anthropic, userPrompt);

  const nodeCount = countNodes(tree.nodes);
  const maxDepth = findMaxDepth(tree.nodes);

  // Return a new tree with computed counts (don't trust LLM's total_nodes)
  const finalTree: DocumentTree = Object.freeze({
    ...tree,
    total_nodes: nodeCount,
  });

  const result: TreeResult = Object.freeze({
    tree: finalTree,
    node_count: nodeCount,
    max_depth: maxDepth,
  });

  // Validate tree — warn on issues but don't throw
  const validation = validateTree(finalTree);
  if (validation.valid) {
    console.log(`[TREE] Done: ${doc.filename} -- ${nodeCount} nodes, ${maxDepth} levels deep`);
  } else {
    console.warn(`[TREE] Warning: ${doc.filename} -- validation issues: ${validation.errors.join("; ")}`);
  }

  return result;
}
