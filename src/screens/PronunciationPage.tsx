import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Mic2,
  Radio,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router";
import { useAudioEngine, type VoicePlaybackPhase } from "../audio/AudioEngineProvider";
import {
  AcousticPronunciationClientError,
  assessAcousticPronunciation,
  type AcousticPronunciationAssessment,
} from "../audio/acousticPronunciationClient";
import {
  analyzeLocalMandarinTone,
  type LocalMandarinToneResult,
  type MandarinLexicalTone,
} from "../audio/localMandarinTone";
import {
  createMandarinPcmRecorder,
  MandarinRecorderError,
  type MandarinPcmRecorder,
  type MandarinPcmRecording,
  type MandarinRecorderAutoStopOutcome,
} from "../audio/mandarinPcmRecorder";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import {
  PRONUNCIATION_QUEST_XP,
  TRANSCRIPT_CLEAR_THRESHOLD,
  selectDailyPronunciationMission,
} from "../learning/pronunciationPractice";
import { makeIdempotencyKey } from "../lib/evidence";
import {
  ACOUSTIC_VOICE_CONSENT_STORAGE_KEY,
  createAcousticVoiceConsentReceipt,
  parseAcousticVoiceConsentReceipt,
} from "../lib/acousticVoiceConsent";
import { createMandarinRecognition } from "../lib/speech";
import { removeLocalStorage, writeLocalStorage } from "../lib/storageKeys";
import {
  createLocalVoiceConsentReceipt,
  parseLocalVoiceConsentReceipt,
} from "../lib/voiceConsent";
import { useLearning } from "../store/LearningStore";
import type { MandarinTone } from "../types";

type CapturePhase = VoicePlaybackPhase
  | "listening"
  | "processing"
  | "result"
  | "denied"
  | "unavailable";

type LocalTonePhase = "idle" | "requesting" | "recording" | "analyzing";
type AcousticPhase = "idle" | "requesting" | "recording" | "uploading" | "result" | "error";

interface LocalToneMeasurement {
  phraseId: string;
  result: LocalMandarinToneResult;
}

interface AcousticMeasurement {
  phraseId: string;
  assessment: AcousticPronunciationAssessment;
}

const toneData = [
  { id: 1, name: "Thanh 1", pinyin: "mā", sample: "妈", points: "8,28 50,28 92,28" },
  { id: 2, name: "Thanh 2", pinyin: "má", sample: "麻", points: "8,60 50,44 92,18" },
  { id: 3, name: "Thanh 3", pinyin: "mǎ", sample: "马", points: "8,36 42,64 62,66 92,40" },
  { id: 4, name: "Thanh 4", pinyin: "mà", sample: "骂", points: "8,16 46,40 92,68" },
  { id: 0, name: "Thanh nhẹ", pinyin: "ma", sample: "吗", points: "8,43 50,43 92,43" },
] satisfies Array<{
  id: MandarinTone;
  name: string;
  pinyin: string;
  sample: string;
  points: string;
}>;

const VOICE_CONSENT_KEY = "hanzi-os-voice-consent-v1";
const RECOGNITION_RESULT_TIMEOUT_MS = 6_000;
const RECOGNITION_LISTEN_TIMEOUT_MS = 18_000;
const RESULT_TIMEOUT_MESSAGE = "Không nhận được kết quả sau 6 giây. Câu chưa được tính — hãy thử lại.";

const readVoiceConsent = () => {
  try {
    return Boolean(parseLocalVoiceConsentReceipt(
      localStorage.getItem(VOICE_CONSENT_KEY),
    ));
  } catch {
    return false;
  }
};

const readAcousticVoiceConsent = (ownerKey: string) => {
  if (!ownerKey) return false;
  try {
    return Boolean(parseAcousticVoiceConsentReceipt(
      localStorage.getItem(ACOUSTIC_VOICE_CONSENT_STORAGE_KEY),
      ownerKey,
    ));
  } catch {
    return false;
  }
};

const normalizeTranscript = (value: string) => value
  .normalize("NFKC")
  .replace(/[^\p{Script=Han}a-z0-9]/giu, "")
  .toLowerCase();

const editDistance = (left: string[], right: string[]) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? right.length;
};

const transcriptMatchScore = (heard: string, target: string) => {
  const heardCharacters = [...normalizeTranscript(heard)];
  const targetCharacters = [...normalizeTranscript(target)];
  if (!heardCharacters.length || !targetCharacters.length) return 0;
  const longest = Math.max(heardCharacters.length, targetCharacters.length);
  return Math.max(
    0,
    Math.min(100, Math.round((1 - editDistance(heardCharacters, targetCharacters) / longest) * 100)),
  );
};

const toneLabel = (tone: MandarinTone) => tone === 0 ? "nhẹ" : String(tone);

const asLexicalTone = (tone: MandarinTone): MandarinLexicalTone | null =>
  tone === 1 || tone === 2 || tone === 3 || tone === 4 ? tone : null;

const buildObservedTonePoints = (contour: readonly number[]) => contour
  .map((semitones, index) => {
    const progress = contour.length <= 1 ? 0.5 : index / (contour.length - 1);
    const x = 8 + progress * 84;
    const y = Math.max(10, Math.min(70, 42 - semitones * 6.5));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  })
  .join(" ");

const localToneRecorderErrorMessage = (error: unknown) => {
  if (!(error instanceof MandarinRecorderError)) {
    return "Chưa mở được phép đo. Hãy kiểm tra microphone rồi thử lại.";
  }
  switch (error.code) {
    case "permission-denied":
      return "Chưa có quyền microphone. Hãy cấp quyền rồi thử lại.";
    case "device-unavailable":
      return "Không tìm thấy microphone đang hoạt động.";
    case "too-short":
      return "Âm quá ngắn. Hãy giữ âm tiết rõ hơn một chút rồi thử lại.";
    case "unsupported":
      return "Trình duyệt này chưa hỗ trợ đo đường thanh trên thiết bị.";
    case "too-large":
      return "Bản thu vượt giới hạn an toàn. Hãy đọc một âm tiết ngắn hơn.";
    default:
      return "Chưa đo được đường thanh. Hãy đưa micro gần hơn rồi thử lại.";
  }
};

const acousticRecorderErrorMessage = (error: unknown) => {
  if (!(error instanceof MandarinRecorderError)) {
    return "Chưa mở được bản thu. Hãy kiểm tra microphone rồi thử lại.";
  }
  switch (error.code) {
    case "permission-denied":
      return "Chưa có quyền microphone. Hãy cấp quyền rồi thử lại.";
    case "device-unavailable":
      return "Không tìm thấy microphone đang hoạt động.";
    case "too-short":
      return "Bản thu quá ngắn. Hãy đọc trọn câu rồi mới dừng.";
    case "too-large":
      return "Bản thu vượt giới hạn an toàn 15 giây. Hãy đọc lại câu ngắn gọn hơn.";
    case "unsupported":
      return "Trình duyệt này chưa hỗ trợ ghi WAV để chấm âm học.";
    default:
      return "Chưa tạo được bản thu an toàn. Hãy kiểm tra microphone rồi thử lại.";
  }
};

const localToneUnscorableDetail = (result: Extract<LocalMandarinToneResult, { status: "unscorable" }>) => {
  switch (result.reason) {
    case "clipping-detected":
      return "Âm bị vỡ; lùi micro ra một chút và đọc lại.";
    case "recording-too-short":
      return "Âm quá ngắn; giữ âm tiết rõ hơn một chút.";
    case "recording-too-long":
      return "Chỉ đọc riêng một âm tiết, không đọc cả câu.";
    case "insufficient-energy":
    case "insufficient-voicing":
      return "Tín hiệu giọng còn yếu; đưa micro gần hơn và đọc rõ một âm tiết.";
    case "unstable-pitch":
      return "Cao độ chưa ổn định; thử đọc chậm và liền tiếng hơn.";
    case "unsupported-neutral-tone":
      return "Thanh nhẹ chưa được đo ổn định bằng chế độ trên máy.";
    case "unsupported-multiple-syllables":
      return "Chế độ này hiện chỉ đo một âm tiết đứng riêng.";
    default:
      return "Bản thu chưa đủ rõ để phân tích; hãy thử lại.";
  }
};

