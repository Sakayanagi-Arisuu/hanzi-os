import { describe, expect, it, vi } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  activateCurrentEnrollment,
  CURRENT_ENROLLMENT_ENDPOINT,
} from "./currentEnrollmentClient";

const NOW = new Date("2026-07-22T06:00:00.000Z");

const receipt = () => ({
  protocolVersion: 1 as const,
  enrollmentId: "enrollment-a",
  courseId: "hanzi-os-core" as const,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  releaseState: "beta" as const,
  goal: "conversation" as const,
});

const input = (fetchImplementation: typeof fetch) => ({
  fetch: fetchImplementation,
  origin: "https://hanzi.example",
  now: () => new Date(NOW),
});

const jsonResponse = (value: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(value, { status, headers });

describe("current enrollment client", () => {
  it("posts the exact command to the fixed same-origin endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, _init) =>
      jsonResponse(receipt())
    );
    await expect(activateCurrentEnrollment(input(fetchMock)))
      .resolves.toEqual({ state: "activated", receipt: receipt() });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(CURRENT_ENROLLMENT_ENDPOINT);
    expect(options).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ protocolVersion: 1 }),
    });
  });

  it("passes a caller lifecycle signal without exposing endpoint control", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>(async (_input, _init) =>
      jsonResponse(receipt())
    );
    await activateCurrentEnrollment({
      ...input(fetchMock),
      origin: "https://hanzi.example/ignored/path?target=https://attacker.test",
      signal: controller.signal,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(CURRENT_ENROLLMENT_ENDPOINT);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("rejects a missing browser origin before transport", async () => {
    const fetchMock = vi.fn();
    await expect(activateCurrentEnrollment({ fetch: fetchMock }))
      .rejects.toThrow("Current origin is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a wrong package or injected receipt field as retryable corruption", async () => {
    const wrongManifest = CURRENT_CONTENT_MANIFEST_SHA256.endsWith("0")
      ? `${CURRENT_CONTENT_MANIFEST_SHA256.slice(0, -1)}1`
      : `${CURRENT_CONTENT_MANIFEST_SHA256.slice(0, -1)}0`;
    for (const value of [
      { ...receipt(), contentVersion: "older-package" },
      { ...receipt(), manifestSha256: wrongManifest },
      { ...receipt(), courseId: "attacker-course" },
      { ...receipt(), releaseState: "review" },
      { ...receipt(), unlocked: true },
    ]) {
      const result = await activateCurrentEnrollment(input(
        vi.fn(async () => jsonResponse(value)),
      ));
      expect(result).toEqual({
        state: "retryable",
        status: 200,
        reason: "invalid-response",
        retryAfterMs: 0,
      });
    }
  });

  it("classifies authentication, content, profile, and other client rejection", async () => {
    const cases = [
      [401, {}, "authentication-required"],
      [409, { error: { code: "CURRENT_ENROLLMENT_CONTENT_UNAVAILABLE" } }, "content-unavailable"],
      [409, { error: { code: "CURRENT_ENROLLMENT_PROFILE_UNAVAILABLE" } }, "profile-unavailable"],
      [409, { error: { code: "OTHER_CONFLICT" } }, "request-rejected"],
      [422, {}, "request-rejected"],
    ] as const;
    for (const [status, body, reason] of cases) {
      await expect(activateCurrentEnrollment(input(
        vi.fn(async () => jsonResponse(body, status)),
      ))).resolves.toEqual({
        state: "permanent-unavailable",
        status,
        reason,
      });
    }
  });

  it("honors Retry-After and treats server or network failures as retryable", async () => {
    await expect(activateCurrentEnrollment(input(
      vi.fn(async () => jsonResponse({}, 429, { "Retry-After": "17" })),
    ))).resolves.toEqual({
      state: "retryable",
      status: 429,
      reason: "rate-limited",
      retryAfterMs: 17_000,
    });
    await expect(activateCurrentEnrollment(input(
      vi.fn(async () => jsonResponse({}, 503)),
    ))).resolves.toEqual({
      state: "retryable",
      status: 503,
      reason: "server-unavailable",
      retryAfterMs: 0,
    });
    await expect(activateCurrentEnrollment(input(
      vi.fn(async () => { throw new Error("offline"); }),
    ))).resolves.toEqual({
      state: "retryable",
      status: null,
      reason: "network-unavailable",
      retryAfterMs: 0,
    });
  });
});
