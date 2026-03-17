export default function Footer() {
  return (
    <footer className="border-t border-white/[0.07] px-6 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <p className="font-mono text-xs text-neon-magenta">
          TPMO Copilot
        </p>
        <p className="font-mono text-xs text-text-muted">
          Built with Next.js, Claude, and Supabase
        </p>
      </div>
    </footer>
  );
}
