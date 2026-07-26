export type D1RunMeta = {
  changes?: number;
  last_row_id?: number;
};

export type D1RunResult<T = Record<string, unknown>> = {
  success: boolean;
  results?: T[];
  meta?: D1RunMeta;
  error?: string;
};

export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1RunResult<T>>;
  run<T = Record<string, unknown>>(): Promise<D1RunResult<T>>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>>;
};

export class SyncBackendUnavailableError extends Error {
  readonly code = "SYNC_BACKEND_UNAVAILABLE";
}

export async function getD1Database(): Promise<D1Database> {
  let runtimeEnv: Record<string, unknown>;
  try {
    ({ env: runtimeEnv } = await import("cloudflare:workers"));
  } catch {
    throw new SyncBackendUnavailableError(
      "Cloud sync is not available in this runtime.",
    );
  }
  const database = (runtimeEnv as { DB?: D1Database }).DB;
  if (!database) {
    throw new SyncBackendUnavailableError(
      "Cloud sync is not configured for this deployment.",
    );
  }
  return database;
}
