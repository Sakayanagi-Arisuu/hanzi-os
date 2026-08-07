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
        "content:workspace:read",
        "content:approve",
        "content:publish",
        "admin:users:read",
        "admin:roles:write",
        "admin:users:lock",
        "admin:sessions:read",
        "admin:sessions:revoke",
        "admin:settings:read",
        "admin:settings:write",
        "admin:audit:read",
      ],
    });
  });

  it("gives the content editor draft and submission rights without admin controls", () => {
    const authorization = createAuthorization(["content_editor"]);
    expect(authorization.roles).toEqual(["learner", "content_editor"]);
    expect(authorization.permissions).toEqual([
      "learning:use",
      "account:self:manage",
      "content:workspace:read",
      "content:drafts:write",
      "content:validation:run",
      "content:submit",
    ]);
    expect(hasPermission(authorization, "admin:users:read")).toBe(false);
    expect(hasPermission(authorization, "content:publish")).toBe(false);
  });

  it("rejects unknown persisted roles", () => {
    expect(isAppRole("learner")).toBe(true);
    expect(isAppRole("content_editor")).toBe(true);
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("editor")).toBe(false);
  });
});
