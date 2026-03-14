// OpenRouter API client for the ingestion package
// Used as primary provider in the hybrid inference chain: OpenRouter -> Anthropic.
// Mirrors lib/openrouter.ts but lives in the ingestion package (separate build).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenRouterMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

interface OpenRouterChoice {
  readonly message: { readonly content: string };
  readonly finish_reason: string;
}

interface OpenRouterResponse {
  readonly id: string;
  readonly choices: readonly OpenRouterChoice[];
  readonly error?: { readonly message: string; readonly code: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MAX_TOKENS = 16_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env or environment.",
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call an OpenRouter model via the OpenAI-compatible chat completions API.
 * Used as the middle fallback in the ingestion chain.
 *
 * @param system      - System prompt
 * @param userMessage - User message content
 * @param model       - OpenRouter model ID (e.g. "deepseek/deepseek-chat-v3-0324")
 * @param maxTokens   - Max response tokens (default 16000)
 * @returns The assistant's text response
 */
export async function callOpenRouter(
  system: string,
  userMessage: string,
  model: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const apiKey = getApiKey();

  const messages: readonly OpenRouterMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://tpmo-copilot.vercel.app",
      "X-Title": "TPMO Copilot Ingestion",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${response.status} ${response.statusText}): ${body}`,
    );
  }

  const data: OpenRouterResponse = await response.json();

  if (data.error) {
    throw new Error(
      `OpenRouter API error [${data.error.code}]: ${data.error.message}`,
    );
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  // Detect truncated JSON: finish_reason "length" means the model hit max_tokens
  // before completing its output. Throw a SyntaxError so the retry loop catches it.
  if (choice.finish_reason === "length") {
    throw new SyntaxError(
      `OpenRouter response truncated (finish_reason: length). Output may exceed max_tokens (${maxTokens}).`,
    );
  }

  return content;
}
