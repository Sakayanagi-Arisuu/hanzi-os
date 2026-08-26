import { describe, expect, it } from "vitest";
import { getPlacementGateSessionStorageKey } from "../lib/storageKeys";
import { resolvePlacementResumeDestination } from "./placementResume";

const base = "hanzi-os-hsk1-level-check-session-v1";

const makeResume = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  version: 1,
  contentVersion: "foundation-test",
  formVersion: "form:placement-gate-v1",
  bankId: "bank:placement-gate-v1",
  sessionId: "placement-session",
  phase: "question",
  index: 4,
  selected: null,
  checked: false,
  answers: { q1: "A", q2: "B", q3: "A", q4: "C" },
  updatedAt: 100,
  ...overrides,
});

describe("placement resume destination", () => {
  it("routes an invitation to the exact saved level and next question", () => {
    const values = new Map([
      [getPlacementGateSessionStorageKey(base), makeResume()],
    ]);

    expect(resolvePlacementResumeDestination((key) => values.get(key) ?? null)).toEqual({
      href: "/assessment/placement/hsk1",
      level: 1,
      phase: "question",
      questionNumber: 5,
      sessionId: "placement-session",
    });
  });

  it("normalizes a legacy checked question to the next unanswered question", () => {
    const values = new Map([
      [getPlacementGateSessionStorageKey(base), makeResume({ index: 4, checked: true })],
    ]);

    expect(resolvePlacementResumeDestination((key) => values.get(key) ?? null)?.questionNumber)
      .toBe(6);
  });

  it("fails closed for malformed or non-placement records", () => {
    expect(resolvePlacementResumeDestination(() => "{}")) .toBeNull();
    expect(resolvePlacementResumeDestination(() => makeResume({
      formVersion: "ordinary-level-check",
    }))).toBeNull();
  });
});
