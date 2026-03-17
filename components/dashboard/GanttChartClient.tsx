"use client";

import { useState, useMemo } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import GanttChart from "./GanttChart";

type GanttView = "date" | "initiative" | "quarter" | "team";

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
// Tab definitions
// ---------------------------------------------------------------------------

const GANTT_TABS = [
  { id: "date", label: "Date" },
  { id: "initiative", label: "Initiative" },
  { id: "quarter", label: "Quarter" },
  { id: "team", label: "Team" },
] as const;

// ---------------------------------------------------------------------------
// Team definitions
// ---------------------------------------------------------------------------

const TEAMS = [
  "Endpoint Engineering",
  "Productivity Apps",
  "Infrastructure",
  "Service Desk",
  "NetOps",
  "TPMO",
] as const;

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

function getTeamViewRange(): { start: string; end: string } {
  const now = new Date();
  const month = now.getMonth();
  const qStart = Math.floor(month / 3) * 3;
  const start = new Date(now.getFullYear(), qStart, 1);
  const end = new Date(now.getFullYear(), qStart + 6, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function GanttChartClient({ projects }: GanttChartClientProps) {
  const [view, setView] = useState<GanttView>("date");
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentQuarterLabel());
  const [selectedTeam, setSelectedTeam] = useState<string>(TEAMS[0]);

  const period = PERIODS.find((p) => p.label === selectedPeriod) ?? PERIODS[1];

  // Filter projects based on view
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (view === "quarter") {
      const windowStart = new Date(period.start).getTime();
      const windowEnd = new Date(period.end).getTime();

      result = result.filter((p) => {
        const start = p.start_date ? new Date(p.start_date).getTime() : null;
        const end = p.end_date ? new Date(p.end_date).getTime() : null;

        if (start !== null && end !== null) {
          return start <= windowEnd && end >= windowStart;
        }
        if (start !== null) {
          return start <= windowEnd && start >= windowStart;
        }
        if (p.quarter) {
          const q = p.quarter.toUpperCase().trim();
          const periodKey = selectedPeriod.replace(" 2026", "").toUpperCase();
          return q.includes(periodKey) || q === "ANNUAL";
        }
        return true;
      });
    }

    if (view === "team") {
      result = result.filter((p) => p.team === selectedTeam);
    }

    return result;
  }, [projects, view, period, selectedPeriod, selectedTeam]);

  // Compute period range for team/quarter views
  const periodRange = useMemo(() => {
    if (view === "quarter") {
      return { start: period.start, end: period.end };
    }
    if (view === "team") {
      return getTeamViewRange();
    }
    return undefined;
  }, [view, period]);

  return (
    <div>
      {/* AnimatedTabs — active bubble uses neon-magenta */}
      <div className="mb-4 [&_span[class*='bg-primary']]:!bg-neon-magenta">
        <AnimatedTabs
          tabs={[...GANTT_TABS]}
          defaultTab="date"
          onChange={(tabId) => setView(tabId as GanttView)}
        />
      </div>

      {/* Period selector — visible in quarter view */}
      {view === "quarter" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSelectedPeriod(p.label)}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition border cursor-pointer ${
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

      {/* Team selector — visible in team view */}
      {view === "team" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {TEAMS.map((team) => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-medium transition border cursor-pointer ${
                selectedTeam === team
                  ? "bg-neon-magenta text-white border-neon-magenta"
                  : "bg-bg-elevated text-text-muted border-white/[0.07] hover:text-text-primary"
              }`}
            >
              {team}
            </button>
          ))}
        </div>
      )}

      <GanttChart
        projects={filteredProjects}
        view={view}
        periodRange={periodRange}
        selectedTeam={view === "team" ? selectedTeam : undefined}
      />
    </div>
  );
}
