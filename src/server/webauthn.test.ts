import { describe, expect, it } from "vitest";
import {
  passkeyCreationOptions,
  passkeyRequestOptions,
} from "./webauthn";

describe("passkey ceremony options", () => {
  it("requires discoverable credentials and local user verification", () => {
    const options = passkeyCreationOptions({
      challenge: "challenge",
      rpId: "hanzi.example",
      rpName: "HANZI.OS",
      userId: "user-id",
      userName: "learner@example.com",
      displayName: "Học viên",
      excludeCredentialIds: ["existing"],
    });
    expect(options.attestation).toBe("none");
    expect(options.authenticatorSelection).toMatchObject({
      residentKey: "required",
      userVerification: "required",
    });
    expect(options.excludeCredentials).toEqual([{ type: "public-key", id: "existing" }]);
  });

  it("requires verification for sign-in assertions", () => {
    expect(passkeyRequestOptions({
      challenge: "challenge",
      rpId: "hanzi.example",
    })).toMatchObject({
      challenge: "challenge",
      rpId: "hanzi.example",
      userVerification: "required",
    });
  });
});
