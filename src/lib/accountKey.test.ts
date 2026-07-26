import { describe, expect, it } from "vitest";
import { deriveAccountKey } from "./accountKey";

describe("SIWC account key", () => {
  it("is deterministic and normalizes email casing and surrounding whitespace", async () => {
    const first = await deriveAccountKey(" Learner@Example.com ");
    const second = await deriveAccountKey("learner@example.com");

    expect(first).toBe(second);
    expect(first).toMatch(/^siwc_[a-f0-9]{64}$/u);
  });

  it("does not collapse different identities", async () => {
    await expect(deriveAccountKey("first@example.com")).resolves.not.toBe(
      await deriveAccountKey("second@example.com"),
    );
  });
});
