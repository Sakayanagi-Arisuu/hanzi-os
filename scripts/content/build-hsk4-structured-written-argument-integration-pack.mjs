import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4IntegrationStagePack,
  serializeHsk4IntegrationStagePack,
} from "./hsk4-integration-stage-builder.mjs";
import {
  HSK4_STRUCTURED_WRITTEN_ARGUMENT_CONFIG,
  HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH,
} from "../../src/content/hsk4StructuredWrittenArgumentIntegrationPack.mjs";
import {
  assertValidHsk4CrossTextSynthesisIntegrationPackBundle,
  loadHsk4CrossTextSynthesisIntegrationPackBundle,
} from "../../src/content/hsk4CrossTextSynthesisIntegrationPack.mjs";

const SOURCE = {
  societyPublicDataReading:
    "hsk4-society-economy-argument-concept-actor-map:reading-01",
  artsShadowPlayReading:
    "hsk4-arts-sports-exchange-critique-process-timeline:reading-01",
  artsArchiveReading:
    "hsk4-arts-sports-exchange-critique-concept-actor-map:reading-01",
  culturePastryReading:
    "hsk4-culture-history-interpretation-process-timeline:reading-01",
  cultureProverbReading:
    "hsk4-culture-history-interpretation-concept-actor-map:reading-01",
  personalServiceReading:
    "hsk4-personal-community-analysis-concept-actor-map:reading-01",
};

const sourceRef = (textId) => ({
  textId,
  paragraphIds: ["rp1", "rp2", "rp3"],
});
const pairRefs = (first, second) => [
  sourceRef(first),
  sourceRef(second),
];
const supportingSkills = (primarySkill) =>
  primarySkill === "reading" ? ["writing"] : ["reading"];
const responseContract = (
  primarySkill,
  minimum,
  maximum,
  requiredSections = 2,
  revisionPasses = 1,
) => ({
  unit: primarySkill === "writing" ? "hanzi" : "evidence-notes",
  minimum,
  maximum,
  requiredSections,
  revisionPasses,
  minimumSources: 2,
});
const prompt = ({
  kind,
  primarySkill,
  evidenceRefs,
  promptVi,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
  minimum,
  maximum,
  timeLimitSeconds,
  requiredSections = 2,
  revisionPasses = 1,
}) => ({
  kind,
  primarySkill,
  supportingSkills: supportingSkills(primarySkill),
  promptVi,
  evidenceRefs,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
  responseContract: responseContract(
    primarySkill,
    minimum,
    maximum,
    requiredSections,
    revisionPasses,
  ),
  timeLimitSeconds,
});

