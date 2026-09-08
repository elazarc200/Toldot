import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load .env.local / .env for scripts only (not part of Next.js runtime).
loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

/**
 * Bootstrap / privileged script environment.
 * Includes service-role — never import this module from src/.
 */
const bootstrapEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    BOOTSTRAP_EDITOR_USER_ID: z.string().uuid().optional(),
    BOOTSTRAP_EDITOR_EMAIL: z.string().email().optional(),
  })
  .refine(
    (value) => Boolean(value.BOOTSTRAP_EDITOR_USER_ID || value.BOOTSTRAP_EDITOR_EMAIL),
    {
      message:
        "Provide BOOTSTRAP_EDITOR_USER_ID and/or BOOTSTRAP_EDITOR_EMAIL",
    },
  );

export type BootstrapEnv = z.infer<typeof bootstrapEnvSchema>;

export function getBootstrapEnv(): BootstrapEnv {
  const parsed = bootstrapEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BOOTSTRAP_EDITOR_USER_ID: process.env.BOOTSTRAP_EDITOR_USER_ID || undefined,
    BOOTSTRAP_EDITOR_EMAIL: process.env.BOOTSTRAP_EDITOR_EMAIL || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid bootstrap environment: ${details}`);
  }

  return parsed.data;
}

export { bootstrapEnvSchema };
