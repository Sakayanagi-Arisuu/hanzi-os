import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk3CurriculumScopeBundle,
  loadHsk3CurriculumScopeBundle,
} from "../../src/content/hsk3CurriculumScope.mjs";
import {
  HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH,
} from "../../src/content/hsk3LessonBlueprints.mjs";
import {
  assertValidHsk3VocabularyDraftBundle,
  loadHsk3VocabularyDraftBundle,
} from "../../src/content/hsk3VocabularyDraft.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const PARAGRAPH_LESSON_SPECS = [
  {
    domainId: "hsk3-personal-life-narratives",
    slug: "identity-transactions",
    titleVi: "Hồ sơ cá nhân và xử lý giao dịch",
    focusVi: "lọc ý chính và các bước xử lý từ hồ sơ, thông báo và giao dịch đời sống",
    topicOrdinals: [1, 2, 3, 4, 5, 6],
    keywordSignals: [
      "identity", "personal", "name", "address", "document", "procedure",
      "service", "business", "polite", "request", "customer", "information",
      "办理", "服务", "证件", "顾客", "礼貌",
    ],
  },
  {
    domainId: "hsk3-personal-life-narratives",
    slug: "food-shopping",
    titleVi: "Ăn uống và trải nghiệm mua sắm",
    focusVi: "đọc so sánh lựa chọn, giá cả, khẩu vị và diễn biến một lần mua sắm",
    topicOrdinals: [7, 8, 9, 14, 15],
    keywordSignals: [
      "food", "meal", "dish", "restaurant", "eat", "drink", "taste",
      "shop", "purchase", "price", "product", "customer", "sell", "buy",
      "餐", "菜", "饭", "食品", "商店", "购物", "价格",
    ],
  },
  {
    domainId: "hsk3-personal-life-narratives",
    slug: "travel-transport",
    titleVi: "Lịch trình, phương tiện và quy tắc đi lại",
    focusVi: "theo dõi tuyến đường, thứ tự sự kiện, phương tiện và lý do thay đổi lịch trình",
    topicOrdinals: [10, 11, 12, 13],
    keywordSignals: [
      "travel", "trip", "journey", "traffic", "vehicle", "train", "bus",
      "flight", "station", "road", "route", "ticket", "drive", "arrive",
      "交通", "旅行", "车站", "火车", "飞机", "道路",
    ],
  },
  {
    domainId: "hsk3-personal-life-narratives",
    slug: "health-care",
    titleVi: "Triệu chứng, khám bệnh và quan niệm sức khỏe",
    focusVi: "xác định triệu chứng, lời khuyên, trình tự khám và quan điểm chăm sóc sức khỏe",
    topicOrdinals: [16, 17, 18, 19],
    keywordSignals: [
      "health", "medical", "doctor", "hospital", "illness", "sick",
      "disease", "medicine", "pain", "body", "exercise", "recover",
      "健康", "医院", "医生", "生病", "药", "身体",
    ],
  },
  {
    domainId: "hsk3-personal-life-narratives",
    slug: "home-family-leisure",
    titleVi: "Gia đình, nơi ở và sinh hoạt rảnh",
    focusVi: "kể lại quan hệ gia đình, việc nhà, thói quen cư trú và trải nghiệm giải trí",
    topicOrdinals: [20, 21, 22, 23, 24, 25, 26],
    keywordSignals: [
      "family", "parent", "child", "husband", "wife", "home", "house",
      "room", "neighbor", "live", "leisure", "hobby", "game", "weekend",
      "家庭", "父母", "孩子", "房间", "邻居", "休闲",
    ],
  },
  {
    domainId: "hsk3-study-work-accounts",
    slug: "courses-learning",
    titleVi: "Môn học, phương pháp và tiến trình học",
    focusVi: "tóm lược môn học, cách luyện tập, kết quả và khó khăn trong quá trình học",
    topicOrdinals: [27, 28, 30],
    keywordSignals: [
      "study", "learn", "lesson", "course", "class", "homework",
      "practice", "exam", "question", "answer", "knowledge", "student",
      "学习", "课程", "作业", "考试", "学生",
    ],
  },
  {
    domainId: "hsk3-study-work-accounts",
    slug: "campus-education",
    titleVi: "Môi trường học, hoạt động trường và giáo dục gia đình",
    focusVi: "đọc thông tin trường lớp và đối chiếu vai trò gia đình trong một tình huống giáo dục",
    topicOrdinals: [29, 31, 32, 33],
    keywordSignals: [
      "school", "campus", "teacher", "education", "university", "college",
      "classroom", "graduate", "parenting", "pupil", "library",
      "学校", "校园", "老师", "教育", "大学", "图书馆",
    ],
  },
  {
    domainId: "hsk3-study-work-accounts",
    slug: "office-tasks",
    titleVi: "Công việc văn phòng và quy trình thực hiện",
    focusVi: "theo dõi yêu cầu, tài liệu, thứ tự xử lý và kết quả của một nhiệm vụ văn phòng",
    topicOrdinals: [34, 35],
    keywordSignals: [
      "office", "meeting", "report", "document", "manager", "company",
      "business", "task", "project", "computer", "email", "schedule",
      "办公室", "会议", "公司", "工作", "报告",
    ],
  },
  {
    domainId: "hsk3-study-work-accounts",
    slug: "colleague-workplace",
    titleVi: "Môi trường làm việc và phối hợp đồng nghiệp",
    focusVi: "nhận diện quan hệ, trách nhiệm và cách giải quyết bất đồng tại nơi làm việc",
    topicOrdinals: [36, 37],
    keywordSignals: [
      "colleague", "coworker", "team", "cooperate", "workplace",
      "responsibility", "help", "together", "relationship", "staff",
      "同事", "合作", "团队", "责任", "帮助",
    ],
  },
  {
    domainId: "hsk3-study-work-accounts",
    slug: "career-experience",
    titleVi: "Kinh nghiệm nghề nghiệp và đánh giá công việc",
    focusVi: "tóm tắt quá trình nghề nghiệp, năng lực, lựa chọn và đánh giá một công việc",
    topicOrdinals: [38, 39],
    keywordSignals: [
      "career", "profession", "job", "occupation", "experience", "hire",
      "salary", "worker", "ability", "success", "interview", "employment",
      "职业", "经验", "工资", "能力", "成功",
    ],
  },
  {
    domainId: "hsk3-nature-environment-explanations",
    slug: "climate-seasons",
    titleVi: "Khí hậu, mùa và biến đổi thời tiết",
    focusVi: "so sánh khí hậu theo nơi và trình bày chuỗi nguyên nhân–kết quả của thời tiết",
    topicOrdinals: [40, 41],
    keywordSignals: [
      "weather", "climate", "season", "temperature", "rain", "snow",
      "wind", "sun", "cold", "hot", "spring", "summer", "autumn", "winter",
      "天气", "气候", "季节", "下雨", "下雪",
    ],
  },
  {
    domainId: "hsk3-nature-environment-explanations",
    slug: "plants-animals",
    titleVi: "Động thực vật và môi trường sống",
    focusVi: "xác định đặc điểm, nơi sống và quan hệ giữa động vật, thực vật với môi trường",
    topicOrdinals: [42],
    keywordSignals: [
      "animal", "plant", "tree", "flower", "bird", "fish", "dog", "cat",
      "horse", "insect", "forest", "grow", "species",
      "动物", "植物", "树", "花", "鸟", "森林",
    ],
  },
  {
    domainId: "hsk3-nature-environment-explanations",
    slug: "landscape-place",
    titleVi: "Cảnh quan và miêu tả địa điểm",
    focusVi: "dựng sơ đồ không gian và chọn chi tiết làm rõ đặc điểm của một địa điểm tự nhiên",
    topicOrdinals: [43],
    keywordSignals: [
      "landscape", "scenery", "mountain", "river", "lake", "sea", "island",
      "nature", "place", "view", "east", "west", "north", "south",
      "风景", "山", "河", "湖", "海", "地方",
    ],
  },
  {
    domainId: "hsk3-nature-environment-explanations",
    slug: "environment-state",
    titleVi: "Hiện trạng môi trường và tác động đời sống",
    focusVi: "đọc số liệu đơn giản, xác định vấn đề môi trường và mô tả tác động lên cộng đồng",
    topicOrdinals: [44],
    keywordSignals: [
      "environment", "pollution", "waste", "air", "water", "noise",
      "dirty", "clean", "condition", "problem", "city",
      "环境", "污染", "空气", "垃圾", "城市",
    ],
  },
  {
    domainId: "hsk3-nature-environment-explanations",
    slug: "environment-protection",
    titleVi: "Giải pháp bảo vệ môi trường",
    focusVi: "phân loại hành động, mục đích và kết quả của các giải pháp bảo vệ môi trường",
    topicOrdinals: [45],
    keywordSignals: [
      "protect", "protection", "save", "reuse", "recycle", "reduce",
      "energy", "resource", "public", "solution", "improve",
      "保护", "节约", "资源", "改善", "解决",
    ],
  },
  {
    domainId: "hsk3-society-arts-sports-reports",
    slug: "modern-life",
    titleVi: "Đời sống hiện đại và thay đổi xã hội",
    focusVi: "rút ý chính, dấu hiệu thay đổi và ảnh hưởng của một hiện tượng đời sống hiện đại",
    topicOrdinals: [46],
    keywordSignals: [
      "modern", "society", "social", "internet", "technology", "phone",
      "online", "news", "public", "life", "change",
      "现代", "社会", "网络", "科技", "新闻",
    ],
  },
  {
    domainId: "hsk3-society-arts-sports-reports",
    slug: "city-development",
    titleVi: "Phát triển đô thị và dịch vụ công",
    focusVi: "so sánh trước–sau và giải thích lợi ích hoặc vấn đề của một thay đổi đô thị",
    topicOrdinals: [47],
    keywordSignals: [
      "city", "urban", "development", "build", "building", "street",
      "transport", "community", "public service", "construction",
      "城市", "发展", "建设", "街道", "社区",
    ],
  },
  {
    domainId: "hsk3-society-arts-sports-reports",
    slug: "arts-activities",
    titleVi: "Hoạt động văn nghệ và cảm nhận tác phẩm",
    focusVi: "tóm tắt nội dung, người tham gia và cảm nhận về một hoạt động văn nghệ",
    topicOrdinals: [48],
    keywordSignals: [
      "art", "music", "song", "dance", "film", "movie", "theater",
      "performance", "paint", "photograph", "actor", "culture",
      "音乐", "电影", "表演", "艺术", "照片",
    ],
  },
  {
    domainId: "hsk3-society-arts-sports-reports",
    slug: "sports-introduction",
    titleVi: "Giới thiệu môn thể thao và cách tham gia",
    focusVi: "xác định luật cơ bản, dụng cụ, vai trò và trình tự tham gia một môn thể thao",
    topicOrdinals: [49],
    keywordSignals: [
      "sport", "exercise", "ball", "football", "basketball", "swim",
      "run", "player", "team", "coach", "training",
      "运动", "足球", "篮球", "游泳", "队",
    ],
  },
  {
    domainId: "hsk3-society-arts-sports-reports",
    slug: "competition-report",
    titleVi: "Diễn biến và kết quả thi đấu",
    focusVi: "ghi chú mốc diễn biến, so sánh thành tích và kể lại kết quả một cuộc thi",
    topicOrdinals: [50],
    keywordSignals: [
      "competition", "match", "game", "score", "win", "lose", "champion",
      "result", "race", "contest", "prize", "medal",
      "比赛", "赢", "输", "成绩", "冠军",
    ],
  },
  {
    domainId: "hsk3-culture-tradition-descriptions",
    slug: "regional-cuisine",
    titleVi: "Ẩm thực đặc trưng và khẩu vị vùng miền",
    focusVi: "so sánh nguyên liệu, cách ăn và ý nghĩa của món ăn đặc trưng theo vùng",
    topicOrdinals: [51],
    keywordSignals: [
      "cuisine", "food", "dish", "cook", "flavor", "taste", "spicy",
      "sweet", "restaurant", "ingredient", "traditional food",
      "饮食", "特色", "味道", "做饭", "菜",
    ],
  },
  {
    domainId: "hsk3-culture-tradition-descriptions",
    slug: "tableware-etiquette",
    titleVi: "Dụng cụ ăn uống và phép lịch sự bàn ăn",
    focusVi: "nhận diện công dụng, thứ tự sử dụng và quy tắc lịch sự quanh bàn ăn",
    topicOrdinals: [52],
    keywordSignals: [
      "chopstick", "bowl", "plate", "cup", "spoon", "fork", "tableware",
      "table", "etiquette", "meal", "serve",
      "筷子", "碗", "盘", "杯", "餐具",
    ],
  },
  {
    domainId: "hsk3-culture-tradition-descriptions",
    slug: "festivals-customs",
    titleVi: "Lễ hội truyền thống và phong tục",
    focusVi: "sắp xếp hoạt động, giải thích biểu tượng và kể lại một phong tục trong dịp lễ",
    topicOrdinals: [53],
    keywordSignals: [
      "festival", "holiday", "custom", "tradition", "celebrate", "new year",
      "gift", "ceremony", "marriage", "wedding", "birthday",
      "节日", "传统", "习惯", "礼物", "结婚",
    ],
  },
  {
    domainId: "hsk3-culture-tradition-descriptions",
    slug: "regional-differences",
    titleVi: "Khác biệt vùng miền và cách giải thích",
    focusVi: "đối chiếu địa lý, lối sống và cách diễn đạt khác biệt mà không khái quát quá mức",
    topicOrdinals: [54],
    keywordSignals: [
      "region", "regional", "difference", "north", "south", "east", "west",
      "local", "area", "dialect", "compare",
      "地区", "北方", "南方", "东方", "西方", "不同",
    ],
  },
  {
    domainId: "hsk3-culture-tradition-descriptions",
    slug: "customs-comparison",
    titleVi: "Tổng hợp so sánh phong tục trong giao tiếp",
    focusVi: "tạo bảng so sánh có căn cứ giữa hai thực hành văn hóa và nêu giới hạn thông tin",
    topicOrdinals: [],
    keywordSignals: [
      "culture", "cultural", "guest", "visitor", "host", "visit", "respect",
      "introduce", "history", "country", "china", "Chinese",
      "文化", "做客", "客人", "介绍", "中国",
    ],
  },
];

