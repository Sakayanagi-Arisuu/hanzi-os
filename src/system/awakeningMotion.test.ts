import { describe, expect, it } from "vitest";
import { arrivalFrames, frameSampleIsSlow, motionFamilyForPath, resolveMotionMode, resolveMotionQuality } from "./awakeningMotion";

describe("adaptive awakening motion", () => {
  it("respects OS reduced motion even with a saved cinematic preference", () => {
    for (const mode of ["auto", "cinematic", "balanced", "reduced"] as const) {
      expect(resolveMotionMode(mode, true, "full")).toBe("reduced");
    }
    expect(resolveMotionMode("reduced", false, "full")).toBe("reduced");
  });
  it("reduces work for constrained hardware and data saving without requiring unsupported APIs", () => {
    expect(resolveMotionQuality({ cores: 4 })).toBe("light");
    expect(resolveMotionQuality({ memory: 2, cores: 16 })).toBe("light");
    expect(resolveMotionQuality({ saveData: true })).toBe("light");
    expect(resolveMotionQuality({})).toBe("full");
    expect(resolveMotionMode("auto", false, "light")).toBe("balanced");
    expect(resolveMotionMode("auto", false, "full")).toBe("cinematic");
  });
  it("covers nested routes without confusing expansion, premium or sessions with their parent", () => {
    expect(motionFamilyForPath("/path/expansion/mission")).toBe("lexicon");
    expect(motionFamilyForPath("/profile/premium")).toBe("premium");
    expect(motionFamilyForPath("/characters/session")).toBe("forge");
    expect(motionFamilyForPath("/assessment/placement/hsk4")).toBe("trial");
    expect(motionFamilyForPath("/reader/series/a/chapter/b")).toBe("reader");
  });
  it("uses distinct choreography for the major learning areas and cheaper frames in light mode", () => {
    const families = ["path", "lesson", "memory", "voice", "forge", "reader", "trial", "profile"] as const;
    expect(new Set(families.map(family => JSON.stringify(arrivalFrames(family, "full")))).size).toBe(families.length);
    expect(JSON.stringify(arrivalFrames("memory", "light"))).not.toContain("perspective");
  });
  it("downgrades sustained poor frame pacing but ignores one isolated pause", () => {
    expect(frameSampleIsSlow(Array(24).fill(16.7))).toBe(false);
    expect(frameSampleIsSlow([...Array(23).fill(16.7), 160])).toBe(false);
    expect(frameSampleIsSlow(Array(24).fill(40))).toBe(true);
    expect(frameSampleIsSlow([45, 45])).toBe(false);
  });
});
