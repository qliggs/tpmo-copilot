import PortfolioSync from "@/components/PortfolioSync";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-100 tracking-tight">
            TPMO Copilot — Admin
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage data sources and sync
          </p>
        </div>
        <Link
          href="/chat"
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Back to Chat
        </Link>
      </header>
      <PortfolioSync />
    </div>
  );
}
