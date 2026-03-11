"use client";

import { useState } from "react";
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
            ? "bg-gray-700/60 text-gray-100"
            : "bg-gray-800 border border-gray-700/50 text-gray-100"
        }`}
      >
        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}

        {/* Footer: latency + reasoning toggle */}
        {!isUser && (message.reasoning || message.latency_ms) && (
          <div className="mt-3 pt-2 border-t border-gray-700/50 flex items-center gap-3">
            {message.latency_ms && (
              <span className="text-[10px] font-mono text-gray-500">
                {(message.latency_ms / 1000).toFixed(1)}s
              </span>
            )}
            {message.reasoning && (
              <button
                onClick={() => setShowReasoning((prev) => !prev)}
                className="text-[10px] font-mono text-gray-500 hover:text-blue-400 transition-colors cursor-pointer"
              >
                {showReasoning ? "Hide reasoning" : "Show reasoning"}
              </button>
            )}
          </div>
        )}

        {/* Reasoning trace (collapsible) */}
        {showReasoning && message.reasoning && (
          <div className="mt-2 p-3 rounded bg-gray-900/80 border border-gray-700/40">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-2">
              Reasoning Trace
            </p>
            <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {message.reasoning}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
