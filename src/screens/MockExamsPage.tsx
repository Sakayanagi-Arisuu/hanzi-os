import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Headphones,
  History,
  ShieldCheck,
  Target,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { CONTENT_VERSION } from "../data/contentIdentity";
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
  if (!response.ok) throw new Error(body.error?.message ?? "Yêu cầu Mock Exam thất bại.");
  return body;
};

const postJson = <T,>(url: string, body: unknown) => requestJson<T>(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const stableBrowserCommandKey = (storageKey: string, prefix: string) => {
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = makeIdempotencyKey(prefix);
  sessionStorage.setItem(storageKey, created);
  return created;
};

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
      <span className="system-kicker">KẾT QUẢ MÔ PHỎNG ĐẠI KHẢO</span>
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
          <History size={17} /> Lịch sử Mock Exam
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
        <span className="system-kicker">MÔ PHỎNG ĐẠI KHẢO · HSK1–4</span>
        <h1>Tám đề mô phỏng HSK1–4</h1>
        <p>
          Mỗi cấp có đề A/B riêng, giới hạn thời gian, tiếp tục phiên đang dở và
          lưu lịch sử. Đây là bài luyện tập của HANZI.OS, không phải đề thi chính
          thức hay chứng chỉ HSK.
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
      <div className="mock-form-grid">
        {forms.map((form) => (
          <article key={`${form.examLevel}:${form.formKey}`}>
            <span>HSK{form.examLevel.slice(-1)} · FORM {form.formKey.toUpperCase()}</span>
            <h2>{form.title}</h2>
            <p>{form.itemCount} câu · {form.timeLimitMinutes} phút · 4 kỹ năng</p>
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
      <header className="mock-exam-hero"><History size={40} /><span className="system-kicker">HÀNH TRÌNH ĐẠI KHẢO</span><h1>Lịch sử làm đề</h1><p>Xem lại điểm, đáp án và bài ôn gợi ý của những lần làm trước.</p></header>
      {error && <p role="alert">{error}</p>}
      {history === null ? <p>Đang tải lịch sử...</p> : history.length === 0 ? <p>Chưa có Mock Exam đã nộp.</p> : history.map((result) => <MockExamResultView key={result.sessionId} result={result} />)}
    </div>
  );
}

function MockExamRunner() {
  const params = useParams<{ level: string; form: string }>();
  const level = params.level?.toLowerCase() ?? "";
  const form = params.form?.toLowerCase() ?? "";
  const endpoint = `/api/exams/${encodeURIComponent(level)}/${encodeURIComponent(form)}`;
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [definition, setDefinition] = useState<CatalogEntry | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionStartedAt = useRef(Date.now());
  const timeoutSubmitted = useRef(false);

  const recordedPositions = useMemo(
    () => new Set(session?.recorded.map((item) => item.position) ?? []),
    [session?.recorded],
  );
  const currentItem = session?.binding.form.items.find((item) =>
    !recordedPositions.has(item.position)
  ) ?? null;
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
    try {
      const payload = await requestJson<{ session: ActiveSession | null }>(`${endpoint}/sessions`);
      if (payload.session) {
        setSession(payload.session);
        setDefinition(payload.session.definition);
      } else {
        const catalog = await requestJson<{ forms: CatalogEntry[] }>("/api/exams/catalog");
        setDefinition(catalog.forms.find((item) =>
          item.examLevel === level && item.formKey === form
        ) ?? null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể kiểm tra phiên đang mở.");
    }
  }, [endpoint, form, level, sync.session?.authenticated]);

  useEffect(() => { void loadResume(); }, [loadResume]);
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [session]);
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
      const response = await postJson<{ result: MockResult }>(`${endpoint}/submit`, {
        protocolVersion: 1,
        idempotencyKey: stableBrowserCommandKey(
          `hanzi.mock.submit.${session.binding.sessionId}`,
          `mock-submit-${level}-${form}`,
        ),
        installationId: environment.installationId,
        deviceId: environment.deviceId,
        deviceSequence: await allocateDeviceSequence(),
        resetEpoch: environment.resetEpoch,
        contentVersion: CONTENT_VERSION,
        sessionId: session.binding.sessionId,
        formHash: session.binding.formHash,
      });
      setResult(response.result);
      setSession(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể nộp Mock Exam.");
    } finally {
      setBusy(false);
    }
  }, [busy, commandEnvironment, endpoint, form, level, session]);

  useEffect(() => {
    if (session && remainingMs === 0 && !result && !busy && !timeoutSubmitted.current) {
      timeoutSubmitted.current = true;
      void submit();
    }
  }, [busy, remainingMs, result, session, submit]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const environment = await commandEnvironment();
      if (!environment) throw new Error("Tài khoản đang được chuẩn bị. Hãy thử lại sau giây lát.");
      const storageKey = `hanzi.mock.open.${level}.${form}`;
      const idempotencyKey = stableBrowserCommandKey(
        storageKey,
        `mock-open-${level}-${form}`,
      );
      const receipt = await postJson<Binding & {
        definition: CatalogEntry;
        expiresAt: string;
      }>(`${endpoint}/sessions`, {
        protocolVersion: 1,
        idempotencyKey,
        installationId: environment.installationId,
        deviceId: environment.deviceId,
        deviceSequence: await allocateDeviceSequence(),
        resetEpoch: environment.resetEpoch,
        contentVersion: CONTENT_VERSION,
        enrollmentId: environment.enrollmentId,
      });
      const active = openReceiptToSession(receipt as Binding & CatalogEntry & { definition: CatalogEntry; expiresAt: string });
      setDefinition(active.definition);
      setSession(active);
      setNow(Date.now());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể mở Mock Exam.");
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
      await postJson(`${endpoint}/attempts`, {
        protocolVersion: 1,
        idempotencyKey: stableBrowserCommandKey(
          `hanzi.mock.attempt.${session.binding.sessionId}.${currentItem.position}`,
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
        occurredAt: new Date(Math.max(Date.now(), Date.parse(session.binding.startedAt))).toISOString(),
        response: {
          kind: "selection",
          answer: selected,
          durationMs: Math.min(600_000, Math.max(0, Date.now() - questionStartedAt.current)),
        },
      });
      setSession({
        ...session,
        recorded: [...session.recorded, {
          position: currentItem.position,
          itemId: currentItem.itemId,
          itemVersion: currentItem.itemVersion,
          answer: selected,
        }],
      });
      setSelected(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể ghi câu trả lời.");
      if (Date.now() >= Date.parse(session.expiresAt)) void submit();
    } finally {
      setBusy(false);
    }
  };

  if (!sync.session?.authenticated) {
    return <div className="lesson-state-screen"><ShieldCheck size={44} /><span>LƯU BÀI VÀ TIẾP TỤC SAU</span><h1>Đăng nhập để làm đề</h1><p>Tài khoản giúp lưu thời gian, câu trả lời, kết quả và lịch sử làm đề.</p><Link className="primary-button" to={`/signin?returnTo=${encodeURIComponent(`/exams/${level}/${form}`)}`}>Mở cổng đăng nhập</Link></div>;
  }
  if (result) return <MockExamResultView result={result} />;
  if (!definition) return <div className="lesson-state-screen"><Target size={42} /><h1>Đang kiểm tra form...</h1>{error && <p role="alert">{error}</p>}</div>;
  if (!session) {
    return <div className="assessment-intro"><Target size={42} /><span className="system-kicker">{definition.title}</span><h1>Hướng dẫn trước khi bắt đầu</h1><p>{definition.itemCount} câu trong {definition.timeLimitMinutes} phút. Đóng trang vẫn có thể quay lại làm tiếp. Câu nghe dùng giọng máy tổng hợp.</p><div className="assessment-facts"><span><Clock3 size={18} /><strong>{definition.timeLimitMinutes} phút</strong><small>đồng hồ tự chạy</small></span><span><ShieldCheck size={18} /><strong>Không lộ đáp án</strong><small>xem lại sau khi nộp</small></span><span><History size={18} /><strong>Tiếp tục được</strong><small>giữ phiên đang dở</small></span></div>{error && <p role="alert">{error}</p>}<div className="assessment-actions"><Link className="secondary-button" to="/exams"><ArrowLeft size={16} /> Quay lại</Link><button className="primary-button" type="button" disabled={busy} onClick={() => void start()}>Bắt đầu <ArrowRight size={16} /></button></div></div>;
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
        {currentItem.modality === "synthetic-tts-selection" && currentItem.stimulusText && <><button className="sound-orb" type="button" onClick={() => speakMandarin(currentItem.stimulusText!)}><Volume2 size={36} /><span /></button><p>Giọng máy tổng hợp dùng để luyện nghe trên thiết bị.</p></>}
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
