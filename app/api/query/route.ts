// POST /api/query
// Accepts a user question, runs the 3-step RAG pipeline, returns a cited answer.
// Rate-limited to 10 requests/minute per IP (in-memory, resets on restart).

import { NextRequest, NextResponse } from "next/server";
import { runRAGQuery } from "@/lib/rag";

// ---------------------------------------------------------------------------
// Rate limiter (in-memory — upgrade to Redis/Upstash for production)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) {
    return true;
  }

  rateLimitMap.set(ip, { count: entry.count + 1, resetAt: entry.resetAt });
  return false;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 requests per minute." },
      { status: 429 },
    );
  }

  try {
    // Parse and validate body
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const { question } = body as { question: unknown };

    if (typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "question must be a non-empty string." },
        { status: 400 },
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: "question must be 500 characters or fewer." },
        { status: 400 },
      );
    }

    // Run RAG pipeline
    const result = await runRAGQuery(question.trim());

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      reasoning: result.reasoning,
      latency_ms: result.latency_ms,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/query] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
