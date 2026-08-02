import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emitSystemSignal,
  resetSystemSignalsForTests,
  subscribeSystemSignals,
} from "./systemSignals";

afterEach(resetSystemSignalsForTests);

describe("system signal bus", () => {
  it("delivers one semantic reaction for one idempotency id", () => {
    const listener = vi.fn();
    subscribeSystemSignals(listener);
    const signal = {
      type: "lesson.completed" as const,
      sourceId: "lesson:hsk1-01",
      eventId: "session-1:result",
    };
    expect(emitSystemSignal(signal)).toBe(true);
    expect(emitSystemSignal(signal)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSystemSignals(listener);
    unsubscribe();
    emitSystemSignal({ type: "state.saved", sourceId: "profile" });
    expect(listener).not.toHaveBeenCalled();
  });
});
