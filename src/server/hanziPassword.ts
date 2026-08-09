import {
  base64UrlToBytes,
  bytesToBase64Url,
  constantTimeEqual,
  randomBase64Url,
  toArrayBuffer,
} from "../auth/authCrypto";

const encoder = new TextEncoder();

export const HANZI_PASSWORD_ALGORITHM = "PBKDF2-SHA256" as const;
export const HANZI_PASSWORD_ITERATIONS = 600_000;
export const HANZI_PASSWORD_SALT_BYTES = 16;
export const HANZI_PASSWORD_HASH_BYTES = 32;
export const HANZI_PASSWORD_MIN_LENGTH = 12;

export type HanziPasswordDigest = {
  algorithm: typeof HANZI_PASSWORD_ALGORITHM;
  iterations: number;
  salt: string;
  hash: string;
};

export type HanziRegistrationInput = {
  username: string;
  email: string;
  password: string;
  displayName: string;
};

export type NormalizedHanziRegistration = HanziRegistrationInput & {
  username: string;
  email: string;
  displayName: string;
};

export class HanziRegistrationValidationError extends Error {
  readonly code = "HANZI_REGISTRATION_INVALID";
}

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizeHanziUsername(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeHanziEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeHanziIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("@")
    ? { kind: "email" as const, value: normalized }
    : { kind: "username" as const, value: normalized };
}

export function validateHanziRegistration(
  input: HanziRegistrationInput,
): NormalizedHanziRegistration {
  const username = normalizeHanziUsername(input.username);
  const email = normalizeHanziEmail(input.email);
  const displayName = input.displayName.trim();
  const passwordLength = [...input.password].length;
  const passwordBytes = encoder.encode(input.password).byteLength;

  if (!USERNAME_PATTERN.test(username)) {
    throw new HanziRegistrationValidationError(
      "Tên tài khoản phải có 3–32 ký tự a–z, 0–9, dấu chấm, gạch dưới hoặc gạch ngang.",
    );
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new HanziRegistrationValidationError("Địa chỉ email không hợp lệ.");
  }
  if (displayName.length < 1 || displayName.length > 80) {
    throw new HanziRegistrationValidationError("Tên hiển thị phải có 1–80 ký tự.");
  }
  if (
    passwordLength < HANZI_PASSWORD_MIN_LENGTH
    || passwordLength > 128
    || passwordBytes > 256
    || !/\p{L}/u.test(input.password)
    || !/\p{N}/u.test(input.password)
  ) {
    throw new HanziRegistrationValidationError(
      "Mật khẩu phải có 12–128 ký tự, gồm ít nhất một chữ và một số.",
    );
  }
  return { username, email, password: input.password, displayName };
}

function validWorkFactor(iterations: number) {
  return Number.isSafeInteger(iterations)
    && iterations >= 100_000
    && iterations <= 1_000_000;
}

async function derivePasswordHash(
  password: string,
  salt: string,
  iterations: number,
) {
  if (!validWorkFactor(iterations)) {
    throw new Error("Stored password work factor is invalid.");
  }
  const saltBytes = base64UrlToBytes(salt);
  if (saltBytes.byteLength !== HANZI_PASSWORD_SALT_BYTES) {
    throw new Error("Stored password salt is invalid.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(saltBytes),
      iterations,
    },
    key,
    HANZI_PASSWORD_HASH_BYTES * 8,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function hashHanziPassword(
  password: string,
  options: { salt?: string; iterations?: number } = {},
): Promise<HanziPasswordDigest> {
  const salt = options.salt ?? randomBase64Url(HANZI_PASSWORD_SALT_BYTES);
  const iterations = options.iterations ?? HANZI_PASSWORD_ITERATIONS;
  return {
    algorithm: HANZI_PASSWORD_ALGORITHM,
    iterations,
    salt,
    hash: await derivePasswordHash(password, salt, iterations),
  };
}

const DUMMY_DIGEST: HanziPasswordDigest = {
  algorithm: HANZI_PASSWORD_ALGORITHM,
  iterations: HANZI_PASSWORD_ITERATIONS,
  salt: "AAAAAAAAAAAAAAAAAAAAAA",
  hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
};

/**
 * Missing accounts deliberately take the same PBKDF2 path as real accounts,
 * and all comparisons scan the full encoded digest.
 */
export async function verifyHanziPassword(
  password: string,
  digest: HanziPasswordDigest | null,
) {
  const candidate = digest
    && digest.algorithm === HANZI_PASSWORD_ALGORITHM
    && validWorkFactor(digest.iterations)
    ? digest
    : DUMMY_DIGEST;
  let derived = DUMMY_DIGEST.hash;
  try {
    derived = await derivePasswordHash(
      password,
      candidate.salt,
      candidate.iterations,
    );
  } catch {
    // Preserve a uniform false result for corrupt credential material.
  }
  const matches = constantTimeEqual(candidate.hash, derived);
  return digest !== null
    && candidate === digest
    && matches;
}
