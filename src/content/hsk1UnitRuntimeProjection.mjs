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
  assertValidHsk1TaskAssessmentPackBundle,
  HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
  loadHsk1TaskAssessmentPackBundle,
} from "./hsk1TaskAssessmentPack.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH =
  "content/drafts/hsk1-time-place-events-runtime-projection-2026.07.json";
export const HSK1_UNIT_RUNTIME_PROJECTION_ID =
  "hsk1-time-place-events-runtime-projection-2026.07.1";

const UNIT_ID = "hsk1-time-place-events";
const TARGET_PACKAGE_VERSION = "foundation-2026.07.7";
const VOCABULARY_SOURCE_RELATIVE_PATH =
  "content/drafts/hsk1-vocabulary-2026.07.28.json";
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const LEXEME_PAYLOAD_KEYS = [
  "simplified",
  "traditional",
  "pinyin",
  "pinyinNumbered",
  "meaning",
  "partOfSpeech",
  "example",
  "examplePinyin",
  "exampleMeaning",
  "hsk",
  "tags",
];
const LESSON_PAYLOAD_KEYS = [
  "unitId",
  "title",
  "chineseTitle",
  "objective",
  "minutes",
  "xp",
  "skills",
  "wordIds",
];
const POLICY = {
  learnerVisible: false,
  aiAssistedRuntimeProjectionDraft: true,
  exactReviewerPacketBindingRequired: true,
  explicitSourceDecisionRequired: true,
  runtimeIdsMustBeSafeAndUnique: true,
  crossUnitRuntimePrerequisiteRequired: true,
  payloadReviewRequiredBeforeCatalogImport: true,
  projectsRuntimeCoreOnly: true,
  nonCoreTargetsMustNotBeDiscardedAtImport: true,
  packageOwnerAndLicenseNotInferred: true,
  releaseStateRemainsReview: true,
  browserTtsDoesNotSatisfyAudioReview: true,
  grantsMeasurementOrMastery: false,
};

const TRADITIONAL_DECISIONS = {
  "hsk-vocab-00080": "後",
  "hsk-vocab-00110": "裡",
  "hsk-vocab-00133": "哪裡",
  "hsk-vocab-00139": "那裡",
  "hsk-vocab-00149": "年",
  "hsk-vocab-00162": "千",
  "hsk-vocab-00282": "這裡",
};

const NUMBERED_PINYIN_OVERRIDES = {
  "hsk-vocab-00134": {
    value: "nar3",
    reason: "runtime-parser-erhua-normalization",
  },
  "hsk-vocab-00137": {
    value: "na4bian1",
    reason: "official-syllabus-pronunciation-over-neutral-source",
  },
  "hsk-vocab-00139": {
    value: "na4li3",
    reason: "official-syllabus-pronunciation-over-neutral-source",
  },
  "hsk-vocab-00140": {
    value: "nar4",
    reason: "runtime-parser-erhua-normalization",
  },
  "hsk-vocab-00283": {
    value: "zher4",
    reason: "runtime-parser-erhua-normalization",
  },
};

const PART_OF_SPEECH_DRAFTS = new Map([
  [null, "cụm động từ"],
  ["代", "đại từ"],
  ["代、（连）", "đại từ; liên từ"],
  ["前缀", "tiền tố"],
  ["副", "phó từ"],
  ["动", "động từ"],
  ["动、介、副", "động từ; giới từ; phó từ"],
  ["名", "danh từ"],
  ["名、动", "danh từ; động từ"],
  ["名、动、量", "danh từ; động từ; lượng từ"],
  ["名、后缀", "danh từ; hậu tố"],
  ["名、量", "danh từ; lượng từ"],
  ["形", "tính từ"],
  ["数", "số từ"],
  ["数、（副）", "số từ; phó từ"],
  ["量", "lượng từ"],
  ["量、（动、名）", "lượng từ; động từ; danh từ"],
  ["量、（名）", "lượng từ; danh từ"],
]);

