import Link from "next/link";

export default function CTA() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-800/50 to-gray-900/50 px-8 py-16 text-center sm:px-16">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Stop searching. Start asking.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-400">
          Connect your knowledge sources and let TPMO Copilot surface the
          insights that keep your programs on track.
        </p>
        <div className="mt-8">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Launch Copilot
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
        <p className="mt-4 font-mono text-xs text-gray-500">
          No signup required. Bring your own API keys.
        </p>
      </div>
    </section>
  );
}
