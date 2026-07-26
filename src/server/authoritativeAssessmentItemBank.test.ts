import { describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
  FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
  selectAuthoritativeAssessmentForm,
  type AuthoritativeAssessmentItem,
} from "./authoritativeAssessmentItemBank";

const approvedBank = () => CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS.map(
  (item, index): AuthoritativeAssessmentItem => ({
    ...item,
    id: `approved-${index}`,
    itemVersion: `${CONTENT_VERSION}:approved-assessment:${index}:1`,
    equivalentGroupId: `approved-equivalent:${index}`,
    exposureGroupId: `approved-exposure:${index}`,
    reviewStatus: "approved",
    answerExposure: "server-confidential",
    prompt: `Fixture prompt ${index}`,
    meta: `Fixture meta ${index}`,
    options: [`fixture-${index}-a`, `fixture-${index}-b`],
    correctAnswer: `fixture-${index}-a`,
    ...(item.modality === "synthetic-tts-selection"
      ? { stimulusText: `fixture-audio-${index}` }
      : {}),
  }),
);

describe("server-only authoritative assessment bank", () => {
  it("keeps every real current candidate pending and therefore unissuable", () => {
    expect(CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS).toHaveLength(10);
    expect(CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS.every(
      (item) => item.reviewStatus === "pending",
    )).toBe(true);
    expect(CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS.every(
      (item) => item.answerExposure === "public-client",
    )).toBe(true);
    expect(selectAuthoritativeAssessmentForm({
      bank: CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    })).toMatchObject({ kind: "insufficient-bank", availableItemCount: 0 });
  });

  it("does not issue publicly exposed answers when review status alone changes", () => {
    const relabeled = CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS.map((item) => ({
      ...item,
      reviewStatus: "approved" as const,
    }));
    expect(selectAuthoritativeAssessmentForm({
      bank: relabeled,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    })).toMatchObject({ kind: "insufficient-bank", availableItemCount: 0 });
  });

  it("issues only an approved, answer-free complete fixture form", () => {
    const selected = selectAuthoritativeAssessmentForm({
      bank: approvedBank(),
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    });
    expect(selected.kind).toBe("selected");
    if (selected.kind !== "selected") return;
    expect(selected.form.items).toHaveLength(10);
    expect(JSON.stringify(selected.form)).not.toMatch(
      /correctAnswer|answerKey|explanation/iu,
    );
    expect(selected.form.items.map((item) => item.position)).toEqual(
      Array.from({ length: 10 }, (_, index) => index),
    );
  });

  it("fails closed for exposed groups and invalid measurement provenance", () => {
    const bank = approvedBank();
    expect(selectAuthoritativeAssessmentForm({
      bank,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set([bank[0]!.exposureGroupId]),
      random: () => 0.5,
    }).kind).toBe("insufficient-bank");

    const syntheticIndex = bank.findIndex(
      (item) => item.modality === "synthetic-tts-selection",
    );
    const invalidSynthetic = bank.map((item, index) => index === syntheticIndex
      ? { ...item, measurementEligible: true }
      : item);
    expect(selectAuthoritativeAssessmentForm({
      bank: invalidSynthetic,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    }).kind).toBe("insufficient-bank");

    const calibrated = bank.map((item, index) => index === 0
      ? { ...item, calibrationStatus: "calibrated" as const, difficulty: 0 }
      : item);
    expect(selectAuthoritativeAssessmentForm({
      bank: calibrated,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    }).kind).toBe("insufficient-bank");
  });

  it("fails closed for protocol-invalid presentation fields", () => {
    const equivalentOptions = approvedBank().map((item, index) => index === 0
      ? { ...item, options: ["é", " e\u0301 "] }
      : item);
    expect(selectAuthoritativeAssessmentForm({
      bank: equivalentOptions,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    }).kind).toBe("insufficient-bank");

    const oversizedItemId = approvedBank().map((item, index) => index === 0
      ? { ...item, id: "i".repeat(241) }
      : item);
    expect(selectAuthoritativeAssessmentForm({
      bank: oversizedItemId,
      blueprint: FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
      exposedGroups: new Set(),
      random: () => 0.5,
    }).kind).toBe("insufficient-bank");
  });
});
