import { LESSON_BY_ID, RELEASED_LESSONS } from "../data/curriculum";
import type { LessonGuide } from "../data/lessonGuides";
import type {
  RichDialogueTurn,
  RichGrammarPoint,
  RichLessonContent,
  RichLessonTask,
} from "../learning/richLessonContent";
import type { Lesson } from "../types";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";
import {
  publishedRuntimeHeader,
  publishedRuntimeItems,
  runtimeRecord as isRecord,
  runtimeReviewPassed as reviewPassed,
  runtimeText as text,
  runtimeTriple as triple,
  type PublishedStudioLevel as StudioLevel,
  type PublishedStudioTriple as LessonTriple,
} from "./publishedStudioRuntimeContract";

type LessonExercise = LessonTriple & {
  promptVi: string;
  answer: string;
  answerPinyin: string;
  answerMeaningVi: string;
  distractors: string[];
  explanationVi: string;
};

type PublishedLessonRuntimeItem = {
  stableKey: string;
  itemType: "lesson";
  level: StudioLevel;
  title: string;
  revision: number;
  revisionId: string;
  schemaVersion: 1;
  contentSha256: string;
  publishedAt: number;
  content: {
    targetLessonId: string;
    titleZh: string;
    objectiveVi: string;
    conceptVi: string;
    ruleVi: string;
    pitfallVi: string;
    checkpointVi: string;
    prerequisites: string[];
    vocabulary: string[];
    skills: string[];
    dialogue: LessonTriple[];
    grammar: Array<{ pattern: string; explanationVi: string }>;
    exercises: LessonExercise[];
    review: {
      humanReviewed: false;
      aiSelfReview: Record<"accuracy" | "levelFit" | "pedagogy" | "answerIntegrity" | "originality", true>;
    };
  };
};

export type PublishedStudioLesson = {
  lesson: Lesson;
  guide: LessonGuide;
  richContent: RichLessonContent;
  source: {
    stableKey: string;
    revision: number;
    revisionId: string;
    contentSha256: string;
    publishedAt: number;
  };
};

export type PublishedStudioLessonEnhancement = {
  dialogue: RichDialogueTurn[];
  grammar: RichGrammarPoint[];
  topics: RichLessonContent["topics"];
  tasks: RichLessonTask[];
};

export type PublishedStudioLearningProjection = {
  lessons: ReadonlyMap<string, PublishedStudioLesson>;
  enhancements: ReadonlyMap<string, PublishedStudioLessonEnhancement>;
};

const releasedLessonIds = new Set(RELEASED_LESSONS.map((lesson) => lesson.id));
const learningSkills = new Set([
  "pronunciation", "listening", "speaking", "reading", "writing", "vocabulary", "grammar",
]);

const uniqueStrings = (value: unknown, minimum = 0, allowed?: ReadonlySet<string>) =>
  Array.isArray(value)
  && value.length >= minimum
  && value.every((entry) => text(entry, 240) && (!allowed || allowed.has(entry)))
  && new Set(value).size === value.length;

const exactList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

const linkedLessons = (value: unknown, level: unknown) => Array.isArray(value)
  && value.length > 0
  && new Set(value).size === value.length
  && value.every((lessonId) => {
    const lesson = typeof lessonId === "string" ? LESSON_BY_ID.get(lessonId) : null;
    return Boolean(lesson && studioLessonMatchesLevel(lesson.unitId, level as StudioLevel));
  });

