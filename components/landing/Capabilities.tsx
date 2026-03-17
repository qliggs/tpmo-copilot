"use client";

import { LandingAccordionItem } from "@/components/ui/interactive-image-accordion";

export default function Capabilities() {
  return (
    <section id="capabilities" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <p className="font-mono text-sm tracking-widest text-neon-magenta uppercase">
            Capabilities
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Five core capabilities
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-muted">
            Hover to explore each capability. From document retrieval to
            real-time portfolio intelligence.
          </p>
        </div>

        <LandingAccordionItem />
      </div>
    </section>
  );
}
