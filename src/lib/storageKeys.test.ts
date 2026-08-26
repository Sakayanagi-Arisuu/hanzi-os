import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isHanziOsStorageKey,
  isLegacyLearningResumeStorageKey,
  isLearningProgressStorageKey,
  removeLegacyLearningResumeStorage,
  writeLocalStorage,
} from "./storageKeys";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HANZI.OS storage lifecycle", () => {
  it.each([
    "hanzi-os-learning-state-v1",
    "hanzi-os-learning-state-v1-recovery",
    "hanzi-os-learning-state-v1-corrupt",
    "hanzi-os-learning-state-v1-ownership-quarantine",
    "hanzi-os-assessment-session-v1",
    "hanzi-os-hsk1-level-check-session-v1:placement-gate-v1",
    "hanzi-os-lesson-session-v3:boot-1",
    "hanzi-os-lesson-session-v4:boot-1",
  ])("recognizes progress key %s across session schema versions", (key) => {
    expect(isLearningProgressStorageKey(key)).toBe(true);
  });

  it("includes consent in a full HANZI.OS reset without touching unrelated storage", () => {
    expect(isHanziOsStorageKey("hanzi-os-voice-consent-v1")).toBe(true);
    expect(isHanziOsStorageKey("another-app-setting")).toBe(false);
  });

  it("discards every legacy global resume without assigning it to an owner", () => {
    const values = new Map([
      ["hanzi-os-learning-state-v1", "keep-progress"],
      ["hanzi-os-assessment-session-v1", "discard-assessment"],
      ["hanzi-os-lesson-session-v3:boot-1", "discard-old-lesson"],
      ["hanzi-os-lesson-session-v4:boot-2", "discard-lesson"],
      ["another-app-setting", "keep-unrelated"],
    ]);
    vi.stubGlobal("localStorage", {
      get length() {
        return values.size;
      },
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
    });

    expect(removeLegacyLearningResumeStorage()).toBe(true);
    expect([...values.entries()]).toEqual([
      ["hanzi-os-learning-state-v1", "keep-progress"],
      ["another-app-setting", "keep-unrelated"],
    ]);
    expect(isLegacyLearningResumeStorageKey("hanzi-os-lesson-session-v99:x"))
      .toBe(true);
  });

  it("reports a failed write instead of claiming an in-memory change is durable", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(() => {
        throw new DOMException("quota", "QuotaExceededError");
      }),
    });
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("CustomEvent", class {
      constructor(public readonly type: string) {}
    });

    expect(writeLocalStorage("hanzi-os-test", "value")).toBe(false);
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
