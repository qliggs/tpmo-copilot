// RiskPanel — risk signals from portfolio + engineer overallocation.
// Server component.

import type { RiskSignal } from "@/lib/portfolio-stats";
import type { EngineerRisk } from "@/lib/engineer-stats";

interface RiskPanelProps {
  readonly riskSignals: readonly RiskSignal[];
  readonly engineerRisks: readonly EngineerRisk[];
}

const SEVERITY_STYLES: Readonly<Record<string, string>> = {
  high: "bg-danger/10 text-danger border-danger/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-text-muted/10 text-text-muted border-text-muted/20",
};

export default function RiskPanel({
  riskSignals,
  engineerRisks,
}: RiskPanelProps) {
  const totalCount = riskSignals.length + engineerRisks.length;

  if (totalCount === 0) return null;

  return (
    <div className="space-y-2">
      {/* Portfolio risk signals */}
      {riskSignals.map((signal, i) => (
        <div
          key={`portfolio-${signal.project}-${signal.signal}-${i}`}
          className="flex items-center gap-3 rounded-lg border border-white/[0.07] px-3 py-2"
        >
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[signal.severity] ?? ""}`}
          >
            {signal.severity}
          </span>
          <span className="text-xs font-medium text-text-primary">
            {signal.project}
          </span>
          <span className="text-xs text-text-muted">{signal.signal}</span>
        </div>
      ))}

      {/* Engineer/capacity risk signals */}
      {engineerRisks.map((risk, i) => (
        <div
          key={`engineer-${risk.entity}-${risk.type}-${i}`}
          className="flex items-center gap-3 rounded-lg border border-white/[0.07] px-3 py-2"
        >
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLES[risk.severity] ?? ""}`}
          >
            {risk.severity}
          </span>
          <span className="text-xs font-medium text-text-primary">
            {risk.entity}
          </span>
          <span className="text-xs text-text-muted">{risk.message}</span>
        </div>
      ))}
    </div>
  );
}
