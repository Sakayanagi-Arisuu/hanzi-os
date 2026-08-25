import { describe, expect, it } from "vitest";
import { lookupEditorialReaderSurface } from "./editorialReaderLexiconScan";

describe("editorial Reader server lexicon lookup", () => {
  it("checks exact surfaces against the shipped Tàng Tự Khố shards", async () => {
    await expect(lookupEditorialReaderSurface("朋友")).resolves.toBe(true);
    await expect(lookupEditorialReaderSurface("龘龘龘龘龘龘龘龘")).resolves.toBe(false);
  });
});
