import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4SummaryArgumentModulePack,
  serializeHsk4SummaryArgumentModulePack,
} from "./hsk4-summary-argument-module-builder.mjs";
import {
  HSK4_PRECISION_REFERENCE_QUANTITY_CONFIG,
  HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH,
} from "../../src/content/hsk4PrecisionReferenceQuantitySummaryArgumentPack.mjs";
import {
  assertValidHsk4CultureHistoryLongFormPackBundle,
  loadHsk4CultureHistoryLongFormPackBundle,
} from "../../src/content/hsk4CultureHistoryLongFormPack.mjs";

const G = (n) => `hsk4-grammar-row-${String(n).padStart(3, "0")}`;
const ref = (textId, ...paragraphIds) => ({ textId, paragraphIds });
const grammar = (functionVi, modelHanzi, modelVi, scopeBoundaryVi) => ({
  functionVi,
  modelHanzi,
  modelVi,
  scopeBoundaryVi,
});

const SOURCE = {
  communityReading:
    "hsk4-personal-community-analysis-concept-actor-map:reading-01",
  stationListening:
    "hsk4-personal-community-analysis-concept-actor-map:listening-01",
  familyMealReading:
    "hsk4-personal-community-analysis-process-timeline:reading-01",
  tripListening:
    "hsk4-personal-community-analysis-process-timeline:listening-01",
  holidayFeeReading:
    "hsk4-personal-community-analysis-cause-condition-result:reading-01",
  coughListening:
    "hsk4-personal-community-analysis-cause-condition-result:listening-01",
  temperatureReading:
    "hsk4-personal-community-analysis-comparison-variation:reading-01",
  travelInfoListening:
    "hsk4-personal-community-analysis-comparison-variation:listening-01",
  publicRoomReading:
    "hsk4-personal-community-analysis-claim-evidence-inference:reading-01",
  barberListening:
    "hsk4-personal-community-analysis-claim-evidence-inference:listening-01",
  familyFutureReading:
    "hsk4-personal-community-analysis-viewpoint-synthesis:reading-01",
  campusActivityListening:
    "hsk4-education-work-evaluation-process-timeline:listening-01",
};

