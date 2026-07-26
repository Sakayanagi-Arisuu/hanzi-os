import type { Lesson, Story, VocabularyItem } from "../types";
import type {
  ContentCatalogItem,
  ContentItemReference,
  ItemCatalogArtifact,
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
  ContentCatalogItem extends infer Item
    ? Item extends ContentCatalogItem
      ? Omit<Item, "payloadSha256">
      : never
    : never;

const withDigest = async (
  item: CatalogItemWithoutDigest,
): Promise<ContentCatalogItem> =>
  ({
    ...item,
    payloadSha256: await sha256Json({
      itemType: item.itemType,
      payload: item.payload,
    }),
  }) as ContentCatalogItem;

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
}): Promise<ItemCatalogArtifact> => {
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
