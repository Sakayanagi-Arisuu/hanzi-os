import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH =
  "content/drafts/hsk4-level-assessment-2026.07.json";

const BANK_ID = "hsk4-level-assessment-2026.07";
const FORM_IDS = ["hsk4-level-form-a", "hsk4-level-form-b"];
const OPTION_IDS = ["A", "B", "C", "D"];
const SECTION_IDS = [
  "listening-objective",
  "reading-objective",
  "vocabulary-objective",
  "grammar-objective",
  "speaking-performance",
  "writing-performance",
];
const OBJECTIVE_SECTION_IDS = SECTION_IDS.slice(0, 4);
const PERFORMANCE_SECTION_IDS = SECTION_IDS.slice(4);
const SECTION_SKILLS = {
  "listening-objective": "listening",
  "reading-objective": "reading",
  "vocabulary-objective": "vocabulary",
  "grammar-objective": "grammar",
  "speaking-performance": "speaking",
  "writing-performance": "writing",
};
const SECTION_ITEM_COUNTS = {
  "listening-objective": 18,
  "reading-objective": 18,
  "vocabulary-objective": 18,
  "grammar-objective": 18,
  "speaking-performance": 12,
  "writing-performance": 12,
};
const MOCK_SECTION_SPECS = {
  "listening-objective": { itemCount: 12, timeLimitSeconds: 1_080 },
  "reading-objective": { itemCount: 12, timeLimitSeconds: 1_080 },
  "vocabulary-objective": { itemCount: 12, timeLimitSeconds: 600 },
  "grammar-objective": { itemCount: 12, timeLimitSeconds: 720 },
  "speaking-performance": { itemCount: 3, timeLimitSeconds: 900 },
  "writing-performance": { itemCount: 3, timeLimitSeconds: 1_620 },
};
const DIFFICULTY_BY_SECTION = {
  "listening-objective": ["core", "standard", "stretch"],
  "reading-objective": ["core", "standard", "stretch"],
  "vocabulary-objective": ["core", "standard", "standard"],
  "grammar-objective": ["standard", "standard", "stretch"],
  "speaking-performance": ["standard", "stretch"],
  "writing-performance": ["core", "standard"],
};
const DOMAIN_SPECS = [
  {
    key: "personal-community",
    domainId: "hsk4-personal-community-analysis",
    titleVi: "Đời sống cá nhân và cộng đồng",
  },
  {
    key: "education-work",
    domainId: "hsk4-education-work-evaluation",
    titleVi: "Giáo dục và công việc",
  },
  {
    key: "nature-technology",
    domainId: "hsk4-nature-technology-explanation",
    titleVi: "Tự nhiên và công nghệ",
  },
  {
    key: "society-economy",
    domainId: "hsk4-society-economy-argument",
    titleVi: "Xã hội và kinh tế",
  },
  {
    key: "arts-sports",
    domainId: "hsk4-arts-sports-exchange-critique",
    titleVi: "Nghệ thuật, thể thao và giao lưu",
  },
  {
    key: "culture-history",
    domainId: "hsk4-culture-history-interpretation",
    titleVi: "Văn hóa và lịch sử",
  },
];
const LEARNING_SOURCE_PATHS = [
  "content/curriculum/hsk4-scope.json",
  "content/drafts/hsk4-vocabulary-2026.07.29.json",
  "content/drafts/hsk4-lesson-blueprints-2026.07.json",
  "content/drafts/hsk4-personal-community-long-form-2026.07.json",
  "content/drafts/hsk4-education-work-long-form-2026.07.json",
  "content/drafts/hsk4-nature-technology-long-form-2026.07.json",
  "content/drafts/hsk4-society-economy-long-form-2026.07.json",
  "content/drafts/hsk4-arts-sports-exchange-long-form-2026.07.json",
  "content/drafts/hsk4-culture-history-long-form-2026.07.json",
  "content/drafts/hsk4-precision-reference-quantity-summary-argument-2026.07.json",
  "content/drafts/hsk4-stance-comparison-rhetoric-summary-argument-2026.07.json",
  "content/drafts/hsk4-event-agency-voice-summary-argument-2026.07.json",
  "content/drafts/hsk4-information-order-cohesion-summary-argument-2026.07.json",
  "content/drafts/hsk4-argument-logic-concession-summary-argument-2026.07.json",
  "content/drafts/hsk4-long-input-structure-map-integration-2026.07.json",
  "content/drafts/hsk4-inference-evidence-check-integration-2026.07.json",
  "content/drafts/hsk4-cross-text-synthesis-integration-2026.07.json",
  "content/drafts/hsk4-structured-written-argument-integration-2026.07.json",
  "content/drafts/hsk4-structured-spoken-defense-integration-2026.07.json",
  "content/drafts/hsk4-timed-sectional-rehearsal-integration-2026.07.json",
];
const OFFICIAL_INVENTORY_RELATIVE_PATH =
  "content/sources/hsk-syllabus-2026/inventory.json";
const HSK4_SCOPE_RELATIVE_PATH = "content/curriculum/hsk4-scope.json";
const HSK4_VOCABULARY_RELATIVE_PATH =
  "content/drafts/hsk4-vocabulary-2026.07.29.json";
const bindingKey = (formId, domainKey) =>
  `${formId.endsWith("-a") ? "a" : "b"}:${domainKey}`;
