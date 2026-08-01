import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LESSONS,
} from "../data/curriculum";
import { KNOWLEDGE_ITEM_BLUEPRINTS } from "../data/knowledgeItemBlueprints";
import { LESSON_GUIDES } from "../data/lessonGuides";
import { extractAuthoringContent } from "./authoringCatalogProjection";
import { projectItemCatalogV2 } from "./itemCatalogProjection";
import type { ItemCatalogArtifact } from "./types";

const sourceCatalog = JSON.parse(
  readFileSync(
    new URL(
      "../../content/packages/foundation-2026.07.5/item-catalog.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as ItemCatalogArtifact;
const authoring = extractAuthoringContent(sourceCatalog);

describe("schema-v2 item catalog projection", () => {
  it("creates source-derived review items without inventing release evidence", async () => {
    const contentVersion = "fixture-2026.08.1";
    const catalog = await projectItemCatalogV2({
      contentVersion,
      ...authoring,
      lessonGuides: LESSON_GUIDES,
      knowledgeItemBlueprints: KNOWLEDGE_ITEM_BLUEPRINTS,
    });

    expect(catalog.schemaVersion).toBe(2);
    expect(LESSONS).toHaveLength(44);
    expect(authoring.lessons).toHaveLength(24);
    expect(
      authoring.lessons.filter((lesson) => lesson.releaseState === "draft"),
    ).toHaveLength(10);
    expect(catalog.items).toHaveLength(74);
    expect(
      Object.fromEntries(
        [
          "lexeme",
          "lesson",
          "graded-text",
          "grammar",
          "pronunciation",
          "character",
          "communicative-function",
        ].map((itemType) => [
          itemType,
          catalog.items.filter((item) => item.itemType === itemType).length,
        ]),
      ),
    ).toEqual({
      lexeme: 24,
      lesson: 24,
      "graded-text": 1,
      grammar: 5,
      pronunciation: 5,
      character: 7,
      "communicative-function": 8,
    });

    const newItems = catalog.items.filter((item) =>
      [
        "grammar",
        "pronunciation",
        "character",
        "communicative-function",
      ].includes(item.itemType));
    expect(newItems).toHaveLength(25);
    expect(newItems.every((item) => item.releaseState === "review")).toBe(true);
    expect(newItems.every((item) => item.owner === null)).toBe(true);
    expect(newItems.every((item) => item.sourceLicense === null)).toBe(true);
    expect(new Set(newItems.map((item) => item.payloadSha256)).size).toBe(25);

    const grammar = catalog.items.find(
      (item) => item.itemKey === "grammar:shi-nominal-predicate",
    );
    expect(grammar?.itemType).toBe("grammar");
    if (!grammar || grammar.itemType !== "grammar") {
      throw new Error("Grammar projection fixture is missing");
    }
    expect(grammar.payload.concept).toBe(LESSON_GUIDES["survival-1"].concept);
    expect(grammar.payload.examples).toEqual(LESSON_GUIDES["survival-1"].examples);
    expect(grammar.prerequisites).toEqual([
      { itemType: "lesson", itemId: "boot-4" },
    ]);

    const character = catalog.items.find(
      (item) => item.itemKey === "character:u4f60",
    );
    expect(character?.itemType).toBe("character");
    if (!character || character.itemType !== "character") {
      throw new Error("Character projection fixture is missing");
    }
    expect(character.payload).toMatchObject({
      character: "你",
      traditional: "你",
      pinyin: "nǐ",
      sourceLexemeIds: ["ni"],
      radical: null,
      strokeDataRef: null,
    });
  });

  it("maps lesson lexemes exactly and keeps typed knowledge membership explicit", async () => {
    const catalog = await projectItemCatalogV2({
      contentVersion: "fixture-2026.08.2",
      ...authoring,
      lessonGuides: LESSON_GUIDES,
      knowledgeItemBlueprints: KNOWLEDGE_ITEM_BLUEPRINTS,
    });

    const survivalOne = catalog.items.find(
      (item) => item.itemKey === "lesson:survival-1",
    );
    if (!survivalOne || survivalOne.itemType !== "lesson") {
      throw new Error("Lesson projection fixture is missing");
    }
    expect(survivalOne.knowledgeItems).toEqual([
      { itemType: "lexeme", itemId: "wo" },
      { itemType: "lexeme", itemId: "shi" },
      { itemType: "lexeme", itemId: "xuesheng" },
      { itemType: "lexeme", itemId: "laoshi" },
      { itemType: "grammar", itemId: "shi-nominal-predicate" },
      {
        itemType: "communicative-function",
        itemId: "introduce-and-deny-role",
      },
    ]);
    expect(
      survivalOne.knowledgeItems
        .filter((reference) => reference.itemType === "lexeme")
        .map((reference) => reference.itemId),
    ).toEqual(survivalOne.payload.wordIds);
  });
});
