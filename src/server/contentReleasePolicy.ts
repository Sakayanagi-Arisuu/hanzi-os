import {
  CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_PACKAGE,
} from "../content/currentPackage";

export type ContentReleasePolicy = {
  manifestSha256: string;
  audience: "closed-alpha" | "public";
  lifecycle: "candidate" | "published" | "retired";
  closedAlphaEligible: boolean;
  productionEligible: boolean;
  promotionChannel: "closed-alpha" | "production" | null;
  promotionManifestSha256: string | null;
};

export const CURRENT_CONTENT_RELEASE_POLICY: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: CURRENT_CONTENT_PACKAGE.audience,
  lifecycle: CURRENT_CONTENT_PACKAGE.lifecycle,
  closedAlphaEligible: CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
  productionEligible: CURRENT_CONTENT_PACKAGE.productionEligible,
  promotionChannel: CURRENT_CONTENT_PACKAGE.promotion?.channel ?? null,
  promotionManifestSha256:
    CURRENT_CONTENT_PACKAGE.promotion?.packageManifestSha256 ?? null,
};

export const isPromotedContentReleasePolicy = (
  policy: ContentReleasePolicy,
) => policy.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
  && (policy.audience === "closed-alpha" || policy.audience === "public")
  && policy.lifecycle === "published"
  && policy.promotionManifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
  && (
    (
      policy.promotionChannel === "closed-alpha"
      && policy.closedAlphaEligible
      && !policy.productionEligible
    )
    || (
      policy.promotionChannel === "production"
      && policy.audience === "public"
      && policy.closedAlphaEligible
      && policy.productionEligible
    )
  );

export const promotedCourseReleaseState = (
  policy: ContentReleasePolicy,
): "beta" | "published" | null => {
  if (!isPromotedContentReleasePolicy(policy)) return null;
  return policy.promotionChannel === "production" ? "published" : "beta";
};
