import { describe, expect, it } from "vitest";
import {
  OFFICIAL_HSK3_SAMPLE_URL,
  OFFICIAL_HSK_AUDIO_URL,
  OFFICIAL_HSK_RESOURCES,
} from "./officialHskResources";

describe("official CTI HSK resource catalog", () => {
  it("keeps the published HSK1-4 structures distinct from local practice", () => {
    expect(OFFICIAL_HSK_RESOURCES.map(({
      level,
      items,
      minutes,
      paperCode,
    }) => ({
      level,
      items,
      minutes,
      paperCode,
    }))).toEqual([
      { level: "HSK1", items: 40, minutes: 40, paperCode: "H10901" },
      { level: "HSK2", items: 60, minutes: 55, paperCode: "H20901" },
      { level: "HSK3", items: 80, minutes: 90, paperCode: "H31001" },
      { level: "HSK4", items: 100, minutes: 105, paperCode: "H41001" },
    ]);
    expect(OFFICIAL_HSK_RESOURCES.every((resource) =>
      !("year" in resource)
      && !("examYear" in resource)
      && !("publishedYear" in resource)
    )).toBe(true);
  });

  it("links only to the official CTI hosts", () => {
    for (const resource of OFFICIAL_HSK_RESOURCES) {
      expect(new URL(resource.structure).hostname).toBe("www.chinesetest.cn");
      expect(new URL(resource.paper).hostname).toBe("admin.chinesetest.cn");
      expect(new URL(resource.sample).hostname).toBe("download.chinesetest.cn");
      expect(resource.paper).toContain(`/${resource.paperCode}.pdf`);
    }
    expect(new URL(OFFICIAL_HSK_AUDIO_URL).hostname).toBe("admin.chinesetest.cn");
    expect(new URL(OFFICIAL_HSK3_SAMPLE_URL).hostname).toBe("hsk.cn-bj.ufileos.com");
  });
});
