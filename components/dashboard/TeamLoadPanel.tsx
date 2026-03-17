// TeamLoadPanel — horizontal bar chart of team resource allocation.
// Server component. Uses neon-magenta for bar fills.

import type { TeamLoadEntry } from "@/lib/portfolio-stats";

interface TeamLoadPanelProps {
  readonly teamLoad: readonly TeamLoadEntry[];
}

export default function TeamLoadPanel({ teamLoad }: TeamLoadPanelProps) {
  const maxResources = Math.max(...teamLoad.map((t) => t.resources), 1);

  return teamLoad.length === 0 ? (
    <p className="text-xs text-text-muted">No team data available.</p>
  ) : (
    <div className="space-y-3">
      {teamLoad.map((entry) => (
        <div key={entry.team}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-text-primary">{entry.team}</span>
            <span className="font-mono text-xs text-text-muted">
              {entry.count} projects / {entry.resources} FTE
            </span>
          </div>
          <div className="h-2 rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-neon-magenta transition-all"
              style={{
                width: `${Math.round((entry.resources / maxResources) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
