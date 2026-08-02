import { describe, expect, it } from "vitest";
import { ACTIVITY_RANKS, getInteractionRankProgress } from "./systemProgression";

describe("system activity rank projection", () => {
  it.each([
    [0, "Khai Ngôn", 0],
    [499, "Khai Ngôn", 100],
    [500, "Tụ Âm", 0],
    [1_399, "Tụ Âm", 100],
    [1_400, "Ngưng Ý", 0],
    [2_799, "Ngưng Ý", 100],
    [2_800, "Thông Văn", 0],
    [4_999, "Thông Văn", 100],
    [5_000, "Linh Ngôn", 0],
    [7_999, "Linh Ngôn", 100],
    [8_000, "Hóa Cảnh", 100],
  ])("maps %i XP to the correct non-uniform threshold", (xp, title, progress) => {
    const projection = getInteractionRankProgress(xp);
    expect(projection.title).toBe(title);
    expect(projection.progress).toBe(progress);
  });

  it("keeps the rank table ordered and starts at zero", () => {
    expect(ACTIVITY_RANKS[0]?.min).toBe(0);
    expect(ACTIVITY_RANKS.map((rank) => rank.min)).toEqual(
      [...ACTIVITY_RANKS].map((rank) => rank.min).sort((a, b) => a - b),
    );
  });
});
