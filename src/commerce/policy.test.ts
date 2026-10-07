import { describe, expect, it } from "vitest";
import { effectiveCommerceSnapshot, remainingPremiumMs, type CommerceSnapshot } from "./policy";

const snapshot: CommerceSnapshot = {
  authenticated: true, sandbox: true, active: true,
  expiresAt: 1_060_000, serverNow: 1_000_000,
  orders: [],
};

describe("Premium entitlement expiry on the client", () => {
  it("uses server-issued remaining time despite a skewed client clock", () => {
    expect(remainingPremiumMs(snapshot, 100, 100)).toBe(60_000);
    expect(remainingPremiumMs(snapshot, 100, 30_100)).toBe(30_000);
    expect(effectiveCommerceSnapshot(snapshot, 100, 60_100).active).toBe(false);
    expect(effectiveCommerceSnapshot(snapshot, 100, 60_099).active).toBe(true);
  });
  it("never reopens a server-revoked entitlement from an expiry timestamp", () => {
    expect(effectiveCommerceSnapshot({ ...snapshot, active: false }, 100, 101).active).toBe(false);
    expect(remainingPremiumMs({ ...snapshot, expiresAt: null }, 100, 101)).toBe(0);
  });
});
