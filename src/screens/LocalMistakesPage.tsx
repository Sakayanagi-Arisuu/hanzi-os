import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePracticeMistakes } from '../mistakes/usePracticeMistakes';
import { speakMandarin } from '../lib/speech';
import { collectLocalPageMistakes, type LocalPageMistake, type LocalPageCorrection } from '../mistakes/localPageMistakes';
import { checkPageRemediation, pageRemediationAnswer } from '../mistakes/pageRemediation';
import { listLessonResumes } from '../sync/indexedDb';
import { resolveLearningResumeOwnerScope, ownerScopedResumeCacheScope } from '../sync/learningResumeStore';
import { RemediationObservatory } from "../components/RemediationObservatory";
import { useSystemFeedback } from "../components/SystemFeedback";
import { isMistakeFromActivePathContent } from "../lib/adaptive";
import { makeIdempotencyKey } from "../lib/evidence";
import { evaluateRemediationAttempt } from "../lib/remediation";
import { saveMistakeRevisit } from '../sync/mistakeRevisit';
import { saveMistakeSupport } from '../sync/mistakeSupport';
import type {
  RemediationObservatoryFeedback,
  RemediationObservatoryItem,
} from "../mistakes/remediationObservatory";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { useLearning } from "../store/LearningStore";
import { emitSystemSignal } from "../system/systemSignals";
import type { MistakeRecord } from "../types";

