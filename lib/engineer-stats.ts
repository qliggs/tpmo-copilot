// Engineer Stats — pure immutable computation functions for capacity analytics.
// Follows the same pattern as portfolio-stats.ts.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineerRow {
  readonly name: string;
  readonly team: string | null;
  readonly capacity: number;
  readonly active: boolean;
}

export interface ProjectRow {
  readonly name: string;
  readonly team: string | null;
  readonly status: string | null;
  readonly resources_needed: number | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly quarter: string | null;
}

export interface EngineerAllocation {
  readonly engineer: string;
  readonly team: string;
  readonly capacity: number;
  readonly projectCount: number;
  readonly totalDemand: number;
  readonly utilizationPct: number;
  readonly isOverAllocated: boolean;
}

export interface TeamCapacity {
  readonly team: string;
  readonly totalFTE: number;
  readonly totalDemand: number;
  readonly utilizationPct: number;
  readonly engineerCount: number;
  readonly projectCount: number;
}

export interface CapacityHeatmapCell {
  readonly team: string;
  readonly month: string;
  readonly utilizationPct: number;
  readonly fte: number;
  readonly demand: number;
}

export interface EngineerRisk {
  readonly type: "overallocation" | "idle_engineer" | "unassigned_team";
  readonly severity: "high" | "medium" | "low";
  readonly message: string;
  readonly entity: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Active projects — excludes Complete and Cancelled. */
function isActiveProject(p: ProjectRow): boolean {
  return p.status !== "Complete" && p.status !== "Cancelled";
}

/** Compute team-level project aggregates from a project list. */
function aggregateProjectsByTeam(
  projects: readonly ProjectRow[],
): ReadonlyMap<string, { count: number; demand: number }> {
  const byTeam = new Map<string, { count: number; demand: number }>();

  for (const p of projects) {
    if (!isActiveProject(p)) continue;
    const team = p.team ?? "Unassigned";
    const existing = byTeam.get(team) ?? { count: 0, demand: 0 };
    byTeam.set(team, {
      count: existing.count + 1,
      demand: existing.demand + (p.resources_needed ?? 0),
    });
  }

  return byTeam;
}

/** Format a Date as YYYY-MM for heatmap keys. */
function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Check whether two date ranges overlap a given month. */
function overlapsMonth(
  startStr: string | null,
  endStr: string | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  if (!startStr && !endStr) return false;
  const projStart = startStr ? new Date(startStr) : new Date(0);
  const projEnd = endStr ? new Date(endStr) : new Date("2099-12-31");
  return projStart <= monthEnd && projEnd >= monthStart;
}

// ---------------------------------------------------------------------------
// computeEngineerAllocations
// ---------------------------------------------------------------------------

/**
 * For each active engineer, count projects on their team, sum resources_needed,
 * and compute utilization = totalDemand / (capacity * teamEngineerCount).
 */
export function computeEngineerAllocations(
  engineers: readonly EngineerRow[],
  projects: readonly ProjectRow[],
): readonly EngineerAllocation[] {
  const projectAgg = aggregateProjectsByTeam(projects);

  // Count active engineers per team for load distribution
  const engineersPerTeam = new Map<string, number>();
  for (const eng of engineers) {
    if (!eng.active) continue;
    const team = eng.team ?? "Unassigned";
    engineersPerTeam.set(team, (engineersPerTeam.get(team) ?? 0) + 1);
  }

  const allocations: EngineerAllocation[] = [];

  for (const eng of engineers) {
    if (!eng.active) continue;

    const team = eng.team ?? "Unassigned";
    const teamProjects = projectAgg.get(team) ?? { count: 0, demand: 0 };
    const teamEngCount = engineersPerTeam.get(team) ?? 1;

    // Distribute team demand across engineers proportional to capacity
    const totalTeamFTE = engineers
      .filter((e) => e.active && (e.team ?? "Unassigned") === team)
      .reduce((sum, e) => sum + e.capacity, 0);

    const shareOfDemand = totalTeamFTE > 0
      ? (eng.capacity / totalTeamFTE) * teamProjects.demand
      : 0;

    const utilizationPct = eng.capacity > 0
      ? Math.round((shareOfDemand / eng.capacity) * 100)
      : 0;

    allocations.push(Object.freeze({
      engineer: eng.name,
      team,
      capacity: eng.capacity,
      projectCount: teamProjects.count,
      totalDemand: Math.round(shareOfDemand * 100) / 100,
      utilizationPct,
      isOverAllocated: utilizationPct > 100,
    }));
  }

  return Object.freeze(
    allocations.sort((a, b) => b.utilizationPct - a.utilizationPct),
  );
}

// ---------------------------------------------------------------------------
// computeTeamCapacity
// ---------------------------------------------------------------------------

/**
 * Group engineers by team, sum FTE capacity per team, sum resources_needed
 * for projects on that team, compute utilization pct.
 */
export function computeTeamCapacity(
  engineers: readonly EngineerRow[],
  projects: readonly ProjectRow[],
): readonly TeamCapacity[] {
  const projectAgg = aggregateProjectsByTeam(projects);

  // Group engineers by team
  const teamMap = new Map<string, { totalFTE: number; engineerCount: number }>();
  for (const eng of engineers) {
    if (!eng.active) continue;
    const team = eng.team ?? "Unassigned";
    const existing = teamMap.get(team) ?? { totalFTE: 0, engineerCount: 0 };
    teamMap.set(team, {
      totalFTE: existing.totalFTE + eng.capacity,
      engineerCount: existing.engineerCount + 1,
    });
  }

  // Also include teams that only exist in projects (no engineers assigned)
  for (const [team] of projectAgg) {
    if (!teamMap.has(team)) {
      teamMap.set(team, { totalFTE: 0, engineerCount: 0 });
    }
  }

  const capacities: TeamCapacity[] = [];

  for (const [team, data] of teamMap) {
    const proj = projectAgg.get(team) ?? { count: 0, demand: 0 };
    const utilizationPct = data.totalFTE > 0
      ? Math.round((proj.demand / data.totalFTE) * 100)
      : proj.demand > 0 ? 999 : 0;

    capacities.push(Object.freeze({
      team,
      totalFTE: data.totalFTE,
      totalDemand: proj.demand,
      utilizationPct,
      engineerCount: data.engineerCount,
      projectCount: proj.count,
    }));
  }

  return Object.freeze(
    capacities.sort((a, b) => b.utilizationPct - a.utilizationPct),
  );
}

// ---------------------------------------------------------------------------
// computeCapacityHeatmap
// ---------------------------------------------------------------------------

/**
 * Generate team x month cells. For each team, for months from now through
 * 6 months ahead, estimate utilization based on projects whose date ranges
 * overlap that month.
 */
export function computeCapacityHeatmap(
  engineers: readonly EngineerRow[],
  projects: readonly ProjectRow[],
): readonly CapacityHeatmapCell[] {
  // Build team FTE map
  const teamFTE = new Map<string, number>();
  const allTeams = new Set<string>();

  for (const eng of engineers) {
    if (!eng.active) continue;
    const team = eng.team ?? "Unassigned";
    allTeams.add(team);
    teamFTE.set(team, (teamFTE.get(team) ?? 0) + eng.capacity);
  }

  // Also include project-only teams
  for (const p of projects) {
    if (p.team) allTeams.add(p.team);
  }

  // Generate months: current month + 5 more (6 total)
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];

  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    months.push({
      label: formatMonth(monthDate),
      start: monthDate,
      end: monthEnd,
    });
  }

  const activeProjects = projects.filter(isActiveProject);
  const cells: CapacityHeatmapCell[] = [];

  for (const team of allTeams) {
    const fte = teamFTE.get(team) ?? 0;

    for (const month of months) {
      // Sum demand from projects on this team whose dates overlap the month
      let demand = 0;
      for (const p of activeProjects) {
        if ((p.team ?? "Unassigned") !== team) continue;
        if (overlapsMonth(p.start_date, p.end_date, month.start, month.end)) {
          demand += p.resources_needed ?? 0;
        }
      }

      const utilizationPct = fte > 0
        ? Math.round((demand / fte) * 100)
        : demand > 0 ? 999 : 0;

      cells.push(Object.freeze({
        team,
        month: month.label,
        utilizationPct,
        fte,
        demand,
      }));
    }
  }

  return Object.freeze(cells);
}

