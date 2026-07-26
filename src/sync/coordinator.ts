import type { LearningState } from "../types";
import {
  getOrCreateLocalIdentifier,
  LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY,
  LEARNING_OWNER_STORAGE_KEY,
  LEARNING_RECOVERY_STORAGE_KEY,
  readLocalStorage,
  removeLocalStorage,
  SYNC_DEVICE_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
  writeLocalStorage,
} from "../lib/storageKeys";
import {
  canonicalStringify,
  createInitialSyncDocument,
  evolveSyncDocument,
  mergeSyncDocuments,
  redactStateForCloud,
} from "./document";
import {
  acknowledgeSyncOperation,
  allocateDeviceSequence,
  countPendingOperations,
  deleteOwnerData,
  enqueueOwnerAdoptionOperation,
  enqueueSyncOperation,
  listPendingOperations,
  markSyncAttempt,
  quarantineSyncOperation,
  readOrInitializeOwnerGeneration,
  readOwnerDocument,
  readOwnerGeneration,
  readOwnerLocalState,
  StaleOwnerGenerationError,
  transitionOwnerCheckpoint,
  writeOwnerCheckpoint,
  type OwnerGeneration,
  type PendingSyncOperation,
  type SyncOperationKind,
} from "./indexedDb";
import {
  hashSyncPushOperation,
  noStoreJsonHeaders,
  SYNC_PROTOCOL_VERSION,
  type CloudSession,
  type SyncApiError,
  type SyncPullResponseV1,
  type SyncPushOperationV1,
  type SyncPushResponseV1,
} from "./protocol";
import {
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  summarizeLearningCommandQueue,
} from "./learningCommandOutbox";
import {
  createSameOriginLearningCommandTransport,
  flushLearningCommandOutbox,
  type LearningCommandTransport,
} from "./learningCommandCoordinator";
import type { CloudSyncDocumentV1 } from "./types";

const SESSION_ENDPOINT = "/api/session";
const SYNC_ENDPOINT = "/api/sync";
const SYNC_INTERVAL_MS = 30_000;
const SYNC_LOCK_NAME = "hanzi-os-cloud-sync-v1";
const NORMALIZED_FLUSH_LIMIT = 25;

export type SyncPhase =
  | "checking"
  | "local-only"
  | "offline"
  | "syncing"
  | "synced"
  | "error";

export type LearningSyncStatus = {
  phase: SyncPhase;
  session: CloudSession | null;
  ownerKey: string;
  /** Pending compatibility-snapshot operations. */
  pendingCount: number;
  /** Unacknowledged normalized commands, including leased/backoff records. */
  normalizedPendingCount: number;
  /** Normalized commands retained for explicit recovery or cleanup. */
  normalizedQuarantinedCount: number;
  lastSyncedAt: string | null;
  error: string | null;
};

type CoordinatorOptions = {
  initialState: LearningState;
  getState: () => LearningState;
  applyState: (state: LearningState) => boolean;
  onStatus: (status: LearningSyncStatus) => void;
};