const EXAMPLE_DRAFTS = {
  "hsk-vocab-00005": ["我白天上班。", "Wǒ báitiān shàngbān.", "Ban ngày tôi đi làm."],
  "hsk-vocab-00006": ["这本书一百块。", "Zhè běn shū yì bǎi kuài.", "Cuốn sách này giá một trăm tệ."],
  "hsk-vocab-00011": ["我坐在桌子边。", "Wǒ zuò zài zhuōzi biān.", "Tôi ngồi cạnh bàn."],
  "hsk-vocab-00029": ["我八点到学校。", "Wǒ bā diǎn dào xuéxiào.", "Tôi đến trường lúc tám giờ."],
  "hsk-vocab-00031": ["今天是第一天。", "Jīntiān shì dì yī tiān.", "Hôm nay là ngày đầu tiên."],
  "hsk-vocab-00080": ["下课后我回家。", "Xiàkè hòu wǒ huí jiā.", "Sau giờ học tôi về nhà."],
  "hsk-vocab-00093": ["我今年二十岁。", "Wǒ jīnnián èrshí suì.", "Năm nay tôi hai mươi tuổi."],
  "hsk-vocab-00109": ["今天很冷。", "Jīntiān hěn lěng.", "Hôm nay rất lạnh."],
  "hsk-vocab-00110": ["人在房间里。", "Rén zài fángjiān lǐ.", "Người ở trong phòng."],
  "hsk-vocab-00112": ["现在是八点零五分。", "Xiànzài shì bā diǎn líng wǔ fēn.", "Bây giờ là tám giờ lẻ năm phút."],
  "hsk-vocab-00113": ["我六点起床。", "Wǒ liù diǎn qǐchuáng.", "Tôi thức dậy lúc sáu giờ."],
  "hsk-vocab-00128": ["我明年去中国。", "Wǒ míngnián qù Zhōngguó.", "Năm sau tôi đi Trung Quốc."],
  "hsk-vocab-00131": ["你要哪本书？", "Nǐ yào nǎ běn shū?", "Bạn muốn quyển sách nào?"],
  "hsk-vocab-00132": ["你要哪个杯子？", "Nǐ yào nǎge bēizi?", "Bạn muốn cái cốc nào?"],
  "hsk-vocab-00135": ["哪些书是你的？", "Nǎxiē shū shì nǐ de?", "Những quyển sách nào là của bạn?"],
  "hsk-vocab-00136": ["那是我的书。", "Nà shì wǒ de shū.", "Kia là sách của tôi."],
  "hsk-vocab-00138": ["那个人是我老师。", "Nàge rén shì wǒ lǎoshī.", "Người kia là giáo viên của tôi."],
  "hsk-vocab-00139": ["我的书在那里。", "Wǒ de shū zài nàlǐ.", "Sách của tôi ở đó."],
  "hsk-vocab-00140": ["他住在那儿。", "Tā zhù zài nàr.", "Anh ấy sống ở chỗ kia."],
  "hsk-vocab-00141": ["那些学生在教室里。", "Nàxiē xuésheng zài jiàoshì lǐ.", "Những học sinh kia ở trong lớp học."],
  "hsk-vocab-00149": ["我学了一年汉语。", "Wǒ xué le yì nián Hànyǔ.", "Tôi đã học tiếng Trung một năm."],
  "hsk-vocab-00163": ["学校前边有一家商店。", "Xuéxiào qiánbian yǒu yì jiā shāngdiàn.", "Phía trước trường có một cửa hàng."],
  "hsk-vocab-00168": ["我去年开始学汉语。", "Wǒ qùnián kāishǐ xué Hànyǔ.", "Năm ngoái tôi bắt đầu học tiếng Trung."],
  "hsk-vocab-00172": ["今天是十月一日。", "Jīntiān shì shí yuè yī rì.", "Hôm nay là ngày 1 tháng 10."],
  "hsk-vocab-00175": ["书在桌子上。", "Shū zài zhuōzi shàng.", "Sách ở trên bàn."],
  "hsk-vocab-00178": ["我上午有课。", "Wǒ shàngwǔ yǒu kè.", "Buổi sáng tôi có giờ học."],
  "hsk-vocab-00185": ["你什么时候回家？", "Nǐ shénme shíhou huí jiā?", "Khi nào bạn về nhà?"],
  "hsk-vocab-00207": ["三天以后我回家。", "Sān tiān yǐhòu wǒ huí jiā.", "Ba ngày sau tôi về nhà."],
  "hsk-vocab-00212": ["门外有人。", "Mén wài yǒu rén.", "Ngoài cửa có người."],
  "hsk-vocab-00213": ["外边正在下雨。", "Wàibian zhèngzài xià yǔ.", "Bên ngoài đang mưa."],
  "hsk-vocab-00215": ["今天我回家很晚。", "Jīntiān wǒ huí jiā hěn wǎn.", "Hôm nay tôi về nhà rất muộn."],
  "hsk-vocab-00217": ["我晚上八点学习。", "Wǒ wǎnshang bā diǎn xuéxí.", "Tôi học lúc tám giờ tối."],
  "hsk-vocab-00226": ["猫在椅子下。", "Māo zài yǐzi xià.", "Mèo ở dưới ghế."],
  "hsk-vocab-00162": ["这台电脑三千块。", "Zhè tái diànnǎo sān qiān kuài.", "Máy tính này giá ba nghìn tệ."],
  "hsk-vocab-00173": ["我有三本书。", "Wǒ yǒu sān běn shū.", "Tôi có ba quyển sách."],
  "hsk-vocab-00223": ["我们五点见。", "Wǒmen wǔ diǎn jiàn.", "Chúng ta gặp nhau lúc năm giờ."],
  "hsk-vocab-00236": ["我每天学习两个小时。", "Wǒ měitiān xuéxí liǎng ge xiǎoshí.", "Mỗi ngày tôi học hai giờ."],
  "hsk-vocab-00239": ["我买了一些水果。", "Wǒ mǎi le yìxiē shuǐguǒ.", "Tôi đã mua một ít trái cây."],
  "hsk-vocab-00244": ["星期日我不上班。", "Xīngqīrì wǒ bù shàngbān.", "Chủ nhật tôi không đi làm."],
  "hsk-vocab-00245": ["我们星期天去公园。", "Wǒmen xīngqītiān qù gōngyuán.", "Chủ nhật chúng tôi đi công viên."],
  "hsk-vocab-00251": ["外边有雪。", "Wàibian yǒu xuě.", "Bên ngoài có tuyết."],
  "hsk-vocab-00254": ["我有一个妹妹。", "Wǒ yǒu yí ge mèimei.", "Tôi có một em gái."],
  "hsk-vocab-00267": ["今天的雨很大。", "Jīntiān de yǔ hěn dà.", "Mưa hôm nay rất lớn."],
  "hsk-vocab-00271": ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."],
  "hsk-vocab-00273": ["我今天很早到学校。", "Wǒ jīntiān hěn zǎo dào xuéxiào.", "Hôm nay tôi đến trường rất sớm."],
  "hsk-vocab-00279": ["这是我的书。", "Zhè shì wǒ de shū.", "Đây là sách của tôi."],
  "hsk-vocab-00280": ["请来这边。", "Qǐng lái zhèbiān.", "Mời đến bên này."],
  "hsk-vocab-00281": ["这个人是我朋友。", "Zhège rén shì wǒ péngyou.", "Người này là bạn của tôi."],
  "hsk-vocab-00283": ["请坐这儿。", "Qǐng zuò zhèr.", "Mời ngồi chỗ này."],
  "hsk-vocab-00284": ["这些都是我的书。", "Zhèxiē dōu shì wǒ de shū.", "Những quyển này đều là sách của tôi."],
  "hsk-vocab-00286": ["他正在吃饭。", "Tā zhèngzài chīfàn.", "Anh ấy đang ăn cơm."],
  "hsk-vocab-00291": ["我们中午十二点吃饭。", "Wǒmen zhōngwǔ shí'èr diǎn chīfàn.", "Chúng tôi ăn trưa lúc mười hai giờ."],
  "hsk-vocab-00297": ["我昨天在学校。", "Wǒ zuótiān zài xuéxiào.", "Hôm qua tôi ở trường."],
};

