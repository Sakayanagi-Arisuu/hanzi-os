import type { ReaderChapter } from "./readerContentModel";
import { readerChapterIdentity } from "./readerContentModel";
import { READER_SERIES_BY_ID } from "./readerManifest";
import { loadEditorialReaderChapter } from "./editorialReaderClient";

type ChapterModule = { default: ReaderChapter };
type ChapterLoader = () => Promise<ChapterModule>;

type ShelfChapterModule = {
  READER_SHELF_CHAPTERS: Record<string, ReaderChapter>;
};

const shelfChapterLoader = (
  loadShelf: () => Promise<ShelfChapterModule>,
  chapterId: string,
): ChapterLoader => async () => {
  const shelf = await loadShelf();
  const chapter = shelf.READER_SHELF_CHAPTERS[chapterId];
  if (!chapter) throw new Error(`reader-shelf-chapter-not-found:${chapterId}`);
  return { default: chapter };
};

const ascensionShelf = () => import("./chapters/reader-shelf-ascension");
const wonderShelf = () => import("./chapters/reader-shelf-wonder");
const horizonsShelf = () => import("./chapters/reader-shelf-horizons");
const reflectionsShelf = () => import("./chapters/reader-shelf-reflections");
const continuationShelf = () => import("./chapters/reader-shelf-continuations");
const expandedChronicles = () => import("./chapters/reader-expanded-chronicles");

const shelfEntries = (
  seriesIds: string[],
  loadShelf: () => Promise<ShelfChapterModule>,
) => Object.fromEntries(seriesIds.map((seriesId) => {
  const chapterId = `${seriesId}-c01`;
  return [readerChapterIdentity(seriesId, chapterId), shelfChapterLoader(loadShelf, chapterId)];
}));

const continuationEntries = (seriesIds: string[]) => Object.fromEntries(
  seriesIds.map((seriesId) => {
    const chapterId = `${seriesId}-c02`;
    return [readerChapterIdentity(seriesId, chapterId), shelfChapterLoader(continuationShelf, chapterId)];
  }),
);

const expandedEntries = (
  seriesIds: string[],
  chapterNumbers: number[],
) => Object.fromEntries(seriesIds.flatMap((seriesId) => chapterNumbers.map((chapterNumber) => {
  const chapterId = `${seriesId}-c${String(chapterNumber).padStart(2, "0")}`;
  return [readerChapterIdentity(seriesId, chapterId), shelfChapterLoader(expandedChronicles, chapterId)];
})));

const allShelfSeriesIds = [
  "van-menh-nguoc-dong", "kiem-lo-muoi-bac", "dao-mam-giua-tuyet",
  "tro-lai-truoc-con-mua", "nhat-ky-ngay-mai", "nguoi-canh-giu-lan-hai",
  "hoc-vien-bay-ngon-lua", "phap-su-ca-dem", "thanh-lam-thuc-tinh",
  "chuyen-tau-dem-khong-ga-cuoi", "can-phong-so-bay", "nguoi-gui-thu-trong-mua",
  "tram-khong-gian-so-chin", "ky-uc-tren-tang-may", "doc-gia-cuoi-cung",
  "kiem-khach-thanh-co", "y-quan-ao-xam", "ban-do-bien-ai",
  "quan-tra-ben-song", "nguoi-ban-bong", "ba-cau-hoi-cua-da",
  "tiem-com-luc-sau-gio", "mua-he-o-bac-kinh", "buc-thu-chua-gui",
];

export const READER_CHAPTER_LOADERS: Readonly<Record<string, ChapterLoader>> = {
  "jade-lantern-archive::jade-lantern-archive-c01": () => import("./chapters/jade-lantern-archive-c01"),
  "jade-lantern-archive::jade-lantern-archive-c02": () => import("./chapters/jade-lantern-archive-c02"),
  "jade-lantern-archive::jade-lantern-archive-c03": () => import("./chapters/jade-lantern-archive-c03"),
  "jade-lantern-archive::jade-lantern-archive-c04": () => import("./chapters/jade-lantern-archive-c04"),
  "jade-lantern-archive::jade-lantern-archive-c05": () => import("./chapters/jade-lantern-archive-c05"),
  "jade-lantern-archive::jade-lantern-archive-c06": () => import("./chapters/jade-lantern-archive-c06"),
  ...shelfEntries([
    "van-menh-nguoc-dong",
    "kiem-lo-muoi-bac",
    "dao-mam-giua-tuyet",
    "tro-lai-truoc-con-mua",
    "nhat-ky-ngay-mai",
    "nguoi-canh-giu-lan-hai",
  ], ascensionShelf),
  ...shelfEntries([
    "hoc-vien-bay-ngon-lua",
    "phap-su-ca-dem",
    "thanh-lam-thuc-tinh",
    "chuyen-tau-dem-khong-ga-cuoi",
    "can-phong-so-bay",
    "nguoi-gui-thu-trong-mua",
  ], wonderShelf),
  ...shelfEntries([
    "tram-khong-gian-so-chin",
    "ky-uc-tren-tang-may",
    "doc-gia-cuoi-cung",
    "kiem-khach-thanh-co",
    "y-quan-ao-xam",
    "ban-do-bien-ai",
  ], horizonsShelf),
  ...shelfEntries([
    "quan-tra-ben-song",
    "nguoi-ban-bong",
    "ba-cau-hoi-cua-da",
    "tiem-com-luc-sau-gio",
    "mua-he-o-bac-kinh",
    "buc-thu-chua-gui",
  ], reflectionsShelf),
  ...continuationEntries(allShelfSeriesIds),
  ...expandedEntries(allShelfSeriesIds, [3, 4, 5, 6, 7, 8, 9, 10]),
  ...expandedEntries(["jade-lantern-archive"], [7, 8, 9, 10]),
  "first-day::first-day": () => import("./chapters/first-day"),
};