const parseItem = (value: unknown): PublishedLessonRuntimeItem | null => {
  const header = publishedRuntimeHeader(value, "lesson");
  if (!header) return null;
  const { item, content, level } = header;
  const lesson = text(content.targetLessonId, 240)
    ? LESSON_BY_ID.get(content.targetLessonId)
    : undefined;
  const dialogue = Array.isArray(content.dialogue) ? content.dialogue : [];
  const grammar = Array.isArray(content.grammar) ? content.grammar : [];
  const exercises = Array.isArray(content.exercises) ? content.exercises : [];
  if (
    !lesson
    || !releasedLessonIds.has(lesson.id)
    || !studioLessonMatchesLevel(lesson.unitId, level)
    || !text(content.titleZh, 120)
    || !/\p{Script=Han}/u.test(content.titleZh)
    || !text(content.objectiveVi, 1_200)
    || !text(content.conceptVi, 1_200)
    || !text(content.ruleVi, 2_400)
    || !text(content.pitfallVi, 1_200)
    || !text(content.checkpointVi, 1_200)
    || !uniqueStrings(content.prerequisites, 0, releasedLessonIds)
    || !uniqueStrings(content.vocabulary, 1)
    || !uniqueStrings(content.skills, 1, learningSkills)
    || !exactList(content.prerequisites as string[], lesson.prerequisiteIds)
    || !exactList(content.vocabulary as string[], lesson.wordIds)
    || !exactList(content.skills as string[], lesson.skills)
    || dialogue.length < 2
    || !dialogue.every(triple)
    || grammar.length < 1
    || !grammar.every((entry) => isRecord(entry)
      && text(entry.pattern, 240)
      && text(entry.explanationVi, 2_400))
    || exercises.length < 1
    || !exercises.every((entry) => isRecord(entry)
      && text(entry.promptVi, 1_200)
      && text(entry.answer, 600)
      && text(entry.answerPinyin, 1_200)
      && text(entry.answerMeaningVi, 1_200)
      && Array.isArray(entry.distractors)
      && entry.distractors.length >= 2
      && entry.distractors.every((candidate) => text(candidate, 1_000))
      && new Set([entry.answer, ...entry.distractors]).size === entry.distractors.length + 1
      && text(entry.explanationVi, 2_400))
    || !reviewPassed(content.review)
  ) return null;
  return item as unknown as PublishedLessonRuntimeItem;
};

const projectItem = (item: PublishedLessonRuntimeItem): PublishedStudioLesson => {
  const core = LESSON_BY_ID.get(item.content.targetLessonId)!;
  const examples = item.content.dialogue.slice(0, 3).map((entry) => ({
    chinese: entry.hanzi.trim(),
    pinyin: entry.pinyin.trim(),
    meaning: entry.meaningVi.trim(),
  }));
  const dialogue = item.content.dialogue.map((entry, index) => ({
    speaker: index % 2 === 0 ? "A" : "B",
    hanzi: entry.hanzi.trim(),
    pinyin: entry.pinyin.trim(),
    meaningVi: entry.meaningVi.trim(),
  }));
  const grammar = item.content.grammar.map((entry, index) => {
    const model = dialogue[index % dialogue.length];
    const practice = item.content.exercises[index % item.content.exercises.length];
    return {
      id: `${item.revisionId}:grammar:${index + 1}`,
      category: "BIÊN TẬP VIỆN",
      label: entry.pattern.trim(),
      officialContent: entry.pattern.trim(),
      explanationVi: entry.explanationVi.trim(),
      modelExample: {
        hanzi: model.hanzi,
        pinyin: model.pinyin,
        meaningVi: model.meaningVi,
      },
      guidedPractice: {
        promptVi: practice.promptVi.trim(),
        modelAnswerHanzi: practice.answer.trim(),
        modelAnswerPinyin: practice.answerPinyin.trim(),
        modelAnswerMeaningVi: practice.answerMeaningVi.trim(),
      },
    };
  });
  return {
    lesson: {
      ...core,
      title: item.title.trim(),
      chineseTitle: item.content.titleZh.trim(),
      objective: item.content.objectiveVi.trim(),
    },
    guide: {
      concept: item.content.conceptVi.trim(),
      rule: item.content.ruleVi.trim(),
      examples,
      pitfall: item.content.pitfallVi.trim(),
      checkpoint: item.content.checkpointVi.trim(),
    },
    richContent: {
      lessonId: core.id,
      authoringLessonId: item.stableKey,
      dialogue,
      grammar,
      topics: [{
        id: `${item.revisionId}:objective`,
        group: "MỤC TIÊU BÀI HỌC",
        officialTopic: item.title.trim(),
        promptVi: item.content.objectiveVi.trim(),
      }],
      tasks: item.content.exercises.map((exercise, index) => ({
        id: `${item.revisionId}:practice:${index + 1}`,
        titleVi: exercise.promptVi.trim(),
        instructionVi: exercise.explanationVi.trim(),
        targetFunctions: [],
        modelDialogue: [{
          speaker: "Mẫu",
          hanzi: exercise.answer.trim(),
          pinyin: exercise.answerPinyin.trim(),
          meaningVi: exercise.answerMeaningVi.trim(),
        }],
      })),
      characters: [],
    },
    source: {
      stableKey: item.stableKey,
      revision: item.revision,
      revisionId: item.revisionId,
      contentSha256: item.contentSha256,
      publishedAt: item.publishedAt,
    },
  };
};

