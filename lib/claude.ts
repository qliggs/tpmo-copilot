// Claude (Anthropic) API client
// Initializes the @anthropic-ai/sdk client with ANTHROPIC_API_KEY.
// Shared singleton for the RAG pipeline.

import Anthropic from "@anthropic-ai/sdk";

/** Singleton Anthropic client — reads ANTHROPIC_API_KEY from env. */
export const anthropic = new Anthropic();

/** Default model for RAG pipeline calls. */
export const RAG_MODEL = "claude-sonnet-4-6-20250514";

/**
 * Call Claude and extract the text response.
 * Throws if no text block is returned.
 */
export async function callClaude(
  system: string,
  userMessage: string,
  maxTokens: number = 4_096,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: RAG_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textBlock.text;
}
