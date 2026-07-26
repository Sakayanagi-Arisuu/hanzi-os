import type { D1Database } from "./d1";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
export {
  MAX_LEARNING_RESET_EPOCH,
  isValidLearningResetEpoch,
} from "../learning/resetEpoch";

export class LearningResetEpochConflictError extends Error {
  readonly code = "LEARNING_RESET_EPOCH_CONFLICT";

  constructor(message = "The learning command belongs to a stale reset epoch.") {
    super(message);
    this.name = "LearningResetEpochConflictError";
  }
}

export async function readCurrentLearningResetEpoch(
  database: D1Database,
  userId: string,
) {
  const row = await database.prepare(
    `SELECT document_json AS documentJson
     FROM learning_documents
     WHERE user_id = ?
     LIMIT 1`,
  ).bind(userId).first<{ documentJson: string }>();
  if (!row) return 0;
  let resetEpoch: unknown;
  try {
    const document = JSON.parse(row.documentJson) as {
      reset?: { epoch?: unknown };
    };
    resetEpoch = document.reset?.epoch ?? 0;
  } catch {
    throw new LearningResetEpochConflictError(
      "The canonical learning document is not valid JSON.",
    );
  }
  if (!isValidLearningResetEpoch(resetEpoch)) {
    throw new LearningResetEpochConflictError(
      "The canonical learning reset epoch is invalid.",
    );
  }
  return resetEpoch;
}

export async function requireCurrentLearningResetEpoch(
  database: D1Database,
  userId: string,
  resetEpoch: number,
) {
  if (!isValidLearningResetEpoch(resetEpoch)) {
    throw new LearningResetEpochConflictError(
      "The learning command reset epoch is invalid.",
    );
  }
  const current = await readCurrentLearningResetEpoch(database, userId);
  if (current !== resetEpoch) throw new LearningResetEpochConflictError();
  return current;
}

/** Correlated SQL predicate used inside D1 batches to close reset races. */
export const CURRENT_LEARNING_RESET_EPOCH_SQL =
  `COALESCE((
    SELECT CASE
      WHEN json_valid(document_json) = 0 THEN -1
      WHEN json_type(document_json, '$.reset.epoch') IS NULL THEN 0
      WHEN json_type(document_json, '$.reset.epoch') = 'integer'
        AND json_extract(document_json, '$.reset.epoch') BETWEEN 0 AND 2147483647
        THEN json_extract(document_json, '$.reset.epoch')
      ELSE -1
    END
    FROM learning_documents
    WHERE user_id = ?
    LIMIT 1
  ), 0) = ?`;
