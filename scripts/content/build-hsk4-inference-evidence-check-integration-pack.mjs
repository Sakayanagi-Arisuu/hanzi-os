import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4IntegrationStagePack,
  serializeHsk4IntegrationStagePack,
} from "./hsk4-integration-stage-builder.mjs";
import {
  HSK4_INFERENCE_EVIDENCE_CHECK_CONFIG,
  HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH,
} from "../../src/content/hsk4InferenceEvidenceCheckIntegrationPack.mjs";
import {
  assertValidHsk4LongInputStructureMapIntegrationPackBundle,
  loadHsk4LongInputStructureMapIntegrationPackBundle,
} from "../../src/content/hsk4LongInputStructureMapIntegrationPack.mjs";

const INFERENCE_CHECK =
  "claim-inference-and-source-evidence-check";
const EVIDENCE_CHECK = "source-evidence-check";
const GUIDED_INTEGRATION = "guided-integration";

const ref = (textId, ...paragraphIds) => ({ textId, paragraphIds });
const allParagraphs = (textId, prefix) =>
  ref(textId, `${prefix}1`, `${prefix}2`, `${prefix}3`);

const responseContract = (skill, minimumSources) => skill === "writing"
  ? {
    unit: "hanzi",
    minimum: 100,
    maximum: 180,
    requiredSections: 4,
    revisionPasses: 2,
    minimumSources,
  }
  : {
    unit: "evidence-notes",
    minimum: 3,
    maximum: 6,
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
  const inferenceMoves = [
    "chép claim cần kiểm tra",
    "ghi bằng chứng trực tiếp của hai nguồn",
    "phân loại fact, inference hoặc unsupported",
    "nêu giới hạn hợp lý",
  ];
  const writingMoves = [
    "dùng đủ bốn nguồn",
    "tách supported, possible và unsupported",
    "giải thích ít nhất một biến nhiễu hoặc khoảng trống",
    "viết lại kết luận có điều kiện",
    "sửa ít nhất hai chỗ sau model",
  ];
  const prompts = [
    prompt({
      kind: INFERENCE_CHECK,
      primarySkill: "listening",
      evidenceRefs: listeningRefs,
      promptVi:
        `Nghe hai nguồn về ${spec.focusVi}; phân loại mỗi claim là được hỗ trợ, chỉ có thể hoặc vượt quá bằng chứng.`,
      modelHanzi: spec.listeningAuditHanzi,
      modelVi: spec.listeningAuditVi,
      requiredMovesVi: inferenceMoves,
      scopeBoundaryVi:
        "Lời kể và số trung bình có giá trị nhưng không tự đại diện toàn bộ nhóm, mọi thời điểm hoặc quan hệ nhân quả.",
    }),
    prompt({
      kind: INFERENCE_CHECK,
      primarySkill: "reading",
      evidenceRefs: readingRefs,
      promptVi:
        `Đọc hai nguồn về ${spec.focusVi}; truy từng kết luận về đoạn chứng cứ và đánh dấu bước suy luận còn thiếu.`,
      modelHanzi: spec.readingAuditHanzi,
      modelVi: spec.readingAuditVi,
      requiredMovesVi: inferenceMoves,
      scopeBoundaryVi:
        "Không đổi từ đồng thời thành gây ra, từ một khu vực thành toàn bộ, hoặc từ ước lượng thành sự thật chắc chắn.",
    }),
  ];
  if (spec.includeWritingClaim) {
    prompts.push(prompt({
      kind: INFERENCE_CHECK,
      primarySkill: "writing",
      evidenceRefs: mixedRefs,
      promptVi:
        `Viết bảng kiểm claim–evidence–alternative–boundary từ cả bốn nguồn về ${spec.focusVi}, rồi sửa một claim quá mạnh.`,
      modelHanzi: spec.crossAuditHanzi,
      modelVi: spec.crossAuditVi,
      requiredMovesVi: writingMoves,
      scopeBoundaryVi:
        "Bảng kiểm phải giữ khác biệt giữa nguồn nghe và đọc; nhiều ví dụ cùng hướng vẫn không tạo đại diện phổ quát.",
    }));
  }
  prompts.push(
    prompt({
      kind: EVIDENCE_CHECK,
      primarySkill: "listening",
      evidenceRefs: listeningRefs,
      promptVi:
        `Nghe lại hai nguồn về ${spec.focusVi}; chọn chi tiết làm thay đổi kết luận ban đầu và giải thích vì sao.`,
      modelHanzi:
        `${spec.listeningAuditHanzi} 合理修订必须保留已观察的变化，同时写出样本、时间或其他解释。`,
      modelVi:
        `${spec.listeningAuditVi} Bản sửa hợp lý phải giữ thay đổi đã quan sát và đồng thời ghi mẫu, thời gian hoặc cách giải thích khác.`,
      requiredMovesVi: [
        "ghi claim ban đầu",
        "nêu chi tiết phản kiểm",
        "viết kết luận nghe đã thu hẹp",
      ],
      scopeBoundaryVi:
        "Chi tiết phản kiểm dùng để thu hẹp kết luận, không tự chứng minh claim ban đầu hoàn toàn sai.",
    }),
    prompt({
      kind: EVIDENCE_CHECK,
      primarySkill: "reading",
      evidenceRefs: readingRefs,
      promptVi:
        `Đọc lại hai nguồn về ${spec.focusVi}; xác định loại bằng chứng nào còn thiếu trước khi chấp nhận claim mạnh.`,
      modelHanzi:
        `${spec.readingAuditHanzi} 还需要稳定测量、对照或分组记录，才能把当前相关关系推进为更强结论。`,
      modelVi:
        `${spec.readingAuditVi} Còn cần đo ổn định, đối chứng hoặc ghi theo nhóm trước khi nâng quan hệ hiện tại thành kết luận mạnh hơn.`,
      requiredMovesVi: [
        "nêu claim mạnh đang bị kiểm tra",
        "ghi bằng chứng hiện có",
        "đề xuất một loại bằng chứng còn thiếu",
      ],
      scopeBoundaryVi:
        "Đề xuất dữ liệu mới không được viết như thể dữ liệu đó đã tồn tại hoặc chắc chắn sẽ xác nhận giả thuyết.",
    }),
    prompt({
      kind: GUIDED_INTEGRATION,
      primarySkill: "writing",
      evidenceRefs: mixedRefs,
      promptVi:
        `Dùng bốn nguồn về ${spec.focusVi} viết 100–180 chữ Hán theo bốn phần: claim, evidence, alternative và bounded conclusion.`,
      modelHanzi: spec.boundedHanzi,
      modelVi: spec.boundedVi,
      requiredMovesVi: writingMoves,
      scopeBoundaryVi:
        "Kết luận chỉ bao quát nguồn đã bind; không cộng các trường hợp khác domain thành một ước lượng chung.",
    }),
    prompt({
      kind: GUIDED_INTEGRATION,
      primarySkill: "writing",
      evidenceRefs: mixedRefs,
      promptVi:
        `Bác bỏ một suy luận vượt nguồn về ${spec.focusVi}; giữ phần đúng, chỉ ra khoảng trống và đề xuất câu thay thế có điều kiện.`,
      modelHanzi: spec.rebuttalHanzi,
      modelVi: spec.rebuttalVi,
      requiredMovesVi: [
        "trích phần claim có dữ kiện hỗ trợ",
        "chỉ ra bước suy luận vượt nguồn",
        "nêu bằng chứng thay thế hoặc còn thiếu",
        "viết câu kết luận thu hẹp",
        "thực hiện hai lượt revision",
      ],
      scopeBoundaryVi:
        "Bác bỏ sự chắc chắn không đồng nghĩa phủ nhận hiện tượng; phải giữ mọi dữ kiện quan sát được trong câu thay thế.",
    }),
  );
  return {
    sourceTextIds: [
      spec.readingA,
      spec.listeningA,
      spec.readingB,
      spec.listeningB,
    ],
    promptUnits: prompts,
  };
};

