import { describe, expect, it, vi } from "vitest";
import { writeOperationalLog } from "./structuredLogger";

describe("structured operational logger", () => {
  it("emits only its fixed allow-listed envelope", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const input = {
      event: "operational_readiness_failed",
      requestId: "server-request",
      status: 503,
      retryable: true,
      failureClass: "backend-unavailable",
      email: "learner@example.com",
      answer: "secret-answer",
      transcript: "private transcript",
      objectKey: "private/audio.webm",
      error: new Error("raw-secret"),
    } as const;

    writeOperationalLog(input);

    const logged = output.mock.calls.flat().join(" ");
    expect(JSON.parse(logged)).toEqual({
      level: "error",
      event: "operational_readiness_failed",
      requestId: "server-request",
      status: 503,
      retryable: true,
      failureClass: "backend-unavailable",
    });
    expect(logged).not.toMatch(
      /learner@example|secret-answer|private transcript|audio\.webm|raw-secret/u,
    );
  });
});
