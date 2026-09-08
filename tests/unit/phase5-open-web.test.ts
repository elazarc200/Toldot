import { describe, expect, it } from "vitest";
import {
  assertUrlSafeForFetch,
  _openWebTest,
} from "@/lib/ai/retrieval/open-web";

const { isPrivateOrBlockedIp, DEFAULT_ALLOWLIST } = _openWebTest;

describe("isPrivateOrBlockedIp", () => {
  it("blocks loopback IPv4", () => {
    expect(isPrivateOrBlockedIp("127.0.0.1")).toBe(true);
  });

  it("blocks 10.x private range", () => {
    expect(isPrivateOrBlockedIp("10.0.0.1")).toBe(true);
    expect(isPrivateOrBlockedIp("10.255.255.255")).toBe(true);
  });

  it("blocks 192.168.x private range", () => {
    expect(isPrivateOrBlockedIp("192.168.1.1")).toBe(true);
  });

  it("blocks cloud metadata link-local", () => {
    expect(isPrivateOrBlockedIp("169.254.169.254")).toBe(true);
  });

  it("blocks IPv6 loopback", () => {
    expect(isPrivateOrBlockedIp("::1")).toBe(true);
  });

  it("allows a typical public IPv4", () => {
    expect(isPrivateOrBlockedIp("8.8.8.8")).toBe(false);
  });
});

describe("assertUrlSafeForFetch", () => {
  it("rejects non-allowlisted hosts", async () => {
    await expect(
      assertUrlSafeForFetch("https://evil.example/path", DEFAULT_ALLOWLIST),
    ).rejects.toThrow(/not allowlisted/i);
  });

  it("rejects private IP literals even if forced onto allowlist", async () => {
    const allow = new Set(["127.0.0.1"]);
    await expect(
      assertUrlSafeForFetch("https://127.0.0.1/", allow),
    ).rejects.toThrow(/blocked/i);
  });
});
