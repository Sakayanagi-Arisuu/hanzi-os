import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";

export const HSK1_LEVEL_BASE_VERSION = "foundation-2026.07.8";
export const HSK1_LEVEL_TARGET_VERSION = "foundation-2026.08.1";
export const HSK1_LEVEL_REVIEW_RELATIVE_PATH =
  "content/review/hsk1-level-batch-local-study-review.json";
export const HSK1_LEVEL_CORE_RELATIVE_PATH =
  "content/runtime/hsk1-level-core-projection.json";
export const HSK1_LEVEL_RICH_RELATIVE_PATH =
  "content/runtime/hsk1-level-rich-lessons.json";
export const HSK1_LEVEL_PACKAGE_INPUT_DIRECTORY =
  "content/runtime/hsk1-level-package-input";
const CURRENT_LOCAL_STUDY_VERSION = "foundation-2026.08.7";

const PATHS = {
  scope: "content/curriculum/hsk1-scope.json",
  personal: "content/drafts/hsk1-personal-exchange-2026.07.json",
  communicative: "content/drafts/hsk1-communicative-units-2026.07.json",
  characters: "content/drafts/hsk1-character-foundation-2026.07.json",
  grammar: "content/drafts/hsk1-grammar-context-2026.07.json",
  tasks: "content/drafts/hsk1-task-assessment-2026.07.json",
  levelCheck: "content/drafts/hsk1-level-check-items-2026.07.json",
  vocabulary: "content/drafts/hsk1-vocabulary-2026.07.28.json",
  baseCatalog:
    `content/packages/${HSK1_LEVEL_BASE_VERSION}/item-catalog.json`,
  baseRuntimeIds:
    `content/packages/${HSK1_LEVEL_BASE_VERSION}/runtime-ids.json`,
};

const REVIEW_PASSES = [
  "mandarin-accuracy-and-naturalness",
  "pinyin-and-tone-consistency",
  "vietnamese-context-and-clarity",
  "pedagogy-rubric-and-distractors",
  "source-and-level-coverage",
];

const UNIT_ORDER = [
  "hsk1-personal-exchange",
  "hsk1-time-place-events",
  "hsk1-daily-life",
  "hsk1-travel-leisure",
  "hsk1-study-work",
  "hsk1-character-foundation",
];

const UNIT_RUNTIME_ID = {
  "hsk1-personal-exchange": "survival",
  "hsk1-time-place-events": "hsk1-time-place-events",
  "hsk1-daily-life": "daily",
  "hsk1-travel-leisure": "journey",
  "hsk1-study-work": "professional",
  "hsk1-character-foundation": "characters",
};

const UNIT_TAG = {
  "hsk1-personal-exchange": "giao tiếp cá nhân",
  "hsk1-time-place-events": "thời gian và địa điểm",
  "hsk1-daily-life": "đời sống hằng ngày",
  "hsk1-travel-leisure": "đi lại và giải trí",
  "hsk1-study-work": "học tập và công việc",
  "hsk1-character-foundation": "chữ Hán nền tảng",
};

const CHINESE_TITLES = {
  "hsk1-pe-01-polite-open-close": "问候和礼貌",
  "hsk1-pe-02-pronouns-and-groups": "代词和人群",
  "hsk1-pe-03-name-identity-age": "姓名、身份和年龄",
  "hsk1-pe-04-family": "家庭成员",
  "hsk1-pe-05-friends-and-pets": "朋友和宠物",
  "hsk1-pe-06-description-and-feeling": "描述和感受",
  "hsk1-pe-07-ability-intention-negation": "能力、意愿和否定",
  "hsk1-pe-08-phone-and-conversation": "电话会话",
  "hsk1-pe-09-personal-routine": "个人日常",
  "hsk1-time-place-events:01-numbers": "基础数字",
  "hsk1-time-place-events:02-calendar": "日期和年份",
  "hsk1-time-place-events:03-week-and-day-parts": "星期和时段",
  "hsk1-time-place-events:04-clock-and-duration": "钟点和时长",
  "hsk1-time-place-events:05-location": "位置和指示",
  "hsk1-time-place-events:06-weather-and-residence": "天气和住处",
  "hsk1-daily-life:01-quantity-and-money": "数量和价格",
  "hsk1-daily-life:02-food-and-drink": "饮食选择",
  "hsk1-daily-life:03-shopping-and-clothing": "购物和衣服",
  "hsk1-daily-life:04-health-and-home": "健康和房间",
  "hsk1-travel-leisure:01-transport": "交通和出行",
  "hsk1-travel-leisure:02-media-and-leisure": "媒体和休闲",
  "hsk1-study-work:01-school-levels": "学校和学段",
  "hsk1-study-work:02-people-and-language": "课堂人物和汉语",
  "hsk1-study-work:03-study-and-materials": "学习和资料",
  "hsk1-study-work:04-work-and-schedule": "工作和日程",
};

const PART_OF_SPEECH = new Map([
  [null, "cụm từ"],
  ["", "cụm từ"],
  ["介、连", "giới từ; liên từ"],
  ["代", "đại từ"],
  ["代、（副）", "đại từ; phó từ"],
  ["代、（连）", "đại từ; liên từ"],
  ["代、数", "đại từ; số từ"],
  ["前缀", "tiền tố"],
  ["副", "phó từ"],
  ["副、（形）", "phó từ; tính từ"],
  ["动", "động từ"],
  ["动、（介）", "động từ; giới từ"],
  ["动、（量）", "động từ; lượng từ"],
  ["动、介、副", "động từ; giới từ; phó từ"],
  ["动、副", "động từ; phó từ"],
  ["动、名", "động từ; danh từ"],
  ["动、形", "động từ; tính từ"],
  ["助", "trợ từ"],
  ["叹", "thán từ"],
  ["名", "danh từ"],
  ["名、动", "danh từ; động từ"],
  ["名、动、量", "danh từ; động từ; lượng từ"],
  ["名、后缀", "danh từ; hậu tố"],
  ["名、量", "danh từ; lượng từ"],
  ["名、量、（后缀）", "danh từ; lượng từ; hậu tố"],
  ["后缀", "hậu tố"],
  ["形", "tính từ"],
  ["形、（副）、（动）", "tính từ; phó từ; động từ"],
  ["形、介、（动、量）", "tính từ; giới từ; động từ; lượng từ"],
  ["形、前缀", "tính từ; tiền tố"],
  ["形、动", "tính từ; động từ"],
  ["形、动、代、（数、副）", "tính từ; động từ; đại từ; số từ; phó từ"],
  ["数", "số từ"],
  ["数、（副）", "số từ; phó từ"],
  ["数量", "cụm số lượng"],
  ["数量、（副）", "cụm số lượng; phó từ"],
  ["量", "lượng từ"],
  ["量、（动、名）", "lượng từ; động từ; danh từ"],
  ["量、（名）", "lượng từ; danh từ"],
]);

