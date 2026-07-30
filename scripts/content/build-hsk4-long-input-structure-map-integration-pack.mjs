import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4IntegrationStagePack,
  serializeHsk4IntegrationStagePack,
} from "./hsk4-integration-stage-builder.mjs";
import {
  HSK4_LONG_INPUT_STRUCTURE_MAP_CONFIG,
  HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH,
} from "../../src/content/hsk4LongInputStructureMapIntegrationPack.mjs";
import {
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
  loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle,
} from "../../src/content/hsk4ArgumentLogicConcessionSummaryArgumentPack.mjs";

const STRUCTURE_MAP =
  "long-form-listening-reading-structure-map";
const EVIDENCE_CHECK = "source-evidence-check";
const GUIDED_INTEGRATION = "guided-integration";

const ref = (textId, ...paragraphIds) => ({ textId, paragraphIds });
const allParagraphs = (textId, prefix) =>
  ref(textId, `${prefix}1`, `${prefix}2`, `${prefix}3`);

const responseContract = (skill, minimumSources) => skill === "writing"
  ? {
    unit: "hanzi",
    minimum: 80,
    maximum: 160,
    requiredSections: 3,
    revisionPasses: 2,
    minimumSources,
  }
  : {
    unit: "evidence-notes",
    minimum: 4,
    maximum: 8,
    requiredSections: 3,
    revisionPasses: 1,
    minimumSources,
  };

const prompt = ({
  kind,
  primarySkill,
  evidenceRefs,
  promptVi,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
}) => ({
  kind,
  primarySkill,
  supportingSkills: primarySkill === "writing"
    ? ["listening", "reading"]
    : ["writing"],
  promptVi,
  evidenceRefs,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
  responseContract: responseContract(
    primarySkill,
    primarySkill === "writing" ? 4 : 2,
  ),
  timeLimitSeconds: null,
});

