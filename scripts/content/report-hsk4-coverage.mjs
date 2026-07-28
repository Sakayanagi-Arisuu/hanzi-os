import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHskCurriculumGraphBundle,
  loadHskCurriculumGraphBundle,
} from "../../src/content/hskCurriculumGraph.mjs";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1CharacterFoundationPackBundle,
  loadHsk1CharacterFoundationPackBundle,
} from "../../src/content/hsk1CharacterFoundationPack.mjs";
import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

export const HSK4_COVERAGE_REPORT_RELATIVE_PATH =
  "content/reports/hsk4-coverage.json";

const LEVELS = [1, 2, 3, 4];
const RELEASED_STATES = new Set(["beta", "published"]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const normalizePinyin = (value) =>
  value.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/[\s'’/-]/g, "");

const percentage = (covered, total) =>
  total === 0 ? 0 : Number(((covered / total) * 100).toFixed(2));

export const buildHsk4CoverageReport = (root = process.cwd()) => {
  const syllabus = loadHskSyllabusBundle(root);
  assertValidHskSyllabusBundle(syllabus);
  const curriculum = loadHskCurriculumGraphBundle(root);
  const curriculumResult = assertValidHskCurriculumGraphBundle(curriculum);
  const hsk1Scope = loadHsk1CurriculumScopeBundle(root);
  const hsk1ScopeResult = assertValidHsk1CurriculumScopeBundle(hsk1Scope);
  const hsk1PersonalPack = loadHsk1PersonalExchangePackBundle(root);
  const hsk1PersonalPackResult =
    assertValidHsk1PersonalExchangePackBundle(hsk1PersonalPack);
  const hsk1CommunicativePacks =
    loadHsk1CommunicativeUnitPacksBundle(root);
  const hsk1CommunicativePacksResult =
    assertValidHsk1CommunicativeUnitPacksBundle(hsk1CommunicativePacks);
  const hsk1CharacterPack = loadHsk1CharacterFoundationPackBundle(root);
  const hsk1CharacterPackResult =
    assertValidHsk1CharacterFoundationPackBundle(hsk1CharacterPack);
  const registry = readJson(join(root, "content/registry.json"));
  const current = registry.packages.find(
    (item) => item.contentVersion === registry.currentContentVersion,
  );
  if (!current) throw new Error("Current content package is missing from registry");
  const packageRoot = join(root, "content", current.relativePath);
  const runtime = readJson(join(packageRoot, "runtime-catalog.json"));
  const authoring = readJson(join(packageRoot, "item-catalog.json"));

  const officialVocabularyByWord = new Map();
  for (const item of syllabus.inventory.vocabulary) {
    const candidates = officialVocabularyByWord.get(item.word) ?? [];
    candidates.push(item);
    officialVocabularyByWord.set(item.word, candidates);
  }
  const vocabularyMatches = [];
  const unmatchedVocabulary = [];
  const pinyinDrift = [];
  for (const item of runtime.vocabulary) {
    const candidates = officialVocabularyByWord.get(item.simplified) ?? [];
    const exact = candidates.find(
      (candidate) =>
        normalizePinyin(candidate.pinyin) === normalizePinyin(item.pinyin),
    );
    const official = exact ?? (candidates.length === 1 ? candidates[0] : null);
    if (official) {
      vocabularyMatches.push({
        runtimeId: item.id,
        officialId: official.id,
        officialLevel: official.level,
        pinyinExact: Boolean(exact),
      });
      if (!exact) {
        pinyinDrift.push({
          runtimeId: item.id,
          simplified: item.simplified,
          runtimePinyin: item.pinyin,
          officialPinyin: official.pinyin,
        });
      }
    } else {
      unmatchedVocabulary.push({
        runtimeId: item.id,
        simplified: item.simplified,
        pinyin: item.pinyin,
      });
    }
  }

  const officialCharacters = new Map(
    syllabus.inventory.recognitionCharacters.map((item) => [
      item.character,
      item,
    ]),
  );
  const characterItems = authoring.items.filter(
    (item) => item.itemType === "character",
  );
  const characterMatches = characterItems
    .map((item) => {
      const official = officialCharacters.get(item.payload.character);
      return official
        ? {
            authoringId: item.itemId,
            officialId: official.id,
            officialLevel: official.level,
            releaseState: item.releaseState,
          }
        : null;
    })
    .filter(Boolean);

  const vocabularyByLevel = LEVELS.map((level) => {
    const official = syllabus.inventory.counts.vocabulary[String(level)];
    const covered = vocabularyMatches.filter(
      (item) => item.officialLevel === level,
    ).length;
    return {
      level,
      officialIncremental: official,
      runtimeMapped: covered,
      coveragePercent: percentage(covered, official),
    };
  });
  const charactersByLevel = LEVELS.map((level) => {
    const official =
      syllabus.inventory.counts.recognitionCharacters[String(level)];
    const authored = characterMatches.filter(
      (item) => item.officialLevel === level,
    ).length;
    const released = characterMatches.filter(
      (item) =>
        item.officialLevel === level && RELEASED_STATES.has(item.releaseState),
    ).length;
    return {
      level,
      officialIncremental: official,
      authoringMapped: authored,
      releasedMapped: released,
      releasedCoveragePercent: percentage(released, official),
    };
  });
  const lessonMappedVocabularyIds = new Set(
    curriculum.graph.lessonMappings.flatMap(
      (mapping) => mapping.officialVocabularyIds,
    ),
  );

  return {
    schemaVersion: 1,
    target: "local-graduation-hsk0-4",
    source: {
      sourceId: syllabus.source.sourceId,
      pdfSha256: syllabus.source.pdfSha256,
      inventorySha256: syllabus.inventorySha256,
      effective: syllabus.source.effective,
      rightsDecision: syllabus.source.rights.decision,
    },
    contentVersion: runtime.contentVersion,
    officialInventory: syllabus.inventory.counts,
    currentCoverage: {
      vocabulary: {
        officialTotal: syllabus.inventory.vocabulary.length,
        runtimeTotal: runtime.vocabulary.length,
        runtimeMapped: vocabularyMatches.length,
        unmatchedRuntime: unmatchedVocabulary,
        pinyinDrift,
        coveragePercent: percentage(
          vocabularyMatches.length,
          syllabus.inventory.vocabulary.length,
        ),
        byLevel: vocabularyByLevel,
      },
      recognitionCharacters: {
        officialTotal: syllabus.inventory.recognitionCharacters.length,
        authoringTotal: characterItems.length,
        authoringMapped: characterMatches.length,
        releasedMapped: characterMatches.filter((item) =>
          RELEASED_STATES.has(item.releaseState)
        ).length,
        releasedCoveragePercent: percentage(
          characterMatches.filter((item) =>
            RELEASED_STATES.has(item.releaseState)
          ).length,
          syllabus.inventory.recognitionCharacters.length,
        ),
        byLevel: charactersByLevel,
      },
      mappings: {
        tasks: 0,
        topics: 0,
        grammarRows: 0,
        officialVocabularyWithLessonMapping:
          lessonMappedVocabularyIds.size,
        runtimeLessonsMapped: curriculumResult.summary.mappedLessons,
      },
      authoringScope: {
        hsk1: {
          tasks: hsk1ScopeResult.summary.tasks,
          topics: hsk1ScopeResult.summary.topics,
          vocabulary: hsk1ScopeResult.summary.vocabulary,
          recognitionCharacters:
            hsk1ScopeResult.summary.recognitionCharacters,
          grammarRows: hsk1ScopeResult.summary.grammarRows,
          lessonPracticeCoverageComplete: false,
        },
      },
      draftBlueprintMappings: {
        hsk1PersonalExchange: {
          lessons: hsk1PersonalPackResult.summary.lessons,
          tasks: hsk1PersonalPackResult.summary.taskBlueprintMappings,
          topics: hsk1PersonalPackResult.summary.topicBlueprintMappings,
          vocabulary: hsk1PersonalPackResult.summary.vocabularyDrafts,
          grammarRows:
            hsk1PersonalPackResult.summary.grammarBlueprintMappings,
          dialogueTurns: hsk1PersonalPackResult.summary.dialogueTurns,
          authoredPracticeItems:
            hsk1PersonalPackResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1CommunicativeUnits: {
          units: hsk1CommunicativePacksResult.summary.units,
          lessons: hsk1CommunicativePacksResult.summary.lessons,
          tasks: hsk1CommunicativePacksResult.summary.taskBlueprintMappings,
          topics: hsk1CommunicativePacksResult.summary.topicBlueprintMappings,
          vocabulary: hsk1CommunicativePacksResult.summary.vocabularyDrafts,
          grammarRows:
            hsk1CommunicativePacksResult.summary.grammarBlueprintMappings,
          dialogueTurns: hsk1CommunicativePacksResult.summary.dialogueTurns,
          authoredPracticeItems:
            hsk1CommunicativePacksResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
        hsk1CharacterFoundation: {
          lessons: hsk1CharacterPackResult.summary.lessons,
          recognitionCharacters:
            hsk1CharacterPackResult.summary.characterDrafts,
          vocabularyContextMapped:
            hsk1CharacterPackResult.summary.charactersWithVocabularyContext,
          pinnedStrokeMetadata:
            hsk1CharacterPackResult.summary
              .charactersWithPinnedStrokeMetadata,
          authoredPracticeItems:
            hsk1CharacterPackResult.summary.authoredPracticeItems,
          reviewed: false,
          learnerVisible: false,
        },
      },
      learningMaterials: {
        runtimeLessons: runtime.lessons.length,
        runtimeGradedTexts: runtime.stories.length,
        curriculumPaths: curriculumResult.summary.paths,
        curriculumUnits: curriculumResult.summary.units,
      },
    },
    coverageClaims: LEVELS.map((level) => ({
      level,
      complete: false,
      reason:
        "Official inventory exists, but task/topic/grammar coverage and reviewed learning mappings are incomplete.",
    })),
  };
};

export const serializeHsk4CoverageReport = (report) =>
  `${JSON.stringify(report, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK4_COVERAGE_REPORT_RELATIVE_PATH);
  const serialized = serializeHsk4CoverageReport(
    buildHsk4CoverageReport(root),
  );
  if (process.argv.includes("--write")) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
    console.log(`Wrote ${HSK4_COVERAGE_REPORT_RELATIVE_PATH}`);
    return;
  }
  if (process.argv.includes("--check")) {
    const current = readFileSync(outputPath, "utf8");
    if (current !== serialized) {
      throw new Error(
        `${HSK4_COVERAGE_REPORT_RELATIVE_PATH} is stale; run npm run content:hsk4:report -- --write`,
      );
    }
    console.log(`${HSK4_COVERAGE_REPORT_RELATIVE_PATH} is current`);
    return;
  }
  process.stdout.write(serialized);
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
