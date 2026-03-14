import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env"), override: true });

// Ingestion CLI entry point
// Orchestrates: vault read -> delta detection -> tree building -> Supabase write

import { stat } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { readVault, type VaultDocument } from "./vault-reader.js";
import { buildTree } from "./tree-builder.js";
import {
  createAdminClient,
  upsertDocument,
  upsertTree,
  getExistingHashes,
} from "./supabase-client.js";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  readonly vault: string | null;
  readonly file: string | null;
  readonly force: boolean;
  readonly dryRun: boolean;
  readonly verbose: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let vault: string | null = null;
  let file: string | null = null;
  let force = false;
  let dryRun = false;
  let verbose = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--vault":
        vault = argv[++i] ?? null;
        break;
      case "--file":
        file = argv[++i] ?? null;
        break;
      case "--force":
        force = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--verbose":
        verbose = true;
        break;
      default:
        console.warn(`Unknown flag: ${arg}`);
    }
  }

  return Object.freeze({ vault, file, force, dryRun, verbose });
}

function printUsage(): void {
  console.log(`
Usage: npm run ingest -- [options]

Options:
  --vault <path>   Path to Obsidian vault (required unless --file)
  --file <path>    Ingest a single markdown file
  --force          Ignore content hashes, re-ingest everything
  --dry-run        Parse and build trees, but don't write to Supabase
  --verbose        Extra logging
`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LLM_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Single-file reader (for --file mode)
// ---------------------------------------------------------------------------

async function readSingleFile(filePath: string): Promise<readonly VaultDocument[]> {
  const absPath = resolve(filePath);
  const fileStat = await stat(absPath);

  if (!fileStat.isFile() || !absPath.endsWith(".md")) {
    throw new Error(`Not a markdown file: ${absPath}`);
  }

  // Treat the file's parent directory as the vault root
  const vaultPath = resolve(absPath, "..");
  const docs = await readVault(vaultPath);

  // Filter to just the requested file
  const fname = absPath.split("/").pop() ?? "";
  return docs.filter((d) => d.filename === fname);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.vault && !args.file) {
    printUsage();
    process.exit(1);
  }

  // -- Load documents -------------------------------------------------------
  let allDocs: readonly VaultDocument[];

  if (args.file) {
    console.log(`[VAULT] Reading single file: ${args.file}`);
    allDocs = await readSingleFile(args.file);
  } else {
    const vaultPath = resolve(args.vault!);
    console.log(`[VAULT] Reading files from ${vaultPath}...`);
    allDocs = await readVault(vaultPath);
  }

  console.log(`[VAULT] Found ${allDocs.length} markdown files.`);

  if (allDocs.length === 0) {
    console.log("[VAULT] Nothing to ingest.");
    return;
  }

  // -- Delta detection ------------------------------------------------------
  let docsToProcess: readonly VaultDocument[];
  let skippedCount = 0;

  if (args.force) {
    docsToProcess = allDocs;
    console.log("[DELTA] --force: re-ingesting all files.");
  } else if (args.dryRun) {
    // In dry-run we still process everything (no Supabase calls for hashes)
    docsToProcess = allDocs;
  } else {
    const admin = createAdminClient();
    const existingHashes = await getExistingHashes(admin);

    docsToProcess = allDocs.filter((doc) => {
      const existing = existingHashes.get(doc.filepath);
      return existing !== doc.content_hash;
    });

    skippedCount = allDocs.length - docsToProcess.length;
  }

  console.log(
    `[DELTA] ${allDocs.length} files found. ` +
    `${docsToProcess.length} new/modified. ` +
    `${skippedCount} unchanged (skipping).`,
  );

  if (docsToProcess.length === 0) {
    console.log("[DELTA] All files up to date. Nothing to do.");
    return;
  }

  // -- Init clients ---------------------------------------------------------
  const anthropic = new Anthropic();
  const admin = args.dryRun ? null : createAdminClient();

  // -- Process each file ----------------------------------------------------
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < docsToProcess.length; i++) {
    const doc = docsToProcess[i];

    try {
      if (args.verbose) {
        console.log(`\n[VAULT] Processing: ${doc.filepath}`);
        console.log(`[VAULT]   Title: ${doc.title}`);
        console.log(`[VAULT]   Words: ${doc.word_count.toLocaleString()}`);
        console.log(`[VAULT]   Tags: ${doc.tags.join(", ") || "(none)"}`);
        console.log(`[VAULT]   Hash: ${doc.content_hash.slice(0, 12)}...`);
      }

      // Build the PageIndex tree (logging is inside buildTree with [TREE] prefix)
      const treeResult = await buildTree(doc, anthropic);

      // Write to Supabase unless dry-run
      if (!args.dryRun && admin) {
        const docId = await upsertDocument(admin, doc);
        console.log(`[DB] Upserted document: ${doc.filename} (id: ${docId.slice(0, 8)}...)`);
        await upsertTree(admin, docId, treeResult);
        console.log(`[DB] Upserted tree: ${doc.filename} (${treeResult.node_count} nodes)`);
      }

      if (args.dryRun) {
        console.log(`[TREE] ${doc.filename} [dry-run] -- ${treeResult.node_count} nodes, ${treeResult.max_depth} levels deep`);
      }

      processed++;

      // Delay between LLM calls to avoid rate limiting
      if (i < docsToProcess.length - 1) {
        await sleep(LLM_DELAY_MS);
      }
    } catch (err) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] ${doc.filename}: ${message}`);
    }
  }

  // -- Summary --------------------------------------------------------------
  console.log(
    `\n[DONE] Ingestion complete: ${processed} processed, ${skippedCount} skipped, ${errors} errors.`,
  );

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
