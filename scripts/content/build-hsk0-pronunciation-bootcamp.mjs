import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK0_PRONUNCIATION_SOURCE_RELATIVE_PATH =
  "content/sources/official-hanyu-pinyin-scheme-1958/source.json";
export const HSK0_PRONUNCIATION_BOOTCAMP_RELATIVE_PATH =
  "content/drafts/hsk0-pronunciation-bootcamp-2026.07.json";

const PACK_ID = "hsk0-pronunciation-bootcamp-2026.07";

const INITIALS = [
  ["b", "bō", "玻", "hsk0-pronunciation-02"],
  ["p", "pō", "坡", "hsk0-pronunciation-02"],
  ["m", "mō", "摸", "hsk0-pronunciation-01"],
  ["f", "fó", "佛", "hsk0-pronunciation-01"],
  ["d", "dé", "得", "hsk0-pronunciation-02"],
  ["t", "tè", "特", "hsk0-pronunciation-02"],
  ["n", "nè", "讷", "hsk0-pronunciation-01"],
  ["l", "lè", "勒", "hsk0-pronunciation-01"],
  ["g", "gē", "哥", "hsk0-pronunciation-02"],
  ["k", "kē", "科", "hsk0-pronunciation-02"],
  ["h", "hē", "喝", "hsk0-pronunciation-01"],
  ["j", "jī", "基", "hsk0-pronunciation-05"],
  ["q", "qī", "欺", "hsk0-pronunciation-05"],
  ["x", "xī", "希", "hsk0-pronunciation-05"],
  ["zh", "zhī", "知", "hsk0-pronunciation-04"],
  ["ch", "chī", "蚩", "hsk0-pronunciation-04"],
  ["sh", "shī", "诗", "hsk0-pronunciation-04"],
  ["r", "rì", "日", "hsk0-pronunciation-04"],
  ["z", "zī", "资", "hsk0-pronunciation-03"],
  ["c", "cí", "雌", "hsk0-pronunciation-03"],
  ["s", "sī", "思", "hsk0-pronunciation-03"],
].map(([symbol, examplePinyin, exampleHanzi, lessonId]) => ({
  targetId: `initial:${symbol}`,
  kind: "official-initial",
  symbol,
  examplePinyin,
  exampleHanzi,
  lessonId,
}));

const FINALS = [
  ["i", "yi", "yī", "衣", "hsk0-pronunciation-06"],
  ["u", "wu", "wū", "乌", "hsk0-pronunciation-06"],
  ["ü", "yu", "yū", "迂", "hsk0-pronunciation-05"],
  ["a", "a", "ā", "啊", "hsk0-pronunciation-06"],
  ["ia", "ya", "yā", "呀", "hsk0-pronunciation-07"],
  ["ua", "wa", "wā", "蛙", "hsk0-pronunciation-07"],
  ["o", "o", "ō", "喔", "hsk0-pronunciation-06"],
  ["uo", "wo", "wō", "窝", "hsk0-pronunciation-07"],
  ["e", "e", "é", "鹅", "hsk0-pronunciation-06"],
  ["ie", "ye", "yē", "耶", "hsk0-pronunciation-07"],
  ["üe", "yue", "yuē", "约", "hsk0-pronunciation-05"],
  ["ai", "ai", "āi", "哀", "hsk0-pronunciation-07"],
  ["uai", "wai", "wāi", "歪", "hsk0-pronunciation-07"],
  ["ei", "ei", "ēi", "欸", "hsk0-pronunciation-07"],
  ["uei", "wei", "wēi", "威", "hsk0-pronunciation-07"],
  ["ao", "ao", "áo", "熬", "hsk0-pronunciation-07"],
  ["iao", "yao", "yāo", "腰", "hsk0-pronunciation-07"],
  ["ou", "ou", "ōu", "欧", "hsk0-pronunciation-07"],
  ["iou", "you", "yōu", "忧", "hsk0-pronunciation-07"],
  ["an", "an", "ān", "安", "hsk0-pronunciation-08"],
  ["ian", "yan", "yān", "烟", "hsk0-pronunciation-08"],
  ["uan", "wan", "wān", "弯", "hsk0-pronunciation-08"],
  ["üan", "yuan", "yuān", "冤", "hsk0-pronunciation-05"],
  ["en", "en", "ēn", "恩", "hsk0-pronunciation-08"],
  ["in", "yin", "yīn", "因", "hsk0-pronunciation-08"],
  ["uen", "wen", "wēn", "温", "hsk0-pronunciation-08"],
  ["ün", "yun", "yūn", "晕", "hsk0-pronunciation-05"],
  ["ang", "ang", "áng", "昂", "hsk0-pronunciation-08"],
  ["iang", "yang", "yāng", "央", "hsk0-pronunciation-08"],
  ["uang", "wang", "wāng", "汪", "hsk0-pronunciation-08"],
  ["eng", "heng", "hēng", "亨", "hsk0-pronunciation-08"],
  ["ing", "ying", "yīng", "英", "hsk0-pronunciation-08"],
  ["ueng", "weng", "wēng", "翁", "hsk0-pronunciation-08"],
  ["ong", "hong", "hōng", "轰", "hsk0-pronunciation-08"],
  ["iong", "yong", "yōng", "雍", "hsk0-pronunciation-08"],
  ["er", "er", "ér", "儿", "hsk0-pronunciation-06"],
].map((
  [tableSpelling, sampleSyllableSpelling, examplePinyin, exampleHanzi, lessonId],
  index,
) => ({
  targetId: `final:${tableSpelling}`,
  kind: index === 35 ? "official-special-final" : "official-final-table-cell",
  tableSpelling,
  sampleSyllableSpelling,
  examplePinyin,
  exampleHanzi,
  lessonId,
}));

