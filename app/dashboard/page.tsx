import { supabaseAdmin as getAdmin } from "@/lib/supabase";
import AppNav from "@/components/AppNav";
import {
  type ProjectRow,
  type TeamLoadEntry,
  type StatusEntry,
  type RiskSignal,
  computeStats,
  computeTeamLoad,
  computeStatusBreakdown,
  computeRiskSignals,
} from "@/lib/portfolio-stats";

// ---------------------------------------------------------------------------
// Data fetching (server-side)
// ---------------------------------------------------------------------------

async function getProjects(): Promise<readonly ProjectRow[]> {
  const { data, error } = await getAdmin()
    .from("projects")
    .select(
      "name, team, priority, status, tshirt_size, resources_needed, quarter, theme, deliverable, start_date, end_date",
    )
    .order("name");

  if (error) {
    console.error("[dashboard] Failed to fetch projects:", error.message);
    return [];
  }

  return (data ?? []) as readonly ProjectRow[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-semibold font-mono text-gray-100">
        {value}
      </p>
    </div>
  );
}

function TeamLoadSection({
  teamLoad,
}: {
  readonly teamLoad: readonly TeamLoadEntry[];
}) {
  const maxResources = Math.max(...teamLoad.map((t) => t.resources), 1);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-sm font-semibold text-gray-100 mb-4">Team Load</h2>
      {teamLoad.length === 0 ? (
        <p className="text-xs text-gray-500">No team data available.</p>
      ) : (
        <div className="space-y-3">
          {teamLoad.map((entry) => (
            <div key={entry.team}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">{entry.team}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {entry.count} projects / {entry.resources} FTE
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.round((entry.resources / maxResources) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusSection({
  statusBreakdown,
}: {
  readonly statusBreakdown: readonly StatusEntry[];
}) {
  const total = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  const STATUS_COLORS: Record<string, string> = {
    "In Progress": "bg-blue-500",
    "Not Started": "bg-gray-500",
    "On Track": "bg-emerald-500",
    "At Risk": "bg-amber-500",
    "Blocked": "bg-red-500",
    "Complete": "bg-green-500",
    "Cancelled": "bg-gray-600",
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="text-sm font-semibold text-gray-100 mb-4">
        Status Breakdown
      </h2>
      {statusBreakdown.length === 0 ? (
        <p className="text-xs text-gray-500">No status data available.</p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {statusBreakdown.map((entry) => (
              <div
                key={entry.status}
                className={`${STATUS_COLORS[entry.status] ?? "bg-gray-500"} transition-all`}
                style={{
                  width: total > 0 ? `${(entry.count / total) * 100}%` : "0%",
                }}
                title={`${entry.status}: ${entry.count}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {statusBreakdown.map((entry) => (
              <div key={entry.status} className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[entry.status] ?? "bg-gray-500"}`}
                />
                <span className="text-xs text-gray-400">
                  {entry.status}{" "}
                  <span className="font-mono text-gray-500">
                    ({entry.count})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RiskSection({
  riskSignals,
}: {
  readonly riskSignals: readonly RiskSignal[];
}) {
  if (riskSignals.length === 0) return null;

  const SEVERITY_STYLES: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-8">
      <h2 className="text-sm font-semibold text-gray-100 mb-4">
        Risk Signals{" "}
        <span className="text-xs font-normal text-gray-500">
          ({riskSignals.length})
        </span>
      </h2>
      <div className="space-y-2">
        {riskSignals.map((signal, i) => (
          <div
            key={`${signal.project}-${signal.signal}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-gray-800 px-3 py-2"
          >
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[signal.severity] ?? ""}`}
            >
              {signal.severity}
            </span>
            <span className="text-xs text-gray-300 font-medium">
              {signal.project}
            </span>
            <span className="text-xs text-gray-500">{signal.signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectTable({
  projects,
}: {
  readonly projects: readonly ProjectRow[];
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-sm text-gray-500">
          No projects found. Run a Notion sync from the{" "}
          <a href="/admin" className="text-blue-400 hover:underline">
            Admin
          </a>{" "}
          page to populate the dashboard.
        </p>
      </div>
    );
  }

  const PRIORITY_COLORS: Record<string, string> = {
    P0: "text-red-400",
    P1: "text-amber-400",
    P2: "text-blue-400",
    P3: "text-gray-400",
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-100">
          All Projects{" "}
          <span className="text-xs font-normal text-gray-500">
            ({projects.length})
          </span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Team</th>
              <th className="text-left px-5 py-3 font-medium">Priority</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Size</th>
              <th className="text-right px-5 py-3 font-medium">Resources</th>
              <th className="text-left px-5 py-3 font-medium">Quarter</th>
              <th className="text-left px-5 py-3 font-medium">Dates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {projects.map((p) => (
              <tr
                key={p.name}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-5 py-3 text-gray-200 font-medium max-w-[200px] truncate">
                  {p.name}
                </td>
                <td className="px-5 py-3 text-gray-400">
                  {p.team ?? "—"}
                </td>
                <td
                  className={`px-5 py-3 font-mono font-semibold ${PRIORITY_COLORS[p.priority ?? ""] ?? "text-gray-500"}`}
                >
                  {p.priority ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-400">
                  {p.status ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-400 font-mono">
                  {p.tshirt_size ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-400 font-mono text-right">
                  {p.resources_needed ?? 0}
                </td>
                <td className="px-5 py-3 text-gray-400 font-mono">
                  {p.quarter ?? "—"}
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono whitespace-nowrap">
                  {p.start_date ?? "TBD"} — {p.end_date ?? "TBD"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const projects = await getProjects();
  const stats = computeStats(projects);
  const teamLoad = computeTeamLoad(projects);
  const statusBreakdown = computeStatusBreakdown(projects);
  const riskSignals = computeRiskSignals(projects);

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <AppNav />
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-lg font-semibold text-gray-100 tracking-tight">
              Portfolio Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Book of Work overview
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard label="Total Projects" value={stats.total} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Total Resources" value={stats.totalResources} />
            <StatCard label="Teams" value={stats.teamCount} />
          </div>

          {/* Team load + Status breakdown */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <TeamLoadSection teamLoad={teamLoad} />
            <StatusSection statusBreakdown={statusBreakdown} />
          </div>

          {/* Risk signals */}
          <RiskSection riskSignals={riskSignals} />

          {/* Project table */}
          <ProjectTable projects={projects} />
        </div>
      </main>
    </div>
  );
}
