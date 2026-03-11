// Tree Validation Utility
// Validates a DocumentTree for structural correctness after LLM generation.

import type { DocumentTree, TreeNode } from "../tree-builder.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect all nodes with their expected depth based on tree position.
 * Returns flat array of { node, expectedDepth } for validation.
 */
function collectNodes(
  nodes: readonly TreeNode[],
  parentDepth: number,
): readonly { node: TreeNode; expectedMinDepth: number }[] {
  const result: { node: TreeNode; expectedMinDepth: number }[] = [];

  for (const node of nodes) {
    result.push({ node, expectedMinDepth: parentDepth + 1 });
    result.push(...collectNodes(node.children, node.depth));
  }

  return result;
}

/** Recursively count all nodes in a tree. */
function countAllNodes(nodes: readonly TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    count += countAllNodes(node.children);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a DocumentTree for structural correctness.
 * Checks: unique node_ids, non-empty fields, depth consistency, total_nodes.
 */
export function validateTree(tree: DocumentTree): ValidationResult {
  const errors: string[] = [];
  const allEntries = collectNodes(tree.nodes, 0);
  const seenIds = new Set<string>();

  for (const { node, expectedMinDepth } of allEntries) {
    // Empty node_id
    if (!node.node_id || node.node_id.trim().length === 0) {
      errors.push(`Node with title "${node.title}" has an empty node_id`);
      continue;
    }

    // Duplicate node_id
    if (seenIds.has(node.node_id)) {
      errors.push(`Duplicate node_id: "${node.node_id}"`);
    }
    seenIds.add(node.node_id);

    // Empty summary
    if (!node.summary || node.summary.trim().length === 0) {
      errors.push(`Node "${node.node_id}" has an empty summary`);
    }

    // Empty raw_text
    if (!node.raw_text || node.raw_text.trim().length === 0) {
      errors.push(`Node "${node.node_id}" has empty raw_text`);
    }

    // Depth consistency: child depth should be > parent depth
    if (node.depth < expectedMinDepth) {
      errors.push(
        `Node "${node.node_id}" has depth ${node.depth} but expected >= ${expectedMinDepth} based on tree position`,
      );
    }
  }

  // Total node count
  const actualCount = countAllNodes(tree.nodes);
  if (tree.total_nodes !== actualCount) {
    errors.push(
      `total_nodes is ${tree.total_nodes} but actual count is ${actualCount}`,
    );
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors,
  });
}
