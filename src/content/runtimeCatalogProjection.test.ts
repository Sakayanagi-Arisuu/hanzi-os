import { describe, expect, it } from "vitest";
import { projectSanitizedRuntimeCatalog } from "./governance.mjs";
import { projectRuntimeCatalog } from "./runtimeCatalogProjection";
import type {
  ContentCatalogItemV2,
  ContentReleaseState,
  GradedTextCatalogItem,
  ItemCatalogArtifact,
  LessonCatalogItemV2,
  LexemeCatalogItem,
  Sha256Digest,
} from "./types";

const digest = (value: string): Sha256Digest => `sha256:${value}`;

const governance = (
  releaseState: ContentReleaseState,
  prerequisites: LessonCatalogItemV2["prerequisites"] = [],
) => ({
  itemVersion: "editorial-version-that-must-not-leak",
  releaseState,
  payloadSha256: digest("payload-that-must-not-leak"),
  owner: {
    id: "owner-that-must-not-leak",
    evidenceRef: "evidence-that-must-not-leak",
  },
  sourceLicense: {
    licenseId: "license-that-must-not-leak",
    evidenceRef: "license-evidence-that-must-not-leak",
  },
  prerequisites,
});

const lexeme = (
  itemId: string,
  releaseState: ContentReleaseState,
  meaning = itemId,
): LexemeCatalogItem => ({
  itemKey: `lexeme:${itemId}`,
  itemType: "lexeme",
  itemId,
  ...governance(releaseState),
  payload: {
    simplified: itemId,
    traditional: itemId,
    pinyin: "cí",
    pinyinNumbered: "ci2",
    meaning,
    partOfSpeech: "noun",
    example: `${itemId} example`,
    examplePinyin: "cí",
    exampleMeaning: `${meaning} example`,
    hsk: 1,
    tags: ["fixture"],
  },
});

const lesson = ({
  itemId,
  releaseState,
  wordIds,
  prerequisites = [],
  title = itemId,
  includeReviewKnowledgeItems = true,
}: {
  itemId: string;
  releaseState: ContentReleaseState;
  wordIds: string[];
  prerequisites?: LessonCatalogItemV2["prerequisites"];
  title?: string;
  includeReviewKnowledgeItems?: boolean;
}): LessonCatalogItemV2 => ({
  itemKey: `lesson:${itemId}`,
  itemType: "lesson",
  itemId,
  ...governance(releaseState, prerequisites),
  knowledgeItems: [
    ...wordIds.map((itemId) => ({
      itemType: "lexeme" as const,
      itemId,
    })),
    ...(includeReviewKnowledgeItems
      ? [
          { itemType: "grammar" as const, itemId: "grammar-review" },
          {
            itemType: "pronunciation" as const,
            itemId: "pronunciation-review",
          },
          { itemType: "character" as const, itemId: "character-review" },
          {
            itemType: "communicative-function" as const,
            itemId: "communicative-review",
          },
        ]
      : []),
  ],
  payload: {
    unitId: "unit-1",
    title,
    chineseTitle: `${title} 中文`,
    objective: `${title} objective`,
    minutes: 10,
    xp: 20,
    skills: ["reading"],
    wordIds,
  },
});

const story = (
  itemId: string,
  releaseState: ContentReleaseState,
  wordIds: string[],
  summary = itemId,
): GradedTextCatalogItem => ({
  itemKey: `graded-text:${itemId}`,
  itemType: "graded-text",
  itemId,
  ...governance(releaseState),
  payload: {
    level: "A0",
    title: itemId,
    chineseTitle: `${itemId} 中文`,
    summary,
    estimatedMinutes: 3,
    sentences: [
      {
        chinese: "词。",
        pinyin: "Cí.",
        translation: "Word.",
        wordIds,
      },
    ],
    comprehension: [
      {
        id: "question-1",
        prompt: "Prompt",
        options: ["Correct", "Incorrect"],
        correctAnswer: "Correct",
        explanation: "Explanation",
      },
    ],
  },
});