const LESSON_METADATA = {
  "hsk1-time-place-events:01-numbers": {
    chineseTitle: "数字基础",
    minutes: 24,
    skills: ["vocabulary", "listening", "reading"],
    domainTag: "số đếm",
  },
  "hsk1-time-place-events:02-calendar": {
    chineseTitle: "日期和年份",
    minutes: 20,
    skills: ["vocabulary", "grammar", "reading"],
    domainTag: "lịch và năm",
  },
  "hsk1-time-place-events:03-week-and-day-parts": {
    chineseTitle: "星期和一天的时段",
    minutes: 22,
    skills: ["listening", "vocabulary", "reading"],
    domainTag: "tuần và buổi trong ngày",
  },
  "hsk1-time-place-events:04-clock-and-duration": {
    chineseTitle: "钟点和时长",
    minutes: 22,
    skills: ["listening", "vocabulary", "grammar"],
    domainTag: "giờ và thời lượng",
  },
  "hsk1-time-place-events:05-location": {
    chineseTitle: "位置和指示词",
    minutes: 28,
    skills: ["grammar", "vocabulary", "reading"],
    domainTag: "vị trí",
  },
  "hsk1-time-place-events:06-weather-and-residence": {
    chineseTitle: "天气和住处",
    minutes: 22,
    skills: ["listening", "vocabulary", "reading"],
    domainTag: "thời tiết và nơi ở",
  },
};

