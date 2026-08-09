import { describe, expect, it } from "vitest";
import { signedOutDestination } from "./authNavigation";

describe("sign-out navigation", () => {
  it("keeps first-party accounts inside the HANZI.OS identity flow", () => {
    expect(signedOutDestination("hanzi")).toBe("/signin");
    expect(signedOutDestination("google")).toBe("/signin");
    expect(signedOutDestination("facebook")).toBe("/signin");
  });

  it("preserves the hosted compatibility sign-out handoff", () => {
    expect(signedOutDestination(undefined)).toBe(
      "/signout-with-chatgpt?return_to=%2F",
    );
  });
});
