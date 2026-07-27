import type {
  ContentCatalogItem,
  GradedTextCatalogItem,
  ItemCatalogArtifact,
  LessonCatalogItemV1,
  LessonCatalogItemV2,
  LexemeCatalogItem,
  ReleasedContentState,
  RuntimeCatalogArtifact,
  RuntimeCatalogLesson,
  RuntimeCatalogStory,
  RuntimeCatalogVocabularyItem,
} from "./types";

type LessonCatalogItem = LessonCatalogItemV1 | LessonCatalogItemV2;

const isReleased = (
  releaseState: ContentCatalogItem["releaseState"],
): releaseState is ReleasedContentState =>
  releaseState === "beta" || releaseState === "published";

const compareIds = (left: { id: string }, right: { id: string }) =>
  left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

const assertUniqueItemKeys = (items: ContentCatalogItem[]) => {
  const itemKeys = new Set<string>();
  for (const item of items) {
    if (itemKeys.has(item.itemKey)) {
      throw new Error(`Runtime catalog contains duplicate item key ${item.itemKey}`);
    }
    itemKeys.add(item.itemKey);
  }
};

const referenceKey = (reference: { itemType: string; itemId: string }) =>
  `${reference.itemType}:${reference.itemId}`;

const dependencyKeys = (item: ContentCatalogItem) => [
  ...(item.prerequisites ?? []).map(referenceKey),
  ...(item.itemType === "lesson"
    ? "knowledgeItems" in item && Array.isArray(item.knowledgeItems)
      ? item.knowledgeItems.map(referenceKey)
      : item.payload.wordIds.map((itemId) => `lexeme:${itemId}`)
    : item.itemType === "graded-text"
      ? [...new Set(
          item.payload.sentences.flatMap((sentence) => sentence.wordIds),
        )].map((itemId) => `lexeme:${itemId}`)
      : []),
];

const impliedLessonDependencies = (
  itemByKey: Map<string, ContentCatalogItem>,
  root: ContentCatalogItem,
) => {
  const lessonIds = new Set<string>();
  const visited = new Set<string>();
  const queue = dependencyKeys(root);
  while (queue.length > 0) {
    const itemKey = queue.shift()!;
    if (visited.has(itemKey)) continue;
    visited.add(itemKey);
    const dependency = itemByKey.get(itemKey);
    if (!dependency) {
      throw new Error(
        `Released item ${root.itemKey} has unavailable knowledge dependency ${itemKey}`,
      );
    }
    if (dependency.itemType === "lesson") lessonIds.add(dependency.itemId);
    queue.push(...dependencyKeys(dependency));
  }
  return lessonIds;
};

const runtimeLessonPrerequisiteClosure = (
  lessonById: Map<string, LessonCatalogItem>,
  lessonId: string,
) => {
  const closure = new Set<string>();
  const lesson = lessonById.get(lessonId);
  const queue = (lesson?.prerequisites ?? [])
    .filter((reference) => reference.itemType === "lesson")
    .map((reference) => reference.itemId);
  while (queue.length > 0) {
    const prerequisiteId = queue.shift()!;
    if (closure.has(prerequisiteId)) continue;
    closure.add(prerequisiteId);
    const prerequisite = lessonById.get(prerequisiteId);
    if (prerequisite) {
      queue.push(
        ...(prerequisite.prerequisites ?? [])
          .filter((reference) => reference.itemType === "lesson")
          .map((reference) => reference.itemId),
      );
    }
  }
  return closure;
};

const indexById = <Item extends { itemId: string }>(
  items: Item[],
  itemType: string,
) => {
  const index = new Map<string, Item>();
  for (const item of items) {
    if (index.has(item.itemId)) {
      throw new Error(
        `Runtime catalog contains duplicate ${itemType} ID ${item.itemId}`,
      );
    }
    index.set(item.itemId, item);
  }
  return index;
};

const projectVocabularyItem = (
  item: LexemeCatalogItem,
): RuntimeCatalogVocabularyItem => ({
  id: item.itemId,
  simplified: item.payload.simplified,
  traditional: item.payload.traditional,
  pinyin: item.payload.pinyin,
  pinyinNumbered: item.payload.pinyinNumbered,
  meaning: item.payload.meaning,
  partOfSpeech: item.payload.partOfSpeech,
  example: item.payload.example,
  examplePinyin: item.payload.examplePinyin,
  exampleMeaning: item.payload.exampleMeaning,
  hsk: item.payload.hsk,
  tags: [...item.payload.tags],
});

