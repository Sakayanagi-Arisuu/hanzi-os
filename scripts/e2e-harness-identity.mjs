export const E2E_READY_MESSAGE_TYPE = "hanzi-e2e-ready";

export function parseOwnedHarnessReadyMessage(value, expectedNonce) {
  if (
    !value
    || typeof value !== "object"
    || value.type !== E2E_READY_MESSAGE_TYPE
    || value.nonce !== expectedNonce
    || typeof value.port !== "number"
    || !Number.isSafeInteger(value.port)
    || value.port < 1
    || value.port > 65_535
  ) return null;
  return { port: value.port, nonce: value.nonce };
}
