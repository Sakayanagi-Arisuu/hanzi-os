import type { Skill } from "../types";

export type Sha256Digest = `sha256:${string}`;

export type ContentPackageAudience = "closed-alpha" | "public";
export type ContentPackageLifecycle = "candidate" | "published" | "retired";
export type ContentReleaseChannel = "closed-alpha" | "production";
export type ContentReleaseState = "draft" | "review" | "beta" | "published" | "retired";
export type ContentSourceArtifactName =
  | "src/data/assessment.ts"
  | "src/data/curriculum.ts"
  | "src/data/knowledgeItemBlueprints.ts"
  | "src/data/lessonGuides.ts"
  | "src/lib/exerciseGeneration.ts"
  | "src/server/attemptScoring.ts"
  | "src/server/authoritativeItemBank.ts"
  | "src/server/lessonCompletionPolicy.ts"
  | "src/server/authoritativeAssessmentItemBank.ts"
  | "src/server/assessmentScoring.ts";

export type ContentOwner = {
  id: string;
  evidenceRef: string;
};

export type SourceLicense = {
  licenseId: string;
  evidenceRef: string;
};

export type AudioRights = {
  ownerId: string;
  licenseId: string;
  evidenceRef: string;
};

export type ContentPackageManifest = {
  schemaVersion: 1;
  packageId: string;
  contentVersion: string;
  contentSchemaVersion: number;
  audience: ContentPackageAudience;
  lifecycle: ContentPackageLifecycle;
  createdAt: string;
  createdFromManifestSha256: Sha256Digest | null;
  artifacts: {
    "coverage-claims.json": Sha256Digest;
    "runtime-ids.json": Sha256Digest;
    "src/data/assessment.ts": Sha256Digest;
    "src/data/curriculum.ts": Sha256Digest;
    "src/lib/exerciseGeneration.ts": Sha256Digest;
    "src/server/attemptScoring.ts": Sha256Digest;
    "src/server/authoritativeItemBank.ts": Sha256Digest;
    "src/server/lessonCompletionPolicy.ts": Sha256Digest;
    /** Required for contentSchemaVersion >= 2. */
    "src/server/authoritativeAssessmentItemBank.ts"?: Sha256Digest;
    /** Required for contentSchemaVersion >= 2. */
    "src/server/assessmentScoring.ts"?: Sha256Digest;
    /** Required for contentSchemaVersion >= 3. */
    "item-catalog.json"?: Sha256Digest;
    /** Required for contentSchemaVersion >= 4. */
    "runtime-catalog.json"?: Sha256Digest;
    /** Required for contentSchemaVersion >= 4. */
    "src/data/knowledgeItemBlueprints.ts"?: Sha256Digest;
    /** Required for contentSchemaVersion >= 4. */
    "src/data/lessonGuides.ts"?: Sha256Digest;
  };
  governance: {
    contentOwner: ContentOwner | null;
    sourceLicense: SourceLicense | null;
    nativeLinguisticReviewRequired: true;
    includesAudio: boolean;
    audioRights: AudioRights | null;
  };
};

export type RuntimeLessonReference = {
  id: string;
  unitId: string;
  prerequisiteIds: string[];
  wordIds: string[];
  releaseState: ContentReleaseState;
};

export type RuntimeStoryReference = {
  id: string;
  wordIds: string[];
  releaseState: ContentReleaseState;
};

export type RuntimeIdArtifact = {
  schemaVersion: 1;
  contentVersion: string;
  vocabularyIds: string[];
  unitIds: string[];
  lessons: RuntimeLessonReference[];
  stories: RuntimeStoryReference[];
};

export type CoverageClaim = {
  claimId: string;
  framework: string;
  level: string;
  evidenceRef: string;
  /** Required by coverage-claims schema v2. */
  itemKeys?: string[];
  /** Required by coverage-claims schema v2. */
  entryLessonKeys?: string[];
  /** Required by coverage-claims schema v2. */
  terminalLessonKeys?: string[];
};

export type CoverageClaimsArtifact =
  | {
      schemaVersion: 1;
      contentVersion: string;
      coverageClaims: CoverageClaim[];
    }
  | {
      schemaVersion: 2;
      contentVersion: string;
      itemCatalogSha256: Sha256Digest;
      coverageClaims: Array<
        CoverageClaim & {
          itemKeys: string[];
          entryLessonKeys: string[];
          terminalLessonKeys: string[];
        }
      >;
    };

export type ContentItemType =
  | "lexeme"
  | "lesson"
  | "graded-text"
  | "grammar"
  | "pronunciation"
  | "character"
  | "communicative-function";
export type ContentItemKey = `${ContentItemType}:${string}`;

export type KnowledgeContentItemType = Exclude<
  ContentItemType,
  "lesson" | "graded-text"
>;

export type ContentItemReference = {
  itemType: ContentItemType;
  itemId: string;
};

export type KnowledgeContentItemReference = {
  itemType: KnowledgeContentItemType;
  itemId: string;
};

export type ContentItemOwner = {
  id: string;
  evidenceRef: string;
};

export type ContentItemSourceLicense = {
  licenseId: string;
  evidenceRef: string;
};

