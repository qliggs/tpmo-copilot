"use client";

import { useState, useMemo } from "react";
import GanttChart from "./GanttChart";

type GanttView = "date" | "initiative" | "quarter";

interface GanttProject {
  readonly name: string;
  readonly status: string | null;
  readonly priority: string | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly team: string | null;
  readonly deliverable: string | null;
  readonly quarter: string | null;
  readonly theme: string | null;
}

interface GanttChartClientProps {
  readonly projects: readonly GanttProject[];
}

// ---------------------------------------------------------------------------
// Period definitions
// ---------------------------------------------------------------------------

const PERIODS = [
  { label: "Q1 2026", start: "2026-01-01", end: "2026-03-31" },
  { label: "Q2 2026", start: "2026-04-01", end: "2026-06-30" },
  { label: "Q3 2026", start: "2026-07-01", end: "2026-09-30" },
  { label: "Q4 2026", start: "2026-10-01", end: "2026-12-31" },
  { label: "H1 2026", start: "2026-01-01", end: "2026-06-30" },
  { label: "H2 2026", start: "2026-07-01", end: "2026-12-31" },
  { label: "Annual", start: "2026-01-01", end: "2026-12-31" },
] as const;

function getCurrentQuarterLabel(): string {
  const now = new Date();
  const month = now.getMonth();
  if (month < 3) return "Q1 2026";
  if (month < 6) return "Q2 2026";
  if (month < 9) return "Q3 2026";
  return "Q4 2026";
}

export default function GanttChartClient({ projects }: GanttChartClientProps) {
  const [view, setView] = useState<GanttView>("date");
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentQuarterLabel());

  const period = PERIODS.find((p) => p.label === selectedPeriod) ?? PERIODS[1];

  // Filter projects to selected period window (when in quarter view)
  const filteredProjects = useMemo(() => {
    if (view !== "quarter") return projects;

    const windowStart = new Date(period.start).getTime();
    const windowEnd = new Date(period.end).getTime();

    return projects.filter((p) => {
      const start = p.start_date ? new Date(p.start_date).getTime() : null;
      const end = p.end_date ? new Date(p.end_date).getTime() : null;

      // Include if project overlaps the window
      if (start !== null && end !== null) {
        return start <= windowEnd && end >= windowStart;
      }
      if (start !== null) {
        return start <= windowEnd && start >= windowStart;
      }
      // Match by quarter tag
      if (p.quarter) {
        const q = p.quarter.toUpperCase().trim();
        const periodKey = selectedPeriod.replace(" 2026", "").toUpperCase();
        return q.includes(periodKey) || q === "ANNUAL";
      }
      return true;
    });
  }, [projects, view, period, selectedPeriod]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["date", "initiative", "quarter"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              view === v
                ? "bg-neon-magenta text-white"
                : "bg-bg-elevated text-text-muted hover:text-text-primary"
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Period selector — visible in quarter view */}
      {view === "quarter" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSelectedPeriod(p.label)}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition border ${
                selectedPeriod === p.label
                  ? "bg-neon-magenta text-white border-neon-magenta"
                  : "bg-bg-elevated text-text-muted border-white/[0.07] hover:text-text-primary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <GanttChart
        projects={filteredProjects}
        view={view}
        periodRange={view === "quarter" ? { start: period.start, end: period.end } : undefined}
      />
    </div>
  );
}
