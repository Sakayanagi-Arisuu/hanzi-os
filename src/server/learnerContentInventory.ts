import {
  HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS,
} from "./hskMockExamBank";
import {
  HSK_BUILT_IN_EXAM_FORM_KEYS,
  HSK_EXAM_LEVELS,
} from "../assessment/hskExamStructure";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_STORIES,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import { KNOWLEDGE_ITEM_BLUEPRINTS } from "../data/knowledgeItemBlueprints";
import { RELEASED_RICH_LESSONS } from "../learning/richLessonContent";
import { READER_CONTENT_VERSION } from "../reader/library/readerContentModel";
import { READER_DISCOVERABLE_SERIES } from "../reader/library/readerManifest";
import type { StudioItemType } from "../content/studioContent";

export type LearnerContentInventoryKey = StudioItemType | "reader_series";

export type LearnerContentInventoryEntry = Readonly<{
  count: number;
  unit: string;
  source: "curriculum" | "rich-lessons" | "reader" | "exam-bank";
}>;

const uniqueCount = <Item,>(
  items: readonly Item[],
  identity: (item: Item) => string,
) => new Set(items.map(identity)).size;

const richGrammar = RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.grammar);
const richTasks = RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.tasks);
const richCharacters = RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.characters);
const pronunciationBlueprints = KNOWLEDGE_ITEM_BLUEPRINTS.filter(
  (item) => item.itemType === "pronunciation",
);

const examSourceItemCount = Object.values(HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS)
  .reduce((total, count) => total + count, 0);
const builtInExamFormCount = HSK_EXAM_LEVELS.length * HSK_BUILT_IN_EXAM_FORM_KEYS.length;

/**
 * Read-only projection of the content the learner applications actually
 * consume. It deliberately does not copy or seed these records into D1:
 * Studio revisions are a separate mutable workflow and are reported beside
 * this baseline by the back-office pages.
 *
 * Every count is calculated from the same imported source used by its learner
 * consumer. Updating a curriculum package, rich-lesson artifact, Reader
 * catalog or exam bank therefore updates this projection without a migration.
 */
export const LEARNER_CONTENT_INVENTORY = Object.freeze({
  contentVersion: CONTENT_VERSION,
  readerContentVersion: READER_CONTENT_VERSION,
  byType: Object.freeze({
    vocabulary: {
      count: uniqueCount(RELEASED_VOCABULARY, (item) => item.id),
      unit: "mục từ",
      source: "curriculum",
    },
    character: {
      count: uniqueCount(richCharacters, (item) => item.id),
      unit: "Hán tự trong bài",
      source: "rich-lessons",
    },
    grammar: {
      count: uniqueCount(richGrammar, (item) => item.id),
      unit: "điểm ngữ pháp",
      source: "rich-lessons",
    },
    pronunciation: {
      count: uniqueCount(pronunciationBlueprints, (item) => item.itemId),
      unit: "chuyên đề âm",
      source: "curriculum",
    },
    communicative_function: {
      count: uniqueCount(richTasks, (item) => item.id),
      unit: "nhiệm vụ giao tiếp",
      source: "rich-lessons",
    },
    graded_text: {
      count: uniqueCount(RELEASED_STORIES, (item) => item.id),
      unit: "bài đọc ngắn",
      source: "curriculum",
    },
    lesson: {
      count: uniqueCount(RELEASED_LESSONS, (item) => item.id),
      unit: "bài học",
      source: "curriculum",
    },
    exam_item: {
      count: examSourceItemCount,
      unit: "câu hỏi nguồn",
      source: "exam-bank",
    },
    exam_form: {
      count: builtInExamFormCount,
      unit: "bộ đề",
      source: "exam-bank",
    },
  } satisfies Readonly<Record<StudioItemType, LearnerContentInventoryEntry>>),
  readerSeries: {
    count: uniqueCount(READER_DISCOVERABLE_SERIES, (series) => series.seriesId),
    unit: "bộ sách",
    source: "reader",
  } satisfies LearnerContentInventoryEntry,
});

export const learnerInventoryEntry = (
  itemType: LearnerContentInventoryKey,
): LearnerContentInventoryEntry => itemType === "reader_series"
  ? LEARNER_CONTENT_INVENTORY.readerSeries
  : LEARNER_CONTENT_INVENTORY.byType[itemType];
