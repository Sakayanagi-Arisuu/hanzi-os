import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ReviewRatingConsole,
  type ReviewRatingOption,
} from "./ReviewRatingConsole";

const options: ReadonlyArray<ReviewRatingOption<number>> = [
  { rating: 1, key: "1", label: "Quên", hint: "Gặp lại sớm", className: "again" },
  { rating: 2, key: "2", label: "Khó", hint: "Khoảng cách ngắn", className: "hard" },
  { rating: 3, key: "3", label: "Nhớ", hint: "Lịch chuẩn", className: "good" },
  { rating: 4, key: "4", label: "Dễ", hint: "Khoảng cách dài", className: "easy" },
];

describe("ReviewRatingConsole", () => {
  it("exposes four named rating actions in one labelled console", () => {
    const html = renderToStaticMarkup(createElement(ReviewRatingConsole, {
      heading: "Bạn nhớ tốt đến đâu?",
      headingId: "rating-heading",
      helper: "Tự đánh giá khả năng gọi lại.",
      onGrade: () => undefined,
      options,
    }));

    expect(html).toContain('data-review-action="rating"');
    expect(html).toContain('aria-labelledby="rating-heading"');
    for (const option of options) {
      expect(html).toContain(`${option.label}. ${option.hint}`);
    }
  });

  it("disables every rating while a grade is being stored", () => {
    const html = renderToStaticMarkup(createElement(ReviewRatingConsole, {
      busy: true,
      heading: "Bạn nhớ tốt đến đâu?",
      headingId: "rating-heading",
      helper: "Tự đánh giá khả năng gọi lại.",
      onGrade: () => undefined,
      options,
    }));

    expect(html.match(/ disabled=""/gu)).toHaveLength(options.length);
  });
});
