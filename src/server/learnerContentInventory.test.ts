import { describe, expect, it } from "vitest";
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
import { READER_DISCOVERABLE_SERIES } from "../reader/library/readerManifest";
import { HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS } from "./hskMockExamBank";
import {
  LEARNER_CONTENT_INVENTORY,
  learnerInventoryEntry,
} from "./learnerContentInventory";
import { STUDIO_MODULE_AUTHORING_COVERAGE } from "../content/studioAuthoringCatalog";

const unique = <Item,>(items: readonly Item[], id: (item: Item) => string) =>
  new Set(items.map(id)).size;

describe("learner content inventory", () => {
  it("projects every figure from the source consumed by the learner module", () => {
    expect(LEARNER_CONTENT_INVENTORY.contentVersion).toBe(CONTENT_VERSION);
    expect(LEARNER_CONTENT_INVENTORY.byType.vocabulary.count).toBe(
      unique(RELEASED_VOCABULARY, (item) => item.id),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.lesson.count).toBe(
      unique(RELEASED_LESSONS, (item) => item.id),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.graded_text.count).toBe(
      unique(RELEASED_STORIES, (item) => item.id),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.grammar.count).toBe(
      unique(RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.grammar), (item) => item.id),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.communicative_function.count).toBe(
      unique(RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.tasks), (item) => item.id),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.character.count).toBe(
      unique(RELEASED_RICH_LESSONS.flatMap((lesson) => lesson.characters), (item) => item.id),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.pronunciation.count).toBe(
      unique(
        KNOWLEDGE_ITEM_BLUEPRINTS.filter((item) => item.itemType === "pronunciation"),
        (item) => item.itemId,
      ),
    );
    expect(LEARNER_CONTENT_INVENTORY.readerSeries.count).toBe(
      unique(READER_DISCOVERABLE_SERIES, (series) => series.seriesId),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.exam_item.count).toBe(
      Object.values(HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS)
        .reduce((total, count) => total + count, 0),
    );
    expect(LEARNER_CONTENT_INVENTORY.byType.exam_form.count).toBe(
      HSK_EXAM_LEVELS.length * HSK_BUILT_IN_EXAM_FORM_KEYS.length,
    );
  });

  it("covers every authoring route with a non-empty learner baseline", () => {
    const itemTypes = new Set(
      STUDIO_MODULE_AUTHORING_COVERAGE.flatMap((module) =>
        module.methods.map((method) => method.itemType)
      ),
    );
    expect([...itemTypes].every((itemType) =>
      learnerInventoryEntry(itemType).count > 0
    )).toBe(true);
  });
});