export type LexemeCatalogPayload = {
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumbered: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  examplePinyin: string;
  exampleMeaning: string;
  hsk: number;
  tags: string[];
};

export type LessonCatalogPayload = {
  unitId: string;
  title: string;
  chineseTitle: string;
  objective: string;
  minutes: number;
  xp: number;
  skills: Skill[];
  wordIds: string[];
};

export type GradedTextCatalogPayload = {
  level: string;
  title: string;
  chineseTitle: string;
  summary: string;
  estimatedMinutes: number;
  sentences: Array<{
    chinese: string;
    pinyin: string;
    translation: string;
    wordIds: string[];
  }>;
  comprehension: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
};

export type CatalogExample = {
  chinese: string;
  pinyin: string;
  meaning: string;
};

export type GrammarCatalogPayload = {
  concept: string;
  rule: string;
  examples: CatalogExample[];
  pitfall: string;
  checkpoint: string;
  sourceLessonIds: string[];
};

export type PronunciationCatalogPayload = {
  targetKind: "tone-system" | "initial-contrast" | "tone-sandhi";
  targets: string[];
  concept: string;
  rule: string;
  examples: CatalogExample[];
  pitfall: string;
  checkpoint: string;
  sourceLessonIds: string[];
};

export type CharacterCatalogPayload = {
  character: string;
  traditional: string;
  pinyin: string;
  meaning: string;
  sourceLexemeIds: string[];
  radical: string | null;
  strokeCount: number | null;
  components: string[] | null;
  structure: string | null;
  strokeDataRef: string | null;
  strokeDataSha256: Sha256Digest | null;
};

export type CommunicativeFunctionCatalogPayload = {
  canDo: string;
  context: string;
  examples: CatalogExample[];
  sourceLessonIds: string[];
};

type ContentCatalogItemBase = {
  itemId: string;
  itemVersion: string;
  releaseState: ContentReleaseState;
  payloadSha256: Sha256Digest;
  owner: ContentItemOwner | null;
  sourceLicense: ContentItemSourceLicense | null;
  /** null means the prerequisite mapping still needs an editorial decision. */
  prerequisites: ContentItemReference[] | null;
};

export type LexemeCatalogItem = ContentCatalogItemBase & {
  itemKey: `lexeme:${string}`;
  itemType: "lexeme";
  payload: LexemeCatalogPayload;
};

export type LessonCatalogItemV1 = ContentCatalogItemBase & {
  itemKey: `lesson:${string}`;
  itemType: "lesson";
  payload: LessonCatalogPayload;
  knowledgeItems?: never;
};

export type LessonCatalogItemV2 = ContentCatalogItemBase & {
  itemKey: `lesson:${string}`;
  itemType: "lesson";
  payload: LessonCatalogPayload;
  knowledgeItems: KnowledgeContentItemReference[];
};

export type GradedTextCatalogItem = ContentCatalogItemBase & {
  itemKey: `graded-text:${string}`;
  itemType: "graded-text";
  payload: GradedTextCatalogPayload;
};

export type KnowledgeContentCatalogItem =
  | (ContentCatalogItemBase & {
      itemKey: `grammar:${string}`;
      itemType: "grammar";
      payload: GrammarCatalogPayload;
    })
  | (ContentCatalogItemBase & {
      itemKey: `pronunciation:${string}`;
      itemType: "pronunciation";
      payload: PronunciationCatalogPayload;
    })
  | (ContentCatalogItemBase & {
      itemKey: `character:${string}`;
      itemType: "character";
      payload: CharacterCatalogPayload;
    })
  | (ContentCatalogItemBase & {
      itemKey: `communicative-function:${string}`;
      itemType: "communicative-function";
      payload: CommunicativeFunctionCatalogPayload;
    });

export type ContentCatalogItemV1 =
  | LexemeCatalogItem
  | LessonCatalogItemV1
  | GradedTextCatalogItem;

export type ContentCatalogItemV2 =
  | LexemeCatalogItem
  | LessonCatalogItemV2
  | GradedTextCatalogItem
  | KnowledgeContentCatalogItem;

export type ContentCatalogItem =
  | ContentCatalogItemV1
  | ContentCatalogItemV2;

export type ReleasedContentState = Extract<
  ContentReleaseState,
  "beta" | "published"
>;

export type RuntimeCatalogVocabularyItem = LexemeCatalogPayload & {
  id: string;
};

export type RuntimeCatalogLesson = LessonCatalogPayload & {
  id: string;
  prerequisiteIds: string[];
  releaseState: ReleasedContentState;
  contentVersion: string;
};

export type RuntimeCatalogStory = GradedTextCatalogPayload & {
  id: string;
  releaseState: ReleasedContentState;
  contentVersion: string;
};

export type RuntimeCatalogArtifact = {
  schemaVersion: 1;
  contentVersion: string;
  vocabulary: RuntimeCatalogVocabularyItem[];
  lessons: RuntimeCatalogLesson[];
  stories: RuntimeCatalogStory[];
};

