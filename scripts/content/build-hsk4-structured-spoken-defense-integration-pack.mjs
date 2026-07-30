import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4IntegrationStagePack,
  serializeHsk4IntegrationStagePack,
} from "./hsk4-integration-stage-builder.mjs";
import {
  HSK4_STRUCTURED_SPOKEN_DEFENSE_CONFIG,
  HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH,
} from "../../src/content/hsk4StructuredSpokenDefenseIntegrationPack.mjs";
import {
  assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle,
  loadHsk4StructuredWrittenArgumentIntegrationPackBundle,
} from "../../src/content/hsk4StructuredWrittenArgumentIntegrationPack.mjs";

const ref = (textId) => ({
  textId,
  paragraphIds: ["lp1", "lp2", "lp3"],
});

const responseContracts = {
  listening: {
    unit: "evidence-notes",
    minimum: 4,
    maximum: 6,
    requiredSections: 4,
    revisionPasses: 1,
    minimumSources: 2,
  },
  speaking: {
    unit: "spoken-seconds",
    minimum: 120,
    maximum: 180,
    requiredSections: 4,
    revisionPasses: 2,
    minimumSources: 2,
  },
};

const prompt = ({
  kind,
  primarySkill,
  promptVi,
  evidenceRefs,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
  timeLimitSeconds,
}) => ({
  kind,
  primarySkill,
  supportingSkills: primarySkill === "listening"
    ? ["speaking"]
    : ["listening"],
  promptVi,
  evidenceRefs,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
  responseContract: responseContracts[primarySkill],
  timeLimitSeconds,
});

const SOURCE = {
  personalCauseListening:
    "hsk4-personal-community-analysis-cause-condition-result:listening-01",
  educationClaimListening:
    "hsk4-education-work-evaluation-claim-evidence-inference:listening-01",
  educationCauseListening:
    "hsk4-education-work-evaluation-cause-condition-result:listening-01",
  natureClaimListening:
    "hsk4-nature-technology-explanation-claim-evidence-inference:listening-01",
  natureCauseListening:
    "hsk4-nature-technology-explanation-cause-condition-result:listening-01",
  societyCauseListening:
    "hsk4-society-economy-argument-cause-condition-result:listening-01",
};

