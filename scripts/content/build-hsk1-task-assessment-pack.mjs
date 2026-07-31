import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-task-assessment-2026.07.json";

const TOPIC_PROMPTS_VI = {
  1: "Giới thiệu tên, quốc tịch, tuổi, giới tính, sở thích hoặc thói quen.",
  2: "Giới thiệu vai trò, gia đình, bạn bè hoặc một kỹ năng cơ bản.",
  3: "Hỏi và trả lời ngày, giờ, địa điểm, phương hướng hoặc người tham gia.",
  4: "Gọi đúng tên một đồ vật quen thuộc.",
  5: "Miêu tả một đặc điểm đơn giản của đồ vật.",
  6: "Hỏi và trả lời về thời tiết hiện tại.",
  7: "Miêu tả ngắn một nơi hoặc môi trường xung quanh.",
  8: "Dùng lời chào, cảm ơn, xin lỗi và tạm biệt phù hợp.",
  9: "Thực hiện một lượt hỏi đáp ngắn trong giao tiếp thường ngày.",
  10: "Nói mong muốn, sở thích hoặc cảm nhận cơ bản.",
  11: "Nêu tên và lựa chọn đồ ăn, thức uống.",
  12: "Gọi món hoặc trao đổi trong một bữa ăn.",
  13: "Hỏi và trả lời đường đi đơn giản.",
  14: "Nói phương tiện hoặc cách di chuyển.",
  15: "Trao đổi giờ và kế hoạch đi lại.",
  16: "Hỏi hoặc nói tên sản phẩm cần mua.",
  17: "Hỏi và trả lời giá sản phẩm.",
  18: "Chọn sản phẩm theo đặc điểm và giá.",
  19: "Nói mình bị ốm, đi khám hoặc hỏi thăm người bệnh.",
  20: "Trao đổi về hoạt động giải trí quen thuộc.",
  21: "Hỏi và trả lời thông tin môn học hoặc tiết học.",
  22: "Nói nội dung đang học, đọc hoặc viết.",
  23: "Nói cấp học hoặc vai trò học sinh, sinh viên.",
  24: "Giới thiệu ngắn về trường và người trong trường.",
  25: "Nói hoạt động sau giờ học.",
  26: "Hỏi và trả lời nơi làm việc, giờ làm hoặc nhiệm vụ.",
  27: "Đưa nhận xét đơn giản về công việc.",
  28: "Nêu một nghề nghiệp quen thuộc.",
  29: "Nhận biết và trao đổi về món ăn Trung Quốc cơ bản.",
  30: "Nhận biết và trao đổi về đồ uống truyền thống.",
};