const readJson = (root, relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});
const runtimeLessonId = (authoringId) => authoringId.replaceAll(":", "-");
const compactPinyin = (value) => value
  .replace(/[\s'’-]/gu, "")
  .toLocaleLowerCase("en");

export const loadHsk1UnitRuntimeProjectionSources = (
  root = process.cwd(),
) => ({
  root,
  communicativeBundle: loadHsk1CommunicativeUnitPacksBundle(root),
  grammarBundle: loadHsk1GrammarContextPackBundle(root),
  taskBundle: loadHsk1TaskAssessmentPackBundle(root),
  vocabularySource: readJson(root, VOCABULARY_SOURCE_RELATIVE_PATH),
});

const lessonByVocabularyId = (pack) => {
  const index = new Map();
  for (const lesson of pack.lessons) {
    for (const officialId of lesson.vocabularyIds) {
      if (index.has(officialId)) {
        throw new Error(`${officialId} belongs to multiple projection lessons`);
      }
      index.set(officialId, lesson.lessonId);
    }
  }
  return index;
};

const selectSourceMatch = (target, source) => {
  const traditionalDecision = TRADITIONAL_DECISIONS[target.targetId];
  const candidates = traditionalDecision
    ? source.sourceMatches.filter(
      (match) => match.traditional === traditionalDecision,
    )
    : source.sourceMatches;
  if (candidates.length !== 1) {
    throw new Error(`${target.targetId} traditional source is unresolved`);
  }
  return candidates[0];
};

const exampleFor = (target, dialogueTargets) => {
  const explicit = EXAMPLE_DRAFTS[target.targetId];
  if (explicit) {
    return {
      example: explicit[0],
      examplePinyin: explicit[1],
      exampleMeaning: explicit[2],
      provenance: {
        kind: "ai-assisted-new-example-draft",
        sourceTargetId: null,
        sourceTargetSha256: null,
      },
    };
  }
  const dialogueTarget = dialogueTargets.find(
    (candidate) =>
      candidate.targetType === "dialogue-turn"
      && candidate.payload.hanzi.includes(target.payload.simplified),
  );
  if (!dialogueTarget) {
    throw new Error(`${target.targetId} runtime example is missing`);
  }
  return {
    example: dialogueTarget.payload.hanzi,
    examplePinyin: dialogueTarget.payload.pinyin,
    exampleMeaning: dialogueTarget.payload.meaningVi,
    provenance: {
      kind: "reviewer-packet-dialogue-surface-match-draft",
      sourceTargetId: dialogueTarget.targetId,
      sourceTargetSha256: dialogueTarget.sha256,
    },
  };
};

export const projectHsk1UnitRuntimeProjection = async (
  source = loadHsk1UnitRuntimeProjectionSources(),
) => {
  assertValidHsk1CommunicativeUnitPacksBundle(source.communicativeBundle);
  assertValidHsk1GrammarContextPackBundle(source.grammarBundle);
  assertValidHsk1TaskAssessmentPackBundle(source.taskBundle);
  const pack = source.communicativeBundle.collection.packs.find(
    (candidate) => candidate.unitId === UNIT_ID,
  );
  if (!pack) throw new Error(`${UNIT_ID} communicative pack is missing`);
  const grammarPack = source.grammarBundle.pack;
  const taskPack = source.taskBundle.pack;
  const vocabularySourceById = new Map(source.vocabularySource.entries.map(
    (entry) => [entry.officialId, entry],
  ));
  const vocabularyLessonIndex = lessonByVocabularyId(pack);
  const lexemeTargets = await Promise.all(pack.lexemes.map(async (payload) => ({
    targetType: "vocabulary-draft",
    targetId: payload.officialId,
    payload,
    sha256: await sha256Json(payload),
  })));
  const lessonTargets = await Promise.all(pack.lessons.map(async (payload) => ({
    targetType: "lesson-blueprint",
    targetId: payload.lessonId,
    payload,
    sha256: await sha256Json(payload),
  })));
  const dialogueTargets = await Promise.all(pack.lessons.flatMap(
    (lesson) => lesson.modelDialogue.turns.map(async (payload, index) => ({
      targetType: "dialogue-turn",
      targetId: `${lesson.lessonId}:dialogue-turn-${index + 1}`,
      payload,
      sha256: await sha256Json(payload),
    })),
  ));
  if (lexemeTargets.length !== 81 || lessonTargets.length !== 6) {
    throw new Error("HSK1 runtime projection target counts have drifted");
  }
  const lessonIds = pack.lessons.map((lesson) => lesson.lessonId);
  const unitGrammarDrafts = grammarPack.grammarDrafts.filter(
    (draft) => draft.unitId === UNIT_ID,
  );
  const unitGrammarPractice = grammarPack.practiceItems.filter(
    (item) => lessonIds.includes(item.lessonId),
  );
  const unitTopics = taskPack.topicDrafts.filter(
    (topic) => topic.unitId === UNIT_ID,
  );
  const unitTasks = taskPack.taskScenarios.filter(
    (task) => task.unitId === UNIT_ID,
  );
  const unitTaskPractice = taskPack.practiceItems.filter(
    (item) => lessonIds.includes(item.lessonId),
  );
  const unrepresentedTargetCounts = {
    "dialogue-turn": dialogueTargets.length,
    "grammar-draft": unitGrammarDrafts.length,
    "grammar-practice": unitGrammarPractice.length,
    "task-dialogue-turn": unitTasks.reduce(
      (sum, task) => sum + task.modelDialogue.turns.length,
      0,
    ),
    "task-practice": unitTaskPractice.length,
    "task-scenario": unitTasks.length,
    "topic-draft": unitTopics.length,
    "vocabulary-practice": pack.practiceItems.length,
  };
  const unrepresentedTargetCount = Object.values(
    unrepresentedTargetCounts,
  ).reduce((sum, count) => sum + count, 0);
  if (unrepresentedTargetCount !== 338) {
    throw new Error("HSK1 runtime non-core target count has drifted");
  }
  const lexemes = [];
  for (const target of lexemeTargets) {
    const sourceEntry = vocabularySourceById.get(target.targetId);
    const authoringLessonId = vocabularyLessonIndex.get(target.targetId);
    if (!sourceEntry || !authoringLessonId) {
      throw new Error(`${target.targetId} projection source is missing`);
    }
    const selectedSourceMatch = selectSourceMatch(target, sourceEntry);
    if (!target.payload.sourceLineSha256.includes(
      selectedSourceMatch.sourceLineSha256,
    )) {
      throw new Error(`${target.targetId} source-line binding has drifted`);
    }
    const example = exampleFor(target, dialogueTargets);
    const pinyinOverride = NUMBERED_PINYIN_OVERRIDES[target.targetId];
    const partOfSpeech = PART_OF_SPEECH_DRAFTS.get(
      target.payload.officialPartOfSpeech,
    );
    const lessonMetadata = LESSON_METADATA[authoringLessonId];
    if (!partOfSpeech || !lessonMetadata) {
      throw new Error(`${target.targetId} projection metadata is missing`);
    }
    const payload = {
      simplified: target.payload.simplified,
      traditional: selectedSourceMatch.traditional,
      pinyin: compactPinyin(target.payload.pinyin),
      pinyinNumbered: compactPinyin(
        pinyinOverride?.value ?? selectedSourceMatch.numberedPinyin,
      ),
      meaning: target.payload.vietnameseGlossDraft,
      partOfSpeech,
      example: example.example,
      examplePinyin: example.examplePinyin,
      exampleMeaning: example.exampleMeaning,
      hsk: 1,
      tags: ["hsk1", "thời gian, địa điểm và sự kiện", lessonMetadata.domainTag],
    };
    lexemes.push({
      authoringItemId: target.targetId,
      runtimeItemId: target.targetId,
      authoringLessonId,
      runtimeLessonId: runtimeLessonId(authoringLessonId),
      sourceTargetSha256: target.sha256,
      sourceDecision: {
        selectedCedictLineSha256: selectedSourceMatch.sourceLineSha256,
        traditionalDecisionRequired: Boolean(
          TRADITIONAL_DECISIONS[target.targetId],
        ),
        numberedPinyinOverrideReason: pinyinOverride?.reason ?? null,
        originalPartOfSpeech: target.payload.officialPartOfSpeech,
        example: example.provenance,
      },
      plannedReleaseState: "review",
      payload,
      payloadSha256: await sha256Json({ itemType: "lexeme", payload }),
      review: {
        status: "pending",
        requiredRoles: ["native-mandarin-reviewer", "vietnamese-editor"],
        approvalReceiptIds: [],
      },
    });
  }
  const lessonRuntimeIdByAuthoringId = new Map(lessonTargets.map(
    (target) => [target.targetId, runtimeLessonId(target.targetId)],
  ));
  const lessons = [];
  for (const target of lessonTargets) {
    const metadata = LESSON_METADATA[target.targetId];
    if (!metadata) throw new Error(`${target.targetId} lesson metadata is missing`);
    const prerequisiteIds = target.payload.prerequisiteLessonIds.map(
      (authoringId) => lessonRuntimeIdByAuthoringId.get(authoringId),
    );
    if (prerequisiteIds.some((id) => !id)) {
      throw new Error(`${target.targetId} prerequisite projection is missing`);
    }
    if (target.payload.sequence === 1) prerequisiteIds.unshift("survival-4");
    const payload = {
      unitId: UNIT_ID,
      title: target.payload.titleVi,
      chineseTitle: metadata.chineseTitle,
      objective: target.payload.objectiveVi,
      minutes: metadata.minutes,
      xp: metadata.minutes * 5,
      skills: metadata.skills,
      wordIds: target.payload.vocabularyIds,
    };
    lessons.push({
      authoringLessonId: target.targetId,
      runtimeLessonId: lessonRuntimeIdByAuthoringId.get(target.targetId),
      sourceTargetSha256: target.sha256,
      plannedReleaseState: "review",
      prerequisites: prerequisiteIds.map((itemId) => ({
        itemType: "lesson",
        itemId,
      })),
      knowledgeItems: target.payload.vocabularyIds.map((itemId) => ({
        itemType: "lexeme",
        itemId,
      })),
      payload,
      payloadSha256: await sha256Json({ itemType: "lesson", payload }),
      review: {
        status: "pending",
        requiredRoles: [
          "native-mandarin-reviewer",
          "vietnamese-editor",
          "assessment-editor",
        ],
        approvalReceiptIds: [],
      },
    });
  }
  const reviewBatches = [];
  for (const lesson of lessons) {
    const lessonLexemes = lexemes.filter(
      (lexeme) => lexeme.runtimeLessonId === lesson.runtimeLessonId,
    );
    const targetDigests = [
      lesson.payloadSha256,
      ...lessonLexemes.map((lexeme) => lexeme.payloadSha256),
    ];
    reviewBatches.push({
      batchId: `${lesson.runtimeLessonId}-runtime-projection-review-v1`,
      authoringLessonId: lesson.authoringLessonId,
      runtimeLessonId: lesson.runtimeLessonId,
      targetDigests,
      targetDigest: await sha256Json(targetDigests),
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ],
      approvals: [],
      state: "pending",
    });
  }
  const projection = {
    schemaVersion: 1,
    projectionId: HSK1_UNIT_RUNTIME_PROJECTION_ID,
    state: "ai-assisted-runtime-projection-draft",
    unitId: UNIT_ID,
    targetPackageVersion: TARGET_PACKAGE_VERSION,
    learnerVisible: false,
    releaseEligible: false,
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "communicativeCollection",
        HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "grammarPack",
        HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "taskPack",
        HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "vocabularySource",
        VOCABULARY_SOURCE_RELATIVE_PATH,
      ),
    ],
    lexemes,
    lessons,
    reviewBatches,
    runtimeRepresentability: {
      sourceContentTargets:
        lexemes.length + lessons.length + unrepresentedTargetCount,
      directlyProjectedCoreTargets: lexemes.length + lessons.length,
      unrepresentedNonCoreTargets: unrepresentedTargetCount,
      unrepresentedTargetCounts,
      requiredNextSchemaSurface:
        "versioned lesson activity/dialogue and knowledge projection",
      exactReviewedPracticeCurrentlyConsumedByRuntime: false,
      packageImportMustRemainBlocked: true,
    },
    counts: {
      runtimeCatalogItems: lexemes.length + lessons.length,
      lexemes: lexemes.length,
      lessons: lessons.length,
      safeRuntimeLexemeIds: lexemes.filter(
        (lexeme) => SAFE_ID_PATTERN.test(lexeme.runtimeItemId),
      ).length,
      safeRuntimeLessonIds: lessons.filter(
        (lesson) => SAFE_ID_PATTERN.test(lesson.runtimeLessonId),
      ).length,
      traditionalEditorialDecisions: lexemes.filter(
        (lexeme) => lexeme.sourceDecision.traditionalDecisionRequired,
      ).length,
      numberedPinyinOverrides: lexemes.filter(
        (lexeme) => lexeme.sourceDecision.numberedPinyinOverrideReason,
      ).length,
      newExampleDrafts: lexemes.filter(
        (lexeme) =>
          lexeme.sourceDecision.example.kind === "ai-assisted-new-example-draft",
      ).length,
      dialogueExampleCandidates: lexemes.filter(
        (lexeme) =>
          lexeme.sourceDecision.example.kind
            === "reviewer-packet-dialogue-surface-match-draft",
      ).length,
      crossUnitPrerequisites: lessons.flatMap(
        (lesson) => lesson.prerequisites,
      ).filter((reference) => reference.itemId === "survival-4").length,
      reviewBatches: reviewBatches.length,
      requiredReviewSlots: reviewBatches.reduce(
        (sum, batch) => sum + batch.requiredRoles.length,
        0,
      ),
      approvals: 0,
      finalizedPayloads: 0,
      unrepresentedNonCoreTargets: unrepresentedTargetCount,
      releaseEligibleItems: 0,
    },
    claims: {
      payloadsAuthored: true,
      fullUnitRuntimeProjectionComplete: false,
      humanReviewComplete: false,
      packageGovernanceComplete: false,
      packageImportAuthorized: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      completionGranted: false,
      masteryGranted: false,
    },
  };
  return {
    ...projection,
    projectionSha256: await sha256Json(projection),
  };
};

