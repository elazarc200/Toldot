import type {
  AiLlmProvider,
  LlmCompleteStructuredInput,
  LlmCompleteStructuredResult,
} from "@/lib/ai/providers/types";
import { LlmProviderError } from "@/lib/ai/providers/types";

/**
 * Deterministic fake provider for unit/integration tests.
 * Does not call the network. Optional fixture map by taskType.
 */
export class FakeLlmProvider implements AiLlmProvider {
  readonly providerId = "fake";
  private fixtures = new Map<string, unknown>();

  setFixture(taskType: string, output: unknown) {
    this.fixtures.set(taskType, output);
  }

  async completeStructured(
    input: LlmCompleteStructuredInput,
  ): Promise<LlmCompleteStructuredResult> {
    if (input.modelId === "fake-timeout") {
      throw new LlmProviderError("timeout", "fake timeout");
    }
    const content =
      this.fixtures.get(input.taskType) ??
      ({
        proposal_kind: "coverage",
        gaps: [
          {
            code: "fake_default",
            description_he: "פלט ברירת מחדל לבדיקות",
            severity: "info",
          },
        ],
      } as const);

    return {
      provider: this.providerId,
      modelId: input.modelId,
      modelVersion: "fake-1",
      content,
      tokensIn: 10,
      tokensOut: 20,
      estimatedCostUsd: 0,
    };
  }
}
