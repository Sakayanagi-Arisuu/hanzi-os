import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { ReviewRatingConsole } from "../components/ReviewRatingConsole";
import { ReviewMemoryArena } from "../components/ReviewMemoryArena";
import { MemoryReviewComplete } from "../components/MemoryReviewComplete";
import { MemoryReviewLobby } from "../components/MemoryReviewLobby";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import {
  REVIEW_PROTOCOL_VERSION,
  type ReviewQueueCardV1,
  type ReviewQueueV1,
  type ReviewRating,
} from "../learning/reviewProtocol";
import { REVIEW_INTERACTION_XP } from "../learning/interactionXp";
import { notifyInteractionXpChanged } from "../learning/interactionXpClient";
import { makeIdempotencyKey } from "../lib/evidence";
import {
  buildReviewForecast,
  buildReviewMemoryDistribution,
  getNextReviewDate,
  summarizeReviewSession,
  type ReviewSessionEntry,
} from "../learning/reviewPresentation";
import { useLearning } from "../store/LearningStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { emitSystemSignal } from "../system/systemSignals";
import {
  useNormalizedLearningProjection,
} from "../store/NormalizedLearningProjectionStore";
import {
  enqueueReviewGradeCommand,
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  listLearningCommandRecords,
  type LearningCommandOutboxRecord,
  type ReviewGradeQueueCommandV1,
} from "../sync/learningCommandOutbox";
import { readExactNormalizedLessonEnvironment } from "../sync/normalizedLessonEnvironment";
import {
  fetchReviewQueue,
  readValidCachedReviewQueue,
  type FetchReviewQueueResult,
} from "../sync/reviewQueueClient";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";

const ratingOptions: ReadonlyArray<{
  rating: ReviewRating;
  key: string;
  label: string;
  hint: string;
  className: string;
}> = [
  {
    rating: 1,
    key: "1",
    label: "Quên",
    hint: "Cần gặp lại rất sớm",
    className: "again",
  },
  {
    rating: 2,
    key: "2",
    label: "Khó",
    hint: "Gọi lại còn chật vật",
    className: "hard",
  },
  {
    rating: 3,
    key: "3",
    label: "Ổn",
    hint: "Gọi lại đúng với nỗ lực vừa phải",
    className: "good",
  },
  {
    rating: 4,
    key: "4",
    label: "Dễ",
    hint: "Gọi lại nhanh và chắc",
    className: "easy",
  },
];

type QueuePhase =
  | "loading"
  | "ready"
  | "retryable"
  | "unavailable"
  | "error";

type ReviewGradeRecord = Extract<
  LearningCommandOutboxRecord,
  { kind: "review-grade" }
>;

const isReviewGradeRecord = (
  record: LearningCommandOutboxRecord,
): record is ReviewGradeRecord => {
  if (
    !record
    || typeof record !== "object"
    || record.kind !== "review-grade"
    || !record.command
    || typeof record.command !== "object"
  ) return false;
  return typeof record.ownerKey === "string"
    && Number.isSafeInteger(record.resetEpoch)
    && ["pending", "acknowledged", "quarantined"].includes(record.status)
    && record.command.protocolVersion === REVIEW_PROTOCOL_VERSION
    && typeof record.command.cardId === "string"
    && Number.isSafeInteger(record.command.expectedCardRevision)
    && typeof record.command.wordId === "string"
    && typeof record.command.wordVersion === "string"
    && record.command.resetEpoch === record.resetEpoch;
};

const offerKey = (card: ReviewQueueCardV1) =>
  `${card.cardId}\u0000${card.cardRevision}`;

const recordOfferKey = (record: ReviewGradeRecord) =>
  `${record.command.cardId}\u0000${record.command.expectedCardRevision}`;

const recordMatchesExactOffer = (
  record: ReviewGradeRecord,
  card: ReviewQueueCardV1,
) =>
  recordOfferKey(record) === offerKey(card)
  && record.command.wordId === card.wordId
  && record.command.wordVersion === card.wordVersion
  && record.command.contentVersion === CONTENT_VERSION
  && record.command.schedulerVersion === card.schedulerVersion;

