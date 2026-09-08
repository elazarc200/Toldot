import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Hebrew RTL root foundation", () => {
  it("root layout sets lang=he and dir=rtl", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/lang="he"/);
    expect(layout).toMatch(/dir="rtl"/);
  });

  it("global styles use logical properties", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );
    expect(css).toMatch(/margin-inline/);
    expect(css).toMatch(/padding-inline/);
    expect(css).toMatch(/max-inline-size/);
  });
});
