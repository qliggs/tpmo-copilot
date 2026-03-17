// GanttChart — pure SVG horizontal bar chart for project timelines.
// Server component. No chart library — renders raw SVG.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface GanttChartProps {
  readonly projects: readonly GanttProject[];
  readonly view: "date" | "initiative" | "quarter";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Readonly<Record<string, string>> = {
  "Active": "#10B981",
  "In Progress": "#10B981",
  "Complete": "#10B981",
  "On Track": "#10B981",
  "On Hold": "#F59E0B",
  "At Risk": "#EF4444",
  "Blocked": "#EF4444",
  "Planning": "#8B4FC8",
};

const DEFAULT_COLOR = "#7A7A85";

const ROW_HEIGHT = 32;
const LABEL_WIDTH = 200;
const CHART_PADDING = 16;
const HEADER_HEIGHT = 40;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBarColor(status: string | null): string {
  return STATUS_COLORS[status ?? ""] ?? DEFAULT_COLOR;
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

export default function GanttChart({ projects, view }: GanttChartProps) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-text-muted">No project data for Gantt chart.</p>
    );
  }

  // Sort and group projects based on view mode
  const sortedProjects = getSortedProjects(projects, view);

  // Compute time range
  const now = new Date();
  const dates = projects
    .flatMap((p) => [parseDate(p.start_date), parseDate(p.end_date)])
    .filter((d): d is Date => d !== null);

  const minDate = dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const maxDate = dates.length > 0
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : new Date(now.getFullYear(), now.getMonth() + 6, 0);

  // Add padding: 1 month before and after
  const rangeStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const rangeEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 0);
  const totalDays = Math.max(
    (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
    30,
  );

  // Generate month ticks
  const monthTicks: { label: string; x: number }[] = [];
  const tickDate = new Date(rangeStart);
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
  const totalHeight = HEADER_HEIGHT + sortedProjects.length * ROW_HEIGHT + CHART_PADDING;

  const dayToX = (days: number) =>
    LABEL_WIDTH + CHART_PADDING + (days / totalDays) * chartWidth;

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="font-mono text-[10px]"
      >
        {/* Month headers */}
        {monthTicks.map((tick, i) => (
          <g key={`month-${i}`}>
            <line
              x1={dayToX(tick.x)}
              y1={HEADER_HEIGHT}
              x2={dayToX(tick.x)}
              y2={totalHeight}
              stroke="#7A7A85"
              strokeOpacity={0.2}
              strokeDasharray="2,4"
            />
            <text
              x={dayToX(tick.x) + 4}
              y={HEADER_HEIGHT - 8}
              fill="#7A7A85"
              fontSize={10}
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
                y2={totalHeight}
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
          const color = getBarColor(project.status);

          // Label
          const labelText = project.name.length > 24
            ? project.name.slice(0, 22) + "..."
            : project.name;

          if (!start && !end) {
            // No dates — show TBD indicator at the end
            return (
              <g key={`row-${i}`}>
                <text
                  x={8}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fill="#F2F2F4"
                  fontSize={11}
                >
                  {labelText}
                </text>
                <text
                  x={dayToX(totalDays - 5)}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fill="#7A7A85"
                  fontSize={10}
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
          const endDay = end
            ? (end.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)
            : totalDays;

          const barX = dayToX(Math.max(startDay, 0));
          const barWidth = Math.max(dayToX(endDay) - barX, 4);

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
              {/* Label */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                fill="#F2F2F4"
                fontSize={11}
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
                  {project.name} ({project.status ?? "Unknown"})
                  {"\n"}{project.start_date ?? "TBD"} to {project.end_date ?? "TBD"}
                  {project.team ? `\nTeam: ${project.team}` : ""}
                </title>
              </rect>
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
