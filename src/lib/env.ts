import { z } from "zod";
import { getToladotEnv, type ToladotEnv } from "@/lib/toladot-env";

/**
 * Web application environment only.
 * Must NOT require SUPABASE_SERVICE_ROLE_KEY.
 */
const webEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_NAME: z.string().default("תולדות"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  TOLADOT_ENV: z.enum(["local", "pilot", "production"]).default("local"),
});

export type WebEnv = z.infer<typeof webEnvSchema> & { toladotEnv: ToladotEnv };

let cached: WebEnv | null = null;

export function getWebEnv(): WebEnv {
  if (cached) {
    return cached;
  }

  const toladotEnv = getToladotEnv();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const parsed = webEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SITE_URL: siteUrl || undefined,
    TOLADOT_ENV: toladotEnv,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid web environment configuration: ${details}`);
  }

  if (
    (toladotEnv === "pilot" || toladotEnv === "production") &&
    !parsed.data.NEXT_PUBLIC_SITE_URL
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required when TOLADOT_ENV is pilot or production",
    );
  }

  cached = { ...parsed.data, toladotEnv };
  return cached;
}

/** Test helper — reset cache between env validation tests. */
export function resetWebEnvCache(): void {
  cached = null;
}

export { webEnvSchema };
