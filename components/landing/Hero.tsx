import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
      {/* Subtle grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Gradient glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-3xl"
      />

      <div className="mx-auto max-w-4xl text-center">
        <p className="font-mono text-sm tracking-widest text-blue-400 uppercase">
          AI-Powered TPM Intelligence
        </p>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your second brain for{" "}
          <span className="text-blue-400">technical program management</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
          TPMO Copilot ingests your docs, wikis, and decision logs, then
          surfaces the answers you need — with source citations — in seconds.
          Stop digging through Confluence. Start shipping programs.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Get Started
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
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            See How It Works
          </a>
        </div>
      </div>
    </section>
  );
}
