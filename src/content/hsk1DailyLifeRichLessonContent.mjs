import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  applyHsk1DailyLifeOverrides,
  assertValidHsk1DailyLifeLocalStudyBundle,
  HSK1_DAILY_LIFE_TARGET_VERSION,
  HSK1_DAILY_LIFE_UNIT_ID,
  loadHsk1DailyLifeLocalStudyBundle,
} from "./hsk1DailyLifeLocalStudy.mjs";
import {
  HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
} from "./hsk1GrammarContextPack.mjs";
import {
  assertValidHsk1LocalStudyAuthorizationBundle,
  HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH,
  loadHsk1LocalStudyAuthorizationBundle,
} from "./hsk1LocalStudyAuthorization.mjs";
import {
  HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
} from "./hsk1TaskAssessmentPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_DAILY_LIFE_RICH_RELATIVE_PATH =
  "content/runtime/hsk1-daily-life-rich-lessons.json";
export const HSK1_DAILY_LIFE_RICH_ID =
  "hsk1-daily-life-rich-lessons-2026.07.1";

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
const dialogueTurn = (turn) => ({
  speaker: turn.speaker,
  hanzi: turn.hanzi,
  pinyin: turn.pinyin,
  meaningVi: turn.meaningVi,
});

export const loadHsk1DailyLifeRichLessonSources = (
  root = process.cwd(),
) => ({
  root,
  localStudyBundle: loadHsk1DailyLifeLocalStudyBundle(root),
  authorizationBundle: loadHsk1LocalStudyAuthorizationBundle(root),
  communicative: readJson(root, HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH),
  grammar: readJson(root, HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH),
  task: readJson(root, HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH),
});

export const projectHsk1DailyLifeRichLessons = async (source) => {
  await assertValidHsk1DailyLifeLocalStudyBundle(source.localStudyBundle);
  await assertValidHsk1LocalStudyAuthorizationBundle(
    source.authorizationBundle,
  );
  const unit = source.communicative.packs.find(
    (item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID,
  );
  const authorization = source.authorizationBundle.authorization
    .authorizations.find((item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID);
  if (
    !unit
    || authorization?.authorizationState
      !== "authorized-for-personal-local-study"
    || authorization?.presentation?.authorizationState
      !== "authorized-for-personal-local-study"
    || authorization?.presentation?.sourceTargetCount !== 56
    || authorization?.presentation?.humanReviewed !== false
    || source.localStudyBundle.review.reviewResult.unresolvedIssueCount !== 0
    || source.localStudyBundle.review.reviewer.humanReviewed !== false
  ) {
    throw new Error("HSK1 daily-life rich content is not locally authorized");
  }
  const overrides = applyHsk1DailyLifeOverrides(unit, source.grammar);
  const runtimeByAuthoringId = new Map(
    source.localStudyBundle.core.lessons.map((lesson) => [
      lesson.authoringLessonId,
      lesson.runtimeLessonId,
    ]),
  );
  const lessons = overrides.lessons.map((lesson) => {
    const lessonId = runtimeByAuthoringId.get(lesson.lessonId);
    if (!lessonId || !authorization.lessonIds.includes(lessonId)) {
      throw new Error(`${lesson.lessonId} has no daily-life authorization`);
    }
    const grammar = overrides.grammarDrafts
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
      lessonId,
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
    lessons: 4,
    dialogueTurns: 16,
    grammarPoints: 5,
    guidedGrammarPrompts: 5,
    topics: 10,
    tasks: 5,
    taskDialogueTurns: 20,
  })) {
    throw new Error("HSK1 daily-life rich presentation is incomplete");
  }
  const payload = {
    schemaVersion: 1,
    presentationId: HSK1_DAILY_LIFE_RICH_ID,
    contentVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
    unitId: HSK1_DAILY_LIFE_UNIT_ID,
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
    sourceBindings: [
      sourceBinding(
        source.root,
        "localAuthorization",
        HSK1_LOCAL_STUDY_AUTHORIZATION_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "communicativeCollection",
        HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "grammarPack",
        HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "taskPack",
        HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
      ),
    ],
    counts,
    lessons,
  };
  return { ...payload, integritySha256: await sha256Json(payload) };
};

export const loadHsk1DailyLifeRichLessonBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1DailyLifeRichLessonSources(root),
  presentation: readJson(root, HSK1_DAILY_LIFE_RICH_RELATIVE_PATH),
});

export const validateHsk1DailyLifeRichLessonBundle = async (bundle) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1DailyLifeRichLessons(bundle.source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    bundle.presentation?.presentationId !== HSK1_DAILY_LIFE_RICH_ID
    || bundle.presentation?.contentVersion !== HSK1_DAILY_LIFE_TARGET_VERSION
    || bundle.presentation?.policy?.humanReviewed !== false
    || bundle.presentation?.lessons?.length !== 4
  ) {
    errors.push("HSK1 daily-life rich presentation shape is invalid");
  }
  if (!exact(bundle.presentation, expected)) {
    errors.push("HSK1 daily-life rich presentation does not match reviewed sources");
  }
  return { valid: errors.length === 0, errors, summary: expected.counts };
};
