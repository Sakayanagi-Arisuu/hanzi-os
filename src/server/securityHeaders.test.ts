import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "./securityHeaders";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const parseGlobalStaticHeaders = () => {
  const source = readFileSync(
    resolve(repositoryRoot, "public", "_headers"),
    "utf8",
  );
  const lines = source.split(/\r?\n/u);
  expect(lines[0]).toBe("/*");
  const headers = new Map<string, string>();
  for (const line of lines.slice(1)) {
    if (line.trim() === "") break;
    const match = /^\s{2}([^:]+):\s*(.+)$/u.exec(line);
    if (!match) throw new Error(`Invalid global _headers line: ${line}`);
    headers.set(match[1]!.toLowerCase(), match[2]!);
  }
  return headers;
};

describe("security header policy", () => {
  it("keeps the static hosting policy byte-equivalent to the worker policy", () => {
    const staticHeaders = parseGlobalStaticHeaders();

    expect(Object.fromEntries(staticHeaders)).toEqual(SECURITY_HEADERS);
  });

  it("retains the critical browser isolation directives", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src-attr 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
    expect(SECURITY_HEADERS["strict-transport-security"])
      .toBe("max-age=31536000");
    expect(SECURITY_HEADERS["permissions-policy"]).toContain("payment=()");
  });
});
