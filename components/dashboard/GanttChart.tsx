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
  readonly view: "date" | "initiative" | "quarter";
  readonly periodRange?: { readonly start: string; readonly end: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Readonly<Record<string, string>> = {
  "P0": "#E8417A",   // Critical — neon-magenta
  "P1": "#F4785A",   // High — neon-coral
  "P2": "#8B4FC8",   // Medium — neon-violet
  "P3": "#7A7A85",   // Low — text-muted
};

const PRIORITY_LABELS: readonly { readonly key: string; readonly label: string; readonly color: string }[] = [
  { key: "P0", label: "Critical", color: "#E8417A" },
  { key: "P1", label: "High", color: "#F4785A" },
  { key: "P2", label: "Medium", color: "#8B4FC8" },
  { key: "P3", label: "Low", color: "#7A7A85" },
];

const DEFAULT_COLOR = "#3A3A3F";

const ROW_HEIGHT = 32;
const LABEL_WIDTH = 220;
const CHART_PADDING = 16;
const HEADER_HEIGHT = 40;
const MIN_BAR_LABEL_WIDTH = 80;

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

  // Derive from quarter/period tag
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

function getBarColor(priority: string | null): string {
  return PRIORITY_COLORS[priority ?? ""] ?? DEFAULT_COLOR;
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
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
// Component
// ---------------------------------------------------------------------------

export default function GanttChart({ projects, view, periodRange }: GanttChartProps) {
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

  // Sort and group projects based on view mode
  const sortedProjects = getSortedProjects(projectsWithDates, view);

  // Compute time range
  const now = new Date();

  let rangeStart: Date;
  let rangeEnd: Date;

  if (periodRange) {
    // Use the period range for quarter view
    rangeStart = new Date(periodRange.start);
    rangeEnd = new Date(periodRange.end);
  } else {
    const dates = projectsWithDates
      .flatMap((p) => [parseDate(p.start_date), parseDate(p.end_date)])
      .filter((d): d is Date => d !== null);

    const minDate = dates.length > 0
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const maxDate = dates.length > 0
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : new Date(now.getFullYear(), now.getMonth() + 6, 0);

    // Add padding: 1 month before and after
    rangeStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    rangeEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);
  }

  const totalDays = Math.max(
    (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    30,
  );

  // Generate month ticks
  const monthTicks: { label: string; x: number }[] = [];
  const tickDate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (tickDate <= rangeEnd) {
    const dayOffset = (tickDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
    monthTicks.push({
      label: formatMonthLabel(tickDate),
      x: dayOffset,
    });
    tickDate.setMonth(tickDate.getMonth() + 1);
  }

  // SVG dimensions
  const chartWidth = 800;
  const totalWidth = LABEL_WIDTH + chartWidth + CHART_PADDING * 2;
  const legendHeight = 30;
  const totalHeight = HEADER_HEIGHT + sortedProjects.length * ROW_HEIGHT + CHART_PADDING + legendHeight;

  const dayToX = (days: number) =>
    LABEL_WIDTH + CHART_PADDING + (days / totalDays) * chartWidth;

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

        {/* Project rows */}
        {sortedProjects.map((project, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;
          const start = parseDate(project.start_date);
          const end = parseDate(project.end_date);
          const color = getBarColor(project.priority);

          // Label (left column)
          const labelText = project.name.length > 26
            ? project.name.slice(0, 24) + "..."
            : project.name;

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

          // Clamp end date to chart range
          const rawEndDay = end
            ? (end.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
            : totalDays;
          const endDay = Math.min(rawEndDay, totalDays);

          const barX = dayToX(Math.max(startDay, 0));
          const barEndX = dayToX(endDay);
          const barWidth = Math.max(barEndX - barX, 4);

          // Determine if bar is wide enough for inline label
          const showInlineLabel = barWidth >= MIN_BAR_LABEL_WIDTH;
          const barLabelText = project.name.length > 20
            ? project.name.slice(0, 18) + "..."
            : project.name;

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
              {/* Bar */}
              <rect
                x={barX}
                y={y + 6}
                width={barWidth}
                height={ROW_HEIGHT - 12}
                rx={4}
                fill={color}
                fillOpacity={0.8}
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
                  clipPath={`inset(0 ${Math.max(0, totalWidth - barX - barWidth)}px 0 0)`}
                >
                  {barLabelText}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        {PRIORITY_LABELS.map((item, i) => {
          const legendX = LABEL_WIDTH + CHART_PADDING + i * 120;
          const legendY = totalHeight - legendHeight + 10;
          return (
            <g key={item.key}>
              <rect x={legendX} y={legendY} width={10} height={10} rx={2} fill={item.color} fillOpacity={0.8} />
              <text x={legendX + 14} y={legendY + 9} fill="#7A7A85" fontSize={11} fontFamily="monospace">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sorting / grouping logic
// ---------------------------------------------------------------------------

function getSortedProjects(
  projects: readonly GanttProject[],
  view: "date" | "initiative" | "quarter",
): readonly GanttProject[] {
  switch (view) {
    case "initiative": {
      const grouped = groupByKey(projects, (p) => p.theme ?? "Ungrouped");
      const result: GanttProject[] = [];
      for (const [, group] of grouped) {
        const sorted = [...group].sort((a, b) => {
          const aDate = a.start_date ?? "9999";
          const bDate = b.start_date ?? "9999";
          return aDate.localeCompare(bDate);
        });
        result.push(...sorted);
      }
      return result;
    }
    case "quarter": {
      const grouped = groupByKey(projects, (p) => p.quarter ?? "Unscheduled");
      const result: GanttProject[] = [];
      const sortedKeys = [...grouped.keys()].sort();
      for (const key of sortedKeys) {
        const group = grouped.get(key) ?? [];
        const sorted = [...group].sort((a, b) => {
          const aDate = a.start_date ?? "9999";
          const bDate = b.start_date ?? "9999";
          return aDate.localeCompare(bDate);
        });
        result.push(...sorted);
      }
      return result;
    }
    case "date":
    default: {
      return [...projects].sort((a, b) => {
        const aDate = a.start_date ?? "9999";
        const bDate = b.start_date ?? "9999";
        return aDate.localeCompare(bDate);
      });
    }
  }
}