const makeLesson = (spec) => {
  const listeningRefs = [
    allParagraphs(spec.listeningA, "lp"),
    allParagraphs(spec.listeningB, "lp"),
  ];
  const readingRefs = [
    allParagraphs(spec.readingA, "rp"),
    allParagraphs(spec.readingB, "rp"),
  ];
  const mixedRefs = [
    ...readingRefs,
    ...listeningRefs,
  ];
  const listeningMoves = [
    "ghi vấn đề mở đầu của từng nguồn",
    "đánh dấu bước chuyển hoặc điều chỉnh",
    "ghi riêng kết quả và giới hạn cuối nguồn",
  ];
  const readingMoves = [
    "đặt nhãn chức năng cho ba đoạn",
    "nối tác nhân, hành động và bằng chứng",
    "tách kết luận khỏi điều chưa được chứng minh",
  ];
  const writingMoves = [
    "dùng đủ bốn nguồn đã bind",
    "tổ chức thành mở–phát triển–giới hạn",
    "ghi rõ nguồn cho mỗi quan hệ chính",
    "sửa ít nhất hai chỗ sau khi xem model",
  ];
  return {
    sourceTextIds: [
      spec.readingA,
      spec.listeningA,
      spec.readingB,
      spec.listeningB,
    ],
    promptUnits: [
      prompt({
        kind: STRUCTURE_MAP,
        primarySkill: "listening",
        evidenceRefs: listeningRefs,
        promptVi:
          `Nghe hai nguồn về ${spec.focusVi}; dựng hai sơ đồ gồm vấn đề mở đầu, diễn biến chính và giới hạn kết luận.`,
        modelHanzi: spec.listeningMapHanzi,
        modelVi: spec.listeningMapVi,
        requiredMovesVi: listeningMoves,
        scopeBoundaryVi:
          "Sơ đồ chỉ mô tả trình tự được nghe; không biến việc xảy ra trước thành nguyên nhân chắc chắn.",
      }),
      prompt({
        kind: STRUCTURE_MAP,
        primarySkill: "listening",
        evidenceRefs: listeningRefs,
        promptVi:
          `Nghe lại hai nguồn về ${spec.focusVi}; xác định điểm chuyển khiến kế hoạch ban đầu phải được sửa và ghi bằng chứng.`,
        modelHanzi:
          `${spec.listeningMapHanzi} 两段材料的转折都来自新信息，不能只按最后结果倒推原计划一定错误。`,
        modelVi:
          `${spec.listeningMapVi} Điểm chuyển ở cả hai nguồn đến từ thông tin mới; không được dùng kết quả cuối để suy ngược rằng kế hoạch ban đầu chắc chắn sai.`,
        requiredMovesVi: [
          "ghi kế hoạch hoặc nhận định ban đầu",
          "ghi thông tin mới tạo điểm chuyển",
          "nêu phản ứng sau điểm chuyển",
          "giữ giới hạn cuối nguồn",
        ],
        scopeBoundaryVi:
          "Điểm chuyển giải thích cấu trúc tường thuật, không tự chứng minh một biện pháp là nguyên nhân duy nhất.",
      }),
      prompt({
        kind: STRUCTURE_MAP,
        primarySkill: "reading",
        evidenceRefs: readingRefs,
        promptVi:
          `Đọc hai văn bản về ${spec.focusVi}; đặt nhãn chức năng cho từng đoạn và nối các quan hệ tác nhân–hành động–kết quả.`,
        modelHanzi: spec.readingMapHanzi,
        modelVi: spec.readingMapVi,
        requiredMovesVi: readingMoves,
        scopeBoundaryVi:
          "Nhãn đoạn phải bám nội dung thật; không gán cùng một cấu trúc chỉ vì hai văn bản có ba đoạn.",
      }),
      prompt({
        kind: STRUCTURE_MAP,
        primarySkill: "reading",
        evidenceRefs: readingRefs,
        promptVi:
          `Đối chiếu cách hai văn bản về ${spec.focusVi} chuyển từ dữ kiện sang điều chỉnh rồi tới kết luận có giới hạn.`,
        modelHanzi:
          `${spec.readingMapHanzi} 阅读图要把观察、行动和评价分层，尤其不能把局部变化写成普遍结果。`,
        modelVi:
          `${spec.readingMapVi} Sơ đồ đọc phải tách quan sát, hành động và đánh giá, đặc biệt không biến thay đổi cục bộ thành kết quả phổ quát.`,
        requiredMovesVi: [
          "trích dấu hiệu chuyển đoạn",
          "ghi loại bằng chứng ở đoạn giữa",
          "nêu phạm vi kết luận đoạn cuối",
        ],
        scopeBoundaryVi:
          "So sánh vai trò đoạn, không được hợp nhất hai bối cảnh thành một câu chuyện hoặc một mẫu đại diện.",
      }),
      prompt({
        kind: EVIDENCE_CHECK,
        primarySkill: "listening",
        evidenceRefs: listeningRefs,
        promptVi:
          `Kiểm tra sơ đồ nghe về ${spec.focusVi}: chọn hai quan hệ được nguồn hỗ trợ và một quan hệ cần thu hẹp.`,
        modelHanzi: spec.listeningEvidenceHanzi,
        modelVi: spec.listeningEvidenceVi,
        requiredMovesVi: [
          "nêu hai quan hệ có bằng chứng",
          "chỉ đoạn nghe hỗ trợ mỗi quan hệ",
          "sửa một kết luận vượt nguồn",
        ],
        scopeBoundaryVi:
          "Chỉ dùng chi tiết có trong transcript đã bind; TTS và việc nhớ ý chung không thay thế bằng chứng đoạn.",
      }),
      prompt({
        kind: EVIDENCE_CHECK,
        primarySkill: "reading",
        evidenceRefs: readingRefs,
        promptVi:
          `Kiểm tra sơ đồ đọc về ${spec.focusVi}: xác nhận chuỗi thông tin và đánh dấu nơi nguồn giữ lại bất định.`,
        modelHanzi: spec.readingEvidenceHanzi,
        modelVi: spec.readingEvidenceVi,
        requiredMovesVi: [
          "nêu chuỗi thông tin chính",
          "trỏ hai đoạn làm bằng chứng",
          "ghi một bất định hoặc giới hạn",
        ],
        scopeBoundaryVi:
          "Một chi tiết đúng không đủ xác nhận toàn bộ chuỗi; từng mũi tên trong sơ đồ phải truy được về nguồn.",
      }),
      prompt({
        kind: GUIDED_INTEGRATION,
        primarySkill: "writing",
        evidenceRefs: mixedRefs,
        promptVi:
          `Dùng cả bốn nguồn về ${spec.focusVi} viết 80–160 chữ Hán giải thích hai kiểu tổ chức thông tin và bằng chứng tương ứng.`,
        modelHanzi: spec.crossMapHanzi,
        modelVi: spec.crossMapVi,
        requiredMovesVi: writingMoves,
        scopeBoundaryVi:
          "Bài viết tích hợp cấu trúc, không cộng các kết quả khác bối cảnh thành một kết luận nhân quả chung.",
      }),
      prompt({
        kind: GUIDED_INTEGRATION,
        primarySkill: "writing",
        evidenceRefs: mixedRefs,
        promptVi:
          `Viết lại sơ đồ tích hợp về ${spec.focusVi}: thêm nhãn nguồn, một điểm đối chiếu nghe–đọc và câu giới hạn cuối.`,
        modelHanzi:
          `${spec.crossMapHanzi} 修改时应给每个关键关系标出来源，并说明这些案例只能展示组织方法，不能代表所有情境。`,
        modelVi:
          `${spec.crossMapVi} Khi sửa cần gắn nguồn cho mỗi quan hệ chính và nói rõ các trường hợp chỉ minh họa cách tổ chức, không đại diện mọi tình huống.`,
        requiredMovesVi: [
          "giữ đủ hai domain và hai modality",
          "thêm nhãn nguồn cho quan hệ chính",
          "đối chiếu một điểm giống và một điểm khác",
          "sửa ít nhất hai chỗ rồi nộp bản cuối",
        ],
        scopeBoundaryVi:
          "Model chỉ mở vòng revision; việc xem hoặc chép model không tạo bằng chứng viết và không cấp mastery.",
      }),
    ],
  };
};

