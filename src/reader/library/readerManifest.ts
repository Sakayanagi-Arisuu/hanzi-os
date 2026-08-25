import {
  READER_CONTENT_VERSION,
  type ReaderChapterSummary,
  type ReaderSeries,
} from "./readerContentModel";
import { readerChapterBackground } from "./readerChapterArtwork";
import {
  assertValidReaderRightsManifest,
  READER_RIGHTS_MANIFEST,
} from "./readerRights";
import { READER_SHELF_SERIES } from "./readerShelfCatalog";
import { createReaderArcSummaries } from "./readerStoryArcs";

const JADE_COVER_SRC = "/reader/covers/m3/jade-lantern-archive.webp";
const JADE_COVER_RIGHTS_ID = "reader-cover:jade-lantern-archive";

const jadeChapter = (
  chapterNumber: number,
  titleZh: string,
  titleVi: string,
  hookVi: string,
  estimatedMinutes: number,
  relatedLessonIds: string[],
): ReaderChapterSummary => ({
  chapterId: `jade-lantern-archive-c0${chapterNumber}`,
  version: `${READER_CONTENT_VERSION}:jade-lantern-archive-c0${chapterNumber}:1`,
  seriesId: "jade-lantern-archive",
  chapterNumber,
  titleZh,
  titleVi,
  hookVi,
  estimatedMinutes: Math.max(12, estimatedMinutes),
  backgroundAsset: readerChapterBackground({
    seriesId: "jade-lantern-archive",
    seriesTitleVi: "Thư Các Thanh Đăng",
    chapterId: `jade-lantern-archive-c0${chapterNumber}`,
    chapterTitleVi: titleVi,
    coverSrc: JADE_COVER_SRC,
    coverRightsManifestId: JADE_COVER_RIGHTS_ID,
  }),
  relatedLessonIds,
  publicationStatus: "released-local",
  reviewStatus: "ai-assisted-draft",
  humanReviewed: false,
  rightsManifestId: `reader-chapter:jade-lantern-archive-c0${chapterNumber}`,
});

