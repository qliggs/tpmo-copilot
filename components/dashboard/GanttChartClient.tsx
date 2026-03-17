"use client";

import { useState } from "react";
import GanttChart from "./GanttChart";

type GanttView = "date" | "initiative" | "quarter";

interface GanttProject {
  readonly name: string;
  readonly status: string | null;
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

export default function GanttChartClient({ projects }: GanttChartClientProps) {
  const [view, setView] = useState<GanttView>("date");

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
      <GanttChart projects={projects} view={view} />
    </div>
  );
}
