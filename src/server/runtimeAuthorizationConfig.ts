const normalizeEmailList = (value: unknown) => {
  if (typeof value !== "string") return [];
  return value
    .split(/[;,\s]+/u)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
};

export async function getBootstrapAdminEmails(): Promise<ReadonlySet<string>> {
  let configured = process.env.HANZI_OS_ADMIN_EMAILS;
  try {
    const { env } = await import("cloudflare:workers");
    const cloudflareValue = (env as { HANZI_OS_ADMIN_EMAILS?: unknown })
      .HANZI_OS_ADMIN_EMAILS;
    if (typeof cloudflareValue === "string") configured = cloudflareValue;
  } catch {
    // Local/test runtimes use process.env; the D1 binding remains fail-closed.
  }
  return new Set(normalizeEmailList(configured));
}
