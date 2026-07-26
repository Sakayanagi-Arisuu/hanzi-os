import { describe, expect, it } from "vitest";
import { getRadioNavigationIndex } from "./radioGroupKeyboard";

describe("radio group keyboard navigation", () => {
  it.each([
    ["ArrowRight", 0, 4, 1],
    ["ArrowDown", 3, 4, 0],
    ["ArrowLeft", 0, 4, 3],
    ["ArrowUp", 2, 4, 1],
    ["Home", 3, 4, 0],
    ["End", 0, 4, 3],
  ])("maps %s from %i of %i to %i", (key, current, count, expected) => {
    expect(getRadioNavigationIndex(key, current, count)).toBe(expected);
  });

  it("ignores unrelated keys and invalid groups", () => {
    expect(getRadioNavigationIndex("Enter", 0, 4)).toBeNull();
    expect(getRadioNavigationIndex("ArrowRight", -1, 4)).toBeNull();
    expect(getRadioNavigationIndex("ArrowRight", 0, 0)).toBeNull();
  });
});
