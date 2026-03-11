// Content Hashing Utility
// Computes a deterministic SHA-256 hash of document/node content.
// Used for change detection during incremental ingestion —
// if the hash hasn't changed, skip re-processing and re-embedding.

import { createHash } from "node:crypto";

/** Returns a hex-encoded SHA-256 hash of the given content string. */
export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}
