import { FakeLlmProvider } from "@/lib/ai/providers/fake";
import { OpenAiLlmProvider } from "@/lib/ai/providers/openai";
import type { AiLlmProvider } from "@/lib/ai/providers/types";

export function createLlmProvider(
  providerId: string = process.env.AI_LLM_PROVIDER || "openai",
): AiLlmProvider {
  if (providerId === "fake" || process.env.AI_LLM_PROVIDER === "fake") {
    return new FakeLlmProvider();
  }
  if (providerId === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      if (process.env.NODE_ENV === "test") {
        return new FakeLlmProvider();
      }
      throw new Error("OPENAI_API_KEY is required when AI_LLM_PROVIDER=openai");
    }
    return new OpenAiLlmProvider(key);
  }
  throw new Error(`Unknown LLM provider: ${providerId}`);
}
