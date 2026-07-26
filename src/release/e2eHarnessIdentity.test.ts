import { describe, expect, it } from "vitest";
import {
  E2E_READY_MESSAGE_TYPE,
  parseOwnedHarnessReadyMessage,
} from "../../scripts/e2e-harness-identity.mjs";

describe("production harness process ownership", () => {
  it("accepts only the child message with the exact unpredictable nonce", () => {
    const nonce = "run-specific-nonce";
    expect(parseOwnedHarnessReadyMessage({
      type: E2E_READY_MESSAGE_TYPE,
      nonce,
      port: 51_234,
    }, nonce)).toEqual({ nonce, port: 51_234 });
    expect(parseOwnedHarnessReadyMessage({
      type: E2E_READY_MESSAGE_TYPE,
      nonce: "stale-process",
      port: 4_174,
    }, nonce)).toBeNull();
    expect(parseOwnedHarnessReadyMessage({
      type: E2E_READY_MESSAGE_TYPE,
      nonce,
      port: 0,
    }, nonce)).toBeNull();
  });
});
