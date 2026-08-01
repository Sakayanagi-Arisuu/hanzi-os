import hsk1LevelRichLessonContentJson from "../../content/runtime/hsk1-level-rich-lessons.json";
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

type RichLessonArtifact = typeof hsk1LevelRichLessonContentJson & {
  lessons: RichLessonContent[];
};

const artifact = hsk1LevelRichLessonContentJson as unknown as RichLessonArtifact;

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
  isLocallyAuthorized(artifact)
    ? artifact.lessons.map((lesson) => [lesson.lessonId, lesson] as const)
    : [],
);

export const RICH_LESSON_DISCLOSURE = hsk1LevelRichLessonContentJson.disclosure;

export const getRichLessonContent = (
  lessonId: string,
): RichLessonContent | null => lessonById.get(lessonId) ?? null;
