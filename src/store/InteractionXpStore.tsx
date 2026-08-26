import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { deriveAuthoritativeInteractionXp } from "../learning/interactionXp";
import {
  fetchAccountInteractionXp,
  INTERACTION_XP_CHANGED_EVENT,
  type AccountInteractionXpSnapshot,
} from "../learning/interactionXpClient";
import { useLearning } from "./LearningStore";
import { useNormalizedLearningProjection } from "./NormalizedLearningProjectionStore";

export type InteractionXpSnapshot = {
  totalXp: number;
  dailyXp: number | null;
  authoritative: boolean;
  pending: boolean;
  lessonRewards: AccountInteractionXpSnapshot["lessonRewards"] | null;
};

const InteractionXpContext = createContext<InteractionXpSnapshot | null>(null);

const localDayWindow = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
};

export function InteractionXpProvider({ children }: { children: ReactNode }) {
  const { state, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : null;
  const [server, setServer] = useState<{
    accountKey: string;
    value: AccountInteractionXpSnapshot;
  } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshVersion((value) => value + 1);
    window.addEventListener(INTERACTION_XP_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener(INTERACTION_XP_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  useEffect(() => {
    if (!accountKey || normalized.resetEpoch === null) {
      setServer(null);
      return;
    }
    let active = true;
    const { start, end } = localDayWindow();
    void fetchAccountInteractionXp(start, end).then((value) => {
      if (
        active
        && value
        && value.resetEpoch === normalized.resetEpoch
      ) setServer({ accountKey, value });
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accountKey, normalized.projection?.cursor, normalized.resetEpoch, refreshVersion]);

  const value = useMemo<InteractionXpSnapshot>(() => {
    if (!accountKey) {
      return {
        totalXp: state.xp,
        dailyXp: state.dailyXp,
        authoritative: false,
        pending: false,
        lessonRewards: null,
      };
    }
    const exactServer = server?.accountKey === accountKey
      && server.value.resetEpoch === normalized.resetEpoch
      ? server.value
      : null;
    if (exactServer) {
      return {
        totalXp: exactServer.totalXp,
        dailyXp: exactServer.dailyXp,
        authoritative: true,
        pending: false,
        lessonRewards: exactServer.lessonRewards,
      };
    }
    const lessonFallback = deriveAuthoritativeInteractionXp(
      normalized.authoritativeProgress,
    );
    return {
      totalXp: lessonFallback?.totalXp ?? 0,
      dailyXp: null,
      authoritative: Boolean(lessonFallback),
      pending: true,
      lessonRewards: null,
    };
  }, [accountKey, normalized.authoritativeProgress, normalized.resetEpoch, server, state.dailyXp, state.xp]);

  return (
    <InteractionXpContext.Provider value={value}>
      {children}
    </InteractionXpContext.Provider>
  );
}

export const useInteractionXp = () => {
  const value = useContext(InteractionXpContext);
  if (!value) {
    throw new Error("useInteractionXp must be used inside InteractionXpProvider");
  }
  return value;
};