export const validateHsk1UnitRuntimeProjectionBundle = async ({
  source,
  projection,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectHsk1UnitRuntimeProjection(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (!exact(projection, expected)) {
    errors.push("HSK1 unit runtime projection does not match checked sources");
  }
  if (
    projection?.learnerVisible !== false
    || projection?.releaseEligible !== false
    || projection?.claims?.payloadsAuthored !== true
    || Object.entries(projection?.claims ?? {}).some(
      ([key, value]) => key !== "payloadsAuthored" && value !== false,
    )
    || projection?.counts?.finalizedPayloads !== 0
    || projection?.counts?.approvals !== 0
    || projection?.runtimeRepresentability?.packageImportMustRemainBlocked
      !== true
    || projection?.runtimeRepresentability
      ?.exactReviewedPracticeCurrentlyConsumedByRuntime !== false
    || projection?.lexemes?.some((lexeme) =>
      Object.keys(lexeme.payload).length !== LEXEME_PAYLOAD_KEYS.length
      || !LEXEME_PAYLOAD_KEYS.every((key) =>
        Object.hasOwn(lexeme.payload, key)
      )
      || lexeme.plannedReleaseState !== "review"
      || lexeme.review.status !== "pending"
      || lexeme.review.approvalReceiptIds.length !== 0
    )
    || projection?.lessons?.some((lesson) =>
      Object.keys(lesson.payload).length !== LESSON_PAYLOAD_KEYS.length
      || !LESSON_PAYLOAD_KEYS.every((key) =>
        Object.hasOwn(lesson.payload, key)
      )
      || lesson.plannedReleaseState !== "review"
      || lesson.review.status !== "pending"
      || lesson.review.approvalReceiptIds.length !== 0
    )
  ) {
    errors.push("HSK1 unit runtime projection is not fail-closed");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: expected.counts,
  };
};

export const assertValidHsk1UnitRuntimeProjectionBundle = async (bundle) => {
  const result = await validateHsk1UnitRuntimeProjectionBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 unit runtime projection:\n- ${result.errors.join("\n- ")}`,
    );
  }
  return result;
};

export const loadHsk1UnitRuntimeProjectionBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1UnitRuntimeProjectionSources(root),
  projectionPath: resolve(root, HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH),
  projection: readJson(root, HSK1_UNIT_RUNTIME_PROJECTION_RELATIVE_PATH),
});
