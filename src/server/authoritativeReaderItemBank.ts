import { CONTENT_VERSION } from "../data/curriculum";
import {
  READER_METHOD,
  READER_SESSION_FORM_SCHEMA_VERSION,
  READER_SKILL,
  isExactReaderSessionFormV1,
  type ReaderSessionFormItemV1,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import {
  readerPolicyAllowsMastery,
  type ReaderAnswerExposure,
  type ReaderScript,
  type ReaderSupportMode,
} from "../reader/protocolSupport";

export const READER_SUPPORT_POLICY_VERSION =
  "reader-support-exposure-v1";

export type AuthoritativeReaderReviewStatus =
  | "pending"
  | "approved"
  | "rejected";

export type AuthoritativeReaderItem = {
  id: string;
  itemVersion: string;
  contentVersion: string;
  exposureGroupId: string;
  equivalentGroupId: string;
  reviewStatus: AuthoritativeReaderReviewStatus;
  answerExposure: ReaderAnswerExposure;
  chineseStimulus: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
};

export type AuthoritativeReaderStory = {
  id: string;
  storyVersion: string;
  formVersion: string;
  contentVersion: string;
  releaseState: "review" | "beta" | "published" | "retired";
  reviewStatus: AuthoritativeReaderReviewStatus;
  script: ReaderScript;
  supportPolicyVersion: string;
  items: readonly AuthoritativeReaderItem[];
};

const currentPendingReaderItem = (
  value: Omit<
    AuthoritativeReaderItem,
    | "itemVersion"
    | "contentVersion"
    | "exposureGroupId"
    | "equivalentGroupId"
    | "reviewStatus"
    | "answerExposure"
  >,
): AuthoritativeReaderItem => ({
  ...value,
  itemVersion: `${CONTENT_VERSION}:reader-item:${value.id}:1`,
  contentVersion: CONTENT_VERSION,
  exposureGroupId: `reader:first-day:${value.id}`,
  equivalentGroupId: `reader:first-day:${value.id}`,
  reviewStatus: "pending",
  answerExposure: "public-client",
});

/**
 * Current server candidates deliberately remain unavailable. Their linguistic
 * review is pending and their historical answer material was public-client,
 * so relabelling only one of those fields can never make the form issuable.
 */
export const CURRENT_AUTHORITATIVE_READER_STORIES:
readonly AuthoritativeReaderStory[] = [
  {
    id: "first-day",
    storyVersion: `${CONTENT_VERSION}:reader-story:first-day:1`,
    formVersion: `${CONTENT_VERSION}:reader-form:first-day:1`,
    contentVersion: CONTENT_VERSION,
    releaseState: "beta",
    reviewStatus: "pending",
    script: "simplified",
    supportPolicyVersion: READER_SUPPORT_POLICY_VERSION,
    items: [
      currentPendingReaderItem({
        id: "first-day-main-idea",
        chineseStimulus:
          "今天是中文课的第一天。王老师问学生是不是越南人，学生回答以后收到一本书并向老师道谢。",
        prompt: "Nguoi ke da lam gi trong ngay dau den lop?",
        options: [
          "Tu gioi thieu va cam on giao vien.",
          "Hoi duong roi mua mot quyen sach.",
          "Tu gioi thieu minh la giao vien.",
        ],
        correctAnswer: "Tu gioi thieu va cam on giao vien.",
      }),
    ],
  },
] as const;

export type AuthoritativeReaderSelection =
  | {
      kind: "selected";
      story: AuthoritativeReaderStory;
      items: AuthoritativeReaderItem[];
      form: ReaderSessionFormV1;
    }
  | {
      kind: "unavailable";
      reason:
        | "story-not-found"
        | "story-not-issuable"
        | "story-already-exposed";
    };

export const readerAnswersMatch = (
  selected: string,
  expected: string,
) => selected.normalize("NFC").trim() === expected.normalize("NFC").trim();

export const readerPresentationForItem = (
  item: AuthoritativeReaderItem,
  position: number,
  supportMode: ReaderSupportMode,
  priorExposure: boolean,
): ReaderSessionFormItemV1 => ({
  position,
  itemId: item.id,
  itemVersion: item.itemVersion,
  method: READER_METHOD,
  skill: READER_SKILL,
  chineseStimulus: item.chineseStimulus,
  prompt: item.prompt,
  options: [...item.options],
  answerExposure: item.answerExposure,
  priorExposure,
  masteryEligible: readerPolicyAllowsMastery({
    supportMode,
    answerExposure: item.answerExposure,
    priorExposure,
  }),
});

const isReleased = (story: AuthoritativeReaderStory) =>
  story.releaseState === "beta" || story.releaseState === "published";

const hasUniqueReaderAuthority = (story: AuthoritativeReaderStory) => {
  const itemIds = story.items.map((item) => item.id);
  const itemVersions = story.items.map((item) => item.itemVersion);
  const exposureGroups = story.items.map((item) => item.exposureGroupId);
  const equivalentGroups = story.items.map((item) => item.equivalentGroupId);
  return new Set(itemIds).size === itemIds.length
    && new Set(itemVersions).size === itemVersions.length
    && new Set(exposureGroups).size === exposureGroups.length
    && new Set(equivalentGroups).size === equivalentGroups.length;
};

export const isIssuableAuthoritativeReaderStory = (
  story: AuthoritativeReaderStory,
) => {
  if (
    story.contentVersion !== CONTENT_VERSION
    || !isReleased(story)
    || story.reviewStatus !== "approved"
    || story.supportPolicyVersion !== READER_SUPPORT_POLICY_VERSION
    || story.items.length < 1
    || !hasUniqueReaderAuthority(story)
  ) return false;

  const form: ReaderSessionFormV1 = {
    formSchemaVersion: READER_SESSION_FORM_SCHEMA_VERSION,
    storyId: story.id,
    storyVersion: story.storyVersion,
    formVersion: story.formVersion,
    script: story.script,
    supportMode: "unassisted",
    supportPolicyVersion: story.supportPolicyVersion,
    items: story.items.map((item, position) =>
      readerPresentationForItem(item, position, "unassisted", false)
    ),
  };
  return story.items.every((item) =>
    item.contentVersion === CONTENT_VERSION
    && item.reviewStatus === "approved"
    && item.answerExposure === "server-confidential"
    && item.exposureGroupId.length > 0
    && item.exposureGroupId.length <= 240
    && item.equivalentGroupId.length > 0
    && item.equivalentGroupId.length <= 240
    && typeof item.correctAnswer === "string"
    && item.correctAnswer.length > 0
    && item.correctAnswer.length <= 2_000
    && item.options.some((option) =>
      readerAnswersMatch(option, item.correctAnswer)
    )
  ) && isExactReaderSessionFormV1(form, story.items.length);
};

export const selectAuthoritativeReaderForm = ({
  bank,
  storyId,
  script,
  supportMode,
  exposedGroups,
  exposedEquivalentGroups,
}: {
  bank: readonly AuthoritativeReaderStory[];
  storyId: string;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  exposedGroups: ReadonlySet<string>;
  exposedEquivalentGroups: ReadonlySet<string>;
}): AuthoritativeReaderSelection => {
  const story = bank.find((candidate) =>
    candidate.id === storyId && candidate.script === script
  );
  if (!story) return { kind: "unavailable", reason: "story-not-found" };
  if (!isIssuableAuthoritativeReaderStory(story)) {
    return { kind: "unavailable", reason: "story-not-issuable" };
  }
  const wasPreviouslyExposed = (item: AuthoritativeReaderItem) =>
    exposedGroups.has(item.exposureGroupId)
    || exposedEquivalentGroups.has(item.equivalentGroupId);
  if (
    supportMode === "unassisted"
    && story.items.some(wasPreviouslyExposed)
  ) {
    return { kind: "unavailable", reason: "story-already-exposed" };
  }

  const items = [...story.items];
  const form: ReaderSessionFormV1 = {
    formSchemaVersion: READER_SESSION_FORM_SCHEMA_VERSION,
    storyId: story.id,
    storyVersion: story.storyVersion,
    formVersion: story.formVersion,
    script: story.script,
    supportMode,
    supportPolicyVersion: story.supportPolicyVersion,
    items: items.map((item, position) =>
      readerPresentationForItem(
        item,
        position,
        supportMode,
        wasPreviouslyExposed(item),
      )
    ),
  };
  if (!isExactReaderSessionFormV1(form, items.length)) {
    return { kind: "unavailable", reason: "story-not-issuable" };
  }
  return { kind: "selected", story, items, form };
};

export const authoritativeReaderItemByVersion = (
  bank: readonly AuthoritativeReaderStory[],
) => new Map(
  bank.flatMap((story) =>
    story.items.map((item) => [
      item.itemVersion,
      { story, item },
    ] as const)
  ),
);
