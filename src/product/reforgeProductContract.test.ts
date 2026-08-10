import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  REFORGE_AREA_IDS,
  REFORGE_PRODUCT_CONTRACT,
} from "./reforgeProductContract";

describe("HANZI.OS Reforge product contract", () => {
  it("locks the learner, language and local-first scope", () => {
    expect(REFORGE_PRODUCT_CONTRACT.audience).toBe("Người Việt tự học từ số 0 đến HSK4.");
    expect(REFORGE_PRODUCT_CONTRACT.languageScope).toBe(
      "Mandarin Trung Quốc đại lục, chữ giản thể và Pinyin.",
    );
    expect(REFORGE_PRODUCT_CONTRACT.platformScope).toContain("local-first");
    expect(REFORGE_PRODUCT_CONTRACT.platformScope).toContain("AI ngoài chỉ là tùy chọn");
    expect(REFORGE_PRODUCT_CONTRACT.deliveryStatus).toContain("không phải tuyên bố");
  });

  it("keeps exactly five plain-language areas in the agreed order", () => {
    const ids = REFORGE_PRODUCT_CONTRACT.areas.map(({ id }) => id);
    const labels = REFORGE_PRODUCT_CONTRACT.areas.map(({ label }) => label);

    expect(ids).toEqual(REFORGE_AREA_IDS);
    expect(new Set(ids).size).toBe(5);
    expect(labels).toEqual(["Học", "Ôn", "Nói", "Luyện", "Hồ sơ"]);
  });

  it("keeps the implementation contract aligned with the product vision", () => {
    const vision = readFileSync(
      new URL("../../docs/PRODUCT_VISION.md", import.meta.url),
      "utf8",
    );

    expect(vision).toContain(REFORGE_PRODUCT_CONTRACT.northStar);
    expect(vision).toContain(REFORGE_PRODUCT_CONTRACT.audience);
    expect(vision).toContain(REFORGE_PRODUCT_CONTRACT.languageScope);
    expect(vision).toContain(REFORGE_PRODUCT_CONTRACT.deliveryStatus);
    for (const area of REFORGE_PRODUCT_CONTRACT.areas) {
      expect(vision).toContain(`**${area.label}**`);
    }
  });
});
