"use client";

import { useState, useMemo } from "react";
import type { ProjectRow } from "@/lib/portfolio-stats";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProjectTableProps {
  readonly projects: readonly ProjectRow[];
}

const PRIORITY_COLORS: Readonly<Record<string, string>> = {
  P0: "text-danger",
  P1: "text-warning",
  P2: "text-neon-magenta",
  P3: "text-text-muted",
};

export default function ProjectTable({ projects }: ProjectTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const query = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.team ?? "").toLowerCase().includes(query) ||
        (p.status ?? "").toLowerCase().includes(query) ||
        (p.priority ?? "").toLowerCase().includes(query) ||
        (p.quarter ?? "").toLowerCase().includes(query),
    );
  }, [projects, search]);

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          No projects found. Run a Notion sync from the{" "}
          <a href="/admin" className="text-neon-magenta hover:underline">
            Admin
          </a>{" "}
          page to populate the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-bg-surface">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          All Projects{" "}
          <span className="text-xs font-normal text-text-muted">
            ({filtered.length})
          </span>
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="rounded-lg border border-white/[0.07] bg-bg-elevated px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-neon-magenta focus:outline-none focus:ring-1 focus:ring-neon-magenta"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-b" style={{ borderColor: "rgba(232, 65, 122, 0.3)" }}>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Name</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Team</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Priority</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Status</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Size</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5 text-right">Resources</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Quarter</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-text-muted px-5">Dates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p, i) => (
            <TableRow
              key={`${p.name}-${p.team}-${p.quarter}-${i}`}
              className={`transition-colors hover:bg-bg-elevated/50 ${i % 2 === 1 ? "bg-bg-surface/40" : ""}`}
            >
              <TableCell className="max-w-[200px] truncate px-5 text-sm font-medium text-text-primary">
                {p.name}
              </TableCell>
              <TableCell className="px-5 text-sm text-text-muted">
                {p.team ?? "\u2014"}
              </TableCell>
              <TableCell
                className={`px-5 text-sm font-mono font-semibold ${PRIORITY_COLORS[p.priority ?? ""] ?? "text-text-muted"}`}
              >
                {p.priority ?? "\u2014"}
              </TableCell>
              <TableCell className="px-5 text-sm text-text-muted">
                {p.status ?? "\u2014"}
              </TableCell>
              <TableCell className="px-5 text-sm font-mono text-text-muted">
                {p.tshirt_size ?? "\u2014"}
              </TableCell>
              <TableCell className="px-5 text-sm text-right font-mono text-text-muted">
                {p.resources_needed ?? 0}
              </TableCell>
              <TableCell className="px-5 text-sm font-mono text-text-muted">
                {p.quarter ?? "\u2014"}
              </TableCell>
              <TableCell className="whitespace-nowrap px-5 text-sm font-mono text-text-muted">
                {p.start_date ?? "TBD"} \u2014 {p.end_date ?? "TBD"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
