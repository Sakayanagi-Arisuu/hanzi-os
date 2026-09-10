import {
  BookOpenCheck,
  ChevronRight,
  Headphones,
  Info,
  LibraryBig,
  Mic2,
  Mic,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  Volume2,
} from "lucide-react";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAudioEngine } from "../audio/AudioEngineProvider";
import {
  AcousticPronunciationClientError,
  assessAcousticPronunciation,
  type AcousticPronunciationAssessment,
} from "../audio/acousticPronunciationClient";
import {
  createMandarinPcmRecorder,
  MandarinRecorderError,
  type MandarinPcmRecorder,
  type MandarinPcmRecording,
  type MandarinRecorderAutoStopOutcome,
} from "../audio/mandarinPcmRecorder";
import {
  RELEASED_LESSONS,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import {
  claimPronunciationInteractionXp,
} from "../learning/interactionXpClient";
import {
  isPronunciationMissionComplete,
  PRONUNCIATION_QUEST_XP,
  selectDailyPronunciationMission,
  selectPronunciationLessonOptions,
} from "../learning/pronunciationPractice";
import { buildPronunciationReportPresentation } from "../learning/pronunciationReport";
import { resolveLearningPathAuthority } from "../learning/learningAuthority";
import {
  ACOUSTIC_VOICE_CONSENT_STORAGE_KEY,
  createAcousticVoiceConsentReceipt,
  parseAcousticVoiceConsentReceipt,
} from "../lib/acousticVoiceConsent";
import { removeLocalStorage, writeLocalStorage } from "../lib/storageKeys";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { PronunciationQuestComplete } from "../components/PronunciationQuestComplete";
import { PronunciationLessonLibrary } from "../components/PronunciationLessonLibrary";
import "./PronunciationJade.css";

type QuestPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "uploading"
  | "result"
  | "error";

type QuestAssessment = {
  phraseId: string;
  result: AcousticPronunciationAssessment;
};

const AUTO_STOP_SILENCE_MS = 450;
const MAX_CAPTURE_DURATION_MS = 10_000;

const readConsent = (ownerKey: string) => {
  if (!ownerKey || typeof window === "undefined") return false;
  return Boolean(parseAcousticVoiceConsentReceipt(
    window.localStorage.getItem(ACOUSTIC_VOICE_CONSENT_STORAGE_KEY),
    ownerKey,
  ));
};

const recorderMessage = (error: unknown) => {
  if (!(error instanceof MandarinRecorderError)) {
    return "Chưa mở được microphone. Hãy kiểm tra thiết bị rồi thử lại.";
  }
  switch (error.code) {
    case "permission-denied":
      return "Microphone đang bị chặn. Hãy cấp quyền rồi thử lại.";
    case "device-unavailable":
      return "Không tìm thấy microphone đang hoạt động.";
    case "too-short":
      return "Âm thu quá ngắn. Hãy đọc trọn câu rồi thử lại.";
    case "too-large":
      return "Lượt đọc dài quá giới hạn. Hãy đọc lại câu ngắn gọn hơn.";
    case "unsupported":
      return "Trình duyệt này chưa hỗ trợ ghi âm để chấm phát âm.";
    default:
      return "Chưa tạo được bản thu an toàn. Hãy thử lại.";
  }
};

const renderSentence = (sentence: string, focusWord: string) => {
  const start = sentence.indexOf(focusWord);
  if (start < 0) return sentence;
  const before = sentence.slice(0, start);
  const after = sentence.slice(start + focusWord.length);
  return <>{before}<mark>{focusWord}</mark>{after}</>;
};

const weakWord = (assessment: AcousticPronunciationAssessment) => assessment.words
  .toSorted((left, right) => left.accuracyScore - right.accuracyScore)[0] ?? null;

export function PronunciationQuestPage() {
  const { state, actions, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const { cancelSpeech, playback, speakMandarin } = useAudioEngine();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLessonId = useMemo(
    () => new URLSearchParams(location.search).get("lesson"),
    [location.search],
  );
  const authenticated = sync.session?.authenticated === true;
  const passedLessonIds = useMemo<ReadonlySet<string> | null>(() => {
    if (!authenticated) return null;
    const authority = resolveLearningPathAuthority({
      authenticated,
      localState: state,
      projection: normalized.projection,
      authoritativeProgress: normalized.authoritativeProgress,
    });
    if (authority.state === "blocked") return new Set<string>();
    return new Set(
      [...authority.view.lessons.values()]
        .filter((lesson) => lesson.passed)
        .map((lesson) => lesson.lessonId),
    );
  }, [authenticated, normalized.authoritativeProgress, normalized.projection, state]);
  const unlockedLessonIds = useMemo<ReadonlySet<string> | null>(() => {
    const authority = resolveLearningPathAuthority({ authenticated, localState: state,
      projection: normalized.projection, authoritativeProgress: normalized.authoritativeProgress });
    // Keep the existing learn-first fallback while authority is loading; never
    // claim a lesson passed just because it is available for practice.
    if (authority.state === "blocked") return null;
    return new Set([...authority.view.lessons.values()].filter((lesson) => lesson.unlocked || lesson.passed).map((lesson) => lesson.lessonId));
  }, [authenticated, state, normalized.projection, normalized.authoritativeProgress]);
  const mission = useMemo(
    () => selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      passedLessonIds,
      unlockedLessonIds,
      requestedLessonId,
      date: new Date(),
    }),
    [passedLessonIds, unlockedLessonIds, requestedLessonId, state],
  );
  const lessonOptions = useMemo(
    () => selectPronunciationLessonOptions({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      passedLessonIds,
      unlockedLessonIds,
    }),
    [passedLessonIds, unlockedLessonIds, state],
  );
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [heardWords, setHeardWords] = useState<Set<string>>(() => new Set());
  const [heardSentences, setHeardSentences] = useState<Set<string>>(() => new Set());
  const [completedPhrases, setCompletedPhrases] = useState<Set<string>>(() => new Set());
  const [manualPhrases, setManualPhrases] = useState<Set<string>>(() => new Set());
  const [phase, setPhase] = useState<QuestPhase>("idle");
  const [assessment, setAssessment] = useState<QuestAssessment | null>(null);
  const [error, setError] = useState("");
  const [speechDetected, setSpeechDetected] = useState(false);
  const [consent, setConsent] = useState(false);
  const [rewardAwarded, setRewardAwarded] = useState<boolean | null>(null);
  const [lessonLibraryOpen, setLessonLibraryOpen] = useState(false);
  const recorderRef = useRef<MandarinPcmRecorder | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);
  const settlingRef = useRef(false);
  const rewardedMissionRef = useRef("");
  const activeMissionRef = useRef(mission.id);

  const closeLessonLibrary = useCallback(() => setLessonLibraryOpen(false), []);
  const selectLesson = useCallback((lessonId: string) => {
    setLessonLibraryOpen(false);
    navigate(`/pronunciation?lesson=${encodeURIComponent(lessonId)}`);
  }, [navigate]);

  const phrases = mission.challenges;
  const phrase = phrases[Math.min(phraseIndex, Math.max(0, phrases.length - 1))];
  if (!phrase) {
    throw new Error("Pronunciation mission has no released challenge.");
  }

  const wordSourceId = `pronunciation-quest:word:${phrase.id}`;
  const sentenceSourceId = `pronunciation-quest:sentence:${phrase.id}`;
  const wordHeard = heardWords.has(phrase.id);
  const sentenceHeard = heardSentences.has(phrase.id);
  const currentAssessment = assessment?.phraseId === phrase.id ? assessment.result : null;
  const isPlayingWord = playback.sourceId === wordSourceId
    && (playback.phase === "preparing" || playback.phase === "playing");
  const isPlayingSentence = playback.sourceId === sentenceSourceId
    && (playback.phase === "preparing" || playback.phase === "playing");
  const isPlaying = isPlayingWord || isPlayingSentence;
  const isRequestBusy = phase === "requesting" || phase === "uploading";
  const sessionComplete = isPronunciationMissionComplete({
    missionId: mission.id,
    activeMissionId: activeMissionRef.current,
    challengeIds: phrases.map((candidate) => candidate.id),
    completedPhraseIds: completedPhrases,
  });
  const currentStep = !wordHeard ? 1 : !sentenceHeard ? 2 : 3;

  const resetCapture = (nextPhase: QuestPhase = "idle") => {
    attemptRef.current += 1;
    settlingRef.current = false;
    requestRef.current?.abort();
    requestRef.current = null;
    void recorderRef.current?.abort();
    recorderRef.current = null;
    setSpeechDetected(false);
    setAssessment(null);
    setError("");
    setPhase(nextPhase);
  };

  useEffect(() => {
    if (activeMissionRef.current === mission.id) return;
    activeMissionRef.current = mission.id;
    rewardedMissionRef.current = "";
    attemptRef.current += 1;
    settlingRef.current = false;
    requestRef.current?.abort();
    requestRef.current = null;
    void recorderRef.current?.abort();
    recorderRef.current = null;
    cancelSpeech();
    setPhraseIndex(0);
    setHeardWords(new Set());
    setHeardSentences(new Set());
    setCompletedPhrases(new Set());
    setManualPhrases(new Set());
    setSpeechDetected(false);
    setAssessment(null);
    setError("");
    setPhase("idle");
    setRewardAwarded(null);
  }, [cancelSpeech, mission.id]);

  useEffect(() => {
    setConsent(readConsent(sync.ownerKey));
  }, [sync.ownerKey]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACOUSTIC_VOICE_CONSENT_STORAGE_KEY) {
        const nextConsent = readConsent(sync.ownerKey);
        setConsent(nextConsent);
        if (!nextConsent) resetCapture();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [sync.ownerKey]);

  useEffect(() => {
    const isCurrentSample = playback.sourceId === wordSourceId
      || playback.sourceId === sentenceSourceId;
    if (!isCurrentSample) return;
    if (playback.phase === "error") {
      setError("Không phát được âm mẫu trên thiết bị này. Hãy bấm lại hoặc dùng phần Pinyin để tiếp tục.");
      return;
    }
    if (playback.phase === "ended") {
      setError("");
      if (playback.sourceId === wordSourceId) {
        setHeardWords((current) => new Set(current).add(phrase.id));
      }
      if (playback.sourceId === sentenceSourceId) {
        setHeardSentences((current) => new Set(current).add(phrase.id));
      }
    }
  }, [phrase.id, playback.phase, playback.sourceId, sentenceSourceId, wordSourceId]);

  useEffect(() => () => {
    attemptRef.current += 1;
    requestRef.current?.abort();
    void recorderRef.current?.abort();
    cancelSpeech();
  }, [cancelSpeech]);

  useEffect(() => {
    if (!sessionComplete || rewardedMissionRef.current === mission.rewardKey) return;
    rewardedMissionRef.current = mission.rewardKey;
    const localAwarded = actions.completePronunciationMission(mission.rewardKey);
    if (!sync.session?.authenticated || normalized.resetEpoch === null) {
      setRewardAwarded(localAwarded);
      return;
    }
    setRewardAwarded(null);
    void claimPronunciationInteractionXp(
      mission.rewardKey,
      normalized.resetEpoch,
    ).then(setRewardAwarded).catch(() => setRewardAwarded(false));
  }, [actions, mission.rewardKey, normalized.resetEpoch, sessionComplete, sync.session]);

  const playWord = () => {
    resetCapture();
    const started = speakMandarin(phrase.focusWord, 0.62, wordSourceId);
    if (!started) setError("Chưa phát được âm mẫu. Bạn có thể tiếp tục bằng Pinyin bên dưới.");
  };

  const playSentence = () => {
    resetCapture();
    const started = speakMandarin(phrase.chinese, 0.72, sentenceSourceId);
    if (!started) setError("Chưa phát được câu mẫu. Bạn có thể tiếp tục bằng Pinyin bên dưới.");
  };

  const grantConsent = () => {
    if (!sync.ownerKey) {
      setError("Hồ sơ người học chưa sẵn sàng. Hãy đợi một chút rồi thử lại.");
      return false;
    }
    const stored = writeLocalStorage(
      ACOUSTIC_VOICE_CONSENT_STORAGE_KEY,
      JSON.stringify(createAcousticVoiceConsentReceipt(sync.ownerKey)),
    );
    if (!stored) {
      setError("Không thể lưu lựa chọn trên thiết bị này.");
      return false;
    }
    setConsent(true);
    return true;
  };

  const submitRecording = async (recording: MandarinPcmRecording, attempt: number) => {
    if (attempt !== attemptRef.current) return;
    setPhase("uploading");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await assessAcousticPronunciation({
        activityId: phrase.activityId,
        audio: recording.audio,
        quality: recording.quality,
        signal: controller.signal,
      });
      if (attempt !== attemptRef.current) return;
      setAssessment({ phraseId: phrase.id, result: response.assessment });
      setPhase("result");
    } catch (caught) {
      if (attempt !== attemptRef.current) return;
      const message = caught instanceof AcousticPronunciationClientError
        ? caught.userMessage
        : "Chưa nhận được chiến báo âm học. Hãy thử lại.";
      setError(message);
      setPhase("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const settleRecording = async (
    outcome: MandarinRecorderAutoStopOutcome,
    attempt: number,
  ) => {
    if (attempt !== attemptRef.current || settlingRef.current) return;
    settlingRef.current = true;
    recorderRef.current = null;
    if (!outcome.ok) {
      setError(recorderMessage(outcome.error));
      setPhase("error");
      return;
    }
    await submitRecording(outcome.recording, attempt);
  };

  const startCapture = async (grantFirst = false) => {
    if (phase === "requesting" || phase === "recording" || phase === "uploading") return;
    if (grantFirst && !grantConsent()) return;
    if (!grantFirst && !readConsent(sync.ownerKey)) {
      setConsent(false);
      setError("Cần đồng ý trước khi gửi bản thu để chấm âm học.");
      return;
    }
    cancelSpeech();
    resetCapture("requesting");
    const attempt = attemptRef.current;
    const recorder = createMandarinPcmRecorder({
      minDurationMs: 450,
      maxDurationMs: MAX_CAPTURE_DURATION_MS,
      autoStopAfterSilenceMs: AUTO_STOP_SILENCE_MS,
      onSpeechDetected: () => {
        if (attempt === attemptRef.current) setSpeechDetected(true);
      },
      onAutoStop: (outcome) => {
        void settleRecording(outcome, attempt);
      },
    });
    recorderRef.current = recorder;
    try {
      await recorder.start();
      if (attempt !== attemptRef.current) return;
      setPhase("recording");
    } catch (caught) {
      if (attempt !== attemptRef.current) return;
      recorderRef.current = null;
      setError(recorderMessage(caught));
      setPhase("error");
    }
  };

  const stopCapture = async () => {
    const recorder = recorderRef.current;
    if (!recorder || phase !== "recording" || settlingRef.current) return;
    const attempt = attemptRef.current;
    settlingRef.current = true;
    setPhase("uploading");
    try {
      const recording = await recorder.stop();
      recorderRef.current = null;
      await submitRecording(recording, attempt);
    } catch (caught) {
      if (attempt !== attemptRef.current) return;
      setError(recorderMessage(caught));
      setPhase("error");
    }
  };

  const moveToNext = (manual = false) => {
    const nextCompleted = new Set(completedPhrases).add(phrase.id);
    setCompletedPhrases(nextCompleted);
    if (manual) setManualPhrases((current) => new Set(current).add(phrase.id));
    resetCapture();
    const nextIndex = phrases.findIndex((candidate, index) => (
      index > phraseIndex && !nextCompleted.has(candidate.id)
    ));
    if (nextIndex >= 0) setPhraseIndex(nextIndex);
  };

  const retry = () => resetCapture();

  const withdrawConsent = () => {
    removeLocalStorage(ACOUSTIC_VOICE_CONSENT_STORAGE_KEY);
    setConsent(false);
    resetCapture();
  };

  const runPrimaryAction = () => {
    if (!wordHeard) return playWord();
    if (!sentenceHeard) return playSentence();
    if (phase === "recording") return void stopCapture();
    if (phase === "result") return moveToNext();
    if (phase === "requesting" || phase === "uploading") return;
    return void startCapture(!consent);
  };

  const primaryLabel = !wordHeard
    ? "Nghe từ trọng tâm"
    : !sentenceHeard
      ? "Nghe câu mẫu"
      : phase === "requesting"
        ? "Đang mở microphone..."
        : phase === "recording"
          ? "Dừng thu & xem phản hồi"
          : phase === "uploading"
            ? "Đang đối chiếu âm học..."
            : phase === "result"
              ? "Sang khẩu quyết tiếp theo"
              : phase === "error"
                ? "Thử đọc lại"
                : consent
                  ? "Bắt đầu xuất chiêu"
                  : "Đồng ý & bắt đầu xuất chiêu";

  const primaryIcon = !wordHeard || !sentenceHeard
    ? <Headphones aria-hidden="true" />
    : phase === "result"
      ? <ChevronRight aria-hidden="true" />
      : phase === "error"
        ? <RotateCcw aria-hidden="true" />
        : <Mic2 aria-hidden="true" />;

  const reportWeakWord = currentAssessment ? weakWord(currentAssessment) : null;
  const reportPresentation = currentAssessment
    ? buildPronunciationReportPresentation(currentAssessment, phrase.chinese)
    : null;
  const focusToneLabel = phrase.focusTones
    .map((tone) => tone === 0 ? "thanh nhẹ" : `thanh ${tone}`)
    .join(" + ");

  return (
    <main className="pronunciation-quest-page jade-resonance">
      <section
        className={`pronunciation-quest-shell ${lessonLibraryOpen ? "has-library" : ""}`}
        aria-labelledby="pronunciation-quest-title"
      >
        <header className="pronunciation-quest-hud">
          <div className="pronunciation-quest-brand">
            <span className="pronunciation-quest-sigil" aria-hidden="true"><Radio /></span>
            <div>
              <p>CỘNG HƯỞNG NGỌC · LUYỆN NÓI</p>
              <h1 id="pronunciation-quest-title">Vạn Âm Điện</h1>
            </div>
          </div>
          <button
            className="pronunciation-library-trigger"
            data-testid="pronunciation-source-lesson"
            type="button"
            onClick={() => setLessonLibraryOpen(true)}
            aria-haspopup="dialog"
          >
            <LibraryBig aria-hidden="true" />
            <span>
              <small>CHỌN BÀI LUYỆN · {lessonOptions.length} BÀI ĐÃ MỞ</small>
              <strong>{mission.anchorLessonTitle}</strong>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
          <div className="pronunciation-quest-progress">
            <span>{completedPhrases.size}/{phrases.length} khẩu quyết</span>
            <div
              role="progressbar"
              aria-label="Tiến độ phiên luyện đọc"
              aria-valuemin={0}
              aria-valuemax={phrases.length}
              aria-valuenow={completedPhrases.size}
            >
              <i style={{ width: `${phrases.length ? completedPhrases.size / phrases.length * 100 : 0}%` }} />
            </div>
            <strong>+{PRONUNCIATION_QUEST_XP} XP phiên luyện</strong>
          </div>
        </header>

        {sessionComplete ? (
          <PronunciationQuestComplete
            lessonTitle={mission.anchorLessonTitle}
            phraseCount={phrases.length}
            assessedCount={Math.max(0, phrases.length - manualPhrases.size)}
            rewardAwarded={rewardAwarded}
            onChooseLesson={() => setLessonLibraryOpen(true)}
            onReplay={() => {
              setPhraseIndex(0);
              setHeardWords(new Set());
              setHeardSentences(new Set());
              setCompletedPhrases(new Set());
              setManualPhrases(new Set());
              setRewardAwarded(false);
            }}
          />
        ) : (
          <>
            <nav className="pronunciation-quest-steps" aria-label="Ba bước luyện câu">
              {[
                [1, "Khai Nhãn", "Nhìn & nghe từ"],
                [2, "Thính Âm", "Nghe cả câu"],
                [3, "Xuất Chiêu", "Đọc & nhận phản hồi"],
              ].map(([step, lore, plain]) => (
                <div
                  key={String(step)}
                  className={currentStep === step ? "active" : currentStep > Number(step) ? "done" : ""}
                  aria-current={currentStep === step ? "step" : undefined}
                >
                  <span>{String(step).padStart(2, "0")}</span>
                  <strong>{lore}</strong>
                  <small>{plain}</small>
                </div>
              ))}
            </nav>

            <section className="pronunciation-quest-arena" data-phase={phase}>
              <div className="pronunciation-quest-atmosphere" aria-hidden="true">
                <i /><i /><i />
              </div>

              {currentAssessment ? (
                <section
                  className="pronunciation-battle-report"
                  data-testid="acoustic-assessment-result"
                  aria-labelledby="pronunciation-report-title"
                >
                  <div className="pronunciation-report-score">
                    <span>{reportPresentation?.primaryLabel}</span>
                    <strong>{reportPresentation?.primaryScore}</strong>
                    <small>/100 · beta</small>
                  </div>
                  <div className="pronunciation-report-copy">
                    <p>KHẨU QUYẾT {phraseIndex + 1} · ĐÃ ĐỐI CHIẾU</p>
                    <h2 id="pronunciation-report-title">Máy đã phân tích câu bạn vừa đọc</h2>
                    <span>Máy nghe được: “{currentAssessment.transcript}”</span>
                    <dl>
                      <div><dt>Âm đọc</dt><dd>{Math.round(currentAssessment.aggregate.accuracyScore)}</dd></div>
                      <div>
                        <dt>Nhịp câu</dt>
                        {reportPresentation?.fluencyScore === null
                          ? <dd className="report-text-metric">Chưa đủ mẫu</dd>
                          : <dd>{reportPresentation?.fluencyScore}</dd>}
                      </div>
                      <div>
                        <dt>Đủ câu</dt>
                        <dd>
                          {reportPresentation?.matchedCharacters}/{reportPresentation?.targetCharacters}
                          <small>{reportPresentation?.completenessPercent}% chữ khớp</small>
                        </dd>
                      </div>
                    </dl>
                    {reportWeakWord ? (
                      <p className="pronunciation-report-advice">
                        <Volume2 aria-hidden="true" /> Luyện lại từ <strong>{reportWeakWord.word}</strong> trước nếu muốn cải thiện.
                      </p>
                    ) : null}
                    <small>{reportPresentation?.shortSample
                      ? "Câu này quá ngắn để cho điểm nhịp đáng tin; điểm chính chỉ phản ánh độ khớp âm. Độ đủ câu lấy từ phần chữ máy nhận được."
                      : "Điểm Azure beta chưa hiệu chuẩn cho người Việt và chưa chấm thanh điệu riêng; không phải độ giống người bản ngữ."}</small>
                  </div>
                </section>
              ) : (
                <div className="pronunciation-quest-target">
                  <div className="jade-instrument">
                  <div className="jade-voice-seal" data-state={phase === "recording" ? "recording" : phase === "uploading" || phase === "requesting" ? "processing" : isPlaying ? "playing" : "idle"} aria-hidden="true">
                    <svg viewBox="0 0 240 240"><circle className="jade-seal-base" cx="120" cy="120" r="84" /><circle className="jade-seal-orbit" cx="120" cy="120" r="94" />
                      {Array.from({length:48},(_,index)=><line key={index} x1="120" y1="12" x2="120" y2={index % 4 === 0 ? 28 : 22} transform={`rotate(${index * 7.5} 120 120)`} className={index % 4 === 0 ? "gold" : ""} />)}
                      <circle className="jade-seal-ripple" cx="120" cy="120" r="74" />
                      <circle className="jade-seal-ripple jade-seal-echo" cx="120" cy="120" r="74" />
                    </svg>
                    <Mic className="jade-seal-mic" />
                  </div>
                  <span className="jade-instrument-caption">{phase === "recording" ? "ĐANG THU GIỌNG" : phase === "uploading" || phase === "requesting" ? "ĐANG XỬ LÝ" : isPlaying ? "ĐANG PHÁT ÂM MẪU" : "LẮNG NGHE · CẢM NHẬN · CẤT LỜI"}</span>
                  </div>
                  <div className="jade-lesson-copy" key={phrase.id}>
                  <p>KHẨU QUYẾT {String(phraseIndex + 1).padStart(2, "0")} · TỪ TRỌNG TÂM</p>
                  <div className="pronunciation-focus-word">
                    <strong>{phrase.focusWord}</strong>
                    <span>{phrase.focusWordPinyin}</span>
                    <small>{phrase.focusWordMeaning} · {focusToneLabel}</small>
                  </div>
                  <h2 data-testid="practice-target-chinese">{renderSentence(phrase.chinese, phrase.focusWord)}</h2>
                  <h3>{phrase.pinyin}</h3>
                  <p className="pronunciation-quest-meaning">{phrase.meaning}</p>
                  <div className="jade-coach-note"><Headphones aria-hidden="true" /><p>{!wordHeard ? "Bắt đầu từ một âm rõ ràng." : !sentenceHeard ? "Nối từng âm thành nhịp câu." : "Đến lượt giọng nói của bạn."}<span>{!wordHeard ? "Nghe từ trọng tâm, chú ý âm đầu và thanh điệu trước khi nghe cả câu." : !sentenceHeard ? "Nghe hết câu mẫu, rồi thử đọc liền mạch theo nhịp bạn vừa nghe." : "Đọc câu phía trên ở tốc độ tự nhiên. Không cần nói quá nhanh."}</span></p></div>
                  {phase === "recording" ? (
                    <div className="pronunciation-quest-live" role="status">
                      <span><Radio aria-hidden="true" /> {speechDetected ? "Đã nghe giọng · tự dừng sau khoảng lặng" : "Đang chờ bạn bắt đầu đọc"}</span>
                      <small>Bạn vẫn có thể bấm nút bên dưới để dừng sớm.</small>
                    </div>
                  ) : phase === "uploading" || phase === "requesting" ? (
                    <div className="pronunciation-quest-live processing" role="status">
                      <span><Sparkles aria-hidden="true" /> {phase === "uploading" ? "Pháp trận đang đối chiếu âm học" : "Đang mở microphone"}</span>
                    </div>
                  ) : null}
                  {phase === "error" && error ? (
                    <div className="pronunciation-quest-error" data-testid="acoustic-assessment-error" role="alert">
                      <Info aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  ) : null}
                  </div>
                </div>
              )}
            </section>

            <footer className="pronunciation-quest-actions">
              {!wordHeard ? (
                <p><BookOpenCheck aria-hidden="true" /> Bước 1: nghe từ <strong>{phrase.focusWord}</strong> để nối bài học với câu thực hành.</p>
              ) : !sentenceHeard ? (
                <p><Headphones aria-hidden="true" /> Bước 2: nghe trọn câu rồi bắt chước nhịp đọc.</p>
              ) : !consent ? (
                <p><ShieldCheck aria-hidden="true" /> Bản WAV được gửi tới Microsoft Azure để chấm rồi giải phóng khỏi bộ nhớ HANZI.OS.</p>
              ) : (
                <p><Swords aria-hidden="true" /> Đọc tự nhiên; hệ thống sẽ tự dừng khoảng {AUTO_STOP_SILENCE_MS / 1_000} giây sau khi bạn nói xong.</p>
              )}
              <button
                className="pronunciation-quest-primary"
                data-testid={wordHeard && sentenceHeard ? "acoustic-capture-button" : "practice-primary-action"}
                type="button"
                onClick={runPrimaryAction}
                disabled={isPlaying || isRequestBusy || !sync.ownerKey}
              >
                {primaryIcon}
                <span>{primaryLabel}</span>
              </button>
              <div className="pronunciation-quest-secondary">
                {currentAssessment ? (
                  <button type="button" onClick={retry}><RotateCcw aria-hidden="true" /> Ghi lại để cải thiện</button>
                ) : wordHeard || sentenceHeard ? (
                  <button type="button" disabled={phase === "recording" || isRequestBusy || isPlaying} onClick={sentenceHeard ? playSentence : playWord}><Headphones aria-hidden="true" /> Nghe lại</button>
                ) : <span />}
                <details>
                  <summary>Tuỳ chọn & quyền riêng tư</summary>
                  <div>
                    <p>Chấm âm học là beta miễn phí. Bản thu không được HANZI.OS lưu lại và không tự nâng mastery.</p>
                    <Link to="/voice-data">Xem cách xử lý dữ liệu giọng nói</Link>
                    {consent ? <button type="button" onClick={withdrawConsent}>Rút đồng ý chấm âm học</button> : null}
                    <button type="button" onClick={() => moveToNext(true)}>Tôi đã tự luyện · tiếp tục không chấm</button>
                    {manualPhrases.has(phrase.id) ? <small>Câu này đã được tự xác nhận, không có điểm âm học.</small> : null}
                  </div>
                </details>
              </div>
            </footer>
          </>
        )}
        <PronunciationLessonLibrary
          open={lessonLibraryOpen}
          options={lessonOptions}
          selectedLessonId={mission.anchorLessonId}
          onClose={closeLessonLibrary}
          onSelect={selectLesson}
        />
      </section>
    </main>
  );
}
