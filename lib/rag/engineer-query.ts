// Engineer Query — Mode C of the RAG pipeline
// When a question is about engineer capacity, allocation, or team workload,
// query both projects and engineers tables, compute allocation stats,
// and pass structured data to Claude for analysis.

import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaude, streamClaude } from "@/lib/claude";
import {
  computeEngineerAllocations,
  computeTeamCapacity,
  type EngineerRow,
  type ProjectRow,
} from "@/lib/engineer-stats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineerQueryResult {
  readonly answer: string;
  readonly engineerCount: number;
  readonly projectCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a capacity intelligence assistant for a Technology PMO (Project Management Office). You have access to both structured project data from the Book of Work AND engineer allocation data.

Answer the question using ONLY the provided data. Be specific — include engineer names, team names, utilization percentages, and project counts when relevant.

Format your answer clearly:
- Use bullet points for lists of engineers or teams
- Include relevant metrics (FTE capacity, utilization %, project counts)
- If asked about overallocation or risk, highlight specific teams or engineers
- When comparing teams, use a structured format
- Always cite specific numbers from the data

If the data doesn't contain enough information to answer, say so clearly.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchData(supabase: SupabaseClient): Promise<{
  readonly engineers: readonly EngineerRow[];
  readonly projects: readonly ProjectRow[];
}> {
  const [engineerResult, projectResult] = await Promise.all([
    supabase
      .from("engineers")
      .select("name, team, capacity, active")
      .order("name"),
    supabase
      .from("projects")
      .select("name, team, status, resources_needed, start_date, end_date, quarter")
      .order("name"),
  ]);

  if (engineerResult.error) {
    throw new Error(`Failed to fetch engineers: ${engineerResult.error.message}`);
  }
  if (projectResult.error) {
    throw new Error(`Failed to fetch projects: ${projectResult.error.message}`);
  }

  return Object.freeze({
    engineers: (engineerResult.data ?? []) as readonly EngineerRow[],
    projects: (projectResult.data ?? []) as readonly ProjectRow[],
  });
}

function buildUserMessage(
  question: string,
  engineers: readonly EngineerRow[],
  projects: readonly ProjectRow[],
): string {
  const allocations = computeEngineerAllocations(engineers, projects);
  const teamCapacities = computeTeamCapacity(engineers, projects);

  const allocationSummary = allocations.map((a) => ({
    engineer: a.engineer,
    team: a.team,
    capacity_fte: a.capacity,
    projects: a.projectCount,
    demand_fte: a.totalDemand,
    utilization_pct: a.utilizationPct,
    is_over_allocated: a.isOverAllocated,
  }));

  const teamSummary = teamCapacities.map((tc) => ({
    team: tc.team,
    total_fte: tc.totalFTE,
    total_demand: tc.totalDemand,
    utilization_pct: tc.utilizationPct,
    engineers: tc.engineerCount,
    projects: tc.projectCount,
  }));

  const projectSummary = projects.map((p) => ({
    name: p.name,
    team: p.team ?? "Unassigned",
    status: p.status ?? "Unknown",
    resources_needed: p.resources_needed ?? 0,
    quarter: p.quarter ?? "N/A",
    start_date: p.start_date ?? "TBD",
    end_date: p.end_date ?? "TBD",
  }));

  return [
    `Question: ${question}`,
    "",
    `Engineer Allocations (${allocations.length} engineers):`,
    JSON.stringify(allocationSummary, null, 2),
    "",
    `Team Capacity Summary (${teamCapacities.length} teams):`,
    JSON.stringify(teamSummary, null, 2),
    "",
    `Project Data (${projects.length} projects):`,
    JSON.stringify(projectSummary, null, 2),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lightweight check: does the engineers table have any rows?
 * Used by the orchestrator to verify capacity mode before committing.
 */
export async function hasEngineerData(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("engineers")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.warn(`[engineer-query] Failed to check engineers: ${error.message}`);
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Query both projects and engineers tables and generate an answer
 * about engineer capacity, allocation, or team workload.
 * This is Mode C of the RAG pipeline.
 */
export async function queryEngineers(
  question: string,
  supabase: SupabaseClient,
): Promise<EngineerQueryResult> {
  const { engineers, projects } = await fetchData(supabase);

  if (engineers.length === 0) {
    return Object.freeze({
      answer: "No engineers found in the database. Run a Notion sync first to populate engineer data.",
      engineerCount: 0,
      projectCount: projects.length,
    });
  }

  const userMessage = buildUserMessage(question, engineers, projects);
  const answer = await callClaude(SYSTEM_PROMPT, userMessage, 4_096);

  return Object.freeze({
    answer,
    engineerCount: engineers.length,
    projectCount: projects.length,
  });
}

/**
 * Streaming variant of queryEngineers for Mode C.
 * Calls onChunk() for each text delta. Returns the final result
 * once the stream completes.
 */
export async function streamEngineerAnswer(
  question: string,
  supabase: SupabaseClient,
  onChunk: (text: string) => void,
): Promise<EngineerQueryResult> {
  const { engineers, projects } = await fetchData(supabase);

  if (engineers.length === 0) {
    const fallback =
      "No engineers found in the database. Run a Notion sync first to populate engineer data.";
    onChunk(fallback);
    return Object.freeze({
      answer: fallback,
      engineerCount: 0,
      projectCount: projects.length,
    });
  }

  const userMessage = buildUserMessage(question, engineers, projects);
  const answer = await streamClaude(SYSTEM_PROMPT, userMessage, onChunk, 4_096);

  return Object.freeze({
    answer,
    engineerCount: engineers.length,
    projectCount: projects.length,
  });
}
