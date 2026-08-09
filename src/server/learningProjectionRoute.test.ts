import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  emptyObjectiveEvidenceProjection,
  LEARNING_PROJECTION_V2_MEDIA_TYPE,
  LEARNING_PROJECTION_V3_MEDIA_TYPE,
  LEARNING_PROJECTION_V4_MEDIA_TYPE,
  LEARNING_PROJECTION_VERSION_HEADER,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
  type NormalizedLearningProjectionV4,
} from "../learning/projectionProtocol";
import {
  LearningProjectionContentUnavailableError,
  LearningProjectionIntegrityError,
  LearningProjectionResetRaceError,
} from "./learningProjectionRepository";

const {
  getChatGPTUser,
  getD1Database,
  syncRepository,
  learningProjectionRepository,
} = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  syncRepository: { resolveUser: vi.fn() },
  learningProjectionRepository: {
    read: vi.fn(),
    readV2: vi.fn(),
    readV3: vi.fn(),
    readV4: vi.fn(),
  },
}));

vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser }));
vi.mock("./d1", () => ({
  getD1Database,
  SyncBackendUnavailableError: class extends Error {
    readonly code = "SYNC_BACKEND_UNAVAILABLE";
  },
}));
vi.mock("./syncRepository", () => ({
  SyncRepository: function SyncRepository() {
    return syncRepository;
  },
}));
vi.mock("./learningProjectionRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./learningProjectionRepository")>();
  return {
    ...actual,
    LearningProjectionRepository: function LearningProjectionRepository() {
      return learningProjectionRepository;
    },
  };
});

import { GET } from "../../app/api/learning/projection/route";