export const parsePublishedStudioLessons = (value: unknown) => {
  const parsed = publishedRuntimeItems(value).map(parseItem);
  if (parsed.some((item) => item === null)) {
    throw new TypeError("Published lesson runtime contains an invalid item.");
  }
  const projected = (parsed as PublishedLessonRuntimeItem[]).map(projectItem);
  const targetIds = projected.map((entry) => entry.lesson.id);
  if (new Set(targetIds).size !== targetIds.length) {
    throw new TypeError("Published lesson runtime contains duplicate target lessons.");
  }
  return new Map(projected.map((entry) => [entry.lesson.id, entry]));
};

const emptyEnhancement = (): PublishedStudioLessonEnhancement => ({
  dialogue: [],
  grammar: [],
  topics: [],
  tasks: [],
});

const parseGrammarEnhancement = (value: unknown) => {
  const header = publishedRuntimeHeader(value, "grammar");
  if (!header) return null;
  const { item, content, level } = header;
  const examples = Array.isArray(content.examples) ? content.examples : [];
  if (
    !text(content.pattern, 240)
    || !text(content.explanationVi, 2_400)
    || !text(content.pitfallVi, 1_200)
    || !text(content.checkpointVi, 1_200)
    || examples.length < 1
    || !examples.every(triple)
    || !linkedLessons(content.sourceLessonIds, level)
    || !reviewPassed(content.review)
  ) return null;
  const model = examples[0] as LessonTriple;
  const point: RichGrammarPoint = {
    id: `${String(item.revisionId)}:grammar`,
    category: "BIÊN TẬP VIỆN",
    label: String(content.pattern).trim(),
    officialContent: String(content.pattern).trim(),
    explanationVi: `${String(content.explanationVi).trim()} Lỗi thường gặp: ${String(content.pitfallVi).trim()}`,
    modelExample: {
      hanzi: model.hanzi.trim(),
      pinyin: model.pinyin.trim(),
      meaningVi: model.meaningVi.trim(),
    },
    guidedPractice: {
      promptVi: String(content.checkpointVi).trim(),
      modelAnswerHanzi: model.hanzi.trim(),
      modelAnswerPinyin: model.pinyin.trim(),
      modelAnswerMeaningVi: model.meaningVi.trim(),
    },
  };
  return {
    lessonIds: content.sourceLessonIds as string[],
    dialogue: examples.map((example, index) => ({
      speaker: `Mẫu ${index + 1}`,
      hanzi: (example as LessonTriple).hanzi.trim(),
      pinyin: (example as LessonTriple).pinyin.trim(),
      meaningVi: (example as LessonTriple).meaningVi.trim(),
    })),
    point,
  };
};