const ORTHOGRAPHY_RULES = [
  {
    targetId: "orthography:zero-initial-i",
    lessonId: "hsk0-pronunciation-01",
    rule: "i-series-zero-initial-uses-y",
  },
  {
    targetId: "orthography:zero-initial-u",
    lessonId: "hsk0-pronunciation-01",
    rule: "u-series-zero-initial-uses-w",
  },
  {
    targetId: "orthography:zero-initial-umlaut-u",
    lessonId: "hsk0-pronunciation-05",
    rule: "umlaut-u-series-zero-initial-uses-y-and-drops-dots",
  },
  {
    targetId: "orthography:jqx-drops-umlaut",
    lessonId: "hsk0-pronunciation-05",
    rule: "umlaut-dots-omitted-after-j-q-x",
  },
  {
    targetId: "orthography:nl-keeps-umlaut",
    lessonId: "hsk0-pronunciation-05",
    rule: "umlaut-dots-retained-after-n-l",
  },
  {
    targetId: "orthography:contract-iou",
    lessonId: "hsk0-pronunciation-07",
    rule: "iou-contracts-to-iu-after-initial",
  },
  {
    targetId: "orthography:contract-uei",
    lessonId: "hsk0-pronunciation-07",
    rule: "uei-contracts-to-ui-after-initial",
  },
  {
    targetId: "orthography:contract-uen",
    lessonId: "hsk0-pronunciation-08",
    rule: "uen-contracts-to-un-after-initial",
  },
].map((target) => ({
  kind: "official-orthography-rule",
  ...target,
}));

const CONTRASTS = [
  ["b-p", "b", "p", "bā", "pā", "hsk0-pronunciation-02"],
  ["d-t", "d", "t", "dā", "tā", "hsk0-pronunciation-02"],
  ["g-k", "g", "k", "gā", "kā", "hsk0-pronunciation-02"],
  ["z-c", "z", "c", "zā", "cā", "hsk0-pronunciation-03"],
  ["zh-ch", "zh", "ch", "zhā", "chā", "hsk0-pronunciation-04"],
  ["j-q", "j", "q", "jiā", "qiā", "hsk0-pronunciation-05"],
  ["z-zh", "z", "zh", "zā", "zhā", "hsk0-pronunciation-04"],
  ["c-ch", "c", "ch", "cā", "chā", "hsk0-pronunciation-04"],
  ["s-sh", "s", "sh", "sā", "shā", "hsk0-pronunciation-04"],
  ["x-sh", "x", "sh", "xiā", "shā", "hsk0-pronunciation-05"],
].map(([id, left, right, leftSample, rightSample, lessonId]) => ({
  targetId: `contrast:${id}`,
  kind: "pedagogical-contrast",
  left,
  right,
  leftSample,
  rightSample,
  lessonId,
  lexicalClaim: false,
}));

