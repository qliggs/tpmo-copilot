// Dashboard Page — data fetching + layout composition.
// Fetches projects and engineers, computes stats, renders decomposed panels.

import { supabaseAdmin as getAdmin } from "@/lib/supabase";
import AppNav from "@/components/AppNav";
import {
  type ProjectRow,
  computeStats,
  computeTeamLoad,
  computeStatusBreakdown,
  computeRiskSignals,
} from "@/lib/portfolio-stats";
import {
  type EngineerRow,
  computeEngineerAllocations,
  computeTeamCapacity,
  computeCapacityHeatmap,
  computeEngineerRisks,
} from "@/lib/engineer-stats";

import StatCard from "@/components/dashboard/StatCard";
import CollapsiblePanel from "@/components/dashboard/CollapsiblePanel";
import GanttChartClient from "@/components/dashboard/GanttChartClient";
import CapacityHeatmap from "@/components/dashboard/CapacityHeatmap";
import StatusPanel from "@/components/dashboard/StatusPanel";
import TeamLoadPanel from "@/components/dashboard/TeamLoadPanel";
import EngineersPanel from "@/components/dashboard/EngineersPanel";
import RiskPanel from "@/components/dashboard/RiskPanel";
import ProjectTable from "@/components/dashboard/ProjectTable";

// ---------------------------------------------------------------------------
// Data fetching (server-side)
// ---------------------------------------------------------------------------

async function getProjects(): Promise<readonly ProjectRow[]> {
  const { data, error } = await getAdmin()
    .from("projects")
    .select("name, team, priority, status, tshirt_size, resources_needed, quarter, theme, deliverable, start_date, end_date")
    .order("name");
  if (error) {
    console.error("[dashboard] Failed to fetch projects:", error.message);
    return [];
  }
  return (data ?? []) as readonly ProjectRow[];
}

async function getEngineers(): Promise<readonly EngineerRow[]> {
  const { data, error } = await getAdmin()
    .from("engineers")
    .select("name, team, capacity, active")
    .order("name");
  if (error) {
    console.error("[dashboard] Failed to fetch engineers:", error.message);
    return [];
  }
  return (data ?? []) as readonly EngineerRow[];
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const [projects, engineers] = await Promise.all([getProjects(), getEngineers()]);

  // Portfolio stats
  const stats = computeStats(projects);
  const teamLoad = computeTeamLoad(projects);
  const statusBreakdown = computeStatusBreakdown(projects);
  const riskSignals = computeRiskSignals(projects);

  // Engineer stats
  const allocations = computeEngineerAllocations(engineers, projects);
  const teamCapacities = computeTeamCapacity(engineers, projects);
  const heatmapCells = computeCapacityHeatmap(engineers, projects);
  const engineerRisks = computeEngineerRisks(allocations, teamCapacities);

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <AppNav />
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page header */}
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight text-text-primary">
              Portfolio Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-text-muted">Book of Work overview</p>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Projects" value={stats.total} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Total Resources" value={stats.totalResources} />
            <StatCard label="Teams" value={stats.teamCount} />
          </div>

          {/* Gantt chart */}
          <CollapsiblePanel title="Timeline">
            <GanttChartClient projects={projects} />
          </CollapsiblePanel>

          {/* Capacity Heatmap + Status Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CollapsiblePanel title="Capacity Heatmap">
              <CapacityHeatmap cells={heatmapCells} />
            </CollapsiblePanel>
            <CollapsiblePanel title="Status Breakdown">
              <StatusPanel statusBreakdown={statusBreakdown} />
            </CollapsiblePanel>
          </div>

          {/* Team Load */}
          <CollapsiblePanel title="Team Load">
            <TeamLoadPanel teamLoad={teamLoad} />
          </CollapsiblePanel>

          {/* Engineers */}
          <CollapsiblePanel title="Engineers">
            <EngineersPanel allocations={allocations} />
          </CollapsiblePanel>

          {/* Risk Signals */}
          <CollapsiblePanel title={`Risk Signals (${riskSignals.length + engineerRisks.length})`}>
            <RiskPanel riskSignals={riskSignals} engineerRisks={engineerRisks} />
          </CollapsiblePanel>

          {/* Project table */}
          <ProjectTable projects={projects} />
        </div>
      </main>
    </div>
  );
}
