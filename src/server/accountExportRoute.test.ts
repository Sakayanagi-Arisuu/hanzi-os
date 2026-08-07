import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import { createInitialSyncDocument } from "../sync/document";
import type { LearningState } from "../types";

const { getChatGPTUser, getD1Database, repository } = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getD1Database: vi.fn(),
  repository: {
    resolveUser: vi.fn(),
    exportAccountData: vi.fn(),
  },
}));

vi.mock("../../app/chatgpt-auth", () => ({ getChatGPTUser }));
vi.mock("./d1", () => ({
  getD1Database,
  SyncBackendUnavailableError: class extends Error {},
}));
vi.mock("./syncRepository", () => ({
  ACCOUNT_EXPORT_SCHEMA_VERSION: 7,
  SyncRepository: function SyncRepository() {
    return repository;
  },
}));

import { GET } from "../../app/api/account/export/route";

const state = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: { name: "A", goal: "conversation", dailyMinutes: 20, script: "simplified", startingLevel: "zero", onboarded: true },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: { pronunciation: 0, listening: 0, speaking: 0, reading: 0, writing: 0, vocabulary: 0, grammar: 0 },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: { completed: false, score: 0, recommendedLessonId: "boot-1", completedAt: null },
  evidence: [],
});

beforeEach(() => {
  getChatGPTUser.mockReset();
  getD1Database.mockReset();
  repository.resolveUser.mockReset();
  repository.exportAccountData.mockReset();
  getD1Database.mockResolvedValue({});
  repository.resolveUser.mockResolvedValue("user_test");
});

describe("account export route", () => {
  it("requires an authenticated account", async () => {
    getChatGPTUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(repository.exportAccountData).not.toHaveBeenCalled();
  });

  it("returns the recovery projection plus the complete sanitized cloud dump", async () => {
    getChatGPTUser.mockResolvedValue({
      displayName: "A",
      email: "learner@example.com",
      fullName: null,
    });
    const document = createInitialSyncDocument(
      state(),
      "2026-07-20T00:00:00.000Z",
      "account-export-test",
    );
    repository.exportAccountData.mockResolvedValue({
      rowCount: 6,
      tables: {
        users: [{ id: "user_test", status: "active" }],
        learning_documents: [{
          user_id: "user_test",
          revision: 3,
          schema_version: 1,
          content_version: CONTENT_VERSION,
          updated_at: Date.parse("2026-07-20T00:00:00.000Z"),
          document_json: document,
        }],
        assessment_attempts: [{
          id: "assessment-attempt",
          user_id: "user_test",
          response_json: { kind: "selection", answer: "learner-response" },
        }],
        reader_sessions: [{
          id: "reader-session",
          user_id: "user_test",
          form_manifest_json: {
            formSchemaVersion: 1,
            storyId: "reader-story",
            items: [{ position: 0, itemId: "reader-item" }],
          },
        }],
        reader_item_exposures: [{
          id: "reader-exposure",
          user_id: "user_test",
          session_id: "reader-session",
        }],
        reader_session_attempts: [{
          user_id: "user_test",
          session_id: "reader-session",
          attempt_id: "reader-attempt",
        }],
      },
    });

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("hanzi-os-account-");
    await expect(response.json()).resolves.toMatchObject({
      exportSchemaVersion: 7,
      product: "HANZI.OS",
      source: "cloud-account",
      learning: {
        revision: 3,
        contentVersion: CONTENT_VERSION,
        document,
      },
      cloudData: {
        rowCount: 6,
        tables: {
          users: [{ id: "user_test" }],
          assessment_attempts: [{
            response_json: {
              kind: "selection",
              answer: "learner-response",
            },
          }],
          reader_sessions: [{
            id: "reader-session",
            form_manifest_json: {
              formSchemaVersion: 1,
              storyId: "reader-story",
            },
          }],
          reader_item_exposures: [{
            id: "reader-exposure",
            session_id: "reader-session",
          }],
          reader_session_attempts: [{
            session_id: "reader-session",
            attempt_id: "reader-attempt",
          }],
        },
      },
    });
  });
});
