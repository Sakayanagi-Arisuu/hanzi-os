import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
  loadHsk1CommunicativeUnitPacksBundle,
} from "./hsk1CommunicativeUnitPacks.mjs";
import {
  assertValidHsk1GrammarContextPackBundle,
  HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
  loadHsk1GrammarContextPackBundle,
} from "./hsk1GrammarContextPack.mjs";
import {
  HSK_LOCAL_STUDY_PROFILE_ID,
  HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
  HSK_LOCAL_STUDY_REVIEW_PASSES,
  loadHskLocalStudyProfile,
} from "./hskLocalStudyProfile.mjs";
import {
  assertValidHsk1TaskAssessmentPackBundle,
  HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
  loadHsk1TaskAssessmentPackBundle,
} from "./hsk1TaskAssessmentPack.mjs";

export const HSK1_DAILY_LIFE_REVIEW_RELATIVE_PATH =
  "content/review/hsk1-daily-life-local-study-review.json";
export const HSK1_DAILY_LIFE_CORE_RELATIVE_PATH =
  "content/runtime/hsk1-daily-life-core-projection.json";
export const HSK1_DAILY_LIFE_REVIEW_ID =
  "hsk1-daily-life-local-study-review-2026.07.1";
export const HSK1_DAILY_LIFE_CORE_ID =
  "hsk1-daily-life-core-projection-2026.07.1";
export const HSK1_DAILY_LIFE_UNIT_ID = "hsk1-daily-life";
export const HSK1_DAILY_LIFE_TARGET_VERSION = "foundation-2026.07.8";

const VOCABULARY_SOURCE_RELATIVE_PATH =
  "content/drafts/hsk1-vocabulary-2026.07.28.json";
const RUNTIME_LESSON_IDS = ["daily-1", "daily-2", "daily-3", "daily-4"];
const PRIOR_UNIT_LAST_LESSON_ID =
  "hsk1-time-place-events-06-weather-and-residence";

const NUMBERED_PINYIN_OVERRIDES = {
  "hsk-vocab-00127": "mian4tiaor2",
  "hsk-vocab-00261": "yi1dianr3",
};

const LESSON_METADATA = {
  "hsk1-daily-life:01-quantity-and-money": {
    runtimeLessonId: "daily-1",
    chineseTitle: "数量和价格",
    minutes: 26,
    skills: ["vocabulary", "listening", "grammar", "speaking"],
    domainTag: "số lượng và giá tiền",
  },
  "hsk1-daily-life:02-food-and-drink": {
    runtimeLessonId: "daily-2",
    chineseTitle: "饮食选择",
    minutes: 30,
    skills: ["vocabulary", "listening", "reading", "speaking"],
    domainTag: "ăn uống",
  },
  "hsk1-daily-life:03-shopping-and-clothing": {
    runtimeLessonId: "daily-3",
    chineseTitle: "购物和衣服",
    minutes: 26,
    skills: ["vocabulary", "listening", "reading", "speaking"],
    domainTag: "mua sắm và quần áo",
  },
  "hsk1-daily-life:04-health-and-home": {
    runtimeLessonId: "daily-4",
    chineseTitle: "健康和房间",
    minutes: 24,
    skills: ["vocabulary", "listening", "grammar", "speaking"],
    domainTag: "sức khỏe và đồ dùng",
  },
};

