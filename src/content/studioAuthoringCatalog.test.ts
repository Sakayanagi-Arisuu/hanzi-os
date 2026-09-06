import { describe, expect, it } from "vitest";
import {
  STUDIO_ITEM_TYPES,
  studioBlankDraftContent,
  studioStarterContent,
  validateStudioContent,
  type StudioItemType,
} from "./studioContent";
import {
  coveredStudioItemTypes,
  STUDIO_AUTHORING_GROUPS,
  STUDIO_MODULE_AUTHORING_COVERAGE,
} from "./studioAuthoringCatalog";

const reviewed = (itemType: StudioItemType): Record<string, unknown> => ({
  ...(studioStarterContent(itemType) as Record<string, unknown>),
  ...(itemType === "graded_text" ? {
    rights: {
      sourceKind: "original-hanzi-os",
      textProvenanceVi: "Bản thảo nguyên bản do đội HANZI.OS soạn.",
      editorAttestsRights: true,
    },
  } : {}),
  review: {
    humanReviewed: false,
    aiSelfReview: {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
    },
  },
});

describe("Studio module authoring catalog", () => {
  it("gives every learner content module at least one non-technical route", () => {
    expect(STUDIO_MODULE_AUTHORING_COVERAGE.map((module) => module.id)).toEqual([
      "path",
      "review",
      "pronunciation",
      "characters",
      "reader",
      "exams",
      "dictionary",
      "analytics",
    ]);
    STUDIO_MODULE_AUTHORING_COVERAGE.forEach((module) => {
      expect(module.methods.length).toBeGreaterThan(0);
      module.methods.forEach((method) => expect(method.href).toMatch(/^\/studio/u));
    });
    expect([...coveredStudioItemTypes()].sort()).toEqual([...STUDIO_ITEM_TYPES].sort());
  });

  it("shows every authoring method exactly once on the non-technical home screen", () => {
    const methods = STUDIO_AUTHORING_GROUPS.flatMap((group) => group.methods);
    expect(methods.map((entry) => entry.itemType).sort()).toEqual([
      ...STUDIO_ITEM_TYPES,
      "reader_series",
    ].sort());
    expect(new Set(methods.map((entry) => entry.itemType)).size).toBe(methods.length);
    methods.forEach((entry) => {
      expect(entry.label).not.toMatch(/JSON|revision|runtime|projection/iu);
      expect(entry.href).toMatch(/^\/studio(?:\?create=|\/library)/u);
    });
  });

  it.each([
    "pronunciation",
    "communicative_function",
    "graded_text",
    "lesson",
  ] as const)("validates a guided %s starter after editorial self-review", async (itemType) => {
    await expect(validateStudioContent(itemType, reviewed(itemType))).resolves.toMatchObject({
      result: { valid: true, itemType },
    });
  });

  it("keeps a real lesson draft incomplete instead of presenting demo copy as authored content", async () => {
    const draft = studioBlankDraftContent("lesson", "hsk1");

    expect(draft).toMatchObject({
      targetLessonId: expect.any(String),
      titleZh: expect.any(String),
      objectiveVi: expect.any(String),
      conceptVi: "",
      ruleVi: "",
      dialogue: [],
      grammar: [],
      exercises: [],
    });
    expect(JSON.stringify(draft)).not.toContain("A 是 B");
    expect(JSON.stringify(draft)).not.toContain("你好，我是安");
    await expect(validateStudioContent("lesson", draft)).resolves.toMatchObject({
      result: {
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ path: "conceptVi" }),
          expect.objectContaining({ path: "dialogue" }),
        ]),
      },
    });
  });

  it("locks a lesson draft to the target lesson graph and complete guided answer", async () => {
    const lesson = reviewed("lesson");
    const valid = await validateStudioContent("lesson", lesson);
    expect(valid.result.valid).toBe(true);

    lesson.prerequisites = [String(lesson.targetLessonId)];
    lesson.exercises = [{
      promptVi: "Tự giới thiệu.",
      answer: "我是学生。",
      distractors: ["你是学生。", "我是老师。"],
      explanationVi: "Dùng 我是 để giới thiệu.",
    }];
    const drifted = await validateStudioContent("lesson", lesson);
    expect(drifted.result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "prerequisites" }),
      expect.objectContaining({ path: "exercises" }),
    ]));
  });

  it("rejects orphan lesson links and technical skill values", async () => {
    const pronunciation = reviewed("pronunciation");
    pronunciation.sourceLessonIds = ["missing-lesson"];
    const pronunciationResult = await validateStudioContent("pronunciation", pronunciation);
    expect(pronunciationResult.result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "sourceLessonIds" }),
    ]));

    const communicative = reviewed("communicative_function");
    communicative.skills = ["mastery-score"];
    const communicativeResult = await validateStudioContent("communicative_function", communicative);
    expect(communicativeResult.result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "skills" }),
    ]));
  });

  it("rejects a graded text without rights attestation or with duplicated choices", async () => {
    const gradedText = reviewed("graded_text");
    gradedText.rights = {
      sourceKind: "original-hanzi-os",
      textProvenanceVi: "Bản thảo chưa được xác nhận.",
      editorAttestsRights: false,
    };
    gradedText.comprehension = [{
      promptVi: "Hôm nay là ngày gì?",
      answer: "Ngày đầu học tiếng Trung",
      distractors: ["Ngày thi", "Ngày thi"],
      explanationVi: "Đọc lại câu đầu.",
    }];
    const result = await validateStudioContent("graded_text", gradedText);
    expect(result.result.valid).toBe(false);
    expect(result.result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "comprehension" }),
      expect.objectContaining({ path: "rights" }),
    ]));
  });
});
