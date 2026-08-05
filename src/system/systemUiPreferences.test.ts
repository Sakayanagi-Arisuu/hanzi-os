import { describe, expect, it } from "vitest";
import {
  DEFAULT_SYSTEM_UI_PREFERENCES,
  parseSystemUiPreferences,
} from "./systemUiPreferences";

describe("system UI preference migration", () => {
  it("fails safely to the versioned default", () => {
    expect(parseSystemUiPreferences(null)).toEqual(DEFAULT_SYSTEM_UI_PREFERENCES);
    expect(parseSystemUiPreferences({ motionMode: "unsupported" })).toEqual(DEFAULT_SYSTEM_UI_PREFERENCES);
  });

  it("deduplicates ceremony ids and ignores malformed values", () => {
    expect(parseSystemUiPreferences({
      motionMode: "cinematic",
      seenCeremonies: ["rank:500", "rank:500", 12, null],
      equippedTitle: "Tụ Từ Hành Giả",
    })).toMatchObject({
      version: 3,
      motionMode: "cinematic",
      seenCeremonies: ["rank:500"],
      equippedTitle: "Tụ Từ Hành Giả",
    });
  });

  it("upgrades the quiet v1 default to the clearer awakening mix", () => {
    expect(parseSystemUiPreferences({
      version: 1,
      motionMode: "balanced",
      soundEnabled: true,
      soundVolume: .28,
      voiceEnabled: false,
      seenCeremonies: ["rank:1"],
    })).toMatchObject({
      version: 3,
      soundVolume: DEFAULT_SYSTEM_UI_PREFERENCES.soundVolume,
      effectsVolume: .72,
      soundPreset: "awakening",
      voiceProfile: "mechanical",
      announcementLevel: "ceremonial",
    });
  });

  it("preserves deliberate custom volume and clamps malformed values", () => {
    expect(parseSystemUiPreferences({
      version: 2,
      soundVolume: .64,
      effectsVolume: 4,
      voiceVolume: -2,
      soundPreset: "balanced",
      voiceProfile: "guide",
      announcementLevel: "full",
    })).toMatchObject({
      soundVolume: .64,
      effectsVolume: 1,
      voiceVolume: 0,
      soundPreset: "balanced",
      voiceProfile: "guide",
      announcementLevel: "full",
    });
  });

  it("adds Mechanical Core without overwriting a deliberate legacy persona", () => {
    expect(parseSystemUiPreferences({
      version: 2,
      voiceProfile: "oracle",
    }).voiceProfile).toBe("mechanical");
    expect(parseSystemUiPreferences({
      version: 2,
      voiceProfile: "guide",
    }).voiceProfile).toBe("guide");
    expect(parseSystemUiPreferences({
      version: 3,
      voiceProfile: "mechanical",
    }).voiceProfile).toBe("mechanical");
  });
});
