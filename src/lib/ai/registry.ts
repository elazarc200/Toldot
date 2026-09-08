
export type AiTaskDefinition = {
  taskType: string;
  allowedProviders: string[];
  defaultModelId: string;
  timeoutMs: number;
  maxTokens: number;
  maxRetries: number;
  tokenBudgetIn: number;
  tokenBudgetOut: number;
  monetaryCeilingUsd: number;
  externalResearchAllowed: boolean;
  reviewMandatory: boolean;
  /** Tools granted by server — never by model output. */
  toolAllowlist: string[];
  retrievalAdapterCodes: string[];
  promptTemplateId: string;
  outputSchemaId: string;
};

const midModel = process.env.AI_OPENAI_MODEL_MID || "gpt-4o-mini";
const highModel = process.env.AI_OPENAI_MODEL_HIGH || "gpt-4o";

export const AI_TASK_REGISTRY: Record<string, AiTaskDefinition> = {
  "research.person.discovery": {
    taskType: "research.person.discovery",
    allowedProviders: ["openai", "fake"],
    defaultModelId: highModel,
    timeoutMs: 180_000,
    maxTokens: 4096,
    maxRetries: 2,
    tokenBudgetIn: 24_000,
    tokenBudgetOut: 4096,
    monetaryCeilingUsd: 1.5,
    externalResearchAllowed: true,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.sefaria", "retrieval.open_web", "retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata", "sefaria", "open_web_discovery"],
    promptTemplateId: "research.person.discovery",
    outputSchemaId: "coverage",
  },
  "research.source.trace": {
    taskType: "research.source.trace",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 120_000,
    maxTokens: 2048,
    maxRetries: 2,
    tokenBudgetIn: 16_000,
    tokenBudgetOut: 2048,
    monetaryCeilingUsd: 0.75,
    externalResearchAllowed: true,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.sefaria", "retrieval.open_web", "retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata", "sefaria", "open_web_discovery"],
    promptTemplateId: "research.source.trace",
    outputSchemaId: "claim",
  },
  "draft.person.biography": {
    taskType: "draft.person.biography",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 120_000,
    maxTokens: 4096,
    maxRetries: 2,
    tokenBudgetIn: 12_000,
    tokenBudgetOut: 4096,
    monetaryCeilingUsd: 0.5,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata"],
    promptTemplateId: "draft.person.biography",
    outputSchemaId: "biography",
  },
  "extract.relationships": {
    taskType: "extract.relationships",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 120_000,
    maxTokens: 2048,
    maxRetries: 2,
    tokenBudgetIn: 12_000,
    tokenBudgetOut: 2048,
    monetaryCeilingUsd: 0.5,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog", "retrieval.sefaria"],
    retrievalAdapterCodes: ["catalog_metadata", "sefaria"],
    promptTemplateId: "extract.relationships",
    outputSchemaId: "relationship",
  },
  "extract.teachings": {
    taskType: "extract.teachings",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 120_000,
    maxTokens: 2048,
    maxRetries: 2,
    tokenBudgetIn: 12_000,
    tokenBudgetOut: 2048,
    monetaryCeilingUsd: 0.5,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog", "retrieval.sefaria"],
    retrievalAdapterCodes: ["catalog_metadata", "sefaria"],
    promptTemplateId: "extract.teachings",
    outputSchemaId: "teaching",
  },
  "extract.stories": {
    taskType: "extract.stories",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 120_000,
    maxTokens: 3072,
    maxRetries: 2,
    tokenBudgetIn: 12_000,
    tokenBudgetOut: 3072,
    monetaryCeilingUsd: 0.5,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog", "retrieval.sefaria"],
    retrievalAdapterCodes: ["catalog_metadata", "sefaria"],
    promptTemplateId: "extract.stories",
    outputSchemaId: "story",
  },
  "chronology.propose": {
    taskType: "chronology.propose",
    allowedProviders: ["openai", "fake"],
    defaultModelId: highModel,
    timeoutMs: 120_000,
    maxTokens: 2048,
    maxRetries: 2,
    tokenBudgetIn: 12_000,
    tokenBudgetOut: 2048,
    monetaryCeilingUsd: 0.75,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata"],
    promptTemplateId: "chronology.propose",
    outputSchemaId: "chronology",
  },
  "identity.resolve": {
    taskType: "identity.resolve",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 90_000,
    maxTokens: 1024,
    maxRetries: 2,
    tokenBudgetIn: 8_000,
    tokenBudgetOut: 1024,
    monetaryCeilingUsd: 0.25,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata"],
    promptTemplateId: "identity.resolve",
    outputSchemaId: "identity",
  },
  "duplicate.suggest": {
    taskType: "duplicate.suggest",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 60_000,
    maxTokens: 1024,
    maxRetries: 1,
    tokenBudgetIn: 6_000,
    tokenBudgetOut: 1024,
    monetaryCeilingUsd: 0.15,
    externalResearchAllowed: false,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata"],
    promptTemplateId: "duplicate.suggest",
    outputSchemaId: "duplicate",
  },
  "coverage.gaps": {
    taskType: "coverage.gaps",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 60_000,
    maxTokens: 1024,
    maxRetries: 1,
    tokenBudgetIn: 6_000,
    tokenBudgetOut: 1024,
    monetaryCeilingUsd: 0.1,
    externalResearchAllowed: false,
    reviewMandatory: false,
    toolAllowlist: ["retrieval.catalog"],
    retrievalAdapterCodes: ["catalog_metadata"],
    promptTemplateId: "coverage.gaps",
    outputSchemaId: "coverage",
  },
  "claim.evaluate": {
    taskType: "claim.evaluate",
    allowedProviders: ["openai", "fake"],
    defaultModelId: midModel,
    timeoutMs: 90_000,
    maxTokens: 2048,
    maxRetries: 2,
    tokenBudgetIn: 10_000,
    tokenBudgetOut: 2048,
    monetaryCeilingUsd: 0.4,
    externalResearchAllowed: true,
    reviewMandatory: true,
    toolAllowlist: ["retrieval.catalog", "retrieval.sefaria", "retrieval.open_web"],
    retrievalAdapterCodes: ["catalog_metadata", "sefaria", "open_web_discovery"],
    promptTemplateId: "claim.evaluate",
    outputSchemaId: "claim",
  },
};

export function getTaskDefinition(taskType: string): AiTaskDefinition {
  const def = AI_TASK_REGISTRY[taskType];
  if (!def) {
    throw new Error(`Unknown AI task type: ${taskType}`);
  }
  return def;
}

export const AI_RATE_LIMITS = {
  maxConcurrentJobsPerEditor: 2,
  maxEnqueuePerHour: 20,
  maxToolIterationsPerJob: 8,
};
