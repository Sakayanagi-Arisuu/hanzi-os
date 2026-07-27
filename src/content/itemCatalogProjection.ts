import type { Lesson, Story, VocabularyItem } from "../types";
import type { KnowledgeItemBlueprint } from "../data/knowledgeItemBlueprints";
import type { LessonGuide } from "../data/lessonGuides";
import type {
  ContentCatalogItemV1,
  ContentCatalogItemV2,
  ContentItemReference,
  ItemCatalogArtifact,
  KnowledgeContentItemReference,
} from "./types";
import { sha256Json } from "./packageLoader";

const lexemePayload = ({
  id: _id,
  syllables: _syllables,
  ...payload
}: VocabularyItem) => payload;

const lessonPayload = ({
  id: _id,
  prerequisiteIds: _prerequisiteIds,
  releaseState: _releaseState,
  contentVersion: _contentVersion,
  ...payload
}: Lesson) => payload;

const gradedTextPayload = ({
  id: _id,
  releaseState: _releaseState,
  contentVersion: _contentVersion,
  ...payload
}: Story) => payload;

type CatalogItemWithoutDigest =
  ContentCatalogItemV1 extends infer Item
    ? Item extends ContentCatalogItemV1
      ? Omit<Item, "payloadSha256">
      : never
    : never;

const withDigest = async (
  item: CatalogItemWithoutDigest,
): Promise<ContentCatalogItemV1> =>
  ({
    ...item,
    payloadSha256: await sha256Json({
      itemType: item.itemType,
      payload: item.payload,
    }),
  }) as ContentCatalogItemV1;

export const projectItemCatalog = async ({
  contentVersion,
  vocabulary,
  lessons,
  stories,
}: {
  contentVersion: string;
  vocabulary: VocabularyItem[];
  lessons: Lesson[];
  stories: Story[];
}): Promise<Extract<ItemCatalogArtifact, { schemaVersion: 1 }>> => {
  const releasedWordIds = new Set([
    ...lessons
      .filter(
        (lesson) =>
          lesson.releaseState === "beta" || lesson.releaseState === "published",
      )
      .flatMap((lesson) => lesson.wordIds),
    ...stories
      .filter(
        (story) =>
          story.releaseState === "beta" || story.releaseState === "published",
      )
      .flatMap((story) =>
        story.sentences.flatMap((sentence) => sentence.wordIds),
      ),
  ]);
  const lexemes = await Promise.all(
    vocabulary.map((word) =>
      withDigest({
        itemKey: `lexeme:${word.id}`,
        itemType: "lexeme",
        itemId: word.id,
        itemVersion: contentVersion,
        releaseState: releasedWordIds.has(word.id) ? "beta" : "review",
        payload: lexemePayload(word),
        owner: null,
        sourceLicense: null,
        prerequisites: null,
      }),
    ),
  );
  const lessonItems = await Promise.all(
    lessons.map((lesson) =>
      withDigest({
        itemKey: `lesson:${lesson.id}`,
        itemType: "lesson",
        itemId: lesson.id,
        itemVersion: contentVersion,
        releaseState: lesson.releaseState,
        payload: lessonPayload(lesson),
        owner: null,
        sourceLicense: null,
        prerequisites: lesson.prerequisiteIds.map(
          (itemId): ContentItemReference => ({
            itemType: "lesson",
            itemId,
          }),
        ),
      }),
    ),
  );
  const gradedTexts = await Promise.all(
    stories.map((story) =>
      withDigest({
        itemKey: `graded-text:${story.id}`,
        itemType: "graded-text",
        itemId: story.id,
        itemVersion: contentVersion,
        releaseState: story.releaseState,
        payload: gradedTextPayload(story),
        owner: null,
        sourceLicense: null,
        prerequisites: null,
      }),
    ),
  );

  return {
    schemaVersion: 1,
    contentVersion,
    items: [...lexemes, ...lessonItems, ...gradedTexts],
    audioAssets: [],
  };
};

type CatalogItemV2WithoutDigest =
  ContentCatalogItemV2 extends infer Item
    ? Item extends ContentCatalogItemV2
      ? Omit<Item, "payloadSha256">
      : never
    : never;

const withDigestV2 = async (
  item: CatalogItemV2WithoutDigest,
): Promise<ContentCatalogItemV2> =>
  ({
    ...item,
    payloadSha256: await sha256Json({
      itemType: item.itemType,
      payload: item.payload,
    }),
  }) as ContentCatalogItemV2;

