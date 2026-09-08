import { afterEach, describe, expect, it } from "vitest";
import {
  getToladotEnv,
  shouldDisallowSearchIndexing,
} from "@/lib/toladot-env";

afterEach(() => {
  delete process.env.TOLADOT_ENV;
  delete process.env.NEXT_PUBLIC_TOLADOT_ENV;
});

describe("getToladotEnv", () => {
  it("defaults to local", () => {
    expect(getToladotEnv()).toBe("local");
  });

  it("reads TOLADOT_ENV", () => {
    process.env.TOLADOT_ENV = "pilot";
    expect(getToladotEnv()).toBe("pilot");
  });

  it("accepts production", () => {
    process.env.TOLADOT_ENV = "production";
    expect(getToladotEnv()).toBe("production");
  });

  it("falls back to local for unknown values", () => {
    process.env.TOLADOT_ENV = "staging";
    expect(getToladotEnv()).toBe("local");
  });

  it("uses NEXT_PUBLIC_TOLADOT_ENV when TOLADOT_ENV unset", () => {
    process.env.NEXT_PUBLIC_TOLADOT_ENV = "pilot";
    expect(getToladotEnv()).toBe("pilot");
  });
});

describe("shouldDisallowSearchIndexing", () => {
  it("disallows indexing for local", () => {
    expect(shouldDisallowSearchIndexing("local")).toBe(true);
  });

  it("disallows indexing for pilot", () => {
    expect(shouldDisallowSearchIndexing("pilot")).toBe(true);
  });

  it("allows indexing only for production", () => {
    expect(shouldDisallowSearchIndexing("production")).toBe(false);
  });
});
