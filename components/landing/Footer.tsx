export default function Footer() {
  return (
    <footer className="border-t border-gray-800/60 px-6 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <p className="font-mono text-xs text-gray-500">
          TPMO Copilot
        </p>
        <p className="font-mono text-xs text-gray-600">
          Built with Next.js, Claude, and Supabase
        </p>
      </div>
    </footer>
  );
}
