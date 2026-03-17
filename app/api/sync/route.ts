// POST /api/sync
// Triggers a Notion -> Supabase sync of both the Book of Work and Engineers databases.
// Auth priority:
//   1. Valid NextAuth session -> allow (admin UI)
//   2. Authorization header matching INGEST_SECRET -> allow (external callers)
//   3. Otherwise -> 401
// Called manually from the admin UI or nightly via Vercel cron.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  syncNotionToSupabase,
  syncEngineersFromNotion,
  type SyncResult,
} from "@/lib/notion-sync";

type SyncBucket = SyncResult | { readonly error: string };

/** Run both syncs independently — one failure doesn't block the other. */
async function runSyncs(trigger: "cron" | "manual") {
  let projects: SyncBucket | null = null;
  let engineers: SyncBucket | null = null;

  try {
    projects = await syncNotionToSupabase(trigger);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown project sync error";
    console.error("[/api/sync] Project sync failed:", err);
    projects = { error: msg };
  }

  try {
    engineers = await syncEngineersFromNotion(trigger);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown engineer sync error";
    console.error("[/api/sync] Engineer sync failed:", err);
    engineers = { error: msg };
  }

  const hasProjectError = projects !== null && "error" in projects;
  const hasEngineerError = engineers !== null && "error" in engineers;
  const allFailed = hasProjectError && hasEngineerError;

  return {
    success: !allFailed,
    projects,
    engineers,
    message: allFailed
      ? "Both syncs failed"
      : hasProjectError
        ? "Engineer sync succeeded; project sync failed"
        : hasEngineerError
          ? "Project sync succeeded; engineer sync failed"
          : "Sync complete",
  };
}

export async function POST(request: NextRequest) {
  try {
    // Auth check: session first, then Authorization header
    const session = await auth();
    const authHeader = request.headers.get("authorization");
    const ingestSecret = process.env.INGEST_SECRET ?? "";

    const hasSession = !!session?.user;
    const hasValidHeader =
      ingestSecret && authHeader === `Bearer ${ingestSecret}`;

    if (!hasSession && !hasValidHeader) {
      return NextResponse.json(
        { success: false, projects: null, engineers: null, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { triggered_by } = body as { triggered_by?: unknown };
    const trigger = triggered_by === "cron" ? "cron" as const : "manual" as const;

    return NextResponse.json(await runSyncs(trigger));
  } catch (err) {
    // Outermost catch — auth or body parsing failure
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/sync] Error:", err);
    return NextResponse.json(
      { success: false, projects: null, engineers: null, message },
      { status: 500 },
    );
  }
}

// GET handler for Vercel cron -- cron jobs send GET requests
export async function GET(request: NextRequest) {
  // Verify cron secret via Authorization header (Vercel sets CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, projects: null, engineers: null, message: "Unauthorized" },
      { status: 401 },
    );
  }

  return NextResponse.json(await runSyncs("cron"));
}
