import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
} from "./hsk1GrammarContextPack.mjs";
import {
  HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH,
} from "./hsk1LocalStudyAuthorization.mjs";
import {
  HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
} from "./hsk1LocalStudyReview.mjs";
import {
  HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
} from "./hsk1TaskAssessmentPack.mjs";
import {
  HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
} from "./hsk1UnitRuntimeProjection.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_RICH_LESSON_CONTENT_RELATIVE_PATH =
  "content/runtime/hsk1-time-place-events-rich-lessons.json";
export const HSK1_RICH_LESSON_CONTENT_ID =
  "hsk1-time-place-events-rich-lessons-2026.07.1";

const UNIT_ID = "hsk1-time-place-events";
const CONTENT_VERSION = "foundation-2026.08.4";
const SOURCE_PROJECTION_VERSION = "foundation-2026.07.7";
const SOURCE_PATHS = {
  communicative: HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
  grammar: HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
  task: HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
  runtimeCore: HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH,
  localReview: HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
  localAuthorization: HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH,
};

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});

export const loadHsk1RichLessonContentSources = (root = process.cwd()) => ({
  root,
  communicative: readJson(root, SOURCE_PATHS.communicative),
  grammar: readJson(root, SOURCE_PATHS.grammar),
  task: readJson(root, SOURCE_PATHS.task),
  runtimeCore: readJson(root, SOURCE_PATHS.runtimeCore),
  localReview: readJson(root, SOURCE_PATHS.localReview),
  localAuthorization: readJson(root, SOURCE_PATHS.localAuthorization),
});

const dialogueTurn = (turn) => ({
  speaker: turn.speaker,
  hanzi: turn.hanzi,
  pinyin: turn.pinyin,
  meaningVi: turn.meaningVi,
});

