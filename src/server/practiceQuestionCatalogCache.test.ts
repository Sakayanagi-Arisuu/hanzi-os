import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ runtime: vi.fn(), released: vi.fn().mockResolvedValue([]) }));
vi.mock("./contentStudioRepository", () => ({ ContentStudioRepository: class { publishedRuntime = mocks.runtime; releasedRuntimeRevisions = mocks.released; } }));

import { publishedPracticeCatalog, publishedPracticeExams } from "./practiceQuestionCatalog";
import { canonicalStudioJson, studioSha256 } from "../content/studioContent";
import { createEditorialHskMockExamDefinition, hskMockExamEditorialSuggestions } from "./hskMockExamBank";
import type { D1Database } from "./d1";
it("reuses the question catalog but rebuilds immediately when released content changes", async () => {
  mocks.runtime.mockResolvedValue({ schemaVersion: 1, policy: "published-only", releaseBoundary: "content-release-worker-v1", items: [] });

  let revision = "release-a";
  const all = vi.fn(async () => ({ success: true, results: [{ id: revision, packageHash: revision, manifestHash: revision }] }));
  const database = { prepare: () => ({ all }) } as unknown as D1Database;
  const first = await publishedPracticeCatalog(database);
  expect(await publishedPracticeCatalog(database)).toBe(first);
  expect(mocks.runtime).toHaveBeenCalledTimes(2);
  revision = "release-b";
  expect(await publishedPracticeCatalog(database)).not.toBe(first);
  expect(mocks.runtime).toHaveBeenCalledTimes(4);
  expect(all).toHaveBeenCalledTimes(3);
});

it("preserves scorer IDs and skills while rejecting altered or draft pinned sources", async () => {
  const content = { skill: "reading", promptVi: "Chọn nghĩa", hanzi: "你好", options: ["Xin chào", "Tạm biệt", "Cảm ơn"],
    answerIndex: 0, explanationVi: "Lời chào", sourceLessonIds: ["boot-1"] };
  const item = { itemType: "exam_item", level: "hsk1", stableKey: "practice-source", title: "Lời chào", revision: 1,
    revisionId: "released-item", contentSha256: await studioSha256(canonicalStudioJson(content)), content };
  const form = { ...item, itemType: "exam_form", stableKey: "practice-form", revisionId: "released-form", content: {
    examLevel: "hsk1", formKey: "g", timeLimitMinutes: 40, coverage: { listening: 20, reading: 20, writing: 0 },
    itemStableKeys: hskMockExamEditorialSuggestions([item]).hsk1.g,
  } };
  mocks.runtime.mockResolvedValue({ items: [form] });
  mocks.released.mockResolvedValue([item]);
  const row = { id: item.revisionId, itemType: "exam_item", workflowState: "archived", contentSha256: item.contentSha256,
    contentJson: JSON.stringify(content) };
  const all = vi.fn(async () => ({ success: true, results: [row] }));
  const bind = vi.fn(() => ({ all }));
  const database = { prepare: () => ({ bind }) } as unknown as D1Database;
  const exams = await publishedPracticeExams(database);
  expect(exams[0]?.bank.map(({ id, skill }) => ({ id, skill })))
    .toEqual(createEditorialHskMockExamDefinition(form, [item])?.bank.map(({ id, skill }) => ({ id, skill })));
  expect(exams[0]?.bank).toHaveLength(40);
  expect(bind).toHaveBeenCalledExactlyOnceWith(item.revisionId);
  row.contentJson = JSON.stringify({ ...content, answerIndex: 1 });
  await expect(publishedPracticeExams(database)).rejects.toThrow("digest fence");
  row.contentJson = JSON.stringify(content);
  row.workflowState = "draft";
  await expect(publishedPracticeExams(database)).rejects.toThrow("digest fence");
});


