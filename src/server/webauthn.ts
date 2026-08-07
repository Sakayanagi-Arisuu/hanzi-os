import {
  base64UrlToBytes,
  bytesToBase64Url,
  constantTimeEqual,
  sha256Base64Url,
  toArrayBuffer,
} from "../auth/authCrypto";

type CborValue =
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | CborValue[]
  | Map<CborValue, CborValue>;

type CborResult = { value: CborValue; nextOffset: number };

export type PasskeyRegistrationResponse = {
  id: string;
  rawId?: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
};

export type PasskeyAuthenticationResponse = {
  id: string;
  rawId?: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string | null;
  };
};

const decoder = new TextDecoder();

function readLength(
  bytes: Uint8Array,
  offset: number,
  additional: number,
): { length: number; nextOffset: number } {
  if (additional < 24) return { length: additional, nextOffset: offset };
  if (additional === 24) return { length: bytes[offset] ?? 0, nextOffset: offset + 1 };
  if (additional === 25) {
    return {
      length: ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0),
      nextOffset: offset + 2,
    };
  }
  if (additional === 26) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    return { length: view.getUint32(0), nextOffset: offset + 4 };
  }
  throw new Error("Unsupported CBOR length.");
}

function decodeCbor(bytes: Uint8Array, offset = 0): CborResult {
  const head = bytes[offset];
  if (head === undefined) throw new Error("Truncated CBOR payload.");
  const major = head >> 5;
  const additional = head & 0x1f;
  const sized = readLength(bytes, offset + 1, additional);
  const length = sized.length;
  let cursor = sized.nextOffset;

  if (major === 0) return { value: length, nextOffset: cursor };
  if (major === 1) return { value: -1 - length, nextOffset: cursor };
  if (major === 2 || major === 3) {
    const end = cursor + length;
    if (end > bytes.length) throw new Error("Truncated CBOR byte string.");
    const slice = bytes.slice(cursor, end);
    return {
      value: major === 2 ? slice : decoder.decode(slice),
      nextOffset: end,
    };
  }
  if (major === 4) {
    const items: CborValue[] = [];
    for (let index = 0; index < length; index += 1) {
      const item = decodeCbor(bytes, cursor);
      items.push(item.value);
      cursor = item.nextOffset;
    }
    return { value: items, nextOffset: cursor };
  }
  if (major === 5) {
    const map = new Map<CborValue, CborValue>();
    for (let index = 0; index < length; index += 1) {
      const key = decodeCbor(bytes, cursor);
      const value = decodeCbor(bytes, key.nextOffset);
      map.set(key.value, value.value);
      cursor = value.nextOffset;
    }
    return { value: map, nextOffset: cursor };
  }
  if (major === 7 && additional === 20) return { value: false, nextOffset: cursor };
  if (major === 7 && additional === 21) return { value: true, nextOffset: cursor };
  if (major === 7 && additional === 22) return { value: null, nextOffset: cursor };
  throw new Error("Unsupported CBOR value.");
}

function assertMap(value: CborValue, message: string): Map<CborValue, CborValue> {
  if (!(value instanceof Map)) throw new Error(message);
  return value;
}

function assertBytes(value: CborValue | undefined, message: string): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error(message);
  return value;
}

function assertString(value: CborValue | undefined, message: string): string {
  if (typeof value !== "string") throw new Error(message);
  return value;
}

async function validateClientData(input: {
  encoded: string;
  expectedType: "webauthn.create" | "webauthn.get";
  expectedChallenge: string;
  expectedOrigin: string;
}): Promise<Uint8Array> {
  const bytes = base64UrlToBytes(input.encoded);
  const parsed: unknown = JSON.parse(decoder.decode(bytes));
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Passkey client data is invalid.");
  }
  const data = parsed as {
    type?: unknown;
    challenge?: unknown;
    origin?: unknown;
    crossOrigin?: unknown;
  };
  if (
    data.type !== input.expectedType
    || data.challenge !== input.expectedChallenge
    || data.origin !== input.expectedOrigin
    || data.crossOrigin === true
  ) {
    throw new Error("Passkey ceremony origin or challenge did not match.");
  }
  return bytes;
}

