import { describe, expect, it, vi } from "vitest";
import { resolveDevelopmentSingleton } from "./developmentContext";

describe("development context singleton", () => {
  it("reuses the first object identity across development module reloads", () => {
    const registry: Record<PropertyKey, unknown> = {};
    const key = Symbol.for("hanzi-os.test-context");
    const first = { generation: 1 };
    const replacementFactory = vi.fn(() => ({ generation: 2 }));

    expect(resolveDevelopmentSingleton(registry, key, () => first, true)).toBe(first);
    expect(resolveDevelopmentSingleton(
      registry,
      key,
      replacementFactory,
      true,
    )).toBe(first);
    expect(replacementFactory).not.toHaveBeenCalled();
  });

  it("does not retain module identity outside development", () => {
    const registry: Record<PropertyKey, unknown> = {};
    const key = Symbol.for("hanzi-os.production-context");

    const first = resolveDevelopmentSingleton(registry, key, () => ({}), false);
    const second = resolveDevelopmentSingleton(registry, key, () => ({}), false);

    expect(first).not.toBe(second);
    expect(registry[key]).toBeUndefined();
  });
});