const EXAMPLES = {
  "hsk-vocab-00008": ["我想吃包子。", "Wǒ xiǎng chī bāozi.", "Tôi muốn ăn bánh bao."],
  "hsk-vocab-00009": ["杯子里有水。", "Bēizi lǐ yǒu shuǐ.", "Trong cốc có nước."],
  "hsk-vocab-00012": ["他的病好了。", "Tā de bìng hǎo le.", "Bệnh của anh ấy đã khỏi."],
  "hsk-vocab-00016": ["我喜欢中国菜。", "Wǒ xǐhuan Zhōngguó cài.", "Tôi thích món ăn Trung Quốc."],
  "hsk-vocab-00017": ["请喝茶。", "Qǐng hē chá.", "Mời uống trà."],
  "hsk-vocab-00019": ["我去超市买东西。", "Wǒ qù chāoshì mǎi dōngxi.", "Tôi đi siêu thị mua đồ."],
  "hsk-vocab-00021": ["我吃米饭。", "Wǒ chī mǐfàn.", "Tôi ăn cơm."],
  "hsk-vocab-00023": ["她穿红衣服。", "Tā chuān hóng yīfu.", "Cô ấy mặc quần áo màu đỏ."],
  "hsk-vocab-00034": ["这家店很大。", "Zhè jiā diàn hěn dà.", "Cửa hàng này rất lớn."],
  "hsk-vocab-00040": ["我买了一些东西。", "Wǒ mǎi le yìxiē dōngxi.", "Tôi đã mua một ít đồ."],
  "hsk-vocab-00046": ["这里人很多。", "Zhèlǐ rén hěn duō.", "Ở đây có rất nhiều người."],
  "hsk-vocab-00047": ["这个多少钱？", "Zhège duōshao qián?", "Cái này bao nhiêu tiền?"],
  "hsk-vocab-00050": ["我们吃饭吧。", "Wǒmen chīfàn ba.", "Chúng ta ăn cơm nhé."],
  "hsk-vocab-00051": ["饭店在那边。", "Fàndiàn zài nàbian.", "Nhà hàng ở phía bên kia."],
  "hsk-vocab-00052": ["房间里有两把椅子。", "Fángjiān lǐ yǒu liǎng bǎ yǐzi.", "Trong phòng có hai chiếc ghế."],
  "hsk-vocab-00060": ["我买三个苹果。", "Wǒ mǎi sān ge píngguǒ.", "Tôi mua ba quả táo."],
  "hsk-vocab-00065": ["这件衣服太贵了。", "Zhè jiàn yīfu tài guì le.", "Bộ quần áo này đắt quá."],
  "hsk-vocab-00072": ["饺子很好吃。", "Jiǎozi hěn hǎochī.", "Bánh chẻo rất ngon."],
  "hsk-vocab-00077": ["我喝牛奶。", "Wǒ hē niúnǎi.", "Tôi uống sữa."],
  "hsk-vocab-00084": ["我早饭吃鸡蛋。", "Wǒ zǎofàn chī jīdàn.", "Bữa sáng tôi ăn trứng gà."],
  "hsk-vocab-00085": ["你要几个？", "Nǐ yào jǐ ge?", "Bạn muốn mấy cái?"],
  "hsk-vocab-00089": ["我买一件衣服。", "Wǒ mǎi yí jiàn yīfu.", "Tôi mua một bộ quần áo."],
  "hsk-vocab-00090": ["我喜欢吃饺子。", "Wǒ xǐhuan chī jiǎozi.", "Tôi thích ăn bánh chẻo."],
  "hsk-vocab-00100": ["我去医院看病。", "Wǒ qù yīyuàn kànbìng.", "Tôi đến bệnh viện khám bệnh."],
  "hsk-vocab-00104": ["我家有三口人。", "Wǒ jiā yǒu sān kǒu rén.", "Nhà tôi có ba người."],
  "hsk-vocab-00105": ["这本书五块钱。", "Zhè běn shū wǔ kuài qián.", "Quyển sách này giá năm tệ."],
  "hsk-vocab-00116": ["我想买苹果。", "Wǒ xiǎng mǎi píngguǒ.", "Tôi muốn mua táo."],
  "hsk-vocab-00117": ["这家店卖水果。", "Zhè jiā diàn mài shuǐguǒ.", "Cửa hàng này bán hoa quả."],
  "hsk-vocab-00125": ["我午饭吃米饭。", "Wǒ wǔfàn chī mǐfàn.", "Bữa trưa tôi ăn cơm."],
  "hsk-vocab-00126": ["我早饭吃面包。", "Wǒ zǎofàn chī miànbāo.", "Bữa sáng tôi ăn bánh mì."],
  "hsk-vocab-00127": ["我想吃面条儿。", "Wǒ xiǎng chī miàntiáor.", "Tôi muốn ăn mì sợi."],
  "hsk-vocab-00151": ["她每天喝牛奶。", "Tā měitiān hē niúnǎi.", "Cô ấy uống sữa mỗi ngày."],
  "hsk-vocab-00157": ["这件衣服很便宜。", "Zhè jiàn yīfu hěn piányi.", "Bộ quần áo này rất rẻ."],
  "hsk-vocab-00159": ["我买了三个苹果。", "Wǒ mǎi le sān ge píngguǒ.", "Tôi đã mua ba quả táo."],
  "hsk-vocab-00164": ["我没有钱。", "Wǒ méiyǒu qián.", "Tôi không có tiền."],
  "hsk-vocab-00174": ["商店几点开门？", "Shāngdiàn jǐ diǎn kāimén?", "Cửa hàng mở cửa lúc mấy giờ?"],
  "hsk-vocab-00180": ["今天人很少。", "Jīntiān rén hěn shǎo.", "Hôm nay có rất ít người."],
  "hsk-vocab-00183": ["他生病了。", "Tā shēngbìng le.", "Anh ấy bị ốm rồi."],
  "hsk-vocab-00192": ["请给我一杯水。", "Qǐng gěi wǒ yì bēi shuǐ.", "Vui lòng cho tôi một cốc nước."],
  "hsk-vocab-00193": ["我喜欢吃水果。", "Wǒ xǐhuan chī shuǐguǒ.", "Tôi thích ăn hoa quả."],
  "hsk-vocab-00216": ["我们六点吃晚饭。", "Wǒmen liù diǎn chī wǎnfàn.", "Chúng tôi ăn tối lúc sáu giờ."],
  "hsk-vocab-00224": ["你午饭吃什么？", "Nǐ wǔfàn chī shénme?", "Bữa trưa bạn ăn gì?"],
  "hsk-vocab-00255": ["这件衣服很好看。", "Zhè jiàn yīfu hěn hǎokàn.", "Bộ quần áo này rất đẹp."],
  "hsk-vocab-00256": ["她是医生。", "Tā shì yīshēng.", "Cô ấy là bác sĩ."],
  "hsk-vocab-00257": ["医院在学校旁边。", "Yīyuàn zài xuéxiào pángbiān.", "Bệnh viện ở cạnh trường học."],
  "hsk-vocab-00258": ["我吃了一半。", "Wǒ chī le yíbàn.", "Tôi đã ăn một nửa."],
  "hsk-vocab-00260": ["椅子在桌子旁边。", "Yǐzi zài zhuōzi pángbiān.", "Ghế ở cạnh bàn."],
  "hsk-vocab-00261": ["我想喝一点儿水。", "Wǒ xiǎng hē yìdiǎnr shuǐ.", "Tôi muốn uống một ít nước."],
  "hsk-vocab-00262": ["我买了一些水果。", "Wǒ mǎi le yìxiē shuǐguǒ.", "Tôi đã mua một ít hoa quả."],
  "hsk-vocab-00268": ["一杯茶五元。", "Yì bēi chá wǔ yuán.", "Một cốc trà giá năm tệ."],
  "hsk-vocab-00274": ["我七点吃早饭。", "Wǒ qī diǎn chī zǎofàn.", "Tôi ăn sáng lúc bảy giờ."],
  "hsk-vocab-00278": ["我在找我的钱。", "Wǒ zài zhǎo wǒ de qián.", "Tôi đang tìm tiền của mình."],
  "hsk-vocab-00295": ["书在桌子上。", "Shū zài zhuōzi shàng.", "Sách ở trên bàn."],
  "hsk-vocab-00300": ["我妈妈在做饭。", "Wǒ māma zài zuòfàn.", "Mẹ tôi đang nấu cơm."],
};

