"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { TextRewind } from "@/components/ui/text-rewind";
import { ButtonColorful } from "@/components/ui/button-colorful";

// ---------------------------------------------------------------------------
// Cycling words animation
// ---------------------------------------------------------------------------

const CYCLING_WORDS = ["remembered", "alive", "searchable", "yours"] as const;

const CYCLE_INTERVAL_MS = 3000;

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

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % CYCLING_WORDS.length);
    }, CYCLE_INTERVAL_MS);
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
        className="absolute top-0 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-neon-magenta/5 blur-3xl"
      />

      <div className="mx-auto max-w-4xl text-center">
        {/* Overline */}
        <TextRewind
          text="TPMO INTELLIGENCE"
          className="text-sm tracking-widest !text-neon-magenta !not-italic !font-mono !font-normal"
        />

        {/* Two-line heading */}
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          <span className="block">
            Your knowledge
            <span className="text-neon-gold">,</span>
          </span>
          <span className="block h-[1.2em]">
            <AnimatePresence mode="wait">
              <motion.span
                key={CYCLING_WORDS[wordIndex]}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="inline-block text-neon-magenta"
                style={{
                  textShadow: "0 0 30px rgba(232,65,122,0.35)",
                }}
              >
                {CYCLING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
            <span className="text-neon-gold">.</span>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
          Ask it anything. It actually knows your work. Powered by a custom
          indexing architecture — no embeddings, no vector database, no
          guessing.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/chat">
            <ButtonColorful label="Launch Copilot" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] px-6 py-3 text-sm font-semibold text-text-muted transition hover:border-white/[0.14] hover:text-white"
          >
            See how it works &#8595;
          </a>
        </div>

        {/* Status pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {STATUS_PILLS.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-neon-magenta/20 bg-bg-elevated/50 px-3 py-1 font-mono text-[11px] text-text-muted"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
