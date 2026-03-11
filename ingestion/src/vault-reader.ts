// Vault Reader
// Recursively reads .md files from an Obsidian vault.
// Extracts frontmatter, content, metadata, and content hashes.
// Provides delta detection via checkExistingHashes().

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, dirname, basename, extname } from "node:path";
import matter from "gray-matter";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sha256 } from "./utils/hash.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VaultDocument {
  readonly filename: string;
  readonly filepath: string;
  readonly vault_folder: string;
  readonly raw_content: string;
  readonly content: string;
  readonly frontmatter: Record<string, unknown>;
  readonly title: string;
  readonly tags: string[];
  readonly word_count: number;
  readonly last_modified: Date;
  readonly content_hash: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HIDDEN_DIR_PREFIX = ".";
const SKIP_DIRS = new Set([".obsidian", ".trash", ".git"]);

/** Returns true if the directory name should be skipped. */
function shouldSkipDir(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith(HIDDEN_DIR_PREFIX);
}

/** Approximate word count: split on whitespace after stripping markdown fences. */
function countWords(text: string): number {
  const stripped = text.replace(/```[\s\S]*?```/g, "").trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/).length;
}

/** Extract the first H1 heading from markdown content, if present. */
function extractH1(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/** Derive a title from content and frontmatter, falling back to filename. */
function deriveTitle(
  content: string,
  frontmatter: Record<string, unknown>,
  filename: string,
): string {
  const h1 = extractH1(content);
  if (h1) return h1;

  if (typeof frontmatter.title === "string" && frontmatter.title.length > 0) {
    return frontmatter.title;
  }

  return basename(filename, extname(filename));
}

/** Normalize tags from frontmatter — handles string, string[], or absent. */
function extractTags(frontmatter: Record<string, unknown>): string[] {
  const raw = frontmatter.tags;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

// ---------------------------------------------------------------------------
// Core: recursive directory walk
// ---------------------------------------------------------------------------

async function walkDir(dir: string, vaultRoot: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        const nested = await walkDir(join(dir, entry.name), vaultRoot);
        paths.push(...nested);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      paths.push(join(dir, entry.name));
    }
  }

  return paths;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reads all .md files from the vault at `vaultPath` and returns an array
 * of VaultDocument objects with parsed frontmatter, content, and metadata.
 */
export async function readVault(vaultPath: string): Promise<readonly VaultDocument[]> {
  const absolutePaths = await walkDir(vaultPath, vaultPath);

  const documents = await Promise.all(
    absolutePaths.map(async (absPath): Promise<VaultDocument> => {
      const rawContent = await readFile(absPath, "utf-8");
      const fileStat = await stat(absPath);
      const parsed = matter(rawContent);

      const relPath = relative(vaultPath, absPath);
      const folder = dirname(relPath);
      const fname = basename(absPath);
      const frontmatter = parsed.data as Record<string, unknown>;
      const content = parsed.content;

      return Object.freeze({
        filename: fname,
        filepath: relPath,
        vault_folder: folder === "." ? "" : folder,
        raw_content: rawContent,
        content,
        frontmatter,
        title: deriveTitle(content, frontmatter, fname),
        tags: extractTags(frontmatter),
        word_count: countWords(content),
        last_modified: fileStat.mtime,
        content_hash: sha256(rawContent),
      });
    }),
  );

  return documents;
}

/**
 * Queries Supabase for existing content hashes of the given filepaths.
 * Returns a Map<filepath, content_hash> for delta detection —
 * skip files whose hash hasn't changed since last ingestion.
 */
export async function checkExistingHashes(
  admin: SupabaseClient,
  filepaths: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (filepaths.length === 0) return new Map();

  const { data, error } = await admin
    .from("documents")
    .select("filepath, content_hash")
    .in("filepath", [...filepaths]);

  if (error) {
    throw new Error(`Failed to fetch existing hashes: ${error.message}`);
  }

  const hashMap = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.content_hash) {
      hashMap.set(row.filepath, row.content_hash);
    }
  }

  return hashMap;
}