const TASK_SCENARIOS = {
  1: {
    titleVi: "Làm quen và giới thiệu bản thân",
    instructionVi: "Đóng vai hai người mới gặp; hỏi và trả lời ít nhất hai thông tin cá nhân.",
    turns: [
      ["A", "你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?"],
      ["B", "我叫李安。", "Wǒ jiào Lǐ Ān.", "Tôi tên là Lý An."],
      ["A", "你是哪国人？", "Nǐ shì nǎ guó rén?", "Bạn là người nước nào?"],
      ["B", "我是中国人。", "Wǒ shì Zhōngguó rén.", "Tôi là người Trung Quốc."],
    ],
    functions: ["ask-personal-information", "answer-personal-information"],
  },
  2: {
    titleVi: "Xác nhận thông tin sự kiện",
    instructionVi: "Hỏi và trả lời ngày, giờ hoặc địa điểm của một cuộc hẹn đơn giản.",
    turns: [
      ["A", "今天几月几号？", "Jīntiān jǐ yuè jǐ hào?", "Hôm nay là ngày mấy tháng mấy?"],
      ["B", "今天七月二十八号。", "Jīntiān qī yuè èrshíbā hào.", "Hôm nay là ngày 28 tháng 7."],
      ["A", "现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"],
      ["B", "现在八点半。", "Xiànzài bā diǎn bàn.", "Bây giờ là tám giờ rưỡi."],
    ],
    functions: ["ask-event-information", "confirm-time-information"],
  },
  3: {
    titleVi: "Hỏi thông tin đồ vật",
    instructionVi: "Hỏi tên và một đặc điểm của đồ vật đang được chỉ tới.",
    turns: [
      ["A", "这是什么？", "Zhè shì shénme?", "Đây là gì?"],
      ["B", "这是一本书。", "Zhè shì yì běn shū.", "Đây là một quyển sách."],
      ["A", "这本书怎么样？", "Zhè běn shū zěnmeyàng?", "Quyển sách này thế nào?"],
      ["B", "这本书很好。", "Zhè běn shū hěn hǎo.", "Quyển sách này rất hay."],
    ],
    functions: ["identify-object", "describe-object"],
  },
  4: {
    titleVi: "Trao đổi về thời tiết",
    instructionVi: "Hỏi thời tiết và trả lời bằng ít nhất một đặc điểm hoặc hiện tượng.",
    turns: [
      ["A", "今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"],
      ["B", "今天很热。", "Jīntiān hěn rè.", "Hôm nay rất nóng."],
      ["A", "下雨吗？", "Xiàyǔ ma?", "Có mưa không?"],
      ["B", "不下雨。", "Bù xiàyǔ.", "Không mưa."],
    ],
    functions: ["ask-weather", "describe-weather"],
  },
  5: {
    titleVi: "Hỏi và mô tả môi trường",
    instructionVi: "Hỏi vị trí và trả lời bằng câu ngắn có từ chỉ nơi chốn hoặc phương hướng.",
    turns: [
      ["A", "你住在哪里？", "Nǐ zhù zài nǎlǐ?", "Bạn sống ở đâu?"],
      ["B", "我住在这里。", "Wǒ zhù zài zhèlǐ.", "Tôi sống ở đây."],
      ["A", "学校在哪边？", "Xuéxiào zài nǎ biān?", "Trường học ở phía nào?"],
      ["B", "学校在那边。", "Xuéxiào zài nàbiān.", "Trường học ở phía kia."],
    ],
    functions: ["ask-location", "describe-location"],
  },
  6: {
    titleVi: "Giao tiếp lịch sự hằng ngày",
    instructionVi: "Thực hiện một lượt xin lỗi hoặc cảm ơn và đáp lại phù hợp.",
    turns: [
      ["A", "对不起。", "Duìbuqǐ.", "Xin lỗi."],
      ["B", "没关系。", "Méi guānxi.", "Không sao."],
      ["A", "谢谢你！", "Xièxie nǐ!", "Cảm ơn bạn!"],
      ["B", "不客气。", "Bú kèqi.", "Không có gì."],
    ],
    functions: ["apologize-and-respond", "thank-and-respond"],
  },
  7: {
    titleVi: "Trao đổi sở thích ăn uống",
    instructionVi: "Hỏi món hoặc đồ uống yêu thích và trả lời bằng lựa chọn cụ thể.",
    turns: [
      ["A", "你喜欢吃什么？", "Nǐ xǐhuan chī shénme?", "Bạn thích ăn gì?"],
      ["B", "我喜欢吃饺子。", "Wǒ xǐhuan chī jiǎozi.", "Tôi thích ăn bánh chẻo."],
      ["A", "你喜欢喝茶吗？", "Nǐ xǐhuan hē chá ma?", "Bạn thích uống trà không?"],
      ["B", "喜欢，我也喜欢牛奶。", "Xǐhuan, wǒ yě xǐhuan niúnǎi.", "Có, tôi cũng thích sữa."],
    ],
    functions: ["ask-food-preference", "state-food-preference"],
  },
  8: {
    titleVi: "Hỏi và trả lời cách di chuyển",
    instructionVi: "Hỏi cách đi tới một nơi và trả lời bằng phương tiện cụ thể.",
    turns: [
      ["A", "你怎么去学校？", "Nǐ zěnme qù xuéxiào?", "Bạn đến trường bằng cách nào?"],
      ["B", "我坐出租车去。", "Wǒ zuò chūzūchē qù.", "Tôi đi taxi."],
      ["A", "你几点回来？", "Nǐ jǐ diǎn huílai?", "Bạn mấy giờ về?"],
      ["B", "我下午五点回来。", "Wǒ xiàwǔ wǔ diǎn huílai.", "Tôi về lúc năm giờ chiều."],
    ],
    functions: ["ask-travel-mode", "state-travel-plan"],
  },
  9: {
    titleVi: "Hỏi thông tin sản phẩm",
    instructionVi: "Hỏi giá hoặc số lượng và trả lời bằng cụm số-lượng phù hợp.",
    turns: [
      ["A", "这件衣服多少钱？", "Zhè jiàn yīfu duōshao qián?", "Bộ quần áo này bao nhiêu tiền?"],
      ["B", "五十块钱。", "Wǔshí kuài qián.", "Năm mươi tệ."],
      ["A", "你要几件？", "Nǐ yào jǐ jiàn?", "Bạn muốn mấy bộ?"],
      ["B", "我要一件。", "Wǒ yào yí jiàn.", "Tôi muốn một bộ."],
    ],
    functions: ["ask-product-information", "answer-price-and-quantity"],
  },
  10: {
    titleVi: "Báo ốm và hỏi thăm",
    instructionVi: "Nói tình trạng bị ốm và phản hồi bằng một câu hỏi hoặc đề nghị đơn giản.",
    turns: [
      ["A", "你怎么了？", "Nǐ zěnme le?", "Bạn bị làm sao?"],
      ["B", "我生病了。", "Wǒ shēngbìng le.", "Tôi bị ốm."],
      ["A", "你去医院看病吗？", "Nǐ qù yīyuàn kànbìng ma?", "Bạn có đi bệnh viện khám không?"],
      ["B", "去，谢谢。", "Qù, xièxie.", "Có, cảm ơn."],
    ],
    functions: ["report-illness", "ask-about-care"],
  },
  11: {
    titleVi: "Trao đổi hoạt động giải trí",
    instructionVi: "Hỏi hoạt động lúc rảnh và nói ít nhất một hoạt động yêu thích.",
    turns: [
      ["A", "星期天你做什么？", "Xīngqītiān nǐ zuò shénme?", "Chủ nhật bạn làm gì?"],
      ["B", "我看电影。", "Wǒ kàn diànyǐng.", "Tôi xem phim."],
      ["A", "你也听歌吗？", "Nǐ yě tīng gē ma?", "Bạn cũng nghe nhạc không?"],
      ["B", "听，我喜欢听歌。", "Tīng, wǒ xǐhuan tīng gē.", "Có, tôi thích nghe nhạc."],
    ],
    functions: ["ask-leisure-activity", "state-leisure-preference"],
  },
  12: {
    titleVi: "Giới thiệu tình hình học tập",
    instructionVi: "Nói cấp học và một nội dung đang học bằng câu ngắn.",
    turns: [
      ["A", "你是大学生吗？", "Nǐ shì dàxuéshēng ma?", "Bạn là sinh viên đại học phải không?"],
      ["B", "是，我是大学生。", "Shì, wǒ shì dàxuéshēng.", "Vâng, tôi là sinh viên đại học."],
      ["A", "你学习什么？", "Nǐ xuéxí shénme?", "Bạn học gì?"],
      ["B", "我学习汉语。", "Wǒ xuéxí Hànyǔ.", "Tôi học tiếng Trung."],
    ],
    functions: ["introduce-education-level", "state-study-content"],
  },
  13: {
    titleVi: "Trao đổi về trường và sau giờ học",
    instructionVi: "Hỏi về trường hoặc hoạt động sau giờ học và trả lời cụ thể.",
    turns: [
      ["A", "你的学校怎么样？", "Nǐ de xuéxiào zěnmeyàng?", "Trường của bạn thế nào?"],
      ["B", "我的学校很好。", "Wǒ de xuéxiào hěn hǎo.", "Trường của tôi rất tốt."],
      ["A", "下课以后你做什么？", "Xiàkè yǐhòu nǐ zuò shénme?", "Sau giờ học bạn làm gì?"],
      ["B", "我看书。", "Wǒ kàn shū.", "Tôi đọc sách."],
    ],
    functions: ["describe-school", "state-after-class-activity"],
  },
  14: {
    titleVi: "Trao đổi thông tin công việc",
    instructionVi: "Hỏi nơi hoặc giờ làm việc và trả lời bằng thông tin cụ thể.",
    turns: [
      ["A", "你在哪儿工作？", "Nǐ zài nǎr gōngzuò?", "Bạn làm việc ở đâu?"],
      ["B", "我在公司工作。", "Wǒ zài gōngsī gōngzuò.", "Tôi làm việc ở công ty."],
      ["A", "你几点上班？", "Nǐ jǐ diǎn shàngbān?", "Bạn đi làm lúc mấy giờ?"],
      ["B", "我八点上班。", "Wǒ bā diǎn shàngbān.", "Tôi đi làm lúc tám giờ."],
    ],
    functions: ["ask-work-information", "answer-work-information"],
  },
  15: {
    titleVi: "Trao đổi về ẩm thực Trung Quốc",
    instructionVi: "Hỏi và trả lời về một món ăn hoặc đồ uống Trung Quốc quen thuộc.",
    turns: [
      ["A", "你喜欢中国菜吗？", "Nǐ xǐhuan Zhōngguó cài ma?", "Bạn thích món Trung Quốc không?"],
      ["B", "喜欢，我喜欢饺子。", "Xǐhuan, wǒ xǐhuan jiǎozi.", "Có, tôi thích bánh chẻo."],
      ["A", "你喝茶吗？", "Nǐ hē chá ma?", "Bạn uống trà không?"],
      ["B", "喝，中国茶很好喝。", "Hē, Zhōngguó chá hěn hǎohē.", "Có, trà Trung Quốc rất ngon."],
    ],
    functions: ["ask-traditional-food", "state-traditional-food-preference"],
  },
};