const PART_OF_SPEECH = new Map([
  [null, "cụm từ"],
  ["", "cụm từ"],
  ["代", "đại từ"],
  ["动", "động từ"],
  ["名", "danh từ"],
  ["名、动", "danh từ; động từ"],
  ["名、量", "danh từ; lượng từ"],
  ["形", "tính từ"],
  ["形、动", "tính từ; động từ"],
  ["形、动、代、（数、副）", "tính từ; động từ; đại từ; số từ; phó từ"],
  ["数", "số từ"],
  ["数量", "cụm số lượng"],
  ["代、数", "đại từ; số từ"],
  ["量", "lượng từ"],
]);

const RESOLVED_FINDINGS = [
  {
    findingId: "quantity-answer-classifier-mismatch",
    pass: "pedagogy-rubric-and-distractors",
    summary: "Câu hỏi 你要几个？ được trả lời bằng 一点儿, không khớp đơn vị đếm 个.",
    resolution: "Projection local trả lời 我要三个。 để luyện đúng số + lượng từ đã hỏi.",
  },
  {
    findingId: "shopping-response-naturalness",
    pass: "mandarin-accuracy-and-naturalness",
    summary: "买，我找一下钱。 thiếu tự nhiên trong lượt chốt chọn quần áo.",
    resolution: "Projection local dùng 买，我要这件。 với nghĩa Tôi mua, tôi lấy chiếc này.",
  },
  {
    findingId: "separable-verb-lesson-placement",
    pass: "source-and-level-mapping",
    summary: "Điểm ngữ pháp động từ ly hợp được gắn vào bài ăn uống dù ví dụ chính thuộc sức khỏe/công việc.",
    resolution: "Projection local chuyển row 007 sang bài sức khỏe, nơi dạy 生病 và 看病.",
  },
  {
    findingId: "erhua-numbered-pinyin-runtime-shape",
    pass: "pinyin-and-tone-consistency",
    summary: "Hai mục 面条儿 và 一点儿 dùng hậu tố r5 tách rời, không tương thích với parser âm tiết runtime.",
    resolution: "Projection chuẩn hóa Pinyin số thành mian4tiaor2 và yi1dianr3, đồng thời giữ Pinyin hiển thị và thanh biến điệu chuẩn.",
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

export const applyHsk1DailyLifeOverrides = (unit, grammarPack) => {
  const lessons = structuredClone(unit.lessons);
  lessons[0].modelDialogue.turns[0].pinyin = "Zhège duōshao qián?";
  lessons[0].modelDialogue.turns[3] = {
    speaker: "B",
    hanzi: "我要三个。",
    pinyin: "Wǒ yào sān ge.",
    meaningVi: "Tôi muốn ba cái.",
  };
  lessons[2].modelDialogue.turns[3] = {
    speaker: "B",
    hanzi: "买，我要这件。",
    pinyin: "Mǎi, wǒ yào zhè jiàn.",
    meaningVi: "Có, tôi lấy chiếc này.",
  };
  lessons[1].grammarRowIds = lessons[1].grammarRowIds.filter(
    (id) => id !== "hsk1-grammar-row-007",
  );
  lessons[3].grammarRowIds = [
    ...lessons[3].grammarRowIds,
    "hsk1-grammar-row-007",
  ];
  const grammarDrafts = grammarPack.grammarDrafts
    .filter((item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID)
    .map((item) => item.officialGrammarRowId === "hsk1-grammar-row-007"
      ? { ...item, lessonId: lessons[3].lessonId }
      : structuredClone(item));
  const grammarPractice = grammarPack.practiceItems
    .filter((item) => unit.lessons.some(
      (lesson) => lesson.lessonId === item.lessonId,
    ))
    .map((item) => item.officialGrammarRowId === "hsk1-grammar-row-007"
      ? { ...item, lessonId: lessons[3].lessonId }
      : structuredClone(item));
  return { lessons, grammarDrafts, grammarPractice };
};

export const loadHsk1DailyLifeLocalStudySources = (
  root = process.cwd(),
) => ({
  root,
  profile: loadHskLocalStudyProfile(root),
  communicativeBundle: loadHsk1CommunicativeUnitPacksBundle(root),
  grammarBundle: loadHsk1GrammarContextPackBundle(root),
  taskBundle: loadHsk1TaskAssessmentPackBundle(root),
  vocabularySource: readJson(root, VOCABULARY_SOURCE_RELATIVE_PATH),
});

const selectedSourceMatch = (lexeme, vocabularyEntry) => {
  const matches = vocabularyEntry.sourceMatches.filter((match) =>
    lexeme.sourceLineSha256.includes(match.sourceLineSha256)
  );
  if (matches.length === 0) {
    throw new Error(`${lexeme.officialId} has no selected dictionary source`);
  }
  return matches[0];
};

const reviewedTarget = async (targetType, targetId, sourcePayload, payload) => ({
  targetType,
  targetId,
  sourceSha256: await sha256Json(sourcePayload),
  reviewedSha256: await sha256Json(payload ?? sourcePayload),
});

export const projectHsk1DailyLifeLocalStudy = async (
  source = loadHsk1DailyLifeLocalStudySources(),
) => {
  assertValidHsk1CommunicativeUnitPacksBundle(source.communicativeBundle);
  assertValidHsk1GrammarContextPackBundle(source.grammarBundle);
  assertValidHsk1TaskAssessmentPackBundle(source.taskBundle);
  if (source.profile.profileId !== HSK_LOCAL_STUDY_PROFILE_ID) {
    throw new Error("HSK local-study profile identity has drifted");
  }
  const unit = source.communicativeBundle.collection.packs.find(
    (candidate) => candidate.unitId === HSK1_DAILY_LIFE_UNIT_ID,
  );
  if (!unit) throw new Error("HSK1 daily-life authoring unit is missing");
  const taskPack = source.taskBundle.pack;
  const grammarPack = source.grammarBundle.pack;
  const overrides = applyHsk1DailyLifeOverrides(unit, grammarPack);
  const lessonIds = unit.lessons.map((lesson) => lesson.lessonId);
  const topics = taskPack.topicDrafts.filter(
    (item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID,
  );
  const tasks = taskPack.taskScenarios.filter(
    (item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID,
  );
  const taskPractice = taskPack.practiceItems.filter(
    (item) => lessonIds.includes(item.lessonId),
  );
  const counts = {
    lessons: unit.lessons.length,
    lexemes: unit.lexemes.length,
    vocabularyPractice: unit.practiceItems.length,
    dialogueTurns: unit.lessons.reduce(
      (sum, lesson) => sum + lesson.modelDialogue.turns.length,
      0,
    ),
    grammarDrafts: overrides.grammarDrafts.length,
    grammarPractice: overrides.grammarPractice.length,
    topics: topics.length,
    tasks: tasks.length,
    taskDialogueTurns: tasks.reduce(
      (sum, task) => sum + task.modelDialogue.turns.length,
      0,
    ),
    taskPractice: taskPractice.length,
  };
  counts.sourceTargets = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (!exact(counts, {
    lessons: 4,
    lexemes: 54,
    vocabularyPractice: 162,
    dialogueTurns: 16,
    grammarDrafts: 5,
    grammarPractice: 5,
    topics: 10,
    tasks: 5,
    taskDialogueTurns: 20,
    taskPractice: 5,
    sourceTargets: 286,
  })) {
    throw new Error("HSK1 daily-life source coverage has drifted");
  }

  const vocabularyById = new Map(source.vocabularySource.entries.map(
    (entry) => [entry.officialId, entry],
  ));
  const authoringLessonByVocabularyId = new Map();
  for (const lesson of unit.lessons) {
    for (const vocabularyId of lesson.vocabularyIds) {
      if (authoringLessonByVocabularyId.has(vocabularyId)) {
        throw new Error(`${vocabularyId} belongs to multiple daily-life lessons`);
      }
      authoringLessonByVocabularyId.set(vocabularyId, lesson.lessonId);
    }
  }
  const lexemes = [];
  for (const lexeme of unit.lexemes) {
    const sourceEntry = vocabularyById.get(lexeme.officialId);
    const example = EXAMPLES[lexeme.officialId];
    const authoringLessonId = authoringLessonByVocabularyId.get(
      lexeme.officialId,
    );
    const metadata = LESSON_METADATA[authoringLessonId];
    const sourceMatch = sourceEntry
      ? selectedSourceMatch(lexeme, sourceEntry)
      : null;
    const partOfSpeech = PART_OF_SPEECH.get(
      lexeme.officialPartOfSpeech ?? null,
    );
    if (!sourceMatch || !example || !metadata || !partOfSpeech) {
      throw new Error(`${lexeme.officialId} local-study projection is incomplete`);
    }
    const payload = {
      simplified: lexeme.simplified,
      traditional: sourceMatch.traditional,
      pinyin: compactPinyin(lexeme.pinyin),
      pinyinNumbered: NUMBERED_PINYIN_OVERRIDES[lexeme.officialId]
        ?? compactPinyin(sourceMatch.numberedPinyin),
      meaning: lexeme.vietnameseGlossDraft,
      partOfSpeech,
      example: example[0],
      examplePinyin: example[1],
      exampleMeaning: example[2],
      hsk: 1,
      tags: ["hsk1", "đời sống hằng ngày", metadata.domainTag],
    };
    lexemes.push({
      authoringItemId: lexeme.officialId,
      runtimeItemId: lexeme.officialId,
      authoringLessonId,
      runtimeLessonId: metadata.runtimeLessonId,
      sourceTargetSha256: await sha256Json(lexeme),
      selectedDictionaryLineSha256: sourceMatch.sourceLineSha256,
      payload,
      payloadSha256: await sha256Json({ itemType: "lexeme", payload }),
    });
  }

  const lessons = [];
  for (const [index, lesson] of overrides.lessons.entries()) {
    const metadata = LESSON_METADATA[lesson.lessonId];
    const prerequisiteId = index === 0
      ? PRIOR_UNIT_LAST_LESSON_ID
      : RUNTIME_LESSON_IDS[index - 1];
    const payload = {
      unitId: "daily",
      title: lesson.titleVi,
      chineseTitle: metadata.chineseTitle,
      objective: lesson.objectiveVi,
      minutes: metadata.minutes,
      xp: metadata.minutes * 5,
      wordIds: [...lesson.vocabularyIds],
      skills: [...metadata.skills],
    };
    lessons.push({
      authoringLessonId: lesson.lessonId,
      runtimeLessonId: metadata.runtimeLessonId,
      sourceTargetSha256: await sha256Json(unit.lessons[index]),
      reviewedTargetSha256: await sha256Json(lesson),
      prerequisites: [{ itemType: "lesson", itemId: prerequisiteId }],
      knowledgeItems: lesson.vocabularyIds.map((itemId) => ({
        itemType: "lexeme",
        itemId,
      })),
      payload,
      payloadSha256: await sha256Json({ itemType: "lesson", payload }),
    });
  }

  const reviewedTargets = [];
  for (const [index, lesson] of unit.lessons.entries()) {
    reviewedTargets.push(await reviewedTarget(
      "lesson-blueprint",
      lesson.lessonId,
      lesson,
      overrides.lessons[index],
    ));
    for (const [turnIndex, turn] of lesson.modelDialogue.turns.entries()) {
      reviewedTargets.push(await reviewedTarget(
        "dialogue-turn",
        `${lesson.lessonId}:dialogue-turn-${turnIndex + 1}`,
        turn,
        overrides.lessons[index].modelDialogue.turns[turnIndex],
      ));
    }
  }
  for (const lexeme of unit.lexemes) {
    reviewedTargets.push(await reviewedTarget(
      "vocabulary-draft",
      lexeme.officialId,
      lexeme,
    ));
  }
  for (const item of unit.practiceItems) {
    reviewedTargets.push(await reviewedTarget(
      "vocabulary-practice",
      item.itemId,
      item,
    ));
  }
  const originalGrammarById = new Map(grammarPack.grammarDrafts.map(
    (item) => [item.officialGrammarRowId, item],
  ));
  const originalGrammarPracticeById = new Map(grammarPack.practiceItems.map(
    (item) => [item.officialGrammarRowId, item],
  ));
  for (const item of overrides.grammarDrafts) {
    reviewedTargets.push(await reviewedTarget(
      "grammar-draft",
      item.officialGrammarRowId,
      originalGrammarById.get(item.officialGrammarRowId),
      item,
    ));
  }
  for (const item of overrides.grammarPractice) {
    reviewedTargets.push(await reviewedTarget(
      "grammar-practice",
      item.itemId,
      originalGrammarPracticeById.get(item.officialGrammarRowId),
      item,
    ));
  }
  for (const item of topics) {
    reviewedTargets.push(await reviewedTarget(
      "topic-draft",
      item.officialTopicId,
      item,
    ));
  }
  for (const task of tasks) {
    reviewedTargets.push(await reviewedTarget(
      "task-scenario",
      task.officialTaskId,
      task,
    ));
    for (const [index, turn] of task.modelDialogue.turns.entries()) {
      reviewedTargets.push(await reviewedTarget(
        "task-dialogue-turn",
        `${task.officialTaskId}:dialogue-turn-${index + 1}`,
        turn,
      ));
    }
  }
  for (const item of taskPractice) {
    reviewedTargets.push(await reviewedTarget(
      "task-practice",
      item.itemId,
      item,
    ));
  }
  reviewedTargets.sort((left, right) =>
    `${left.targetType}:${left.targetId}`.localeCompare(
      `${right.targetType}:${right.targetId}`,
      "en-US",
    )
  );
  if (reviewedTargets.length !== counts.sourceTargets) {
    throw new Error("HSK1 daily-life reviewed target partition is incomplete");
  }

  const corePayload = {
    schemaVersion: 1,
    projectionId: HSK1_DAILY_LIFE_CORE_ID,
    unitId: HSK1_DAILY_LIFE_UNIT_ID,
    targetContentVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
    lexemes,
    lessons,
    counts: {
      lexemes: lexemes.length,
      lessons: lessons.length,
      runtimeCatalogItems: lexemes.length + lessons.length,
    },
    policy: {
      aiAssistedReview: true,
      humanReviewed: false,
      learnerVisibleBeforeAuthorization: false,
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
  const passResults = Object.fromEntries(
    HSK_LOCAL_STUDY_REVIEW_PASSES.map((pass) => [pass, "passed"]),
  );
  const reviewPayload = {
    schemaVersion: 1,
    reviewId: HSK1_DAILY_LIFE_REVIEW_ID,
    profileId: HSK_LOCAL_STUDY_PROFILE_ID,
    unitId: HSK1_DAILY_LIFE_UNIT_ID,
    targetContentVersion: HSK1_DAILY_LIFE_TARGET_VERSION,
    reviewedAt: "2026-07-31T08:30:00.000Z",
    reviewer: {
      reviewerId: "openai-codex-ai-assisted-review",
      reviewerKind: "ai-coding-agent",
      humanReviewed: false,
      disclosureVi:
        "Nội dung được Codex rà soát bằng AI cho mục đích tự học; chưa được người bản ngữ kiểm duyệt.",
    },
    sourceBindings: [
      {
        id: "localStudyProfile",
        relativePath: HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH,
        selectedPayloadSha256: await sha256Json(source.profile),
      },
      {
        id: "communicativeUnit",
        relativePath: HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
        selectedPayloadSha256: await sha256Json(unit),
      },
      {
        id: "grammarUnit",
        relativePath: HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
        selectedPayloadSha256: await sha256Json({
          drafts: grammarPack.grammarDrafts.filter(
            (item) => item.unitId === HSK1_DAILY_LIFE_UNIT_ID,
          ),
          practice: grammarPack.practiceItems.filter(
            (item) => lessonIds.includes(item.lessonId),
          ),
        }),
      },
      {
        id: "taskUnit",
        relativePath: HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
        selectedPayloadSha256: await sha256Json({ topics, tasks, taskPractice }),
      },
      {
        id: "vocabularySources",
        relativePath: VOCABULARY_SOURCE_RELATIVE_PATH,
        selectedPayloadSha256: await sha256Json(unit.lexemes.map((lexeme) =>
          vocabularyById.get(lexeme.officialId)
        )),
      },
    ],
    coverage: {
      lessonIds: [...RUNTIME_LESSON_IDS],
      sourceTargetCount: reviewedTargets.length,
      sourceTargetTypeCounts: Object.fromEntries(
        [...new Set(reviewedTargets.map((item) => item.targetType))]
          .sort()
          .map((targetType) => [
            targetType,
            reviewedTargets.filter((item) => item.targetType === targetType)
              .length,
          ]),
      ),
      reviewedTargetDigest: await sha256Json(reviewedTargets),
      coreRuntimeTargetCount: lexemes.length + lessons.length,
      coreRuntimeDigest: await sha256Json(core),
    },
    reviewResult: {
      mode: "ai-assisted-self-review",
      schemaValid: true,
      sourceBound: true,
      aiAssistedDisclosed: true,
      humanReviewed: false,
      unresolvedIssueCount: 0,
      passResults,
    },
    findings: {
      resolved: RESOLVED_FINDINGS,
      unresolved: [],
    },
    claims: {
      readyForPersonalLocalStudyPackaging: true,
      humanReview: false,
      nativeAudio: false,
      calibratedAssessment: false,
      masteryEligible: false,
      officialHskCertification: false,
      productionEligible: false,
      sitesAuthorized: false,
    },
  };
  const review = {
    ...reviewPayload,
    reviewSha256: await sha256Json(reviewPayload),
  };
  return { review, core };
};

export const loadHsk1DailyLifeLocalStudyBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1DailyLifeLocalStudySources(root),
  review: readJson(root, HSK1_DAILY_LIFE_REVIEW_RELATIVE_PATH),
  core: readJson(root, HSK1_DAILY_LIFE_CORE_RELATIVE_PATH),
});

export const validateHsk1DailyLifeLocalStudyBundle = async (bundle) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1DailyLifeLocalStudy(bundle.source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    bundle.review?.reviewId !== HSK1_DAILY_LIFE_REVIEW_ID
    || bundle.review?.reviewer?.humanReviewed !== false
    || bundle.review?.reviewResult?.unresolvedIssueCount !== 0
    || bundle.review?.coverage?.sourceTargetCount !== 286
    || bundle.review?.coverage?.coreRuntimeTargetCount !== 58
    || bundle.review?.claims?.productionEligible !== false
    || bundle.core?.projectionId !== HSK1_DAILY_LIFE_CORE_ID
    || bundle.core?.lexemes?.length !== 54
    || bundle.core?.lessons?.length !== 4
  ) {
    errors.push("HSK1 daily-life local-study shape is invalid");
  }
  if (!exact(bundle.review, expected.review)) {
    errors.push("HSK1 daily-life review does not match exact selected sources");
  }
  if (!exact(bundle.core, expected.core)) {
    errors.push("HSK1 daily-life core projection does not match reviewed payloads");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      lessons: expected.core.counts.lessons,
      lexemes: expected.core.counts.lexemes,
      sourceTargets: expected.review.coverage.sourceTargetCount,
      resolvedFindings: expected.review.findings.resolved.length,
      humanReviewed: expected.review.reviewer.humanReviewed,
      productionEligible: expected.review.claims.productionEligible,
    },
  };
};

export const assertValidHsk1DailyLifeLocalStudyBundle = async (bundle) => {
  const result = await validateHsk1DailyLifeLocalStudyBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 daily-life local study:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};
