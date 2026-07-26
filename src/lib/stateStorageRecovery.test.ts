import { describe, expect, it, vi } from "vitest";
import { selectStoredState } from "./stateStorageRecovery";

const deserialize = (raw: string) => {
  const parsed = JSON.parse(raw) as { value?: unknown };
  if (typeof parsed.value !== "string") throw new Error("invalid state");
  return parsed.value;
};

describe("selectStoredState", () => {
  it("reports the primary snapshot when it is valid", () => {
    const readRecoveryRaw = vi.fn(() => JSON.stringify({ value: "recovery" }));
    expect(selectStoredState({
      primaryRaw: JSON.stringify({ value: "primary" }),
      readRecoveryRaw,
      deserialize,
      fallback: "default",
    })).toEqual({ state: "primary", source: "primary" });
    expect(readRecoveryRaw).not.toHaveBeenCalled();
  });

  it("reports recovery and quarantines a corrupt primary snapshot", () => {
    const onPrimaryCorrupt = vi.fn();
    expect(selectStoredState({
      primaryRaw: "broken-json",
      readRecoveryRaw: () => JSON.stringify({ value: "recovery" }),
      deserialize,
      fallback: "default",
      onPrimaryCorrupt,
    })).toEqual({ state: "recovery", source: "recovery" });
    expect(onPrimaryCorrupt).toHaveBeenCalledWith("broken-json");
  });

  it("uses the safe default when both snapshots are corrupt", () => {
    expect(selectStoredState({
      primaryRaw: "broken-primary",
      readRecoveryRaw: () => "broken-recovery",
      deserialize,
      fallback: "default",
    })).toEqual({ state: "default", source: "default" });
  });

  it("does not revive recovery after the primary snapshot was removed", () => {
    expect(selectStoredState({
      primaryRaw: null,
      readRecoveryRaw: () => JSON.stringify({ value: "stale recovery" }),
      deserialize,
      fallback: "default",
    })).toEqual({ state: "default", source: "default" });
  });
});