const TONES = [
  ["tone-1", 1, "high-level", "ˉ"],
  ["tone-2", 2, "rising", "ˊ"],
  ["tone-3", 3, "low-dipping", "ˇ"],
  ["tone-4", 4, "falling", "ˋ"],
  ["neutral", 5, "context-dependent-neutral", ""],
].map(([id, number, contour, mark]) => ({
  targetId: `tone:${id}`,
  kind: "official-tone-category",
  id,
  number,
  contour,
  mark,
  lessonId: "hsk0-pronunciation-09",
}));

const TONE_PAIR_TARGETS = TONES.flatMap((first) =>
  TONES.map((second) => ({
    targetId: `tone-pair:${first.number}-${second.number}`,
    kind: "pedagogical-tone-pair-cell",
    firstTone: first.number,
    secondTone: second.number,
    lessonId: "hsk0-pronunciation-10",
  }))
);

const SANDHI_TARGETS = [
  {
    targetId: "sandhi:third-tone-pair",
    kind: "connected-speech-rule",
    lessonId: "hsk0-pronunciation-11",
  },
  {
    targetId: "sandhi:bu",
    kind: "connected-speech-rule",
    lessonId: "hsk0-pronunciation-11",
  },
  {
    targetId: "sandhi:yi",
    kind: "connected-speech-rule",
    lessonId: "hsk0-pronunciation-11",
  },
  {
    targetId: "sandhi:neutral-tone",
    kind: "connected-speech-review-target",
    lessonId: "hsk0-pronunciation-11",
  },
];

const FOUNDATION_TARGETS = [
  {
    targetId: "foundation:syllable-anatomy",
    kind: "pedagogical-skill",
    lessonId: "hsk0-pronunciation-01",
  },
  {
    targetId: "foundation:shadowing-self-check",
    kind: "pedagogical-skill",
    lessonId: "hsk0-pronunciation-12",
  },
];

const LESSON_DEFINITIONS = [
  ["hsk0-pronunciation-01", "Âm tiết và bản đồ Pinyin", "initial-final-tone-anatomy"],
  ["hsk0-pronunciation-02", "Bật hơi b/p, d/t, g/k", "aspiration-control"],
  ["hsk0-pronunciation-03", "z/c/s đầu lưỡi trước", "alveolar-control"],
  ["hsk0-pronunciation-04", "zh/ch/sh/r và đối chiếu", "retroflex-control"],
  ["hsk0-pronunciation-05", "j/q/x, ü và quy tắc bỏ hai chấm", "palatal-umlaut-control"],
  ["hsk0-pronunciation-06", "Vận mẫu đơn và er", "simple-final-control"],
  ["hsk0-pronunciation-07", "Vận mẫu ghép và dạng rút gọn", "compound-final-control"],
  ["hsk0-pronunciation-08", "Vận mẫu mũi trước và sau", "nasal-final-control"],
  ["hsk0-pronunciation-09", "Bốn thanh và thanh nhẹ", "tone-category-control"],
  ["hsk0-pronunciation-10", "Ma trận 25 cặp thanh", "tone-pair-control"],
  ["hsk0-pronunciation-11", "Biến điệu trong lời nói liền", "connected-speech-control"],
  ["hsk0-pronunciation-12", "Shadowing câu sinh tồn", "guided-shadowing"],
];

const ORTHOGRAPHY_PRACTICE = [
  ["i", "yi", "orthography:zero-initial-i"],
  ["ia", "ya", "orthography:zero-initial-i"],
  ["iou", "you", "orthography:zero-initial-i"],
  ["u", "wu", "orthography:zero-initial-u"],
  ["ua", "wa", "orthography:zero-initial-u"],
  ["uei", "wei", "orthography:zero-initial-u"],
  ["ü", "yu", "orthography:zero-initial-umlaut-u"],
  ["üe", "yue", "orthography:zero-initial-umlaut-u"],
  ["j + ü", "ju", "orthography:jqx-drops-umlaut"],
  ["q + üe", "que", "orthography:jqx-drops-umlaut"],
  ["n + ü", "nü", "orthography:nl-keeps-umlaut"],
  ["n + iou", "niu", "orthography:contract-iou"],
  ["g + uei", "gui", "orthography:contract-uei"],
  ["l + uen", "lun", "orthography:contract-uen"],
];

