import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITIES, isCapability } from "@/lib/authz/capabilities";
import { t } from "@/lib/i18n/messages";

describe("capability vocabulary", () => {
  it("includes the approved Phase 0–4 capabilities", () => {
    expect(CAPABILITIES).toEqual([
      "edit",
      "review",
      "approve",
      "publish",
      "rollback",
      "merge_entities",
      "manage_corpus",
      "manage_editorial_membership",
      "run_ai_research",
    ]);
  });

  it("type-guards known capabilities", () => {
    expect(isCapability("edit")).toBe(true);
    expect(isCapability("isAdmin")).toBe(false);
  });
});

describe("authorize helper contract", () => {
  it("requireCapability source does not accept a caller-selected userId parameter", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/authz/authorize.ts"),
      "utf8",
    );
    expect(source).toMatch(/export async function requireCapability\(capability/);
    expect(source).not.toMatch(/requireCapability\(\s*userId/);
    expect(source).toMatch(/has_capability/);
  });

  it("src tree has no service-role supabase client module", () => {
    expect(() =>
      readFileSync(resolve(process.cwd(), "src/lib/supabase/admin.ts"), "utf8"),
    ).toThrow();
  });
});

describe("hebrew messages foundation", () => {
  it("returns Hebrew app name", () => {
    expect(t("app.name")).toBe("תולדות");
  });
});
