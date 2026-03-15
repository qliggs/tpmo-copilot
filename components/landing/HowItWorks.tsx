"use client";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

// ---------------------------------------------------------------------------
// Pipeline step content
// ---------------------------------------------------------------------------

const PIPELINE_STEPS = [
  {
    title: "1. Document Selection",
    description:
      "Your question is analyzed against the full catalog of indexed documents. An AI reasoning step identifies which files are most likely to contain the answer — no keyword matching or vector similarity required.",
    content: (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-emerald-500">
        <div className="flex flex-col items-center gap-3 text-white">
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <span className="text-sm font-semibold">Catalog Scan</span>
        </div>
      </div>
    ),
  },
  {
    title: "2. Node Navigation",
    description:
      "Each selected document is structured as a navigable tree. The system walks the hierarchy — headings, sub-sections, bullet points — and selects the exact nodes that are relevant to your question.",
    content: (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-indigo-500">
        <div className="flex flex-col items-center gap-3 text-white">
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
          <span className="text-sm font-semibold">Tree Traversal</span>
        </div>
      </div>
    ),
  },
  {
    title: "3. Answer Generation",
    description:
      "The selected nodes' raw text is assembled as context for Claude. The answer is streamed token-by-token with full source citations, so you know exactly where every claim comes from.",
    content: (
      <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-yellow-500">
        <div className="flex flex-col items-center gap-3 text-white">
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
          <span className="text-sm font-semibold">Stream Answer</span>
        </div>
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <p className="font-mono text-sm tracking-widest text-blue-400 uppercase">
            How It Works
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three-step reasoning pipeline
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Not just vector search. TPMO Copilot reasons through your document
            structure to find precise answers.
          </p>
        </div>

        <StickyScroll content={PIPELINE_STEPS} />
      </div>
    </section>
  );
}
