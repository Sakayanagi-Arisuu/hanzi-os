import { describe, expect, it } from "vitest";
import { POST as requestEmailCode } from "../../app/api/auth/email/request/route";

describe("authentication HTTP boundary", () => {
  it("rejects cross-origin email mutations before reading runtime bindings", async () => {
    const response = await requestEmailCode(new Request(
      "https://hanzi.example/api/auth/email/request",
      {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "learner@example.com" }),
      },
    ));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CROSS_ORIGIN_BLOCKED" },
    });
  });
});