const CONTENT = {
  "hsk4-precision-reference-quantity-lesson-01": {
    sourceTextIds: [SOURCE.communityReading, SOURCE.stationListening],
    grammarApplications: {
      [G(1)]: grammar(
        "Dùng 敢 để nêu mức sẵn sàng hành động của một chủ thể, không biến sự sẵn sàng thành kết quả đã xảy ra.",
        "社区志愿者敢提出新办法，但表格还没有证明服务已经改善。",
        "Tình nguyện viên cộng đồng dám đề xuất cách mới, nhưng bảng biểu chưa chứng minh dịch vụ đã được cải thiện.",
        "“敢” chỉ thái độ hoặc khả năng chấp nhận rủi ro; không được suy ra hành động đã thành công.",
      ),
      [G(2)]: grammar(
        "Dùng 各、各种、任何、此 để xác định phạm vi nhóm hoặc đối tượng trước khi khái quát.",
        "各位乘客可以比较各种午餐，但此调查不能代表任何车站。",
        "Mỗi hành khách có thể so sánh nhiều loại bữa trưa, nhưng khảo sát này không thể đại diện cho mọi nhà ga.",
        "Từ chỉ định phải khớp tập hợp thật trong nguồn; “任何” trong câu phủ định không cho phép khái quát sang toàn bộ hệ thống.",
      ),
      [G(3)]: grammar(
        "Dùng lượng từ chuyên dụng để giữ chính xác đơn vị đếm của dữ kiện.",
        "服务站准备了两台电脑、三袋材料和一幅社区地图。",
        "Điểm dịch vụ chuẩn bị hai máy tính, ba túi tài liệu và một bản đồ cộng đồng.",
        "Không thay lượng từ bằng đơn vị khác nếu nguồn không cung cấp cách quy đổi.",
      ),
      [G(4)]: grammar(
        "Dùng lượng từ vay mượn khi danh từ chuyển thành đơn vị đếm trong ngữ cảnh cụ thể.",
        "桌上一盒意见卡和一屋子居民都不能自动证明计划有效。",
        "Một hộp phiếu góp ý trên bàn và cả phòng cư dân không tự động chứng minh kế hoạch có hiệu quả.",
        "Cấu trúc tạo hình ảnh số lượng, không cho biết mẫu có đại diện hay không.",
      ),
      [G(5)]: grammar(
        "Dùng 场、顿、趟 để phân biệt sự kiện, bữa ăn và lượt di chuyển.",
        "一次调查记录了一场讨论、一顿午餐和两趟换乘。",
        "Một khảo sát ghi lại một cuộc thảo luận, một bữa trưa và hai lượt chuyển tuyến.",
        "Lượng từ sự kiện chỉ đếm lần xảy ra; không tự nói chất lượng hoặc tác động.",
      ),
      [G(6)]: grammar(
        "Dùng phó từ mức độ để so sánh có điều kiện, tránh đổi quan sát tương đối thành kết luận tuyệt đối.",
        "午餐价格稍微低一些，尤其适合时间紧的乘客，但未必更加健康。",
        "Giá bữa trưa thấp hơn một chút, đặc biệt hợp người gấp thời gian, nhưng chưa chắc lành mạnh hơn.",
        "“稍微、更加、尤其” cần một chuẩn so sánh; không được bổ sung chuẩn không có trong nguồn.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "服务表记录了居民、志愿者和工作人员的不同责任。",
        claimVi:
          "Bảng dịch vụ ghi lại trách nhiệm khác nhau của cư dân, tình nguyện viên và nhân viên.",
        classification: "fact",
        sourceRef: ref(SOURCE.communityReading, "rp1", "rp2"),
        rationaleVi:
          "Hai đoạn đầu trực tiếp mô tả các vai và việc phối hợp; đây là dữ kiện trong văn bản.",
        inferenceBoundaryVi:
          "Có thể nói các vai được ghi nhận, chưa thể nói mô hình này hiệu quả ở mọi cộng đồng.",
      },
      {
        claimHanzi: "车站午餐选择说明方便一定比营养重要。",
        claimVi:
          "Lựa chọn bữa trưa ở nhà ga cho thấy sự tiện lợi chắc chắn quan trọng hơn dinh dưỡng.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.stationListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn mô tả nhiều tiêu chí và sự đánh đổi; thứ tự ưu tiên tuyệt đối là diễn giải thêm.",
        inferenceBoundaryVi:
          "Chỉ được kết luận người nói cân nhắc thời gian, giá và dinh dưỡng trong tình huống đã nêu.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.communityReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại kết luận của bảng dịch vụ bằng 2–3 câu, giữ riêng vai trò và giới hạn quan sát.",
        modelHanzi:
          "这张表把居民的需要、志愿者的帮助和工作人员的安排分开记录，也显示三方需要合作。它能说明本次社区服务怎样运行，却不能证明别的社区也会得到同样结果。",
        modelVi:
          "Bảng tách nhu cầu cư dân, hỗ trợ của tình nguyện viên và sắp xếp của nhân viên, đồng thời cho thấy ba bên cần phối hợp. Nó giải thích lần vận hành này chứ không chứng minh cộng đồng khác sẽ có cùng kết quả.",
        preservedFactsVi: [
          "Ba vai trò được ghi riêng.",
          "Sự phối hợp xuất hiện trong trường hợp được mô tả.",
          "Phạm vi chỉ là cộng đồng và hoạt động trong nguồn.",
        ],
        prohibitedExpansionVi:
          "Không được khẳng định biểu mẫu làm tăng chất lượng dịch vụ trên diện rộng.",
      },
      {
        sourceRef: ref(SOURCE.stationListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase lựa chọn bữa trưa, giữ các tiêu chí và không biến lựa chọn cá nhân thành quy luật.",
        modelHanzi:
          "乘客在车站选择午餐时同时考虑价格、时间和营养。材料只说明不同需要会带来不同选择，并没有说某一种午餐对所有乘客最好。",
        modelVi:
          "Khi chọn bữa trưa ở ga, hành khách đồng thời cân nhắc giá, thời gian và dinh dưỡng. Tư liệu chỉ cho thấy nhu cầu khác nhau dẫn đến lựa chọn khác nhau, không nói một món tốt nhất cho mọi hành khách.",
        preservedFactsVi: [
          "Có nhiều hơn một tiêu chí lựa chọn.",
          "Nhu cầu của hành khách không giống nhau.",
        ],
        prohibitedExpansionVi:
          "Không xếp hạng món ăn hoặc suy ra tác động sức khỏe dài hạn nếu nguồn không đo.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai nguồn phân chia vai trò, nhu cầu và tiêu chí quyết định trong 100–180 chữ Hán.",
      requiredElementsVi: [
        "ba vai trong dịch vụ cộng đồng",
        "các tiêu chí chọn bữa trưa",
        "điểm chung về nhu cầu khác nhau",
        "một giới hạn phạm vi của mỗi nguồn",
      ],
      evidenceRefs: [
        ref(SOURCE.communityReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.stationListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "社区服务表把居民、志愿者和工作人员的任务分开：居民提出需要，志愿者提供帮助，工作人员安排时间与资源。车站午餐材料则把价格、等待时间和营养列为不同标准，乘客会按自己的情况选择。两份材料都说明，决定不是由一个因素自动产生，而要先明确谁在行动、需要什么、依据什么。不过，服务表只记录一次社区活动，午餐讨论也只发生在特定车站，不能代表所有社区或乘客。",
      modelVi:
        "Bảng dịch vụ tách nhiệm vụ cư dân, tình nguyện viên và nhân viên: cư dân nêu nhu cầu, tình nguyện viên hỗ trợ, nhân viên xếp thời gian và nguồn lực. Tư liệu ở ga lại tách giá, thời gian chờ và dinh dưỡng; hành khách chọn theo hoàn cảnh. Cả hai cho thấy phải xác định chủ thể, nhu cầu và căn cứ. Tuy vậy, mỗi nguồn chỉ phản ánh một hoạt động hoặc một nhà ga.",
      prohibitedExpansionVi:
        "Không tuyên bố mô hình phối hợp hay lựa chọn bữa trưa có hiệu quả phổ quát.",
    },
    argument: {
      promptVi:
        "Viết 160–280 chữ Hán bàn luận: quyết định dịch vụ có nên ưu tiên một tiêu chí thống nhất hay cho phép nhiều nhu cầu cùng tồn tại?",
      requiredElementsVi: [
        "luận điểm có phạm vi",
        "ít nhất một bằng chứng từ mỗi nguồn",
        "giải thích quan hệ giữa vai trò và tiêu chí",
        "phản biện ý kiến ưu tiên một chuẩn để dễ quản lý",
        "kết luận giới hạn ở tình huống nguồn",
      ],
      evidenceRefs: [
        ref(SOURCE.communityReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.stationListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "在社区服务和车站餐饮这类日常事务中，我主张先保留多个需要，再用公开规则协调，而不是只设一个标准。社区服务表之所以有用，是因为它把居民、志愿者和工作人员的责任分开，让资源安排能够回应真实需要。车站午餐也不能只看价格：赶时间的人重视速度，另一些人还会考虑营养。有人认为统一标准更容易管理，这一点有道理，例如必须公布开放时间和基本价格。但是，如果管理者把“方便”当成唯一目标，就可能忽略健康或无法使用服务的人。因此，较合理的办法是规定最低共同条件，同时记录不同群体的需求并说明取舍。这个结论只适用于材料中的社区活动和车站选择，还需要更多地区、更多使用者的数据才能推广。",
      modelVi:
        "Trong dịch vụ cộng đồng và ăn uống ở ga, tôi chủ trương giữ nhiều nhu cầu rồi phối hợp bằng quy tắc công khai, thay vì chỉ một chuẩn. Bảng dịch vụ hữu ích vì tách trách nhiệm; bữa trưa cũng không thể chỉ xét giá. Ý kiến cho rằng chuẩn thống nhất dễ quản lý có lý ở các điều kiện tối thiểu, nhưng nếu tiện lợi là mục tiêu duy nhất sẽ bỏ sót sức khỏe hoặc người khó tiếp cận. Nên có chuẩn chung tối thiểu, ghi nhu cầu khác nhau và giải thích đánh đổi. Kết luận chỉ áp dụng cho hai trường hợp nguồn.",
      counterargumentVi:
        "Một tiêu chí thống nhất giúp quản lý nhanh, so sánh dễ và tránh quyết định tùy tiện.",
      conclusionBoundaryVi:
        "Chỉ khuyến nghị cơ chế ra quyết định trong hai bối cảnh được mô tả; chưa chứng minh hiệu quả ở nơi khác.",
    },
    spoken: {
      promptVi:
        "Chuẩn bị 120 giây và nói 180 giây để bảo vệ một quy tắc ra quyết định có thể dùng cho cả dịch vụ cộng đồng và lựa chọn bữa trưa.",
      requiredMovesVi: [
        "nêu quy tắc chính",
        "dẫn một chi tiết từ mỗi nguồn",
        "trả lời phản biện về sự phức tạp",
        "nêu giới hạn dữ liệu",
      ],
      evidenceRefs: [
        ref(SOURCE.communityReading, "rp1", "rp3"),
        ref(SOURCE.stationListening, "lp1", "lp3"),
      ],
      modelOutlineHanzi: [
        "我的规则是先分清角色和需要，再公布共同底线。",
        "社区表说明居民、志愿者和工作人员承担不同任务。",
        "车站午餐说明价格、时间和营养不能互相代替。",
        "统一底线并不等于只留一个标准，反而能说明取舍。",
        "两个案例范围有限，推广前还要比较更多地点。",
      ],
      modelOutlineVi: [
        "Quy tắc của tôi là tách vai trò và nhu cầu rồi công bố chuẩn tối thiểu.",
        "Bảng cộng đồng cho thấy ba nhóm có nhiệm vụ khác nhau.",
        "Bữa trưa ở ga cho thấy giá, thời gian và dinh dưỡng không thay thế nhau.",
        "Chuẩn tối thiểu chung không đồng nghĩa chỉ giữ một tiêu chí.",
        "Hai trường hợp còn hẹp; cần so sánh thêm nơi khác trước khi mở rộng.",
      ],
    },
  },

  "hsk4-precision-reference-quantity-lesson-02": {
    sourceTextIds: [SOURCE.familyMealReading, SOURCE.tripListening],
    grammarApplications: {
      [G(7)]: grammar(
        "Dùng phó từ phạm vi để nói rõ toàn bộ, phần duy nhất hoặc ngưỡng tối thiểu của một quá trình.",
        "全家共准备了三道菜，但材料仅说明这一次活动至少有两代人参加。",
        "Cả nhà chuẩn bị tổng cộng ba món, nhưng tư liệu chỉ cho biết hoạt động lần này có ít nhất hai thế hệ tham gia.",
        "“全、共、仅、至少” phải bám đúng tập hợp hoặc con số nguồn; không đổi “ít nhất” thành số chính xác.",
      ),
      [G(8)]: grammar(
        "Dùng phó từ thời gian để giữ thứ tự, trạng thái ban đầu và thay đổi sắp xảy ra.",
        "大家本来要按时出发，车站通知忽然改变后才赶紧调整路线。",
        "Mọi người vốn định xuất phát đúng giờ, sau khi thông báo nhà ga đột ngột thay đổi mới vội điều chỉnh tuyến.",
        "Không đảo thứ tự “ban đầu–thông báo–điều chỉnh” khi paraphrase.",
      ),
      [G(9)]: grammar(
        "Dùng phó từ tần suất để phân biệt thói quen, sự kiện hiếm và hành động lặp lại.",
        "家人往往一起做饭，父亲偶尔迟到，这次大家再次调整了时间。",
        "Gia đình thường nấu cùng nhau, người cha đôi khi đến muộn; lần này mọi người lại điều chỉnh giờ.",
        "Tần suất định tính không cho phép suy ra tỷ lệ hoặc lịch cố định.",
      ),
      [G(10)]: grammar(
        "Dùng 故意、互相、相互 để chỉ ý định hoặc quan hệ hai chiều, không gán động cơ khi nguồn không nêu.",
        "家人互相分工，并不是谁故意把最难的任务留给别人。",
        "Các thành viên phân công lẫn nhau, không phải ai cố tình để việc khó nhất cho người khác.",
        "Chỉ dùng “故意” khi có bằng chứng về chủ ý; hợp tác quan sát được chưa đủ để biết động cơ nội tâm.",
      ),
      [G(11)]: grammar(
        "Dùng 却 để đánh dấu kết quả trái kỳ vọng đã được nguồn thiết lập.",
        "他们提前到了车站，却因为临时换站台差点儿错过车。",
        "Họ đến ga sớm, vậy mà vì đổi sân ga đột xuất nên suýt lỡ chuyến.",
        "Vế trước phải tạo kỳ vọng hợp lý; không dùng “却” để phóng đại một khác biệt trung tính.",
      ),
      [G(12)]: grammar(
        "Dùng 也许、恐怕 để giữ mức không chắc chắn của giải thích hoặc dự báo.",
        "如果通知仍不清楚，老人也许会走错，工作人员恐怕还要增加说明。",
        "Nếu thông báo vẫn không rõ, người lớn tuổi có lẽ đi nhầm và nhân viên e rằng phải tăng hướng dẫn.",
        "Tình thái khả năng không được chuyển thành kết quả chắc chắn.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "家庭活动经历了商量、分工、做饭和共同用餐的过程。",
        claimVi:
          "Hoạt động gia đình trải qua bàn bạc, phân công, nấu ăn và cùng dùng bữa.",
        classification: "fact",
        sourceRef: ref(SOURCE.familyMealReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Các bước được kể theo trình tự trong ba đoạn của nguồn đọc.",
        inferenceBoundaryVi:
          "Có thể mô tả tiến trình lần này, không được nói mọi gia đình đều tổ chức như vậy.",
      },
      {
        claimHanzi: "差点儿错过旅行说明车站管理一直很差。",
        claimVi:
          "Việc suýt lỡ chuyến chứng tỏ quản lý nhà ga luôn rất kém.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.tripListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn kể một chuỗi thay đổi và cách xử lý; “luôn rất kém” vượt tần suất và phạm vi.",
        inferenceBoundaryVi:
          "Chỉ có thể đánh giá thông tin và ứng phó trong chuyến đi cụ thể.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.familyMealReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Paraphrase tiến trình biến bữa cơm quê thành hoạt động gia đình, giữ các mốc và vai trò.",
        modelHanzi:
          "家人先讨论想保留的家乡味道，再按年龄和能力分工准备，最后一起做饭、讲记忆并记录做法。材料强调的是一次共同完成的过程，而不是固定不变的家庭传统。",
        modelVi:
          "Gia đình trước hết bàn hương vị quê muốn giữ, rồi phân công theo tuổi và khả năng, cuối cùng cùng nấu, kể ký ức và ghi cách làm. Nguồn nhấn mạnh một quá trình cùng hoàn thành, không phải truyền thống gia đình bất biến.",
        preservedFactsVi: [
          "Có trình tự bàn bạc–phân công–thực hiện.",
          "Nhiều thành viên tham gia với vai trò khác nhau.",
          "Nguồn chỉ theo dõi một hoạt động.",
        ],
        prohibitedExpansionVi:
          "Không gọi hoạt động một lần là truyền thống lâu đời hay chứng minh quan hệ gia đình được cải thiện.",
      },
      {
        sourceRef: ref(SOURCE.tripListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Viết lại sự cố chuyến đi theo đúng thứ tự nguyên nhân và cách khắc phục.",
        modelHanzi:
          "旅客虽然提前到站，却因站台临时变化和通知不清差点儿错过车。他们询问工作人员、重新确认信息后才完成换乘，因此材料支持改进通知，不支持判断整个车站长期失误。",
        modelVi:
          "Dù đến sớm, hành khách suýt lỡ chuyến vì sân ga đổi đột xuất và thông báo chưa rõ. Sau khi hỏi nhân viên và xác nhận lại họ mới chuyển tuyến được; vì thế nguồn ủng hộ cải thiện thông báo, không cho phép kết luận nhà ga sai lâu dài.",
        preservedFactsVi: [
          "Hành khách đến trước nhưng thông tin thay đổi.",
          "Họ hỏi và xác nhận lại trước khi chuyển tuyến.",
        ],
        prohibitedExpansionVi:
          "Không quy toàn bộ lỗi cho một cá nhân hoặc đánh giá lịch sử vận hành của nhà ga.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai tiến trình, nêu mốc ban đầu, thay đổi, cách phối hợp và kết quả có giới hạn.",
      requiredElementsVi: [
        "trình tự của hoạt động gia đình",
        "thay đổi thông tin chuyến đi",
        "hành động phối hợp hoặc xác nhận",
        "giới hạn của một lần quan sát",
      ],
      evidenceRefs: [
        ref(SOURCE.familyMealReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.tripListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "家庭材料从商量家乡味道开始，接着按年龄和能力分工，最后一起做饭、分享记忆并记录做法。旅行材料则从提前到站开始，随后出现站台变化和不清楚的通知，旅客通过询问、再次确认才完成换乘。两件事都不是一步完成：参与者先获得信息，再协作或修正行动。前者显示共同活动怎样形成，后者显示临时信息怎样改变计划。不过，两份材料都只记录一次过程，不能证明长期家庭关系或车站整体管理水平。",
      modelVi:
        "Tư liệu gia đình bắt đầu từ bàn hương vị quê, tiếp đến phân công rồi cùng nấu, chia sẻ ký ức và ghi cách làm. Tư liệu chuyến đi bắt đầu từ đến sớm, sau đó đổi sân ga và thông báo chưa rõ; hành khách hỏi và xác nhận lại mới chuyển tuyến. Cả hai đều cho thấy phải nhận thông tin rồi phối hợp hoặc sửa hành động. Tuy nhiên, chúng chỉ ghi một quá trình, không chứng minh quan hệ gia đình lâu dài hay quản lý toàn nhà ga.",
      prohibitedExpansionVi:
        "Không biến trình tự một lần thành thói quen thường xuyên hoặc bằng chứng hiệu quả dài hạn.",
    },
    argument: {
      promptVi:
        "Viết bài bàn luận: khi kế hoạch thay đổi, nên dựa chủ yếu vào chuẩn bị trước hay khả năng xác nhận và điều chỉnh?",
      requiredElementsVi: [
        "luận điểm cân bằng chuẩn bị và điều chỉnh",
        "bằng chứng từ hoạt động gia đình",
        "bằng chứng từ chuyến đi",
        "phản biện rằng chuẩn bị trước là đủ",
        "giới hạn từ hai sự kiện đơn lẻ",
      ],
      evidenceRefs: [
        ref(SOURCE.familyMealReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.tripListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "面对可能变化的计划，准备和调整都重要，但我认为“能够确认信息并及时调整”更接近决定性条件。家庭活动先讨论菜式、分配任务，这种准备使不同年龄的人都能参与；可是做饭过程中仍要根据时间和能力改变分工。旅行者也提前到站，却因为站台临时变化差点儿错过车，最后靠询问工作人员和再次确认完成换乘。有人会说，只要准备得足够早就不会出问题。提前确实能留下时间，也能减少慌乱，但它不能消除外部信息变化。因此，较可靠的做法是先准备基本方案，同时设确认节点和备用选择。两份材料只是家庭活动和一次旅行，尚不能证明这种办法在所有项目中最有效，不过它们清楚说明，准备并不等于计划永远不变。",
      modelVi:
        "Khi kế hoạch có thể đổi, chuẩn bị và điều chỉnh đều quan trọng, nhưng khả năng xác nhận thông tin và sửa kịp thời gần với điều kiện quyết định hơn. Hoạt động gia đình có chuẩn bị, nhưng vẫn phải đổi phân công; hành khách đến sớm mà vẫn suýt lỡ do đổi sân ga, cuối cùng nhờ hỏi và xác nhận lại. Ý kiến cho rằng chuẩn bị đủ sớm sẽ tránh mọi vấn đề chỉ đúng một phần: nó tạo dư địa nhưng không xóa thay đổi bên ngoài. Nên chuẩn bị phương án cơ bản, đặt mốc xác nhận và có lựa chọn dự phòng. Kết luận chỉ dựa trên hai sự kiện.",
      counterargumentVi:
        "Chuẩn bị càng sớm và càng chi tiết thì gần như không cần thay đổi trong quá trình thực hiện.",
      conclusionBoundaryVi:
        "Nguồn cho thấy ích lợi của xác nhận trong hai quá trình; chưa so sánh định lượng với các chiến lược khác.",
    },
    spoken: {
      promptVi:
        "Bảo vệ quan điểm về ba mốc bắt buộc để một kế hoạch có thể thích nghi khi thông tin thay đổi.",
      requiredMovesVi: [
        "nêu ba mốc",
        "giải thích bằng hoạt động gia đình",
        "giải thích bằng chuyến đi",
        "trả lời ý kiến chuẩn bị sớm là đủ",
      ],
      evidenceRefs: [
        ref(SOURCE.familyMealReading, "rp1", "rp3"),
        ref(SOURCE.tripListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "第一，开始前要确认目标、角色和基本资源。",
        "第二，执行中要设置重新确认信息的时间点。",
        "第三，变化发生后要记录调整和结果。",
        "家庭做饭靠分工，旅行换乘靠询问与再次确认。",
        "提前准备有用，但不能替代对新信息的反应。",
      ],
      modelOutlineVi: [
        "Thứ nhất, trước khi bắt đầu phải xác nhận mục tiêu, vai trò và nguồn lực.",
        "Thứ hai, khi làm cần đặt thời điểm xác nhận lại thông tin.",
        "Thứ ba, sau thay đổi phải ghi điều chỉnh và kết quả.",
        "Bữa cơm dựa vào phân công; chuyến đi dựa vào hỏi và xác nhận lại.",
        "Chuẩn bị trước hữu ích nhưng không thay thế phản ứng với thông tin mới.",
      ],
    },
  },

  "hsk4-precision-reference-quantity-lesson-03": {
    sourceTextIds: [SOURCE.holidayFeeReading, SOURCE.coughListening],
    grammarApplications: {
      [G(13)]: grammar(
        "Dùng phó từ ngữ khí để biểu thị nhấn mạnh, bất ngờ, lựa chọn bắt buộc hoặc câu hỏi; phải giữ đúng thái độ của người nói.",
        "景区确实调整了收费，却并没有证明游客就一定减少；我们究竟该看哪一项数据？",
        "Điểm du lịch quả thật điều chỉnh phí, nhưng điều đó không chứng minh du khách chắc chắn giảm; rốt cuộc ta nên xem dữ liệu nào?",
        "Các dấu hiệu như 确实、究竟、竟然 chỉ biểu thị lập trường/ngữ khí; chúng không tăng sức mạnh bằng chứng.",
      ),
      [G(14)]: grammar(
        "Dùng giới từ thời gian hoặc tiến trình để đặt dữ kiện vào đúng giai đoạn.",
        "自收费办法改变以后，管理方随着客流变化继续记录，而不是马上下结论。",
        "Từ sau khi cách thu phí thay đổi, bên quản lý tiếp tục ghi nhận theo biến động khách, chứ không kết luận ngay.",
        "Mốc thời gian phải có trong nguồn; quan hệ “sau đó” không tự động là quan hệ nhân quả.",
      ),
      [G(15)]: grammar(
        "Dùng 将、由、叫、让 để nêu tác nhân và đối tượng của hành động rõ ràng.",
        "医生让患者将咳嗽时间记下来，记录由本人完成。",
        "Bác sĩ yêu cầu bệnh nhân ghi lại thời điểm ho, và bản ghi do chính bệnh nhân thực hiện.",
        "Phải phân biệt ai yêu cầu, ai thực hiện và đối tượng bị tác động; không xóa tác nhân khi trách nhiệm quan trọng.",
      ),
      [G(16)]: grammar(
        "Dùng 由于 để giới thiệu nguyên nhân được nguồn hỗ trợ, không gắn cho tương quan chưa kiểm chứng.",
        "由于夜间空气较干，他的咳嗽更明显，但材料没有排除其他原因。",
        "Do không khí ban đêm khô hơn, cơn ho của anh ấy rõ hơn, nhưng tư liệu chưa loại trừ nguyên nhân khác.",
        "Chỉ dùng cấu trúc nhân quả khi nguồn nêu hoặc kiểm tra nguyên nhân; phải giữ nguyên các khả năng chưa loại trừ.",
      ),
      [G(17)]: grammar(
        "Dùng 对于、与 để xác định đối tượng đánh giá hoặc hai yếu tố được so sánh.",
        "对于新的收费办法，游客数量与服务成本都需要分别分析。",
        "Đối với cách thu phí mới, số du khách và chi phí dịch vụ đều cần được phân tích riêng.",
        "Nêu hai biến cạnh nhau không có nghĩa biến này gây ra biến kia.",
      ),
      [G(18)]: grammar(
        "Dùng 作为、按、按照 để công khai vai trò hoặc tiêu chuẩn làm căn cứ.",
        "作为短期记录，这份材料只能按照已观察到的症状评价习惯变化。",
        "Với tư cách bản ghi ngắn hạn, tư liệu này chỉ có thể đánh giá thay đổi thói quen theo triệu chứng đã quan sát.",
        "Căn cứ phải được nêu cụ thể; không thay tiêu chuẩn quan sát bằng đánh giá tổng quát về sức khỏe.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "景区在假期改变了收费安排，并记录了客流和服务情况。",
        claimVi:
          "Điểm du lịch thay đổi cách thu phí trong kỳ nghỉ và ghi lại lượng khách cùng tình hình dịch vụ.",
        classification: "fact",
        sourceRef: ref(SOURCE.holidayFeeReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Các hành động và loại dữ liệu được nêu trực tiếp qua tiến trình ba đoạn.",
        inferenceBoundaryVi:
          "Có thể nói có thay đổi và quan sát, chưa thể nói thay đổi phí là nguyên nhân duy nhất của mọi kết quả.",
      },
      {
        claimHanzi: "咳嗽减少证明新的生活习惯治好了所有呼吸问题。",
        claimVi:
          "Ho giảm chứng minh thói quen sống mới đã chữa khỏi mọi vấn đề hô hấp.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.coughListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn chỉ theo dõi một người và một số thay đổi; “chữa khỏi mọi vấn đề” vượt kết quả.",
        inferenceBoundaryVi:
          "Chỉ có thể nói triệu chứng trong trường hợp này thay đổi cùng giai đoạn điều chỉnh thói quen.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.holidayFeeReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại chuỗi nguyên nhân–điều kiện–kết quả của việc đổi phí, phân biệt quan sát và giải thích.",
        modelHanzi:
          "景区在假期调整收费，是为了应对客流、成本和服务压力。调整后出现了一些变化，但材料同时记录天气、活动安排等条件，所以不能把所有结果都归因于价格。",
        modelVi:
          "Điểm du lịch điều chỉnh phí trong kỳ nghỉ để ứng phó lượng khách, chi phí và áp lực dịch vụ. Sau điều chỉnh có một số thay đổi, nhưng nguồn đồng thời ghi thời tiết và lịch hoạt động, nên không thể quy mọi kết quả cho giá.",
        preservedFactsVi: [
          "Phí thay đổi trong một bối cảnh kỳ nghỉ cụ thể.",
          "Có nhiều điều kiện được theo dõi.",
          "Kết quả quan sát không chỉ có một cách giải thích.",
        ],
        prohibitedExpansionVi:
          "Không khẳng định chính sách phí thành công hoặc thất bại trên toàn bộ mùa du lịch.",
      },
      {
        sourceRef: ref(SOURCE.coughListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase mối liên hệ giữa triệu chứng và thay đổi thói quen, giữ các nguyên nhân thay thế.",
        modelHanzi:
          "患者记录咳嗽出现的时间，并调整饮水、通风和休息。症状后来减轻，说明这些做法值得继续观察，但因为时间短、因素多，不能据此认定某一个习惯就是治疗原因。",
        modelVi:
          "Người bệnh ghi thời điểm ho và điều chỉnh uống nước, thông gió, nghỉ ngơi. Triệu chứng sau đó giảm, cho thấy các cách này đáng theo dõi tiếp; nhưng thời gian ngắn và nhiều yếu tố nên chưa thể xác định một thói quen là nguyên nhân điều trị.",
        preservedFactsVi: [
          "Có ghi triệu chứng theo thời gian.",
          "Nhiều thói quen thay đổi cùng giai đoạn.",
          "Triệu chứng giảm trong quan sát ngắn.",
        ],
        prohibitedExpansionVi:
          "Không biến ghi nhận tự thân thành chẩn đoán y khoa hoặc kết quả chữa khỏi.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai nguồn theo khung nguyên nhân–điều kiện–kết quả, nêu ít nhất một giải thích thay thế.",
      requiredElementsVi: [
        "lý do đổi phí",
        "điều kiện khác ngoài giá",
        "các thay đổi thói quen sức khỏe",
        "giải thích thay thế và giới hạn",
      ],
      evidenceRefs: [
        ref(SOURCE.holidayFeeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.coughListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "景区在假期因客流、成本和服务压力改变收费，之后管理者观察到客流与服务情况变化。不过，天气和活动安排也在变化，因此价格不是唯一解释。咳嗽材料中，患者记录症状并同时调整饮水、通风和休息，后来咳嗽减轻。这一结果支持继续观察这些习惯，却不能确定是哪一个因素起作用。两份材料都说明，时间顺序可以提出原因假设，但只有把背景条件、其他变化和观察范围列出来，才不会把“先后发生”写成“已经证明”。",
      modelVi:
        "Điểm du lịch đổi phí do áp lực lượng khách, chi phí và dịch vụ; sau đó quan sát biến động, nhưng thời tiết và lịch hoạt động cũng đổi nên giá không phải giải thích duy nhất. Trong tư liệu ho, người bệnh ghi triệu chứng và đồng thời đổi uống nước, thông gió, nghỉ ngơi; cơn ho giảm nhưng chưa rõ yếu tố nào tác động. Cả hai cho thấy thứ tự thời gian chỉ tạo giả thuyết nguyên nhân, phải nêu điều kiện nền và phạm vi.",
      prohibitedExpansionVi:
        "Không dùng “sau khi” như bằng chứng đủ cho “do”, và không đưa ra kết luận y khoa hoặc kinh tế toàn diện.",
    },
    argument: {
      promptVi:
        "Lập luận về nhận định: khi kết quả cải thiện sau một thay đổi, ta có thể xem thay đổi đó là nguyên nhân chính.",
      requiredElementsVi: [
        "nêu mức đồng ý có điều kiện",
        "phân tích nguồn đổi phí",
        "phân tích nguồn sức khỏe",
        "phản biện nhu cầu ra quyết định nhanh",
        "kết luận nêu dữ liệu còn thiếu",
      ],
      evidenceRefs: [
        ref(SOURCE.holidayFeeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.coughListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "结果在改变之后出现，可以支持一个原因假设，却不足以把该改变确定为主要原因。景区调整收费后，客流和服务情况发生变化，但同一时期还有天气、节日活动和交通条件；如果不比较这些因素，就无法知道价格贡献多大。咳嗽材料更清楚：患者同时增加饮水、改善通风并调整休息，症状减轻不能只归给其中一项。有人认为管理和健康决定不能等待完整研究，因此应先按最明显的变化行动。我同意可以采取风险较低的临时措施，但必须把它标成试行，继续记录其他因素，并预先规定何时复查。依据两份短期材料，我们最多能说某些改变与结果同时出现、值得后续验证，不能宣布已经找到主要原因，更不能推广到所有景区或患者。",
      modelVi:
        "Kết quả xuất hiện sau thay đổi có thể ủng hộ giả thuyết nguyên nhân, nhưng chưa đủ xác định nguyên nhân chính. Ở điểm du lịch, thời tiết, sự kiện và giao thông cùng đổi; ở trường hợp ho, nhiều thói quen được điều chỉnh đồng thời. Phản biện rằng quyết định không thể chờ nghiên cứu đầy đủ là hợp lý: có thể thử biện pháp rủi ro thấp, nhưng phải ghi là thử nghiệm, theo dõi yếu tố khác và đặt thời điểm đánh giá lại. Hai nguồn chỉ cho phép nói có mối liên hệ đáng kiểm tra, không tuyên bố đã tìm ra nguyên nhân chính.",
      counterargumentVi:
        "Trong thực tế phải quyết định nhanh; thay đổi xảy ra ngay trước cải thiện thường là căn cứ hành động tốt nhất.",
      conclusionBoundaryVi:
        "Chỉ kết luận mức giả thuyết và nhu cầu theo dõi; không tuyên bố quan hệ nhân quả đã được xác lập.",
    },
    spoken: {
      promptVi:
        "Trình bày một quy trình bốn bước để kiểm tra claim nhân quả từ hai trường hợp nguồn.",
      requiredMovesVi: [
        "xác định thay đổi và kết quả",
        "liệt kê điều kiện nền",
        "nêu ít nhất một giải thích thay thế",
        "đề xuất dữ liệu cần theo dõi tiếp",
      ],
      evidenceRefs: [
        ref(SOURCE.holidayFeeReading, "rp1", "rp2"),
        ref(SOURCE.coughListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先写清楚什么先改变、什么结果后来出现。",
        "再列出天气、活动、通风和休息等同时变化的条件。",
        "分别提出价格之外和单一习惯之外的解释。",
        "把当前结论标成假设，而不是已经证明的原因。",
        "继续记录对照数据，并规定复查时间。",
      ],
      modelOutlineVi: [
        "Trước hết ghi rõ điều gì đổi trước và kết quả nào xuất hiện sau.",
        "Liệt kê các điều kiện cùng đổi như thời tiết, hoạt động, thông gió, nghỉ.",
        "Đưa ra giải thích ngoài giá và ngoài một thói quen đơn lẻ.",
        "Gắn nhãn kết luận hiện tại là giả thuyết, không phải nguyên nhân đã chứng minh.",
        "Tiếp tục ghi dữ liệu đối chiếu và định thời điểm đánh giá lại.",
      ],
    },
  },

  "hsk4-precision-reference-quantity-lesson-04": {
    sourceTextIds: [SOURCE.temperatureReading, SOURCE.travelInfoListening],
    grammarApplications: {
      [G(22)]: grammar(
        "Dùng 等、者、之、就是 để gom ví dụ, gọi nhóm người hoặc nhấn đúng đối tượng; danh sách ví dụ không được hiểu là đầy đủ.",
        "步行者、骑车者等人的选择不同，关键就是各地条件之差。",
        "Lựa chọn của người đi bộ, đi xe đạp và các nhóm khác không giống nhau; then chốt chính là khác biệt điều kiện từng nơi.",
        "“等” báo danh sách mở; không được nói chỉ tồn tại các nhóm đã liệt kê.",
      ),
      [G(23)]: grammar(
        "Dùng thán từ để giữ tín hiệu hội thoại nhưng không biến cảm xúc thành bằng chứng.",
        "“嗯，这次信息更清楚了。”这句话表示态度，不等于证明所有旅客都满意。",
        "“Ừm, lần này thông tin rõ hơn.” Câu này biểu thị thái độ, không chứng minh mọi hành khách hài lòng.",
        "Thán từ cho biết phản ứng của người nói; không đại diện cho đánh giá của tập thể.",
      ),
      [G(24)]: grammar(
        "Dùng cấu trúc số từ + tính từ + lượng từ để mô tả định lượng có thuộc tính rõ.",
        "调查比较了两条较短的路线和三项不同的信息服务。",
        "Khảo sát so sánh hai tuyến ngắn hơn và ba dịch vụ thông tin khác nhau.",
        "Số lượng, thuộc tính và đơn vị phải có căn cứ; không thêm con số để làm câu có vẻ chính xác.",
      ),
      [G(25)]: grammar(
        "Dùng khuôn 一A一B để mô tả phân bố lặp hoặc tương ứng, không phóng đại thành tuyệt đối.",
        "游客一组一组地看通知，再一站一站地确认路线。",
        "Du khách xem thông báo từng nhóm một, rồi xác nhận tuyến từng ga một.",
        "Cấu trúc nhấn tiến trình lặp; không tự cho biết tất cả đối tượng đều làm giống nhau.",
      ),
      [G(26)]: grammar(
        "Dùng 无A无B để tóm một trạng thái thiếu hai đặc trưng, nhưng phải nêu đúng phạm vi.",
        "旧通知无图无编号，对第一次来的旅客不够方便。",
        "Thông báo cũ không có hình cũng không có số, chưa đủ tiện cho khách đến lần đầu.",
        "Không chuyển mô tả một loại thông báo thành phán xét toàn bộ hệ thống thông tin.",
      ),
      [G(27)]: grammar(
        "Dùng 有A有B để nêu hai đặc trưng cùng tồn tại và tránh lựa chọn giả giữa chúng.",
        "新的出行方案有文字有图示，但效果还要按不同人群比较。",
        "Phương án đi lại mới vừa có chữ vừa có hình, nhưng hiệu quả còn phải so sánh theo nhóm người.",
        "Hai đặc trưng tồn tại không bảo đảm khả năng tiếp cận hoặc hiệu quả thực tế.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "相同气温下，不同人根据身体、时间和场地选择了不同运动。",
        claimVi:
          "Trong cùng nhiệt độ, các nhóm chọn vận động khác nhau theo thể trạng, thời gian và địa điểm.",
        classification: "fact",
        sourceRef: ref(SOURCE.temperatureReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn trực tiếp đối chiếu nhóm, điều kiện và lựa chọn.",
        inferenceBoundaryVi:
          "Có thể nói lựa chọn khác trong mẫu, chưa thể quy tắc cho mọi người ở cùng nhiệt độ.",
      },
      {
        claimHanzi: "第二次旅行信息更多，所以所有人的体验一定更好。",
        claimVi:
          "Chuyến đi thứ hai có nhiều thông tin hơn nên trải nghiệm của tất cả mọi người chắc chắn tốt hơn.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.travelInfoListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn so sánh cách cung cấp thông tin và phản ứng; từ “tất cả” và “chắc chắn” vượt dữ kiện.",
        inferenceBoundaryVi:
          "Chỉ được nêu những nhóm hoặc trở ngại thực sự được mô tả trong hai chuyến.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.temperatureReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Paraphrase so sánh lựa chọn vận động, giữ chuẩn so sánh và ngoại lệ.",
        modelHanzi:
          "气温相同时，参加者仍因身体状况、可用时间和场地不同而选择不同运动。材料说明温度只是一个条件，不能单独预测每个人的活动，也没有比较长期健康结果。",
        modelVi:
          "Khi nhiệt độ giống nhau, người tham gia vẫn chọn vận động khác do thể trạng, thời gian sẵn có và địa điểm. Nguồn cho thấy nhiệt độ chỉ là một điều kiện, không thể tự dự đoán hoạt động của từng người và cũng chưa so kết quả sức khỏe dài hạn.",
        preservedFactsVi: [
          "Nhiệt độ là điều kiện chung được giữ để so sánh.",
          "Ít nhất ba điều kiện cá nhân/bối cảnh khác nhau.",
          "Lựa chọn quan sát được khác nhau.",
        ],
        prohibitedExpansionVi:
          "Không xếp một lựa chọn là khỏe hơn nếu nguồn không đo sức khỏe.",
      },
      {
        sourceRef: ref(SOURCE.travelInfoListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Viết lại khác biệt thông tin giữa hai chuyến đi và nhóm được hưởng lợi.",
        modelHanzi:
          "第二次旅行增加了图示、编号和确认步骤，使第一次到访者更容易找到路线。不过，材料没有说明所有障碍都消失，也没有调查每一位旅客的满意度。",
        modelVi:
          "Chuyến thứ hai thêm hình, số hiệu và bước xác nhận, giúp người đến lần đầu dễ tìm tuyến hơn. Tuy nhiên, nguồn không nói mọi trở ngại đã biến mất và cũng không khảo sát mức hài lòng của từng hành khách.",
        preservedFactsVi: [
          "Hai chuyến có cách cung cấp thông tin khác nhau.",
          "Người đến lần đầu là một nhóm được nhắc.",
        ],
        prohibitedExpansionVi:
          "Không suy ra toàn bộ hành khách hài lòng hoặc mọi nhu cầu tiếp cận đã được giải quyết.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai phép so sánh, chỉ rõ biến được giữ, biến thay đổi, nhóm đối tượng và ngoại lệ.",
      requiredElementsVi: [
        "nhiệt độ giống nhau",
        "điều kiện cá nhân khác nhau",
        "cách cung cấp thông tin khác nhau",
        "nhóm và giới hạn chưa được đo",
      ],
      evidenceRefs: [
        ref(SOURCE.temperatureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.travelInfoListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "运动材料在相同气温下比较不同人的选择。结果显示，身体状况、时间和场地仍会影响活动，因此温度不能单独解释差异。旅行材料比较两次信息服务：第二次增加图示、编号和确认步骤，第一次到访者更容易找到路线。两份材料都提醒，比较必须说明哪些条件相同、哪些条件变化以及结果适用于谁。它们没有测量长期健康，也没有调查每位旅客的满意度，所以“更适合”只能针对已观察到的任务和群体。",
      modelVi:
        "Tư liệu vận động giữ nhiệt độ như nhau nhưng lựa chọn vẫn khác do thể trạng, thời gian và địa điểm. Tư liệu chuyến đi so hai cách thông tin; chuyến sau thêm hình, số hiệu và xác nhận, giúp người đến lần đầu tìm đường dễ hơn. Cả hai nhắc phải nói rõ biến giữ, biến đổi và nhóm áp dụng. Chúng không đo sức khỏe dài hạn hay sự hài lòng của mọi hành khách, nên “phù hợp hơn” chỉ có nghĩa trong nhiệm vụ đã quan sát.",
      prohibitedExpansionVi:
        "Không dùng so sánh có điều kiện để tạo xếp hạng chung cho sức khỏe hoặc chất lượng dịch vụ.",
    },
    argument: {
      promptVi:
        "Lập luận: một phương án phục vụ có nên được coi là tốt hơn nếu nó giúp nhóm gặp khó khăn nhất, dù chưa chắc tốt hơn cho mọi người?",
      requiredElementsVi: [
        "xác định nhóm gặp khó khăn",
        "bằng chứng từ nguồn vận động",
        "bằng chứng từ nguồn thông tin chuyến đi",
        "phản biện về tiêu chuẩn chung cho số đông",
        "kết luận có điều kiện và dữ liệu cần thêm",
      ],
      evidenceRefs: [
        ref(SOURCE.temperatureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.travelInfoListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "如果一种服务减少了困难群体的障碍，我认为可以把它评价为“在公平方面更好”，但不能直接说它在所有方面都最好。运动材料说明，即使气温相同，不同身体条件、时间和场地也会带来不同选择；只按多数人的活动设计，会忽略需要较温和方案的人。第二次旅行增加图示、编号和确认步骤，第一次到访者因此更容易找路，这是针对具体障碍的改进。反对者可能说，公共服务应采用对大多数人最快、成本最低的统一办法，否则系统太复杂。这个担心需要预算数据回应，但文字与图示并存并不一定妨碍熟悉路线的人。较稳妥的结论是：先确认弱势群体的任务是否改善，再同时检查时间、成本和其他使用者体验。现有材料没有完整成本和满意度数据，所以只能评价可达性，不能宣布总体最优。",
      modelVi:
        "Nếu một dịch vụ giảm rõ trở ngại cho nhóm khó khăn, có thể đánh giá nó tốt hơn về công bằng, nhưng không phải tốt nhất ở mọi mặt. Nguồn vận động cho thấy cùng nhiệt độ mà lựa chọn khác do thể trạng, thời gian, địa điểm; thiết kế theo số đông sẽ bỏ sót người cần phương án nhẹ. Chuyến đi thứ hai thêm hình, số hiệu, xác nhận và giúp người mới. Phản biện về chi phí và sự phức tạp cần dữ liệu ngân sách; nhiều hình thức thông tin chưa chắc làm khó người quen. Nên đo nhiệm vụ của nhóm khó trước, đồng thời kiểm thời gian, chi phí và trải nghiệm khác. Hiện chỉ đủ đánh giá khả năng tiếp cận.",
      counterargumentVi:
        "Dịch vụ công nên tối ưu cho đa số và một quy trình thống nhất; thêm phương án cho từng nhóm sẽ tốn kém, phức tạp.",
      conclusionBoundaryVi:
        "Chỉ đánh giá cải thiện khả năng tiếp cận trong hai tình huống; chưa có dữ liệu chi phí hoặc hài lòng toàn diện.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một tiêu chí so sánh dịch vụ công bằng, dùng hai nguồn và trả lời phản biện về chi phí.",
      requiredMovesVi: [
        "định nghĩa “tốt hơn về công bằng”",
        "nêu nhóm và trở ngại",
        "dẫn một thay đổi cụ thể",
        "nêu dữ liệu chi phí còn thiếu",
      ],
      evidenceRefs: [
        ref(SOURCE.temperatureReading, "rp1", "rp2"),
        ref(SOURCE.travelInfoListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "公平比较要看困难群体能否完成同一任务。",
        "相同气温下，不同身体条件需要不同运动选择。",
        "图示、编号和确认帮助第一次到访者找到路线。",
        "统一办法可能便宜，但不能先假定附加信息一定更贵。",
        "还要测量成本、时间和其他使用者体验。",
      ],
      modelOutlineVi: [
        "So sánh công bằng xem nhóm khó có hoàn thành cùng nhiệm vụ hay không.",
        "Cùng nhiệt độ nhưng thể trạng khác cần lựa chọn vận động khác.",
        "Hình, số hiệu và xác nhận giúp người lần đầu tìm tuyến.",
        "Cách thống nhất có thể rẻ nhưng chưa thể giả định thông tin bổ sung luôn đắt.",
        "Cần đo thêm chi phí, thời gian và trải nghiệm của nhóm khác.",
      ],
    },
  },

  "hsk4-precision-reference-quantity-lesson-05": {
    sourceTextIds: [SOURCE.publicRoomReading, SOURCE.barberListening],
    grammarApplications: {
      [G(28)]: grammar(
        "Dùng 来得及/来不及 để nêu khả năng hoàn thành trong giới hạn thời gian cụ thể.",
        "管理者来得及补做晚间记录，却来不及用一周数据判断全年需求。",
        "Người quản lý kịp bổ sung ghi chép buổi tối, nhưng không kịp dùng dữ liệu một tuần để phán đoán nhu cầu cả năm.",
        "Khả năng thời gian phải gắn với nhiệm vụ và hạn; không dùng nó để đánh giá chất lượng bằng chứng.",
      ),
      [G(29)]: grammar(
        "Dùng 有的是 để nhấn số lượng nhiều trong một phạm vi, không thay cho con số đo được.",
        "理发店下午有的是空位，但记录只来自几个工作日。",
        "Tiệm cắt tóc buổi chiều có nhiều chỗ trống, nhưng bản ghi chỉ đến từ vài ngày làm việc.",
        "Cách nói định tính không cho phép suy ra tổng lượng hoặc xu hướng dài hạn.",
      ),
      [G(30)]: grammar(
        "Dùng 说不定 để nêu giả thuyết cạnh tranh với kết luận hiện tại.",
        "午后客人少，说不定与天气或预约方式有关，不一定是服务质量下降。",
        "Khách buổi chiều ít có thể liên quan thời tiết hoặc cách đặt lịch, chưa chắc do chất lượng dịch vụ giảm.",
        "Giả thuyết phải được đánh dấu là chưa kiểm chứng và không được trình bày như dữ kiện.",
      ),
      [G(31)]: grammar(
        "Dùng 不怎么 để mô tả mức thấp có giới hạn, tránh biến thành hoàn toàn không có.",
        "公共房间工作日白天不怎么拥挤，并不等于从来没人使用。",
        "Phòng chung ngày thường ban ngày không đông lắm, không có nghĩa là chưa từng có ai sử dụng.",
        "“不怎么” là mức độ thấp, không phải phủ định tuyệt đối.",
      ),
      [G(33)]: grammar(
        "Dùng 一+量词+比+一+量词 để mô tả xu hướng từng đơn vị, phải nói rõ đơn vị và giai đoạn.",
        "晚间记录显示，活动一周比一周多，但观察期只有一个月。",
        "Ghi nhận buổi tối cho thấy hoạt động tuần sau nhiều hơn tuần trước, nhưng thời gian quan sát chỉ một tháng.",
        "Xu hướng ngắn không được kéo dài sang cả năm nếu chưa có dữ liệu.",
      ),
      [G(34)]: grammar(
        "Dùng 在……方面 để giới hạn chiều đánh giá của một claim.",
        "新预约办法在减少等待方面有帮助，在提高理发质量方面还没有证据。",
        "Cách đặt lịch mới có ích về giảm chờ, nhưng chưa có bằng chứng về nâng chất lượng cắt tóc.",
        "Phải giữ từng chiều kết quả tách biệt; cải thiện một chiều không đại diện cho hiệu quả toàn diện.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "公共房间在不同时间段的使用情况并不相同。",
        claimVi:
          "Tình hình sử dụng phòng chung không giống nhau giữa các khung giờ.",
        classification: "fact",
        sourceRef: ref(SOURCE.publicRoomReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn trực tiếp đối chiếu bản ghi theo thời gian và loại hoạt động.",
        inferenceBoundaryVi:
          "Có thể nói mẫu thời gian khác nhau, chưa đủ kết luận tổng nhu cầu cả năm.",
      },
      {
        claimHanzi: "理发店下午客人少一定说明服务质量不好。",
        claimVi:
          "Tiệm cắt tóc ít khách buổi chiều chắc chắn cho thấy chất lượng dịch vụ kém.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.barberListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Số khách theo giờ là tín hiệu; nguồn còn nêu các giải thích như lịch hẹn và thời tiết.",
        inferenceBoundaryVi:
          "Chỉ có thể nói khung giờ này ít khách trong dữ liệu, không suy ra nguyên nhân chất lượng.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.publicRoomReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại kết luận về mức sử dụng phòng, phân biệt dữ liệu khung giờ và claim “chưa được tận dụng”.",
        modelHanzi:
          "白天记录看起来使用较少，但补充晚间和周末活动后，公共房间的使用图景发生变化。因此，“利用不足”只可能描述某些时段，不能概括整个房间。",
        modelVi:
          "Ghi nhận ban ngày cho thấy sử dụng ít hơn, nhưng khi bổ sung hoạt động buổi tối và cuối tuần, bức tranh thay đổi. Vì vậy “chưa tận dụng” chỉ có thể mô tả một số khung giờ, không khái quát toàn bộ căn phòng.",
        preservedFactsVi: [
          "Bản ghi ban đầu thiếu một số khung giờ.",
          "Dữ liệu bổ sung làm đổi cách hiểu.",
          "Claim phải giới hạn theo thời gian.",
        ],
        prohibitedExpansionVi:
          "Không suy ra việc mở thêm giờ chắc chắn làm tăng lợi ích cộng đồng.",
      },
      {
        sourceRef: ref(SOURCE.barberListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase “tín hiệu buổi chiều” thành một giả thuyết kiểm tra được.",
        modelHanzi:
          "记录显示理发店下午顾客较少，这可以作为调整预约或调查需求的信号。它还不能说明原因，更不能直接评价服务质量，因为天气、工作时间和预约习惯都可能影响人数。",
        modelVi:
          "Bản ghi cho thấy tiệm ít khách hơn vào buổi chiều; đây có thể là tín hiệu để điều chỉnh lịch hoặc khảo sát nhu cầu. Nó chưa nói nguyên nhân và không thể trực tiếp đánh giá chất lượng, vì thời tiết, giờ làm và thói quen đặt lịch đều có thể ảnh hưởng.",
        preservedFactsVi: [
          "Có khác biệt số khách theo thời điểm.",
          "Tín hiệu có thể dẫn tới khảo sát hoặc thử điều chỉnh.",
        ],
        prohibitedExpansionVi:
          "Không gán nguyên nhân duy nhất hoặc tuyên bố doanh thu, chất lượng khi nguồn không đo.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai nguồn sửa một kết luận quá rộng bằng cách bổ sung phạm vi thời gian và giải thích thay thế.",
      requiredElementsVi: [
        "thiếu dữ liệu buổi tối/cuối tuần",
        "claim sử dụng chưa đủ",
        "tín hiệu ít khách buổi chiều",
        "các giải thích thay thế",
      ],
      evidenceRefs: [
        ref(SOURCE.publicRoomReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.barberListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "关于公共房间，最初的白天记录使人觉得利用不足；加入晚间、周末和不同活动后，只能说某些时段较空，不能评价整体使用。理发店也出现下午顾客少的信号，但人数可能受天气、工作时间和预约习惯影响，不能直接解释为服务差。两份材料都从一个显眼数字开始，再补充时间范围和其他原因，使结论变窄。合理做法是先说明数据覆盖哪些时段、测量什么，再把未验证的原因写成假设，而不是事实。",
      modelVi:
        "Với phòng chung, ghi nhận ban ngày ban đầu tạo cảm giác chưa tận dụng; sau khi thêm buổi tối, cuối tuần và loại hoạt động, chỉ có thể nói một số khung giờ trống. Tiệm cắt tóc cũng có tín hiệu ít khách buổi chiều, nhưng thời tiết, giờ làm và đặt lịch có thể tác động. Cả hai bắt đầu từ con số nổi bật rồi thu hẹp kết luận bằng phạm vi thời gian và giải thích khác. Phải nói dữ liệu phủ gì và gắn nhãn nguyên nhân chưa kiểm chứng là giả thuyết.",
      prohibitedExpansionVi:
        "Không đổi chỉ báo sử dụng thành kết luận về chất lượng, lợi ích hay hiệu quả tài chính.",
    },
    argument: {
      promptVi:
        "Lập luận: dữ liệu sử dụng thấp có đủ để đóng hoặc cắt giảm một dịch vụ không?",
      requiredElementsVi: [
        "phân biệt chỉ báo và quyết định",
        "bằng chứng phạm vi thời gian từ phòng chung",
        "giải thích thay thế từ tiệm cắt tóc",
        "phản biện về chi phí duy trì dịch vụ ít dùng",
        "đề xuất ngưỡng và thời gian thử",
      ],
      evidenceRefs: [
        ref(SOURCE.publicRoomReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.barberListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "数据使用率低可以启动审查，但不足以直接决定关闭服务。公共房间的白天记录曾让管理者认为利用不足，补入晚间和周末活动后，结论只能限定在某些时段。理发店下午顾客少也可能与天气、工作时间或预约方式有关，不能自动解释为服务质量差。支持关闭的人会指出，长期维护空闲空间或人员会增加成本，这个问题确实需要认真计算。然而，在决定前应先检查记录是否覆盖目标人群和关键时段，再试行调整开放时间、预约方式或信息发布，并规定成本与使用变化的复查期限。只有在完整周期内，低使用持续存在且替代服务可达时，削减才较有根据。现有两个案例没有全年成本和替代方案数据，所以只能支持进一步调查，不能支持立即关闭。",
      modelVi:
        "Mức sử dụng thấp có thể khởi động rà soát nhưng chưa đủ để đóng dịch vụ. Phòng chung từng bị đánh giá từ dữ liệu ban ngày; thêm tối và cuối tuần làm kết luận hẹp lại. Tiệm ít khách chiều cũng có thể do thời tiết, giờ làm hoặc lịch hẹn. Phản biện về chi phí duy trì là thật, nhưng trước quyết định cần kiểm độ phủ dữ liệu, thử đổi giờ/lịch/thông tin và đặt thời hạn xem lại. Chỉ khi mức thấp kéo dài trong chu kỳ đầy đủ và có dịch vụ thay thế dễ tiếp cận mới có căn cứ cắt giảm. Hai nguồn chưa có dữ liệu đó.",
      counterargumentVi:
        "Duy trì dịch vụ ít người dùng lãng phí nguồn lực; quyết định nhanh giúp chuyển ngân sách sang nơi có nhu cầu cao hơn.",
      conclusionBoundaryVi:
        "Chỉ đề xuất điều kiện ra quyết định; hai nguồn không có đủ chi phí năm, nhu cầu ẩn hoặc khả năng tiếp cận dịch vụ thay thế.",
    },
    spoken: {
      promptVi:
        "Trình bày trước hội đồng một checklist trước khi cắt giảm dịch vụ dựa trên dữ liệu sử dụng.",
      requiredMovesVi: [
        "kiểm tra độ phủ thời gian",
        "kiểm tra nhóm chưa được ghi",
        "thử giải thích thay thế",
        "đặt ngưỡng, thời hạn và phương án thay thế",
      ],
      evidenceRefs: [
        ref(SOURCE.publicRoomReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.barberListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先确认记录是否覆盖白天、晚间、周末和目标人群。",
        "再区分使用次数、服务质量、成本和公共价值。",
        "对天气、预约方式和信息不足等原因进行小规模测试。",
        "公布低使用的判断阈值和复查期限。",
        "只有替代服务可达时，才讨论削减或关闭。",
      ],
      modelOutlineVi: [
        "Trước hết xác nhận bản ghi phủ ban ngày, tối, cuối tuần và nhóm mục tiêu.",
        "Tách lượt dùng, chất lượng, chi phí và giá trị công.",
        "Thử quy mô nhỏ các nguyên nhân như thời tiết, lịch hẹn, thiếu thông tin.",
        "Công bố ngưỡng mức dùng thấp và thời hạn đánh giá lại.",
        "Chỉ bàn cắt/đóng khi dịch vụ thay thế có thể tiếp cận.",
      ],
    },
  },

  "hsk4-precision-reference-quantity-lesson-06": {
    sourceTextIds: [SOURCE.familyFutureReading, SOURCE.campusActivityListening],
    grammarApplications: {
      [G(35)]: grammar(
        "Dùng 够……的 để đánh giá mức đủ theo một tiêu chí đã nêu, không hiểu là hoàn hảo.",
        "这两份材料够我们讨论沟通方式的，但不够证明一种安排最正确。",
        "Hai tư liệu đủ để bàn cách giao tiếp, nhưng chưa đủ chứng minh một cách sắp xếp là đúng nhất.",
        "Phải nói rõ “đủ cho việc gì”; mức đủ cục bộ không chuyển thành bằng chứng toàn diện.",
      ),
      [G(51)]: grammar(
        "Dùng bổ ngữ mức độ 死了/厉害 để tái hiện cảm xúc mạnh trong lời nói, không dùng làm thước đo khách quan.",
        "女儿听到父亲替她决定时急死了，但这种表达只说明当时情绪很强。",
        "Người con gái lo cuống lên khi nghe cha quyết thay, nhưng cách nói này chỉ cho biết cảm xúc lúc đó rất mạnh.",
        "Cường độ cảm xúc của người nói không chứng minh phương án đúng hay sai.",
      ),
      [G(52)]: grammar(
        "Dùng động từ + 得/不+了 để nói khả năng hoàn thành, phải gắn đúng điều kiện.",
        "如果通知太晚，学生准备不了全部活动；提前说明后，他们就安排得了。",
        "Nếu thông báo quá muộn, học sinh không chuẩn bị hết hoạt động; báo sớm thì họ có thể sắp xếp được.",
        "Khả năng thay đổi theo điều kiện; không mô tả nó như năng lực cố định của người học.",
      ),
      [G(93)]: grammar(
        "Dùng số từ + 来 + lượng từ để biểu thị số xấp xỉ và giữ nguyên độ không chính xác.",
        "分享会来了二十来位学生，不能写成正好二十人。",
        "Buổi chia sẻ có khoảng hơn hai mươi học sinh; không được viết thành đúng hai mươi người.",
        "Số xấp xỉ không được làm tròn thành số chính xác trong tóm tắt.",
      ),
      [G(94)]: grammar(
        "Dùng 大约、左右、前后 để đánh dấu ước lượng về số lượng hoặc thời gian.",
        "讨论大约进行了四十分钟，活动结束前后还有学生提出问题。",
        "Thảo luận kéo dài khoảng bốn mươi phút; quanh thời điểm kết thúc vẫn có học sinh đặt câu hỏi.",
        "Không trộn các cách ước lượng thành độ chính xác giả hoặc đổi khoảng thành mốc chắc chắn.",
      ),
      [G(95)]: grammar(
        "Dùng số thập phân, phân số, phần trăm và bội số đúng loại đại lượng, kèm mẫu số hoặc chuẩn so sánh.",
        "问卷中三分之二的参加者支持继续活动，但这只占本次到场者的百分之六十左右。",
        "Trong phiếu, hai phần ba người trả lời ủng hộ tiếp tục, nhưng họ chỉ chiếm khoảng sáu mươi phần trăm người có mặt lần này.",
        "Tỷ lệ phải nêu mẫu số; không dùng phần trăm người trả lời để đại diện người không phản hồi hay toàn trường.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "父亲和女儿对未来安排有不同重点，并通过谈话修改了部分计划。",
        claimVi:
          "Người cha và con gái có trọng tâm khác nhau về kế hoạch tương lai và qua trò chuyện đã sửa một phần kế hoạch.",
        classification: "fact",
        sourceRef: ref(SOURCE.familyFutureReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn nêu trực tiếp hai góc nhìn, cuộc trao đổi và phần điều chỉnh.",
        inferenceBoundaryVi:
          "Có thể nói kế hoạch được thương lượng trong trường hợp này, không suy ra mọi bất đồng gia đình đều được giải quyết.",
      },
      {
        claimHanzi: "校园活动让所有学生永久提高了学习兴趣。",
        claimVi:
          "Hoạt động trường học khiến mọi học sinh tăng hứng thú học tập vĩnh viễn.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.campusActivityListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn kể quá trình tổ chức và phản hồi tại chỗ; không có mẫu toàn trường hay đo dài hạn.",
        inferenceBoundaryVi:
          "Chỉ được báo cáo số người/ý kiến trong hoạt động và thời điểm đã quan sát.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.familyFutureReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại bất đồng cha–con, giữ chính xác ai coi trọng điều gì và phần thống nhất.",
        modelHanzi:
          "父亲更重视稳定和准备，女儿希望保留自己选择的空间。谈话后，双方没有完全相同，却同意先收集学习与工作的实际信息，再决定下一步。",
        modelVi:
          "Người cha coi trọng ổn định và chuẩn bị; người con muốn giữ không gian tự chọn. Sau trò chuyện, hai bên chưa hoàn toàn giống nhau nhưng đồng ý trước hết thu thập thông tin thực tế về học và việc rồi mới quyết định bước sau.",
        preservedFactsVi: [
          "Hai bên có trọng tâm khác nhau.",
          "Có một bước thu thập thông tin trước quyết định.",
          "Sự thống nhất là một phần, không phải hoàn toàn.",
        ],
        prohibitedExpansionVi:
          "Không tuyên bố một bên thắng, quan hệ được giải quyết vĩnh viễn hoặc lựa chọn nghề đã chốt.",
      },
      {
        sourceRef: ref(SOURCE.campusActivityListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase tiến trình biến thông báo thành hoạt động đáng nhớ, giữ số xấp xỉ và phạm vi phản hồi.",
        modelHanzi:
          "学校先发布消息，学生随后分工准备并在活动中交流，结束后有一部分参加者给出积极反馈。材料说明组织过程受到欢迎，但没有长期跟踪，也不能代表未参加的学生。",
        modelVi:
          "Trường trước hết phát thông báo, sau đó học sinh phân công chuẩn bị và giao lưu trong hoạt động; cuối buổi một phần người tham gia phản hồi tích cực. Nguồn cho thấy quá trình được đón nhận, nhưng không theo dõi dài hạn và không đại diện học sinh vắng mặt.",
        preservedFactsVi: [
          "Có chuỗi thông báo–chuẩn bị–tham gia–phản hồi.",
          "Phản hồi chỉ đến từ một phần người tham gia.",
        ],
        prohibitedExpansionVi:
          "Không đổi số xấp xỉ thành số chính xác hoặc suy ra tác động bền vững toàn trường.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách giao tiếp và số liệu hỗ trợ quyết định trong gia đình và hoạt động trường, giữ các tỷ lệ/xấp xỉ đúng phạm vi.",
      requiredElementsVi: [
        "hai ưu tiên của cha và con",
        "bước thu thập thông tin",
        "quá trình tổ chức hoạt động",
        "phạm vi người phản hồi và thiếu theo dõi",
      ],
      evidenceRefs: [
        ref(SOURCE.familyFutureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.campusActivityListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "父亲谈未来时重视稳定和准备，女儿则希望保留选择空间。双方没有立即得到同一答案，而是同意先收集学习与工作的实际信息，再决定下一步。校园活动也经过消息发布、学生分工、现场交流和结束反馈几个阶段。约二十来位学生参加，积极意见只来自部分到场者。两份材料都把决定建立在沟通和后续信息上，而不是一次情绪或一个百分比。家庭计划尚未最终确定，校园反馈也没有覆盖未参加者或长期学习兴趣。",
      modelVi:
        "Khi bàn tương lai, cha coi trọng ổn định và chuẩn bị, con gái muốn giữ quyền lựa chọn. Hai bên chưa có đáp án chung ngay mà thống nhất thu thập thông tin học và việc. Hoạt động trường cũng đi qua thông báo, phân công, giao lưu và phản hồi; khoảng hơn hai mươi người tham gia và ý kiến tích cực chỉ từ một phần người có mặt. Cả hai dựa quyết định vào giao tiếp và thông tin tiếp theo, không vào cảm xúc hay một tỷ lệ. Kế hoạch gia đình chưa chốt và phản hồi trường chưa phủ người vắng hay tác động dài hạn.",
      prohibitedExpansionVi:
        "Không làm tròn số xấp xỉ, đổi mẫu số tỷ lệ hoặc nói đã có thay đổi lâu dài.",
    },
    argument: {
      promptVi:
        "Lập luận: trong quyết định giáo dục và gia đình, số liệu phản hồi có nên quan trọng hơn đối thoại trực tiếp?",
      requiredElementsVi: [
        "luận điểm về hai loại bằng chứng",
        "đối thoại cha–con",
        "số lượng/tỷ lệ phản hồi hoạt động",
        "phản biện về tính khách quan của số liệu",
        "giới hạn mẫu số và thời gian",
      ],
      evidenceRefs: [
        ref(SOURCE.familyFutureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.campusActivityListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "在家庭和教育决定中，反馈数据能扩大视野，但不应取代直接对话。父亲重视稳定，女儿希望自己选择；如果只发问卷，两种理由可能被压成简单的“同意或不同意”。他们通过谈话才发现，可以先收集学习和工作信息，再推迟最终决定。校园活动的参加人数和积极反馈也有价值。然而，二十来位到场者不是全校，回答问卷的人更只是其中一部分，百分比如果没有清楚的分母就会显得比实际更确定。有人认为数字更客观，能够避免家庭或教师凭感觉决定。我同意数据应限制个人偏见，但数据问题由人设计，缺席者也可能没有被记录。较好的办法是用数据发现模式，再通过对话解释原因，并公开样本、时间和未回答者。两份材料没有长期结果，因此不能用一次反馈替任何人决定未来。",
      modelVi:
        "Trong quyết định gia đình và giáo dục, dữ liệu phản hồi mở rộng góc nhìn nhưng không nên thay đối thoại. Cha coi trọng ổn định, con muốn tự chọn; phiếu hỏi dễ ép lý do thành đồng ý/không đồng ý, còn trò chuyện giúp họ tìm bước thu thập thông tin rồi hoãn quyết định cuối. Số người và phản hồi hoạt động trường cũng hữu ích, nhưng hơn hai mươi người không phải toàn trường, người trả lời còn là một phần nhỏ hơn. Số liệu có thể hạn chế thiên kiến cá nhân, song câu hỏi do con người thiết kế và người vắng không được ghi. Nên dùng dữ liệu tìm mẫu, đối thoại giải thích nguyên nhân, công bố mẫu và thời gian. Một lần phản hồi không quyết định tương lai.",
      counterargumentVi:
        "Số liệu có vẻ khách quan, so sánh được và ít bị cảm xúc chi phối hơn đối thoại trực tiếp.",
      conclusionBoundaryVi:
        "Chỉ khuyến nghị kết hợp dữ liệu và đối thoại; hai nguồn không cho phép xếp hạng trọng số tối ưu hoặc kết luận dài hạn.",
    },
    spoken: {
      promptVi:
        "Bảo vệ quy tắc đọc một phần trăm phản hồi trước khi dùng nó cho quyết định gia đình hoặc giáo dục.",
      requiredMovesVi: [
        "nêu tử số và mẫu số",
        "xác định ai vắng hoặc không trả lời",
        "kết hợp ít nhất một câu hỏi đối thoại",
        "nêu giới hạn theo thời gian",
      ],
      evidenceRefs: [
        ref(SOURCE.familyFutureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.campusActivityListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先问百分比中的分子是谁、分母是谁。",
        "再说明未参加和未回答的人是否与回答者不同。",
        "数据只能显示模式，不能解释父女或学生的全部理由。",
        "用直接对话追问稳定、选择和活动体验。",
        "一次活动没有长期跟踪，不能替人决定未来。",
      ],
      modelOutlineVi: [
        "Trước hết hỏi tử số là ai và mẫu số là ai.",
        "Nêu người vắng hoặc không trả lời có khác nhóm trả lời hay không.",
        "Dữ liệu chỉ cho thấy mẫu, không giải thích hết lý do cha–con/học sinh.",
        "Dùng đối thoại hỏi thêm về ổn định, lựa chọn và trải nghiệm.",
        "Một hoạt động không theo dõi dài hạn nên không thể quyết định tương lai.",
      ],
    },
  },
};

export const buildHsk4PrecisionReferenceQuantitySummaryArgumentPack = (
  root = process.cwd(),
) => {
  const longFormHeadBundle =
    loadHsk4CultureHistoryLongFormPackBundle(root);
  assertValidHsk4CultureHistoryLongFormPackBundle(longFormHeadBundle);
  return buildHsk4SummaryArgumentModulePack({
    root,
    config: HSK4_PRECISION_REFERENCE_QUANTITY_CONFIG,
    content: CONTENT,
    longFormHeadBundle,
    prerequisitePackBundles: [longFormHeadBundle],
  });
};

export const writeHsk4PrecisionReferenceQuantitySummaryArgumentPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH,
  );
  const output = serializeHsk4SummaryArgumentModulePack(
    buildHsk4PrecisionReferenceQuantitySummaryArgumentPack(root),
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
        HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      output: serializeHsk4SummaryArgumentModulePack(
        buildHsk4PrecisionReferenceQuantitySummaryArgumentPack(root),
      ),
    }
    : writeHsk4PrecisionReferenceQuantitySummaryArgumentPack(root);
  if (check) {
    const existing = readFileSync(outputPath, "utf8");
    if (existing !== output) {
      throw new Error(
        "HSK4 precision/reference/quantity summary-argument draft is stale",
      );
    }
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_PRECISION_REFERENCE_QUANTITY_CONFIG.lessonIds.length
    } HSK4 precision/reference/quantity summary-argument lessons at ${
      outputPath
    }.`,
  );
}