const NUMBERED_PINYIN_OVERRIDES = {
  "hsk-vocab-00075": "hao3wanr2",
  "hsk-vocab-00127": "mian4tiaor2",
  "hsk-vocab-00134": "nar3",
  "hsk-vocab-00140": "nar4",
  "hsk-vocab-00261": "yi1dianr3",
  "hsk-vocab-00265": "you3dianr3",
  "hsk-vocab-00283": "zher4",
};

const CUSTOM_EXAMPLES = {
  "hsk-vocab-00018": ["她喜欢唱中文歌。", "Tā xǐhuan chàng Zhōngwén gē.", "Cô ấy thích hát bài hát tiếng Trung."],
  "hsk-vocab-00026": ["大家好！", "Dàjiā hǎo!", "Xin chào mọi người!"],
  "hsk-vocab-00032": ["我弟弟是学生。", "Wǒ dìdi shì xuéshēng.", "Em trai tôi là học sinh."],
  "hsk-vocab-00036": ["这台电脑是新的。", "Zhè tái diànnǎo shì xīn de.", "Chiếc máy tính này là đồ mới."],
  "hsk-vocab-00039": ["电影院在学校旁边。", "Diànyǐngyuàn zài xuéxiào pángbiān.", "Rạp chiếu phim ở cạnh trường học."],
  "hsk-vocab-00042": ["请读这个句子。", "Qǐng dú zhège jùzi.", "Hãy đọc câu này."],
  "hsk-vocab-00043": ["我晚上在家读书。", "Wǒ wǎnshang zài jiā dúshū.", "Buổi tối tôi đọc sách ở nhà."],
  "hsk-vocab-00048": ["她儿子今年八岁。", "Tā érzi jīnnián bā suì.", "Con trai cô ấy năm nay tám tuổi."],
  "hsk-vocab-00064": ["那只狗很可爱。", "Nà zhī gǒu hěn kě'ài.", "Con chó kia rất đáng yêu."],
  "hsk-vocab-00068": ["这个孩子很高兴。", "Zhège háizi hěn gāoxìng.", "Đứa trẻ này rất vui."],
  "hsk-vocab-00073": ["这件衣服很好看。", "Zhè jiàn yīfu hěn hǎokàn.", "Bộ quần áo này rất đẹp."],
  "hsk-vocab-00074": ["这首歌很好听。", "Zhè shǒu gē hěn hǎotīng.", "Bài hát này rất hay."],
  "hsk-vocab-00075": ["这个游戏很好玩儿。", "Zhège yóuxì hěn hǎowánr.", "Trò chơi này rất vui."],
  "hsk-vocab-00087": ["我的家人都在越南。", "Wǒ de jiārén dōu zài Yuènán.", "Gia đình tôi đều ở Việt Nam."],
  "hsk-vocab-00092": ["我姐姐在大学学习。", "Wǒ jiějie zài dàxué xuéxí.", "Chị gái tôi học ở đại học."],
  "hsk-vocab-00096": ["我觉得汉语很有意思。", "Wǒ juéde Hànyǔ hěn yǒuyìsi.", "Tôi thấy tiếng Trung rất thú vị."],
  "hsk-vocab-00101": ["我看见老师了。", "Wǒ kànjiàn lǎoshī le.", "Tôi đã nhìn thấy giáo viên."],
  "hsk-vocab-00121": ["我没事，谢谢。", "Wǒ méi shì, xièxie.", "Tôi không sao, cảm ơn."],
  "hsk-vocab-00142": ["他是男学生。", "Tā shì nán xuéshēng.", "Cậu ấy là học sinh nam."],
  "hsk-vocab-00143": ["她男朋友是医生。", "Tā nánpéngyou shì yīshēng.", "Bạn trai cô ấy là bác sĩ."],
  "hsk-vocab-00148": ["你们都是学生吗？", "Nǐmen dōu shì xuéshēng ma?", "Các bạn đều là học sinh phải không?"],
  "hsk-vocab-00152": ["她是女老师。", "Tā shì nǚ lǎoshī.", "Cô ấy là giáo viên nữ."],
  "hsk-vocab-00153": ["他们的女儿很漂亮。", "Tāmen de nǚ'ér hěn piàoliang.", "Con gái của họ rất xinh."],
  "hsk-vocab-00154": ["我女朋友会说汉语。", "Wǒ nǚpéngyou huì shuō Hànyǔ.", "Bạn gái tôi biết nói tiếng Trung."],
  "hsk-vocab-00155": ["那位女士是老师。", "Nà wèi nǚshì shì lǎoshī.", "Vị nữ sĩ kia là giáo viên."],
  "hsk-vocab-00181": ["他是谁？", "Tā shì shéi?", "Anh ấy là ai?"],
  "hsk-vocab-00189": ["我的手机在桌子上。", "Wǒ de shǒujī zài zhuōzi shàng.", "Điện thoại của tôi ở trên bàn."],
  "hsk-vocab-00191": ["我去书店买书。", "Wǒ qù shūdiàn mǎi shū.", "Tôi đi hiệu sách mua sách."],
  "hsk-vocab-00201": ["它是一只猫。", "Tā shì yì zhī māo.", "Nó là một con mèo."],
  "hsk-vocab-00204": ["它们都是小狗。", "Tāmen dōu shì xiǎogǒu.", "Chúng đều là chó con."],
  "hsk-vocab-00205": ["她们在学校学习。", "Tāmen zài xuéxiào xuéxí.", "Họ đang học ở trường."],
  "hsk-vocab-00210": ["我听见他说话了。", "Wǒ tīngjiàn tā shuōhuà le.", "Tôi đã nghe thấy anh ấy nói."],
  "hsk-vocab-00214": ["孩子们在外边玩。", "Háizimen zài wàibian wán.", "Bọn trẻ đang chơi ở bên ngoài."],
  "hsk-vocab-00235": ["那个小朋友叫什么名字？", "Nàge xiǎopéngyou jiào shénme míngzi?", "Bạn nhỏ kia tên là gì?"],
  "hsk-vocab-00237": ["我妹妹在小学上学。", "Wǒ mèimei zài xiǎoxué shàngxué.", "Em gái tôi học ở trường tiểu học."],
  "hsk-vocab-00238": ["他是小学生。", "Tā shì xiǎoxuéshēng.", "Cậu ấy là học sinh tiểu học."],
  "hsk-vocab-00242": ["这是我的新书。", "Zhè shì wǒ de xīn shū.", "Đây là sách mới của tôi."],
  "hsk-vocab-00264": ["有的是老师，有的是学生。", "Yǒude shì lǎoshī, yǒude shì xuéshēng.", "Có người là giáo viên, có người là học sinh."],
  "hsk-vocab-00266": ["有些学生在读书。", "Yǒuxiē xuéshēng zài dúshū.", "Một số học sinh đang đọc sách."],
  "hsk-vocab-00285": ["今天真冷。", "Jīntiān zhēn lěng.", "Hôm nay thật lạnh."],
  "hsk-vocab-00287": ["我有一只猫。", "Wǒ yǒu yì zhī māo.", "Tôi có một con mèo."],
  "hsk-vocab-00290": ["这本书是中文的。", "Zhè běn shū shì Zhōngwén de.", "Quyển sách này viết bằng tiếng Trung."],
};

