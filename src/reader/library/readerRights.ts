import type { ReaderSeries } from "./readerContentModel";
import { READER_SHELF_SERIES } from "./readerShelfCatalog";

export type ReaderRightsRecord = {
  contentId: string;
  sourceType: "original-hanzi-os" | "legacy-hanzi-os" | "runtime-synthetic";
  author: string;
  translator: string;
  illustrator: string;
  narrator: string;
  canonicalSourceUrl: string;
  sourceEdition: string;
  licenseId: string;
  licenseUrl: string;
  commercialUseAllowed: boolean;
  derivativesAllowed: boolean;
  shareAlikeRequired: boolean;
  attributionText: string;
  changesMade: string;
  textRights: string;
  translationRights: string;
  imageRights: string;
  audioRights: string;
  jurisdictionsChecked: string[];
  contractOrEvidencePath: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  humanReviewed: false;
};

const original = (
  contentId: string,
  overrides: Partial<ReaderRightsRecord> = {},
): ReaderRightsRecord => ({
  contentId,
  sourceType: "original-hanzi-os",
  author: "HANZI.OS editorial · AI-assisted draft",
  translator: "HANZI.OS editorial · AI-assisted draft",
  illustrator: "HANZI.OS code-native artwork",
  narrator: "Không có bản ghi âm; trình duyệt chỉ cung cấp TTS tổng hợp tùy chọn",
  canonicalSourceUrl: `hanzi-os:reader:${contentId}`,
  sourceEdition: "reader-pilot-2026.08.2",
  licenseId: "HANZI-OS-LOCAL-DRAFT-ALL-RIGHTS-RESERVED",
  licenseUrl: "hanzi-os:legal:reader-local-draft",
  commercialUseAllowed: false,
  derivativesAllowed: true,
  shareAlikeRequired: false,
  attributionText: "Nội dung nguyên bản HANZI.OS · bản nháp có AI hỗ trợ, chưa được người biên tập duyệt.",
  changesMade: "Bản thảo đầu tiên cho pilot local-first.",
  textRights: "Nguyên bản tạo riêng cho dự án; chưa qua rà soát pháp lý thương mại.",
  translationRights: "Bản dịch tiếng Việt nguyên bản đi cùng bản thảo.",
  imageRights: "Minh họa bìa tạo mới riêng cho dự án; lớp tiêu đề dựng bằng HTML/CSS.",
  audioRights: "Không phân phối audio; TTS trình duyệt không phải tài sản nội dung.",
  jurisdictionsChecked: ["local-study-only; legal-review-pending"],
  contractOrEvidencePath: "src/reader/library/readerRights.ts",
  reviewedBy: null,
  reviewedAt: null,
  humanReviewed: false,
  ...overrides,
});

const chapterIds = Array.from({ length: 10 }, (_, index) => index + 1).map((number) =>
  `reader-chapter:jade-lantern-archive-c${String(number).padStart(2, "0")}`
);

const shelfRights = READER_SHELF_SERIES.flatMap((series) => {
  const chapterIds = series.volumes.flatMap((volume) =>
    volume.chapters.map((chapter) => chapter.rightsManifestId)
  );
  return [
    original(series.source.rightsManifestId, {
      changesMade: "Bản mở đầu nguyên bản và metadata thể loại cho thư khố local-first.",
    }),
    ...chapterIds.map((contentId) => original(contentId, {
      changesMade: "Chương mở đầu nguyên bản có Trung–Pinyin–Việt căn chỉnh.",
    })),
    original(series.coverAsset.rightsManifestId, {
      author: "Không áp dụng",
      translator: "Không áp dụng",
      illustrator: "OpenAI built-in image generation · HANZI.OS art direction",
      changesMade: "Minh họa nguyên bản không chữ, tối ưu WebP; tên sách và ấn ký dựng bằng HTML/CSS.",
      imageRights: "Ảnh tạo mới riêng cho dự án bằng OpenAI built-in image generation; không mô phỏng IP hay bìa sách cụ thể.",
    }),
  ];
});

