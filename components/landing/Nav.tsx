import Link from "next/link";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-bg-primary/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-magenta text-xs font-bold text-white">
            TC
          </div>
          <span className="font-mono text-sm font-medium tracking-tight text-white">
            TPMO Copilot
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden text-sm text-text-muted transition hover:text-neon-magenta sm:block"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hidden text-sm text-text-muted transition hover:text-neon-magenta sm:block"
          >
            How It Works
          </a>
          <Link
            href="/chat"
            className="rounded-lg border border-neon-magenta bg-transparent px-4 py-2 text-sm font-semibold text-neon-magenta transition hover:bg-neon-magenta hover:text-white"
          >
            Launch
          </Link>
        </div>
      </nav>
    </header>
  );
}