const NARRATION_LESSON_SPECS = {
  "hsk3-reference-quantity-phrase-building": [
    {
      titleVi: "Quy chiếu người, vật và địa điểm",
      taskOrdinals: [1, 2],
    },
    {
      titleVi: "Số lượng, phạm vi và thành phần danh ngữ",
      taskOrdinals: [3, 4],
    },
    {
      titleVi: "Dựng câu chính xác cho hành trình",
      taskOrdinals: [5],
    },
  ],
  "hsk3-modality-time-viewpoint-framing": [
    {
      titleVi: "Nhu cầu, căn cứ và lời khuyên sức khỏe",
      taskOrdinals: [6, 7],
    },
    {
      titleVi: "Thời điểm và góc nhìn trong trải nghiệm",
      taskOrdinals: [8, 9],
    },
    {
      titleVi: "Thái độ và tần suất trong chuyện gia đình",
      taskOrdinals: [10],
    },
  ],
  "hsk3-event-complements-voice": [
    {
      titleVi: "Chuỗi hành động trong học tập và trường lớp",
      taskOrdinals: [11, 12],
    },
    {
      titleVi: "Tác nhân, kết quả và trách nhiệm",
      taskOrdinals: [13, 14],
    },
    {
      titleVi: "Kể lại kinh nghiệm nghề nghiệp",
      taskOrdinals: [15],
    },
  ],
  "hsk3-comparison-description-evaluation": [
    {
      titleVi: "So sánh khí hậu và hiện tượng tự nhiên",
      taskOrdinals: [16],
    },
    {
      titleVi: "Mô tả thay đổi môi trường",
      taskOrdinals: [17],
    },
    {
      titleVi: "Đánh giá một mặt của đời sống xã hội",
      taskOrdinals: [18],
    },
  ],
  "hsk3-discourse-linking": [
    {
      titleVi: "Liên kết thông tin văn nghệ",
      taskOrdinals: [19],
    },
    {
      titleVi: "Trình tự thi đấu và giới thiệu ẩm thực",
      taskOrdinals: [20, 21],
    },
    {
      titleVi: "Điều kiện, mục đích và phong tục",
      taskOrdinals: [22],
    },
  ],
};

