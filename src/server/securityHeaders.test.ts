import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  securityHeadersForPath,
  emailActionRenderingRequest,
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
  it.each(['GET', 'HEAD'])('keeps email action credentials out of the %s renderer URL and hydration headers', method => {
    const input = new Request('https://hanzi.test/auth/hanzi/action?mode=verifyEmail&oobCode=FixtureSensitive_Code#private', {method,
      headers:{cookie:'first-party-fixture',accept:'text/html',referer:'https://hanzi.test/?oobCode=FixtureSensitive_Code','next-url':'/auth/hanzi/action?oobCode=FixtureSensitive_Code','next-router-state-tree':'FixtureSensitive_Code'} });
    const rendering = emailActionRenderingRequest(input);
    expect(rendering.url).toBe('https://hanzi.test/auth/hanzi/action');
    expect(JSON.stringify([...rendering.headers])).not.toContain('FixtureSensitive_Code');
    expect(rendering.headers.get('cookie')).toBe('first-party-fixture');
    expect(input.url).toContain('FixtureSensitive_Code');
  });
  it('does not rewrite provider callbacks, email API bodies or other routes', async () => {
    for (const path of ['/auth/google/callback?code=fixture','/signin?returnTo=profile']) {
      const input = new Request(`https://hanzi.test${path}`);
      expect(emailActionRenderingRequest(input)).toBe(input);
    }
    const api = new Request('https://hanzi.test/api/auth/hanzi/email-verification/complete',{method:'POST',body:'{"oobCode":"Fixture"}'});
    expect(emailActionRenderingRequest(api)).toBe(api);
    expect(await api.text()).toContain('Fixture');
  });
  it('never caches an action page or forwards a single-use URL through its referrer', () => {
    expect(securityHeadersForPath('/auth/hanzi/action')).toMatchObject({ 'referrer-policy': 'no-referrer', 'cache-control': 'private, no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow' });
    expect(securityHeadersForPath('/auth/hanzi/action/')).toEqual(securityHeadersForPath('/auth/hanzi/action'));
    expect(securityHeadersForPath('/signin')).toEqual(SECURITY_HEADERS);
  });
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
