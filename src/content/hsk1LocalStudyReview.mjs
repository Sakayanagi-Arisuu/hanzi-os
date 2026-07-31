import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  evaluateHskLocalStudyReview,
  HSK_LOCAL_STUDY_PROFILE_ID,
  HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
  HSK_LOCAL_STUDY_REVIEW_PASSES,
  loadHskLocalStudyProfile,
} from "./hskLocalStudyProfile.mjs";
import {
  assertValidHsk1UnitReviewerPacketBundle,
  HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
  loadHsk1UnitReviewerPacketBundle,
} from "./hsk1UnitReviewerPacket.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH =
  "content/review/hsk1-time-place-events-local-study-review.json";
export const HSK1_LOCAL_STUDY_REVIEW_ID =
  "hsk1-time-place-events-local-study-review-2026.07.1";

const EXPECTED_TARGET_TYPE_COUNTS = {
  "dialogue-turn": 24,
  "grammar-draft": 25,
  "grammar-practice": 25,
  "lesson-blueprint": 6,
  "task-dialogue-turn": 12,
  "task-practice": 3,
  "task-scenario": 3,
  "topic-draft": 3,
  "vocabulary-draft": 81,
  "vocabulary-practice": 243,
};

const RESOLVED_FINDINGS = [
  {
    findingId: "objective-thousand-range",
    pass: "vietnamese-meaning-and-usage",
    status: "resolved",
    summary: "Mục tiêu bài số đếm mâu thuẫn với từ 千.",
    resolution: "Đổi phạm vi thành từ số không đến hàng nghìn.",
  },
  {
    findingId: "semantic-vocabulary-partition",
    pass: "source-and-level-mapping",
    status: "resolved",
    summary: "第, 号 và 到 nằm ở bài không phù hợp nghĩa sử dụng.",
    resolution: "Chuyển 第/号 sang lịch-ngày và 到 sang giờ-khoảng thời gian.",
  },
  {
    findingId: "single-character-example-collisions",
    pass: "mandarin-accuracy-and-naturalness",
    status: "resolved",
    summary: "Khớp chuỗi con tạo ví dụ sai nghĩa cho các từ một chữ.",
    resolution: "Dùng ví dụ tường minh theo nghĩa cho 边, 里, 哪, 那, 上, 天, 下, 雨, 在, 早 và 这.",
  },
  {
    findingId: "date-translation-word-order",
    pass: "vietnamese-meaning-and-usage",
    status: "resolved",
    summary: "Bản dịch ví dụ 日 dùng trật tự ngày tháng không tự nhiên.",
    resolution: "Chuẩn hóa thành ngày 1 tháng 10.",
  },
  {
    findingId: "adjective-adverbial-overgeneralization",
    pass: "pedagogy-rubric-and-distractors",
    status: "resolved",
    summary: "Giải thích phó từ tính từ rộng hơn phạm vi mẫu HSK1.",
    resolution: "Giới hạn giải thích vào mẫu và ngữ cảnh thật sự được dạy.",
  },
  {
    findingId: "task-05-response-shape",
    pass: "pedagogy-rubric-and-distractors",
    status: "resolved",
    summary: "Yêu cầu trả lời một từ nhưng đáp án mẫu là câu ngắn.",
    resolution: "Yêu cầu câu ngắn chứa từ chỉ vị trí.",
  },
];

