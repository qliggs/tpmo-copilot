"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncStatus {
  readonly lastSynced: string | null;
  readonly totalRecords: number;
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
}

interface SyncResponse {
  readonly success: boolean;
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly total: number;
  readonly errors: readonly string[];
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PortfolioSync() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch latest sync status from sync_log
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Non-critical — status display is informational
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: prompt("Enter sync secret:"),
          triggered_by: "manual",
        }),
      });

      const data: SyncResponse = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Sync failed (${res.status})`);
      } else {
        setLastResult(data);
        fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <h2 className="mb-6 font-mono text-lg font-semibold text-zinc-100">
        Portfolio Sync
      </h2>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
        {/* Status */}
        <div className="mb-6 space-y-2 font-mono text-sm text-zinc-400">
          {loading ? (
            <p>Loading sync status...</p>
          ) : status ? (
            <>
              <p>
                Last synced:{" "}
                <span className="text-zinc-200">
                  {status.lastSynced
                    ? new Date(status.lastSynced).toLocaleString()
                    : "Never"}
                </span>
              </p>
              <p>
                Projects in database:{" "}
                <span className="text-zinc-200">{status.totalRecords}</span>
              </p>
            </>
          ) : (
            <p>No sync history found.</p>
          )}
        </div>

        {/* Sync button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded bg-zinc-100 px-4 py-2 font-mono text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync from Notion Now"}
        </button>

        {/* Result */}
        {lastResult && (
          <div className="mt-4 rounded border border-emerald-800/50 bg-emerald-900/20 p-4 font-mono text-sm text-emerald-300">
            <p>Sync complete: {lastResult.total} records processed</p>
            <p className="mt-1 text-zinc-400">
              +{lastResult.added} added / ~{lastResult.updated} updated /{" "}
              {lastResult.unchanged} unchanged
            </p>
            {lastResult.errors.length > 0 && (
              <p className="mt-2 text-amber-400">
                {lastResult.errors.length} error(s):{" "}
                {lastResult.errors.join("; ")}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded border border-red-800/50 bg-red-900/20 p-4 font-mono text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
