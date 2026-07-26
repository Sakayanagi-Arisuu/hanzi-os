import {
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_PACKAGE,
} from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  promotedCourseReleaseState,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import type { D1Database } from "./d1";

export class CourseVersionBindingError extends Error {
  readonly code = "COURSE_VERSION_BINDING_CONFLICT";
}

/**
 * Ensure the D1 foreign-key anchor refers to the exact immutable package.
 * An existing row with another manifest hash is never updated in place: the
 * content version must be bumped and migrated instead.
 */
export const ensureCurrentCourseVersion = async (
  database: D1Database,
  releasePolicy: ContentReleasePolicy = CURRENT_CONTENT_RELEASE_POLICY,
) => {
  const timestamp = Date.now();
  await database
    .prepare(
      "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'review', 'pending', ?)",
    )
    .bind(
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
      timestamp,
    )
    .run();

  const promotedState = promotedCourseReleaseState(releasePolicy);
  if (promotedState !== null) {
    await database
      .prepare(
        `UPDATE course_versions
         SET release_state = ?,
             linguistic_review_status = 'approved',
             published_at = COALESCE(published_at, ?)
         WHERE id = ?
           AND manifest_hash = ?
           AND (
             (release_state = 'review' AND linguistic_review_status = 'pending')
             OR (release_state = 'beta' AND linguistic_review_status = 'approved' AND ? = 'published')
             OR (release_state = ? AND linguistic_review_status = 'approved')
           )`,
      )
      .bind(
        promotedState,
        timestamp,
        CONTENT_VERSION,
        CURRENT_CONTENT_MANIFEST_SHA256,
        promotedState,
        promotedState,
      )
      .run();
  }

  const stored = await database
    .prepare(
      "SELECT manifest_hash AS manifestHash, release_state AS releaseState, linguistic_review_status AS linguisticReviewStatus FROM course_versions WHERE id = ? LIMIT 1",
    )
    .bind(CONTENT_VERSION)
    .first<{
      manifestHash: string;
      releaseState: string;
      linguisticReviewStatus: string;
    }>();

  if (
    !stored
    || stored.manifestHash !== CURRENT_CONTENT_MANIFEST_SHA256
    || (
      promotedState !== null
      && (
        stored.releaseState !== promotedState
        || stored.linguisticReviewStatus !== "approved"
      )
    )
  ) {
    throw new CourseVersionBindingError(
      `Course version ${CONTENT_VERSION} is not bound to manifest ${CURRENT_CONTENT_PACKAGE.manifestSha256}.`,
    );
  }
};
