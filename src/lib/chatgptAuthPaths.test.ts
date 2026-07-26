import { describe, expect, it } from "vitest";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  safeRelativeReturnPath,
} from "./chatgptAuthPaths";

describe("ChatGPT auth return paths", () => {
  it("preserves a same-origin relative path, query, and fragment", () => {
    expect(safeRelativeReturnPath("/profile?tab=sync#devices")).toBe(
      "/profile?tab=sync#devices",
    );
    expect(chatGPTSignInPath("/profile?tab=sync#devices")).toBe(
      "/signin-with-chatgpt?return_to=%2Fprofile%3Ftab%3Dsync%23devices",
    );
  });

  it.each([
    "https://attacker.example/profile",
    "//attacker.example/profile",
    "/\\attacker.example/profile",
    "profile",
  ])("rejects an external or non-relative return path: %s", (returnTo) => {
    expect(safeRelativeReturnPath(returnTo)).toBe("/");
  });

  it.each([
    "/signin-with-chatgpt",
    "/signout-with-chatgpt?return_to=%2Fprofile",
    "/callback?code=test",
  ])("prevents an auth route from becoming a redirect target: %s", (returnTo) => {
    expect(safeRelativeReturnPath(returnTo)).toBe("/");
  });

  it("generates a safe sign-out link", () => {
    expect(chatGPTSignOutPath("https://attacker.example")).toBe(
      "/signout-with-chatgpt?return_to=%2F",
    );
    expect(chatGPTSignOutPath()).toBe(
      "/signout-with-chatgpt?return_to=%2F",
    );
  });
});
