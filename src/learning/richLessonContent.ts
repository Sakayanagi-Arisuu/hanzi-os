import dailyLifeRichLessonContentJson from "../../content/runtime/hsk1-daily-life-rich-lessons.json";
import timePlaceRichLessonContentJson from "../../content/runtime/hsk1-time-place-events-rich-lessons.json";

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
};

type RichLessonArtifact = typeof timePlaceRichLessonContentJson & {
  lessons: RichLessonContent[];
};

const artifacts = [
  timePlaceRichLessonContentJson,
  dailyLifeRichLessonContentJson,
] as unknown as RichLessonArtifact[];

const isLocallyAuthorized = (artifact: RichLessonArtifact) =>
  artifact.schemaVersion === 1
  && artifact.contentVersion === "foundation-2026.07.8"
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

export const RICH_LESSON_DISCLOSURE = timePlaceRichLessonContentJson.disclosure;

export const getRichLessonContent = (
  lessonId: string,
): RichLessonContent | null => lessonById.get(lessonId) ?? null;
