import {
  ArrowLeft,
  ArrowRight,
  Castle,
  CircleX,
  Clock3,
  Crown,
  DoorOpen,
  Flame,
  Gem,
  Headphones,
  History,
  Map,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import "./MockExamsPage.css";
import {
  clearMockExamAttemptCommand,
  clearCompletedMockExamCommandKeys,
  clearMockExamOpenCommand,
  getActiveMockExamRedirectPath,
  isSupportedMockExamRoute,
  mockExamAbandonCommandStorageKey,
  mockExamAttemptCommandStorageKey,
  mockExamOpenCommandStorageKey,
  mockExamSubmitCommandStorageKey,
  readOrCreateStableMockExamCommand,
  shouldAutoSubmitMockExam,
  type MockExamClientForm,
} from "../assessment/mockExamClientPolicy";
import { parseRecordAssessmentAttemptCommand } from "../assessment/assessmentAttemptProtocol";
import { parseAbandonAssessmentSessionCommand } from "../assessment/assessmentAbandonmentProtocol";
import { parseOpenAssessmentSessionCommand } from "../assessment/assessmentSessionProtocol";
import { parseSubmitAssessmentSessionCommand } from "../assessment/assessmentSubmissionProtocol";
import { CONTENT_VERSION } from "../data/contentIdentity";
import { makeIdempotencyKey } from "../lib/evidence";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { allocateDeviceSequence } from "../sync/indexedDb";
import { readExactNormalizedLessonEnvironment } from "../sync/normalizedLessonEnvironment";

type CatalogEntry = {
  examLevel: "hsk1" | "hsk2" | "hsk3" | "hsk4";
  formKey: MockExamClientForm;
  title: string;
  timeLimitMinutes: number;
  itemCount: number;
  formVersion: string;
  humanReviewed: false;
  browserTtsPracticeOnly: true;
  officialExam: false;
  certificationEligible: false;
  masteryEligible: false;
  prerequisiteUnlockEligible: false;
  standardStructure: boolean;
  legacy: boolean;
  sections: Array<{
    skill: string;
    label: string;
    itemCount: number;
    minutes: number;
  }>;
};

type FormItem = {
  position: number;
  itemId: string;
  itemVersion: string;
  skill: string;
  modality: "visual-selection" | "synthetic-tts-selection";
  prompt: string;
  meta: string;
  options: string[];
  stimulusText?: string;
};

type Binding = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  expectedItemCount: number;
  form: { items: FormItem[] };
  formHash: `sha256:${string}`;
  status: "started";
  startedAt: string;
};

type ActiveSession = {
  definition: CatalogEntry;
  binding: Binding;
  expiresAt: string;
  expired: boolean;
  recorded: Array<{
    position: number;
    itemId: string;
    itemVersion: string;
    answer: string | null;
  }>;
};

type DefinitionLoadState = "loading" | "ready" | "not-found" | "error";

type MockResult = {
  sessionId: string;
  definition: CatalogEntry;
  contentVersion: string;
  formVersion: string;
  formHash: string;
  startedAt: string;
  submittedAt: string;
  timedOut: boolean;
  score: { correct: number; answered: number; total: number; percent: number };
  skills: Array<{ skill: string; correct: number; answered: number; total: number }>;
  weakSkills: string[];
  recommendations: Array<{ lessonId: string; href: string; wrongCount: number }>;
  review: Array<{
    position: number;
    itemId: string;
    itemVersion: string;
    skill: string;
    prompt: string;
    selectedAnswer: string | null;
    correct: boolean;
    correctAnswer: string;
    explanationVi: string;
    recommendedLessonId: string;
    recommendedLessonHref: string;
  }>;
  masteryEligible: false;
  prerequisiteUnlockEligible: false;
  certificationEligible: false;
};

const skillLabel: Record<string, string> = {
  listening: "Nghe hiểu",
  reading: "Đọc",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  writing: "Viết",
};

type ExamLevel = CatalogEntry["examLevel"];
type ExamFormKey = CatalogEntry["formKey"];

const dungeonLevels: Array<{
  level: ExamLevel;
  numeral: string;
  name: string;
  callout: string;
  threat: number;
  minutes: number;
}> = [
  { level: "hsk1", numeral: "I", name: "Hành lang Khai Âm", callout: "Nền tảng", threat: 1, minutes: 40 },
  { level: "hsk2", numeral: "II", name: "Địa đạo Giao Tiếp", callout: "Sơ cấp", threat: 2, minutes: 55 },
  { level: "hsk3", numeral: "III", name: "Mê cung Ngữ Cảnh", callout: "Trung cấp", threat: 3, minutes: 90 },
  { level: "hsk4", numeral: "IV", name: "Thành Trì Hán Ngữ", callout: "Thử thách", threat: 4, minutes: 105 },
];

const dungeonRooms = [
  { key: "listening", icon: Headphones, label: "Thính phòng", skill: "Nghe hiểu" },
  { key: "reading", icon: Map, label: "Văn bia", skill: "Đọc hiểu" },
  { key: "vocabulary", icon: Gem, label: "Kho cổ tự", skill: "Từ vựng" },
  { key: "grammar", icon: Swords, label: "Cơ quan", skill: "Ngữ pháp" },
  { key: "writing", icon: Swords, label: "Thư án", skill: "Viết" },
] as const;

