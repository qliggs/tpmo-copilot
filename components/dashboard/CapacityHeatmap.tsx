// CapacityHeatmap — grid showing team utilization across months.
// Server component. Rows = teams, Columns = months (next 6 months).

import type { CapacityHeatmapCell } from "@/lib/engineer-stats";

interface CapacityHeatmapProps {
  readonly cells: readonly CapacityHeatmapCell[];
}

// ---------------------------------------------------------------------------
// Helpers — monochromatic magenta intensity
// ---------------------------------------------------------------------------

function getCellStyle(pct: number): { background: string; color: string } {
  if (pct > 100) return { background: "rgba(232, 65, 122, 0.90)", color: "#FFFFFF" };
  if (pct > 80) return { background: "rgba(232, 65, 122, 0.60)", color: "#F2F2F4" };
  if (pct > 60) return { background: "rgba(232, 65, 122, 0.35)", color: "#F2F2F4" };
  return { background: "rgba(232, 65, 122, 0.15)", color: "#F2F2F4" };
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
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Sync engineers from Notion to enable capacity data.
        </p>
      </div>
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
              const style = fte > 0 ? getCellStyle(pct) : { background: "var(--color-bg-elevated)", color: "var(--color-text-muted)" };

              return (
                <div
                  key={`${team}-${month}`}
                  className="flex items-center justify-center rounded-md px-2 py-2 font-mono text-xs font-semibold"
                  style={{ background: style.background, color: style.color }}
                  title={`${team} - ${formatMonthShort(month)}: ${pct}% utilization (${fte} FTE)`}
                >
                  {fte > 0 ? `${pct}%` : "\u2014"}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Legend — gradient swatch */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
        <span>Low load</span>
        <div
          className="h-2.5 w-24 rounded-full"
          style={{
            background: "linear-gradient(to right, rgba(232,65,122,0.15), rgba(232,65,122,0.90))",
          }}
        />
        <span>Over capacity</span>
      </div>
    </div>
  );
}
