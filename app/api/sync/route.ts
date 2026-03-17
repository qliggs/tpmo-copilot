// POST /api/sync
// Triggers a Notion -> Supabase sync of both the Book of Work and Engineers databases.
// Auth priority:
//   1. Valid NextAuth session -> allow (admin UI)
//   2. Authorization header matching INGEST_SECRET -> allow (external callers)
//   3. Otherwise -> 401
// Called manually from the admin UI or nightly via Vercel cron.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncNotionToSupabase, syncEngineersFromNotion } from "@/lib/notion-sync";

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
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { triggered_by } = body as { triggered_by?: unknown };

    const trigger = triggered_by === "cron" ? "cron" as const : "manual" as const;
    const [projectResult, engineerResult] = await Promise.all([
      syncNotionToSupabase(trigger),
      syncEngineersFromNotion(trigger),
    ]);

    return NextResponse.json({
      success: true,
      projects: projectResult,
      engineers: engineerResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/sync] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET handler for Vercel cron -- cron jobs send GET requests
export async function GET(request: NextRequest) {
  // Verify cron secret via Authorization header (Vercel sets CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [projectResult, engineerResult] = await Promise.all([
      syncNotionToSupabase("cron"),
      syncEngineersFromNotion("cron"),
    ]);

    return NextResponse.json({
      success: true,
      projects: projectResult,
      engineers: engineerResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/sync] Cron error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
