import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Eye,
  EyeOff,
  ListChecks,
  LoaderCircle,
  Map,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE } from "../content/clientContentAvailability";
import {
  CURRENT_CONTENT_VERSION,
} from "../content/currentContentIdentity";
import {
  parseMistakeQueue,
  type MistakeQueueItemV1,
  type MistakeQueueV1,
  type RemediationAttemptCommandV1,
  type RemediationAttemptReceiptV1,
} from "../mistakes/mistakeProtocol";
import {
  readLocalStorage,
  SYNC_DEVICE_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
} from "../lib/storageKeys";
import { speakMandarin } from "../lib/speech";
import { allocateDeviceSequence } from "../sync/indexedDb";

type QueuePhase = "loading" | "ready" | "error";
type QueueFilter = "open" | "resolved" | "all";

const skillLabels: Record<MistakeQueueItemV1["skill"], string> = {
  pronunciation: "Phát âm",
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const validReceipt = (value: unknown): value is RemediationAttemptReceiptV1 =>
  Boolean(value)
  && typeof value === "object"
  && (value as { protocolVersion?: unknown }).protocolVersion === 1
  && ((value as { outcome?: unknown }).outcome === "correct"
    || (value as { outcome?: unknown }).outcome === "incorrect")
  && (value as { verification?: unknown }).verification === "server-objective";

const readErrorMessage = async (response: Response) => {
  try {
    const value = await response.json() as {
      error?: { code?: unknown; message?: unknown };
    };
    switch (value.error?.code) {
      case "AUTH_REQUIRED":
        return "Hãy đăng nhập lại để tiếp tục khắc phục lỗi sai.";
      case "MUTATION_RATE_LIMITED":
        return "Bạn thao tác hơi nhanh; chờ một lát rồi gửi lại lượt này.";
      case "LEARNING_RESET_EPOCH_CONFLICT":
      case "ATTEMPT_SESSION_UNAVAILABLE":
        return "Bản đồ điểm yếu vừa thay đổi; hãy tải lại để nhận dấu vết mới nhất.";
      case "ATTEMPT_ACTIVITY_UNSUPPORTED":
        return "Dấu vết này không còn thuộc nội dung hiện tại; hãy làm mới bản đồ.";
      case "MISTAKE_QUEUE_UNAVAILABLE":
        return "Nghịch Cảnh Lục chưa sẵn sàng cho lộ trình hiện tại.";
      default:
        return null;
    }
  } catch {
    return null;
  }
};

export function AuthenticatedMistakesPage() {
  const [phase, setPhase] = useState<QueuePhase>("loading");
  const [queue, setQueue] = useState<MistakeQueueV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<RemediationAttemptReceiptV1 | null>(null);
  const [submittedItem, setSubmittedItem] = useState<MistakeQueueItemV1 | null>(null);
  const [attemptedIds, setAttemptedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [repairedIds, setRepairedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const pendingCommand = useRef<RemediationAttemptCommandV1 | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);

  const loadQueue = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const response = await fetch("/api/learning/mistakes", {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response)
            ?? "Không thể đọc lịch sử lỗi sai đã xác minh.",
        );
      }
      const parsed = parseMistakeQueue(await response.json());
      if (!parsed) throw new Error("Hàng đợi Nghịch Cảnh không hợp lệ.");
      setQueue(parsed);
      setFilter((current) =>
        current === "open" && parsed.openCount === 0 && parsed.resolvedCount > 0
          ? "resolved"
          : current
      );
      setPhase("ready");
    } catch (caught) {
      if (signal?.aborted) return;
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE) return;
    const controller = new AbortController();
    void loadQueue(controller.signal);
    return () => controller.abort();
  }, [loadQueue]);

  const visibleItems = useMemo(() => {
    if (!queue) return [];
    if (filter === "all") return queue.items;
    return queue.items.filter((item) =>
      filter === "resolved" ? item.resolved : !item.resolved
    );
  }, [filter, queue]);

  const activeItem = visibleItems.find((item) =>
    item.remediationId === activeId
  ) ?? visibleItems[0] ?? null;
  const displayedItem = receipt && submittedItem ? submittedItem : activeItem;

  const activeIndex = activeItem
    ? visibleItems.findIndex((item) => item.remediationId === activeItem.remediationId)
    : -1;

  const nextSessionItem = useMemo(() => {
    if (!queue || !submittedItem) return null;
    const candidates = queue.items.filter((item) =>
      !item.resolved
      && item.remediationId !== submittedItem.remediationId
      && !attemptedIds.has(item.remediationId)
    );
    return candidates.find((item) =>
      item.skill === submittedItem.skill && item.method === submittedItem.method
    ) ?? candidates.find((item) => item.skill === submittedItem.skill)
      ?? candidates[0]
      ?? null;
  }, [attemptedIds, queue, submittedItem]);

  const scrollInsideTrial = useCallback((edge: "start" | "end") => {
    window.requestAnimationFrame(() => {
      const region = scrollRegionRef.current;
      if (!region) return;
      region.scrollTo({
        top: edge === "end" ? region.scrollHeight : 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  }, []);

  useEffect(() => {
    if (receipt || (error && phase === "ready")) scrollInsideTrial("end");
  }, [error, phase, receipt, scrollInsideTrial]);

  const resetAttempt = useCallback((nextId?: string) => {
    if (nextId) setActiveId(nextId);
    setAnswer("");
    setHintVisible(false);
    setHintUsed(false);
    setReceipt(null);
    setSubmittedItem(null);
    setAttemptStartedAt(Date.now());
    pendingCommand.current = null;
    scrollInsideTrial("start");
  }, [scrollInsideTrial]);

  const submit = useCallback(async () => {
    if (
      !activeItem
      || activeItem.resolved
      || !answer.trim()
      || submitting
      || !queue
    ) return;
    setSubmitting(true);
    setError(null);
    try {
      let command = pendingCommand.current;
      if (!command) {
        const installationId = readLocalStorage(SYNC_INSTALLATION_STORAGE_KEY);
        const deviceId = readLocalStorage(SYNC_DEVICE_STORAGE_KEY);
        if (
          !installationId
          || !deviceId
        ) {
          throw new Error("Thiết bị học chưa sẵn sàng; hãy tải lại trang.");
        }
        command = {
          protocolVersion: 1,
          idempotencyKey: `mistake-attempt:${crypto.randomUUID()}`,
          installationId,
          deviceId,
          deviceSequence: await allocateDeviceSequence(),
          resetEpoch: queue.resetEpoch,
          contentVersion: CURRENT_CONTENT_VERSION,
          activityId: activeItem.activityId,
          activityVersion: activeItem.activityVersion,
          source: "mistake",
          method: activeItem.method,
          occurredAt: new Date().toISOString(),
          response: {
            kind: "answer",
            answer: answer.trim(),
            usedHint: hintUsed,
            durationMs: Math.min(600_000, Date.now() - attemptStartedAt),
          },
        };
        pendingCommand.current = command;
      }
      const response = await fetch("/api/learning/attempts", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(command),
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response)
            ?? "Chưa thể ghi lượt phá giải; bạn có thể thử gửi lại.",
        );
      }
      const value: unknown = await response.json();
      if (!validReceipt(value)) {
        throw new Error("Kết quả chấm không đúng giao thức hiện tại.");
      }
      setSubmittedItem(activeItem);
      setReceipt(value);
      setAttemptedIds((current) => new Set(current).add(activeItem.remediationId));
      if (value.outcome === "correct" && !hintUsed) {
        setRepairedIds((current) => new Set(current).add(activeItem.remediationId));
      }
      pendingCommand.current = null;
      await loadQueue();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }, [
    activeItem,
    answer,
    attemptStartedAt,
    hintUsed,
    loadQueue,
    queue,
    submitting,
  ]);

  if (!CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <h1>Nghịch Cảnh Lục chưa mở trong bản phát hành này</h1>
        <p>Tiếp tục Thiên Lộ; lịch sử học vẫn được giữ nguyên.</p>
        <Link className="primary-button" to="/path"><Map size={17} /> Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <LoaderCircle className="spin" size={44} />
        <h1>Đang dựng bản đồ điểm yếu</h1>
        <p>Hệ thống đang gom các câu sai đã được chấm và xếp mức ưu tiên.</p>
      </div>
    );
  }

  if (phase === "error" || !queue) {
    return (
      <div className="lesson-state-screen" role="alert">
        <AlertTriangle size={44} />
        <h1>Chưa thể mở Nghịch Cảnh Lục</h1>
        <p>{error ?? "Không thể đọc hàng đợi lỗi sai."}</p>
        <button className="primary-button" type="button" onClick={() => {
          setPhase("loading");
          void loadQueue();
        }}><RefreshCw size={17} /> Kiểm tra lại</button>
      </div>
    );
  }

  if (queue.items.length === 0) {
    return (
      <div className="mistake-focus-empty">
        <div className="mistake-focus-empty-icon"><ShieldCheck size={34} /></div>
        <span className="system-kicker">NGHỊCH CẢNH LỤC</span>
        <h1>Chưa có lỗi cần luyện lại</h1>
        <p>
          Lỗi ở Thiên Lộ hoặc Vạn Quyển Các sẽ tự xuất hiện tại đây.
        </p>
        <div className="mistake-focus-empty-actions">
          <Link className="primary-button" to="/path">Tiếp tục Thiên Lộ <ArrowRight size={17} /></Link>
          <Link className="mistake-focus-text-link" to="/reader"><BookOpenText size={17} /> Đọc tại Vạn Quyển Các</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page authenticated-mistakes-page mistake-focus-page">
      <header className="mistake-focus-heading">
        <div>
          <span className="system-kicker">NGHỊCH CẢNH LỤC</span>
          <h1>Luyện lại lỗi đang vướng</h1>
          <p>
            {queue.openCount > 0
              ? `${queue.openCount} lỗi đang chờ · tập trung từng lỗi một.`
              : "Bạn đã xử lý toàn bộ lỗi đang mở."}
          </p>
        </div>
        <div className="mistake-focus-goal" aria-label="Tiến độ lượt luyện">
          <ShieldCheck size={20} />
          <span>
            <strong>{repairedIds.size} lỗi đã xử lý</strong>
            <small>không lặp lại ngay</small>
          </span>
        </div>
      </header>

      <div className="mistake-focus-workspace">
        <div className="mistake-focus-toolbar">
          <details className="mistake-focus-queue">
            <summary>
              <ListChecks size={18} />
              {activeItem
                ? `Đổi lỗi · ${activeIndex + 1}/${visibleItems.length}`
                : "Chọn lỗi cần xem"}
            </summary>
            <div className="mistake-focus-queue-panel">
              <nav className="mistake-focus-filters" aria-label="Lọc lỗi">
                {([
                  ["open", "Cần luyện", queue.openCount],
                  ["resolved", "Đã xong", queue.resolvedCount],
                  ["all", "Tất cả", queue.items.length],
                ] as const).map(([value, label, count]) => (
                  <button
                    className={filter === value ? "active" : ""}
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => {
                      setFilter(value);
                      setActiveId(null);
                      resetAttempt();
                    }}
                  ><span>{label}</span><strong>{count}</strong></button>
                ))}
              </nav>
              <div className="mistake-focus-queue-list">
                {visibleItems.map((item, index) => (
                  <button
                    className={activeItem?.remediationId === item.remediationId ? "active" : ""}
                    key={item.remediationId}
                    type="button"
                    onClick={() => resetAttempt(item.remediationId)}
                  >
                    <span>{index + 1}</span>
                    <strong>{item.prompt}</strong>
                    <small>
                      {item.originSource === "lesson" ? "Thiên Lộ" : "Vạn Quyển Các"}
                      {" · "}{skillLabels[item.skill]} · gặp {item.occurrenceCount} lần
                    </small>
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>

        {visibleItems.length === 0 ? (
          <section className="mistake-focus-filter-empty">
            <ShieldCheck size={31} />
            <h2>Không còn lỗi trong mục này</h2>
            <p>Chọn “Đổi lỗi” để xem mục khác hoặc tiếp tục Thiên Lộ.</p>
            <Link className="primary-button" to="/path">Tiếp tục Thiên Lộ <ArrowRight size={17} /></Link>
          </section>
        ) : displayedItem && (
          <section className="mistake-focus-trial" aria-labelledby="mistake-focus-prompt">
            <header className="mistake-focus-trial-header">
              <span>{skillLabels[displayedItem.skill]}</span>
              <strong className={`mistake-focus-phase${receipt ? " feedback" : ""}`}>
                {receipt ? "Hiểu lỗi" : "Tự trả lời"}
              </strong>
            </header>

            <div className="mistake-focus-scroll" ref={scrollRegionRef}>
              <div className="mistake-focus-prompt">
                <span>{displayedItem.instruction}</span>
                <h2 id="mistake-focus-prompt">{displayedItem.prompt}</h2>
                {displayedItem.promptMeta && <p>{displayedItem.promptMeta}</p>}
              </div>

              <div className="mistake-focus-supports">
                {displayedItem.spokenText && (
                  <button type="button" onClick={() => speakMandarin(displayedItem.spokenText!, 0.78)}>
                    <Volume2 size={18} /> Nghe lại
                  </button>
                )}
                <button type="button" onClick={() => {
                  setHintVisible((current) => !current);
                  setHintUsed(true);
                }} disabled={Boolean(receipt)}>
                  {hintVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  {hintVisible ? "Ẩn gợi ý" : "Cần gợi ý"}
                </button>
              </div>

              {hintVisible && (
                <div className="mistake-focus-hint" role="note">
                  <Sparkles size={19} />
                  <div><p>{displayedItem.hint}</p><small>Gợi ý được ghi nhận; lỗi này sẽ được kiểm tra lại sau.</small></div>
                </div>
              )}

              {displayedItem.options.length > 0 ? (
                <fieldset className="mistake-focus-answer-field">
                  <legend>Chọn câu trả lời</legend>
                  <div className="mistake-focus-options" role="radiogroup" aria-label="Các phương án">
                    {displayedItem.options.map((option, index) => (
                      <button
                        className={answer === option ? "selected" : ""}
                        disabled={Boolean(receipt) || displayedItem.resolved}
                        key={option}
                        role="radio"
                        aria-checked={answer === option}
                        type="button"
                        onClick={() => {
                          setAnswer(option);
                          pendingCommand.current = null;
                        }}
                      ><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong></button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <label className="mistake-focus-input">
                  <span>Câu trả lời của bạn</span>
                  <input
                    value={answer}
                    disabled={Boolean(receipt) || displayedItem.resolved}
                    autoComplete="off"
                    placeholder="Tự nhập đáp án..."
                    onChange={(event) => {
                      setAnswer(event.target.value);
                      pendingCommand.current = null;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submit();
                    }}
                  />
                </label>
              )}

              {receipt && (
                <div className={`mistake-focus-result ${receipt.outcome}`} role="status" aria-live="polite">
                  {receipt.outcome === "correct" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  <div>
                    <strong>
                      {receipt.outcome === "correct"
                        ? hintUsed ? "Đã hiểu cách làm" : "Đã xử lý lỗi này"
                        : "Chưa đúng — xem điểm cần sửa"}
                    </strong>
                    <p>
                      {receipt.outcome === "correct"
                        ? hintUsed
                          ? "Gợi ý đã được ghi nhận. Lỗi này sẽ quay lại ở lượt sau, không lặp ngay."
                          : `Câu này không lặp lại ngay. Tiếp tục ${displayedItem.originSource === "lesson" ? "Thiên Lộ" : "Vạn Quyển Các"} để gặp kỹ năng trong ngữ cảnh khác.`
                        : `Gợi ý sửa: ${displayedItem.hint} Lỗi này vẫn được giữ cho lượt sau.`}
                    </p>
                  </div>
                </div>
              )}

              {error && phase === "ready" && (
                <div className="mistake-focus-inline-error" role="alert">
                  <AlertTriangle size={17} />
                  <span>{error}</span>
                  <button type="button" onClick={() => void submit()}>Gửi lại</button>
                </div>
              )}

            </div>

            <footer className="mistake-focus-actions">
              {displayedItem.resolved && !receipt ? (
                <Link
                  className="primary-button"
                  to={displayedItem.originSource === "lesson" ? "/path" : "/reader"}
                >
                  {displayedItem.originSource === "lesson" ? "Tiếp tục Thiên Lộ" : "Trở lại Vạn Quyển Các"}
                  <ArrowRight size={18} />
                </Link>
              ) : receipt ? (
                nextSessionItem ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      setFilter("open");
                      resetAttempt(nextSessionItem.remediationId);
                    }}
                  >
                    {nextSessionItem.skill === displayedItem.skill
                      ? "Câu khác cùng kỹ năng"
                      : "Lỗi tiếp theo"}
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <Link
                    className="primary-button"
                    to={displayedItem.originSource === "lesson" ? "/path" : "/reader"}
                  >
                    Kết thúc lượt luyện <ArrowRight size={18} />
                  </Link>
                )
              ) : (
                <button className="primary-button" disabled={!answer.trim() || submitting} type="button" onClick={() => void submit()}>
                  {submitting
                    ? <><LoaderCircle className="spin" size={18} /> Đang kiểm tra</>
                    : <>Kiểm tra <ArrowRight size={18} /></>}
                </button>
              )}
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
