// POST /api/ingest
// Remote ingestion trigger, protected by INGEST_SECRET.
// V0: stub — returns a message directing to the CLI.
// V1 will implement full remote ingestion (e.g., triggered from Discord).

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const { secret } = body as { secret: unknown };
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

    return NextResponse.json({
      message: "Use the CLI for ingestion. Remote ingestion coming in V1.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/ingest] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
