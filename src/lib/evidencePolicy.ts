import type {
  EvidenceMethod,
  EvidenceSource,
  LearningEvidence,
  Skill,
} from "../types";

export type EvidenceTrustPolicy = {
  source: EvidenceSource;
  method: EvidenceMethod;
  skills: readonly Skill[];
  locallyVerified: boolean;
  masterySkills: readonly Skill[];
};

/**
 * One allow-list for the compatibility evidence envelope.
 *
 * `locallyVerified` means that the shipped client can deterministically check
 * the response against versioned content. It is not a server attestation.
 * Methods driven by self-report, browser speech, or client callbacks remain
 * unverified and must never update mastery before a server policy evaluates a
 * normalized attempt.
 */
export const EVIDENCE_TRUST_POLICIES = [
  {
    source: "lesson",
    method: "meaning-selection",
    skills: ["vocabulary"],
    locallyVerified: true,
    masterySkills: ["vocabulary"],
  },
  {
    source: "lesson",
    method: "phonology-recognition",
    skills: ["pronunciation"],
    locallyVerified: true,
    masterySkills: [],
  },
  {
    source: "lesson",
    method: "listening-selection",
    skills: ["listening"],
    locallyVerified: true,
    // Current lesson audio is browser TTS without an immutable reviewed asset.
    // The selected answer is objective, but it is not defensible listening
    // mastery until the content package binds the exact stimulus version.
    masterySkills: [],
  },
  {
    source: "lesson",
    method: "typed-character-recall",
    skills: ["writing"],
    locallyVerified: true,
    masterySkills: ["writing"],
  },
  {
    source: "lesson",
    method: "reading-comprehension",
    skills: ["reading", "grammar"],
    locallyVerified: true,
    masterySkills: ["reading"],
  },
  {
    source: "lesson",
    method: "lesson-completion",
    skills: [
      "pronunciation",
      "listening",
      "speaking",
      "reading",
      "writing",
      "vocabulary",
      "grammar",
    ],
    locallyVerified: true,
    masterySkills: [],
  },
  {
    source: "reader",
    method: "reading-comprehension",
    skills: ["reading"],
    // The compatibility Reader ships answer material to the public client and
    // has no immutable server-issued support/exposure session authority.
    locallyVerified: false,
    masterySkills: [],
  },
  {
    source: "writing",
    method: "stroke-quiz",
    skills: ["writing"],
    locallyVerified: false,
    masterySkills: [],
  },
  {
    source: "pronunciation",
    method: "speech-transcript",
    skills: ["pronunciation", "speaking"],
    locallyVerified: false,
    masterySkills: [],
  },
  {
    source: "mistake",
    method: "remediation-recall",
    skills: [
      "pronunciation",
      "listening",
      "speaking",
      "reading",
      "writing",
      "vocabulary",
      "grammar",
    ],
    locallyVerified: false,
    masterySkills: [],
  },
  {
    source: "review",
    method: "fsrs-rating",
    skills: ["vocabulary"],
    locallyVerified: false,
    masterySkills: [],
  },
  {
    source: "diagnostic",
    method: "diagnostic-selection",
    skills: ["pronunciation", "listening", "reading", "vocabulary", "grammar"],
    locallyVerified: true,
    // The current diagnostic is pending linguistic review and uncalibrated.
    // Its observed result may be displayed, but it cannot update mastery.
    masterySkills: [],
  },
] as const satisfies readonly EvidenceTrustPolicy[];

export const getEvidenceTrustPolicy = (
  source: EvidenceSource,
  method: EvidenceMethod,
  skill: Skill,
) => EVIDENCE_TRUST_POLICIES.find((policy) =>
  policy.source === source
  && policy.method === method
  && (policy.skills as readonly Skill[]).includes(skill)
) ?? null;

export const isEvidenceCombinationAllowed = (
  source: EvidenceSource,
  method: EvidenceMethod,
  skill: Skill,
) => Boolean(getEvidenceTrustPolicy(source, method, skill));

export const isAttemptSourceMethodAllowed = (
  source: EvidenceSource,
  method: EvidenceMethod,
) => EVIDENCE_TRUST_POLICIES.some((policy) =>
  policy.source === source && policy.method === method
);

export const isLocallyVerifiedEvidence = (
  source: EvidenceSource,
  method: EvidenceMethod,
  skill: Skill,
) => getEvidenceTrustPolicy(source, method, skill)?.locallyVerified === true;

/**
 * Compatibility helper used by deterministic projection replay. The exact
 * source/method/skill allow-list is enforced when evidence is materialized or
 * when a normalized attempt is parsed.
 */
export const isPolicyMasteryEligible = (
  method: EvidenceMethod,
  skill: Skill,
) => EVIDENCE_TRUST_POLICIES.some((policy) =>
  policy.method === method
  && (policy.masterySkills as readonly Skill[]).includes(skill)
);

/**
 * Compatibility Reader evidence is descriptive only. This normalization is
 * intentionally idempotent so persisted/cloud snapshots from older clients
 * converge without mutating their input objects.
 */
export const downgradeReaderEvidenceTrust = (
  evidence: LearningEvidence,
): LearningEvidence => {
  if (evidence.source !== "reader") return evidence;
  return {
    ...evidence,
    verified: false,
    masteryEligible: false,
    metadata: {
      ...evidence.metadata,
      measurementEligible: false,
    },
  };
};
