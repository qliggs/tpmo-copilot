// Markdown Parser Utility
// Wraps remark/unified to parse markdown into an AST.
// Provides heading skeleton extraction for the tree builder.

import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root, Heading, PhrasingContent } from "mdast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeadingEntry {
  readonly depth: number;
  readonly text: string;
  readonly position: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively extract plain text from phrasing content nodes. */
function phrasingToText(nodes: readonly PhrasingContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.value;
      if ("children" in node) return phrasingToText(node.children as PhrasingContent[]);
      return "";
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Parse markdown into a remark AST. */
export function parseMarkdown(content: string): Root {
  const processor = unified().use(remarkParse);
  return processor.parse(content);
}

/**
 * Extract the heading skeleton from markdown content.
 * Returns an ordered list of headings with their depth, text, and
 * byte offset position in the source.
 */
export function extractHeadingSkeleton(content: string): readonly HeadingEntry[] {
  const tree = parseMarkdown(content);
  const headings: HeadingEntry[] = [];

  for (const node of tree.children) {
    if (node.type === "heading") {
      const heading = node as Heading;
      headings.push(
        Object.freeze({
          depth: heading.depth,
          text: phrasingToText(heading.children),
          position: heading.position?.start.offset ?? 0,
        }),
      );
    }
  }

  return headings;
}
