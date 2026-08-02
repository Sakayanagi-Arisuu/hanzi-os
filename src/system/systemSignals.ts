export type SystemSignalType =
  | "system.boot"
  | "system.online"
  | "system.panel-opened"
  | "system.panel-closed"
  | "quest.scan"
  | "quest.activated"
  | "lesson.started"
  | "lesson.completed"
  | "learning.correct"
  | "learning.retry"
  | "path.unlocked"
  | "review.recalled"
  | "review.queue-cleared"
  | "mistake.resolved"
  | "level-check.started"
  | "level-check.completed"
  | "rank.threshold-reached"
  | "journey.title-unlocked"
  | "journey.promoted"
  | "voice.record-armed"
  | "voice.record-started"
  | "voice.record-stopped"
  | "voice.playback-started"
  | "voice.playback-ended"
  | "voice.processing"
  | "voice.result"
  | "voice.permission-denied"
  | "voice.error"
  | "state.saved"
  | "state.offline"
  | "state.restored"
  | "state.warning";

export type SystemSignal = {
  type: SystemSignalType;
  sourceId: string;
  eventId: string;
  message?: string;
  detail?: Record<string, string | number | boolean | null>;
};

type SignalInput = Omit<SystemSignal, "eventId"> & { eventId?: string };
type SignalListener = (signal: SystemSignal) => void;

const listeners = new Set<SignalListener>();
const emittedIds = new Set<string>();
const emittedOrder: string[] = [];
let sequence = 0;

export const emitSystemSignal = (input: SignalInput) => {
  const eventId = input.eventId ?? `${input.type}:${input.sourceId}:${Date.now()}:${sequence++}`;
  if (emittedIds.has(eventId)) return false;
  emittedIds.add(eventId);
  emittedOrder.push(eventId);
  if (emittedOrder.length > 96) {
    emittedIds.delete(emittedOrder.shift()!);
  }
  const signal: SystemSignal = { ...input, eventId };
  listeners.forEach((listener) => listener(signal));
  return true;
};

export const subscribeSystemSignals = (listener: SignalListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resetSystemSignalsForTests = () => {
  listeners.clear();
  emittedIds.clear();
  emittedOrder.length = 0;
  sequence = 0;
};
