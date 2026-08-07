import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class ContentStudioConcurrencyError extends Error { readonly code = "CONTENT_REVISION_CONFLICT"; }
  class ContentStudioIdempotencyError extends Error { readonly code = "CONTENT_IDEMPOTENCY_CONFLICT"; }
  class ContentStudioNotFoundError extends Error { readonly code = "CONTENT_REVISION_NOT_FOUND"; }
  class ContentStudioTransitionError extends Error { readonly code = "CONTENT_TRANSITION_REJECTED"; }
  return {
    authorizeAdmin: vi.fn(),
    createDraft: vi.fn(),
    validateRevision: vi.fn(),
    transition: vi.fn(),
    publishedRuntime: vi.fn(),
    ContentStudioConcurrencyError,
    ContentStudioIdempotencyError,
    ContentStudioNotFoundError,
    ContentStudioTransitionError,
  };
});

vi.mock("./adminHttp", () => ({
  authorizeAdmin: mocks.authorizeAdmin,
}));
vi.mock("./d1", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./d1")>();
  return { ...actual, getD1Database: vi.fn().mockResolvedValue({}) };
});
vi.mock("./contentStudioRepository", () => ({
  ContentStudioConcurrencyError: mocks.ContentStudioConcurrencyError,
  ContentStudioIdempotencyError: mocks.ContentStudioIdempotencyError,
  ContentStudioNotFoundError: mocks.ContentStudioNotFoundError,
  ContentStudioTransitionError: mocks.ContentStudioTransitionError,
  ContentStudioRepository: function ContentStudioRepository() {
    return {
      createDraft: mocks.createDraft,
      validateRevision: mocks.validateRevision,
      transition: mocks.transition,
      publishedRuntime: mocks.publishedRuntime,
    };
  },
}));

import { POST as createItem } from "../../app/api/studio/items/route";
import { POST as validateRevision } from "../../app/api/studio/revisions/[revisionId]/validate/route";
import { POST as transitionRevision } from "../../app/api/studio/revisions/[revisionId]/transition/route";
import { GET as readRuntime } from "../../app/api/content/runtime/route";

const context = {
  database: {},
  identity: { userId: "editor" },
  account: { userId: "editor", authorization: { roles: ["learner", "content_editor"], permissions: [] } },
  sessionId: "editor-session",
};

const jsonRequest = (url: string, body: unknown) => new Request(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://hanzi.test",
    "idempotency-key": `route:${crypto.randomUUID()}`,
  },
  body: JSON.stringify(body),
});

beforeEach(() => {
  mocks.authorizeAdmin.mockReset();
  mocks.authorizeAdmin.mockResolvedValue({ ok: true, context });
  mocks.createDraft.mockReset();
  mocks.createDraft.mockResolvedValue({ id: "revision-1", workflowState: "draft" });
  mocks.validateRevision.mockReset();
  mocks.validateRevision.mockResolvedValue({ id: "revision-1", workflowState: "validated" });
  mocks.transition.mockReset();
  mocks.transition.mockImplementation(async (input) => ({ id: "revision-1", workflowState: input.toState }));
  mocks.publishedRuntime.mockReset();
  mocks.publishedRuntime.mockResolvedValue({
    schemaVersion: 1,
    policy: "published-only",
    manifestSha256: `sha256:${"a".repeat(64)}`,
    items: [],
  });
});

describe("Content Studio permission boundaries", () => {
  it("uses draft permission for create and blocks cross-origin before authorization", async () => {
    const response = await createItem(jsonRequest(
      "https://hanzi.test/api/studio/items",
      {
        itemType: "lesson",
        stableKey: "hsk1.lesson.route-01",
        title: "Route fixture",
        level: "hsk1",
        content: { fixture: true },
      },
    ));
    expect(response.status).toBe(201);
    expect(mocks.authorizeAdmin).toHaveBeenCalledWith("content:drafts:write");

    const blocked = await createItem(new Request(
      "https://hanzi.test/api/studio/items",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.test" },
        body: JSON.stringify({}),
      },
    ));
    expect(blocked.status).toBe(403);
  });

  it("keeps validation, submission, approval and publication as distinct server permissions", async () => {
    const params = { params: Promise.resolve({ revisionId: "revision-1" }) };
    expect((await validateRevision(jsonRequest(
      "https://hanzi.test/api/studio/revisions/revision-1/validate",
      { expectedRowVersion: 1 },
    ), params)).status).toBe(200);
    expect(mocks.authorizeAdmin).toHaveBeenLastCalledWith("content:validation:run");

    for (const [toState, permission] of [
      ["submitted", "content:submit"],
      ["approved", "content:approve"],
      ["published", "content:publish"],
      ["archived", "content:publish"],
    ] as const) {
      const response = await transitionRevision(jsonRequest(
        "https://hanzi.test/api/studio/revisions/revision-1/transition",
        { expectedRowVersion: 2, toState },
      ), params);
      expect(response.status).toBe(200);
      expect(mocks.authorizeAdmin).toHaveBeenLastCalledWith(permission);
    }
  });

  it("exposes the learner projection without opening the authoring workspace", async () => {
    const response = await readRuntime(new Request("https://hanzi.test/api/content/runtime"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ policy: "published-only", items: [] });
    expect(mocks.authorizeAdmin).not.toHaveBeenCalled();
    expect(mocks.publishedRuntime).toHaveBeenCalledOnce();
  });
});
