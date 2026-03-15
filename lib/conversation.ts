// Conversation memory — persists turns within a session so follow-up
// questions ("tell me more", "compare that to…") resolve correctly.
//
// Uses supabaseAdmin (service role) for all operations since this
// runs server-side in the edge function.

import { supabaseAdmin as getAdmin } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WINDOW = 10;

function getWindowSize(): number {
  const env = process.env.MEMORY_WINDOW_TURNS;
  if (!env) return DEFAULT_WINDOW;
  const parsed = parseInt(env, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save a single conversation turn to the history table.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  queryId?: string,
): Promise<void> {
  try {
    const { error } = await getAdmin()
      .from("conversation_history")
      .insert({
        session_id: sessionId,
        role,
        content,
        query_id: queryId ?? null,
      });

    if (error) {
      console.warn(`[conversation] Failed to save message: ${error.message}`);
    }
  } catch (err) {
    console.warn("[conversation] Save error:", err);
  }
}

/**
 * Fetch the most recent N turns for a session, ordered oldest-first.
 * Returns an empty array if the session has no history or on error.
 */
export async function getHistory(
  sessionId: string,
  windowSize?: number,
): Promise<readonly ConversationTurn[]> {
  const limit = windowSize ?? getWindowSize();

  try {
    // Fetch newest N rows, then reverse to chronological order
    const { data, error } = await getAdmin()
      .from("conversation_history")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`[conversation] Failed to fetch history: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Reverse so oldest is first (chronological)
    return (data as ConversationTurn[]).reverse();
  } catch (err) {
    console.warn("[conversation] History fetch error:", err);
    return [];
  }
}

/**
 * Format conversation history into a context block for the LLM prompt.
 * Returns the enriched query string that includes prior turns.
 * If history is empty, returns the original question unchanged.
 */
export function formatHistoryForPrompt(
  history: readonly ConversationTurn[],
  currentQuestion: string,
): string {
  if (history.length === 0) return currentQuestion;

  const turns = history
    .map((t) => `${t.role}: ${t.content}`)
    .join("\n");

  return [
    "Conversation history (most recent last):",
    turns,
    "",
    `Current question: ${currentQuestion}`,
  ].join("\n");
}
