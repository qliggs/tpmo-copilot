// Portfolio data helpers — pure functions for computing dashboard stats.
// All functions are immutable, taking readonly arrays and returning new objects.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectRow {
  readonly name: string;
  readonly team: string | null;
  readonly priority: string | null;
  readonly status: string | null;
  readonly tshirt_size: string | null;
  readonly resources_needed: number | null;
  readonly quarter: string | null;
  readonly theme: string | null;
  readonly deliverable: string | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
}

export interface DashboardStats {
  readonly total: number;
  readonly active: number;
  readonly totalResources: number;
  readonly teamCount: number;
}

export interface TeamLoadEntry {
  readonly team: string;
  readonly count: number;
  readonly resources: number;
}

export interface StatusEntry {
  readonly status: string;
  readonly count: number;
}

export interface RiskSignal {
  readonly project: string;
  readonly signal: string;
  readonly severity: "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// Stat computation
// ---------------------------------------------------------------------------

export function computeStats(
  projects: readonly ProjectRow[],
): DashboardStats {
  const total = projects.length;

  const active = projects.filter(
    (p) => p.status !== "Complete" && p.status !== "Cancelled",
  ).length;

  const totalResources = projects.reduce(
    (sum, p) => sum + (p.resources_needed ?? 0),
    0,
  );

  const teams = new Set(
    projects.map((p) => p.team).filter(Boolean),
  );

  return Object.freeze({ total, active, totalResources, teamCount: teams.size });
}

// ---------------------------------------------------------------------------
// Team load
// ---------------------------------------------------------------------------

export function computeTeamLoad(
  projects: readonly ProjectRow[],
): readonly TeamLoadEntry[] {
  const byTeam = new Map<string, { count: number; resources: number }>();

  for (const p of projects) {
    const team = p.team ?? "Unassigned";
    const existing = byTeam.get(team) ?? { count: 0, resources: 0 };
    byTeam.set(team, {
      count: existing.count + 1,
      resources: existing.resources + (p.resources_needed ?? 0),
    });
  }

  return Array.from(byTeam.entries())
    .map(([team, data]) => Object.freeze({ team, ...data }))
    .sort((a, b) => b.resources - a.resources);
}

// ---------------------------------------------------------------------------
// Status breakdown
// ---------------------------------------------------------------------------

export function computeStatusBreakdown(
  projects: readonly ProjectRow[],
): readonly StatusEntry[] {
  const byStatus = new Map<string, number>();

  for (const p of projects) {
    const status = p.status ?? "Unknown";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }

  return Array.from(byStatus.entries())
    .map(([status, count]) => Object.freeze({ status, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Risk signals
// ---------------------------------------------------------------------------

export function computeRiskSignals(
  projects: readonly ProjectRow[],
): readonly RiskSignal[] {
  const signals: RiskSignal[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const p of projects) {
    // Skip completed/cancelled projects
    if (p.status === "Complete" || p.status === "Cancelled") continue;

    // Missing end date
    if (!p.end_date) {
      signals.push({
        project: p.name,
        signal: "No end date set",
        severity: "medium",
      });
    } else if (p.end_date < today) {
      signals.push({
        project: p.name,
        signal: `Past due (${p.end_date})`,
        severity: "high",
      });
    }

    // No team assigned
    if (!p.team) {
      signals.push({
        project: p.name,
        signal: "No team assigned",
        severity: "medium",
      });
    }

    // High priority but no start date
    if (
      (p.priority === "P0" || p.priority === "P1") &&
      !p.start_date
    ) {
      signals.push({
        project: p.name,
        signal: "High priority but no start date",
        severity: "high",
      });
    }

    // High priority with zero resources
    if (
      (p.priority === "P0" || p.priority === "P1") &&
      (p.resources_needed ?? 0) === 0
    ) {
      signals.push({
        project: p.name,
        signal: "High priority with zero resources",
        severity: "high",
      });
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  return signals.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}
