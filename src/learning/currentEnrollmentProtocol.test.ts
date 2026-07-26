import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  parseActivateCurrentEnrollmentCommand,
  parseCurrentEnrollmentReceipt,
} from "./currentEnrollmentProtocol";

describe("current enrollment protocol", () => {
  it("accepts only the exact activation command", () => {
    expect(parseActivateCurrentEnrollmentCommand({ protocolVersion: 1 }).ok)
      .toBe(true);
    expect(parseActivateCurrentEnrollmentCommand({
      protocolVersion: 1,
      enrollmentId: "client-chosen",
    }).ok).toBe(false);
    expect(parseActivateCurrentEnrollmentCommand({ protocolVersion: 2 }).ok)
      .toBe(false);
  });

  it("parses an exact server-owned receipt and rejects injected fields", () => {
    const receipt = {
      protocolVersion: 1,
      enrollmentId: "enrollment-a",
      courseId: "hanzi-os-core",
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "beta",
      goal: "conversation",
    };
    expect(parseCurrentEnrollmentReceipt(receipt)).toEqual(receipt);
    expect(parseCurrentEnrollmentReceipt({ ...receipt, unlocked: true })).toBeNull();
    expect(parseCurrentEnrollmentReceipt({ ...receipt, releaseState: "review" }))
      .toBeNull();
    expect(parseCurrentEnrollmentReceipt({
      ...receipt,
      contentVersion: "older-package",
    })).toBeNull();
    expect(parseCurrentEnrollmentReceipt({
      ...receipt,
      manifestSha256: `sha256:${"a".repeat(64)}`,
    })).toBeNull();
  });
});
