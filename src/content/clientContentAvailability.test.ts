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
  it('opens an explicit offline preview only on loopback and leaves production closed', () => {
    for (const hostname of ['localhost', '127.0.0.1']) {
      expect(clientClosedAlphaAvailable({ checkedInEligible: false, development: false, localOfflinePreview: true, hostname })).toBe(true);
      expect(clientClosedAlphaAvailable({ checkedInEligible: false, development: false, hostname })).toBe(false);
    }
    for (const hostname of ['hanzi.example', '127.0.0.1.evil.example', '192.168.1.10', undefined]) {
      expect(clientClosedAlphaAvailable({ checkedInEligible: false, development: false, localOfflinePreview: true, hostname })).toBe(false);
    }
  });
});