const TONE_DRILLS = [
  ["ma", ["mā", "má", "mǎ", "mà", "ma"]],
  ["ba", ["bā", "bá", "bǎ", "bà", "ba"]],
  ["da", ["dā", "dá", "dǎ", "dà", "da"]],
  ["ge", ["gē", "gé", "gě", "gè", "ge"]],
];

const SANDHI_PRACTICE = [
  ["nǐ hǎo", "ní hǎo", "sandhi:third-tone-pair"],
  ["hěn hǎo", "hén hǎo", "sandhi:third-tone-pair"],
  ["bù shì", "bú shì", "sandhi:bu"],
  ["bù kàn", "bú kàn", "sandhi:bu"],
  ["bù lái", "bù lái", "sandhi:bu"],
  ["yī tiān", "yì tiān", "sandhi:yi"],
  ["yī běn", "yì běn", "sandhi:yi"],
  ["yī gè", "yí gè", "sandhi:yi"],
  ["dì yī", "dì yī", "sandhi:yi"],
  ["mā mā", "māma", "sandhi:neutral-tone"],
  ["xiè xiè", "xièxie", "sandhi:neutral-tone"],
  ["péng yǒu", "péngyou", "sandhi:neutral-tone"],
];

const SHADOWING_PROMPTS = [
  ["你好！", "Nǐ hǎo!", "Xin chào!"],
  ["我叫安。", "Wǒ jiào Ān.", "Tôi tên là An."],
  ["我是越南人。", "Wǒ shì Yuènán rén.", "Tôi là người Việt Nam."],
  ["请再说一遍。", "Qǐng zài shuō yí biàn.", "Vui lòng nói lại một lần."],
  ["请说慢一点。", "Qǐng shuō màn yìdiǎn.", "Vui lòng nói chậm hơn một chút."],
  ["我听不懂。", "Wǒ tīngbudǒng.", "Tôi nghe không hiểu."],
  ["这个怎么读？", "Zhège zěnme dú?", "Cái này đọc thế nào?"],
  ["这个怎么说？", "Zhège zěnme shuō?", "Cái này nói thế nào?"],
  ["谢谢！", "Xièxie!", "Cảm ơn!"],
  ["不客气。", "Bú kèqi.", "Không có gì."],
  ["对不起。", "Duìbuqǐ.", "Xin lỗi."],
  ["没关系。", "Méi guānxi.", "Không sao."],
  ["请问，洗手间在哪儿？", "Qǐngwèn, xǐshǒujiān zài nǎr?", "Xin hỏi, nhà vệ sinh ở đâu?"],
  ["多少钱？", "Duōshao qián?", "Bao nhiêu tiền?"],
  ["我要这个。", "Wǒ yào zhège.", "Tôi muốn cái này."],
  ["我不要辣。", "Wǒ bú yào là.", "Tôi không muốn cay."],
  ["可以吗？", "Kěyǐ ma?", "Có được không?"],
  ["我会说一点汉语。", "Wǒ huì shuō yìdiǎn Hànyǔ.", "Tôi biết nói một chút tiếng Trung."],
  ["我还在学习。", "Wǒ hái zài xuéxí.", "Tôi vẫn đang học."],
  ["你能帮我吗？", "Nǐ néng bāng wǒ ma?", "Bạn có thể giúp tôi không?"],
  ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"],
  ["我们走吧。", "Wǒmen zǒu ba.", "Chúng ta đi nhé."],
  ["明天见！", "Míngtiān jiàn!", "Hẹn gặp ngày mai!"],
  ["再见！", "Zàijiàn!", "Tạm biệt!"],
];

const activityState = (activityId, lessonId, targetIds) => ({
  activityVersion: `${PACK_ID}:${activityId}:1`,
  lessonId,
  targetIds,
  reviewStatus: "pending",
  measurementEligible: false,
  masteryEligible: false,
  releaseEligible: false,
  prerequisiteWaiverEligible: false,
});

const audioDraft = (transcriptPinyin) => ({
  audio: null,
  audioRequirement: "reviewed-human-or-licensed-native-mandarin-recording",
  authoringPreview: "synthetic-browser-voice-not-evidence",
  transcriptPinyin,
  transcriptReview: "pending",
});