const PRODUCTION_LESSON_TITLES = {
  "hsk3-main-idea-detail-notes": [
    "Ghi ý chính bằng lưới ai–việc gì–ở đâu",
    "Ghi mốc thời gian và quan hệ nguyên nhân",
    "Đối chiếu chi tiết giữa nghe và đọc",
  ],
  "hsk3-cohesion-reconstruction": [
    "Sắp xếp đoạn theo mốc thời gian",
    "Khôi phục tham chiếu và từ nối",
    "Giải thích lựa chọn trật tự đoạn",
  ],
  "hsk3-event-retelling": [
    "Kể lại sự kiện từ bảng ghi chú",
    "Kể lại thay đổi và nguyên nhân",
    "Kể lại có mở–thân–kết",
  ],
  "hsk3-guided-paragraph": [
    "Viết đoạn sáu câu theo câu hỏi dẫn",
    "Viết đoạn so sánh có dẫn chứng",
    "Viết đoạn tám câu và tự sửa liên kết",
  ],
  "hsk3-structured-explanation": [
    "Giải thích lựa chọn và lý do",
    "So sánh hai phương án bằng tiêu chí",
    "Trình bày quan điểm có giới hạn",
  ],
};

const splitEvenly = (values, count) => {
  const base = Math.floor(values.length / count);
  const remainder = values.length % count;
  let offset = 0;
  return Array.from({ length: count }, (_, index) => {
    const size = base + (index < remainder ? 1 : 0);
    const bucket = values.slice(offset, offset + size);
    offset += size;
    return bucket;
  });
};

