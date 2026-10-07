import hsk4RichJson from "../../content/runtime/hsk4-level-rich-lessons.json";
import { CONTENT_VERSION } from "../data/curriculum";
import type { RichLessonContent } from "../learning/richLessonContent";

type PremiumRichArtifact = {
  schemaVersion: number;
  contentVersion: string;
  state: string;
  policy: {
    learnerVisibleForPersonalLocalStudy: boolean;
    humanReviewed: boolean;
    productionEligible: boolean;
  };
  lessons: RichLessonContent[];
};

const artifact = hsk4RichJson as unknown as PremiumRichArtifact;

/** Server-side source for the existing HSK4 lesson IDs; never import this from a client module. */
export function getPremiumRichLesson(lessonId: string): RichLessonContent | null {
  if (
    artifact.schemaVersion !== 1
    || artifact.contentVersion !== CONTENT_VERSION
    || artifact.state !== "authorized-for-personal-local-study"
    || !artifact.policy.learnerVisibleForPersonalLocalStudy
    || artifact.policy.humanReviewed
    || artifact.policy.productionEligible
  ) return null;
  return artifact.lessons.find(lesson => lesson.lessonId === lessonId) ?? null;
}

export function listPremiumRichLessons(): readonly RichLessonContent[] {
  return getPremiumRichLesson(artifact.lessons[0]?.lessonId ?? "") ? artifact.lessons : [];
}
