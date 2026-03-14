// GET /api/sync/status
// Returns the latest sync status for the admin UI.
// No auth required — read-only, non-sensitive aggregate data.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Latest sync log entry
    const { data: latestSync } = await supabase
      .from("sync_log")
      .select("synced_at, records_total, records_added, records_updated, records_unchanged")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Current project count
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      lastSynced: latestSync?.synced_at ?? null,
      totalRecords: count ?? 0,
      added: latestSync?.records_added ?? 0,
      updated: latestSync?.records_updated ?? 0,
      unchanged: latestSync?.records_unchanged ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/sync/status] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