const parseCommunicativeEnhancement = (value: unknown) => {
  const header = publishedRuntimeHeader(value, "communicative_function");
  if (!header) return null;
  const { item, content, level } = header;
  const dialogue = Array.isArray(content.dialogue) ? content.dialogue : [];
  const tasks = Array.isArray(content.tasks) ? content.tasks : [];
  if (
    !text(content.functionVi, 600)
    || !text(content.scenarioVi, 1_200)
    || !text(content.outcomeVi, 1_200)
    || !uniqueStrings(content.skills, 1, new Set(["listening", "speaking", "reading"]))
    || !linkedLessons(content.sourceLessonIds, level)
    || dialogue.length < 2
    || !dialogue.every(triple)
    || tasks.length < 1
    || !tasks.every((task) => isRecord(task)
      && text(task.promptVi, 1_200)
      && text(task.answer, 1_200)
      && text(task.explanationVi, 2_400))
    || !reviewPassed(content.review)
  ) return null;
  const turns = dialogue.map((entry, index) => ({
    speaker: index % 2 === 0 ? "A" : "B",
    hanzi: (entry as LessonTriple).hanzi.trim(),
    pinyin: (entry as LessonTriple).pinyin.trim(),
    meaningVi: (entry as LessonTriple).meaningVi.trim(),
  }));
  return {
    lessonIds: content.sourceLessonIds as string[],
    dialogue: turns,
    topic: {
      id: `${String(item.revisionId)}:topic`,
      group: "NHIỆM VỤ GIAO TIẾP",
      officialTopic: String(content.functionVi).trim(),
      promptVi: `${String(content.scenarioVi).trim()} ${String(content.outcomeVi).trim()}`,
    },
    tasks: tasks.map((task, index) => ({
      id: `${String(item.revisionId)}:task:${index + 1}`,
      titleVi: String((task as Record<string, unknown>).promptVi).trim(),
      instructionVi: String((task as Record<string, unknown>).explanationVi).trim(),
      targetFunctions: [...content.skills as string[]],
      modelDialogue: turns,
    })),
  };
};

export const parsePublishedStudioLearning = (value: unknown): PublishedStudioLearningProjection => {
  const items = publishedRuntimeItems(value);
  const lessonItems = items.filter((item) => isRecord(item) && item.itemType === "lesson");
  const lessons = parsePublishedStudioLessons({
    schemaVersion: 1,
    policy: "published-only",
    releaseBoundary: "content-release-worker-v1",
    items: lessonItems,
  });
  const grammarItems = items
    .filter((item) => isRecord(item) && item.itemType === "grammar")
    .map(parseGrammarEnhancement);
  const communicativeItems = items
    .filter((item) => isRecord(item) && item.itemType === "communicative_function")
    .map(parseCommunicativeEnhancement);
  if (grammarItems.some((item) => item === null) || communicativeItems.some((item) => item === null)) {
    throw new TypeError("Published learning runtime contains an invalid enhancement.");
  }
  const enhancements = new Map<string, PublishedStudioLessonEnhancement>();
  for (const item of grammarItems as NonNullable<ReturnType<typeof parseGrammarEnhancement>>[]) {
    for (const lessonId of item.lessonIds) {
      const current = enhancements.get(lessonId) ?? emptyEnhancement();
      enhancements.set(lessonId, {
        ...current,
        dialogue: [...current.dialogue, ...item.dialogue],
        grammar: [...current.grammar, item.point],
      });
    }
  }
  for (const item of communicativeItems as NonNullable<ReturnType<typeof parseCommunicativeEnhancement>>[]) {
    for (const lessonId of item.lessonIds) {
      const current = enhancements.get(lessonId) ?? emptyEnhancement();
      enhancements.set(lessonId, {
        ...current,
        dialogue: [...current.dialogue, ...item.dialogue],
        topics: [...current.topics, item.topic],
        tasks: [...current.tasks, ...item.tasks],
      });
    }
  }
  return { lessons, enhancements };
};
