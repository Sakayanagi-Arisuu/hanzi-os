const canonicalValue = (
  value: unknown,
  seen: WeakSet<object>,
  arrayPosition = false,
): string | undefined => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "bigint") {
    throw new TypeError("BigInt cannot be represented as canonical JSON");
  }
  if (
    typeof value === "undefined"
    || typeof value === "function"
    || typeof value === "symbol"
  ) {
    return arrayPosition ? "null" : undefined;
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());

  const objectValue = value as object;
  if (seen.has(objectValue)) {
    throw new TypeError("Cannot canonicalize cyclic data");
  }
  seen.add(objectValue);
  try {
    if (Array.isArray(value)) {
      return `[${value
        .map((item) => canonicalValue(item, seen, true) ?? "null")
        .join(",")}]`;
    }

    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .flatMap((key) => {
        const encoded = canonicalValue(record[key], seen);
        return encoded === undefined
          ? []
          : [`${JSON.stringify(key)}:${encoded}`];
      });
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(objectValue);
  }
};

/** Stable JSON for payload comparison, checksums, and idempotency diagnostics. */
export const canonicalStringify = (value: unknown): string =>
  canonicalValue(value, new WeakSet()) ?? "null";

/** SHA-256 over a raw string or the canonical JSON representation of a value. */
export const sha256Hex = async (value: unknown): Promise<string> => {
  const source = typeof value === "string" ? value : canonicalStringify(value);
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable in this runtime");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
