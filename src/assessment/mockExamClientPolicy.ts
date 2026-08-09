export type MockExamClientLevel = "hsk1" | "hsk2" | "hsk3" | "hsk4";
export type MockExamClientForm = "a" | "b";

const MOCK_EXAM_LEVELS = new Set<MockExamClientLevel>([
  "hsk1",
  "hsk2",
  "hsk3",
  "hsk4",
]);
const MOCK_EXAM_FORMS = new Set<MockExamClientForm>(["a", "b"]);

export const isSupportedMockExamRoute = (
  level: string,
  form: string,
): level is MockExamClientLevel => MOCK_EXAM_LEVELS.has(
  level as MockExamClientLevel,
) && MOCK_EXAM_FORMS.has(form as MockExamClientForm);

export const mockExamOpenCommandStorageKey = (
  level: string,
  form: string,
) => `hanzi.mock.open.${level}.${form}`;

export const mockExamSubmitCommandStorageKey = (sessionId: string) =>
  `hanzi.mock.submit.${sessionId}`;

export const mockExamAttemptCommandStorageKey = (
  sessionId: string,
  position: number,
) => `hanzi.mock.attempt.${sessionId}.${position}`;

type MockExamCommandStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

type PersistedMockExamCommand = {
  schemaVersion: 1;
  command: unknown;
};

/**
 * Persists the exact command before transport. A retry therefore reuses the
 * same device sequence, timestamps and response fields instead of combining
 * an old idempotency key with a newly-created payload.
 */
export const readOrCreateStableMockExamCommand = async <T>(
  storage: MockExamCommandStorage,
  storageKey: string,
  create: () => Promise<T>,
  parse: (value: unknown) => T | null,
): Promise<T> => {
  const stored = storage.getItem(storageKey);
  if (stored !== null) {
    try {
      const envelope = JSON.parse(stored) as PersistedMockExamCommand;
      if (envelope?.schemaVersion === 1) {
        const command = parse(envelope.command);
        if (command !== null) return command;
      }
    } catch {
      // Legacy key-only values and corrupt records cannot authorize replay.
    }
    storage.removeItem(storageKey);
  }

  const command = parse(await create());
  if (command === null) {
    throw new Error("Mock Exam command does not match its current session scope.");
  }
  storage.setItem(storageKey, JSON.stringify({
    schemaVersion: 1,
    command,
  } satisfies PersistedMockExamCommand));
  return command;
};

type RemovableStorage = Pick<Storage, "removeItem">;

export const clearMockExamOpenCommand = (
  storage: RemovableStorage,
  level: string,
  form: string,
) => storage.removeItem(mockExamOpenCommandStorageKey(level, form));

export const clearMockExamAttemptCommand = (
  storage: RemovableStorage,
  sessionId: string,
  position: number,
) => storage.removeItem(mockExamAttemptCommandStorageKey(sessionId, position));

export const clearCompletedMockExamCommandKeys = (
  storage: RemovableStorage,
  level: string,
  form: string,
  sessionId: string,
  expectedItemCount = 0,
) => {
  clearMockExamOpenCommand(storage, level, form);
  storage.removeItem(mockExamSubmitCommandStorageKey(sessionId));
  for (let position = 0; position < expectedItemCount; position += 1) {
    clearMockExamAttemptCommand(storage, sessionId, position);
  }
};

export const shouldAutoSubmitMockExam = (input: {
  sessionId: string | null;
  remainingMs: number;
  resultReady: boolean;
  busy: boolean;
  attemptedSessionId: string | null;
  retryRequired: boolean;
}) => Boolean(
  input.sessionId
  && input.remainingMs === 0
  && !input.resultReady
  && !input.busy
  && !input.retryRequired
  && input.attemptedSessionId !== input.sessionId
);
