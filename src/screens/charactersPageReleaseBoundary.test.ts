import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharactersPage } from "./CharactersPage";

const source = readFileSync(
  new URL("./CharactersPage.tsx", import.meta.url),
  "utf8",
);

describe("character page release boundary", () => {
  it("does not promote vocabulary or mutable stroke files into released character content", () => {
    expect(source).not.toContain("RELEASED_VOCABULARY");
    expect(source).not.toContain("HanziCanvas");
    expect(source).not.toContain("characterNotes");
    expect(source).toContain("Chưa có dữ liệu Hán tự đã phát hành");
  });

  it("renders only the fail-closed state without practice controls", () => {
    const html = renderToStaticMarkup(createElement(CharactersPage));

    expect(html).toContain("Chưa có dữ liệu Hán tự đã phát hành");
    expect(html).toContain("sau khi vượt cổng biên tập");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<canvas");
  });
});
