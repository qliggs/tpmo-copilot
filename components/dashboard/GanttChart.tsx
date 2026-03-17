// GanttChart — pure SVG horizontal bar chart for project timelines.
// No chart library — renders raw SVG.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface GanttChartProps {
  readonly projects: readonly GanttProject[];
  readonly view: "date" | "initiative" | "quarter" | "team";
  readonly periodRange?: { readonly start: string; readonly end: string };
  readonly selectedTeam?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAM_COLORS: Readonly<Record<string, string>> = {
  "Endpoint Engineering": "#F4785A",
  "Productivity Apps": "#8B4FC8",
  "Infrastructure": "#F5D06A",
  "Service Desk": "#C4A0E0",
  "NetOps": "#E8417A",
  "TPMO": "#F2F2F4",
};

const TEAM_LEGEND: readonly { readonly team: string; readonly color: string }[] = [
  { team: "Endpoint Eng", color: "#F4785A" },
  { team: "Productivity", color: "#8B4FC8" },
  { team: "Infrastructure", color: "#F5D06A" },
  { team: "Service Desk", color: "#C4A0E0" },
  { team: "NetOps", color: "#E8417A" },
  { team: "TPMO", color: "#F2F2F4" },
];

const DEFAULT_COLOR = "#3A3A3F";

const ROW_HEIGHT = 32;
const LABEL_WIDTH = 220;
const CHART_PADDING = 16;
const HEADER_HEIGHT = 40;

// ---------------------------------------------------------------------------
// Quarter-to-end-date fallback mapping
// ---------------------------------------------------------------------------

const QUARTER_END_DATES: Readonly<Record<string, string>> = {
  "Q1": "2026-03-31",
  "Q2": "2026-06-30",
  "Q3": "2026-09-30",
  "Q4": "2026-12-31",
  "H1": "2026-06-30",
  "H2": "2026-12-31",
  "ANNUAL": "2026-12-31",
};

