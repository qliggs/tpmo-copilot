// CapacityHeatmap — grid showing team utilization across months.
// Server component. Rows = teams, Columns = months (next 6 months).

import type { CapacityHeatmapCell } from "@/lib/engineer-stats";

interface CapacityHeatmapProps {
  readonly cells: readonly CapacityHeatmapCell[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map utilization to a background color class. */
function getCellColor(pct: number): string {
  if (pct > 100) return "bg-danger";
  if (pct > 80) return "bg-neon-coral";
  if (pct > 60) return "bg-neon-gold";
  return "bg-success";
}

/** Map utilization to text color for contrast. */
function getCellTextColor(pct: number): string {
  if (pct > 100) return "text-white";
  if (pct > 80) return "text-bg-primary";
  if (pct > 60) return "text-bg-primary";
  return "text-bg-primary";
}

/** Format YYYY-MM to a short label like "Mar 26". */
function formatMonthShort(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CapacityHeatmap({ cells }: CapacityHeatmapProps) {
  if (cells.length === 0) {
    return (
      <p className="text-xs text-text-muted">
        No capacity data available. Sync engineers from Notion first.
      </p>
    );
  }

  // Extract unique teams and months
  const teams = [...new Set(cells.map((c) => c.team))];
  const months = [...new Set(cells.map((c) => c.month))].sort();

  // Build lookup: team -> month -> cell
  const lookup = new Map<string, Map<string, CapacityHeatmapCell>>();
  for (const cell of cells) {
    if (!lookup.has(cell.team)) lookup.set(cell.team, new Map());
    lookup.get(cell.team)!.set(cell.month, cell);
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `140px repeat(${months.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div className="text-xs font-medium text-text-muted" />
        {months.map((m) => (
          <div
            key={m}
            className="text-center text-xs font-medium text-text-muted"
          >
            {formatMonthShort(m)}
          </div>
        ))}

        {/* Data rows */}
        {teams.map((team) => (
          <>
            <div
              key={`label-${team}`}
              className="flex items-center text-xs text-text-primary"
            >
              {team}
            </div>
            {months.map((month) => {
              const cell = lookup.get(team)?.get(month);
              const pct = cell?.utilizationPct ?? 0;
              const fte = cell?.fte ?? 0;

              return (
                <div
                  key={`${team}-${month}`}
                  className={`flex items-center justify-center rounded-md px-2 py-2 font-mono text-xs font-semibold ${getCellColor(pct)} ${getCellTextColor(pct)}`}
                  title={`${team} - ${formatMonthShort(month)}: ${pct}% utilization (${fte} FTE)`}
                >
                  {fte > 0 ? `${pct}%` : "\u2014"}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success" /> &lt;60%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-neon-gold" /> 60-80%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-neon-coral" /> 80-100%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-danger" /> &gt;100%
        </span>
      </div>
    </div>
  );
}