export const READER_RIGHTS_MANIFEST: ReaderRightsRecord[] = [
  original("reader-series:jade-lantern-archive"),
  ...chapterIds.map((contentId) => original(contentId)),
  original("reader-cover:jade-lantern-archive", {
    illustrator: "OpenAI built-in image generation · HANZI.OS art direction",
    changesMade: "Minh họa thư các ngọc nguyên bản không chữ, tối ưu WebP; tiêu đề dựng bằng HTML/CSS.",
    imageRights: "Ảnh tạo mới riêng cho dự án bằng OpenAI built-in image generation; không mô phỏng IP hay bìa sách cụ thể.",
  }),
  ...shelfRights,
  original("reader-series:first-day", {
    sourceType: "legacy-hanzi-os",
    author: "HANZI.OS legacy local content",
    translator: "HANZI.OS legacy local content",
    changesMade: "Chiếu nội dung first-day sang mô hình thư viện; giữ nguyên stable story ID.",
    textRights: "Nội dung HANZI.OS đã có trong runtime local.",
    translationRights: "Bản dịch HANZI.OS đã có trong runtime local.",
  }),
  original("reader-chapter:first-day", {
    sourceType: "legacy-hanzi-os",
    author: "HANZI.OS legacy local content",
    translator: "HANZI.OS legacy local content",
    changesMade: "Giữ nguyên câu chữ và stable story ID first-day.",
  }),
  original("reader-cover:first-day", {
    sourceType: "legacy-hanzi-os",
    author: "Không áp dụng",
    translator: "Không áp dụng",
    changesMade: "Tạo bìa SVG code-native mới cho truyện ngắn cũ.",
  }),
  original("reader-audio:browser-tts-fallback", {
    sourceType: "runtime-synthetic",
    author: "Không áp dụng",
    translator: "Không áp dụng",
    illustrator: "Không áp dụng",
    narrator: "SpeechSynthesis voice do hệ điều hành/trình duyệt cung cấp",
    canonicalSourceUrl: "hanzi-os:runtime:browser-speech-synthesis",
    licenseId: "RUNTIME-ONLY-NO-DISTRIBUTED-AUDIO",
    licenseUrl: "hanzi-os:legal:runtime-tts",
    derivativesAllowed: false,
    attributionText: "Giọng tổng hợp của thiết bị; không phải audio bản ngữ và không tạo evidence phát âm.",
    changesMade: "Không lưu hoặc phân phối tệp audio.",
    textRights: "Không áp dụng",
    translationRights: "Không áp dụng",
    imageRights: "Không áp dụng",
    audioRights: "Runtime fallback only; no bundled recording.",
  }),
];

const nonEmpty = (value: string) => value.trim().length > 0;

export const validateReaderRightsManifest = (
  records: readonly ReaderRightsRecord[],
  seriesCatalog: readonly ReaderSeries[],
) => {
  const errors: string[] = [];
  const byId = new Map<string, ReaderRightsRecord>();
  records.forEach((record) => {
    if (!nonEmpty(record.contentId) || byId.has(record.contentId)) {
      errors.push(`Duplicate or empty rights contentId: ${record.contentId}`);
    }
    byId.set(record.contentId, record);
    const requiredStrings = [
      record.sourceType,
      record.author,
      record.translator,
      record.illustrator,
      record.narrator,
      record.canonicalSourceUrl,
      record.sourceEdition,
      record.licenseId,
      record.licenseUrl,
      record.attributionText,
      record.changesMade,
      record.textRights,
      record.translationRights,
      record.imageRights,
      record.audioRights,
      record.contractOrEvidencePath,
    ];
    if (requiredStrings.some((value) => !nonEmpty(value))) {
      errors.push(`Rights record ${record.contentId} is missing a required field.`);
    }
    if (record.jurisdictionsChecked.length === 0) {
      errors.push(`Rights record ${record.contentId} has no jurisdiction status.`);
    }
    if (record.humanReviewed !== false) {
      errors.push(`Rights record ${record.contentId} must remain humanReviewed:false.`);
    }
  });

  seriesCatalog.forEach((series) => {
    const requiredIds = [
      series.source.rightsManifestId,
      series.coverAsset.rightsManifestId,
      ...series.volumes.flatMap((volume) =>
        volume.chapters.map((chapter) => chapter.rightsManifestId)
      ),
    ];
    requiredIds.forEach((rightsId) => {
      if (!byId.has(rightsId)) {
        errors.push(`Catalog content ${series.seriesId} references missing rights ${rightsId}.`);
      }
    });
  });
  if (!byId.has("reader-audio:browser-tts-fallback")) {
    errors.push("Browser TTS fallback rights disclosure is missing.");
  }
  return { ok: errors.length === 0, errors } as const;
};

export const assertValidReaderRightsManifest = (
  records: readonly ReaderRightsRecord[],
  seriesCatalog: readonly ReaderSeries[],
) => {
  const result = validateReaderRightsManifest(records, seriesCatalog);
  if (!result.ok) throw new Error(result.errors.join("\n"));
};
