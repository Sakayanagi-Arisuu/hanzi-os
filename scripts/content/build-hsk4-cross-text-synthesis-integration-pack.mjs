import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4IntegrationStagePack,
  serializeHsk4IntegrationStagePack,
} from "./hsk4-integration-stage-builder.mjs";
import {
  HSK4_CROSS_TEXT_SYNTHESIS_CONFIG,
  HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH,
} from "../../src/content/hsk4CrossTextSynthesisIntegrationPack.mjs";
import {
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle,
  loadHsk4InferenceEvidenceCheckIntegrationPackBundle,
} from "../../src/content/hsk4InferenceEvidenceCheckIntegrationPack.mjs";

const SOURCE = {
  personalWeatherReading:
    "hsk4-personal-community-analysis-comparison-variation:reading-01",
  personalTravelListening:
    "hsk4-personal-community-analysis-comparison-variation:listening-01",
  educationRecordsReading:
    "hsk4-education-work-evaluation-comparison-variation:reading-01",
  educationPlatformListening:
    "hsk4-education-work-evaluation-comparison-variation:listening-01",
  educationOvertimeReading:
    "hsk4-education-work-evaluation-viewpoint-synthesis:reading-01",
  educationOfficeListening:
    "hsk4-education-work-evaluation-viewpoint-synthesis:listening-01",
  natureWindowsReading:
    "hsk4-nature-technology-explanation-comparison-variation:reading-01",
  natureOilListening:
    "hsk4-nature-technology-explanation-comparison-variation:listening-01",
  natureRiverReading:
    "hsk4-nature-technology-explanation-viewpoint-synthesis:reading-01",
  natureWarningListening:
    "hsk4-nature-technology-explanation-viewpoint-synthesis:listening-01",
  societyAccountsReading:
    "hsk4-society-economy-argument-comparison-variation:reading-01",
  societyFactoryListening:
    "hsk4-society-economy-argument-comparison-variation:listening-01",
};

const allParagraphs = (textId) =>
  textId.endsWith(":listening-01")
    ? ["lp1", "lp2", "lp3"]
    : ["rp1", "rp2", "rp3"];
const sourceRef = (textId) => ({
  textId,
  paragraphIds: allParagraphs(textId),
});
const crossRefs = (first, second) => [
  sourceRef(first),
  sourceRef(second),
];
const supportingSkills = (primarySkill) => ({
  listening: ["reading", "writing"],
  reading: ["listening", "writing"],
  writing: ["listening", "reading"],
})[primarySkill];
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
  timeLimitSeconds: null,
});