const exactPartition = (label, actual, expected) => {
  if (
    actual.length !== new Set(actual).size
    || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} is not an exact partition`);
  }
};

export const buildHsk1TaskAssessmentPack = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  assertValidHsk1CurriculumScopeBundle(scopeBundle);
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  assertValidHsk1PersonalExchangePackBundle(personalBundle);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  assertValidHsk1CommunicativeUnitPacksBundle(communicativeBundle);
  const inventory = scopeBundle.graphBundle.syllabus.inventory;
  const officialTasks = inventory.tasks.filter((item) => item.level === 1);
  const officialTopics = inventory.topics.filter((item) => item.level === 1);
  const lessons = [
    ...personalBundle.pack.lessons.map((lesson) => ({
      ...lesson,
      unitId: personalBundle.pack.unitId,
    })),
    ...communicativeBundle.collection.packs.flatMap((pack) =>
      pack.lessons.map((lesson) => ({ ...lesson, unitId: pack.unitId }))
    ),
  ];
  const taskLessonPairs = lessons.flatMap((lesson) =>
    lesson.taskIds.map((taskId) => ({
      taskId,
      lessonId: lesson.lessonId,
      unitId: lesson.unitId,
    }))
  );
  const topicLessonPairs = lessons.flatMap((lesson) =>
    lesson.topicIds.map((topicId) => ({
      topicId,
      lessonId: lesson.lessonId,
      unitId: lesson.unitId,
    }))
  );
  exactPartition(
    "task lesson mappings",
    taskLessonPairs.map((item) => item.taskId),
    officialTasks.map((item) => item.id),
  );
  exactPartition(
    "topic lesson mappings",
    topicLessonPairs.map((item) => item.topicId),
    officialTopics.map((item) => item.id),
  );
  const taskLessonById = new Map(
    taskLessonPairs.map((item) => [item.taskId, item]),
  );
  const topicLessonById = new Map(
    topicLessonPairs.map((item) => [item.topicId, item]),
  );
  const topicDrafts = officialTopics.map((official) => {
    const mapping = topicLessonById.get(official.id);
    const promptViDraft = TOPIC_PROMPTS_VI[official.ordinal];
    if (!promptViDraft) throw new Error(`${official.id} topic prompt is missing`);
    return {
      officialTopicId: official.id,
      officialOrdinal: official.ordinal,
      sourcePage: official.sourcePage,
      domain: official.domain,
      group: official.group,
      officialTopic: official.topic,
      unitId: mapping.unitId,
      lessonId: mapping.lessonId,
      promptViDraft,
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        taskPedagogyReview: "pending",
      },
    };
  });
  const taskScenarios = officialTasks.map((official) => {
    const mapping = taskLessonById.get(official.id);
    const draft = TASK_SCENARIOS[official.ordinal];
    if (!draft) throw new Error(`${official.id} task scenario is missing`);
    const lessonTopicIds = lessons.find(
      (lesson) => lesson.lessonId === mapping.lessonId,
    ).topicIds;
    return {
      officialTaskId: official.id,
      officialOrdinal: official.ordinal,
      sourcePage: official.sourcePage,
      officialTitle: official.title,
      officialBulletCount: official.bulletCount,
      unitId: mapping.unitId,
      lessonId: mapping.lessonId,
      relatedTopicIds: [...lessonTopicIds],
      titleVi: draft.titleVi,
      instructionVi: draft.instructionVi,
      targetFunctions: draft.functions,
      modelDialogue: {
        audio: null,
        audioPolicy: "reviewed-recording-required-for-assessment",
        turns: draft.turns.map(([speaker, hanzi, pinyin, meaningVi]) => ({
          speaker,
          hanzi,
          pinyin,
          meaningVi,
        })),
        review: "pending",
      },
      evidencePolicy: {
        observedSkills: ["listening", "speaking"],
        grantsMastery: false,
        reviewedRubricRequired: true,
      },
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        taskPedagogyReview: "pending",
      },
    };
  });
  const practiceItems = taskScenarios.map((scenario) => ({
    itemId: `${scenario.lessonId}:${scenario.officialTaskId}:roleplay`,
    lessonId: scenario.lessonId,
    officialTaskId: scenario.officialTaskId,
    kind: "guided-roleplay-self-check",
    instructionVi: scenario.instructionVi,
    modelDialogue: scenario.modelDialogue.turns,
    scoringPolicy: "self-reveal-only",
    review: "pending",
    measurementEligible: false,
    masteryEligible: false,
  }));
  const reviewBatches = taskScenarios.map((scenario) => ({
    batchId: `${scenario.officialTaskId}:scenario-review-v1`,
    officialTaskId: scenario.officialTaskId,
    topicIds: [...scenario.relatedTopicIds],
    practiceItemIds: practiceItems.filter(
      (item) => item.officialTaskId === scenario.officialTaskId,
    ).map((item) => item.itemId),
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "task-pedagogy-reviewer",
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk1-task-assessment-2026.07",
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      syllabusInventorySha256:
        scopeBundle.graphBundle.syllabus.inventorySha256,
      personalExchangePackId: personalBundle.pack.packId,
      personalExchangePackSha256: fileSha256(personalBundle.packPath),
      communicativeCollectionId:
        communicativeBundle.collection.collectionId,
      communicativeCollectionSha256:
        fileSha256(communicativeBundle.collectionPath),
    },
    authorship: {
      method: "ai-assisted-task-scenario-and-assessment-blueprint",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      taskPedagogyReviewer: null,
      assessmentReviewer: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      taskPedagogyReviewRequiredForRelease: true,
      assessmentCalibrationRequiredForMeasurement: true,
      reviewedAudioRequiredForScoredListening: true,
    },
    counts: {
      communicativeLessonBlueprints: lessons.length,
      topicDrafts: topicDrafts.length,
      taskScenarios: taskScenarios.length,
      modelDialogueTurns: taskScenarios.reduce(
        (total, scenario) =>
          total + scenario.modelDialogue.turns.length,
        0,
      ),
      guidedRoleplayItems: practiceItems.length,
      reviewBatches: reviewBatches.length,
      authoredLevelCheckItems: 50,
      measurementEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      officialTaskInventoryDraftMapped: true,
      officialTopicInventoryDraftMapped: true,
      taskScenarioDraftComplete: true,
      levelAssessmentBlueprintComplete: true,
      calibratedAssessmentComplete: false,
      reviewedTaskContentComplete: false,
      hsk1Complete: false,
    },
    topicDrafts,
    taskScenarios,
    practiceItems,
    levelAssessmentBlueprint: {
      blueprintId: "hsk1-level-check-2026.07",
      objectiveItemBankId: "hsk1-level-check-items-2026.07",
      state: "uncalibrated-draft",
      learnerVisible: false,
      passingStandard: null,
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
      sections: [
        {
          sectionId: "listening-objective",
          skill: "listening",
          plannedItemCount: 15,
          audioRequirement: "reviewed-human-or-licensed-recording",
          authoredItemCount: 15,
        },
        {
          sectionId: "reading-objective",
          skill: "reading",
          plannedItemCount: 15,
          authoredItemCount: 15,
        },
        {
          sectionId: "vocabulary-grammar-objective",
          skill: "vocabulary-grammar",
          plannedItemCount: 20,
          authoredItemCount: 20,
        },
        {
          sectionId: "task-performance",
          skill: "integrated-task-performance",
          plannedItemCount: 5,
          scenarioPoolTaskIds: officialTasks.map((item) => item.id),
          rubricState: "pending-review-and-calibration",
          authoredItemCount: 0,
        },
      ],
      calibration: {
        required: true,
        pilotSampleSize: 0,
        reliabilityEstimate: null,
        cutScore: null,
      },
    },
    reviewBatches,
  };
};

export const serializeHsk1TaskAssessmentPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH);
  const serialized = serializeHsk1TaskAssessmentPack(
    buildHsk1TaskAssessmentPack(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 task-assessment pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_TASK_ASSESSMENT_PACK_RELATIVE_PATH,
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