const CONTENT = {
  "hsk4-long-input-structure-map-lesson-01": makeLesson({
    focusVi: "quá trình thay đổi kế hoạch cá nhân và học tập",
    readingA:
      "hsk4-personal-community-analysis-process-timeline:reading-01",
    listeningA:
      "hsk4-personal-community-analysis-process-timeline:listening-01",
    readingB:
      "hsk4-education-work-evaluation-process-timeline:reading-01",
    listeningB:
      "hsk4-education-work-evaluation-process-timeline:listening-01",
    listeningMapHanzi:
      "旅行材料按漏查通知、遇到堵车、改乘地铁、及时到达和建立检查表推进；校园活动按消息不清、访问学生、补充流程、雨天换场和问卷限制推进。",
    listeningMapVi:
      "Nguồn du lịch đi từ bỏ sót thông báo, kẹt xe, đổi tàu, đến kịp rồi lập bảng kiểm; nguồn sự kiện đi từ thông báo mơ hồ, hỏi sinh viên, bổ sung quy trình, đổi địa điểm vì mưa tới giới hạn phiếu.",
    readingMapHanzi:
      "家庭聚餐从长辈独自准备变成多人分工，听力小组则从只比分数变成记录错误、分类练习和调整计划；两文最后都保留适用范围。",
    readingMapVi:
      "Bữa cơm gia đình chuyển từ người lớn chuẩn bị sang nhiều thế hệ phân vai; nhóm nghe chuyển từ chỉ so điểm sang ghi lỗi, luyện theo loại và điều chỉnh, cả hai đều giữ giới hạn cuối.",
    listeningEvidenceHanzi:
      "堵车后的换乘和雨天后的换场都有直接行动证据；顺利到达与活动难忘却不能只归给一次调整，因为两篇都记录了其他条件。",
    listeningEvidenceVi:
      "Đổi phương tiện sau kẹt xe và đổi phòng sau mưa có bằng chứng hành động trực tiếp; đến kịp và sự kiện đáng nhớ không thể chỉ quy cho một điều chỉnh vì hai nguồn còn điều kiện khác.",
    readingEvidenceHanzi:
      "家庭材料支持角色重新分配，学习材料支持错误类型不同；它们不支持所有家庭或全部新生都会得到相同结果。",
    readingEvidenceVi:
      "Nguồn gia đình hỗ trợ kết luận vai trò được phân lại, nguồn học hỗ trợ lỗi khác nhau; chúng không chứng minh mọi gia đình hay mọi tân sinh viên có cùng kết quả.",
    crossMapHanzi:
      "四篇材料都先呈现原计划，再用新信息推动调整，最后说明结果与限制。旅行和校园活动突出突发变化；聚餐和听力小组突出长期分工与反馈。结构相似不等于原因相同。",
    crossMapVi:
      "Bốn nguồn đều nêu kế hoạch cũ, dùng thông tin mới thúc đẩy điều chỉnh rồi nói kết quả và giới hạn. Du lịch/sự kiện nhấn biến cố; bữa cơm/nhóm nghe nhấn phân vai và phản hồi dài hơn. Cấu trúc giống không có nghĩa nguyên nhân giống.",
  }),
  "hsk4-long-input-structure-map-lesson-02": makeLesson({
    focusVi: "vai trò con người và tiến trình thử nghiệm",
    readingA:
      "hsk4-education-work-evaluation-concept-actor-map:reading-01",
    listeningA:
      "hsk4-education-work-evaluation-concept-actor-map:listening-01",
    readingB:
      "hsk4-nature-technology-explanation-process-timeline:reading-01",
    listeningB:
      "hsk4-nature-technology-explanation-process-timeline:listening-01",
    listeningMapHanzi:
      "桥梁模型课程按设计、制作、测试和修改组织，并区分老师、师傅与学生；自然步道按扫码、增加问题、离线调整和多指标评价推进。",
    listeningMapVi:
      "Khóa mô hình cầu tổ chức theo thiết kế, chế tạo, thử và sửa, đồng thời tách giáo viên, thợ, học sinh; đường mòn đi từ quét mã, thêm câu hỏi, chỉnh offline đến đánh giá nhiều chỉ số.",
    readingMapHanzi:
      "职业选择文先区分课程教师、导师、学生和机会提供者，再说明选择证据；海草文按测量、试种、比较、受损和调整五段记录恢复。",
    readingMapVi:
      "Bài chọn nghề trước hết tách giáo viên môn, cố vấn, sinh viên và người tạo cơ hội rồi nêu bằng chứng lựa chọn; bài cỏ biển ghi năm chặng đo, thử trồng, so, hư hại và điều chỉnh.",
    listeningEvidenceHanzi:
      "模型课证明不同角色检查不同对象，步道项目证明扫码次数不能单独代表理解；两者都要求把工具、行动和评价分开。",
    listeningEvidenceVi:
      "Khóa mô hình chứng minh các vai kiểm tra đối tượng khác nhau, dự án đường mòn chứng minh lượt quét không tự đại diện hiểu biết; cả hai yêu cầu tách công cụ, hành động, đánh giá.",
    readingEvidenceHanzi:
      "职业材料只说明三十名学生的渐进选择，海草材料只支持部分区域恢复可行；导师建议不是录取保证，鱼增加也不能只归因于海草。",
    readingEvidenceVi:
      "Nguồn nghề chỉ mô tả lựa chọn dần của 30 sinh viên, nguồn cỏ biển chỉ hỗ trợ phục hồi cục bộ; lời cố vấn không bảo đảm tuyển dụng và cá tăng không chỉ do cỏ biển.",
    crossMapHanzi:
      "四篇材料把复杂任务拆成角色图与时间线：角色图回答谁提供何种知识，时间线回答何时测试和调整。完整结构还要在结尾标出样本、地点与未验证关系。",
    crossMapVi:
      "Bốn nguồn tách nhiệm vụ phức tạp thành bản đồ vai trò và dòng thời gian: bản đồ trả lời ai cung cấp tri thức nào, timeline trả lời khi nào thử và sửa. Kết cấu đầy đủ phải ghi mẫu, nơi và quan hệ chưa xác nhận.",
  }),
  "hsk4-long-input-structure-map-lesson-03": makeLesson({
    focusVi: "hệ thống vai trò và quá trình mở rộng kinh tế–công nghệ",
    readingA:
      "hsk4-nature-technology-explanation-concept-actor-map:reading-01",
    listeningA:
      "hsk4-nature-technology-explanation-concept-actor-map:listening-01",
    readingB:
      "hsk4-society-economy-argument-process-timeline:reading-01",
    listeningB:
      "hsk4-society-economy-argument-process-timeline:listening-01",
    listeningMapHanzi:
      "低温温室先列材料、保温层和传感器，再区分工程、教学与维护责任；村桥材料先报通行变化，再加入网络传播、节日活动和后续记录。",
    listeningMapVi:
      "Nguồn nhà kính liệt kê vật liệu, lớp giữ nhiệt, cảm biến rồi tách trách nhiệm kỹ thuật, dạy và bảo trì; nguồn cây cầu nêu giao thông thay đổi rồi thêm lan truyền mạng, lễ hội và ghi chép sau.",
    readingMapHanzi:
      "保护站用研究员、护林员和居民构成证据角色图；花店用四年时间线记录配送、取货点、线上订单以及成本变化。",
    readingMapVi:
      "Trạm bảo tồn dùng nhà nghiên cứu, kiểm lâm và cư dân tạo bản đồ vai bằng chứng; tiệm hoa dùng bốn năm ghi giao hàng, điểm nhận, đặt online và thay đổi chi phí.",
    listeningEvidenceHanzi:
      "温室材料支持不同位置表现不同，桥梁材料支持交通是重要条件；前者不证明一种材料解决全部问题，后者不证明只有桥带来游客。",
    listeningEvidenceVi:
      "Nguồn nhà kính hỗ trợ khác biệt theo vị trí, nguồn cầu hỗ trợ giao thông là điều kiện quan trọng; nguồn đầu không chứng minh một vật liệu giải hết, nguồn sau không chứng minh chỉ cầu mang khách.",
    readingEvidenceHanzi:
      "保护站把固定测量、巡查和长期记忆并列，花店把订单、损坏和利润分开；两文都反对用单一指标代替完整系统。",
    readingEvidenceVi:
      "Trạm bảo tồn đặt đo cố định, tuần tra và ký ức dài hạn cạnh nhau; tiệm hoa tách đơn, hỏng, lợi nhuận; cả hai phản đối dùng một chỉ số thay hệ thống.",
    crossMapHanzi:
      "阅读材料更突出角色与多年步骤，听力材料更突出技术组件和条件变化。四篇共同说明系统图必须同时标出参与者、时间、指标和限制，而不能只画一条成功路线。",
    crossMapVi:
      "Nguồn đọc nhấn vai và bước nhiều năm, nguồn nghe nhấn thành phần công nghệ và điều kiện đổi. Cả bốn cho thấy sơ đồ hệ thống phải có người, thời gian, chỉ số, giới hạn chứ không chỉ một tuyến thành công.",
  }),
};

export const buildHsk4LongInputStructureMapIntegrationPack = (
  root = process.cwd(),
) => {
  const summaryArgumentHead =
    loadHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(root);
  assertValidHsk4ArgumentLogicConcessionSummaryArgumentPackBundle(
    summaryArgumentHead,
  );
  return buildHsk4IntegrationStagePack({
    root,
    config: HSK4_LONG_INPUT_STRUCTURE_MAP_CONFIG,
    content: CONTENT,
    summaryArgumentHeadBundle: summaryArgumentHead,
    prerequisitePackBundles: [],
  });
};

export const writeHsk4LongInputStructureMapIntegrationPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4LongInputStructureMapIntegrationPack(root),
  );
  writeFileSync(outputPath, output, "utf8");
  return { outputPath, output };
};

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.cwd();
  const check = process.argv.includes("--check");
  const outputPath = resolve(
    root,
    HSK4_LONG_INPUT_STRUCTURE_MAP_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4LongInputStructureMapIntegrationPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error(
        "HSK4 long-input structure-map integration draft is stale",
      );
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} 3 HSK4 long-input structure-map integration lessons at ${outputPath}.`,
  );
}
