import type {
  AiLlmProvider,
  LlmCompleteStructuredInput,
  LlmCompleteStructuredResult,
} from "@/lib/ai/providers/types";
import { LlmProviderError } from "@/lib/ai/providers/types";

/**
 * OpenAI adapter — the only file that talks to OpenAI APIs.
 * Keep SDK/details here; never leak into domain rules.
 */
export class OpenAiLlmProvider implements AiLlmProvider {
  readonly providerId = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.openai.com/v1",
  ) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY required for OpenAiLlmProvider");
    }
  }

  async completeStructured(
    input: LlmCompleteStructuredInput,
  ): Promise<LlmCompleteStructuredResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.modelId,
          messages: [
            { role: "system", content: input.system },
            ...input.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          max_tokens: input.maxTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: input.jsonSchemaName,
              strict: false,
              schema: input.jsonSchema,
            },
          },
        }),
      });

      if (response.status === 429) {
        throw new LlmProviderError("rate_limit", "OpenAI rate limit");
      }
      if (response.status >= 500) {
        throw new LlmProviderError("provider_outage", `OpenAI ${response.status}`);
      }
      if (!response.ok) {
        const text = await response.text();
        if (response.status === 400 && text.includes("content")) {
          throw new LlmProviderError("content_filter", text.slice(0, 200));
        }
        throw new LlmProviderError("unknown", text.slice(0, 300));
      }

      const body = (await response.json()) as {
        model?: string;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        choices?: Array<{ message?: { content?: string } }>;
      };

      const raw = body.choices?.[0]?.message?.content;
      if (!raw) {
        throw new LlmProviderError("invalid_json", "empty OpenAI content");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new LlmProviderError("invalid_json", "OpenAI returned non-JSON");
      }

      const tokensIn = body.usage?.prompt_tokens ?? 0;
      const tokensOut = body.usage?.completion_tokens ?? 0;
      // Rough estimate; refined by usage events / registry pricing.
      const estimatedCostUsd = (tokensIn * 0.000002 + tokensOut * 0.000008);

      return {
        provider: this.providerId,
        modelId: input.modelId,
        modelVersion: body.model ?? null,
        content: parsed,
        tokensIn,
        tokensOut,
        estimatedCostUsd,
      };
    } catch (err) {
      if (err instanceof LlmProviderError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new LlmProviderError("timeout", "OpenAI request timed out");
      }
      throw new LlmProviderError(
        "provider_outage",
        err instanceof Error ? err.message : "OpenAI failure",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
