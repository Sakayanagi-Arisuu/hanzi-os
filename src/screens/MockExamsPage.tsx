import {
  ArrowLeft,
  ArrowRight,
  CircleX,
  Clock3,
  ExternalLink,
  FileCheck2,
  Headphones,
  History,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Target,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import "./MockExamsPage.css";
import {
  clearMockExamAttemptCommand,
  clearCompletedMockExamCommandKeys,
  clearMockExamOpenCommand,
  isSupportedMockExamRoute,
  mockExamAttemptCommandStorageKey,
  mockExamOpenCommandStorageKey,
  mockExamSubmitCommandStorageKey,
  readOrCreateStableMockExamCommand,
  shouldAutoSubmitMockExam,
} from "../assessment/mockExamClientPolicy";
import { parseRecordAssessmentAttemptCommand } from "../assessment/assessmentAttemptProtocol";
import { parseOpenAssessmentSessionCommand } from "../assessment/assessmentSessionProtocol";
import { parseSubmitAssessmentSessionCommand } from "../assessment/assessmentSubmissionProtocol";
import { CONTENT_VERSION } from "../data/contentIdentity";
import {
  OFFICIAL_HSK3_SAMPLE_URL,
  OFFICIAL_HSK_AUDIO_URL,
  OFFICIAL_HSK_RESOURCES,
} from "../data/officialHskResources";
import { makeIdempotencyKey } from "../lib/evidence";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { allocateDeviceSequence } from "../sync/indexedDb";
import { readExactNormalizedLessonEnvironment } from "../sync/normalizedLessonEnvironment";

type CatalogEntry = {
  examLevel: "hsk1" | "hsk2" | "hsk3" | "hsk4";
  formKey: "a" | "b";
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
  listening: "Nghe TTS",
  reading: "Đọc",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const body = await response.json() as T & {
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(body.error?.message ?? "Yêu cầu luyện đề thất bại.");
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

function MockExamResultView({ result }: { result: MockResult }) {
  return (
    <div className="mock-exam-result">
      <span className="system-kicker">KẾT QUẢ LUYỆN ĐỀ HANZI.OS</span>
      <h1>{result.definition.title}</h1>
      <div className="assessment-score">
        <strong>{result.score.percent}%</strong>
        <span>{result.score.correct}/{result.score.total} câu đúng</span>
      </div>
      <p>
        {result.timedOut ? "Phiên đã được chốt khi hết giờ. " : ""}
        Điểm phản ánh lần làm đề này và giúp chọn bài nên ôn lại; đây không phải
        điểm thi hay chứng chỉ HSK chính thức.
      </p>
      <div className="mock-skill-grid">
        {result.skills.map((skill) => (
          <div key={skill.skill}>
            <span>{skillLabel[skill.skill] ?? skill.skill}</span>
            <strong>{skill.correct}/{skill.total}</strong>
          </div>
        ))}
      </div>
      {result.recommendations.length > 0 && (
        <section className="mock-recommendations">
          <h2>Bài nên ôn lại</h2>
          {result.recommendations.map((item) => (
            <Link key={item.lessonId} to={item.href}>
              {item.lessonId} · liên quan {item.wrongCount} câu sai
              <ArrowRight size={16} />
            </Link>
          ))}
        </section>
      )}
      <section className="mock-review-list">
        <h2>Xem lại đáp án</h2>
        {result.review.map((item) => (
          <details key={item.itemVersion}>
            <summary>
              Câu {item.position + 1} · {skillLabel[item.skill] ?? item.skill} ·
              {item.correct ? " đúng" : " cần ôn"}
            </summary>
            <p>{item.prompt}</p>
            <p>Bạn chọn: <strong>{item.selectedAnswer ?? "Chưa trả lời"}</strong></p>
            <p>Đáp án: <strong>{item.correctAnswer}</strong></p>
            <p>{item.explanationVi}</p>
            {!item.correct && (
              <Link to={item.recommendedLessonHref}>Mở bài gợi ý</Link>
            )}
          </details>
        ))}
      </section>
      <div className="assessment-actions">
        <Link className="primary-button" to="/exams/history">
          <History size={17} /> Lịch sử luyện đề
        </Link>
        <Link className="secondary-button" to="/exams">Chọn form khác</Link>
      </div>
    </div>
  );
}

function MockExamCatalog() {
  const { sync } = useLearning();
  const [forms, setForms] = useState<CatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    requestJson<{ forms: CatalogEntry[] }>("/api/exams/catalog")
      .then((result) => setForms(result.forms))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được catalog."));
  }, []);
  return (
    <div className="mock-exam-page">
      <header className="mock-exam-hero">
        <Target size={42} />
        <span className="system-kicker">PHÒNG LUYỆN ĐỀ · HSK1–4</span>
        <h1>Tài liệu CTI và luyện nhanh</h1>
        <p>
          Mở nguyên bản do Chinese Test Service công bố, hoặc làm bài luyện nhanh
          do HANZI.OS tự soạn. Hai loại được tách rõ để không nhầm 12 câu với một đề thi thật.
        </p>
        <div className="assessment-actions">
          {sync.session?.authenticated ? (
            <Link className="secondary-button" to="/exams/history">
              <History size={17} /> Xem lịch sử
            </Link>
          ) : (
            <Link className="primary-button" to="/signin?returnTo=%2Fexams">
              Đăng nhập để làm bài
            </Link>
          )}
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="official-exam-library">
        <header>
          <div>
            <span className="system-kicker"><FileCheck2 size={15} /> NGUỒN CHÍNH THỨC · CHINESE TEST SERVICE</span>
            <h2>Đề nguyên bản HSK 2.0 đang công khai</h2>
            <p>HANZI.OS chưa tìm thấy một kho đề chính thức được CTI sắp theo từng năm gần đây. Các nút dưới đây dẫn thẳng tới cấu trúc và tài liệu gốc, không sao chép PDF hoặc audio vào ứng dụng.</p>
          </div>
          <a href={OFFICIAL_HSK_AUDIO_URL} target="_blank" rel="noreferrer">
            Kho audio chính thức <ExternalLink size={16} />
          </a>
        </header>
        <div className="official-exam-grid">
          {OFFICIAL_HSK_RESOURCES.map((resource) => (
            <article key={resource.level}>
              <span>{resource.level} · CẤU TRÚC HSK 2.0</span>
              <h3>{resource.items} câu · khoảng {resource.minutes} phút</h3>
              <p>{resource.sections}</p>
              <div>
                <a href={resource.structure} target="_blank" rel="noreferrer">Xem cấu trúc CTI <ExternalLink size={15} /></a>
                <a href={resource.paper} target="_blank" rel="noreferrer">Đề tham khảo CTI {resource.paperCode} · không gắn năm <ExternalLink size={15} /></a>
                <a href={resource.sample} target="_blank" rel="noreferrer">Mở mẫu chuẩn <ExternalLink size={15} /></a>
              </div>
            </article>
          ))}
        </div>
        <aside className="hsk3-resource-note">
          <strong>HSK 3.0 mới thử nghiệm, chưa thay HSK 2.0 trong kỳ thi thường kỳ 2026.</strong>
          <a href={OFFICIAL_HSK3_SAMPLE_URL} target="_blank" rel="noreferrer">Tải gói đề mẫu HSK 3.0 chính thức <ExternalLink size={15} /></a>
        </aside>
      </section>

      <section className="full-exam-roadmap" aria-label="Trạng thái mô phỏng toàn phần">
        <LockKeyhole size={22} />
        <div>
          <strong>Mô phỏng toàn phần trong ứng dụng chưa mở</strong>
          <p>Chỉ mở khi ngân hàng gốc đủ đúng 40/60/80/100 câu và đủ từng phần. Hệ thống sẽ không lặp 12 câu hoặc kéo dài đồng hồ để giả thành đề thật.</p>
        </div>
      </section>

      <header className="mini-exam-heading">
        <div><span className="system-kicker">HANZI.OS ORIGINAL · LUYỆN NHANH</span><h2>Tám bài A/B, mỗi bài 12 câu</h2></div>
        <p>Chấm phía máy chủ, lưu lịch sử; không phải đề chính thức và không dùng để chứng nhận.</p>
      </header>
      <div className="mock-form-grid">
        {forms.map((form) => (
          <article key={`${form.examLevel}:${form.formKey}`}>
            <span>HSK{form.examLevel.slice(-1)} · FORM {form.formKey.toUpperCase()}</span>
            <h2>{form.title}</h2>
            <p>{form.itemCount} câu · {form.timeLimitMinutes} phút · bài luyện nhanh</p>
            <Link className="primary-button" to={`/exams/${form.examLevel}/${form.formKey}`}>
              Xem hướng dẫn <ArrowRight size={16} />
            </Link>
          </article>
        ))}
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
    return <div className="lesson-state-screen"><ShieldCheck size={42} /><h1>Lịch sử cần đăng nhập</h1><Link className="primary-button" to="/signin?returnTo=%2Fexams%2Fhistory">Đăng nhập</Link></div>;
  }
  return (
    <div className="mock-exam-page">
      <header className="mock-exam-hero"><History size={40} /><span className="system-kicker">NHẬT KÝ LUYỆN ĐỀ</span><h1>Lịch sử làm bài</h1><p>Xem lại điểm, đáp án và bài ôn gợi ý của những lần làm trước.</p></header>
      {error && <p role="alert">{error}</p>}
      {history === null ? <p>Đang tải lịch sử...</p> : history.length === 0 ? <p>Chưa có bài luyện nhanh nào đã nộp.</p> : history.map((result) => <MockExamResultView key={result.sessionId} result={result} />)}
    </div>
  );
}

function MockExamRunner() {
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
      const payload = await requestJson<{ session: ActiveSession | null }>(`${endpoint}/sessions`);
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
  }, [endpoint, form, level, routeSupported, sync.session?.authenticated]);

  useEffect(() => {
    setSession(null);
    setDefinition(null);
    setResult(null);
    setSelected(null);
    setError(null);
    setDefinitionLoadState(routeSupported ? "loading" : "not-found");
    setTimeoutRetryRequired(false);
    timeoutSubmittedSession.current = null;
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
      setResult(response.result);
      setSession(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể nộp bài luyện đề.");
      if (Date.now() >= Date.parse(session.expiresAt)) {
        setTimeoutRetryRequired(true);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, commandEnvironment, endpoint, form, level, session]);

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

  const start = async () => {
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
  };

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
      <div className="lesson-state-screen">
        <CircleX size={44} />
        <span>ĐƯỜNG DẪN LUYỆN ĐỀ KHÔNG HỢP LỆ</span>
        <h1>Không tìm thấy bài luyện này</h1>
        <p>Chọn một bài HSK1–4, form A hoặc B từ Phòng Luyện Đề.</p>
        <Link className="primary-button" to="/exams">
          <ArrowLeft size={17} /> Về danh sách bài luyện
        </Link>
      </div>
    );
  }
  if (!sync.session?.authenticated) {
    return <div className="lesson-state-screen"><ShieldCheck size={44} /><span>LƯU BÀI VÀ TIẾP TỤC SAU</span><h1>Đăng nhập để làm đề</h1><p>Tài khoản giúp lưu thời gian, câu trả lời, kết quả và lịch sử làm đề.</p><Link className="primary-button" to={`/signin?returnTo=${encodeURIComponent(`/exams/${level}/${form}`)}`}>Mở cổng đăng nhập</Link></div>;
  }
  if (result) return <MockExamResultView result={result} />;
  if (definitionLoadState === "loading") {
    return <div className="lesson-state-screen" role="status"><Target size={42} /><h1>Đang tải bài luyện...</h1><p>Hệ thống đang kiểm tra form và phiên đang dở của tài khoản này.</p></div>;
  }
  if (definitionLoadState === "error" && !definition) {
    return (
      <div className="lesson-state-screen">
        <RefreshCw size={42} />
        <h1>Chưa tải được bài luyện</h1>
        {error && <p role="alert">{error}</p>}
        <button className="primary-button" disabled={busy} type="button" onClick={() => void loadResume()}>
          <RefreshCw size={17} /> Thử tải lại
        </button>
      </div>
    );
  }
  if (!definition) {
    return <div className="lesson-state-screen"><CircleX size={42} /><h1>Không tìm thấy bài luyện này</h1><Link className="primary-button" to="/exams">Về Phòng Luyện Đề</Link></div>;
  }
  if (!session) {
    return <div className="assessment-intro"><Target size={42} /><span className="system-kicker">{definition.title} · HANZI.OS ORIGINAL</span><h1>Hướng dẫn bài luyện nhanh</h1><p>{definition.itemCount} câu trong {definition.timeLimitMinutes} phút. Đây không phải đề HSK toàn phần. Đóng trang vẫn có thể quay lại làm tiếp; câu nghe dùng giọng máy tổng hợp.</p><div className="assessment-facts"><span><Clock3 size={18} /><strong>{definition.timeLimitMinutes} phút</strong><small>đồng hồ tự chạy</small></span><span><ShieldCheck size={18} /><strong>Không lộ đáp án</strong><small>xem lại sau khi nộp</small></span><span><History size={18} /><strong>Tiếp tục được</strong><small>giữ phiên đang dở</small></span></div>{error && <p role="alert">{error}</p>}<div className="assessment-actions"><Link className="secondary-button" to="/exams"><ArrowLeft size={16} /> Quay lại</Link><button className="primary-button" type="button" disabled={busy} onClick={() => void start()}>Bắt đầu luyện nhanh <ArrowRight size={16} /></button></div></div>;
  }
  if (remainingMs === 0 && timeoutRetryRequired) {
    return (
      <div className="lesson-state-screen">
        <RefreshCw size={44} />
        <span>ĐÃ HẾT GIỜ · KẾT QUẢ CHƯA ĐƯỢC CHỐT</span>
        <h1>Hãy thử nộp lại</h1>
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
          <RefreshCw size={17} /> Nộp lại bài đã hết giờ
        </button>
      </div>
    );
  }
  if (!currentItem) {
    return <div className="lesson-state-screen"><ShieldCheck size={42} /><h1>Đã trả lời đủ {session.recorded.length} câu</h1>{error && <p role="alert">{error}</p>}<button className="primary-button" disabled={busy} type="button" onClick={() => void submit()}>Nộp bài và xem kết quả</button></div>;
  }
  const seconds = Math.ceil(remainingMs / 1_000);
  return (
    <div className="assessment-live mock-exam-live">
      <header><Link className="icon-button" to="/exams" aria-label="Rời runner"><ArrowLeft size={20} /></Link><div role="progressbar" aria-valuemin={0} aria-valuemax={session.binding.expectedItemCount} aria-valuenow={session.recorded.length}><i style={{ width: `${session.recorded.length / session.binding.expectedItemCount * 100}%` }} /></div><span>{session.recorded.length}/{session.binding.expectedItemCount}</span><strong className={seconds < 60 ? "timer-warning" : ""}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></header>
      <section className="assessment-question">
        <span className="system-kicker">{currentItem.modality === "synthetic-tts-selection" ? <Headphones size={15} /> : <Target size={15} />} {currentItem.meta}</span>
        <h1>{currentItem.prompt}</h1>
        {currentItem.modality === "synthetic-tts-selection" && currentItem.stimulusText && <><button className="sound-orb" type="button" aria-label={`Phát câu nghe ${currentItem.position + 1} bằng giọng TTS`} onClick={() => speakMandarin(currentItem.stimulusText!)}><Volume2 size={36} /><span aria-hidden="true" /></button><p>Giọng máy tổng hợp dùng để luyện nghe trên thiết bị.</p></>}
        <div className="assessment-options" role="radiogroup" aria-label={`Lựa chọn câu ${currentItem.position + 1}`}>{currentItem.options.map((option, index) => <button key={option} className={selected === option ? "selected" : ""} role="radio" aria-checked={selected === option} type="button" disabled={busy} onClick={() => setSelected(option)}><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong></button>)}</div>
      </section>
      <footer><div role="status">{error ? <p>{error}</p> : <p>Câu trả lời được lưu; đáp án sẽ hiện sau khi bạn nộp bài.</p>}</div><button className="primary-button" disabled={!selected || busy} type="button" onClick={() => void record()}>Lưu và sang câu tiếp <ArrowRight size={16} /></button></footer>
    </div>
  );
}

export function MockExamsPage({ mode }: { mode: "catalog" | "runner" | "history" }) {
  if (mode === "history") return <MockExamHistory />;
  if (mode === "runner") return <MockExamRunner />;
  return <MockExamCatalog />;
}
