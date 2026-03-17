// StatusPanel — stacked bar + legend for project status breakdown.
// Server component. Uses neon palette for status colors.

import type { StatusEntry } from "@/lib/portfolio-stats";

interface StatusPanelProps {
  readonly statusBreakdown: readonly StatusEntry[];
}

const STATUS_COLORS: Readonly<Record<string, string>> = {
  "Active": "bg-success",
  "In Progress": "bg-success",
  "Complete": "bg-success",
  "On Track": "bg-success",
  "On Hold": "bg-warning",
  "At Risk": "bg-danger",
  "Blocked": "bg-danger",
  "Planning": "bg-neon-violet",
  "Not Started": "bg-text-muted",
  "Cancelled": "bg-text-muted",
};

export default function StatusPanel({ statusBreakdown }: StatusPanelProps) {
  const total = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  return statusBreakdown.length === 0 ? (
    <p className="text-xs text-text-muted">No status data available.</p>
  ) : (
    <>
      {/* Stacked bar */}
      <div className="mb-4 flex h-3 overflow-hidden rounded-full">
        {statusBreakdown.map((entry) => (
          <div
            key={entry.status}
            className={`${STATUS_COLORS[entry.status] ?? "bg-text-muted"} transition-all`}
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
              className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[entry.status] ?? "bg-text-muted"}`}
            />
            <span className="text-xs text-text-muted">
              {entry.status}{" "}
              <span className="font-mono text-text-muted">({entry.count})</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
