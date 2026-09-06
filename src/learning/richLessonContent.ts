import hsk1LevelRichLessonContentJson from "../../content/runtime/hsk1-level-rich-lessons.json";
import hsk2LevelRichLessonContentJson from "../../content/runtime/hsk2-level-rich-lessons.json";
import hsk3LevelRichLessonContentJson from "../../content/runtime/hsk3-level-rich-lessons.json";
import hsk4LevelRichLessonContentJson from "../../content/runtime/hsk4-level-rich-lessons.json";
import { CONTENT_VERSION } from "../data/curriculum";

export type RichDialogueTurn = {
  speaker: string;
  hanzi: string;
  pinyin: string;
  meaningVi: string;
};

export type RichGrammarPoint = {
  id: string;
  category: string;
  label: string;
  officialContent: string;
  explanationVi: string;
  modelExample: Omit<RichDialogueTurn, "speaker">;
  guidedPractice: {
    promptVi: string;
    modelAnswerHanzi: string;
    modelAnswerPinyin: string;
    modelAnswerMeaningVi: string;
  };
};

export type RichLessonTask = {
  id: string;
  titleVi: string;
  instructionVi: string;
  targetFunctions: string[];
  modelDialogue: RichDialogueTurn[];
};

export type RichLessonCharacter = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningVi: string;
  contextWord: string;
  contextPinyin: string;
  contextMeaningVi: string;
};

export type RichLessonContent = {
  lessonId: string;
  authoringLessonId: string;
  dialogue: RichDialogueTurn[];
  grammar: RichGrammarPoint[];
  topics: Array<{
    id: string;
    group: string;
    officialTopic: string;
    promptVi: string;
  }>;
  tasks: RichLessonTask[];
  characters: RichLessonCharacter[];
};

type RichLessonArtifact = {
  schemaVersion: number;
  contentVersion: string;
  state: string;
  disclosure: {
    reviewVi: string;
    audioVi: string;
    levelCheckVi: string;
  };
  policy: {
    learnerVisibleForPersonalLocalStudy: boolean;
    humanReviewed: boolean;
    measurementEligible: boolean;
    masteryEligible: boolean;
    productionEligible: boolean;
    sitesAuthorized: boolean;
  };
  lessons: RichLessonContent[];
};

const artifacts = [
  { level: "hsk1", artifact: hsk1LevelRichLessonContentJson },
  { level: "hsk2", artifact: hsk2LevelRichLessonContentJson },
  { level: "hsk3", artifact: hsk3LevelRichLessonContentJson },
  { level: "hsk4", artifact: hsk4LevelRichLessonContentJson },
] as unknown as Array<{
  level: "hsk1" | "hsk2" | "hsk3" | "hsk4";
  artifact: RichLessonArtifact;
}>;

const isLocallyAuthorized = (artifact: RichLessonArtifact) =>
  artifact.schemaVersion === 1
  && artifact.contentVersion === CONTENT_VERSION
  && artifact.state === "authorized-for-personal-local-study"
  && artifact.policy.learnerVisibleForPersonalLocalStudy === true
  && artifact.policy.humanReviewed === false
  && artifact.policy.measurementEligible === false
  && artifact.policy.masteryEligible === false
  && artifact.policy.productionEligible === false
  && artifact.policy.sitesAuthorized === false;

const lessonById = new Map(
  artifacts.flatMap(({ artifact }) => isLocallyAuthorized(artifact)
    ? artifact.lessons.map((lesson) => [lesson.lessonId, lesson] as const)
    : []),
);

export type ReleasedCharacterPracticeEntry = RichLessonCharacter & {
  level: "hsk0" | "hsk1" | "hsk2" | "hsk3" | "hsk4";
  lessonId: string;
};

/**
 * Recognition metadata already authorized for the learner-facing rich lesson
 * runtime. It deliberately carries no stroke paths and produces no mastery
 * evidence; stroke data remains behind its own provenance/release gate.
 */
export const RELEASED_CHARACTER_PRACTICE = artifacts.flatMap(({
  level,
  artifact,
}) => isLocallyAuthorized(artifact)
  ? artifact.lessons.flatMap((lesson) => lesson.characters.map((character) => ({
      ...character,
      level,
      lessonId: lesson.lessonId,
    })))
  : []);

export const RELEASED_RICH_LESSONS = artifacts.flatMap(({ level, artifact }) =>
  isLocallyAuthorized(artifact)
    ? artifact.lessons.map((lesson) => ({ ...lesson, level }))
    : []
);

export const RICH_LESSON_DISCLOSURE = {
  ...hsk1LevelRichLessonContentJson.disclosure,
  reviewVi:
    "Bài tự học này được AI hỗ trợ biên soạn và rà soát; chưa qua thẩm định của giáo viên hoặc người bản ngữ.",
};

export const getRichLessonContent = (
  lessonId: string,
): RichLessonContent | null => lessonById.get(lessonId) ?? null;