function deriveEndDate(project: GanttProject): string | null {
  if (project.end_date) return project.end_date;

  if (project.quarter) {
    const q = project.quarter.toUpperCase().trim();
    for (const [key, date] of Object.entries(QUARTER_END_DATES)) {
      if (q.includes(key)) return date;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTeamColor(team: string | null): string {
  return TEAM_COLORS[team ?? ""] ?? DEFAULT_COLOR;
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

function isQuarterBoundary(month: number): boolean {
  return month % 3 === 0;
}

function groupByKey(
  projects: readonly GanttProject[],
  keyFn: (p: GanttProject) => string,
): ReadonlyMap<string, readonly GanttProject[]> {
  const grouped = new Map<string, GanttProject[]>();
  for (const p of projects) {
    const key = keyFn(p);
    const existing = grouped.get(key) ?? [];
    grouped.set(key, [...existing, p]);
  }
  return grouped;
}

// ---------------------------------------------------------------------------
// Row data type (supports group headers)
// ---------------------------------------------------------------------------

interface GanttRow {
  readonly type: "project" | "header";
  readonly project?: GanttProject;
  readonly label: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GanttChart({ projects, view, periodRange, selectedTeam }: GanttChartProps) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-text-muted">No project data for Gantt chart.</p>
    );
  }

  // Pre-process: derive end dates for all projects
  const projectsWithDates = projects.map((p) => ({
    ...p,
    end_date: deriveEndDate(p),
  }));

  // Build rows with optional group headers
  const rows = buildRows(projectsWithDates, view);

  // Compute time range
  const now = new Date();

  let rangeStart: Date;
  let rangeEnd: Date;

  if (periodRange) {
    rangeStart = new Date(periodRange.start);
    rangeEnd = new Date(periodRange.end);
  } else {
    // Default: current quarter + 2 quarters ahead (3 quarters total)
    const currentMonth = now.getMonth();
    const qStart = Math.floor(currentMonth / 3) * 3;
    rangeStart = new Date(now.getFullYear(), qStart, 1);
    rangeEnd = new Date(now.getFullYear(), qStart + 9, 0);
  }

  const totalDays = Math.max(
    (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    30,
  );

  // Generate month ticks — only at quarter boundaries for decluttered axis
  const monthTicks: { label: string; x: number }[] = [];
  const tickDate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (tickDate <= rangeEnd) {
    if (isQuarterBoundary(tickDate.getMonth())) {
      const dayOffset = (tickDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      monthTicks.push({
        label: formatMonthLabel(tickDate),
        x: dayOffset,
      });
    }
    tickDate.setMonth(tickDate.getMonth() + 1);
  }

  // SVG dimensions
  const chartWidth = 800;
  const totalWidth = LABEL_WIDTH + chartWidth + CHART_PADDING * 2;
  const legendHeight = 30;
  const totalHeight = HEADER_HEIGHT + rows.length * ROW_HEIGHT + CHART_PADDING + legendHeight;

  const dayToX = (days: number) =>
    LABEL_WIDTH + CHART_PADDING + (days / totalDays) * chartWidth;

  // In team view, use slightly more opaque fill
  const isTeamView = view === "team";

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="font-mono"
      >
        {/* Month headers */}
        {monthTicks.map((tick, i) => (
          <g key={`month-${i}`}>
            <line
              x1={dayToX(tick.x)}
              y1={HEADER_HEIGHT}
              x2={dayToX(tick.x)}
              y2={totalHeight - legendHeight}
              stroke="#7A7A85"
              strokeOpacity={0.2}
              strokeDasharray="2,4"
            />
            <text
              x={dayToX(tick.x) + 4}
              y={HEADER_HEIGHT - 8}
              fill="#7A7A85"
              fontSize={11}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Today line */}
        {(() => {
          const todayOffset = (now.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
          if (todayOffset >= 0 && todayOffset <= totalDays) {
            return (
              <line
                x1={dayToX(todayOffset)}
                y1={HEADER_HEIGHT}
                x2={dayToX(todayOffset)}
                y2={totalHeight - legendHeight}
                stroke="#E8417A"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
            );
          }
          return null;
        })()}

        {/* Rows */}
        {rows.map((row, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;

          // Group header row
          if (row.type === "header") {
            return (
              <g key={`header-${i}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={totalWidth}
                  y2={y}
                  stroke="#7A7A85"
                  strokeOpacity={0.15}
                />
                <text
                  x={8}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fill="#7A7A85"
                  fontSize={11}
                  fontWeight="600"
                >
                  {row.label}
                </text>
              </g>
            );
          }

          const project = row.project!;
          const start = parseDate(project.start_date);
          const end = parseDate(project.end_date);
          const teamColor = getTeamColor(project.team);

          // Label (left column)
          const labelText = row.label.length > 26
            ? row.label.slice(0, 24) + "..."
            : row.label;

          if (!start && !end) {
            return (
              <g key={`row-${i}`}>
                <text
                  x={8}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fill="#F2F2F4"
                  fontSize={13}
                >
                  {labelText}
                </text>
                <text
                  x={dayToX(totalDays - 5)}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fill="#7A7A85"
                  fontSize={11}
                  fontStyle="italic"
                >
                  TBD
                </text>
              </g>
            );
          }

          const startDay = start
            ? (start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
            : 0;

          const rawEndDay = end
            ? (end.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
            : totalDays;
          const endDay = Math.min(rawEndDay, totalDays);

          const barX = dayToX(Math.max(startDay, 0));
          const barEndX = dayToX(endDay);
          const barWidth = Math.max(barEndX - barX, 4);

          // Deliverable name inside bar (initiative and team views)
          const showInlineLabel = (view === "initiative" || view === "team") && barWidth >= 100;
          const inlineName = project.deliverable ?? project.name;
          const barLabelText = inlineName.length > 20
            ? inlineName.slice(0, 18) + "..."
            : inlineName;

          return (
            <g key={`row-${i}`}>
              {/* Row background (alternating) */}
              {i % 2 === 1 && (
                <rect
                  x={0}
                  y={y}
                  width={totalWidth}
                  height={ROW_HEIGHT}
                  fill="#F2F2F4"
                  fillOpacity={0.02}
                />
              )}
              {/* Label (left column) */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                fill="#F2F2F4"
                fontSize={13}
              >
                {labelText}
              </text>
              {/* Bar — near-black fill with team-colored border + glow */}
              <rect
                x={barX}
                y={y + 6}
                width={barWidth}
                height={ROW_HEIGHT - 12}
                rx={4}
                fill={isTeamView ? `${teamColor}22` : "rgba(255,255,255,0.04)"}
                stroke={teamColor}
                strokeWidth={1.5}
                style={{
                  filter: `drop-shadow(0 0 6px ${teamColor}66)`,
                }}
              >
                <title>
                  {project.name} ({project.priority ?? project.status ?? "Unknown"})
                  {"\n"}{project.start_date ?? "TBD"} to {project.end_date ?? "TBD"}
                  {project.team ? `\nTeam: ${project.team}` : ""}
                </title>
              </rect>
              {/* Inline bar label */}
              {showInlineLabel && (
                <text
                  x={barX + 6}
                  y={y + ROW_HEIGHT / 2 + 3}
                  fill="#FFFFFF"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {barLabelText}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend — team colors */}
        {TEAM_LEGEND.map((item, i) => {
          const legendX = LABEL_WIDTH + CHART_PADDING + i * 110;
          const legendY = totalHeight - legendHeight + 10;
          return (
            <g key={item.team}>
              <rect x={legendX} y={legendY} width={10} height={10} rx={2} fill="rgba(255,255,255,0.04)" stroke={item.color} strokeWidth={1.5} />
              <text x={legendX + 14} y={legendY + 9} fill="#7A7A85" fontSize={10} fontFamily="monospace">
                {item.team}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row building logic
// ---------------------------------------------------------------------------

function buildRows(
  projects: readonly GanttProject[],
  view: "date" | "initiative" | "quarter" | "team",
): readonly GanttRow[] {
  switch (view) {
    case "initiative":
    case "team": {
      const grouped = groupByKey(projects, (p) => p.theme ?? "Ungrouped");
      const rows: GanttRow[] = [];
      for (const [group, items] of grouped) {
        rows.push({ type: "header", label: group });
        const sorted = [...items].sort((a, b) => {
          const aDate = a.start_date ?? "9999";
          const bDate = b.start_date ?? "9999";
          return aDate.localeCompare(bDate);
        });
        for (const p of sorted) {
          rows.push({
            type: "project",
            project: p,
            label: p.deliverable ?? p.name,
          });
        }
      }
      return rows;
    }
    case "quarter": {
      const grouped = groupByKey(projects, (p) => p.quarter ?? "Unscheduled");
      const rows: GanttRow[] = [];
      const sortedKeys = [...grouped.keys()].sort();
      for (const key of sortedKeys) {
        const group = grouped.get(key) ?? [];
        const sorted = [...group].sort((a, b) => {
          const aDate = a.start_date ?? "9999";
          const bDate = b.start_date ?? "9999";
          return aDate.localeCompare(bDate);
        });
        for (const p of sorted) {
          rows.push({ type: "project", project: p, label: p.name });
        }
      }
      return rows;
    }
    case "date":
    default: {
      const sorted = [...projects].sort((a, b) => {
        const aDate = a.start_date ?? "9999";
        const bDate = b.start_date ?? "9999";
        return aDate.localeCompare(bDate);
      });
      return sorted.map((p) => ({ type: "project" as const, project: p, label: p.name }));
    }
  }
}
