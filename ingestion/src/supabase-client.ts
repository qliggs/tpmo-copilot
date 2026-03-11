// Supabase Client for the ingestion pipeline
// Initializes a Supabase client with SUPABASE_SERVICE_ROLE_KEY.
// Provides upsert/query functions for documents and doc_trees tables.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VaultDocument } from "./vault-reader.js";
import type { TreeResult } from "./tree-builder.js";

// ---------------------------------------------------------------------------
// Client init
// ---------------------------------------------------------------------------

/** Create a Supabase admin client from environment variables. */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * Upserts a document record in the documents table.
 * Uses filepath uniqueness for conflict resolution.
 * Returns the document UUID.
 */
export async function upsertDocument(
  admin: SupabaseClient,
  doc: VaultDocument,
): Promise<string> {
  const row = {
    filename: doc.filename,
    filepath: doc.filepath,
    title: doc.title,
    vault_folder: doc.vault_folder,
    word_count: doc.word_count,
    last_modified: doc.last_modified.toISOString(),
    content_hash: doc.content_hash,
    tags: doc.tags,
    source_type: "obsidian",
    metadata: doc.frontmatter,
  };

  const { data, error } = await admin
    .from("documents")
    .upsert(row, { onConflict: "filepath" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to upsert document "${doc.filepath}": ${error.message}`);
  }

  return data.id as string;
}

// ---------------------------------------------------------------------------
// Doc Trees
// ---------------------------------------------------------------------------

/**
 * Inserts or replaces the doc_trees record for a document.
 * Uses the unique constraint on document_id for conflict resolution.
 */
export async function upsertTree(
  admin: SupabaseClient,
  documentId: string,
  treeResult: TreeResult,
): Promise<void> {
  const row = {
    document_id: documentId,
    tree_json: treeResult.tree,
    node_count: treeResult.node_count,
    max_depth: treeResult.max_depth,
    model_used: "claude-sonnet-4-6",
  };

  const { error } = await admin
    .from("doc_trees")
    .upsert(row, { onConflict: "document_id" });

  if (error) {
    throw new Error(`Failed to upsert tree for document ${documentId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Hash lookup
// ---------------------------------------------------------------------------

/**
 * Returns a Map<filepath, content_hash> for all existing documents.
 * Used for delta detection — skip files whose content hasn't changed.
 */
export async function getExistingHashes(
  admin: SupabaseClient,
): Promise<ReadonlyMap<string, string>> {
  const { data, error } = await admin
    .from("documents")
    .select("filepath, content_hash");

  if (error) {
    throw new Error(`Failed to fetch existing hashes: ${error.message}`);
  }

  const hashMap = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.content_hash) {
      hashMap.set(row.filepath as string, row.content_hash as string);
    }
  }

  return hashMap;
}