const CONTENT = {
  "hsk4-structured-spoken-defense-lesson-01": {
    sourceTextIds: [
      SOURCE.personalCauseListening,
      SOURCE.educationClaimListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Sau một lượt nghe, lập bốn nhóm ghi chú cho cả hai nguồn: kết quả quan sát được, giải thích thay thế, dữ liệu còn thiếu và kết luận chưa được phép đưa ra.",
        evidenceRefs: [
          ref(SOURCE.personalCauseListening),
          ref(SOURCE.educationClaimListening),
        ],
        modelHanzi:
          "陈老师咳嗽加重后休息并记录，后来基本恢复，但一次经历不能证明普遍疗效。分享会受到欢迎，七成听众自报更了解职业，可是能力变化仍要用前后任务验证。",
        modelVi:
          "Thầy Trần nghỉ và ghi chép sau khi ho nặng rồi cơ bản hồi phục, nhưng một trường hợp không chứng minh hiệu quả phổ quát. Buổi chia sẻ được yêu thích và 70% tự báo hiểu nghề hơn, song thay đổi năng lực vẫn cần nhiệm vụ trước–sau.",
        requiredMovesVi: [
          "Ghi riêng kết quả quan sát của từng nguồn.",
          "Nêu ít nhất một giải thích thay thế cho mỗi nguồn.",
          "Chỉ ra dữ liệu cần thu thập tiếp.",
          "Khóa một kết luận vượt quá bằng chứng.",
        ],
        scopeBoundaryVi:
          "Không biến một lần hồi phục thành bằng chứng y khoa, và không biến phản hồi hài lòng hoặc thư cảm ơn thành năng lực nghề nghiệp đã được chứng minh.",
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Nghe lại hai nguồn và phân loại bốn phát biểu theo ba mức: dữ kiện trực tiếp, diễn giải có điều kiện hoặc kết luận vượt nguồn; ghi căn cứ đoạn nghe cho từng lựa chọn.",
        evidenceRefs: [
          ref(SOURCE.personalCauseListening),
          ref(SOURCE.educationClaimListening),
        ],
        modelHanzi:
          "三十六点八度是记录，疲劳和干燥可能延长症状是有条件的解释；“没有发烧就不用休息”超出证据。七成听众自报理解增加是记录，“分享会已经提高岗位判断能力”也超出证据。",
        modelVi:
          "36,8 độ là dữ kiện; mệt mỏi và không khí khô có thể kéo dài triệu chứng là diễn giải có điều kiện; “không sốt thì không cần nghỉ” vượt nguồn. 70% tự báo hiểu hơn là dữ kiện, còn “buổi chia sẻ đã nâng năng lực phán đoán nghề” vượt nguồn.",
        requiredMovesVi: [
          "Phân loại đủ bốn phát biểu.",
          "Gắn mỗi phân loại với chi tiết đã nghe.",
          "Giữ riêng khả năng và quan hệ nhân quả.",
          "Sửa ít nhất một phát biểu quá rộng.",
        ],
        scopeBoundaryVi:
          "Việc sửa phát biểu phải giữ nguyên dữ kiện gốc; không được đảo sang kết luận rằng nghỉ ngơi hoặc buổi chia sẻ hoàn toàn không có ích.",
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "listening",
        promptVi:
          "Trong thời gian giới hạn, tạo phiếu chuẩn bị quan điểm gồm luận điểm tạm thời, một nhượng bộ, một khoảng chưa chắc chắn và phép kiểm tra tiếp theo cho cả hai nguồn nghe.",
        evidenceRefs: [
          ref(SOURCE.personalCauseListening),
          ref(SOURCE.educationClaimListening),
        ],
        modelHanzi:
          "暂时观点是积极变化值得继续观察。让步是休息安排和分享内容都可能有帮助；不确定处是其他因素同时变化。下一步应保持记录，并比较参加与未参加相应措施的人。",
        modelVi:
          "Quan điểm tạm thời là thay đổi tích cực đáng tiếp tục quan sát. Nhượng bộ: nghỉ ngơi và nội dung chia sẻ đều có thể hữu ích; phần chưa chắc là các yếu tố khác cùng đổi. Bước tiếp theo là giữ ghi chép và so sánh nhóm có/không tham gia biện pháp.",
        requiredMovesVi: [
          "Viết một luận điểm tạm thời có giới hạn.",
          "Giữ một nhượng bộ hợp lý.",
          "Nêu yếu tố gây nhiễu hoặc khoảng dữ liệu.",
          "Đề xuất phép so sánh tiếp theo.",
        ],
        scopeBoundaryVi:
          "Phiếu chuẩn bị chỉ tổ chức bằng chứng nghe cho phần nói sau; nó không phải bài viết được chấm và không cấp speaking mastery.",
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "evidence-bounded-spoken-position-and-response",
        primarySkill: "speaking",
        promptVi:
          "Bảo vệ quan điểm rằng kết quả tích cực chỉ hữu ích khi chỉ báo khớp với claim; dùng cả trường hợp sức khỏe cá nhân và phản hồi sau buổi chia sẻ nghề nghiệp.",
        evidenceRefs: [
          ref(SOURCE.personalCauseListening),
          ref(SOURCE.educationClaimListening),
        ],
        modelHanzi:
          "我主张先问指标能证明什么。陈老师两周后恢复，说明记录和休息值得保留，却不能证明这套办法适合所有病人。七成听众说更了解职业，说明活动受欢迎，却没有证明他们会判断岗位要求。因此，积极结果可以支持继续试验，不能代替与目标能力一致的任务。",
        modelVi:
          "Tôi chủ trương trước hết hỏi chỉ báo chứng minh được gì. Thầy Trần hồi phục sau hai tuần cho thấy ghi chép và nghỉ ngơi đáng giữ, nhưng không chứng minh phù hợp mọi bệnh nhân. 70% nói hiểu nghề hơn cho thấy hoạt động được ưa thích, không chứng minh họ phán đoán đúng yêu cầu công việc. Kết quả tích cực hỗ trợ thử tiếp, không thay nhiệm vụ khớp năng lực mục tiêu.",
        requiredMovesVi: [
          "Nêu nguyên tắc khớp chỉ báo với claim.",
          "Dẫn một chi tiết từ mỗi nguồn.",
          "Phân biệt tiếp tục thử với chứng minh hiệu quả.",
          "Kết luận bằng một giới hạn rõ.",
        ],
        scopeBoundaryVi:
          "Không phủ nhận lợi ích thực hành của nghỉ ngơi hoặc chia sẻ nghề; chỉ giới hạn loại kết luận mà các chỉ báo hiện tại có thể hỗ trợ.",
        timeLimitSeconds: 300,
      }),
      prompt({
        kind: "evidence-bounded-spoken-position-and-response",
        primarySkill: "speaking",
        promptVi:
          "Phản hồi ý kiến “chờ thêm bằng chứng chỉ làm chậm hành động”; đề xuất một hành động có thể đảo ngược và một phép kiểm tra không làm mất lợi ích ngắn hạn.",
        evidenceRefs: [
          ref(SOURCE.personalCauseListening),
          ref(SOURCE.educationClaimListening),
        ],
        modelHanzi:
          "我同意不能等到所有问题都解决才行动。陈老师可以继续休息和记录，同时在出现高烧或呼吸困难时及时就医；学院也可以保留分享会，同时增加会前会后任务。两种做法都先保留低风险行动，再用新记录缩小不确定性，而不是把暂时效果说成最终证明。",
        modelVi:
          "Tôi đồng ý không thể chờ mọi câu hỏi được giải quyết mới hành động. Thầy Trần có thể tiếp tục nghỉ và ghi, đồng thời đi khám khi sốt cao hoặc khó thở; nhà trường có thể giữ buổi chia sẻ và thêm nhiệm vụ trước–sau. Cả hai giữ hành động ít rủi ro rồi dùng dữ liệu mới giảm bất định, không gọi tác dụng tạm thời là chứng minh cuối cùng.",
        requiredMovesVi: [
          "Thừa nhận chi phí của việc trì hoãn.",
          "Đề xuất hành động có thể điều chỉnh.",
          "Gắn phép kiểm tra với đúng claim.",
          "Không biến thận trọng thành không hành động.",
        ],
        scopeBoundaryVi:
          "Câu trả lời không đưa lời khuyên y khoa cá nhân và không tuyên bố thiết kế giáo dục đã được hiệu chuẩn; chỉ nêu nguyên tắc hành động có kiểm chứng.",
        timeLimitSeconds: 300,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "speaking",
        promptVi:
          "Chuẩn bị 120 giây rồi trình bày tối đa 180 giây trước một hội đồng: nên ra quyết định thế nào khi dữ liệu tích cực nhưng claim năng lực hoặc nguyên nhân vẫn chưa được chứng minh?",
        evidenceRefs: [
          ref(SOURCE.personalCauseListening),
          ref(SOURCE.educationClaimListening),
        ],
        modelHanzi:
          "面对积极但不完整的数据，第一步是保留原始结果，第二步是写清它不能证明什么，第三步才选择低风险行动。陈老师的恢复支持继续记录和休息，学院的问卷支持保留受欢迎的分享形式。可是一个个案和自报问卷都不能单独证明普遍疗效或职业能力。合理决定是继续、记录、比较，并提前规定什么新证据会改变决定。",
        modelVi:
          "Khi dữ liệu tích cực nhưng chưa đủ, bước một giữ kết quả gốc, bước hai ghi rõ nó không chứng minh gì, bước ba chọn hành động ít rủi ro. Sự hồi phục hỗ trợ tiếp tục ghi/nghỉ; khảo sát hỗ trợ giữ hình thức chia sẻ được yêu thích. Nhưng một ca và tự báo không chứng minh hiệu quả phổ quát hay năng lực nghề. Quyết định hợp lý là tiếp tục, ghi, so sánh và định trước bằng chứng nào sẽ đổi quyết định.",
        requiredMovesVi: [
          "Mở bằng quy trình quyết định ba bước.",
          "Dùng cả hai nguồn làm minh chứng.",
          "Trả lời một phản biện về tốc độ hành động.",
          "Nêu điều kiện thay đổi quyết định.",
        ],
        scopeBoundaryVi:
          "Thời lượng chỉ là ngân sách rehearsal; bản thu, TTS và rubric nháp không tạo điểm đo, mastery, prerequisite waiver hoặc mock score.",
        timeLimitSeconds: 300,
      }),
    ],
  },
  "hsk4-structured-spoken-defense-lesson-02": {
    sourceTextIds: [
      SOURCE.educationCauseListening,
      SOURCE.natureClaimListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Nghe hai nguồn và dựng hai chuỗi nguyên nhân tạm thời: thay đổi được thực hiện, kết quả quan sát, yếu tố đồng thời và thiết kế kiểm tra tiếp theo.",
        evidenceRefs: [
          ref(SOURCE.educationCauseListening),
          ref(SOURCE.natureClaimListening),
        ],
        modelHanzi:
          "案例培训后，基本报销错误减半，特殊情况处理更快，但重复使用系统也可能有作用。优惠餐厅的一次性杯下降最多，按顾客数调整后差异仍在却变小；地点和天气仍需控制。",
        modelVi:
          "Sau đào tạo bằng tình huống, lỗi hoàn phí cơ bản giảm một nửa và xử lý ngoại lệ nhanh hơn, nhưng việc dùng hệ thống lặp lại cũng có thể tác động. Nhà hàng ưu đãi giảm cốc nhiều nhất; sau điều chỉnh theo khách, chênh lệch còn nhưng nhỏ đi; địa điểm và thời tiết vẫn cần kiểm soát.",
        requiredMovesVi: [
          "Ghi đúng thay đổi ở mỗi nguồn.",
          "Ghi riêng kết quả quan sát.",
          "Nêu yếu tố đồng thời chưa loại trừ.",
          "Chỉ ra thiết kế so sánh tiếp theo.",
        ],
        scopeBoundaryVi:
          "Không nâng quan hệ xuất hiện cùng lúc thành nguyên nhân duy nhất, cũng không dùng một thử nghiệm hẹp để áp dụng cho mọi công ty hoặc nhà hàng.",
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "So sánh sức nặng của hai kết quả nghe được và ghi bốn bằng chứng khiến kết luận phải thu hẹp thay vì tuyên bố can thiệp đã thành công lâu dài.",
        evidenceRefs: [
          ref(SOURCE.educationCauseListening),
          ref(SOURCE.natureClaimListening),
        ],
        modelHanzi:
          "培训结果有具体错误率和处理时间，但系统熟悉度会自然增加，三个月比较还没完成。杯子试验按顾客数调整并有试验前记录，不过餐厅没有轮换条件。两项结果都支持继续测试，不支持长期或普遍因果结论。",
        modelVi:
          "Kết quả đào tạo có tỷ lệ lỗi và thời gian xử lý cụ thể, nhưng độ quen hệ thống có thể tự tăng và so sánh ba tháng chưa xong. Thử cốc đã điều chỉnh theo khách và có dữ liệu trước, nhưng chưa luân phiên điều kiện cùng nhà hàng. Cả hai hỗ trợ thử tiếp, không hỗ trợ nhân quả dài hạn/phổ quát.",
        requiredMovesVi: [
          "Nêu chỉ số cụ thể của từng nguồn.",
          "Nêu ít nhất một yếu tố gây nhiễu.",
          "Phân biệt bằng chứng mạnh hơn với bằng chứng đủ.",
          "Viết kết luận tạm thời cho cả hai.",
        ],
        scopeBoundaryVi:
          "So sánh sức nặng không có nghĩa xếp hạng hai dự án bằng một điểm; mỗi nguồn có mục tiêu, đơn vị đo và khoảng theo dõi khác nhau.",
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "listening",
        promptVi:
          "Trong 180 giây, chọn hai kết luận được phép và hai kết luận bị cấm từ hai nguồn, rồi ghi ngắn lý do bằng dữ kiện đã nghe.",
        evidenceRefs: [
          ref(SOURCE.educationCauseListening),
          ref(SOURCE.natureClaimListening),
        ],
        modelHanzi:
          "可以说案例培训后错误减少，也可以说优惠在本次条件下与较大下降相关。不能说案例教学造成全部改善，也不能说优惠在所有餐厅必然最好，因为比较与轮换尚未完成。",
        modelVi:
          "Được phép nói lỗi giảm sau đào tạo tình huống và ưu đãi liên quan mức giảm lớn hơn trong điều kiện thử. Không được nói tình huống gây toàn bộ cải thiện hay ưu đãi chắc chắn tốt nhất ở mọi nhà hàng vì so sánh/luân phiên chưa hoàn tất.",
        requiredMovesVi: [
          "Chọn đủ hai kết luận được phép.",
          "Chọn đủ hai kết luận bị cấm.",
          "Gắn mỗi lựa chọn với bằng chứng.",
          "Giữ đúng phạm vi thời gian và địa điểm.",
        ],
        scopeBoundaryVi:
          "Bài luyện kiểm tra hiểu nghe và giới hạn suy luận; việc ghi đáp án không được chuyển thành writing evidence hoặc điểm assessment.",
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "evidence-bounded-spoken-position-and-response",
        primarySkill: "speaking",
        promptVi:
          "Bảo vệ quyết định tiếp tục thử cả hai can thiệp nhưng chưa triển khai đại trà; giải thích bằng chứng nào đủ để hành động và bằng chứng nào còn thiếu.",
        evidenceRefs: [
          ref(SOURCE.educationCauseListening),
          ref(SOURCE.natureClaimListening),
        ],
        modelHanzi:
          "两项干预都有继续试验的理由。案例培训后错误和处理时间改善，优惠条件下杯子使用下降也较多；这些结果足以支持保留试点。可是员工会自然熟悉系统，餐厅地点和天气也不同。因此，公司应完成三个月比较，研究组应在同一家餐厅轮换提示，再决定是否扩大。",
        modelVi:
          "Cả hai can thiệp có lý do để thử tiếp. Sau đào tạo, lỗi/thời gian cải thiện; dưới ưu đãi, dùng cốc giảm nhiều hơn, đủ để giữ pilot. Nhưng nhân viên có thể tự quen hệ thống, còn địa điểm/thời tiết nhà hàng khác nhau. Công ty nên hoàn tất so sánh ba tháng và nhóm nghiên cứu luân phiên thông báo cùng nhà hàng trước khi mở rộng.",
        requiredMovesVi: [
          "Nêu quyết định tiếp tục nhưng chưa mở rộng.",
          "Dẫn kết quả tích cực của cả hai nguồn.",
          "Giải thích hai khoảng nhân quả.",
          "Đặt điều kiện trước khi triển khai rộng.",
        ],
        scopeBoundaryVi:
          "Không coi “chưa mở rộng” là thất bại và không coi “tiếp tục thử” là xác nhận hiệu quả; hai trạng thái phải được giữ riêng.",
        timeLimitSeconds: 300,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "speaking",
        promptVi:
          "Trình bày với người quản lý muốn mở rộng ngay: nhượng bộ lợi ích ngắn hạn, phản hồi yêu cầu tốc độ và đề xuất một mốc quyết định có thể kiểm tra.",
        evidenceRefs: [
          ref(SOURCE.educationCauseListening),
          ref(SOURCE.natureClaimListening),
        ],
        modelHanzi:
          "我承认当前结果有实际价值：员工少犯错，餐厅也少用杯子。为了不失去这个机会，可以保留现有试点并提前准备扩大方案。不过，正式扩大应等到两个检查点：三个月后比较培训组与未培训组，同一家餐厅完成三种提示轮换。这样既不停止行动，也不把地点差异和自然熟悉误写成效果。",
        modelVi:
          "Tôi thừa nhận kết quả hiện tại có giá trị: nhân viên ít lỗi và nhà hàng dùng ít cốc hơn. Có thể giữ pilot và chuẩn bị phương án mở rộng để không mất cơ hội. Nhưng mở rộng chính thức nên chờ hai mốc: so sánh nhóm có/không đào tạo sau ba tháng và luân phiên ba thông báo cùng nhà hàng. Như vậy vẫn hành động mà không nhầm khác biệt địa điểm hay tự quen thành hiệu quả.",
        requiredMovesVi: [
          "Nhượng bộ lợi ích ngắn hạn rõ ràng.",
          "Trả lời yêu cầu phải hành động nhanh.",
          "Nêu hai mốc kiểm tra cụ thể.",
          "Kết bằng tiêu chí mở rộng.",
        ],
        scopeBoundaryVi:
          "Mốc thời gian là kế hoạch rehearsal dựa trên nguồn, không phải cut score, cam kết vận hành hoặc bằng chứng hiệu chuẩn cho quyết định thật.",
        timeLimitSeconds: 300,
      }),
    ],
  },
  "hsk4-structured-spoken-defense-lesson-03": {
    sourceTextIds: [
      SOURCE.natureCauseListening,
      SOURCE.societyCauseListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Sau khi nghe, ghi các điều kiện khiến một giải pháp duy nhất không đủ: mục tiêu, nhóm chịu tác động, độ trễ và chỉ số cần giữ riêng trong hai nguồn.",
        evidenceRefs: [
          ref(SOURCE.natureCauseListening),
          ref(SOURCE.societyCauseListening),
        ],
        modelHanzi:
          "城市降温要区分温度、用电和居民是否使用阴凉空间；树成长慢，浅色屋顶快却要维护。少买东西也要看谁使用、使用多久和能否共享，独居者与照顾病人的家庭条件不同。",
        modelVi:
          "Giảm nóng đô thị phải tách nhiệt độ, điện và việc cư dân có dùng bóng mát; cây lớn chậm, mái sáng nhanh nhưng cần bảo trì. Mua ít phải xét ai dùng, bao lâu và có chia sẻ được không; người sống một mình khác gia đình chăm bệnh.",
        requiredMovesVi: [
          "Ghi riêng mục tiêu của từng nguồn.",
          "Nêu nhóm có điều kiện khác nhau.",
          "Nêu độ trễ hoặc chi phí bảo trì.",
          "Khóa chỉ số không được gộp.",
        ],
        scopeBoundaryVi:
          "Không dùng khác biệt điều kiện để kết luận không thể ra quyết định; mục tiêu là chọn giải pháp theo điều kiện và tiếp tục đo từng kết quả.",
        timeLimitSeconds: 120,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "listening",
        promptVi:
          "Trong thời gian giới hạn, chuẩn bị phản hồi cho ý kiến “một giải pháp thống nhất luôn đơn giản và công bằng hơn”, dùng hai bằng chứng và một giới hạn.",
        evidenceRefs: [
          ref(SOURCE.natureCauseListening),
          ref(SOURCE.societyCauseListening),
        ],
        modelHanzi:
          "统一办法容易管理，却可能把不同条件当成相同。树荫、浅色屋顶和公共空间服务的街区不同；共享工具也不适合必须随时照顾病人的家庭。公平应比较谁能使用、成本和维护，而不是要求所有人接受一种答案。",
        modelVi:
          "Một cách thống nhất dễ quản lý nhưng có thể coi điều kiện khác nhau là giống nhau. Bóng cây, mái sáng và không gian công phục vụ khu khác nhau; chia sẻ dụng cụ không hợp gia đình phải chăm bệnh tức thời. Công bằng nên so ai dùng được, chi phí và bảo trì, không ép một đáp án.",
        requiredMovesVi: [
          "Thừa nhận lợi ích của phương án thống nhất.",
          "Dẫn một ngoại lệ từ mỗi nguồn.",
          "Đề xuất tiêu chí công bằng thay thế.",
          "Nêu giới hạn phạm vi cộng đồng.",
        ],
        scopeBoundaryVi:
          "Không tuyên bố mọi chính sách phải cá nhân hóa hoàn toàn; nguồn chỉ hỗ trợ giữ các điều kiện quan trọng thay vì xóa chúng vì sự đơn giản.",
        timeLimitSeconds: 180,
      }),
      prompt({
        kind: "evidence-bounded-spoken-position-and-response",
        primarySkill: "speaking",
        promptVi:
          "Trả lời câu hỏi “thành phố có nên chỉ chọn trồng cây không?” bằng thiết kế thử nghiệm giảm nóng và phép so sánh với khung quyết định tiêu dùng.",
        evidenceRefs: [
          ref(SOURCE.natureCauseListening),
          ref(SOURCE.societyCauseListening),
        ],
        modelHanzi:
          "城市不应马上只选种树。最热地点同时缺树并有深色屋顶，树成长需要时间，低收入街区还需要公共阴凉空间。消费讨论也说明，先问谁使用、多久使用、有没有替代选择。城市可以按街区试树荫、浅色屋顶或组合，并分别看温度、用电和实际使用。",
        modelVi:
          "Thành phố chưa nên chỉ chọn trồng cây. Điểm nóng vừa thiếu cây vừa có mái tối; cây cần thời gian và khu thu nhập thấp cần bóng mát công cộng. Thảo luận tiêu dùng cũng yêu cầu hỏi ai dùng, bao lâu, có lựa chọn thay thế không. Có thể thử cây, mái sáng hoặc kết hợp theo khu và đo riêng nhiệt độ, điện, sử dụng.",
        requiredMovesVi: [
          "Trả lời trực tiếp câu hỏi lựa chọn cây.",
          "Nêu ít nhất hai điều kiện đô thị.",
          "Chuyển khung ba câu hỏi từ nguồn xã hội.",
          "Đề xuất các chỉ số tách biệt.",
        ],
        scopeBoundaryVi:
          "Không khẳng định tổ hợp biện pháp chắc chắn tốt nhất; kế hoạch bốn khu phố là thử nghiệm điều kiện và còn phải theo dõi hai năm.",
        timeLimitSeconds: 300,
      }),
      prompt({
        kind: "evidence-bounded-spoken-position-and-response",
        primarySkill: "speaking",
        promptVi:
          "Phản hồi nhận định “mua càng ít thì cuộc sống càng lý tưởng”, đồng thời dùng bài học từ kế hoạch giảm nóng để giải thích vì sao mục tiêu và điều kiện phải tách riêng.",
        evidenceRefs: [
          ref(SOURCE.natureCauseListening),
          ref(SOURCE.societyCauseListening),
        ],
        modelHanzi:
          "买得少可能减少闲置，却不是所有家庭的唯一理想。照顾病人的家庭需要随时使用物品，高质量产品也可能比反复更换更节约。城市降温同样不能只追求一个温度数字，还要看维护、成本和居民使用。合理原则是先定目标，再按人群和条件比较方案。",
        modelVi:
          "Mua ít có thể giảm đồ nhàn rỗi nhưng không phải lý tưởng duy nhất cho mọi gia đình. Gia đình chăm bệnh cần đồ sẵn có; đồ tốt có thể tiết kiệm hơn thay nhiều lần. Giảm nóng cũng không chỉ theo một số nhiệt, mà xét bảo trì, chi phí và sử dụng. Nguyên tắc là xác định mục tiêu rồi so phương án theo nhóm/điều kiện.",
        requiredMovesVi: [
          "Bác bỏ từ tuyệt đối trong nhận định.",
          "Nêu hai điều kiện sử dụng vật phẩm.",
          "Liên hệ ít nhất hai chỉ số đô thị.",
          "Kết bằng nguyên tắc có điều kiện.",
        ],
        scopeBoundaryVi:
          "Không chuyển sang cổ vũ mua nhiều hoặc phủ nhận tiết kiệm; kết luận chỉ yêu cầu so mục đích, tần suất, tuổi thọ và lựa chọn chia sẻ.",
        timeLimitSeconds: 300,
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "speaking",
        promptVi:
          "Thực hiện bài bảo vệ cuối: nêu một claim ban đầu quá rộng, tự sửa ngay trong phần nói, rồi đưa ra quyết định có điều kiện dùng đủ hai nguồn.",
        evidenceRefs: [
          ref(SOURCE.natureCauseListening),
          ref(SOURCE.societyCauseListening),
        ],
        modelHanzi:
          "我先说“组合办法一定最好”，这个说法太宽，应该改成“在本次四个街区中，组合办法值得与单项办法比较”。同样，“少买一定更理想”也要改成按使用者、频率、寿命和共享条件判断。我的决定是保留多种方案，公开成本与受益群体，并用后续数据决定扩大哪一种。",
        modelVi:
          "Tôi ban đầu nói “kết hợp chắc chắn tốt nhất”, nhưng quá rộng; phải sửa thành “trong bốn khu này, kết hợp đáng so với biện pháp đơn”. “Mua ít chắc chắn lý tưởng” cũng phải sửa theo người dùng, tần suất, tuổi thọ, chia sẻ. Quyết định là giữ nhiều phương án, công khai chi phí/nhóm hưởng lợi và dùng dữ liệu sau quyết định mở rộng.",
        requiredMovesVi: [
          "Nói rõ claim quá rộng ban đầu.",
          "Tự sửa claim bằng điều kiện nguồn.",
          "Dùng bằng chứng của cả hai nguồn.",
          "Nêu quyết định và dữ liệu theo dõi.",
        ],
        scopeBoundaryVi:
          "Tự sửa trong bản thu là hoạt động học; nó không tự chứng minh speaking mastery, độ chính xác phát âm hoặc năng lực phản biện đã được human review.",
        timeLimitSeconds: 300,
      }),
    ],
  },
};

export const buildHsk4StructuredSpokenDefenseIntegrationPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4StructuredWrittenArgumentIntegrationPackBundle(root);
  assertValidHsk4StructuredWrittenArgumentIntegrationPackBundle(
    prerequisite,
  );
  return buildHsk4IntegrationStagePack({
    root,
    config: HSK4_STRUCTURED_SPOKEN_DEFENSE_CONFIG,
    content: CONTENT,
    summaryArgumentHeadBundle: prerequisite.summaryArgumentHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4StructuredSpokenDefenseIntegrationPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4StructuredSpokenDefenseIntegrationPack(root),
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
    HSK4_STRUCTURED_SPOKEN_DEFENSE_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4StructuredSpokenDefenseIntegrationPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error(
        "HSK4 structured spoken-defense integration draft is stale",
      );
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_STRUCTURED_SPOKEN_DEFENSE_CONFIG.lessonIds.length
    } HSK4 structured spoken-defense integration lessons at ${
      outputPath
    }.`,
  );
}
