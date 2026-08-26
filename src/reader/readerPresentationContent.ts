/**
 * Answer-free presentation material for the Reader client surface.
 * Comprehension answers and scoring policy must never be added to this file.
 */
export type ReaderStoryPresentation = {
  id: string;
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
};

export type ReaderWordPresentation = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  meaning: string;
  partOfSpeech: string;
};

export const FIRST_DAY_READER_PRESENTATION: ReaderStoryPresentation = {
  id: "first-day",
  title: "Ngày đầu ở lớp tiếng Trung",
  chineseTitle: "中文课的第一天",
  summary: "Một cuộc gặp ngắn giữa Minh và giáo viên Vương.",
  estimatedMinutes: 4,
  sentences: [
    {
      chinese: "今天是中文课的第一天。",
      pinyin: "Jīntiān shì Zhōngwén kè de dì-yī tiān.",
      translation: "Hôm nay là ngày đầu tiên của lớp tiếng Trung.",
      wordIds: ["jinri", "shi", "yi"],
    },
    {
      chinese: "王老师说：“你好！你是学生吗？”",
      pinyin: "Wáng lǎoshī shuō: “Nǐ hǎo! Nǐ shì xuésheng ma?”",
      translation: "Giáo viên Vương nói: “Xin chào! Bạn là sinh viên phải không?”",
      wordIds: ["laoshi", "ni", "hao", "shi", "xuesheng", "ma"],
    },
    {
      chinese: "我说：“是，我是越南人。”",
      pinyin: "Wǒ shuō: “Shì, wǒ shì Yuènán rén.”",
      translation: "Tôi nói: “Vâng, tôi là người Việt Nam.”",
      wordIds: ["wo", "shi", "yuenan", "ren"],
    },
    {
      chinese: "老师给我一本书，我说：“谢谢老师！”",
      pinyin: "Lǎoshī gěi wǒ yì běn shū, wǒ shuō: “Xièxie lǎoshī!”",
      translation: "Giáo viên đưa tôi một quyển sách, tôi nói: “Cảm ơn thầy/cô!”",
      wordIds: ["laoshi", "wo", "yi", "shu", "xiexie"],
    },
  ],
};

const FIRST_DAY_WORDS: ReaderWordPresentation[] = [
  { id: "hao", simplified: "好", traditional: "好", pinyin: "hǎo", meaning: "tốt, khỏe", partOfSpeech: "tính từ" },
  { id: "jinri", simplified: "今天", traditional: "今天", pinyin: "jīntiān", meaning: "hôm nay", partOfSpeech: "danh từ thời gian" },
  { id: "laoshi", simplified: "老师", traditional: "老師", pinyin: "lǎoshī", meaning: "giáo viên", partOfSpeech: "danh từ" },
  { id: "ma", simplified: "吗", traditional: "嗎", pinyin: "ma", meaning: "trợ từ nghi vấn", partOfSpeech: "trợ từ" },
  { id: "ni", simplified: "你", traditional: "你", pinyin: "nǐ", meaning: "bạn", partOfSpeech: "đại từ" },
  { id: "ren", simplified: "人", traditional: "人", pinyin: "rén", meaning: "người", partOfSpeech: "danh từ" },
  { id: "shi", simplified: "是", traditional: "是", pinyin: "shì", meaning: "là", partOfSpeech: "động từ" },
  { id: "shu", simplified: "书", traditional: "書", pinyin: "shū", meaning: "sách", partOfSpeech: "danh từ" },
  { id: "wo", simplified: "我", traditional: "我", pinyin: "wǒ", meaning: "tôi", partOfSpeech: "đại từ" },
  { id: "xiexie", simplified: "谢谢", traditional: "謝謝", pinyin: "xièxie", meaning: "cảm ơn", partOfSpeech: "động từ" },
  { id: "xuesheng", simplified: "学生", traditional: "學生", pinyin: "xuésheng", meaning: "học sinh, sinh viên", partOfSpeech: "danh từ" },
  { id: "yi", simplified: "一", traditional: "一", pinyin: "yī", meaning: "một", partOfSpeech: "số từ" },
  { id: "yuenan", simplified: "越南", traditional: "越南", pinyin: "Yuènán", meaning: "Việt Nam", partOfSpeech: "danh từ riêng" },
];

export const READER_PRESENTATION_WORD_BY_ID = new Map(
  FIRST_DAY_WORDS.map((word) => [word.id, word]),
);
