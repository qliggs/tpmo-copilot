// StatCard — single metric tile for the dashboard stat row.
// Server component. Uses design tokens for consistent styling.

interface StatCardProps {
  readonly label: string;
  readonly value: number;
  readonly accentColor?: string;
}

export default function StatCard({ label, value, accentColor }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-white/[0.07] bg-bg-surface p-5 transition-colors hover:bg-bg-elevated"
      style={accentColor ? { borderLeft: `2px solid ${accentColor}` } : undefined}
    >
      <p className="text-xs uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl font-bold text-text-primary">
        {value}
      </p>
    </div>
  );
}
