import { RELEASED_VOCABULARY } from "../../data/curriculum";
import { lookupMegaVocabulary } from "../../content/megaLexicon";
import type { ReaderToken } from "./readerContentModel";

export type ReaderReferenceEntry = {
  entryId: string;
  simplified: string;
  traditional?: string;
  pinyin: string | null;
  partOfSpeechVi: string;
  contextualMeaningVi: string;
  otherMeaningsVi: string[];
  lexemeId?: string;
  sourceType: "hanzi-os-core" | "original-context-gloss" | "mega-lexicon" | "reader-character-fallback";
};

const core = (
  lexemeId: string,
  simplified: string,
  traditional: string,
  pinyin: string,
  partOfSpeechVi: string,
  contextualMeaningVi: string,
  otherMeaningsVi: string[] = [],
): ReaderReferenceEntry => ({
  entryId: `reader-core:${lexemeId}`,
  lexemeId,
  simplified,
  traditional,
  pinyin,
  partOfSpeechVi,
  contextualMeaningVi,
  otherMeaningsVi,
  sourceType: "hanzi-os-core",
});

const reference = (
  key: string,
  simplified: string,
  pinyin: string,
  contextualMeaningVi: string,
  partOfSpeechVi = "danh từ",
): ReaderReferenceEntry => ({
  entryId: `reader-ref:${key}`,
  simplified,
  pinyin,
  partOfSpeechVi,
  contextualMeaningVi,
  otherMeaningsVi: [],
  sourceType: "original-context-gloss",
});