export const READER_SERIES_CATALOG: ReaderSeries[] = [
  {
    seriesId: "jade-lantern-archive",
    version: `${READER_CONTENT_VERSION}:jade-lantern-archive:1`,
    titleZh: "青灯书阁",
    titleVi: "Thư Các Thanh Đăng",
    synopsisVi: "Lục Minh nhận việc trực đêm tại một thư viện tưởng đã đóng cửa. Một cuốn sách biết tên cậu giao nhiệm vụ tìm sáu trang thất lạc trước khi tiếng chuông thứ ba vang lên — nếu không, ký ức của cả thành phố sẽ bị viết lại.",
    hookVi: "Mỗi trang được tìm thấy trả lại một ký ức, nhưng cũng đánh thức thứ đang ngủ dưới thư các.",
    genreIds: ["Hệ thống", "Tu luyện", "Bí ẩn"],
    shelfId: "flagship",
    discoverable: true,
    levelBand: { min: "HSK2", max: "HSK3", label: "HSK2–3 · độ khó gợi ý" },
    coverAsset: {
      kind: "art-directed",
      src: JADE_COVER_SRC,
      sigil: "阁",
      tone: "jade",
      altVi: "Thư các ngọc khổng lồ mở giữa đêm, những trang sách phát sáng cuộn thành dòng sông",
      rightsManifestId: JADE_COVER_RIGHTS_ID,
    },
    source: {
      rightsManifestId: "reader-series:jade-lantern-archive",
      sourceType: "original-hanzi-os",
      provenanceNote: "Serial nguyên bản soạn cho HANZI.OS; AI-assisted, humanReviewed:false.",
    },
    volumes: [{
      volumeId: "jade-lantern-archive-v01",
      titleZh: "第一卷：失页之夜",
      titleVi: "Quyển I · Đêm những trang thất lạc",
      chapters: [
        jadeChapter(1, "会写名字的书", "Cuốn sách viết được tên", "Lục Minh nhận nhiệm vụ đầu tiên từ một cuốn sách trống.", 8, ["hsk2-aspect-time-experience-lesson-01"]),
        jadeChapter(2, "书架后面的门", "Cánh cửa sau giá sách", "Một chiếc chìa khóa lạnh dẫn hai người vào tầng không có trên bản đồ.", 8, ["hsk2-reference-description-comparison-lesson-02"]),
        jadeChapter(3, "倒着走的时间", "Thời gian đi ngược", "Trong căn phòng đảo chiều, quên một việc có thể là cách duy nhất để nhớ đúng.", 9, ["hsk3-main-idea-detail-notes-lesson-01"]),
        jadeChapter(4, "没有字的记录", "Bản ghi không có chữ", "Người quản thư nói ra sự thật về sáu trang và cái giá của người giữ trang.", 9, ["hsk3-main-idea-detail-notes-lesson-02"]),
        jadeChapter(5, "墨潮来了", "Thủy triều mực kéo đến", "Khi mực đen nuốt lối ra, Lục Minh phải chọn giữa trang sách và một người bạn.", 10, ["hsk3-event-retelling-lesson-01"]),
        jadeChapter(6, "第三声钟响以后", "Sau tiếng chuông thứ ba", "Sáu trang trở về, arc đầu khép lại — nhưng một bản đồ mới vừa sáng lên dưới dòng sông.", 10, ["hsk3-guided-paragraph-lesson-01"]),
        ...createReaderArcSummaries("jade-lantern-archive", ["hsk3-guided-paragraph-lesson-01"], 7)
          .map((chapter) => ({
            ...chapter,
            estimatedMinutes: Math.max(12, chapter.estimatedMinutes),
            backgroundAsset: readerChapterBackground({
              seriesId: "jade-lantern-archive",
              seriesTitleVi: "Thư Các Thanh Đăng",
              chapterId: chapter.chapterId,
              chapterTitleVi: chapter.titleVi,
              coverSrc: JADE_COVER_SRC,
              coverRightsManifestId: JADE_COVER_RIGHTS_ID,
            }),
          })),
      ],
    }],
    focusLexemeIds: [
      "hsk-vocab-00863", "hsk-vocab-00588", "hsk-vocab-00400",
      "hsk-vocab-00831", "hsk-vocab-00130", "hsk-vocab-00617",
      "hsk-vocab-00329", "hsk-vocab-00365", "hsk-vocab-00914",
      "hsk-vocab-00505", "hsk-vocab-00592", "hsk-vocab-00186",
    ],
    publicationStatus: "released-local",
    humanReviewed: false,
  },
  ...READER_SHELF_SERIES,
  {
    seriesId: "first-day",
    version: "reader-pilot-2026.08.2:first-day:legacy-1",
    titleZh: "中文课的第一天",
    titleVi: "Ngày đầu ở lớp tiếng Trung",
    synopsisVi: "Một cuộc gặp ngắn giữa người học và giáo viên Vương trong ngày đầu tiên.",
    hookVi: "Bốn câu quen thuộc để đọc nhẹ trước khi bước vào serial dài.",
    genreIds: ["Đời sống", "Truyện ngắn Thiên Lộ"],
    shelfId: "legacy",
    discoverable: false,
    levelBand: { min: "HSK1", max: "HSK1", label: "HSK1 · nhập môn" },
    coverAsset: {
      kind: "image",
      src: "/reader/covers/first-day.svg",
      tone: "copper",
      altVi: "Một quyển sách nhỏ mở dưới ánh đèn lớp học",
      rightsManifestId: "reader-cover:first-day",
    },
    source: {
      rightsManifestId: "reader-series:first-day",
      sourceType: "legacy-hanzi-os",
      provenanceNote: "Stable story ID first-day được giữ nguyên từ runtime lịch sử.",
    },
    volumes: [{
      volumeId: "first-day-v01",
      titleZh: "短篇",
      titleVi: "Truyện ngắn",
      chapters: [{
        chapterId: "first-day",
        version: "reader-pilot-2026.08.2:first-day:legacy-1",
        seriesId: "first-day",
        chapterNumber: 1,
        titleZh: "中文课的第一天",
        titleVi: "Ngày đầu ở lớp tiếng Trung",
        hookVi: "Một lời chào, một lời giới thiệu và một quyển sách mới.",
        estimatedMinutes: 4,
        relatedLessonIds: ["boot-2"],
        publicationStatus: "released-local",
        reviewStatus: "legacy-local",
        humanReviewed: false,
        rightsManifestId: "reader-chapter:first-day",
      }],
    }],
    focusLexemeIds: ["jinri", "laoshi", "ni", "hao", "xuesheng", "wo", "shu"],
    publicationStatus: "released-local",
    humanReviewed: false,
  },
];

export const READER_DISCOVERABLE_SERIES = READER_SERIES_CATALOG.filter(
  (series) => series.discoverable,
);

export const READER_SERIES_BY_ID = new Map(
  READER_SERIES_CATALOG.map((series) => [series.seriesId, series]),
);

assertValidReaderRightsManifest(READER_RIGHTS_MANIFEST, READER_SERIES_CATALOG);
