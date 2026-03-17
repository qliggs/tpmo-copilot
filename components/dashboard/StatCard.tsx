// StatCard — single metric tile for the dashboard stat row.
// Server component. Uses design tokens for consistent styling.

interface StatCardProps {
  readonly label: string;
  readonly value: number;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-bg-surface p-5">
      <p className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">
        {value}
      </p>
    </div>
  );
}