const retryMessage = (
  result: Extract<FetchReviewQueueResult, { state: "retryable" }>,
) => {
  if (result.reason === "network-unavailable") {
    return "Không có kết nối để xác minh hàng đợi mới nhất.";
  }
  if (result.reason === "rate-limited") {
    return "Máy chủ đang giới hạn yêu cầu; lượt ôn sẽ được thử lại sau.";
  }
  if (result.reason === "reset-race") {
    return "Mốc đặt lại vừa thay đổi; hàng đợi đang được đối chiếu lại.";
  }
  if (result.reason === "server-unavailable") {
    return "Máy chủ ôn tập tạm thời chưa sẵn sàng.";
  }
  return "Phản hồi hàng đợi không vượt qua kiểm tra hợp đồng.";
};

const unavailableMessage = (
  result: Extract<
    FetchReviewQueueResult,
    { state: "permanent-unavailable" }
  >,
) => {
  if (result.reason === "authentication-required") {
    return "Phiên đăng nhập không còn hợp lệ cho hàng đợi ôn tập này.";
  }
  if (result.reason === "content-unavailable") {
    return "Chưa có enrollment gắn với nội dung đã phát hành và duyệt ngôn ngữ.";
  }
  return "Máy chủ đã từ chối yêu cầu hàng đợi ôn tập.";
};

const formatRetry = (retryAfterMs: number | null) => {
  if (!retryAfterMs) return "";
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
  return ` Có thể thử lại sau khoảng ${seconds} giây.`;
};

const exactProjectionAuthority = (
  accountKey: string | null,
  authority: ReturnType<typeof useNormalizedLearningProjection>,
) => {
  const projection = authority.projection;
  const progress = authority.authoritativeProgress;
  const ownerGeneration = authority.ownerGeneration;
  const resetEpoch = authority.resetEpoch;
  return Boolean(
    accountKey
    && projection
    && progress
    && ownerGeneration
    && resetEpoch !== null
    && ownerGeneration.ownerKey === accountKey
    && projection.resetEpoch === resetEpoch
    && progress.resetEpoch === resetEpoch
    && projection.contentVersion === CONTENT_VERSION
    && progress.contentVersion === CONTENT_VERSION
    && projection.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
    && progress.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
    && projection.enrollment
    && projection.enrollment.enrollmentId === progress.enrollmentId,
  );
};

export function AuthenticatedReviewPage() {
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : "identity-pending";
  const authorityKey = [
    accountKey,
    authority.ownerGeneration?.ownerKey ?? "missing-owner",
    authority.ownerGeneration?.generation ?? "missing-generation",
    authority.resetEpoch ?? "missing-reset",
    authority.projection?.contentVersion ?? "missing-content",
    authority.projection?.manifestSha256 ?? "missing-manifest",
    authority.projection?.enrollment?.enrollmentId ?? "missing-enrollment",
  ].join("\u0000");
  return <AuthenticatedReviewPageScope key={authorityKey} />;
}

