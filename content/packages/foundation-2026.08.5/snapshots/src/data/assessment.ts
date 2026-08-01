import type { Skill } from "../types";
import { CONTENT_VERSION } from "./curriculum";

export type AssessmentQuestion = {
  id: string;
  itemVersion: string;
  skill: Skill;
  construct: string;
  modality: "visual-selection" | "synthetic-tts-selection";
  equivalentGroupId: string;
  exposureGroupId: string;
  formFamilyId: string;
  reviewStatus: "pending" | "approved" | "rejected";
  calibrationStatus: "uncalibrated" | "calibrated";
  difficulty: number | null;
  discrimination: number | null;
  measurementEligible: boolean;
  prompt: string;
  meta: string;
  options: string[];
  correct: string;
  explanation: string;
  audio?: string;
};

/**
 * Compatibility form shared by the browser and authoritative sync re-grading.
 * Its answer key is still shipped to the browser for immediate feedback, so it
 * is a closed-alpha screening form rather than an anti-cheat assessment. A
 * server-issued form must keep future production answer keys off the client.
 */
export const ASSESSMENT_FORM_VERSION = `${CONTENT_VERSION}:diagnostic-foundation:3`;
export const ASSESSMENT_SCORING_POLICY_VERSION = "foundation-observed-wilson:1";
export const ASSESSMENT_FORM_FAMILY_ID = "diagnostic-foundation";

const item = (
  value: Omit<
    AssessmentQuestion,
    | "itemVersion"
    | "equivalentGroupId"
    | "exposureGroupId"
    | "formFamilyId"
    | "reviewStatus"
    | "calibrationStatus"
    | "difficulty"
    | "discrimination"
  >,
): AssessmentQuestion => ({
  ...value,
  itemVersion: `${CONTENT_VERSION}:diagnostic-item:${value.id}:1`,
  equivalentGroupId: `foundation:${value.id}`,
  exposureGroupId: `foundation:${value.id}`,
  formFamilyId: ASSESSMENT_FORM_FAMILY_ID,
  reviewStatus: "pending",
  calibrationStatus: "uncalibrated",
  difficulty: null,
  discrimination: null,
});

export const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  item({ id: "meaning-ni", skill: "vocabulary", construct: "word-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "你", meta: "Chọn nghĩa", options: ["tôi", "bạn", "giáo viên", "người"], correct: "bạn", explanation: "你 (nǐ) là đại từ ngôi hai: bạn." }),
  item({ id: "pinyin-hao", skill: "pronunciation", construct: "pinyin-tone-recognition", modality: "visual-selection", measurementEligible: true, prompt: "好", meta: "Chọn pinyin", options: ["hāo", "háo", "hǎo", "hào"], correct: "hǎo", explanation: "好 đọc hǎo, thanh 3, nghĩa là tốt hoặc khỏe." }),
  item({ id: "reading-student", skill: "reading", construct: "sentence-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "我是学生。", meta: "Chọn nghĩa câu", options: ["Tôi là sinh viên.", "Bạn là giáo viên.", "Tôi không khỏe.", "Đây là sách."], correct: "Tôi là sinh viên.", explanation: "我 = tôi, 是 = là, 学生 = sinh viên." }),
  item({ id: "grammar-ma", skill: "grammar", construct: "question-particle-recognition", modality: "visual-selection", measurementEligible: true, prompt: "你是老师___？", meta: "Chọn từ hoàn thiện câu hỏi", options: ["不", "吗", "有", "人"], correct: "吗", explanation: "Thêm 吗 cuối câu trần thuật để tạo câu hỏi có/không." }),
  item({ id: "tone-bu", skill: "pronunciation", construct: "lexical-tone-recognition", modality: "visual-selection", measurementEligible: true, prompt: "bù", meta: "不 mang thanh từ điển nào?", options: ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"], correct: "Thanh 4", explanation: "不 có thanh từ điển 4; trước một thanh 4 khác, nó thường đọc thành bú." }),
  item({ id: "reading-nationality", skill: "reading", construct: "sentence-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "我是越南人。", meta: "Câu này nói điều gì?", options: ["Tôi đến Trung Quốc.", "Tôi là người Việt Nam.", "Nhà tôi có người.", "Tôi học tiếng Việt."], correct: "Tôi là người Việt Nam.", explanation: "Tên quốc gia + 人 tạo cách nói quốc tịch." }),
  item({ id: "grammar-de", skill: "grammar", construct: "possessive-structure-recognition", modality: "visual-selection", measurementEligible: true, prompt: "我的书", meta: "Chọn cấu trúc", options: ["sách đọc tôi", "tôi là sách", "sách của tôi", "tôi có ba sách"], correct: "sách của tôi", explanation: "Người sở hữu + 的 + vật: 我 + 的 + 书." }),
  item({ id: "meaning-three-people", skill: "vocabulary", construct: "phrase-meaning-recognition", modality: "visual-selection", measurementEligible: true, prompt: "三个人", meta: "Chọn nghĩa", options: ["một gia đình", "hai giáo viên", "ba người", "ba quyển sách"], correct: "ba người", explanation: "三 = ba, 个 = lượng từ, 人 = người." }),
  item({ id: "listening-xiexie", skill: "listening", construct: "phrase-identification", modality: "synthetic-tts-selection", measurementEligible: false, prompt: "Nghe và chọn cụm đúng", meta: "Listening practice · synthetic TTS", options: ["你好", "谢谢", "再见", "老师"], correct: "谢谢", explanation: "谢谢 (xièxie) nghĩa là cảm ơn.", audio: "谢谢" }),
  item({ id: "reading-tea-response", skill: "reading", construct: "contextual-response-recognition", modality: "visual-selection", measurementEligible: true, prompt: "你喝茶吗？", meta: "Chọn phản hồi phù hợp", options: ["是，我喝茶。", "我是茶。", "三个人。", "老师的书。"], correct: "是，我喝茶。", explanation: "Câu hỏi hỏi bạn có uống trà không; câu trả lời giữ động từ 喝." }),
] as const;

export const FOUNDATION_SCREENING_BLUEPRINT = {
  id: "foundation-screening-v1",
  formVersion: ASSESSMENT_FORM_VERSION,
  itemCount: ASSESSMENT_QUESTIONS.length,
  allowedReviewStatuses: ["pending"] as const,
  skillTargets: {
    pronunciation: 2,
    listening: 1,
    reading: 3,
    vocabulary: 2,
    grammar: 2,
  } satisfies Partial<Record<Skill, number>>,
} as const;

export const ASSESSMENT_QUESTION_BY_ID = new Map(
  ASSESSMENT_QUESTIONS.map((question) => [question.id, question]),
);