const RESOLVED_FINDINGS = [
  {
    findingId: "missing-runtime-coverage-for-165-official-lexemes",
    pass: "source-and-level-coverage",
    summary: "165 từ HSK1 ở personal exchange, travel/leisure và study/work chưa có runtime ID chính thức.",
    resolution: "Chiếu đủ 300 ID từ vựng chính thức, giữ nguyên các ID bridge cũ để không làm mất progress local.",
  },
  {
    findingId: "erhua-runtime-numbered-pinyin",
    pass: "pinyin-and-tone-consistency",
    summary: "Một số mục Erhua mới dùng r5 tách rời trong nguồn từ điển.",
    resolution: "Chuẩn hóa final Erhua liền âm tiết cho 哪儿, 那儿, 这儿, 有点儿 và 好玩儿.",
  },
  {
    findingId: "character-drafts-not-learner-visible",
    pass: "pedagogy-rubric-and-distractors",
    summary: "246 chữ mới chỉ có draft nhận diện và tự chép, chưa có ngữ cảnh trên Lesson UI.",
    resolution: "Gom thành 15 micro-lesson, mỗi bài có từ ngữ cảnh, nhận diện chữ, tự chép và tiêu chí tự kiểm không cấp mastery.",
  },
  {
    findingId: "level-check-authoring-only",
    pass: "pedagogy-rubric-and-distractors",
    summary: "50 mục level check chưa thể dùng vì đang chờ audio/nghiệm chuẩn production.",
    resolution: "Mở local self-check có phân tích theo kỹ năng; nghe dùng browser TTS tổng hợp và toàn form không cấp mastery, waiver hoặc chứng nhận.",
  },
];

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const compactPinyin = (value) => value
  .replace(/[\s'’-]/gu, "")
  .toLocaleLowerCase("en");
const duplicateValues = (values) => values.filter(
  (value, index) => values.indexOf(value) !== index,
);
const unique = (values) => [...new Set(values)];

const runtimeLessonId = (unitId, lesson, index) => {
  if (unitId === "hsk1-personal-exchange") return `survival-${index + 1}`;
  if (unitId === "hsk1-time-place-events") return lesson.lessonId.replaceAll(":", "-");
  if (unitId === "hsk1-daily-life") return `daily-${index + 1}`;
  if (unitId === "hsk1-travel-leisure") return `journey-${index + 1}`;
  if (unitId === "hsk1-study-work") return `professional-${index + 1}`;
  return `characters-${index + 1}`;
};

const selectedSourceMatch = (lexeme, vocabularyEntry) => {
  const hashes = new Set(lexeme.sourceLineSha256);
  const selected = vocabularyEntry.sourceMatches.find((match) =>
    hashes.has(match.sourceLineSha256)
  );
  if (!selected) throw new Error(`${lexeme.officialId} has no selected dictionary source`);
  return selected;
};

const sentenceBank = (source) => {
  const sentences = [];
  const add = (hanzi, pinyin, meaningVi, kind) => {
    if (hanzi && pinyin && meaningVi) sentences.push({ hanzi, pinyin, meaningVi, kind });
  };
  for (const lesson of source.communicativeLessons) {
    for (const turn of lesson.modelDialogue.turns) {
      add(turn.hanzi, turn.pinyin, turn.meaningVi, "lesson-dialogue");
    }
  }
  for (const item of source.grammar.grammarDrafts) {
    add(item.modelExample.hanzi, item.modelExample.pinyin, item.modelExample.meaningVi, "grammar-example");
    add(
      item.guidedPractice.modelAnswerHanzi,
      item.guidedPractice.modelAnswerPinyin,
      item.guidedPractice.modelAnswerMeaningVi,
      "guided-grammar",
    );
  }
  for (const task of source.tasks.taskScenarios) {
    for (const turn of task.modelDialogue.turns) {
      add(turn.hanzi, turn.pinyin, turn.meaningVi, "task-dialogue");
    }
  }
  for (const item of source.levelCheck.items) {
    const hanzi = item.stimulus?.transcriptHanzi
      ?? (item.stimulus?.kind === "hanzi-text" ? item.stimulus.text : null);
    const pinyin = item.stimulus?.transcriptPinyin
      ?? item.stimulus?.pinyinAuthoringReference;
    const meaningVi = item.options?.find(
      (option) => option.optionId === item.correctOptionId,
    )?.text;
    add(hanzi, pinyin, meaningVi, "level-check");
  }
  return sentences.sort((left, right) =>
    left.hanzi.length - right.hanzi.length
    || left.hanzi.localeCompare(right.hanzi, "zh-CN")
  );
};

export const loadHsk1LevelBatchSources = (root = process.cwd()) => {
  const personal = readJson(root, PATHS.personal);
  const communicative = readJson(root, PATHS.communicative);
  const characters = readJson(root, PATHS.characters);
  const packs = [
    {
      unitId: personal.unitId,
      lessons: personal.lessons,
      lexemes: personal.lexemes,
      practiceItems: personal.practiceItems,
    },
    ...communicative.packs,
  ];
  const communicativeLessons = packs.flatMap((pack) => pack.lessons);
  return {
    root,
    scope: readJson(root, PATHS.scope),
    personal,
    communicative,
    characters,
    grammar: readJson(root, PATHS.grammar),
    tasks: readJson(root, PATHS.tasks),
    levelCheck: readJson(root, PATHS.levelCheck),
    vocabulary: readJson(root, PATHS.vocabulary),
    baseCatalog: readJson(root, PATHS.baseCatalog),
    baseRuntimeIds: readJson(root, PATHS.baseRuntimeIds),
    packs,
    communicativeLessons,
  };
};

const assertSourceCoverage = (source) => {
  const vocabularyIds = source.packs.flatMap((pack) =>
    pack.lexemes.map((item) => item.officialId)
  );
  const grammarIds = source.grammar.grammarDrafts.map(
    (item) => item.officialGrammarRowId,
  );
  const taskIds = source.tasks.taskScenarios.map((item) => item.officialTaskId);
  const topicIds = source.tasks.topicDrafts.map((item) => item.officialTopicId);
  const characterIds = source.characters.characters.map(
    (item) => item.officialCharacterId,
  );
  const lessonCount = source.communicativeLessons.length
    + source.characters.lessons.length;
  if (
    lessonCount !== 40
    || vocabularyIds.length !== 300
    || unique(vocabularyIds).length !== 300
    || grammarIds.length !== 66
    || unique(grammarIds).length !== 66
    || taskIds.length !== 15
    || unique(taskIds).length !== 15
    || topicIds.length !== 30
    || unique(topicIds).length !== 30
    || characterIds.length !== 246
    || unique(characterIds).length !== 246
    || source.levelCheck.items.length !== 50
  ) {
    throw new Error("HSK1 level source coverage has drifted");
  }
};

const projectLexemes = async (source) => {
  const vocabularyById = new Map(source.vocabulary.entries.map(
    (entry) => [entry.officialId, entry],
  ));
  const existingById = new Map(source.baseCatalog.items
    .filter((item) => item.itemType === "lexeme")
    .map((item) => [item.itemId, item]));
  const lessonByVocabularyId = new Map();
  for (const pack of source.packs) {
    for (const lesson of pack.lessons) {
      for (const vocabularyId of lesson.vocabularyIds) {
        if (lessonByVocabularyId.has(vocabularyId)) {
          throw new Error(`${vocabularyId} belongs to multiple HSK1 lessons`);
        }
        lessonByVocabularyId.set(vocabularyId, {
          unitId: pack.unitId,
          authoringLessonId: lesson.lessonId,
        });
      }
    }
  }
  const sentences = sentenceBank(source);
  const lexemes = [];
  for (const pack of source.packs) {
    for (const lexeme of pack.lexemes) {
      const vocabularyEntry = vocabularyById.get(lexeme.officialId);
      const sourceMatch = selectedSourceMatch(lexeme, vocabularyEntry);
      const existing = existingById.get(lexeme.officialId);
      const customExample = CUSTOM_EXAMPLES[lexeme.officialId];
      const sourcedExample = sentences.find((sentence) =>
        sentence.hanzi.includes(lexeme.simplified)
      );
      const context = lessonByVocabularyId.get(lexeme.officialId);
      const partOfSpeech = PART_OF_SPEECH.get(
        lexeme.officialPartOfSpeech ?? null,
      );
      if (!context || !partOfSpeech) {
        throw new Error(`${lexeme.officialId} runtime projection is incomplete`);
      }
      const payload = existing?.payload ?? {
        simplified: lexeme.simplified,
        traditional: sourceMatch.traditional,
        pinyin: compactPinyin(sourceMatch.markedPinyin),
        pinyinNumbered: NUMBERED_PINYIN_OVERRIDES[lexeme.officialId]
          ?? compactPinyin(sourceMatch.numberedPinyin),
        meaning: lexeme.vietnameseGlossDraft,
        partOfSpeech,
        example: customExample?.[0] ?? sourcedExample?.hanzi,
        examplePinyin: customExample?.[1] ?? sourcedExample?.pinyin,
        exampleMeaning: customExample?.[2] ?? sourcedExample?.meaningVi,
        hsk: 1,
        tags: ["hsk1", UNIT_TAG[context.unitId]],
      };
      if (!payload.example || !payload.examplePinyin || !payload.exampleMeaning) {
        throw new Error(`${lexeme.officialId} has no contextual example`);
      }
      lexemes.push({
        authoringItemId: lexeme.officialId,
        unitId: context.unitId,
        authoringLessonId: context.authoringLessonId,
        payload,
        payloadSha256: await sha256Json({ itemType: "lexeme", payload }),
        inheritedReviewedPayload: Boolean(existing),
      });
    }
  }
  return lexemes.sort((left, right) =>
    left.authoringItemId.localeCompare(right.authoringItemId, "en-US")
  );
};

const projectLessons = async (source, lexemes) => {
  const charactersById = new Map(source.characters.characters.map(
    (item) => [item.officialCharacterId, item],
  ));
  const lessonRows = [];
  for (const unitId of UNIT_ORDER) {
    const sourceLessons = unitId === "hsk1-character-foundation"
      ? source.characters.lessons
      : source.packs.find((pack) => pack.unitId === unitId).lessons;
    for (const [index, lesson] of sourceLessons.entries()) {
      const characterItems = (lesson.officialCharacterIds ?? []).map(
        (characterId) => charactersById.get(characterId),
      );
      const wordIds = lesson.vocabularyIds
        ? [...lesson.vocabularyIds]
        : unique(characterItems.flatMap((item) => item.contextVocabularyIds));
      lessonRows.push({ unitId, index, lesson, characterItems, wordIds });
    }
  }
  const runtimeIds = lessonRows.map((row) =>
    runtimeLessonId(row.unitId, row.lesson, row.index)
  );
  const vocabularyIds = new Set(lexemes.map((item) => item.authoringItemId));
  const lessons = [];
  for (const [flatIndex, row] of lessonRows.entries()) {
    const runtimeId = runtimeIds[flatIndex];
    const priorId = flatIndex === 0 ? "boot-4" : runtimeIds[flatIndex - 1];
    if (row.wordIds.length === 0 || row.wordIds.some((id) => !vocabularyIds.has(id))) {
      throw new Error(`${runtimeId} has incomplete vocabulary context`);
    }
    const isCharacter = row.unitId === "hsk1-character-foundation";
    const payload = {
      unitId: UNIT_RUNTIME_ID[row.unitId],
      title: row.lesson.titleVi,
      chineseTitle: isCharacter
        ? `汉字基础 ${row.index + 1}`
        : CHINESE_TITLES[row.lesson.lessonId],
      objective: row.lesson.objectiveVi,
      minutes: isCharacter ? 22 : 24 + Math.min(6, row.wordIds.length),
      xp: isCharacter ? 110 : (24 + Math.min(6, row.wordIds.length)) * 5,
      wordIds: row.wordIds,
      skills: isCharacter
        ? ["vocabulary", "reading", "writing"]
        : ["vocabulary", "listening", "reading", "grammar", "speaking"],
    };
    lessons.push({
      authoringLessonId: row.lesson.lessonId,
      runtimeLessonId: runtimeId,
      unitId: row.unitId,
      sequence: row.index + 1,
      prerequisites: [{ itemType: "lesson", itemId: priorId }],
      knowledgeItems: row.wordIds.map((itemId) => ({
        itemType: "lexeme",
        itemId,
      })),
      officialVocabularyIds: isCharacter ? [] : [...row.lesson.vocabularyIds],
      officialCharacterIds: isCharacter
        ? [...row.lesson.officialCharacterIds]
        : [],
      officialGrammarRowIds: [...(row.lesson.grammarRowIds ?? [])],
      officialTaskIds: [...(row.lesson.taskIds ?? [])],
      officialTopicIds: [...(row.lesson.topicIds ?? [])],
      payload,
      payloadSha256: await sha256Json({ itemType: "lesson", payload }),
    });
  }
  return lessons;
};

const projectReview = async (source, lexemes, lessons) => {
  const inheritedReviewBindings = [
    {
      unitId: "hsk1-time-place-events",
      reviewId: "hsk1-time-place-events-local-study-review-2026.07.1",
      relativePath:
        "content/review/hsk1-time-place-events-local-study-review.json",
    },
    {
      unitId: "hsk1-daily-life",
      reviewId: "hsk1-daily-life-local-study-review-2026.07.1",
      relativePath: "content/review/hsk1-daily-life-local-study-review.json",
    },
  ].map((binding) => ({
    ...binding,
    selectedPayloadSha256: null,
  }));
  for (const binding of inheritedReviewBindings) {
    binding.selectedPayloadSha256 = await sha256Json(readJson(
      source.root,
      binding.relativePath,
    ));
  }
  const coverage = {
    lessons: lessons.length,
    vocabulary: lexemes.length,
    recognitionCharacters: source.characters.characters.length,
    grammarRows: source.grammar.grammarDrafts.length,
    tasks: source.tasks.taskScenarios.length,
    topics: source.tasks.topicDrafts.length,
    dialogueTurns: source.communicativeLessons.reduce(
      (sum, lesson) => sum + lesson.modelDialogue.turns.length,
      0,
    ),
    vocabularyPracticeItems: source.packs.reduce(
      (sum, pack) => sum + pack.practiceItems.length,
      0,
    ),
    characterPracticeItems: source.characters.practiceItems.length,
    grammarPracticeItems: source.grammar.practiceItems.length,
    taskPracticeItems: source.tasks.practiceItems.length,
    localLevelCheckItems: source.levelCheck.items.length,
  };
  const payload = {
    schemaVersion: 1,
    reviewId: "hsk1-level-batch-local-study-review-2026.08.1",
    profileId: "hsk0-4-personal-study-2026.07.1",
    level: "HSK1",
    targetContentVersion: HSK1_LEVEL_TARGET_VERSION,
    reviewedAt: "2026-08-01T09:00:00.000Z",
    state: "ai-reviewed",
    reviewer: {
      reviewerId: "openai-codex-ai-assisted-review",
      reviewerKind: "ai-coding-agent",
      humanReviewed: false,
      disclosureVi:
        "Nội dung được Codex tự rà soát năm pass cho mục đích tự học local; chưa được người bản ngữ kiểm duyệt.",
    },
    inheritedReviewBindings,
    newlyReviewedUnits: [
      "hsk1-personal-exchange",
      "hsk1-travel-leisure",
      "hsk1-study-work",
      "hsk1-character-foundation",
      "hsk1-level-check",
    ],
    coverage,
    coverageDigest: await sha256Json({
      lessonIds: lessons.map((item) => item.runtimeLessonId),
      vocabularyIds: lexemes.map((item) => item.authoringItemId),
      characterIds: source.characters.characters.map(
        (item) => item.officialCharacterId,
      ),
      grammarIds: source.grammar.grammarDrafts.map(
        (item) => item.officialGrammarRowId,
      ),
      taskIds: source.tasks.taskScenarios.map((item) => item.officialTaskId),
      topicIds: source.tasks.topicDrafts.map((item) => item.officialTopicId),
      levelCheckIds: source.levelCheck.items.map((item) => item.itemId),
    }),
    reviewResult: {
      mode: "ai-assisted-self-review",
      aiAssistedDisclosed: true,
      humanReviewed: false,
      unresolvedIssueCount: 0,
      passResults: Object.fromEntries(REVIEW_PASSES.map((pass) => [pass, "passed"])),
    },
    findings: { resolved: RESOLVED_FINDINGS, unresolved: [] },
    claims: {
      readyForPersonalLocalStudyPackaging: true,
      browserTtsPracticeOnly: true,
      nativeAudio: false,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
      officialHskCertification: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
  };
  return { ...payload, reviewSha256: await sha256Json(payload) };
};

export const projectHsk1LevelBatch = async (
  source = loadHsk1LevelBatchSources(),
) => {
  assertSourceCoverage(source);
  const lexemes = await projectLexemes(source);
  const lessons = await projectLessons(source, lexemes);
  const review = await projectReview(source, lexemes, lessons);
  const corePayload = {
    schemaVersion: 1,
    projectionId: "hsk1-level-core-projection-2026.08.1",
    targetContentVersion: HSK1_LEVEL_TARGET_VERSION,
    state: "ai-reviewed",
    lexemes,
    lessons,
    counts: {
      lessons: lessons.length,
      vocabulary: lexemes.length,
      recognitionCharacters: source.characters.characters.length,
      grammarRows: source.grammar.grammarDrafts.length,
      tasks: source.tasks.taskScenarios.length,
      topics: source.tasks.topicDrafts.length,
      levelCheckItems: source.levelCheck.items.length,
    },
    policy: {
      aiAssistedReview: true,
      humanReviewed: false,
      learnerVisibleBeforeAuthorization: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
  };
  const core = {
    ...corePayload,
    integritySha256: await sha256Json(corePayload),
  };
  return { review, core };
};

export const loadHsk1LevelBatchBundle = (root = process.cwd()) => ({
  source: loadHsk1LevelBatchSources(root),
  review: readJson(root, HSK1_LEVEL_REVIEW_RELATIVE_PATH),
  core: readJson(root, HSK1_LEVEL_CORE_RELATIVE_PATH),
});

export const validateHsk1LevelBatchBundle = async (bundle) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1LevelBatch(bundle.source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    bundle.review?.reviewer?.humanReviewed !== false
    || bundle.review?.reviewResult?.unresolvedIssueCount !== 0
    || bundle.review?.claims?.productionEligible !== false
    || bundle.core?.counts?.lessons !== 40
    || bundle.core?.counts?.vocabulary !== 300
    || bundle.core?.counts?.recognitionCharacters !== 246
    || bundle.core?.counts?.grammarRows !== 66
    || bundle.core?.counts?.tasks !== 15
    || bundle.core?.counts?.topics !== 30
    || bundle.core?.counts?.levelCheckItems !== 50
  ) {
    errors.push("HSK1 level batch shape is invalid");
  }
  if (!exact(bundle.review, expected.review)) {
    errors.push("HSK1 level review does not match exact selected sources");
  }
  if (!exact(bundle.core, expected.core)) {
    errors.push("HSK1 level core projection does not match reviewed payloads");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.core.counts,
  };
};

export const projectHsk1LevelPackageInputs = async (
  source = loadHsk1LevelBatchSources(),
) => {
  const { review, core } = await projectHsk1LevelBatch(source);
  const officialVocabularyIds = new Set(
    core.lexemes.map((item) => item.authoringItemId),
  );
  const targetLessonIds = new Set(
    core.lessons.map((item) => item.runtimeLessonId),
  );
  const inheritedRuntimeVocabularyIds = new Set([
    ...source.baseRuntimeIds.lessons
      .filter((lesson) => lesson.id.startsWith("boot-"))
      .flatMap((lesson) => lesson.wordIds),
    ...source.baseRuntimeIds.stories.flatMap((story) => story.wordIds),
  ]);
  const officialIdBySimplified = new Map(core.lexemes.map((item) => [
    item.payload.simplified,
    item.authoringItemId,
  ]));
  const legacyLexemeReplacement = new Map(
    source.baseCatalog.items
      .filter((item) =>
        item.itemType === "lexeme"
        && !inheritedRuntimeVocabularyIds.has(item.itemId)
      )
      .map((item) => [
        item.itemId,
        officialIdBySimplified.get(item.payload.simplified),
      ])
      .filter((entry) => entry[1]),
  );
  const inheritedItems = await Promise.all(source.baseCatalog.items
    .filter((item) => !(
      item.itemType === "lexeme" && officialVocabularyIds.has(item.itemId)
    ))
    .filter((item) => !(
      item.itemType === "lesson" && !item.itemId.startsWith("boot-")
    ))
    .filter((item) =>
      item.itemType !== "lexeme"
      || inheritedRuntimeVocabularyIds.has(item.itemId)
    )
    .map(async (item) => {
      const projected = {
        ...structuredClone(item),
        itemVersion: HSK1_LEVEL_TARGET_VERSION,
      };
      if (
        projected.itemType === "character"
        && Array.isArray(projected.payload?.sourceLexemeIds)
      ) {
        projected.payload.sourceLexemeIds = projected.payload.sourceLexemeIds
          .map((itemId) => legacyLexemeReplacement.get(itemId) ?? itemId);
        projected.payloadSha256 = await sha256Json({
          itemType: projected.itemType,
          payload: projected.payload,
        });
      }
      return projected;
    }));
  const lexemeItems = core.lexemes.map((lexeme) => ({
    itemKey: `lexeme:${lexeme.authoringItemId}`,
    itemType: "lexeme",
    itemId: lexeme.authoringItemId,
    itemVersion: HSK1_LEVEL_TARGET_VERSION,
    releaseState: "beta",
    payload: lexeme.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: null,
    payloadSha256: lexeme.payloadSha256,
  }));
  const inheritedKnowledgeByLessonId = new Map(
    source.baseCatalog.items
      .filter((item) => item.itemType === "lesson")
      .map((item) => [
        item.itemId,
        (item.knowledgeItems ?? []).filter(
          (reference) => reference.itemType !== "lexeme",
        ),
      ]),
  );
  const lessonItems = core.lessons.map((lesson) => ({
    itemKey: `lesson:${lesson.runtimeLessonId}`,
    itemType: "lesson",
    itemId: lesson.runtimeLessonId,
    itemVersion: HSK1_LEVEL_TARGET_VERSION,
    releaseState: "beta",
    payload: lesson.payload,
    owner: null,
    sourceLicense: null,
    prerequisites: lesson.prerequisites,
    payloadSha256: lesson.payloadSha256,
    knowledgeItems: [
      ...lesson.knowledgeItems,
      ...(inheritedKnowledgeByLessonId.get(lesson.runtimeLessonId) ?? []),
    ],
  }));
  const items = [...inheritedItems, ...lexemeItems, ...lessonItems];
  if (duplicateValues(items.map((item) => item.itemKey)).length > 0) {
    throw new Error("HSK1 level package item keys are duplicated");
  }
  const itemCatalog = {
    schemaVersion: 4,
    contentVersion: HSK1_LEVEL_TARGET_VERSION,
    items,
    audioAssets: [...(source.baseCatalog.audioAssets ?? [])],
  };
  const inheritedBootLessons = source.baseRuntimeIds.lessons
    .filter((lesson) => lesson.id.startsWith("boot-"))
    .map((lesson) => ({ ...lesson }));
  const runtimeLessons = core.lessons.map((lesson) => ({
    id: lesson.runtimeLessonId,
    unitId: lesson.payload.unitId,
    prerequisiteIds: lesson.prerequisites.map((item) => item.itemId),
    wordIds: [...lesson.payload.wordIds],
    releaseState: "beta",
  }));
  const runtimeVocabularyIdSet = new Set([
    ...inheritedBootLessons.flatMap((lesson) => lesson.wordIds),
    ...runtimeLessons.flatMap((lesson) => lesson.wordIds),
    ...source.baseRuntimeIds.stories.flatMap((story) => story.wordIds),
  ]);
  const runtimeIds = {
    ...source.baseRuntimeIds,
    contentVersion: HSK1_LEVEL_TARGET_VERSION,
    vocabularyIds: items
      .filter((item) =>
        item.itemType === "lexeme"
        && (item.releaseState === "beta" || item.releaseState === "published")
        && runtimeVocabularyIdSet.has(item.itemId)
      )
      .map((item) => item.itemId),
    lessons: [...inheritedBootLessons, ...runtimeLessons],
    stories: [...source.baseRuntimeIds.stories],
  };
  if (
    duplicateValues(runtimeIds.vocabularyIds).length > 0
    || duplicateValues(runtimeIds.lessons.map((item) => item.id)).length > 0
    || runtimeLessons.length !== 40
    || targetLessonIds.size !== 40
  ) {
    throw new Error("HSK1 level runtime IDs are invalid");
  }
  const coverageClaims = {
    schemaVersion: 2,
    contentVersion: HSK1_LEVEL_TARGET_VERSION,
    itemCatalogSha256: await sha256Json(itemCatalog),
    coverageClaims: [
      {
        claimId: "hsk1-personal-local-study-full-inventory-2026.08.1",
        framework: "CTI HSK 3.0 pinned 2026",
        level: "HSK1",
        evidenceRef: HSK1_LEVEL_REVIEW_RELATIVE_PATH,
        itemKeys: [
          ...lexemeItems.map((item) => item.itemKey),
          ...lessonItems.map((item) => item.itemKey),
        ],
        entryLessonKeys: ["lesson:survival-1"],
        terminalLessonKeys: ["lesson:characters-15"],
      },
    ],
  };
  return {
    itemCatalog,
    runtimeIds,
    coverageClaims,
    summary: {
      inheritedItems: inheritedItems.length,
      officialVocabularyItems: lexemeItems.length,
      hsk1Lessons: lessonItems.length,
      runtimeVocabularyIds: runtimeIds.vocabularyIds.length,
      runtimeLessons: runtimeIds.lessons.length,
      humanReviewed: review.reviewer.humanReviewed,
      productionEligible: review.claims.productionEligible,
    },
  };
};

export const validateMaterializedHsk1LevelPackage = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk1LevelPackageInputs(
    loadHsk1LevelBatchSources(root),
  );
  const packageRoot = `content/packages/${HSK1_LEVEL_TARGET_VERSION}`;
  const actual = {
    itemCatalog: readJson(root, `${packageRoot}/item-catalog.json`),
    runtimeIds: readJson(root, `${packageRoot}/runtime-ids.json`),
    coverageClaims: readJson(root, `${packageRoot}/coverage-claims.json`),
  };
  const errors = [];
  if (!exact(actual.itemCatalog, expected.itemCatalog)) {
    errors.push("materialized HSK1 level item catalog has drifted");
  }
  if (!exact(actual.runtimeIds, expected.runtimeIds)) {
    errors.push("materialized HSK1 level runtime IDs have drifted");
  }
  if (!exact(actual.coverageClaims, expected.coverageClaims)) {
    errors.push("materialized HSK1 level coverage claims have drifted");
  }
  return { valid: errors.length === 0, errors, summary: expected.summary };
};

const dialogueTurn = (turn) => ({
  speaker: turn.speaker,
  hanzi: turn.hanzi,
  pinyin: turn.pinyin,
  meaningVi: turn.meaningVi,
});

const supplementalPattern = (lesson) => {
  const turns = lesson.modelDialogue.turns;
  const model = turns[Math.min(1, turns.length - 1)];
  return {
    id: `hsk1-pattern:${lesson.lessonId}`,
    category: "Mẫu câu trong tình huống",
    label: "Nhận diện và thay thông tin trong câu mẫu",
    officialContent: "supplemental-local-study-pattern",
    explanationVi:
      "Quan sát vị trí của thông tin chính trong câu, rồi thay bằng dữ liệu của bạn mà không đổi trật tự nền.",
    modelExample: {
      hanzi: model.hanzi,
      pinyin: model.pinyin,
      meaningVi: model.meaningVi,
    },
    guidedPractice: {
      promptVi: "Đọc lại câu mẫu và thay một thông tin bằng thông tin thật của bạn.",
      modelAnswerHanzi: model.hanzi,
      modelAnswerPinyin: model.pinyin,
      modelAnswerMeaningVi: model.meaningVi,
    },
  };
};

const supplementalTask = (lesson) => ({
  id: `hsk1-guided-task:${lesson.lessonId}`,
  titleVi: `Lượt thoại ngắn: ${lesson.titleVi}`,
  instructionVi:
    "Đọc hai vai, đổi một chi tiết rồi tự nói lại. TTS chỉ dùng để nghe mẫu, không chấm phát âm.",
  targetFunctions: ["guided-two-turn-practice"],
  modelDialogue: lesson.modelDialogue.turns.slice(0, 4).map(dialogueTurn),
});

export const projectHsk1LevelRichLessons = async (
  source = loadHsk1LevelBatchSources(),
) => {
  const { review, core } = await projectHsk1LevelBatch(source);
  const authorization = readJson(
    source.root,
    "content/curriculum/hsk0-4-local-study-authorizations.json",
  );
  const hsk1Authorizations = authorization.authorizations?.filter(
    (item) => item.unitId.startsWith("hsk1-"),
  ) ?? [];
  const authorizedLessonIds = new Set(hsk1Authorizations.flatMap(
    (item) => item.lessonIds,
  ));
  if (
    authorization.runtimeContentVersion !== CURRENT_LOCAL_STUDY_VERSION
    || hsk1Authorizations.length !== 6
    || authorizedLessonIds.size !== 40
    || core.lessons.some((lesson) =>
      !authorizedLessonIds.has(lesson.runtimeLessonId)
    )
    || authorization.policy?.humanReviewed !== false
    || authorization.policy?.grantsProductionEligibility !== false
  ) {
    throw new Error("HSK1 rich lesson content is not locally authorized");
  }
  const runtimeByAuthoringId = new Map(core.lessons.map((lesson) => [
    lesson.authoringLessonId,
    lesson.runtimeLessonId,
  ]));
  const charactersById = new Map(source.characters.characters.map(
    (item) => [item.officialCharacterId, item],
  ));
  const lessons = [];
  for (const lesson of source.communicativeLessons) {
    const grammar = source.grammar.grammarDrafts
      .filter((item) => item.lessonId === lesson.lessonId)
      .map((item) => ({
        id: item.officialGrammarRowId,
        category: item.categoryName ?? item.category ?? "Ngữ pháp",
        label: item.detail ?? item.officialContent,
        officialContent: item.officialContent,
        explanationVi: item.explanationViDraft,
        modelExample: {
          hanzi: item.modelExample.hanzi,
          pinyin: item.modelExample.pinyin,
          meaningVi: item.modelExample.meaningVi,
        },
        guidedPractice: {
          promptVi: item.guidedPractice.promptVi,
          modelAnswerHanzi: item.guidedPractice.modelAnswerHanzi,
          modelAnswerPinyin: item.guidedPractice.modelAnswerPinyin,
          modelAnswerMeaningVi: item.guidedPractice.modelAnswerMeaningVi,
        },
      }));
    const topics = source.tasks.topicDrafts
      .filter((item) => item.lessonId === lesson.lessonId)
      .map((item) => ({
        id: item.officialTopicId,
        group: item.group,
        officialTopic: item.officialTopic,
        promptVi: item.promptViDraft,
      }));
    const tasks = source.tasks.taskScenarios
      .filter((item) => item.lessonId === lesson.lessonId)
      .map((item) => ({
        id: item.officialTaskId,
        titleVi: item.titleVi,
        instructionVi: item.instructionVi,
        targetFunctions: [...item.targetFunctions],
        modelDialogue: item.modelDialogue.turns.map(dialogueTurn),
      }));
    lessons.push({
      lessonId: runtimeByAuthoringId.get(lesson.lessonId),
      authoringLessonId: lesson.lessonId,
      dialogue: lesson.modelDialogue.turns.map(dialogueTurn),
      grammar: grammar.length > 0 ? grammar : [supplementalPattern(lesson)],
      topics,
      tasks: tasks.length > 0 ? tasks : [supplementalTask(lesson)],
      characters: [],
    });
  }
  for (const lesson of source.characters.lessons) {
    const characterItems = lesson.officialCharacterIds.map(
      (id) => charactersById.get(id),
    );
    const first = characterItems[0];
    const second = characterItems[1] ?? first;
    const modelDialogue = [
      {
        speaker: "A",
        hanzi: "这个字怎么读？",
        pinyin: "Zhège zì zěnme dú?",
        meaningVi: "Chữ này đọc thế nào?",
      },
      {
        speaker: "B",
        hanzi: `这个字在“${first.primaryContext.simplified}”里。`,
        pinyin: `Zhège zì zài “${first.primaryContext.pinyin}” lǐ.`,
        meaningVi: `Chữ này nằm trong từ “${first.primaryContext.vietnameseGlossDraft}”.`,
      },
    ];
    lessons.push({
      lessonId: runtimeByAuthoringId.get(lesson.lessonId),
      authoringLessonId: lesson.lessonId,
      dialogue: modelDialogue,
      grammar: [{
        id: `hsk1-character-pattern:${lesson.lessonId}`,
        category: "Chiến lược nhận diện chữ",
        label: "Nhận chữ bên trong từ đã học",
        officialContent: "character-in-word-recognition",
        explanationVi:
          "Đọc cả từ ngữ cảnh trước, chỉ ra chữ mục tiêu rồi liên hệ lại âm và nghĩa; không đoán nghĩa từ hình dạng đơn lẻ.",
        modelExample: {
          hanzi: first.primaryContext.simplified,
          pinyin: first.primaryContext.pinyin,
          meaningVi: first.primaryContext.vietnameseGlossDraft,
        },
        guidedPractice: {
          promptVi: `Chỉ ra chữ “${second.character}” trong từ ngữ cảnh rồi chép lại một lần.`,
          modelAnswerHanzi: second.primaryContext.simplified,
          modelAnswerPinyin: second.primaryContext.pinyin,
          modelAnswerMeaningVi: second.primaryContext.vietnameseGlossDraft,
        },
      }],
      topics: [],
      tasks: [{
        id: `hsk1-character-task:${lesson.lessonId}`,
        titleVi: "Nhận diện rồi tự chép",
        instructionVi:
          "Đọc từ ngữ cảnh, khoanh chữ mục tiêu, che mẫu và chép lại. Tự đối chiếu hình dạng; hoạt động này không tự cấp mastery viết.",
        targetFunctions: ["character-recognition", "glyph-copy-self-check"],
        modelDialogue,
      }],
      characters: characterItems.map((item) => ({
        id: item.officialCharacterId,
        hanzi: item.character,
        pinyin: item.primaryContext.pinyin,
        meaningVi: item.primaryContext.vietnameseGlossDraft,
        contextWord: item.primaryContext.simplified,
        contextPinyin: item.primaryContext.pinyin,
        contextMeaningVi: item.primaryContext.vietnameseGlossDraft,
      })),
    });
  }
  const officialGrammarIds = unique(lessons.flatMap((lesson) =>
    lesson.grammar.map((item) => item.id)
      .filter((id) => id.startsWith("hsk1-grammar-row-"))
  ));
  const officialTaskIds = unique(lessons.flatMap((lesson) =>
    lesson.tasks.map((item) => item.id)
      .filter((id) => id.startsWith("hsk1-task-"))
  ));
  const officialTopicIds = unique(lessons.flatMap((lesson) =>
    lesson.topics.map((item) => item.id)
  ));
  const officialCharacterIds = unique(lessons.flatMap((lesson) =>
    lesson.characters.map((item) => item.id)
  ));
  const counts = {
    lessons: lessons.length,
    dialogueTurns: lessons.reduce((sum, lesson) => sum + lesson.dialogue.length, 0),
    richLessons: lessons.filter((lesson) =>
      lesson.dialogue.length > 0
      && lesson.grammar.length > 0
      && lesson.tasks.length > 0
    ).length,
    officialGrammarRows: officialGrammarIds.length,
    officialTasks: officialTaskIds.length,
    officialTopics: officialTopicIds.length,
    officialCharacters: officialCharacterIds.length,
  };
  if (!exact(counts, {
    lessons: 40,
    dialogueTurns: 132,
    richLessons: 40,
    officialGrammarRows: 66,
    officialTasks: 15,
    officialTopics: 30,
    officialCharacters: 246,
  })) {
    throw new Error(`HSK1 rich lesson coverage is incomplete: ${JSON.stringify(counts)}`);
  }
  const payload = {
    schemaVersion: 1,
    presentationId: "hsk1-level-rich-lessons-2026.08.2",
    contentVersion: CURRENT_LOCAL_STUDY_VERSION,
    level: "HSK1",
    state: "authorized-for-personal-local-study",
    disclosure: {
      reviewVi:
        "Nội dung được Codex rà soát bằng AI cho mục đích tự học; chưa phải kiểm duyệt người bản ngữ.",
      audioVi:
        "Nút nghe dùng giọng TTS tổng hợp của trình duyệt và không tạo bằng chứng nghe hoặc phát âm.",
      levelCheckVi:
        "Bài kiểm tra cấp độ là self-check local chưa nghiệm chuẩn; kết quả không cấp mastery, bỏ qua prerequisite hoặc chứng nhận HSK.",
    },
    policy: {
      learnerVisibleForPersonalLocalStudy: true,
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteWaiverEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
    reviewBinding: {
      reviewId: review.reviewId,
      reviewSha256: review.reviewSha256,
    },
    authorizationBinding: {
      authorizationId: authorization.authorizationId,
      authorizationSha256: authorization.authorizationSha256,
    },
    counts,
    lessons,
  };
  return { ...payload, integritySha256: await sha256Json(payload) };
};

export const validateHsk1LevelRichLessons = async (
  root = process.cwd(),
) => {
  const expected = await projectHsk1LevelRichLessons(
    loadHsk1LevelBatchSources(root),
  );
  const actual = readJson(root, HSK1_LEVEL_RICH_RELATIVE_PATH);
  const errors = [];
  if (!exact(actual, expected)) {
    errors.push("HSK1 rich lesson presentation does not match reviewed sources");
  }
  if (
    actual?.policy?.humanReviewed !== false
    || actual?.policy?.browserTtsPracticeOnly !== true
    || actual?.policy?.measurementEligible !== false
    || actual?.counts?.lessons !== 40
    || actual?.counts?.richLessons !== 40
  ) {
    errors.push("HSK1 rich lesson presentation policy is invalid");
  }
  return { valid: errors.length === 0, errors, summary: expected.counts };
};
