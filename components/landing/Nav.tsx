import Link from "next/link";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            TC
          </div>
          <span className="font-mono text-sm font-medium tracking-tight text-white">
            TPMO Copilot
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden text-sm text-gray-400 transition hover:text-white sm:block"
          >
            Features
          </a>
          <Link
            href="/chat"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Launch
          </Link>
        </div>
      </nav>
    </header>
  );
}