const createOperationId = (scope: string) => {
  const random = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${scope}:${random}`;
};

const anonymousOwnerKey = (installationId: string) =>
  `anonymous:${installationId}`;

const hasPersistedOwnerBinding = (
  persistedOwner: string | null,
  expectedAnonymousOwner: string,
) => persistedOwner === expectedAnonymousOwner
  || (
    persistedOwner !== null
    && /^siwc_[0-9a-f]{64}$/.test(persistedOwner)
  );

const isCloudSession = (value: unknown): value is CloudSession => {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<CloudSession>;
  if (session.authenticated === false) {
    return session.user === null && session.accountKey === null;
  }
  return session.authenticated === true
    && typeof session.accountKey === "string"
    && Boolean(session.user && typeof session.user.email === "string");
};

const preserveLocalOnlyEvidence = (
  remoteState: LearningState,
  currentLocalState: LearningState,
): LearningState => {
  const cloudKeys = new Set(
    remoteState.evidence.map((evidence) => evidence.idempotencyKey),
  );
  const localOnly = currentLocalState.evidence.filter((evidence) =>
    evidence.method === "speech-transcript"
    && !cloudKeys.has(evidence.idempotencyKey)
  );
  return localOnly.length
    ? { ...remoteState, evidence: [...remoteState.evidence, ...localOnly] }
    : remoteState;
};

const isSyncPullResponse = (value: unknown): value is SyncPullResponseV1 => {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<SyncPullResponseV1>;
  return response.protocolVersion === SYNC_PROTOCOL_VERSION
    && Number.isInteger(response.revision)
    && Number.isInteger(response.cursor)
    && (response.document === null || typeof response.document === "object");
};

const isSyncPushResponse = (value: unknown): value is SyncPushResponseV1 => {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<SyncPushResponseV1>;
  return response.protocolVersion === SYNC_PROTOCOL_VERSION
    && typeof response.acceptedOperationId === "string"
    && Number.isInteger(response.revision)
    && Number.isInteger(response.cursor)
    && Boolean(response.document && typeof response.document === "object");
};

type ParsedApiError = SyncApiError["error"];

const isPermanentOperationFailure = (
  response: Response,
  error: ParsedApiError,
) => [409, 413, 422].includes(response.status) && error.retryable !== true;

export const mergeServerAuthoritativeDocument = (
  server: CloudSyncDocumentV1,
  local: CloudSyncDocumentV1,
) => {
  if (server.reset.epoch !== local.reset.epoch) {
    return mergeSyncDocuments(server, local);
  }
  const serverEvidenceIds = new Set(
    server.state.evidence.map((evidence) => evidence.idempotencyKey),
  );
  const serverActivityIds = new Set(
    server.state.activityLog.map((activity) => activity.id),
  );
  const localOverlay: CloudSyncDocumentV1 = {
    ...local,
    state: {
      ...local.state,
      mistakes: server.state.mistakes.map((mistake) => ({ ...mistake })),
      evidence: local.state.evidence.filter(
        (evidence) => !serverEvidenceIds.has(evidence.idempotencyKey),
      ),
      activityLog: local.state.activityLog.filter(
        (activity) => !serverActivityIds.has(activity.id),
      ),
    },
  };
  return mergeSyncDocuments(server, localOverlay);
};

const hasUncheckpointedProjection = (
  current: LearningState,
  document: CloudSyncDocumentV1,
) => {
  const safe = redactStateForCloud(current);
  if (
    safe.contentVersion !== document.state.contentVersion
    || canonicalStringify(safe.profile) !== canonicalStringify(document.state.profile)
    || canonicalStringify(safe.diagnostic) !== canonicalStringify(document.state.diagnostic)
    || canonicalStringify([...safe.savedWords].sort())
      !== canonicalStringify([...document.state.savedWords].sort())
    || safe.xp !== document.state.xp
  ) {
    return true;
  }
  const documentEvidence = new Map(
    document.state.evidence.map((evidence) => [evidence.idempotencyKey, evidence]),
  );
  const documentActivity = new Map(
    document.state.activityLog.map((activity) => [activity.id, activity]),
  );
  return safe.evidence.some((evidence) =>
    canonicalStringify(documentEvidence.get(evidence.idempotencyKey))
      !== canonicalStringify(evidence)
  ) || safe.activityLog.some((activity) =>
    canonicalStringify(documentActivity.get(activity.id))
      !== canonicalStringify(activity)
  );
};

export class LearningSyncCoordinator {
  private readonly installationId: string;
  private readonly deviceId: string;
  private readonly options: CoordinatorOptions;
  private readonly bootstrapLearningSnapshot: LearningState;
  private ownerKey: string;
  private ownerGeneration: OwnerGeneration | null = null;
  private anonymousOwnershipProven: boolean;
  private ownerBindingEstablished: boolean;
  private revision = 0;
  private document: CloudSyncDocumentV1;
  private session: CloudSession | null = null;
  private identityChecked = false;
  private ownerChangedDuringResolution = false;
  private status: LearningSyncStatus;
  private disposed = false;
  private readonly lifecycle = new AbortController();
  private workQueue: Promise<void> = Promise.resolve();
  private intervalId: number | null = null;
  private broadcast: BroadcastChannel | null = null;
  private normalizedQueueWorkScheduled = false;

  constructor(options: CoordinatorOptions) {
    this.options = options;
    this.bootstrapLearningSnapshot = options.getState();
    this.installationId = getOrCreateLocalIdentifier(
      SYNC_INSTALLATION_STORAGE_KEY,
      "installation",
    );
    this.deviceId = getOrCreateLocalIdentifier(
      SYNC_DEVICE_STORAGE_KEY,
      "device",
    );
    const fallbackOwner = anonymousOwnerKey(this.installationId);
    const persistedOwner = readLocalStorage(LEARNING_OWNER_STORAGE_KEY);
    this.ownerKey = persistedOwner ?? fallbackOwner;
    this.anonymousOwnershipProven = persistedOwner === fallbackOwner;
    this.ownerBindingEstablished = hasPersistedOwnerBinding(
      persistedOwner,
      fallbackOwner,
    );
    const now = new Date().toISOString();
    this.document = createInitialSyncDocument(
      options.getState(),
      now,
      createOperationId("bootstrap"),
    );
    this.status = {
      phase: "checking",
      session: null,
      ownerKey: this.ownerKey,
      pendingCount: 0,
      normalizedPendingCount: 0,
      normalizedQuarantinedCount: 0,
      lastSyncedAt: null,
      error: null,
    };
  }

  initialize() {
    this.publishStatus({ phase: "checking", error: null });
    this.broadcast = typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel("hanzi-os-sync-v1");
    this.broadcast?.addEventListener("message", this.handleBroadcast);
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener(
      LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
      this.handleLearningCommandQueueChanged,
    );
    this.intervalId = window.setInterval(() => {
      if (navigator.onLine) void this.syncNow();
    }, SYNC_INTERVAL_MS);
    return this.enqueueWork(async () => {
      const persistedOwnerChanged = await this.initializeOwnerGeneration();
      await this.restoreOwnerCheckpoint(persistedOwnerChanged);
      await this.updatePendingCount();
      if (!await this.resolveSessionAndOwner()) return;
      if (!this.ownerChangedDuringResolution) {
        await this.reconcileCurrentProjection();
      }
      if (this.session?.authenticated) await this.pullAndFlush();
      else this.publishStatus({ phase: "local-only", error: null });
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.lifecycle.abort();
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener(
      LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
      this.handleLearningCommandQueueChanged,
    );
    this.broadcast?.removeEventListener("message", this.handleBroadcast);
    this.broadcast?.close();
  }

  queueMutation(
    previousState: LearningState,
    nextState: LearningState,
    kind: SyncOperationKind = "snapshot",
  ): Promise<void> {
    const durable = this.enqueueWork(async () => {
      const operationId = createOperationId(kind);
      const now = new Date().toISOString();
      const previousDocument = this.document;
      const nextDocument = evolveSyncDocument(
        previousDocument,
        previousState,
        nextState,
        now,
        operationId,
        kind,
      );
      this.document = nextDocument;
      try {
        await this.withRequiredLock(async () => {
          await this.queueDocumentOperation(
            operationId,
            kind,
            now,
            nextState,
          );
        });
      } catch (error) {
        this.document = previousDocument;
        throw error;
      }
    }, true);
    void durable.then(() => {
      if (this.session?.authenticated && navigator.onLine && !this.disposed) {
        void this.enqueueWork(() => this.flush());
      }
    }, () => undefined);
    return durable;
  }

  syncNow() {
    return this.enqueueWork(async () => {
      await this.followPersistedOwnerIfChanged();
      await this.updatePendingCount();
      if (!navigator.onLine) {
        if (!this.identityChecked) {
          if (
            this.ownerKey.startsWith("anonymous:")
            && this.anonymousOwnershipProven
          ) {
            const anonymousSession: CloudSession = {
              authenticated: false,
              user: null,
              accountKey: null,
            };
            this.session = anonymousSession;
            this.identityChecked = true;
            this.publishStatus({
              phase: "offline",
              session: anonymousSession,
              error: null,
            });
          } else {
            this.publishStatus({ phase: "checking", error: null });
          }
          return;
        }
        this.publishStatus({ phase: "offline", error: null });
        return;
      }
      if (!this.session?.authenticated) {
        if (!await this.resolveSessionAndOwner()) return;
        if (!this.ownerChangedDuringResolution) {
          await this.reconcileCurrentProjection();
        }
      }
      if (this.session?.authenticated) await this.pullAndFlush();
      else this.publishStatus({ phase: "local-only", error: null });
    });
  }

  prepareSignOut() {
    return this.enqueueWork(async () => {
      await this.withRequiredLock(async () => {
        if (this.session?.authenticated && navigator.onLine) {
          await this.pullAndFlushUnlocked();
        }
        const queueCounts = await this.readCurrentQueueCounts();
        this.publishStatus(queueCounts);
        this.assertQueueReadyForIdentityExit(queueCounts);

        const anonymousSession: CloudSession = {
          authenticated: false,
          user: null,
          accountKey: null,
        };
        await this.switchOwnerUnlocked(
          anonymousOwnerKey(this.installationId),
          anonymousSession,
        );
        this.assertActive();
        this.session = anonymousSession;
        await this.updatePendingCount();
        this.publishStatus({
          phase: "local-only",
          session: anonymousSession,
          ownerKey: this.ownerKey,
          error: null,
        });
      });
    }, true);
  }

  deleteAccount() {
    return this.enqueueWork(async () => {
      await this.withRequiredLock(async () => {
        if (!this.session?.authenticated) {
          throw new Error("Chưa có tài khoản cloud để xóa.");
        }
        if (!navigator.onLine) {
          throw new Error("Cần trực tuyến và đồng bộ xong trước khi xóa tài khoản.");
        }
        await this.pullAndFlushUnlocked();
        this.assertActive();
        const queueCounts = await this.readCurrentQueueCounts();
        this.publishStatus(queueCounts);
        this.assertQueueReadyForIdentityExit(queueCounts);
        if (
          !this.session?.authenticated
          || this.status.phase !== "synced"
        ) {
          throw new Error("Cần đồng bộ hết tiến độ trước khi xóa tài khoản.");
        }

        const response = await fetch("/api/account", {
          method: "DELETE",
          headers: {
            ...noStoreJsonHeaders,
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ confirmation: "DELETE HANZI.OS" }),
          cache: "no-store",
          credentials: "same-origin",
          signal: this.lifecycle.signal,
        });
        this.assertActive();
        if (!response.ok) throw new Error(await this.readApiError(response));

        const deletedOwner = this.ownerKey;
        const anonymousSession: CloudSession = {
          authenticated: false,
          user: null,
          accountKey: null,
        };
        await this.switchOwnerUnlocked(
          anonymousOwnerKey(this.installationId),
          anonymousSession,
        );
        this.assertActive();
        await deleteOwnerData(deletedOwner);
        this.assertActive();
        this.session = anonymousSession;
        const nextQueueCounts = await this.readCurrentQueueCounts();
        this.publishStatus({
          phase: "local-only",
          session: anonymousSession,
          ownerKey: this.ownerKey,
          ...nextQueueCounts,
          error: null,
        });
      });
    }, true);
  }

  private enqueueWork(work: () => Promise<void>, propagate = false) {
    const run = this.workQueue.then(async () => {
      this.assertActive();
      await work();
    });
    this.workQueue = run.catch((error: unknown) => {
      if (!this.disposed) {
        if (error instanceof StaleOwnerGenerationError) {
          this.identityChecked = false;
          this.session = null;
          this.publishStatus({
            phase: "checking",
            session: null,
            error: null,
          });
          return;
        }
        this.publishStatus({
          phase: this.identityChecked
            ? (navigator.onLine ? "error" : "offline")
            : "checking",
          error: error instanceof Error ? error.message : "Cloud sync failed.",
        });
      }
    });
    return propagate ? run : this.workQueue;
  }

  private assertActive() {
    if (!this.disposed && !this.lifecycle.signal.aborted) return;
    const error = new Error("Cloud sync coordinator is no longer active.");
    error.name = "AbortError";
    throw error;
  }

  private async initializeOwnerGeneration() {
    const claim = await readOrInitializeOwnerGeneration(this.ownerKey);
    this.assertActive();
    const ownerChanged = claim.ownerGeneration.ownerKey !== this.ownerKey;
    this.ownerGeneration = claim.ownerGeneration;
    this.ownerKey = claim.ownerGeneration.ownerKey;
    this.anonymousOwnershipProven = this.ownerKey.startsWith("anonymous:")
      && this.anonymousOwnershipProven;
    if (ownerChanged) {
      writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, this.ownerKey);
      this.publishStatus({ ownerKey: this.ownerKey });
    }
    return ownerChanged;
  }

  private async requireCurrentOwnerGeneration() {
    if (this.ownerGeneration) return this.ownerGeneration;
    const claim = await readOrInitializeOwnerGeneration(this.ownerKey);
    this.assertActive();
    if (claim.ownerGeneration.ownerKey !== this.ownerKey) {
      throw new StaleOwnerGenerationError();
    }
    this.ownerGeneration = claim.ownerGeneration;
    this.anonymousOwnershipProven = this.ownerKey.startsWith("anonymous:")
      && this.anonymousOwnershipProven;
    return claim.ownerGeneration;
  }

  private quarantineUnownedLearningSnapshot(expectedAnonymousOwner: string) {
    const isMeaningful = canonicalStringify(this.bootstrapLearningSnapshot)
      !== canonicalStringify(this.options.initialState);
    if (isMeaningful) {
      const quarantine = {
        schemaVersion: 1,
        reason: "anonymous-owner-proof-missing-or-invalid",
        expectedAnonymousOwner,
        quarantinedAt: new Date().toISOString(),
        state: this.bootstrapLearningSnapshot,
      };
      if (!writeLocalStorage(
        LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY,
        JSON.stringify(quarantine),
      )) {
        throw new Error(
          "Không thể cách ly kho học chưa có bằng chứng chủ sở hữu.",
        );
      }
    }
    if (!this.options.applyState(this.options.initialState)) {
      throw new Error("Không thể ẩn kho học chưa có bằng chứng chủ sở hữu.");
    }
    removeLocalStorage(LEARNING_RECOVERY_STORAGE_KEY);
    this.document = createInitialSyncDocument(
      this.options.initialState,
      new Date().toISOString(),
      createOperationId("privacy-quarantine"),
    );
    this.revision = 0;
  }

  private async restoreOwnerCheckpoint(forceState = false) {
    const [checkpoint, localState] = await Promise.all([
      readOwnerDocument(this.ownerKey),
      readOwnerLocalState(this.ownerKey),
    ]);
    this.assertActive();
    if (checkpoint) {
      this.document = checkpoint.document;
      this.revision = checkpoint.revision;
    }
    const current = this.options.getState();
    const currentIsInitial = canonicalStringify(current)
      === canonicalStringify(this.options.initialState);
    const checkpointIsMeaningful = localState
      && canonicalStringify(localState) !== canonicalStringify(this.options.initialState);
    if ((forceState || currentIsInitial) && checkpointIsMeaningful) {
      if (!this.options.applyState(localState)) {
        throw new Error("Không thể khôi phục checkpoint học tập trên thiết bị.");
      }
    } else if (forceState && !localState) {
      if (!this.options.applyState(this.options.initialState)) {
        throw new Error("Không thể làm sạch checkpoint của chủ sở hữu cũ.");
      }
    }
  }

  private async resolveSessionAndOwner() {
    this.ownerChangedDuringResolution = false;
    let response: Response;
    try {
      response = await fetch(SESSION_ENDPOINT, {
        headers: { accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: this.lifecycle.signal,
      });
    } catch {
      this.assertActive();
      if (
        !navigator.onLine
        && this.ownerKey.startsWith("anonymous:")
        && this.anonymousOwnershipProven
      ) {
        const anonymousSession: CloudSession = {
          authenticated: false,
          user: null,
          accountKey: null,
        };
        this.session = anonymousSession;
        this.identityChecked = true;
        this.publishStatus({
          phase: "offline",
          session: anonymousSession,
          ownerKey: this.ownerKey,
          error: null,
        });
        return false;
      }
      this.publishStatus({ phase: "checking", error: null });
      return false;
    }
    this.assertActive();
    if (!response.ok) throw new Error("Không thể kiểm tra phiên đăng nhập.");
    const session: unknown = await response.json();
    this.assertActive();
    if (!isCloudSession(session)) throw new Error("Phản hồi phiên đăng nhập không hợp lệ.");
    const nextOwner = session.authenticated
      ? session.accountKey
      : anonymousOwnerKey(this.installationId);
    const mustQuarantineUnownedSnapshot = !session.authenticated
      && !this.ownerBindingEstablished;
    if (mustQuarantineUnownedSnapshot) {
      this.quarantineUnownedLearningSnapshot(nextOwner);
    }
    if (nextOwner !== this.ownerKey) {
      await this.switchOwner(nextOwner, session, {
        persistPreviousCheckpoint: !mustQuarantineUnownedSnapshot,
        restoreTargetCheckpoint: !mustQuarantineUnownedSnapshot,
      });
      this.ownerChangedDuringResolution = true;
    }
    this.assertActive();
    this.session = session;
    this.identityChecked = true;
    this.anonymousOwnershipProven = !session.authenticated;
    this.ownerBindingEstablished = true;
    writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, this.ownerKey);
    this.publishStatus({ session, ownerKey: this.ownerKey, error: null });
    return true;
  }

  private async switchOwner(
    nextOwner: string,
    session: CloudSession,
    options: {
      persistPreviousCheckpoint?: boolean;
      restoreTargetCheckpoint?: boolean;
    } = {},
  ) {
    await this.withRequiredLock(() =>
      this.switchOwnerUnlocked(nextOwner, session, options)
    );
  }

  private async switchOwnerUnlocked(
    nextOwner: string,
    session: CloudSession,
    {
      persistPreviousCheckpoint = true,
      restoreTargetCheckpoint = true,
    }: {
      persistPreviousCheckpoint?: boolean;
      restoreTargetCheckpoint?: boolean;
    } = {},
  ) {
    const previousOwner = this.ownerKey;
    const previousDocument = this.document;
    const previousRevision = this.revision;
    const previousState = this.options.getState();
    const previousWasAnonymous = previousOwner.startsWith("anonymous:");
    const previousOwnerGeneration = await this.requireCurrentOwnerGeneration();
    if (persistPreviousCheckpoint) {
      await writeOwnerCheckpoint(
        previousOwner,
        this.revision,
        this.document,
        previousState,
        previousOwnerGeneration,
      );
      this.assertActive();
    }

    if (session.authenticated && previousWasAnonymous) {
      const [localTargetCheckpoint, targetLocalState] = await Promise.all([
        readOwnerDocument(nextOwner),
        readOwnerLocalState(nextOwner),
      ]);
      this.assertActive();
      let canonicalTarget: SyncPullResponseV1 | null = null;
      if (navigator.onLine) {
        const canonicalResponse = await fetch(SYNC_ENDPOINT, {
          headers: { accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
          signal: this.lifecycle.signal,
        });
        this.assertActive();
        if (!canonicalResponse.ok) {
          throw new Error(await this.readApiError(canonicalResponse));
        }
        const canonicalPayload: unknown = await canonicalResponse.json();
        this.assertActive();
        if (!isSyncPullResponse(canonicalPayload)) {
          throw new Error("Phản hồi tải tiến độ không hợp lệ.");
        }
        canonicalTarget = canonicalPayload;
      }
      const now = new Date().toISOString();
      const operationId = createOperationId("local-import");
      let targetDocument: CloudSyncDocumentV1 | null = null;
      let targetState: LearningState | null = null;
      if (localTargetCheckpoint) {
        const localState = targetLocalState ?? localTargetCheckpoint.document.state;
        const localDocument = targetLocalState
          ? evolveSyncDocument(
              localTargetCheckpoint.document,
              localTargetCheckpoint.document.state,
              targetLocalState,
              now,
              createOperationId("target-local-recovery"),
              "local-import",
            )
          : localTargetCheckpoint.document;
        if (
          canonicalTarget?.document
          && localDocument.reset.epoch < canonicalTarget.document.reset.epoch
        ) {
          // A server reset invalidates every older account-local projection.
          targetDocument = canonicalTarget.document;
          targetState = canonicalTarget.document.state;
        } else if (
          canonicalTarget?.document
          && localDocument.reset.epoch === canonicalTarget.document.reset.epoch
        ) {
          targetDocument = mergeServerAuthoritativeDocument(
            canonicalTarget.document,
            localDocument,
          ).document;
          targetState = preserveLocalOnlyEvidence(targetDocument.state, localState);
        } else {
          targetDocument = localDocument;
          targetState = localState;
        }
      } else if (canonicalTarget?.document) {
        targetDocument = canonicalTarget.document;
        targetState = canonicalTarget.document.state;
      } else if (targetLocalState) {
        targetDocument = createInitialSyncDocument(
          targetLocalState,
          now,
          createOperationId("target-recovery"),
        );
        targetState = targetLocalState;
      }
      const anonymousEvidenceIds = new Set(
        previousDocument.state.evidence.map((evidence) => evidence.idempotencyKey),
      );
      const anonymousActivityIds = new Set(
        previousDocument.state.activityLog.map((activity) => activity.id),
      );
      const fullAnonymousState: LearningState = {
        ...previousState,
        xp: Math.max(previousDocument.state.xp, previousState.xp),
        savedWords: [...new Set([
          ...previousDocument.state.savedWords,
          ...previousState.savedWords,
        ])],
        evidence: [
          ...previousDocument.state.evidence,
          ...previousState.evidence.filter(
            (evidence) => !anonymousEvidenceIds.has(evidence.idempotencyKey),
          ),
        ],
        activityLog: [
          ...previousDocument.state.activityLog,
          ...previousState.activityLog.filter(
            (activity) => !anonymousActivityIds.has(activity.id),
          ),
        ],
      };
      const pristineDocument = createInitialSyncDocument(
        this.options.initialState,
        previousDocument.clock.observedAt,
        previousDocument.clock.operationId,
      );
      const anonymousIsPristine = canonicalStringify(previousState)
          === canonicalStringify(this.options.initialState)
        && canonicalStringify(previousDocument.state)
          === canonicalStringify(pristineDocument.state);
      let adoptedBase = createInitialSyncDocument(
        fullAnonymousState,
        now,
        createOperationId("account-adoption-base"),
      );
      let adoptedPreviousState = fullAnonymousState;
      let adoptedState = fullAnonymousState;
      const adoptedRevision = canonicalTarget?.revision
        ?? localTargetCheckpoint?.revision
        ?? 0;

      if (targetDocument && targetState) {
        adoptedBase = targetDocument;
        adoptedPreviousState = targetState;
        if (anonymousIsPristine) {
          adoptedState = targetState;
        } else {
          const targetEvidenceIds = new Set(
            targetState.evidence.map((evidence) => evidence.idempotencyKey),
          );
          const targetActivityIds = new Set(
            targetState.activityLog.map((activity) => activity.id),
          );
          adoptedBase = targetDocument;
          adoptedPreviousState = targetState;
          adoptedState = {
            ...fullAnonymousState,
            xp: Math.max(targetState.xp, fullAnonymousState.xp),
            savedWords: [...new Set([
              ...targetState.savedWords,
              ...fullAnonymousState.savedWords,
            ])],
            evidence: [
              ...targetState.evidence,
              ...fullAnonymousState.evidence.filter(
                (evidence) => !targetEvidenceIds.has(evidence.idempotencyKey),
              ),
            ],
            activityLog: [
              ...targetState.activityLog,
              ...fullAnonymousState.activityLog.filter(
                (activity) => !targetActivityIds.has(activity.id),
              ),
            ],
          };
        }
      }

      const adoptedDocument = evolveSyncDocument(
        adoptedBase,
        adoptedPreviousState,
        adoptedState,
        now,
        operationId,
        "local-import",
      );
      let appliedAdoptedState = false;
      const previousGeneration = this.ownerGeneration;
      let adoptionCommitted = false;
      try {
        this.ownerKey = nextOwner;
        this.revision = adoptedRevision;
        this.document = adoptedDocument;
        const nextOwnerGeneration = await this.queueDocumentOperation(
          operationId,
          "local-import",
          now,
          adoptedState,
          previousOwner,
          previousOwnerGeneration,
        );
        this.ownerGeneration = nextOwnerGeneration;
        adoptionCommitted = true;
        this.assertActive();
        this.publishStatus({
          phase: "checking",
          ownerKey: nextOwner,
          pendingCount: 0,
          normalizedPendingCount: 0,
          normalizedQuarantinedCount: 0,
          error: null,
        });
        if (canonicalStringify(adoptedState) !== canonicalStringify(previousState)) {
          if (!this.options.applyState(adoptedState)) {
            throw new Error("Không thể áp dụng checkpoint của tài khoản hiện tại.");
          }
          appliedAdoptedState = true;
        }
        if (!writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, nextOwner)) {
          throw new Error("Không thể ghi chủ sở hữu học tập hiện tại.");
        }
      } catch (error) {
        if (adoptionCommitted) {
          this.ownerKey = nextOwner;
          this.revision = adoptedRevision;
          this.document = adoptedDocument;
          writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, nextOwner);
          throw error;
        }
        this.ownerKey = previousOwner;
        this.revision = previousRevision;
        this.document = previousDocument;
        this.ownerGeneration = previousGeneration;
        if (appliedAdoptedState && !this.options.applyState(previousState)) {
          throw new Error(
            "Không thể rollback kho dữ liệu sau lỗi chuyển chủ sở hữu.",
            { cause: error },
          );
        }
        throw error;
      }
      await this.updatePendingCount();
      this.broadcast?.postMessage({
        type: "owner-changed",
        previousOwner,
        ownerKey: nextOwner,
      });
      return;
    }

    const [checkpoint, localState] = restoreTargetCheckpoint
      ? await Promise.all([
          readOwnerDocument(nextOwner),
          readOwnerLocalState(nextOwner),
        ])
      : [null, null];
    this.assertActive();
    let nextDocument: CloudSyncDocumentV1;
    let nextRevision: number;
    if (checkpoint) {
      nextDocument = checkpoint.document;
      nextRevision = checkpoint.revision;
    } else {
      const state = localState ?? this.options.initialState;
      nextDocument = createInitialSyncDocument(
        state,
        new Date().toISOString(),
        createOperationId("owner-bootstrap"),
      );
      nextRevision = 0;
    }
    const nextState = localState ?? nextDocument.state;
    const nextOwnerGeneration = await transitionOwnerCheckpoint(
      previousOwnerGeneration,
      nextOwner,
      nextRevision,
      nextDocument,
      nextState,
    );
    this.assertActive();
    this.ownerKey = nextOwner;
    this.ownerGeneration = nextOwnerGeneration;
    this.document = nextDocument;
    this.revision = nextRevision;
    this.publishStatus({
      phase: "checking",
      ownerKey: nextOwner,
      pendingCount: 0,
      normalizedPendingCount: 0,
      normalizedQuarantinedCount: 0,
      error: null,
    });
    if (!writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, nextOwner)) {
      this.ownerKey = previousOwner;
      this.ownerGeneration = previousOwnerGeneration;
      this.document = previousDocument;
      this.revision = previousRevision;
      try {
        this.ownerGeneration = await transitionOwnerCheckpoint(
          nextOwnerGeneration,
          previousOwner,
          previousRevision,
          previousDocument,
          previousState,
        );
      } catch {
        // The persisted generation is authoritative if another tab moved again.
      }
      writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, previousOwner);
      this.publishStatus({ phase: "checking", ownerKey: previousOwner });
      throw new Error("Không thể ghi chủ sở hữu học tập hiện tại.");
    }
    if (!this.options.applyState(nextState)) {
      this.ownerKey = previousOwner;
      this.ownerGeneration = previousOwnerGeneration;
      this.document = previousDocument;
      this.revision = previousRevision;
      try {
        this.ownerGeneration = await transitionOwnerCheckpoint(
          nextOwnerGeneration,
          previousOwner,
          previousRevision,
          previousDocument,
          previousState,
        );
      } catch {
        // The persisted generation is authoritative if another tab moved again.
      }
      writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, previousOwner);
      this.publishStatus({ phase: "checking", ownerKey: previousOwner });
      throw new Error("Không thể chuyển kho dữ liệu sang chủ tài khoản hiện tại.");
    }
    await this.updatePendingCount();
    this.broadcast?.postMessage({
      type: "owner-changed",
      previousOwner,
      ownerKey: nextOwner,
    });
  }

  private async reconcileCurrentProjection() {
    await this.withRequiredLock(() => this.reconcileCurrentProjectionUnlocked());
  }

  private async reconcileCurrentProjectionUnlocked() {
    const current = this.options.getState();
    if (!hasUncheckpointedProjection(current, this.document)) {
      await writeOwnerCheckpoint(
        this.ownerKey,
        this.revision,
        this.document,
        current,
        await this.requireCurrentOwnerGeneration(),
      );
      this.assertActive();
      await this.updatePendingCount();
      return;
    }
    const operationId = createOperationId("reconcile");
    const now = new Date().toISOString();
    const kind = this.ownerKey.startsWith("anonymous:")
      ? "snapshot"
      : "local-import";
    this.document = evolveSyncDocument(
      this.document,
      this.document.state,
      current,
      now,
      operationId,
      kind,
    );
    await this.queueDocumentOperation(
      operationId,
      kind,
      now,
      current,
    );
  }

  private async pullAndFlush() {
    await this.withLeaderLock(() => this.pullAndFlushUnlocked());
  }

  private async pullAndFlushUnlocked() {
      this.publishStatus({ phase: "syncing", error: null });
      const response = await fetch(SYNC_ENDPOINT, {
        headers: { accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: this.lifecycle.signal,
      });
      this.assertActive();
      if (response.status === 401) {
        await this.handleUnauthorizedUnlocked();
        return;
      }
      if (!response.ok) throw new Error(await this.readApiError(response));
      const payload: unknown = await response.json();
      this.assertActive();
      if (!isSyncPullResponse(payload)) throw new Error("Phản hồi tải tiến độ không hợp lệ.");
      if (payload.document) {
        const previousResetEpoch = this.document.reset.epoch;
        const merged = mergeServerAuthoritativeDocument(
          payload.document,
          this.document,
        );
        this.document = merged.document;
        this.revision = payload.revision;
        this.applyCloudProjection(
          merged.document.reset.epoch <= previousResetEpoch,
        );
        await writeOwnerCheckpoint(
          this.ownerKey,
          this.revision,
          this.document,
          this.options.getState(),
          await this.requireCurrentOwnerGeneration(),
        );
        this.assertActive();
        if (canonicalStringify(merged.document) !== canonicalStringify(payload.document)) {
          const operationId = createOperationId("pull-merge");
          await this.queueDocumentOperation(
            operationId,
            "snapshot",
            new Date().toISOString(),
            this.options.getState(),
          );
        }
      }
      await this.flushUnlocked();
  }

  private async flush() {
    await this.withLeaderLock(() => this.flushUnlocked());
  }

  private async flushUnlocked() {
    if (!this.session?.authenticated || !navigator.onLine) return;
    this.publishStatus({ phase: "syncing", error: null });
    const operations = await listPendingOperations(this.ownerKey);
    this.assertActive();
    let quarantineError: string | null = null;
    for (const operation of operations) {
      await markSyncAttempt(operation.operationId);
      this.assertActive();
      const response = await fetch(SYNC_ENDPOINT, {
        method: "POST",
        headers: {
          ...noStoreJsonHeaders,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(this.toPushOperation(operation)),
        cache: "no-store",
        credentials: "same-origin",
        signal: this.lifecycle.signal,
      });
      this.assertActive();
      if (response.status === 401) {
        await this.handleUnauthorizedUnlocked();
        return;
      }
      if (!response.ok) {
        const apiError = await this.parseApiError(response);
        this.assertActive();
        const message = this.formatApiError(apiError);
        if (isPermanentOperationFailure(response, apiError)) {
          await quarantineSyncOperation(
            operation.operationId,
            `${apiError.code}: ${message}`,
          );
          this.assertActive();
          quarantineError = message;
          continue;
        }
        throw new Error(message);
      }
      const payload: unknown = await response.json();
      this.assertActive();
      if (!isSyncPushResponse(payload)) throw new Error("Phản hồi ghi tiến độ không hợp lệ.");
      if (payload.acceptedOperationId !== operation.operationId) {
        throw new Error(
          `Cloud xác nhận sai thao tác (${payload.acceptedOperationId}); hàng đợi được giữ nguyên.`,
        );
      }
      const previousResetEpoch = this.document.reset.epoch;
      const merged = mergeServerAuthoritativeDocument(
        payload.document,
        this.document,
      );
      this.document = merged.document;
      this.revision = payload.revision;
      this.applyCloudProjection(
        merged.document.reset.epoch <= previousResetEpoch,
      );
      await acknowledgeSyncOperation(
        operation.operationId,
        this.ownerKey,
        this.revision,
        this.document,
        this.options.getState(),
        await this.requireCurrentOwnerGeneration(),
      );
      this.assertActive();
    }
    await this.updatePendingCount();
    this.assertActive();
    const now = new Date().toISOString();
    this.publishStatus({
      phase: quarantineError ? "error" : "synced",
      lastSyncedAt: now,
      error: quarantineError,
    });
    this.broadcast?.postMessage({ type: "synced", ownerKey: this.ownerKey });
    await this.flushNormalizedLearningCommandsUnlocked();
  }

  private async flushNormalizedLearningCommandsUnlocked() {
    if (!this.session?.authenticated || !navigator.onLine) {
      await this.updatePendingCount();
      return;
    }
    const ownerGeneration = await this.requireCurrentOwnerGeneration();
    const resetEpoch = this.document.reset.epoch;
    await this.assertNormalizedDeliveryFence(ownerGeneration, resetEpoch);
    const baseTransport = createSameOriginLearningCommandTransport({
      origin: typeof location === "undefined"
        ? "http://localhost"
        : location.origin,
      signal: this.lifecycle.signal,
    });
    const transport = this.createFencedLearningCommandTransport(
      baseTransport,
      ownerGeneration,
      resetEpoch,
    );
    const flushResult = await (async () => {
      try {
        const result = await flushLearningCommandOutbox({
          ownerGeneration,
          transport,
          maximumCommands: NORMALIZED_FLUSH_LIMIT,
          signal: this.lifecycle.signal,
        });
        this.assertActive();
        return result;
      } finally {
        if (!this.disposed) await this.updatePendingCount();
      }
    })();
    if (this.status.normalizedQuarantinedCount > 0) {
      this.publishStatus({
        phase: "error",
        error: `Có ${this.status.normalizedQuarantinedCount} lệnh học chuẩn hóa bị cách ly.`,
      });
      return;
    }
    if (flushResult.retried > 0) {
      this.publishStatus({
        phase: "error",
        error: "Lệnh học chuẩn hóa chưa gửi được; hàng đợi sẽ tự thử lại.",
      });
    }
  }

  private createFencedLearningCommandTransport(
    transport: LearningCommandTransport,
    ownerGeneration: OwnerGeneration,
    resetEpoch: number,
  ): LearningCommandTransport {
    const guard = async () => {
      await this.assertNormalizedDeliveryFence(ownerGeneration, resetEpoch);
    };
    return {
      sendLessonSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendLessonSession(command);
      },
      sendObjectiveAttempt: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendObjectiveAttempt(command);
      },
      sendLessonSessionSubmission: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendLessonSessionSubmission(command);
      },
      sendLessonSessionAbandonment: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendLessonSessionAbandonment(command);
      },
      sendOpenAssessmentSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendOpenAssessmentSession(command);
      },
      sendRecordAssessmentAttempt: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendRecordAssessmentAttempt(command);
      },
      sendSubmitAssessmentSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendSubmitAssessmentSession(command);
      },
      sendAbandonAssessmentSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendAbandonAssessmentSession(command);
      },
      sendOpenReaderSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendOpenReaderSession(command);
      },
      sendRecordReaderAttempt: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendRecordReaderAttempt(command);
      },
      sendSubmitReaderSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendSubmitReaderSession(command);
      },
      sendAbandonReaderSession: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendAbandonReaderSession(command);
      },
      sendReviewGrade: async (command) => {
        if (command.resetEpoch !== resetEpoch) throw new StaleOwnerGenerationError();
        await guard();
        return transport.sendReviewGrade(command);
      },
    };
  }

  private async assertNormalizedDeliveryFence(
    ownerGeneration: OwnerGeneration,
    resetEpoch: number,
  ) {
    this.assertActive();
    if (!navigator.onLine) {
      throw new Error("Normalized learning delivery is offline.");
    }
    if (
      !this.session?.authenticated
      || this.session.accountKey !== ownerGeneration.ownerKey
      || this.ownerKey !== ownerGeneration.ownerKey
      || this.ownerGeneration?.generation !== ownerGeneration.generation
    ) {
      throw new StaleOwnerGenerationError();
    }
    const [persistedOwner, checkpoint] = await Promise.all([
      readOwnerGeneration(),
      readOwnerDocument(ownerGeneration.ownerKey),
    ]);
    this.assertActive();
    if (
      persistedOwner?.ownerKey !== ownerGeneration.ownerKey
      || persistedOwner.generation !== ownerGeneration.generation
      || (checkpoint?.document.reset.epoch ?? 0) !== resetEpoch
      || this.document.reset.epoch !== resetEpoch
      || !this.session?.authenticated
      || this.session.accountKey !== ownerGeneration.ownerKey
    ) {
      throw new StaleOwnerGenerationError();
    }
  }

  private async handleUnauthorizedUnlocked() {
    const anonymousSession: CloudSession = {
      authenticated: false,
      user: null,
      accountKey: null,
    };
    const anonymousOwner = anonymousOwnerKey(this.installationId);
    if (this.ownerKey !== anonymousOwner) {
      await this.switchOwnerUnlocked(anonymousOwner, anonymousSession);
    }
    this.assertActive();
    this.session = anonymousSession;
    this.identityChecked = true;
    const queueCounts = await this.readCurrentQueueCounts();
    this.publishStatus({
      phase: "local-only",
      session: anonymousSession,
      ownerKey: this.ownerKey,
      ...queueCounts,
      error: null,
    });
  }

  private async queueDocumentOperation(
    operationId: string,
    kind: SyncOperationKind,
    occurredAt: string,
    localState: LearningState,
    sourceOwnerToDelete?: string,
    transitionGeneration?: OwnerGeneration,
  ): Promise<OwnerGeneration> {
    const expectedOwnerGeneration = transitionGeneration
      ?? await this.requireCurrentOwnerGeneration();
    const deviceSequence = await allocateDeviceSequence();
    this.assertActive();
    const operationWithoutHash: Omit<SyncPushOperationV1, "requestHash"> = {
      protocolVersion: SYNC_PROTOCOL_VERSION,
      operationId,
      idempotencyKey: operationId,
      ownerKey: this.ownerKey,
      installationId: this.installationId,
      deviceId: this.deviceId,
      deviceSequence,
      baseRevision: this.revision,
      kind,
      contentVersion: this.document.state.contentVersion,
      occurredAt,
      document: this.document,
    };
    const requestHash = await hashSyncPushOperation(operationWithoutHash);
    this.assertActive();
    const operation = { ...operationWithoutHash, requestHash };
    let nextOwnerGeneration = expectedOwnerGeneration;
    if (sourceOwnerToDelete) {
      nextOwnerGeneration = await enqueueOwnerAdoptionOperation(
        sourceOwnerToDelete,
        operation,
        localState,
        expectedOwnerGeneration,
      );
    } else {
      await enqueueSyncOperation(operation, localState, expectedOwnerGeneration);
    }
    if (!this.disposed) {
      this.broadcast?.postMessage({ type: "queued", ownerKey: this.ownerKey });
      void this.updatePendingCount().catch((error: unknown) => {
        if (!this.disposed) {
          this.publishStatus({
            phase: "error",
            error: error instanceof Error ? error.message : "Cloud sync failed.",
          });
        }
      });
    }
    return nextOwnerGeneration;
  }

  private async followPersistedOwner(announcedOwner: string) {
    const ownerGeneration = await readOwnerGeneration();
    this.assertActive();
    if (!ownerGeneration || ownerGeneration.ownerKey !== announcedOwner) {
      throw new StaleOwnerGenerationError();
    }
    const [checkpoint, localState] = await Promise.all([
      readOwnerDocument(announcedOwner),
      readOwnerLocalState(announcedOwner),
    ]);
    this.assertActive();
    const nextDocument = checkpoint?.document ?? createInitialSyncDocument(
      localState ?? this.options.initialState,
      new Date().toISOString(),
      createOperationId("owner-follow"),
    );
    const nextState = localState ?? nextDocument.state;
    if (!this.options.applyState(nextState)) {
      throw new Error("Không thể áp dụng chủ sở hữu mới từ tab HANZI.OS khác.");
    }
    this.ownerKey = announcedOwner;
    this.ownerGeneration = ownerGeneration;
    this.document = nextDocument;
    this.revision = checkpoint?.revision ?? 0;
    if (!writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, announcedOwner)) {
      throw new Error("Không thể ghi chủ sở hữu học tập hiện tại.");
    }
    this.anonymousOwnershipProven = announcedOwner.startsWith("anonymous:");
    this.publishStatus({ ownerKey: announcedOwner });
    await this.updatePendingCount();
  }

  private async followPersistedOwnerIfChanged() {
    const persisted = await readOwnerGeneration();
    this.assertActive();
    if (
      !persisted
      || (
        persisted.ownerKey === this.ownerKey
        && persisted.generation === this.ownerGeneration?.generation
      )
    ) {
      return;
    }
    this.identityChecked = false;
    this.session = null;
    this.publishStatus({ phase: "checking", session: null, error: null });
    await this.followPersistedOwner(persisted.ownerKey);
  }

  private toPushOperation(operation: PendingSyncOperation): SyncPushOperationV1 {
    return {
      protocolVersion: operation.protocolVersion,
      operationId: operation.operationId,
      idempotencyKey: operation.idempotencyKey,
      ownerKey: operation.ownerKey,
      installationId: operation.installationId,
      deviceId: operation.deviceId,
      deviceSequence: operation.deviceSequence,
      baseRevision: operation.baseRevision,
      kind: operation.kind,
      contentVersion: operation.contentVersion,
      occurredAt: operation.occurredAt,
      requestHash: operation.requestHash,
      document: operation.document,
    };
  }

  private applyCloudProjection(preserveLocalEvidence: boolean) {
    this.assertActive();
    const next = preserveLocalEvidence
      ? preserveLocalOnlyEvidence(
          this.document.state,
          this.options.getState(),
        )
      : this.document.state;
    if (!this.options.applyState(next)) {
      throw new Error("Cloud đã phản hồi nhưng trình duyệt không thể lưu checkpoint.");
    }
  }

  private async readCurrentQueueCounts() {
    const ownerKey = this.ownerKey;
    const ownerGeneration = await this.requireCurrentOwnerGeneration();
    const [pendingCount, normalized] = await Promise.all([
      countPendingOperations(ownerKey),
      summarizeLearningCommandQueue(ownerGeneration),
    ]);
    this.assertActive();
    if (
      ownerKey !== this.ownerKey
      || ownerGeneration.ownerKey !== this.ownerKey
      || ownerGeneration.generation !== this.ownerGeneration?.generation
    ) {
      throw new StaleOwnerGenerationError();
    }
    return {
      pendingCount,
      normalizedPendingCount: normalized.pendingCount,
      normalizedQuarantinedCount: normalized.quarantinedCount,
    };
  }

  private assertQueueReadyForIdentityExit(
    counts: Pick<
      LearningSyncStatus,
      "pendingCount" | "normalizedPendingCount" | "normalizedQuarantinedCount"
    >,
  ) {
    if (counts.normalizedQuarantinedCount > 0) {
      throw new Error(
        `Có ${counts.normalizedQuarantinedCount} lệnh học chuẩn hóa bị cách ly; cần xử lý hoặc đặt lại dữ liệu một cách tường minh trước khi rời tài khoản.`,
      );
    }
    if (counts.normalizedPendingCount > 0) {
      throw new Error(
        `Còn ${counts.normalizedPendingCount} lệnh học chuẩn hóa chưa được máy chủ xác nhận.`,
      );
    }
    if (counts.pendingCount > 0) {
      throw new Error(
        `Còn ${counts.pendingCount} thay đổi cục bộ chưa được máy chủ xác nhận.`,
      );
    }
  }

  private async updatePendingCount() {
    const ownerKey = this.ownerKey;
    const counts = await this.readCurrentQueueCounts();
    if (ownerKey !== this.ownerKey) return;
    this.publishStatus(counts);
  }

  private async withLeaderLock(work: () => Promise<void>) {
    const lockManager = navigator.locks;
    if (!lockManager) return work();
    await lockManager.request(
      SYNC_LOCK_NAME,
      { mode: "exclusive", ifAvailable: true },
      async (lock) => {
        if (lock) {
          this.assertActive();
          await work();
        }
      },
    );
  }

  private async withRequiredLock(work: () => Promise<void>) {
    const lockManager = navigator.locks;
    if (!lockManager) return work();
    await lockManager.request(
      SYNC_LOCK_NAME,
      { mode: "exclusive" },
      async () => {
        this.assertActive();
        await work();
      },
    );
  }

  private async readApiError(response: Response) {
    return this.formatApiError(await this.parseApiError(response));
  }

  private async parseApiError(response: Response): Promise<ParsedApiError> {
    try {
      const payload = await response.json() as Partial<SyncApiError>;
      if (
        payload.error
        && typeof payload.error.code === "string"
        && typeof payload.error.message === "string"
      ) {
        return payload.error;
      }
    } catch {
      // Fall back to an HTTP status below.
    }
    return {
      code: `HTTP_${response.status}`,
      message: `Cloud sync trả về HTTP ${response.status}.`,
      retryable: response.status === 429 || response.status >= 500,
    };
  }

  private formatApiError(error: ParsedApiError) {
    return error.requestId
      ? `${error.message} (${error.requestId})`
      : error.message;
  }

  private publishStatus(patch: Partial<LearningSyncStatus>) {
    if (this.disposed) return;
    this.status = { ...this.status, ...patch };
    this.options.onStatus(this.status);
  }

  private readonly handleOnline = () => {
    void this.syncNow();
  };

  private readonly handleLearningCommandQueueChanged = () => {
    this.scheduleNormalizedQueueWork();
  };

  private readonly handleOffline = () => {
    this.publishStatus({
      phase: this.identityChecked ? "offline" : "checking",
      error: null,
    });
  };

  private readonly handleBroadcast = (event: MessageEvent) => {
    if (
      event.data?.type === "learning-command-queue-changed"
      && event.data.ownerKey === this.ownerKey
    ) {
      this.scheduleNormalizedQueueWork();
      return;
    }
    if (event.data?.type === "owner-changed") {
      this.identityChecked = false;
      this.session = null;
      this.publishStatus({ phase: "checking", session: null, error: null });
      void this.enqueueWork(async () => {
        const announcedOwner = typeof event.data.ownerKey === "string"
          ? event.data.ownerKey
          : "";
        await this.followPersistedOwner(announcedOwner);
        if (announcedOwner.startsWith("anonymous:")) {
          const anonymousSession: CloudSession = {
            authenticated: false,
            user: null,
            accountKey: null,
          };
          this.assertActive();
          this.session = anonymousSession;
          this.identityChecked = true;
          const queueCounts = await this.readCurrentQueueCounts();
          this.publishStatus({
            phase: "local-only",
            session: anonymousSession,
            ownerKey: this.ownerKey,
            ...queueCounts,
            error: null,
          });
          return;
        }
        if (!await this.resolveSessionAndOwner()) return;
        if (!this.ownerChangedDuringResolution) {
          await this.reconcileCurrentProjection();
        }
        if (this.session?.authenticated) await this.pullAndFlush();
        else this.publishStatus({ phase: "local-only", error: null });
      });
      return;
    }
    if (
      (event.data?.type === "synced" || event.data?.type === "queued")
      && event.data.ownerKey === this.ownerKey
    ) {
      void this.syncNow();
    }
  };

  private scheduleNormalizedQueueWork() {
    if (this.disposed || this.normalizedQueueWorkScheduled) return;
    this.normalizedQueueWorkScheduled = true;
    void this.enqueueWork(async () => {
      try {
        await this.followPersistedOwnerIfChanged();
        await this.updatePendingCount();
        if (this.session?.authenticated && navigator.onLine) {
          await this.withLeaderLock(
            () => this.flushNormalizedLearningCommandsUnlocked(),
          );
        }
      } finally {
        this.normalizedQueueWorkScheduled = false;
      }
    });
  }
}
