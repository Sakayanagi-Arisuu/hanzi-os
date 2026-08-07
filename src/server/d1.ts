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

export async function getRuntimeEnvironment<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): Promise<T> {
  try {
    const runtime = await import("cloudflare:workers");
    return runtime.env as T;
  } catch {
    throw new SyncBackendUnavailableError(
      "Cloud runtime bindings are not available in this runtime.",
    );
  }
}

export async function getD1Database(): Promise<D1Database> {
  const runtimeEnv = await getRuntimeEnvironment();
  const database = (runtimeEnv as { DB?: D1Database }).DB;
  if (!database) {
    throw new SyncBackendUnavailableError(
      "Cloud sync is not configured for this deployment.",
    );
  }
  return database;
}