const OFFICIAL_VOCABULARY_IDS = {
  "a:personal-community": [
    "hsk-vocab-01470",
    "hsk-vocab-01548",
    "hsk-vocab-01698",
  ],
  "a:education-work": [
    "hsk-vocab-01269",
    "hsk-vocab-01370",
    "hsk-vocab-01939",
  ],
  "a:nature-technology": [
    "hsk-vocab-01032",
    "hsk-vocab-01331",
    "hsk-vocab-01731",
  ],
  "a:society-economy": [
    "hsk-vocab-01266",
    "hsk-vocab-01417",
    "hsk-vocab-01920",
  ],
  "a:arts-sports": [
    "hsk-vocab-01271",
    "hsk-vocab-01386",
    "hsk-vocab-01995",
  ],
  "a:culture-history": [
    "hsk-vocab-01014",
    "hsk-vocab-01061",
    "hsk-vocab-01976",
  ],
  "b:personal-community": [
    "hsk-vocab-01194",
    "hsk-vocab-01273",
    "hsk-vocab-01589",
  ],
  "b:education-work": [
    "hsk-vocab-01162",
    "hsk-vocab-01431",
    "hsk-vocab-01533",
  ],
  "b:nature-technology": [
    "hsk-vocab-01143",
    "hsk-vocab-01325",
    "hsk-vocab-01692",
  ],
  "b:society-economy": [
    "hsk-vocab-01200",
    "hsk-vocab-01372",
    "hsk-vocab-01678",
  ],
  "b:arts-sports": [
    "hsk-vocab-01373",
    "hsk-vocab-01591",
    "hsk-vocab-01686",
  ],
  "b:culture-history": [
    "hsk-vocab-01250",
    "hsk-vocab-01518",
    "hsk-vocab-01868",
  ],
};
const grammarItemSpec = (
  grammarRowId,
  contextHanzi,
  optionsHanzi,
  correctOptionIndex,
  sourceKind,
  paragraphNumbers,
) => ({
  grammarRowId,
  contextHanzi,
  optionsHanzi,
  correctOptionIndex,
  sourceKind,
  paragraphNumbers,
});
const OFFICIAL_GRAMMAR_ITEMS = {
  "a:personal-community": [
    grammarItemSpec(
      "hsk4-grammar-row-089",
      "____居民已经接通电话，工作人员____要确认帮助是否完成。",
      [
        "即使……也……",
        "因为……所以……",
        "不但……而且……",
        "与其……不如……",
      ],
      0,
      "reading",
      [2, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-075",
      "____没有回复的人____要再次确认，高风险情况____不能忽略。",
      [
        "连……也……更……",
        "因为……所以……也……",
        "只要……就……才……",
        "虽然……但是……却……",
      ],
      0,
      "listening",
      [1, 2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-065",
      "为了避免遗漏，值班员____再次检查名单。",
      ["不能不", "并不", "从不", "未必"],
      0,
      "listening",
      [2, 3],
    ),
  ],
  "a:education-work": [
    grammarItemSpec(
      "hsk4-grammar-row-063",
      "只统计见面次数____检查员工能否解决真实问题。",
      ["不如", "不管", "不但", "不过"],
      0,
      "reading",
      [1, 2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-074",
      "新指标记录完成率，____区分错误类型和生产中断。",
      ["并且", "否则", "然而", "于是"],
      0,
      "listening",
      [3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-013",
      "签到率____很高，但不能代表员工真正理解。",
      ["确实", "互相", "重新", "偶尔"],
      0,
      "listening",
      [1],
    ),
  ],
  "a:nature-technology": [
    grammarItemSpec(
      "hsk4-grammar-row-018",
      "项目组____叶子状态和人工抽查修改湿度标准。",
      ["按照", "对于", "随着", "由于"],
      0,
      "reading",
      [2, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-087",
      "____网页混合了两种时间，____曲线容易被误读。",
      [
        "由于……因此……",
        "即使……也……",
        "一边……一边……",
        "不是……而是……",
      ],
      0,
      "listening",
      [2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-088",
      "系统标出上传时间，____让学生分清旧数据和新数据。",
      ["好", "却", "否则", "甚至"],
      0,
      "listening",
      [2, 3],
    ),
  ],
  "a:society-economy": [
    grammarItemSpec(
      "hsk4-grammar-row-068",
      "电子退款____减少现金排队，____可能带来网络延迟。",
      [
        "一方面……另一方面……",
        "因为……所以……",
        "只要……就……",
        "除了……还……",
      ],
      0,
      "listening",
      [1, 2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-020",
      "平均操作时间缩短了，____仍有九笔退款明显延迟。",
      ["不过", "因此", "于是", "此外"],
      0,
      "listening",
      [2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-012",
      "若只看归还率，____会忽略运输和清洗成本。",
      ["恐怕", "互相", "重新", "按时"],
      0,
      "reading",
      [2, 3],
    ),
  ],
  "a:arts-sports": [
    grammarItemSpec(
      "hsk4-grammar-row-064",
      "____只按年代参观____，多种路线给观众更多选择。",
      [
        "跟……相比",
        "被……所……",
        "由于……因此……",
        "不管……都……",
      ],
      0,
      "reading",
      [2, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-067",
      "字幕设计____要容易阅读，____要让观众看见演员表情。",
      [
        "既……又……",
        "如果……就……",
        "虽然……但是……",
        "只有……才……",
      ],
      0,
      "listening",
      [1, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-066",
      "不同路线____一定表示理解失败，____可能反映时间和语言需要。",
      [
        "不是……而是……",
        "一边……一边……",
        "除了……还……",
        "因为……所以……",
      ],
      0,
      "reading",
      [2],
    ),
  ],
  "a:culture-history": [
    grammarItemSpec(
      "hsk4-grammar-row-034",
      "在授权____，保存录音和公开录音必须分开处理。",
      ["方面", "左右", "以来", "之中"],
      0,
      "reading",
      [1, 2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-073",
      "新说明牌____写出大概年代，____列明三类来源。",
      [
        "不仅……还……",
        "只要……就……",
        "虽然……但是……",
        "一边……一边……",
      ],
      0,
      "listening",
      [3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-055",
      "项目组把三种授权____，再请讲述者选择。",
      ["列一列", "列着", "被列", "列过吗"],
      0,
      "reading",
      [2],
    ),
  ],
  "b:personal-community": [
    grammarItemSpec(
      "hsk4-grammar-row-077",
      "____应用投诉减少了，____电话记录略有增加。",
      [
        "尽管……但是……",
        "只要……就……",
        "不但……而且……",
        "由于……因此……",
      ],
      0,
      "reading",
      [3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-085",
      "____居民用电话、纸条还是应用，委员会____要记录事件背景。",
      [
        "无论……都……",
        "因为……所以……",
        "与其……不如……",
        "除了……还……",
      ],
      0,
      "reading",
      [2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-030",
      "只看网上预约，____会漏掉不会扫码的实际使用者。",
      ["说不定", "按时", "互相", "更加"],
      0,
      "listening",
      [1, 3],
    ),
  ],
  "b:education-work": [
    grammarItemSpec(
      "hsk4-grammar-row-056",
      "系统已经把登录和完成____。",
      ["分开记录了", "被分开记录", "正在分开", "分开吗"],
      0,
      "reading",
      [2, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-015",
      "建议采用率____项目组统一记录。",
      ["由", "把", "对", "跟"],
      0,
      "listening",
      [3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-017",
      "____网络不稳的学生，开放时段尤其重要。",
      ["对于", "按照", "随着", "由于"],
      0,
      "reading",
      [2, 3],
    ),
  ],
  "b:nature-technology": [
    grammarItemSpec(
      "hsk4-grammar-row-082",
      "____把照片数直接当成动物数，____容易得出错误结论。",
      [
        "要是……就……",
        "既……又……",
        "虽然……但是……",
        "除了……还……",
      ],
      0,
      "reading",
      [1, 2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-021",
      "相机位置集中在道路附近，____报告必须说明取样限制。",
      ["因此", "反而", "未必", "逐渐"],
      0,
      "reading",
      [3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-083",
      "____两个传感器都稳定，____发正式警报，____先请值班员检查。",
      [
        "要是……就……否则……",
        "即使……也……并且……",
        "不仅……还……因此……",
        "虽然……但是……于是……",
      ],
      0,
      "listening",
      [2, 3],
    ),
  ],
  "b:society-economy": [
    grammarItemSpec(
      "hsk4-grammar-row-086",
      "____票价不是唯一成本，____不能只按价格解释使用变化。",
      [
        "既然……就……",
        "尽管……仍……",
        "一边……一边……",
        "不但……而且……",
      ],
      0,
      "reading",
      [2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-081",
      "评估必须记录到站距离，____会高估远村居民得到的帮助。",
      ["否则", "因此", "尤其", "逐渐"],
      0,
      "reading",
      [2, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-053",
      "____低价票就能解决所有到站距离问题____？",
      ["难道……吗", "即使……也", "首先……其次", "不是……而是"],
      0,
      "reading",
      [2, 3],
    ),
  ],
  "b:arts-sports": [
    grammarItemSpec(
      "hsk4-grammar-row-079",
      "网上视频可以补充练习，____最后两次合奏仍须到场。",
      ["不过", "于是", "因此", "此外"],
      0,
      "listening",
      [2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-011",
      "实际上场人数增加了，教练____不能机械平均每个人的时间。",
      ["却", "已", "互相", "重新"],
      0,
      "reading",
      [1, 2],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-014",
      "____比赛压力提高，球队还要继续检查轮换规则。",
      ["随着", "关于", "对于", "根据"],
      0,
      "reading",
      [3],
    ),
  ],
  "b:culture-history": [
    grammarItemSpec(
      "hsk4-grammar-row-039",
      "团队____改善通行____增加了可逆坡道。",
      [
        "为了……而……",
        "尽管……但是……",
        "不是……而是……",
        "因为……所以……",
      ],
      0,
      "reading",
      [1, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-069",
      "评价老街改造时，____检查雨天安全，____比较通行时间。",
      [
        "首先……其次……",
        "即使……也……",
        "不是……而是……",
        "一边……一边……",
      ],
      0,
      "reading",
      [2, 3],
    ),
    grammarItemSpec(
      "hsk4-grammar-row-062",
      "缺少背景的说明____参观者误以为照片代表所有工人。",
      ["让", "由", "对于", "按照"],
      0,
      "listening",
      [1, 2],
    ),
  ],
};

const sha256 = (value) =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const jsonSha256 = (value) => sha256(JSON.stringify(value));
const fileSha256 = (path) => sha256(readFileSync(path));
const normalizeHanzi = (value) =>
  value.match(/\p{Script=Han}/gu)?.join("") ?? "";
const unique = (values) => [...new Set(values)];
const countBy = (values, selector) =>
  Object.fromEntries(
    [...new Set(values.map(selector))].sort().map((key) => [
      key,
      values.filter((value) => selector(value) === key).length,
    ]),
  );
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const paragraph = (hanzi, vietnamese) => ({ hanzi, vietnamese });
const claim = (
  hanzi,
  vietnamese,
  paragraphNumbers,
  rationaleVi,
) => ({
  hanzi,
  vietnamese,
  paragraphNumbers,
  rationaleVi,
});
const textDraft = (
  titleHanzi,
  titleVi,
  paragraphs,
  claims,
) => ({
  titleHanzi,
  titleVi,
  paragraphs,
  claims,
});
const vocabularyDraft = (
  targetHanzi,
  contextHanzi,
  optionsHanzi,
  correctOptionIndex,
  sourceKind,
  paragraphNumbers,
  rationaleVi,
) => ({
  targetHanzi,
  contextHanzi,
  optionsHanzi,
  correctOptionIndex,
  sourceKind,
  paragraphNumbers,
  rationaleVi,
});
const grammarDraft = (
  grammarLabel,
  contextHanzi,
  optionsHanzi,
  correctOptionIndex,
  sourceKind,
  paragraphNumbers,
  rationaleVi,
) => ({
  grammarLabel,
  contextHanzi,
  optionsHanzi,
  correctOptionIndex,
  sourceKind,
  paragraphNumbers,
  rationaleVi,
});

const FAMILY_DRAFTS = [
  {
    formId: FORM_IDS[0],
    domainKey: "personal-community",
    decisionVi:
      "cách vận hành mạng hỗ trợ cộng đồng trong đợt nắng nóng mà không bỏ sót người có nguy cơ",
    counterclaimVi:
      "Chỉ cần tỷ lệ bắt máy cao là có thể kết luận mạng hỗ trợ đã bảo vệ an toàn cho mọi người.",
    scopeBoundaryVi:
      "Hai đợt thử nghiệm ngắn tại một khu dân cư không đại diện cho toàn thành phố; không bắt máy cũng không tự động có nghĩa là an toàn hay gặp nguy hiểm.",
    reading: textDraft(
      "社区高温联系网为何不能只看接通率",
      "Vì sao mạng liên lạc chống nóng không thể chỉ nhìn tỷ lệ bắt máy",
      [
        paragraph(
          "去年夏天，青河社区把独居老人、志愿者和附近诊所连成一张高温联系网。气温超过三十五度时，志愿者先发信息，再给没有回复的人打电话。社区强调，这张表只用于确认是否需要帮助，不能代替医生判断，也不能随便交给商业机构。",
          "Mùa hè năm ngoái, khu Thanh Hà kết nối người cao tuổi sống một mình, tình nguyện viên và phòng khám gần đó thành mạng liên lạc chống nóng. Khi nhiệt độ vượt 35 độ, tình nguyện viên nhắn trước rồi gọi người chưa phản hồi. Bảng chỉ dùng để xác nhận nhu cầu hỗ trợ, không thay bác sĩ hay được tùy tiện chuyển cho đơn vị thương mại.",
        ),
        paragraph(
          "第一次试行涉及八十四户，六十一户当天回复，十七户需要送水或买药，四户后来由诊所继续联系。工作人员发现，接通电话并不等于问题已经解决；有的人虽然说“没事”，房间里却没有风扇，也不知道最近的避暑点在哪里。",
          "Đợt thử đầu gồm 84 hộ; 61 hộ phản hồi trong ngày, 17 hộ cần nước hoặc thuốc, và 4 hộ được phòng khám theo dõi. Nhân viên nhận ra bắt máy không đồng nghĩa vấn đề đã được giải quyết: có người nói “không sao” nhưng phòng không có quạt và không biết điểm tránh nóng gần nhất.",
        ),
        paragraph(
          "第二次试行增加了本人同意、两种联系方式和“是否已经得到帮助”三项记录。社区准备同时比较回复速度、实际完成的帮助和漏掉的高风险情况。不过，数据只来自两个炎热星期，季节更长或居民更多时是否有效，还需要继续观察。",
          "Đợt hai bổ sung sự đồng ý, hai cách liên lạc và mục “đã nhận hỗ trợ chưa”. Khu dân cư sẽ so sánh tốc độ phản hồi, hỗ trợ thực sự hoàn tất và trường hợp nguy cơ cao bị bỏ sót. Dữ liệu mới từ hai tuần nóng nên hiệu quả khi mùa dài hơn hoặc dân số lớn hơn vẫn cần quan sát.",
        ),
      ],
      [
        claim(
          "联系网应把回复、实际帮助和遗漏风险分开记录，同时保护居民同意。",
          "Mạng liên lạc phải tách phản hồi, hỗ trợ thực tế và nguy cơ bỏ sót, đồng thời bảo vệ sự đồng ý của cư dân.",
          [1, 2, 3],
          "Cả ba đoạn lần lượt nêu mục đích, khoảng cách giữa bắt máy và được giúp, rồi cách đo lường thận trọng.",
        ),
        claim(
          "八十四户中有六十一户当天回复，十七户提出送水或买药的需要。",
          "Trong 84 hộ có 61 hộ phản hồi trong ngày và 17 hộ cần giao nước hoặc mua thuốc.",
          [2],
          "Đây là hai con số được nêu trực tiếp ở đoạn hai.",
        ),
        claim(
          "只报告接通率可能会隐藏尚未完成的帮助。",
          "Chỉ báo tỷ lệ bắt máy có thể che giấu hỗ trợ chưa hoàn tất.",
          [2, 3],
          "Nguồn phân biệt rõ bắt máy với giải quyết vấn đề và bổ sung chỉ số hoàn tất.",
        ),
        claim(
          "这张联系网已经证明全市所有独居老人都能安全度过高温。",
          "Mạng này đã chứng minh mọi người cao tuổi sống một mình trong toàn thành phố đều an toàn qua đợt nóng.",
          [],
          "Nguồn chỉ có hai tuần dữ liệu tại một khu dân cư nên không hỗ trợ khái quát này.",
        ),
      ],
    ),
    listening: textDraft(
      "夜间送水名单怎样更新",
      "Danh sách giao nước ban đêm được cập nhật thế nào",
      [
        paragraph(
          "高温联系网运行一周后，志愿者发现白天的送水名单到了晚上常常已经过时。有些居民临时去了亲戚家，有些人已经从邻居那里得到水，还有人因为手机没电一直没有回复。于是值班组不再直接按照早上的名单出发。",
          "Sau một tuần, tình nguyện viên thấy danh sách giao nước ban ngày thường lỗi thời vào buổi tối. Có người sang nhà họ hàng, có người đã nhận nước từ hàng xóm, có người không phản hồi vì điện thoại hết pin. Nhóm trực vì thế không còn xuất phát chỉ theo danh sách buổi sáng.",
        ),
        paragraph(
          "新流程要求出发前由两个人分别确认：一人检查最新留言，另一人给楼道联系人打电话。若两种信息不一致，任务会被标为“需要再次判断”，而不是自动取消。诊所有紧急建议时，只有经过培训的负责人才能改变优先顺序。",
          "Quy trình mới yêu cầu hai người xác nhận riêng trước khi đi: một người kiểm tra tin mới, một người gọi đầu mối tại tòa nhà. Nếu thông tin khác nhau, nhiệm vụ được đánh dấu “cần đánh giá lại”, không tự hủy. Chỉ người đã tập huấn mới được đổi ưu tiên khi phòng khám có khuyến nghị khẩn.",
        ),
        paragraph(
          "三晚以后，重复送水减少了，但再次确认平均多花了七分钟。负责人认为这七分钟不能简单算作浪费，因为它也减少了敲错门和公开健康信息的风险。下一轮还要记录真正延误的紧急任务，才能判断流程是否需要缩短。",
          "Sau ba đêm, giao nước trùng giảm nhưng xác nhận lại tốn thêm trung bình bảy phút. Người phụ trách cho rằng không thể xem bảy phút là lãng phí vì nó giảm gõ nhầm cửa và lộ thông tin sức khỏe. Đợt sau phải ghi nhiệm vụ khẩn thực sự bị chậm mới quyết định có rút quy trình hay không.",
        ),
      ],
      [
        claim(
          "夜间名单需要双重确认，并把速度与隐私、送错风险一起评估。",
          "Danh sách ban đêm cần xác nhận kép và phải đánh giá tốc độ cùng rủi ro riêng tư, giao nhầm.",
          [1, 2, 3],
          "Nguồn mô tả lý do danh sách cũ sai, quy trình xác nhận và cách cân nhắc chi phí thời gian.",
        ),
        claim(
          "新流程平均多用七分钟，同时减少了重复送水。",
          "Quy trình mới tốn thêm trung bình bảy phút và đồng thời giảm giao nước trùng.",
          [3],
          "Hai kết quả này được nêu trực tiếp ở đoạn ba.",
        ),
        claim(
          "确认时间增加并不能单独证明紧急帮助变慢。",
          "Thời gian xác nhận tăng không tự nó chứng minh hỗ trợ khẩn cấp chậm đi.",
          [3],
          "Nguồn nói cần ghi riêng các nhiệm vụ khẩn thực sự bị chậm.",
        ),
        claim(
          "任何志愿者都可以根据个人判断公开健康资料并改变优先顺序。",
          "Mọi tình nguyện viên đều có thể tự công khai dữ liệu sức khỏe và đổi ưu tiên.",
          [],
          "Nguồn quy định người được đào tạo mới đổi ưu tiên và xem lộ thông tin là rủi ro.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "协调",
        "面对送水、买药和诊所转接，负责人先____各组的任务。",
        ["协调", "取消", "忽略", "扩大"],
        0,
        "reading",
        [1, 2],
        "“协调” phù hợp với việc sắp xếp nhiệm vụ giữa nhiều nhóm.",
      ),
      vocabularyDraft(
        "遗漏",
        "新的记录方式希望减少高风险居民被____的情况。",
        ["误会", "遗漏", "赞成", "邀请"],
        1,
        "reading",
        [3],
        "“遗漏” diễn đạt đúng nguy cơ một trường hợp không được đưa vào xử lý.",
      ),
      vocabularyDraft(
        "优先",
        "只有受过培训的负责人才能改变任务的____顺序。",
        ["丰富", "平均", "优先", "熟悉"],
        2,
        "listening",
        [2],
        "“优先顺序” là kết hợp cố định phù hợp với ngữ cảnh xử lý khẩn.",
      ),
    ],
    grammar: [
      grammarDraft(
        "即使……也……",
        "____居民已经接通电话，工作人员____要确认帮助是否完成。",
        [
          "即使……也……",
          "因为……所以……",
          "不但……而且……",
          "与其……不如……",
        ],
        0,
        "reading",
        [2, 3],
        "Cấu trúc nhượng bộ thể hiện bắt máy vẫn chưa đủ để kết thúc theo dõi.",
      ),
      grammarDraft(
        "只有……才……",
        "____经过培训的负责人，____能改变紧急任务的顺序。",
        ["虽然……但是……", "只有……才……", "一边……一边……", "既……又……"],
        1,
        "listening",
        [2],
        "Cấu trúc điều kiện cần khớp quy định về người có quyền đổi ưu tiên.",
      ),
      grammarDraft(
        "并不等于",
        "电话接通____问题已经得到解决。",
        ["从而", "反而", "并不等于", "尤其"],
        2,
        "reading",
        [2],
        "“并不等于” giữ đúng ranh giới giữa tín hiệu phản hồi và kết quả hỗ trợ.",
      ),
    ],
  },
  {
    formId: FORM_IDS[0],
    domainKey: "education-work",
    decisionVi:
      "cách đánh giá chương trình cố vấn cho nhân viên mới thay vì chỉ đếm số buổi gặp",
    counterclaimVi:
      "Càng tổ chức nhiều buổi cố vấn thì nhân viên mới chắc chắn càng làm việc tốt.",
    scopeBoundaryVi:
      "Dữ liệu của một công ty và một quý không chứng minh cùng mô hình phù hợp mọi ngành hay mọi nhân viên.",
    reading: textDraft(
      "新员工导师制该看什么",
      "Chương trình cố vấn nhân viên mới nên đo điều gì",
      [
        paragraph(
          "一家物流公司为六十名新员工安排了三个月的导师制。过去，公司只记录每对师徒见了几次面，见面四次以上就算“完成”。人力部门后来发现，有些见面只是签字，没有讨论真实任务；也有人只见两次，却解决了关键的安全问题。",
          "Một công ty logistics tổ chức chương trình cố vấn ba tháng cho 60 nhân viên mới. Trước đây công ty chỉ đếm số lần gặp và xem bốn lần là “hoàn thành”. Bộ phận nhân sự nhận ra có buổi chỉ ký tên mà không bàn việc thật, trong khi có người chỉ gặp hai lần nhưng giải quyết được vấn đề an toàn quan trọng.",
        ),
        paragraph(
          "新方案把目标分成三类：理解流程、独立处理常见问题、知道何时求助。每次交流后，新员工要写一个遇到的情况和下一步，导师则说明自己提供了什么支持。主管不能看个人日记，只能看去掉姓名后的共同困难。",
          "Phương án mới chia mục tiêu thành hiểu quy trình, tự xử lý vấn đề thường gặp và biết khi nào cần trợ giúp. Sau mỗi lần trao đổi, nhân viên mới ghi một tình huống và bước tiếp theo; cố vấn ghi hỗ trợ đã cung cấp. Quản lý chỉ xem khó khăn chung đã bỏ tên, không xem nhật ký cá nhân.",
        ),
        paragraph(
          "一个季度后，求助时间缩短，安全错误也减少，但样本来自两个工作组，而且最忙的月份还没开始。公司决定保留见面次数，却不再把它当成唯一结果，并在下季度比较不同班次是否得到同样支持。",
          "Sau một quý, thời gian tìm trợ giúp ngắn hơn và lỗi an toàn giảm, nhưng mẫu chỉ từ hai nhóm và chưa qua tháng bận nhất. Công ty vẫn giữ số buổi gặp nhưng không xem đó là kết quả duy nhất, đồng thời sẽ so sánh mức hỗ trợ giữa các ca ở quý sau.",
        ),
      ],
      [
        claim(
          "导师制应按能力和求助结果评估，见面次数只能作为一个过程指标。",
          "Chương trình cố vấn nên được đánh giá theo năng lực và kết quả tìm trợ giúp; số buổi gặp chỉ là chỉ số quy trình.",
          [1, 2, 3],
          "Các đoạn đối chiếu cách đếm cũ với mục tiêu năng lực và kết luận thận trọng.",
        ),
        claim(
          "新方案要求员工记录真实情况和下一步，同时保护个人日记。",
          "Phương án mới yêu cầu ghi tình huống thật và bước tiếp theo, đồng thời bảo vệ nhật ký cá nhân.",
          [2],
          "Cả yêu cầu phản tư lẫn giới hạn quyền xem đều nằm ở đoạn hai.",
        ),
        claim(
          "同样的见面次数可能对应不同质量的支持。",
          "Cùng số buổi gặp có thể tương ứng với chất lượng hỗ trợ khác nhau.",
          [1, 2],
          "Nguồn nêu buổi ký tên hình thức và buổi ít nhưng giải quyết vấn đề quan trọng.",
        ),
        claim(
          "三个月的数据已经证明导师制适用于所有行业和所有班次。",
          "Dữ liệu ba tháng đã chứng minh chương trình phù hợp mọi ngành và mọi ca.",
          [],
          "Nguồn chỉ nói một công ty, hai nhóm và còn phải kiểm tra khác biệt giữa ca.",
        ),
      ],
    ),
    listening: textDraft(
      "夜班微课为何换了安排",
      "Vì sao khóa học ngắn ca đêm đổi lịch",
      [
        paragraph(
          "仓库原来把十分钟安全微课放在夜班开始前。签到率有百分之九十，可不少员工为了赶交接只打开视频，没有完成最后的情境判断。培训组因此怀疑，高签到率并没有表示大家真正理解了危险信号。",
          "Kho tổ chức bài học an toàn 10 phút trước ca đêm. Tỷ lệ điểm danh 90%, nhưng nhiều người chỉ mở video để kịp bàn giao và không làm bài phán đoán tình huống cuối. Nhóm đào tạo nghi ngờ tỷ lệ điểm danh cao không có nghĩa mọi người hiểu tín hiệu nguy hiểm.",
        ),
        paragraph(
          "第二个月，两个班组改在工作一小时后学习，并由组长用当天的一个例子提问。完成判断题的人变多了，但机器最忙时暂停学习也造成了压力。另一班继续使用原时间，作为比较，不过两班承担的订单并不完全相同。",
          "Tháng hai, hai nhóm học sau khi làm một giờ và trưởng nhóm hỏi bằng ví dụ trong ngày. Nhiều người hoàn thành bài phán đoán hơn, nhưng dừng học lúc máy bận gây áp lực. Một nhóm giữ giờ cũ để so sánh, song lượng đơn hai bên không hoàn toàn giống nhau.",
        ),
        paragraph(
          "培训组没有马上宣布新时间更好，而是准备同时记录完成率、错误类型和生产中断。员工还可以匿名说明哪个时间最难集中。只有把学习效果和工作负担放在一起，安排才可能长期执行。",
          "Nhóm đào tạo chưa tuyên bố giờ mới tốt hơn; họ sẽ cùng ghi tỷ lệ hoàn thành, loại lỗi và gián đoạn sản xuất. Nhân viên được phản hồi ẩn danh về thời điểm khó tập trung. Chỉ khi đặt hiệu quả học cạnh gánh nặng công việc thì lịch mới có thể duy trì.",
        ),
      ],
      [
        claim(
          "调整微课时间要同时考察学习完成、错误和工作中断，不能只看签到。",
          "Điều chỉnh giờ học phải cùng xem mức hoàn thành, lỗi và gián đoạn công việc, không chỉ điểm danh.",
          [1, 2, 3],
          "Nguồn đi từ giới hạn của điểm danh tới thử nghiệm và bộ chỉ số mới.",
        ),
        claim(
          "改到工作一小时后，完成情境判断的人增加了。",
          "Khi chuyển sang sau một giờ làm, số người hoàn thành phán đoán tình huống tăng.",
          [2],
          "Đây là kết quả trực tiếp của tháng thử nghiệm thứ hai.",
        ),
        claim(
          "订单差异可能影响两个班组的比较。",
          "Khác biệt lượng đơn có thể ảnh hưởng việc so sánh hai nhóm.",
          [2],
          "Nguồn cảnh báo hai nhóm không chịu cùng lượng công việc.",
        ),
        claim(
          "新的学习时间已经被证明在任何仓库都不会影响生产。",
          "Giờ học mới đã được chứng minh không ảnh hưởng sản xuất ở mọi kho.",
          [],
          "Nguồn ghi nhận áp lực và đang tiếp tục đo gián đoạn, nên kết luận này vượt dữ liệu.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "反馈",
        "员工可以匿名____哪个时间最难集中注意力。",
        ["承担", "反馈", "取消", "证明"],
        1,
        "listening",
        [3],
        "“反馈” phù hợp hành động cung cấp ý kiến ngược lại cho nhóm đào tạo.",
      ),
      vocabularyDraft(
        "承担",
        "两个班组____的订单数量并不完全相同。",
        ["适应", "缩短", "承担", "保护"],
        2,
        "listening",
        [2],
        "“承担订单” diễn đạt phần công việc mà mỗi nhóm phải chịu trách nhiệm.",
      ),
      vocabularyDraft(
        "独立",
        "导师制的一个目标是让新员工能____处理常见问题。",
        ["独立", "偶然", "临时", "共同"],
        0,
        "reading",
        [2],
        "“独立处理” khớp mục tiêu năng lực được nêu trong nguồn.",
      ),
    ],
    grammar: [
      grammarDraft(
        "与其……不如……",
        "____只统计见面次数，____检查员工是否能处理真实问题。",
        ["不但……而且……", "与其……不如……", "如果……就……", "因为……所以……"],
        1,
        "reading",
        [1, 2],
        "Cấu trúc lựa chọn nhấn mạnh chuyển từ chỉ số hình thức sang năng lực.",
      ),
      grammarDraft(
        "不但……而且……",
        "新指标____记录完成率，____区分错误类型和生产中断。",
        ["只要……就……", "即使……也……", "不但……而且……", "除非……否则……"],
        2,
        "listening",
        [3],
        "Cặp liên từ bổ sung phù hợp với nhiều chỉ số cùng được ghi.",
      ),
      grammarDraft(
        "不能只……",
        "评价培训效果____看签到率。",
        ["不能只", "不得不", "来不及", "差一点"],
        0,
        "listening",
        [1, 3],
        "“不能只” thể hiện đúng giới hạn của một chỉ số duy nhất.",
      ),
    ],
  },
  {
    formId: FORM_IDS[0],
    domainKey: "nature-technology",
    decisionVi:
      "cách dùng cảm biến để tưới vườn mái nhà mà vẫn kiểm tra dữ liệu và điều kiện thực tế",
    counterclaimVi:
      "Có cảm biến thì hệ thống tưới tự động luôn chính xác và không cần con người kiểm tra.",
    scopeBoundaryVi:
      "Kết quả ở một mái nhà trong mùa xuân không chứng minh thiết bị hoạt động giống nhau ở mọi khí hậu hay với mọi loại cây.",
    reading: textDraft(
      "屋顶菜园的传感器会不会骗人",
      "Cảm biến vườn mái nhà có thể đánh lừa không",
      [
        paragraph(
          "一所学校在屋顶菜园安装了十二个湿度传感器，希望按土壤情况自动浇水。系统上线后，用水量下降了约四分之一，学生也能在网页上看到每天的变化。老师起初认为，只要数字低于标准，就可以直接启动水泵。",
          "Một trường lắp 12 cảm biến độ ẩm ở vườn mái nhà để tưới theo tình trạng đất. Sau khi vận hành, lượng nước giảm khoảng một phần tư và học sinh xem được thay đổi hằng ngày. Ban đầu giáo viên nghĩ chỉ cần số thấp hơn chuẩn là bật bơm.",
        ),
        paragraph(
          "两周后，靠墙的三个传感器连续报告“缺水”，可是那里的叶子反而发黄。检查发现，墙面下午升温，使探头附近变干，而花盆下层仍然很湿。若只按一个位置浇水，植物根部可能长期泡在水里。",
          "Hai tuần sau, ba cảm biến gần tường liên tục báo thiếu nước nhưng lá ở đó lại vàng. Kiểm tra cho thấy tường nóng buổi chiều làm vùng gần đầu dò khô trong khi đáy chậu còn ướt. Nếu chỉ tưới theo một vị trí, rễ có thể ngâm nước lâu.",
        ),
        paragraph(
          "项目组随后把传感器数字、叶子状态和人工抽查放在同一张记录表上，并为靠墙区域设置不同标准。节水结果仍然存在，但负责人只把它称为春季试行结果；夏季温度更高时，还要重新检查标准。",
          "Nhóm dự án đưa số cảm biến, tình trạng lá và kiểm tra thủ công vào cùng bảng, đồng thời đặt chuẩn khác cho vùng gần tường. Kết quả tiết kiệm nước vẫn còn, nhưng chỉ được gọi là thử nghiệm mùa xuân; mùa hè nóng hơn cần kiểm tra lại chuẩn.",
        ),
      ],
      [
        claim(
          "传感器能帮助节水，但自动决定必须结合位置、植物状态和人工检查。",
          "Cảm biến giúp tiết kiệm nước nhưng quyết định tự động phải kết hợp vị trí, tình trạng cây và kiểm tra thủ công.",
          [1, 2, 3],
          "Ba đoạn nêu lợi ích, lỗi do vị trí và cách kiểm chứng đa nguồn.",
        ),
        claim(
          "靠墙的探头附近变干时，花盆下层仍可能很湿。",
          "Khi vùng gần đầu dò sát tường khô, đáy chậu vẫn có thể rất ướt.",
          [2],
          "Chi tiết này giải thích vì sao một số đo có thể gây tưới quá mức.",
        ),
        claim(
          "同一湿度标准不一定适合屋顶的所有位置。",
          "Cùng một chuẩn độ ẩm chưa chắc phù hợp mọi vị trí trên mái.",
          [2, 3],
          "Nhóm dự án đã đặt chuẩn riêng cho vùng gần tường sau khi phát hiện sai lệch.",
        ),
        claim(
          "春季节水四分之一证明传感器在所有季节都完全准确。",
          "Tiết kiệm một phần tư vào mùa xuân chứng minh cảm biến hoàn toàn chính xác mọi mùa.",
          [],
          "Nguồn yêu cầu kiểm tra lại trong mùa hè và không khẳng định độ chính xác tuyệt đối.",
        ),
      ],
    ),
    listening: textDraft(
      "一次停电怎样改变浇水计划",
      "Một lần mất điện thay đổi kế hoạch tưới thế nào",
      [
        paragraph(
          "五月的一次短暂停电让屋顶系统停止上传数据六小时。恢复供电后，网页一次补上许多数字，看起来像土壤突然变湿。值班学生按照旧规则准备停止第二天浇水，但园艺老师先去现场看了花盆。",
          "Một lần mất điện tháng Năm khiến hệ thống ngừng tải dữ liệu sáu giờ. Khi có điện, trang web bổ sung nhiều số cùng lúc, trông như đất đột nhiên ướt. Học sinh trực định ngừng tưới hôm sau theo quy tắc cũ, nhưng giáo viên làm vườn kiểm tra chậu trước.",
        ),
        paragraph(
          "现场有一半花盆表面干燥，另一些仍有水。技术人员解释，补传时间和实际测量时间被网页混在一起，曲线因此容易误读。他们给每个数字增加了“测量时间”和“上传时间”，并在数据中断时发出提醒。",
          "Tại chỗ, nửa số chậu khô mặt, số khác còn nước. Kỹ thuật viên giải thích trang đã trộn thời điểm đo với thời điểm tải bù nên biểu đồ dễ bị đọc sai. Họ thêm “thời gian đo”, “thời gian tải” và cảnh báo khi dữ liệu gián đoạn.",
        ),
        paragraph(
          "修改以后，学生能分清旧数据和新数据，不过项目组还没有比较误读是否真的减少。下一步，他们会记录提醒出现后有多少次人工复查，以及复查是否改变了浇水决定。",
          "Sau sửa đổi, học sinh phân biệt được dữ liệu cũ và mới, nhưng nhóm chưa so sánh việc đọc nhầm có thực sự giảm. Bước tiếp theo là ghi số lần kiểm tra thủ công sau cảnh báo và việc kiểm tra có đổi quyết định tưới hay không.",
        ),
      ],
      [
        claim(
          "解释传感器数据时要区分测量与上传时间，并在中断后人工核对。",
          "Khi giải thích dữ liệu cảm biến phải tách thời điểm đo và tải lên, đồng thời kiểm tra thủ công sau gián đoạn.",
          [1, 2, 3],
          "Nguồn mô tả lỗi thời gian, chỉnh giao diện và kế hoạch đánh giá tác động.",
        ),
        claim(
          "停电后补传的数据让曲线看起来像土壤突然变湿。",
          "Dữ liệu tải bù sau mất điện khiến biểu đồ trông như đất đột nhiên ướt.",
          [1, 2],
          "Đây là hiện tượng trực tiếp dẫn tới nguy cơ quyết định sai.",
        ),
        claim(
          "界面更清楚不等于误读已经实际减少。",
          "Giao diện rõ hơn không đồng nghĩa việc đọc sai đã thực sự giảm.",
          [3],
          "Nhóm vẫn phải đo số lần kiểm tra và thay đổi quyết định.",
        ),
        claim(
          "只要恢复供电，所有补传数字都可以当成最新测量。",
          "Chỉ cần có điện lại thì mọi số tải bù đều có thể xem là phép đo mới nhất.",
          [],
          "Nguồn cho biết chính sự trộn hai mốc thời gian gây hiểu nhầm.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "监测",
        "系统连续____土壤湿度，但仍需要人工抽查。",
        ["监测", "模仿", "庆祝", "申请"],
        0,
        "reading",
        [1, 3],
        "“监测” phù hợp với việc theo dõi một chỉ số liên tục.",
      ),
      vocabularyDraft(
        "调整",
        "项目组根据靠墙区域的温度____了湿度标准。",
        ["误解", "调整", "拒绝", "证明"],
        1,
        "reading",
        [3],
        "“调整标准” diễn đạt việc thay đổi chuẩn theo bằng chứng mới.",
      ),
      vocabularyDraft(
        "中断",
        "网页会在数据上传____时发出提醒。",
        ["丰富", "稳定", "中断", "平均"],
        2,
        "listening",
        [2],
        "“中断” khớp trạng thái dữ liệu tạm ngừng do mất điện.",
      ),
    ],
    grammar: [
      grammarDraft(
        "根据",
        "项目组____叶子状态和人工抽查来修改标准。",
        ["关于", "根据", "对于", "随着"],
        1,
        "reading",
        [2, 3],
        "“根据” giới thiệu căn cứ dùng để điều chỉnh.",
      ),
      grammarDraft(
        "由于……因此……",
        "____网页混合了两种时间，____曲线容易被误读。",
        ["即使……也……", "由于……因此……", "一边……一边……", "不是……而是……"],
        1,
        "listening",
        [2],
        "Cặp quan hệ nguyên nhân–kết quả khớp lời giải thích kỹ thuật.",
      ),
      grammarDraft(
        "以免",
        "系统在数据中断时提醒学生，____他们把旧数字当成新结果。",
        ["以免", "尽管", "反而", "至于"],
        0,
        "listening",
        [2, 3],
        "“以免” nêu mục đích phòng tránh việc hiểu nhầm dữ liệu.",
      ),
    ],
  },
  {
    formId: FORM_IDS[0],
    domainKey: "society-economy",
    decisionVi:
      "cách đánh giá hệ thống cốc đặt cọc ở chợ đêm theo môi trường, chi phí và khả năng tiếp cận",
    counterclaimVi:
      "Tỷ lệ hoàn cốc cao tự động chứng minh chương trình vừa công bằng vừa có lợi cho môi trường.",
    scopeBoundaryVi:
      "Thử nghiệm sáu cuối tuần ở một chợ chưa đo toàn bộ vòng đời cốc hoặc tác động tới mọi nhóm khách.",
    reading: textDraft(
      "夜市押金杯真的更环保吗",
      "Cốc đặt cọc ở chợ đêm có thực sự xanh hơn không",
      [
        paragraph(
          "东桥夜市用六个周末试行押金杯。顾客买饮料时多付五元，把杯子交回任何回收点就能拿回押金。前三周共借出四千只杯子，归还率达到百分之八十七，地面上的一次性杯明显减少。",
          "Chợ đêm Đông Kiều thử cốc đặt cọc trong sáu cuối tuần. Khách trả thêm 5 tệ và nhận lại khi trả cốc tại bất kỳ điểm thu hồi nào. Ba tuần đầu cho mượn 4.000 cốc, tỷ lệ hoàn 87%, cốc dùng một lần trên mặt đất giảm rõ.",
        ),
        paragraph(
          "不过，清洗中心离夜市十二公里，周六要增加一辆运输车。部分只带手机付款的游客也不知道现金押金怎样退回。摊主担心解释规则占用时间，小摊位则没有地方存放归还的杯子。",
          "Tuy vậy, điểm rửa cách chợ 12 km và thứ Bảy phải thêm một xe vận chuyển. Một số khách chỉ thanh toán bằng điện thoại không biết nhận lại tiền mặt thế nào. Người bán lo mất thời gian giải thích, còn quầy nhỏ thiếu chỗ chứa cốc trả.",
        ),
        paragraph(
          "管理方因此没有只公布归还率，而是增加运输距离、清洗用水、退款等待和不同摊位的成本。下一轮会提供电子退款，并在两个入口设置集中回收点。只有比较完整流程，才能判断减少的垃圾是否大于新增的资源消耗。",
          "Ban quản lý không chỉ công bố tỷ lệ hoàn mà thêm quãng đường vận chuyển, nước rửa, thời gian chờ hoàn tiền và chi phí theo quầy. Đợt sau sẽ hoàn điện tử và đặt điểm thu tập trung ở hai lối vào. Chỉ so toàn quy trình mới biết rác giảm có lớn hơn tài nguyên phát sinh không.",
        ),
      ],
      [
        claim(
          "押金杯的评价要同时计算归还、运输、清洗、退款和摊位负担。",
          "Đánh giá cốc đặt cọc phải cùng tính hoàn trả, vận chuyển, rửa, hoàn tiền và gánh nặng quầy hàng.",
          [1, 2, 3],
          "Nguồn nêu kết quả tích cực rồi bổ sung chi phí bị chỉ số hoàn trả che khuất.",
        ),
        claim(
          "前三周借出四千只杯子，归还率为百分之八十七。",
          "Ba tuần đầu cho mượn 4.000 cốc và tỷ lệ hoàn là 87%.",
          [1],
          "Hai số liệu nằm trực tiếp ở đoạn một.",
        ),
        claim(
          "电子退款可能改善只用手机付款者的体验，但效果仍需验证。",
          "Hoàn tiền điện tử có thể cải thiện trải nghiệm của người chỉ dùng điện thoại, nhưng hiệu quả còn phải kiểm chứng.",
          [2, 3],
          "Vấn đề và giải pháp dự kiến cho phép suy luận có điều kiện, chưa cho kết quả.",
        ),
        claim(
          "归还率较高已经证明押金杯在所有方面都更环保、更公平。",
          "Tỷ lệ hoàn cao đã chứng minh cốc đặt cọc xanh và công bằng hơn ở mọi mặt.",
          [],
          "Nguồn chưa tính đầy đủ vận chuyển, nước rửa và khác biệt tiếp cận.",
        ),
      ],
    ),
    listening: textDraft(
      "小摊主为什么担心电子退款",
      "Vì sao quầy nhỏ lo về hoàn tiền điện tử",
      [
        paragraph(
          "夜市准备增加电子退款后，管理方邀请十二位摊主讨论。大摊位认为顾客不用排队拿现金会更方便，小摊主却担心网络不稳定时，顾客会把退款延迟当成摊位的责任。",
          "Khi chợ định thêm hoàn điện tử, ban quản lý mời 12 người bán thảo luận. Quầy lớn cho rằng khách khỏi xếp hàng nhận tiền mặt, nhưng quầy nhỏ lo khi mạng yếu, khách sẽ quy trách nhiệm hoàn chậm cho họ.",
        ),
        paragraph(
          "技术公司建议所有退款由中央账户处理，摊位只扫描杯子。试验当天，平均操作时间从四十秒降到二十五秒，可是有九笔退款晚了十多分钟。工作人员最后都处理成功，但没有记录顾客是否因此放弃继续购买。",
          "Công ty kỹ thuật đề xuất tài khoản trung tâm xử lý, quầy chỉ quét cốc. Ngày thử, thao tác trung bình giảm từ 40 xuống 25 giây, nhưng 9 khoản hoàn chậm hơn 10 phút. Tất cả được xử lý, song không ghi khách có bỏ mua tiếp hay không.",
        ),
        paragraph(
          "管理方决定在应用里明确显示“已扫描、处理中、已退款”三个状态，并设人工服务台。下次评估除了速度，还要比较错误、投诉和小摊位花在解释上的时间。一次顺利完成技术流程，并不表示商业关系没有受到影响。",
          "Ban quản lý quyết định hiển thị ba trạng thái “đã quét, đang xử lý, đã hoàn” và có quầy hỗ trợ. Lần sau ngoài tốc độ còn so lỗi, khiếu nại và thời gian quầy nhỏ giải thích. Quy trình kỹ thuật hoàn tất không có nghĩa quan hệ kinh doanh không bị ảnh hưởng.",
        ),
      ],
      [
        claim(
          "电子退款应同时评估处理速度、延迟、投诉和小摊位的解释成本。",
          "Hoàn tiền điện tử phải cùng đánh giá tốc độ, trì hoãn, khiếu nại và chi phí giải thích của quầy nhỏ.",
          [1, 2, 3],
          "Nguồn đối chiếu tiện lợi với rủi ro và xác định bộ chỉ số rộng hơn.",
        ),
        claim(
          "试验中平均操作时间缩短了十五秒，但有九笔退款明显延迟。",
          "Trong thử nghiệm, thao tác trung bình ngắn hơn 15 giây nhưng có 9 khoản hoàn chậm đáng kể.",
          [2],
          "Đây là hai kết quả trực tiếp và trái chiều.",
        ),
        claim(
          "退款最终成功不代表顾客信任或后续购买完全没有变化。",
          "Hoàn tiền cuối cùng thành công không có nghĩa niềm tin hoặc mua tiếp không thay đổi.",
          [2, 3],
          "Nguồn thiếu dữ liệu mua tiếp và cảnh báo quan hệ kinh doanh có thể bị tác động.",
        ),
        claim(
          "中央账户可以保证任何网络条件下都立即退款。",
          "Tài khoản trung tâm bảo đảm hoàn ngay trong mọi điều kiện mạng.",
          [],
          "Thử nghiệm vẫn có chín giao dịch chậm hơn mười phút.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "押金",
        "顾客归还杯子后可以拿回五元____。",
        ["押金", "工资", "奖金", "学费"],
        0,
        "reading",
        [1],
        "“押金” là khoản trả trước được hoàn khi trả vật dụng.",
      ),
      vocabularyDraft(
        "成本",
        "评估要比较运输、清洗和不同摊位的____。",
        ["态度", "成本", "风景", "传统"],
        1,
        "reading",
        [2, 3],
        "“成本” bao quát nguồn lực và thời gian phát sinh.",
      ),
      vocabularyDraft(
        "延迟",
        "网络不稳定可能造成退款____。",
        ["丰富", "延迟", "公平", "集中"],
        1,
        "listening",
        [1, 2],
        "“延迟” diễn đạt việc hoàn tiền xảy ra muộn hơn dự kiến.",
      ),
    ],
    grammar: [
      grammarDraft(
        "一方面……另一方面……",
        "电子退款____减少现金排队，____可能带来网络延迟。",
        ["因为……所以……", "一方面……另一方面……", "只要……就……", "除了……还……"],
        1,
        "listening",
        [1, 2],
        "Cặp cấu trúc trình bày hai mặt của cùng phương án.",
      ),
      grammarDraft(
        "除了……还……",
        "评估____要看归还速度，____要看清洗和运输成本。",
        ["虽然……但是……", "即使……也……", "除了……还……", "不是……而是……"],
        2,
        "reading",
        [3],
        "Cấu trúc bổ sung phù hợp yêu cầu nhiều chỉ số.",
      ),
      grammarDraft(
        "未必",
        "归还率高____表示整个流程更环保。",
        ["难免", "未必", "逐渐", "互相"],
        1,
        "reading",
        [2, 3],
        "“未必” giữ kết luận ở mức chưa chắc khi còn thiếu chi phí vòng đời.",
      ),
    ],
  },
  {
    formId: FORM_IDS[0],
    domainKey: "arts-sports",
    decisionVi:
      "cách cải thiện hướng dẫn song ngữ trong bảo tàng mà không làm mọi khách đi theo một lộ trình",
    counterclaimVi:
      "Số lượt mở bản hướng dẫn tăng là đủ để chứng minh mọi nhóm khách hiểu triển lãm tốt hơn.",
    scopeBoundaryVi:
      "Số liệu từ một triển lãm sáu tuần không đại diện cho mọi bảo tàng, ngôn ngữ hoặc kiểu khách tham quan.",
    reading: textDraft(
      "双语导览为什么改变参观路线",
      "Vì sao hướng dẫn song ngữ làm thay đổi lộ trình tham quan",
      [
        paragraph(
          "市美术馆为一场摄影展制作了中英双语语音导览。入口二维码被扫描了六千多次，比旧展览高一倍。策展人原以为，使用次数增加就表示更多观众完整理解了展览的历史顺序。",
          "Bảo tàng mỹ thuật làm hướng dẫn âm thanh Trung–Anh cho triển lãm ảnh. Mã ở cửa được quét hơn 6.000 lần, gấp đôi triển lãm cũ. Giám tuyển ban đầu nghĩ số lượt dùng tăng nghĩa nhiều khách hiểu trọn thứ tự lịch sử.",
        ),
        paragraph(
          "路线记录却显示，许多观众听完前三段后直接去了最后一厅，因为应用把“推荐作品”放在屏幕最上面。带孩子的家庭更常跳过七分钟以上的说明，外国游客则反复播放地名和年代。不同选择不一定是理解失败，也可能反映时间和语言需要。",
          "Dữ liệu lộ trình cho thấy nhiều khách nghe ba đoạn đầu rồi đi thẳng phòng cuối vì ứng dụng đặt “tác phẩm đề xuất” ở đầu màn hình. Gia đình có trẻ thường bỏ phần trên bảy phút, còn khách nước ngoài nghe lại địa danh và niên đại. Lựa chọn khác không nhất thiết là thất bại mà có thể do thời gian, ngôn ngữ.",
        ),
        paragraph(
          "美术馆后来增加“按年代”“按主题”和“二十分钟短线”三种入口，并请观众回答一个开放问题，而不是只点满意或不满意。下一步要比较回答内容和实际停留位置，才能知道导览是否帮助观众建立自己的解释。",
          "Bảo tàng thêm ba lối “theo niên đại”, “theo chủ đề”, “tuyến 20 phút” và hỏi câu mở thay vì chỉ hài lòng/không hài lòng. Bước sau phải so nội dung trả lời với vị trí dừng thực tế mới biết hướng dẫn có giúp khách xây dựng cách hiểu riêng không.",
        ),
      ],
      [
        claim(
          "导览效果要结合使用、路线和观众解释来判断，并允许不同参观需要。",
          "Hiệu quả hướng dẫn phải kết hợp mức dùng, lộ trình và cách giải thích của khách, đồng thời cho phép nhu cầu tham quan khác nhau.",
          [1, 2, 3],
          "Nguồn bác bỏ một chỉ số, giải thích khác biệt hành vi và đưa cách đánh giá mới.",
        ),
        claim(
          "带孩子的家庭更常跳过七分钟以上的说明。",
          "Gia đình có trẻ thường bỏ qua phần thuyết minh dài trên bảy phút.",
          [2],
          "Đây là khác biệt hành vi được nêu trực tiếp.",
        ),
        claim(
          "提供多种路线可能比强迫所有人按年代参观更符合不同需要。",
          "Cung cấp nhiều lộ trình có thể phù hợp nhu cầu hơn việc buộc mọi người đi theo niên đại.",
          [2, 3],
          "Nguồn nêu nhu cầu khác nhau và việc bổ sung ba lựa chọn lộ trình.",
        ),
        claim(
          "二维码扫描增加已经证明所有观众都完整理解了摄影史。",
          "Lượt quét mã tăng đã chứng minh mọi khách hiểu trọn lịch sử nhiếp ảnh.",
          [],
          "Nguồn cho thấy lộ trình và nhu cầu khác nhau, đồng thời vẫn đang đánh giá cách hiểu.",
        ),
      ],
    ),
    listening: textDraft(
      "剧场字幕该放在哪里",
      "Phụ đề trong nhà hát nên đặt ở đâu",
      [
        paragraph(
          "一家小剧场为方言戏增加了普通话字幕。第一次演出把字幕投在舞台正上方，听力不便的观众说内容更容易理解，可坐在前排的人需要不断抬头，错过了演员的表情。",
          "Một nhà hát nhỏ thêm phụ đề phổ thông cho kịch phương ngữ. Lần đầu chiếu trên sân khấu; khán giả khó nghe hiểu nội dung hơn, nhưng người ngồi hàng trước phải ngẩng liên tục và bỏ lỡ biểu cảm diễn viên.",
        ),
        paragraph(
          "第二次演出在舞台两侧各放一块较小屏幕，并把长句改成两行。调查中，更多观众表示阅读轻松，但右侧屏幕有三次比演员慢了两秒。负责字幕的学生解释，方言中的临时笑话很难提前写好。",
          "Lần hai đặt hai màn nhỏ hai bên và chia câu dài thành hai dòng. Nhiều khách thấy dễ đọc hơn, nhưng màn phải ba lần chậm hơn diễn viên hai giây. Sinh viên phụ trách giải thích chuyện cười ứng biến bằng phương ngữ khó soạn trước.",
        ),
        paragraph(
          "剧场决定保留两侧屏幕，同时给字幕员增加排练时间，并记录延迟出现在哪类台词。导演没有承诺字幕完全同步，因为即兴表演本来就会变化。评价标准将包括可读性、表演注意力和延迟，而不是只问“有没有字幕”。",
          "Nhà hát giữ màn hai bên, tăng thời gian tập cho người làm phụ đề và ghi loại lời thoại bị trễ. Đạo diễn không hứa đồng bộ tuyệt đối vì diễn ứng biến vốn thay đổi. Đánh giá sẽ gồm khả năng đọc, chú ý vào biểu diễn và độ trễ, không chỉ hỏi “có phụ đề không”.",
        ),
      ],
      [
        claim(
          "字幕设计要平衡可读性、观看表演和即兴台词造成的延迟。",
          "Thiết kế phụ đề phải cân bằng khả năng đọc, theo dõi biểu diễn và độ trễ do lời ứng biến.",
          [1, 2, 3],
          "Ba đoạn mô tả xung đột vị trí, thử nghiệm và tiêu chí đánh giá.",
        ),
        claim(
          "两侧屏幕更容易阅读，但右侧屏幕曾三次慢两秒。",
          "Màn hai bên dễ đọc hơn nhưng màn phải từng ba lần chậm hai giây.",
          [2],
          "Đoạn hai nêu đồng thời cải thiện và lỗi còn lại.",
        ),
        claim(
          "字幕是否成功不能只由“存在”这一项决定。",
          "Không thể đánh giá phụ đề thành công chỉ bằng việc nó có tồn tại.",
          [1, 3],
          "Nguồn chỉ ra phụ đề có thể làm mất chú ý và cần đo nhiều tiêu chí.",
        ),
        claim(
          "增加排练时间可以保证所有即兴台词永远同步。",
          "Tăng thời gian tập có thể bảo đảm mọi lời ứng biến luôn đồng bộ.",
          [],
          "Đạo diễn chủ động không hứa đồng bộ tuyệt đối vì nội dung ứng biến thay đổi.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "导览",
        "美术馆提供三种____路线，让观众按需要选择。",
        ["导览", "比赛", "运输", "治疗"],
        0,
        "reading",
        [1, 3],
        "“导览路线” chỉ tuyến hướng dẫn tham quan trong bảo tàng.",
      ),
      vocabularyDraft(
        "观众",
        "前排____需要抬头看舞台上方的字幕。",
        ["演员", "观众", "司机", "顾客"],
        1,
        "listening",
        [1],
        "Người ngồi xem biểu diễn là “观众”.",
      ),
      vocabularyDraft(
        "保留",
        "剧场决定____两侧屏幕，同时继续改进同步。",
        ["取消", "误解", "保留", "拒绝"],
        2,
        "listening",
        [3],
        "“保留” phù hợp quyết định tiếp tục dùng một giải pháp.",
      ),
    ],
    grammar: [
      grammarDraft(
        "与……相比",
        "____只按年代参观____，多种路线给观众更多选择。",
        ["被……所……", "与……相比", "由于……因此……", "不管……都……"],
        1,
        "reading",
        [2, 3],
        "Cấu trúc so sánh làm rõ lợi ích của nhiều tuyến.",
      ),
      grammarDraft(
        "既……又……",
        "字幕设计____要容易阅读，____要让观众看见演员表情。",
        ["既……又……", "如果……就……", "虽然……但是……", "只有……才……"],
        0,
        "listening",
        [1, 3],
        "Cặp liên từ nối hai yêu cầu cần đồng thời thỏa mãn.",
      ),
      grammarDraft(
        "不是……而是……",
        "不同路线____一定表示理解失败，____可能反映时间和语言需要。",
        ["一边……一边……", "不是……而是……", "除了……还……", "因为……所以……"],
        1,
        "reading",
        [2],
        "Cấu trúc sửa cách diễn giải quá đơn giản bằng một khả năng hợp lý hơn.",
      ),
    ],
  },
  {
    formId: FORM_IDS[0],
    domainKey: "culture-history",
    decisionVi:
      "cách số hóa lịch sử truyền miệng trong khi giữ sự đồng ý, bối cảnh và quyền thay đổi quyết định của người kể",
    counterclaimVi:
      "Càng công khai nhiều bản ghi thì dự án lịch sử truyền miệng càng thành công.",
    scopeBoundaryVi:
      "Mười hai cuộc phỏng vấn của một làng không thể đại diện cho toàn vùng, và sự đồng ý ở một thời điểm không mặc nhiên kéo dài mãi mãi.",
    reading: textDraft(
      "口述历史上传以后属于谁",
      "Lịch sử truyền miệng thuộc về ai sau khi tải lên",
      [
        paragraph(
          "山口村的青年小组采访了十二位老人，记录旧码头和搬迁前的生活。最初的同意书只有“可以保存录音”一句话，没有说明录音会不会放到公开网站，也没有区分姓名、照片和声音。",
          "Nhóm thanh niên làng Sơn Khẩu phỏng vấn 12 người cao tuổi về bến tàu cũ và cuộc sống trước di dời. Phiếu đồng ý ban đầu chỉ ghi “có thể lưu âm”, không nói có đưa lên web công khai hay tách tên, ảnh, giọng nói.",
        ),
        paragraph(
          "准备上线时，两位讲述者希望隐藏姓名，一位要求删掉涉及邻居家庭的片段。小组没有把这些变化看成反对历史保护，而是重新设计了三种授权：只供村内学习、可公开节选、可公开完整录音。讲述者每年都能修改选择。",
          "Khi chuẩn bị đăng, hai người muốn ẩn tên và một người yêu cầu xóa đoạn liên quan gia đình hàng xóm. Nhóm không xem đó là chống bảo tồn mà thiết kế ba quyền: chỉ học trong làng, công khai trích đoạn, công khai toàn bộ. Người kể được đổi lựa chọn hằng năm.",
        ),
        paragraph(
          "网站还在每段录音旁标明采访日期、剪辑者和无法确认的记忆细节。访问量可能说明有人听，却不能证明材料准确或社区同意。项目下一步会记录撤回处理时间，并邀请讲述者检查文字说明。",
          "Trang web ghi ngày phỏng vấn, người biên tập và chi tiết ký ức chưa xác minh cạnh mỗi đoạn. Lượt truy cập cho biết có người nghe nhưng không chứng minh độ chính xác hay đồng thuận cộng đồng. Dự án sẽ ghi thời gian xử lý rút lại và mời người kể kiểm tra chú thích.",
        ),
      ],
      [
        claim(
          "口述历史数字化必须区分保存与公开，并让讲述者持续控制授权和背景说明。",
          "Số hóa lịch sử truyền miệng phải tách lưu giữ với công khai, đồng thời để người kể tiếp tục kiểm soát quyền và bối cảnh.",
          [1, 2, 3],
          "Nguồn nêu lỗ hổng đồng ý, cơ chế quyền mới và yêu cầu minh bạch bối cảnh.",
        ),
        claim(
          "项目设计了村内学习、公开节选和完整公开三种授权。",
          "Dự án thiết kế ba quyền: học trong làng, công khai trích đoạn và công khai toàn bộ.",
          [2],
          "Ba mức quyền được nêu trực tiếp.",
        ),
        claim(
          "访问量增加不能替代对准确性和持续同意的检查。",
          "Lượt truy cập tăng không thay thế kiểm tra độ chính xác và đồng ý liên tục.",
          [2, 3],
          "Nguồn phân biệt có người nghe với dữ liệu đúng hoặc cộng đồng đồng ý.",
        ),
        claim(
          "一次签字意味着项目可以永久公开所有姓名和家庭细节。",
          "Một lần ký nghĩa là dự án được công khai vĩnh viễn mọi tên và chi tiết gia đình.",
          [],
          "Nguồn cho phép thay đổi quyền hằng năm và xóa chi tiết liên quan người khác.",
        ),
      ],
    ),
    listening: textDraft(
      "旧桥说明牌为何留下问号",
      "Vì sao bảng giới thiệu cầu cổ giữ lại dấu hỏi",
      [
        paragraph(
          "地方博物馆为一座旧石桥制作新说明牌。过去的牌子写着“建于一八六零年”，可是工作人员查到的县志只说十九世纪中期，维修账本上的第一个明确日期则是一八六四年。",
          "Bảo tàng địa phương làm bảng mới cho cầu đá cũ. Bảng trước ghi “xây năm 1860”, nhưng huyện chí chỉ nói giữa thế kỷ 19, còn sổ sửa chữa có ngày rõ đầu tiên là 1864.",
        ),
        paragraph(
          "一些居民记得祖辈说桥在大水以前就存在，另一些故事却把它和后来的一位商人联系起来。研究员认为口述记忆能说明桥对社区的重要性，但不能自动解决建造年份。把所有故事合成一个确定答案，反而会隐藏证据差异。",
          "Một số cư dân nhớ tổ tiên nói cầu có trước trận lụt, chuyện khác lại gắn với thương nhân đời sau. Nhà nghiên cứu cho rằng ký ức nói lên ý nghĩa cộng đồng nhưng không tự giải quyết năm xây. Gộp mọi chuyện thành một đáp án chắc chắn sẽ che khác biệt bằng chứng.",
        ),
        paragraph(
          "新牌子因此写“约建于十九世纪中期”，列出县志、账本和口述来源，并在一八六零后保留问号。博物馆还设置二维码，让访客查看证据原文。问号不是研究失败，而是说明目前能确定到什么程度。",
          "Bảng mới ghi “khoảng giữa thế kỷ 19”, liệt kê huyện chí, sổ và nguồn kể, đồng thời giữ dấu hỏi sau 1860. Bảo tàng có mã xem tư liệu gốc. Dấu hỏi không phải thất bại mà cho biết mức chắc chắn hiện có.",
        ),
      ],
      [
        claim(
          "历史说明应公开不同证据及其确定程度，而不是制造一个过度准确的年份。",
          "Thuyết minh lịch sử nên công khai các bằng chứng và mức chắc chắn thay vì tạo một năm quá chính xác.",
          [1, 2, 3],
          "Nguồn so sánh ba loại bằng chứng và giải thích lựa chọn ghi khoảng thời gian.",
        ),
        claim(
          "维修账本最早明确记录的日期是一八六四年。",
          "Ngày rõ sớm nhất trong sổ sửa chữa là năm 1864.",
          [1],
          "Đây là mốc được nói trực tiếp, không đồng nghĩa năm xây.",
        ),
        claim(
          "保留问号可以帮助访客区分事实、记忆和推测。",
          "Giữ dấu hỏi giúp khách phân biệt sự kiện, ký ức và suy đoán.",
          [2, 3],
          "Bảng mới trình bày nguồn và mức chắc chắn thay vì xóa khác biệt.",
        ),
        claim(
          "居民故事已经精确证明石桥建于一八六零年。",
          "Câu chuyện cư dân đã chứng minh chính xác cầu xây năm 1860.",
          [],
          "Nguồn nói ký ức không tự giải quyết năm xây và dữ liệu chỉ cho khoảng thời gian.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "讲述",
        "每位老人都可以决定自己的____是否公开。",
        ["讲述", "交通", "工资", "比赛"],
        0,
        "reading",
        [1, 2],
        "“讲述” chỉ phần lời kể cá nhân được ghi lại.",
      ),
      vocabularyDraft(
        "保存",
        "同意____录音并不等于同意在网上公开。",
        ["批评", "保存", "浪费", "拒绝"],
        1,
        "reading",
        [1],
        "“保存” là lưu giữ, được nguồn phân biệt với công khai.",
      ),
      vocabularyDraft(
        "确定",
        "问号表示目前不能____一个精确年份。",
        ["确定", "庆祝", "缩短", "邀请"],
        0,
        "listening",
        [3],
        "“确定” phù hợp với mức chắc chắn của bằng chứng lịch sử.",
      ),
    ],
    grammar: [
      grammarDraft(
        "在……之前",
        "____把录音放到公开网站____，项目必须重新确认授权。",
        ["除了……以外", "在……之前", "即使……也……", "不是……而是……"],
        1,
        "reading",
        [1, 2],
        "Cấu trúc thời gian đặt việc xác nhận trước hành động công khai.",
      ),
      grammarDraft(
        "不仅……还……",
        "新说明牌____写出大概年代，____列明三类来源。",
        ["只要……就……", "虽然……但是……", "不仅……还……", "一边……一边……"],
        2,
        "listening",
        [3],
        "Cấu trúc bổ sung mô tả hai chức năng cùng có của bảng mới.",
      ),
      grammarDraft(
        "把……看成……",
        "小组没有____修改授权____反对历史保护。",
        ["把……看成……", "被……所……", "由……负责……", "对……来说……"],
        0,
        "reading",
        [2],
        "Cấu trúc nhận định phù hợp với việc dự án không gán sai ý nghĩa cho yêu cầu.",
      ),
    ],
  },
  {
    formId: FORM_IDS[1],
    domainKey: "personal-community",
    decisionVi:
      "cách xây quy tắc giờ yên tĩnh dựa trên dữ liệu nhiều nhóm cư dân thay vì số khiếu nại đơn lẻ",
    counterclaimVi:
      "Số khiếu nại giảm nghĩa là quy tắc giờ yên tĩnh đã công bằng với tất cả cư dân.",
    scopeBoundaryVi:
      "Ba tòa nhà và bốn tuần thử nghiệm không đại diện cho mọi khu ở; người ít khiếu nại chưa chắc ít bị ảnh hưởng.",
    reading: textDraft(
      "安静时间为何不能只靠投诉决定",
      "Vì sao giờ yên tĩnh không thể chỉ dựa vào khiếu nại",
      [
        paragraph(
          "柳园小区收到关于夜间噪音的投诉后，准备把安静时间统一定为晚上十点到早上七点。居民委员会先查看三栋楼的记录，发现投诉主要来自能使用手机应用的人；一些老人和夜班家庭很少在线留言，却在访谈中提出不同困难。",
          "Khu Liễu Viên định đặt giờ yên tĩnh 22h–7h sau khi nhận khiếu nại tiếng ồn. Ủy ban xem ba tòa và thấy phản ánh chủ yếu từ người dùng ứng dụng; một số người cao tuổi và gia đình làm ca đêm ít nhắn trực tuyến nhưng nêu khó khăn khác khi phỏng vấn.",
        ),
        paragraph(
          "试行方案保留十点以后降低音量的原则，同时为接送夜班人员和照顾婴儿设置说明渠道。保安不根据一次报告马上处罚，而是记录时间、声音来源和是否重复。居民还可以选择电话、纸条或应用三种方式反映。",
          "Phương án thử vẫn giảm âm lượng sau 22h nhưng có kênh giải thích cho đưa đón ca đêm và chăm trẻ. Bảo vệ không phạt ngay từ một báo cáo mà ghi thời gian, nguồn âm và lặp lại hay không. Cư dân có thể phản ánh qua điện thoại, giấy hoặc ứng dụng.",
        ),
        paragraph(
          "四周后，应用投诉减少了三成，电话记录却略有增加。委员会没有把两个数字相减后宣布成功，而是检查重复事件和不同群体是否能使用申诉程序。下一轮还要观察考试季和夏季开窗时的情况。",
          "Sau bốn tuần, khiếu nại trên ứng dụng giảm 30% nhưng ghi nhận qua điện thoại tăng nhẹ. Ủy ban không lấy hai số trừ nhau rồi tuyên bố thành công mà kiểm tra sự kiện lặp và khả năng kháng nghị của các nhóm. Đợt sau còn quan sát mùa thi và mùa hè mở cửa sổ.",
        ),
      ],
      [
        claim(
          "安静规则应结合多种报告渠道、事件背景和申诉机会来评估。",
          "Quy tắc yên tĩnh phải được đánh giá bằng nhiều kênh phản ánh, bối cảnh sự kiện và cơ hội kháng nghị.",
          [1, 2, 3],
          "Nguồn chỉ ra thiên lệch kênh, quy trình ghi nhận và cách đọc kết quả.",
        ),
        claim(
          "应用投诉下降三成时，电话记录反而略有增加。",
          "Khi khiếu nại ứng dụng giảm 30%, ghi nhận qua điện thoại lại tăng nhẹ.",
          [3],
          "Hai xu hướng trực tiếp cho thấy không thể đọc một kênh riêng.",
        ),
        claim(
          "报告渠道改变可能影响看起来的投诉数量。",
          "Thay đổi kênh phản ánh có thể ảnh hưởng số khiếu nại nhìn thấy.",
          [1, 3],
          "Các nhóm dùng kênh khác nhau và hai kênh biến động ngược chiều.",
        ),
        claim(
          "应用投诉减少已经证明所有居民都不再受噪音影响。",
          "Khiếu nại ứng dụng giảm đã chứng minh mọi cư dân không còn bị tiếng ồn ảnh hưởng.",
          [],
          "Nguồn ghi điện thoại tăng và còn nhiều bối cảnh chưa quan sát.",
        ),
      ],
    ),
    listening: textDraft(
      "共享厨房的预约表漏掉了谁",
      "Bảng đặt bếp chung đã bỏ sót ai",
      [
        paragraph(
          "小区共享厨房改用网上预约后，空闲时段看起来减少了，管理员便认为使用效率提高。可是清洁人员发现，早晨常有老人直接到厨房做饭，他们不会扫码，因此预约表上没有这些使用记录。",
          "Sau khi bếp chung đặt lịch trực tuyến, thời gian trống có vẻ giảm và quản lý nghĩ hiệu suất tăng. Nhưng nhân viên vệ sinh thấy người cao tuổi thường đến nấu buổi sáng mà không quét mã, nên bảng không có các lượt đó.",
        ),
        paragraph(
          "委员会增加了电话预约和门口登记，并把一个时段分成“准备、做饭、清洁”三部分。两周内，时间冲突减少了，不过登记工作每天多花约二十分钟。有人建议取消纸面记录，认为网上数据更整齐。",
          "Ủy ban thêm đặt qua điện thoại, ghi tại cửa và chia một khung thành chuẩn bị, nấu, dọn. Trong hai tuần, xung đột giờ giảm nhưng việc ghi tốn thêm khoảng 20 phút mỗi ngày. Có người đề nghị bỏ giấy vì dữ liệu mạng gọn hơn.",
        ),
        paragraph(
          "管理员没有立即取消，而是比较哪些人使用不同渠道，以及冲突是否集中在某一阶段。如果纸面记录主要补上网上看不到的使用者，它带来的时间成本就需要和公平使用一起讨论。",
          "Quản lý chưa bỏ ngay mà so ai dùng từng kênh và xung đột tập trung ở giai đoạn nào. Nếu giấy chủ yếu bổ sung người vô hình trên mạng, chi phí thời gian phải được bàn cùng quyền tiếp cận công bằng.",
        ),
      ],
      [
        claim(
          "预约效率要把未上网的使用者、冲突阶段和登记成本一起考虑。",
          "Hiệu quả đặt lịch phải cùng tính người không lên mạng, giai đoạn xung đột và chi phí ghi nhận.",
          [1, 2, 3],
          "Nguồn phát hiện dữ liệu thiếu, thử kênh bổ sung và nêu cân bằng hiệu quả–công bằng.",
        ),
        claim(
          "增加两种登记方式后，冲突减少，但每天多花约二十分钟。",
          "Sau khi thêm hai cách ghi, xung đột giảm nhưng tốn thêm khoảng 20 phút mỗi ngày.",
          [2],
          "Đây là hai kết quả trực tiếp của thử nghiệm.",
        ),
        claim(
          "数据整齐并不表示它已经包含所有实际使用者。",
          "Dữ liệu gọn không có nghĩa đã chứa mọi người dùng thực tế.",
          [1, 3],
          "Người không quét mã bị thiếu dù bảng trực tuyến trông đầy đủ.",
        ),
        claim(
          "取消纸面记录一定会让所有居民更公平地使用厨房。",
          "Bỏ ghi giấy chắc chắn giúp mọi cư dân dùng bếp công bằng hơn.",
          [],
          "Nguồn cho thấy giấy có thể bổ sung nhóm không xuất hiện trên mạng.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "协商",
        "居民委员会先与不同家庭____，再修改安静时间。",
        ["协商", "命令", "拒绝", "隐藏"],
        0,
        "reading",
        [1, 2],
        "“协商” phù hợp quá trình bàn bạc giữa nhiều nhóm lợi ích.",
      ),
      vocabularyDraft(
        "轮流",
        "为了减少冲突，几个家庭可以____使用共享厨房。",
        ["轮流", "突然", "完全", "始终"],
        0,
        "listening",
        [2],
        "“轮流使用” chỉ việc dùng theo lượt.",
      ),
      vocabularyDraft(
        "影响",
        "报告渠道会____看起来的投诉数量。",
        ["庆祝", "影响", "证明", "保护"],
        1,
        "reading",
        [1, 3],
        "“影响” diễn đạt quan hệ tác động nhưng không khẳng định nguyên nhân duy nhất.",
      ),
    ],
    grammar: [
      grammarDraft(
        "虽然……但是……",
        "____应用投诉减少了，____电话记录略有增加。",
        ["虽然……但是……", "只要……就……", "不但……而且……", "由于……因此……"],
        0,
        "reading",
        [3],
        "Cấu trúc tương phản giữ đúng hai xu hướng ngược nhau.",
      ),
      grammarDraft(
        "无论……都……",
        "____居民用电话、纸条还是应用，委员会____要记录事件背景。",
        ["因为……所以……", "无论……都……", "与其……不如……", "除了……还……"],
        1,
        "reading",
        [2],
        "Cấu trúc bao quát nhiều kênh nhưng cùng một yêu cầu ghi nhận.",
      ),
      grammarDraft(
        "不一定",
        "网上数据更整齐，____更完整。",
        ["尤其", "从而", "不一定", "逐渐"],
        2,
        "listening",
        [1, 3],
        "“不一定” thể hiện giới hạn giữa vẻ gọn và độ bao phủ.",
      ),
    ],
  },
  {
    formId: FORM_IDS[1],
    domainKey: "education-work",
    decisionVi:
      "cách phân bổ phòng thí nghiệm kết hợp trực tiếp–từ xa theo chất lượng tham gia và khả năng tiếp cận",
    counterclaimVi:
      "Nhiều lượt đặt chỗ trực tuyến hơn chứng minh mô hình kết hợp có lợi như nhau cho mọi sinh viên.",
    scopeBoundaryVi:
      "Một học kỳ và hai môn học không chứng minh kết quả cho mọi ngành; kết nối mạng và thiết bị cá nhân vẫn khác nhau.",
    reading: textDraft(
      "混合实验室的预约增加了吗",
      "Lượt đặt phòng thí nghiệm kết hợp có thực sự tăng",
      [
        paragraph(
          "一所大学把两间语言实验室改成线上预约，学生可以选择到场练习或远程使用软件。系统显示预约次数比上学期增加了百分之四十，项目组最初把这看成扩大机会的证据。",
          "Một đại học chuyển hai phòng lab ngôn ngữ sang đặt trực tuyến; sinh viên chọn đến phòng hoặc dùng phần mềm từ xa. Hệ thống cho thấy lượt đặt tăng 40% và nhóm dự án ban đầu xem đây là bằng chứng mở rộng cơ hội.",
        ),
        paragraph(
          "进一步检查发现，远程预约中有近四分之一只登录了不到五分钟。有些学生为了保留位置提前预约，后来因宿舍网络不稳而退出；没有个人耳机的学生仍然更依赖到场时段。单看预约，无法区分尝试、完成和有效练习。",
          "Kiểm tra sâu cho thấy gần một phần tư lượt từ xa đăng nhập dưới năm phút. Có sinh viên giữ chỗ trước rồi thoát vì mạng ký túc xá yếu; người không có tai nghe vẫn phụ thuộc giờ tại chỗ. Chỉ nhìn đặt chỗ không phân biệt thử, hoàn thành và luyện hiệu quả.",
        ),
        paragraph(
          "下学期，系统会分别记录进入、完成任务和请求技术帮助，并保留无需网上预约的开放时段。教师只看课程层面的统计，不查看个人录音。项目组还要比较两门课，避免把某位教师的安排当成平台效果。",
          "Học kỳ sau hệ thống ghi riêng truy cập, hoàn thành nhiệm vụ và yêu cầu hỗ trợ kỹ thuật, đồng thời giữ giờ mở không cần đặt mạng. Giáo viên chỉ xem thống kê cấp môn, không xem ghi âm cá nhân. Nhóm sẽ so hai môn để tránh nhầm lịch của một giảng viên thành hiệu ứng nền tảng.",
        ),
      ],
      [
        claim(
          "混合实验室应按实际完成、技术条件和替代入口评估，而非只数预约。",
          "Lab kết hợp phải được đánh giá theo hoàn thành thực tế, điều kiện kỹ thuật và lối thay thế, không chỉ đếm đặt chỗ.",
          [1, 2, 3],
          "Nguồn chỉ ra chỉ số đặt chỗ phóng đại và thiết kế đo mới.",
        ),
        claim(
          "远程预约中近四分之一的登录时间不到五分钟。",
          "Gần một phần tư lượt đặt từ xa đăng nhập dưới năm phút.",
          [2],
          "Đây là số liệu trực tiếp cho thấy đặt chỗ không bằng luyện tập.",
        ),
        claim(
          "保留开放时段可能帮助设备或网络条件较弱的学生。",
          "Giữ giờ mở có thể giúp sinh viên có thiết bị hoặc mạng yếu.",
          [2, 3],
          "Nguồn nêu nhóm phụ thuộc giờ tại chỗ và phương án không cần đặt mạng.",
        ),
        claim(
          "预约增长百分之四十证明每位学生都完成了更多练习。",
          "Đặt chỗ tăng 40% chứng minh mọi sinh viên hoàn thành nhiều bài hơn.",
          [],
          "Nguồn phân biệt đặt chỗ, đăng nhập ngắn và hoàn thành.",
        ),
      ],
    ),
    listening: textDraft(
      "远程实习生为什么少发言",
      "Vì sao thực tập sinh từ xa ít phát biểu",
      [
        paragraph(
          "一家设计公司发现，远程实习生参加周会的比例很高，发言次数却比到办公室的人少。经理起初认为他们准备不足，但匿名调查显示，会议常临时改变议题，远程成员很难提前整理例子。",
          "Một công ty thiết kế thấy thực tập sinh từ xa tham dự họp tuần cao nhưng phát biểu ít hơn người ở văn phòng. Quản lý ban đầu cho rằng họ chuẩn bị kém, nhưng khảo sát ẩn danh cho thấy chủ đề thường đổi phút chót khiến người từ xa khó chuẩn bị ví dụ.",
        ),
        paragraph(
          "试行中，主持人提前一天发出三个问题，并在会议前五分钟开放文字回答。远程成员的发言增加了，会议也长了约八分钟。办公室成员担心讨论变慢，不过他们在会后评价中更常说结论清楚。",
          "Trong thử nghiệm, chủ trì gửi ba câu hỏi trước một ngày và mở trả lời chữ năm phút trước họp. Người từ xa phát biểu nhiều hơn, cuộc họp dài thêm khoảng tám phút. Người tại văn phòng lo chậm nhưng sau họp thường đánh giá kết luận rõ hơn.",
        ),
        paragraph(
          "公司准备继续比较发言、建议被采用的比例和会议时长。经理也承认，发言少可能来自会议设计，而不只是个人能力。由于试行只有四次会议，还不能确定新流程在紧急项目中是否合适。",
          "Công ty sẽ so số phát biểu, tỷ lệ đề xuất được dùng và thời lượng họp. Quản lý thừa nhận nói ít có thể do thiết kế cuộc họp, không chỉ năng lực. Vì thử mới bốn cuộc, chưa biết quy trình có hợp dự án khẩn không.",
        ),
      ],
      [
        claim(
          "评价远程参与要检查会议设计、发言质量和时间成本，不能把沉默直接归因于能力。",
          "Đánh giá tham gia từ xa phải xem thiết kế họp, chất lượng đóng góp và chi phí thời gian, không quy im lặng trực tiếp cho năng lực.",
          [1, 2, 3],
          "Nguồn chuyển từ giả định cá nhân sang thử nghiệm quy trình và đánh giá đa chiều.",
        ),
        claim(
          "提前问题后，远程发言增加，会议平均长了约八分钟。",
          "Sau khi gửi câu hỏi trước, phát biểu từ xa tăng và họp dài thêm khoảng tám phút.",
          [2],
          "Hai thay đổi được nêu trực tiếp.",
        ),
        claim(
          "更长的会议可能换来更清楚的结论，但需要继续比较。",
          "Cuộc họp dài hơn có thể đổi lấy kết luận rõ hơn nhưng cần tiếp tục so sánh.",
          [2, 3],
          "Đánh giá sau họp tích cực hơn nhưng thử nghiệm còn ngắn.",
        ),
        claim(
          "四次会议已经证明新流程适合所有紧急项目。",
          "Bốn cuộc họp đã chứng minh quy trình mới phù hợp mọi dự án khẩn.",
          [],
          "Nguồn nói rõ chưa thể xác định điều này.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "预约",
        "学生可以在网上____到场或远程练习的时段。",
        ["预约", "批评", "修理", "翻译"],
        0,
        "reading",
        [1],
        "“预约时段” chỉ việc đặt trước một khoảng thời gian.",
      ),
      vocabularyDraft(
        "资源",
        "没有耳机或网络不稳的学生需要其他学习____。",
        ["资源", "风景", "传统", "性格"],
        0,
        "reading",
        [2, 3],
        "“学习资源” bao gồm thiết bị và lối tiếp cận thay thế.",
      ),
      vocabularyDraft(
        "参与",
        "发言次数只是衡量远程____的一项指标。",
        ["参与", "运输", "表演", "消费"],
        0,
        "listening",
        [1, 3],
        "“参与” phù hợp mức đóng góp trong cuộc họp.",
      ),
    ],
    grammar: [
      grammarDraft(
        "把……看成……",
        "项目组不能____预约次数____实际完成。",
        ["由……负责……", "把……看成……", "一边……一边……", "与其……不如……"],
        1,
        "reading",
        [1, 2],
        "Cấu trúc nêu việc không được đồng nhất hai khái niệm.",
      ),
      grammarDraft(
        "被",
        "建议____采用的比例也会记录下来。",
        ["把", "被", "对", "从"],
        1,
        "listening",
        [3],
        "“被采用” là cấu trúc bị động tự nhiên cho đề xuất được sử dụng.",
      ),
      grammarDraft(
        "对……来说",
        "____网络不稳的学生____，开放时段尤其重要。",
        ["对……来说", "由于……因此……", "除了……还……", "不管……都……"],
        0,
        "reading",
        [2, 3],
        "Cấu trúc giới thiệu nhóm mà nhận định đặc biệt áp dụng.",
      ),
    ],
  },
  {
    formId: FORM_IDS[1],
    domainKey: "nature-technology",
    decisionVi:
      "cách dùng camera nhận dạng động vật mà không nhầm độ chính xác của máy với bằng chứng sinh thái",
    counterclaimVi:
      "Phần mềm nhận dạng đúng nhiều ảnh thì có thể tự kết luận số lượng động vật đã tăng.",
    scopeBoundaryVi:
      "Ảnh từ một khu bảo tồn, một mùa và vị trí camera cố định không đại diện cho toàn quần thể hay mọi thời điểm.",
    reading: textDraft(
      "自动相机数到的是动物吗",
      "Camera tự động có thực sự đếm động vật",
      [
        paragraph(
          "南岭保护区安装了二十台自动相机，用软件识别夜间经过的动物。第一个月，系统标出一千二百张“野猪”照片，数量比人工记录高很多。管理人员一度以为野猪突然增加。",
          "Khu bảo tồn Nam Lĩnh lắp 20 camera và dùng phần mềm nhận dạng động vật ban đêm. Tháng đầu hệ thống đánh dấu 1.200 ảnh “lợn rừng”, cao hơn ghi thủ công nhiều. Quản lý từng nghĩ số lợn rừng tăng đột ngột.",
        ),
        paragraph(
          "抽查后发现，雨中的树枝和两只反复经过镜头的野猪造成了大量重复。软件判断一张照片是什么，和研究人员判断有多少只动物，是两个不同任务。团队给连续五分钟内的相似照片加上同一事件编号。",
          "Kiểm tra cho thấy cành cây trong mưa và hai con lợn đi qua lặp lại tạo nhiều ảnh trùng. Nhận dạng một ảnh là gì khác với ước lượng có bao nhiêu cá thể. Nhóm gắn cùng mã sự kiện cho ảnh giống nhau trong năm phút.",
        ),
        paragraph(
          "修改后，错误标签减少，但相机仍集中在道路附近，可能更容易拍到喜欢走路的动物。报告因此分别公布识别准确率、独立事件数和相机位置，不把任何一个数字直接写成种群变化。",
          "Sau sửa, nhãn sai giảm nhưng camera vẫn gần đường nên dễ chụp loài thích đi đường. Báo cáo công bố riêng độ chính xác, số sự kiện độc lập và vị trí camera, không biến bất kỳ số nào trực tiếp thành thay đổi quần thể.",
        ),
      ],
      [
        claim(
          "相机识别结果必须去除重复并结合位置，才能用于谨慎的生态解释。",
          "Kết quả camera phải loại trùng và kết hợp vị trí mới dùng cho giải thích sinh thái thận trọng.",
          [1, 2, 3],
          "Nguồn phân biệt nhãn ảnh, sự kiện và suy luận quần thể.",
        ),
        claim(
          "树枝和两只反复出现的野猪造成了许多重复照片。",
          "Cành cây và hai con lợn xuất hiện lặp tạo nhiều ảnh trùng.",
          [2],
          "Đây là nguyên nhân trực tiếp của số ảnh cao.",
        ),
        claim(
          "道路附近的相机可能使某些动物更容易被记录。",
          "Camera gần đường có thể khiến một số loài dễ được ghi hơn.",
          [3],
          "Vị trí không ngẫu nhiên tạo khả năng lệch quan sát.",
        ),
        claim(
          "一千二百张标签已经证明保护区野猪数量突然增加。",
          "1.200 nhãn ảnh đã chứng minh số lợn rừng tăng đột ngột.",
          [],
          "Nguồn cho thấy nhãn sai, ảnh trùng và thiên lệch vị trí.",
        ),
      ],
    ),
    listening: textDraft(
      "河水警报为什么响得太多",
      "Vì sao cảnh báo nước sông kêu quá nhiều",
      [
        paragraph(
          "河边社区安装了水位传感器，超过黄色线就向居民发信息。雨季第一周，警报响了九次，其中六次在十分钟内自动恢复。居民开始忽略信息，担心真正危险时也不会再注意。",
          "Cộng đồng ven sông lắp cảm biến mực nước, vượt vạch vàng thì nhắn cư dân. Tuần mưa đầu cảnh báo chín lần, sáu lần tự hết trong mười phút. Cư dân bắt đầu bỏ qua tin và lo sẽ không chú ý khi nguy hiểm thật.",
        ),
        paragraph(
          "工程师发现，船经过时的短浪会让一个传感器突然升高。新规则要求两个位置同时超过标准五分钟，才发正式警报；单点变化只通知值班员检查。这样做减少了普通信息，但也可能让上游突然涨水晚几分钟被发现。",
          "Kỹ sư phát hiện sóng ngắn do thuyền làm một cảm biến tăng đột ngột. Quy tắc mới yêu cầu hai điểm cùng vượt chuẩn năm phút mới cảnh báo chính thức; biến động một điểm chỉ báo người trực. Cách này giảm tin thường nhưng có thể phát hiện nước thượng nguồn dâng chậm vài phút.",
        ),
        paragraph(
          "社区决定进行两个月试行，分别记录误报、漏报和居民打开信息的比例。负责人提醒，减少警报不是唯一目标；系统还要在不过度打扰和及时保护之间找到可以说明的平衡。",
          "Cộng đồng thử hai tháng, ghi riêng báo sai, bỏ sót và tỷ lệ mở tin. Người phụ trách nhắc giảm cảnh báo không phải mục tiêu duy nhất; hệ thống phải cân bằng giữa không làm phiền quá mức và bảo vệ kịp thời.",
        ),
      ],
      [
        claim(
          "水位警报规则要同时衡量误报、漏报、注意率和发现速度。",
          "Quy tắc cảnh báo mực nước phải cùng đo báo sai, bỏ sót, mức chú ý và tốc độ phát hiện.",
          [1, 2, 3],
          "Nguồn nêu mệt mỏi cảnh báo, đánh đổi kỹ thuật và kế hoạch đánh giá.",
        ),
        claim(
          "九次警报中有六次在十分钟内自动恢复。",
          "Trong chín cảnh báo, sáu lần tự trở lại trong mười phút.",
          [1],
          "Con số trực tiếp giải thích vì sao cư dân bắt đầu bỏ qua.",
        ),
        claim(
          "减少误报的规则可能同时增加发现某些危险的时间。",
          "Quy tắc giảm báo sai có thể đồng thời làm chậm phát hiện một số nguy hiểm.",
          [2],
          "Nguồn nêu rõ rủi ro chậm vài phút khi nước thượng nguồn dâng.",
        ),
        claim(
          "两个传感器的规则保证系统永远不会漏掉洪水。",
          "Quy tắc hai cảm biến bảo đảm hệ thống không bao giờ bỏ sót lũ.",
          [],
          "Nguồn yêu cầu tiếp tục ghi bỏ sót và thừa nhận đánh đổi.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "识别",
        "软件先____照片中的动物，再由研究人员检查。",
        ["识别", "庆祝", "运输", "拒绝"],
        0,
        "reading",
        [1, 2],
        "“识别” chỉ việc xác định đối tượng trong ảnh.",
      ),
      vocabularyDraft(
        "误差",
        "树枝和重复照片会增加统计____。",
        ["传统", "误差", "工资", "机会"],
        1,
        "reading",
        [2],
        "“误差” phù hợp sai lệch giữa số ảnh và hiện tượng cần đo.",
      ),
      vocabularyDraft(
        "维护",
        "值班员需要定期检查和____河边的传感器。",
        ["维护", "表演", "预习", "消费"],
        0,
        "listening",
        [2, 3],
        "“维护设备” là kiểm tra và giữ thiết bị hoạt động.",
      ),
    ],
    grammar: [
      grammarDraft(
        "一旦……就……",
        "____把照片数直接当成动物数，____容易得出错误结论。",
        ["一旦……就……", "既……又……", "虽然……但是……", "除了……还……"],
        0,
        "reading",
        [1, 2],
        "Cấu trúc nêu hệ quả khi thực hiện một cách suy luận sai.",
      ),
      grammarDraft(
        "因此",
        "相机位置集中在道路附近，____报告必须说明取样限制。",
        ["反而", "因此", "未必", "逐渐"],
        1,
        "reading",
        [3],
        "“因此” nối nguyên nhân lấy mẫu lệch với yêu cầu báo cáo.",
      ),
      grammarDraft(
        "除非……否则……",
        "____同时检查误报和漏报，____不能判断新规则是否更安全。",
        ["即使……也……", "除非……否则……", "一边……一边……", "不是……而是……"],
        1,
        "listening",
        [2, 3],
        "Cấu trúc điều kiện cần phù hợp với việc phải xem cả hai loại lỗi.",
      ),
    ],
  },
  {
    formId: FORM_IDS[1],
    domainKey: "society-economy",
    decisionVi:
      "cách đánh giá vé xe buýt trợ giá ở vùng quê theo lượt đi, độ tin cậy và gánh nặng tiếp cận",
    counterclaimVi:
      "Giá vé thấp hơn chắc chắn làm mọi cư dân nông thôn đi xe buýt nhiều hơn.",
    scopeBoundaryVi:
      "Một tuyến và tám tuần không đại diện cho toàn vùng; mùa vụ, quãng đường tới điểm dừng và lịch làm việc có thể thay đổi kết quả.",
    reading: textDraft(
      "乡村低价车票帮到了谁",
      "Vé xe giá thấp ở nông thôn đã giúp ai",
      [
        paragraph(
          "县里在一条乡村公交线上试行两元车票，比原价便宜一半。八周内，总乘车次数增加了百分之二十二，医院站和集市站的增长最明显。负责人起初准备把增长全部归功于降价。",
          "Huyện thử vé 2 tệ trên một tuyến nông thôn, rẻ một nửa. Trong tám tuần, tổng lượt đi tăng 22%, rõ nhất ở trạm bệnh viện và chợ. Người phụ trách ban đầu định quy toàn bộ tăng trưởng cho giảm giá.",
        ),
        paragraph(
          "司机记录显示，同期还增加了早晨一班车，而且两周正好赶上农产品交易会。离车站三公里以上的村民使用变化很小；他们说，到站的摩托车费用有时比公交票还高。票价不是唯一的进入成本。",
          "Ghi chép tài xế cho thấy cùng kỳ thêm một chuyến sáng và có hai tuần hội chợ nông sản. Cư dân cách trạm trên 3 km thay đổi ít; họ nói chi phí xe máy tới trạm đôi khi cao hơn vé buýt. Giá vé không phải chi phí tiếp cận duy nhất.",
        ),
        paragraph(
          "下一轮会在两个远村增加接驳点，并分别比较票价、班次和到站距离。县里继续保留低价票，但不把乘车增长写成单一原因，也会记录错过末班车的人数。",
          "Đợt sau thêm điểm trung chuyển ở hai làng xa và so riêng giá vé, chuyến, khoảng cách tới trạm. Huyện giữ vé thấp nhưng không viết tăng lượt đi như một nguyên nhân duy nhất, đồng thời ghi số người lỡ chuyến cuối.",
        ),
      ],
      [
        claim(
          "低价票的效果要和班次、活动、接驳距离及错过车辆一起分析。",
          "Hiệu quả vé thấp phải phân tích cùng chuyến xe, sự kiện, khoảng cách trung chuyển và việc lỡ xe.",
          [1, 2, 3],
          "Nguồn nêu tăng trưởng rồi chỉ ra nhiều yếu tố và nhóm ít hưởng lợi.",
        ),
        claim(
          "八周内总乘车次数增加了百分之二十二。",
          "Trong tám tuần, tổng lượt đi tăng 22%.",
          [1],
          "Đây là kết quả tổng được nêu trực tiếp.",
        ),
        claim(
          "离车站较远的人可能不会因为票价下降而同样受益。",
          "Người ở xa trạm có thể không hưởng lợi như nhau khi giá vé giảm.",
          [2, 3],
          "Nguồn nêu thay đổi nhỏ và chi phí đi tới trạm cao.",
        ),
        claim(
          "乘车增长完全由低价票造成，而且所有村民都同样受益。",
          "Tăng lượt đi hoàn toàn do vé thấp và mọi cư dân hưởng lợi như nhau.",
          [],
          "Nguồn có chuyến mới, hội chợ và khác biệt khoảng cách.",
        ),
      ],
    ),
    listening: textDraft(
      "冷藏车费用该由谁承担",
      "Ai nên chịu phí xe lạnh",
      [
        paragraph(
          "乡村集市为了让奶制品和鲜菜安全到城里，租了一辆小型冷藏车。合作社按货物重量收费，大农户认为规则清楚，小农户却说自己每次货少，最低收费占收入的比例更高。",
          "Chợ quê thuê xe lạnh nhỏ để đưa sữa và rau tươi an toàn vào thành phố. Hợp tác xã tính theo trọng lượng; hộ lớn thấy rõ ràng, hộ nhỏ nói lượng ít nên phí tối thiểu chiếm tỷ lệ thu nhập cao hơn.",
        ),
        paragraph(
          "一个月里，损坏的鲜菜减少了，但只有三成小农户持续使用。调查显示，有人不清楚发车时间，也有人无法在早上六点前把货送到集中点。把“不使用”解释成“不需要”，会漏掉时间和交通限制。",
          "Trong một tháng, rau hỏng giảm nhưng chỉ 30% hộ nhỏ dùng đều. Khảo sát cho thấy có người không rõ giờ xe, có người không đưa hàng tới điểm tập trung trước 6h. Hiểu “không dùng” là “không cần” sẽ bỏ qua hạn chế thời gian và giao thông.",
        ),
        paragraph(
          "合作社准备试行按月合并小订单，并在两个村设置晚一点的收货点。评估会同时看损坏率、农户净收入和持续使用，而不是只看冷藏车装得多满。",
          "Hợp tác xã sẽ gộp đơn nhỏ theo tháng và đặt điểm nhận muộn hơn ở hai làng. Đánh giá cùng xem tỷ lệ hỏng, thu nhập ròng và dùng liên tục, không chỉ độ đầy của xe.",
        ),
      ],
      [
        claim(
          "冷藏服务要按食品损失、净收入和不同农户的进入条件共同评价。",
          "Dịch vụ xe lạnh phải được đánh giá theo hư hỏng, thu nhập ròng và điều kiện tiếp cận của các hộ.",
          [1, 2, 3],
          "Nguồn cho thấy hiệu quả kỹ thuật không đồng nghĩa tiếp cận công bằng.",
        ),
        claim(
          "鲜菜损坏减少了，但持续使用服务的小农户只有三成。",
          "Rau hỏng giảm nhưng chỉ 30% hộ nhỏ dùng dịch vụ liên tục.",
          [2],
          "Hai kết quả trực tiếp cho thấy thành công không đồng đều.",
        ),
        claim(
          "不使用服务可能反映时间或交通障碍，而不只是没有需要。",
          "Không dùng dịch vụ có thể phản ánh rào cản thời gian hoặc giao thông, không chỉ thiếu nhu cầu.",
          [2],
          "Khảo sát nêu rõ hai rào cản này.",
        ),
        claim(
          "冷藏车装得越满，就能证明每个农户的收入都提高。",
          "Xe lạnh càng đầy càng chứng minh thu nhập mọi hộ tăng.",
          [],
          "Nguồn yêu cầu đo riêng thu nhập và mức dùng của nhóm hộ nhỏ.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "补贴",
        "县里用公共资金____低价车票的部分成本。",
        ["补贴", "批评", "浪费", "翻译"],
        0,
        "reading",
        [1, 3],
        "“补贴” chỉ hỗ trợ tài chính để giảm giá người dùng trả.",
      ),
      vocabularyDraft(
        "班次",
        "除了票价，公交____也会影响乘车次数。",
        ["班次", "性格", "风景", "文章"],
        0,
        "reading",
        [2, 3],
        "“班次” là số/lịch chuyến phương tiện.",
      ),
      vocabularyDraft(
        "负担",
        "最低收费对小农户可能形成更重的经济____。",
        ["机会", "负担", "表演", "关系"],
        1,
        "listening",
        [1],
        "“经济负担” phù hợp phần chi phí chiếm tỷ lệ thu nhập cao.",
      ),
    ],
    grammar: [
      grammarDraft(
        "既然……就……",
        "____票价不是唯一成本，____不能只按价格解释使用变化。",
        ["既然……就……", "尽管……仍……", "一边……一边……", "不但……而且……"],
        0,
        "reading",
        [2],
        "Cấu trúc suy luận từ căn cứ đã biết tới yêu cầu phân tích.",
      ),
      grammarDraft(
        "否则",
        "评估必须记录到站距离，____会高估远村居民得到的帮助。",
        ["因此", "否则", "尤其", "逐渐"],
        1,
        "reading",
        [2, 3],
        "“否则” nêu hậu quả nếu bỏ qua khoảng cách.",
      ),
      grammarDraft(
        "是否",
        "合作社要检查新收货点____提高了小农户的持续使用。",
        ["是否", "似乎", "互相", "往往"],
        0,
        "listening",
        [3],
        "“是否” mở một câu hỏi cần dữ liệu, không giả định kết quả.",
      ),
    ],
  },
  {
    formId: FORM_IDS[1],
    domainKey: "arts-sports",
    decisionVi:
      "cách đánh giá hệ thống luân phiên cầu thủ trẻ theo tham gia, an toàn và phát triển kỹ năng",
    counterclaimVi:
      "Chia thời gian thi đấu bằng nhau luôn tạo kết quả công bằng và tốt hơn cho mọi cầu thủ.",
    scopeBoundaryVi:
      "Một giải sáu trận với hai đội không chứng minh mô hình phù hợp mọi tuổi, vị trí hoặc mức chấn thương.",
    reading: textDraft(
      "少年球队轮换以后更公平吗",
      "Đội trẻ luân phiên có công bằng hơn không",
      [
        paragraph(
          "两支少年足球队试行固定轮换，每名报名球员至少参加半场比赛。过去，教练常在比分接近时只使用技术最好的孩子，结果一些替补整场坐着。新规则后，实际上场人数从平均十四人增加到十九人。",
          "Hai đội bóng trẻ thử luân phiên cố định, mỗi cầu thủ đăng ký chơi ít nhất nửa trận. Trước đây khi tỷ số sát, huấn luyện viên chỉ dùng trẻ kỹ thuật tốt khiến dự bị ngồi cả trận. Sau quy tắc mới, số người thực sự thi đấu tăng từ trung bình 14 lên 19.",
        ),
        paragraph(
          "不过，守门员位置不能简单每十分钟更换，一名刚恢复的球员也需要更短时间。教练开始在赛前记录位置、健康建议和个人学习目标，而不是机械地把分钟完全平均。家长可以看到原则，却看不到其他孩子的医疗说明。",
          "Tuy nhiên thủ môn không thể đổi mỗi mười phút và một cầu thủ mới hồi phục cần thời gian ngắn hơn. Huấn luyện viên ghi vị trí, khuyến nghị sức khỏe và mục tiêu học cá nhân thay vì chia phút máy móc. Phụ huynh thấy nguyên tắc nhưng không thấy y tế của trẻ khác.",
        ),
        paragraph(
          "六场比赛后，更多孩子愿意继续训练，轻微受伤没有增加，但球队还没遇到淘汰赛。项目报告把“公平”分成获得机会、适合角色和保护健康三部分，并准备在压力更高的比赛中继续观察。",
          "Sau sáu trận, nhiều trẻ muốn tập tiếp, chấn thương nhẹ không tăng, nhưng đội chưa gặp vòng loại trực tiếp. Báo cáo chia “công bằng” thành cơ hội, phù hợp vai trò và bảo vệ sức khỏe, rồi tiếp tục quan sát trận áp lực cao.",
        ),
      ],
      [
        claim(
          "球队轮换应保证机会，同时根据位置、学习目标和健康作有理由的调整。",
          "Luân phiên phải bảo đảm cơ hội đồng thời điều chỉnh có lý do theo vị trí, mục tiêu học và sức khỏe.",
          [1, 2, 3],
          "Nguồn đi từ bất bình đẳng cũ tới giới hạn của chia đều máy móc và định nghĩa công bằng nhiều chiều.",
        ),
        claim(
          "实际上场人数从平均十四人增加到十九人。",
          "Số cầu thủ thực sự ra sân tăng từ trung bình 14 lên 19.",
          [1],
          "Đây là thay đổi trực tiếp sau quy tắc.",
        ),
        claim(
          "完全相同的上场时间可能不适合不同位置或恢复阶段。",
          "Thời gian thi đấu hoàn toàn giống nhau có thể không phù hợp vị trí hoặc giai đoạn hồi phục khác nhau.",
          [2],
          "Nguồn nêu thủ môn và cầu thủ mới hồi phục như hai ngoại lệ có lý do.",
        ),
        claim(
          "六场比赛已经证明固定轮换适合所有高压力淘汰赛。",
          "Sáu trận đã chứng minh luân phiên cố định phù hợp mọi trận loại áp lực cao.",
          [],
          "Nguồn nói đội chưa gặp vòng loại và cần quan sát tiếp.",
        ),
      ],
    ),
    listening: textDraft(
      "音乐节排练为什么不再只看出席",
      "Vì sao buổi tập lễ hội không còn chỉ nhìn chuyên cần",
      [
        paragraph(
          "青年音乐节有八个学校乐队。组织者过去要求每队参加六次完整排练，缺席一次就不能演出。住得远的学生常因末班车提前离开，签到表却只写“未完成”，没有说明他们已经练了哪一部分。",
          "Lễ hội âm nhạc trẻ có tám ban nhạc trường. Trước đây mỗi đội phải dự sáu buổi đầy đủ; vắng một lần thì không diễn. Học sinh ở xa thường về sớm vì chuyến xe cuối, nhưng bảng chỉ ghi “chưa hoàn thành” mà không nói phần đã tập.",
        ),
        paragraph(
          "今年，排练被分成合奏、分声部和舞台走位三个目标。学生可以在线提交个人练习，但最后两次合奏仍须到场。试行后，缺席记录减少了，负责老师却发现有些视频声音太小，无法判断节奏是否准确。",
          "Năm nay buổi tập chia thành hòa tấu, tập bè và di chuyển sân khấu. Học sinh nộp tập cá nhân trực tuyến, nhưng hai buổi hòa tấu cuối phải có mặt. Sau thử, ghi vắng giảm nhưng một số video quá nhỏ để đánh giá nhịp.",
        ),
        paragraph(
          "组织者决定公布每个目标的证据要求，并提供学校里的录音设备。是否准备好演出将由合奏配合、个人部分和安全走位共同决定，不再由一次签到自动决定。",
          "Ban tổ chức công bố yêu cầu bằng chứng cho từng mục tiêu và cung cấp thiết bị ghi tại trường. Sẵn sàng biểu diễn sẽ dựa trên phối hợp, phần cá nhân và di chuyển an toàn, không còn do một lần điểm danh tự quyết.",
        ),
      ],
      [
        claim(
          "排练资格应按具体能力和可获得的证据判断，而不是一次出席记录。",
          "Điều kiện biểu diễn phải được đánh giá theo năng lực cụ thể và bằng chứng có thể tiếp cận, không phải một lần chuyên cần.",
          [1, 2, 3],
          "Nguồn chỉ ra dữ liệu chuyên cần thiếu bối cảnh và thay bằng mục tiêu/bằng chứng.",
        ),
        claim(
          "最后两次合奏仍要求学生到现场参加。",
          "Hai buổi hòa tấu cuối vẫn yêu cầu học sinh có mặt.",
          [2],
          "Đây là giới hạn trực tiếp của phương án trực tuyến.",
        ),
        claim(
          "允许上传视频只有在录音质量足以判断时才形成有效证据。",
          "Cho tải video chỉ tạo bằng chứng hữu ích khi chất lượng âm đủ để đánh giá.",
          [2, 3],
          "Nguồn nêu video quá nhỏ và bổ sung thiết bị ghi.",
        ),
        claim(
          "缺席记录减少证明所有学生已经达到演出标准。",
          "Ghi vắng giảm chứng minh mọi học sinh đã đạt chuẩn biểu diễn.",
          [],
          "Nguồn phân biệt chuyên cần với hòa tấu, phần cá nhân và an toàn.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "轮换",
        "球队用固定____让更多孩子获得上场机会。",
        ["轮换", "运输", "翻译", "修理"],
        0,
        "reading",
        [1],
        "“轮换” chỉ thay người theo lượt.",
      ),
      vocabularyDraft(
        "受伤",
        "刚从____中恢复的球员需要较短的上场时间。",
        ["受伤", "报名", "表演", "讨论"],
        0,
        "reading",
        [2],
        "“从受伤中恢复” khớp bối cảnh sức khỏe.",
      ),
      vocabularyDraft(
        "配合",
        "合奏是否整齐取决于成员之间的____。",
        ["配合", "价格", "风景", "距离"],
        0,
        "listening",
        [2, 3],
        "“配合” diễn đạt khả năng phối hợp trong hòa tấu.",
      ),
    ],
    grammar: [
      grammarDraft(
        "尽管……仍……",
        "____可以提交个人视频，最后两次合奏____须到场。",
        ["尽管……仍……", "因为……所以……", "不但……而且……", "既然……就……"],
        0,
        "listening",
        [2],
        "Cấu trúc nhượng bộ giữ ngoại lệ bắt buộc trực tiếp.",
      ),
      grammarDraft(
        "反而",
        "机械平均上场时间不一定公平，____可能忽略健康需要。",
        ["因此", "反而", "逐渐", "互相"],
        1,
        "reading",
        [2],
        "“反而” nêu hệ quả trái với mục tiêu công bằng.",
      ),
      grammarDraft(
        "随着",
        "____比赛压力提高，球队还要继续检查轮换规则。",
        ["关于", "对于", "随着", "根据"],
        2,
        "reading",
        [3],
        "“随着” giới thiệu điều kiện thay đổi theo mức áp lực.",
      ),
    ],
  },
  {
    formId: FORM_IDS[1],
    domainKey: "culture-history",
    decisionVi:
      "cách cải tạo phố di sản để tăng khả năng đi lại mà vẫn minh bạch phần cũ, phần mới và ý kiến cư dân",
    counterclaimVi:
      "Giữ nguyên mọi bậc đá và mặt đường cũ là cách duy nhất để bảo vệ tính chân thực lịch sử.",
    scopeBoundaryVi:
      "Một đoạn phố thử nghiệm không quyết định giải pháp cho mọi di tích; trải nghiệm của các nhóm và độ bền vật liệu cần theo dõi lâu hơn.",
    reading: textDraft(
      "老街加坡道会失去原貌吗",
      "Phố cổ thêm đường dốc có mất nguyên trạng không",
      [
        paragraph(
          "平安老街准备修复三百米石路。原设计只更换破损石块，后来轮椅使用者和推婴儿车的家庭指出，十二处高台阶让他们必须绕到后巷。保护团队担心增加坡道会改变街道原貌。",
          "Phố cổ Bình An chuẩn bị sửa 300 m đường đá. Thiết kế đầu chỉ thay đá hỏng, nhưng người dùng xe lăn và gia đình đẩy xe trẻ nói 12 bậc cao buộc họ vòng hẻm sau. Nhóm bảo tồn lo thêm dốc đổi nguyên trạng.",
        ),
        paragraph(
          "试验段使用颜色接近、表面可逆安装的新石板，并在两处保留原台阶供比较。开放一个月后，绕行人数减少，雨天有一块坡道却比较滑。居民还问，为什么只在旅游入口改善，而菜市场方向仍不方便。",
          "Đoạn thử dùng đá mới màu gần giống, lắp có thể tháo, và giữ bậc cũ ở hai chỗ để so. Sau một tháng, người đi vòng giảm nhưng một dốc trơn khi mưa. Cư dân hỏi vì sao chỉ cải thiện lối du lịch mà hướng chợ vẫn khó.",
        ),
        paragraph(
          "团队决定调整防滑表面，并在图上标出原材料、新材料和可拆部分。下一阶段会把通行时间、雨天安全和历史外观评价分开报告。保护原貌不再被解释为“任何东西都不能改变”，而是要求改变有证据、可辨认并尽量可逆。",
          "Nhóm điều chỉnh chống trượt và đánh dấu vật liệu cũ, mới, phần tháo được. Giai đoạn sau báo riêng thời gian đi, an toàn mưa và đánh giá vẻ lịch sử. Bảo tồn không còn nghĩa “không được đổi gì” mà thay đổi phải có bằng chứng, nhận biết được và càng thuận nghịch càng tốt.",
        ),
      ],
      [
        claim(
          "老街修复可以改善通行，但应让新旧部分可辨、可逆并继续检查安全与公平。",
          "Sửa phố cổ có thể cải thiện đi lại nhưng phải phân biệt phần mới/cũ, có thể đảo ngược và tiếp tục kiểm tra an toàn, công bằng.",
          [1, 2, 3],
          "Nguồn trình bày xung đột, thử nghiệm và nguyên tắc sửa đổi có kiểm soát.",
        ),
        claim(
          "试验后绕行人数减少，但一块坡道雨天较滑。",
          "Sau thử nghiệm, số người đi vòng giảm nhưng một dốc trơn khi mưa.",
          [2],
          "Hai kết quả trực tiếp thể hiện lợi ích và rủi ro.",
        ),
        claim(
          "可逆材料能减少永久改变，但不能自动解决所有安全问题。",
          "Vật liệu thuận nghịch giảm thay đổi vĩnh viễn nhưng không tự giải quyết mọi vấn đề an toàn.",
          [2, 3],
          "Nguồn vẫn phải chỉnh chống trượt dù vật liệu tháo được.",
        ),
        claim(
          "保护历史原貌要求永远禁止任何新材料和无障碍设施。",
          "Bảo vệ nguyên trạng lịch sử đòi cấm vĩnh viễn mọi vật liệu mới và tiện ích tiếp cận.",
          [],
          "Nguồn kết luận thay đổi có thể chấp nhận nếu có bằng chứng, minh bạch và thuận nghịch.",
        ),
      ],
    ),
    listening: textDraft(
      "档案展为什么补上了背景",
      "Vì sao triển lãm lưu trữ bổ sung bối cảnh",
      [
        paragraph(
          "城市档案馆展出一组一九五〇年代的工厂照片。最初的说明只写机器型号和拍摄年份，不少参观者因此以为照片代表所有工人的日常生活。",
          "Lưu trữ thành phố trưng ảnh nhà máy thập niên 1950. Chú thích ban đầu chỉ ghi loại máy và năm chụp, khiến nhiều khách nghĩ ảnh đại diện toàn bộ đời sống công nhân.",
        ),
        paragraph(
          "研究人员后来发现，照片由工厂宣传部门选择，主要拍白班和新设备，很少出现夜班、维修或宿舍生活。两位退休工人还指出，一张“休息时间”的照片其实来自迎接访问团的特别活动。",
          "Nhà nghiên cứu phát hiện ảnh do bộ phận tuyên truyền chọn, chủ yếu chụp ca ngày và thiết bị mới, ít có ca đêm, bảo trì hay ký túc. Hai công nhân nghỉ hưu nói ảnh “giờ nghỉ” thực ra từ sự kiện đón đoàn.",
        ),
        paragraph(
          "档案馆没有撤下照片，而是在旁边补充拍摄目的、缺少的场景和口述意见。新说明把照片当成一个有价值但有选择的来源。参观者仍可提出别的解释，前提是区分画面里看得见的事实和需要其他材料支持的推测。",
          "Lưu trữ không gỡ ảnh mà bổ sung mục đích chụp, cảnh bị thiếu và ý kiến kể. Chú thích mới xem ảnh là nguồn có giá trị nhưng đã chọn lọc. Khách vẫn có thể giải thích khác nếu tách sự kiện nhìn thấy với suy đoán cần tài liệu khác.",
        ),
      ],
      [
        claim(
          "历史照片应结合拍摄目的、缺失场景和其他证词来解释。",
          "Ảnh lịch sử phải được giải thích cùng mục đích chụp, cảnh bị thiếu và lời chứng khác.",
          [1, 2, 3],
          "Nguồn cho thấy chú thích kỹ thuật ban đầu thiếu bối cảnh và cách khắc phục.",
        ),
        claim(
          "照片主要记录白班和新设备，很少出现夜班与维修。",
          "Ảnh chủ yếu ghi ca ngày và thiết bị mới, ít có ca đêm và bảo trì.",
          [2],
          "Đây là giới hạn lựa chọn được nêu trực tiếp.",
        ),
        claim(
          "保留照片并补充背景可以比简单撤下提供更多可检查的证据。",
          "Giữ ảnh và bổ sung bối cảnh có thể cung cấp nhiều bằng chứng kiểm tra hơn việc chỉ gỡ bỏ.",
          [2, 3],
          "Lưu trữ chọn giữ nguồn nhưng công khai giới hạn của nó.",
        ),
        claim(
          "一组宣传照片能够完整代表所有工人的日常生活。",
          "Một bộ ảnh tuyên truyền có thể đại diện đầy đủ đời sống mọi công nhân.",
          [],
          "Nguồn nêu nhiều ca và bối cảnh bị thiếu, cùng mục đích tuyên truyền.",
        ),
      ],
    ),
    vocabulary: [
      vocabularyDraft(
        "修复",
        "老街计划____破损石路并改善通行。",
        ["修复", "翻译", "庆祝", "拒绝"],
        0,
        "reading",
        [1],
        "“修复” chỉ việc sửa và bảo tồn phần hư hỏng.",
      ),
      vocabularyDraft(
        "原貌",
        "保护团队担心坡道会改变街道____。",
        ["原貌", "工资", "班次", "订单"],
        0,
        "reading",
        [1, 3],
        "“原貌” là diện mạo vốn có của di sản.",
      ),
      vocabularyDraft(
        "背景",
        "新说明补充了照片的拍摄目的和历史____。",
        ["背景", "比赛", "价格", "距离"],
        0,
        "listening",
        [2, 3],
        "“历史背景” là thông tin giúp đặt nguồn vào hoàn cảnh.",
      ),
    ],
    grammar: [
      grammarDraft(
        "为了",
        "____改善雨天安全，团队调整了坡道表面。",
        ["尽管", "为了", "反而", "随着"],
        1,
        "reading",
        [2, 3],
        "“为了” giới thiệu mục đích của việc điều chỉnh.",
      ),
      grammarDraft(
        "其中",
        "试验段保留了两处原台阶，____一处供居民比较材料。",
        ["其中", "否则", "未必", "逐渐"],
        0,
        "reading",
        [2],
        "“其中” chọn một phần trong tập hợp đã nêu.",
      ),
      grammarDraft(
        "由……选择",
        "这些照片____工厂宣传部门____，因此存在取样限制。",
        ["把……看成", "由……选择", "对……来说", "与其……不如"],
        1,
        "listening",
        [2],
        "Cấu trúc bị động chỉ rõ chủ thể đã lựa chọn nguồn ảnh.",
      ),
    ],
  },
];

const sourceIdFor = (formId, domainKey) =>
  [
    "hsk4-assessment",
    formId.endsWith("-a") ? "form-a" : "form-b",
    domainKey,
    "source-family-01",
  ].join(":");

const buildTextSource = ({
  familyId,
  kind,
  draft,
}) => {
  const paragraphPrefix = kind === "assessment-reading" ? "r" : "l";
  const paragraphs = draft.paragraphs.map((entry, index) => ({
    paragraphId: `${paragraphPrefix}${index + 1}`,
    hanzi: entry.hanzi,
    vietnamese: entry.vietnamese,
  }));
  const textId = `${familyId}:${kind === "assessment-reading" ? "reading" : "listening"}-01`;
  const contentHanzi = paragraphs.map((entry) => entry.hanzi).join("");
  const contentVi = paragraphs.map((entry) => entry.vietnamese).join("");
  const hashInput = {
    textId,
    kind,
    titleHanzi: draft.titleHanzi,
    titleVi: draft.titleVi,
    paragraphs,
    contentHanzi,
    contentVi,
  };
  return {
    textId,
    kind,
    titleHanzi: draft.titleHanzi,
    titleVi: draft.titleVi,
    paragraphs,
    contentHanzi,
    contentVi,
    textSha256: jsonSha256(hashInput),
    paragraphCount: paragraphs.length,
    pinyinSupportPolicy: "none-during-assessment",
    transcriptRevealPolicy:
      kind === "assessment-listening"
        ? "after-form-submission"
        : "always-visible-during-reading-section",
    audio: null,
    audioRequirement:
      kind === "assessment-listening"
        ? "reviewed-human-or-licensed-recording"
        : null,
    authoringPreview:
      kind === "assessment-listening"
        ? "synthetic-browser-voice"
        : null,
    learnerVisible: false,
    reviewStatus: "pending",
    releaseEligible: false,
  };
};

const buildSources = () =>
  FAMILY_DRAFTS.map((draft) => {
    const domain = DOMAIN_SPECS.find(
      (candidate) => candidate.key === draft.domainKey,
    );
    assert(domain, `Unknown HSK4 assessment domain ${draft.domainKey}`);
    const sourceFamilyId = sourceIdFor(draft.formId, draft.domainKey);
    const readingSource = buildTextSource({
      familyId: sourceFamilyId,
      kind: "assessment-reading",
      draft: draft.reading,
    });
    const listeningSource = buildTextSource({
      familyId: sourceFamilyId,
      kind: "assessment-listening",
      draft: draft.listening,
    });
    return {
      sourceFamilyId,
      formId: draft.formId,
      domainId: domain.domainId,
      domainKey: domain.key,
      domainTitleVi: domain.titleVi,
      exposureGroupId: `${BANK_ID}:${sourceFamilyId}:exposure-v1`,
      sourceAuthorship: "new-assessment-authored-source-draft",
      learningReuse: false,
      repositoryExposure:
        "repository-authoring-only-confidentiality-not-preserved",
      authorship: {
        method: "ai-assisted-assessment-source-authoring",
        assistant: "OpenAI Codex",
        nativeMandarinReviewer: null,
        vietnameseEditor: null,
        assessmentEditor: null,
      },
      decisionVi: draft.decisionVi,
      counterclaimVi: draft.counterclaimVi,
      scopeBoundaryVi: draft.scopeBoundaryVi,
      readingSource,
      listeningSource,
      textIds: [readingSource.textId, listeningSource.textId],
      textSha256s: [
        readingSource.textSha256,
        listeningSource.textSha256,
      ],
      reviewStatus: "pending",
      learnerVisible: false,
      releaseEligible: false,
    };
  });

const rotateOptions = (entries, correctIndex, shift) => {
  assert(entries.length === 4, "Objective items require four options");
  const indexed = entries.map((entry, index) => ({
    entry,
    isCorrect: index === correctIndex,
  }));
  const offset = shift % indexed.length;
  const rotated = [
    ...indexed.slice(offset),
    ...indexed.slice(0, offset),
  ];
  const options = rotated.map(({ entry }, index) => ({
    optionId: OPTION_IDS[index],
    ...(typeof entry === "string"
      ? { textHanzi: entry }
      : {
          textHanzi: entry.hanzi,
          textVi: entry.vietnamese,
        }),
  }));
  return {
    options,
    correctOptionId: options[
      rotated.findIndex((entry) => entry.isCorrect)
    ].optionId,
  };
};

const commonItemFields = ({
  itemId,
  formId,
  family,
  sectionId,
  localSlot,
  difficultyBand,
}) => ({
  itemVersion: `${BANK_ID}:${itemId}:1`,
  formId,
  sourceFamilyId: family.sourceFamilyId,
  domainId: family.domainId,
  sourceExposureGroupId: family.exposureGroupId,
  exposureGroupId: `${BANK_ID}:${itemId}:exposure-v1`,
  equivalentGroupId: [
    BANK_ID,
    family.domainKey,
    sectionId,
    `slot-${String(localSlot).padStart(2, "0")}`,
  ].join(":"),
  sectionId,
  skill: SECTION_SKILLS[sectionId],
  primarySkill: SECTION_SKILLS[sectionId],
  supportingSkills: [],
  difficultyBand,
  answerExposure: "repository-authoring-only",
  sourceExposure: "assessment-authored-repository-exposed-draft",
  reviewStatus: "pending",
  calibrationStatus: "uncalibrated",
  independentFormStatus: "source-disjoint-assessment-authored-draft",
  scoringPolicy: "draft-only-not-for-issuance",
  measurementEligible: false,
  masteryEligible: false,
  prerequisiteWaiverEligible: false,
  releaseEligible: false,
});

const itemIdFor = (formId, sectionId, slot) => [
  "hsk4-level-check",
  formId.endsWith("-a") ? "form-a" : "form-b",
  sectionId.replace("-objective", "").replace("-performance", ""),
  String(slot).padStart(2, "0"),
].join(":");

const sourceForKind = (family, kind) =>
  kind === "reading"
    ? family.readingSource
    : family.listeningSource;
const evidenceRefsFor = (family, kind, paragraphNumbers) => {
  const source = sourceForKind(family, kind);
  const prefix = kind === "reading" ? "r" : "l";
  return [{
    sourceFamilyId: family.sourceFamilyId,
    textId: source.textId,
    textSha256: source.textSha256,
    paragraphIds: paragraphNumbers.map((number) => `${prefix}${number}`),
  }];
};

const loadAssessmentInventory = (root) => {
  const vocabularyPack = JSON.parse(
    readFileSync(
      resolve(root, HSK4_VOCABULARY_RELATIVE_PATH),
      "utf8",
    ),
  );
  const officialInventory = JSON.parse(
    readFileSync(
      resolve(root, OFFICIAL_INVENTORY_RELATIVE_PATH),
      "utf8",
    ),
  );
  const scope = JSON.parse(
    readFileSync(resolve(root, HSK4_SCOPE_RELATIVE_PATH), "utf8"),
  );
  const vocabularyById = new Map(
    vocabularyPack.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const grammarRowsById = new Map(
    officialInventory.grammarRows
      .filter((row) => row.level === 4)
      .map((row) => [row.id, row]),
  );
  const scopedVocabularyIds = new Set(
    scope.unitScopes.flatMap((unit) => unit.vocabularyIds),
  );
  const scopedGrammarRowIds = new Set(
    scope.unitScopes.flatMap((unit) => unit.grammarRowIds),
  );
  const selectedVocabularyIds = Object.values(
    OFFICIAL_VOCABULARY_IDS,
  ).flat();
  const selectedGrammarRowIds = Object.values(
    OFFICIAL_GRAMMAR_ITEMS,
  ).flatMap((entry) => entry.map((item) => item.grammarRowId));
  assert(
    selectedVocabularyIds.length === 36
    && unique(selectedVocabularyIds).length === 36,
    "HSK4 assessment requires 36 unique official vocabulary bindings",
  );
  assert(
    selectedGrammarRowIds.length === 36
    && unique(selectedGrammarRowIds).length === 36,
    "HSK4 assessment requires 36 unique official grammar bindings",
  );
  for (const officialVocabularyId of selectedVocabularyIds) {
    assert(
      scopedVocabularyIds.has(officialVocabularyId)
      && vocabularyById.has(officialVocabularyId),
      `${officialVocabularyId} is not in the exact HSK4 vocabulary scope`,
    );
  }
  for (const grammarRowId of selectedGrammarRowIds) {
    assert(
      scopedGrammarRowIds.has(grammarRowId)
      && grammarRowsById.has(grammarRowId),
      `${grammarRowId} is not in the exact HSK4 grammar scope`,
    );
  }
  return {
    vocabularyById,
    grammarRowsById,
    scopedVocabularyIds,
    scopedGrammarRowIds,
  };
};

const findWordEvidence = (family, word) => {
  for (const [sourceKind, source] of [
    ["reading", family.readingSource],
    ["listening", family.listeningSource],
  ]) {
    const paragraphIndex = source.paragraphs.findIndex(
      (entry) => entry.hanzi.includes(word),
    );
    if (paragraphIndex >= 0) {
      const paragraphHanzi = source.paragraphs[paragraphIndex].hanzi;
      const sentence = paragraphHanzi
        .split(/(?<=[。！？；])/u)
        .find((candidate) => candidate.includes(word))
        ?? paragraphHanzi;
      return {
        sourceKind,
        paragraphNumbers: [paragraphIndex + 1],
        contextHanzi: sentence.replace(word, "____"),
      };
    }
  }
  throw new Error(
    `${word} does not occur in ${family.sourceFamilyId}`,
  );
};

const buildOfficialVocabularyDrafts = (family, inventory) => {
  const key = bindingKey(family.formId, family.domainKey);
  const officialIds = OFFICIAL_VOCABULARY_IDS[key] ?? [];
  const entries = officialIds.map((officialVocabularyId) => {
    const official = inventory.vocabularyById.get(
      officialVocabularyId,
    );
    assert(
      official
      && inventory.scopedVocabularyIds.has(officialVocabularyId),
      `${officialVocabularyId} is not available for ${key}`,
    );
    return official;
  });
  const words = entries.map((entry) => entry.simplified);
  const distractorPool = [
    "结果",
    "过程",
    "标准",
    "实际",
    "原因",
    "任务",
  ];
  return entries.map((entry, index) => {
    const evidence = findWordEvidence(family, entry.simplified);
    const distractor = distractorPool.find(
      (word) => !words.includes(word),
    );
    assert(distractor, `Cannot select distractor for ${key}`);
    return {
      officialVocabularyId: entry.officialId,
      targetHanzi: entry.simplified,
      officialPinyin: entry.officialPinyin,
      officialPartOfSpeech: entry.officialPartOfSpeech,
      contextHanzi: evidence.contextHanzi,
      optionsHanzi: [...words, distractor],
      correctOptionIndex: index,
      sourceKind: evidence.sourceKind,
      paragraphNumbers: evidence.paragraphNumbers,
      rationaleVi:
        `“${entry.simplified}” xuất hiện trong nguồn và hoàn thành đúng ngữ nghĩa của câu; các lựa chọn còn lại không phù hợp quan hệ ngữ cảnh.`,
    };
  });
};

const buildOfficialGrammarDrafts = (family, inventory) => {
  const key = bindingKey(family.formId, family.domainKey);
  const specs = OFFICIAL_GRAMMAR_ITEMS[key] ?? [];
  return specs.map((spec) => {
    const row = inventory.grammarRowsById.get(spec.grammarRowId);
    assert(
      row && inventory.scopedGrammarRowIds.has(spec.grammarRowId),
      `${spec.grammarRowId} is not available for ${key}`,
    );
    return {
      ...spec,
      grammarLabel: row.content,
      officialGrammarContent: row.content,
      officialGrammarCategory: row.categoryName,
      rationaleVi:
        `Cấu trúc thuộc ${spec.grammarRowId} hoàn thành đúng quan hệ ý nghĩa trong ngữ cảnh nguồn HSK4.`,
    };
  });
};

const buildComprehensionItems = ({
  draft,
  family,
  domainIndex,
  sectionId,
  sourceKind,
}) => {
  const text = sourceForKind(family, sourceKind);
  const textDraftValue =
    sourceKind === "reading" ? draft.reading : draft.listening;
  const prompts = [
    "Kết luận trung tâm nào phù hợp nhất với toàn bộ nguồn?",
    "Chi tiết nào là bằng chứng trực tiếp quan trọng nhất trong nguồn?",
    "Suy luận nào hợp lý nhưng vẫn giữ đúng giới hạn bằng chứng?",
  ];
  return textDraftValue.claims.slice(0, 3).map((correctClaim, index) => {
    const localSlot = index + 1;
    const sectionSlot = domainIndex * 3 + localSlot;
    const itemId = itemIdFor(family.formId, sectionId, sectionSlot);
    const evidenceBindings = evidenceRefsFor(
      family,
      sourceKind,
      correctClaim.paragraphNumbers,
    );
    return {
      itemId,
      ...commonItemFields({
        itemId,
        formId: family.formId,
        family,
        sectionId,
        localSlot,
        difficultyBand: DIFFICULTY_BY_SECTION[sectionId][index],
      }),
      construct:
        sourceKind === "reading"
          ? "hsk4-three-paragraph-evidence-bound-reading"
          : "hsk4-three-paragraph-evidence-bound-listening",
      modality:
        sourceKind === "reading"
          ? "visual-selection"
          : "recorded-source-selection-pending",
      sourceEntityKey: `${family.sourceFamilyId}:${sourceKind}:claim-${localSlot}`,
      sourceSnapshotSha256: jsonSha256({
        textSha256: text.textSha256,
        claim: correctClaim,
      }),
      promptVi: prompts[index],
      stimulus:
        sourceKind === "reading"
          ? {
              kind: "assessment-reading-source-reference",
              sourceTextId: text.textId,
              sourceTextSha256: text.textSha256,
              titleVi: text.titleVi,
              pinyinVisible: false,
            }
          : {
              kind: "assessment-listening-source-reference",
              sourceTextId: text.textId,
              sourceTextSha256: text.textSha256,
              audio: null,
              audioRequirement: "reviewed-human-or-licensed-recording",
              authoringPreview: "synthetic-browser-voice",
              transcriptVisibleDuringResponse: false,
              transcriptVisibleDuringAssessment: false,
              replayPolicy: "one-playback-until-calibrated",
            },
      ...rotateOptions(
        textDraftValue.claims.map((entry) => ({
          hanzi: entry.hanzi,
          vietnamese: entry.vietnamese,
        })),
        index,
        domainIndex + index,
      ),
      sourceTextIds: evidenceBindings.map((binding) => binding.textId),
      evidenceRefs: evidenceBindings,
      evidenceBindings,
      rationaleVi: correctClaim.rationaleVi,
      scopeBoundaryVi: draft.scopeBoundaryVi,
      evidencePolicy: {
        contributesOnlyTo: SECTION_SKILLS[sectionId],
        otherSkillsDoNotReceiveEvidence: true,
      },
    };
  });
};

const buildLanguageItems = ({
  drafts,
  family,
  domainIndex,
  sectionId,
}) =>
  drafts.map((entry, index) => {
    const localSlot = index + 1;
    const sectionSlot = domainIndex * 3 + localSlot;
    const itemId = itemIdFor(family.formId, sectionId, sectionSlot);
    const source = sourceForKind(family, entry.sourceKind);
    const isVocabulary = sectionId === "vocabulary-objective";
    const evidenceBindings = evidenceRefsFor(
      family,
      entry.sourceKind,
      entry.paragraphNumbers,
    );
    return {
      itemId,
      ...commonItemFields({
        itemId,
        formId: family.formId,
        family,
        sectionId,
        localSlot,
        difficultyBand: DIFFICULTY_BY_SECTION[sectionId][index],
      }),
      construct: isVocabulary
        ? "hsk4-vocabulary-in-hanzi-context"
        : "hsk4-grammar-discourse-control-in-hanzi-context",
      modality: "visual-selection",
      ...(isVocabulary
        ? { officialVocabularyId: entry.officialVocabularyId }
        : { grammarRowId: entry.grammarRowId }),
      sourceEntityKey: `${family.sourceFamilyId}:${isVocabulary ? "vocabulary" : "grammar"}-${localSlot}`,
      sourceSnapshotSha256: jsonSha256({
        textSha256: source.textSha256,
        entry,
      }),
      promptVi: isVocabulary
        ? "Chọn từ Hán phù hợp nhất để hoàn thành ngữ cảnh."
        : "Chọn cấu trúc Hán ngữ phù hợp nhất với quan hệ ý nghĩa.",
      stimulus: {
        kind: "hanzi-only-context",
        contextHanzi: entry.contextHanzi,
        ...(isVocabulary
          ? {
              officialVocabularyId: entry.officialVocabularyId,
              targetHanzi: entry.targetHanzi,
              officialPinyin: entry.officialPinyin,
              officialPartOfSpeech: entry.officialPartOfSpeech,
            }
          : {
              grammarRowId: entry.grammarRowId,
              grammarLabel: entry.grammarLabel,
              officialGrammarContent: entry.officialGrammarContent,
              officialGrammarCategory: entry.officialGrammarCategory,
            }),
        mixedLanguageInContext: false,
      },
      ...rotateOptions(
        entry.optionsHanzi,
        entry.correctOptionIndex,
        domainIndex + index,
      ),
      sourceTextIds: evidenceBindings.map((binding) => binding.textId),
      evidenceRefs: evidenceBindings,
      evidenceBindings,
      rationaleVi: entry.rationaleVi,
      scopeBoundaryVi: family.scopeBoundaryVi,
      evidencePolicy: {
        contributesOnlyTo: SECTION_SKILLS[sectionId],
        readingOrWritingEvidenceGranted: false,
      },
    };
  });

const SPEAKING_RUBRIC = {
  rubricId: "hsk4-assessment-speaking-rubric-draft-v1",
  state: "pending-review-and-calibration",
  dimensions: [
    "task-fulfillment",
    "source-evidence",
    "organization-and-response",
    "intelligibility",
    "language-control",
  ],
  scale: null,
  passingStandard: null,
};
const WRITING_RUBRIC = {
  rubricId: "hsk4-assessment-writing-rubric-draft-v1",
  state: "pending-review-and-calibration",
  dimensions: [
    "task-fulfillment",
    "source-evidence",
    "organization-and-cohesion",
    "scope-boundary-and-counterargument",
    "language-control",
  ],
  scale: null,
  passingStandard: null,
};

const buildSpeakingItems = ({
  draft,
  family,
  domainIndex,
}) => [
  {
    promptVi:
      `Nghe nguồn “${family.listeningSource.titleVi}”, trình bày bằng tiếng Trung ${draft.decisionVi}. Phân biệt dữ kiện trực tiếp, suy luận và điều chưa được chứng minh.`,
    requiredMovesVi: [
      "Nêu vấn đề quyết định.",
      "Dẫn ít nhất hai chi tiết từ nguồn nghe.",
      "Giải thích một đánh đổi.",
      "Kết luận có giới hạn.",
    ],
    sourceKinds: ["listening"],
  },
  {
    promptVi:
      `Dựa trên hai nguồn của chủ đề, phản hồi ý kiến: “${draft.counterclaimVi}” Bảo vệ một phương án có điều kiện và nói rõ bằng chứng nào còn thiếu.`,
    requiredMovesVi: [
      "Diễn đạt công bằng ý kiến đối lập.",
      "Dùng một bằng chứng từ mỗi nguồn.",
      "Giải thích vì sao một chỉ số chưa đủ.",
      "Nêu điều kiện để thay đổi kết luận.",
    ],
    sourceKinds: ["reading", "listening"],
  },
].map((spec, index) => {
  const localSlot = index + 1;
  const sectionSlot = domainIndex * 2 + localSlot;
  const sectionId = "speaking-performance";
  const itemId = itemIdFor(family.formId, sectionId, sectionSlot);
  const evidenceBindings = spec.sourceKinds.flatMap((kind) =>
    evidenceRefsFor(family, kind, [1, 2, 3])
  );
  return {
    itemId,
    ...commonItemFields({
      itemId,
      formId: family.formId,
      family,
      sectionId,
      localSlot,
      difficultyBand: DIFFICULTY_BY_SECTION[sectionId][index],
    }),
    construct:
      index === 0
        ? "evidence-bounded-spoken-explanation"
        : "evidence-bounded-spoken-defense",
    modality: "reviewed-human-rated-performance-pending",
    sourceEntityKey: `${family.sourceFamilyId}:speaking-${localSlot}`,
    sourceSnapshotSha256: jsonSha256({
      sourceTextSha256s: evidenceBindings.map((ref) => ref.textSha256),
      promptVi: spec.promptVi,
    }),
    promptVi: spec.promptVi,
    stimulus: {
      kind: "assessment-source-reference",
      sourceTextIds: evidenceBindings.map((ref) => ref.textId),
      audio: null,
      audioRequirement: "reviewed-human-or-licensed-recording",
      authoringPreview: "synthetic-browser-voice",
      transcriptVisibleDuringResponse: false,
      transcriptVisibleDuringAssessment: false,
    },
    sourceTextIds: evidenceBindings.map((ref) => ref.textId),
    evidenceRefs: evidenceBindings,
    evidenceBindings,
    rationaleVi:
      "Bài nói phải dùng đúng dữ kiện nguồn, phản hồi yêu cầu và giữ kết luận trong phạm vi thử nghiệm.",
    scopeBoundaryVi: draft.scopeBoundaryVi,
    responseContract: {
      unit: "spoken-seconds",
      minimum: 120,
      maximum: 180,
      preparationSeconds: 60,
      timeLimitSeconds: 300,
      requiredMoves: 4,
      minimumSources: spec.sourceKinds.length,
      learnerRecordingRequired: true,
      humanRatingRequired: true,
      modelResponseVisible: false,
      asrMayScoreMastery: false,
      browserAsrCanScoreMastery: false,
    },
    rubricId: SPEAKING_RUBRIC.rubricId,
    rubricDraft: SPEAKING_RUBRIC,
    evidencePolicy: {
      contributesOnlyTo: "speaking",
      listeningOrReadingEvidenceGranted: false,
      humanRatingRequired: true,
    },
  };
});

const buildWritingItems = ({
  draft,
  family,
  domainIndex,
}) => [
  {
    promptVi:
      `Viết bản tóm tắt 100–160 chữ Hán về nguồn “${family.readingSource.titleVi}”: vấn đề, hai bằng chứng, điều chỉnh và giới hạn kết luận.`,
    responseContract: {
      unit: "hanzi",
      minimum: 100,
      maximum: 160,
      timeLimitSeconds: 420,
      requiredSections: 4,
      minimumSources: 1,
    },
    requiredMovesVi: [
      "Nêu vấn đề trung tâm.",
      "Giữ đúng hai bằng chứng.",
      "Mô tả điều chỉnh.",
      "Nêu giới hạn.",
    ],
  },
  {
    promptVi:
      `Viết bài lập luận 180–260 chữ Hán đề xuất ${draft.decisionVi}. Phản hồi ý kiến “${draft.counterclaimVi}” và nêu dữ liệu cần thu thêm.`,
    responseContract: {
      unit: "hanzi",
      minimum: 180,
      maximum: 260,
      timeLimitSeconds: 600,
      requiredSections: 5,
      minimumSources: 1,
    },
    requiredMovesVi: [
      "Nêu luận điểm.",
      "Dùng ít nhất hai bằng chứng.",
      "Giải thích quan hệ bằng chứng–kết luận.",
      "Phản hồi ý kiến đối lập.",
      "Nêu giới hạn và dữ liệu còn thiếu.",
    ],
  },
].map((spec, index) => {
  const localSlot = index + 1;
  const sectionSlot = domainIndex * 2 + localSlot;
  const sectionId = "writing-performance";
  const itemId = itemIdFor(family.formId, sectionId, sectionSlot);
  const evidenceBindings = evidenceRefsFor(
    family,
    "reading",
    [1, 2, 3],
  );
  return {
    itemId,
    ...commonItemFields({
      itemId,
      formId: family.formId,
      family,
      sectionId,
      localSlot,
      difficultyBand: DIFFICULTY_BY_SECTION[sectionId][index],
    }),
    construct:
      index === 0
        ? "evidence-bounded-written-summary"
        : "evidence-bounded-written-argument",
    modality: "reviewed-human-rated-performance-pending",
    sourceEntityKey: `${family.sourceFamilyId}:writing-${localSlot}`,
    sourceSnapshotSha256: jsonSha256({
      sourceTextSha256s: evidenceBindings.map((ref) => ref.textSha256),
      promptVi: spec.promptVi,
    }),
    promptVi: spec.promptVi,
    sourceTextIds: evidenceBindings.map((ref) => ref.textId),
    evidenceRefs: evidenceBindings,
    evidenceBindings,
    requiredMovesVi: spec.requiredMovesVi,
    rationaleVi:
      "Bài viết phải phân biệt dữ kiện, diễn giải và giới hạn, không mở rộng vượt nguồn.",
    scopeBoundaryVi: draft.scopeBoundaryVi,
    responseContract: {
      ...spec.responseContract,
      firstDraftRequired: true,
      humanRatingRequired: true,
      modelResponseVisible: false,
      revisionPassesDuringScoredForm: 0,
    },
    rubricId: WRITING_RUBRIC.rubricId,
    rubricDraft: WRITING_RUBRIC,
    evidencePolicy: {
      contributesOnlyTo: "writing",
      readingEvidenceGranted: false,
      humanRatingRequired: true,
    },
  };
});

const buildItems = (sources, inventory) =>
  FORM_IDS.flatMap((formId) => {
    const formDrafts = FAMILY_DRAFTS.filter(
      (draft) => draft.formId === formId,
    );
    return formDrafts.flatMap((draft, domainIndex) => {
      const family = sources.find(
        (candidate) =>
          candidate.formId === formId
          && candidate.domainKey === draft.domainKey,
      );
      assert(family, `Missing source family for ${formId}/${draft.domainKey}`);
      return [
        ...buildComprehensionItems({
          draft,
          family,
          domainIndex,
          sectionId: "listening-objective",
          sourceKind: "listening",
        }),
        ...buildComprehensionItems({
          draft,
          family,
          domainIndex,
          sectionId: "reading-objective",
          sourceKind: "reading",
        }),
        ...buildLanguageItems({
          drafts: buildOfficialVocabularyDrafts(family, inventory),
          family,
          domainIndex,
          sectionId: "vocabulary-objective",
        }),
        ...buildLanguageItems({
          drafts: buildOfficialGrammarDrafts(family, inventory),
          family,
          domainIndex,
          sectionId: "grammar-objective",
        }),
        ...buildSpeakingItems({ draft, family, domainIndex }),
        ...buildWritingItems({ draft, family, domainIndex }),
      ];
    });
  });

const buildForms = (sources, items) =>
  FORM_IDS.map((formId) => {
    const formSources = sources.filter(
      (source) => source.formId === formId,
    );
    const formItems = items.filter((item) => item.formId === formId);
    return {
      formId,
      poolId: `${formId}:assessment-pool-v1`,
      state: "assessment-authored-repository-exposed-draft",
      learnerVisible: false,
      eligibleForIssuance: false,
      eligibleForCalibration: false,
      timeLimitSeconds: null,
      passingStandard: null,
      answerKeyServerConfidentialRequired: true,
      sourceEntityOverlapWithOtherForm: 0,
      sourceFamilyIds: formSources.map((source) => source.sourceFamilyId),
      sourceTextIds: formSources.flatMap((source) => source.textIds),
      sourceFamilyOverlapWithOtherForm: 0,
      sourceTextOverlapWithOtherForm: 0,
      sections: SECTION_IDS.map((sectionId) => {
        const sectionItems = formItems.filter(
          (item) => item.sectionId === sectionId,
        );
        return {
          sectionId,
          skill: SECTION_SKILLS[sectionId],
          itemIds: sectionItems.map((item) => item.itemId),
          itemCount: sectionItems.length,
        };
      }),
      difficultyCounts: countBy(
        formItems,
        (item) => item.difficultyBand,
      ),
      itemCount: formItems.length,
    };
  });

const objectiveMockSlotsByDomain = [
  [1, 2],
  [1, 2],
  [2, 3],
  [2, 3],
  [1, 3],
  [1, 3],
];
const performanceMockSlotsByDomain = {
  "speaking-performance": new Map([
    [0, 1],
    [2, 2],
    [4, 1],
  ]),
  "writing-performance": new Map([
    [1, 1],
    [3, 2],
    [5, 2],
  ]),
};

const buildMockBlueprint = (sources, items) => {
  const mockForms = FORM_IDS.map((formId) => {
    const formSources = sources.filter(
      (source) => source.formId === formId,
    );
    const selected = SECTION_IDS.flatMap((sectionId) => {
      if (OBJECTIVE_SECTION_IDS.includes(sectionId)) {
        return formSources.flatMap((family, domainIndex) =>
          objectiveMockSlotsByDomain[domainIndex].map((localSlot) =>
            items.find(
              (item) =>
                item.formId === formId
                && item.sourceFamilyId === family.sourceFamilyId
                && item.sectionId === sectionId
                && item.equivalentGroupId.endsWith(
                  `slot-${String(localSlot).padStart(2, "0")}`,
                ),
            )
          )
        );
      }
      return [...performanceMockSlotsByDomain[sectionId]].map(
        ([domainIndex, localSlot]) => {
          const family = formSources[domainIndex];
          return items.find(
            (item) =>
              item.formId === formId
              && item.sourceFamilyId === family.sourceFamilyId
              && item.sectionId === sectionId
              && item.equivalentGroupId.endsWith(
                `slot-${String(localSlot).padStart(2, "0")}`,
              ),
          );
        },
      );
    });
    assert(
      selected.every(Boolean),
      `Mock selection could not resolve every item for ${formId}`,
    );
    const selectedItemIds = selected.map((item) => item.itemId);
    const formItems = items.filter((item) => item.formId === formId);
    const alternateItemIds = formItems
      .filter((item) => !selectedItemIds.includes(item.itemId))
      .map((item) => item.itemId);
    return {
      formId,
      mockFormId: `${formId}:timed-mock-rehearsal-v1`,
      state: "source-exposed-timed-rehearsal-draft",
      learnerVisible: false,
      eligibleForIssuance: false,
      eligibleForScoring: false,
      plannedDurationSeconds: 6_000,
      passingStandard: null,
      selectedItemIds,
      alternateItemIds,
      selectedItemCount: selectedItemIds.length,
      alternateItemCount: alternateItemIds.length,
      sourceFamilyIds: formSources.map(
        (source) => source.sourceFamilyId,
      ),
      sourceTextIds: formSources.flatMap((source) => source.textIds),
      sections: SECTION_IDS.map((sectionId) => {
        const sectionItems = selected.filter(
          (item) => item.sectionId === sectionId,
        );
        return {
          sectionId,
          skill: SECTION_SKILLS[sectionId],
          itemIds: sectionItems.map((item) => item.itemId),
          itemCount: sectionItems.length,
          timeLimitSeconds:
            MOCK_SECTION_SPECS[sectionId].timeLimitSeconds,
        };
      }),
      difficultyCounts: countBy(
        selected,
        (item) => item.difficultyBand,
      ),
    };
  });
  return {
    blueprintId: "hsk4-timed-mock-blueprint-2026.07",
    state: "planned-uncalibrated-draft",
    plannedDurationSeconds: 6_000,
    operationalAllowanceSeconds: 300,
    learnerVisible: false,
    scoringAuthority: "none-before-review-and-calibration",
    answerKeyAuthority: "repository-authoring-only-not-confidential",
    equivalentSelectionRequiredAcrossForms: true,
    sourceDisjointFormsRequired: true,
    eligibleForIssuance: false,
    passingStandard: null,
    forms: mockForms,
  };
};

const buildReviewBatches = (sources, items) =>
  FORM_IDS.flatMap((formId) =>
    SECTION_IDS.map((sectionId) => {
      const batchItems = items.filter(
        (item) =>
          item.formId === formId && item.sectionId === sectionId,
      );
      const sourceTextIds = unique(
        batchItems.flatMap((item) => item.sourceTextIds ?? []),
      );
      const rubricIds = unique(
        batchItems.map((item) => item.rubricId).filter(Boolean),
      );
      const requiredRoles = [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ];
      if (
        sectionId === "listening-objective"
        || sectionId === "speaking-performance"
      ) {
        requiredRoles.push("audio-rights-reviewer");
      }
      if (sectionId === "speaking-performance") {
        requiredRoles.push("speaking-pedagogy-reviewer");
      }
      if (sectionId === "writing-performance") {
        requiredRoles.push("writing-pedagogy-reviewer");
      }
      return {
        batchId: `${BANK_ID}:${formId}:${sectionId}:review-v1`,
        formId,
        sectionId,
        sourceFamilyIds: unique(
          batchItems.map((item) => item.sourceFamilyId),
        ),
        sourceTextIds,
        itemIds: batchItems.map((item) => item.itemId),
        rubricIds,
        requiredRoles,
        reviewedAudioRequired:
          sectionId === "listening-objective"
          || sectionId === "speaking-performance",
        reviewedRubricRequired:
          PERFORMANCE_SECTION_IDS.includes(sectionId),
        state: "pending",
        approvals: [],
      };
    })
  );

const loadLearningChain = (root) =>
  LEARNING_SOURCE_PATHS.map((relativePath) => {
    const path = resolve(root, relativePath);
    const artifact = JSON.parse(readFileSync(path, "utf8"));
    return {
      sourceId: artifact.packId ?? artifact.scopeId ?? artifact.draftId,
      relativePath,
      sha256: fileSha256(path),
    };
  });

const collectLearningTexts = (root) =>
  LEARNING_SOURCE_PATHS.flatMap((relativePath) => {
    const artifact = JSON.parse(
      readFileSync(resolve(root, relativePath), "utf8"),
    );
    return (artifact.lessons ?? []).flatMap((lesson) =>
      (lesson.texts ?? []).map((text) => ({
        textId: text.textId,
        normalizedHanziSha256: sha256(
          normalizeHanzi(
            (text.paragraphs ?? []).map(
              (entry) => entry.hanzi,
            ).join(""),
          ),
        ),
      }))
    );
  });

const assertBankShape = ({
  sources,
  items,
  forms,
  mockBlueprint,
  reviewBatches,
  learningTexts,
}) => {
  assert(sources.length === 12, "HSK4 assessment must have 12 source families");
  assert(
    unique(sources.map((source) => source.sourceFamilyId)).length === 12,
    "HSK4 assessment source family IDs must be unique",
  );
  assert(
    unique(sources.flatMap((source) => source.textIds)).length === 24,
    "HSK4 assessment must have 24 unique source texts",
  );
  assert(
    unique(sources.flatMap((source) => source.textSha256s)).length === 24,
    "HSK4 assessment source text snapshots must be unique",
  );
  assert(
    sources.every(
      (source) =>
        source.readingSource.paragraphs.length === 3
        && source.listeningSource.paragraphs.length === 3
        && source.learningReuse === false,
    ),
    "Each HSK4 assessment family needs two three-paragraph new sources",
  );
  for (const formId of FORM_IDS) {
    const formSources = sources.filter(
      (source) => source.formId === formId,
    );
    assert(formSources.length === 6, `${formId} must have six source families`);
    assert(
      unique(formSources.map((source) => source.domainId)).length === 6,
      `${formId} must have exactly one source family per domain`,
    );
    const formItems = items.filter((item) => item.formId === formId);
    assert(formItems.length === 96, `${formId} must have 96 pool items`);
    for (const family of formSources) {
      const familyItems = formItems.filter(
        (item) => item.sourceFamilyId === family.sourceFamilyId,
      );
      assert(
        familyItems.length === 16,
        `${family.sourceFamilyId} must own 16 items`,
      );
      const sectionCounts = countBy(
        familyItems,
        (item) => item.sectionId,
      );
      assert(
        sectionCounts["listening-objective"] === 3
        && sectionCounts["reading-objective"] === 3
        && sectionCounts["vocabulary-objective"] === 3
        && sectionCounts["grammar-objective"] === 3
        && sectionCounts["speaking-performance"] === 2
        && sectionCounts["writing-performance"] === 2,
        `${family.sourceFamilyId} has an invalid item partition`,
      );
    }
    for (const sectionId of SECTION_IDS) {
      assert(
        formItems.filter((item) => item.sectionId === sectionId)
          .length === SECTION_ITEM_COUNTS[sectionId],
        `${formId}/${sectionId} has an invalid pool count`,
      );
    }
    const difficultyCounts = countBy(
      formItems,
      (item) => item.difficultyBand,
    );
    assert(
      difficultyCounts.core === 24
      && difficultyCounts.standard === 48
      && difficultyCounts.stretch === 24,
      `${formId} has an invalid difficulty distribution`,
    );
  }
  assert(items.length === 192, "HSK4 assessment must have 192 items");
  assert(
    unique(items.map((item) => item.itemId)).length === 192,
    "HSK4 assessment item IDs must be unique",
  );
  const equivalentGroups = countBy(
    items,
    (item) => item.equivalentGroupId,
  );
  assert(
    Object.keys(equivalentGroups).length === 96
    && Object.values(equivalentGroups).every((count) => count === 2),
    "HSK4 assessment needs 96 exact A/B equivalent pairs",
  );
  assert(forms.length === 2, "HSK4 assessment requires two forms");
  const formSourceSets = forms.map(
    (form) => new Set(form.sourceTextIds),
  );
  assert(
    [...formSourceSets[0]].every(
      (textId) => !formSourceSets[1].has(textId),
    ),
    "HSK4 assessment forms cannot overlap source texts",
  );
  const learningIds = new Set(
    learningTexts.map((entry) => entry.textId),
  );
  const learningHashes = new Set(
    learningTexts.map((entry) => entry.normalizedHanziSha256),
  );
  for (const source of sources) {
    for (const text of [
      source.readingSource,
      source.listeningSource,
    ]) {
      assert(
        !learningIds.has(text.textId),
        `${text.textId} reuses a learning text ID`,
      );
      const contentHash = sha256(
        normalizeHanzi(text.contentHanzi),
      );
      assert(
        !learningHashes.has(contentHash),
        `${text.textId} exactly reuses learning Hanzi content`,
      );
    }
  }
  assert(
    reviewBatches.length === 12,
    "HSK4 assessment needs 12 review batches",
  );
  assert(
    mockBlueprint.forms.every((form) => {
      const sectionCounts = Object.fromEntries(
        form.sections.map((section) => [
          section.sectionId,
          section.itemCount,
        ]),
      );
      return (
        form.plannedDurationSeconds === 6_000
        && form.selectedItemCount === 54
        && form.alternateItemCount === 42
        && SECTION_IDS.every(
          (sectionId) =>
            sectionCounts[sectionId]
            === MOCK_SECTION_SPECS[sectionId].itemCount,
        )
      );
    }),
    "HSK4 mock selections must contain 54 items and last 6000 seconds",
  );
};

export const buildHsk4LevelAssessment = (root = process.cwd()) => {
  const learningChain = loadLearningChain(root);
  const learningTexts = collectLearningTexts(root);
  const assessmentInventory = loadAssessmentInventory(root);
  const sources = buildSources();
  const items = buildItems(sources, assessmentInventory);
  const forms = buildForms(sources, items);
  const mockBlueprint = buildMockBlueprint(sources, items);
  const reviewBatches = buildReviewBatches(sources, items);
  assertBankShape({
    sources,
    items,
    forms,
    mockBlueprint,
    reviewBatches,
    learningTexts,
  });
  const integrationTip = learningChain.at(-1);
  const assessmentTextIds = sources.flatMap(
    (source) => source.textIds,
  );
  const learningTextIdSet = new Set(
    learningTexts.map((entry) => entry.textId),
  );
  const assessmentContentHashes = sources.flatMap((source) =>
    [source.readingSource, source.listeningSource].map((text) =>
      sha256(normalizeHanzi(text.contentHanzi))
    )
  );
  const learningContentHashSet = new Set(
    learningTexts.map((entry) => entry.normalizedHanziSha256),
  );
  const audioDependentItems = items.filter(
    (item) =>
      item.sectionId === "listening-objective"
      || item.sectionId === "speaking-performance",
  );
  return {
    schemaVersion: 1,
    bankId: BANK_ID,
    level: 4,
    state: "uncalibrated-assessment-authored-repository-exposed-draft",
    learnerVisible: false,
    runtimeImportEligible: false,
    releaseEligible: false,
    source: {
      sourceTipPackId: integrationTip.sourceId,
      sourceTipPackSha256: integrationTip.sha256,
      sourceChain: learningChain.map((entry) => ({
        sourceId: entry.sourceId,
        sha256: entry.sha256,
      })),
      sourceChainSha256: jsonSha256(learningChain),
      sourceArtifactCount: learningChain.length,
      learningTextCount: learningTexts.length,
      overlapProof: {
        assessmentTextIdOverlapWithLearning:
          assessmentTextIds.filter((textId) =>
            learningTextIdSet.has(textId)
          ).length,
        assessmentHanziContentOverlapWithLearning:
          assessmentContentHashes.filter((hash) =>
            learningContentHashSet.has(hash)
          ).length,
        crossFormSourceFamilyOverlap: 0,
        crossFormTextIdOverlap: 0,
        crossFormTextSnapshotOverlap: 0,
      },
    },
    authorship: {
      method:
        "deterministic-new-source-ai-assisted-hsk4-assessment-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      speakingPedagogyReviewer: null,
      writingPedagogyReviewer: null,
      audioRightsReviewer: null,
    },
    policy: {
      oneSkillPerItem: true,
      onePrimarySkillPerItem: true,
      dedicatedAssessmentSourcesRequired: true,
      zeroLearningSourceOverlapRequired: true,
      exactLearningTextReuseForbidden: true,
      sourceDisjointEquivalentFormsRequired: true,
      reviewedAudioRequiredForListeningAndSpeaking: true,
      reviewedRubricRequiredForSpeakingAndWriting: true,
      independentNonoverlappingFormsRequiredBeforeCalibration: true,
      repositorySourceExposureBlocksIssuance: true,
      answersMustBeServerConfidentialBeforeIssuance: true,
      repositoryExposureBlocksConfidentialIssuance: true,
      serverConfidentialAnswerKeyRequiredBeforeIssuance: true,
      humanReviewDoesNotCalibrate: true,
      calibrationRequiredForMeasurement: true,
      noRuntimeImportBeforeAllGates: true,
      assessmentCannotBackfillPracticeMastery: true,
      supportModalityCannotGrantAnotherSkill: true,
      timedPracticeCannotGrantMastery: true,
    },
    coverageClaims: {
      assessmentAuthoredSourceFamilies: "12/12",
      sourceDomainsPerForm: "6/6",
      itemPoolPerForm: "96/96",
      equivalentGroups: "96/96",
      officialVocabularyBindings: "36/36",
      officialGrammarBindings: "36/36",
      officialInventoryBindingsComplete: true,
      timedMockSelectionPerForm: "54/54",
      dedicatedSourceFamiliesDraftComplete: true,
      sourceDisjointFormPoolsDraftComplete: true,
      timedMockBlueprintDraftComplete: true,
      learningSourceOverlap: "0/24",
      independentSourceDisjointPoolsDraftComplete: true,
      independentConfidentialFormsComplete: false,
      confidentialFormsComplete: false,
      reviewedAssessmentComplete: false,
      reviewedAudioComplete: false,
      reviewedRubricsComplete: false,
      calibratedAssessmentComplete: false,
      hsk4LevelCheckComplete: false,
      hsk4Complete: false,
    },
    calibration: {
      required: true,
      pilotSampleSize: 0,
      reliabilityEstimate: null,
      sectionReliabilityEstimates: null,
      difficultyParameters: null,
      itemDifficultyEstimates: null,
      itemDiscriminationEstimates: null,
      interRaterReliability: null,
      timingPercentiles: null,
      formEquating: null,
      cutScore: null,
      sectionMinimums: null,
      scoringAuthority: "none",
    },
    rubricDrafts: [SPEAKING_RUBRIC, WRITING_RUBRIC],
    sources,
    items,
    forms,
    mockBlueprint,
    reviewBatches,
    counts: {
      forms: forms.length,
      itemsPerForm: 96,
      totalItems: items.length,
      objectiveItems: items.filter((item) =>
        OBJECTIVE_SECTION_IDS.includes(item.sectionId)
      ).length,
      constructedResponseItems: items.filter((item) =>
        PERFORMANCE_SECTION_IDS.includes(item.sectionId)
      ).length,
      listeningItems: items.filter(
        (item) => item.sectionId === "listening-objective",
      ).length,
      readingItems: items.filter(
        (item) => item.sectionId === "reading-objective",
      ).length,
      vocabularyItems: items.filter(
        (item) => item.sectionId === "vocabulary-objective",
      ).length,
      grammarItems: items.filter(
        (item) => item.sectionId === "grammar-objective",
      ).length,
      officialVocabularyBindings: unique(
        items
          .filter((item) => item.sectionId === "vocabulary-objective")
          .map((item) => item.officialVocabularyId),
      ).length,
      officialGrammarBindings: unique(
        items
          .filter((item) => item.sectionId === "grammar-objective")
          .map((item) => item.grammarRowId),
      ).length,
      speakingItems: items.filter(
        (item) => item.sectionId === "speaking-performance",
      ).length,
      writingItems: items.filter(
        (item) => item.sectionId === "writing-performance",
      ).length,
      audioDependentItems: audioDependentItems.length,
      sourceFamilies: sources.length,
      sourceFamiliesPerForm: 6,
      equivalentGroups: 96,
      sourceIdOverlapBetweenForms: 0,
      sourceExposureOverlapBetweenForms: 0,
      sourceTextHashOverlapBetweenForms: 0,
      sourceContentOverlapBetweenForms: 0,
      learningSourceIdOverlap: 0,
      learningSourceTextHashOverlap: 0,
      learningSourceContentOverlap: 0,
      mockItemsPerForm: 54,
      mockAlternateItemsPerForm: 42,
      mockPlannedDurationSeconds: 6_000,
      reviewBatches: reviewBatches.length,
      reviewedItems: 0,
      reviewedAudioItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      prerequisiteWaiverEligibleItems: 0,
      releaseEligibleItems: 0,
    },
  };
};

export const serializeHsk4LevelAssessment = (bank) =>
  `${JSON.stringify(bank, null, 2)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH,
  );
  const serialized = serializeHsk4LevelAssessment(
    buildHsk4LevelAssessment(),
  );
  if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK4 level assessment is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH,
    mode: process.argv.includes("--check") ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