const projectLesson = (
  item: LessonCatalogItem,
  contentVersion: string,
): RuntimeCatalogLesson => ({
  id: item.itemId,
  unitId: item.payload.unitId,
  title: item.payload.title,
  chineseTitle: item.payload.chineseTitle,
  objective: item.payload.objective,
  minutes: item.payload.minutes,
  xp: item.payload.xp,
  skills: [...item.payload.skills],
  wordIds: [...item.payload.wordIds],
  prerequisiteIds: (item.prerequisites ?? [])
    .filter((reference) => reference.itemType === "lesson")
    .map((reference) => reference.itemId),
  releaseState: item.releaseState as ReleasedContentState,
  contentVersion,
});

const projectStory = (
  item: GradedTextCatalogItem,
  contentVersion: string,
): RuntimeCatalogStory => ({
  id: item.itemId,
  level: item.payload.level,
  title: item.payload.title,
  chineseTitle: item.payload.chineseTitle,
  summary: item.payload.summary,
  estimatedMinutes: item.payload.estimatedMinutes,
  sentences: item.payload.sentences.map((sentence) => ({
    chinese: sentence.chinese,
    pinyin: sentence.pinyin,
    translation: sentence.translation,
    wordIds: [...sentence.wordIds],
  })),
  comprehension: item.payload.comprehension.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: [...question.options],
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  })),
  releaseState: item.releaseState as ReleasedContentState,
  contentVersion,
});

export const projectRuntimeCatalog = (
  catalog: ItemCatalogArtifact,
): RuntimeCatalogArtifact => {
  const items = catalog.items as ContentCatalogItem[];
  assertUniqueItemKeys(items);
  const itemByKey = new Map(items.map((item) => [item.itemKey, item]));

  const lexemes = items.filter(
    (item): item is LexemeCatalogItem => item.itemType === "lexeme",
  );
  const lessons = items.filter(
    (item): item is LessonCatalogItem => item.itemType === "lesson",
  );
  const stories = items.filter(
    (item): item is GradedTextCatalogItem => item.itemType === "graded-text",
  );
  const lexemeById = indexById(lexemes, "lexeme");
  const lessonById = indexById(lessons, "lesson");
  const releasedLessons = lessons.filter((item) => isReleased(item.releaseState));
  const releasedStories = stories.filter((item) => isReleased(item.releaseState));
  const referencedLexemeIds = new Set<string>();

  const requireReleasedLexeme = (wordId: string, sourceKey: string) => {
    const lexeme = lexemeById.get(wordId);
    if (!lexeme || !isReleased(lexeme.releaseState)) {
      throw new Error(
        `Released item ${sourceKey} references missing or non-released lexeme ${wordId}`,
      );
    }
    referencedLexemeIds.add(wordId);
  };

  for (const lesson of releasedLessons) {
    for (const wordId of lesson.payload.wordIds) {
      requireReleasedLexeme(wordId, lesson.itemKey);
    }
    for (const prerequisite of lesson.prerequisites ?? []) {
      if (prerequisite.itemType !== "lesson") {
        throw new Error(
          `Released lesson ${lesson.itemId} has prerequisites the runtime schema cannot represent`,
        );
      }
      const prerequisiteLesson = lessonById.get(prerequisite.itemId);
      if (!prerequisiteLesson || !isReleased(prerequisiteLesson.releaseState)) {
        throw new Error(
          `Released lesson ${lesson.itemId} references missing or non-released lesson prerequisite ${prerequisite.itemId}`,
        );
      }
    }
    const impliedLessonIds = impliedLessonDependencies(itemByKey, lesson);
    const runtimeClosure = runtimeLessonPrerequisiteClosure(
      lessonById,
      lesson.itemId,
    );
    const unrepresentedLessonIds = [...impliedLessonIds].filter(
      (lessonId) => !runtimeClosure.has(lessonId),
    );
    if (unrepresentedLessonIds.length > 0) {
      throw new Error(
        `Released lesson ${lesson.itemId} has implied lesson prerequisites absent from the runtime graph: ${unrepresentedLessonIds.join(", ")}`,
      );
    }
  }

  for (const story of releasedStories) {
    if ((story.prerequisites ?? []).length > 0) {
      throw new Error(
        `Released graded text ${story.itemId} has prerequisites the runtime schema cannot represent`,
      );
    }
    for (const sentence of story.payload.sentences) {
      for (const wordId of sentence.wordIds) {
        requireReleasedLexeme(wordId, story.itemKey);
      }
    }
  }

  return {
    schemaVersion: 1,
    contentVersion: catalog.contentVersion,
    vocabulary: [...referencedLexemeIds]
      .map((itemId) => projectVocabularyItem(lexemeById.get(itemId)!))
      .sort(compareIds),
    lessons: releasedLessons
      .map((item) => projectLesson(item, catalog.contentVersion))
      .sort(compareIds),
    stories: releasedStories
      .map((item) => projectStory(item, catalog.contentVersion))
      .sort(compareIds),
  };
};
