import { afterEach, describe, expect, it } from "vitest";
import { getWebEnv, resetWebEnvCache, webEnvSchema } from "@/lib/env";

afterEach(() => {
  resetWebEnvCache();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_APP_NAME;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.TOLADOT_ENV;
  delete process.env.NEXT_PUBLIC_TOLADOT_ENV;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("web environment validation", () => {
  it("accepts URL and anon key without service role", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";

    const env = getWebEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-test-key");
    expect("SUPABASE_SERVICE_ROLE_KEY" in env).toBe(false);
  });

  it("fails when URL is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    expect(() => getWebEnv()).toThrow(/Invalid web environment/);
  });

  it("schema does not list service-role as required", () => {
    const shape = webEnvSchema.shape;
    expect("SUPABASE_SERVICE_ROLE_KEY" in shape).toBe(false);
  });
});