export function PronunciationPage() {
  const { state, actions, sync } = useLearning();
  const { cancelSpeech, playback, speakMandarin } = useAudioEngine();
  const location = useLocation();
  const requestedLessonId = useMemo(
    () => new URLSearchParams(location.search).get("lesson"),
    [location.search],
  );
  const mission = useMemo(
    () => selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      requestedLessonId,
      date: new Date(),
    }),
    [requestedLessonId, state],
  );
  const practicePhrases = mission.challenges;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [activeTone, setActiveTone] = useState<MandarinTone>(1);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [voiceConsent, setVoiceConsent] = useState(readVoiceConsent);
  const [completedPhraseIds, setCompletedPhraseIds] = useState<Set<string>>(() => new Set());
  const [heardFocusWordIds, setHeardFocusWordIds] = useState<Set<string>>(() => new Set());
  const [heardPhraseIds, setHeardPhraseIds] = useState<Set<string>>(() => new Set());
  const [localTonePhase, setLocalTonePhase] = useState<LocalTonePhase>("idle");
  const [localToneMeasurement, setLocalToneMeasurement] = useState<LocalToneMeasurement | null>(null);
  const [localToneError, setLocalToneError] = useState("");
  const [acousticConsent, setAcousticConsent] = useState(false);
  const [acousticPhase, setAcousticPhase] = useState<AcousticPhase>("idle");
  const [acousticMeasurement, setAcousticMeasurement] = useState<AcousticMeasurement | null>(null);
  const [acousticError, setAcousticError] = useState("");
  const [acousticSpeechDetected, setAcousticSpeechDetected] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createMandarinRecognition>>(null);
  const recognitionDeadlineRef = useRef<number | null>(null);
  const activeAttemptRef = useRef(0);
  const localToneRecorderRef = useRef<MandarinPcmRecorder | null>(null);
  const localToneAttemptRef = useRef(0);
  const localToneFinalizingRef = useRef<number | null>(null);
  const localToneContextRef = useRef<{
    attemptId: number;
    phraseId: string;
    targetTone: MandarinLexicalTone;
  } | null>(null);
  const acousticRecorderRef = useRef<MandarinPcmRecorder | null>(null);
  const acousticAttemptRef = useRef(0);
  const acousticFinalizingRef = useRef<number | null>(null);
  const acousticAbortRef = useRef<AbortController | null>(null);
  const acousticContextRef = useRef<{
    attemptId: number;
    phraseId: string;
    activityId: string;
  } | null>(null);
  const rewardedMissionRef = useRef("");
  const phrase = practicePhrases[Math.min(phraseIndex, Math.max(0, practicePhrases.length - 1))];
  const activeToneData = toneData.find((tone) => tone.id === activeTone) ?? toneData[0];
  const phraseVoiceSource = `pronunciation:phrase:${phrase.id}`;
  const focusWordVoiceSource = `pronunciation:word:${phrase.focusWordId}`;
  const focusWordHeard = heardFocusWordIds.has(phrase.id);
  const phraseSampleHeard = heardPhraseIds.has(phrase.id);
  const guideReady = focusWordHeard && phraseSampleHeard;
  const phraseCleared = completedPhraseIds.has(phrase.id);
  const phraseSelfConfirmed = phraseCleared && score === null && capturePhase === "result";
  const sessionCompleted = completedPhraseIds.size === practicePhrases.length;
  const sessionCompletedCount = completedPhraseIds.size;
  const listening = capturePhase === "listening";
  const samplePlaying = playback.sourceId === phraseVoiceSource
    && (playback.phase === "preparing" || playback.phase === "playing");
  const focusWordPlaying = playback.sourceId === focusWordVoiceSource
    && (playback.phase === "preparing" || playback.phase === "playing");
  const captureActive = capturePhase === "listening"
    || capturePhase === "processing";
  const currentAcousticAssessment = acousticMeasurement?.phraseId === phrase.id
    ? acousticMeasurement.assessment
    : null;
  const acousticRecording = acousticPhase === "recording";
  const acousticRequestBusy = acousticPhase === "requesting"
    || acousticPhase === "uploading";
  const acousticBusy = acousticRequestBusy || acousticRecording;
  const sessionCompletionVisible = sessionCompleted
    && (!acousticConsent || Boolean(currentAcousticAssessment));
  const signalActive = samplePlaying
    || focusWordPlaying
    || captureActive
    || acousticPhase === "requesting"
    || acousticPhase === "recording"
    || acousticPhase === "uploading";
  const wordStepState = focusWordPlaying ? "active" : focusWordHeard ? "complete" : "ready";
  const contextStepState = samplePlaying
    ? "active"
    : phraseSampleHeard ? "complete" : focusWordHeard ? "ready" : "pending";
  const speakStepState = acousticConsent
    ? acousticPhase === "requesting" || acousticPhase === "recording"
      ? "active"
      : acousticPhase === "uploading" || Boolean(currentAcousticAssessment)
        ? "complete"
        : guideReady ? "ready" : "pending"
    : capturePhase === "listening"
      ? "active"
      : phraseCleared ? "complete" : guideReady ? "ready" : "pending";
  const compareStepState = acousticConsent
    ? acousticPhase === "uploading"
      ? "active"
      : currentAcousticAssessment
        ? "complete"
        : acousticPhase === "error" ? "ready" : "pending"
    : capturePhase === "processing"
      ? "active"
      : phraseCleared ? "complete" : score !== null || error ? "ready" : "pending";
  const recognitionFallback = !voiceConsent
    || capturePhase === "unavailable"
    || capturePhase === "denied";
  const focusToneTarget = phrase.focusSyllables.length === 1
    ? asLexicalTone(phrase.focusSyllables[0]?.lexicalTone ?? 0)
    : null;
  const localToneUnsupportedReason = phrase.focusSyllables.length !== 1
    ? "Đo trên máy hiện chỉ hỗ trợ từ trọng tâm một âm tiết. Hãy nghe mẫu rồi luyện trong cả câu."
    : focusToneTarget === null
      ? "Thanh nhẹ chưa đo ổn định trên máy. Hãy nghe mẫu rồi luyện trong cả câu."
      : "";
  const localToneBusy = localTonePhase !== "idle";
  const currentToneMeasurement = localToneMeasurement?.phraseId === phrase.id
    ? localToneMeasurement.result
    : null;
  const analyzedToneMeasurement = currentToneMeasurement?.status === "analyzed"
    ? currentToneMeasurement
    : null;
  const observedTonePoints = analyzedToneMeasurement && activeTone === analyzedToneMeasurement.targetTone
    ? buildObservedTonePoints(analyzedToneMeasurement.contourSemitones)
    : "";

  const clearRecognitionTimer = () => {
    if (recognitionDeadlineRef.current !== null) {
      window.clearTimeout(recognitionDeadlineRef.current);
      recognitionDeadlineRef.current = null;
    }
  };

  const invalidateRecognition = () => {
    activeAttemptRef.current += 1;
    clearRecognitionTimer();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.abort();
    } catch {
      // Provider already ended.
    }
  };

  const settleRecognitionFailure = (
    attemptId: number,
    message: string,
    phase: "error" | "denied" | "unavailable" = "error",
  ) => {
    if (attemptId !== activeAttemptRef.current) return;
    activeAttemptRef.current += 1;
    clearRecognitionTimer();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.abort();
    } catch {
      // Provider already ended.
    }
    setCapturePhase(phase);
    setError(message);
  };

  const armRecognitionDeadline = (
    attemptId: number,
    delay: number,
    message: string,
  ) => {
    if (recognitionDeadlineRef.current !== null) {
      window.clearTimeout(recognitionDeadlineRef.current);
    }
    recognitionDeadlineRef.current = window.setTimeout(() => {
      settleRecognitionFailure(attemptId, message);
    }, delay);
  };

  const resetCurrentRound = () => {
    invalidateRecognition();
    setTranscript("");
    setScore(null);
    setError("");
    setCapturePhase("idle");
  };

  const resetLocalToneRound = () => {
    localToneAttemptRef.current += 1;
    localToneFinalizingRef.current = null;
    localToneContextRef.current = null;
    const recorder = localToneRecorderRef.current;
    localToneRecorderRef.current = null;
    if (recorder) void recorder.abort().catch(() => undefined);
    setLocalTonePhase("idle");
    setLocalToneMeasurement(null);
    setLocalToneError("");
  };

  const resetAcousticRound = () => {
    acousticAttemptRef.current += 1;
    acousticFinalizingRef.current = null;
    acousticContextRef.current = null;
    acousticAbortRef.current?.abort();
    acousticAbortRef.current = null;
    const recorder = acousticRecorderRef.current;
    acousticRecorderRef.current = null;
    if (recorder) void recorder.abort().catch(() => undefined);
    setAcousticPhase("idle");
    setAcousticMeasurement(null);
    setAcousticError("");
    setAcousticSpeechDetected(false);
  };

  useEffect(() => () => {
    activeAttemptRef.current += 1;
    if (recognitionDeadlineRef.current !== null) {
      window.clearTimeout(recognitionDeadlineRef.current);
    }
    try { recognitionRef.current?.abort(); } catch { /* Provider already ended. */ }
    localToneAttemptRef.current += 1;
    const recorder = localToneRecorderRef.current;
    localToneRecorderRef.current = null;
    if (recorder) void recorder.abort().catch(() => undefined);
    acousticAttemptRef.current += 1;
    acousticAbortRef.current?.abort();
    acousticAbortRef.current = null;
    const acousticRecorder = acousticRecorderRef.current;
    acousticRecorderRef.current = null;
    if (acousticRecorder) void acousticRecorder.abort().catch(() => undefined);
  }, []);

  useEffect(() => {
    acousticAttemptRef.current += 1;
    acousticFinalizingRef.current = null;
    acousticContextRef.current = null;
    acousticAbortRef.current?.abort();
    acousticAbortRef.current = null;
    const recorder = acousticRecorderRef.current;
    acousticRecorderRef.current = null;
    if (recorder) void recorder.abort().catch(() => undefined);
    setAcousticConsent(readAcousticVoiceConsent(sync.ownerKey));
    setAcousticPhase("idle");
    setAcousticMeasurement(null);
    setAcousticError("");
  }, [sync.ownerKey]);

  useEffect(() => {
    const relevantTone = phrase.focusTones.find((tone) => tone !== 0)
      ?? phrase.focusTones[0]
      ?? 1;
    setActiveTone(relevantTone);
  }, [phrase.focusTones, phrase.id]);

  useEffect(() => {
    localToneAttemptRef.current += 1;
    localToneFinalizingRef.current = null;
    localToneContextRef.current = null;
    const recorder = localToneRecorderRef.current;
    localToneRecorderRef.current = null;
    if (recorder) void recorder.abort().catch(() => undefined);
    setLocalTonePhase("idle");
    setLocalToneMeasurement(null);
    setLocalToneError("");
    acousticAttemptRef.current += 1;
    acousticFinalizingRef.current = null;
    acousticContextRef.current = null;
    acousticAbortRef.current?.abort();
    acousticAbortRef.current = null;
    const acousticRecorder = acousticRecorderRef.current;
    acousticRecorderRef.current = null;
    if (acousticRecorder) void acousticRecorder.abort().catch(() => undefined);
    setAcousticPhase("idle");
    setAcousticMeasurement(null);
    setAcousticError("");
  }, [phrase.id]);

  useEffect(() => {
    const isCurrentSample = playback.sourceId === focusWordVoiceSource
      || playback.sourceId === phraseVoiceSource;
    if (!isCurrentSample) return;
    if (playback.phase === "error") {
      setError("Không phát được âm mẫu trên thiết bị này. Hãy bấm lại hoặc chọn Bỏ hướng dẫn âm thanh.");
      return;
    }
    if (playback.phase === "ended") {
      setError("");
      if (playback.sourceId === focusWordVoiceSource) {
        setHeardFocusWordIds((current) => new Set(current).add(phrase.id));
      }
      if (playback.sourceId === phraseVoiceSource) {
        setHeardPhraseIds((current) => new Set(current).add(phrase.id));
      }
    }
  }, [focusWordVoiceSource, phrase.id, phraseVoiceSource, playback.phase, playback.sourceId]);

  useEffect(() => {
    activeAttemptRef.current += 1;
    if (recognitionDeadlineRef.current !== null) {
      window.clearTimeout(recognitionDeadlineRef.current);
      recognitionDeadlineRef.current = null;
    }
    try { recognitionRef.current?.abort(); } catch { /* Provider already ended. */ }
    recognitionRef.current = null;
    setPhraseIndex(0);
    setCompletedPhraseIds(new Set<string>());
    setHeardFocusWordIds(new Set<string>());
    setHeardPhraseIds(new Set<string>());
    setTranscript("");
    setScore(null);
    setError("");
    setCapturePhase("idle");
    localToneAttemptRef.current += 1;
    localToneFinalizingRef.current = null;
    localToneContextRef.current = null;
    const localRecorder = localToneRecorderRef.current;
    localToneRecorderRef.current = null;
    if (localRecorder) void localRecorder.abort().catch(() => undefined);
    setLocalTonePhase("idle");
    setLocalToneMeasurement(null);
    setLocalToneError("");
    acousticAttemptRef.current += 1;
    acousticFinalizingRef.current = null;
    acousticContextRef.current = null;
    acousticAbortRef.current?.abort();
    acousticAbortRef.current = null;
    const acousticRecorder = acousticRecorderRef.current;
    acousticRecorderRef.current = null;
    if (acousticRecorder) void acousticRecorder.abort().catch(() => undefined);
    setAcousticPhase("idle");
    setAcousticMeasurement(null);
    setAcousticError("");
  }, [mission.id]);

  useEffect(() => {
    if (!sessionCompleted || rewardedMissionRef.current === mission.rewardKey) return;
    rewardedMissionRef.current = mission.rewardKey;
    actions.completePronunciationMission(mission.rewardKey);
  }, [actions, mission.rewardKey, sessionCompleted]);

  const grantVoiceConsent = () => {
    const stored = writeLocalStorage(
      VOICE_CONSENT_KEY,
      JSON.stringify(createLocalVoiceConsentReceipt()),
    );
    if (!stored) {
      setError("Không thể lưu đồng ý trên thiết bị; microphone chưa được mở.");
      return;
    }
    setVoiceConsent(true);
    setCapturePhase("idle");
    setError("");
  };

  const withdrawVoiceConsent = () => {
    if (!removeLocalStorage(VOICE_CONSENT_KEY)) {
      setError("Không thể cập nhật đồng ý trên thiết bị. Hãy kiểm tra quyền lưu trữ của trình duyệt.");
      return;
    }
    invalidateRecognition();
    setCapturePhase("idle");
    setVoiceConsent(false);
    setError("");
  };

  const grantAcousticConsent = () => {
    if (!sync.ownerKey) {
      setAcousticPhase("error");
      setAcousticError("Hồ sơ cục bộ chưa sẵn sàng. Hãy chờ một chút rồi thử lại.");
      return;
    }
    const stored = writeLocalStorage(
      ACOUSTIC_VOICE_CONSENT_STORAGE_KEY,
      JSON.stringify(createAcousticVoiceConsentReceipt(sync.ownerKey)),
    );
    if (!stored) {
      setAcousticPhase("error");
      setAcousticError("Không thể lưu lựa chọn trên thiết bị; bản thu chưa được gửi đi.");
      return;
    }
    setAcousticConsent(true);
    setAcousticPhase("idle");
    setAcousticError("");
  };

  const withdrawAcousticConsent = () => {
    if (!removeLocalStorage(ACOUSTIC_VOICE_CONSENT_STORAGE_KEY)) {
      setAcousticPhase("error");
      setAcousticError("Không thể cập nhật lựa chọn trên thiết bị. Hãy kiểm tra quyền lưu trữ.");
      return;
    }
    resetAcousticRound();
    setAcousticConsent(false);
  };

  const movePhrase = (direction: number) => {
    cancelSpeech();
    resetCurrentRound();
    resetLocalToneRound();
    resetAcousticRound();
    setPhraseIndex((current) =>
      (current + direction + practicePhrases.length) % practicePhrases.length
    );
  };

  const moveToNextOpenPhrase = () => {
    const nextOffset = Array.from({ length: practicePhrases.length }, (_, offset) => offset + 1)
      .find((offset) => {
        const index = (phraseIndex + offset) % practicePhrases.length;
        return !completedPhraseIds.has(practicePhrases[index].id);
      });
    if (nextOffset === undefined) return;
    movePhrase(nextOffset);
  };

  const acceptAcousticResultAndContinue = () => {
    if (!currentAcousticAssessment) return;
    const completed = new Set(completedPhraseIds).add(phrase.id);
    setCompletedPhraseIds(completed);
    const nextOffset = Array.from({ length: practicePhrases.length }, (_, offset) => offset + 1)
      .find((offset) => {
        const index = (phraseIndex + offset) % practicePhrases.length;
        return !completed.has(practicePhrases[index].id);
      });
    if (nextOffset !== undefined) movePhrase(nextOffset);
  };

  const playPhraseSample = () => {
    const started = speakMandarin(phrase.chinese, 0.68, phraseVoiceSource);
    if (!started) {
      setError("Thiết bị chưa phát được âm mẫu tổng hợp. Bạn có thể bỏ hướng dẫn âm thanh và tự đọc.");
    }
  };

  const playFocusWord = () => {
    const started = speakMandarin(phrase.focusWord, 0.58, focusWordVoiceSource);
    if (!started) {
      setError("Thiết bị chưa phát được từ mẫu tổng hợp. Bạn có thể bỏ hướng dẫn âm thanh và tự đọc.");
    }
  };

  const skipAudioGuidance = () => {
    cancelSpeech();
    setHeardFocusWordIds((current) => new Set(current).add(phrase.id));
    setHeardPhraseIds((current) => new Set(current).add(phrase.id));
    setError("");
  };

  const completeWithoutRecognition = () => {
    cancelSpeech();
    invalidateRecognition();
    setCapturePhase("result");
    setTranscript("");
    setScore(null);
    setError("");
    setCompletedPhraseIds((current) => new Set(current).add(phrase.id));
  };

  const skipCurrentPhrase = () => {
    movePhrase(1);
  };

  const restartSession = () => {
    cancelSpeech();
    invalidateRecognition();
    resetLocalToneRound();
    resetAcousticRound();
    setPhraseIndex(0);
    setCompletedPhraseIds(new Set<string>());
    setTranscript("");
    setScore(null);
    setError("");
    setCapturePhase("idle");
  };

  const analyzeLocalToneRecording = async (
    attemptId: number,
    targetPhraseId: string,
    targetTone: MandarinLexicalTone,
    recording: MandarinPcmRecording,
  ) => {
    if (
      attemptId !== localToneAttemptRef.current
      || localToneFinalizingRef.current === attemptId
    ) return;
    localToneFinalizingRef.current = attemptId;
    localToneRecorderRef.current = null;
    localToneContextRef.current = null;
    setLocalTonePhase("analyzing");
    try {
      const result = await analyzeLocalMandarinTone(recording, {
        tone: targetTone,
        syllableCount: 1,
        speechMode: "isolated",
      });
      if (attemptId !== localToneAttemptRef.current) return;
      setLocalToneMeasurement({ phraseId: targetPhraseId, result });
      setLocalToneError("");
      setActiveTone(targetTone);
    } catch {
      if (attemptId !== localToneAttemptRef.current) return;
      setLocalToneMeasurement(null);
      setLocalToneError("Chưa phân tích được đường thanh. Hãy thử ghi lại một âm tiết.");
    } finally {
      if (attemptId === localToneAttemptRef.current) {
        localToneFinalizingRef.current = null;
        setLocalTonePhase("idle");
      }
    }
  };

  const settleLocalToneRecorder = (
    attemptId: number,
    outcome: MandarinRecorderAutoStopOutcome,
    targetPhraseId: string,
    targetTone: MandarinLexicalTone,
  ) => {
    if (attemptId !== localToneAttemptRef.current) return;
    if (outcome.ok) {
      void analyzeLocalToneRecording(attemptId, targetPhraseId, targetTone, outcome.recording);
      return;
    }
    localToneRecorderRef.current = null;
    localToneContextRef.current = null;
    setLocalTonePhase("idle");
    setLocalToneMeasurement(null);
    setLocalToneError(localToneRecorderErrorMessage(outcome.error));
  };

  const startLocalToneCapture = async () => {
    if (focusToneTarget === null) {
      setLocalToneError(localToneUnsupportedReason);
      return;
    }
    if (captureActive) {
      setLocalToneError("Hãy hoàn tất lượt đọc cả câu trước khi đo riêng đường thanh.");
      return;
    }

    cancelSpeech();
    resetLocalToneRound();
    const attemptId = localToneAttemptRef.current;
    const targetPhraseId = phrase.id;
    const targetTone = focusToneTarget;
    const recorder = createMandarinPcmRecorder({
      minDurationMs: 360,
      maxDurationMs: 2_400,
      onAutoStop: (outcome) => {
        settleLocalToneRecorder(attemptId, outcome, targetPhraseId, targetTone);
      },
    });
    localToneRecorderRef.current = recorder;
    localToneContextRef.current = { attemptId, phraseId: targetPhraseId, targetTone };
    setLocalTonePhase("requesting");
    setLocalToneMeasurement(null);
    setLocalToneError("");
    try {
      await recorder.start();
      if (attemptId !== localToneAttemptRef.current) {
        await recorder.abort().catch(() => undefined);
        return;
      }
      setLocalTonePhase("recording");
    } catch (captureError) {
      if (attemptId !== localToneAttemptRef.current) return;
      localToneRecorderRef.current = null;
      localToneContextRef.current = null;
      setLocalTonePhase("idle");
      setLocalToneError(localToneRecorderErrorMessage(captureError));
    }
  };

  const stopLocalToneCapture = async () => {
    const recorder = localToneRecorderRef.current;
    const context = localToneContextRef.current;
    if (!recorder || !context) return;
    setLocalTonePhase("analyzing");
    try {
      const recording = await recorder.stop();
      await analyzeLocalToneRecording(
        context.attemptId,
        context.phraseId,
        context.targetTone,
        recording,
      );
    } catch (captureError) {
      if (context.attemptId !== localToneAttemptRef.current) return;
      localToneRecorderRef.current = null;
      localToneContextRef.current = null;
      localToneFinalizingRef.current = null;
      setLocalTonePhase("idle");
      setLocalToneMeasurement(null);
      setLocalToneError(localToneRecorderErrorMessage(captureError));
    }
  };

  const submitAcousticRecording = async (
    attemptId: number,
    targetPhraseId: string,
    activityId: string,
    recording: MandarinPcmRecording,
  ) => {
    if (
      attemptId !== acousticAttemptRef.current
      || acousticFinalizingRef.current === attemptId
    ) return;
    acousticFinalizingRef.current = attemptId;
    acousticRecorderRef.current = null;
    acousticContextRef.current = null;
    const controller = new AbortController();
    acousticAbortRef.current = controller;
    setAcousticPhase("uploading");
    setAcousticError("");
    try {
      const response = await assessAcousticPronunciation({
        activityId,
        audio: recording.audio,
        quality: recording.quality,
        signal: controller.signal,
      });
      if (attemptId !== acousticAttemptRef.current) return;
      setAcousticMeasurement({
        phraseId: targetPhraseId,
        assessment: response.assessment,
      });
      setAcousticPhase("result");
    } catch (assessmentError) {
      if (attemptId !== acousticAttemptRef.current) return;
      setAcousticMeasurement(null);
      setAcousticPhase("error");
      setAcousticError(assessmentError instanceof AcousticPronunciationClientError
        ? assessmentError.userMessage
        : "Chưa chấm được bản thu. Bản thu không được lưu hay tính vào tiến độ.");
    } finally {
      if (attemptId === acousticAttemptRef.current) {
        acousticAbortRef.current = null;
        acousticFinalizingRef.current = null;
      }
    }
  };

  const settleAcousticRecorder = (
    attemptId: number,
    outcome: MandarinRecorderAutoStopOutcome,
    targetPhraseId: string,
    activityId: string,
  ) => {
    if (attemptId !== acousticAttemptRef.current) return;
    if (outcome.ok) {
      void submitAcousticRecording(
        attemptId,
        targetPhraseId,
        activityId,
        outcome.recording,
      );
      return;
    }
    acousticRecorderRef.current = null;
    acousticContextRef.current = null;
    setAcousticMeasurement(null);
    setAcousticPhase("error");
    setAcousticError(acousticRecorderErrorMessage(outcome.error));
  };

  const startAcousticCapture = async () => {
    const consentIsCurrent = readAcousticVoiceConsent(sync.ownerKey);
    if (!acousticConsent || !consentIsCurrent) {
      setAcousticConsent(false);
      setAcousticPhase("error");
      setAcousticError("Lựa chọn chấm âm học đã hết hiệu lực. Hãy bật lại trước khi gửi bản thu.");
      return;
    }
    if (!guideReady) {
      setAcousticPhase("error");
      setAcousticError("Hãy nghe từ và câu mẫu trước khi bắt đầu lượt chấm.");
      return;
    }
    if (acousticBusy || acousticRecorderRef.current) return;
    if (captureActive) {
      setAcousticPhase("error");
      setAcousticError("Hãy hoàn tất lượt nhận dạng hiện tại trước khi chấm âm học.");
      return;
    }

    cancelSpeech();
    if (localToneBusy) resetLocalToneRound();
    resetAcousticRound();
    const attemptId = acousticAttemptRef.current;
    const targetPhraseId = phrase.id;
    const activityId = phrase.activityId;
    const recorder = createMandarinPcmRecorder({
      minDurationMs: 500,
      maxDurationMs: 15_000,
      autoStopAfterSilenceMs: 1_100,
      onSpeechDetected: () => {
        if (attemptId === acousticAttemptRef.current) {
          setAcousticSpeechDetected(true);
        }
      },
      onAutoStop: (outcome) => {
        settleAcousticRecorder(attemptId, outcome, targetPhraseId, activityId);
      },
    });
    acousticRecorderRef.current = recorder;
    acousticContextRef.current = { attemptId, phraseId: targetPhraseId, activityId };
    setAcousticPhase("requesting");
    setAcousticMeasurement(null);
    setAcousticError("");
    setAcousticSpeechDetected(false);
    try {
      await recorder.start();
      if (attemptId !== acousticAttemptRef.current) {
        await recorder.abort().catch(() => undefined);
        return;
      }
      setAcousticPhase("recording");
    } catch (captureError) {
      if (attemptId !== acousticAttemptRef.current) return;
      acousticRecorderRef.current = null;
      acousticContextRef.current = null;
      setAcousticPhase("error");
      setAcousticError(acousticRecorderErrorMessage(captureError));
    }
  };

  const stopAcousticCapture = async () => {
    const recorder = acousticRecorderRef.current;
    const context = acousticContextRef.current;
    if (!recorder || !context) return;
    setAcousticPhase("uploading");
    try {
      const recording = await recorder.stop();
      await submitAcousticRecording(
        context.attemptId,
        context.phraseId,
        context.activityId,
        recording,
      );
    } catch (captureError) {
      if (context.attemptId !== acousticAttemptRef.current) return;
      acousticRecorderRef.current = null;
      acousticContextRef.current = null;
      acousticFinalizingRef.current = null;
      setAcousticMeasurement(null);
      setAcousticPhase("error");
      setAcousticError(acousticRecorderErrorMessage(captureError));
    }
  };

  const stopRecognition = () => {
    const attemptId = activeAttemptRef.current;
    try {
      recognitionRef.current?.stop();
    } catch {
      settleRecognitionFailure(
        attemptId,
        "Kênh nhận dạng đã đóng. Câu chưa được tính — hãy thử lại.",
      );
      return;
    }
    setCapturePhase("processing");
    armRecognitionDeadline(
      attemptId,
      RECOGNITION_RESULT_TIMEOUT_MS,
      RESULT_TIMEOUT_MESSAGE,
    );
  };

  const startRecognition = () => {
    if (acousticBusy || acousticRecorderRef.current) {
      setError("Hãy hoàn tất lượt chấm âm học hiện tại trước khi dùng nhận dạng chữ.");
      return;
    }
    if (!voiceConsent) {
      setError("Hãy bật nhận dạng trước khi mở microphone.");
      setCapturePhase("denied");
      return;
    }
    if (localToneBusy) resetLocalToneRound();
    const recognition = createMandarinRecognition();
    if (!recognition) {
      setError("Trình duyệt chưa hỗ trợ nhận dạng. Bạn vẫn có thể tự xác nhận lượt đọc.");
      setCapturePhase("unavailable");
      return;
    }

    cancelSpeech();
    invalidateRecognition();
    const attemptId = activeAttemptRef.current;
    recognitionRef.current = recognition;
    const idempotencyKey = makeIdempotencyKey(phrase.activityId);
    const targetPhraseId = phrase.id;
    const targetChinese = phrase.chinese;
    const acousticScoringWasSelected = acousticConsent;
    setError("");
    setScore(null);
    setTranscript("");
    recognition.onresult = (event) => {
      if (attemptId !== activeAttemptRef.current) return;
      const result = event.results[0]?.[0];
      if (!result) return;
      activeAttemptRef.current += 1;
      clearRecognitionTimer();
      recognitionRef.current = null;
      const nextScore = transcriptMatchScore(result.transcript, targetChinese);
      const cleared = nextScore >= TRANSCRIPT_CLEAR_THRESHOLD;

      if (cleared && !acousticScoringWasSelected) {
        setCompletedPhraseIds((current) => new Set(current).add(targetPhraseId));
      }

      actions.recordPracticeEvidence({
        idempotencyKey,
        activityVersion: `${CONTENT_VERSION}:browser-speech:2`,
        source: "pronunciation",
        method: "speech-transcript",
        activityId: phrase.activityId,
        skill: "speaking",
        outcome: "unverified",
        // Browser speech recognition only gives us a transcript. Keep the
        // edit-distance percentage as diagnostic metadata so it can never be
        // mistaken for a pronunciation, tone, or speaking-mastery score.
        score: null,
        metadata: {
          target: targetChinese,
          transcript: result.transcript,
          transcriptMatchPercent: nextScore,
          scoringMethod: "browser-transcript-edit-distance",
          sourceWordId: phrase.focusWordId,
          hsk: phrase.hsk,
        },
      });

      setTranscript(result.transcript);
      setScore(nextScore);
      setCapturePhase("result");
    };
    recognition.onerror = (event) => {
      const denied = event.error === "not-allowed";
      const unavailable = event.error === "audio-capture";
      const message = denied
        ? "Chưa có quyền microphone. Hãy cấp quyền rồi thử lại hoặc tự xác nhận."
        : unavailable
          ? "Không tìm thấy microphone. Bạn vẫn có thể tự xác nhận lượt đọc."
          : "Chưa nhận được câu nói. Hãy đưa micro gần hơn và thử lại.";
      settleRecognitionFailure(attemptId, message, denied ? "denied" : unavailable ? "unavailable" : "error");
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      settleRecognitionFailure(
        attemptId,
        "Kênh nhận dạng đã kết thúc nhưng không trả kết quả. Hãy thử lại.",
      );
    };

    try {
      recognition.start();
      setCapturePhase("listening");
      armRecognitionDeadline(
        attemptId,
        RECOGNITION_LISTEN_TIMEOUT_MS,
        "Không nghe thấy câu nói sau 18 giây. Hãy thử lại.",
      );
    } catch {
      settleRecognitionFailure(
        attemptId,
        "Không thể mở microphone. Hãy kiểm tra quyền của trình duyệt.",
        "unavailable",
      );
    }
  };

  const selectTone = (tone: MandarinTone) => {
    setActiveTone(tone);
    const sample = toneData.find((item) => item.id === tone)?.sample;
    if (sample) speakMandarin(sample, 0.62, `pronunciation:tone:${tone}`);
  };

  const resultHeading = error
    ? "Lượt này chưa được tính"
    : phraseSelfConfirmed
      ? "Lượt đọc đã được ghi nhận"
      : score !== null && score >= TRANSCRIPT_CLEAR_THRESHOLD
        ? "Bản ghi chữ khớp câu mục tiêu"
        : score !== null
          ? "Bản ghi chữ chưa khớp đủ câu"
          : "Sẵn sàng đối chiếu";
  const browserFeedbackVisible = score !== null
    || Boolean(error)
    || phraseSelfConfirmed
    || sessionCompletionVisible;
  const transcriptRecognized = score !== null && score >= TRANSCRIPT_CLEAR_THRESHOLD;
  const feedbackSuccess = sessionCompletionVisible || phraseSelfConfirmed;
  const feedbackClass = error
    ? "error"
    : feedbackSuccess
      ? "success"
      : transcriptRecognized
        ? "recognized"
        : "warning";
  const feedbackBody = sessionCompletionVisible
    ? `Phần thưởng đã ghi nhận · tối đa +${PRONUNCIATION_QUEST_XP} XP/ngày`
    : error || (phraseSelfConfirmed
      ? "Đã tính theo xác nhận của bạn, không dùng microphone."
      : `Trình duyệt ghi lại: “${transcript}”`);
  const feedbackNote = sessionCompletionVisible
    ? "XP hoạt động, không phải điểm năng lực nói."
    : phraseSelfConfirmed
      ? "Không có kết luận phát âm."
      : "Chưa chấm âm đầu, vận mẫu, thanh điệu hay độ giống giọng bản ngữ.";
  const needsBrowserRetry = score !== null && score < TRANSCRIPT_CLEAR_THRESHOLD
    || Boolean(error) && !recognitionFallback;
  const MainActionIcon = !focusWordHeard || !phraseSampleHeard
    ? Headphones
    : currentAcousticAssessment
      ? ChevronRight
      : acousticPhase === "error"
        ? RotateCcw
        : acousticRecording ? Radio : Mic2;
  const mainActionLabel = !focusWordHeard
      ? focusWordPlaying ? "Đang nghe từ..." : `Nghe từ ${phrase.focusWord}`
      : !phraseSampleHeard
        ? samplePlaying ? "Đang nghe câu..." : "Nghe câu có từ này"
        : !acousticConsent
          ? "Bật chấm phát âm"
          : currentAcousticAssessment
            ? "Sang câu tiếp theo"
            : acousticRecording
              ? acousticSpeechDetected
                ? "Đã nghe giọng · sẽ tự gửi"
                : "Đang nghe · tự dừng khi bạn nói xong"
              : acousticPhase === "requesting"
                ? "Đang mở microphone..."
                : acousticPhase === "uploading"
                  ? "Đang chấm phát âm…"
                  : acousticPhase === "error"
                    ? "Thử chấm lại"
                    : "Bắt đầu đọc để chấm";
  const runMainAction = () => {
    if (!focusWordHeard) {
      playFocusWord();
      return;
    }
    if (!phraseSampleHeard) {
      playPhraseSample();
      return;
    }
    if (!acousticConsent) {
      grantAcousticConsent();
      return;
    }
    if (currentAcousticAssessment) {
      acceptAcousticResultAndContinue();
      return;
    }
    if (acousticRecording) {
      void stopAcousticCapture();
      return;
    }
    if (acousticRequestBusy) return;
    void startAcousticCapture();
  };
  const runSecondaryAction = () => {
    if (currentAcousticAssessment) {
      void startAcousticCapture();
      return;
    }
    if (guideReady) playPhraseSample();
    else skipAudioGuidance();
  };
  const secondaryActionLabel = currentAcousticAssessment
    ? "Ghi lại để cải thiện"
    : guideReady ? "Nghe lại câu" : "Bỏ hướng dẫn âm thanh";
  const focusWordOffset = phrase.chinese.indexOf(phrase.focusWord);
  const sourceRelationshipLabel = phrase.sourceKind === "completed"
    ? "Vừa học ở"
    : phrase.sourceKind === "next-unlocked"
      ? "Chuẩn bị cho bài"
      : "Nền tảng từ bài";
  const completionRoute = mission.nextLessonId
    ? `/lesson/${encodeURIComponent(mission.nextLessonId)}`
    : "/path";
  const completionLabel = mission.relationship === "learn-first"
    ? "Học bài nguồn"
    : "Tiếp tục Thiên Lộ";
  const acousticScores = currentAcousticAssessment ? [
    { label: "Tổng hợp", value: currentAcousticAssessment.aggregate.pronunciationScore },
    { label: "Độ chính xác âm", value: currentAcousticAssessment.aggregate.accuracyScore },
    { label: "Độ trôi chảy", value: currentAcousticAssessment.aggregate.fluencyScore },
    { label: "Độ đầy đủ", value: currentAcousticAssessment.aggregate.completenessScore },
  ] : [];
  const acousticStatusCopy = acousticPhase === "requesting"
    ? "Đang xin quyền microphone..."
    : acousticPhase === "recording"
      ? acousticSpeechDetected
        ? "Đã nghe thấy giọng. Hệ thống sẽ tự dừng và gửi chấm sau khi bạn ngừng nói."
        : "Đang nghe. Hãy đọc trọn câu; hệ thống sẽ tự dừng khi bạn nói xong."
      : acousticPhase === "uploading"
        ? "Đang gửi bản thu và đối chiếu âm học..."
        : acousticPhase === "result"
          ? "Đã nhận phản hồi âm học cho câu hiện tại."
          : acousticPhase === "error"
            ? acousticError
             : guideReady
               ? "Sẵn sàng ghi một lượt riêng để nhận phản hồi âm học."
               : "Nghe từ và câu mẫu trước, sau đó kênh chấm âm học sẽ mở.";
  const protocolCopy = !focusWordHeard
    ? `Bắt đầu bằng từ “${phrase.focusWord}”: nhìn Pinyin, nghĩa Việt rồi nghe riêng một lần.`
    : !phraseSampleHeard
      ? "Tiếp theo, nghe từ trọng tâm nằm trong cả câu để bắt nhịp trước khi đọc."
      : !acousticConsent
        ? "Bật chấm phát âm để ghi một bản WAV ngắn và nhận phản hồi âm học cho câu này."
        : acousticStatusCopy;

  return (
    <div className="content-page pronunciation-page voice-game-page">
      <section className="voice-game-shell" aria-labelledby="voice-game-title">
        <header className="voice-game-hud">
          <div className="voice-game-identity">
            <span className="voice-game-emblem" aria-hidden="true"><Radio size={20} /></span>
            <div>
              <span>VOICE-06 · ẢI CỘNG HƯỞNG</span>
              <h1 id="voice-game-title">Vạn Âm Điện</h1>
              <p>{mission.relationship === "apply-what-you-learned"
                ? `Vận dụng từ bài “${mission.anchorLessonTitle}” · micro tùy chọn.`
                : `Chuẩn bị từ và câu cho bài “${mission.anchorLessonTitle}” · micro tùy chọn.`}</p>
            </div>
          </div>
          <div
            className="voice-session-progress"
            role="progressbar"
            aria-label="Tiến độ phiên luyện đọc"
            aria-valuemin={0}
            aria-valuemax={practicePhrases.length}
            aria-valuenow={sessionCompletedCount}
            aria-valuetext={`${sessionCompletedCount} trên ${practicePhrases.length} cửa đã hoàn thành`}
          >
            <span>BÀI NGUỒN · {mission.anchorLessonTitle}</span>
            <strong>{sessionCompletedCount} / {practicePhrases.length} cửa hoàn thành</strong>
            <div aria-hidden="true">
              {practicePhrases.map((item, index) => (
                <i
                  className={completedPhraseIds.has(item.id)
                    ? "is-complete"
                    : index === phraseIndex
                      ? "is-current"
                      : ""}
                  key={item.id}
                />
              ))}
            </div>
          </div>
        </header>

        <div className="pronunciation-layout voice-game-grid">
          <section className="voice-trial voice-mission-console" aria-labelledby="voice-mission-title">
            <header className="voice-mission-heading">
              <div>
                <span>CỬA {String(phraseIndex + 1).padStart(2, "0")} · {sourceRelationshipLabel.toLocaleUpperCase("vi-VN")} {phrase.sourceLessonTitle.toLocaleUpperCase("vi-VN")}</span>
                <h2 id="voice-mission-title">Đọc rõ toàn câu</h2>
              </div>
              <div className="phrase-navigator">
                <button className="icon-button" type="button" onClick={() => movePhrase(-1)} aria-label="Câu trước"><ChevronLeft size={20} /></button>
                <span>{String(phraseIndex + 1).padStart(2, "0")} / {String(practicePhrases.length).padStart(2, "0")}</span>
                <button className="icon-button" type="button" onClick={() => movePhrase(1)} aria-label="Câu sau"><ChevronRight size={20} /></button>
              </div>
            </header>

            <div className="voice-mission-stage">
              <div className="target-phrase">
                <small>TỪ TRỌNG TÂM · {phrase.focusWordPinyin} · THANH TỪ ĐIỂN {phrase.focusTones.map(toneLabel).join(" + ")}</small>
                <h3>{focusWordOffset >= 0 ? (
                  <>
                    {phrase.chinese.slice(0, focusWordOffset)}
                    <mark>{phrase.focusWord}</mark>
                    {phrase.chinese.slice(focusWordOffset + phrase.focusWord.length)}
                  </>
                ) : phrase.chinese}</h3>
                <p>{phrase.pinyin}</p>
                <span>{phrase.meaning}</span>
                <em>Âm mẫu tổng hợp, không phải bản thu người bản ngữ.</em>
              </div>
              <ol className="voice-mission-steps" aria-label="Bốn bước của cửa luyện đọc">
                <li data-state={wordStepState}>
                  <span>01</span><div><strong>Hiểu & nghe từ</strong><small>{phrase.focusWord} · {phrase.focusWordMeaning}</small></div>
                </li>
                <li data-state={contextStepState}>
                  <span>02</span><div><strong>Nghe trong câu</strong><small>Nối từ vào ngữ cảnh</small></div>
                </li>
                <li data-state={speakStepState}>
                  <span>03</span><div><strong>Đọc trọn câu</strong><small>{acousticRecording ? acousticSpeechDetected ? "Đã nghe giọng · chờ bạn nói xong" : "Đang chờ bạn đọc" : "Tự dừng khi bạn nói xong"}</small></div>
                </li>
                <li data-state={compareStepState}>
                  <span>04</span><div><strong>Đối chiếu âm học</strong><small>{currentAcousticAssessment ? "Đã có phản hồi" : acousticPhase === "uploading" ? "Azure đang phân tích" : "Âm · nhịp · độ đầy đủ"}</small></div>
                </li>
              </ol>
            </div>

            <div
              className="voice-feedback-row"
              data-focus={sessionCompletionVisible || currentAcousticAssessment
                ? "result"
                : acousticConsent && acousticPhase === "error" ? "error" : "idle"}
            >
              <div className="voice-signal-console" data-active={signalActive}>
                <strong>{samplePlaying || focusWordPlaying
                  ? "Đang phát âm mẫu"
                  : acousticRecording
                    ? acousticSpeechDetected ? "Đã nghe thấy giọng · chờ bạn nói xong" : "Đang nghe câu bạn đọc"
                    : acousticPhase === "uploading"
                      ? "Đang gửi bản thu để chấm"
                      : captureActive ? "Kênh nhận dạng chữ đang hoạt động" : "Bộ cộng hưởng đang chờ"}</strong>
                <div className="voice-frequency" aria-hidden="true">
                  {Array.from({ length: 34 }, (_, index) => <i key={index} />)}
                </div>
                <small>{acousticBusy ? "Bản thu âm học đang được xử lý" : "Chỉ báo trạng thái của lượt luyện"}</small>
              </div>

              {sessionCompletionVisible ? (
                <div
                  className={`voice-result ${feedbackClass}`}
                  aria-live="polite"
                >
                  {feedbackSuccess
                    ? <CheckCircle2 size={21} />
                    : transcriptRecognized
                      ? <Radio size={21} />
                      : <RotateCcw size={21} />}
                  <div>
                    <strong>Nhiệm vụ hôm nay đã hoàn tất</strong>
                    <p>{feedbackBody}</p>
                    <small>{feedbackNote}</small>
                  </div>
                </div>
              ) : currentAcousticAssessment ? (
                <div
                  className="voice-result recognized voice-acoustic-primary-result"
                  data-testid="acoustic-assessment-result"
                  aria-live="polite"
                >
                  <div className="voice-acoustic-score-hero">
                    <span>ĐIỂM ÂM HỌC BETA</span>
                    <div><strong>{Math.round(currentAcousticAssessment.aggregate.pronunciationScore)}</strong><small>/100</small></div>
                    <p>Tổng hợp âm, nhịp và độ đầy đủ</p>
                  </div>
                  <div className="voice-acoustic-result-body">
                    <header>
                      <div>
                        <strong>Đã chấm câu bạn vừa đọc</strong>
                        <p>Máy nhận được: “{currentAcousticAssessment.transcript}”</p>
                      </div>
                      <span><Radio size={16} /> PHẢN HỒI ĐÃ SẴN SÀNG</span>
                    </header>
                    <div className="voice-acoustic-score-strip" aria-label="Điểm phản hồi âm học beta">
                      {acousticScores.slice(1).map((item) => (
                        <span key={item.label}><small>{item.label}</small><b>{Math.round(item.value)}</b></span>
                      ))}
                    </div>
                    <p className="voice-acoustic-truth">Điểm Azure đang ở mức thử nghiệm: chưa hiệu chuẩn riêng cho người học Việt, không phải độ giống người bản ngữ và không có điểm thanh điệu riêng.</p>
                    {currentAcousticAssessment.words.length ? (
                      <p className="voice-acoustic-word-summary">
                        <span>Theo từng từ</span>
                        {currentAcousticAssessment.words.slice(0, 5).map((word, index) => (
                          <b key={`${word.word}:${index}`}>{word.word} {Math.round(word.accuracyScore)}</b>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : acousticConsent && acousticPhase === "error" ? (
                <div
                  className="voice-result error"
                  data-testid="acoustic-assessment-error"
                  role="alert"
                >
                  <RotateCcw size={21} />
                  <div>
                    <strong>Lượt chấm âm học chưa hoàn tất</strong>
                    <p>{acousticError}</p>
                    <small>Không tự gửi lại. Câu hiện tại và tiến độ học vẫn được giữ nguyên.</small>
                  </div>
                </div>
              ) : !acousticConsent && browserFeedbackVisible ? (
                <div className={`voice-result ${feedbackClass}`} aria-live="polite">
                  {feedbackSuccess
                    ? <CheckCircle2 size={21} />
                    : transcriptRecognized
                      ? <Radio size={21} />
                      : <RotateCcw size={21} />}
                  <div>
                    <strong>{resultHeading}</strong>
                    <p>{feedbackBody}</p>
                    {!error ? <small>{feedbackNote}</small> : null}
                    {error || score !== null && score < TRANSCRIPT_CLEAR_THRESHOLD ? (
                      <button className="voice-skip-button" type="button" onClick={skipCurrentPhrase}>Bỏ qua lúc này · không tính hoàn thành</button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  className="voice-protocol"
                  data-testid={acousticConsent ? "acoustic-assessment-status" : undefined}
                  role="status"
                  aria-live="polite"
                >
                  <Radio size={17} />
                  <p><strong>Bước hiện tại:</strong> {protocolCopy}</p>
                </div>
              )}
            </div>

            <section
              className="voice-consent-panel voice-acoustic-primary-consent"
              data-testid="acoustic-assessment-panel"
              data-phase={acousticConsent ? "enabled" : "disabled"}
              aria-labelledby="acoustic-primary-consent-title"
            >
              <span className="voice-consent-icon" aria-hidden="true">
                {acousticConsent ? <CheckCircle2 size={18} /> : <Mic2 size={18} />}
              </span>
              <div className="voice-consent-copy">
                <strong id="acoustic-primary-consent-title">{acousticConsent ? "Chấm âm học đã bật" : "Bật chấm phát âm bằng âm học"}</strong>
                <p id="acoustic-primary-consent-description">{acousticConsent
                  ? "Đọc xong, hệ thống tự dừng và gửi bản thu ngắn để chấm; HANZI.OS không lưu bản thu."
                  : "Bản WAV ngắn được gửi tới Microsoft Azure để chấm âm, nhịp và độ đầy đủ; HANZI.OS không lưu bản thu."}</p>
              </div>
              <a className="voice-consent-detail" href="/voice-data">Dữ liệu giọng nói <ChevronRight size={14} aria-hidden="true" /></a>
              {acousticConsent ? (
                <button className="voice-consent-action" type="button" aria-describedby="acoustic-primary-consent-description" onClick={withdrawAcousticConsent}>Rút đồng ý</button>
              ) : (
                <span className="voice-consent-state">CHƯA BẬT</span>
              )}
            </section>

            <div className="voice-actions voice-game-actions">
              {sessionCompletionVisible ? (
                <>
                  <button className="secondary-button" type="button" onClick={restartSession}><RotateCcw size={18} /> Luyện lại phiên</button>
                  <Link className="record-button voice-completion-link" to={completionRoute}><CheckCircle2 size={21} /><span>{completionLabel}</span></Link>
                </>
              ) : (
                <>
                  <button className="secondary-button" type="button" disabled={acousticBusy} onClick={runSecondaryAction}>
                    {currentAcousticAssessment ? <RotateCcw size={18} /> : guideReady ? <Headphones size={18} /> : <ChevronRight size={18} />}
                    {secondaryActionLabel}
                  </button>
                  <button
                    className={`record-button ${currentAcousticAssessment ? "voice-next-button" : acousticPhase === "error" ? "voice-retry-button" : ""} ${acousticRecording ? "recording" : ""}`}
                    data-testid={guideReady
                      ? acousticConsent ? "acoustic-capture-button" : "acoustic-consent-button"
                      : undefined}
                    type="button"
                    aria-describedby={!acousticConsent && guideReady ? "acoustic-primary-consent-description" : undefined}
                    disabled={captureActive || samplePlaying || focusWordPlaying || localToneBusy || acousticRequestBusy}
                    onClick={runMainAction}
                  >
                    <MainActionIcon size={22} /><span>{mainActionLabel}</span>
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="tone-lab voice-tone-console" aria-labelledby="tone-console-title">
            <header className="voice-console-heading">
              <span className="voice-console-token" aria-hidden="true"><Radio size={18} /></span>
              <div><span>TRỢ GIẢNG · GẮN VỚI CÂU {String(phraseIndex + 1).padStart(2, "0")}</span><h2 id="tone-console-title">Tập từ này rồi đọc cả câu</h2></div>
              <small>{activeToneData.name}</small>
            </header>
            <div className="voice-source-trail">
              <span>{sourceRelationshipLabel}</span>
              <Link to={phrase.sourceLessonHref}>{phrase.sourceLessonTitle}<ChevronRight size={14} /></Link>
            </div>
            <div className="voice-focus-card">
              <div className="voice-focus-glyph" aria-hidden="true">{phrase.focusWord}</div>
              <div>
                <span>TỪ ĐANG VẬN DỤNG</span>
                <h3>{phrase.focusWord}</h3>
                <p>{phrase.focusWordPinyin} · {phrase.focusWordMeaning}</p>
                <small>Nghe từ đứng riêng, rồi nghe nó trong câu bên trái.</small>
              </div>
              <button className="voice-focus-play" type="button" onClick={playFocusWord} disabled={focusWordPlaying}>
                <Headphones size={18} /> {focusWordPlaying ? "Đang nghe" : "Nghe từ"}
              </button>
            </div>
            <div className="voice-focus-tones" role="group" aria-label={`Thanh từ điển của ${phrase.focusWord}`}>
              {phrase.focusSyllables.map((syllable, index) => (
                <button
                  aria-label={`Nghe ${phrase.focusWord}, âm tiết ${syllable.marked}, thanh từ điển ${toneLabel(syllable.lexicalTone)}`}
                  aria-pressed={activeTone === syllable.lexicalTone}
                  className={activeTone === syllable.lexicalTone ? "active" : ""}
                  key={`${syllable.marked}:${index}`}
                  type="button"
                  onClick={() => {
                    setActiveTone(syllable.lexicalTone);
                    playFocusWord();
                  }}
                >
                  <strong>{syllable.marked}</strong>
                  <span>Thanh {toneLabel(syllable.lexicalTone)}</span>
                </button>
              ))}
            </div>
            <div className="tone-chart">
              <div className="tone-axis"><span>CAO</span><span>TRUNG</span><span>THẤP</span></div>
              <svg viewBox="0 0 100 80" role="img" aria-label={observedTonePoints
                ? `Đường cao độ tham chiếu của ${activeToneData.name} và đường thanh vừa đo`
                : `Đường cao độ tham chiếu của ${activeToneData.name}`}>
                <line x1="4" y1="16" x2="96" y2="16" />
                <line x1="4" y1="40" x2="96" y2="40" />
                <line x1="4" y1="66" x2="96" y2="66" />
                <polyline className="tone-reference-contour" key={activeTone} points={activeToneData.points} />
                {observedTonePoints ? (
                  <polyline className="tone-observed-contour" points={observedTonePoints} />
                ) : null}
              </svg>
              <small>{observedTonePoints
                ? "Nét liền: mẫu · nét đứt: giọng vừa đo."
                : "Đường sáng minh họa thanh từ điển; trong câu âm có thể biến đổi."}</small>
            </div>
            <details className="voice-tool-details local-tone-tool-details">
              <summary>
                <span><Radio size={16} aria-hidden="true" /> Luyện riêng thanh điệu của “{phrase.focusWord}”</span>
                <ChevronRight size={16} aria-hidden="true" />
              </summary>
              <section className="local-tone-check" data-phase={localTonePhase} aria-labelledby="local-tone-check-title">
              <header>
                <div>
                  <span>ĐO CAO ĐỘ · MIỄN PHÍ</span>
                  <strong id="local-tone-check-title">Đọc riêng “{phrase.focusWord}”</strong>
                </div>
                <small>CHỈ TRÊN MÁY</small>
              </header>
              {localToneUnsupportedReason ? (
                <p className="local-tone-unsupported" role="status">{localToneUnsupportedReason}</p>
              ) : (
                <>
                  <button
                    className={localTonePhase === "recording" ? "is-recording" : ""}
                    type="button"
                    disabled={localTonePhase === "requesting" || localTonePhase === "analyzing" || captureActive || acousticBusy}
                    onClick={localTonePhase === "recording" ? () => void stopLocalToneCapture() : () => void startLocalToneCapture()}
                  >
                    {localTonePhase === "recording" ? <Radio size={18} /> : <Mic2 size={18} />}
                    <span>{localTonePhase === "recording"
                      ? "Dừng và phân tích"
                      : localTonePhase === "requesting"
                        ? "Đang mở microphone..."
                        : localTonePhase === "analyzing"
                          ? "Đang phân tích..."
                          : "Đo đường thanh trên máy"}</span>
                  </button>
                  <div className="local-tone-result" role="status" aria-live="polite">
                    {localToneError ? (
                      <><strong>Đường thanh riêng chưa đủ rõ</strong><p>{localToneError}</p></>
                    ) : currentToneMeasurement?.status === "unscorable" ? (
                      <><strong>Đường thanh riêng chưa đủ rõ</strong><p>{localToneUnscorableDetail(currentToneMeasurement)}</p></>
                    ) : analyzedToneMeasurement?.verdict === "resembles-target" && analyzedToneMeasurement.signalQuality === "usable" ? (
                      <><strong>Khá giống thanh {analyzedToneMeasurement.targetTone}</strong><p>Đường cao độ đã bám gần hình dáng thanh từ điển.</p></>
                    ) : analyzedToneMeasurement?.verdict === "different" ? (
                      <><strong>Đường thanh gần thanh {analyzedToneMeasurement.closestContour}, hãy thử lại</strong><p>Nghe lại từ mẫu rồi đọc riêng một âm tiết.</p></>
                    ) : analyzedToneMeasurement ? (
                      <><strong>Đường thanh riêng chưa đủ rõ</strong><p>Đây chỉ là phép đo thanh của “{phrase.focusWord}”, không phải điểm cả câu.</p></>
                    ) : localTonePhase === "recording" ? (
                      <><strong>Đang nghe một âm tiết...</strong><p>Tự dừng sau tối đa 2,4 giây.</p></>
                    ) : (
                      <><strong>So hình dáng đường thanh</strong><p>Nghe mẫu, bấm đo rồi chỉ đọc từ trọng tâm một lần.</p></>
                    )}
                  </div>
                </>
              )}
              <footer>Không tải âm thanh lên mạng · không cộng XP · không phải điểm phát âm hay độ giống người bản ngữ.</footer>
              </section>
            </details>
            <details className="browser-transcript-fallback" data-testid="browser-transcript-fallback">
              <summary>
                <span>Không gửi bản thu?</span>
                <strong>Kiểm tra máy nghe đúng câu · không chấm phát âm</strong>
                <ChevronRight size={16} aria-hidden="true" />
              </summary>
              <div>
                <p>Nhận dạng chữ của trình duyệt chỉ kiểm tra câu nói được chuyển thành văn bản nào. Kết quả này không chấm âm đầu, vận mẫu hay thanh điệu.</p>
                <div className="browser-transcript-controls">
                  {voiceConsent ? (
                    <>
                      <button type="button" onClick={withdrawVoiceConsent}>Rút đồng ý nhận dạng chữ</button>
                      <button
                        type="button"
                        disabled={capturePhase === "processing" || acousticBusy || localToneBusy}
                        onClick={listening ? stopRecognition : startRecognition}
                      >
                        {listening ? "Dừng kiểm tra câu" : needsBrowserRetry ? "Thử nhận dạng lại" : "Kiểm tra câu bằng chữ"}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={grantVoiceConsent}>Bật nhận dạng chữ</button>
                  )}
                  <button type="button" onClick={phraseCleared ? moveToNextOpenPhrase : completeWithoutRecognition}>
                    {phraseCleared ? "Sang câu tiếp theo · không chấm âm học" : "Tôi đã tự đọc · không chấm âm học"}
                  </button>
                </div>
                {error || transcript ? (
                  <p className="browser-transcript-status" role={error ? "alert" : "status"}>
                    {error || `Trình duyệt ghi lại: “${transcript}”. Đây không phải điểm phát âm.`}
                  </p>
                ) : null}
              </div>
            </details>
            <details className="tone-reference-details">
              <summary>So sánh đủ 5 thanh bằng âm “ma”</summary>
              <p>Phần tham khảo này giúp phân biệt hình dáng các thanh. Bài chính vẫn luyện đúng từ và câu ở trên.</p>
              <div className="tone-selector" role="group" aria-label="Bảng tham khảo đủ năm thanh">
                {toneData.map((tone) => (
                  <button
                    aria-label={`Nghe âm tham khảo ${tone.name}, ${tone.pinyin}`}
                    aria-pressed={activeTone === tone.id}
                    className={activeTone === tone.id ? "active" : ""}
                    key={tone.id}
                    type="button"
                    onClick={() => selectTone(tone.id)}
                  >
                    <strong>{tone.id || "·"}</strong><span>{tone.pinyin}</span>
                  </button>
                ))}
              </div>
            </details>
          </section>
        </div>
      </section>
    </div>
  );
}