const skillLabels: Record<MistakeRecord["skill"], string> = {
  pronunciation: "Phát âm",
  listening: "Nghe hiểu",
  speaking: "Nói",
  reading: "Đọc hiểu",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const kindLabels: Record<MistakeRecord["kind"], string> = {
  meaning: "Giải nghĩa",
  pinyin: "Nhận diện Pinyin",
  tone: "Chọn thanh điệu",
  "tone-pair": "Chọn cặp thanh điệu",
  listening: "Nghe hiểu",
  sentence: "Hoàn thành câu",
  recall: "Tự gọi lại",
};

const normalize = (value: string, preserveToneMarks: boolean) => {
  const normalized = preserveToneMarks
    ? value.normalize("NFC")
    : value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  return normalized
    .replace(/[^a-zA-ZÀ-ỹ0-9\u3400-\u9fff]+/gu, "")
    .toLocaleLowerCase("vi");
};

const matchesAnswer = (
  answer: string,
  expected: string,
  kind: MistakeRecord["kind"],
) => {
  const preserveToneMarks = kind === "pinyin"
    || kind === "tone"
    || kind === "tone-pair";
  const normalizedAnswer = normalize(answer, preserveToneMarks);
  if (!normalizedAnswer) return false;
  return normalizedAnswer === normalize(expected, preserveToneMarks);
};

const toObservatoryItem = (mistake: MistakeRecord): RemediationObservatoryItem => {
  const fromReview = mistake.lessonId === "review";
  return {
    id: mistake.id,
    referenceWordId: mistake.wordId,
    referenceLessonId: fromReview ? undefined : mistake.lessonId,
    skill: mistake.skill,
    skillLabel: skillLabels[mistake.skill],
    kindLabel: kindLabels[mistake.kind],
    originSource: fromReview ? "review" : "lesson",
    originLabel: fromReview ? "Ký Ức Trận" : "Thiên Lộ",
    originDetail: fromReview ? "Lượt ôn" : `Bài ${mistake.lessonId}`,
    instruction: kindLabels[mistake.kind],
    prompt: mistake.prompt,
    options: [],
    hint: mistake.explanation,
    previousAnswer: mistake.selectedAnswer,
    occurrenceCount: mistake.occurrences,
    correctedStreak: mistake.correctedStreak,
    resolved: mistake.resolved || mistake.correctedStreak >= 1,
    lastAttemptAt: new Date(mistake.lastAttemptAt).getTime(),
  };
};

export function LocalMistakesPage() {
  const { state, actions, sync } = useLearning();
  const practice = usePracticeMistakes(sync.ownerKey);
  const [pageMistakes, setPageMistakes] = useState<LocalPageMistake[]>([]);
  const [pagesReady, setPagesReady] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const pageScope = useRef<Awaited<ReturnType<typeof resolveLearningResumeOwnerScope>> | null>(null);
  const submissions = useRef(new Map<string, { answer: string; usedHint: boolean; id: string; occurredAt: number }>());
  const loadPages = useCallback(async () => {
    const scope = await resolveLearningResumeOwnerScope(sync.ownerKey);
    const result = await collectLocalPageMistakes(await listLessonResumes(scope));
    pageScope.current = scope;
    return result;
  }, [sync.ownerKey]);
  useEffect(() => {
    let cancelled = false;
    void loadPages().then(result => { if (!cancelled) { setPageMistakes(result); setPagesReady(true); } })
      .catch(() => { if (!cancelled) setPageError('Chưa đọc được các câu sai trong bài trên thiết bị. Hãy mở lại Nghịch Cảnh Lục để thử lại.'); });
    return () => { cancelled = true; };
  }, [loadPages]);
  const { checkpoint, recordReceipt } = useLearningJourney();
  const { notify } = useSystemFeedback();
  const visibleMistakes = useMemo(
    () => state.mistakes.filter((mistake) =>
      isMistakeFromActivePathContent(mistake, state.profile.startingLevel)
    ),
    [state.mistakes, state.profile.startingLevel],
  );
  const items = useMemo(
    () => [...visibleMistakes.map(toObservatoryItem), ...pageMistakes.map(entry => entry.item), ...practice.items],
    [visibleMistakes, pageMistakes, practice.items],
  );
  const unresolvedCount = items.filter((item) => !item.resolved).length;
  const resolvedCount = items.length - unresolvedCount;

  useEffect(() => {
    if (
      !pagesReady || pageError || !practice.ready || practice.error || unresolvedCount > 0
      || !checkpoint?.completedStages.learn
      || checkpoint.completedStages.review
    ) return;
    recordReceipt({
      stage: "review",
      source: "mistakes",
      lessonId: checkpoint.anchorLessonId,
      activityId: `mistakes:${checkpoint.journeyId}:queue-cleared`,
    });
  }, [checkpoint, recordReceipt, unresolvedCount, pagesReady, pageError, practice.ready, practice.error]);

  const submit = async (
    item: RemediationObservatoryItem,
    answer: string,
    usedHint: boolean,
  ): Promise<RemediationObservatoryFeedback> => {
    if (item.id.startsWith('practice.mistake:')) return practice.submit(item, answer, usedHint);
    let submission = submissions.current.get(item.id);
    if (!submission || submission.answer !== answer || submission.usedHint !== usedHint) {
      submission = { answer, usedHint, id: makeIdempotencyKey('mistake-attempt'), occurredAt: Date.now() };
      submissions.current.set(item.id, submission);
    }
    const page = pageMistakes.find(entry => entry.item.id === item.id);
    if (page) {
      try {
        const correct = checkPageRemediation(page.activity, answer);
        const scope = pageScope.current;
        if (!scope) throw new Error('Lượt luyện chưa sẵn sàng.');
        const value: LocalPageCorrection = { version: 1, originAt: page.originAt, occurredAt: submission.occurredAt, correct, usedHint };
        const { persistPageCorrectionHistory } = await import('../sync/mistakeHistory');
        await persistPageCorrectionHistory(ownerScopedResumeCacheScope(scope, page.entryKey), value,
          submission.id, page.item.referenceLessonId ?? 'unknown', page.entryKey, page.contentVersion);
        window.dispatchEvent(new Event('hanzi-page-corrections-updated'));
        setPageMistakes(await loadPages());
        setPageError(null);
        submissions.current.delete(item.id);
        return { outcome: correct ? 'correct' : 'incorrect', resolved: correct && !usedHint, answer, usedHint,
          correctAnswer: pageRemediationAnswer(page.activity), explanation: page.activity.explanation };
      } catch (error) {
        setPageError('Chưa lưu được lượt luyện. Hãy giữ màn hình mở và thử lại.');
        throw error;
      }
    }
    const mistake = visibleMistakes.find((entry) => entry.id === item.id);
    if (!mistake) throw new Error("Dấu vết này không còn trong lộ trình hiện tại.");
    const correct = matchesAnswer(answer, mistake.correctAnswer, mistake.kind);
    const attempt = evaluateRemediationAttempt(
      mistake.correctedStreak,
      correct,
      usedHint,
    );
    const attemptKey = submission.id;
    await actions.resolveMistake(
      mistake.id,
      correct,
      answer,
      attemptKey,
      usedHint,
    );
    emitSystemSignal({
      type: attempt.resolved
        ? "mistake.resolved"
        : correct ? "learning.correct" : "learning.retry",
      sourceId: `mistake:${mistake.id}`,
      eventId: `${attemptKey}:system-feedback`,
    });
    if (correct) {
      notify(usedHint
        ? "Đã hiểu cách làm; lỗi này được giữ lại để kiểm tra độc lập sau."
        : "Đã hóa giải lỗi bằng một lượt tự trả lời độc lập.");
    }
    submissions.current.delete(item.id);
    return {
      outcome: correct ? "correct" : "incorrect",
      resolved: attempt.resolved,
      answer,
      correctAnswer: mistake.correctAnswer,
      explanation: mistake.explanation,
      usedHint,
    };
  };

  if (!pagesReady || (!practice.localReady && !practice.error)) return <div className="lesson-state-screen" role={pageError ? 'alert' : 'status'}>
    <h1>{pageError ? 'Chưa đọc được đầy đủ lỗi sai' : 'Đang mở Nghịch Cảnh Lục'}</h1>
    <p>{pageError ?? 'Đang gom câu sai từ các bài đã học trên thiết bị.'}</p>
    {pageError && <button className="primary-button" type="button" onClick={() => {
      setPageError(null);
      void loadPages().then(result => { setPageMistakes(result); setPagesReady(true); })
        .catch(() => setPageError('Chưa đọc được lỗi sai. Dữ liệu vẫn được giữ; hãy thử lại.'));
    }}>Thử lại</button>}
  </div>;

  return (
    <RemediationObservatory
      items={items}
      resolvedCount={resolvedCount}
      error={pageError ?? practice.error}
      onSubmit={submit}
      onRevisit={async (item, operationId) => {
        const scope = pageScope.current;
        if (!scope) throw new Error('Learning scope unavailable');
        await saveMistakeRevisit(scope, item, operationId);
      }}
      onSpeak={(text) => speakMandarin(text, 0.78)}
      onSupport={async (item, kind, operationId) => {
        const scope = pageScope.current;
        if (!scope) throw new Error('Learning scope unavailable');
        await saveMistakeSupport(scope, item, kind, operationId);
      }}
    />
  );
}