const MANUAL_READER_REFERENCE_ENTRIES: ReaderReferenceEntry[] = [
  core("hsk-vocab-00863", "图书馆", "圖書館", "túshūguǎn", "danh từ", "thư viện"),
  core("hsk-vocab-01862", "夜", "亱", "yè", "danh từ", "đêm"),
  core("hsk-vocab-00588", "灯", "燈", "dēng", "danh từ", "đèn"),
  core("hsk-vocab-00400", "门", "門", "mén", "danh từ", "cánh cửa"),
  core("hsk-vocab-00831", "声音", "聲音", "shēngyīn", "danh từ", "âm thanh, giọng nói"),
  core("hsk-vocab-00130", "名字", "名字", "míngzi", "danh từ", "tên"),
  core("hsk-vocab-01614", "任务", "任務", "rènwu", "danh từ", "nhiệm vụ", ["phân công", "vai trò"]),
  core("hsk-vocab-00617", "发现", "發現", "fāxiàn", "động từ", "phát hiện"),
  core("hsk-vocab-00329", "打开", "打開", "dǎkāi", "động từ", "mở"),
  core("hsk-vocab-00361", "回来", "回來", "huílai", "động từ", "quay trở lại"),
  core("hsk-vocab-00365", "记得", "記得", "jìde", "động từ", "nhớ"),
  core("hsk-vocab-00874", "忘记", "忘記", "wàngjì", "động từ", "quên"),
  core("hsk-vocab-00914", "选择", "選擇", "xuǎnzé", "động từ", "lựa chọn"),
  core("hsk-vocab-00505", "安全", "安全", "ānquán", "tính từ", "an toàn"),
  core("hsk-vocab-00156", "朋友", "朋友", "péngyou", "danh từ", "người bạn"),
  core("hsk-vocab-00592", "地图", "地圖", "dìtú", "danh từ", "bản đồ"),
  core("shu", "书", "書", "shū", "danh từ", "sách"),
  core("hsk-vocab-00186", "时间", "時間", "shíjiān", "danh từ", "thời gian"),
  core("hsk-vocab-00220", "问题", "問題", "wèntí", "danh từ", "vấn đề", ["câu hỏi"]),
  core("hsk-vocab-01113", "答案", "答案", "dá'àn", "danh từ", "đáp án", ["cách giải quyết"]),
  core("hsk-vocab-00378", "开始", "開始", "kāishǐ", "động từ", "bắt đầu"),
  core("hsk-vocab-00712", "结束", "結束", "jiéshù", "động từ", "kết thúc"),
  core("hsk-vocab-00997", "最后", "最後", "zuìhòu", "danh từ", "cuối cùng"),
  core("hsk-vocab-00419", "前面", "前面", "qiánmiàn", "danh từ", "phía trước"),
  core("hsk-vocab-00356", "后面", "後面", "hòumian", "danh từ", "phía sau"),
  core("hsk-vocab-00390", "里面", "裏面", "lǐmiàn", "danh từ", "bên trong"),
  core("hsk-vocab-00447", "外面", "外面", "wàimiàn", "danh từ", "bên ngoài"),
  core("hsk-vocab-00798", "奇怪", "奇怪", "qíguài", "tính từ", "kỳ lạ"),
  core("hsk-vocab-00862", "突然", "突然", "tūrán", "phó từ", "đột nhiên"),
  core("hsk-vocab-00504", "安静", "安靜", "ānjìng", "tính từ", "yên tĩnh"),
  core("hsk-vocab-00476", "因为", "因為", "yīnwèi", "liên từ", "bởi vì"),
  core("hsk-vocab-00439", "所以", "所以", "suǒyǐ", "liên từ", "vì vậy"),
  core("hsk-vocab-00819", "如果", "如果", "rúguǒ", "liên từ", "nếu"),
  core("hsk-vocab-00331", "但是", "但是", "dànshì", "liên từ", "nhưng"),
  core("hsk-vocab-00438", "虽然", "雖然", "suīrán", "liên từ", "mặc dù"),
  core("hsk-vocab-00352", "还是", "還是", "háishi", "liên từ", "hay là", ["vẫn"]),
  core("hsk-vocab-00472", "已经", "已經", "yǐjīng", "phó từ", "đã"),
  core("hsk-vocab-01332", "继续", "繼續", "jìxù", "động từ", "tiếp tục"),
  core("hsk-vocab-00724", "决定", "決定", "juédìng", "động từ", "quyết định"),
  core("hsk-vocab-00514", "帮助", "幫助", "bāngzhù", "động từ", "giúp đỡ"),
  core("hsk-vocab-00892", "相信", "相信", "xiāngxìn", "động từ", "tin tưởng"),
  core("hsk-vocab-00660", "过去", "過去", "guòqù", "danh từ", "quá khứ", ["đi qua"]),
  core("hsk-vocab-00835", "世界", "世界", "shìjiè", "danh từ", "thế giới"),
  core("hsk-vocab-00560", "城市", "城市", "chéngshì", "danh từ", "thành phố"),
  core("hsk-vocab-00667", "河", "河", "hé", "danh từ", "dòng sông"),
  core("hsk-vocab-00052", "房间", "房間", "fángjiān", "danh từ", "căn phòng"),
  core("hsk-vocab-01623", "入口", "入口", "rùkǒu", "danh từ", "lối vào"),
  core("hsk-vocab-01089", "出口", "出口", "chūkǒu", "danh từ", "lối ra"),
  core("hsk-vocab-01274", "光", "光", "guāng", "danh từ", "ánh sáng"),
  core("hsk-vocab-00296", "字", "字", "zì", "danh từ", "chữ"),
  core("hsk-vocab-00650", "故事", "故事", "gùshi", "danh từ", "câu chuyện"),
  core("hsk-vocab-01927", "真正", "真正", "zhēnzhèng", "tính từ", "thật sự"),
  core("hsk-vocab-00939", "应该", "應該", "yīnggāi", "động từ năng nguyện", "nên"),
  core("hsk-vocab-00525", "必须", "必須", "bìxū", "phó từ", "nhất định phải"),
  core("hsk-vocab-00382", "可能", "可能", "kěnéng", "động từ năng nguyện", "có thể"),
  core("hsk-vocab-00529", "变化", "變化", "biànhuà", "danh từ", "sự thay đổi"),
  core("hsk-vocab-01090", "出现", "出現", "chūxiàn", "động từ", "xuất hiện"),
  core("hsk-vocab-00210", "听见", "聽見", "tīngjiàn", "động từ", "nghe thấy"),
  core("hsk-vocab-00101", "看见", "看見", "kànjiàn", "động từ", "nhìn thấy"),
  core("hsk-vocab-00771", "明白", "明白", "míngbai", "động từ", "hiểu ra"),
  core("hsk-vocab-00288", "知道", "知道", "zhīdào", "động từ", "biết"),
  core("hsk-vocab-00391", "楼", "樓", "lóu", "danh từ", "tòa nhà, tầng"),
  core("hsk-vocab-01860", "钥匙", "鑰匙", "yàoshi", "danh từ", "chìa khóa"),
  reference("qingdeng", "青灯", "qīngdēng", "ngọn đèn xanh ngọc"),
  reference("shuge", "书阁", "shūgé", "thư các, kho sách"),
  reference("record-system", "记录系统", "jìlù xìtǒng", "hệ thống ghi chép"),
  reference("page-keeper", "守页人", "shǒuyèrén", "người giữ trang"),
  reference("blank-book", "无字册", "wúzìcè", "quyển sách không chữ"),
  reference("ink-tide", "墨潮", "mòcháo", "làn thủy triều mực"),
  reference("seal", "书印", "shūyìn", "ấn ký của thư các"),
];

