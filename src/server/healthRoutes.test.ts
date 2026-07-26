import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getD1Database,
  operationalDatabaseIsReady,
} = vi.hoisted(() => ({
  getD1Database: vi.fn(),
  operationalDatabaseIsReady: vi.fn(),
}));

vi.mock("./d1", () => ({
  getD1Database,
  SyncBackendUnavailableError: class extends Error {},
}));
vi.mock("./operationalHealth", () => ({
  operationalDatabaseIsReady,
}));

import {
  GET as getLive,
  HEAD as headLive,
} from "../../app/api/health/live/route";
import {
  GET as getReady,
  HEAD as headReady,
} from "../../app/api/health/ready/route";

beforeEach(() => {
  getD1Database.mockReset();
  operationalDatabaseIsReady.mockReset();
  getD1Database.mockResolvedValue({});
  operationalDatabaseIsReady.mockResolvedValue(true);
});

const expectOperationalHeaders = (response: Response) => {
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(response.headers.get("x-request-id")).toMatch(
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/u,
  );
};

describe("operational health routes", () => {
  it("serves constant liveness over GET and HEAD without touching D1", async () => {
    const getResponse = await getLive();
    const headResponse = await headLive();

    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toEqual({ status: "live" });
    expect(headResponse.status).toBe(200);
    expect(await headResponse.text()).toBe("");
    expectOperationalHeaders(getResponse);
    expectOperationalHeaders(headResponse);
    expect(getD1Database).not.toHaveBeenCalled();
  });

  it("serves only aggregate readiness over GET and HEAD", async () => {
    const getResponse = await getReady();
    const headResponse = await headReady();

    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toEqual({ status: "ready" });
    expect(headResponse.status).toBe(200);
    expect(await headResponse.text()).toBe("");
    expectOperationalHeaders(getResponse);
    expectOperationalHeaders(headResponse);
    expect(operationalDatabaseIsReady).toHaveBeenCalledTimes(2);
  });

  it("returns only unavailable and a server-generated correlation ID on failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getD1Database.mockRejectedValueOnce(
      new Error("learner@example.com secret-token"),
    );

    const response = await getReady();
    const responseText = await response.text();
    const logText = log.mock.calls.flat().join(" ");

    expect(response.status).toBe(503);
    expect(JSON.parse(responseText)).toEqual({ status: "unavailable" });
    expectOperationalHeaders(response);
    expect(responseText).not.toMatch(/learner@example|secret-token/u);
    expect(logText).not.toMatch(/learner@example|secret-token/u);
    expect(logText).toContain("operational_readiness_failed");
  });

  it("fails closed when the schema sentinel is incomplete", async () => {
    operationalDatabaseIsReady.mockResolvedValueOnce(false);

    const response = await getReady();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
  });
});
