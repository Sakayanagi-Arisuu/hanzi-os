const ACCOUNT_KEY_NAMESPACE = "hanzi-os:siwc:v1:";

export async function deriveAccountKey(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const input = new TextEncoder().encode(
    `${ACCOUNT_KEY_NAMESPACE}${normalizedEmail}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", input);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `siwc_${hex}`;
}
