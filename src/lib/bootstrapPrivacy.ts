import type { SyncPhase } from "../sync/coordinator";

/** Prevents cached learning data from rendering before owner reconciliation. */
export const shouldGateLearningBootstrap = (phase: SyncPhase) =>
  phase === "checking";