const knowledgeItems: ContentCatalogItemV2[] = [
  {
    itemKey: "grammar:grammar-review",
    itemType: "grammar",
    itemId: "grammar-review",
    ...governance("published"),
    payload: {
      concept: "GRAMMAR_PAYLOAD_MUST_NOT_LEAK",
      rule: "Grammar rule",
      examples: [{ chinese: "是", pinyin: "shì", meaning: "to be" }],
      pitfall: "Grammar pitfall",
      checkpoint: "Grammar checkpoint",
      sourceLessonIds: ["lesson-main"],
    },
  },
  {
    itemKey: "pronunciation:pronunciation-review",
    itemType: "pronunciation",
    itemId: "pronunciation-review",
    ...governance("review"),
    payload: {
      targetKind: "tone-system",
      targets: ["tone-1"],
      concept: "PRONUNCIATION_PAYLOAD_MUST_NOT_LEAK",
      rule: "Pronunciation rule",
      examples: [{ chinese: "妈", pinyin: "mā", meaning: "mother" }],
      pitfall: "Pronunciation pitfall",
      checkpoint: "Pronunciation checkpoint",
      sourceLessonIds: ["lesson-main"],
    },
  },
  {
    itemKey: "character:character-review",
    itemType: "character",
    itemId: "character-review",
    ...governance("review"),
    payload: {
      character: "字",
      traditional: "字",
      pinyin: "zì",
      meaning: "CHARACTER_PAYLOAD_MUST_NOT_LEAK",
      sourceLexemeIds: ["released-word"],
      radical: "子",
      strokeCount: 6,
      components: ["宀", "子"],
      structure: "top-bottom",
      strokeDataRef: "private://stroke-data",
      strokeDataSha256: digest("private-stroke-data"),
    },
  },
  {
    itemKey: "communicative-function:communicative-review",
    itemType: "communicative-function",
    itemId: "communicative-review",
    ...governance("review"),
    payload: {
      canDo: "COMMUNICATIVE_PAYLOAD_MUST_NOT_LEAK",
      context: "Introductions",
      examples: [{ chinese: "你好", pinyin: "nǐ hǎo", meaning: "hello" }],
      sourceLessonIds: ["lesson-main"],
    },
  },
];

const buildCatalog = (): Extract<ItemCatalogArtifact, { schemaVersion: 2 }> => ({
  schemaVersion: 2,
  contentVersion: "foundation-test.2",
  items: [
    lexeme("released-word", "beta", "released meaning"),
    lexeme("draft-word", "draft", "DRAFT_LEXEME_MUST_NOT_LEAK"),
    lexeme("unused-word", "published", "UNUSED_LEXEME_MUST_NOT_LEAK"),
    lesson({
      itemId: "lesson-prerequisite",
      releaseState: "beta",
      wordIds: ["released-word"],
      includeReviewKnowledgeItems: false,
    }),
    lesson({
      itemId: "lesson-main",
      releaseState: "published",
      wordIds: ["released-word"],
      prerequisites: [
        { itemType: "lesson", itemId: "lesson-prerequisite" },
      ],
    }),
    lesson({
      itemId: "lesson-draft",
      releaseState: "draft",
      wordIds: ["draft-word"],
      title: "DRAFT_LESSON_MUST_NOT_LEAK",
    }),
    story("story-released", "published", ["released-word"]),
    story(
      "story-draft",
      "draft",
      ["draft-word"],
      "DRAFT_STORY_MUST_NOT_LEAK",
    ),
    ...structuredClone(knowledgeItems),
  ],
  audioAssets: [
    {
      assetId: "audio-that-must-not-leak",
      targetItemKey: "lexeme:released-word",
      targetPayloadSha256: digest("target"),
      fileRef: "private://audio-that-must-not-leak",
      fileSha256: digest("audio"),
      transcript: "PRIVATE_TRANSCRIPT_MUST_NOT_LEAK",
      transcriptSha256: digest("transcript"),
      speaker: {
        id: "speaker-that-must-not-leak",
        nativeSpeakerEvidenceRef: "speaker-evidence-that-must-not-leak",
      },
      rights: {
        ownerId: "rights-owner-that-must-not-leak",
        licenseId: "rights-license-that-must-not-leak",
        evidenceRef: "rights-evidence-that-must-not-leak",
      },
    },
  ],
});