const ordinalId = (prefix, ordinal, width = 2) =>
  `${prefix}${String(ordinal).padStart(width, "0")}`;
const normalize = (value) => value.toLocaleLowerCase("en");

const classifyVocabulary = (entries, lessonSpecs) => {
  const assignmentCounts = new Map(
    lessonSpecs.map((spec) => [spec.lessonId, 0]),
  );
  return entries.map((entry) => {
    const haystack = normalize([
      entry.simplified,
      ...entry.sourceMatches.flatMap((match) => match.senses),
    ].join(" "));
    let best = null;
    for (const spec of lessonSpecs) {
      for (const signal of spec.keywordSignals) {
        if (!haystack.includes(normalize(signal))) continue;
        const score = signal.length >= 8 ? 3 : signal.length >= 4 ? 2 : 1;
        if (!best || score > best.score) {
          best = { spec, score, signal };
        }
      }
    }
    if (!best) {
      const spec = [...lessonSpecs].sort((left, right) =>
        assignmentCounts.get(left.lessonId)
          - assignmentCounts.get(right.lessonId)
        || left.lessonId.localeCompare(right.lessonId)
      )[0];
      assignmentCounts.set(
        spec.lessonId,
        assignmentCounts.get(spec.lessonId) + 1,
      );
      return {
        vocabularyId: entry.officialId,
        lessonId: spec.lessonId,
        method: "cross-domain-foundation-fallback",
        score: 0,
        matchedSignal: null,
      };
    }
    assignmentCounts.set(
      best.spec.lessonId,
      assignmentCounts.get(best.spec.lessonId) + 1,
    );
    return {
      vocabularyId: entry.officialId,
      lessonId: best.spec.lessonId,
      method: "source-sense-keyword-match",
      score: best.score,
      matchedSignal: best.signal,
    };
  });
};

