// Tree Builder
// Core of the vectorless RAG approach. Calls Claude to build a hierarchical
// JSON tree representing a document's structure — an intelligent ToC with
// dense, retrieval-optimized summaries at every node.

import type Anthropic from "@anthropic-ai/sdk";
import type { VaultDocument } from "./vault-reader.js";
import { extractHeadingSkeleton } from "./utils/markdown-parser.js";
import { validateTree } from "./utils/validate-tree.js";
import { callOpenRouter } from "./openrouter-client.js";

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

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const TREE_MAX_TOKENS = 32_000;

// NOTE: These are read lazily (inside functions) because ESM hoists static
// imports before dotenv.config() runs in index.ts.  Module-level reads would
// see `undefined` and fall back to defaults.
function getInferenceMode(): string {
  return process.env.INFERENCE_MODE ?? "claude-only";
}
function getOpenRouterTreeModel(): string {
  return process.env.OPENROUTER_TREE_MODEL ?? "deepseek/deepseek-chat-v3-0324";
}

// ---------------------------------------------------------------------------
// Provider abstraction for fallback chain
// ---------------------------------------------------------------------------

/** A provider is a function that takes a system prompt + user message and returns text. */
type LLMProvider = (system: string, userMessage: string) => Promise<string>;

/** Build the ordered provider list based on INFERENCE_MODE. */
async function buildProviderChain(
  anthropic: Anthropic,
): Promise<readonly { readonly name: string; readonly call: LLMProvider }[]> {
  const mode = getInferenceMode();

  if (mode !== "hybrid") {
    // claude-only: single provider, no fallback
    return [
      {
        name: "Anthropic",
        call: (system, userMessage) =>
          callAnthropicDirect(anthropic, system, userMessage, false),
      },
    ];
  }

  // Hybrid: OpenRouter -> Anthropic
  const openRouterModel = getOpenRouterTreeModel();

  return [
    {
      name: "OpenRouter",
      call: (system, userMessage) =>
        callOpenRouter(system, userMessage, openRouterModel, TREE_MAX_TOKENS),
    },
    {
      name: "Anthropic",
      call: (system, userMessage) =>
        callAnthropicDirect(anthropic, system, userMessage, false),
    },
  ];
}

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

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Normalize the tree object: resolve wrapper keys and alternative field names
  const tree = resolveTreeObject(parsed);

  if (!Array.isArray(tree.nodes)) {
    throw new SyntaxError(
      `Invalid tree structure: "nodes" not found. Top-level keys: ${Object.keys(parsed).join(", ")}`,
    );
  }

  // Recursively normalize node fields (children aliases, missing fields)
  const normalizedNodes = normalizeNodes(tree.nodes as Record<string, unknown>[]);

  return {
    doc_id: (tree.doc_id ?? "") as string,
    title: (tree.title ?? "") as string,
    summary: (tree.summary ?? "") as string,
    total_nodes: normalizedNodes.length,
    nodes: normalizedNodes,
  };
}

/** Alternative key names that models use instead of "nodes"/"children". */
const NODES_ALIASES = ["nodes", "sections", "items", "children", "content"] as const;
const CHILDREN_ALIASES = ["children", "subsections", "sub_sections", "items", "nodes"] as const;

/**
 * Recursively normalize node objects so they all have a `children` array.
 * Models may use "subsections", "sub_sections", etc. instead of "children".
 * Also ensures `children` is always an array (never undefined/null).
 */
function normalizeNodes(
  nodes: readonly Record<string, unknown>[],
  counter: { value: number } = { value: 0 },
): readonly TreeNode[] {
  return nodes.map((node) => {
    counter.value += 1;
    const id = String(node.node_id ?? node.id ?? "");
    const autoId = id || `n_${String(counter.value).padStart(3, "0")}`;

    // Find the children array under any alias
    const childKey = CHILDREN_ALIASES.find((k) => Array.isArray(node[k]));
    const rawChildren = childKey ? (node[childKey] as Record<string, unknown>[]) : [];

    return {
      node_id: autoId,
      depth: (node.depth ?? node.level ?? 1) as number,
      title: (node.title ?? node.heading ?? "") as string,
      summary: (node.summary ?? node.description ?? "") as string,
      page_ref: (node.page_ref ?? node.page ?? 0) as number,
      raw_text: (node.raw_text ?? node.text ?? node.content ?? "") as string,
      children: normalizeNodes(rawChildren, counter),
    };
  });
}

