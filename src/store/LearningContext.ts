import { createContext, useContext } from "react";
import { resolveDevelopmentSingleton } from "../lib/developmentContext";
import type { LearningState } from "../types";
import type { LearningSyncStatus } from "../sync/coordinator";
import type { StoredStateSource } from "../lib/stateStorageRecovery";
import type { LearningActions } from "./LearningStore";

export type LearningContextValue = {
  state: LearningState;
  actions: LearningActions;
  dueWordIds: string[];
  level: number;
  sync: LearningSyncStatus;
  stateLoadSource: StoredStateSource;
};

// Keep the provider and its lightweight consumers on the same HMR identity.
export const LearningContext = resolveDevelopmentSingleton(
  globalThis as unknown as Record<PropertyKey, unknown>,
  Symbol.for("hanzi-os.learning-context.v1"),
  () => createContext<LearningContextValue | null>(null),
  process.env.NODE_ENV === "development",
);

export const useLearning = () => {
  const value = useContext(LearningContext);
  if (!value) throw new Error("useLearning must be used inside LearningProvider");
  return value;
};
