import pino from "pino";

export type LogFields = {
  action?: string;
  outcome?: "success" | "failure" | "denied" | "skipped";
  userId?: string | null;
  errorCode?: string;
  route?: string;
  capability?: string;
  [key: string]: unknown;
};

const blockedKeys = new Set([
  "access_token",
  "refresh_token",
  "password",
  "service_role",
  "serviceRole",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_WORKER_SECRET",
  "OPENAI_API_KEY",
  "worker_secret",
  "workerSecret",
  "apiKey",
  "api_key",
  "token",
  "authorization",
]);

function sanitize(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (blockedKeys.has(key)) {
      continue;
    }
    if (typeof value === "string" && /service[_-]?role|eyJhbGciOi/i.test(value)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = value;
  }
  return out;
}

const base = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "toladot",
    toladotEnv:
      process.env.TOLADOT_ENV || process.env.NEXT_PUBLIC_TOLADOT_ENV || "local",
  },
  redact: {
    paths: [
      "access_token",
      "refresh_token",
      "password",
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role",
      "AI_WORKER_SECRET",
      "OPENAI_API_KEY",
      "worker_secret",
      "authorization",
    ],
    remove: true,
  },
});

export const logger = {
  debug: (message: string, fields: LogFields = {}) =>
    base.debug(sanitize(fields), message),
  info: (message: string, fields: LogFields = {}) =>
    base.info(sanitize(fields), message),
  warn: (message: string, fields: LogFields = {}) =>
    base.warn(sanitize(fields), message),
  error: (message: string, fields: LogFields = {}) =>
    base.error(sanitize(fields), message),
};
