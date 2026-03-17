"use client";

import React, { useState } from "react";

// ---------------------------------------------------------------------------
// SVG Diagrams for each capability
// ---------------------------------------------------------------------------

function RagQueryDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <rect x="50" y="8" width="100" height="28" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <text x="100" y="27" textAnchor="middle" fill="#F2F2F4" fontSize="11" fontFamily="monospace">Query</text>
      <line x1="100" y1="36" x2="100" y2="56" stroke="#E8417A" strokeWidth="1.5" />
      <polygon points="96,52 100,60 104,52" fill="#E8417A" />
      <rect x="50" y="62" width="100" height="28" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <text x="100" y="81" textAnchor="middle" fill="#F2F2F4" fontSize="11" fontFamily="monospace">Filter</text>
      <line x1="100" y1="90" x2="100" y2="110" stroke="#E8417A" strokeWidth="1.5" />
      <polygon points="96,106 100,114 104,106" fill="#E8417A" />
      <rect x="50" y="116" width="100" height="28" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(226,232,240,0.25)" />
      <text x="100" y="135" textAnchor="middle" fill="#F2F2F4" fontSize="11" fontWeight="600" fontFamily="monospace">Answer</text>
    </svg>
  );
}

function PortfolioDashboardDiagram() {
  const teams = [
    { label: "EP", h: 80, color: "#F4785A" },
    { label: "PA", h: 55, color: "#8B4FC8" },
    { label: "INF", h: 95, color: "#F5D06A" },
    { label: "SD", h: 40, color: "#C4A0E0" },
    { label: "NO", h: 70, color: "#E8417A" },
  ];
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <text x="100" y="16" textAnchor="middle" fill="#7A7A85" fontSize="10" fontFamily="monospace">Team Load</text>
      {teams.map((t, i) => {
        const x = 20 + i * 35;
        const barY = 130 - t.h;
        return (
          <g key={t.label}>
            <rect x={x} y={barY} width="24" height={t.h} rx="3" fill={t.color} fillOpacity={0.7} />
            <text x={x + 12} y="148" textAnchor="middle" fill="#7A7A85" fontSize="9" fontFamily="monospace">{t.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CapacityAnalysisDiagram() {
  const cells = [
    [0.2, 0.5, 0.8],
    [0.6, 0.9, 0.3],
    [0.4, 0.7, 1.0],
  ];
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      <text x="100" y="16" textAnchor="middle" fill="#7A7A85" fontSize="10" fontFamily="monospace">Capacity Grid</text>
      {cells.map((row, ri) =>
        row.map((v, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={40 + ci * 44}
            y={28 + ri * 40}
            width="38"
            height="34"
            rx="4"
            fill={`rgba(232, 65, 122, ${v * 0.85 + 0.1})`}
          />
        )),
      )}
    </svg>
  );
}

function ConversationalMemoryDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Bubble 1 */}
      <rect x="10" y="14" width="110" height="30" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <text x="65" y="34" textAnchor="middle" fill="#F2F2F4" fontSize="10" fontFamily="monospace">Show P0 items</text>
      {/* Dotted line */}
      <line x1="65" y1="44" x2="100" y2="58" stroke="#7A7A85" strokeWidth="1" strokeDasharray="3,3" />
      {/* Bubble 2 */}
      <rect x="60" y="60" width="130" height="30" rx="12" fill="rgba(232,65,122,0.15)" stroke="rgba(232,65,122,0.3)" />
      <text x="125" y="80" textAnchor="middle" fill="#F2F2F4" fontSize="10" fontFamily="monospace">3 P0 projects...</text>
      {/* Dotted line */}
      <line x1="100" y1="90" x2="65" y2="104" stroke="#7A7A85" strokeWidth="1" strokeDasharray="3,3" />
      {/* Bubble 3 */}
      <rect x="10" y="106" width="120" height="30" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <text x="70" y="126" textAnchor="middle" fill="#F2F2F4" fontSize="10" fontFamily="monospace">Which is latest?</text>
      {/* Context arrow */}
      <path d="M180 30 Q195 80 180 130" stroke="#F5D06A" strokeWidth="1" strokeDasharray="4,4" fill="none" />
      <text x="190" y="82" fill="#F5D06A" fontSize="8" fontFamily="monospace">ctx</text>
    </svg>
  );
}

function EngineerSyncDiagram() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" fill="none">
      {/* Notion */}
      <rect x="10" y="40" width="70" height="50" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <text x="45" y="62" textAnchor="middle" fill="#F2F2F4" fontSize="11" fontWeight="600" fontFamily="monospace">Notion</text>
      <text x="45" y="78" textAnchor="middle" fill="#7A7A85" fontSize="9" fontFamily="monospace">Source</text>
      {/* Arrow */}
      <line x1="80" y1="65" x2="115" y2="65" stroke="#E8417A" strokeWidth="1.5" />
      <polygon points="111,61 119,65 111,69" fill="#E8417A" />
      {/* Supabase */}
      <rect x="120" y="40" width="70" height="50" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(226,232,240,0.25)" />
      <text x="155" y="62" textAnchor="middle" fill="#F2F2F4" fontSize="11" fontWeight="600" fontFamily="monospace">Supa</text>
      <text x="155" y="78" textAnchor="middle" fill="#7A7A85" fontSize="9" fontFamily="monospace">Target</text>
      {/* Timestamp */}
      <text x="100" y="115" textAnchor="middle" fill="#7A7A85" fontSize="9" fontFamily="monospace">last synced: 2m ago</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Accordion data
// ---------------------------------------------------------------------------

interface AccordionCapability {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly gradient: string;
  readonly diagram: React.ReactNode;
}

const DEFAULT_ITEMS: readonly AccordionCapability[] = [
  {
    id: 1,
    title: "RAG Query",
    description: "3-step pipeline narrows 27 documents to the 8 most relevant content blocks.",
    gradient: "linear-gradient(135deg, #E8417A33, #E8417A11)",
    diagram: <RagQueryDiagram />,
  },
  {
    id: 2,
    title: "Portfolio Dashboard",
    description: "Live Notion sync powers a real-time Book of Work with Gantt, capacity, and risk panels.",
    gradient: "linear-gradient(135deg, #8B4FC833, #8B4FC811)",
    diagram: <PortfolioDashboardDiagram />,
  },
  {
    id: 3,
    title: "Capacity Analysis",
    description: "Heatmaps and utilization metrics reveal engineer load and team bandwidth gaps.",
    gradient: "linear-gradient(135deg, #F4785A33, #F4785A11)",
    diagram: <CapacityAnalysisDiagram />,
  },
  {
    id: 4,
    title: "Conversational Memory",
    description: "Session-aware context means follow-up questions work without re-explaining.",
    gradient: "linear-gradient(135deg, #F5D06A33, #F5D06A11)",
    diagram: <ConversationalMemoryDiagram />,
  },
  {
    id: 5,
    title: "Engineer Sync",
    description: "Automated Notion-to-Supabase pipeline keeps team data fresh via cron or manual trigger.",
    gradient: "linear-gradient(135deg, #C4A0E033, #C4A0E011)",
    diagram: <EngineerSyncDiagram />,
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
        <div className="absolute inset-0 flex flex-col justify-between p-6">
          {/* Diagram at top */}
          <div className="w-full h-[180px] rounded-lg bg-[#0D0D0F] border border-white/[0.07] p-2">
            {item.diagram}
          </div>
          {/* Text at bottom */}
          <div>
            <h3 className="font-display text-xl font-bold text-text-primary mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed font-sans">
              {item.description}
            </p>
          </div>
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
