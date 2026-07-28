import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "../../src/content/hsk1VocabularyDraft.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_PERSONAL_EXCHANGE_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-personal-exchange-2026.07.json";

const VI_GLOSS_BY_SEQUENCE = {
  1: "yêu; thích",
  3: "bố; ba",
  4: "nhé; đi; phải không (trợ từ ngữ khí)",
  13: "không",
  14: "không có gì; đừng khách sáo",
  15: "đừng; không được",
  24: "gọi điện thoại",
  25: "to; lớn",
  26: "mọi người",
  30: "của; trợ từ nối định ngữ với danh từ",
  32: "em trai",
  35: "điện thoại; cuộc gọi",
  41: "đều; tất cả",
  44: "đúng; đối với",
  45: "xin lỗi",
  48: "con trai",
  53: "rất; vô cùng",
  57: "vui; vui vẻ",
  59: "anh trai",
  61: "cho; đưa cho",
  64: "chó",
  66: "nước; quốc gia",
  67: "còn; vẫn; cũng",
  68: "trẻ em; con cái",
  71: "tốt; được",
  73: "đẹp; dễ nhìn; hay (với phim, sách)",
  74: "hay; dễ nghe",
  78: "và; với",
  79: "rất",
  82: "biết; có thể (do có kỹ năng)",
  86: "nhà; gia đình",
  87: "người nhà",
  88: "gặp; nhìn thấy",
  91: "gọi; tên là",
  92: "chị gái",
  96: "cảm thấy; cho rằng",
  102: "có thể; được phép",
  108: "rồi (trợ từ hoàn thành hoặc thay đổi trạng thái)",
  114: "mẹ",
  115: "à; không (trợ từ tạo câu hỏi có/không)",
  119: "mèo",
  120: "không sao; không có gì",
  121: "không sao; không có việc gì",
  122: "không có; chưa",
  123: "em gái",
  124: "hậu tố số nhiều chỉ người",
  130: "tên",
  142: "nam",
  143: "bạn trai",
  144: "thế còn…; nhỉ; đấy (trợ từ ngữ khí)",
  145: "có thể; có khả năng",
  146: "bạn",
  147: "xin chào",
  148: "các bạn",
  150: "ngài; ông; bà (cách xưng hô lịch sự)",
  152: "nữ",
  153: "con gái",
  154: "bạn gái",
  155: "quý cô; bà",
  156: "bạn; bạn bè",
  158: "xinh đẹp",
  161: "thức dậy; ra khỏi giường",
  165: "mời; xin; vui lòng",
  166: "xin hỏi",
  170: "người",
  171: "quen; biết; nhận ra",
  181: "ai",
  182: "gì; cái gì",
  187: "việc; chuyện",
  188: "là",
  189: "điện thoại di động",
  194: "ngủ",
  195: "đi ngủ; ngủ",
  196: "nói",
  197: "nói chuyện",
  199: "tuổi",
  200: "anh ấy; ông ấy",
  201: "nó (chỉ vật hoặc động vật)",
  202: "cô ấy; bà ấy",
  203: "họ (nam hoặc nhóm hỗn hợp)",
  204: "chúng nó (chỉ vật hoặc động vật)",
  205: "họ (nhóm nữ)",
  206: "quá; rất",
  218: "a-lô; này",
  219: "hỏi",
  221: "tôi; mình",
  222: "chúng tôi; chúng ta",
  225: "thích",
  231: "ông; ngài; anh; tiên sinh",
  233: "muốn; nghĩ",
  234: "nhỏ; bé",
  235: "trẻ em; em nhỏ",
  241: "cảm ơn",
  242: "mới",
  252: "muốn; cần; phải; sắp",
  253: "cũng",
  259: "một chút; thử một chút",
  263: "có",
  264: "một số; có người/có cái",
  265: "hơi; có chút",
  266: "một số; hơi; có phần",
  270: "lại; nữa; rồi mới",
  272: "tạm biệt",
  276: "thế nào; làm sao; tại sao",
  277: "thế nào; ra sao",
  285: "thật; thực sự",
  287: "con; cái; chiếc (lượng từ cho một số sự vật)",
};

