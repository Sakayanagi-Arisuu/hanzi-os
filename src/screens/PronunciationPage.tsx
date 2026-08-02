import {
  AudioLines,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Mic2,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Volume2,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioEngine, type VoicePlaybackPhase } from "../audio/AudioEngineProvider";
import { VoiceReactor } from "../components/system/VoiceReactor";
import { CONTENT_VERSION, RELEASED_VOCABULARY } from "../data/curriculum";
import { makeIdempotencyKey } from "../lib/evidence";
import { createMandarinRecognition, speakMandarin } from "../lib/speech";
import { removeLocalStorage, writeLocalStorage } from "../lib/storageKeys";
import {
  createLocalVoiceConsentReceipt,
  parseLocalVoiceConsentReceipt,
} from "../lib/voiceConsent";
import { useLearning } from "../store/LearningStore";
import { emitSystemSignal } from "../system/systemSignals";
import type { MandarinTone } from "../types";

type CapturePhase = VoicePlaybackPhase | "armed" | "listening" | "processing" | "result" | "denied" | "unavailable";

const toneData = [
  { id: 1, name: "Thanh 1", pinyin: "mā", sample: "妈", description: "Cao, ngang và ổn định", points: "8,28 50,28 92,28" },
  { id: 2, name: "Thanh 2", pinyin: "má", sample: "麻", description: "Từ trung lên cao", points: "8,60 50,44 92,18" },
  { id: 3, name: "Thanh 3", pinyin: "mǎ", sample: "马", description: "Hạ thấp; thường chỉ nhấc lên ở cuối cụm", points: "8,36 42,64 62,66 92,40" },
  { id: 4, name: "Thanh 4", pinyin: "mà", sample: "骂", description: "Từ cao rơi nhanh", points: "8,16 46,40 92,68" },
  { id: 0, name: "Thanh nhẹ", pinyin: "ma", sample: "吗", description: "Ngắn, nhẹ và phụ thuộc âm tiết đứng trước", points: "8,43 50,43 92,43" },
] satisfies Array<{ id: MandarinTone; name: string; pinyin: string; sample: string; description: string; points: string }>;

const practicePhrases = [
  { chinese: "你好", lexicalPinyin: "nǐ hǎo", surfacePinyin: "ní hǎo", meaning: "xin chào", focus: "Thanh từ điển 3 + 3 → bề mặt 2 + 3" },
  { chinese: "谢谢你", lexicalPinyin: "xièxie nǐ", surfacePinyin: "xièxie nǐ", meaning: "cảm ơn bạn", focus: "Thanh 4 + nhẹ + 3" },
  { chinese: "我是学生", lexicalPinyin: "wǒ shì xuésheng", surfacePinyin: "wǒ shì xuésheng", meaning: "tôi là sinh viên", focus: "Nhịp câu trần thuật" },
  { chinese: "你喝茶吗", lexicalPinyin: "nǐ hē chá ma", surfacePinyin: "nǐ hē chá ma", meaning: "bạn uống trà không", focus: "Ngữ điệu câu hỏi 吗" },
];

const VOICE_CONSENT_KEY = "hanzi-os-voice-consent-v1";

const readVoiceConsent = () => {
  try {
    return Boolean(parseLocalVoiceConsentReceipt(
      localStorage.getItem(VOICE_CONSENT_KEY),
    ));
  } catch {
    return false;
  }
};

const similarityScore = (heard: string, target: string, confidence: number) => {
  const normalize = (value: string) => value.replace(/[\s，。！？,.!?]/g, "").toLowerCase();
  const heardChars = [...normalize(heard)];
  const targetChars = [...normalize(target)];
  if (!heardChars.length) return 0;
  const matched = targetChars.filter((character, index) => heardChars[index] === character).length;
  const overlap = targetChars.filter((character) => heardChars.includes(character)).length;
  const textScore = ((matched * 0.7 + overlap * 0.3) / Math.max(targetChars.length, heardChars.length)) * 100;
  return Math.max(0, Math.min(100, Math.round(textScore * 0.78 + confidence * 100 * 0.22)));
};

