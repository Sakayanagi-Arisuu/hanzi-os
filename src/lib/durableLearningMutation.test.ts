import { describe, expect, it, vi } from "vitest";
import { commitDurableLearningState } from "./durableLearningMutation";

describe("commitDurableLearningState", () => {
  it("does not apply replacement state until the outbox commit resolves", async () => {
    let release: (() => void) | undefined;
    const enqueue = () => new Promise<void>((resolve) => {
      release = resolve;
    });
    const apply = vi.fn(() => true);
    const committed = commitDurableLearningState({
      nextState: "replacement",
      enqueue,
      apply,
    });

    await Promise.resolve();
    expect(apply).not.toHaveBeenCalled();
    release?.();
    await expect(committed).resolves.toBe(true);
    expect(apply).toHaveBeenCalledWith("replacement");
  });

  it("preserves the current state when the outbox commit rejects", async () => {
    const apply = vi.fn(() => true);
    await expect(commitDurableLearningState({
      nextState: "replacement",
      enqueue: () => Promise.reject(new Error("IndexedDB unavailable")),
      apply,
    })).resolves.toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });
});
