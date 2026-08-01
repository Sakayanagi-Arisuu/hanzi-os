import { CONTENT_VERSION } from "../data/curriculum";
import {
  isExactAssessmentFormItemV1,
  isExactAssessmentFormV1,
  type AssessmentFormItemV1,
  type AssessmentFormV1,
  type AssessmentItemModality,
} from "../assessment/assessmentSessionProtocol";
import type { Skill } from "../types";

export const FOUNDATION_ASSESSMENT_BLUEPRINT_ID =
  "foundation-screening-server-v1";
export const FOUNDATION_ASSESSMENT_FORM_VERSION =
  `${CONTENT_VERSION}:assessment-foundation-server:1`;
export const FOUNDATION_ASSESSMENT_SCORING_POLICY_VERSION =
  "foundation-observed-wilson-95:1";

export type AuthoritativeAssessmentReviewStatus =
  | "pending"
  | "approved"
  | "rejected";

export type AuthoritativeAssessmentCalibrationStatus =
  | "uncalibrated"
  | "calibrated";

export type AuthoritativeAssessmentItem = {
  id: string;
  itemVersion: string;
  contentVersion: string;
  skill: Skill;
  construct: string;
  modality: AssessmentItemModality;
  equivalentGroupId: string;
  exposureGroupId: string;
  formFamilyId: string;
  reviewStatus: AuthoritativeAssessmentReviewStatus;
  calibrationStatus: AuthoritativeAssessmentCalibrationStatus;
  answerExposure: "public-client" | "server-confidential";
  difficulty: number | null;
  discrimination: number | null;
  measurementEligible: boolean;
  prompt: string;
  meta: string;
  options: string[];
  correctAnswer: string;
  stimulusText?: string;
};

export type AuthoritativeAssessmentBlueprint = {
  id: string;
  formVersion: string;
  formFamilyId: string;
  scoringPolicyVersion: string;
  itemCount: number;
  skillTargets: Partial<Record<Skill, number>>;
  requiredReviewStatus: "approved";
};

export const FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT = {
  id: FOUNDATION_ASSESSMENT_BLUEPRINT_ID,
  formVersion: FOUNDATION_ASSESSMENT_FORM_VERSION,
  formFamilyId: "foundation-screening-server",
  scoringPolicyVersion: FOUNDATION_ASSESSMENT_SCORING_POLICY_VERSION,
  itemCount: 10,
  skillTargets: {
    pronunciation: 2,
    listening: 1,
    reading: 3,
    vocabulary: 2,
    grammar: 2,
  },
  requiredReviewStatus: "approved",
} as const satisfies AuthoritativeAssessmentBlueprint;

const pendingItem = (
  value: Omit<
    AuthoritativeAssessmentItem,
    | "itemVersion"
    | "contentVersion"
    | "equivalentGroupId"
    | "exposureGroupId"
    | "formFamilyId"
    | "reviewStatus"
    | "calibrationStatus"
    | "answerExposure"
    | "difficulty"
    | "discrimination"
  >,
): AuthoritativeAssessmentItem => ({
  ...value,
  itemVersion: `${CONTENT_VERSION}:server-assessment-item:${value.id}:1`,
  contentVersion: CONTENT_VERSION,
  equivalentGroupId: `foundation-server:${value.id}`,
  exposureGroupId: `foundation-server:${value.id}`,
  formFamilyId: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT.formFamilyId,
  reviewStatus: "pending",
  calibrationStatus: "uncalibrated",
  answerExposure: "public-client",
  difficulty: null,
  discrimination: null,
});

/**
 * Server-only candidates. They intentionally do not import or share identity
 * with the answer-bearing anonymous compatibility form in `src/data`.
 * Every candidate is pending review, so the default production selector has
 * zero issuable items and must fail closed.
 */