async function validateAuthenticatorData(
  authenticatorData: Uint8Array,
  rpId: string,
  requireAttestedCredential: boolean,
) {
  if (authenticatorData.length < 37) {
    throw new Error("Passkey authenticator data is truncated.");
  }
  const expectedRpIdHash = await sha256Base64Url(rpId);
  const actualRpIdHash = bytesToBase64Url(authenticatorData.slice(0, 32));
  if (!constantTimeEqual(expectedRpIdHash, actualRpIdHash)) {
    throw new Error("Passkey RP ID did not match.");
  }
  const flags = authenticatorData[32] ?? 0;
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0) {
    throw new Error("Passkey requires user presence and verification.");
  }
  if (requireAttestedCredential && (flags & 0x40) === 0) {
    throw new Error("Passkey registration omitted credential data.");
  }
  const view = new DataView(
    authenticatorData.buffer,
    authenticatorData.byteOffset + 33,
    4,
  );
  return {
    flags,
    signCount: view.getUint32(0),
    backupEligible: (flags & 0x08) !== 0,
    backupState: (flags & 0x10) !== 0,
  };
}

function coseToJwk(cose: Map<CborValue, CborValue>): {
  publicKeyJwk: JsonWebKey;
  algorithm: -7 | -257;
} {
  const keyType = cose.get(1);
  const algorithm = cose.get(3);
  if (keyType === 2 && algorithm === -7 && cose.get(-1) === 1) {
    const x = assertBytes(cose.get(-2), "Passkey EC public key is incomplete.");
    const y = assertBytes(cose.get(-3), "Passkey EC public key is incomplete.");
    return {
      publicKeyJwk: {
        kty: "EC",
        crv: "P-256",
        x: bytesToBase64Url(x),
        y: bytesToBase64Url(y),
        ext: true,
      },
      algorithm: -7,
    };
  }
  if (keyType === 3 && algorithm === -257) {
    const modulus = assertBytes(cose.get(-1), "Passkey RSA public key is incomplete.");
    const exponent = assertBytes(cose.get(-2), "Passkey RSA public key is incomplete.");
    return {
      publicKeyJwk: {
        kty: "RSA",
        n: bytesToBase64Url(modulus),
        e: bytesToBase64Url(exponent),
        ext: true,
      },
      algorithm: -257,
    };
  }
  throw new Error("Passkey algorithm is not supported.");
}

export async function verifyPasskeyRegistration(input: {
  credential: PasskeyRegistrationResponse;
  expectedChallenge: string;
  expectedOrigin: string;
  rpId: string;
}) {
  if (
    input.credential.type !== "public-key"
    || (input.credential.rawId && input.credential.rawId !== input.credential.id)
  ) {
    throw new Error("Passkey credential type is invalid.");
  }
  await validateClientData({
    encoded: input.credential.response.clientDataJSON,
    expectedType: "webauthn.create",
    expectedChallenge: input.expectedChallenge,
    expectedOrigin: input.expectedOrigin,
  });
  const attestation = assertMap(
    decodeCbor(base64UrlToBytes(input.credential.response.attestationObject)).value,
    "Passkey attestation is invalid.",
  );
  // Requesting attestation:none avoids collecting authenticator provenance.
  // Other formats require their own certificate/self-attestation validation.
  if (assertString(attestation.get("fmt"), "Passkey format is missing.") !== "none") {
    throw new Error("Only privacy-preserving passkey attestation is accepted.");
  }
  if (assertMap(
    attestation.get("attStmt") ?? null,
    "Passkey attestation statement is invalid.",
  ).size !== 0) {
    throw new Error("Passkey none attestation must not include a statement.");
  }
  const authData = assertBytes(
    attestation.get("authData"),
    "Passkey authenticator data is missing.",
  );
  const metadata = await validateAuthenticatorData(authData, input.rpId, true);
  let cursor = 37 + 16;
  if (authData.length < cursor + 2) throw new Error("Passkey credential data is truncated.");
  const credentialLength = ((authData[cursor] ?? 0) << 8) | (authData[cursor + 1] ?? 0);
  cursor += 2;
  if (credentialLength < 1 || credentialLength > 1_023 || authData.length < cursor + credentialLength) {
    throw new Error("Passkey credential ID is invalid.");
  }
  const credentialId = bytesToBase64Url(authData.slice(cursor, cursor + credentialLength));
  if (credentialId !== input.credential.id) {
    throw new Error("Passkey credential ID did not match attestation data.");
  }
  cursor += credentialLength;
  const cose = assertMap(
    decodeCbor(authData, cursor).value,
    "Passkey public key is invalid.",
  );
  return {
    credentialId,
    ...coseToJwk(cose),
    signCount: metadata.signCount,
    transports: (input.credential.response.transports ?? [])
      .filter((value): value is string => typeof value === "string")
      .slice(0, 8),
    backupEligible: metadata.backupEligible,
    backupState: metadata.backupState,
  };
}