const buildActivities = () => {
  const initialIdentification = INITIALS.map((target, index) => {
    const activityId =
      `hsk0-pronunciation:initial:${String(index + 1).padStart(2, "0")}`;
    return {
      activityId,
      kind: "visual-initial-identification",
      promptVi: "Xác định thanh mẫu trong âm tiết Pinyin mẫu.",
      stimulus: {
        pinyin: target.examplePinyin,
        hanziAuthoringReference: target.exampleHanzi,
      },
      modelAnswer: target.symbol,
      ...activityState(activityId, target.lessonId, [
        target.targetId,
        ...(index === 0 ? ["foundation:syllable-anatomy"] : []),
      ]),
    };
  });
  const finalIdentification = FINALS.map((target, index) => {
    const activityId =
      `hsk0-pronunciation:final:${String(index + 1).padStart(2, "0")}`;
    return {
      activityId,
      kind: "visual-final-identification",
      promptVi: "Xác định vận mẫu theo cách viết trong bảng Pinyin chính thức.",
      stimulus: {
        pinyin: target.examplePinyin,
        hanziAuthoringReference: target.exampleHanzi,
      },
      modelAnswer: target.tableSpelling,
      ...activityState(activityId, target.lessonId, [target.targetId]),
    };
  });
  const syllableAssembly = FINALS.map((target, index) => {
    const activityId =
      `hsk0-pronunciation:assembly:${String(index + 1).padStart(2, "0")}`;
    return {
      activityId,
      kind: "guided-final-syllable-assembly",
      promptVi: "Viết Pinyin không dấu của chữ mẫu từ vận mẫu đã cho.",
      stimulus: {
        officialTableSpelling: target.tableSpelling,
        hanziAuthoringReference: target.exampleHanzi,
      },
      modelAnswer: target.sampleSyllableSpelling,
      ...activityState(activityId, target.lessonId, [target.targetId]),
    };
  });
  const contrastListening = CONTRASTS.flatMap((target, contrastIndex) =>
    [target.left, target.right].map((answer, directionIndex) => {
      const transcript = directionIndex === 0
        ? target.leftSample
        : target.rightSample;
      const activityId =
        `hsk0-pronunciation:contrast:${
          String(contrastIndex + 1).padStart(2, "0")
        }:${directionIndex + 1}`;
      return {
        activityId,
        kind: "listening-initial-contrast-selection",
        promptVi: "Nghe và chọn thanh mẫu của âm tiết.",
        stimulus: audioDraft(transcript),
        options: [target.left, target.right],
        modelAnswer: answer,
        lexicalClaim: false,
        ...activityState(activityId, target.lessonId, [
          target.targetId,
          `initial:${target.left}`,
          `initial:${target.right}`,
        ]),
      };
    })
  );
  const orthography = ORTHOGRAPHY_PRACTICE.map(
    ([input, answer, targetId], index) => {
      const target = ORTHOGRAPHY_RULES.find(
        (candidate) => candidate.targetId === targetId,
      );
      const activityId =
        `hsk0-pronunciation:orthography:${
          String(index + 1).padStart(2, "0")
        }`;
      return {
        activityId,
        kind: "guided-pinyin-orthography-rewrite",
        promptVi: "Viết lại theo quy tắc chính tả Pinyin.",
        stimulus: { input },
        modelAnswer: answer,
        ...activityState(activityId, target.lessonId, [targetId]),
      };
    },
  );
  const toneRecognition = TONE_DRILLS.flatMap(([_base, forms], baseIndex) =>
    forms.map((form, toneIndex) => {
      const tone = TONES[toneIndex];
      const activityId =
        `hsk0-pronunciation:tone:${baseIndex + 1}:${toneIndex + 1}`;
      return {
        activityId,
        kind: "listening-tone-category-selection",
        promptVi: "Nghe âm tiết luyện tập và chọn loại thanh.",
        stimulus: {
          ...audioDraft(form),
          nonLexicalArticulationDrill: true,
        },
        options: TONES.map((item) => item.id),
        modelAnswer: tone.id,
        ...activityState(activityId, tone.lessonId, [tone.targetId]),
      };
    })
  );
  const tonePairs = TONES.flatMap((first, firstIndex) =>
    TONES.map((second, secondIndex) => {
      const firstForm = TONE_DRILLS[0][1][firstIndex];
      const secondForm = TONE_DRILLS[1][1][secondIndex];
      const activityId =
        `hsk0-pronunciation:tone-pair:${first.number}-${second.number}`;
      return {
        activityId,
        kind: "listening-tone-pair-selection",
        promptVi: "Nghe hai âm tiết luyện tập và chọn đúng cặp thanh.",
        stimulus: {
          ...audioDraft(`${firstForm} ${secondForm}`),
          nonLexicalArticulationDrill: true,
        },
        options: TONE_PAIR_TARGETS.map(
          (pair) => `${pair.firstTone}-${pair.secondTone}`,
        ),
        modelAnswer: `${first.number}-${second.number}`,
        ...activityState(activityId, "hsk0-pronunciation-10", [
          `tone-pair:${first.number}-${second.number}`,
          first.targetId,
          second.targetId,
        ]),
      };
    })
  );
  const sandhi = SANDHI_PRACTICE.map(
    ([underlying, surface, targetId], index) => {
      const activityId =
        `hsk0-pronunciation:sandhi:${String(index + 1).padStart(2, "0")}`;
      return {
        activityId,
        kind: "guided-connected-speech-analysis",
        promptVi: "Viết cách đọc trong lời nói liền của cụm từ.",
        stimulus: { citationFormPinyin: underlying },
        modelAnswer: surface,
        ...activityState(activityId, "hsk0-pronunciation-11", [targetId]),
      };
    },
  );
  const shadowing = SHADOWING_PROMPTS.map(
    ([hanzi, pinyin, meaningVi], index) => {
      const activityId =
        `hsk0-pronunciation:shadowing:${String(index + 1).padStart(2, "0")}`;
      return {
        activityId,
        kind: "record-compare-shadowing-self-check",
        promptVi: "Nghe, nhại lại, tự ghi âm rồi so sánh với mẫu đã duyệt.",
        stimulus: {
          ...audioDraft(pinyin),
          hanzi,
          meaningVi,
        },
        scoringPolicy: "self-record-compare-no-acoustic-score",
        browserAsrAllowedForMastery: false,
        ...activityState(activityId, "hsk0-pronunciation-12", [
          "foundation:shadowing-self-check",
        ]),
      };
    },
  );
  return [
    ...initialIdentification,
    ...finalIdentification,
    ...syllableAssembly,
    ...contrastListening,
    ...orthography,
    ...toneRecognition,
    ...tonePairs,
    ...sandhi,
    ...shadowing,
  ];
};

