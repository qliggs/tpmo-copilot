// StatusPanel — individual bars per status with neon colors.
// Server component.

import type { StatusEntry } from "@/lib/portfolio-stats";

interface StatusPanelProps {
  readonly statusBreakdown: readonly StatusEntry[];
}

const STATUS_COLORS: Readonly<Record<string, string>> = {
  "Active": "#E8417A",
  "In Progress": "#E8417A",
  "Complete": "#E8417A",
  "On Track": "#E8417A",
  "Ready to Start": "#F4785A",
  "Not Started": "rgba(122, 122, 133, 0.4)",
  "Archived": "rgba(255, 255, 255, 0.1)",
  "On Hold": "#F5D06A",
  "At Risk": "#F4785A",
  "Blocked": "#F4785A",
  "Planning": "#8B4FC8",
  "Cancelled": "rgba(255, 255, 255, 0.1)",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "rgba(122, 122, 133, 0.4)";
}

export default function StatusPanel({ statusBreakdown }: StatusPanelProps) {
  const total = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  if (statusBreakdown.length === 0) {
    return <p className="text-xs text-text-muted">No status data available.</p>;
  }

  return (
    <div className="space-y-3">
      {statusBreakdown.map((entry) => {
        const color = getStatusColor(entry.status);
        const pct = total > 0 ? (entry.count / total) * 100 : 0;

        return (
          <div key={entry.status}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">{entry.status}</span>
              <span className="text-xs font-mono text-text-muted">{entry.count}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">{pct.toFixed(0)}%</p>
          </div>
        );
      })}
    </div>
  );
}
