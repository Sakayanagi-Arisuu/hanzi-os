import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  isPromotedContentReleasePolicy,
  promotedCourseReleaseState,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";

const alphaPolicy: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

describe("runtime content release policy", () => {
  it("accepts an exact-hash closed-alpha promotion without calling it production", () => {
    expect(isPromotedContentReleasePolicy(alphaPolicy)).toBe(true);
    expect(promotedCourseReleaseState(alphaPolicy)).toBe("beta");
  });

  it("accepts production only for a public package promoted to production", () => {
    const productionPolicy: ContentReleasePolicy = {
      ...alphaPolicy,
      audience: "public",
      productionEligible: true,
      promotionChannel: "production",
    };
    expect(isPromotedContentReleasePolicy(productionPolicy)).toBe(true);
    expect(promotedCourseReleaseState(productionPolicy)).toBe("published");

    expect(isPromotedContentReleasePolicy({
      ...productionPolicy,
      audience: "closed-alpha",
    })).toBe(false);
  });

  it("fails closed on channel, lifecycle, or manifest mismatches", () => {
    expect(isPromotedContentReleasePolicy({
      ...alphaPolicy,
      promotionChannel: "production",
    })).toBe(false);
    expect(isPromotedContentReleasePolicy({
      ...alphaPolicy,
      lifecycle: "candidate",
    })).toBe(false);
    expect(isPromotedContentReleasePolicy({
      ...alphaPolicy,
      promotionManifestSha256: "sha256:stale",
    })).toBe(false);
  });
});