const makeParagraphLessons = (scopeBundle, vocabularyBundle) => {
  const lessonSpecs = PARAGRAPH_LESSON_SPECS.map((spec, index) => ({
    ...spec,
    lessonId: `${spec.domainId}-${spec.slug}`,
    order: index,
    topicIds: spec.topicOrdinals.map(
      (ordinal) => ordinalId("hsk3-topic-", ordinal, 3),
    ),
  }));
  for (const domain of scopeBundle.scope.discourseDomains) {
    const actual = lessonSpecs
      .filter((spec) => spec.domainId === domain.domainId)
      .flatMap((spec) => spec.topicIds);
    if (
      actual.length !== new Set(actual).size
      || JSON.stringify([...actual].sort())
        !== JSON.stringify([...domain.topicIds].sort())
    ) {
      throw new Error(`${domain.domainId} topic specifications are incomplete`);
    }
  }
  const vocabularyAssignments = classifyVocabulary(
    vocabularyBundle.draft.entries,
    lessonSpecs,
  );
  const vocabularyEntryById = new Map(
    vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const vocabularyAssignmentById = new Map(
    vocabularyAssignments.map((assignment) => [
      assignment.vocabularyId,
      assignment,
    ]),
  );
  const characterAssignments = [];
  const characterCounts = new Map(
    lessonSpecs.map((spec) => [spec.lessonId, 0]),
  );
  const officialCharacters =
    scopeBundle.graphBundle.syllabus.inventory.recognitionCharacters
      .filter((item) => item.level === 3);
  for (const character of officialCharacters) {
    const sourceVocabulary = vocabularyBundle.draft.entries.find(
      (entry) => entry.simplified.includes(character.character),
    );
    if (sourceVocabulary) {
      const vocabularyAssignment = vocabularyAssignmentById.get(
        sourceVocabulary.officialId,
      );
      characterCounts.set(
        vocabularyAssignment.lessonId,
        characterCounts.get(vocabularyAssignment.lessonId) + 1,
      );
      characterAssignments.push({
        characterId: character.id,
        character: character.character,
        lessonId: vocabularyAssignment.lessonId,
        method: "incremental-vocabulary-context",
        sourceVocabularyId: sourceVocabulary.officialId,
      });
      continue;
    }
    const spec = [...lessonSpecs].sort((left, right) =>
      characterCounts.get(left.lessonId)
        - characterCounts.get(right.lessonId)
      || left.lessonId.localeCompare(right.lessonId)
    )[0];
    characterCounts.set(
      spec.lessonId,
      characterCounts.get(spec.lessonId) + 1,
    );
    characterAssignments.push({
      characterId: character.id,
      character: character.character,
      lessonId: spec.lessonId,
      method: "no-incremental-vocabulary-context",
      sourceVocabularyId: null,
    });
  }
  const paragraphInput = scopeBundle.scope.unitScopes.find(
    (unit) => unit.unitId === "hsk3-paragraph-input",
  );
  const lessons = lessonSpecs.map((spec) => {
    const lessonVocabularyAssignments = vocabularyAssignments.filter(
      (assignment) => assignment.lessonId === spec.lessonId,
    );
    const vocabularyIds = lessonVocabularyAssignments.map(
      (assignment) => assignment.vocabularyId,
    );
    for (const vocabularyId of vocabularyIds) {
      if (!vocabularyEntryById.has(vocabularyId)) {
        throw new Error(`Missing source vocabulary ${vocabularyId}`);
      }
    }
    return {
      lessonId: spec.lessonId,
      unitId: "hsk3-paragraph-input",
      trackId: spec.domainId,
      blueprintKind: "paragraph-input",
      titleVi: spec.titleVi,
      objectiveVi:
        `Đọc hoặc nghe đoạn HSK3 về ${spec.focusVi}, ghi ý chính–chi tiết rồi tóm lược bằng câu có liên kết; chưa chấm mastery trước review.`,
      inventoryMappings: {
        taskIds: [],
        topicIds: spec.topicIds,
        vocabularyIds,
        grammarRowIds: [],
        recognitionCharacterIds: characterAssignments
          .filter((assignment) => assignment.lessonId === spec.lessonId)
          .map((assignment) => assignment.characterId),
      },
      classification: {
        keywordSignals: spec.keywordSignals,
        semanticMatchCount: lessonVocabularyAssignments.filter(
          (assignment) =>
            assignment.method === "source-sense-keyword-match",
        ).length,
        foundationFallbackCount: lessonVocabularyAssignments.filter(
          (assignment) =>
            assignment.method === "cross-domain-foundation-fallback",
        ).length,
        semanticClaimsReviewed: false,
      },
      requiredPracticeKinds: [
        "graded-paragraph-reading",
        "paragraph-listening-and-note-grid",
        "main-idea-detail-check",
      ],
      audioRequirement: "reviewed-human-or-licensed-before-release",
      evidenceMode: paragraphInput.exitEvidence.mode,
      evidenceSkills: paragraphInput.exitEvidence.skills,
    };
  });
  return { lessons, vocabularyAssignments, characterAssignments };
};

const taskDomainIds = (scope, taskIds) => scope.discourseDomains
  .filter((domain) => taskIds.some((taskId) => domain.taskIds.includes(taskId)))
  .map((domain) => domain.domainId);

const makeNarrationLessons = (scopeBundle) => {
  const unit = scopeBundle.scope.unitScopes.find(
    (candidate) => candidate.unitId === "hsk3-narration",
  );
  return unit.grammarModules.flatMap((module) => {
    const specs = NARRATION_LESSON_SPECS[module.moduleId];
    if (!specs) throw new Error(`Missing narration specs for ${module.moduleId}`);
    const grammarBuckets = splitEvenly(module.grammarRowIds, specs.length);
    return specs.map((spec, index) => {
      const taskIds = spec.taskOrdinals.map(
        (ordinal) => ordinalId("hsk3-task-", ordinal),
      );
      return {
        lessonId:
          `${module.moduleId}-lesson-${String(index + 1).padStart(2, "0")}`,
        unitId: unit.unitId,
        trackId: module.moduleId,
        blueprintKind: "narration-grammar",
        titleVi: spec.titleVi,
        objectiveVi:
          `Dùng các mẫu trong ${spec.titleVi.toLocaleLowerCase("vi")} để tổ chức tường thuật có mở–thân–kết, tự sửa quan hệ ý trước khi nộp reviewer.`,
        inventoryMappings: {
          taskIds,
          topicIds: [],
          vocabularyIds: [],
          grammarRowIds: grammarBuckets[index],
          recognitionCharacterIds: [],
        },
        contextDomainIds: taskDomainIds(scopeBundle.scope, taskIds),
        requiredPracticeKinds: [
          "grammar-in-paragraph",
          "ordered-event-retelling",
          "discourse-error-correction",
        ],
        audioRequirement: "reviewed-human-or-licensed-before-release",
        evidenceMode: unit.exitEvidence.mode,
        evidenceSkills: unit.exitEvidence.skills,
      };
    });
  });
};

const makeProductionLessons = (scopeBundle) => {
  const unit = scopeBundle.scope.unitScopes.find(
    (candidate) => candidate.unitId === "hsk3-guided-production",
  );
  const domainIds = scopeBundle.scope.discourseDomains.map(
    (domain) => domain.domainId,
  );
  let domainOffset = 0;
  return unit.productionStages.flatMap((stage) => {
    const titles = PRODUCTION_LESSON_TITLES[stage.stageId];
    if (!titles) throw new Error(`Missing production titles for ${stage.stageId}`);
    const promptBuckets = splitEvenly(
      Array.from(
        { length: stage.minimumPromptUnits },
        (_, index) => index + 1,
      ),
      titles.length,
    );
    return titles.map((titleVi, index) => {
      const contextDomainIds = [
        domainIds[domainOffset % domainIds.length],
        domainIds[(domainOffset + 1) % domainIds.length],
      ];
      domainOffset += 1;
      return {
        lessonId:
          `${stage.stageId}-lesson-${String(index + 1).padStart(2, "0")}`,
        unitId: unit.unitId,
        trackId: stage.stageId,
        blueprintKind: "guided-production",
        titleVi,
        objectiveVi:
          `Hoàn thành ${titleVi.toLocaleLowerCase("vi")} theo rubric HSK3 dự kiến, tự đối chiếu nội dung–liên kết–độ chính xác; rubric chưa có hiệu lực trước human review.`,
        inventoryMappings: {
          taskIds: [],
          topicIds: [],
          vocabularyIds: [],
          grammarRowIds: [],
          recognitionCharacterIds: [],
        },
        promptPlan: {
          mode: stage.mode,
          minimumPromptUnits: promptBuckets[index].length,
          contextDomainIds,
          authoredPromptCount: 0,
        },
        requiredPracticeKinds: [
          stage.mode,
          "guided-production",
          "self-reveal-revision",
        ],
        audioRequirement: stage.skills.includes("listening")
          ? "reviewed-human-or-licensed-before-release"
          : "not-required-for-blueprint",
        evidenceMode: unit.exitEvidence.mode,
        evidenceSkills: stage.skills,
      };
    });
  });
};

export const buildHsk3LessonBlueprints = (root = process.cwd()) => {
  const scopeBundle = loadHsk3CurriculumScopeBundle(root);
  const scopeResult = assertValidHsk3CurriculumScopeBundle(scopeBundle);
  const vocabularyBundle = loadHsk3VocabularyDraftBundle(root);
  assertValidHsk3VocabularyDraftBundle(vocabularyBundle);
  const paragraph = makeParagraphLessons(scopeBundle, vocabularyBundle);
  const rawLessons = [
    ...paragraph.lessons,
    ...makeNarrationLessons(scopeBundle),
    ...makeProductionLessons(scopeBundle),
  ];
  if (rawLessons.length !== scopeResult.summary.plannedLessonBlueprints) {
    throw new Error("Generated HSK3 lesson count does not match the scope");
  }
  const lessons = rawLessons.map((lesson, index) => ({
    ...lesson,
    sequence: index + 1,
    prerequisiteLessonIds: index === 0
      ? []
      : [rawLessons[index - 1].lessonId],
    practicePlan: {
      state: "planned",
      requiredKinds: lesson.requiredPracticeKinds,
      authoredItemCount: 0,
      measurementEligible: false,
      masteryEligible: false,
    },
    assessmentPlan: {
      evidenceMode: lesson.evidenceMode,
      skills: lesson.evidenceSkills,
      reviewedRubricRequired: true,
      rubric: null,
      authoredPromptCount: 0,
    },
    audioRequirement: lesson.audioRequirement,
    review: "pending",
    releaseEligible: false,
    requiredPracticeKinds: undefined,
    evidenceMode: undefined,
    evidenceSkills: undefined,
  }));
  const reviewBatches = lessons.map((lesson) => ({
    batchId: `${lesson.lessonId}:blueprint-review-v1`,
    lessonId: lesson.lessonId,
    targetLessonIds: [lesson.lessonId],
    requiredRoles: [
      "native-mandarin-curriculum-reviewer",
      "vietnamese-editor",
      "assessment-editor",
    ],
    state: "pending",
    approvals: [],
  }));
  const sourceSenseKeywordMatches = paragraph.vocabularyAssignments.filter(
    (assignment) => assignment.method === "source-sense-keyword-match",
  ).length;
  const charactersWithIncrementalVocabularyContext =
    paragraph.characterAssignments.filter(
      (assignment) =>
        assignment.method === "incremental-vocabulary-context",
    ).length;
  const counts = {
    lessons: lessons.length,
    paragraphInputLessons: paragraph.lessons.length,
    narrationGrammarLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "narration-grammar",
    ).length,
    guidedProductionLessons: lessons.filter(
      (lesson) => lesson.blueprintKind === "guided-production",
    ).length,
    taskBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings.taskIds,
    )).size,
    topicBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings.topicIds,
    )).size,
    vocabularyBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings.vocabularyIds,
    )).size,
    grammarBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings.grammarRowIds,
    )).size,
    recognitionCharacterBlueprintMappings: new Set(lessons.flatMap(
      (lesson) => lesson.inventoryMappings.recognitionCharacterIds,
    )).size,
    sourceSenseKeywordMatches,
    foundationFallbackVocabulary:
      paragraph.vocabularyAssignments.length - sourceSenseKeywordMatches,
    charactersWithIncrementalVocabularyContext,
    charactersWithoutIncrementalVocabularyContext:
      paragraph.characterAssignments.length
      - charactersWithIncrementalVocabularyContext,
    plannedMinimumPromptUnits: lessons.reduce(
      (total, lesson) =>
        total + (lesson.promptPlan?.minimumPromptUnits ?? 0),
      0,
    ),
    authoredPracticeItems: 0,
    authoredAssessmentPrompts: 0,
    reviewBatches: reviewBatches.length,
    approvals: 0,
    releaseEligibleLessons: 0,
  };
  return {
    schemaVersion: 1,
    packId: "hsk3-lesson-blueprints-2026.07",
    level: 3,
    state: "ai-assisted-blueprint-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      vocabularyDraftId: vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(vocabularyBundle.draftPath),
      attribution:
        "content/sources/cc-cedict-debian-2026-04-03/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-curriculum-blueprint",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
    },
    classificationPolicy: {
      method:
        "source-sense-keyword-score-with-declared-foundation-fallback",
      sourceFields: ["simplified", "sourceMatches.senses"],
      tieBreak: "lesson-spec-order",
      fallback: "least-populated-lesson-then-lesson-id",
      fallbackClaimsSemanticMatch: false,
      humanSemanticReviewRequired: true,
    },
    releasePolicy: {
      linguisticReviewRequired: true,
      vietnameseEditorialReviewRequired: true,
      assessmentReviewRequired: true,
      reviewedAudioRequiredWhereDeclared: true,
      practiceRequiredForRelease: true,
      blueprintGrantsMastery: false,
    },
    counts,
    coverageClaims: {
      officialInventoryBlueprintMapped: true,
      lessonBlueprintCoverageComplete: true,
      authoredPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk3Complete: false,
    },
    vocabularyAssignments: paragraph.vocabularyAssignments,
    characterAssignments: paragraph.characterAssignments,
    lessons,
    reviewBatches,
  };
};

export const serializeHsk3LessonBlueprints = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH,
  );
  const serialized = serializeHsk3LessonBlueprints(
    buildHsk3LessonBlueprints(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 lesson-blueprint pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH,
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
