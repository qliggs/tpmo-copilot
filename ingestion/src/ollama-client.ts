// Ollama API client — OpenAI-compatible endpoint for local inference
// Used in hybrid mode for ingestion tree-building (qwen3:8b).
// Fallback chain: Ollama -> OpenRouter -> Anthropic.
// Ollama unavailability is never a blocking error.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OllamaMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

interface OllamaChoice {
  readonly message: { readonly content: string };
  readonly finish_reason: string;
}

interface OllamaResponse {
  readonly choices: readonly OllamaChoice[];
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_MAX_TOKENS = 16_000;
const HEALTH_TIMEOUT_MS = 3_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if the Ollama service is reachable.
 * Pings the /api/tags endpoint (lightweight, lists models).
 * Returns false on any error — never throws.
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  const baseUrl = getBaseUrl();
  // Strip /v1 suffix to hit the native Ollama API
  const nativeUrl = baseUrl.replace(/\/v1\/?$/, "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const response = await fetch(`${nativeUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Call an Ollama model via the OpenAI-compatible chat completions API.
 * Same shape as callClaude / callOpenRouter.
 *
 * @param system      - System prompt
 * @param userMessage - User message content
 * @param model       - Ollama model tag (e.g. "qwen3:8b")
 * @param maxTokens   - Max response tokens (default 16000)
 * @returns The assistant's text response
 */
export async function callOllama(
  system: string,
  userMessage: string,
  model: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<string> {
  const baseUrl = getBaseUrl();

  const messages: readonly OllamaMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0,
      stream: false,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed (${response.status} ${response.statusText}): ${body}`,
    );
  }

  const data: OllamaResponse = await response.json();

  if (data.error) {
    throw new Error(`Ollama API error: ${data.error}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in Ollama response");
  }

  return content;
}
