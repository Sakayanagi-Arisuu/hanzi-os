import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4SummaryArgumentModulePack,
  serializeHsk4SummaryArgumentModulePack,
} from "./hsk4-summary-argument-module-builder.mjs";
import {
  HSK4_STANCE_COMPARISON_RHETORIC_CONFIG,
  HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH,
} from "../../src/content/hsk4StanceComparisonRhetoricSummaryArgumentPack.mjs";
import {
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
  loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
} from "../../src/content/hsk4PrecisionReferenceQuantitySummaryArgumentPack.mjs";

const G = (n) => `hsk4-grammar-row-${String(n).padStart(3, "0")}`;
const ref = (textId, ...paragraphIds) => ({ textId, paragraphIds });
const grammar = (functionVi, modelHanzi, modelVi, scopeBoundaryVi) => ({
  functionVi,
  modelHanzi,
  modelVi,
  scopeBoundaryVi,
});

const SOURCE = {
  internshipReading:
    "hsk4-education-work-evaluation-claim-evidence-inference:reading-01",
  careerEventListening:
    "hsk4-education-work-evaluation-claim-evidence-inference:listening-01",
  workRecordsReading:
    "hsk4-education-work-evaluation-comparison-variation:reading-01",
  selfStudyPlatformListening:
    "hsk4-education-work-evaluation-comparison-variation:listening-01",
  studySupportReading:
    "hsk4-education-work-evaluation-cause-condition-result:reading-01",
  officeTrainingListening:
    "hsk4-education-work-evaluation-cause-condition-result:listening-01",
  overtimeReading:
    "hsk4-education-work-evaluation-viewpoint-synthesis:reading-01",
  officeEnvironmentListening:
    "hsk4-education-work-evaluation-viewpoint-synthesis:listening-01",
  energyWindowsReading:
    "hsk4-nature-technology-explanation-comparison-variation:reading-01",
  oilPollutionListening:
    "hsk4-nature-technology-explanation-comparison-variation:listening-01",
};