function derEcdsaToRaw(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  if (signature[0] !== 0x30) throw new Error("Passkey ECDSA signature is invalid.");
  let cursor = 2;
  if ((signature[1] ?? 0) > 0x80) cursor += (signature[1] ?? 0) & 0x7f;
  if (signature[cursor] !== 0x02) throw new Error("Passkey ECDSA signature is invalid.");
  const rLength = signature[cursor + 1] ?? 0;
  const r = signature.slice(cursor + 2, cursor + 2 + rLength);
  cursor += 2 + rLength;
  if (signature[cursor] !== 0x02) throw new Error("Passkey ECDSA signature is invalid.");
  const sLength = signature[cursor + 1] ?? 0;
  const s = signature.slice(cursor + 2, cursor + 2 + sLength);
  const raw = new Uint8Array(64);
  raw.set(r.slice(Math.max(0, r.length - 32)), Math.max(0, 32 - r.length));
  raw.set(s.slice(Math.max(0, s.length - 32)), 32 + Math.max(0, 32 - s.length));
  return raw;
}

export async function verifyPasskeyAuthentication(input: {
  credential: PasskeyAuthenticationResponse;
  expectedChallenge: string;
  expectedOrigin: string;
  rpId: string;
  expectedUserId?: string | null;
  publicKeyJwk: JsonWebKey;
  algorithm: -7 | -257;
}) {
  if (
    input.credential.type !== "public-key"
    || (input.credential.rawId && input.credential.rawId !== input.credential.id)
  ) {
    throw new Error("Passkey credential type is invalid.");
  }
  const clientData = await validateClientData({
    encoded: input.credential.response.clientDataJSON,
    expectedType: "webauthn.get",
    expectedChallenge: input.expectedChallenge,
    expectedOrigin: input.expectedOrigin,
  });
  if (input.expectedUserId && input.credential.response.userHandle) {
    const userHandle = decoder.decode(
      base64UrlToBytes(input.credential.response.userHandle),
    );
    if (userHandle !== input.expectedUserId) {
      throw new Error("Passkey user handle did not match.");
    }
  }
  const authenticatorData = base64UrlToBytes(
    input.credential.response.authenticatorData,
  );
  const metadata = await validateAuthenticatorData(
    authenticatorData,
    input.rpId,
    false,
  );
  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", toArrayBuffer(clientData)),
  );
  const signed = new Uint8Array(authenticatorData.length + clientDataHash.length);
  signed.set(authenticatorData);
  signed.set(clientDataHash, authenticatorData.length);
  const signature = base64UrlToBytes(input.credential.response.signature);
  const key = await crypto.subtle.importKey(
    "jwk",
    input.publicKeyJwk,
    input.algorithm === -7
      ? { name: "ECDSA", namedCurve: "P-256" }
      : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    input.algorithm === -7
      ? { name: "ECDSA", hash: "SHA-256" }
      : { name: "RSASSA-PKCS1-v1_5" },
    key,
    toArrayBuffer(input.algorithm === -7 ? derEcdsaToRaw(signature) : signature),
    toArrayBuffer(signed),
  );
  if (!verified) throw new Error("Passkey signature is invalid.");
  return { signCount: metadata.signCount };
}

export function passkeyCreationOptions(input: {
  challenge: string;
  rpId: string;
  rpName: string;
  userId: string;
  userName: string;
  displayName: string;
  excludeCredentialIds: string[];
}) {
  return {
    challenge: input.challenge,
    rp: { id: input.rpId, name: input.rpName },
    user: {
      id: bytesToBase64Url(new TextEncoder().encode(input.userId)),
      name: input.userName,
      displayName: input.displayName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 300_000,
    attestation: "none",
    authenticatorSelection: {
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required",
    },
    excludeCredentials: input.excludeCredentialIds.map((id) => ({
      type: "public-key",
      id,
    })),
  };
}

export function passkeyRequestOptions(input: {
  challenge: string;
  rpId: string;
  allowCredentials?: Array<{ id: string; transports: string[] }>;
}) {
  return {
    challenge: input.challenge,
    rpId: input.rpId,
    timeout: 300_000,
    userVerification: "required",
    allowCredentials: (input.allowCredentials ?? []).map((credential) => ({
      type: "public-key",
      id: credential.id,
      transports: credential.transports,
    })),
  };
}