export const buildHsk0PronunciationBootcamp = (root = process.cwd()) => {
  const sourcePath = join(root, HSK0_PRONUNCIATION_SOURCE_RELATIVE_PATH);
  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const targets = [
    ...FOUNDATION_TARGETS,
    ...INITIALS,
    ...FINALS,
    ...ORTHOGRAPHY_RULES,
    ...CONTRASTS,
    ...TONES,
    ...TONE_PAIR_TARGETS,
    ...SANDHI_TARGETS,
  ];
  const activities = buildActivities();
  const lessons = LESSON_DEFINITIONS.map(
    ([lessonId, titleVi, focus], index) => ({
      lessonId,
      sequence: index + 1,
      titleVi,
      focus,
      prerequisiteLessonIds: index === 0
        ? []
        : [LESSON_DEFINITIONS[index - 1][0]],
      targetIds: targets.filter((target) => target.lessonId === lessonId)
        .map((target) => target.targetId),
      activityIds: activities.filter(
        (activity) => activity.lessonId === lessonId,
      ).map((activity) => activity.activityId),
      exitEvidence: {
        mode: index === 11
          ? "reviewed-rubric-shadowing-required"
          : "reviewed-objective-and-guided-practice-required",
        currentlyAvailable: false,
      },
    }),
  );
  const audioDependentKinds = new Set([
    "listening-initial-contrast-selection",
    "listening-tone-category-selection",
    "listening-tone-pair-selection",
    "record-compare-shadowing-self-check",
  ]);
  const reviewBatches = lessons.map((lesson) => {
    const lessonActivities = activities.filter(
      (activity) => activity.lessonId === lesson.lessonId,
    );
    const reviewedAudioRequired = lessonActivities.some(
      (activity) => audioDependentKinds.has(activity.kind),
    );
    return {
      batchId: `${PACK_ID}:review:${lesson.lessonId}`,
      lessonId: lesson.lessonId,
      targetIds: lesson.targetIds,
      activityIds: lesson.activityIds,
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "pronunciation-pedagogy-reviewer",
        ...(reviewedAudioRequired ? ["audio-rights-reviewer"] : []),
      ],
      reviewedAudioRequired,
      state: "pending",
      approvals: [],
    };
  });
  const countKind = (kind) =>
    activities.filter((activity) => activity.kind === kind).length;
  const audioDependentActivities = activities.filter(
    (activity) => audioDependentKinds.has(activity.kind),
  );
  return {
    schemaVersion: 1,
    packId: PACK_ID,
    level: "HSK0",
    state: "ai-assisted-source-bound-draft",
    learnerVisible: false,
    runtimeImportEligible: false,
    releaseEligible: false,
    source: {
      sourceId: source.sourceId,
      sourceDescriptorSha256: fileSha256(sourcePath),
      officialSchemePdfSha256: source.pdf.sha256,
      orthographyStandardId: source.orthographyStandard.standardId,
      orthographyStandardStatus: source.orthographyStandard.status,
      rightsDecision: source.rights.decision,
    },
    authorship: {
      method: "deterministic-source-bound-ai-assisted-pronunciation-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      pronunciationPedagogyReviewer: null,
      audioRightsReviewer: null,
    },
    policy: {
      reviewedNativeAudioRequiredForListening: true,
      browserTtsIsPreviewOnly: true,
      browserAsrMustNotScoreToneMastery: true,
      humanPronunciationRubricRequiredForSpeakingEvidence: true,
      linguisticAndPedagogyReviewRequiredForRelease: true,
      noRuntimeImportBeforeAllGates: true,
    },
    coverageClaims: {
      officialInitialDraftCoverage: "21/21",
      officialFinalTableDraftCoverage: "35/35",
      officialSpecialFinalDraftCoverage: "1/1",
      toneCategoryDraftCoverage: "5/5",
      tonePairMatrixDraftCoverage: "25/25",
      bootcampLessonDraftCoverage: "12/12",
      reviewedNativeAudioComplete: false,
      reviewedPronunciationContentComplete: false,
      runtimeBootcampComplete: false,
      hsk0Complete: false,
    },
    counts: {
      lessons: lessons.length,
      targets: targets.length,
      officialInitials: INITIALS.length,
      officialFinalTableCells: FINALS.filter(
        (target) => target.kind === "official-final-table-cell",
      ).length,
      officialSpecialFinals: FINALS.filter(
        (target) => target.kind === "official-special-final",
      ).length,
      toneCategories: TONES.length,
      tonePairCells: TONE_PAIR_TARGETS.length,
      authoredActivities: activities.length,
      initialIdentificationActivities: countKind(
        "visual-initial-identification",
      ),
      finalIdentificationActivities: countKind(
        "visual-final-identification",
      ),
      syllableAssemblyActivities: countKind(
        "guided-final-syllable-assembly",
      ),
      initialContrastActivities: countKind(
        "listening-initial-contrast-selection",
      ),
      orthographyActivities: countKind(
        "guided-pinyin-orthography-rewrite",
      ),
      toneCategoryActivities: countKind(
        "listening-tone-category-selection",
      ),
      tonePairActivities: countKind("listening-tone-pair-selection"),
      sandhiActivities: countKind("guided-connected-speech-analysis"),
      shadowingActivities: countKind(
        "record-compare-shadowing-self-check",
      ),
      audioDependentActivities: audioDependentActivities.length,
      reviewedAudioActivities: 0,
      measurementEligibleActivities: 0,
      masteryEligibleActivities: 0,
      releaseEligibleActivities: 0,
      reviewBatches: reviewBatches.length,
    },
    targets,
    lessons,
    activities,
    reviewBatches,
  };
};

export const serializeHsk0PronunciationBootcamp = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK0_PRONUNCIATION_BOOTCAMP_RELATIVE_PATH);
  const serialized = serializeHsk0PronunciationBootcamp(
    buildHsk0PronunciationBootcamp(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK0 pronunciation bootcamp is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK0_PRONUNCIATION_BOOTCAMP_RELATIVE_PATH,
    mode: process.argv.includes("--write")
      ? "write"
      : process.argv.includes("--check")
        ? "check"
        : "stdout",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
