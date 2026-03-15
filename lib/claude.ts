// Claude (Anthropic) API client
// Initializes the @anthropic-ai/sdk client with ANTHROPIC_API_KEY.
// Shared singleton for the RAG pipeline.

import Anthropic from "@anthropic-ai/sdk";

/** Singleton Anthropic client — reads ANTHROPIC_API_KEY from env. */
export const anthropic = new Anthropic();

/** Default model for RAG pipeline calls. */
export const RAG_MODEL = "claude-sonnet-4-6";

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

/**
 * Stream Claude and invoke onChunk for each text delta.
 * Returns the fully assembled text once the stream completes.
 * Edge-runtime compatible (uses standard async iteration over fetch-based stream).
 */
export async function streamClaude(
  system: string,
  userMessage: string,
  onChunk: (text: string) => void,
  maxTokens: number = 4_096,
): Promise<string> {
  const stream = await anthropic.messages.create({
    model: RAG_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  });

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onChunk(event.delta.text);
    }
  }

  if (fullText.length === 0) {
    throw new Error("No text content in Claude stream");
  }

  return fullText;
}