const CONTENT = {
  "hsk4-structured-written-argument-lesson-01": {
    sourceTextIds: [
      SOURCE.societyPublicDataReading,
      SOURCE.artsShadowPlayReading,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: pairRefs(
          SOURCE.societyPublicDataReading,
          SOURCE.artsShadowPlayReading,
        ),
        promptVi:
          "Trong 120 giây, lập hai nhóm ghi chú về người chịu trách nhiệm, điểm phải phối hợp và quyết định được sửa trong nguồn dữ liệu công cộng cùng nguồn sáng tác kịch bóng.",
        modelHanzi:
          "公共资料：政府给服务事实，社会组织查无障碍，社区解释文化，编辑记录修改。皮影创作：创作者处理动作材料，灯光师检查边缘，音乐组改节奏，观众试演暴露故事问题。两边都靠分工与反馈。",
        modelVi:
          "Dữ liệu công: chính quyền cung cấp sự thật dịch vụ, tổ chức xã hội kiểm tiếp cận, cộng đồng giải thích văn hóa, biên tập ghi sửa đổi. Kịch bóng: người sáng tác xử lý động tác/vật liệu, ánh sáng kiểm đường viền, nhạc sửa nhịp, diễn thử phát hiện vấn đề. Cả hai dựa phân vai và phản hồi.",
        requiredMovesVi: [
          "ghi ít nhất hai vai trò của mỗi nguồn",
          "nêu một điểm cần phối hợp",
          "nêu một quyết định được sửa sau phản hồi",
        ],
        scopeBoundaryVi:
          "Không đánh đồng quyền sửa thông tin hành chính với quyền sáng tạo nghệ thuật; chỉ so sánh cách làm rõ vai trò và phản hồi.",
        minimum: 3,
        maximum: 6,
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: pairRefs(
          SOURCE.societyPublicDataReading,
          SOURCE.artsShadowPlayReading,
        ),
        promptVi:
          "Trong 120 giây, phân loại các kết luận về minh bạch và cải tiến thành được hỗ trợ hoặc vượt nguồn, rồi ghi một giới hạn cho mỗi văn bản.",
        modelHanzi:
          "有支持：公共资料标明来源、更新时间和负责人；皮影团队根据灯光与观众反馈反复修改。超出来源：角色图保证资料完整；一次正式演出证明新方法永远有效。限制分别是未访谈的小社区和单次观众反馈。",
        modelVi:
          "Được hỗ trợ: dữ liệu công ghi nguồn, ngày cập nhật, người phụ trách; đội kịch sửa theo ánh sáng và phản hồi khán giả. Vượt nguồn: bản đồ vai trò bảo đảm dữ liệu đầy đủ; một buổi diễn chứng minh cách mới luôn hiệu quả. Giới hạn là cộng đồng chưa phỏng vấn và phản hồi một lần.",
        requiredMovesVi: [
          "phân loại ít nhất hai nhận định",
          "ghi một giới hạn của mỗi nguồn",
          "không biến quy trình thành bảo đảm kết quả",
        ],
        scopeBoundaryVi:
          "Việc có nguồn và vòng sửa làm quy trình minh bạch hơn nhưng chưa chứng minh nội dung đã đầy đủ hoặc sản phẩm đạt hiệu quả lâu dài.",
        minimum: 3,
        maximum: 6,
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "evidence-bounded-structured-writing",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.societyPublicDataReading,
          SOURCE.artsShadowPlayReading,
        ),
        promptVi:
          "Trong 120 giây, viết luận điểm 50–100 chữ Hán trả lời: dự án phức tạp nên xác định vai trò cố định hay cho phép sửa linh hoạt?",
        modelHanzi:
          "复杂项目需要明确责任，也需要根据证据调整做法。公共资料必须区分服务事实、文化解释和核对责任；皮影团队则在角色清楚的基础上修改材料、灯光与节奏。因此，责任边界应稳定，具体方案可以随反馈变化。",
        modelVi:
          "Dự án phức tạp cần trách nhiệm rõ và khả năng sửa theo bằng chứng. Dữ liệu công phải tách sự thật dịch vụ, giải thích văn hóa và trách nhiệm kiểm; đội kịch sửa vật liệu, ánh sáng, nhịp trên nền vai trò rõ. Biên trách nhiệm nên ổn định, phương án cụ thể có thể đổi theo phản hồi.",
        requiredMovesVi: [
          "nêu luận điểm có hai vế",
          "dẫn một vai trò từ mỗi nguồn",
          "phân biệt biên trách nhiệm với giải pháp cụ thể",
        ],
        scopeBoundaryVi:
          "Luận điểm chỉ áp dụng cho hai quy trình nhiều bên được mô tả, không khẳng định mọi dự án cần cùng cơ cấu tổ chức.",
        minimum: 50,
        maximum: 100,
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "evidence-bounded-structured-writing",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.societyPublicDataReading,
          SOURCE.artsShadowPlayReading,
        ),
        promptVi:
          "Trong 120 giây, viết đoạn bằng chứng 60–120 chữ Hán nối một quyết định biên tập dữ liệu công với một lần sửa sáng tác, giải thích chứ không chỉ liệt kê.",
        modelHanzi:
          "编辑组保存旧资料、记录修改理由并请研究者核对，说明社区解释需要与可查事实分开。皮影团队发现蓝光使边缘不清后放大片形，又因儿童不懂离家原因增加对话。两例都表明，反馈只有在责任人记录问题并说明修改依据时，才真正进入决策。",
        modelVi:
          "Nhóm biên tập giữ bản cũ, ghi lý do sửa và nhờ nghiên cứu kiểm, cho thấy giải thích cộng đồng phải tách sự thật kiểm được. Đội kịch thấy ánh xanh làm mờ nên phóng hình, rồi thêm thoại khi trẻ chưa hiểu lý do rời nhà. Phản hồi chỉ vào quyết định khi người phụ trách ghi vấn đề và căn cứ sửa.",
        requiredMovesVi: [
          "dẫn một chuỗi hành động từ mỗi nguồn",
          "giải thích quan hệ giữa phản hồi và quyết định",
          "không chỉ ghép hai câu tóm tắt độc lập",
        ],
        scopeBoundaryVi:
          "Không kết luận mọi phản hồi đều đúng; nguồn chỉ hỗ trợ phản hồi được kiểm tra, ghi lý do và đặt trong trách nhiệm phù hợp.",
        minimum: 60,
        maximum: 120,
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.societyPublicDataReading,
          SOURCE.artsShadowPlayReading,
        ),
        promptVi:
          "Trong 180 giây, viết phản biện và hồi đáp 70–130 chữ Hán cho ý kiến: ghi nguồn, vai trò và mọi vòng sửa sẽ làm dự án quá chậm.",
        modelHanzi:
          "反对者认为记录来源和修改理由会增加时间，创作也可能因多人意见而失去速度。这个担心合理，所以不必记录每个小动作，而应记录影响事实、文化解释、安全或观众理解的关键决定。公共资料避免部门越权，皮影试演避免正式演出中继续出现理解问题；必要记录是在降低返工与误导风险。",
        modelVi:
          "Phản đối cho rằng ghi nguồn/lý do sửa tốn thời gian và nhiều ý kiến làm sáng tác chậm. Lo ngại hợp lý nên không cần ghi mọi động tác nhỏ, chỉ quyết định ảnh hưởng sự thật, diễn giải văn hóa, an toàn hoặc hiểu của khán giả. Dữ liệu công tránh vượt quyền; diễn thử tránh tiếp tục lỗi hiểu. Ghi thiết yếu giảm rủi ro làm lại và gây hiểu sai.",
        requiredMovesVi: [
          "trình bày phản biện công bằng",
          "giới hạn loại quyết định cần ghi",
          "dẫn lợi ích cụ thể từ cả hai nguồn",
          "không tuyên bố ghi chép luôn tiết kiệm thời gian",
        ],
        scopeBoundaryVi:
          "Hồi đáp chỉ bảo vệ ghi chép chọn lọc cho quyết định quan trọng; chưa có số liệu so sánh thời gian hoặc chi phí quy trình.",
        minimum: 70,
        maximum: 130,
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.societyPublicDataReading,
          SOURCE.artsShadowPlayReading,
        ),
        promptVi:
          "Trong 420 giây, lập dàn ý lập luận 100–180 chữ Hán gồm luận điểm, hai đoạn bằng chứng, phản biện và kết luận giới hạn về trách nhiệm cùng sửa đổi.",
        modelHanzi:
          "论点：复杂项目应固定责任边界，同时允许方法按证据修改。第一段：城市资料中，政府、社会组织和社区分别提供事实、无障碍检查与文化解释，来源和负责人必须公开。第二段：皮影创作在材料、灯光、音乐和观众反馈之间多次调整，说明方案不能一次定死。反方担心记录与协作拖慢进度；回应是只记录关键决定并提前说明谁有权停止或修改。结论：透明分工与迭代可以并存，但两份材料没有比较长期效率。",
        modelVi:
          "Luận điểm: dự án phức tạp nên cố định biên trách nhiệm nhưng cho phương pháp đổi theo bằng chứng. Đoạn một: dữ liệu thành phố tách sự thật, tiếp cận, giải thích văn hóa và công khai nguồn/người phụ trách. Đoạn hai: kịch bóng sửa qua vật liệu, ánh sáng, nhạc, phản hồi nên phương án không cố định một lần. Phản biện về chậm được đáp bằng chỉ ghi quyết định chính và quyền sửa. Kết luận: phân vai minh bạch cùng lặp sửa được, nhưng chưa có dữ liệu hiệu suất dài hạn.",
        requiredMovesVi: [
          "có luận điểm rõ và có phạm vi",
          "dành một phần bằng chứng cho mỗi nguồn",
          "có phản biện cùng hồi đáp",
          "kết luận nêu dữ liệu còn thiếu",
        ],
        scopeBoundaryVi:
          "Đây là dàn ý luyện tập nguồn đã lộ, không phải bài thi độc lập và không chứng minh mô hình tổ chức nào tối ưu.",
        minimum: 100,
        maximum: 180,
        timeLimitSeconds: 420,
        requiredSections: 5,
        revisionPasses: 2,
      }),
    ],
  },

  "hsk4-structured-written-argument-lesson-02": {
    sourceTextIds: [
      SOURCE.artsArchiveReading,
      SOURCE.culturePastryReading,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: pairRefs(
          SOURCE.artsArchiveReading,
          SOURCE.culturePastryReading,
        ),
        promptVi:
          "Trong 180 giây, ghi cách mỗi nguồn giữ một phần nhận diện cốt lõi trong khi xử lý tác phẩm lai hoặc sản phẩm cải tiến, kèm giới hạn kết quả.",
        modelHanzi:
          "艺术档案保留一个主要类别，再加交叉标签，依据是表达形式而非价值。点心店保留经典味道与产品线，同时试小包装、原料标签和周末时间。前者没有证明视觉更重要，后者只负责一家店三年的结果。",
        modelVi:
          "Hồ sơ nghệ thuật giữ một loại chính rồi thêm nhãn chéo, dựa hình thức chứ không dựa giá trị. Tiệm bánh giữ vị và dòng cổ điển, đồng thời thử gói nhỏ, nhãn nguyên liệu, giờ cuối tuần. Nguồn đầu chưa chứng minh hình ảnh quan trọng hơn; nguồn sau chỉ chịu trách nhiệm kết quả một tiệm trong ba năm.",
        requiredMovesVi: [
          "ghi yếu tố được giữ của mỗi nguồn",
          "ghi yếu tố được bổ sung hoặc thay đổi",
          "nêu một giới hạn kết quả của mỗi trường hợp",
        ],
        scopeBoundaryVi:
          "Không gọi nhãn chính là xếp hạng giá trị hoặc coi doanh số một cửa hàng là bằng chứng mọi truyền thống cần thay đổi.",
        minimum: 3,
        maximum: 6,
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "evidence-bounded-structured-writing",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.artsArchiveReading,
          SOURCE.culturePastryReading,
        ),
        promptVi:
          "Trong 180 giây, viết luận điểm 70–130 chữ Hán: bảo tồn bản sắc có đòi hỏi chỉ dùng một nhãn hoặc giữ nguyên mọi cách làm không?",
        modelHanzi:
          "保护身份不等于拒绝交叉分类或所有改变。综合艺术仍可有主要类别，同时用标签保留诗、演唱和图像；传统点心也能区分经典与改良产品，在不取消核心味道的前提下调整包装和信息。关键是公开什么被保留、什么被改变以及判断依据。",
        modelVi:
          "Bảo tồn nhận diện không đồng nghĩa từ chối nhãn chéo hay mọi thay đổi. Nghệ thuật tổng hợp vẫn có loại chính và nhãn giữ thơ, hát, hình; bánh truyền thống phân biệt cổ điển/cải tiến và sửa gói, thông tin mà không bỏ vị lõi. Then chốt là công khai cái giữ, cái đổi và căn cứ.",
        requiredMovesVi: [
          "trả lời trực tiếp câu hỏi",
          "dẫn một cơ chế giữ và đổi từ mỗi nguồn",
          "nêu tiêu chí minh bạch",
        ],
        scopeBoundaryVi:
          "Không kết luận mọi tác phẩm cần một nhãn chính hoặc mọi sản phẩm truyền thống đều có thể đổi mà không mất ý nghĩa.",
        minimum: 70,
        maximum: 130,
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "evidence-bounded-structured-writing",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.artsArchiveReading,
          SOURCE.culturePastryReading,
        ),
        promptVi:
          "Trong 240 giây, viết đoạn bằng chứng 90–160 chữ Hán giải thích vì sao “giữ lõi + thêm lớp” khác với thay đổi tùy tiện.",
        modelHanzi:
          "艺术档案先用主要表达形式确定主类，再为综合作品增加两个交叉标签，并记录判断者；这种做法没有删除原有分类原则。点心店也没有一次更换全部产品，而是先试小包装和成分说明，再延长时间，并用颜色区分经典与改良。两例中的变化都有明确对象、顺序和记录，所以“增加一层”仍让读者或顾客看见原来的核心。",
        modelVi:
          "Hồ sơ trước dùng hình thức biểu đạt làm loại chính, rồi thêm hai nhãn cho tác phẩm lai và ghi người phán đoán, không xóa nguyên tắc. Tiệm bánh không đổi mọi thứ một lần mà thử gói/nhãn rồi giờ mở, dùng màu tách cổ điển/cải tiến. Thay đổi có đối tượng, thứ tự, ghi chép nên lớp thêm vẫn cho thấy lõi ban đầu.",
        requiredMovesVi: [
          "giải thích nguyên tắc phân loại ban đầu",
          "giải thích trình tự thử thay đổi",
          "nêu vai trò của nhãn hoặc phân dòng",
          "phân biệt thay đổi có căn cứ với tùy tiện",
        ],
        scopeBoundaryVi:
          "Không suy ra người dùng hiểu hoàn hảo các nhãn hoặc thay đổi đã tối ưu; hai nguồn vẫn dự kiến điều chỉnh và đo tiếp.",
        minimum: 90,
        maximum: 160,
        timeLimitSeconds: 240,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.artsArchiveReading,
          SOURCE.culturePastryReading,
        ),
        promptVi:
          "Trong 240 giây, viết phản biện và hồi đáp 90–160 chữ Hán cho ý kiến: thêm nhãn và phiên bản cải tiến sẽ làm bản sắc trở nên mơ hồ.",
        modelHanzi:
          "反对者担心交叉标签让作品没有清楚归属，改良点心也可能使传统品牌只剩名字。这个风险要求保留可识别的主类、经典产品和判断记录，而不是禁止一切变化。档案用主类支持查找，用交叉标签避免假装作品只有一种形式；点心店让经典销量继续单独观察。只要核心、变化和结果分别可见，增加选择不一定等于失去身份。",
        modelVi:
          "Phản đối lo nhãn chéo làm tác phẩm mất nơi thuộc và bánh cải tiến khiến thương hiệu chỉ còn tên. Rủi ro đòi giữ loại chính, dòng cổ điển và ghi phán đoán, không phải cấm đổi. Hồ sơ dùng loại chính để tìm, nhãn chéo tránh giả vờ chỉ một hình thức; tiệm theo dõi riêng doanh số cổ điển. Khi lõi, thay đổi, kết quả cùng nhìn thấy, thêm lựa chọn chưa chắc mất nhận diện.",
        requiredMovesVi: [
          "nêu phản biện không bóp méo",
          "đưa ra hai cơ chế bảo vệ lõi",
          "dẫn bằng chứng từ cả hai nguồn",
          "tránh kết luận chắc chắn về bản sắc",
        ],
        scopeBoundaryVi:
          "Hồi đáp chỉ nói thay đổi không tất yếu làm mất bản sắc; chưa có tiêu chuẩn chung để xác định lõi của mọi tác phẩm hoặc truyền thống.",
        minimum: 90,
        maximum: 160,
        timeLimitSeconds: 240,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.artsArchiveReading,
          SOURCE.culturePastryReading,
        ),
        promptVi:
          "Trong 900 giây, viết lập luận hoàn chỉnh 180–300 chữ Hán về cách tổ chức nên cân bằng tính liên tục với nhu cầu phân loại hoặc thích nghi mới.",
        modelHanzi:
          "组织保护文化身份时，不必在“完全不变”和“随意改变”之间二选一，而应建立可追踪的层次。海桥社区面对同时包含诗、演唱和投影的作品，保留一个按主要表达形式确定的类别，再增加交叉标签并记录判断者。这样既方便查找，也承认作品的综合性质。春和点心店则保留核心味道和经典产品，同时分阶段测试小包装、成分说明与周末营业，并单独观察经典销量。反对者担心标签和改良越来越多，最终使原有身份失去边界。这个担心可以通过三项规则回应：先公开核心标准，再区分经典与实验版本，最后分别记录使用与反馈。两份材料说明连续性可以与有限调整并存，但一个档案和一家店的结果不能证明所有文化产品都适合同样方案。",
        modelVi:
          "Khi bảo vệ nhận diện văn hóa, tổ chức không cần chọn giữa bất biến hoàn toàn và đổi tùy ý mà nên tạo lớp có thể truy dấu. Hồ sơ Hải Kiều giữ một loại theo hình thức chính, thêm nhãn chéo và ghi người quyết định, vừa dễ tìm vừa thừa nhận tính lai. Tiệm Xuân Hòa giữ vị/dòng cổ điển, thử theo giai đoạn gói nhỏ, nhãn, giờ mở và theo riêng doanh số cổ điển. Lo nhãn/cải tiến làm mất biên được đáp bằng công khai lõi, tách cổ điển/thử nghiệm, ghi riêng sử dụng/phản hồi. Hai nguồn cho thấy liên tục có thể cùng điều chỉnh hữu hạn nhưng không chứng minh mọi sản phẩm hợp một mô hình.",
        requiredMovesVi: [
          "có luận điểm tránh nhị nguyên",
          "giải thích bằng chứng từ cả hai nguồn",
          "trình bày phản biện về mất biên bản sắc",
          "đề xuất ít nhất hai điều kiện kiểm soát",
          "kết luận giới hạn phạm vi",
        ],
        scopeBoundaryVi:
          "Bài luyện dùng nguồn và model đã lộ, không phải form đánh giá; kết luận không mở rộng ra mọi loại hình nghệ thuật hay truyền thống.",
        minimum: 180,
        maximum: 300,
        timeLimitSeconds: 900,
        requiredSections: 4,
        revisionPasses: 2,
      }),
    ],
  },

  "hsk4-structured-written-argument-lesson-03": {
    sourceTextIds: [
      SOURCE.cultureProverbReading,
      SOURCE.personalServiceReading,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: pairRefs(
          SOURCE.cultureProverbReading,
          SOURCE.personalServiceReading,
        ),
        promptVi:
          "Trong 150 giây, lập ghi chú về vai người nói/nghe trong tục ngữ và vai tiếp nhận/phân loại/xử lý trong bảng dịch vụ; nêu vì sao thiếu vai sẽ làm kết luận sai.",
        modelHanzi:
          "俗语的作用取决于谁说、对谁说和场景风险：手工学习可鼓励认真，事故处理中可能拖延。服务表则区分居民提出需要、工作人员分类、志愿者回答和专业人员处理。忽略角色会把一句价值或一个名字误当成完整行动。",
        modelVi:
          "Tác dụng tục ngữ tùy ai nói, nói với ai và rủi ro: học thủ công có thể khuyến khích kỹ, xử lý sự cố có thể trì hoãn. Bảng dịch vụ tách cư dân nêu nhu cầu, nhân viên phân loại, tình nguyện viên trả lời, chuyên môn xử lý. Bỏ vai sẽ coi một giá trị hay tên người là toàn bộ hành động.",
        requiredMovesVi: [
          "ghi ít nhất hai vai trò của mỗi nguồn",
          "nêu một bối cảnh làm đổi ý nghĩa tục ngữ",
          "giải thích hậu quả của việc bỏ tác nhân",
        ],
        scopeBoundaryVi:
          "Không kết luận tục ngữ vô ích hoặc bảng vai trò tự giải quyết mọi vấn đề; hai nguồn chỉ cho thấy vai và bối cảnh cần được ghi rõ.",
        minimum: 3,
        maximum: 6,
        timeLimitSeconds: 150,
      }),
      prompt({
        kind: "evidence-bounded-structured-writing",
        primarySkill: "reading",
        evidenceRefs: pairRefs(
          SOURCE.cultureProverbReading,
          SOURCE.personalServiceReading,
        ),
        promptVi:
          "Trong 150 giây, xác định cấu trúc lập luận hợp lý cho nhận định “nguyên tắc chung chỉ hữu ích khi đi kèm điều kiện áp dụng và người chịu trách nhiệm”.",
        modelHanzi:
          "论点：一般原则需要应用条件和责任人。证据一：同一句“慢工出细活”在学习与事故场景作用相反。证据二：服务表只有在工作人员分类、转交并确认紧急程度时才形成行动。反驳：规则太细可能难记。回应：保留核心原则，只标关键场景与责任。",
        modelVi:
          "Luận điểm: nguyên tắc chung cần điều kiện và người phụ trách. Bằng chứng một: cùng tục ngữ có tác dụng trái ở học và sự cố. Bằng chứng hai: bảng chỉ thành hành động khi nhân viên phân loại, chuyển, xác nhận khẩn cấp. Phản biện: quy tắc quá chi tiết khó nhớ. Đáp: giữ nguyên tắc lõi, chỉ đánh dấu cảnh và trách nhiệm chính.",
        requiredMovesVi: [
          "xác định luận điểm chính",
          "xếp một bằng chứng từ mỗi nguồn",
          "nêu phản biện cùng hướng hồi đáp",
        ],
        scopeBoundaryVi:
          "Cấu trúc này chưa chứng minh mọi nguyên tắc phải có cùng số điều kiện hoặc mọi trách nhiệm đều có thể biểu diễn bằng bảng.",
        minimum: 3,
        maximum: 6,
        timeLimitSeconds: 150,
      }),
      prompt({
        kind: "evidence-bounded-structured-writing",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.cultureProverbReading,
          SOURCE.personalServiceReading,
        ),
        promptVi:
          "Trong 180 giây, viết đoạn luận điểm–bằng chứng 80–150 chữ Hán về quan hệ giữa nguyên tắc ngắn gọn và cơ chế chịu trách nhiệm cụ thể.",
        modelHanzi:
          "简短原则能提醒共同价值，却不能代替具体责任。“慢工出细活”在手工学习中支持认真，在事故处理中却可能成为拖延理由，所以使用者必须说明场景与风险。社区服务表也只有在工作人员分类、志愿者回复、专业部门处理和电话确认相互衔接时才有效。原则负责方向，角色与流程负责把方向变成可检查的行动。",
        modelVi:
          "Nguyên tắc ngắn nhắc giá trị chung nhưng không thay trách nhiệm cụ thể. “Chậm mà tinh” hỗ trợ kỹ lưỡng khi học thủ công nhưng có thể thành lý do trì hoãn ở sự cố nên phải nêu cảnh/rủi ro. Bảng dịch vụ chỉ hiệu quả khi phân loại, trả lời, xử lý chuyên môn và xác nhận nối nhau. Nguyên tắc cho hướng; vai và quy trình biến hướng thành hành động kiểm tra được.",
        requiredMovesVi: [
          "nêu chức năng hữu hạn của nguyên tắc",
          "dẫn hai bối cảnh của tục ngữ",
          "dẫn chuỗi vai trò của dịch vụ",
          "giải thích quan hệ hướng dẫn và thực thi",
        ],
        scopeBoundaryVi:
          "Không nói cơ chế nhiều bước luôn tốt hơn; nguồn chỉ hỗ trợ phân vai khi nhu cầu và mức khẩn cấp khác nhau.",
        minimum: 80,
        maximum: 150,
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.cultureProverbReading,
          SOURCE.personalServiceReading,
        ),
        promptVi:
          "Trong 900 giây, viết bài 180–300 chữ Hán: khi nào một nguyên tắc chung nên được giữ, sửa cách áp dụng hoặc tạm dừng? Phải có phản biện và giới hạn.",
        modelHanzi:
          "一般原则值得保留，当它能指出共同价值；但具体应用必须接受场景、权力和风险检查。课堂中的“慢工出细活”提醒学习者尊重长期练习，在事故处理中却可能延误及时行动，因此不能只看句子表面。社区服务表同样把“帮助居民”这一目标分成查询、分类、一般回复、专业处理和紧急确认，使不同角色知道何时继续、何时转交。反对者会说，给原则增加太多条件会让人失去清楚方向。合理做法不是删除原则，而是标出三类边界：谁作判断、风险多高、何时必须交给专业人员。若应用造成明显延误或责任不清，就应暂停并复核。两个社区与课堂案例只支持有条件应用，不能提供所有伦理或紧急场景的统一答案。",
        modelVi:
          "Nguyên tắc chung đáng giữ khi chỉ giá trị chung, nhưng ứng dụng phải qua kiểm tra cảnh, quyền và rủi ro. “Chậm mà tinh” nhắc tôn trọng luyện lâu ở lớp nhưng có thể trì hoãn sự cố, nên không chỉ đọc mặt chữ. Bảng dịch vụ chia mục tiêu giúp dân thành tra cứu, phân loại, trả lời chung, xử lý chuyên môn, xác nhận khẩn để biết lúc tiếp tục/chuyển giao. Lo quá nhiều điều kiện làm mất hướng được đáp bằng ba biên: ai phán đoán, rủi ro cao bao nhiêu, khi nào giao chuyên môn. Nếu trì hoãn hoặc mờ trách nhiệm thì dừng và rà. Hai trường hợp không cho đáp án chung mọi cảnh.",
        requiredMovesVi: [
          "đưa ra tiêu chí giữ nguyên tắc",
          "nêu điều kiện sửa hoặc dừng áp dụng",
          "dẫn và giải thích cả hai nguồn",
          "trình bày phản biện công bằng",
          "kết luận giới hạn phạm vi",
        ],
        scopeBoundaryVi:
          "Đây là timed rehearsal từ nguồn đã lộ; chưa có rubric được duyệt hay dữ liệu calibration để biến bài thành mastery evidence.",
        minimum: 180,
        maximum: 300,
        timeLimitSeconds: 900,
        requiredSections: 4,
        revisionPasses: 2,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "writing",
        evidenceRefs: pairRefs(
          SOURCE.cultureProverbReading,
          SOURCE.personalServiceReading,
        ),
        promptVi:
          "Trong 300 giây, rà bài vừa viết và tạo bản sửa 100–180 chữ Hán: thay ít nhất hai kết luận quá rộng bằng câu có tác nhân, điều kiện và giới hạn bằng chứng.",
        modelHanzi:
          "修订后不能写“传统说法总会拖慢行动”，而应写：在事故处理场景中，如果有权者用“慢工出细活”反对及时措施，这句话可能增加延误风险。也不能写“责任表一定提高服务质量”，而应写：明河社区的表格帮助居民看见分类、转交和跟进角色，三个月内多数问题一天得到回复；它仍需改进紧急信息识别。两项结论都保留了主体、条件和数据范围。",
        modelVi:
          "Không viết “lời truyền thống luôn làm chậm”, mà sửa: trong xử lý sự cố, nếu người có quyền dùng câu này chống biện pháp kịp thời, nó có thể tăng rủi ro trì hoãn. Không viết “bảng trách nhiệm chắc chắn tăng chất lượng”, mà sửa: ở Minh Hà, bảng giúp thấy vai phân loại/chuyển/theo dõi, đa số vấn đề được trả lời trong ngày suốt ba tháng; vẫn phải cải thiện nhận diện khẩn. Cả hai giữ chủ thể, điều kiện, phạm vi.",
        requiredMovesVi: [
          "xác định ít nhất hai chỗ quá rộng",
          "thêm tác nhân và điều kiện cụ thể",
          "thêm phạm vi thời gian hoặc dữ liệu",
          "không thêm kết quả ngoài nguồn",
        ],
        scopeBoundaryVi:
          "Bản sửa chỉ cải thiện độ chính xác theo hai nguồn, không tự tạo điểm số, đánh giá năng lực viết hay quyền mở prerequisite.",
        minimum: 100,
        maximum: 180,
        timeLimitSeconds: 300,
        requiredSections: 2,
        revisionPasses: 2,
      }),
    ],
  },
};

export const buildHsk4StructuredWrittenArgumentIntegrationPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4CrossTextSynthesisIntegrationPackBundle(root);
  assertValidHsk4CrossTextSynthesisIntegrationPackBundle(prerequisite);
  return buildHsk4IntegrationStagePack({
    root,
    config: HSK4_STRUCTURED_WRITTEN_ARGUMENT_CONFIG,
    content: CONTENT,
    summaryArgumentHeadBundle: prerequisite.summaryArgumentHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4StructuredWrittenArgumentIntegrationPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4StructuredWrittenArgumentIntegrationPack(root),
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
    HSK4_STRUCTURED_WRITTEN_ARGUMENT_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4StructuredWrittenArgumentIntegrationPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error(
        "HSK4 structured written argument integration draft is stale",
      );
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_STRUCTURED_WRITTEN_ARGUMENT_CONFIG.lessonIds.length
    } HSK4 structured written argument integration lessons at ${outputPath}.`,
  );
}
