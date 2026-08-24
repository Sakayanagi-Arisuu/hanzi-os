import { authorReaderParagraph as p } from "../chapterAuthoring";
import type { ReaderChapter } from "../readerContentModel";

const chapter: ReaderChapter = {
  chapterId: "first-day",
  version: "reader-pilot-2026.08.1:first-day:legacy-1",
  seriesId: "first-day",
  chapterNumber: 1,
  titleZh: "中文课的第一天",
  titleVi: "Ngày đầu ở lớp tiếng Trung",
  estimatedMinutes: 4,
  relatedLessonIds: ["boot-2"],
  publicationStatus: "released-local",
  reviewStatus: "legacy-local",
  humanReviewed: false,
  rights: {
    rightsManifestId: "reader-chapter:first-day",
    sourceType: "legacy-hanzi-os",
    provenanceNote: "Stable story ID first-day retained from the historical local runtime.",
  },
  paragraphs: [
    p({ paragraphId: "first-day-p01", markedZhHans: "今天是中文课的第一天。", pinyin: "Jīntiān shì Zhōngwén kè de dì-yī tiān.", vi: "Hôm nay là ngày đầu tiên của lớp tiếng Trung." }),
    p({ paragraphId: "first-day-p02", markedZhHans: "王老师说：“你好！你是学生吗？”", pinyin: "Wáng lǎoshī shuō: ‘Nǐ hǎo! Nǐ shì xuésheng ma?’", vi: "Giáo viên Vương nói: “Xin chào! Bạn là học sinh phải không?”" }),
    p({ paragraphId: "first-day-p03", markedZhHans: "我说：“是，我是越南人。”", pinyin: "Wǒ shuō: ‘Shì, wǒ shì Yuènán rén.’", vi: "Tôi nói: “Vâng, tôi là người Việt Nam.”" }),
    p({ paragraphId: "first-day-p04", markedZhHans: "老师给我一本[[书]]，我说：“谢谢老师！”", pinyin: "Lǎoshī gěi wǒ yì běn shū, wǒ shuō: ‘Xièxie lǎoshī!’", vi: "Giáo viên đưa tôi một quyển sách, tôi nói: “Cảm ơn thầy/cô!”" }),
  ],
};

export default chapter;
