// Portfolio Query — Mode B of the RAG pipeline
// When a question is about current project status, capacity, risk, or quarterly data,
// query the projects table directly instead of the Obsidian vault.

import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude } from "@/lib/claude";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectRow {
  readonly name: string;
  readonly team: string | null;
  readonly priority: string | null;
  readonly status: string | null;
  readonly tshirt_size: string | null;
  readonly resources_needed: number | null;
  readonly quarter: string | null;
  readonly theme: string | null;
  readonly deliverable: string | null;
  readonly start_date: string | null;
  readonly end_date: string | null;
}

export interface PortfolioResult {
  readonly answer: string;
  readonly projectCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a portfolio intelligence assistant for a Technology PMO (Project Management Office). You have access to structured project data from the Book of Work.

Answer the question using ONLY the provided project data. Be specific — include project names, statuses, teams, timelines, and metrics when relevant.

Format your answer clearly:
- Use bullet points for lists of projects
- Include relevant metrics (resource counts, dates, sizes)
- If asked about risk or capacity, analyze the data and provide insight
- Always cite specific projects by name

If the data doesn't contain enough information to answer, say so clearly.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Query the projects table and generate an answer about portfolio status.
 * This is Mode B of the RAG pipeline — used for operational/status questions.
 */
export async function queryPortfolio(
  question: string,
  supabase: SupabaseClient,
): Promise<PortfolioResult> {
  // Fetch all projects (the Book of Work is typically <100 rows)
  const { data: projects, error } = await supabase
    .from("projects")
    .select("name, team, priority, status, tshirt_size, resources_needed, quarter, theme, deliverable, start_date, end_date")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  if (!projects || projects.length === 0) {
    return Object.freeze({
      answer: "No projects found in the portfolio database. Run a Notion sync first.",
      projectCount: 0,
    });
  }

  const typedProjects = projects as readonly ProjectRow[];

  // Build structured context for Claude
  const projectSummary = typedProjects.map((p) => ({
    name: p.name,
    team: p.team ?? "Unassigned",
    priority: p.priority ?? "None",
    status: p.status ?? "Unknown",
    size: p.tshirt_size ?? "N/A",
    resources: p.resources_needed ?? 0,
    quarter: p.quarter ?? "N/A",
    theme: p.theme ?? "N/A",
    deliverable: p.deliverable ?? "N/A",
    start_date: p.start_date ?? "TBD",
    end_date: p.end_date ?? "TBD",
  }));

  const userMessage = `Question: ${question}\n\nPortfolio Data (${typedProjects.length} projects):\n${JSON.stringify(projectSummary, null, 2)}`;
  const answer = await callClaude(SYSTEM_PROMPT, userMessage, 4_096);

  return Object.freeze({
    answer,
    projectCount: typedProjects.length,
  });
}
