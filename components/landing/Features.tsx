"use client";

import { GlowingEffect } from "@/components/ui/glowing-effect";

// ---------------------------------------------------------------------------
// Feature data — 5 technical capabilities
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    title: "Vectorless RAG (PageIndex)",
    description:
      "Never lose context buried in old documents again. An AI reads and indexes each document's structure into a tree — retrieval is reasoning, not keyword matching.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
    wide: true,
  },
  {
    title: "3-Step Query Pipeline",
    description:
      "Get precise answers, not document dumps. Every query narrows from all docs to the top 5, then to the 8 most relevant sections, then to a grounded answer.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    wide: false,
  },
  {
    title: "Hybrid Inference",
    description:
      "Enterprise-grade answers at indie-project cost. Cheaper models handle selection, Claude Sonnet handles synthesis — $0.01/query instead of $0.15.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    wide: false,
  },
  {
    title: "Dual-Source Intelligence",
    description:
      "One question, two knowledge bases. Your Obsidian vault history and live Notion portfolio are queried simultaneously — the system picks the right source automatically.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    wide: false,
  },
  {
    title: "Conversational Memory",
    description:
      "Ask follow-up questions that actually work. Session memory means the copilot remembers what you just discussed — no re-explaining, no lost context.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    wide: false,
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Features() {
  return (
    <section id="features" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="font-mono text-sm tracking-widest text-neon-magenta uppercase">
            Architecture
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Why it works when others don&apos;t
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-muted">
            Not another wrapper around an LLM. TPMO Copilot uses structured
            document trees, multi-model routing, and dual-source intelligence
            to deliver grounded answers at minimal cost.
          </p>
        </div>

        {/* Grid: first card full-width, rest 2-col */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className={`relative rounded-xl border border-white/[0.07] bg-bg-elevated/30 p-6 ${feature.wide ? "sm:col-span-2" : ""}`}
            >
              <GlowingEffect
                spread={60}
                glow
                disabled={false}
                proximity={80}
                inactiveZone={0.01}
                borderWidth={4}
              />
              <div className="relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-magenta/10 text-neon-magenta">
                  {feature.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
