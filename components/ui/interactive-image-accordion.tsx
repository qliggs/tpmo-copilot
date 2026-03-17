"use client";

import React, { useState } from "react";

// ---------------------------------------------------------------------------
// Accordion data
// ---------------------------------------------------------------------------

interface AccordionCapability {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly gradient: string;
}

const DEFAULT_ITEMS: readonly AccordionCapability[] = [
  {
    id: 1,
    title: "RAG Query",
    description: "3-step pipeline narrows 27 documents to the 8 most relevant content blocks.",
    gradient: "linear-gradient(135deg, #E8417A33, #E8417A11)",
  },
  {
    id: 2,
    title: "Portfolio Dashboard",
    description: "Live Notion sync powers a real-time Book of Work with Gantt, capacity, and risk panels.",
    gradient: "linear-gradient(135deg, #8B4FC833, #8B4FC811)",
  },
  {
    id: 3,
    title: "Capacity Analysis",
    description: "Heatmaps and utilization metrics reveal engineer load and team bandwidth gaps.",
    gradient: "linear-gradient(135deg, #F4785A33, #F4785A11)",
  },
  {
    id: 4,
    title: "Conversational Memory",
    description: "Session-aware context means follow-up questions work without re-explaining.",
    gradient: "linear-gradient(135deg, #F5D06A33, #F5D06A11)",
  },
  {
    id: 5,
    title: "Engineer Sync",
    description: "Automated Notion-to-Supabase pipeline keeps team data fresh via cron or manual trigger.",
    gradient: "linear-gradient(135deg, #C4A0E033, #C4A0E011)",
  },
];

// ---------------------------------------------------------------------------
// Accordion Item
// ---------------------------------------------------------------------------

function AccordionPanel({
  item,
  isActive,
  onMouseEnter,
}: {
  readonly item: AccordionCapability;
  readonly isActive: boolean;
  readonly onMouseEnter: () => void;
}) {
  return (
    <div
      className={`
        relative h-[400px] rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-700 ease-in-out border border-white/[0.07]
        ${isActive ? "w-[360px]" : "w-[60px]"}
      `}
      onMouseEnter={onMouseEnter}
      style={{ background: isActive ? item.gradient : "var(--color-bg-elevated)" }}
    >
      {/* Dark background */}
      <div className="absolute inset-0 bg-bg-primary/80" />

      {/* Active content */}
      {isActive && (
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h3 className="font-display text-xl font-bold text-text-primary mb-2">
            {item.title}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed font-sans">
            {item.description}
          </p>
        </div>
      )}

      {/* Inactive: rotated label */}
      <span
        className={`
          absolute text-text-primary text-sm font-display font-semibold whitespace-nowrap
          transition-all duration-300 ease-in-out
          ${
            isActive
              ? "opacity-0"
              : "bottom-24 left-1/2 -translate-x-1/2 rotate-90"
          }
        `}
      >
        {item.title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function LandingAccordionItem({
  items = DEFAULT_ITEMS,
}: {
  readonly items?: readonly AccordionCapability[];
} = {}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="flex flex-row items-center justify-center gap-3 overflow-x-auto py-4">
      {items.map((item, index) => (
        <AccordionPanel
          key={item.id}
          item={item}
          isActive={index === activeIndex}
          onMouseEnter={() => setActiveIndex(index)}
        />
      ))}
    </div>
  );
}
