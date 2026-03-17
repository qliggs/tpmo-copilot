"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import MessageBubble, { type Message } from "./MessageBubble";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXAMPLE_QUESTIONS = [
  "What was the outcome of the Snowflake security hardening program?",
  "Summarize my most impactful TPM project in 2025",
  "What STAR stories do I have about stakeholder conflict?",
] as const;

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

interface ChunkEvent {
  readonly type: "chunk";
  readonly text: string;
}

interface SourcesEvent {
  readonly type: "sources";
  readonly sources: readonly { filename: string; section_path: readonly string[] }[];
}

interface DoneEvent {
  readonly type: "done";
  readonly latencyMs: number;
  readonly reasoning: string;
}

interface ErrorEvent {
  readonly type: "error";
  readonly message: string;
}

type SSEEvent = ChunkEvent | SourcesEvent | DoneEvent | ErrorEvent;

function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as SSEEvent;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatInterface() {
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Session ID for conversation memory — resets on page refresh (intentional)
  const sessionIdRef = useRef(crypto.randomUUID());

  // Auto-scroll to bottom on new message or streaming update
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setInputValue("");

      // Add user message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const assistantId = `asst-${Date.now()}`;
      let fullContent = "";
      let sources: Message["sources"];
      let reasoning: string | undefined;
      let latencyMs: number | undefined;

      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-ID": sessionIdRef.current,
          },
          body: JSON.stringify({ question: trimmed }),
        });

        // Non-streaming error responses (rate limit, validation)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as Record<string, string>).error ??
              `Request failed (${res.status})`,
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        // Add empty assistant message to fill progressively
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant" as const, content: "" },
        ]);

        const decoder = new TextDecoder();
        let buffer = "";
        let streamStarted = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on double-newline (SSE event boundary)
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const event = parseSSELine(part.trim());
            if (!event) continue;

            switch (event.type) {
              case "chunk": {
                if (!streamStarted) {
                  streamStarted = true;
                  setIsStreaming(true);
                }
                fullContent += event.text;
                const snapshot = fullContent;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: snapshot } : m,
                  ),
                );
                break;
              }
              case "sources":
                sources = event.sources;
                break;
              case "done":
                latencyMs = event.latencyMs;
                reasoning = event.reasoning;
                break;
              case "error":
                throw new Error(event.message);
            }
          }
        }

        // Final update with sources, reasoning, latency
        const finalContent = fullContent;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: finalContent,
                  sources,
                  reasoning,
                  latency_ms: latencyMs,
                }
              : m,
          ),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);

        // Either update existing assistant bubble or add a new error bubble
        setMessages((prev) => {
          const hasAssistant = prev.some((m) => m.id === assistantId);
          if (hasAssistant) {
            return prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullContent || `Error: ${msg}` }
                : m,
            );
          }
          return [
            ...prev,
            {
              id: assistantId,
              role: "assistant" as const,
              content: `Error: ${msg}`,
            },
          ];
        });
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    },
    [isLoading],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuestion(inputValue);
    }
  };

  const handleExampleClick = (question: string) => {
    setInputValue(question);
    submitQuestion(question);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 bg-bg-surface">
      {/* Message thread */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
      >
        {isEmpty ? (
          <EmptyState onExampleClick={handleExampleClick} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Typing indicator — visible while Steps 1+2 run, before first chunk */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start">
            <div className="bg-bg-elevated border border-white/[0.07] rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-neon-magenta rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-neon-magenta rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-neon-magenta rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-text-muted">Searching documents...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.07] px-6 py-4">
        {error && !isLoading && (
          <p className="text-xs text-red-400 mb-2">{error}</p>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-lg bg-bg-elevated border border-white/[0.07] px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-magenta/40 focus:ring-1 focus:ring-neon-magenta/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => submitQuestion(inputValue)}
            disabled={isLoading || inputValue.trim().length === 0}
            className="shrink-0 rounded-lg bg-neon-magenta hover:bg-white text-white hover:text-bg-primary disabled:bg-bg-elevated disabled:text-text-muted px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          Enter to send &middot; Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state with example question chips
// ---------------------------------------------------------------------------

function EmptyState({
  onExampleClick,
}: {
  readonly onExampleClick: (q: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-10 h-10 rounded-lg bg-bg-elevated border border-white/[0.07] flex items-center justify-center mb-4">
        <span className="text-neon-magenta text-lg">?</span>
      </div>
      <h2 className="text-sm font-medium font-display text-text-primary mb-1">
        Ask your knowledge vault
      </h2>
      <p className="text-xs text-text-muted mb-6 max-w-sm">
        Your documents have been indexed into navigable trees.
        Ask a question and the system will reason through the structure to find answers.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-md">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onExampleClick(q)}
            className="text-left text-xs text-text-muted hover:text-text-primary bg-bg-elevated/50 hover:bg-bg-elevated border border-white/[0.07] hover:border-white/[0.12] rounded-lg px-4 py-2.5 transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