export const CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS:
readonly AuthoritativeAssessmentItem[] = [
  pendingItem({ id: "meaning-ni", skill: "vocabulary", construct: "word-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "你", meta: "Chọn nghĩa", options: ["tôi", "bạn", "giáo viên", "người"], correctAnswer: "bạn" }),
  pendingItem({ id: "pinyin-hao", skill: "pronunciation", construct: "pinyin-tone-recognition", modality: "visual-selection", measurementEligible: true, prompt: "好", meta: "Chọn pinyin", options: ["hāo", "háo", "hǎo", "hào"], correctAnswer: "hǎo" }),
  pendingItem({ id: "reading-student", skill: "reading", construct: "sentence-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "我是学生。", meta: "Chọn nghĩa câu", options: ["Tôi là sinh viên.", "Bạn là giáo viên.", "Tôi không khỏe.", "Đây là sách."], correctAnswer: "Tôi là sinh viên." }),
  pendingItem({ id: "grammar-ma", skill: "grammar", construct: "question-particle-recognition", modality: "visual-selection", measurementEligible: true, prompt: "你是老师___？", meta: "Chọn từ hoàn thiện câu hỏi", options: ["不", "吗", "有", "人"], correctAnswer: "吗" }),
  pendingItem({ id: "tone-bu", skill: "pronunciation", construct: "lexical-tone-recognition", modality: "visual-selection", measurementEligible: true, prompt: "bù", meta: "不 mang thanh từ điển nào?", options: ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"], correctAnswer: "Thanh 4" }),
  pendingItem({ id: "reading-nationality", skill: "reading", construct: "sentence-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "我是越南人。", meta: "Câu này nói điều gì?", options: ["Tôi đến Trung Quốc.", "Tôi là người Việt Nam.", "Nhà tôi có người.", "Tôi học tiếng Việt."], correctAnswer: "Tôi là người Việt Nam." }),
  pendingItem({ id: "grammar-de", skill: "grammar", construct: "possessive-structure-recognition", modality: "visual-selection", measurementEligible: true, prompt: "我的书", meta: "Chọn cấu trúc", options: ["sách đọc tôi", "tôi là sách", "sách của tôi", "tôi có ba sách"], correctAnswer: "sách của tôi" }),
  pendingItem({ id: "meaning-three-people", skill: "vocabulary", construct: "phrase-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "三个人", meta: "Chọn nghĩa", options: ["một gia đình", "hai giáo viên", "ba người", "ba quyển sách"], correctAnswer: "ba người" }),
  pendingItem({ id: "listening-xiexie", skill: "listening", construct: "phrase-identification", modality: "synthetic-tts-selection", measurementEligible: false, prompt: "Nghe và chọn cụm đúng", meta: "Listening practice · synthetic TTS", options: ["你好", "谢谢", "再见", "老师"], correctAnswer: "谢谢", stimulusText: "谢谢" }),
  pendingItem({ id: "reading-tea-response", skill: "reading", construct: "contextual-response-recognition", modality: "visual-selection", measurementEligible: true, prompt: "你喝茶吗？", meta: "Chọn phản hồi phù hợp", options: ["是，我喝茶。", "我是茶。", "三个人。", "老师的书。"], correctAnswer: "是，我喝茶。" }),
] as const;

export type AuthoritativeAssessmentSelection =
  | {
      kind: "selected";
      items: AuthoritativeAssessmentItem[];
      form: AssessmentFormV1;
    }
  | {
      kind: "insufficient-bank";
      availableItemCount: number;
      requiredItemCount: number;
      missingBySkill: Partial<Record<Skill, number>>;
    };

export type AssessmentRandomSource = () => number;

const shuffled = <T>(items: readonly T[], random: AssessmentRandomSource) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new Error("Assessment form randomness is invalid.");
    }
    const swapIndex = Math.floor(sample * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
};

export const isIssuableAuthoritativeAssessmentItem = (
  item: AuthoritativeAssessmentItem,
  blueprint: AuthoritativeAssessmentBlueprint,
) => item.contentVersion === CONTENT_VERSION
  && item.formFamilyId === blueprint.formFamilyId
  && item.reviewStatus === blueprint.requiredReviewStatus
  && item.answerExposure === "server-confidential"
  && item.calibrationStatus === "uncalibrated"
  && item.difficulty === null
  && item.discrimination === null
  && item.exposureGroupId.length > 0
  && item.equivalentGroupId.length > 0
  && isExactAssessmentFormItemV1(
    assessmentPresentationForItem(item, 0),
    0,
  )
  && typeof item.correctAnswer === "string"
  && item.correctAnswer.length > 0
  && item.correctAnswer.length <= 500
  && item.options.some((option) =>
    assessmentAnswersMatch(option, item.correctAnswer)
  )
  && (
    item.modality === "synthetic-tts-selection"
      ? item.measurementEligible === false
        && typeof item.stimulusText === "string"
        && item.stimulusText.length > 0
      : item.stimulusText === undefined
  );

export const assessmentPresentationForItem = (
  item: AuthoritativeAssessmentItem,
  position: number,
): AssessmentFormItemV1 => ({
  position,
  itemId: item.id,
  itemVersion: item.itemVersion,
  skill: item.skill,
  construct: item.construct,
  modality: item.modality,
  measurementEligible: item.measurementEligible,
  prompt: item.prompt,
  meta: item.meta,
  options: [...item.options],
  ...(item.stimulusText === undefined
    ? {}
    : { stimulusText: item.stimulusText }),
});

export const selectAuthoritativeAssessmentForm = ({
  bank,
  blueprint,
  exposedGroups,
  exposedEquivalentGroups = new Set<string>(),
  random,
}: {
  bank: readonly AuthoritativeAssessmentItem[];
  blueprint: AuthoritativeAssessmentBlueprint;
  exposedGroups: ReadonlySet<string>;
  exposedEquivalentGroups?: ReadonlySet<string>;
  random: AssessmentRandomSource;
}): AuthoritativeAssessmentSelection => {
  const candidates = shuffled(
    bank.filter((item) =>
      isIssuableAuthoritativeAssessmentItem(item, blueprint)
      && !exposedGroups.has(item.exposureGroupId)
      && !exposedEquivalentGroups.has(item.equivalentGroupId)
    ),
    random,
  );
  const selected: AuthoritativeAssessmentItem[] = [];
  const selectedItemVersions = new Set<string>();
  const selectedExposureGroups = new Set<string>();
  const selectedEquivalentGroups = new Set<string>();
  const missingBySkill: Partial<Record<Skill, number>> = {};
  const take = (item: AuthoritativeAssessmentItem) => {
    selected.push(item);
    selectedItemVersions.add(item.itemVersion);
    selectedExposureGroups.add(item.exposureGroupId);
    selectedEquivalentGroups.add(item.equivalentGroupId);
  };
  const eligible = (item: AuthoritativeAssessmentItem) =>
    !selectedItemVersions.has(item.itemVersion)
    && !selectedExposureGroups.has(item.exposureGroupId)
    && !selectedEquivalentGroups.has(item.equivalentGroupId);

  for (const [skill, target] of Object.entries(blueprint.skillTargets) as Array<
    [Skill, number]
  >) {
    const chosen = candidates.filter((item) =>
      item.skill === skill && eligible(item)
    ).slice(0, target);
    if (chosen.length < target) missingBySkill[skill] = target - chosen.length;
    chosen.forEach(take);
  }
  for (const item of candidates) {
    if (selected.length >= blueprint.itemCount) break;
    if (eligible(item)) take(item);
  }

  if (
    Object.keys(missingBySkill).length > 0
    || selected.length !== blueprint.itemCount
  ) {
    return {
      kind: "insufficient-bank",
      availableItemCount: candidates.length,
      requiredItemCount: blueprint.itemCount,
      missingBySkill,
    };
  }
  const ordered = shuffled(selected, random);
  const form: AssessmentFormV1 = {
    schemaVersion: 1,
    blueprintId: blueprint.id,
    formVersion: blueprint.formVersion,
    scoringPolicyVersion: blueprint.scoringPolicyVersion,
    items: ordered.map(assessmentPresentationForItem),
  };
  if (!isExactAssessmentFormV1(form, blueprint.itemCount)) {
    return {
      kind: "insufficient-bank",
      availableItemCount: candidates.length,
      requiredItemCount: blueprint.itemCount,
      missingBySkill,
    };
  }
  return {
    kind: "selected",
    items: ordered,
    form,
  };
};

export const authoritativeAssessmentItemByVersion = (
  bank: readonly AuthoritativeAssessmentItem[],
) => new Map(bank.map((item) => [item.itemVersion, item]));

export const assessmentAnswersMatch = (selected: string, expected: string) =>
  selected.normalize("NFC").trim() === expected.normalize("NFC").trim();
