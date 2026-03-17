// EngineersPanel — table showing engineer allocation and utilization.
// Server component. Sorted by utilization descending.

import type { EngineerAllocation } from "@/lib/engineer-stats";

interface EngineersPanelProps {
  readonly allocations: readonly EngineerAllocation[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusDot(utilizationPct: number): string {
  if (utilizationPct > 100) return "bg-danger";
  if (utilizationPct >= 80) return "bg-warning";
  return "bg-success";
}

function getStatusLabel(utilizationPct: number): string {
  if (utilizationPct > 100) return "Over";
  if (utilizationPct >= 80) return "Near Cap";
  if (utilizationPct > 0) return "OK";
  return "Idle";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EngineersPanel({ allocations }: EngineersPanelProps) {
  if (allocations.length === 0) {
    return (
      <p className="text-xs text-text-muted">
        No engineer data available. Sync engineers from Notion first.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.07] uppercase tracking-wider text-text-muted">
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Team</th>
            <th className="px-4 py-3 text-right font-medium">Capacity (FTE)</th>
            <th className="px-4 py-3 text-right font-medium">Projects</th>
            <th className="px-4 py-3 text-right font-medium">Utilization %</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {allocations.map((alloc, i) => (
            <tr
              key={`${alloc.engineer}-${alloc.team}-${i}`}
              className="transition-colors hover:bg-bg-elevated/50"
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                {alloc.engineer}
              </td>
              <td className="px-4 py-3 text-text-muted">{alloc.team}</td>
              <td className="px-4 py-3 text-right font-mono text-text-muted">
                {alloc.capacity.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-text-muted">
                {alloc.projectCount}
              </td>
              <td className="px-4 py-3 text-right font-mono text-text-primary">
                {alloc.utilizationPct}%
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${getStatusDot(alloc.utilizationPct)}`}
                  />
                  <span className="text-text-muted">
                    {getStatusLabel(alloc.utilizationPct)}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