const cache = new Map<string, Promise<ReaderChapter>>();

export const countHanzi = (value: string) =>
  [...value].filter((character) => /\p{Script=Han}/u.test(character)).length;

export const validateReaderChapter = (chapter: ReaderChapter) => {
  const errors: string[] = [];
  const series = READER_SERIES_BY_ID.get(chapter.seriesId);
  const summary = series?.volumes
    .flatMap((volume) => volume.chapters)
    .find((candidate) => candidate.chapterId === chapter.chapterId);
  if (!series || !summary) errors.push("Chapter is absent from the lightweight catalog.");
  if (summary && (
    summary.seriesId !== chapter.seriesId
    || summary.chapterId !== chapter.chapterId
    || summary.version !== chapter.version
    || summary.chapterNumber !== chapter.chapterNumber
  )) errors.push("Chapter identity does not match its catalog summary.");
  if (chapter.paragraphs.length === 0) errors.push("Chapter has no paragraphs.");
  if (new Set(chapter.paragraphs.map((item) => item.paragraphId)).size
    !== chapter.paragraphs.length) errors.push("Paragraph IDs are duplicated.");
  chapter.paragraphs.forEach((paragraph) => {
    const reassembled = paragraph.segments.map((segment) =>
      segment.kind === "token" ? segment.surface : segment.text
    ).join("");
    if (reassembled !== paragraph.zhHans) {
      errors.push(`Paragraph ${paragraph.paragraphId} token sequence is not exact.`);
    }
    if (!paragraph.vi.trim() || !paragraph.pinyin.trim()) {
      errors.push(`Paragraph ${paragraph.paragraphId} is missing aligned support text.`);
    }
    paragraph.segments.forEach((segment, sequence) => {
      if (segment.sequence !== sequence) {
        errors.push(`Paragraph ${paragraph.paragraphId} has unstable token order.`);
      }
      if (segment.kind === "token" && Boolean(segment.lexemeId) === Boolean(segment.referenceEntryId)) {
        errors.push(`Token ${segment.surface} must have exactly one stable lookup reference.`);
      }
    });
  });
  if (chapter.seriesId === "jade-lantern-archive") {
    const hanziCount = countHanzi(
      chapter.paragraphs.map((paragraph) => paragraph.zhHans).join(""),
    );
    if (hanziCount < 350 || hanziCount > 650) {
      errors.push(`Pilot chapter Hanzi count ${hanziCount} is outside 350–650.`);
    }
  }
  if (chapter.humanReviewed !== false) {
    errors.push("AI-assisted chapter must remain humanReviewed:false.");
  }
  return { ok: errors.length === 0, errors } as const;
};

export const loadReaderChapter = async (
  seriesId: string,
  chapterId: string,
  options: { retry?: boolean } = {},
) => {
  const identity = readerChapterIdentity(seriesId, chapterId);
  const loader = READER_CHAPTER_LOADERS[identity];
  if (options.retry) cache.delete(identity);
  const existing = cache.get(identity);
  if (existing) return existing;
  const pending = (loader
    ? loader().then(({ default: chapter }) => chapter)
    : loadEditorialReaderChapter(seriesId, chapterId)
  ).then((chapter) => {
    if (!loader) return chapter;
    const validation = validateReaderChapter(chapter);
    if (!validation.ok) throw new Error(validation.errors.join("\n"));
    return chapter;
  }).catch((error: unknown) => {
    cache.delete(identity);
    throw error;
  });
  cache.set(identity, pending);
  return pending;
};

export const prefetchReaderChapter = (seriesId: string, chapterId: string) => {
  void loadReaderChapter(seriesId, chapterId).catch(() => undefined);
};
