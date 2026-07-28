import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const HSK_SYLLABUS_SOURCE_RELATIVE_PATH =
  "content/sources/hsk-syllabus-2026/source.json";
export const HSK_SYLLABUS_INVENTORY_RELATIVE_PATH =
  "content/sources/hsk-syllabus-2026/inventory.json";

const LEVELS = [1, 2, 3, 4];
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SECTIONS = [
  "tasks",
  "topics",
  "vocabulary",
  "recognitionCharacters",
  "grammarRows",
];
const VOCABULARY_LEVEL_END_SEQUENCE = {
  1: 300,
  2: 500,
  3: 1_000,
  4: 2_000,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export const fileSha256 = (path) =>
  `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;

export const loadHskSyllabusBundle = (root = process.cwd()) => {
  const sourcePath = join(root, HSK_SYLLABUS_SOURCE_RELATIVE_PATH);
  const inventoryPath = join(root, HSK_SYLLABUS_INVENTORY_RELATIVE_PATH);
  return {
    sourcePath,
    inventoryPath,
    source: readJson(sourcePath),
    inventory: readJson(inventoryPath),
    inventorySha256: fileSha256(inventoryPath),
  };
};

const requireString = (errors, value, field, maxLength = 1_000) => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maxLength
  ) {
    errors.push(`${field} must be a non-empty string <= ${maxLength} chars`);
  }
};

const countByLevel = (items) => Object.fromEntries(
  LEVELS.map((level) => [
    String(level),
    items.filter((item) => item.level === level).length,
  ]),
);

const validateOrderedSection = ({
  errors,
  items,
  section,
  source,
  sequenceField,
}) => {
  const seenIds = new Set();
  for (const level of LEVELS) {
    const levelItems = items.filter((item) => item.level === level);
    const [firstPage, lastPage] = source.pdfPageRanges[section][String(level)];
    for (const [index, item] of levelItems.entries()) {
      if (!isRecord(item)) {
        errors.push(`${section}[${index}] must be an object`);
        continue;
      }
      requireString(errors, item.id, `${section}.${level}.id`, 120);
      if (seenIds.has(item.id)) errors.push(`${section} duplicate id ${item.id}`);
      seenIds.add(item.id);
      if (item[sequenceField] !== index + 1) {
        errors.push(
          `${section} level ${level} ${sequenceField} must be contiguous at ${index + 1}`,
        );
      }
      if (
        !Number.isInteger(item.sourcePage)
        || item.sourcePage < firstPage
        || item.sourcePage > lastPage
      ) {
        errors.push(`${item.id} sourcePage is outside the pinned ${section} range`);
      }
    }
  }
};

export const validateHskSyllabusBundle = ({ source, inventory }) => {
  const errors = [];
  if (!isRecord(source) || source.schemaVersion !== 1) {
    return { valid: false, errors: ["source descriptor schemaVersion must be 1"] };
  }
  if (!isRecord(inventory) || inventory.schemaVersion !== 1) {
    return { valid: false, errors: ["inventory schemaVersion must be 1"] };
  }
  requireString(errors, source.sourceId, "source.sourceId", 120);
  requireString(errors, source.canonicalUrl, "source.canonicalUrl", 1_000);
  if (!DIGEST_PATTERN.test(source.pdfSha256 ?? "")) {
    errors.push("source.pdfSha256 must be a canonical sha256 digest");
  }
  if (source.pdfPages !== 406) {
    errors.push("source.pdfPages must remain pinned to 406");
  }
  if (source.rights?.license !== null || source.rights?.decision !== "pending") {
    errors.push("source rights must remain explicitly pending until reviewed");
  }
  if (
    inventory.sourceId !== source.sourceId
    || inventory.sourcePdfSha256 !== source.pdfSha256
    || inventory.sourcePublished !== source.published
    || inventory.sourceEffective !== source.effective
  ) {
    errors.push("inventory source identity does not match the pinned descriptor");
  }

  for (const section of SECTIONS) {
    if (!Array.isArray(inventory[section])) {
      errors.push(`inventory.${section} must be an array`);
      continue;
    }
    const actualCounts = countByLevel(inventory[section]);
    const expectedCounts = source.expectedCounts[section];
    if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) {
      errors.push(
        `${section} count drift: expected ${JSON.stringify(expectedCounts)}, received ${JSON.stringify(actualCounts)}`,
      );
    }
    if (
      JSON.stringify(inventory.counts?.[section])
      !== JSON.stringify(actualCounts)
    ) {
      errors.push(`${section} summary counts do not match its entries`);
    }
  }

  if (Array.isArray(inventory.vocabulary)) {
    const expectedSequences = Array.from({ length: 2_000 }, (_, index) => index + 1);
    if (
      JSON.stringify(inventory.vocabulary.map((item) => item.sequence))
      !== JSON.stringify(expectedSequences)
    ) {
      errors.push("vocabulary sequence must be exactly 1..2000");
    }
    const seenVocabularyIds = new Set();
    for (const item of inventory.vocabulary) {
      requireString(errors, item.id, "vocabulary.id", 120);
      requireString(errors, item.word, `${item.id}.word`, 80);
      requireString(errors, item.displayWord, `${item.id}.displayWord`, 80);
      requireString(errors, item.pinyin, `${item.id}.pinyin`, 120);
      const expectedLevel = LEVELS.find(
        (level) => item.sequence <= VOCABULARY_LEVEL_END_SEQUENCE[level],
      );
      if (item.level !== expectedLevel) {
        errors.push(
          `${item.id} level ${item.level} does not match sequence ${item.sequence}`,
        );
      }
      if (seenVocabularyIds.has(item.id)) {
        errors.push(`vocabulary duplicate id ${item.id}`);
      }
      seenVocabularyIds.add(item.id);
      const [firstPage, lastPage] =
        source.pdfPageRanges.vocabulary[String(item.level)] ?? [];
      if (
        !Number.isInteger(item.sourcePage)
        || item.sourcePage < firstPage
        || item.sourcePage > lastPage
      ) {
        errors.push(`${item.id} sourcePage is outside the pinned vocabulary range`);
      }
    }
  }

  if (Array.isArray(inventory.tasks)) {
    validateOrderedSection({
      errors,
      items: inventory.tasks,
      section: "tasks",
      source,
      sequenceField: "ordinal",
    });
    for (const item of inventory.tasks) {
      requireString(errors, item.title, `${item.id}.title`, 240);
      if (!Number.isInteger(item.bulletCount) || item.bulletCount < 1) {
        errors.push(`${item.id}.bulletCount must be a positive integer`);
      }
    }
  }
  if (Array.isArray(inventory.topics)) {
    validateOrderedSection({
      errors,
      items: inventory.topics,
      section: "topics",
      source,
      sequenceField: "ordinal",
    });
    for (const item of inventory.topics) {
      requireString(errors, item.domain, `${item.id}.domain`, 240);
      requireString(errors, item.group, `${item.id}.group`, 240);
      requireString(errors, item.topic, `${item.id}.topic`, 500);
    }
  }
  if (Array.isArray(inventory.recognitionCharacters)) {
    validateOrderedSection({
      errors,
      items: inventory.recognitionCharacters,
      section: "recognitionCharacters",
      source,
      sequenceField: "sequence",
    });
    for (const item of inventory.recognitionCharacters) {
      if (
        typeof item.character !== "string"
        || [...item.character].length !== 1
      ) {
        errors.push(`${item.id}.character must be exactly one Unicode character`);
      }
    }
  }
  if (Array.isArray(inventory.grammarRows)) {
    validateOrderedSection({
      errors,
      items: inventory.grammarRows,
      section: "grammar",
      source,
      sequenceField: "ordinal",
    });
    for (const item of inventory.grammarRows) {
      requireString(errors, item.category, `${item.id}.category`, 240);
      requireString(errors, item.content, `${item.id}.content`, 1_000);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: inventory.counts,
  };
};

export const assertValidHskSyllabusBundle = (bundle) => {
  const result = validateHskSyllabusBundle(bundle);
  if (!result.valid) {
    throw new Error(`Invalid HSK syllabus inventory:\n- ${result.errors.join("\n- ")}`);
  }
  return result;
};