const routeNames = [
  "Tuyến Khai Phá",
  "Tuyến Thử Lửa",
  "Tuyến Vọng Âm",
  "Tuyến Bí Văn",
  "Tuyến Huyền Cơ",
  "Tuyến Tàng Thư",
  "Tuyến Phá Trận",
  "Tuyến Truy Quang",
  "Tuyến Linh Thạch",
  "Tuyến Thiên Môn",
  "Tuyến Vạn Tượng",
  "Tuyến Chung Cực",
] as const;

const levelNumber = (level: ExamLevel) => level.slice(-1);

const levelMeta = (level: ExamLevel) =>
  dungeonLevels.find((entry) => entry.level === level) ?? dungeonLevels[0]!;

class MockExamRequestError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number,
  ) {
    super(message);
  }
}

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const raw = await response.text();
  let body: T & { error?: { code?: string; message?: string } };
  try {
    body = JSON.parse(raw) as T & {
    error?: { message?: string };
    };
  } catch {
    throw new Error(response.ok
      ? "Cổng luyện đề trả về dữ liệu chưa hoàn chỉnh. Hãy thử tải lại."
      : "Cổng luyện đề đang gián đoạn. Câu trả lời của bạn vẫn được giữ.");
  }
  if (!response.ok) throw new MockExamRequestError(
    body.error?.message ?? "Yêu cầu luyện đề thất bại.",
    body.error?.code ?? null,
    response.status,
  );
  return body;
};