describe("projectRuntimeCatalog", () => {
  it("projects only released runtime content and strips governance and review payloads", () => {
    const catalog = buildCatalog();
    const projected = projectRuntimeCatalog(catalog);

    expect(projected).toMatchObject({
      schemaVersion: 1,
      contentVersion: catalog.contentVersion,
      vocabulary: [{ id: "released-word", meaning: "released meaning" }],
      lessons: [
        {
          id: "lesson-main",
          prerequisiteIds: ["lesson-prerequisite"],
          releaseState: "published",
          contentVersion: catalog.contentVersion,
        },
        {
          id: "lesson-prerequisite",
          prerequisiteIds: [],
          releaseState: "beta",
          contentVersion: catalog.contentVersion,
        },
      ],
      stories: [
        {
          id: "story-released",
          releaseState: "published",
          contentVersion: catalog.contentVersion,
        },
      ],
    });

    const serialized = JSON.stringify(projected);
    for (const forbidden of [
      "owner",
      "sourceLicense",
      "evidenceRef",
      "audioAssets",
      "payloadSha256",
      "itemVersion",
      "itemKey",
      "knowledgeItems",
      "GRAMMAR_PAYLOAD_MUST_NOT_LEAK",
      "PRONUNCIATION_PAYLOAD_MUST_NOT_LEAK",
      "CHARACTER_PAYLOAD_MUST_NOT_LEAK",
      "COMMUNICATIVE_PAYLOAD_MUST_NOT_LEAK",
      "DRAFT_LEXEME_MUST_NOT_LEAK",
      "UNUSED_LEXEME_MUST_NOT_LEAK",
      "DRAFT_LESSON_MUST_NOT_LEAK",
      "DRAFT_STORY_MUST_NOT_LEAK",
      "PRIVATE_TRANSCRIPT_MUST_NOT_LEAK",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("produces canonical ordering independent of catalog item order", () => {
    const catalog = buildCatalog();
    const reversedCatalog = {
      ...catalog,
      items: [...catalog.items].reverse(),
      audioAssets: [...catalog.audioAssets].reverse(),
    } satisfies ItemCatalogArtifact;

    expect(projectRuntimeCatalog(reversedCatalog)).toEqual(
      projectRuntimeCatalog(catalog),
    );
    expect(projectRuntimeCatalog(catalog)).toEqual(
      projectSanitizedRuntimeCatalog(catalog),
    );
  });

  it("allowlists runtime payload fields even when an invalid draft handoff adds private keys", () => {
    const catalog = buildCatalog();
    const releasedWord = catalog.items.find(
      (item) => item.itemKey === "lexeme:released-word",
    );
    const releasedStory = catalog.items.find(
      (item) => item.itemKey === "graded-text:story-released",
    );
    if (!releasedWord || !releasedStory || releasedStory.itemType !== "graded-text") {
      throw new Error("Runtime allowlist fixtures are missing");
    }
    (releasedWord.payload as unknown as Record<string, unknown>).editorialNotes =
      "PRIVATE_LEXEME_FIELD";
    (releasedStory.payload.sentences[0] as unknown as Record<string, unknown>)
      .reviewerNotes = "PRIVATE_SENTENCE_FIELD";

    const typescriptProjection = projectRuntimeCatalog(catalog);
    const governanceProjection = projectSanitizedRuntimeCatalog(catalog);
    expect(governanceProjection).toEqual(typescriptProjection);
    expect(JSON.stringify(governanceProjection)).not.toContain("PRIVATE_");
  });

  it("fails closed when released content references an unavailable lexeme", () => {
    const catalog = buildCatalog();
    const mainLesson = catalog.items.find(
      (item): item is LessonCatalogItemV2 =>
        item.itemType === "lesson" && item.itemId === "lesson-main",
    );
    if (!mainLesson) throw new Error("Missing lesson fixture");
    mainLesson.payload.wordIds = ["draft-word"];

    expect(() => projectRuntimeCatalog(catalog)).toThrow(
      "lesson:lesson-main references missing or non-released lexeme draft-word",
    );
  });

  it.each(["lesson-draft", "missing-lesson"])(
    "fails closed for a non-released lesson prerequisite: %s",
    (prerequisiteId) => {
      const catalog = buildCatalog();
      const mainLesson = catalog.items.find(
        (item): item is LessonCatalogItemV2 =>
          item.itemType === "lesson" && item.itemId === "lesson-main",
      );
      if (!mainLesson) throw new Error("Missing lesson fixture");
      mainLesson.prerequisites = [
        { itemType: "lesson", itemId: prerequisiteId },
      ];

      expect(() => projectRuntimeCatalog(catalog)).toThrow(
        `lesson-main references missing or non-released lesson prerequisite ${prerequisiteId}`,
      );
    },
  );

  it("fails closed for a direct prerequisite the runtime lesson schema cannot represent", () => {
    const catalog = buildCatalog();
    const mainLesson = catalog.items.find(
      (item): item is LessonCatalogItemV2 =>
        item.itemType === "lesson" && item.itemId === "lesson-main",
    );
    if (!mainLesson) throw new Error("Missing lesson fixture");
    mainLesson.prerequisites = [{
      itemType: "grammar",
      itemId: "grammar-review",
    }];

    expect(() => projectRuntimeCatalog(catalog)).toThrow(
      "lesson-main has prerequisites the runtime schema cannot represent",
    );
  });

  it("fails closed when a knowledge item implies an absent runtime lesson prerequisite", () => {
    const catalog = buildCatalog();
    const grammar = catalog.items.find(
      (item) => item.itemType === "grammar" && item.itemId === "grammar-review",
    );
    if (!grammar || grammar.itemType !== "grammar") {
      throw new Error("Missing grammar fixture");
    }
    grammar.prerequisites = [{
      itemType: "lesson",
      itemId: "lesson-draft",
    }];

    expect(() => projectRuntimeCatalog(catalog)).toThrow(
      "lesson-main has implied lesson prerequisites absent from the runtime graph: lesson-draft",
    );
  });

  it("fails closed for graded-text prerequisites until runtime stories carry edges", () => {
    const catalog = buildCatalog();
    const releasedStory = catalog.items.find(
      (item) => item.itemKey === "graded-text:story-released",
    );
    if (!releasedStory || releasedStory.itemType !== "graded-text") {
      throw new Error("Missing story fixture");
    }
    releasedStory.prerequisites = [{
      itemType: "lesson",
      itemId: "lesson-prerequisite",
    }];

    expect(() => projectRuntimeCatalog(catalog)).toThrow(
      "story-released has prerequisites the runtime schema cannot represent",
    );
  });
});