export function PronunciationPage() {
  const { actions } = useLearning();
  const { cancelSpeech, playback } = useAudioEngine();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [activeTone, setActiveTone] = useState<MandarinTone>(1);
  const [listening, setListening] = useState(false);
  const [capturePhase, setCapturePhase] = useState<CapturePhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [voiceConsent, setVoiceConsent] = useState(readVoiceConsent);
  const attemptKeyRef = useRef("");
  const recognitionRef = useRef<ReturnType<typeof createMandarinRecognition>>(null);
  const resultTimerRef = useRef<number | null>(null);
  const phrase = practicePhrases[phraseIndex];
  const activeToneData = toneData.find((tone) => tone.id === activeTone) ?? toneData[0];
  const sampleWords = useMemo(
    () => RELEASED_VOCABULARY.filter((word) =>
      word.syllables.some((syllable) => syllable.lexicalTone === activeTone)
    ).slice(0, 5),
    [activeTone],
  );
  const phraseVoiceSource = `pronunciation:phrase:${phraseIndex}`;
  const reactorPhase = capturePhase !== "idle"
    ? capturePhase
    : playback.sourceId === phraseVoiceSource ? playback.phase : "idle";

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current);
  }, []);

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
    setError("");
  };

  const withdrawVoiceConsent = () => {
    if (!removeLocalStorage(VOICE_CONSENT_KEY)) {
      setError("Không thể cập nhật đồng ý trên thiết bị. Hãy kiểm tra quyền lưu trữ của trình duyệt.");
      return;
    }
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setCapturePhase("idle");
    setVoiceConsent(false);
    setError("Bạn đã rút đồng ý dùng nhận dạng giọng nói trên thiết bị này.");
  };

  const movePhrase = (direction: number) => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current);
    setPhraseIndex((current) => (current + direction + practicePhrases.length) % practicePhrases.length);
    setTranscript("");
    setScore(null);
    setError("");
    setListening(false);
    setCapturePhase("idle");
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setCapturePhase("processing");
    emitSystemSignal({ type: "voice.record-stopped", sourceId: phraseVoiceSource });
    emitSystemSignal({ type: "voice.processing", sourceId: phraseVoiceSource });
  };

  const startRecognition = () => {
    if (!voiceConsent) {
      setError("Hãy đọc thông tin xử lý giọng nói và đồng ý trước khi mở microphone.");
      setCapturePhase("denied");
      emitSystemSignal({ type: "voice.permission-denied", sourceId: phraseVoiceSource });
      return;
    }
    const recognition = createMandarinRecognition();
    if (!recognition) {
      setError("Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Bạn vẫn có thể nghe mẫu và luyện nhại.");
      setCapturePhase("unavailable");
      emitSystemSignal({ type: "voice.error", sourceId: phraseVoiceSource });
      return;
    }
    cancelSpeech();
    setError("");
    setScore(null);
    setTranscript("");
    setCapturePhase("armed");
    emitSystemSignal({ type: "voice.record-armed", sourceId: phraseVoiceSource });
    attemptKeyRef.current = makeIdempotencyKey(`speech:${phraseIndex}`);
    recognitionRef.current = recognition;
    recognition.onaudiostart = () => {
      setListening(true);
      setCapturePhase("listening");
      emitSystemSignal({ type: "voice.record-started", sourceId: phraseVoiceSource });
    };
    recognition.onspeechstart = () => setCapturePhase("listening");
    recognition.onspeechend = () => {
      setCapturePhase("processing");
      emitSystemSignal({ type: "voice.processing", sourceId: phraseVoiceSource });
    };
    recognition.onresult = (event) => {
      const result = event.results[0]?.[0];
      if (!result) return;
      const nextScore = similarityScore(result.transcript, phrase.chinese, result.confidence || 0.65);
      const resultTranscript = result.transcript;
      setCapturePhase("processing");
      emitSystemSignal({ type: "voice.processing", sourceId: phraseVoiceSource });
      resultTimerRef.current = window.setTimeout(() => {
        setTranscript(resultTranscript);
        setScore(nextScore);
        setCapturePhase("result");
        emitSystemSignal({ type: "voice.result", sourceId: phraseVoiceSource });
        actions.recordPracticeEvidence({
          idempotencyKey: attemptKeyRef.current,
          activityVersion: `${CONTENT_VERSION}:browser-speech:1`,
          source: "pronunciation",
          method: "speech-transcript",
          activityId: `speech:${phraseIndex}`,
          skill: "speaking",
          outcome: "unverified",
          score: nextScore,
          metadata: {
            target: phrase.chinese,
            transcript: resultTranscript,
            confidence: result.confidence || 0.65,
            scoringMethod: "browser-transcript-overlap",
          },
        });
      }, 380);
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Bạn cần cấp quyền microphone để ghi âm." : `Không thể nhận dạng: ${event.error}.`);
      setCapturePhase(event.error === "not-allowed" ? "denied" : event.error === "audio-capture" ? "unavailable" : "error");
      setListening(false);
      emitSystemSignal({
        type: event.error === "not-allowed" ? "voice.permission-denied" : "voice.error",
        sourceId: phraseVoiceSource,
      });
    };
    recognition.onnomatch = () => {
      setError("Hệ thống chưa giải mã được câu nói. Hãy thử lại gần microphone hơn.");
      setCapturePhase("error");
      emitSystemSignal({ type: "voice.error", sourceId: phraseVoiceSource });
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setCapturePhase("unavailable");
      setError("Kênh microphone chưa thể khởi động. Hãy kiểm tra quyền truy cập của trình duyệt.");
      emitSystemSignal({ type: "voice.error", sourceId: phraseVoiceSource });
    }
  };

  return (
    <div className="content-page pronunciation-page">
      <header className="page-hero voice-hero">
        <div>
          <span className="system-kicker"><Radio size={15} /> ÂM MẪU TỔNG HỢP · ĐỘ KHỚP NHẬN DẠNG</span>
          <h1>Vạn Âm Điện</h1>
          <p>Quan sát đường cao độ, nghe mẫu, ghi âm và so khớp câu nói trong cùng một vòng luyện.</p>
        </div>
        <div className="voice-frequency" aria-hidden="true">
          {Array.from({ length: 34 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 62)}%` }} />)}
        </div>
      </header>

      <div className="pronunciation-layout">
        <section className="tone-lab">
          <header className="section-heading">
            <div><span>QUỸ ĐẠO THANH ĐIỆU · PHỔ THÔNG</span><h2>Bốn đường thanh</h2></div>
            <Waves size={21} />
          </header>
          <div className="tone-selector" role="tablist" aria-label="Chọn thanh điệu">
            {toneData.map((tone) => (
              <button
                aria-selected={activeTone === tone.id}
                className={activeTone === tone.id ? "active" : ""}
                key={tone.id}
                role="tab"
                tabIndex={activeTone === tone.id ? 0 : -1}
                type="button"
                onClick={() => setActiveTone(tone.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  const currentIndex = toneData.findIndex((item) => item.id === activeTone);
                  const direction = event.key === "ArrowRight" ? 1 : -1;
                  setActiveTone(toneData[(currentIndex + direction + toneData.length) % toneData.length].id);
                }}
              >
                <strong>{tone.id || "·"}</strong><span>{tone.pinyin}</span>
              </button>
            ))}
          </div>
          <div className="tone-chart">
            <div className="tone-axis"><span>CAO</span><span>TRUNG</span><span>THẤP</span></div>
            <svg viewBox="0 0 100 80" role="img" aria-label={`Đường cao độ ${activeToneData.name}`}>
              <line x1="4" y1="16" x2="96" y2="16" />
              <line x1="4" y1="40" x2="96" y2="40" />
              <line x1="4" y1="66" x2="96" y2="66" />
              <polyline points={activeToneData.points} />
            </svg>
          </div>
          <div className="tone-detail">
            <span className="tone-number">{activeTone ? `0${activeTone}` : "轻"}</span>
            <div><strong>{activeToneData.name} · {activeToneData.pinyin}</strong><p>{activeToneData.description}</p></div>
            <button className="icon-button" type="button" onClick={() => speakMandarin(activeToneData.sample, 0.62, `pronunciation:tone:${activeTone}`)} aria-label="Nghe thanh mẫu"><Volume2 size={20} /></button>
          </div>
          <div className="tone-examples">
            {sampleWords.length ? sampleWords.map((word) => (
              <button key={word.id} type="button" onClick={() => speakMandarin(word.simplified, .82, `pronunciation:word:${word.id}`)}>
                <strong>{word.simplified}</strong><span>{word.pinyin}</span><small>{word.meaning}</small>
              </button>
            )) : <p>Kho từ hiện tại chưa có ví dụ cho thanh này.</p>}
          </div>
        </section>

        <section className="voice-trial">
          <header className="section-heading">
            <div><span>THỬ ÂM · TRÌNH DUYỆT</span><h2>Buồng hiệu chỉnh</h2></div>
            <Mic2 size={21} />
          </header>
          <div className="phrase-navigator">
            <button className="icon-button" type="button" onClick={() => movePhrase(-1)} aria-label="Câu trước"><ChevronLeft size={20} /></button>
            <span>{phraseIndex + 1} / {practicePhrases.length}</span>
            <button className="icon-button" type="button" onClick={() => movePhrase(1)} aria-label="Câu sau"><ChevronRight size={20} /></button>
          </div>
          <div className="target-phrase">
            <small>{phrase.focus}</small>
            <h2>{phrase.chinese}</h2>
            <p>{phrase.surfacePinyin}</p>
            {phrase.surfacePinyin !== phrase.lexicalPinyin && <em>từ điển: {phrase.lexicalPinyin}</em>}
            <span>{phrase.meaning}</span>
          </div>
          <div className="voice-consent-panel">
            <ShieldAlert size={18} />
            <p>Nhận dạng giọng nói của trình duyệt có thể gửi âm thanh tới nhà cung cấp trình duyệt hoặc hệ điều hành. HANZI.OS hiện không tải hay lưu tệp ghi âm trên máy chủ. <a href="/voice-data">Đọc chi tiết</a>.</p>
            {voiceConsent ? (
              <button type="button" onClick={withdrawVoiceConsent}>Rút đồng ý</button>
            ) : (
              <button type="button" onClick={grantVoiceConsent}>Tôi đồng ý dùng nhận dạng giọng nói</button>
            )}
          </div>
          <div className="voice-actions">
            <button className="secondary-button" type="button" onClick={() => speakMandarin(phrase.chinese, 0.68, phraseVoiceSource)}><Headphones size={18} /> Nghe chậm</button>
            <button className={`record-button ${listening ? "recording" : ""}`} type="button" disabled={!voiceConsent || capturePhase === "processing"} onClick={listening ? stopRecognition : startRecognition}>
              {listening ? <AudioLines size={26} /> : <Mic2 size={26} />}
              <span>{listening ? "Dừng và giải mã" : capturePhase === "armed" ? "Đang mở kênh..." : "Ghi âm câu nói"}</span>
            </button>
          </div>
          <VoiceReactor phase={reactorPhase} label={capturePhase === "listening" ? "Đang thu và dò nhịp câu nói" : undefined} />

          {(score !== null || error) && (
            <div className={`voice-result ${error ? "error" : score !== null && score >= 70 ? "success" : "warning"}`} aria-live="polite">
              {error ? <ShieldAlert size={23} /> : score !== null && score >= 70 ? <CheckCircle2 size={23} /> : <RotateCcw size={23} />}
              <div>
                <strong>{error ? "Không thể mở kênh âm thanh" : `Độ khớp nhận dạng: ${score}%`}</strong>
                {error ? <p>{error}</p> : <><p>Hệ thống nghe được: “{transcript}”</p><small>Điểm này đo mức nhận dạng câu, chưa phải chấm thanh điệu âm học chuyên sâu.</small></>}
              </div>
            </div>
          )}
          <div className="voice-protocol">
            <Sparkles size={17} />
            <p><strong>Nhịp luyện:</strong> nghe chậm → nhại cùng mẫu → tự nói → nghe lại. Ưu tiên đường thanh trước tốc độ.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
