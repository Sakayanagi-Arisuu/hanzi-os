import { afterEach, describe, expect, it, vi } from "vitest";
import { loadHanziStrokeData } from "./hanziStrokeData";

afterEach(() => vi.unstubAllGlobals());

describe("released hanzi stroke loader", () => {
  it("gates practice to exactly one glyph", async () => {
    await expect(loadHanziStrokeData("汉字")).rejects.toThrow("một Hán tự");
  });

  it("fails closed when geometry is structurally invalid", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ strokes: [], medians: [] }), { status: 200 })));
    await expect(loadHanziStrokeData("测")).rejects.toThrow("chưa vượt kiểm tra cấu trúc");
  });

  it("can retry the same glyph after a network error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        strokes: ["M 1 1 L 20 20"],
        medians: [[[1, 1], [20, 20]]],
        radStrokes: [0],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadHanziStrokeData("試")).rejects.toThrow("chưa có dữ liệu nét");
    await expect(loadHanziStrokeData("試")).resolves.toMatchObject({ radStrokes: [0] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
