import { describe, expect, it, vi } from "vitest";
import {
  enrichReaderWithGemini,
  ReaderEnrichmentConfigurationError,
  ReaderEnrichmentInputError,
  ReaderEnrichmentProtocolError,
} from "./geminiReaderEnrichment";

const input = {
  titleZh: "雨后的城市",
  chapters: [{
    titleZh: "第一章",
    paragraphs: ["雨停了。", "小林走出家门。"],
  }],
};

const result = {
  titleVi: "Thành phố sau mưa",
  synopsisVi: "Một câu chuyện ngắn sau cơn mưa.",
  hookVi: "Con đường vừa sáng lên.",
  chapters: [{
    titleVi: "Chương một",
    hookVi: "Mưa vừa tạnh.",
    estimatedMinutes: 2,
    paragraphs: [
      { pinyin: "Yǔ tíng le.", vi: "Mưa đã tạnh." },
      { pinyin: "Xiǎo Lín zǒu chū jiāmén.", vi: "Tiểu Lâm bước ra khỏi nhà." },
    ],
  }],
};

const geminiResponse = (value: unknown) => new Response(JSON.stringify({
  candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
}), { status: 200, headers: { "content-type": "application/json" } });

describe("Gemini reader enrichment", () => {
  it("keeps the source segmentation and marks output as AI-assisted, not human-reviewed", async () => {
    const fetchImpl = vi.fn(async (_request: string | URL, _init: RequestInit) => geminiResponse(result));
    const enriched = await enrichReaderWithGemini({
      config: { apiKey: "test-key-1234567890", model: "gemini-2.5-flash" },
      input,
      fetchImpl,
    });
    expect(enriched).toEqual({ ...result, aiAssisted: true, humanReviewed: false });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const firstCall = fetchImpl.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [, init] = firstCall!;
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key-1234567890");
    expect(String(init.body)).not.toContain("humanReviewed\":true");
  });

  it("fails closed when no server API key exists", async () => {
    await expect(enrichReaderWithGemini({ config: { apiKey: "" }, input }))
      .rejects.toBeInstanceOf(ReaderEnrichmentConfigurationError);
  });

  it("rejects a source without two aligned paragraphs", async () => {
    await expect(enrichReaderWithGemini({
      config: { apiKey: "test-key-1234567890" },
      input: { ...input, chapters: [{ titleZh: "第一章", paragraphs: ["只有一段。"] }] },
    })).rejects.toBeInstanceOf(ReaderEnrichmentInputError);
  });

  it("rejects output that changes chapter or paragraph cardinality", async () => {
    await expect(enrichReaderWithGemini({
      config: { apiKey: "test-key-1234567890" },
      input,
      fetchImpl: async () => geminiResponse({ ...result, chapters: [] }),
    })).rejects.toBeInstanceOf(ReaderEnrichmentProtocolError);
  });
});
