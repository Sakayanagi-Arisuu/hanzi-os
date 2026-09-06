export const READER_CONTENT_VERSION = "reader-pilot-2026.08.3" as const;

export type ReaderShelfId =
  | "flagship"
  | "tu-tien"
  | "trung-sinh"
  | "light-novel"
  | "bi-an"
  | "khoa-huyen"
  | "triet-ly"
  | "vo-hiep"
  | "doi-song"
  | "legacy";

export type ReaderCoverTone =
  | "jade"
  | "ember"
  | "violet"
  | "azure"
  | "copper"
  | "indigo"
  | "rose"
  | "slate";

export type ReaderLevelBand = {
  min: "HSK0" | "HSK1" | "HSK2" | "HSK3" | "HSK4";
  max: "HSK0" | "HSK1" | "HSK2" | "HSK3" | "HSK4";
  label: string;
};

export type ReaderRightsReference = {
  rightsManifestId: string;
  sourceType: "original-hanzi-os" | "licensed-third-party" | "legacy-hanzi-os";
  provenanceNote: string;
};

export type ReaderChapterBackgroundAsset = {
  kind: "image";
  src: string;
  altVi: string;
  focalPoint: "left" | "center" | "right";
  rightsManifestId: string;
};

export type ReaderToken = {
  kind: "token";
  sequence: number;
  surface: string;
  lexemeId?: string;
  referenceEntryId?: string;
};

export type ReaderTextSegment = {
  kind: "text";
  sequence: number;
  text: string;
};

export type ReaderParagraphSegment = ReaderToken | ReaderTextSegment;

export type ReaderParagraph = {
  paragraphId: string;
  zhHans: string;
  zhHant?: string;
  pinyin: string;
  vi: string;
  segments: ReaderParagraphSegment[];
};

export type ReaderComprehensionQuestion = {
  questionId: string;
  promptVi: string;
  options: string[];
  answerIndex: number;
  explanationVi: string;
};

export type ReaderChapter = {
  chapterId: string;
  version: string;
  seriesId: string;
  chapterNumber: number;
  titleZh: string;
  titleVi: string;
  estimatedMinutes: number;
  backgroundAsset?: ReaderChapterBackgroundAsset;
  paragraphs: ReaderParagraph[];
  comprehension?: ReaderComprehensionQuestion[];
  relatedLessonIds: string[];
  publicationStatus: "released-local";
  reviewStatus: "ai-assisted-draft" | "legacy-local";
  humanReviewed: false;
  rights: ReaderRightsReference;
};

export type ReaderChapterSummary = Omit<
  ReaderChapter,
  "paragraphs" | "comprehension" | "relatedLessonIds" | "rights"
> & {
  hookVi: string;
  relatedLessonIds: string[];
  rightsManifestId: string;
  comprehensionCount?: number;
};

export type ReaderSeries = {
  seriesId: string;
  version: string;
  titleZh: string;
  titleVi: string;
  synopsisVi: string;
  hookVi: string;
  genreIds: string[];
  shelfId: ReaderShelfId;
  discoverable: boolean;
  levelBand: ReaderLevelBand;
  coverAsset: {
    kind: "image" | "code-native" | "art-directed";
    src?: string;
    sigil?: string;
    tone: ReaderCoverTone;
    altVi: string;
    rightsManifestId: string;
  };
  source: ReaderRightsReference;
  volumes: Array<{
    volumeId: string;
    titleZh: string;
    titleVi: string;
    chapters: ReaderChapterSummary[];
  }>;
  focusLexemeIds: string[];
  publicationStatus: "released-local";
  humanReviewed: false;
};

export const readerSeriesChapters = (series: ReaderSeries) =>
  series.volumes.flatMap((volume) => volume.chapters);

export const readerChapterIdentity = (
  seriesId: string,
  chapterId: string,
) => `${seriesId}::${chapterId}`;
