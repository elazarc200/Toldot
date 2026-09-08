import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  UnauthenticatedError,
  ValidationError,
  NotFoundError,
  toSafeClientError,
} from "@/lib/errors";

describe("typed application errors", () => {
  it("maps known errors to safe client payloads", () => {
    expect(toSafeClientError(new UnauthenticatedError())).toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
    expect(toSafeClientError(new ForbiddenError())).toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    expect(toSafeClientError(new ValidationError())).toMatchObject({
      code: "VALIDATION",
      status: 400,
    });
    expect(toSafeClientError(new NotFoundError())).toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("does not expose internal details for unknown errors", () => {
    const safe = toSafeClientError(new Error("secret stack stuff"));
    expect(safe.code).toBe("INTERNAL");
    expect(safe.message).not.toMatch(/secret/);
  });
});
