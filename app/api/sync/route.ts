// POST /api/sync
// Triggers a Notion → Supabase sync of the Book of Work database.
// Protected by INGEST_SECRET (same auth pattern as /api/ingest).
// Called manually from the admin UI or nightly via Vercel cron.

import { NextRequest, NextResponse } from "next/server";
import { syncNotionToSupabase } from "@/lib/notion-sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const { secret, triggered_by } = body as {
      secret: unknown;
      triggered_by?: unknown;
    };

    const expectedSecret = process.env.INGEST_SECRET ?? "";

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "INGEST_SECRET is not configured on the server." },
        { status: 500 },
      );
    }

    if (typeof secret !== "string" || secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid secret." },
        { status: 401 },
      );
    }

    const trigger = triggered_by === "cron" ? "cron" as const : "manual" as const;
    const result = await syncNotionToSupabase(trigger);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/sync] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET handler for Vercel cron — cron jobs send GET requests
export async function GET(request: NextRequest) {
  // Verify cron secret via Authorization header (Vercel sets CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncNotionToSupabase("cron");

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/sync] Cron error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
