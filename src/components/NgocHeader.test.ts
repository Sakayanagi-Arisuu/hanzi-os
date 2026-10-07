import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCommerce } from "../commerce/CommerceProvider";
import { NgocHeader } from "./NgocHeader";

vi.mock("../commerce/CommerceProvider", () => ({ useCommerce: vi.fn() }));
const render = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(NgocHeader, {
  title: "Thức Tỉnh Điện", plainTitle: "Học hôm nay", name: "", statusOpen: false,
  statusButtonRef: { current: null }, onSummon: () => undefined,
})));
const snapshot = { authenticated: true, active: true, sandbox: true, expiresAt: 2000, serverNow: 1000, orders: [] };

describe("Ngọc điện header membership", () => {
  beforeEach(() => vi.mocked(useCommerce).mockReturnValue({ snapshot: null, loading: true, error: "", refresh: vi.fn() }));
  it("keeps the premium entry usable without claiming membership while loading", () => {
    const html = render();
    expect(html).toContain('href="/profile/premium"');
    expect(html).toContain('data-member="false"');
    expect(html).not.toContain("GÓI CỦA BẠN");
    expect(html).toContain("Hành giả vô danh");
  });
  it("shows membership only from an authenticated verified active snapshot", () => {
    vi.mocked(useCommerce).mockReturnValue({ snapshot, loading: false, error: "", refresh: vi.fn() });
    expect(render()).toContain('aria-label="Premium của tôi"');
  });
  it.each([
    { snapshot: { ...snapshot, active: false }, loading: false, error: "" },
    { snapshot: { ...snapshot, authenticated: false }, loading: false, error: "" },
    { snapshot, loading: true, error: "" },
    { snapshot, loading: false, error: "offline" },
  ])("does not show confirmed membership for unavailable/expired/guest state %j", (state) => {
    vi.mocked(useCommerce).mockReturnValue({ ...state, refresh: vi.fn() });
    expect(render()).toContain('data-member="false"');
  });
});