const manualLexemeIds = new Set(
  MANUAL_READER_REFERENCE_ENTRIES.flatMap((entry) => entry.lexemeId ? [entry.lexemeId] : []),
);
const manualSurfaces = new Set(
  MANUAL_READER_REFERENCE_ENTRIES.map((entry) => entry.simplified),
);

const releasedEntries: ReaderReferenceEntry[] = RELEASED_VOCABULARY
  .filter((word) => !manualLexemeIds.has(word.id) && !manualSurfaces.has(word.simplified))
  .map((word) => ({
    entryId: `reader-core:${word.id}`,
    lexemeId: word.id,
    simplified: word.simplified,
    traditional: word.traditional,
    pinyin: word.pinyin,
    partOfSpeechVi: word.partOfSpeech,
    contextualMeaningVi: word.meaning,
    otherMeaningsVi: [],
    sourceType: "hanzi-os-core" as const,
  }));

export const READER_REFERENCE_ENTRIES: ReaderReferenceEntry[] = [
  ...MANUAL_READER_REFERENCE_ENTRIES,
  ...releasedEntries,
];

export const READER_REFERENCE_ENTRY_BY_ID = new Map(
  READER_REFERENCE_ENTRIES.map((entry) => [entry.entryId, entry]),
);

export const READER_REFERENCE_ENTRY_BY_SIMPLIFIED = new Map(
  READER_REFERENCE_ENTRIES.map((entry) => [entry.simplified, entry]),
);

const HAN_CHARACTER_PATTERN = /\p{Script=Han}/u;
const lookupSurfacesByInitial = new Map<string, string[]>();

READER_REFERENCE_ENTRY_BY_SIMPLIFIED.forEach((_entry, surface) => {
  const initial = surface[0];
  if (!initial) return;
  const current = lookupSurfacesByInitial.get(initial) ?? [];
  current.push(surface);
  current.sort((left, right) => right.length - left.length);
  lookupSurfacesByInitial.set(initial, current);
});

export const isReaderHanCharacter = (character: string) =>
  HAN_CHARACTER_PATTERN.test(character);

export const readerEntryAt = (text: string, index: number) => {
  const initial = text[index];
  if (!initial) return null;
  const surface = lookupSurfacesByInitial.get(initial)?.find((candidate) =>
    text.startsWith(candidate, index)
  );
  return surface ? READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get(surface) ?? null : null;
};

