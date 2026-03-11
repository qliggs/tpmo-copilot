// Test Single File — debug/development tool
// Usage: npx tsx ingestion/src/test-single.ts --file /path/to/note.md
//
// Reads and parses a single file, builds a tree with a real Claude API call,
// validates the tree, and prints the structure (no Supabase writes).

import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { readVault } from "./vault-reader.js";
import { buildTree, type TreeNode } from "./tree-builder.js";
import { validateTree } from "./utils/validate-tree.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv: readonly string[]): string {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--file" && argv[i + 1]) {
      return argv[i + 1];
    }
  }

  console.error("Usage: npx tsx ingestion/src/test-single.ts --file /path/to/note.md");
  process.exit(1);
}

/** Print a tree node recursively, showing titles and summaries only. */
function printTree(nodes: readonly TreeNode[], indent: number = 0): void {
  const pad = "  ".repeat(indent);
  for (const node of nodes) {
    console.log(`${pad}[${node.node_id}] (depth ${node.depth}) ${node.title}`);
    console.log(`${pad}  Summary: ${node.summary}`);
    if (node.children.length > 0) {
      printTree(node.children, indent + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const filePath = parseArgs(process.argv);
  const absPath = resolve(filePath);
  const vaultPath = resolve(absPath, "..");
  const filename = absPath.split("/").pop() ?? "";

  console.log("=".repeat(60));
  console.log("[TEST] Single file test");
  console.log(`[TEST] File: ${absPath}`);
  console.log("=".repeat(60));

  // Step 1: Read and parse
  console.log("\n[VAULT] Reading file...");
  const allDocs = await readVault(vaultPath);
  const doc = allDocs.find((d) => d.filename === filename);

  if (!doc) {
    console.error(`[ERROR] File not found in vault: ${filename}`);
    process.exit(1);
  }

  console.log(`[VAULT] Title: ${doc.title}`);
  console.log(`[VAULT] Words: ${doc.word_count.toLocaleString()}`);
  console.log(`[VAULT] Tags: ${doc.tags.join(", ") || "(none)"}`);
  console.log(`[VAULT] Hash: ${doc.content_hash.slice(0, 16)}...`);
  console.log(`[VAULT] Frontmatter keys: ${Object.keys(doc.frontmatter).join(", ") || "(none)"}`);

  // Step 2: Build tree
  console.log("\n[TREE] Building PageIndex tree via Claude...");
  const anthropic = new Anthropic();
  const treeResult = await buildTree(doc, anthropic);

  // Step 3: Validate
  console.log("\n[VALIDATE] Running tree validation...");
  const validation = validateTree(treeResult.tree);

  if (validation.valid) {
    console.log("[VALIDATE] All checks passed.");
  } else {
    console.warn(`[VALIDATE] ${validation.errors.length} issue(s) found:`);
    for (const err of validation.errors) {
      console.warn(`  - ${err}`);
    }
  }

  // Step 4: Print tree structure
  console.log("\n[TREE] Document tree structure:");
  console.log("-".repeat(60));
  console.log(`Title: ${treeResult.tree.title}`);
  console.log(`Summary: ${treeResult.tree.summary}`);
  console.log("-".repeat(60));
  printTree(treeResult.tree.nodes);

  // Step 5: Stats
  console.log("\n" + "=".repeat(60));
  console.log("[STATS] Results:");
  console.log(`  Node count:  ${treeResult.node_count}`);
  console.log(`  Max depth:   ${treeResult.max_depth}`);
  console.log(`  Word count:  ${doc.word_count.toLocaleString()}`);
  console.log(`  Validation:  ${validation.valid ? "PASS" : "FAIL"}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
