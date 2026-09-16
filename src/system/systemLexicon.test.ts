import { describe, expect, it } from "vitest";
import { resolveSystemPageName } from "./systemLexicon";

describe("guild screen identity", () => {
  it.each([
    ["", "01"], ["?view=search", "01"], ["?view=detail&word=test", "02"],
    ["?view=lesson&lesson=boot-1", "03"], ["?lesson=boot-1", "03"], ["?view=saved", "04"],
  ])("labels dictionary %s as LEX-%s", (search, code) => {
    expect(resolveSystemPageName("/dictionary", search).code).toBe(`LEX-${code}`);
  });
  it.each([
    ["/characters", "", "01"], ["/characters", "?view=picker", "02"],
    ...["structure", "prediction", "guided", "recall", "context", "result"].map((phase, index) =>
      ["/characters/session", `?phase=${phase}`, `0${index + 3}`]),
  ])("labels %s %s as GLYPH-%s", (path, search, code) => {
    expect(resolveSystemPageName(path!, search!).code).toBe(`GLYPH-${code}`);
  });
  it("keeps other modules unchanged", () => {
    expect(resolveSystemPageName("/review", "?phase=result").code).toBe("MEM-03");
  });
});