function AuthenticatedReviewPageScope() {
  const { state, actions, sync } = useLearning();
  const { checkpoint, recordReceipt } = useLearningJourney();
  const authority = useNormalizedLearningProjection();
  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : null;
  const ownerGeneration = authority.ownerGeneration;
  const resetEpoch = authority.resetEpoch;
  const exactAuthority = exactProjectionAuthority(accountKey, authority);

  const [queue, setQueue] = useState<ReviewQueueV1 | null>(null);
  const queueRef = useRef<ReviewQueueV1 | null>(null);
  const [queuePhase, setQueuePhase] = useState<QueuePhase>("loading");
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const [networkVerified, setNetworkVerified] = useState(false);
  const [records, setRecords] =
    useState<LearningCommandOutboxRecord[] | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [revealed, setRevealed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [sessionEntries, setSessionEntries] = useState<ReviewSessionEntry[]>([]);
  const gradeKeyRef = useRef<{
    offer: string;
    idempotencyKey: string;
  } | null>(null);
  const gradeLockRef = useRef(false);
  const cardHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const refresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const refreshFromQueue = () => refresh();
    const refreshFromOnline = () => {
      setOnline(true);
      refresh();
    };
    const markOffline = () => setOnline(false);
    window.addEventListener(
      LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
      refreshFromQueue,
    );
    window.addEventListener("online", refreshFromOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener(
        LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
        refreshFromQueue,
      );
      window.removeEventListener("online", refreshFromOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!exactAuthority || !ownerGeneration) {
      setRecords(null);
      return () => {
        active = false;
      };
    }
    setRecordsError(null);
    void listLearningCommandRecords(ownerGeneration)
      .then((next) => {
        if (active) setRecords(next);
      })
      .catch(() => {
        if (active) {
          setRecordsError(
            "Không thể đọc nhật ký lệnh ôn tập thuộc đúng tài khoản.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [
    exactAuthority,
    ownerGeneration,
    refreshVersion,
    sync.lastSyncedAt,
  ]);

  useEffect(() => {
    let active = true;
    const lifecycle = new AbortController();
    if (
      !exactAuthority
      || !ownerGeneration
      || resetEpoch === null
    ) {
      setQueue(null);
      setNetworkVerified(false);
      setQueuePhase("loading");
      return () => {
        active = false;
        lifecycle.abort();
      };
    }

    void (async () => {
      let hasUsableQueue = queueRef.current !== null;
      if (!hasUsableQueue) setQueuePhase("loading");
      setQueueNotice(null);
      setRetryAfterMs(null);
      try {
        const cached = await readValidCachedReviewQueue(
          ownerGeneration,
          resetEpoch,
        );
        if (!active) return;
        if (cached && !hasUsableQueue) {
          hasUsableQueue = true;
          setQueue(cached.value);
          setQueuePhase("ready");
          setQueueNotice(
            "Đang hiển thị cache đúng owner/reset; cần xác minh mạng trước khi ghi đánh giá.",
          );
        }

        const result = await fetchReviewQueue({
          expectedOwnerGeneration: ownerGeneration,
          expectedResetEpoch: resetEpoch,
          signal: lifecycle.signal,
        });
        if (!active) return;
        if (result.state === "updated") {
          setQueue(result.queue);
          setQueuePhase("ready");
          setQueueNotice(null);
          setRetryAfterMs(null);
          setNetworkVerified(true);
          return;
        }
        if (result.state === "reset-mismatch") {
          setQueue(null);
          setNetworkVerified(false);
          setQueuePhase("retryable");
          setQueueNotice(
            "Mốc đặt lại trên máy chủ không khớp; cache cũ đã bị từ chối.",
          );
          authority.refresh();
          return;
        }
        if (result.state === "permanent-unavailable") {
          setQueue(null);
          setNetworkVerified(false);
          setQueuePhase("unavailable");
          setQueueNotice(unavailableMessage(result));
          return;
        }
        setRetryAfterMs(result.retryAfterMs);
        setQueueNotice(retryMessage(result));
        setQueuePhase(hasUsableQueue ? "ready" : "retryable");
      } catch {
        if (!active) return;
        setQueue(null);
        setNetworkVerified(false);
        setQueuePhase("error");
        setQueueNotice(
          "Owner generation hoặc reset epoch đã đổi trong lúc đọc hàng đợi.",
        );
        authority.refresh();
      }
    })();

    return () => {
      active = false;
      lifecycle.abort();
    };
  }, [
    authority,
    exactAuthority,
    ownerGeneration,
    refreshVersion,
    resetEpoch,
    sync.lastSyncedAt,
  ]);

  const reviewRecords = useMemo(
    () => records?.filter(
      (record): record is ReviewGradeRecord =>
        record.kind === "review-grade"
        && record.ownerKey === accountKey
        && resetEpoch !== null
        && record.resetEpoch === resetEpoch,
    ) ?? [],
    [accountKey, records, resetEpoch],
  );
  const relevantRecords = useMemo(() => {
    if (!queue) return [];
    return reviewRecords.filter((record) =>
      isReviewGradeRecord(record)
      && queue.cards.some((card) => recordMatchesExactOffer(record, card))
    );
  }, [queue, reviewRecords]);
  const handledKeys = useMemo(
    () => new Set(relevantRecords.map(recordOfferKey)),
    [relevantRecords],
  );
  const availableCards = useMemo(
    () => queue?.cards.filter((card) => !handledKeys.has(offerKey(card))) ?? [],
    [handledKeys, queue],
  );
  const acknowledgedRecords = relevantRecords.filter(
    (record) => record.status === "acknowledged",
  );
  const pendingRecords = relevantRecords.filter(
    (record) => record.status === "pending",
  );
  const quarantinedRecords = reviewRecords.filter(
    (record) => record.status === "quarantined",
  );
  const current = availableCards[0] ?? null;
  const word = current ? RELEASED_WORD_BY_ID.get(current.wordId) : undefined;
  const currentOfferKey = current ? offerKey(current) : null;

  useEffect(() => {
    if (
      queuePhase !== "ready"
      || !queue
      || availableCards.length > 0
      || !checkpoint?.completedStages.learn
      || checkpoint.completedStages.review
    ) return;
    recordReceipt({
      stage: "review",
      source: "review",
      lessonId: checkpoint.anchorLessonId,
      activityId: `review:${checkpoint.journeyId}:${queue.generatedAt}`,
    });
  }, [availableCards.length, checkpoint, queue, queuePhase, recordReceipt]);

  useEffect(() => {
    gradeKeyRef.current = null;
    setRevealed(false);
    setHintUsed(false);
    setActionError(null);
    if (currentOfferKey) cardHeadingRef.current?.focus();
  }, [currentOfferKey]);

  const retryEverything = () => {
    setActionError(null);
    setRecordsError(null);
    setQueuePhase(queue ? "ready" : "loading");
    authority.refresh();
    refresh();
  };

  const syncAndRefresh = () => {
    setActionError(null);
    void actions.syncNow()
      .catch(() => {
        setActionError(
          "Chưa thể đồng bộ ngay; lệnh bền vững vẫn được giữ trên thiết bị.",
        );
      })
      .finally(() => {
        refresh();
        notifyInteractionXpChanged();
      });
  };

  const grade = async (rating: ReviewRating) => {
    if (
      gradeLockRef.current
      || busy
      || !current
      || !word
      || !networkVerified
      || !accountKey
      || !ownerGeneration
      || resetEpoch === null
    ) return;
    gradeLockRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const environment = await readExactNormalizedLessonEnvironment({
        accountKey,
        expectedOwnerGeneration: ownerGeneration,
        expectedResetEpoch: resetEpoch,
      });
      if (!environment) {
        throw new Error(
          "Owner hoặc mốc đặt lại đã đổi; đánh giá chưa được ghi.",
        );
      }
      const key = offerKey(current);
      if (!gradeKeyRef.current || gradeKeyRef.current.offer !== key) {
        gradeKeyRef.current = {
          offer: key,
          idempotencyKey: makeIdempotencyKey("review-grade"),
        };
      }
      const command = {
        protocolVersion: REVIEW_PROTOCOL_VERSION,
        idempotencyKey: gradeKeyRef.current.idempotencyKey,
        installationId: environment.installationId,
        deviceId: environment.deviceId,
        contentVersion: queue?.contentVersion ?? CONTENT_VERSION,
        schedulerVersion: current.schedulerVersion,
        cardId: current.cardId,
        expectedCardRevision: current.cardRevision,
        wordId: current.wordId,
        wordVersion: current.wordVersion,
        rating,
      } satisfies ReviewGradeQueueCommandV1;
      const queued = await enqueueReviewGradeCommand({
        ownerGeneration: environment.ownerGeneration,
        expectedResetEpoch: environment.resetEpoch,
        command,
      });
      emitSystemSignal({
        type: "review.recalled",
        sourceId: `review:${current.wordId}`,
        eventId: `${command.idempotencyKey}:recalled`,
      });
      if (availableCards.length === 1) emitSystemSignal({
        type: "review.queue-cleared",
        sourceId: "review:account-queue",
        eventId: `${command.idempotencyKey}:queue-cleared`,
      });
      setRecords((existing) => {
        if (!existing) return [queued];
        return [
          ...existing.filter((record) => record.recordKey !== queued.recordKey),
          queued,
        ].sort((left, right) =>
          left.deviceSequence - right.deviceSequence
        );
      });
      setRatings((existing) => ({
        ...existing,
        [rating]: (existing[rating] ?? 0) + 1,
      }));
      setSessionEntries((existing) => [...existing, {
        hintUsed,
        rating,
        wordId: current.wordId,
      }]);
      setRevealed(false);
      setQueueNotice(
        online
          ? "Đánh giá đã được lưu và đang đồng bộ lịch ôn."
          : "Đánh giá đã được giữ an toàn; hệ thống sẽ gửi khi có mạng.",
      );
      if (online) {
        void actions.syncNow().catch(() => undefined).finally(() => {
          refresh();
          notifyInteractionXpChanged();
        });
      }
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Không thể ghi bền vững đánh giá này.",
      );
      refresh();
    } finally {
      gradeLockRef.current = false;
      setBusy(false);
    }
  };

  const localForecast = useMemo(
    () => buildReviewForecast(state.fsrsCards),
    [state.fsrsCards],
  );
  const memoryDistribution = useMemo(
    () => buildReviewMemoryDistribution(state.fsrsCards),
    [state.fsrsCards],
  );
  const reviewedToday = useMemo(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    return reviewRecords.filter((record) =>
      new Date(record.enqueuedAt).toLocaleDateString("sv-SE") === today
    ).length;
  }, [reviewRecords]);

  if (!exactAuthority) {
    return (
      <NormalizedLearningAuthorityGate
        phase={authority.phase}
        reason={authority.reason}
        refresh={authority.refresh}
      />
    );
  }

  if (recordsError) {
    return (
      <div className="lesson-state-screen" role="alert">
        <span className="memory-state-symbol" aria-hidden="true">盾</span>
        <h1>Đã dừng ôn tập an toàn</h1>
        <p>{recordsError} Hệ thống không thể lọc lệnh pending một cách đáng tin cậy.</p>
        <button className="primary-button" type="button" onClick={retryEverything}>
          <span aria-hidden="true">↻</span> Kiểm tra lại
        </button>
        <Link className="secondary-button" to="/profile">
          Kiểm tra tài khoản
        </Link>
      </div>
    );
  }

  if (quarantinedRecords.length > 0) {
    const reason = quarantinedRecords[0]?.quarantineReason;
    return (
      <div className="lesson-state-screen" role="alert">
        <span className="memory-state-symbol" aria-hidden="true">!</span>
          <span>LƯỢT ÔN · CẦN KIỂM TRA</span>
        <h1>Một đánh giá cần được xử lý</h1>
        <p>
          Lệnh thuộc mốc đặt lại hiện tại được giữ lại để không gửi trùng hoặc
          chấm nhầm revision.
          {reason ? ` Chi tiết: ${reason}` : ""}
        </p>
        <button className="primary-button" type="button" onClick={syncAndRefresh}>
          <span aria-hidden="true">↻</span> Đồng bộ và kiểm tra lại
        </button>
        <Link className="secondary-button" to="/profile">
          Mở kiểm soát dữ liệu
        </Link>
      </div>
    );
  }

  if (queuePhase === "loading" || records === null) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <span className="memory-state-symbol" aria-hidden="true">忆</span>
          <h1>Đang xác minh hàng đợi ôn tập</h1>
          <p>Hệ thống đang khôi phục đúng thẻ ôn và tiến độ mới nhất của bạn.</p>
      </div>
    );
  }

  if (queuePhase === "retryable" || queuePhase === "error") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <span className="memory-state-symbol" aria-hidden="true">{online ? "云" : "断"}</span>
        <h1>Chưa thể xác minh lượt ôn</h1>
        <p>{online ? "Chưa thể tải lượt ôn lúc này." : "Thiết bị đang ngoại tuyến."}{formatRetry(retryAfterMs)}</p>
        <button className="primary-button" type="button" onClick={retryEverything}>
          <span aria-hidden="true">↻</span> Thử lại
        </button>
        <Link className="secondary-button" to="/path">
          Trở về Thiên Lộ
        </Link>
      </div>
    );
  }

  if (queuePhase === "unavailable" || !queue) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <span className="memory-state-symbol" aria-hidden="true">盾</span>
          <h1>Chưa thể tải thẻ ôn</h1>
        <p>Chưa có lượt ôn phù hợp với tiến độ hiện tại. Hãy thử tải lại hoặc kiểm tra tài khoản.</p>
        <button className="primary-button" type="button" onClick={retryEverything}>
          <span aria-hidden="true">↻</span> Xác minh lại
        </button>
        <Link className="secondary-button" to="/profile">
          Kiểm tra tài khoản
        </Link>
      </div>
    );
  }

  if (!networkVerified) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <span className="memory-state-symbol" aria-hidden="true">断</span>
          <span>ĐANG KHÔI PHỤC THẺ ÔN</span>
          <h1>Đang kiểm tra lượt ôn</h1>
        <p>Thẻ ôn đã được khôi phục trên thiết bị. Hệ thống đang xác nhận lại dữ liệu trước khi cho phép đánh giá.</p>
        <button className="primary-button" type="button" onClick={retryEverything}>
          <span aria-hidden="true">↻</span> Xác minh qua mạng
        </button>
        <Link className="secondary-button" to="/path">
          Trở về Thiên Lộ
        </Link>
      </div>
    );
  }

  if (queue.cards.length === 0) {
    return (
      <MemoryReviewLobby
        activatedCount={Object.keys(state.fsrsCards).length}
        dueCount={0}
        forecast={localForecast}
        distribution={memoryDistribution}
        reviewedToday={reviewedToday}
      />
    );
  }

  if (availableCards.length === 0) {
    const sessionSummary = summarizeReviewSession(sessionEntries);
    const persistedNeedsReview = relevantRecords.filter((record) =>
      record.command.rating <= 2
    ).length;
    const nextReceiptDate = acknowledgedRecords
      .map((record) => record.receipt?.nextDueAt)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()))
      .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
    return (
      <MemoryReviewComplete
        independent={sessionSummary.independent}
        needsReview={sessionEntries.length ? sessionSummary.needsReview : persistedNeedsReview}
        nextReview={nextReceiptDate ?? getNextReviewDate(state.fsrsCards)}
        pending={pendingRecords.length}
        total={sessionEntries.length ? sessionSummary.total : relevantRecords.length}
        withHint={sessionSummary.withHint}
      />
    );
  }

  if (!started) {
    const forecast = localForecast.map((day, index) =>
      index === 0 ? { ...day, count: availableCards.length } : day
    );
    return (
      <MemoryReviewLobby
        activatedCount={Math.max(Object.keys(state.fsrsCards).length, queue.cards.length)}
        dueCount={availableCards.length}
        forecast={forecast}
        distribution={memoryDistribution}
        reviewedToday={reviewedToday}
        onStart={() => {
          setSessionEntries([]);
          setStarted(true);
        }}
      />
    );
  }

  if (!current || !word) {
    return (
      <div className="lesson-state-screen" role="alert">
        <span className="memory-state-symbol" aria-hidden="true">盾</span>
          <h1>Thẻ ôn không còn phù hợp</h1>
          <p>Thẻ này đã được bỏ qua để tránh ghi sai tiến độ. Hãy tải lại hàng ôn.</p>
        <button className="primary-button" type="button" onClick={retryEverything}>
          <span aria-hidden="true">↻</span> Tải lại hàng đợi
        </button>
      </div>
    );
  }

  const character = state.profile.script === "traditional"
    ? word.traditional
    : word.simplified;
  const handledCount = queue.cards.length - availableCards.length;
  const progress = Math.round((handledCount / queue.cards.length) * 100);

  return (
    <div className="memory-experience memory-session review-page" aria-busy={busy}>
      <header className="memory-session-toolbar">
        <div
          className="review-session-bar"
          role="progressbar"
          aria-label="Tiến độ hàng đợi ôn tập"
          aria-valuemin={0}
          aria-valuemax={queue.cards.length}
          aria-valuenow={handledCount}
        >
          <span><i className="memory-symbol" aria-hidden="true">阵</i> MEM-{revealed ? "03 · ĐỐI CHIẾU" : "02 · TRUY HỒI"}</span>
          <div className="review-progress-rail"><i style={{ width: `${progress}%` }} /><b aria-hidden="true" /></div>
          <strong><b>{handledCount + 1}</b> / {queue.cards.length}</strong>
        </div>
        <button type="button" onClick={() => setStarted(false)}><span aria-hidden="true">×</span> Thoát</button>
      </header>

        {(queueNotice || actionError || !online) && (
          <div className="review-session-notice" role={actionError ? "alert" : "status"} aria-live="polite">
            <span>
              <i className="memory-symbol" aria-hidden="true">{online ? "云" : "断"}</i>
              {actionError
                ? "Chưa thể lưu đánh giá lúc này. Hãy kiểm tra kết nối rồi thử lại."
                : queueNotice
                  ? "Lịch ôn vừa thay đổi và đang được làm mới."
                  : "Đang ngoại tuyến; lượt ôn vẫn được giữ trên thiết bị."}
            </span>
          </div>
        )}

      <div className="review-card-scroll">
        <ReviewMemoryArena
          audioSourceId={`review:account:${word.id}`}
          character={character}
          example={word.example}
          exampleMeaning={word.exampleMeaning}
          examplePinyin={word.examplePinyin}
          meaning={word.meaning}
          hintUsed={hintUsed}
          onUseHint={() => setHintUsed(true)}
          partOfSpeech={word.partOfSpeech}
          pinyin={word.pinyin}
          revealed={revealed}
          tags={word.tags}
          titleId="authenticated-review-card-title"
          titleRef={cardHeadingRef}
        />

        <footer className="fsrs-status-line">
          <span>
            <i className="memory-symbol" aria-hidden="true">历</i>
            Lịch ôn: {new Date(current.dueAt).toLocaleString("vi-VN")}
          </span>
          <span>
            <i className="memory-symbol" aria-hidden="true">盾</i>
            Tự đánh giá dùng để xếp lịch ôn
          </span>
          <span>
            <i className="memory-symbol" aria-hidden="true">✓</i>
            Lịch mới xuất hiện sau khi lưu
          </span>
          <span aria-live="polite">
            Tự đánh giá phiên này: {(ratings[1] ?? 0) + (ratings[2] ?? 0)
              + (ratings[3] ?? 0) + (ratings[4] ?? 0)}
          </span>
        </footer>
      </div>

      {revealed ? (
        <ReviewRatingConsole
          busy={busy}
          heading="Bạn gọi lại tốt đến đâu?"
          headingId="authenticated-review-rating-title"
          helper={`Tự đánh giá chỉ xếp lịch, không chấm đúng/sai. Mỗi thẻ được xác nhận cộng ${REVIEW_INTERACTION_XP} EXP hoạt động.`}
          onGrade={grade}
          options={ratingOptions}
        />
      ) : (
        <section
          className="review-action-console review-reveal-console"
          aria-label="Thao tác thẻ ôn"
          data-review-action="reveal"
        >
          <div className="review-action-inner">
            <div className="rating-heading">
              <span className="review-command-sigil" aria-hidden="true">✦</span>
              <span>
                <b>GIAO THỨC TRUY HỒI</b>
                <strong>Tự gọi lại trước khi xem đáp án</strong>
                <small>Nói thầm cách đọc và ý nghĩa, rồi mới giải mã mảnh ký ức.</small>
              </span>
            </div>
            <button
              className="reveal-button"
              disabled={busy}
              type="button"
              onClick={() => setRevealed(true)}
            >
              <span><small>GIẢI MÃ</small>Hiện đáp án</span> <i className="memory-symbol" aria-hidden="true">›</i>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