// ---------------------------------------------------------------------------
// computeEngineerRisks
// ---------------------------------------------------------------------------

/**
 * Generate risk signals from allocation and capacity data.
 * - overallocation: team > 100% utilization (high) or > 80% (medium)
 * - idle_engineer: active engineer on team with 0 projects (low)
 * - unassigned_team: projects with team not matching any engineer (medium)
 */
export function computeEngineerRisks(
  allocations: readonly EngineerAllocation[],
  teamCapacities: readonly TeamCapacity[],
): readonly EngineerRisk[] {
  const risks: EngineerRisk[] = [];

  // Team overallocation checks
  for (const tc of teamCapacities) {
    if (tc.utilizationPct > 100) {
      risks.push(Object.freeze({
        type: "overallocation" as const,
        severity: "high" as const,
        message: `${tc.team} is at ${tc.utilizationPct}% utilization (${tc.totalDemand} FTE demand vs ${tc.totalFTE} FTE capacity)`,
        entity: tc.team,
      }));
    } else if (tc.utilizationPct > 80) {
      risks.push(Object.freeze({
        type: "overallocation" as const,
        severity: "medium" as const,
        message: `${tc.team} is at ${tc.utilizationPct}% utilization — nearing capacity`,
        entity: tc.team,
      }));
    }
  }

  // Idle engineer checks
  for (const alloc of allocations) {
    if (alloc.projectCount === 0) {
      risks.push(Object.freeze({
        type: "idle_engineer" as const,
        severity: "low" as const,
        message: `${alloc.engineer} (${alloc.team}) has no active projects assigned to their team`,
        entity: alloc.engineer,
      }));
    }
  }

  // Unassigned team checks — teams with projects but no engineers
  for (const tc of teamCapacities) {
    if (tc.engineerCount === 0 && tc.projectCount > 0) {
      risks.push(Object.freeze({
        type: "unassigned_team" as const,
        severity: "medium" as const,
        message: `${tc.team} has ${tc.projectCount} project(s) but no engineers assigned`,
        entity: tc.team,
      }));
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  return Object.freeze(
    risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
  );
}
