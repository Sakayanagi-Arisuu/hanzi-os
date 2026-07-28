import {
  assessEditorialReadiness as assessEditorialReadinessRuntime,
} from "./governance.mjs";

/**
 * Read-only editorial projection. The implementation lives beside the release
 * policy so the dashboard cannot drift from exact manifest/catalog scope,
 * review precedence, dependency closure, self-review, character, or audio
 * readiness semantics.
 *
 * @type {(
 *   bundle: import("./types").ContentPackageBundle,
 *   validation: import("./types").ContentValidationResult,
 * ) => import("./types").EditorialReadinessReport}
 */
export const assessEditorialReadiness = (bundle, validation) =>
  assessEditorialReadinessRuntime(bundle, validation);