const LESSON_PLANS = [
  {
    lessonId: "hsk1-pe-01-polite-open-close",
    titleVi: "Chào hỏi và lịch sự",
    objectiveVi: "Mở, sửa và kết thúc một lượt thoại ngắn bằng biểu thức lịch sự.",
    vocabularySequences: [14, 45, 88, 120, 121, 147, 165, 166, 218, 241, 272],
    grammarOrdinals: [26, 45],
    taskOrdinals: [6],
    topicOrdinals: [8, 9],
    dialogue: [
      ["A", "你好！", "Nǐ hǎo!", "Xin chào!"],
      ["B", "你好！", "Nǐ hǎo!", "Xin chào!"],
      ["A", "对不起。", "Duìbuqǐ.", "Xin lỗi."],
      ["B", "没关系。", "Méi guānxi.", "Không sao."],
      ["A", "谢谢！", "Xièxie!", "Cảm ơn!"],
      ["B", "不客气。", "Bú kèqi.", "Không có gì."],
      ["A", "再见！", "Zàijiàn!", "Tạm biệt!"],
      ["B", "再见！", "Zàijiàn!", "Tạm biệt!"],
    ],
  },
  {
    lessonId: "hsk1-pe-02-pronouns-and-groups",
    titleVi: "Đại từ và nhóm người",
    objectiveVi: "Phân biệt ngôi xưng, số nhiều và đại từ cho người, vật.",
    vocabularySequences: [26, 115, 124, 146, 148, 150, 170, 188, 200, 201, 202, 203, 204, 205, 221, 222],
    grammarOrdinals: [9, 35, 46, 49],
    taskOrdinals: [],
    topicOrdinals: [],
    dialogue: [
      ["A", "你是李安吗？", "Nǐ shì Lǐ Ān ma?", "Bạn là Lý An phải không?"],
      ["B", "是，我是李安。", "Shì, wǒ shì Lǐ Ān.", "Vâng, tôi là Lý An."],
    ],
  },
  {
    lessonId: "hsk1-pe-03-name-identity-age",
    titleVi: "Tên, danh tính và tuổi",
    objectiveVi: "Hỏi và trả lời tên, giới tính, quốc gia và tuổi bằng câu đơn.",
    vocabularySequences: [66, 91, 130, 142, 152, 155, 181, 182, 199, 231, 276, 277],
    grammarOrdinals: [8, 47],
    taskOrdinals: [1],
    topicOrdinals: [1],
    dialogue: [
      ["A", "您叫什么名字？", "Nín jiào shénme míngzi?", "Ngài tên là gì?"],
      ["B", "我叫李安。", "Wǒ jiào Lǐ Ān.", "Tôi tên là Lý An."],
      ["A", "您是王先生吗？", "Nín shì Wáng xiānsheng ma?", "Ngài là ông Vương phải không?"],
      ["B", "是，我是王先生。", "Shì, wǒ shì Wáng xiānsheng.", "Vâng, tôi là ông Vương."],
    ],
  },
  {
    lessonId: "hsk1-pe-04-family",
    titleVi: "Gia đình",
    objectiveVi: "Giới thiệu thành viên gia đình và quan hệ thân thuộc.",
    vocabularySequences: [3, 30, 32, 48, 59, 68, 86, 87, 92, 114, 123, 153, 263],
    grammarOrdinals: [24, 50],
    taskOrdinals: [],
    topicOrdinals: [2],
    dialogue: [
      ["A", "他是你的哥哥吗？", "Tā shì nǐ de gēge ma?", "Anh ấy là anh trai bạn phải không?"],
      ["B", "是，他是我哥哥。", "Shì, tā shì wǒ gēge.", "Vâng, anh ấy là anh trai tôi."],
      ["A", "她是你的妹妹吗？", "Tā shì nǐ de mèimei ma?", "Cô ấy là em gái bạn phải không?"],
      ["B", "是，她是我妹妹。", "Shì, tā shì wǒ mèimei.", "Vâng, cô ấy là em gái tôi."],
    ],
  },
  {
    lessonId: "hsk1-pe-05-friends-and-pets",
    titleVi: "Bạn bè và vật nuôi",
    objectiveVi: "Nói về người quen, tình cảm và vật nuôi bằng cụm danh từ ngắn.",
    vocabularySequences: [1, 61, 64, 78, 119, 143, 154, 156, 171, 225, 235, 287],
    grammarOrdinals: [22, 23, 28],
    taskOrdinals: [],
    topicOrdinals: [],
    dialogue: [
      ["A", "你认识她吗？", "Nǐ rènshi tā ma?", "Bạn có quen cô ấy không?"],
      ["B", "认识，她是我的朋友。", "Rènshi, tā shì wǒ de péngyou.", "Có, cô ấy là bạn tôi."],
      ["A", "你喜欢猫吗？", "Nǐ xǐhuan māo ma?", "Bạn thích mèo không?"],
      ["B", "喜欢，我喜欢猫。", "Xǐhuan, wǒ xǐhuan māo.", "Có, tôi thích mèo."],
    ],
  },
  {
    lessonId: "hsk1-pe-06-description-and-feeling",
    titleVi: "Miêu tả và cảm nhận",
    objectiveVi: "Miêu tả người, sự vật và nói cảm nhận bằng vị ngữ tính từ.",
    vocabularySequences: [25, 53, 57, 71, 73, 74, 79, 96, 158, 206, 234, 242, 265, 285],
    grammarOrdinals: [15, 29, 31, 37, 39, 43],
    taskOrdinals: [],
    topicOrdinals: [10],
    dialogue: [
      ["A", "她怎么样？", "Tā zěnmeyàng?", "Cô ấy thế nào?"],
      ["B", "她很漂亮。", "Tā hěn piàoliang.", "Cô ấy rất xinh đẹp."],
      ["A", "你高兴吗？", "Nǐ gāoxìng ma?", "Bạn vui không?"],
      ["B", "我非常高兴。", "Wǒ fēicháng gāoxìng.", "Tôi rất vui."],
    ],
  },
  {
    lessonId: "hsk1-pe-07-ability-intention-negation",
    titleVi: "Khả năng, ý định và phủ định",
    objectiveVi: "Nói điều có thể, mong muốn hoặc không xảy ra bằng động từ năng nguyện.",
    vocabularySequences: [13, 15, 41, 44, 67, 82, 102, 122, 145, 196, 197, 233, 252, 253, 264, 266, 270],
    grammarOrdinals: [4, 5, 6, 16, 19, 20, 48, 56, 57],
    taskOrdinals: [],
    topicOrdinals: [],
    dialogue: [
      ["A", "你会说话吗？", "Nǐ huì shuōhuà ma?", "Bạn biết nói không?"],
      ["B", "会，我会说话。", "Huì, wǒ huì shuōhuà.", "Có, tôi biết nói."],
      ["A", "你想再说吗？", "Nǐ xiǎng zài shuō ma?", "Bạn muốn nói lại không?"],
      ["B", "可以。", "Kěyǐ.", "Được."],
    ],
  },
  {
    lessonId: "hsk1-pe-08-phone-and-conversation",
    titleVi: "Điện thoại và hội thoại",
    objectiveVi: "Bắt đầu cuộc gọi, hỏi thông tin và làm mềm yêu cầu ngắn.",
    vocabularySequences: [4, 24, 35, 144, 187, 189, 219, 259],
    grammarOrdinals: [27, 38, 42],
    taskOrdinals: [],
    topicOrdinals: [],
    dialogue: [
      ["A", "喂，你好！", "Wèi, nǐ hǎo!", "A-lô, xin chào!"],
      ["B", "你好，请问，是李安吗？", "Nǐ hǎo, qǐngwèn, shì Lǐ Ān ma?", "Xin chào, cho hỏi có phải Lý An không?"],
      ["A", "是。你有什么事？", "Shì. Nǐ yǒu shénme shì?", "Vâng. Bạn có việc gì?"],
      ["B", "请给我打电话吧。", "Qǐng gěi wǒ dǎ diànhuà ba.", "Vui lòng gọi cho tôi nhé."],
    ],
  },
  {
    lessonId: "hsk1-pe-09-personal-routine",
    titleVi: "Thói quen cá nhân",
    objectiveVi: "Nói một hoạt động ngắn đã xảy ra hoặc sẽ lặp lại.",
    vocabularySequences: [108, 161, 194, 195],
    grammarOrdinals: [30],
    taskOrdinals: [],
    topicOrdinals: [],
    dialogue: [
      ["A", "你起床了吗？", "Nǐ qǐchuáng le ma?", "Bạn thức dậy chưa?"],
      ["B", "起床了。", "Qǐchuáng le.", "Tôi dậy rồi."],
      ["A", "你还想睡觉吗？", "Nǐ hái xiǎng shuìjiào ma?", "Bạn vẫn muốn ngủ à?"],
      ["B", "不，我不睡了。", "Bù, wǒ bù shuì le.", "Không, tôi không ngủ nữa."],
    ],
  },
];

