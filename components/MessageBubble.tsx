"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitation from "./SourceCitation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Source {
  readonly filename: string;
  readonly section_path: readonly string[];
}

export interface Message {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly sources?: readonly Source[];
  readonly reasoning?: string;
  readonly latency_ms?: number;
}

interface MessageBubbleProps {
  readonly message: Message;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-bg-elevated/60 text-text-primary"
            : "bg-bg-elevated border border-white/[0.07] text-text-primary"
        }`}
      >
        {/* Message content */}
        {isUser ? (
          <div className="text-base font-sans leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="prose-chat text-base font-sans leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}

        {/* Footer: latency + reasoning toggle */}
        {!isUser && (message.reasoning || message.latency_ms) && (
          <div className="mt-3 pt-2 border-t border-white/[0.07] flex items-center gap-3">
            {message.latency_ms && (
              <span className="text-[10px] font-mono text-text-muted">
                {(message.latency_ms / 1000).toFixed(1)}s
              </span>
            )}
            {message.reasoning && (
              <button
                onClick={() => setShowReasoning((prev) => !prev)}
                className="text-[10px] font-mono text-text-muted hover:text-neon-magenta transition-colors cursor-pointer"
              >
                {showReasoning ? "Hide reasoning" : "Show reasoning"}
              </button>
            )}
          </div>
        )}

        {/* Reasoning trace (collapsible) */}
        {showReasoning && message.reasoning && (
          <div className="mt-2 p-3 rounded bg-bg-surface/80 border border-white/[0.07]">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest mb-2">
              Reasoning Trace
            </p>
            <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {message.reasoning}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
