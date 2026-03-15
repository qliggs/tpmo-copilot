"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Cycling words animation
// ---------------------------------------------------------------------------

const CYCLING_WORDS = [
  "remembered.",
  "queryable.",
  "alive.",
  "yours.",
] as const;

// ---------------------------------------------------------------------------
// Status pills
// ---------------------------------------------------------------------------

const STATUS_PILLS = [
  "33 docs indexed",
  "64 projects live",
  "~$0.01/query",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % CYCLING_WORDS.length);
        setFade(true);
      }, 200);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
      {/* Subtle grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Gradient glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-arctic/5 blur-3xl"
      />

      <div className="mx-auto max-w-4xl text-center">
        <p className="font-mono text-sm tracking-widest text-arctic-muted uppercase">
          &#9672; TPMO Intelligence
        </p>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your knowledge,{" "}
          <span
            className={`text-arctic inline-block transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}
          >
            {CYCLING_WORDS[wordIndex]}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-arctic-muted">
          Query years of TPM documentation and live portfolio data in plain
          English. Built on vectorless RAG — no embeddings, no vector
          database, no hallucinations.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg bg-arctic px-6 py-3 text-sm font-semibold text-graphite-950 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arctic-muted"
          >
            Launch Copilot
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] px-6 py-3 text-sm font-semibold text-arctic-muted transition hover:border-white/[0.14] hover:text-white"
          >
            See how it works &#8595;
          </a>
        </div>

        {/* Status pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {STATUS_PILLS.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-white/[0.07] bg-graphite-800/50 px-3 py-1 font-mono text-[11px] text-arctic-muted"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