export const projectHsk1RichLessonContent = async (source) => {
  const unit = source.communicative.packs.find(
    (candidate) => candidate.unitId === UNIT_ID,
  );
  const authorization = source.localAuthorization.authorizations.find(
    (candidate) => candidate.unitId === UNIT_ID,
  );
  const runtimeByAuthoringId = new Map(source.runtimeCore.lessons.map(
    (lesson) => [lesson.authoringLessonId, lesson.runtimeLessonId],
  ));
  if (
    !unit
    || source.runtimeCore.targetPackageVersion !== SOURCE_PROJECTION_VERSION
    || source.localAuthorization.runtimeContentVersion !== CONTENT_VERSION
    || authorization?.authorizationState
      !== "authorized-for-personal-local-study"
    || authorization?.presentation?.authorizationState
      !== "authorized-for-personal-local-study"
    || authorization.presentation.sourceTargetCount !== 338
    || authorization.presentation.humanReviewed !== false
    || authorization.presentation.measurementEligible !== false
    || authorization.presentation.masteryEligible !== false
    || source.localReview.reviewResult?.unresolvedIssueCount !== 0
    || source.localReview.reviewer?.humanReviewed !== false
    || source.localReview.acceptance?.readyForLocalStudyVisibility !== true
  ) {
    throw new Error("HSK1 rich lesson presentation is not locally authorized");
  }

  const lessons = unit.lessons.map((lesson) => {
    const runtimeLessonId = runtimeByAuthoringId.get(lesson.lessonId);
    if (!runtimeLessonId || !authorization.lessonIds.includes(runtimeLessonId)) {
      throw new Error(`${lesson.lessonId} has no local runtime authorization`);
    }
    const grammar = source.grammar.grammarDrafts
      .filter((item) => item.lessonId === lesson.lessonId)
      .map((item) => ({
        id: item.officialGrammarRowId,
        category: item.categoryName ?? item.category ?? "Ngữ pháp",
        label: item.detail ?? item.officialContent,
        officialContent: item.officialContent,
        explanationVi: item.explanationViDraft,
        modelExample: {
          hanzi: item.modelExample.hanzi,
          pinyin: item.modelExample.pinyin,
          meaningVi: item.modelExample.meaningVi,
        },
        guidedPractice: {
          promptVi: item.guidedPractice.promptVi,
          modelAnswerHanzi: item.guidedPractice.modelAnswerHanzi,
          modelAnswerPinyin: item.guidedPractice.modelAnswerPinyin,
          modelAnswerMeaningVi: item.guidedPractice.modelAnswerMeaningVi,
        },
      }));
    const topics = source.task.topicDrafts
      .filter((item) => item.lessonId === lesson.lessonId)
      .map((item) => ({
        id: item.officialTopicId,
        group: item.group,
        officialTopic: item.officialTopic,
        promptVi: item.promptViDraft,
      }));
    const tasks = source.task.taskScenarios
      .filter((item) => item.lessonId === lesson.lessonId)
      .map((item) => ({
        id: item.officialTaskId,
        titleVi: item.titleVi,
        instructionVi: item.instructionVi,
        targetFunctions: [...item.targetFunctions],
        modelDialogue: item.modelDialogue.turns.map(dialogueTurn),
      }));
    return {
      lessonId: runtimeLessonId,
      authoringLessonId: lesson.lessonId,
      dialogue: lesson.modelDialogue.turns.map(dialogueTurn),
      grammar,
      topics,
      tasks,
    };
  });

  const counts = {
    lessons: lessons.length,
    dialogueTurns: lessons.reduce(
      (sum, lesson) => sum + lesson.dialogue.length,
      0,
    ),
    grammarPoints: lessons.reduce(
      (sum, lesson) => sum + lesson.grammar.length,
      0,
    ),
    guidedGrammarPrompts: lessons.reduce(
      (sum, lesson) => sum + lesson.grammar.length,
      0,
    ),
    topics: lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0),
    tasks: lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0),
    taskDialogueTurns: lessons.reduce(
      (sum, lesson) => sum + lesson.tasks.reduce(
        (taskSum, task) => taskSum + task.modelDialogue.length,
        0,
      ),
      0,
    ),
  };
  if (!exact(counts, {
    lessons: 6,
    dialogueTurns: 24,
    grammarPoints: 25,
    guidedGrammarPrompts: 25,
    topics: 3,
    tasks: 3,
    taskDialogueTurns: 12,
  })) {
    throw new Error("HSK1 rich lesson presentation counts are incomplete");
  }

  const payload = {
    schemaVersion: 1,
    presentationId: HSK1_RICH_LESSON_CONTENT_ID,
    contentVersion: CONTENT_VERSION,
    unitId: UNIT_ID,
    state: "authorized-for-personal-local-study",
    disclosure: {
      reviewVi:
        "Nội dung được Codex rà soát bằng AI cho mục đích tự học; chưa phải kiểm duyệt người bản ngữ.",
      audioVi:
        "Nút nghe dùng giọng TTS tổng hợp của trình duyệt và không tạo bằng chứng nghe hoặc phát âm.",
    },
    policy: {
      learnerVisibleForPersonalLocalStudy: true,
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
    sourceBindings: Object.entries(SOURCE_PATHS).map(([id, relativePath]) =>
      sourceBinding(source.root, id, relativePath)
    ),
    counts,
    lessons,
  };
  return {
    ...payload,
    integritySha256: await sha256Json(payload),
  };
};

export const validateHsk1RichLessonContentBundle = async ({
  source,
  presentation,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1RichLessonContent(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    presentation?.schemaVersion !== 1
    || presentation?.presentationId !== HSK1_RICH_LESSON_CONTENT_ID
    || presentation?.contentVersion !== CONTENT_VERSION
    || presentation?.unitId !== UNIT_ID
    || presentation?.state !== "authorized-for-personal-local-study"
    || presentation?.policy?.humanReviewed !== false
    || presentation?.policy?.measurementEligible !== false
    || presentation?.policy?.masteryEligible !== false
    || presentation?.lessons?.length !== 6
  ) {
    errors.push("HSK1 rich lesson presentation shape is invalid");
  }
  if (!exact(presentation, expected)) {
    errors.push("HSK1 rich lesson presentation does not match exact sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const loadHsk1RichLessonContentBundle = (root = process.cwd()) => ({
  source: loadHsk1RichLessonContentSources(root),
  presentation: readJson(root, HSK1_RICH_LESSON_CONTENT_RELATIVE_PATH),
});
