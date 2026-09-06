export const LEARNING_JOURNEY_RECEIPT_EVENT =
  "hanzi-os:learning-journey-receipt";

export type LearningJourneyReceiptEventDetail = {
  stage: "learn" | "review" | "transfer" | "close";
  source:
    | "lesson"
    | "review"
    | "mistakes"
    | "pronunciation"
    | "reader"
    | "writing"
    | "dictionary"
    | "assessment"
    | "path";
  lessonId?: string | null;
  activityId: string;
  occurredAt?: string;
};

export const emitLearningJourneyReceipt = (
  detail: LearningJourneyReceiptEventDetail,
) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LEARNING_JOURNEY_RECEIPT_EVENT, {
    detail,
  }));
};