const CONTENT = {
  "hsk4-stance-comparison-rhetoric-lesson-01": {
    sourceTextIds: [
      SOURCE.internshipReading,
      SOURCE.careerEventListening,
    ],
    grammarApplications: {
      [G(32)]: grammar(
        "Dùng “就是说/这就是说” để diễn giải hệ quả đúng phạm vi từ bằng chứng vừa nêu, không biến diễn giải thành dữ kiện mới.",
        "现有材料只证明毕业生能按流程沟通，这就是说，独立协调项目的能力仍待情境任务验证。",
        "Tài liệu hiện có chỉ chứng minh ứng viên có thể giao tiếp theo quy trình; nói cách khác, năng lực tự điều phối dự án vẫn phải được kiểm tra bằng nhiệm vụ tình huống.",
        "Vế sau chỉ được làm rõ mức bằng chứng của thực tập; không được nâng “có thể giao tiếp” thành “đã đủ năng lực quản lý”.",
      ),
      [G(36)]: grammar(
        "Dùng “拿……来说” để đưa một trường hợp nguồn cụ thể làm ví dụ, rồi giới hạn kết luận ở chính trường hợp đó.",
        "拿分享会后的问卷来说，七成听众自报更了解职业，却没有完成能证明岗位判断能力的任务。",
        "Lấy bảng hỏi sau buổi chia sẻ làm ví dụ, 70% người nghe tự báo hiểu nghề hơn, nhưng họ chưa làm nhiệm vụ chứng minh năng lực phán đoán yêu cầu công việc.",
        "Ví dụ minh họa điểm yếu của bảng hỏi này; nó không chứng minh mọi bảng hỏi mức độ hài lòng đều vô ích.",
      ),
      [G(37)]: grammar(
        "Dùng “再也不/没……” để bác bỏ thái độ cho rằng một loại bằng chứng mới khiến việc kiểm chứng sau đó trở nên không cần thiết.",
        "收到主管的好评信以后，公司也不能说再也不用检查候选人处理新情境的能力。",
        "Sau khi nhận thư đánh giá tốt của quản lý, công ty vẫn không thể nói rằng từ nay không cần kiểm tra năng lực xử lý tình huống mới của ứng viên.",
        "Câu phủ định nhắm vào việc ngừng kiểm chứng; không phủ nhận giá trị của thư đánh giá đối với hành vi đã được quan sát.",
      ),
      [G(38)]: grammar(
        "Dùng “怎么都/也不……” để nhấn mạnh rằng dù một chỉ báo có vẻ tích cực đến đâu, nó vẫn không thay thế được bằng chứng kỹ năng khác loại.",
        "感谢信写得怎么积极，也不能代替会前会后的岗位理解任务，更不能直接证明能力增长。",
        "Thư cảm ơn dù tích cực đến đâu cũng không thể thay nhiệm vụ hiểu nghề trước và sau buổi chia sẻ, càng không thể trực tiếp chứng minh năng lực tăng.",
        "Sự nhấn mạnh chỉ áp dụng cho quan hệ thay thế bằng chứng; không kết luận thư cảm ơn là giả hoặc hoạt động không có ích.",
      ),
      [G(39)]: grammar(
        "Dùng “为了……而……” để nêu rõ mục đích thiết kế đánh giá và hành động được thực hiện nhằm đạt mục đích ấy.",
        "学院为了区分活动受欢迎和知识真正增加而设置会前、会后两项可比较的任务。",
        "Học viện thiết kế hai nhiệm vụ có thể so sánh trước và sau nhằm phân biệt hoạt động được yêu thích với việc kiến thức thực sự tăng.",
        "Cấu trúc biểu thị mục đích của lần đánh giá sau; chưa khẳng định thiết kế mới đã đo chính xác hoặc đã tạo ra cải thiện.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "公司只把毕业生推进下一轮，独立协调项目的能力还要通过情境任务检查。",
        claimVi:
          "Công ty chỉ đưa ứng viên vào vòng tiếp theo; năng lực tự điều phối dự án vẫn phải được kiểm tra bằng nhiệm vụ tình huống.",
        classification: "fact",
        sourceRef: ref(SOURCE.internshipReading, "rp2", "rp3"),
        rationaleVi:
          "Đoạn 2 nêu ví dụ ứng viên xử lý thông tin theo quy trình; đoạn 3 ghi rõ công ty chỉ công nhận bằng chứng về tổ chức thông tin và giao tiếp, còn điều phối độc lập vẫn chờ kiểm tra.",
        inferenceBoundaryVi:
          "Không được suy ra ứng viên đã trượt hoặc đã đỗ vị trí; nguồn chỉ mô tả quyết định vào vòng sau và phần năng lực còn thiếu bằng chứng.",
      },
      {
        claimHanzi:
          "七成听众自报更了解职业，说明分享会已经提高了他们判断岗位要求的能力。",
        claimVi:
          "Việc 70% người nghe tự báo hiểu nghề hơn cho thấy buổi chia sẻ đã nâng năng lực phán đoán yêu cầu công việc của họ.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.careerEventListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn xác nhận tỷ lệ tự báo và mức độ được yêu thích, nhưng chỉ ra không có mức trước hoạt động, không yêu cầu ví dụ và người trả lời có thể tự chọn; năng lực vẫn chờ nhiệm vụ so sánh.",
        inferenceBoundaryVi:
          "Có thể nói người trả lời cảm thấy hiểu hơn, nhưng chưa thể gọi đó là thay đổi năng lực hoặc quan hệ nhân quả do buổi chia sẻ.",
      },
    ],
    paraphrases: [
      {
        promptVi:
          "Viết lại kết luận tuyển dụng, giữ riêng ba mức: đã có bằng chứng, có thể có và còn phải kiểm tra.",
        sourceRef: ref(SOURCE.internshipReading, "rp1", "rp2", "rp3"),
        modelHanzi:
          "三个月实习和主管来信支持毕业生会整理信息、按流程报告；这些材料使协调潜力值得继续考察，却没有证明他能独立负责整个项目，因此公司只让他进入下一轮情境任务。",
        modelVi:
          "Ba tháng thực tập cùng thư của quản lý cho thấy ứng viên biết tổ chức thông tin và báo cáo theo quy trình. Các tài liệu khiến tiềm năng điều phối đáng được xem xét tiếp, nhưng chưa chứng minh anh ấy có thể tự chịu trách nhiệm toàn bộ dự án, nên công ty chỉ cho vào vòng nhiệm vụ tình huống.",
        preservedFactsVi: [
          "Thực tập kéo dài ba tháng và có thư đánh giá của quản lý.",
          "Công ty công nhận bằng chứng về tổ chức thông tin, giao tiếp theo quy trình và chỉ cho vào vòng sau.",
          "Năng lực điều phối dự án độc lập vẫn phải được kiểm tra.",
        ],
        prohibitedExpansionVi:
          "Không thêm kết quả tuyển dụng cuối cùng, không gọi thư đánh giá là chứng nhận toàn bộ năng lực và không gán cho ứng viên quyền tự đổi kế hoạch sản xuất.",
      },
      {
        promptVi:
          "Paraphrase kết luận về buổi chia sẻ nghề nghiệp mà không đổi tự báo cáo thành bằng chứng năng lực.",
        sourceRef: ref(SOURCE.careerEventListening, "lp1", "lp2", "lp3"),
        modelHanzi:
          "分享会受到欢迎，七成答卷者也说自己更了解职业；不过问卷没有会前比较或能力任务，回复者还可能更有兴趣，所以现阶段只能报告满意度和自我感受，岗位判断能力要等新任务验证。",
        modelVi:
          "Buổi chia sẻ được đón nhận và 70% người trả lời nói họ hiểu nghề hơn. Tuy vậy, bảng hỏi không có so sánh trước hoạt động hay nhiệm vụ năng lực, người phản hồi cũng có thể vốn quan tâm hơn; vì thế hiện chỉ báo cáo được mức hài lòng và cảm nhận tự thân, còn năng lực phán đoán nghề phải chờ nhiệm vụ mới.",
        preservedFactsVi: [
          "Bảy mươi phần trăm người trả lời tự báo hiểu nghề hơn.",
          "Bảng hỏi thiếu mức trước hoạt động và không yêu cầu nhiệm vụ chứng minh năng lực.",
          "Học viện dự định thêm nhiệm vụ trước–sau trong lần tiếp theo.",
        ],
        prohibitedExpansionVi:
          "Không nói toàn bộ người nghe đều cải thiện, không quy kết người không trả lời và không dự đoán nhiệm vụ mới chắc chắn chứng minh tác động.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai nguồn phân biệt kinh nghiệm hoặc cảm nhận tích cực với năng lực đã được chứng minh.",
      requiredElementsVi: [
        "bằng chứng cụ thể từ thực tập",
        "phần điều phối độc lập còn chờ kiểm tra",
        "tỷ lệ tự báo sau buổi chia sẻ",
        "điểm yếu của bảng hỏi và nhiệm vụ bổ sung",
      ],
      evidenceRefs: [
        ref(SOURCE.internshipReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.careerEventListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "毕业生用三个月实习、处理材料迟到的例子和主管来信，证明自己会整理信息并按流程沟通，公司因此让他进入下一轮，但独立协调项目仍待情境任务验证。职业分享会后，七成答卷者自报更了解岗位，感谢信也说明活动受欢迎；然而问卷没有会前水平、具体例子或能力比较。学院下次将增加前后任务。两份材料都把积极信号与已经证明的能力分开。",
      modelVi:
        "Ứng viên dùng ba tháng thực tập, ví dụ xử lý vật liệu đến muộn và thư quản lý để chứng minh mình biết tổ chức thông tin, giao tiếp theo quy trình; công ty cho vào vòng sau nhưng năng lực điều phối độc lập vẫn chờ nhiệm vụ tình huống. Sau buổi chia sẻ, 70% người trả lời tự báo hiểu nghề hơn và thư cảm ơn cho thấy hoạt động được yêu thích, song bảng hỏi thiếu mức trước, ví dụ cụ thể và phép so sánh năng lực. Học viện sẽ thêm nhiệm vụ trước–sau. Cả hai nguồn đều tách tín hiệu tích cực khỏi năng lực đã được chứng minh.",
      prohibitedExpansionVi:
        "Không tuyên bố ứng viên đủ năng lực quản lý, người nghe đã tăng năng lực hay bất kỳ công cụ mới nào đã được hiệu chuẩn.",
    },
    argument: {
      promptVi:
        "Lập luận xem kinh nghiệm thực tập và phản hồi hài lòng có đủ để dùng làm bằng chứng năng lực trong tuyển dụng hoặc giáo dục không.",
      requiredElementsVi: [
        "luận điểm phân biệt tín hiệu và năng lực",
        "ít nhất một hành vi cụ thể từ thực tập",
        "tỷ lệ tự báo cùng giới hạn bảng hỏi",
        "phản biện về giá trị thực tế của kinh nghiệm và phản hồi",
        "kết luận giới hạn theo loại nhiệm vụ và mẫu",
      ],
      evidenceRefs: [
        ref(SOURCE.internshipReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.careerEventListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "实习经历和满意度反馈都值得参考，却不应单独承担能力证明。毕业生能说明材料晚到时怎样确认顺序、通知师傅和办公室并留下记录，这比只列任务更接近可观察行为，也支持他进入下一轮。但是，按要求沟通不等于独立协调整个项目，公司仍需情境任务。分享会的七成答卷者自报更了解职业，感谢信也显示活动受欢迎；拿这些结果来说，它们能帮助改进活动，却没有会前基线、具体例子或岗位判断任务。有人会说真实经历和听众反应比考试更自然，过多测试反而浪费时间。这个意见有道理，所以评估不必否定经历，而应把它变成可核查的行为证据，再用短任务补足未观察的能力。结论只适用于这名候选人与这次分享会；新任务尚未实施，不能预告能力一定提高。",
      modelVi:
        "Kinh nghiệm thực tập và phản hồi hài lòng đều đáng tham khảo nhưng không nên một mình gánh vai trò chứng minh năng lực. Ứng viên mô tả được khi vật liệu đến muộn đã xác nhận thứ tự ảnh hưởng, báo cho thợ và văn phòng, để lại ghi chép; hành vi này cụ thể hơn danh sách nhiệm vụ và đủ để vào vòng sau. Tuy nhiên, giao tiếp đúng yêu cầu không đồng nghĩa tự điều phối cả dự án, nên công ty vẫn cần nhiệm vụ tình huống. Ở buổi chia sẻ, 70% người trả lời tự báo hiểu nghề hơn và thư cảm ơn cho thấy hoạt động được yêu thích, nhưng thiếu mức trước, ví dụ cụ thể và nhiệm vụ phán đoán nghề. Có ý kiến rằng trải nghiệm thật và phản hồi tự nhiên hơn bài kiểm tra, kiểm tra quá nhiều tốn thời gian. Điều đó hợp lý: không phủ nhận trải nghiệm mà chuyển nó thành hành vi có thể kiểm chứng, rồi dùng nhiệm vụ ngắn bù phần chưa quan sát. Kết luận chỉ áp dụng cho ứng viên và hoạt động này; nhiệm vụ mới chưa triển khai nên chưa thể dự báo năng lực chắc chắn tăng.",
      counterargumentVi:
        "Kinh nghiệm thực tế cùng phản hồi trực tiếp phản ánh bối cảnh tự nhiên hơn bài kiểm tra, còn thêm đánh giá có thể gây tốn thời gian và làm người học hoặc ứng viên căng thẳng.",
      conclusionBoundaryVi:
        "Chỉ đề xuất kết hợp hành vi quan sát được với nhiệm vụ ngắn cho hai trường hợp nguồn; không xếp hạng mọi phương pháp tuyển dụng hoặc giáo dục.",
    },
    spoken: {
      promptVi:
        "Trong ba phút, bảo vệ một quy tắc giúp hội đồng phân biệt dữ kiện, diễn giải và phần năng lực còn chờ kiểm tra.",
      requiredMovesVi: [
        "nêu một dữ kiện có thể truy về nguồn",
        "chỉ ra một diễn giải vượt quá dữ kiện",
        "đề xuất nhiệm vụ bổ sung đúng kỹ năng",
        "trả lời phản biện rằng đánh giá thêm gây tốn thời gian",
      ],
      evidenceRefs: [
        ref(SOURCE.internshipReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.careerEventListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先把实习行为、主管来信和七成自报分别列为可追查事实。",
        "再说明按流程沟通不等于独立协调，自报理解也不等于能力提高。",
        "招聘使用情境任务，课程活动使用会前会后岗位判断任务。",
        "若担心时间，可缩短任务，但不能让感谢信代替未观察的技能。",
        "结论只覆盖这名候选人和这次活动，结果仍待验证。",
      ],
      modelOutlineVi: [
        "Trước tiên liệt kê hành vi thực tập, thư quản lý và tỷ lệ 70% tự báo như các dữ kiện truy được.",
        "Sau đó nói rõ giao tiếp theo quy trình không đồng nghĩa điều phối độc lập, tự báo hiểu cũng không đồng nghĩa năng lực tăng.",
        "Tuyển dụng dùng nhiệm vụ tình huống; hoạt động giáo dục dùng nhiệm vụ phán đoán nghề trước–sau.",
        "Nếu lo thời gian có thể rút ngắn nhiệm vụ, nhưng không để thư cảm ơn thay kỹ năng chưa quan sát.",
        "Kết luận chỉ bao phủ ứng viên và hoạt động này; kết quả vẫn phải kiểm tra.",
      ],
    },
  },

  "hsk4-stance-comparison-rhetoric-lesson-02": {
    sourceTextIds: [
      SOURCE.workRecordsReading,
      SOURCE.selfStudyPlatformListening,
    ],
    grammarApplications: {
      [G(40)]: grammar(
        "Dùng mẫu “động từ + 一X是一X” để thừa nhận một ưu điểm có thật trước khi nêu giới hạn so sánh của nó.",
        "数字表比较起来方便是方便，却解释不了复杂客户为什么需要更多时间。",
        "Bảng số liệu đúng là thuận tiện khi so sánh, nhưng không giải thích được vì sao khách hàng phức tạp cần nhiều thời gian hơn.",
        "Vế nhượng bộ chỉ công nhận sự thuận tiện khi so sánh; không suy ra bảng số liệu vô dụng hoặc thảo luận luôn tốt hơn.",
      ),
      [G(41)]: grammar(
        "Dùng “（没）有什么（好）X的” để hạ nhiệt tranh cãi giả tạo khi hai chỉ báo đang đo hai mục tiêu khác nhau.",
        "登录次数和连续学习时间没有什么好争高低的，先说明学习目标和指标范围更重要。",
        "Số lần đăng nhập và thời gian học liên tục không có gì đáng tranh hơn kém; quan trọng hơn là nói rõ mục tiêu học và phạm vi chỉ báo.",
        "Mẫu câu không phủ nhận khả năng so sánh khi mục tiêu giống nhau; nó bác việc xếp hạng trước khi xác định tiêu chí.",
      ),
      [G(42)]: grammar(
        "Dùng “X是X，Y是Y” để tách hai phép đo dễ bị trộn lẫn và giữ mỗi kết luận trong đúng khái niệm.",
        "登录次数是登录次数，连续学习时间是连续学习时间，不能把两者都叫作同一种积极程度。",
        "Số lần đăng nhập là số lần đăng nhập, thời gian học liên tục là thời gian học liên tục; không thể gọi cả hai là cùng một mức độ tích cực.",
        "Câu tách khái niệm không nói hai chỉ báo hoàn toàn không liên quan; nó chỉ cấm nhập chúng thành một biến mà không giải thích.",
      ),
      [G(43)]: grammar(
        "Dùng “X也得X，不X也得X” để nêu yêu cầu chung cho hai lựa chọn, tránh thiên vị công cụ hay phương thức.",
        "使用平台也得说明目标，不使用平台也得留下可比较的学习记录。",
        "Dùng nền tảng cũng phải nêu mục tiêu, không dùng nền tảng cũng phải để lại hồ sơ học có thể so sánh.",
        "Yêu cầu chung là minh bạch mục tiêu và bằng chứng; không bắt mọi người dùng cùng công cụ, chỉ báo hoặc tần suất.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "销售组的数字表容易比较，设计组的讨论更能解释背景，但两种记录各有缺点。",
        claimVi:
          "Bảng số của nhóm bán hàng dễ so sánh, thảo luận của nhóm thiết kế giải thích bối cảnh tốt hơn, nhưng mỗi cách ghi đều có nhược điểm.",
        classification: "fact",
        sourceRef: ref(SOURCE.workRecordsReading, "rp1", "rp2"),
        rationaleVi:
          "Hai đoạn đầu mô tả trực tiếp mục tiêu, ưu điểm và hạn chế của từng phương thức: số liệu dễ so sánh nhưng thiếu nguyên nhân, thảo luận giàu bối cảnh nhưng khó so trước–sau.",
        inferenceBoundaryVi:
          "Không được suy ra mọi đội bán hàng hoặc thiết kế đều phù hợp với cùng một cách ghi; nguồn chỉ nói về công ty và giai đoạn quan sát này.",
      },
      {
        claimHanzi:
          "第一组打开平台次数更多，所以他们一定比第二组更努力、学得也更好。",
        claimVi:
          "Nhóm một mở nền tảng nhiều lần hơn nên chắc chắn chăm chỉ hơn và học tốt hơn nhóm hai.",
        classification: "interpretation",
        sourceRef: ref(
          SOURCE.selfStudyPlatformListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        rationaleVi:
          "Nguồn chỉ xác nhận nhóm một đăng nhập và hoàn thành bài ngắn nhiều hơn; nhóm hai học mỗi lần lâu hơn, có ghi chép riêng và mục tiêu hai nhóm không giống nhau.",
        inferenceBoundaryVi:
          "Không thể đổi tần suất đăng nhập thành nỗ lực tổng thể hoặc kết quả học, cũng không thể xếp hạng hai nhóm khi chưa thống nhất mục tiêu.",
      },
    ],
    paraphrases: [
      {
        promptVi:
          "Viết lại quyết định về ghi nhận hiệu suất, giữ cả phần chung lẫn quyền điều chỉnh theo bộ phận.",
        sourceRef: ref(SOURCE.workRecordsReading, "rp1", "rp2", "rp3"),
        modelHanzi:
          "公司没有在数字表和讨论之间选唯一方案，而是要求各组保留少量共同指标并补充简短背景。提交频率可按部门调整，因为销售组认为说明减少误解，设计组却觉得每周填表负担较大。",
        modelVi:
          "Công ty không chọn một giải pháp duy nhất giữa bảng số và thảo luận, mà yêu cầu các nhóm giữ một ít chỉ báo chung rồi bổ sung bối cảnh ngắn. Tần suất nộp có thể điều chỉnh theo bộ phận, vì nhóm bán hàng thấy phần giải thích giảm hiểu lầm, còn nhóm thiết kế coi việc điền hằng tuần là gánh nặng.",
        preservedFactsVi: [
          "Công ty kết hợp một ít chỉ báo chung với phần giải thích dưới một trăm chữ.",
          "Nhóm bán hàng và thiết kế phản ứng khác nhau trong ba tháng thử nghiệm.",
          "Bộ phận được chọn tần suất hằng tuần hoặc hai tuần một lần.",
        ],
        prohibitedExpansionVi:
          "Không nói mô hình kết hợp đã nâng hiệu suất, không coi một phản ứng là đại diện toàn công ty và không bỏ thời hạn thử nghiệm ba tháng.",
      },
      {
        promptVi:
          "Paraphrase so sánh hai nhóm tự học mà không dùng một chỉ báo để xếp hạng toàn bộ hành vi.",
        sourceRef: ref(
          SOURCE.selfStudyPlatformListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        modelHanzi:
          "第一组登录和完成短练习更多，第二组单次学习更久，也在个人笔记中整理难题。由于两组目标不同，登录次数和连续时间只能描述不同侧面；下一轮需先选目标、调节提醒，再结合平台与个人记录判断条件。",
        modelVi:
          "Nhóm một đăng nhập và hoàn thành bài ngắn nhiều hơn; nhóm hai học lâu hơn mỗi lần và ghi lại câu khó trong sổ cá nhân. Vì mục tiêu khác nhau, số lần đăng nhập và thời gian liên tục chỉ mô tả các mặt khác nhau; vòng sau phải chọn mục tiêu trước, chỉnh nhắc nhở rồi kết hợp nhật ký nền tảng với hồ sơ cá nhân để xét điều kiện.",
        preservedFactsVi: [
          "Nhóm một mở nền tảng và hoàn thành bài ngắn nhiều hơn.",
          "Nhóm hai học mỗi lần lâu hơn và có ghi chép câu khó riêng.",
          "Nghiên cứu chỉ gồm hai lớp với mục tiêu không hoàn toàn giống nhau.",
        ],
        prohibitedExpansionVi:
          "Không nói nhóm nào học tốt hơn, không quy mọi khác biệt cho nhắc nhở và không gọi vòng thử tiếp theo là bằng chứng đã có.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt vì sao hai nguồn không thể dùng một chỉ báo duy nhất để so sánh hiệu suất làm việc hoặc tự học.",
      requiredElementsVi: [
        "ưu và nhược điểm của số liệu cùng thảo luận",
        "giải pháp chỉ báo chung và phần giải thích",
        "hai kiểu hành vi trên nền tảng",
        "khác biệt mục tiêu và giới hạn mẫu",
      ],
      evidenceRefs: [
        ref(SOURCE.workRecordsReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.selfStudyPlatformListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "销售组的数字表便于比较，却解释不了复杂客户；设计组的讨论提供背景，却难以比较变化。公司因此保留少量共同指标和简短说明，并允许不同提交频率。自学测试中，第一组登录和短练习更多，第二组单次学习更久并记录难题。两组目标不同，只看登录次数会产生偏差。学校下一轮将先让学生选目标，再结合平台日志与个人记录。两份材料都要求指标服务于具体目的。",
      modelVi:
        "Bảng số của nhóm bán hàng dễ so sánh nhưng không giải thích khách hàng phức tạp; thảo luận của nhóm thiết kế có bối cảnh nhưng khó so thay đổi. Công ty vì thế giữ một ít chỉ báo chung và phần giải thích ngắn, đồng thời cho phép tần suất khác nhau. Trong thử nghiệm tự học, nhóm một đăng nhập và làm bài ngắn nhiều hơn, nhóm hai học lâu hơn mỗi lần và ghi câu khó. Mục tiêu hai nhóm khác nhau nên chỉ nhìn đăng nhập sẽ lệch. Trường sẽ cho chọn mục tiêu trước rồi kết hợp nhật ký nền tảng với hồ sơ cá nhân. Cả hai nguồn đều buộc chỉ báo phục vụ mục tiêu cụ thể.",
      prohibitedExpansionVi:
        "Không kết luận cách kết hợp đã tăng hiệu suất hoặc nền tảng phù hợp với mọi người; các vòng thử và khảo sát sau vẫn chưa hoàn tất.",
    },
    argument: {
      promptVi:
        "Lập luận xem tổ chức có nên bắt mọi bộ phận và mọi người học dùng cùng một chỉ báo để tăng tính công bằng hay không.",
      requiredElementsVi: [
        "luận điểm về trường chung và chỉ báo theo mục tiêu",
        "so sánh số liệu với giải thích bối cảnh",
        "so sánh đăng nhập với thời gian học liên tục",
        "phản biện về tính công bằng và chi phí quản lý",
        "giới hạn theo bộ phận, lớp và thời gian thử",
      ],
      evidenceRefs: [
        ref(SOURCE.workRecordsReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.selfStudyPlatformListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "组织应保留少量共同字段，却不应强迫所有部门和学习者只用一个指标。销售数字表方便比较，却不能解释复杂客户；设计讨论能说明合作困难，却缺少统一记录。公司把共同指标与百字说明结合，并允许不同提交频率。自学平台也显示同样问题：第一组登录与短练习更多，第二组单次学习更久并记录难题。登录次数是登录次数，连续学习时间是连续学习时间，目标不同就不能合成努力分数。反对者说统一指标公平且省管理成本。共同字段确有必要；但若遮住过程或目标，表面公平会产生错误结论。较稳妥的做法是先声明目标，再用共同核心加补充证据。材料只涉及一家公司和两个班，后续调查未完成，不能证明这种结构适合所有机构。",
      modelVi:
        "Tổ chức nên giữ một số trường chung nhưng không nên ép mọi bộ phận và người học chỉ dùng một chỉ báo. Bảng số của bán hàng đúng là tiện so sánh nhưng không giải thích khách hàng phức tạp; thảo luận thiết kế giải thích khó khăn hợp tác nhưng thiếu ghi chép thống nhất. Công ty kết hợp chỉ báo chung với phần giải thích một trăm chữ và cho phép nộp hằng tuần hoặc hai tuần, tách được khả năng so sánh khỏi khác biệt nhiệm vụ. Nền tảng tự học cho thấy vấn đề tương tự: nhóm một đăng nhập và làm bài ngắn nhiều, nhóm hai học lâu mỗi lượt và ghi câu khó. Đăng nhập là đăng nhập, thời gian liên tục là thời gian liên tục; mục tiêu khác thì không thể nhập thành một điểm nỗ lực. Người phản đối sẽ nói chỉ báo thống nhất công bằng và giảm chi phí. Vì vậy vẫn cần lõi chung, nhưng nếu nó che quá trình hoặc mục tiêu, công bằng bề mặt tạo kết luận sai. Cách chắc hơn là tuyên bố mục tiêu rồi dùng lõi chung kèm bằng chứng bổ sung. Nguồn chỉ gồm một công ty và hai lớp; thử ba tháng cùng vòng nghiên cứu sau chưa xong, nên chưa thể khái quát cho mọi tổ chức.",
      counterargumentVi:
        "Một chỉ báo thống nhất tạo chuẩn dễ hiểu, giảm chi phí tổng hợp và tránh việc mỗi nhóm tự chọn tiêu chí có lợi cho mình.",
      conclusionBoundaryVi:
        "Chỉ ủng hộ lõi chung cộng chỉ báo bổ sung trong hai bối cảnh nguồn; chưa xác định bộ chỉ báo tối ưu hoặc tác động dài hạn.",
    },
    spoken: {
      promptVi:
        "Bảo vệ trong ba phút nguyên tắc “cùng lõi, khác bổ sung” trước người quản lý muốn dùng một điểm số duy nhất.",
      requiredMovesVi: [
        "nêu lợi ích thật của chỉ báo chung",
        "đối chiếu hai hạn chế từ nguồn công việc",
        "đối chiếu đăng nhập với thời gian học liên tục",
        "đáp lại lo ngại về công bằng và chi phí",
      ],
      evidenceRefs: [
        ref(SOURCE.workRecordsReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.selfStudyPlatformListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "共同字段能比较，也能防止各组只报告有利信息。",
        "数字表缺背景，讨论缺统一，所以核心字段应配简短说明。",
        "登录多与单次学习久代表不同侧面，不能直接排努力高低。",
        "为控制成本，可限制补充字段长度和提交频率，而不是删除背景。",
        "本结论来自一个公司和两个班，仍需后续调查。",
      ],
      modelOutlineVi: [
        "Trường chung giúp so sánh và ngăn mỗi nhóm chỉ báo điều có lợi.",
        "Bảng số thiếu bối cảnh, thảo luận thiếu thống nhất, nên lõi chung cần đi với giải thích ngắn.",
        "Đăng nhập nhiều và học lâu mỗi lượt là hai mặt khác nhau, không xếp trực tiếp mức nỗ lực.",
        "Để kiểm soát chi phí có thể giới hạn độ dài trường bổ sung và tần suất, không xóa bối cảnh.",
        "Kết luận đến từ một công ty và hai lớp, vẫn cần khảo sát tiếp.",
      ],
    },
  },

  "hsk4-stance-comparison-rhetoric-lesson-03": {
    sourceTextIds: [
      SOURCE.studySupportReading,
      SOURCE.officeTrainingListening,
    ],
    grammarApplications: {
      [G(44)]: grammar(
        "Dùng “X就是了” để nêu một bước hành động đủ và có giới hạn, thay vì biến một giải pháp thành nguyên nhân duy nhất.",
        "下一轮分别比较有无目标卡的时段就是了，不能先认定导师是持续参加人数增加的唯一原因。",
        "Vòng sau chỉ cần so riêng các khung giờ có và không có thẻ mục tiêu; không thể định trước rằng cố vấn là nguyên nhân duy nhất khiến số người tham gia đều tăng.",
        "Mẫu câu giới hạn đề xuất kiểm tra tiếp; không bảo đảm phép so sánh đó tự nó tách được mọi yếu tố như thời lượng và kỳ thi đến gần.",
      ),
      [G(45)]: grammar(
        "Dùng “还X呢” trong phản vấn khẩu ngữ để chỉ ra rằng tuyên bố mạnh đang đi trước bằng chứng cần thiết.",
        "三个月后的错误率还没检查，还谈什么培训已经取得长期成功呢？",
        "Tỷ lệ lỗi sau ba tháng còn chưa được kiểm tra, nói gì đến chuyện khóa đào tạo đã thành công dài hạn?",
        "Phản vấn bác tuyên bố thành công dài hạn ở thời điểm hiện tại; không phủ nhận mức giảm lỗi ngắn hạn được nguồn ghi nhận.",
      ),
      [G(46)]: grammar(
        "Dùng “你X你的吧” để nhận diện thái độ gạt bỏ ý kiến đối phương trong lời thoại, rồi thay nó bằng đánh giá dựa trên bằng chứng.",
        "如果管理层只说“你问你的吧”，员工关于特殊情况的困难就不会进入培训设计。",
        "Nếu ban quản lý chỉ nói “cứ hỏi phần của anh đi”, khó khăn của nhân viên về trường hợp đặc biệt sẽ không đi vào thiết kế đào tạo.",
        "Đây là câu giả định dùng để phân tích sắc thái gạt bỏ; nguồn không ghi quản lý đã nói nguyên văn câu này.",
      ),
      [G(47)]: grammar(
        "Dùng “让/叫你X你就X” để mô tả việc làm theo yêu cầu, đồng thời tách sự tuân thủ khỏi sự chấp nhận hay hiểu biết lâu dài.",
        "培训让员工处理案例，员工就按步骤处理；这能观察操作，却不能单独证明他们长期接受新系统。",
        "Khóa đào tạo yêu cầu nhân viên xử lý tình huống thì họ làm theo bước; điều đó quan sát được thao tác nhưng không tự chứng minh họ chấp nhận hệ thống lâu dài.",
        "Câu chỉ mô tả hành vi trong buổi huấn luyện; không gán động cơ, mức hài lòng hoặc khả năng duy trì sau ba tháng.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "自习项目调整后，持续参加者从四十人增加到七十二人，但多项条件同时变化。",
        claimVi:
          "Sau khi chương trình tự học điều chỉnh, số người tham gia đều tăng từ 40 lên 72, nhưng nhiều điều kiện thay đổi cùng lúc.",
        classification: "fact",
        sourceRef: ref(SOURCE.studySupportReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn cung cấp hai con số và liệt kê đồng thời thời lượng ngắn hơn, thẻ mục tiêu, cố vấn, quy tắc hủy linh hoạt cùng thời điểm thi đến gần.",
        inferenceBoundaryVi:
          "Không được chọn riêng cố vấn, thẻ mục tiêu hay bất kỳ điều kiện nào làm nguyên nhân duy nhất trước phép so sánh tiếp theo.",
      },
      {
        claimHanzi:
          "第二次培训后基本错误减少一半，足以证明案例教学造成了全部改善。",
        claimVi:
          "Sau lần đào tạo hai, lỗi cơ bản giảm một nửa, đủ chứng minh dạy bằng tình huống đã tạo ra toàn bộ cải thiện.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.officeTrainingListening, "lp2", "lp3"),
        rationaleVi:
          "Nguồn xác nhận lỗi cơ bản giảm và thời gian xử lý trường hợp đặc biệt ngắn hơn, nhưng cũng nêu hiệu ứng làm quen do hệ thống mới và kế hoạch so sánh sau ba tháng.",
        inferenceBoundaryVi:
          "Có thể nói dạy bằng tình huống có bằng chứng hỗ trợ ngắn hạn, không được quy toàn bộ cải thiện cho nó hoặc gọi kết quả là lâu dài.",
      },
    ],
    paraphrases: [
      {
        promptVi:
          "Paraphrase kết quả chương trình tự học theo thứ tự: thay đổi, kết quả, cách giải thích và phép kiểm tra tiếp.",
        sourceRef: ref(SOURCE.studySupportReading, "rp1", "rp2", "rp3"),
        modelHanzi:
          "项目把固定三小时改成九十分钟单元，增加目标卡、导师拆分任务和灵活取消，四周后持续参加者由四十人增至七十二人。由于考试临近等条件也在变化，学院只说多项条件共同支持坚持，并将比较有无目标卡的时段。",
        modelVi:
          "Chương trình đổi ba giờ cố định thành đơn vị 90 phút, thêm thẻ mục tiêu, cố vấn chia nhiệm vụ và hủy linh hoạt; sau bốn tuần số người tham gia đều tăng từ 40 lên 72. Vì kỳ thi đến gần và các điều kiện khác cùng thay đổi, học viện chỉ nói nhiều điều kiện cùng hỗ trợ sự kiên trì, rồi sẽ so khung giờ có và không có thẻ mục tiêu.",
        preservedFactsVi: [
          "Bốn thay đổi chính được triển khai trong giai đoạn hai.",
          "Số người tham gia liên tục tăng từ bốn mươi lên bảy mươi hai sau bốn tuần.",
          "Học viện chưa chỉ ra một nguyên nhân duy nhất và sẽ so thẻ mục tiêu.",
        ],
        prohibitedExpansionVi:
          "Không đổi số người thành tỷ lệ đỗ, không nói cố vấn là nguyên nhân duy nhất và không dự đoán kết quả phép so sánh tiếp theo.",
      },
      {
        promptVi:
          "Viết lại kết luận đào tạo công ty, giữ riêng kết quả hai tuần và kế hoạch kiểm tra ba tháng.",
        sourceRef: ref(SOURCE.officeTrainingListening, "lp1", "lp2", "lp3"),
        modelHanzi:
          "第二次培训用普通、缺文件和改行程三个案例，配合错误检查表。两周内基本报销错误减少一半，特殊处理也变快；不过员工可能因重复使用而自然熟悉，公司还要在三个月后比较参加者和未参加者。",
        modelVi:
          "Lần đào tạo hai dùng ba tình huống thường, thiếu giấy tờ và đổi lịch trình, kèm bảng kiểm lỗi. Trong hai tuần, lỗi hoàn tiền cơ bản giảm một nửa và xử lý đặc biệt nhanh hơn; tuy nhiên nhân viên có thể tự quen vì dùng lặp lại, nên công ty còn phải so người tham gia với người không tham gia sau ba tháng.",
        preservedFactsVi: [
          "Lần đào tạo hai dùng ba trường hợp cùng bảng kiểm lỗi.",
          "Sau hai tuần, lỗi cơ bản giảm một nửa và xử lý đặc biệt nhanh hơn.",
          "Công ty sẽ kiểm tra sau ba tháng và so hai nhóm tham gia khác nhau.",
        ],
        prohibitedExpansionVi:
          "Không gọi giảm lỗi là hiệu quả dài hạn, không bỏ yếu tố làm quen và không khẳng định so sánh sau sẽ xác nhận nguyên nhân.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt và sắp xếp sức nặng bằng chứng của hai can thiệp: chương trình tự học và đào tạo hệ thống báo phí.",
      requiredElementsVi: [
        "vấn đề thiết kế ban đầu",
        "các thay đổi được thực hiện",
        "kết quả ngắn hạn có số liệu",
        "nhiễu và phép so sánh còn chờ",
      ],
      evidenceRefs: [
        ref(SOURCE.studySupportReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.officeTrainingListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "晚间自习最初有百人报名，却只有四十人持续到场；改成九十分钟、目标卡、导师拆分任务和灵活取消后，持续参加者增至七十二人。报销培训也从二十分钟演示改为三个案例与检查表，两周后基本错误减少一半，特殊处理变快。两项结果都支持新设计有帮助，但考试临近、系统重复使用等因素尚未排除。学院将比较目标卡时段，公司则在三个月后比较参训与未参训员工。",
      modelVi:
        "Tự học buổi tối ban đầu có 100 người đăng ký nhưng chỉ 40 người đến đều; sau khi đổi thành 90 phút, thẻ mục tiêu, cố vấn chia nhiệm vụ và hủy linh hoạt, số này tăng lên 72. Đào tạo báo phí cũng chuyển từ trình diễn 20 phút sang ba tình huống và bảng kiểm; sau hai tuần lỗi cơ bản giảm một nửa, xử lý đặc biệt nhanh hơn. Cả hai kết quả ủng hộ thiết kế mới có ích, nhưng kỳ thi đến gần và việc lặp dùng hệ thống chưa được loại trừ. Học viện sẽ so khung giờ thẻ mục tiêu, công ty sẽ so người tham gia và không tham gia sau ba tháng.",
      prohibitedExpansionVi:
        "Không gán toàn bộ thay đổi cho một thành phần, không gọi kết quả ngắn hạn là thành công lâu dài và không thêm kết quả thi hoặc năng suất.",
    },
    argument: {
      promptVi:
        "Lập luận xem tổ chức nên mở rộng ngay can thiệp có kết quả ngắn hạn hay chờ phép so sánh mạnh hơn.",
      requiredElementsVi: [
        "luận điểm hành động có điều kiện",
        "số người tham gia và tỷ lệ lỗi",
        "nhiều thành phần thay đổi cùng lúc",
        "phản biện về chi phí của việc chờ đợi",
        "kết luận giới hạn theo thời gian và phép đo",
      ],
      evidenceRefs: [
        ref(SOURCE.studySupportReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.officeTrainingListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "短期结果足以支持有控制地继续，却不足以把方案当成已经证明的办法。自习项目中，持续参加者从四十人增至七十二人，但时间、目标卡、导师帮助和取消规则同时改变。报销培训用三个案例和检查表以后，两周内基本错误减少一半，员工也可能因重复使用而自然熟悉系统。这些行为与数字比单纯满意度更有力，仍不能指出哪项措施造成改善。有人认为等待会让学生和员工继续遇到困难，而且现有办法风险不高。这个反对意见合理，所以项目不必停止，可以保持当前规模，同时比较有无目标卡的时段，并在三个月后比较参训与未参训员工。若在比较前全面推广，就会失去了解原因的机会。结论只支持继续试验，不预测考试成绩、工作产量或长期效果。",
      modelVi:
        "Kết quả ngắn hạn đủ để tiếp tục có kiểm soát, nhưng chưa đủ để mở rộng như một giải pháp đã chứng minh. Ở chương trình tự học, số người đến đều tăng từ 40 lên 72 sau khi thời lượng, thẻ mục tiêu, hỗ trợ cố vấn và quy tắc hủy cùng thay đổi. Ở đào tạo báo phí, ba tình huống và bảng kiểm đi cùng việc lỗi cơ bản giảm một nửa sau hai tuần. Những tín hiệu này mạnh hơn cảm nhận đơn lẻ vì có hành vi và con số trước–sau, song vẫn chưa tách được thành phần nào tạo tác động. Kỳ thi đến gần có thể tăng động lực; nhân viên cũng có thể tự quen hệ thống. Có ý kiến rằng chờ thêm sẽ làm người học và nhân viên tiếp tục gặp khó, còn can thiệp hiện tại ít rủi ro. Vì vậy không cần dừng: có thể duy trì quy mô hiện tại, đồng thời so khung giờ có thẻ mục tiêu và kiểm tra hai nhóm sau ba tháng. Mở rộng toàn bộ trước các phép so sánh sẽ làm mất cơ hội học nguyên nhân. Kết luận chỉ nói về việc tiếp tục thử; nó không dự báo kết quả thi, năng suất hay hiệu quả lâu dài.",
      counterargumentVi:
        "Duy trì quy mô nhỏ và chờ thêm dữ liệu có thể làm chậm hỗ trợ, trong khi kết quả hiện tại tích cực và các thay đổi dường như ít rủi ro.",
      conclusionBoundaryVi:
        "Chỉ khuyến nghị tiếp tục thử có so sánh, không tuyên bố thành phần hiệu quả nhất, tác động dài hạn hoặc khả năng áp dụng cho tổ chức khác.",
    },
    spoken: {
      promptVi:
        "Trong ba phút, bảo vệ quyết định tiếp tục thử nhưng chưa mở rộng toàn bộ hai can thiệp.",
      requiredMovesVi: [
        "xếp hạng bằng chứng hành vi trước cảm nhận",
        "nêu hai kết quả định lượng ngắn hạn",
        "chỉ ra ít nhất hai yếu tố chưa tách",
        "trả lời phản biện rằng chờ đợi gây thiệt hại",
      ],
      evidenceRefs: [
        ref(SOURCE.studySupportReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.officeTrainingListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "四十增至七十二、错误减少一半，都是值得继续观察的行为信号。",
        "每个项目同时改变多个条件，不能把结果归给单一办法。",
        "考试临近与重复使用分别可能影响两项结果。",
        "不必停止服务，可保持当前规模并加入计划中的比较。",
        "三个月结果出来前，只能支持继续试验，不能支持全面推广。",
      ],
      modelOutlineVi: [
        "Từ 40 lên 72 và lỗi giảm một nửa là tín hiệu hành vi đáng quan sát tiếp.",
        "Mỗi chương trình đổi nhiều điều kiện cùng lúc nên không quy kết cho một biện pháp.",
        "Kỳ thi đến gần và việc dùng lặp lần lượt có thể ảnh hưởng hai kết quả.",
        "Không phải dừng hỗ trợ; giữ quy mô hiện tại và thêm phép so sánh đã lên kế hoạch.",
        "Trước kết quả ba tháng chỉ đủ ủng hộ thử tiếp, chưa đủ mở rộng toàn bộ.",
      ],
    },
  },

  "hsk4-stance-comparison-rhetoric-lesson-04": {
    sourceTextIds: [
      SOURCE.overtimeReading,
      SOURCE.officeEnvironmentListening,
    ],
    grammarApplications: {
      [G(48)]: grammar(
        "Dùng “说什么/怎么（着）也得X” để nêu một điều kiện tối thiểu không được bỏ qua dù có áp lực hay ý kiến phản đối.",
        "客户要求怎么变，负责人也得说明新增任务的优先级和必须延期的项目。",
        "Yêu cầu khách hàng dù thay đổi thế nào, người phụ trách vẫn phải nói rõ ưu tiên của nhiệm vụ mới và hạng mục buộc phải lùi.",
        "Điều kiện tối thiểu là minh bạch ưu tiên trong công ty này; không khẳng định công ty luôn có thể từ chối mọi yêu cầu khách hàng.",
      ),
      [G(49)]: grammar(
        "Dùng “X就X（点儿）吧” để nhượng bộ một phần trong lời nói, rồi chuyển sang điều kiện quan trọng hơn của lập luận.",
        "增加奖金就增加点儿吧，但还得减少等待审批后的集中返工，让休息时间更可预测。",
        "Tăng thưởng thì cứ tăng một phần, nhưng vẫn phải giảm làm lại dồn sau khi chờ duyệt và khiến thời gian nghỉ dễ dự đoán hơn.",
        "Câu nhượng bộ không quyết định mức tiền hay phủ nhận giá trị của thưởng; nguồn chỉ cho biết thưởng không giải quyết toàn bộ vấn đề.",
      ),
      [G(50)]: grammar(
        "Dùng “X是X” để công nhận một dữ kiện hoặc áp lực có thật trước khi bác kết luận rằng nó cho phép bỏ qua điều kiện khác.",
        "客户压力大是大，却不能因此让所有小组同时完成没有重新排序的任务。",
        "Áp lực từ khách hàng đúng là lớn, nhưng không vì thế mà buộc mọi nhóm đồng thời hoàn thành các nhiệm vụ chưa được xếp lại ưu tiên.",
        "Mẫu câu công nhận áp lực được quản lý nêu; không xác nhận mọi yêu cầu khách hàng đều hợp lý hoặc mọi tăng ca đều tránh được.",
      ),
      [G(53)]: grammar(
        "Dùng “难道……吗？” để phản vấn một suy luận quá mạnh, sau đó phải nêu bằng chứng và điều kiện thay vì chỉ dựa vào sắc thái.",
        "难道六成员工不满就能证明增加奖金一定比调整审批和优先级更有效吗？",
        "Chẳng lẽ sáu mươi phần trăm nhân viên không hài lòng đã chứng minh tăng thưởng chắc chắn hiệu quả hơn chỉnh phê duyệt và ưu tiên sao?",
        "Phản vấn chỉ bác phép so sánh chưa có dữ liệu; không chứng minh điều chỉnh quy trình chắc chắn tốt hơn tiền thưởng.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "记录显示，约三分之一的加班来自等待审批后出现的集中返工。",
        claimVi:
          "Hồ sơ cho thấy khoảng một phần ba thời gian tăng ca đến từ việc làm lại dồn sau khi chờ phê duyệt.",
        classification: "fact",
        sourceRef: ref(SOURCE.overtimeReading, "rp2"),
        rationaleVi:
          "Đoạn 2 nêu trực tiếp tỷ lệ một phần ba và nguyên nhân ghi trong hồ sơ, làm cơ sở chuyển thảo luận từ chỉ tăng tiền sang giảm tăng ca không cần thiết.",
        inferenceBoundaryVi:
          "Không được suy ra hai phần ba còn lại đều cần thiết hoặc chỉ cần sửa phê duyệt là xóa được toàn bộ tăng ca.",
      },
      {
        claimHanzi:
          "按活动设置可预约空间以后，员工满意度和工作结果一定都会提高。",
        claimVi:
          "Sau khi đặt không gian đặt trước theo hoạt động, mức hài lòng và kết quả làm việc của nhân viên chắc chắn đều tăng.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.officeEnvironmentListening, "lp2", "lp3"),
        rationaleVi:
          "Nguồn mô tả thiết kế mới và các chỉ báo sẽ thu thập, nhưng văn phòng chưa chính thức vận hành; cả hài lòng lẫn kết quả đều được gọi là chỉ báo chờ đo.",
        inferenceBoundaryVi:
          "Có thể nói thiết kế tổng hợp nhu cầu thảo luận và tập trung, không thể nói nó đã tạo kết quả hoặc giải quyết giao thông và ca làm.",
      },
    ],
    paraphrases: [
      {
        promptVi:
          "Viết lại thỏa thuận về tăng ca, giữ cả tiền thưởng, ưu tiên, phê duyệt và trạng thái chưa thử.",
        sourceRef: ref(SOURCE.overtimeReading, "rp1", "rp2", "rp3"),
        modelHanzi:
          "公司没有在奖金和流程之间二选一：它保留高峰奖金，要求新增任务同时说明延期项，并为超过一天的审批设置提醒。方案回应收入和可预测休息两种关切，但三个月试行尚未开始，不能断言加班会减少。",
        modelVi:
          "Công ty không chọn một trong hai giữa thưởng và quy trình: vẫn giữ thưởng giai đoạn cao điểm, yêu cầu nhiệm vụ mới phải nói hạng mục hoãn, và nhắc duyệt quá một ngày. Phương án đáp lại cả thu nhập lẫn nghỉ ngơi có thể dự đoán, nhưng thử nghiệm ba tháng chưa bắt đầu nên chưa thể khẳng định tăng ca sẽ giảm.",
        preservedFactsVi: [
          "Công ty giữ thưởng cao điểm và thêm quy tắc nêu ưu tiên cùng hạng mục bị hoãn.",
          "Phê duyệt quá một ngày sẽ có nhắc và nhóm kiểm tra nguyên nhân làm lại hằng tuần.",
          "Thử nghiệm ba tháng chưa bắt đầu.",
        ],
        prohibitedExpansionVi:
          "Không dự báo tăng ca chắc chắn giảm, không nói nhân viên đã hài lòng và không gán toàn bộ tăng ca cho khách hàng hay phê duyệt.",
      },
      {
        promptVi:
          "Paraphrase thiết kế văn phòng theo hoạt động mà không biến phương án thành kết quả đã đo.",
        sourceRef: ref(
          SOURCE.officeEnvironmentListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        modelHanzi:
          "试用发现同一员工会在讨论、写作和打电话之间转换，公司因此按活动设置开放桌、安静房和隔音位置，并计划收集噪音、使用率与任务自评。新办公室尚未启用，设计只能称为待检验方案。",
        modelVi:
          "Thử dùng cho thấy cùng một nhân viên chuyển giữa thảo luận, viết và gọi điện, nên công ty đặt bàn mở, phòng yên tĩnh và vị trí cách âm theo hoạt động, rồi dự kiến thu thập tiếng ồn, tỷ lệ sử dụng và tự đánh giá nhiệm vụ. Văn phòng mới chưa vận hành, vì thế thiết kế chỉ là phương án chờ kiểm tra.",
        preservedFactsVi: [
          "Nhu cầu thay đổi theo hoạt động, không chỉ theo kiểu người.",
          "Công ty tổ chức không gian có thể đặt trước theo hoạt động.",
          "Mức hài lòng và kết quả công việc chưa được đo ở văn phòng mới.",
        ],
        prohibitedExpansionVi:
          "Không nói thiết kế đã tăng năng suất, không bỏ vấn đề ca làm và giao thông, không gán nhu cầu cố định cho từng nhóm người.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai công ty dung hòa ý kiến đối lập bằng điều kiện vận hành thay vì chọn một phía.",
      requiredElementsVi: [
        "áp lực khách hàng và nhu cầu nghỉ có thể dự đoán",
        "thưởng cùng thay đổi ưu tiên và phê duyệt",
        "nhu cầu không gian theo hoạt động",
        "các chỉ báo và trạng thái chưa triển khai",
      ],
      evidenceRefs: [
        ref(SOURCE.overtimeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.officeEnvironmentListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "面对连续加班，经理强调客户合同，员工强调优先级混乱和休息不可预测；记录还显示三分之一加班与等待审批后的返工有关。公司保留奖金，同时要求新增任务说明延期项并提醒超时审批。办公室设计中，开放交流与安静写作也不是简单对立，同一人会随任务变化。公司改按活动设置空间，计划记录噪音、使用率和任务自评。两项方案都综合观点，但三个月试行和新办公室尚未开始。",
      modelVi:
        "Trước tăng ca kéo dài, quản lý nhấn mạnh hợp đồng khách hàng, nhân viên nhấn mạnh ưu tiên hỗn loạn và nghỉ không thể dự đoán; hồ sơ còn cho thấy một phần ba tăng ca liên quan làm lại sau chờ duyệt. Công ty giữ thưởng, đồng thời buộc nhiệm vụ mới nêu hạng mục hoãn và nhắc duyệt quá hạn. Trong thiết kế văn phòng, giao tiếp mở và viết yên tĩnh cũng không đối lập đơn giản vì cùng một người đổi theo nhiệm vụ. Công ty tổ chức không gian theo hoạt động, dự kiến ghi tiếng ồn, tỷ lệ dùng và tự đánh giá. Cả hai phương án tổng hợp quan điểm nhưng thử ba tháng và văn phòng mới chưa bắt đầu.",
      prohibitedExpansionVi:
        "Không nói các phương án đã giảm tăng ca, tăng hài lòng hoặc cải thiện kết quả làm việc; mọi chỉ báo chính vẫn chờ đo.",
    },
    argument: {
      promptVi:
        "Lập luận xem khi các bên có nhu cầu đối lập, quản lý nên chọn một phía rõ ràng hay xây điều kiện cho nhiều nhu cầu cùng tồn tại.",
      requiredElementsVi: [
        "luận điểm ưu tiên điều kiện kiểm chứng được",
        "bằng chứng một phần ba tăng ca",
        "khác biệt theo hoạt động trong văn phòng",
        "phản biện về chi phí và độ phức tạp",
        "kết luận giới hạn vì hai phương án chưa vận hành đủ",
      ],
      evidenceRefs: [
        ref(SOURCE.overtimeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.officeEnvironmentListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "当相反需求都有根据时，管理者应设置可检查的运行条件，不必急着只选一方。客户临时改要求是真的，但记录显示三分之一加班来自等待审批后的集中返工。奖金能补偿辛苦，却不能让休息时间更可预测，所以公司保留奖金，也要求新增任务说明优先级和延期项。办公室里，开放桌并非总比安静房好；同一员工会在讨论、写作和电话之间转换。按活动预约空间能让不同需求并存，并用噪音、使用率和任务自评检验。反对者认为多种规则与空间增加成本，单一决定更容易执行。这个担心值得测量，因此方案应限制规则数量和空间类型；可是只选一方会忽略另一类任务的证据。加班试行和新办公室都未完成，目前只能说这些条件可用于检验观点，不能说方案已经成功。",
      modelVi:
        "Khi nhu cầu đối lập nhưng đều có cơ sở, quản lý nên đặt điều kiện vận hành và đo riêng kết quả thay vì vội chọn một phía. Trong vấn đề tăng ca, khách hàng đổi yêu cầu là thật, nhưng hồ sơ cho thấy một phần ba tăng ca đến từ chờ duyệt rồi làm lại dồn. Tăng thưởng có thể bù công sức, song không làm thời gian dễ dự đoán. Vì vậy công ty vừa giữ thưởng vừa buộc nhiệm vụ mới nêu ưu tiên và hạng mục hoãn. Ở văn phòng, bàn mở không phải lúc nào cũng hơn phòng yên tĩnh: cùng một người có lúc thảo luận, có lúc viết hoặc gọi điện. Thiết kế theo hoạt động cho phép các nhu cầu cùng tồn tại và tạo chỉ báo tiếng ồn, sử dụng, tự đánh giá để kiểm tra. Người phản đối có thể nói nhiều quy tắc và loại không gian làm tăng chi phí, quyết định đơn giản dễ thực hiện hơn. Điều đó đúng, nên phương án phải giới hạn số quy tắc và đo chi phí; nhưng chọn một phía sẽ xóa bằng chứng về nhiệm vụ khác. Cả thử nghiệm tăng ca và văn phòng mới đều chưa hoàn tất, nên đây là cách kiểm tra quan điểm, chưa phải bằng chứng thành công.",
      counterargumentVi:
        "Một phương án dung hòa có thể tốn tiền, tăng quy tắc và khiến trách nhiệm không rõ; chọn một ưu tiên duy nhất dễ truyền đạt và thực thi hơn.",
      conclusionBoundaryVi:
        "Chỉ đề xuất điều kiện có thể đo cho hai công ty; chưa kết luận cấu hình thưởng, phê duyệt hoặc không gian nào tối ưu và không dự báo thành công.",
    },
    spoken: {
      promptVi:
        "Bảo vệ trong ba phút một điều kiện tối thiểu mà quản lý không được bỏ qua khi áp lực khách hàng hoặc chi phí không gian tăng.",
      requiredMovesVi: [
        "thừa nhận một áp lực của quản lý",
        "nêu một bằng chứng từ phía nhân viên",
        "đề xuất điều kiện vận hành có thể kiểm tra",
        "trả lời phản biện về chi phí và độ phức tạp",
      ],
      evidenceRefs: [
        ref(SOURCE.overtimeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.officeEnvironmentListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "客户合同和空间成本都是真实限制，应先明确承认。",
        "三分之一加班来自审批后返工，同一员工也需要不同空间。",
        "新增任务必须说明延期项，空间按活动预约并记录使用。",
        "若规则太复杂，就限制字段和空间类型，同时测量管理成本。",
        "试行未完成，所以主张的是最低条件，不是成功保证。",
      ],
      modelOutlineVi: [
        "Hợp đồng khách hàng và chi phí không gian là giới hạn thật, cần thừa nhận trước.",
        "Một phần ba tăng ca do làm lại sau duyệt; cùng nhân viên cũng cần nhiều loại không gian.",
        "Nhiệm vụ mới phải nêu hạng mục hoãn, không gian đặt theo hoạt động và ghi sử dụng.",
        "Nếu quy tắc quá phức tạp, giới hạn trường và loại không gian, đồng thời đo chi phí quản lý.",
        "Thử nghiệm chưa xong nên đây là điều kiện tối thiểu, không phải bảo đảm thành công.",
      ],
    },
  },

  "hsk4-stance-comparison-rhetoric-lesson-05": {
    sourceTextIds: [
      SOURCE.energyWindowsReading,
      SOURCE.oilPollutionListening,
    ],
    grammarApplications: {
      [G(54)]: grammar(
        "Dùng đại từ nghi vấn tạo câu phản vấn để chất vấn kết luận tuyệt đối; sau phản vấn phải chỉ ra khẩu径 và dữ liệu còn thiếu.",
        "谁能只凭厂门口污染下降三成，就断定整个电力系统的排放也下降了呢？",
        "Ai có thể chỉ dựa vào ô nhiễm ở cổng nhà máy giảm 30% mà khẳng định phát thải của toàn hệ thống điện cũng giảm?",
        "Câu hỏi bác việc mở rộng phạm vi; nó không phủ nhận cải thiện không khí địa phương hoặc khẳng định phát thải toàn hệ thống đã tăng.",
      ),
      [G(63)]: grammar(
        "Dùng “A不如B（+形容词）” để so sánh trong một chỉ báo và điều kiện đã nêu, không biến nó thành xếp hạng toàn diện.",
        "只谈冬季保温的稳定性，自动遮阳窗不如双层玻璃窗稳定。",
        "Nếu chỉ xét độ ổn định giữ nhiệt mùa đông, cửa tự che nắng không ổn định bằng cửa kính hai lớp.",
        "So sánh chỉ áp dụng cho giữ nhiệt mùa đông; không nói cửa kính hai lớp tốt hơn về nhiệt mùa hè, ánh sáng hay chi phí bảo trì.",
      ),
      [G(64)]: grammar(
        "Dùng “跟……相比” để nêu rõ đối tượng, chỉ báo và vị trí so sánh trước khi đưa ra khác biệt.",
        "跟使用燃料油时相比，改用电加热后厂门口的黑烟更少，本地一种污染下降了三成。",
        "So với thời dùng dầu nhiên liệu, sau khi chuyển sang gia nhiệt điện, khói đen ở cổng nhà máy ít hơn và một loại ô nhiễm địa phương giảm 30%.",
        "So sánh là tại địa phương và sau chuyển đổi; không đại diện phát thải của nguồn điện xa hoặc điều chỉnh theo sản lượng giảm.",
      ),
      [G(65)]: grammar(
        "Dùng phủ định kép để nhấn mạnh yêu cầu báo cáo không thể bỏ qua, đồng thời giữ nó là nghĩa vụ phương pháp chứ không phải kết quả.",
        "评价能源变化时，不能不把本地空气质量和全系统排放分别报告。",
        "Khi đánh giá thay đổi năng lượng, không thể không báo cáo riêng chất lượng không khí địa phương và phát thải toàn hệ thống.",
        "Sự nhấn mạnh yêu cầu tách hai khẩu径; không nói dữ liệu toàn hệ thống hiện đã đủ hoặc hai chỉ báo phải có cùng kết quả.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "双层窗冬季保温较稳定，自动遮阳窗夏季降温更多，但也可能使房间变暗。",
        claimVi:
          "Cửa kính hai lớp giữ nhiệt mùa đông ổn định hơn; cửa tự che nắng giảm nhiệt mùa hè nhiều hơn nhưng cũng có thể làm phòng tối.",
        classification: "fact",
        sourceRef: ref(SOURCE.energyWindowsReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn báo riêng dữ liệu mùa đông, mùa hè và cảm nhận độ sáng, đồng thời từ chối dùng trung bình năm để chọn một loại thắng tuyệt đối.",
        inferenceBoundaryVi:
          "Không được gọi một loại cửa tốt nhất toàn diện vì chi phí bảo trì chưa so và mục tiêu của cư dân khác nhau.",
      },
      {
        claimHanzi:
          "工厂停止用油后，本地一种污染下降三成，说明能源更换已经解决全部环境问题。",
        claimVi:
          "Sau khi nhà máy ngừng dùng dầu, một loại ô nhiễm địa phương giảm 30%, cho thấy đổi năng lượng đã giải quyết toàn bộ vấn đề môi trường.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.oilPollutionListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn xác nhận cải thiện cục bộ nhưng nêu điện giờ cao điểm đến từ nhà máy than ở xa và sản lượng giảm 10%; dữ liệu toàn hệ thống còn thiếu.",
        inferenceBoundaryVi:
          "Chỉ được kết luận có bằng chứng cải thiện không khí địa phương, không mở rộng sang toàn khu vực, toàn cầu hoặc mọi vấn đề môi trường.",
      },
    ],
    paraphrases: [
      {
        promptVi:
          "Paraphrase so sánh hai loại cửa theo từng chỉ báo, mùa và phần dữ liệu còn thiếu.",
        sourceRef: ref(SOURCE.energyWindowsReading, "rp1", "rp2", "rp3"),
        modelHanzi:
          "双层玻璃窗冬季保温更稳定，自动遮阳窗夏季降低下午温度更多，却可能减少亮度。研究分别报告能耗、温度、亮度和满意度，没有用全年平均数选唯一优胜者；维护费用仍待比较。",
        modelVi:
          "Cửa kính hai lớp giữ nhiệt mùa đông ổn định hơn; cửa tự che nắng giảm nhiệt chiều mùa hè nhiều hơn nhưng có thể giảm ánh sáng. Nghiên cứu báo riêng năng lượng, nhiệt độ, độ sáng và hài lòng, không dùng trung bình năm để chọn một người thắng; chi phí bảo trì vẫn chờ so.",
        preservedFactsVi: [
          "Hiệu quả của hai loại cửa thay đổi theo mùa và chỉ báo.",
          "Một số cư dân thấy cửa tự che nắng làm phòng tối.",
          "Chi phí bảo trì chưa được so sánh.",
        ],
        prohibitedExpansionVi:
          "Không xếp hạng một loại cửa tốt nhất, không thêm số tiền tiết kiệm và không coi mức hài lòng là giống nhau giữa cư dân.",
      },
      {
        promptVi:
          "Viết lại kết quả đổi năng lượng, giữ riêng không khí địa phương, nguồn điện xa và thay đổi sản lượng.",
        sourceRef: ref(SOURCE.oilPollutionListening, "lp1", "lp2", "lp3"),
        modelHanzi:
          "工厂改用电加热后，厂门口黑烟减少，本地一种污染下降三成；但高峰用电部分来自远处燃煤电站，生产量也下降一成。因此本地改善已有证据，全系统排放仍要等电力数据。",
        modelVi:
          "Sau khi nhà máy chuyển sang gia nhiệt điện, khói đen ở cổng giảm và một loại ô nhiễm địa phương giảm 30%; nhưng một phần điện giờ cao điểm đến từ nhà máy than ở xa, sản lượng cũng giảm 10%. Vì thế đã có bằng chứng cải thiện địa phương, còn phát thải toàn hệ thống phải chờ dữ liệu điện.",
        preservedFactsVi: [
          "Khói đen ít đi và một loại ô nhiễm địa phương giảm ba mươi phần trăm.",
          "Sản lượng giảm một phần mười trong cùng giai đoạn.",
          "Nguồn điện giờ cao điểm có phần đến từ nhà máy than ở xa.",
        ],
        prohibitedExpansionVi:
          "Không nói phát thải toàn hệ thống tăng hay giảm khi chưa có dữ liệu, không bỏ thay đổi sản lượng và không mở rộng sang toàn cầu.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai so sánh môi trường bằng cách giữ riêng mục tiêu, mùa, vị trí đo và dữ liệu còn thiếu.",
      requiredElementsVi: [
        "khác biệt hai loại cửa theo mùa",
        "các chỉ báo độ sáng và bảo trì",
        "mức giảm ô nhiễm địa phương",
        "nguồn điện, sản lượng và khẩu径 toàn hệ thống",
      ],
      evidenceRefs: [
        ref(SOURCE.energyWindowsReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.oilPollutionListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "双层玻璃窗冬季保温更稳定，自动遮阳窗夏季降温更多，却有居民觉得房间变暗；研究因此分开报告能耗、温度、亮度和满意度，维护费仍待比较。工厂改用电加热后，厂门口黑烟减少，本地一种污染下降三成，但生产量也下降一成，高峰电力还来自远处燃煤电站。前者不能选全年唯一优胜窗，后者只能确认本地改善，全系统排放需补充电力数据。",
      modelVi:
        "Cửa kính hai lớp giữ nhiệt mùa đông ổn định hơn, cửa tự che nắng giảm nhiệt mùa hè nhiều hơn nhưng có cư dân thấy phòng tối; nghiên cứu vì thế báo riêng năng lượng, nhiệt độ, độ sáng và hài lòng, còn phí bảo trì chưa so. Nhà máy chuyển sang điện khiến khói đen cổng nhà máy ít đi và một loại ô nhiễm địa phương giảm 30%, nhưng sản lượng cũng giảm 10% và điện giờ cao điểm còn từ nhà máy than xa. Nguồn thứ nhất không chọn một cửa thắng cả năm; nguồn thứ hai chỉ xác nhận cải thiện địa phương, phát thải toàn hệ thống cần dữ liệu điện.",
      prohibitedExpansionVi:
        "Không chọn công nghệ thắng tuyệt đối, không quy toàn bộ giảm ô nhiễm cho đổi năng lượng và không điền dữ liệu bảo trì hay hệ thống còn thiếu.",
    },
    argument: {
      promptVi:
        "Lập luận xem báo cáo môi trường có nên buộc chọn một giải pháp tốt nhất để công chúng dễ quyết định hay không.",
      requiredElementsVi: [
        "luận điểm chống xếp hạng thiếu khẩu径",
        "so sánh cửa theo mùa và chỉ báo",
        "phân biệt địa phương với toàn hệ thống",
        "phản biện về nhu cầu quyết định đơn giản",
        "kết luận giới hạn theo dữ liệu bảo trì và điện",
      ],
      evidenceRefs: [
        ref(SOURCE.energyWindowsReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.oilPollutionListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "环境报告要帮助决定，却不应在目标和范围不同时强选一个“最好”。双层窗冬季保温更稳定，自动遮阳窗夏季降低下午温度更多，却可能使房间变暗；若只看全年平均数，就会隐藏亮度需求和未知维护费。工厂改用电以后，厂门口黑烟减少，本地一种污染下降三成，可是生产量也下降一成，高峰电力还来自远处燃煤电站。跟燃料油相比，本地改善有证据，全系统排放仍缺数据。有人认为公众需要简单选择，报告太多指标会拖延行动。为回应这一点，报告可以按目标给出条件式建议：分别说明冬季保温、夏季降温或本地空气改善，同时标出适用条件。清楚来自具体问题，不是删除不确定性。当前结论不能包括尚未比较的维护费或全系统排放。",
      modelVi:
        "Báo cáo môi trường cần hỗ trợ quyết định, nhưng không nên buộc chọn một “tốt nhất” khi mục tiêu và phạm vi đo khác nhau. Với cửa tiết kiệm năng lượng, kính hai lớp giữ nhiệt mùa đông ổn định hơn, còn cửa tự che nắng giảm nhiệt chiều mùa hè nhiều hơn nhưng có thể làm phòng tối. Nếu gộp thành trung bình năm, báo cáo sẽ che nhu cầu về độ sáng và phí bảo trì chưa biết. Với nhà máy, đổi sang điện làm khói đen ở cổng ít đi và một chất ô nhiễm địa phương giảm 30%; tuy nhiên sản lượng cùng giảm 10%, điện giờ cao điểm còn từ nhà máy than xa. So với dầu, cải thiện địa phương là thật, nhưng toàn hệ thống chưa đủ dữ liệu. Có ý kiến rằng công chúng cần một lựa chọn rõ, báo nhiều chỉ báo sẽ gây khó hiểu. Vì vậy báo cáo có thể nêu khuyến nghị theo mục tiêu: chọn phương án giữ nhiệt mùa đông, giảm nóng mùa hè hoặc cải thiện không khí địa phương, đồng thời ghi điều kiện. Sự rõ ràng đến từ câu hỏi cụ thể, không phải xóa bất định. Kết luận hiện chưa bao gồm phí bảo trì hay phát thải toàn hệ thống.",
      counterargumentVi:
        "Người dân và quản lý cần một lựa chọn đơn giản để hành động; quá nhiều chỉ báo, mùa và khẩu径 có thể làm báo cáo khó hiểu hoặc trì hoãn quyết định.",
      conclusionBoundaryVi:
        "Chỉ yêu cầu khuyến nghị theo mục tiêu và phạm vi của hai nghiên cứu; phí bảo trì cùng dữ liệu điện toàn hệ thống vẫn thiếu nên chưa có xếp hạng cuối.",
    },
    spoken: {
      promptVi:
        "Trong ba phút, bảo vệ một kết luận môi trường có giới hạn trước người yêu cầu chọn ngay một công nghệ thắng tuyệt đối.",
      requiredMovesVi: [
        "nêu mục tiêu và điều kiện so sánh",
        "đưa một kết quả về cửa và một kết quả ô nhiễm",
        "phân biệt địa phương với toàn hệ thống",
        "trả lời phản biện rằng nhiều chỉ báo gây khó quyết định",
      ],
      evidenceRefs: [
        ref(SOURCE.energyWindowsReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.oilPollutionListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先问要解决冬季保温、夏季降温，还是本地空气污染。",
        "双层窗冬季更稳定，遮阳窗夏季降温更多但可能变暗。",
        "改用电后本地污染下降三成，全系统仍缺电力来源数据。",
        "为了便于决定，可按目标给条件式建议，不必制造唯一冠军。",
        "维护费和全系统排放未完成前，结论必须保留范围。",
      ],
      modelOutlineVi: [
        "Trước hết hỏi cần giải quyết giữ nhiệt mùa đông, giảm nóng mùa hè hay ô nhiễm địa phương.",
        "Cửa hai lớp ổn định hơn mùa đông; cửa che nắng giảm nóng hơn mùa hè nhưng có thể tối.",
        "Đổi sang điện làm ô nhiễm địa phương giảm 30%, còn toàn hệ thống thiếu dữ liệu nguồn điện.",
        "Để dễ quyết định, có thể khuyến nghị có điều kiện theo mục tiêu, không cần tạo một quán quân.",
        "Trước khi có phí bảo trì và phát thải toàn hệ thống, kết luận phải giữ phạm vi.",
      ],
    },
  },
};

export const buildHsk4StanceComparisonRhetoricSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(root);
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(
    prerequisite,
  );
  return buildHsk4SummaryArgumentModulePack({
    root,
    config: HSK4_STANCE_COMPARISON_RHETORIC_CONFIG,
    content: CONTENT,
    longFormHeadBundle: prerequisite.longFormHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4StanceComparisonRhetoricSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH,
  );
  const output = serializeHsk4SummaryArgumentModulePack(
    buildHsk4StanceComparisonRhetoricSummaryArgumentPack(root),
  );
  writeFileSync(outputPath, output, "utf8");
  return { outputPath, output };
};

const isMain = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.cwd();
  const check = process.argv.includes("--check");
  const { outputPath, output } = check
    ? {
      outputPath: resolve(
        root,
        HSK4_STANCE_COMPARISON_RHETORIC_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      output: serializeHsk4SummaryArgumentModulePack(
        buildHsk4StanceComparisonRhetoricSummaryArgumentPack(root),
      ),
    }
    : writeHsk4StanceComparisonRhetoricSummaryArgumentPack(root);
  if (check) {
    const existing = readFileSync(outputPath, "utf8");
    if (existing !== output) {
      throw new Error(
        "HSK4 stance/comparison/rhetoric summary-argument draft is stale",
      );
    }
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_STANCE_COMPARISON_RHETORIC_CONFIG.lessonIds.length
    } HSK4 stance/comparison/rhetoric summary-argument lessons at ${
      outputPath
    }.`,
  );
}
