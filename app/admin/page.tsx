import AppNav from "@/components/AppNav";
import PortfolioSync from "@/components/PortfolioSync";

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary">
      <AppNav />
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-lg font-semibold font-display text-text-primary tracking-tight">
            Admin
          </h1>
          <p className="text-xs text-text-muted mt-0.5 mb-6">
            Manage data sources and sync
          </p>
          <PortfolioSync />
        </div>
      </main>
    </div>
  );
}