const exactPartition = (label, actual, expected) => {
  if (
    actual.length !== new Set(actual).size
    || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} is not an exact lesson partition`);
  }
};

const mapInventoryIds = (items, values, field, label) => values.map((value) => {
  const item = items.find((candidate) => candidate[field] === value);
  if (!item) throw new Error(`${label} ${value} is missing`);
  return item.id;
});

export const buildHsk1PersonalExchangePack = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  assertValidHsk1CurriculumScopeBundle(scopeBundle);
  const vocabularyBundle = loadHsk1VocabularyDraftBundle(root);
  assertValidHsk1VocabularyDraftBundle(vocabularyBundle);
  const personalScope = scopeBundle.scope.unitScopes.find(
    (unit) => unit.unitId === "hsk1-personal-exchange",
  );
  if (!personalScope) throw new Error("HSK1 personal-exchange scope is missing");
  const inventory = scopeBundle.graphBundle.syllabus.inventory;
  const vocabulary = inventory.vocabulary.filter((item) => item.level === 1);
  const tasks = inventory.tasks.filter((item) => item.level === 1);
  const topics = inventory.topics.filter((item) => item.level === 1);
  const grammarRows = inventory.grammarRows.filter((item) => item.level === 1);
  const lessonVocabularyIds = LESSON_PLANS.flatMap((lesson) =>
    mapInventoryIds(
      vocabulary,
      lesson.vocabularySequences,
      "sequence",
      "vocabulary sequence",
    )
  );
  const lessonTaskIds = LESSON_PLANS.flatMap((lesson) =>
    mapInventoryIds(tasks, lesson.taskOrdinals, "ordinal", "task ordinal")
  );
  const lessonTopicIds = LESSON_PLANS.flatMap((lesson) =>
    mapInventoryIds(topics, lesson.topicOrdinals, "ordinal", "topic ordinal")
  );
  const lessonGrammarIds = LESSON_PLANS.flatMap((lesson) =>
    mapInventoryIds(
      grammarRows,
      lesson.grammarOrdinals,
      "ordinal",
      "grammar ordinal",
    )
  );
  exactPartition(
    "personal-exchange vocabulary",
    lessonVocabularyIds,
    personalScope.vocabularyIds,
  );
  exactPartition("personal-exchange tasks", lessonTaskIds, personalScope.taskIds);
  exactPartition("personal-exchange topics", lessonTopicIds, personalScope.topicIds);
  exactPartition(
    "personal-exchange grammar",
    lessonGrammarIds,
    personalScope.grammarRowIds,
  );

  const lexemes = personalScope.vocabularyIds.map((officialId) => {
    const official = vocabulary.find((item) => item.id === officialId);
    const sourceDraft = vocabularyBundle.draft.entries.find(
      (item) => item.officialId === officialId,
    );
    const vietnameseGlossDraft = VI_GLOSS_BY_SEQUENCE[official.sequence];
    if (!vietnameseGlossDraft) {
      throw new Error(`${officialId} Vietnamese gloss draft is missing`);
    }
    return {
      officialId,
      simplified: official.word,
      pinyin: official.pinyin,
      officialPartOfSpeech: official.partOfSpeech,
      vietnameseGlossDraft,
      sourceLineSha256: [
        ...new Set(sourceDraft.sourceMatches.map(
          (source) => source.sourceLineSha256,
        )),
      ],
      review: {
        machineAssisted: true,
        mandarinLinguisticReview: "pending",
        vietnameseEditorialReview: "pending",
      },
    };
  });

  const lessons = LESSON_PLANS.map((plan, index) => ({
    lessonId: plan.lessonId,
    sequence: index + 1,
    titleVi: plan.titleVi,
    objectiveVi: plan.objectiveVi,
    prerequisiteLessonIds: index === 0
      ? []
      : [LESSON_PLANS[index - 1].lessonId],
    taskIds: mapInventoryIds(tasks, plan.taskOrdinals, "ordinal", "task ordinal"),
    topicIds: mapInventoryIds(topics, plan.topicOrdinals, "ordinal", "topic ordinal"),
    vocabularyIds: mapInventoryIds(
      vocabulary,
      plan.vocabularySequences,
      "sequence",
      "vocabulary sequence",
    ),
    grammarRowIds: mapInventoryIds(
      grammarRows,
      plan.grammarOrdinals,
      "ordinal",
      "grammar ordinal",
    ),
    modelDialogue: {
      audio: null,
      audioPolicy: "browser-tts-practice-only",
      turns: plan.dialogue.map(([speaker, hanzi, pinyin, meaningVi]) => ({
        speaker,
        hanzi,
        pinyin,
        meaningVi,
      })),
      review: "pending",
    },
    practiceBlueprint: {
      vocabularyTarget: "all-lesson-vocabulary",
      grammarTarget: "all-lesson-grammar",
      requiredKinds: [
        "meaning-recall",
        "pinyin-recognition",
        "listening-selection",
      ],
      authoredItemCount: plan.vocabularySequences.length * 3,
      grantsMastery: false,
    },
  }));

  const lexemeById = new Map(
    lexemes.map((lexeme) => [lexeme.officialId, lexeme]),
  );
  const pickDistinctDistractors = ({
    lessonLexemes,
    targetIndex,
    field,
  }) => {
    const targetValue = lessonLexemes[targetIndex][field];
    const distractors = [];
    for (
      let offset = 1;
      offset < lessonLexemes.length * 2 && distractors.length < 3;
      offset += 1
    ) {
      const candidate = lessonLexemes[
        (targetIndex + offset) % lessonLexemes.length
      ][field];
      if (
        candidate !== targetValue
        && !distractors.includes(candidate)
      ) {
        distractors.push(candidate);
      }
    }
    if (distractors.length !== 3) {
      throw new Error(
        `Cannot create three distinct ${field} distractors for ${lessonLexemes[targetIndex].officialId}`,
      );
    }
    return distractors;
  };
  const practiceItems = lessons.flatMap((lesson) => {
    const lessonLexemes = lesson.vocabularyIds.map(
      (officialId) => lexemeById.get(officialId),
    );
    return lessonLexemes.flatMap((lexeme, index) => {
      const pinyinDistractors = pickDistinctDistractors({
        lessonLexemes,
        targetIndex: index,
        field: "pinyin",
      });
      const hanziDistractors = pickDistinctDistractors({
        lessonLexemes,
        targetIndex: index,
        field: "simplified",
      });
      const base = {
        lessonId: lesson.lessonId,
        officialVocabularyId: lexeme.officialId,
        review: "pending",
        measurementEligible: false,
        masteryEligible: false,
      };
      return [
        {
          ...base,
          itemId: `${lesson.lessonId}:${lexeme.officialId}:meaning`,
          kind: "meaning-recall",
          prompt: lexeme.simplified,
          answer: lexeme.vietnameseGlossDraft,
          scoringPolicy: "self-reveal-only",
        },
        {
          ...base,
          itemId: `${lesson.lessonId}:${lexeme.officialId}:pinyin`,
          kind: "pinyin-recognition",
          prompt: lexeme.simplified,
          options: [
            pinyinDistractors[0],
            lexeme.pinyin,
            pinyinDistractors[1],
            pinyinDistractors[2],
          ],
          correctAnswer: lexeme.pinyin,
          scoringPolicy: "automatic-draft-only",
        },
        {
          ...base,
          itemId: `${lesson.lessonId}:${lexeme.officialId}:listening`,
          kind: "listening-selection",
          prompt: "Chọn từ bạn nghe được.",
          ttsText: lexeme.simplified,
          ttsDisclosure: "synthetic-browser-voice",
          options: [
            hanziDistractors[0],
            lexeme.simplified,
            hanziDistractors[1],
            hanziDistractors[2],
          ],
          correctAnswer: lexeme.simplified,
          scoringPolicy: "automatic-draft-only",
        },
      ];
    });
  });
  const reviewBatches = lessons.map((lesson) => ({
    batchId: `${lesson.lessonId}:review-v1`,
    lessonId: lesson.lessonId,
    practiceItemIds: practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    ).map((item) => item.itemId),
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "assessment-editor",
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk1-personal-exchange-2026.07",
    unitId: "hsk1-personal-exchange",
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      vocabularyDraftId: vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(vocabularyBundle.draftPath),
      attribution:
        "content/sources/cc-cedict-2026-07-28/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-translation-and-curriculum-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      dialoguePinyinReviewRequiredForRelease: true,
    },
    counts: {
      lessons: lessons.length,
      vocabularyDrafts: lexemes.length,
      taskBlueprintMappings: new Set(lessons.flatMap((lesson) => lesson.taskIds)).size,
      topicBlueprintMappings: new Set(lessons.flatMap((lesson) => lesson.topicIds)).size,
      grammarBlueprintMappings:
        new Set(lessons.flatMap((lesson) => lesson.grammarRowIds)).size,
      dialogueTurns: lessons.reduce(
        (total, lesson) => total + lesson.modelDialogue.turns.length,
        0,
      ),
      authoredPracticeItems: practiceItems.length,
      meaningRecallItems: practiceItems.filter(
        (item) => item.kind === "meaning-recall",
      ).length,
      pinyinRecognitionItems: practiceItems.filter(
        (item) => item.kind === "pinyin-recognition",
      ).length,
      listeningSelectionItems: practiceItems.filter(
        (item) => item.kind === "listening-selection",
      ).length,
      reviewBatches: reviewBatches.length,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      unitBlueprintMapped: true,
      vocabularyPracticeDraftComplete: true,
      authoredPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk1Complete: false,
    },
    lexemes,
    lessons,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk1PersonalExchangePack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_PERSONAL_EXCHANGE_PACK_RELATIVE_PATH);
  const serialized = serializeHsk1PersonalExchangePack(
    buildHsk1PersonalExchangePack(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 personal-exchange pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_PERSONAL_EXCHANGE_PACK_RELATIVE_PATH,
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
