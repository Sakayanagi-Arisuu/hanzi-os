import { describe, expect, it } from "vitest";
import {
  BASELINE_AUTHORIZATION,
  createAuthorization,
  hasPermission,
  isAppRole,
} from "./authorization";

describe("application authorization", () => {
  it("gives every authenticated account the learner baseline", () => {
    expect(createAuthorization([])).toEqual(BASELINE_AUTHORIZATION);
    expect(hasPermission(BASELINE_AUTHORIZATION, "learning:use")).toBe(true);
    expect(hasPermission(BASELINE_AUTHORIZATION, "admin:users:read")).toBe(false);
  });

  it("adds administrative permissions without duplicating roles", () => {
    expect(createAuthorization(["admin", "learner", "admin"])).toEqual({
      roles: ["learner", "admin"],
      permissions: [
        "learning:use",
        "account:self:manage",
        "admin:users:read",
        "admin:roles:write",
      ],
    });
  });

  it("rejects unknown persisted roles", () => {
    expect(isAppRole("learner")).toBe(true);
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("editor")).toBe(false);
  });
});
