import {
  assessClosedAlphaEligibility as assessClosedAlphaEligibilityRuntime,
  assessPublicationEligibility as assessPublicationEligibilityRuntime,
} from "./governance.mjs";
import type {
  ContentPackageBundle,
  ContentValidationResult,
  PublicationAssessment,
} from "./types";

export const assessPublicationEligibility = assessPublicationEligibilityRuntime as (
  bundle: ContentPackageBundle,
  validation: ContentValidationResult,
) => PublicationAssessment;

export const assessClosedAlphaEligibility = assessClosedAlphaEligibilityRuntime as (
  bundle: ContentPackageBundle,
  validation: ContentValidationResult,
) => PublicationAssessment;
