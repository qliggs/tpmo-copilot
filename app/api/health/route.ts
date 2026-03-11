// GET /api/health
// Returns system health: Supabase connectivity, document count, last ingestion.

import { NextResponse } from "next/server";
import { supabaseAdmin as getAdmin } from "@/lib/supabase";

export async function GET() {
  let supabaseStatus: "connected" | "error" = "error";
  let documentsIndexed = 0;
  let lastIngestion: string | null = null;

  try {
    // Count documents and find most recent ingestion
    const { data, error } = await getAdmin()
      .from("documents")
      .select("ingested_at")
      .order("ingested_at", { ascending: false })
      .limit(1);

    if (!error) {
      supabaseStatus = "connected";

      // Get total count
      const { count, error: countError } = await getAdmin()
        .from("documents")
        .select("id", { count: "exact", head: true });

      if (!countError && count !== null) {
        documentsIndexed = count;
      }

      if (data && data.length > 0) {
        lastIngestion = data[0].ingested_at;
      }
    }
  } catch {
    supabaseStatus = "error";
  }

  return NextResponse.json({
    status: "ok",
    supabase: supabaseStatus,
    documents_indexed: documentsIndexed,
    last_ingestion: lastIngestion,
    version: "v0",
  });
}