const CONTENT = {
  "hsk4-cross-text-synthesis-lesson-01": {
    sourceTextIds: [
      SOURCE.personalWeatherReading,
      SOURCE.personalTravelListening,
      SOURCE.educationRecordsReading,
      SOURCE.educationPlatformListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: crossRefs(
          SOURCE.personalWeatherReading,
          SOURCE.educationPlatformListening,
        ),
        promptVi:
          "Đọc nguồn hoạt động cộng đồng, nghe nguồn nền tảng tự học rồi lập ghi chú đối chiếu: vì sao cùng nhiệt độ hoặc số lần mở ứng dụng đều chưa đủ để chọn một phương án tốt nhất?",
        modelHanzi:
          "运动材料中，两天气温相同，但风雨、通知和成员经验不同。自学材料中，登录次数较多不等于学习一定更好，因为另一组单次学习更久，也记录了难题。两个数字都要放回条件和目标中解释。",
        modelVi:
          "Ở hoạt động thể thao, nhiệt độ bằng nhau nhưng gió mưa, thông báo và kinh nghiệm khác. Trên nền tảng, mở nhiều lần không đồng nghĩa học tốt hơn vì nhóm kia học mỗi lần lâu hơn và ghi bài khó. Cả hai con số phải đặt trong điều kiện và mục tiêu.",
        requiredMovesVi: [
          "ghi đúng một dữ kiện định lượng của mỗi nguồn",
          "nêu ít nhất một điều kiện bị con số che khuất",
          "tách quan sát khỏi kết luận đánh giá",
        ],
        scopeBoundaryVi:
          "Chỉ kết luận một chỉ số đơn lẻ chưa đủ cho hai trường hợp này; không phủ nhận giá trị của nhiệt độ hoặc nhật ký đăng nhập khi được dùng cùng dữ liệu khác.",
        minimum: 3,
        maximum: 6,
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        evidenceRefs: crossRefs(
          SOURCE.personalTravelListening,
          SOURCE.educationRecordsReading,
        ),
        promptVi:
          "Nghe lại nguồn chuyến đi và dùng nguồn ghi nhận công việc để tạo hai nhóm ghi chú: thông tin nào phải thống nhất, thông tin bối cảnh nào phải được giữ riêng trước khi so sánh?",
        modelHanzi:
          "旅行调整要统一说明变化、原因和游客行动，还要确认收到；工作记录要保留少量共同指标，同时解释客户难度或合作背景。共同格式帮助沟通，但具体情境不能被删掉。",
        modelVi:
          "Điều chỉnh chuyến đi cần thống nhất cái đổi, lý do, việc khách phải làm và xác nhận đã nhận. Ghi nhận công việc cần vài chỉ số chung nhưng vẫn giải thích độ khó khách hàng hoặc bối cảnh phối hợp. Khuôn chung hỗ trợ giao tiếp nhưng không được xóa tình huống.",
        requiredMovesVi: [
          "ghi ba phần bắt buộc của thông báo hành trình",
          "ghi ưu và nhược điểm của hai cách ghi công việc",
          "nêu phần có thể chuẩn hóa và phần phải giữ bối cảnh",
        ],
        scopeBoundaryVi:
          "Không khẳng định xác nhận tin nhắn sẽ xóa mọi hiểu lầm hoặc một mẫu ghi chung sẽ phù hợp cùng tần suất cho mọi phòng ban.",
        minimum: 3,
        maximum: 6,
      }),
      prompt({
        kind: "dual-source-paraphrase-and-synthesis",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.personalWeatherReading,
          SOURCE.educationPlatformListening,
        ),
        promptVi:
          "Viết 90–150 chữ Hán paraphrase hai nguồn mà không lặp câu gốc: giải thích vì sao lựa chọn hoạt động và cách tự học phải dựa vào nhiều điều kiện hơn một con số nổi bật.",
        modelHanzi:
          "社区活动的两天气温一样，实际选择却受风雨、安全、通知时间和成员习惯影响。自学平台中，打开次数较多的一组完成了更多短练习，另一组每次学习更久并记录难题。因此，温度和登录次数都只是部分证据。合理方案应先说明目标，再同时观察环境、行为质量和使用者差异。",
        modelVi:
          "Hai ngày hoạt động có cùng nhiệt độ nhưng lựa chọn còn chịu gió mưa, an toàn, lúc thông báo và thói quen. Trên nền tảng, nhóm mở nhiều hoàn thành nhiều bài ngắn, nhóm kia học mỗi lượt lâu hơn và ghi bài khó. Nhiệt độ và lượt mở chỉ là bằng chứng bộ phận; cần nêu mục tiêu rồi xem môi trường, chất lượng hành vi và khác biệt người dùng.",
        requiredMovesVi: [
          "paraphrase ít nhất một quan hệ của mỗi nguồn",
          "nêu điểm chung về giới hạn chỉ số đơn",
          "giữ điều kiện và nhóm người khác nhau",
          "kết luận không chọn một phương án tuyệt đối",
        ],
        scopeBoundaryVi:
          "Không biến hai trường hợp nhỏ thành quy luật rằng số liệu định lượng luôn vô ích hoặc mọi lựa chọn đều chỉ phụ thuộc sở thích cá nhân.",
        minimum: 90,
        maximum: 150,
        requiredSections: 2,
      }),
      prompt({
        kind: "dual-source-paraphrase-and-synthesis",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.personalTravelListening,
          SOURCE.educationRecordsReading,
        ),
        promptVi:
          "Viết một đoạn 100–170 chữ Hán tổng hợp cách hai tổ chức sửa luồng thông tin sau khi phát hiện mẫu cũ gây hiểu lầm hoặc thiếu bối cảnh.",
        modelHanzi:
          "旅行社发现“活动调整”过于笼统，导致游客产生不同理解，于是要求写清什么改变、为什么改变、游客要做什么，并确认每个人收到。公司则发现纯数字容易比较却解释不了复杂工作，纯讨论有背景却难追踪，因此保留少量共同指标并增加短说明。两者都没有取消标准化，而是让标准信息与情境说明互相补充。",
        modelVi:
          "Hãng du lịch thấy thông báo “điều chỉnh hoạt động” quá chung nên yêu cầu ghi rõ cái đổi, lý do, việc khách làm và xác nhận nhận tin. Công ty thấy số thuần dễ so nhưng thiếu bối cảnh, thảo luận giàu bối cảnh nhưng khó theo dõi nên ghép ít chỉ số chung với giải thích ngắn. Cả hai bổ sung bối cảnh cho chuẩn chung.",
        requiredMovesVi: [
          "nêu lỗi thông tin ban đầu của từng nguồn",
          "mô tả chính xác biện pháp sửa của từng tổ chức",
          "chỉ ra quan hệ bổ sung giữa chuẩn chung và bối cảnh",
          "không hứa kết quả chưa được đo",
        ],
        scopeBoundaryVi:
          "Các biện pháp mới mới ở phạm vi chuyến đi và phòng ban được mô tả; chưa có bằng chứng chúng loại hết hiểu lầm hay gánh nặng báo cáo.",
        minimum: 100,
        maximum: 170,
        requiredSections: 2,
      }),
      prompt({
        kind: "guided-integration",
        primarySkill: "reading",
        evidenceRefs: crossRefs(
          SOURCE.personalWeatherReading,
          SOURCE.educationPlatformListening,
        ),
        promptVi:
          "Đánh dấu ba kết luận là được nguồn hỗ trợ, cần điều kiện hay vượt nguồn; sau đó ghi căn cứ từ cả hoạt động cộng đồng lẫn thử nghiệm nền tảng tự học.",
        modelHanzi:
          "有支持：相同气温下，风雨使活动安排不同。需要条件：自动提醒可能帮助部分目标明确的学生坚持。超出来源：线上平台一定比纸质计划有效。两个来源都要求先说明对象、目标和观察指标。",
        modelVi:
          "Được hỗ trợ: cùng nhiệt độ nhưng gió mưa làm cách tổ chức khác. Cần điều kiện: nhắc tự động có thể giúp một số học sinh có mục tiêu rõ duy trì. Vượt nguồn: nền tảng luôn hiệu quả hơn kế hoạch giấy. Hai nguồn đều cần nêu đối tượng, mục tiêu và chỉ số.",
        requiredMovesVi: [
          "phân loại đủ ba mức độ kết luận",
          "dẫn ít nhất một chi tiết từ mỗi nguồn",
          "giải thích vì sao kết luận mạnh nhất vượt dữ liệu",
        ],
        scopeBoundaryVi:
          "Không suy ra quan hệ nhân quả chắc chắn từ khảo sát hoạt động hoặc thử nghiệm hai lớp có mục tiêu học khác nhau.",
        minimum: 3,
        maximum: 6,
      }),
      prompt({
        kind: "guided-integration",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.personalTravelListening,
          SOURCE.educationRecordsReading,
        ),
        promptVi:
          "Sửa nhận định “mẫu chung và xác nhận bắt buộc luôn làm mọi tổ chức hiệu quả hơn” thành kết luận có bằng chứng, phản biện và giới hạn trong 100–180 chữ Hán.",
        modelHanzi:
          "共同格式和确认步骤能够减少一部分信息错误，但不能保证所有组织都更有效。旅行社需要把变化、原因和行动写清并确认收到，因为模糊通知已经造成误会；公司也需要共同字段来比较工作，却允许不同部门选择提交频率，以免增加不必要负担。反对者担心步骤太多会拖慢沟通，这提醒管理者只保留关键字段并继续测量。现有材料支持“标准加情境说明”，不支持唯一固定流程。",
        modelVi:
          "Khuôn chung và xác nhận có thể giảm một phần lỗi thông tin nhưng không bảo đảm mọi tổ chức hiệu quả hơn. Hãng du lịch cần ghi cái đổi, lý do, hành động và xác nhận vì tin mơ hồ đã gây hiểu lầm; công ty giữ trường chung nhưng cho phòng chọn tần suất để tránh gánh nặng. Lo ngại quá nhiều bước làm chậm nhắc quản lý chỉ giữ trường thiết yếu và tiếp tục đo. Nguồn ủng hộ chuẩn cộng bối cảnh, không ủng hộ một quy trình duy nhất.",
        requiredMovesVi: [
          "thay từ tuyệt đối bằng kết luận có phạm vi",
          "dẫn một biện pháp từ mỗi nguồn",
          "trả lời phản biện về gánh nặng quy trình",
          "nêu việc cần tiếp tục đo",
        ],
        scopeBoundaryVi:
          "Không khẳng định hiệu suất đã tăng vì hai nguồn mới mô tả cách sửa và kế hoạch kiểm tra, chưa cung cấp so sánh dài hạn.",
        minimum: 100,
        maximum: 180,
        requiredSections: 3,
        revisionPasses: 2,
      }),
    ],
  },

  "hsk4-cross-text-synthesis-lesson-02": {
    sourceTextIds: [
      SOURCE.educationOvertimeReading,
      SOURCE.educationOfficeListening,
      SOURCE.natureWindowsReading,
      SOURCE.natureOilListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: crossRefs(
          SOURCE.educationOvertimeReading,
          SOURCE.natureOilListening,
        ),
        promptVi:
          "Đối chiếu nguồn tăng ca với nguồn đổi năng lượng và ghi rõ: kết quả quan sát nào là thật, nguyên nhân hoặc phạm vi nào vẫn chưa được xác định?",
        modelHanzi:
          "公司调查中，六成员工不满，三分之一加班与审批后返工有关，但新措施还没试行。工厂本地黑烟减少、某污染物下降三成，同时产量下降且远处发电来源未算清。两组变化都真实，却不能证明单一措施造成全部结果。",
        modelVi:
          "Khảo sát công ty có sáu phần mười nhân viên bất mãn và một phần ba tăng ca liên quan làm lại sau phê duyệt, nhưng biện pháp mới chưa thử. Nhà máy giảm khói đen và một chất ô nhiễm ba phần mười, đồng thời sản lượng giảm và nguồn điện xa chưa tính. Biến đổi có thật nhưng chưa chứng minh một nguyên nhân duy nhất.",
        requiredMovesVi: [
          "ghi một kết quả quan sát từ mỗi nguồn",
          "ghi một yếu tố gây nhiễu hoặc còn thiếu",
          "tách kế hoạch tương lai khỏi kết quả đã đo",
        ],
        scopeBoundaryVi:
          "Không kết luận sắp xếp ưu tiên chắc chắn giảm tăng ca hoặc chuyển sang điện chắc chắn giảm phát thải toàn hệ thống.",
        minimum: 3,
        maximum: 6,
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        evidenceRefs: crossRefs(
          SOURCE.educationOfficeListening,
          SOURCE.natureWindowsReading,
        ),
        promptVi:
          "Nghe nguồn thiết kế văn phòng, đọc nguồn cửa sổ tiết kiệm năng lượng rồi lập ghi chú so sánh các nhóm nhu cầu, tiêu chí và điều kiện khiến “chất lượng tốt” không có một đáp án duy nhất.",
        modelHanzi:
          "办公室质量随讨论、写作、班次和交通需要变化；节能窗效果随季节、能耗、亮度和居民满意度变化。开放区或某种窗都不能脱离任务与条件被称为唯一最好，评价必须分项报告。",
        modelVi:
          "Chất lượng văn phòng đổi theo thảo luận, viết, ca làm và giao thông; hiệu quả cửa sổ đổi theo mùa, năng lượng, độ sáng và hài lòng. Khu mở hay một loại cửa không thể là tốt nhất nếu tách nhiệm vụ, điều kiện; đánh giá phải báo riêng từng chiều.",
        requiredMovesVi: [
          "ghi ít nhất hai nhóm nhu cầu ở văn phòng",
          "ghi ít nhất hai tiêu chí của cửa sổ",
          "nêu điều kiện làm thay đổi lựa chọn",
        ],
        scopeBoundaryVi:
          "Không suy ra mọi văn phòng cần cùng sơ đồ hoặc một loại cửa sổ luôn tốt hơn trong mọi mùa và mọi mục tiêu sử dụng.",
        minimum: 3,
        maximum: 6,
      }),
      prompt({
        kind: "dual-source-paraphrase-and-synthesis",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.educationOvertimeReading,
          SOURCE.natureOilListening,
        ),
        promptVi:
          "Viết 100–180 chữ Hán paraphrase hai nguồn, giữ riêng kết quả địa phương/hiện tại với kết quả toàn hệ thống/tương lai và không nâng tương quan thành nhân quả.",
        modelHanzi:
          "软件公司的记录显示员工对不可预测的加班不满，部分返工发生在审批等待之后，因此公司计划重新标明任务优先级；但试行尚未开始。工厂改用电加热后，本地黑烟和一种污染物下降，不过产量也减少，电力来源仍可能产生排放。两份材料都支持继续改进，却要求把已观察的局部变化与尚待验证的整体效果分开。",
        modelVi:
          "Ghi chép công ty cho thấy nhân viên bất mãn với tăng ca khó đoán và một phần làm lại xảy ra sau chờ duyệt, nên công ty định ghi lại ưu tiên; thử nghiệm chưa bắt đầu. Nhà máy đổi điện làm khói đen và một chất ô nhiễm địa phương giảm, nhưng sản lượng cũng giảm và nguồn điện còn phát thải. Cả hai ủng hộ cải tiến nhưng phải tách biến đổi bộ phận đã thấy khỏi hiệu quả toàn thể còn chờ.",
        requiredMovesVi: [
          "nêu kết quả đã quan sát của từng nguồn",
          "nêu yếu tố chưa kiểm soát của từng nguồn",
          "tách thay đổi địa phương khỏi hiệu quả tổng thể",
          "không dùng từ nhân quả tuyệt đối",
        ],
        scopeBoundaryVi:
          "Chỉ tổng hợp logic đánh giá của hai trường hợp; không nói quản lý công việc và chính sách năng lượng có cùng cơ chế tác động.",
        minimum: 100,
        maximum: 180,
      }),
      prompt({
        kind: "dual-source-paraphrase-and-synthesis",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.educationOfficeListening,
          SOURCE.natureWindowsReading,
        ),
        promptVi:
          "Viết đoạn 110–190 chữ Hán so sánh cách hai nguồn chuyển từ nhãn nhị nguyên sang thiết kế theo hoạt động, mùa và tiêu chí cụ thể.",
        modelHanzi:
          "办公室试用表明，“开放”与“安静”并非只能二选一：讨论、独立写作和电话需要不同空间，同一人一天内也会改变任务。节能窗研究同样没有宣布唯一优胜者，双层玻璃在冬季保温稳定，自动遮阳在夏季降温更明显，却可能降低亮度。两项设计都应按活动、季节和使用者报告效果，再比较维护、交通或班次等尚未解决的条件。",
        modelVi:
          "Thử văn phòng cho thấy mở và yên không chỉ chọn một: thảo luận, viết riêng, điện thoại cần chỗ khác, cùng người đổi nhiệm vụ trong ngày. Nghiên cứu cửa sổ cũng không có một quán quân: kính hai lớp ổn định giữ nhiệt mùa đông, che tự động hạ nhiệt mùa hè nhưng có thể làm tối. Cả hai phải báo theo hoạt động, mùa, người dùng và xét bảo trì, giao thông, ca làm.",
        requiredMovesVi: [
          "nêu ít nhất hai nhu cầu không đồng nhất",
          "nêu kết quả theo hai mùa của cửa sổ",
          "giải thích vì sao nhãn nhị nguyên không đủ",
          "đưa ra cách báo cáo phân chiều",
        ],
        scopeBoundaryVi:
          "Không khẳng định thiết kế linh hoạt đã tăng năng suất hoặc cửa sổ đã tốt hơn về chi phí vì các dữ liệu đó còn thiếu.",
        minimum: 110,
        maximum: 190,
      }),
      prompt({
        kind: "guided-integration",
        primarySkill: "reading",
        evidenceRefs: crossRefs(
          SOURCE.educationOvertimeReading,
          SOURCE.natureOilListening,
        ),
        promptVi:
          "Tạo bảng ghi chú bốn ô “đã đo / có thể giải thích / biện pháp dự kiến / còn thiếu” cho cả hai nguồn và chỉ đặt thông tin đúng ô.",
        modelHanzi:
          "已测：员工不满、本地污染下降。可能解释：审批返工、能源更换与产量变化。计划：标任务优先级、补全电力数据。缺少：加班试行结果、全系统排放。不能把计划写成成效。",
        modelVi:
          "Đã đo: nhân viên bất mãn, ô nhiễm địa phương giảm. Có thể giải thích: làm lại sau phê duyệt, đổi năng lượng và sản lượng. Kế hoạch: ghi ưu tiên, bổ sung dữ liệu điện. Còn thiếu: kết quả thử giảm tăng ca, phát thải toàn hệ. Không viết kế hoạch thành thành quả.",
        requiredMovesVi: [
          "điền đủ bốn loại thông tin",
          "có ít nhất một chi tiết từ mỗi nguồn",
          "không đặt kế hoạch vào ô kết quả",
        ],
        scopeBoundaryVi:
          "Các ô chỉ tổ chức mức độ bằng chứng hiện có, không tạo thêm dữ liệu hoặc quyết định quan hệ nhân quả giữa các biến.",
        minimum: 4,
        maximum: 8,
        requiredSections: 4,
      }),
      prompt({
        kind: "guided-integration",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.educationOfficeListening,
          SOURCE.natureWindowsReading,
        ),
        promptVi:
          "Đề xuất trong 120–210 chữ Hán một nguyên tắc thiết kế chung cho văn phòng và công trình: cho phép nhiều nhu cầu nhưng vẫn đo được, kèm phản biện và giới hạn.",
        modelHanzi:
          "设计不必为所有人提供同一种环境，但必须让选择能够被比较。办公室可以按讨论、写作和电话设置可预约空间，并记录噪音、使用率和任务自评；建筑则应按季节记录能耗、温度、亮度、满意度和维护费用。有人担心指标太多会使管理复杂，因此每个项目应先确定少量核心目标，再保留受影响群体的差异数据。这个原则能提高透明度，却不能保证灵活设计自动带来更高效率。",
        modelVi:
          "Thiết kế không cần cho mọi người cùng môi trường nhưng lựa chọn phải so được. Văn phòng có thể đặt chỗ theo thảo luận, viết, gọi và ghi tiếng ồn, sử dụng, tự đánh giá; công trình ghi năng lượng, nhiệt, sáng, hài lòng, bảo trì theo mùa. Lo quá nhiều chỉ số làm quản lý phức tạp được xử lý bằng ít mục tiêu lõi cùng dữ liệu nhóm bị ảnh hưởng. Nguyên tắc tăng minh bạch, không bảo đảm hiệu suất tự tăng.",
        requiredMovesVi: [
          "nêu nguyên tắc lựa chọn theo nhiệm vụ hoặc điều kiện",
          "đưa ra chỉ số từ cả hai nguồn",
          "trả lời phản biện về quá nhiều chỉ số",
          "nêu giới hạn chưa chứng minh hiệu quả",
        ],
        scopeBoundaryVi:
          "Đề xuất chỉ là nguyên tắc thử nghiệm từ hai nguồn, không phải tiêu chuẩn kỹ thuật đã được hiệu chuẩn cho mọi văn phòng và tòa nhà.",
        minimum: 120,
        maximum: 210,
        requiredSections: 3,
        revisionPasses: 2,
      }),
    ],
  },

  "hsk4-cross-text-synthesis-lesson-03": {
    sourceTextIds: [
      SOURCE.natureRiverReading,
      SOURCE.natureWarningListening,
      SOURCE.societyAccountsReading,
      SOURCE.societyFactoryListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        evidenceRefs: crossRefs(
          SOURCE.natureRiverReading,
          SOURCE.societyFactoryListening,
        ),
        promptVi:
          "Đọc nguồn quan trắc sông, nghe nguồn chọn máy tiết kiệm rồi ghi các tiêu chuẩn thành công khác nhau và dữ liệu nào buộc nhóm phải sửa kết luận ban đầu.",
        modelHanzi:
          "河流项目分别看设备稳定、及时预警和公众理解；工厂分别看价格、停工、能源和安全。专业图表难懂、夜班机器过热都是新证据，使团队不能只用上传成功或购买价宣布成功。",
        modelVi:
          "Dự án sông xét ổn định thiết bị, cảnh báo kịp và công chúng hiểu; nhà máy xét giá, dừng sản xuất, năng lượng, an toàn. Biểu đồ khó hiểu và máy quá nóng ca đêm là bằng chứng mới khiến không thể chỉ dùng tải dữ liệu hay giá mua để tuyên bố thành công.",
        requiredMovesVi: [
          "ghi ít nhất ba tiêu chuẩn từ hai nguồn",
          "nêu một bằng chứng làm đổi quyết định ở mỗi nguồn",
          "chỉ ra chỉ số đơn bị bác bỏ",
        ],
        scopeBoundaryVi:
          "Không kết luận cảm biến đã làm sạch sông hoặc thiết bị được chọn chắc chắn tiết kiệm cả năm khi thử nghiệm vẫn còn giới hạn.",
        minimum: 4,
        maximum: 8,
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        evidenceRefs: crossRefs(
          SOURCE.natureWarningListening,
          SOURCE.societyAccountsReading,
        ),
        promptVi:
          "Nghe nguồn cảnh báo khu thắng cảnh và đọc nguồn hai tài khoản video; lập ghi chú về cách mục tiêu, nhóm người và kênh phân phối làm thay đổi ý nghĩa của “hiệu quả”.",
        modelHanzi:
          "预警要让老人、外国游客、弱信号地区和色觉不同者都能采取行动；视频账号则在传播速度和收入稳定之间目标不同。颜色、声音、播放量或订阅都只回答部分问题，需要按用户和目标解释。",
        modelVi:
          "Cảnh báo phải giúp người già, khách nước ngoài, vùng tín hiệu yếu và người khác biệt màu sắc hành động; tài khoản video có mục tiêu khác giữa lan nhanh và thu nhập ổn định. Màu, âm thanh, lượt xem hay đăng ký chỉ trả lời một phần và phải giải thích theo người dùng, mục tiêu.",
        requiredMovesVi: [
          "ghi ít nhất hai nhóm người của cảnh báo",
          "ghi hai mục tiêu khác nhau của tài khoản",
          "nêu vì sao một kênh hoặc chỉ số không đủ",
        ],
        scopeBoundaryVi:
          "Không suy ra thiết kế ba tầng phù hợp mọi tình huống khẩn cấp hoặc mô hình đăng ký luôn tốt hơn quảng cáo trong mọi lĩnh vực.",
        minimum: 3,
        maximum: 6,
      }),
      prompt({
        kind: "dual-source-paraphrase-and-synthesis",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.natureRiverReading,
          SOURCE.societyFactoryListening,
        ),
        promptVi:
          "Viết 110–190 chữ Hán tổng hợp cách hai nhóm chuyển từ một nhãn thành công sang bảng tiêu chí nhiều chiều sau khi xuất hiện bằng chứng trái kỳ vọng.",
        modelHanzi:
          "河流监测最初容易把设备连续上传当成主要成果，试验却显示技术稳定、污染预警和公众理解是三个不同问题。工厂也不能把最低价格等同于最节约，因为夜班过热、停工时间和能源效果会改变选择。两组都根据新证据扩大评价表，并保留尚待验证的项目。多指标不是为了回避决定，而是说明哪一方面已经改善、哪一方面仍有风险。",
        modelVi:
          "Quan trắc sông dễ coi tải liên tục là thành quả chính, nhưng thử nghiệm cho thấy ổn định, cảnh báo ô nhiễm và công chúng hiểu là ba vấn đề. Nhà máy không thể coi giá thấp nhất là tiết kiệm nhất vì quá nóng, dừng sản xuất và năng lượng đổi lựa chọn. Cả hai mở rộng bảng đánh giá và giữ mục còn chờ. Nhiều chỉ số nhằm nói chiều nào tốt, chiều nào còn rủi ro.",
        requiredMovesVi: [
          "paraphrase tiêu chuẩn ban đầu của từng nguồn",
          "nêu bằng chứng làm tiêu chuẩn đó chưa đủ",
          "mô tả bảng đánh giá mới",
          "giữ mục còn chờ xác minh",
        ],
        scopeBoundaryVi:
          "Không kết luận nhiều chỉ số tự động tạo quyết định đúng; chất lượng trọng số và dữ liệu vẫn cần chuyên gia cùng người bị ảnh hưởng xem xét.",
        minimum: 110,
        maximum: 190,
      }),
      prompt({
        kind: "dual-source-paraphrase-and-synthesis",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.natureWarningListening,
          SOURCE.societyAccountsReading,
        ),
        promptVi:
          "Viết 100–180 chữ Hán đối chiếu chiến lược phục vụ nhiều người của hệ thống cảnh báo với hai mô hình tài khoản video, nêu cả lợi ích và đánh đổi.",
        modelHanzi:
          "风景区没有要求所有游客使用同一通知，而用颜色、短句、图形、声音和详细链接覆盖不同需要；代价是系统更复杂，夜间效果还没验证。视频账号也没有唯一模式：广告型账号传播快却受推荐规则影响大，订阅型账号扩大较慢但收入稳定。两份材料都说明渠道选择应服从目标和用户，不应只追求一个最大数字，同时还要报告成本与未覆盖的人。",
        modelVi:
          "Khu thắng cảnh không buộc mọi khách dùng một thông báo mà dùng màu, câu ngắn, hình, âm thanh, liên kết; đổi lại hệ thống phức tạp và đêm chưa thử. Tài khoản video cũng không có một mô hình: quảng cáo lan nhanh nhưng lệ thuộc đề xuất, đăng ký tăng chậm hơn nhưng ổn định. Kênh phải theo mục tiêu/người dùng, không chỉ tối đa một số, và phải báo chi phí cùng nhóm chưa phủ.",
        requiredMovesVi: [
          "nêu ít nhất ba kênh cảnh báo",
          "so sánh hai mô hình doanh thu",
          "nêu một lợi ích và một đánh đổi của mỗi nguồn",
          "kết luận theo mục tiêu và người dùng",
        ],
        scopeBoundaryVi:
          "Không coi cảnh báo là sản phẩm thương mại giống tài khoản video; chỉ tổng hợp nguyên tắc lựa chọn kênh và giới hạn chỉ số.",
        minimum: 100,
        maximum: 180,
      }),
      prompt({
        kind: "guided-integration",
        primarySkill: "reading",
        evidenceRefs: crossRefs(
          SOURCE.natureRiverReading,
          SOURCE.societyFactoryListening,
        ),
        promptVi:
          "Phân loại sáu ý thành kết quả, tiêu chuẩn, rủi ro hoặc dữ liệu còn thiếu; mỗi nguồn phải có ít nhất một ý và không được đổi thử nghiệm thành hiệu quả dài hạn.",
        modelHanzi:
          "结果：设备九成时间正常、夜班测试发现过热。标准：预警及时、停工损失和安全。风险：公众看不懂图表、机器在特定班次不稳定。缺少：长期居民反馈、全年节能数据。",
        modelVi:
          "Kết quả: thiết bị sông chạy chín phần mười thời gian, thử ca đêm thấy quá nóng. Tiêu chuẩn: cảnh báo kịp, tổn thất dừng máy, an toàn. Rủi ro: công chúng khó hiểu biểu đồ, máy bất ổn ở ca cụ thể. Còn thiếu: phản hồi dài hạn và dữ liệu tiết kiệm cả năm.",
        requiredMovesVi: [
          "dùng đủ bốn nhãn phân loại",
          "có bằng chứng từ cả hai nguồn",
          "tách dữ liệu thử khỏi kết quả dài hạn",
        ],
        scopeBoundaryVi:
          "Phân loại này không đặt trọng số quyết định giữa môi trường, chi phí và an toàn, cũng không thay thế review chuyên môn.",
        minimum: 4,
        maximum: 8,
        requiredSections: 4,
      }),
      prompt({
        kind: "guided-integration",
        primarySkill: "writing",
        evidenceRefs: crossRefs(
          SOURCE.natureWarningListening,
          SOURCE.societyAccountsReading,
        ),
        promptVi:
          "Viết bản tổng hợp cuối 130–220 chữ Hán: đề xuất cách đánh giá một hệ thống nhiều kênh, dùng cả hai nguồn, có phản biện về độ phức tạp và kết luận giới hạn.",
        modelHanzi:
          "评价多渠道系统应先说明目标，再分别检查覆盖、可理解性、稳定性和成本。风景区的颜色、短句、图形、声音与链接让更多游客接收行动信息，却仍要补测夜间和色觉差异；视频账号的播放、广告、订阅和制作时间则显示传播速度与收入稳定不能合成一个分数。反对者会说分项太多使管理困难，因此可以保留少量核心指标，并公开哪些群体或风险尚未覆盖。两份材料支持透明的多维报告，不证明渠道越多越有效。",
        modelVi:
          "Đánh giá hệ nhiều kênh phải nêu mục tiêu rồi xét độ phủ, dễ hiểu, ổn định, chi phí. Màu, câu ngắn, hình, âm và liên kết giúp nhiều khách nhận hành động nhưng còn cần thử đêm và khác biệt màu; lượt xem, quảng cáo, đăng ký, thời gian làm cho thấy lan nhanh và thu nhập ổn định không gộp thành một điểm. Lo quá nhiều mục gây khó quản lý được đáp bằng ít chỉ số lõi và công khai nhóm/rủi ro chưa phủ. Nguồn ủng hộ báo cáo nhiều chiều, không chứng minh càng nhiều kênh càng tốt.",
        requiredMovesVi: [
          "nêu mục tiêu trước khi chọn chỉ số",
          "dẫn ít nhất hai chi tiết từ mỗi nguồn",
          "trả lời phản biện về độ phức tạp",
          "nêu nhóm hoặc dữ liệu còn thiếu",
          "kết luận không đồng nhất số kênh với hiệu quả",
        ],
        scopeBoundaryVi:
          "Chỉ đề xuất khung đánh giá từ hai trường hợp; chưa có calibration để chấm hệ thống hoặc dự báo hiệu quả ngoài bối cảnh nguồn.",
        minimum: 130,
        maximum: 220,
        requiredSections: 3,
        revisionPasses: 2,
      }),
    ],
  },
};

export const buildHsk4CrossTextSynthesisIntegrationPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4InferenceEvidenceCheckIntegrationPackBundle(root);
  assertValidHsk4InferenceEvidenceCheckIntegrationPackBundle(prerequisite);
  return buildHsk4IntegrationStagePack({
    root,
    config: HSK4_CROSS_TEXT_SYNTHESIS_CONFIG,
    content: CONTENT,
    summaryArgumentHeadBundle: prerequisite.summaryArgumentHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4CrossTextSynthesisIntegrationPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4CrossTextSynthesisIntegrationPack(root),
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
    HSK4_CROSS_TEXT_SYNTHESIS_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4CrossTextSynthesisIntegrationPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error("HSK4 cross-text synthesis integration draft is stale");
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_CROSS_TEXT_SYNTHESIS_CONFIG.lessonIds.length
    } HSK4 cross-text synthesis integration lessons at ${outputPath}.`,
  );
}