export const createReaderCharacterEntry = (
  character: string,
  contextVi?: string,
): ReaderReferenceEntry => {
  const codePoint = character.codePointAt(0)?.toString(16).toUpperCase() ?? "UNKNOWN";
  const entryId = `reader-char:U+${codePoint}`;
  const existing = READER_REFERENCE_ENTRY_BY_ID.get(entryId);
  if (existing) return contextVi
    ? { ...existing, contextualMeaningVi: `Chữ xuất hiện trong đoạn: ${contextVi}` }
    : existing;
  const entry: ReaderReferenceEntry = {
    entryId,
    simplified: character,
    pinyin: null,
    partOfSpeechVi: "chữ Hán trong ngữ cảnh",
    contextualMeaningVi: contextVi
      ? `Chữ xuất hiện trong đoạn: ${contextVi}`
      : "Chưa có nghĩa cốt lõi; mở Tàng Tự Khố để tra cứu sâu.",
    otherMeaningsVi: [],
    sourceType: "reader-character-fallback",
  };
  READER_REFERENCE_ENTRIES.push(entry);
  READER_REFERENCE_ENTRY_BY_ID.set(entry.entryId, entry);
  READER_REFERENCE_ENTRY_BY_SIMPLIFIED.set(character, entry);
  return entry;
};

export const createReaderLookupEntry = (
  surface: string,
  contextVi?: string,
): ReaderReferenceEntry => {
  if ([...surface].length === 1) return createReaderCharacterEntry(surface, contextVi);
  const codePoints = [...surface]
    .map((character) => `U+${character.codePointAt(0)?.toString(16).toUpperCase() ?? "UNKNOWN"}`)
    .join("-");
  const entryId = `reader-lookup:${codePoints}`;
  const existing = READER_REFERENCE_ENTRY_BY_ID.get(entryId);
  if (existing) return contextVi
    ? { ...existing, contextualMeaningVi: `Cụm từ xuất hiện trong đoạn: ${contextVi}` }
    : existing;
  const entry: ReaderReferenceEntry = {
    entryId,
    simplified: surface,
    pinyin: null,
    partOfSpeechVi: "từ/cụm từ trong ngữ cảnh",
    contextualMeaningVi: contextVi
      ? `Cụm từ xuất hiện trong đoạn: ${contextVi}`
      : "Đang đối chiếu với Tàng Tự Khố mở rộng.",
    otherMeaningsVi: [],
    sourceType: "reader-character-fallback",
  };
  READER_REFERENCE_ENTRIES.push(entry);
  READER_REFERENCE_ENTRY_BY_ID.set(entry.entryId, entry);
  READER_REFERENCE_ENTRY_BY_SIMPLIFIED.set(surface, entry);
  return entry;
};

export const hydrateReaderReferenceEntry = async (
  entry: ReaderReferenceEntry,
): Promise<ReaderReferenceEntry> => {
  if (entry.sourceType !== "reader-character-fallback") return entry;
  const word = await lookupMegaVocabulary(entry.simplified);
  if (!word) return entry;
  const hydrated: ReaderReferenceEntry = {
    entryId: `reader-mega:${word.id}`,
    simplified: word.simplified,
    traditional: word.traditional,
    pinyin: word.pinyin || word.pinyinNumbered || null,
    partOfSpeechVi: word.partOfSpeech || "từ/cụm từ",
    contextualMeaningVi: word.meaning,
    otherMeaningsVi: word.senses.filter((sense) => sense !== word.meaning),
    sourceType: "mega-lexicon",
  };
  READER_REFERENCE_ENTRY_BY_ID.set(hydrated.entryId, hydrated);
  READER_REFERENCE_ENTRY_BY_SIMPLIFIED.set(hydrated.simplified, hydrated);
  return hydrated;
};

export const resolveReaderTokenEntry = (
  token: ReaderToken,
  contextVi?: string,
) => {
  const entry = READER_REFERENCE_ENTRY_BY_ID.get(
    token.lexemeId ? `reader-core:${token.lexemeId}` : token.referenceEntryId ?? "",
  );
  if (entry?.sourceType === "reader-character-fallback" && contextVi) {
    return { ...entry, contextualMeaningVi: `Chữ xuất hiện trong đoạn: ${contextVi}` };
  }
  return entry ?? createReaderLookupEntry(token.surface, contextVi);
};