const postJson = <T,>(url: string, body: unknown) => requestJson<T>(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const openReceiptToSession = (
  receipt: Binding & CatalogEntry & {
    definition: CatalogEntry;
    expiresAt: string;
  },
): ActiveSession => ({
  definition: receipt.definition,
  expiresAt: receipt.expiresAt,
  expired: Date.now() >= Date.parse(receipt.expiresAt),
  recorded: [],
  binding: {
    sessionId: receipt.sessionId,
    enrollmentId: receipt.enrollmentId,
    resetEpoch: receipt.resetEpoch,
    contentVersion: receipt.contentVersion,
    blueprintId: receipt.blueprintId,
    formVersion: receipt.formVersion,
    scoringPolicyVersion: receipt.scoringPolicyVersion,
    expectedItemCount: receipt.expectedItemCount,
    form: receipt.form,
    formHash: receipt.formHash,
    status: "started",
    startedAt: receipt.startedAt,
  },
});

function MockExamResultView({ result, compact = false }: { result: MockResult; compact?: boolean }) {
  const meta = levelMeta(result.definition.examLevel);

  if (compact) {
    return (
      <article className="dungeon-history-card" data-level={result.definition.examLevel}>
        <div className="dungeon-history-rank" aria-hidden="true">
          <Trophy size={22} />
          <strong>{result.score.percent}</strong>
          <span>điểm</span>
        </div>
        <div className="dungeon-history-summary">
          <span>HSK{levelNumber(result.definition.examLevel)} · CỬA {result.definition.formKey.toUpperCase()}</span>
          <h2>{meta.name}</h2>
          <p>{new Date(result.submittedAt).toLocaleDateString("vi-VN")} · {result.score.correct}/{result.score.total} câu đúng</p>
        </div>
        <details>
          <summary>Xem dấu vết trận <ArrowRight size={16} /></summary>
          <div className="dungeon-history-skills">
            {result.skills.map((skill) => (
              <span key={skill.skill}>{skillLabel[skill.skill] ?? skill.skill}<strong>{skill.correct}/{skill.total}</strong></span>
            ))}
          </div>
        </details>
      </article>
    );
  }

  return (
    <div className="mock-exam-result dungeon-result" data-level={result.definition.examLevel}>
      <header className="dungeon-result-hero">
        <div className="dungeon-result-emblem" aria-hidden="true"><Trophy size={44} /><span /></div>
        <div>
          <span className="system-kicker">PHÁ ẢI HOÀN TẤT · HSK{levelNumber(result.definition.examLevel)}</span>
          <h1>{meta.name} đã ghi nhận chiến tích</h1>
          <p>{result.timedOut ? "Đồng hồ đã khép phiên khi hết giờ." : "Bạn đã đi hết toàn bộ phòng thử thách."}</p>
        </div>
        <div className="dungeon-result-score" aria-label={`${result.score.percent} điểm, ${result.score.correct} trên ${result.score.total} câu đúng`}>
          <strong>{result.score.percent}</strong><span>điểm trận</span><small>{result.score.correct}/{result.score.total} câu đúng</small>
        </div>
      </header>

      <section className="dungeon-result-chambers" aria-label="Kết quả theo kỹ năng">
        {result.skills.map((skill) => {
          const RoomIcon = dungeonRooms.find((room) => room.key === skill.skill)?.icon ?? Target;
          return (
            <article key={skill.skill}>
              <RoomIcon size={20} />
              <span>{skillLabel[skill.skill] ?? skill.skill}</span>
              <strong>{skill.correct}/{skill.total}</strong>
            </article>
          );
        })}
      </section>

      <div className="dungeon-result-body">
        {result.recommendations.length > 0 && (
          <section className="mock-recommendations">
            <span className="system-kicker">LỐI TẮT HỒI PHỤC</span>
            <h2>Bài nên ôn trước lần phá ải kế tiếp</h2>
            {result.recommendations.map((item) => (
              <Link key={item.lessonId} to={item.href}>
                <span>{item.lessonId} · liên quan {item.wrongCount} câu cần ôn</span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </section>
        )}
        <section className="mock-review-list">
          <span className="system-kicker">BẢN ĐỒ DẤU VẾT</span>
          <h2>Xem lại từng căn phòng</h2>
          {result.review.map((item) => (
            <details key={item.itemVersion}>
              <summary>
                <span>{item.correct ? <ShieldCheck size={17} /> : <Flame size={17} />} Câu {item.position + 1} · {skillLabel[item.skill] ?? item.skill}</span>
                <strong>{item.correct ? "Đã vượt" : "Cần ôn"}</strong>
              </summary>
              <p>{item.prompt}</p>
              <p>Bạn chọn: <strong>{item.selectedAnswer ?? "Chưa trả lời"}</strong></p>
              <p>Đáp án: <strong>{item.correctAnswer}</strong></p>
              <p>{item.explanationVi}</p>
              {!item.correct && <Link to={item.recommendedLessonHref}>Mở bài gợi ý <ArrowRight size={15} /></Link>}
            </details>
          ))}
        </section>
      </div>

      <div className="dungeon-result-actions">
        <Link className="secondary-button" to="/exams/history"><History size={17} /> Xem chiến tích</Link>
        <Link className="primary-button" to="/exams">Chọn cửa ải mới <ArrowRight size={17} /></Link>
      </div>
    </div>
  );
}

function MockExamCatalog() {
  const { sync } = useLearning();
  const catalogRef = useRef<HTMLDivElement>(null);
  const [forms, setForms] = useState<CatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<ExamLevel>("hsk1");
  const [activeForm, setActiveForm] = useState<ExamFormKey>("a");
  useEffect(() => {
    requestJson<{ forms: CatalogEntry[] }>("/api/exams/catalog")
      .then((result) => {
        setForms(result.forms);
      })
      .catch(() => setError("Cổng thử luyện chưa phản hồi. Hãy thử tải lại trang."));
  }, []);
  useEffect(() => {
    catalogRef.current?.scrollTo({ top: 0, left: 0 });
  }, [activeForm, activeLevel]);

  const activeMeta = levelMeta(activeLevel);
  const activeLevelForms = forms.filter((entry) =>
    entry.examLevel === activeLevel
  );
  const definition = forms.find((entry) =>
    entry.examLevel === activeLevel && entry.formKey === activeForm
  ) ?? null;
  const destination = `/exams/${activeLevel}/${activeForm}`;

  return (
    <div
      className="mock-exam-page dungeon-catalog"
      data-level={activeLevel}
      ref={catalogRef}
    >
      <header className="dungeon-catalog-hero">
        <div className="dungeon-castle-mark" aria-hidden="true"><Castle size={32} /><i /></div>
        <div>
          <span className="system-kicker">PHÒNG LUYỆN ĐỀ · ĐỊA THÀNH HSK</span>
          <h1>Chọn tầng. Phá ải. Ghi chiến tích.</h1>
        </div>
        {sync.session?.authenticated && (
          <Link className="dungeon-history-link" to="/exams/history"><History size={18} /> Chiến tích</Link>
        )}
      </header>

      <div className="dungeon-catalog-stage">
        <nav className="dungeon-level-rail" aria-label="Chọn tầng HSK">
          {dungeonLevels.map((entry) => (
            <button
              type="button"
              key={entry.level}
              data-level={entry.level}
              className={activeLevel === entry.level ? "active" : ""}
              aria-pressed={activeLevel === entry.level}
              onClick={() => {
                setActiveLevel(entry.level);
                setActiveForm("a");
              }}
            >
              <span><b>{entry.numeral}</b></span>
              <div><strong>HSK{levelNumber(entry.level)}</strong><small>{entry.callout}</small></div>
              <i aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <b className={index < entry.threat ? "lit" : ""} key={index} />)}</i>
            </button>
          ))}
        </nav>

        <section className="dungeon-floor" aria-labelledby="dungeon-floor-title">
          <div className="dungeon-map" aria-label="Các phần trong đề mô phỏng">
            <div className="dungeon-map-core" aria-hidden="true"><span>{activeMeta.numeral}</span><i /></div>
            <div
              className="dungeon-room-route"
              data-room-count={definition?.sections.length ?? 0}
            >
              {(definition?.sections ?? []).map((section, index) => {
                const room = dungeonRooms.find((candidate) => candidate.key === section.skill)
                  ?? dungeonRooms[1]!;
                const RoomIcon = room.icon;
                return (
                  <div className="dungeon-room-node" key={room.label}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <RoomIcon size={22} />
                    <strong>{room.label}</strong>
                    <small>{section.itemCount} câu · {section.minutes} phút</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dungeon-deployment">
            <div className="dungeon-floor-title">
              <span>TẦNG {activeMeta.numeral} · HSK{levelNumber(activeLevel)}</span>
              <h2 id="dungeon-floor-title">{activeMeta.name}</h2>
            </div>

            <div className="dungeon-form-switch" role="radiogroup" aria-label="Chọn cửa ải">
              {activeLevelForms.map((entry, openIndex) => {
                const routeIndex = entry.formKey.charCodeAt(0) - "a".charCodeAt(0);
                return (
                  <button
                    type="button"
                    role="radio"
                    data-radio-index={openIndex}
                    aria-checked={activeForm === entry.formKey}
                    aria-label={`Cửa ${entry.formKey.toUpperCase()}, ${routeNames[routeIndex] ?? "Tuyến bí mật"}`}
                    className={activeForm === entry.formKey ? "active" : ""}
                    key={entry.formKey}
                    onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                      currentIndex: openIndex,
                      itemCount: activeLevelForms.length,
                      onSelect: (nextIndex) => {
                        const nextForm = activeLevelForms[nextIndex]?.formKey;
                        if (nextForm) setActiveForm(nextForm);
                      },
                    })}
                    onClick={() => setActiveForm(entry.formKey)}
                  >
                    <span><DoorOpen size={18} /> CỬA</span>
                    <strong>{entry.formKey.toUpperCase()}</strong>
                    <small>{routeNames[routeIndex] ?? "Tuyến bí mật"}</small>
                  </button>
                );
              })}
              {activeLevelForms.length === 0 && !error && (
                <span className="dungeon-form-loading" role="status">Đang gọi các cửa ải…</span>
              )}
            </div>

            <div className="dungeon-deployment-facts" aria-label="Thông tin cửa ải">
              <span><Target size={18} /><strong>{definition?.itemCount ?? 0}</strong><small>câu hỏi</small></span>
              <span><Clock3 size={18} /><strong>{definition?.timeLimitMinutes ?? activeMeta.minutes}</strong><small>phút</small></span>
              <span><Crown size={18} /><strong>{definition?.sections.length ?? 0}</strong><small>phần thi</small></span>
            </div>

            <div className="dungeon-deployment-status">
              {error && <p className="dungeon-inline-error" role="alert">{error}</p>}
            </div>
            {sync.session?.authenticated ? definition ? (
              <Link className="primary-button dungeon-enter" to={destination}>
                Bước vào Cửa {activeForm.toUpperCase()} <ArrowRight size={18} />
              </Link>
            ) : (
              <button className="primary-button dungeon-enter" disabled type="button">Đang mở địa thành…</button>
            ) : (
              <Link className="primary-button dungeon-enter" to={`/signin?returnTo=${encodeURIComponent(destination)}`}>
                Đăng nhập để vào địa thành <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MockExamHistory() {
  const { sync } = useLearning();
  const [history, setHistory] = useState<MockResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!sync.session?.authenticated) return;
    requestJson<{ history: MockResult[] }>("/api/exams/history")
      .then((result) => setHistory(result.history))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được lịch sử."));
  }, [sync.session?.authenticated]);
  if (!sync.session?.authenticated) {
    return <div className="lesson-state-screen dungeon-state"><ShieldCheck size={42} /><span className="system-kicker">KHO CHIẾN TÍCH</span><h1>Đăng nhập để mở lịch sử</h1><Link className="primary-button" to="/signin?returnTo=%2Fexams%2Fhistory">Mở cổng đăng nhập</Link></div>;
  }
  return (
    <div className="mock-exam-page dungeon-history-page">
      <header className="dungeon-history-hero">
        <Link className="icon-button" to="/exams" aria-label="Trở về Địa Thành HSK"><ArrowLeft size={20} /></Link>
        <div><span className="system-kicker">KHO CHIẾN TÍCH</span><h1>Những địa thành đã chinh phục</h1><p>So lại điểm trận và dấu vết theo từng kỹ năng.</p></div>
        <History size={36} aria-hidden="true" />
      </header>
      {error && <p className="dungeon-inline-error" role="alert">{error}</p>}
      {history === null ? (
        <div className="dungeon-history-empty" role="status"><Sparkles size={30} /><p>Đang gọi lại chiến tích…</p></div>
      ) : history.length === 0 ? (
        <div className="dungeon-history-empty"><Trophy size={36} /><h2>Kho chiến tích còn trống</h2><p>Phá một cửa ải để ghi lại kết quả đầu tiên.</p><Link className="primary-button" to="/exams">Chọn cửa ải <ArrowRight size={17} /></Link></div>
      ) : (
        <div className="dungeon-history-list">{history.map((result) => <MockExamResultView compact key={result.sessionId} result={result} />)}</div>
      )}
    </div>
  );
}

function MockExamRunner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams<{ level: string; form: string }>();
  const level = params.level?.toLowerCase() ?? "";
  const form = params.form?.toLowerCase() ?? "";
  const routeSupported = isSupportedMockExamRoute(level, form);
  const endpoint = `/api/exams/${encodeURIComponent(level)}/${encodeURIComponent(form)}`;
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [definition, setDefinition] = useState<CatalogEntry | null>(null);
  const [definitionLoadState, setDefinitionLoadState] =
    useState<DefinitionLoadState>(routeSupported ? "loading" : "not-found");
  const [result, setResult] = useState<MockResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutRetryRequired, setTimeoutRetryRequired] = useState(false);
  const questionStartedAt = useRef(Date.now());
  const timeoutSubmittedSession = useRef<string | null>(null);
  const autoStartAttempted = useRef(false);
  const requestedNextDoor = searchParams.get("next") ?? "";
  const [nextLevel = "", nextForm = ""] = requestedNextDoor.split("/");
  const nextExamPath = isSupportedMockExamRoute(nextLevel, nextForm)
    ? `/exams/${nextLevel}/${nextForm}`
    : null;

  const recordedPositions = useMemo(
    () => new Set(session?.recorded.map((item) => item.position) ?? []),
    [session?.recorded],
  );
  const currentItem = session?.binding.form.items.find((item) =>
    !recordedPositions.has(item.position)
  ) ?? null;
  const sessionId = session?.binding.sessionId ?? null;
  const remainingMs = session ? Math.max(0, Date.parse(session.expiresAt) - now) : 0;

  const commandEnvironment = useCallback(async () => {
    const accountKey = sync.session?.authenticated ? sync.session.accountKey : null;
    if (
      !accountKey
      || !authority.ownerGeneration
      || authority.resetEpoch === null
      || !authority.authoritativeProgress
    ) return null;
    const environment = await readExactNormalizedLessonEnvironment({
      accountKey,
      expectedOwnerGeneration: authority.ownerGeneration,
      expectedResetEpoch: authority.resetEpoch,
    });
    return environment ? {
      ...environment,
      enrollmentId: authority.authoritativeProgress.enrollmentId,
    } : null;
  }, [authority.authoritativeProgress, authority.ownerGeneration, authority.resetEpoch, sync.session]);

  const loadResume = useCallback(async () => {
    if (!sync.session?.authenticated) return;
    if (!routeSupported) {
      setDefinitionLoadState("not-found");
      return;
    }
    setDefinitionLoadState("loading");
    setError(null);
    try {
      const payload = await requestJson<{
        session: ActiveSession | null;
        activeDoor: Pick<CatalogEntry, "examLevel" | "formKey"> | null;
      }>(`${endpoint}/sessions`);
      const activeDoorRedirectPath = getActiveMockExamRedirectPath(
        level,
        form,
        payload.session?.definition ?? payload.activeDoor,
      );
      if (activeDoorRedirectPath) {
        navigate(activeDoorRedirectPath, { replace: true });
        return;
      }
      if (payload.session) {
        for (const attempt of payload.session.recorded) {
          clearMockExamAttemptCommand(
            window.sessionStorage,
            payload.session.binding.sessionId,
            attempt.position,
          );
        }
        setSession(payload.session);
        setDefinition(payload.session.definition);
        setDefinitionLoadState("ready");
      } else {
        clearMockExamOpenCommand(window.sessionStorage, level, form);
        const catalog = await requestJson<{ forms: CatalogEntry[] }>("/api/exams/catalog");
        const matched = catalog.forms.find((item) =>
          item.examLevel === level && item.formKey === form
        ) ?? null;
        setSession(null);
        setDefinition(matched);
        setDefinitionLoadState(matched ? "ready" : "not-found");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể kiểm tra phiên đang mở.");
      setDefinitionLoadState("error");
    }
  }, [endpoint, form, level, navigate, routeSupported, sync.session?.authenticated]);

  useEffect(() => {
    setSession(null);
    setDefinition(null);
    setResult(null);
    setSelected(null);
    setError(null);
    setDefinitionLoadState(routeSupported ? "loading" : "not-found");
    setTimeoutRetryRequired(false);
    timeoutSubmittedSession.current = null;
    autoStartAttempted.current = false;
  }, [form, level, routeSupported]);
  useEffect(() => { void loadResume(); }, [loadResume]);
  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [sessionId]);
  useEffect(() => {
    timeoutSubmittedSession.current = null;
    setTimeoutRetryRequired(false);
  }, [sessionId]);
  useEffect(() => {
    setSelected(null);
    questionStartedAt.current = Date.now();
  }, [currentItem?.position]);

  const submit = useCallback(async () => {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const environment = await commandEnvironment();
      if (!environment) throw new Error("Tài khoản đang được chuẩn bị. Hãy thử lại sau giây lát.");
      const storageKey = mockExamSubmitCommandStorageKey(
        session.binding.sessionId,
      );
      const command = await readOrCreateStableMockExamCommand(
        window.sessionStorage,
        storageKey,
        async () => ({
          protocolVersion: 1 as const,
          idempotencyKey: makeIdempotencyKey(`mock-submit-${level}-${form}`),
          installationId: environment.installationId,
          deviceId: environment.deviceId,
          deviceSequence: await allocateDeviceSequence(),
          resetEpoch: environment.resetEpoch,
          contentVersion: CONTENT_VERSION,
          sessionId: session.binding.sessionId,
          formHash: session.binding.formHash,
        }),
        (value) => {
          const parsed = parseSubmitAssessmentSessionCommand(value);
          if (!parsed.ok) return null;
          const candidate = parsed.command;
          return candidate.installationId === environment.installationId
              && candidate.deviceId === environment.deviceId
              && candidate.resetEpoch === environment.resetEpoch
              && candidate.sessionId === session.binding.sessionId
              && candidate.formHash === session.binding.formHash
            ? candidate
            : null;
        },
      );
      const response = await postJson<{ result: MockResult }>(
        `${endpoint}/submit`,
        command,
      );
      clearCompletedMockExamCommandKeys(
        window.sessionStorage,
        level,
        form,
        session.binding.sessionId,
        session.binding.expectedItemCount,
      );
      setTimeoutRetryRequired(false);
      setSession(null);
      if (nextExamPath) {
        navigate(nextExamPath, { replace: true });
      } else {
        setResult(response.result);
      }
    } catch (reason) {
      if (
        Date.now() >= Date.parse(session.expiresAt)
        && reason instanceof MockExamRequestError
        && [
          "ASSESSMENT_CONTENT_UNAVAILABLE",
          "ASSESSMENT_SESSION_UNAVAILABLE",
        ].includes(reason.code ?? "")
      ) {
        try {
          const environment = await commandEnvironment();
          if (!environment) throw new Error(
            "Tài khoản đang được chuẩn bị. Hãy thử lại sau giây lát.",
            { cause: reason },
          );
          const command = await readOrCreateStableMockExamCommand(
            window.sessionStorage,
            mockExamAbandonCommandStorageKey(session.binding.sessionId),
            async () => ({
              protocolVersion: 1 as const,
              idempotencyKey: makeIdempotencyKey(`mock-abandon-expired-${session.binding.sessionId}`),
              installationId: environment.installationId,
              deviceId: environment.deviceId,
              deviceSequence: await allocateDeviceSequence(),
              resetEpoch: environment.resetEpoch,
              contentVersion: CONTENT_VERSION,
              sessionId: session.binding.sessionId,
              formHash: session.binding.formHash,
            }),
            (value) => {
              const parsed = parseAbandonAssessmentSessionCommand(value);
              if (!parsed.ok) return null;
              const candidate = parsed.command;
              return candidate.installationId === environment.installationId
                  && candidate.deviceId === environment.deviceId
                  && candidate.resetEpoch === environment.resetEpoch
                  && candidate.sessionId === session.binding.sessionId
                  && candidate.formHash === session.binding.formHash
                ? candidate
                : null;
            },
          );
          await postJson("/api/assessment/sessions/abandon", command);
          clearCompletedMockExamCommandKeys(
            window.sessionStorage,
            session.definition.examLevel,
            session.definition.formKey,
            session.binding.sessionId,
            session.binding.expectedItemCount,
          );
          autoStartAttempted.current = true;
          setSession(null);
          navigate(nextExamPath ?? "/exams", { replace: true });
          return;
        } catch (abandonReason) {
          setError(abandonReason instanceof Error
            ? abandonReason.message
            : "Không thể khép lại phiên đã hết giờ.");
          setTimeoutRetryRequired(true);
          return;
        }
      }
      setError(reason instanceof Error ? reason.message : "Không thể nộp bài luyện đề.");
      if (Date.now() >= Date.parse(session.expiresAt)) {
        setTimeoutRetryRequired(true);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, commandEnvironment, endpoint, form, level, navigate, nextExamPath, session]);

  useEffect(() => {
    if (shouldAutoSubmitMockExam({
      sessionId,
      remainingMs,
      resultReady: Boolean(result),
      busy,
      attemptedSessionId: timeoutSubmittedSession.current,
      retryRequired: timeoutRetryRequired,
    })) {
      timeoutSubmittedSession.current = sessionId;
      void submit();
    }
  }, [busy, remainingMs, result, sessionId, submit, timeoutRetryRequired]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const environment = await commandEnvironment();
      if (!environment) throw new Error("Tài khoản đang được chuẩn bị. Hãy thử lại sau giây lát.");
      const storageKey = mockExamOpenCommandStorageKey(level, form);
      const command = await readOrCreateStableMockExamCommand(
        window.sessionStorage,
        storageKey,
        async () => ({
          protocolVersion: 1 as const,
          idempotencyKey: makeIdempotencyKey(`mock-open-${level}-${form}`),
          installationId: environment.installationId,
          deviceId: environment.deviceId,
          deviceSequence: await allocateDeviceSequence(),
          resetEpoch: environment.resetEpoch,
          contentVersion: CONTENT_VERSION,
          enrollmentId: environment.enrollmentId,
        }),
        (value) => {
          const parsed = parseOpenAssessmentSessionCommand(value);
          if (!parsed.ok) return null;
          const candidate = parsed.command;
          return candidate.installationId === environment.installationId
              && candidate.deviceId === environment.deviceId
              && candidate.resetEpoch === environment.resetEpoch
              && candidate.enrollmentId === environment.enrollmentId
            ? candidate
            : null;
        },
      );
      const receipt = await postJson<Binding & {
        definition: CatalogEntry;
        expiresAt: string;
      }>(`${endpoint}/sessions`, command);
      const active = openReceiptToSession(receipt as Binding & CatalogEntry & { definition: CatalogEntry; expiresAt: string });
      setDefinition(active.definition);
      setDefinitionLoadState("ready");
      setSession(active);
      setNow(Date.now());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể mở bài luyện đề.");
    } finally {
      setBusy(false);
    }
  }, [commandEnvironment, endpoint, form, level]);

  useEffect(() => {
    if (
      definitionLoadState !== "ready"
      || !definition
      || session
      || result
      || autoStartAttempted.current
    ) return;
    autoStartAttempted.current = true;
    void start();
  }, [definition, definitionLoadState, result, session, start]);

  const record = async () => {
    if (!session || !currentItem || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const environment = await commandEnvironment();
      if (!environment) throw new Error("Phiên tài khoản vừa thay đổi. Hãy tải lại trang.");
      const storageKey = mockExamAttemptCommandStorageKey(
        session.binding.sessionId,
        currentItem.position,
      );
      const command = await readOrCreateStableMockExamCommand(
        window.sessionStorage,
        storageKey,
        async () => ({
          protocolVersion: 1 as const,
          idempotencyKey: makeIdempotencyKey(
            `mock-attempt-${session.binding.sessionId}-${currentItem.position}`,
          ),
          installationId: environment.installationId,
          deviceId: environment.deviceId,
          deviceSequence: await allocateDeviceSequence(),
          resetEpoch: environment.resetEpoch,
          contentVersion: CONTENT_VERSION,
          sessionId: session.binding.sessionId,
          formHash: session.binding.formHash,
          itemId: currentItem.itemId,
          itemVersion: currentItem.itemVersion,
          occurredAt: new Date(Math.max(
            Date.now(),
            Date.parse(session.binding.startedAt),
          )).toISOString(),
          response: {
            kind: "selection" as const,
            answer: selected,
            durationMs: Math.min(
              600_000,
              Math.max(0, Date.now() - questionStartedAt.current),
            ),
          },
        }),
        (value) => {
          const parsed = parseRecordAssessmentAttemptCommand(value);
          if (!parsed.ok) return null;
          const candidate = parsed.command;
          return candidate.installationId === environment.installationId
              && candidate.deviceId === environment.deviceId
              && candidate.resetEpoch === environment.resetEpoch
              && candidate.sessionId === session.binding.sessionId
              && candidate.formHash === session.binding.formHash
              && candidate.itemId === currentItem.itemId
              && candidate.itemVersion === currentItem.itemVersion
            ? candidate
            : null;
        },
      );
      await postJson(`${endpoint}/attempts`, command);
      clearMockExamAttemptCommand(
        window.sessionStorage,
        session.binding.sessionId,
        currentItem.position,
      );
      setSession({
        ...session,
        recorded: [...session.recorded, {
          position: currentItem.position,
          itemId: currentItem.itemId,
          itemVersion: currentItem.itemVersion,
          answer: command.response.answer,
        }],
      });
      setSelected(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể ghi câu trả lời.");
    } finally {
      setBusy(false);
    }
  };

  if (!routeSupported || definitionLoadState === "not-found") {
    return (
      <div className="lesson-state-screen dungeon-state">
        <CircleX size={44} />
        <span className="system-kicker">LỐI ĐI KHÔNG TỒN TẠI</span>
        <h1>Cửa ải này chưa xuất hiện</h1>
        <p>Trở về Địa Thành HSK để chọn một tầng và tuyến đang mở.</p>
        <Link className="primary-button" to="/exams">
          <ArrowLeft size={17} /> Trở về Địa Thành
        </Link>
      </div>
    );
  }
  if (!sync.session?.authenticated) {
    return <div className="lesson-state-screen dungeon-state"><ShieldCheck size={44} /><span className="system-kicker">CỬA ẢI CẦN DANH TÍNH</span><h1>Đăng nhập để bắt đầu</h1><p>Phiên đang làm và chiến tích sẽ được giữ lại cho lần quay về sau.</p><Link className="primary-button" to={`/signin?returnTo=${encodeURIComponent(`/exams/${level}/${form}`)}`}>Mở cổng đăng nhập <ArrowRight size={17} /></Link></div>;
  }
  if (result) return <MockExamResultView result={result} />;
  if (definitionLoadState === "loading") {
    return <div className="lesson-state-screen dungeon-state" role="status"><Sparkles className="spin" size={42} /><span className="system-kicker">ĐỊA THÀNH ĐANG MỞ</span><h1>Đang gọi lại cửa ải…</h1><p>Phiên đang dở sẽ tiếp tục đúng vị trí trước đó.</p></div>;
  }
  if (definitionLoadState === "error" && !definition) {
    return (
      <div className="lesson-state-screen dungeon-state">
        <RefreshCw size={42} />
        <span className="system-kicker">CỬA ẢI CHƯA PHẢN HỒI</span>
        <h1>Chưa thể bước vào lúc này</h1>
        {error && <p role="alert">{error}</p>}
        <button className="primary-button" disabled={busy} type="button" onClick={() => void loadResume()}>
          <RefreshCw size={17} /> Thử mở lại
        </button>
      </div>
    );
  }
  if (!definition) {
    return <div className="lesson-state-screen dungeon-state"><CircleX size={42} /><h1>Cửa ải này chưa xuất hiện</h1><Link className="primary-button" to="/exams">Về Địa Thành HSK</Link></div>;
  }
  if (!session) {
    return (
      <div className="lesson-state-screen dungeon-state" data-level={definition.examLevel}>
        {error ? <RefreshCw size={42} /> : <DoorOpen className="spin" size={42} />}
        <span className="system-kicker">HSK{levelNumber(definition.examLevel)} · CỬA {definition.formKey.toUpperCase()}</span>
        <h1>{error ? "Chưa thể phát đề" : "Đang phát đề thi mô phỏng…"}</h1>
        <p>{error ?? `${definition.itemCount} câu · ${definition.timeLimitMinutes} phút. Đồng hồ bắt đầu ngay khi đề mở.`}</p>
        {error && (
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => {
              autoStartAttempted.current = true;
              void start();
            }}
          ><RefreshCw size={17} /> Thử phát đề lại</button>
        )}
      </div>
    );
  }
  if (remainingMs === 0 && timeoutRetryRequired) {
    return (
      <div className="lesson-state-screen dungeon-state">
        <RefreshCw size={44} />
        <span className="system-kicker">ĐỒNG HỒ ĐÃ DỪNG</span>
        <h1>Ghi lại chiến tích lần nữa</h1>
        {error && <p role="alert">{error}</p>}
        <button
          className="primary-button"
          disabled={busy}
          type="button"
          onClick={() => {
            timeoutSubmittedSession.current = session.binding.sessionId;
            setTimeoutRetryRequired(false);
            void submit();
          }}
        >
          <RefreshCw size={17} /> Ghi lại kết quả
        </button>
      </div>
    );
  }
  if (!currentItem) {
    return <div className="lesson-state-screen dungeon-state"><Trophy size={42} /><span className="system-kicker">CỬA CUỐI ĐÃ VƯỢT</span><h1>Đã hoàn thành {session.recorded.length} thử thách</h1><p>Ghi chiến tích để xem điểm trận và những phòng nên luyện lại.</p>{error && <p role="alert">{error}</p>}<button className="primary-button" disabled={busy} type="button" onClick={() => void submit()}>{busy ? "Đang ghi chiến tích…" : <>Ghi chiến tích <ArrowRight size={17} /></>}</button></div>;
  }
  const seconds = Math.ceil(remainingMs / 1_000);
  const matchedRoomIndex = dungeonRooms.findIndex((room) => room.key === currentItem.skill);
  const roomIndex = matchedRoomIndex >= 0 ? matchedRoomIndex : 0;
  const currentRoom = dungeonRooms[roomIndex]!;
  const CurrentRoomIcon = currentRoom.icon;
  const sectionIndex = Math.max(0, session.definition.sections.findIndex(
    (section) => section.skill === currentItem.skill,
  ));
  const sectionStart = session.definition.sections
    .slice(0, sectionIndex)
    .reduce((sum, section) => sum + section.itemCount, 0);
  const sectionQuestion = currentItem.position - sectionStart + 1;
  return (
    <div className={`mock-dungeon-live mock-exam-live ${selected ? "has-selection" : ""}`} data-level={session.definition.examLevel}>
      <header className="dungeon-runner-hud">
        <Link className="icon-button" to="/exams" aria-label="Rời bài thi"><ArrowLeft size={20} /></Link>
        <div className="dungeon-runner-identity"><span>HSK{levelNumber(session.definition.examLevel)} · ĐỀ {session.definition.formKey.toUpperCase()}</span><strong>Bài thi mô phỏng</strong></div>
        <div className="dungeon-route-progress exam-section-progress" role="progressbar" aria-label={`${session.recorded.length} trên ${session.binding.expectedItemCount} câu đã lưu`} aria-valuemin={0} aria-valuemax={session.binding.expectedItemCount} aria-valuenow={session.recorded.length}>
          {session.definition.sections.map((section, index) => (
            <span className={index < sectionIndex ? "cleared" : index === sectionIndex ? "current" : ""} key={section.skill}>
              <b>{index + 1}</b>{section.label}<small>{section.itemCount} câu</small>
            </span>
          ))}
        </div>
        <span className="dungeon-question-count">{session.recorded.length + 1}/{session.binding.expectedItemCount}</span>
        <strong className={`dungeon-timer ${seconds < 60 ? "timer-warning" : ""}`} aria-label={`Còn ${Math.floor(seconds / 60)} phút ${seconds % 60} giây`}><Clock3 size={17} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong>
      </header>

      <div className="dungeon-question-scroll">
        <section className="dungeon-question" aria-labelledby="dungeon-question-title">
          <div className="dungeon-room-heading"><span>PHẦN {sectionIndex + 1}</span><CurrentRoomIcon size={21} /><strong>{skillLabel[currentItem.skill] ?? currentRoom.skill}</strong><small>Câu {sectionQuestion}/{session.definition.sections[sectionIndex]?.itemCount ?? 0}</small></div>
          <h1 id="dungeon-question-title">{currentItem.prompt}</h1>
          {currentItem.modality === "synthetic-tts-selection" && currentItem.stimulusText && (
            <div className="dungeon-audio-cue">
              <button className="sound-orb" type="button" aria-label={`Phát câu nghe ${currentItem.position + 1}`} onClick={() => speakMandarin(currentItem.stimulusText!)}><Volume2 size={32} /><span aria-hidden="true" /></button>
              <p><Headphones size={15} /> Giọng luyện tập tổng hợp</p>
            </div>
          )}
          <div className="dungeon-options" role="radiogroup" aria-label={`Lựa chọn câu ${currentItem.position + 1}`}>
            {currentItem.options.map((option, index) => (
              <button
                key={option}
                className={selected === option ? "selected" : ""}
                role="radio"
                data-radio-index={index}
                aria-checked={selected === option}
                tabIndex={selected ? (selected === option ? 0 : -1) : (index === 0 ? 0 : -1)}
                type="button"
                disabled={busy}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: index,
                  itemCount: currentItem.options.length,
                  onSelect: (nextIndex) => setSelected(currentItem.options[nextIndex] ?? null),
                })}
                onClick={() => setSelected(option)}
              ><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong><i aria-hidden="true" /></button>
            ))}
          </div>
        </section>
      </div>

      <footer className="dungeon-runner-dock">
        <div role="status">
          {error ? <p className="dungeon-inline-error">{error}</p> : <><span>CÂU {currentItem.position + 1}/{session.binding.expectedItemCount} · PHẦN {sectionIndex + 1}/{session.definition.sections.length}</span><strong>{selected ? "Đã chọn — bạn vẫn có thể đổi trước khi lưu" : "Chọn một đáp án để tiếp tục"}</strong></>}
        </div>
        <button className="primary-button" disabled={!selected || busy} type="button" onClick={() => void record()}>{busy ? "Đang lưu…" : <>Lưu và sang câu tiếp <ArrowRight size={17} /></>}</button>
      </footer>
    </div>
  );
}

export function MockExamsPage({ mode }: { mode: "catalog" | "runner" | "history" }) {
  if (mode === "history") return <MockExamHistory />;
  if (mode === "runner") return <MockExamRunner />;
  return <MockExamCatalog />;
}
