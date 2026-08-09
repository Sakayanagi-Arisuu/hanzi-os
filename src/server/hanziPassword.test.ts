import { describe, expect, it } from "vitest";
import {
  HanziRegistrationValidationError,
  hashHanziPassword,
  normalizeHanziIdentifier,
  validateHanziRegistration,
  verifyHanziPassword,
} from "./hanziPassword";

describe("HANZI.OS password credentials", () => {
  it("normalizes account identifiers and enforces bounded registration input", () => {
    expect(normalizeHanziIdentifier("  USER.DEMO ")).toEqual({
      kind: "username",
      value: "user.demo",
    });
    expect(normalizeHanziIdentifier(" USER@Example.COM ")).toEqual({
      kind: "email",
      value: "user@example.com",
    });
    expect(validateHanziRegistration({
      username: " User.Demo ",
      email: " USER@Example.COM ",
      password: "Safe-password-2026",
      displayName: " Người học ",
    })).toMatchObject({
      username: "user.demo",
      email: "user@example.com",
      displayName: "Người học",
    });
    expect(() => validateHanziRegistration({
      username: "x",
      email: "invalid",
      password: "short",
      displayName: "",
    })).toThrow(HanziRegistrationValidationError);
  });

  it("requires at least 12 characters with both a letter and a number", () => {
    const registration = (password: string) => validateHanziRegistration({
      username: "user.demo",
      email: "user@example.com",
      password,
      displayName: "Người học",
    });

    expect(() => registration("abcdefghij1")).toThrow(
      "Mật khẩu phải có 12–128 ký tự",
    );
    expect(() => registration("abcdefghijkl")).toThrow(
      "Mật khẩu phải có 12–128 ký tự",
    );
    expect(registration("abcdefghijk1").password).toBe("abcdefghijk1");
  });

  it("uses a unique salt and verifies both real and missing credentials", async () => {
    const left = await hashHanziPassword("Safe-password-2026", {
      iterations: 100_000,
    });
    const right = await hashHanziPassword("Safe-password-2026", {
      iterations: 100_000,
    });
    expect(left.salt).not.toBe(right.salt);
    expect(left.hash).not.toBe(right.hash);
    await expect(verifyHanziPassword("Safe-password-2026", left)).resolves.toBe(true);
    await expect(verifyHanziPassword("Wrong-password-2026", left)).resolves.toBe(false);
    await expect(verifyHanziPassword("Safe-password-2026", null)).resolves.toBe(false);
  }, 10_000);
});
