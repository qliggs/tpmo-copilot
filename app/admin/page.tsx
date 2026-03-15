import AppNav from "@/components/AppNav";
import PortfolioSync from "@/components/PortfolioSync";

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <AppNav />
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-lg font-semibold text-gray-100 tracking-tight">
            Admin
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 mb-6">
            Manage data sources and sync
          </p>
          <PortfolioSync />
        </div>
      </main>
    </div>
  );
}
