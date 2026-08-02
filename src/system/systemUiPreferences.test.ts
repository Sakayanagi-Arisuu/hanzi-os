import { describe, expect, it } from "vitest";
import { DEFAULT_SYSTEM_UI_PREFERENCES, parseSystemUiPreferences } from "./systemUiPreferences";

describe("system UI preference migration", () => {
  it("fails safely to the versioned default", () => {
    expect(parseSystemUiPreferences(null)).toEqual(DEFAULT_SYSTEM_UI_PREFERENCES);
    expect(parseSystemUiPreferences({ motionMode: "unsupported" })).toEqual(DEFAULT_SYSTEM_UI_PREFERENCES);
  });

  it("deduplicates ceremony ids and ignores malformed values", () => {
    expect(parseSystemUiPreferences({
      version: 99,
      motionMode: "cinematic",
      seenCeremonies: ["rank:500", "rank:500", 12, null],
      equippedTitle: "Tụ Từ Hành Giả",
    })).toEqual({
      version: 1,
      motionMode: "cinematic",
      seenCeremonies: ["rank:500"],
      equippedTitle: "Tụ Từ Hành Giả",
    });
  });
});
