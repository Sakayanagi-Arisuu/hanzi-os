import { BookOpenText } from "lucide-react";
import { useState } from "react";
import { RELEASED_STORIES } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { speakMandarin } from "../lib/speech";
import {
  ReaderExperience,
  type ReaderJourneyStage,
} from "../reader/ReaderExperience";
import { useLearning } from "../store/LearningStore";
import { savePracticeMistake } from '../mistakes/practiceMistakes';

export function LocalReaderPage() {
  const { state, actions, sync } = useLearning();
  const story = RELEASED_STORIES.find((item) => item.id === "first-day");
  const [stage, setStage] = useState<ReaderJourneyStage>("shelf");
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState(() =>
    makeIdempotencyKey("reader-local-check")
  );
  const [usedSupport, setUsedSupport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!story || !story.comprehension[0]) {
    return (
      <div className="lesson-state-screen">
        <BookOpenText size={44} />
        <h1>Chưa có câu chuyện phù hợp</h1>
        <p>Câu chuyện mới sẽ xuất hiện khi sẵn sàng cho cấp độ của bạn.</p>
      </div>
    );
  }

  const question = story.comprehension[0];
  const correct = answer === question.correctAnswer;

  const submitAnswer = async () => {
    if (!answer || checked || busy) return;
    setBusy(true); setSaveError(null);
    try {
    await actions.recordPracticeEvidence({
      idempotencyKey: evidenceKey, activityVersion: `${story.contentVersion}:${question.id}:1`, source: 'reader',
      method: 'reading-comprehension', activityId: `${story.id}:${question.id}`, skill: 'reading',
      outcome: correct ? 'correct' : 'incorrect', score: correct ? 100 : 0,
      metadata: { selectedAnswer: answer, correctAnswer: question.correctAnswer, usedHint: usedSupport,
        translationVisible: usedSupport, measurementEligible: false, answerExposure: 'public-client',
        priorExposure: state.evidence.some(item => item.activityId === `${story.id}:${question.id}`) },
    });
    if (!correct) await savePracticeMistake(sync.ownerKey, {
      version: 1, source: 'reader', activityId: `${story.id}:${question.id}`, activityVersion: `${story.contentVersion}:${question.id}:1`,
      originId: evidenceKey, prompt: question.prompt, context: story.sentences.map(sentence => sentence.chinese).join('\n'), answer: question.correctAnswer,
      options: question.options, explanation: question.explanation, sourceLabel: story.title, occurredAt: new Date().toISOString(),
    });
    setChecked(true);
    } catch { setSaveError('Chưa lưu được câu trả lời. Dữ liệu cũ vẫn được giữ; hãy thử lại.'); }
    finally { setBusy(false); }
  };

  const restart = () => {
    setAnswer(null);
    setChecked(false);
    setUsedSupport(false);
    setEvidenceKey(makeIdempotencyKey("reader-local-check"));
    setStage("reading");
  };

  return (
    <>
    {saveError && <p role="alert">{saveError}</p>}
    <ReaderExperience
      busy={busy}
      story={story}
      stage={stage}
      checkpoint={stage === "checkpoint" ? {
        label: "Ý chính",
        position: 0,
        total: 1,
        prompt: question.prompt,
        options: question.options,
        selected: answer,
        state: checked ? "recorded" : "idle",
        outcome: checked ? correct ? "correct" : "incorrect" : null,
        explanation: checked ? question.explanation : undefined,
      } : null}
      result={stage === "result" ? {
        correctCount: correct ? 1 : 0,
        total: 1,
        outcomes: [correct ? "correct" : "incorrect"],
      } : null}
      savedWordIds={state.savedWords}
      supportUsed={usedSupport}
      scriptPreference={state.profile.script}
      onStageChange={setStage}
      onStart={() => setStage("reading")}
      onExit={() => setStage("shelf")}
      onSupportUsed={() => setUsedSupport(true)}
      onSpeak={speakMandarin}
      onToggleSavedWord={actions.toggleSavedWord}
      onSelectOption={setAnswer}
      onSubmitOption={submitAnswer}
      onContinueCheckpoint={() => setStage("result")}
      onRestart={restart}
    />
    </>
  );
}