/**
 * Resolve a parsed JSON object into a DocumentTree shape.
 * Handles: wrapper keys ({ document: { ... } }), alternative field names
 * (sections → nodes), and missing top-level fields.
 */
function resolveTreeObject(parsed: Record<string, unknown>): Record<string, unknown> {
  // Try to find nodes (or alias) at the current level
  const nodesKey = NODES_ALIASES.find((k) => Array.isArray(parsed[k]));
  if (nodesKey) {
    if (nodesKey !== "nodes") {
      console.log(`[TREE] Renaming "${nodesKey}" → "nodes" in model response`);
      return { ...parsed, nodes: parsed[nodesKey] };
    }
    return parsed;
  }

  // No nodes at top level — check for a single wrapper key containing an object
  for (const key of Object.keys(parsed)) {
    const value = parsed[key];
    if (typeof value !== "object" || value === null || Array.isArray(value)) continue;

    const inner = value as Record<string, unknown>;
    const innerNodesKey = NODES_ALIASES.find((k) => Array.isArray(inner[k]));
    if (innerNodesKey) {
      console.log(`[TREE] Unwrapping "${key}" and renaming "${innerNodesKey}" → "nodes"`);
      return innerNodesKey === "nodes"
        ? inner
        : { ...inner, nodes: inner[innerNodesKey] };
    }
  }

  // Return as-is — caller will throw with diagnostic info
  return parsed;
}

// ---------------------------------------------------------------------------
// Core: Anthropic direct call (used as final fallback and claude-only mode)
// ---------------------------------------------------------------------------

async function callAnthropicDirect(
  anthropic: Anthropic,
  system: string,
  userPrompt: string,
  isRetry: boolean,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  if (isRetry) {
    messages.push(
      { role: "user", content: "Your previous response had invalid JSON. Return ONLY a valid JSON object with no markdown, no explanation, no backticks. Start your response with { and end with }." },
    );
  }

  // Use streaming to avoid the 10-minute timeout on large responses
  const stream = anthropic.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: TREE_MAX_TOKENS,
    system,
    messages,
  });

  const response = await stream.finalMessage();

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Anthropic response");
  }

  return textBlock.text;
}

// ---------------------------------------------------------------------------
// Retry + fallback chain
// ---------------------------------------------------------------------------

/**
 * Try a single provider with retry + backoff.
 * Returns the parsed tree on success, or null if all retries exhausted.
 * Throws only on non-retryable errors that aren't provider-level failures.
 */
async function tryProviderWithRetry(
  provider: LLMProvider,
  providerName: string,
  userPrompt: string,
): Promise<DocumentTree | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`  [${providerName}] Retry ${attempt}/${MAX_RETRIES - 1} after ${backoff}ms...`);
      await sleep(backoff);
    }

    try {
      const raw = await provider(SYSTEM_PROMPT, userPrompt);
      return parseTreeJson(raw);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isRateLimit =
        lastError.message.includes("rate_limit") ||
        lastError.message.includes("429");
      const isJsonError = lastError instanceof SyntaxError;

      if (isRateLimit || isJsonError) {
        console.warn(`  [${providerName}] Attempt ${attempt + 1} failed: ${lastError.message}`);
        continue;
      }

      // Non-retryable provider error — fall through to next provider
      console.warn(`  [${providerName}] Non-retryable error: ${lastError.message}`);
      return null;
    }
  }

  console.warn(`  [${providerName}] Exhausted ${MAX_RETRIES} retries. Last: ${lastError?.message}`);
  return null;
}

/**
 * Call with fallback chain: tries each provider in order.
 * In hybrid mode: Ollama -> OpenRouter -> Anthropic.
 * In claude-only mode: just Anthropic.
 */
async function callWithFallback(
  anthropic: Anthropic,
  userPrompt: string,
): Promise<DocumentTree> {
  const chain = await buildProviderChain(anthropic);

  const names = chain.map((p) => p.name).join(" -> ");
  console.log(`[TREE] Fallback chain: ${names}`);

  for (const provider of chain) {
    console.log(`[TREE] Trying provider: ${provider.name}`);
    const result = await tryProviderWithRetry(
      provider.call,
      provider.name,
      userPrompt,
    );
    if (result) {
      console.log(`[TREE] Success via ${provider.name}`);
      return result;
    }
    console.log(`[TREE] ${provider.name} failed — falling through`);
  }

  throw new Error(
    `All providers exhausted (${names}). Tree build failed.`,
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
  const tree = await callWithFallback(anthropic, userPrompt);

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
