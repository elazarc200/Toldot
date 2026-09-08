import { z } from "zod";

export const llmCompleteStructuredInputSchema = z.object({
  taskType: z.string().min(1),
  system: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
  /** JSON Schema-ish description for the provider; validated again in-app with Zod. */
  jsonSchemaName: z.string().min(1),
  jsonSchema: z.record(z.string(), z.unknown()),
  timeoutMs: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
  modelId: z.string().min(1),
});

export type LlmCompleteStructuredInput = z.infer<
  typeof llmCompleteStructuredInputSchema
>;

export type LlmCompleteStructuredResult = {
  provider: string;
  modelId: string;
  modelVersion: string | null;
  content: unknown;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
  rawRef?: string;
};

export type LlmProviderErrorCode =
  | "timeout"
  | "rate_limit"
  | "invalid_json"
  | "provider_outage"
  | "content_filter"
  | "budget_exceeded"
  | "unknown";

export class LlmProviderError extends Error {
  readonly code: LlmProviderErrorCode;
  constructor(code: LlmProviderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "LlmProviderError";
  }
}

/**
 * Vendor-neutral LLM interface. Domain/application must depend on this only —
 * never on OpenAI SDK types.
 */
export interface AiLlmProvider {
  readonly providerId: string;
  completeStructured(
    input: LlmCompleteStructuredInput,
  ): Promise<LlmCompleteStructuredResult>;
}
