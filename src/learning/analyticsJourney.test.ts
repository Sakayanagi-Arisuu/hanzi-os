import { describe, expect, it } from "vitest";
import {
  ANALYTICS_SKILL_DESTINATION,
  buildAnalyticsGateways,
} from "./analyticsJourney";

describe("Thiên Cơ Kính module links", () => {
  it("keeps every learner module reachable without changing its destination", () => {
    const gateways = buildAnalyticsGateways({
      authenticated: false,
      completedCount: 12,
      completionRate: 25,
      dueCount: 4,
      totalCount: 48,
      unresolvedMistakes: 3,
    });

    expect(gateways.map((gateway) => gateway.to)).toEqual([
      "/path",
      "/review",
      "/mistakes",
      "/pronunciation",
      "/reader",
      "/characters",
      "/exams",
      "/dictionary",
    ]);
    expect(gateways.find((gateway) => gateway.id === "review")?.status)
      .toBe("4 thẻ đang đến hạn");
    expect(gateways.find((gateway) => gateway.id === "mistakes")?.status)
      .toBe("3 lỗi đang chờ phá giải");
  });

  it("does not present local review counts as authoritative account data", () => {
    const gateways = buildAnalyticsGateways({
      authenticated: true,
      completedCount: 0,
      completionRate: 0,
      dueCount: 99,
      totalCount: 213,
      unresolvedMistakes: 0,
    });
    const review = gateways.find((gateway) => gateway.id === "review");

    expect(review?.status).toBe("Mở lịch ôn đã đồng bộ của tài khoản");
    expect(gateways.map((gateway) => gateway.status).join(" "))
      .not.toMatch(/mastery|thành thạo/iu);
  });

  it("routes all seven pillars to their existing practice halls", () => {
    expect(ANALYTICS_SKILL_DESTINATION).toEqual({
      pronunciation: "/pronunciation",
      listening: "/pronunciation",
      speaking: "/pronunciation",
      reading: "/reader",
      writing: "/characters",
      vocabulary: "/review",
      grammar: "/path",
    });
  });
});
