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

  // Collapsed summaries
  const highestLoadTeam = [...teamLoad].sort((a, b) => b.count - a.count)[0];
  const teamLoadSummary = `${teamLoad.length} teams` +
    (highestLoadTeam ? ` · ${highestLoadTeam.team} at highest load` : "");

  const uniqueTeams = new Set(allocations.map((a) => a.team));
  const engineersSummary = `${allocations.length} engineers · ${uniqueTeams.size} teams`;

  const criticalCount = projects.filter((p) => p.priority === "P0").length;
  const projectTableSummary = `${projects.length} projects` +
    (criticalCount > 0 ? ` · ${criticalCount} critical` : "");

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <AppNav />
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page header */}
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
              Portfolio Dashboard
            </h1>
            <p className="mt-1 text-base text-text-muted">Book of Work overview</p>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Projects" value={stats.total} accentColor="#E8417A" />
            <StatCard label="Active" value={stats.active} accentColor="#F4785A" />
            <StatCard label="Total Resources" value={stats.totalResources} accentColor="#F5D06A" />
            <StatCard label="Teams" value={stats.teamCount} accentColor="#8B4FC8" />
          </div>

          {/* Gantt chart — defaultOpen */}
          <CollapsiblePanel title="Timeline" defaultOpen>
            <GanttChartClient projects={projects} />
          </CollapsiblePanel>

          {/* Capacity Heatmap + Status Breakdown — defaultOpen */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CollapsiblePanel title="Capacity Heatmap" defaultOpen>
              <CapacityHeatmap cells={heatmapCells} />
            </CollapsiblePanel>
            <CollapsiblePanel title="Status Breakdown" defaultOpen>
              <StatusPanel statusBreakdown={statusBreakdown} />
            </CollapsiblePanel>
          </div>

          {/* Risk Signals — defaultOpen */}
          <CollapsiblePanel title={`Risk Signals (${riskSignals.length + engineerRisks.length})`} defaultOpen>
            <RiskPanel riskSignals={riskSignals} engineerRisks={engineerRisks} />
          </CollapsiblePanel>

          {/* Team Load — collapsed by default */}
          <CollapsiblePanel title="Team Load" defaultOpen={false} summary={teamLoadSummary}>
            <TeamLoadPanel teamLoad={teamLoad} />
          </CollapsiblePanel>

          {/* Engineers — collapsed by default */}
          <CollapsiblePanel title="Engineers" defaultOpen={false} summary={engineersSummary}>
            <EngineersPanel allocations={allocations} />
          </CollapsiblePanel>

          {/* Project table — collapsed by default */}
          <CollapsiblePanel title="Project Table" defaultOpen={false} summary={projectTableSummary}>
            <ProjectTable projects={projects} />
          </CollapsiblePanel>
        </div>
      </main>
    </div>
  );
}