const projection: NormalizedLearningProjectionV1 = {
  protocolVersion: 1,
  resetEpoch: 2,
  cursor: 42,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: {
    enrollmentId: "enrollment-a",
    contentVersion: CONTENT_VERSION,
    courseId: "hanzi-os-core",
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [],
  submittedLessons: [],
  objectiveEvidence: emptyObjectiveEvidenceProjection(),
};

const projectionV2: NormalizedLearningProjectionV2 = {
  ...projection,
  protocolVersion: 2,
  activeAssessmentSession: null,
  latestAssessmentResult: null,
};

const projectionV3: NormalizedLearningProjectionV3 = {
  ...projectionV2,
  protocolVersion: 3,
  activeReaderSession: null,
};

const projectionV4: NormalizedLearningProjectionV4 = {
  ...projectionV3,
  protocolVersion: 4,
  gateEligibleCorrectActivityCounts: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
};

const request = (query = "", headers: HeadersInit = {}) => new Request(
  `https://hanzi.test/api/learning/projection${query}`,
  { headers: { "x-request-id": "projection-request", ...headers } },
);

beforeEach(() => {
  getChatGPTUser.mockReset();
  getD1Database.mockReset();
  syncRepository.resolveUser.mockReset();
  learningProjectionRepository.read.mockReset();
  learningProjectionRepository.readV2.mockReset();
  learningProjectionRepository.readV3.mockReset();
  learningProjectionRepository.readV4.mockReset();
  getChatGPTUser.mockResolvedValue({
    email: "learner@example.com",
    displayName: "Learner",
  });
  getD1Database.mockResolvedValue({});
  syncRepository.resolveUser.mockResolvedValue("user-a");
  learningProjectionRepository.read.mockResolvedValue(projection);
  learningProjectionRepository.readV2.mockResolvedValue(projectionV2);
  learningProjectionRepository.readV3.mockResolvedValue(projectionV3);
  learningProjectionRepository.readV4.mockResolvedValue(projectionV4);
});

describe("GET /api/learning/projection", () => {
  it("returns a tenant-resolved no-store projection and cursor headers", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("etag")).toBe('"hanzi-learning-v1-2-42"');
    expect(response.headers.get(LEARNING_PROJECTION_VERSION_HEADER)).toBe("1");
    expect(response.headers.get("x-learning-projection-cursor")).toBe("42");
    expect(response.headers.get("x-learning-reset-epoch")).toBe("2");
    expect(await response.json()).toEqual(projection);
    expect(syncRepository.resolveUser).toHaveBeenCalledWith({
      email: "learner@example.com",
      displayName: "Learner",
    });
    expect(learningProjectionRepository.read).toHaveBeenCalledWith("user-a");
  });

  it("negotiates a strict V2 representation without changing the V1 default", async () => {
    const response = await GET(request("", {
      Accept: LEARNING_PROJECTION_V2_MEDIA_TYPE,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('"hanzi-learning-v2-2-42"');
    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get(LEARNING_PROJECTION_VERSION_HEADER)).toBe("2");
    expect(await response.json()).toEqual(projectionV2);
    expect(learningProjectionRepository.readV2).toHaveBeenCalledWith("user-a");
    expect(learningProjectionRepository.read).not.toHaveBeenCalled();
  });

  it("negotiates V3 with a version-specific ETag and prefers it over V2", async () => {
    const response = await GET(request("", {
      Accept: `${LEARNING_PROJECTION_V2_MEDIA_TYPE}, ${LEARNING_PROJECTION_V3_MEDIA_TYPE}; q=0.9`,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('"hanzi-learning-v3-2-42"');
    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get(LEARNING_PROJECTION_VERSION_HEADER)).toBe("3");
    expect(await response.json()).toEqual(projectionV3);
    expect(learningProjectionRepository.readV3).toHaveBeenCalledWith("user-a");
    expect(learningProjectionRepository.readV2).not.toHaveBeenCalled();
    expect(learningProjectionRepository.read).not.toHaveBeenCalled();
  });

  it("negotiates V4 without mutating the legacy V1-V3 representations", async () => {
    const response = await GET(request("", {
      Accept: `${LEARNING_PROJECTION_V3_MEDIA_TYPE}, ${LEARNING_PROJECTION_V4_MEDIA_TYPE}`,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('"hanzi-learning-v4-2-42"');
    expect(response.headers.get(LEARNING_PROJECTION_VERSION_HEADER)).toBe("4");
    expect(await response.json()).toEqual(projectionV4);
    expect(learningProjectionRepository.readV4).toHaveBeenCalledWith("user-a");
    expect(learningProjectionRepository.readV3).not.toHaveBeenCalled();
  });

  it("returns 304 only after reading the authoritative matching cursor", async () => {
    const response = await GET(request("?afterCursor=42"));

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-learning-reset-epoch")).toBe("2");
    expect(response.headers.get(LEARNING_PROJECTION_VERSION_HEADER)).toBe("1");
    expect(learningProjectionRepository.read).toHaveBeenCalledWith("user-a");
  });

  it("keeps V3 negotiation on a matching-cursor 304 response", async () => {
    const response = await GET(request("?afterCursor=42", {
      Accept: LEARNING_PROJECTION_V3_MEDIA_TYPE,
    }));

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"hanzi-learning-v3-2-42"');
    expect(response.headers.get(LEARNING_PROJECTION_VERSION_HEADER)).toBe("3");
    expect(learningProjectionRepository.readV3).toHaveBeenCalledWith("user-a");
  });

  it("returns an empty release projection instead of preserving a stale cache", async () => {
    learningProjectionRepository.read.mockResolvedValue({
      ...projection,
      enrollment: null,
    });

    const response = await GET(request("?afterCursor=42"));

    expect(response.status).toBe(200);
    expect((await response.json()).enrollment).toBeNull();
  });

  it("rejects malformed, duplicate, unsafe, and unknown cursor input", async () => {
    for (const query of [
      "?afterCursor=-1",
      "?afterCursor=01",
      "?afterCursor=9007199254740992",
      "?afterCursor=1&afterCursor=2",
      "?userId=user-b",
    ]) {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe(
        "INVALID_PROJECTION_CURSOR",
      );
    }
    expect(getChatGPTUser).not.toHaveBeenCalled();
  });

  it("requires authentication before resolving a tenant", async () => {
    getChatGPTUser.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("AUTH_REQUIRED");
    expect(syncRepository.resolveUser).not.toHaveBeenCalled();
    expect(learningProjectionRepository.read).not.toHaveBeenCalled();
  });

  it.each([
    [
      new LearningProjectionContentUnavailableError(),
      409,
      "LEARNING_PROJECTION_CONTENT_UNAVAILABLE",
      false,
    ],
    [
      new LearningProjectionResetRaceError(),
      503,
      "LEARNING_PROJECTION_RESET_RACE",
      true,
    ],
    [
      new LearningProjectionIntegrityError(),
      503,
      "LEARNING_PROJECTION_INTEGRITY_ERROR",
      true,
    ],
  ])("maps projection boundary failures", async (error, status, code, retryable) => {
    learningProjectionRepository.read.mockRejectedValue(error);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body.error).toMatchObject({ code, retryable });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