export const projectItemCatalogV2 = async ({
  contentVersion,
  vocabulary,
  lessons,
  stories,
  lessonGuides,
  knowledgeItemBlueprints,
}: {
  contentVersion: string;
  vocabulary: VocabularyItem[];
  lessons: Lesson[];
  stories: Story[];
  lessonGuides: Record<string, LessonGuide>;
  knowledgeItemBlueprints: KnowledgeItemBlueprint[];
}): Promise<Extract<ItemCatalogArtifact, { schemaVersion: 2 }>> => {
  const baseCatalog = await projectItemCatalog({
    contentVersion,
    vocabulary,
    lessons,
    stories,
  });
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const vocabularyById = new Map(vocabulary.map((word) => [word.id, word]));

  for (const blueprint of knowledgeItemBlueprints) {
    if (!lessonIds.has(blueprint.sourceLessonId)) {
      throw new Error(
        `Knowledge item ${blueprint.itemType}:${blueprint.itemId} references unknown source lesson ${blueprint.sourceLessonId}`,
      );
    }
    if (!lessonGuides[blueprint.sourceLessonId]) {
      throw new Error(
        `Knowledge item ${blueprint.itemType}:${blueprint.itemId} has no authored lesson guide`,
      );
    }
    if (
      blueprint.itemType === "character"
      && !vocabularyById.has(blueprint.sourceLexemeId)
    ) {
      throw new Error(
        `Character ${blueprint.itemId} references unknown lexeme ${blueprint.sourceLexemeId}`,
      );
    }
  }

  const coreItems = await Promise.all(
    baseCatalog.items.map(async (item): Promise<ContentCatalogItemV2> => {
      if (item.itemType !== "lesson") return item;
      const knowledgeItems: KnowledgeContentItemReference[] = [
        ...item.payload.wordIds.map((itemId) => ({
          itemType: "lexeme" as const,
          itemId,
        })),
        ...knowledgeItemBlueprints
          .filter((blueprint) => blueprint.sourceLessonId === item.itemId)
          .map((blueprint) => ({
            itemType: blueprint.itemType,
            itemId: blueprint.itemId,
          })),
      ];
      return withDigestV2({
        ...item,
        knowledgeItems,
      });
    }),
  );

  const knowledgeItems = await Promise.all(
    knowledgeItemBlueprints.map(async (blueprint): Promise<ContentCatalogItemV2> => {
      const guide = lessonGuides[blueprint.sourceLessonId];
      const common = {
        itemKey: `${blueprint.itemType}:${blueprint.itemId}`,
        itemType: blueprint.itemType,
        itemId: blueprint.itemId,
        itemVersion: contentVersion,
        releaseState: "review" as const,
        owner: null,
        sourceLicense: null,
        prerequisites: structuredClone(blueprint.prerequisites),
      };
      if (blueprint.itemType === "grammar") {
        return withDigestV2({
          ...common,
          itemKey: `grammar:${blueprint.itemId}`,
          itemType: "grammar",
          payload: {
            ...structuredClone(guide),
            sourceLessonIds: [blueprint.sourceLessonId],
          },
        });
      }
      if (blueprint.itemType === "pronunciation") {
        return withDigestV2({
          ...common,
          itemKey: `pronunciation:${blueprint.itemId}`,
          itemType: "pronunciation",
          payload: {
            targetKind: blueprint.targetKind,
            targets: [...blueprint.targets],
            ...structuredClone(guide),
            sourceLessonIds: [blueprint.sourceLessonId],
          },
        });
      }
      if (blueprint.itemType === "communicative-function") {
        return withDigestV2({
          ...common,
          itemKey: `communicative-function:${blueprint.itemId}`,
          itemType: "communicative-function",
          payload: {
            canDo: guide.checkpoint,
            context: guide.concept,
            examples: structuredClone(guide.examples),
            sourceLessonIds: [blueprint.sourceLessonId],
          },
        });
      }
      const word = vocabularyById.get(blueprint.sourceLexemeId);
      if (!word) throw new Error(`Character source lexeme is missing: ${blueprint.sourceLexemeId}`);
      if ([...word.simplified].length !== 1 || [...word.traditional].length !== 1) {
        throw new Error(`Character source lexeme must contain one character: ${word.id}`);
      }
      return withDigestV2({
        ...common,
        itemKey: `character:${blueprint.itemId}`,
        itemType: "character",
        payload: {
          character: word.simplified,
          traditional: word.traditional,
          pinyin: word.pinyin,
          meaning: word.meaning,
          sourceLexemeIds: [word.id],
          radical: null,
          strokeCount: null,
          components: null,
          structure: null,
          strokeDataRef: null,
          strokeDataSha256: null,
        },
      });
    }),
  );

  return {
    schemaVersion: 2,
    contentVersion,
    items: [...coreItems, ...knowledgeItems],
    audioAssets: [],
  };
};