const CONTENT = {
  "hsk4-inference-evidence-check-lesson-01": makeLesson({
    includeWritingClaim: true,
    focusVi: "ảnh hưởng của thay đổi hạ tầng và lời kể thể thao",
    readingA:
      "hsk4-society-economy-argument-claim-evidence-inference:reading-01",
    listeningA:
      "hsk4-society-economy-argument-claim-evidence-inference:listening-01",
    readingB:
      "hsk4-arts-sports-exchange-critique-claim-evidence-inference:reading-01",
    listeningB:
      "hsk4-arts-sports-exchange-critique-claim-evidence-inference:listening-01",
    listeningAuditHanzi:
      "机场平均转机时间缩短十五分钟是事实，但样本只含成功转机者；冠军重视纪律有日记和队友支持，却不能推出他每天固定训练四小时。",
    listeningAuditVi:
      "Thời gian chuyển chuyến trung bình giảm 15 phút là dữ kiện nhưng mẫu chỉ có người chuyển thành công; kỷ luật của nhà vô địch có nhật ký và đồng đội hỗ trợ song không chứng minh ngày nào cũng tập bốn giờ.",
    readingAuditHanzi:
      "道路改造与事故下降同时出现，但车流和报告方式也变化；名人来访后运动人数上升，同时操场开放和器材便利也可能发挥作用。",
    readingAuditVi:
      "Cải tạo đường xuất hiện cùng giảm tai nạn nhưng lưu lượng và cách báo cũng đổi; vận động tăng sau chuyến thăm người nổi tiếng trong lúc sân mở lại và dụng cụ dễ mượn cũng có thể tác động.",
    crossAuditHanzi:
      "四个来源都含积极变化，却没有一个能单独证明唯一原因。合理表格应分别记录观察值、样本边界、同时变化和仍需比较的条件。",
    crossAuditVi:
      "Cả bốn nguồn có thay đổi tích cực nhưng không nguồn nào tự chứng minh nguyên nhân duy nhất. Bảng hợp lý phải tách quan sát, biên mẫu, thay đổi đồng thời và điều kiện cần so tiếp.",
    boundedHanzi:
      "道路事故、机场时间、学生运动和冠军训练都提供了可观察证据。可是道路车流、机场样本、操场开放以及训练年份同时限制结论。因此可以说改造、流程、活动和纪律分别与某些结果一致，不能说它们在任何条件下都单独造成结果。下一步需要稳定测量、对照组和更完整样本。",
    boundedVi:
      "Tai nạn đường, thời gian sân bay, vận động học sinh và luyện tập đều có quan sát. Nhưng lưu lượng, mẫu sân bay, mở sân và khác biệt theo năm giới hạn kết luận. Chỉ có thể nói các yếu tố phù hợp với một số kết quả, chưa thể nói luôn là nguyên nhân riêng; cần đo ổn định, đối chứng và mẫu đủ.",
    rebuttalHanzi:
      "“新措施肯定有效”保留了结果改善，却省略了暴露量、样本选择和同时变化。更准确的说法是：在已观察的时段与人群中，结果向积极方向变化，多项证据支持继续试验，但独立效果和长期影响仍需对照与完整记录。",
    rebuttalVi:
      "“Biện pháp mới chắc chắn hiệu quả” giữ đúng phần kết quả cải thiện nhưng bỏ mức tiếp xúc, chọn mẫu và thay đổi đồng thời. Câu chuẩn hơn: trong thời gian/nhóm đã quan sát, kết quả đi hướng tích cực và đáng thử tiếp; tác động riêng, dài hạn vẫn cần đối chứng và ghi đủ.",
  }),
  "hsk4-inference-evidence-check-lesson-02": makeLesson({
    includeWritingClaim: true,
    focusVi: "nguyên nhân thành tích và độ chắc chắn của tư liệu lịch sử",
    readingA:
      "hsk4-arts-sports-exchange-critique-cause-condition-result:reading-01",
    listeningA:
      "hsk4-arts-sports-exchange-critique-cause-condition-result:listening-01",
    readingB:
      "hsk4-culture-history-interpretation-claim-evidence-inference:reading-01",
    listeningB:
      "hsk4-culture-history-interpretation-claim-evidence-inference:listening-01",
    listeningAuditHanzi:
      "青年运动项目与友谊和自我评价上升一致，但参与者原本更爱运动且退出者未复访；旧游记能提供视角，却不能单独重建寺庙大小和气氛。",
    listeningAuditVi:
      "Chương trình thể thao phù hợp với tăng bạn bè/tự đánh giá nhưng người dự vốn thích thể thao và người bỏ không được hỏi lại; du ký cũ cho góc nhìn song không tự dựng được kích thước, không khí chùa.",
    readingAuditHanzi:
      "球队失败同时涉及短休息、体能和战术反应，不能只写经验不足；古城主墙约九百年的估计不能扩大为整个遗址同年建成。",
    readingAuditVi:
      "Thất bại đội bóng cùng liên quan nghỉ ngắn, thể lực, phản ứng chiến thuật, không thể chỉ ghi thiếu kinh nghiệm; ước tính tường thành khoảng 900 năm không được mở thành toàn di tích xây cùng năm.",
    crossAuditHanzi:
      "体育材料要求比较参与条件和战术变化，历史材料要求区分估计、档案与个人感受。共同规则是保留证据类型，不把一个标签扩大到所有人或整个地点。",
    crossAuditVi:
      "Nguồn thể thao cần so điều kiện dự và thay đổi chiến thuật; nguồn lịch sử cần tách ước tính, hồ sơ, cảm nhận. Quy tắc chung là giữ loại bằng chứng, không mở một nhãn cho mọi người hay toàn địa điểm.",
    boundedHanzi:
      "比赛失败可由休息不足和战术调整慢共同解释，运动项目也与积极变化一致；然而原有兴趣和退出样本仍有限制。古城与游记材料同样支持部分认识，却显示区域年代、空间大小和个人感受并不完全确定。四源只支持多证据判断，不支持单一原因或完整重建。",
    boundedVi:
      "Thất bại có thể cùng do nghỉ thiếu và chỉnh chiến thuật chậm, chương trình thể thao phù hợp với thay đổi tích cực; nhưng sở thích sẵn có và mẫu bỏ cuộc còn giới hạn. Di tích/du ký hỗ trợ hiểu một phần song niên đại vùng, kích thước, cảm nhận chưa chắc. Bốn nguồn ủng hộ phán đoán đa chứng cứ, không nguyên nhân đơn hay phục dựng đầy đủ.",
    rebuttalHanzi:
      "“经验不足造成失败，旧文字还原历史”把解释写成事实。更稳妥的结论是：比赛证据指向多个可改条件，历史材料提供有范围的年代和视角；两类判断都要标出取样、对照、来源差异与不确定度。",
    rebuttalVi:
      "“Thiếu kinh nghiệm gây thất bại, chữ cũ phục dựng lịch sử” biến diễn giải thành dữ kiện. Kết luận vững hơn: thi đấu chỉ tới nhiều điều kiện có thể sửa, tư liệu lịch sử cho niên đại/góc nhìn có phạm vi; cả hai phải ghi mẫu, đối chứng, khác nguồn, bất định.",
  }),
  "hsk4-inference-evidence-check-lesson-03": makeLesson({
    includeWritingClaim: false,
    focusVi: "nguyên nhân thay đổi truyền thống và quyết định cộng đồng",
    readingA:
      "hsk4-culture-history-interpretation-cause-condition-result:reading-01",
    listeningA:
      "hsk4-culture-history-interpretation-cause-condition-result:listening-01",
    readingB:
      "hsk4-personal-community-analysis-claim-evidence-inference:reading-01",
    listeningB:
      "hsk4-personal-community-analysis-claim-evidence-inference:listening-01",
    listeningAuditHanzi:
      "村宴持续存在是事实，但两百年不变的说法被档案修正；理发店咳嗽减少也是真的，却同时遇到多雨、关门和施工灰尘变化。",
    listeningAuditVi:
      "Bữa làng tiếp tục tồn tại là dữ kiện nhưng chuyện 200 năm không đổi bị hồ sơ sửa; ho ở tiệm giảm cũng thật song cùng lúc mưa nhiều, đóng cửa và bụi công trình thay đổi.",
    readingAuditHanzi:
      "戏曲观众增加与角色介绍、降价和报道同时发生，不能归给一种办法；预约次数低也不能证明公共房间白天无人使用。",
    readingAuditVi:
      "Khán giả hí khúc tăng cùng giới thiệu vai, giảm giá và truyền thông nên không quy một cách; lượt đặt thấp cũng không chứng minh phòng cộng đồng ban ngày không được dùng.",
    crossAuditHanzi:
      "传统与社区四个案例都出现“先给单一解释、再补记录”的结构。新增档案、分组和现场计数使结论更窄，却没有否定晚餐、戏曲、房间使用或咳嗽变化本身。",
    crossAuditVi:
      "Bốn trường hợp truyền thống/cộng đồng đều có cấu trúc “giải thích đơn trước, bổ sung ghi chép sau”. Hồ sơ, phân nhóm, đếm tại chỗ làm kết luận hẹp hơn nhưng không phủ nhận bữa tối, hí khúc, sử dụng phòng hay thay đổi ho.",
    boundedHanzi:
      "戏曲增长可能与介绍、票价和报道共同有关，村宴的文化连续性也不等于形式从未改变。公共房间的预约表漏掉白天活动，理发店记录又受天气、施工和主动报告影响。因此现有证据支持继续记录和比较，不支持宣布唯一原因、固定传统或最佳用途。",
    boundedVi:
      "Khán giả hí khúc có thể cùng liên quan giới thiệu, giá, báo chí; tính liên tục bữa làng không nghĩa hình thức chưa từng đổi. Bảng đặt phòng bỏ hoạt động ban ngày, sổ tiệm chịu thời tiết, công trình, tự báo. Bằng chứng hỗ trợ ghi/so tiếp, không nguyên nhân duy nhất, truyền thống cố định hay công dụng tối ưu.",
    rebuttalHanzi:
      "“观众增加证明介绍最有效，咳嗽减少证明清洗用品有效”都忽略同时变化。可替换为：在当前记录中，多个措施或条件与结果一起变化；分期开启措施、补记未预约使用和保持同一报告方法以后，才可能判断各因素的独立作用。",
    rebuttalVi:
      "“Khán giả tăng chứng minh giới thiệu hiệu quả nhất, ho giảm chứng minh chất giặt hiệu quả” đều bỏ thay đổi đồng thời. Nên sửa: nhiều biện pháp/điều kiện cùng đổi với kết quả; chỉ sau khi mở theo kỳ, bổ sung dùng không đặt và giữ cách báo mới có thể xét tác động riêng.",
  }),
};

export const buildHsk4InferenceEvidenceCheckIntegrationPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4LongInputStructureMapIntegrationPackBundle(root);
  assertValidHsk4LongInputStructureMapIntegrationPackBundle(prerequisite);
  return buildHsk4IntegrationStagePack({
    root,
    config: HSK4_INFERENCE_EVIDENCE_CHECK_CONFIG,
    content: CONTENT,
    summaryArgumentHeadBundle: prerequisite.summaryArgumentHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4InferenceEvidenceCheckIntegrationPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4InferenceEvidenceCheckIntegrationPack(root),
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
    HSK4_INFERENCE_EVIDENCE_CHECK_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4InferenceEvidenceCheckIntegrationPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error(
        "HSK4 inference/evidence-check integration draft is stale",
      );
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} 3 HSK4 inference/evidence-check integration lessons at ${outputPath}.`,
  );
}
