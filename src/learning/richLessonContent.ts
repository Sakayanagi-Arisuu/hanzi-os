import hsk1LevelRichLessonContentJson from "../../content/runtime/hsk1-level-rich-lessons.json";
import hsk2LevelRichLessonContentJson from "../../content/runtime/hsk2-level-rich-lessons.json";
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
  hsk1LevelRichLessonContentJson,
  hsk2LevelRichLessonContentJson,
] as unknown as RichLessonArtifact[];

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
  artifacts.flatMap((artifact) => isLocallyAuthorized(artifact)
    ? artifact.lessons.map((lesson) => [lesson.lessonId, lesson] as const)
    : []),
);

export const RICH_LESSON_DISCLOSURE = {
  ...hsk1LevelRichLessonContentJson.disclosure,
  reviewVi:
    "Nội dung được Codex rà soát bằng AI cho mục đích tự học local; humanReviewed=false.",
};

export const getRichLessonContent = (
  lessonId: string,
): RichLessonContent | null => lessonById.get(lessonId) ?? null;
