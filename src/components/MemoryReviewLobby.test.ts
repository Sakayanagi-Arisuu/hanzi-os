import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { MemoryReviewLobby } from "./MemoryReviewLobby";

const renderLobby = (activatedCount: number) => renderToStaticMarkup(
  createElement(MemoryRouter, {}, createElement(MemoryReviewLobby, {
    activatedCount, dueCount: 0, reviewedToday: 0, forecast: [],
    distribution: { total: 0, stable: 0, consolidating: 0, newCards: 0 },
  })),
);

describe("empty review lobby", () => {
  it("does not invent a full distribution when there are no cards", () => {
    const html = renderLobby(0);
    expect(html).not.toContain("100%");
    expect(html).toContain("is-empty");
    expect(html).toContain("Học để kích hoạt ký ức");
  });
  it("distinguishes completed due reviews from a new learner", () => {
    const html = renderLobby(8);
    expect(html).toContain("Bạn đã ôn hết thẻ đến hạn");
    expect(html).toContain("Tiếp tục Thiên Lộ");
  });
});
