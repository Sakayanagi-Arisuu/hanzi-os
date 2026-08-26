import { describe, expect, it } from "vitest";
import { clientClosedAlphaAvailable } from "./clientContentAvailability";

describe("client content availability", () => {
  it("opens an unpromoted package only in a local development preview", () => {
    expect(clientClosedAlphaAvailable({
      checkedInEligible: false,
      development: true,
    })).toBe(true);
    expect(clientClosedAlphaAvailable({
      checkedInEligible: false,
      development: false,
    })).toBe(false);
  });

  it("keeps explicitly promoted content available in every build", () => {
    expect(clientClosedAlphaAvailable({
      checkedInEligible: true,
      development: false,
    })).toBe(true);
  });
});