const ACCEPTED_CONVENTIONS = [
  {
    conventionId: "compact-lexeme-pinyin",
    decision: "accepted",
    note: "Pinyin mục từ được compact nhất quán trong runtime; câu ví dụ vẫn giữ ranh giới từ.",
  },
  {
    conventionId: "official-grammar-row-051-source-quirk",
    decision: "accepted-source-preserved",
    note: "Giữ nguyên văn bản nguồn chính thức có 所处 trong inventory; phần dạy dùng cấu trúc địa điểm + 是 + danh từ đúng nghĩa.",
  },
  {
    conventionId: "browser-speech-synthesis-practice-only",
    decision: "accepted-local-study-only",
    note: "TTS trình duyệt chỉ hỗ trợ luyện tập, không tạo bằng chứng nghe hoặc phát âm.",
  },
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

export const loadHsk1LocalStudyReviewSources = (
  root = process.cwd(),
) => ({
  root,
  profile: loadHskLocalStudyProfile(root),
  reviewerPacketBundle: loadHsk1UnitReviewerPacketBundle(root),
});

export const projectHsk1LocalStudyReview = async (source) => {
  await assertValidHsk1UnitReviewerPacketBundle(source.reviewerPacketBundle);
  const packet = source.reviewerPacketBundle.packet;
  const targetTypeCounts = Object.fromEntries(
    [...new Set(packet.contentTargets.map((target) => target.targetType))]
      .sort()
      .map((targetType) => [
        targetType,
        packet.contentTargets.filter(
          (target) => target.targetType === targetType,
        ).length,
      ]),
  );
  if (!exact(targetTypeCounts, EXPECTED_TARGET_TYPE_COUNTS)) {
    throw new Error("HSK1 local-study target type coverage has drifted");
  }
  if (
    packet.counts.lessons !== 6
    || packet.counts.contentTargets !== 425
    || packet.counts.runtimeProjectionTargets !== 425
    || packet.counts.unrepresentedNonCoreTargets !== 0
    || packet.counts.reviewBatches !== 27
  ) {
    throw new Error("HSK1 local-study reviewer packet coverage is incomplete");
  }

  const passResults = Object.fromEntries(
    HSK_LOCAL_STUDY_REVIEW_PASSES.map((pass) => [pass, "passed"]),
  );
  const reviewResult = {
    mode: "ai-assisted-self-review",
    schemaValid: true,
    sourceBound: true,
    aiAssistedDisclosed: true,
    humanReviewed: false,
    unresolvedIssueCount: 0,
    passResults,
  };
  const acceptance = evaluateHskLocalStudyReview(
    reviewResult,
    source.profile,
  );
  if (!acceptance.readyForLocalStudyVisibility) {
    throw new Error(
      `HSK1 local-study review is blocked: ${acceptance.blockers.join(", ")}`,
    );
  }

  const payload = {
    schemaVersion: 1,
    reviewId: HSK1_LOCAL_STUDY_REVIEW_ID,
    profileId: HSK_LOCAL_STUDY_PROFILE_ID,
    unitId: "hsk1-time-place-events",
    reviewedAt: "2026-07-31T04:30:00.000Z",
    reviewer: {
      reviewerId: "openai-codex-ai-assisted-review",
      reviewerKind: "ai-coding-agent",
      humanReviewed: false,
      disclosureVi: "Nội dung được Codex kiểm duyệt bằng AI cho mục đích tự học; chưa được người bản ngữ kiểm duyệt.",
    },
    sourceBindings: [
      sourceBinding(
        source.root,
        "localStudyProfile",
        HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "unitReviewerPacket",
        HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
      ),
    ],
    unitReleaseDigest: packet.unitReleaseDigest,
    reviewerPacketSha256: packet.packetSha256,
    coverage: {
      lessonIds: packet.lessonIndex.map((lesson) => lesson.lessonId),
      contentTargetCount: packet.contentTargets.length,
      contentTargetTypeCounts: targetTypeCounts,
      contentTargetDigest: await sha256Json(packet.contentTargets.map(
        ({ targetId, targetType, sha256 }) => ({
          targetId,
          targetType,
          sha256,
        }),
      )),
      authoredSemanticTargetsReviewed: 182,
      generatedVocabularyPracticeItemsInvariantChecked: 243,
      runtimeProjectionTargetCount: packet.counts.runtimeProjectionTargets,
      runtimeProjectionDigest: await sha256Json({
        projectionId: packet.runtimeProjectionTargets.projectionId,
        projectionSha256: packet.runtimeProjectionTargets.projectionSha256,
        activityProjectionId:
          packet.runtimeProjectionTargets.activityProjectionId,
        activityProjectionSha256:
          packet.runtimeProjectionTargets.activityProjectionSha256,
      }),
      unrepresentedRuntimeTargets: packet.counts.unrepresentedNonCoreTargets,
      reviewBatchCount: packet.reviewBatches.length,
      reviewBatchDigest: await sha256Json(packet.reviewBatches.map(
        ({ batchId, targetDigest }) => ({ batchId, targetDigest }),
      )),
    },
    method: {
      semanticReview: "AI đọc và đối chiếu từng payload tác giả soạn với mục tiêu bài, nguồn HSK, nghĩa tiếng Việt và ngữ cảnh sử dụng.",
      generatedItemReview: "AI kiểm tra quy tắc sinh, đáp án duy nhất, distractor, ánh xạ kỹ năng và mẫu đại diện của 243 bài luyện từ vựng.",
      runtimeParityReview: "Đối chiếu đủ 425/425 target từ nguồn sang core và activity projection; không có target bị mất.",
      audioBoundary: "TTS trình duyệt có Hanzi/Pinyin dự phòng, chỉ dùng luyện tập và không tính mastery nghe/phát âm.",
    },
    reviewResult,
    findings: {
      resolved: RESOLVED_FINDINGS,
      acceptedConventions: ACCEPTED_CONVENTIONS,
      unresolved: [],
    },
    acceptance,
  };
  return {
    ...payload,
    reviewSha256: await sha256Json(payload),
  };
};

export const validateHsk1LocalStudyReviewBundle = async ({
  source,
  review,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1LocalStudyReview(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(review)
    || review.schemaVersion !== 1
    || review.reviewId !== HSK1_LOCAL_STUDY_REVIEW_ID
    || review.profileId !== HSK_LOCAL_STUDY_PROFILE_ID
    || review.unitId !== "hsk1-time-place-events"
    || !isRecord(review.reviewer)
    || review.reviewer.reviewerKind !== "ai-coding-agent"
    || review.reviewer.humanReviewed !== false
    || !Array.isArray(review.sourceBindings)
    || !isRecord(review.coverage)
    || review.coverage.contentTargetCount !== 425
    || review.coverage.runtimeProjectionTargetCount !== 425
    || review.coverage.unrepresentedRuntimeTargets !== 0
    || review.coverage.reviewBatchCount !== 27
    || !isRecord(review.reviewResult)
    || !isRecord(review.findings)
    || !Array.isArray(review.findings.unresolved)
    || review.findings.unresolved.length !== 0
    || review.acceptance?.readyForLocalStudyVisibility !== true
    || review.acceptance?.claims?.humanReview !== false
    || review.acceptance?.claims?.productionEligible !== false
  ) {
    errors.push("HSK1 local-study review shape or safety boundary is invalid");
  }
  if (!exact(review, expected)) {
    errors.push("HSK1 local-study review does not match exact reviewed sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      unitId: expected.unitId,
      lessons: expected.coverage.lessonIds.length,
      contentTargets: expected.coverage.contentTargetCount,
      runtimeTargets: expected.coverage.runtimeProjectionTargetCount,
      reviewBatches: expected.coverage.reviewBatchCount,
      resolvedFindings: expected.findings.resolved.length,
      readyForLocalStudyVisibility:
        expected.acceptance.readyForLocalStudyVisibility,
      humanReviewed: expected.reviewer.humanReviewed,
      productionEligible: expected.acceptance.claims.productionEligible,
    },
  };
};

export const assertValidHsk1LocalStudyReviewBundle = async (bundle) => {
  const result = await validateHsk1LocalStudyReviewBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 local-study review:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1LocalStudyReviewBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1LocalStudyReviewSources(root),
  review: JSON.parse(readFileSync(
    resolve(root, HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH),
    "utf8",
  )),
});
