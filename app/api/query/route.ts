export const runtime = "edge";
export const maxDuration = 300;

// POST /api/query
// Accepts a user question, runs the RAG pipeline, streams the answer via SSE.
// Rate-limited to 10 requests/minute per IP (in-memory, resets on cold start).

import { streamRAGQuery } from "@/lib/rag";

// ---------------------------------------------------------------------------
// Rate limiter (in-memory — upgrade to Upstash for production)
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
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return jsonResponse(
      { error: "Rate limit exceeded. Max 10 requests per minute." },
      429,
    );
  }

  // Parse and validate body
  let question: string;

  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return jsonResponse(
        { error: "Request body must be a JSON object." },
        400,
      );
    }

    const q = (body as Record<string, unknown>).question;

    if (typeof q !== "string" || q.trim().length === 0) {
      return jsonResponse(
        { error: "question must be a non-empty string." },
        400,
      );
    }

    if (q.length > 500) {
      return jsonResponse(
        { error: "question must be 500 characters or fewer." },
        400,
      );
    }

    question = q.trim();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  // Read optional session ID for conversation memory
  const sessionId = request.headers.get("x-session-id") || undefined;

  // Stream the response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamRAGQuery(question, sessionId, (text) => {
          controller.enqueue(
            encoder.encode(sseEvent({ type: "chunk", text })),
          );
        });

        controller.enqueue(
          encoder.encode(
            sseEvent({ type: "sources", sources: result.sources }),
          ),
        );

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "done",
              latencyMs: result.latency_ms,
              reasoning: result.reasoning,
            }),
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Internal server error";
        console.error("[/api/query] Streaming error:", err);
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", message })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