/*
 * Keep the schema-version relationship explicit: schema v1 contains only the
 * original core item types, while schema v2 requires every lesson to declare
 * its first-class knowledge-item references.
 */
export type ItemCatalogArtifact =
  | {
      schemaVersion: 1;
      contentVersion: string;
      items: ContentCatalogItemV1[];
      audioAssets: CatalogAudioAsset[];
    }
  | {
      schemaVersion: 2;
      contentVersion: string;
      items: ContentCatalogItemV2[];
      audioAssets: CatalogAudioAsset[];
    };

export type CatalogAudioAsset = {
  assetId: string;
  targetItemKey: ContentItemKey;
  targetPayloadSha256: Sha256Digest;
  fileRef: string;
  fileSha256: Sha256Digest;
  transcript: string;
  transcriptSha256: Sha256Digest;
  speaker: {
    id: string;
    nativeSpeakerEvidenceRef: string;
  };
  rights: AudioRights;
};

export type ReviewRole =
  | "content-owner"
  | "native-linguistic"
  | "source-license"
  | "audio-rights";

export type ContentReview = {
  reviewId: string;
  role: ReviewRole;
  decision: "approved" | "changes-requested";
  reviewerId: string;
  reviewedAt: string;
  evidenceRef: string;
  packageManifestSha256: Sha256Digest;
  /** Required by reviews schema v2. Wildcards are intentionally unsupported. */
  scope?: {
    itemCatalogSha256: Sha256Digest;
    itemKeys: ContentItemKey[];
    audioAssetIds: string[];
  };
};

export type ContentReviewArtifact =
  | {
      schemaVersion: 1;
      contentVersion: string;
      packageManifestSha256: Sha256Digest;
      reviews: ContentReview[];
    }
  | {
      schemaVersion: 2;
      contentVersion: string;
      packageManifestSha256: Sha256Digest;
      itemCatalogSha256: Sha256Digest;
      reviews: Array<
        ContentReview & {
          scope: {
            itemCatalogSha256: Sha256Digest;
            itemKeys: ContentItemKey[];
            audioAssetIds: string[];
          };
        }
      >;
    };

export type ContentRegistryEntry = {
  packageId: string;
  contentVersion: string;
  relativePath: string;
  manifestSha256: Sha256Digest;
  audience: ContentPackageAudience;
  lifecycle: ContentPackageLifecycle;
  closedAlphaEligible: boolean;
  productionEligible: boolean;
  promotion: {
    channel: ContentReleaseChannel;
    actorId: string;
    promotedAt: string;
    packageManifestSha256: Sha256Digest;
    reviewEnvelopeSha256: Sha256Digest;
  } | null;
};

export type ContentRegistry = {
  schemaVersion: 1;
  currentContentVersion: string;
  packages: ContentRegistryEntry[];
};

export type ContentPackageBundle = {
  registry: ContentRegistry;
  registryEntry: ContentRegistryEntry;
  manifest: ContentPackageManifest;
  runtimeIds: RuntimeIdArtifact;
  itemCatalog: ItemCatalogArtifact | null;
  runtimeCatalog: RuntimeCatalogArtifact | null;
  coverageClaims: CoverageClaimsArtifact;
  reviews: ContentReviewArtifact;
  audioAssetFileHashes: Record<string, Sha256Digest | null>;
  immutableSourceTexts: Partial<Record<ContentSourceArtifactName, string | null>>;
  runtimeContentVersion: string | null;
  runtimeAssessmentSourceText: string | null;
  runtimeSourceText: string | null;
  runtimeKnowledgeItemBlueprintsSourceText: string | null;
  runtimeLessonGuidesSourceText: string | null;
  runtimeExerciseGenerationSourceText: string | null;
  runtimeAttemptScoringSourceText: string | null;
  runtimeAuthoritativeItemBankSourceText: string | null;
  runtimeLessonCompletionPolicySourceText: string | null;
  runtimeAuthoritativeAssessmentItemBankSourceText: string | null;
  runtimeAssessmentScoringSourceText: string | null;
};

export type ContentValidationResult = {
  errors: string[];
  warnings: string[];
  hashes: {
    manifest: Sha256Digest;
    runtimeIds: Sha256Digest;
    itemCatalog: Sha256Digest | null;
    runtimeCatalog: Sha256Digest | null;
    coverageClaims: Sha256Digest;
    reviews: Sha256Digest;
    assessmentSource: Sha256Digest | null;
    runtimeSource: Sha256Digest | null;
    knowledgeItemBlueprintsSource: Sha256Digest | null;
    lessonGuidesSource: Sha256Digest | null;
    exerciseGenerationSource: Sha256Digest | null;
    attemptScoringSource: Sha256Digest | null;
    authoritativeItemBankSource: Sha256Digest | null;
    lessonCompletionPolicySource: Sha256Digest | null;
    authoritativeAssessmentItemBankSource: Sha256Digest | null;
    assessmentScoringSource: Sha256Digest | null;
  };
};

export type PublicationAssessment = {
  channel: ContentReleaseChannel;
  eligible: boolean;
  blockers: string[];
  warnings: string[];
  missingMetadata: string[];
  staleReviewIds: string[];
};
