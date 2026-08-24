import { describe, expect, it } from "vitest";
import { RELEASED_CHARACTER_PRACTICE } from "../learning/richLessonContent";
import {
  advanceCharacterForgeSession,
  buildCharacterForgeQueue,
  classifyStrokeDirection,
  createCharacterForgeSession,
  createStrokeDirectionOptions,
  getAdaptiveAssistance,
  getSessionAssistance,
  parseCharacterForgeSession,
} from "./characterForgeSession";

describe("character forge session", () => {
  it("keeps requested characters first and never escapes the lesson queue", () => {
    const lessonId = RELEASED_CHARACTER_PRACTICE[0]!.lessonId;
    const lessonEntries = RELEASED_CHARACTER_PRACTICE.filter((entry) => entry.lessonId === lessonId);
    const requested = lessonEntries.at(-1)!.hanzi;
    const queue = buildCharacterForgeQueue(RELEASED_CHARACTER_PRACTICE, {
      lessonId,
      requestedHanzis: [requested],
      limit: 5,
    });
    expect(queue[0]!.hanzi).toBe(requested);
    expect(queue.every((entry) => entry.lessonId === lessonId)).toBe(true);
    expect(queue.length).toBeLessThanOrEqual(5);
  });

  it("adapts an ordinary Thiên Lộ lesson through its requested character list", () => {
    const queue = buildCharacterForgeQueue(RELEASED_CHARACTER_PRACTICE, {
      lessonId: "boot-1",
      requestedHanzis: ["你", "人"],
      limit: 5,
    });
    expect(queue.map((entry) => entry.hanzi)).toEqual(["你", "人"]);
  });

  it("moves through five phases before advancing to the next character", () => {
    let session = createCharacterForgeSession({
      entries: RELEASED_CHARACTER_PRACTICE,
      source: "quick",
      limit: 2,
      now: "2026-08-22T00:00:00.000Z",
    })!;
    for (const phase of ["prediction", "guided", "recall", "context"] as const) {
      session = advanceCharacterForgeSession(session);
      expect(session.phase).toBe(phase);
      expect(session.currentIndex).toBe(0);
    }
    session = advanceCharacterForgeSession(session, { needsReplay: true });
    expect(session.phase).toBe("structure");
    expect(session.currentIndex).toBe(1);
    expect(session.needsReplay).toContain(session.hanzis[0]);
  });

  it("keeps paper and replay evidence when moving between phases", () => {
    const created = createCharacterForgeSession({
      entries: RELEASED_CHARACTER_PRACTICE,
      source: "quick",
      limit: 1,
    })!;
    const guided = { ...created, phase: "guided" as const };
    const recall = advanceCharacterForgeSession(guided, { usedPaper: true, needsReplay: true });
    expect(recall.phase).toBe("recall");
    expect(recall.paperHanzis).toEqual([created.hanzis[0]]);
    expect(recall.needsReplay).toEqual([created.hanzis[0]]);
  });

  it("escalates and de-escalates assistance within L0-L5", () => {
    expect(getAdaptiveAssistance(0, "miss")).toBe(1);
    expect(getAdaptiveAssistance(4, "hint")).toBe(5);
    expect(getAdaptiveAssistance(5, "miss")).toBe(5);
    expect(getAdaptiveAssistance(3, "success")).toBe(2);
    expect(getAdaptiveAssistance(0, "success")).toBe(0);
  });

  it("carries the reduced scaffold into the next character", () => {
    const session = createCharacterForgeSession({
      entries: RELEASED_CHARACTER_PRACTICE,
      source: "quick",
      limit: 2,
    })!;
    const next = { ...session, currentIndex: 1, assistanceByHanzi: { [session.hanzis[0]!]: 1 } };
    expect(getSessionAssistance(next, next.hanzis[1]!, 3)).toBe(1);
  });

  it("rejects corrupt resumes and preserves a valid paper fallback", () => {
    expect(parseCharacterForgeSession("{}")) .toBeNull();
    const session = createCharacterForgeSession({
      entries: RELEASED_CHARACTER_PRACTICE,
      source: "custom",
      requestedHanzis: ["人"],
      limit: 1,
    })!;
    const resumed = parseCharacterForgeSession(JSON.stringify({ ...session, paperHanzis: ["人"] }));
    expect(resumed?.paperHanzis).toEqual(["人"]);
  });
});

describe("stroke prediction", () => {
  it("classifies direction and always includes the canonical answer", () => {
    const median: Array<[number, number]> = [[100, 500], [500, 490]];
    expect(classifyStrokeDirection(median)).toBe("ngang");
    const prediction = createStrokeDirectionOptions(median, 2);
    expect(prediction.options).toContain(prediction.answer);
    expect(new Set(prediction.options).size).toBe(prediction.options.length);
  });
});
