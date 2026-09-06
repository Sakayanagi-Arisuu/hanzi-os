import { useEffect, useMemo } from "react";
import { RemediationObservatory } from "../components/RemediationObservatory";
import { useSystemFeedback } from "../components/SystemFeedback";
import { isMistakeFromActivePathContent } from "../lib/adaptive";
import { makeIdempotencyKey } from "../lib/evidence";
import { evaluateRemediationAttempt } from "../lib/remediation";
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
  const { state, actions } = useLearning();
  const { checkpoint, recordReceipt } = useLearningJourney();
  const { notify } = useSystemFeedback();
  const visibleMistakes = useMemo(
    () => state.mistakes.filter((mistake) =>
      isMistakeFromActivePathContent(mistake, state.profile.startingLevel)
    ),
    [state.mistakes, state.profile.startingLevel],
  );
  const items = useMemo(
    () => visibleMistakes.map(toObservatoryItem),
    [visibleMistakes],
  );
  const unresolvedCount = items.filter((item) => !item.resolved).length;
  const resolvedCount = items.length - unresolvedCount;

  useEffect(() => {
    if (
      unresolvedCount > 0
      || !checkpoint?.completedStages.learn
      || checkpoint.completedStages.review
    ) return;
    recordReceipt({
      stage: "review",
      source: "mistakes",
      lessonId: checkpoint.anchorLessonId,
      activityId: `mistakes:${checkpoint.journeyId}:queue-cleared`,
    });
  }, [checkpoint, recordReceipt, unresolvedCount]);

  const submit = async (
    item: RemediationObservatoryItem,
    answer: string,
    usedHint: boolean,
  ): Promise<RemediationObservatoryFeedback> => {
    const mistake = visibleMistakes.find((entry) => entry.id === item.id);
    if (!mistake) throw new Error("Dấu vết này không còn trong lộ trình hiện tại.");
    const correct = matchesAnswer(answer, mistake.correctAnswer, mistake.kind);
    const attempt = evaluateRemediationAttempt(
      mistake.correctedStreak,
      correct,
      usedHint,
    );
    const attemptKey = makeIdempotencyKey("mistake-attempt");
    actions.resolveMistake(
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
    return {
      outcome: correct ? "correct" : "incorrect",
      resolved: attempt.resolved,
      answer,
      correctAnswer: mistake.correctAnswer,
      explanation: mistake.explanation,
      usedHint,
    };
  };

  return (
    <RemediationObservatory
      items={items}
      resolvedCount={resolvedCount}
      onSubmit={submit}
    />
  );
}
