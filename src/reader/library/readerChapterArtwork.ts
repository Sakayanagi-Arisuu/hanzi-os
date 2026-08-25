import type { ReaderChapterBackgroundAsset } from "./readerContentModel";

export const readerChapterBackground = ({
  seriesId,
  seriesTitleVi,
  chapterId,
  chapterTitleVi,
  coverSrc,
  coverRightsManifestId,
}: {
  seriesId: string;
  seriesTitleVi: string;
  chapterId: string;
  chapterTitleVi: string;
  coverSrc: string;
  coverRightsManifestId: string;
}): ReaderChapterBackgroundAsset => {
  const hasDedicatedScene = seriesId === "van-menh-nguoc-dong";
  return {
    kind: "image",
    src: hasDedicatedScene
      ? `/reader/backgrounds/m4/${seriesId}/${chapterId}.webp`
      : coverSrc,
    altVi: hasDedicatedScene
      ? `Cảnh minh họa chương ${chapterTitleVi} của ${seriesTitleVi}, tiếp nối nhất quán Tạ Ninh và sơn môn Thí Kiếm.`
      : `Không gian minh họa của ${seriesTitleVi}, dùng làm nền cho chương ${chapterTitleVi}.`,
    focalPoint: hasDedicatedScene ? "center" : "center",
    rightsManifestId: hasDedicatedScene
      ? `reader-background:${chapterId}`
      : coverRightsManifestId,
  };
};
