import { AlertTriangle, LoaderCircle, Map, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { RemediationObservatory } from "../components/RemediationObservatory";
import { CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE } from "../content/clientContentAvailability";
import { CURRENT_CONTENT_VERSION } from "../content/currentContentIdentity";
import { emitLearningJourneyReceipt } from "../learning/journeyReceiptEvent";
import {
  parseMistakeQueue,
  type MistakeQueueItemV1,
  type MistakeQueueV1,
  type RemediationAttemptCommandV1,
  type RemediationAttemptReceiptV1,
} from "../mistakes/mistakeProtocol";
import type {
  RemediationObservatoryFeedback,
  RemediationObservatoryItem,
} from "../mistakes/remediationObservatory";
import {
  readLocalStorage,
  SYNC_DEVICE_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
} from "../lib/storageKeys";
import { speakMandarin } from "../lib/speech";
import { allocateDeviceSequence } from "../sync/indexedDb";

type QueuePhase = "loading" | "ready" | "error";

const skillLabels: Record<MistakeQueueItemV1["skill"], string> = {
  pronunciation: "Phát âm",
  listening: "Nghe hiểu",
  speaking: "Nói",
  reading: "Đọc hiểu",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const kindLabels: Record<MistakeQueueItemV1["kind"], string> = {
  meaning: "Chọn nghĩa phù hợp",
  pinyin: "Nhận diện Pinyin",
  tone: "Chọn thanh điệu",
  "tone-pair": "Chọn cặp thanh điệu",
  listening: "Nghe và chọn",
  sentence: "Hoàn thành câu",
  recall: "Tự gọi lại",
  reader: "Đọc và chọn",
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

const originDetail = (item: MistakeQueueItemV1) => {
  if (item.originSource === "reader") return "Bài đọc đã phát hành";
  const lessonId = item.activityId.split(":")[0] ?? item.activityId;
  const sequence = lessonId.match(/(?:boot|daily)-(\d+)/u)?.[1];
  if (sequence) {
    return lessonId.startsWith("boot-")
      ? `Khởi hành ${sequence.padStart(2, "0")}`
      : `Bài ${sequence.padStart(2, "0")}`;
  }
  return "Bài học đã phát hành";
};

const toObservatoryItem = (
  item: MistakeQueueItemV1,
): RemediationObservatoryItem => ({
  id: item.remediationId,
  skill: item.skill,
  skillLabel: skillLabels[item.skill],
  kindLabel: kindLabels[item.kind],
  originSource: item.originSource,
  originLabel: item.originSource === "lesson" ? "Thiên Lộ" : "Vạn Quyển Các",
  originDetail: originDetail(item),
  instruction: item.instruction || kindLabels[item.kind],
  prompt: item.prompt,
  promptMeta: item.promptMeta,
  options: item.options,
  hint: item.hint,
  spokenText: item.spokenText,
  occurrenceCount: item.occurrenceCount,
  correctedStreak: item.correctedStreak,
  resolved: item.resolved,
  lastAttemptAt: new Date(item.lastAttemptAt).getTime(),
});

export function AuthenticatedMistakesPage() {
  const [phase, setPhase] = useState<QueuePhase>("loading");
  const [queue, setQueue] = useState<MistakeQueueV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const attemptStartedAt = useRef(Date.now());
  const pendingCommand = useRef<{
    itemId: string;
    answer: string;
    usedHint: boolean;
    command: RemediationAttemptCommandV1;
  } | null>(null);

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

  useEffect(() => {
    if (phase !== "ready" || !queue || queue.openCount > 0) return;
    emitLearningJourneyReceipt({
      stage: "review",
      source: "mistakes",
      activityId: `mistakes:account:${queue.resetEpoch}:${queue.generatedAt}`,
    });
  }, [phase, queue]);

  const items = useMemo(
    () => queue?.items.map(toObservatoryItem) ?? [],
    [queue],
  );

  const submit = async (
    item: RemediationObservatoryItem,
    answer: string,
    usedHint: boolean,
  ): Promise<RemediationObservatoryFeedback> => {
    if (!queue || submitting) throw new Error("Lượt kiểm tra chưa sẵn sàng.");
    const queueItem = queue.items.find((entry) => entry.remediationId === item.id);
    if (!queueItem || queueItem.resolved) {
      throw new Error("Dấu vết này vừa thay đổi; hãy trở lại bản đồ.");
    }
    setSubmitting(true);
    setError(null);
    try {
      const cached = pendingCommand.current;
      let command = cached
        && cached.itemId === item.id
        && cached.answer === answer
        && cached.usedHint === usedHint
          ? cached.command
          : null;
      if (!command) {
        const installationId = readLocalStorage(SYNC_INSTALLATION_STORAGE_KEY);
        const deviceId = readLocalStorage(SYNC_DEVICE_STORAGE_KEY);
        if (!installationId || !deviceId) {
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
          activityId: queueItem.activityId,
          activityVersion: queueItem.activityVersion,
          source: "mistake",
          method: queueItem.method,
          occurredAt: new Date().toISOString(),
          response: {
            kind: "answer",
            answer,
            usedHint,
            durationMs: Math.min(600_000, Date.now() - attemptStartedAt.current),
          },
        };
        pendingCommand.current = { itemId: item.id, answer, usedHint, command };
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
            ?? "Chưa thể ghi lượt hóa giải; bạn có thể thử gửi lại.",
        );
      }
      const receipt: unknown = await response.json();
      if (!validReceipt(receipt)) {
        throw new Error("Kết quả chấm không đúng giao thức hiện tại.");
      }
      pendingCommand.current = null;
      attemptStartedAt.current = Date.now();
      await loadQueue();
      return {
        outcome: receipt.outcome,
        resolved: receipt.outcome === "correct" && !usedHint,
        answer,
        explanation: queueItem.hint,
        usedHint,
      };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.";
      setError(message);
      throw caught;
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <RemediationObservatory
      items={items}
      resolvedCount={queue.resolvedCount}
      submitting={submitting}
      error={error}
      onSubmit={submit}
      onSpeak={(text) => speakMandarin(text, 0.78)}
    />
  );
}
