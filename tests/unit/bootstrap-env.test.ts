import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Mirrors scripts/env.ts schema without importing scripts into the app test graph.
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
    { message: "target required" },
  );

describe("bootstrap environment validation", () => {
  it("requires service-role key", () => {
    const result = bootstrapEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      BOOTSTRAP_EDITOR_EMAIL: "editor@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts service-role with email target", () => {
    const result = bootstrapEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      BOOTSTRAP_EDITOR_EMAIL: "editor@example.com",
    });
    expect(result.success).toBe(true);
  });
});
