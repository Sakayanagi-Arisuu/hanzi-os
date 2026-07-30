import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4SummaryArgumentModulePack,
  serializeHsk4SummaryArgumentModulePack,
} from "./hsk4-summary-argument-module-builder.mjs";
import {
  HSK4_INFORMATION_ORDER_COHESION_CONFIG,
  HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH,
} from "../../src/content/hsk4InformationOrderCohesionSummaryArgumentPack.mjs";
import {
  assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle,
  loadHsk4EventAgencyVoiceSummaryArgumentPackBundle,
} from "../../src/content/hsk4EventAgencyVoiceSummaryArgumentPack.mjs";

const G = (ordinal) =>
  `hsk4-grammar-row-${String(ordinal).padStart(3, "0")}`;
const ref = (textId, ...paragraphIds) => ({ textId, paragraphIds });
const grammar = (functionVi, modelHanzi, modelVi, scopeBoundaryVi) => ({
  functionVi,
  modelHanzi,
  modelVi,
  scopeBoundaryVi,
});

const SOURCE = {
  publicDataReading:
    "hsk4-society-economy-argument-concept-actor-map:reading-01",
  mediaMarketListening:
    "hsk4-society-economy-argument-concept-actor-map:listening-01",
  artArchiveReading:
    "hsk4-arts-sports-exchange-critique-concept-actor-map:reading-01",
  crossoverShowListening:
    "hsk4-arts-sports-exchange-critique-concept-actor-map:listening-01",
  matchFailureReading:
    "hsk4-arts-sports-exchange-critique-cause-condition-result:reading-01",
  communitySportListening:
    "hsk4-arts-sports-exchange-critique-cause-condition-result:listening-01",
  volleyballExchangeReading:
    "hsk4-arts-sports-exchange-critique-viewpoint-synthesis:reading-01",
  artExchangeListening:
    "hsk4-arts-sports-exchange-critique-viewpoint-synthesis:listening-01",
  proverbReading:
    "hsk4-culture-history-interpretation-concept-actor-map:reading-01",
  mooncakeListening:
    "hsk4-culture-history-interpretation-concept-actor-map:listening-01",
};

const CONTENT = {
  "hsk4-information-order-cohesion-lesson-01": {
    sourceTextIds: [SOURCE.publicDataReading, SOURCE.mediaMarketListening],
    grammarApplications: {
      [G(19)]: grammar(
        "Dùng 并、而、与 để nối các chủ thể hoặc vế song song, đồng thời giữ rõ quan hệ bổ sung hay đối chiếu giữa chúng.",
        "政府与社区共同说明资料来源，而平台并不能替广播代表所有居民。",
        "Chính quyền và cộng đồng cùng giải thích nguồn dữ liệu, còn nền tảng không thể thay phát thanh để đại diện mọi cư dân.",
        "Các liên từ chỉ tổ chức quan hệ trong câu; chúng không chứng minh hai kênh có mức bao phủ hoặc quyền hạn ngang nhau.",
      ),
      [G(20)]: grammar(
        "Dùng 此外、不过、并且 cùng các liên từ cùng hàng để xếp thêm dữ kiện, chuyển hướng và nối hệ quả mà không trộn vai trò.",
        "网络便于更新，此外还能保存修改记录；不过广播仍覆盖老人，并且会口头确认价格。",
        "Internet thuận tiện cho cập nhật, ngoài ra còn lưu lịch sử sửa; tuy nhiên phát thanh vẫn phủ người cao tuổi và xác nhận giá bằng lời.",
        "“此外” thêm thông tin và “不过” giới hạn kết luận; không được biến thứ tự diễn đạt thành thứ tự quan trọng tuyệt đối.",
      ),
      [G(21)]: grammar(
        "Dùng 不仅、另外、由于、因此 và các dạng cùng hàng để nêu chuỗi bổ sung hoặc nguyên nhân–kết quả có ranh giới.",
        "由于偏远地区的信号资料不全，因此不仅要记录网络到达率，另外还要记录广播到达率。",
        "Vì dữ liệu tín hiệu vùng xa chưa đủ, nên không chỉ cần ghi tỷ lệ tiếp cận Internet mà còn phải ghi riêng tỷ lệ phát thanh.",
        "Quan hệ 由于…因此… chỉ dựa vào khoảng trống dữ liệu được nêu; không cho phép kết luận trước kênh nào hiệu quả hơn.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "新版公共资料分别标明来源、更新时间和负责人。",
        claimVi:
          "Bản dữ liệu công cộng mới ghi riêng nguồn, ngày cập nhật và người phụ trách.",
        classification: "fact",
        sourceRef: ref(SOURCE.publicDataReading, "rp3"),
        rationaleVi:
          "Đây là ba trường thông tin được nguồn đọc nêu trực tiếp, không phải đánh giá của người viết.",
        inferenceBoundaryVi:
          "Dữ kiện cho thấy tăng khả năng truy nguồn, nhưng không chứng minh mọi cộng đồng đã được phỏng vấn hoặc mô tả đầy đủ.",
      },
      {
        claimHanzi: "网上订单增加说明互联网已经取代广播。",
        claimVi:
          "Đơn trực tuyến tăng chứng minh Internet đã thay thế phát thanh.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.mediaMarketListening, "lp1", "lp3"),
        rationaleVi:
          "Nguồn còn nói lượng nghe phát thanh không giảm rõ và hai kênh phục vụ những nhóm khác nhau.",
        inferenceBoundaryVi:
          "Chỉ có thể nói kênh trực tuyến bổ sung lựa chọn trong ba tháng quan sát; chưa thể nói đã thay thế phát thanh.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(
          SOURCE.publicDataReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        promptVi:
          "Viết lại cách ba nhóm cùng xây dữ liệu công cộng, giữ đúng quyền hạn riêng và khoảng trống đại diện.",
        modelHanzi:
          "城市资料由政府、社会组织与民族社区共同补充：部门提供服务事实，组织检查无障碍信息，社区解释名称和节日。新版记录来源与负责人，提高了透明度；不过未受访的小社区仍未被完整代表。",
        modelVi:
          "Dữ liệu thành phố do cơ quan nhà nước, tổ chức xã hội và cộng đồng dân tộc cùng bổ sung: cơ quan cung cấp dữ kiện dịch vụ, tổ chức kiểm tiếp cận, cộng đồng giải thích tên và lễ. Bản mới ghi nguồn/người phụ trách nên minh bạch hơn, nhưng cộng đồng nhỏ chưa phỏng vấn vẫn chưa được đại diện đầy đủ.",
        preservedFactsVi: [
          "Ba nhóm có trách nhiệm khác nhau chứ không thay thế lẫn nhau.",
          "Bản mới có nguồn, ngày cập nhật và người phụ trách.",
          "Vẫn còn cộng đồng nhỏ chưa tham gia phỏng vấn.",
        ],
        prohibitedExpansionVi:
          "Không nói dữ liệu đã hoàn chỉnh, chính quyền kiểm soát diễn giải văn hóa hoặc cộng đồng được tự đổi thông tin giao thông.",
      },
      {
        sourceRef: ref(
          SOURCE.mediaMarketListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        promptVi:
          "Paraphrase quan hệ giữa phát thanh và Internet, giữ đúng nhóm người dùng, trách nhiệm sửa giá và thời gian quan sát.",
        modelHanzi:
          "市场先用广播发布价格和天气，后来增加图片与在线订单。网络受年轻商户欢迎，老人仍依靠广播；价格出错后，办公室管原始数据，平台留修改记录，广播员口头确认。三个月内订单增加，但收听没有明显下降。",
        modelVi:
          "Chợ vốn dùng phát thanh báo giá và thời tiết, sau thêm ảnh và đặt hàng trực tuyến. Người trẻ chuộng mạng, người già vẫn dựa phát thanh; sau lỗi giá, văn phòng giữ dữ liệu gốc, nền tảng lưu sửa, phát thanh viên xác nhận. Trong ba tháng đơn tăng nhưng nghe phát thanh không giảm rõ.",
        preservedFactsVi: [
          "Hai kênh phủ các nhóm người dùng khác nhau.",
          "Ba bên có trách nhiệm riêng khi sửa thông tin giá.",
          "Quan sát mới kéo dài ba tháng và dữ liệu làng xa còn thiếu.",
        ],
        prohibitedExpansionVi:
          "Không suy ra Internet phù hợp mọi người, phát thanh đang biến mất hoặc đơn trực tuyến tăng do duy nhất một nguyên nhân.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai hệ thống phân vai, tổ chức nguồn và giữ nhiều kênh thông tin; nêu rõ kết quả quan sát cùng giới hạn đại diện.",
      requiredElementsVi: [
        "ba vai trò trong dữ liệu thành phố",
        "nguồn và người phụ trách",
        "phát thanh so với Internet",
        "ba tháng quan sát và dữ liệu còn thiếu",
      ],
      evidenceRefs: [
        ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mediaMarketListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "城市公共资料由政府部门、社会组织与民族社区共同更新，三方分别提供服务事实、检查无障碍信息和解释文化背景。新版并且标出来源、日期与负责人，不过未受访社区仍需补充。山区市场则同时使用广播和互联网：办公室管理原始价格，平台保存修改，广播员口头确认。三个月内在线订单增加，而收听没有明显下降。两例都说明，多方与多渠道可以互补，但不能因此宣称资料完整或互联网适合所有人。",
      modelVi:
        "Dữ liệu công cộng do cơ quan nhà nước, tổ chức xã hội và cộng đồng dân tộc cùng cập nhật, lần lượt cung cấp dữ kiện dịch vụ, kiểm tiếp cận và giải thích văn hóa. Bản mới ghi nguồn/ngày/người phụ trách nhưng cộng đồng chưa phỏng vấn vẫn thiếu. Chợ miền núi dùng cả phát thanh và Internet; văn phòng giữ giá gốc, nền tảng lưu sửa, phát thanh viên xác nhận. Ba tháng cho thấy đơn mạng tăng mà nghe phát thanh không giảm rõ. Hai trường hợp cho thấy bổ sung đa bên/đa kênh, không chứng minh dữ liệu hoàn chỉnh hay mạng hợp mọi người.",
      prohibitedExpansionVi:
        "Không đổi kết quả ba tháng thành xu hướng dài hạn, không nói hai kênh hiệu quả bằng nhau và không xóa nhóm chưa được quan sát.",
    },
    argument: {
      promptVi:
        "Lập luận liệu thành phố nên chuyển toàn bộ thông tin công cộng sang Internet hay duy trì hệ thống đa kênh có phân rõ trách nhiệm.",
      requiredElementsVi: [
        "luận điểm về hệ thống đa kênh",
        "vai trò của cơ quan, tổ chức và cộng đồng",
        "khác biệt nhóm dùng phát thanh và Internet",
        "phản biện về tốc độ và khả năng lưu sửa của mạng",
        "giới hạn ba tháng, tín hiệu vùng xa và cộng đồng chưa phỏng vấn",
      ],
      evidenceRefs: [
        ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mediaMarketListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "城市不应马上把公共信息全部转到互联网，而应建立责任清楚的多渠道系统。公共资料既有地点时间，也有文化解释和无障碍信息，因此政府、社会组织与社区应分别负责。山区市场的网络订单增加，平台也能保存修改记录，支持继续发展网络。有人认为广播慢，集中到一个平台更方便。不过老人仍依靠广播，三个月内收听没有明显下降，偏远村庄的信号资料也不完整。价格写错时，办公室管原始数据，平台留修改记录，广播员口头确认，说明可靠性来自分工而不只来自技术。较好的办法是统一来源标准，保留网页、广播和服务台，并分别报告到达率。现有材料只涉及一座城和一个市场，不能确定长期成本，也不能证明同一安排适合所有地区。",
      modelVi:
        "Thành phố chưa nên chuyển toàn bộ thông tin lên Internet mà cần hệ đa kênh với trách nhiệm rõ. Dữ liệu công cộng gồm cả địa điểm/giờ, diễn giải văn hóa và tiếp cận, nên cơ quan, tổ chức, cộng đồng phải phụ trách phần khác nhau; một bên viết dễ bỏ tri thức của bên khác. Đơn mạng tăng và nền tảng lưu lịch sử sửa là lý do phát triển mạng. Phản biện cho rằng phát thanh chậm và một nền tảng tiện hơn. Tuy vậy người cao tuổi còn dựa phát thanh, ba tháng chưa thấy lượng nghe giảm, tín hiệu làng xa còn thiếu. Khi giá sai, văn phòng, nền tảng, phát thanh viên xử lý các lớp riêng, nên độ tin cậy đến từ phân vai chứ không chỉ công nghệ. Nên thống nhất chuẩn nguồn, giữ web–phát thanh–quầy và báo tỷ lệ tiếp cận riêng. Hai nguồn không cho biết chi phí dài hạn hay khả năng áp dụng mọi nơi.",
      counterargumentVi:
        "Một nền tảng Internet tập trung cập nhật nhanh, lưu lịch sử sửa và giảm chi phí duy trì nhiều kênh.",
      conclusionBoundaryVi:
        "Chỉ đề xuất đa kênh cho bối cảnh nguồn; chưa có dữ liệu chi phí, hiệu quả dài hạn hoặc độ phủ đủ để áp dụng cho mọi thành phố.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một quy tắc sắp xếp thông tin công cộng sao cho người nghe biết dữ kiện, diễn giải, kênh truyền và người chịu trách nhiệm.",
      requiredMovesVi: [
        "mở bằng một nguyên tắc phân nguồn",
        "dẫn một ví dụ về quyền hạn thành phố",
        "dẫn một ví dụ về hai kênh thị trường",
        "trả lời ý kiến nên dùng duy nhất Internet",
        "kết bằng giới hạn đại diện và thời gian",
      ],
      evidenceRefs: [
        ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mediaMarketListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先把服务事实、文化解释和传播渠道分别标明来源。",
        "政府、社会组织与社区共同参与，但不能越过各自责任。",
        "网络订单增加，而广播仍覆盖老人，两种渠道暂时互补。",
        "回应“只用互联网更快”：速度不能代替信号覆盖与口头确认。",
        "最后说明资料缺少偏远村庄和未受访社区，观察也只有三个月。",
      ],
      modelOutlineVi: [
        "Trước hết ghi riêng nguồn cho dữ kiện dịch vụ, diễn giải văn hóa và kênh truyền.",
        "Cơ quan, tổ chức xã hội và cộng đồng cùng tham gia nhưng không vượt quyền nhau.",
        "Đơn mạng tăng, phát thanh vẫn phủ người cao tuổi nên tạm thời bổ sung nhau.",
        "Trả lời ý kiến mạng nhanh hơn: tốc độ không thay độ phủ tín hiệu và xác nhận miệng.",
        "Kết bằng khoảng trống làng xa, cộng đồng chưa phỏng vấn và thời gian ba tháng.",
      ],
    },
  },

  "hsk4-information-order-cohesion-lesson-02": {
    sourceTextIds: [SOURCE.artArchiveReading, SOURCE.crossoverShowListening],
    grammarApplications: {
      [G(66)]: grammar(
        "Dùng 不是……而是…… để sửa tiêu chí phân loại hoặc quan hệ nguyên nhân mà không phủ nhận toàn bộ hiện tượng.",
        "档案分类依据不是作品的价值，而是作品的主要表达形式。",
        "Tiêu chí phân loại hồ sơ không phải giá trị tác phẩm mà là hình thức biểu đạt chính.",
        "Mẫu câu chỉ đối chiếu hai tiêu chí trong nguồn; không được hiểu rằng giá trị nghệ thuật hoàn toàn không quan trọng ở mọi mục đích.",
      ),
      [G(67)]: grammar(
        "Dùng 既……又/也…… để đặt hai thuộc tính cùng tồn tại, tránh buộc tác phẩm hoặc quyết định vào một nhãn duy nhất.",
        "跨界演出既需要导演安排节奏，也需要教练保证动作安全。",
        "Đêm diễn liên lĩnh vực vừa cần đạo diễn sắp nhịp, vừa cần huấn luyện viên bảo đảm an toàn.",
        "Hai trách nhiệm cùng tồn tại nhưng không đồng nghĩa quyền dừng tiết mục và quyền sửa nghệ thuật là một.",
      ),
      [G(68)]: grammar(
        "Dùng 一方面……另一方面…… để trình bày hai mặt của bằng chứng trước khi đưa ra đánh giá có điều kiện.",
        "一方面，视觉目录的使用增长；另一方面，展览入口正好放在视觉页。",
        "Một mặt, lượt dùng mục thị giác tăng; mặt khác, lối vào triển lãm lại đặt ngay trang thị giác.",
        "Cấu trúc cân bằng hai dữ kiện, không cho phép kết luận lượt dùng tăng hoàn toàn do vị trí lối vào hoặc do chất lượng tác phẩm.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "综合作品保留一个主要类别，同时增加两个交叉标签。",
        claimVi:
          "Tác phẩm tổng hợp giữ một loại chính và đồng thời thêm hai nhãn chéo.",
        classification: "fact",
        sourceRef: ref(SOURCE.artArchiveReading, "rp2"),
        rationaleVi:
          "Nguồn đọc mô tả trực tiếp phương án phân loại và số nhãn chéo sau tranh luận của ba người phụ trách.",
        inferenceBoundaryVi:
          "Phương án giúp tìm hồ sơ nhưng chưa chứng minh đây là cách phân loại tối ưu cho mọi loại tác phẩm.",
      },
      {
        claimHanzi: "晚会顺利完成证明跨界艺术适合所有社区成员。",
        claimVi:
          "Đêm diễn hoàn tất suôn sẻ chứng minh nghệ thuật liên lĩnh vực phù hợp mọi thành viên cộng đồng.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.crossoverShowListening, "lp2", "lp3"),
        rationaleVi:
          "Khảo sát chỉ gồm người có mặt, không có người vắng vì giá vé hoặc thời gian.",
        inferenceBoundaryVi:
          "Chỉ được kết luận bản đồ vai trò hỗ trợ quyết định tại đêm diễn này và đánh giá người có mặt tăng.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(
          SOURCE.artArchiveReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        promptVi:
          "Viết lại phương pháp phân loại hồ sơ nghệ thuật, giữ sự khác biệt giữa hình thức, giá trị và ảnh hưởng của vị trí giao diện.",
        modelHanzi:
          "社区按舞台、文字和视觉整理档案，综合作品先选主要形式，再加交叉标签并记录判断者。半年后查找变快，视觉目录增长最多；不过入口正好设在视觉页，所以数据不能说明图比文章或演唱更有价值。",
        modelVi:
          "Cộng đồng xếp hồ sơ theo sân khấu, chữ viết và thị giác; tác phẩm tổng hợp chọn hình thức chính rồi thêm nhãn chéo và ghi người quyết định. Sau nửa năm, tìm nhanh hơn và mục thị giác tăng nhiều nhất, nhưng lối vào đặt ngay trang thị giác nên dữ liệu không chứng minh hình giá trị hơn bài viết hay hát.",
        preservedFactsVi: [
          "Tiêu chí phân loại là hình thức biểu đạt chính.",
          "Tác phẩm tổng hợp có một loại chính và hai nhãn chéo.",
          "Vị trí lối vào có thể ảnh hưởng số lượt dùng mục thị giác.",
        ],
        prohibitedExpansionVi:
          "Không xếp hạng giá trị các hình thức, không nói nhãn chéo loại bỏ mọi tranh luận và không gán chắc nguyên nhân cho tăng lượt dùng.",
      },
      {
        sourceRef: ref(
          SOURCE.crossoverShowListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        promptVi:
          "Paraphrase cách đêm diễn phân quyền, giữ đúng thứ tự sự cố–quyết định–kết quả và giới hạn mẫu khảo sát.",
        modelHanzi:
          "晚会由导演安排顺序、教练负责安全、音响组处理技术。第二次彩排有人差点摔倒，教练先停动作，导演再改灯光和长度。正式演出顺利、到场者评价提高，但没有调查因票价或时间缺席的人。",
        modelVi:
          "Đạo diễn sắp thứ tự, huấn luyện viên giữ an toàn và nhóm âm thanh xử lý kỹ thuật. Buổi ráp thứ hai có người suýt ngã, huấn luyện viên dừng động tác trước rồi đạo diễn đổi ánh sáng/độ dài. Diễn chính suôn sẻ và người có mặt đánh giá cao hơn, nhưng người vắng vì giá hoặc thời gian không được hỏi.",
        preservedFactsVi: [
          "Ba nhóm có quyền quyết định khác nhau.",
          "Sự cố suýt ngã xảy ra ở buổi ráp thứ hai.",
          "Khảo sát cuối chỉ bao phủ người đến xem.",
        ],
        prohibitedExpansionVi:
          "Không nói huấn luyện viên điều hành toàn bộ nghệ thuật, đêm diễn không còn rủi ro hoặc đánh giá đại diện mọi cư dân.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai dự án nghệ thuật dùng phân loại và phân quyền để xử lý tác phẩm liên lĩnh vực, rồi nêu giới hạn của kết quả sử dụng và khảo sát.",
      requiredElementsVi: [
        "ba loại hồ sơ và nhãn chéo",
        "vai trò đạo diễn, huấn luyện viên, âm thanh",
        "kết quả tìm kiếm và đêm diễn",
        "ảnh hưởng lối vào và người vắng khảo sát",
      ],
      evidenceRefs: [
        ref(SOURCE.artArchiveReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.crossoverShowListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "社区艺术档案不是按价值，而是按舞台、文字和视觉分类；综合作品既保留主要类别，又增加交叉标签。半年后查找时间缩短，视觉目录使用增长，不过入口位置可能影响结果。跨界晚会一方面由导演安排艺术顺序，另一方面由教练和音响组负责安全与技术。彩排事故后，三方明确了暂停和修改权限，正式演出顺利完成。两项改进都让工作更清楚，却不能证明某种形式更重要，也不能代表因票价或时间未到场的人。",
      modelVi:
        "Hồ sơ nghệ thuật không xếp theo giá trị mà theo sân khấu, chữ và thị giác; tác phẩm tổng hợp vừa giữ loại chính vừa thêm nhãn chéo. Sáu tháng sau thời gian tìm giảm và mục thị giác tăng, nhưng vị trí lối vào có thể tác động. Đêm liên lĩnh vực một mặt do đạo diễn xếp nhịp, mặt khác huấn luyện viên và âm thanh giữ an toàn/kỹ thuật. Sau sự cố ráp, quyền dừng và sửa được làm rõ, diễn chính suôn sẻ. Hai cải tiến làm công việc rõ hơn nhưng không chứng minh hình thức nào quan trọng hơn hay đại diện người không đến vì giá/thời gian.",
      prohibitedExpansionVi:
        "Không biến lượt dùng hay phản hồi người có mặt thành thước đo giá trị nghệ thuật hoặc mức phù hợp của toàn cộng đồng.",
    },
    argument: {
      promptVi:
        "Lập luận liệu tác phẩm và sự kiện nghệ thuật liên lĩnh vực nên có một người quyết định cuối cùng hay một cấu trúc nhiều vai trò được ghi rõ.",
      requiredElementsVi: [
        "luận điểm về một đầu mối và nhiều trách nhiệm",
        "ví dụ loại chính cùng nhãn chéo",
        "quyền dừng an toàn và sửa nhịp nghệ thuật",
        "phản biện về tốc độ ra quyết định",
        "giới hạn dữ liệu sử dụng và khảo sát người có mặt",
      ],
      evidenceRefs: [
        ref(SOURCE.artArchiveReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.crossoverShowListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "跨界作品需要一个协调者，但不应把所有专业权力交给一人。社区档案中的演出既有诗和现场演唱，也有投影图；选择主要类别便于查找，交叉标签则保留其他形式，并记录谁作出判断。晚会中导演负责顺序，教练负责安全，音响组报告技术问题。队员差点摔倒时，教练先停动作，导演再改灯光和长度。有人认为一个人决定更快，也能保持风格一致。不过速度不能代替安全或技术知识。合理做法是事先说明谁能暂停、谁能修改、谁保存理由，再由协调者处理交叉问题。半年后的档案数据受入口位置影响，晚会调查也只覆盖到场者，因此不能认定这种结构适合所有艺术组织。",
      modelVi:
        "Tác phẩm liên lĩnh vực cần một đầu mối phối hợp nhưng không nên giao mọi quyền chuyên môn cho một người. Hồ sơ cho thấy tác phẩm có thể chứa thơ, hát và hình chiếu; loại chính giúp tìm, nhãn chéo giữ phần còn lại và cần ghi người phán đoán. Trong đêm diễn, đạo diễn quản thứ tự, nhưng huấn luyện viên phải dừng ngay khi có nguy cơ ngã; sau đó đạo diễn sửa ánh sáng/độ dài và nhóm âm thanh báo lỗi. Phản biện cho rằng một người quyết sẽ nhanh và ít tranh cãi. Tuy vậy tốc độ không thay kiến thức an toàn/kỹ thuật. Nên quy định trước ai dừng, ai sửa, ai ghi lý do, với điều phối viên xử lý giao nhau. Bằng chứng chỉ cho thấy tìm nhanh hơn và người đến xem đánh giá tăng; giao diện thiên thị giác và người vắng chưa được hỏi, nên chưa chứng minh tối ưu cho mọi tổ chức.",
      counterargumentVi:
        "Một người quyết định cuối cùng có thể phản ứng nhanh, tránh xung đột quyền hạn và giữ phong cách nghệ thuật nhất quán.",
      conclusionBoundaryVi:
        "Chỉ bảo vệ cấu trúc phân quyền cho hai trường hợp nguồn; chưa có so sánh chi phí, tốc độ hay chất lượng với các mô hình quản trị khác.",
    },
    spoken: {
      promptVi:
        "Giới thiệu một tác phẩm hoặc hoạt động nghệ thuật liên lĩnh vực và bảo vệ cách sắp xếp loại hình, trách nhiệm cùng giới hạn đánh giá.",
      requiredMovesVi: [
        "nêu tiêu chí loại chính và nhãn chéo",
        "phân biệt quyền nghệ thuật, an toàn và kỹ thuật",
        "dẫn sự cố ở buổi ráp",
        "trả lời ý kiến một người nên quyết mọi việc",
        "giới hạn bằng dữ liệu giao diện và người vắng",
      ],
      evidenceRefs: [
        ref(SOURCE.artArchiveReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.crossoverShowListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先介绍综合作品既有主要形式，也需要交叉标签。",
        "导演负责艺术顺序，教练负责安全，音响组负责技术。",
        "彩排中队员差点摔倒，证明安全暂停权必须独立。",
        "回应单一负责人更快：协调可以集中，专业判断不能全部集中。",
        "使用增长受入口影响，观众调查也没有包括缺席者。",
      ],
      modelOutlineVi: [
        "Mở bằng việc tác phẩm tổng hợp có hình thức chính và cần nhãn chéo.",
        "Đạo diễn phụ trách thứ tự nghệ thuật, huấn luyện viên an toàn, nhóm âm thanh kỹ thuật.",
        "Sự cố suýt ngã ở buổi ráp cho thấy quyền dừng an toàn phải độc lập.",
        "Trả lời quan điểm một người nhanh hơn: có thể tập trung điều phối, không tập trung mọi phán đoán chuyên môn.",
        "Lượt dùng chịu ảnh hưởng lối vào và khảo sát không gồm người vắng.",
      ],
    },
  },

  "hsk4-information-order-cohesion-lesson-03": {
    sourceTextIds: [SOURCE.matchFailureReading, SOURCE.communitySportListening],
    grammarApplications: {
      [G(69)]: grammar(
        "Dùng 首先……其次…… để xếp bằng chứng theo các tiêu chí song song, không ngụ ý tiêu chí đầu tự động quan trọng hơn.",
        "首先要比较休息时间，其次要检查球队面对新防守时的调整速度。",
        "Trước hết cần so thời gian nghỉ; tiếp theo cần kiểm tốc độ đội điều chỉnh trước kiểu phòng thủ mới.",
        "Thứ tự trình bày phục vụ phân tích; nguồn chưa định lượng trọng số nhân quả của hai yếu tố.",
      ),
      [G(70)]: grammar(
        "Dùng 首先……然后…… để kể đúng chuỗi hành động hoặc quy trình đánh giá trước khi nêu kết quả.",
        "项目首先记录青年原有的运动习惯，然后比较不同出勤次数后的变化。",
        "Dự án trước hết ghi thói quen vận động sẵn có của thanh niên, sau đó so thay đổi theo số lần tham dự.",
        "Trình tự thu thập giúp tránh đảo quan hệ thời gian, nhưng chưa tự loại bỏ khác biệt vùng hay việc bỏ theo dõi.",
      ),
      [G(71)]: grammar(
        "Dùng ……于是…… để nối một tình huống với phản ứng tiếp theo, đồng thời tránh biến phản ứng thành bằng chứng nhân quả hoàn chỉnh.",
        "原来的报告只写“经验不足”，于是教练组重新检查休息、上场时间和战术录像。",
        "Báo cáo cũ chỉ ghi 'thiếu kinh nghiệm', vì thế ban huấn luyện kiểm lại thời gian nghỉ, thời lượng thi đấu và video chiến thuật.",
        "“于是” biểu thị diễn tiến dẫn tới hành động kiểm tra; không chứng minh nhận định cũ sai hoàn toàn hoặc yếu tố mới là nguyên nhân duy nhất.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "第三场前只有十八小时休息，主力上场时间也更长。",
        claimVi:
          "Trước trận thứ ba chỉ có mười tám giờ nghỉ và cầu thủ chính cũng thi đấu lâu hơn.",
        classification: "fact",
        sourceRef: ref(SOURCE.matchFailureReading, "rp2"),
        rationaleVi:
          "Hai dữ kiện được ban huấn luyện đọc lại trực tiếp từ lịch nghỉ và dữ liệu thi đấu.",
        inferenceBoundaryVi:
          "Chúng có thể liên quan thất bại nhưng không tách riêng tác động của thể lực, chiến thuật hay đối thủ.",
      },
      {
        claimHanzi: "报名人数高证明周末运动计划改变了所有青年的生活。",
        claimVi:
          "Số đăng ký cao chứng minh chương trình thể thao cuối tuần đã thay đổi cuộc sống của mọi thanh niên.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.communitySportListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Người tham gia vốn thích vận động hơn, vùng thuận giao thông tham gia nhiều hơn và người bỏ giữa chừng không được phỏng vấn lần hai.",
        inferenceBoundaryVi:
          "Chỉ có thể báo thay đổi ở nhóm tham gia đều; chưa thể quy toàn bộ thay đổi cho chương trình hoặc mở rộng sang mọi thanh niên.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(
          SOURCE.matchFailureReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        promptVi:
          "Viết lại nguyên nhân thất bại theo thứ tự bằng chứng, giữ nhiều điều kiện và không quy cho năng lực cá nhân.",
        modelHanzi:
          "青原队前两场表现好，第三场却在短休息后面对快速防守而失败。数据还显示主力上场更久，球队也没有及时改变传球路线。因此报告把原因限定为休息与战术反应等条件，并计划分别记录调整速度。",
        modelVi:
          "Đội Thanh Nguyên chơi tốt hai trận đầu nhưng thua trận ba sau quãng nghỉ ngắn khi gặp phòng thủ nhanh. Dữ liệu còn cho thấy cầu thủ chính chơi lâu hơn và đội không đổi đường chuyền kịp. Vì vậy báo cáo giới hạn nguyên nhân ở điều kiện nghỉ và phản ứng chiến thuật, đồng thời sẽ ghi riêng tốc độ điều chỉnh.",
        preservedFactsVi: [
          "Có nhiều điều kiện cùng phù hợp với thất bại.",
          "Quãng nghỉ trước trận ba là mười tám giờ.",
          "Báo cáo mới không quy kết tự nhiên cho kinh nghiệm quốc tế.",
        ],
        prohibitedExpansionVi:
          "Không nói đã xác định tỷ trọng từng nguyên nhân, đối thủ không có vai trò hoặc cầu thủ thiếu năng lực cá nhân.",
      },
      {
        sourceRef: ref(
          SOURCE.communitySportListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        promptVi:
          "Paraphrase đánh giá chương trình thể thao theo thứ tự mục tiêu–kết quả–khoảng trống–kế hoạch tiếp theo.",
        modelHanzi:
          "周末计划希望支持友情和运动梦想，第一年报名很多。六个月后，固定参加者的朋友数量与自我评价上升；不过他们原来更爱运动，中途退出者也没有再次受访。项目随后增加交通补助，并准备比较出勤、习惯和地区。",
        modelVi:
          "Chương trình cuối tuần hướng tới tình bạn và ước mơ thể thao, năm đầu đăng ký đông. Sau sáu tháng, người tham gia đều tăng số bạn và tự đánh giá; tuy nhiên họ vốn thích vận động hơn, người bỏ giữa chừng không được phỏng vấn lại. Dự án sau đó thêm hỗ trợ đi lại và sẽ so tham dự, thói quen, khu vực.",
        preservedFactsVi: [
          "Mục tiêu gồm tình bạn và ước mơ vận động.",
          "Kết quả sáu tháng chỉ có ở người tham gia đều.",
          "Giai đoạn sau thêm hỗ trợ đi lại và biến so sánh mới.",
        ],
        prohibitedExpansionVi:
          "Không nói chương trình một mình gây thay đổi, người bỏ học không hưởng lợi hoặc mọi khu vực có cơ hội tham gia ngang nhau.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai đánh giá thể thao theo trật tự bằng chứng: điều kiện thi đấu, thay đổi người tham gia, khoảng trống và bước thu thập tiếp theo.",
      requiredElementsVi: [
        "nghỉ ngắn và phản ứng chiến thuật",
        "thay đổi ở người tham gia đều",
        "yếu tố ban đầu và người bỏ giữa chừng",
        "kế hoạch dữ liệu tiếp theo",
      ],
      evidenceRefs: [
        ref(SOURCE.matchFailureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.communitySportListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "青原队第三场失败后，教练组首先比较休息与上场时间，然后检查对方改变防守时的传球反应。证据显示短休息、主力负担和调整较慢都可能有关，于是报告不再只写“经验不足”。周末运动计划中，固定参加者六个月后朋友更多、自我评价上升；但他们原来更爱运动，交通便利地区参加更多，退出者也未再次受访。两项评估都准备补充比较：球队记录不同防守下的调整，项目记录出勤、原有习惯与地区条件，因此现阶段不能提出单一因果结论。",
      modelVi:
        "Sau thất bại trận ba, ban huấn luyện trước so thời gian nghỉ và thi đấu, rồi kiểm phản ứng chuyền bóng khi đối thủ đổi phòng thủ. Nghỉ ngắn, tải cầu thủ chính và đổi chiến thuật chậm đều có thể liên quan nên báo cáo bỏ kết luận duy nhất 'thiếu kinh nghiệm'. Ở chương trình cuối tuần, người tham gia đều sau sáu tháng có thêm bạn và tự đánh giá cao hơn, nhưng vốn thích thể thao hơn, vùng thuận giao thông tham gia nhiều, người bỏ chưa được phỏng vấn lại. Hai đánh giá đều sẽ bổ sung so sánh, vì thế chưa có kết luận nhân quả đơn nhất.",
      prohibitedExpansionVi:
        "Không xếp thứ tự kể thành trọng số nguyên nhân, không gộp người tham gia đều với người bỏ và không tuyên bố tác động cho toàn bộ thanh niên.",
    },
    argument: {
      promptVi:
        "Lập luận liệu thành tích thi đấu và số người đăng ký có đủ để đánh giá thành công của một chương trình thể thao hay không.",
      requiredElementsVi: [
        "luận điểm về nhiều chỉ số theo thứ tự",
        "dữ liệu nghỉ và phản ứng chiến thuật",
        "kết quả cùng thiên lệch người tham gia chương trình",
        "phản biện về tính đơn giản của thắng và đăng ký",
        "giới hạn nhân quả và kế hoạch theo dõi",
      ],
      evidenceRefs: [
        ref(SOURCE.matchFailureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.communitySportListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "比赛成绩和报名人数应该报告，却不足以评价整个体育项目。青原队前两场表现好，第三场失败；按时间检查才发现休息只有十八小时、主力上场更久，球队也没有及时改变传球路线。周末计划报名很多，固定参加者六个月后朋友更多、自我评价上升；但他们原来更喜欢运动，交通方便地区参加更多，退出者没有再次受访。有人认为胜负和报名客观、便宜、容易比较。它们确实能显示趋势，却不能解释过程、机会或谁从资料中消失。评价应首先报告结果，其次分析休息、战术、原有习惯和地区条件，然后按群体长期跟踪。两份材料仍不能分开每个原因的作用，所以不能说一个项目单独造成全部变化。",
      modelVi:
        "Thành tích và đăng ký cần được báo cáo nhưng không đủ đánh giá toàn bộ chương trình thể thao. Thanh Nguyên thắng hai trận rồi thua trận ba; chỉ nhìn kết quả dễ gọi là thiếu kinh nghiệm. Xếp dữ liệu theo thời gian cho thấy trận ba chỉ nghỉ 18 giờ, cầu thủ chính chơi lâu và đội chưa đổi đường chuyền trước phòng thủ mới. Chương trình cuối tuần cũng đăng ký cao, người tham gia đều báo thêm bạn và tự tin hơn. Nhưng họ vốn thích thể thao, vùng thuận giao thông tham gia nhiều, người bỏ không được hỏi lần hai. Phản biện cho rằng thắng–thua và đăng ký rõ, rẻ, dễ so. Chúng hữu ích để phát hiện xu hướng, song không giải thích cơ hội, quá trình hay ai biến mất khỏi dữ liệu. Nên báo kết quả, phân tích điều kiện rồi theo dõi nhóm qua thời gian. Hai nguồn chưa tách từng nguyên nhân nên không thể nói chương trình tự tạo mọi thay đổi.",
      counterargumentVi:
        "Thắng–thua và số đăng ký là chỉ số khách quan, dễ thu thập, dễ so qua mùa và tránh đánh giá cảm tính.",
      conclusionBoundaryVi:
        "Chỉ kết luận cần thêm chỉ số và thứ tự phân tích; nguồn chưa cho phép xác định trọng số tối ưu hay quan hệ nhân quả riêng của từng yếu tố.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một thứ tự đánh giá chương trình thể thao từ kết quả, điều kiện, phân bố người tham gia đến theo dõi dài hạn.",
      requiredMovesVi: [
        "nêu kết quả thi đấu hoặc đăng ký trước",
        "thêm điều kiện nghỉ, chiến thuật hoặc giao thông",
        "chỉ ra người bỏ giữa chừng khỏi dữ liệu",
        "trả lời ý kiến chỉ số đơn giản khách quan hơn",
        "kết bằng bước theo dõi và giới hạn nhân quả",
      ],
      evidenceRefs: [
        ref(SOURCE.matchFailureReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.communitySportListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "首先报告胜负、报名与六个月后的观察结果。",
        "其次加入休息时间、战术反应、原有习惯和交通条件。",
        "退出者没有第二次采访，不能与固定参加者合并。",
        "回应简单指标更客观：它们可比较，却不能解释过程和缺席者。",
        "最后提出分组跟踪，并承认现有资料不能证明单一原因。",
      ],
      modelOutlineVi: [
        "Trước hết báo thắng–thua, đăng ký và quan sát sau sáu tháng.",
        "Tiếp theo thêm thời gian nghỉ, phản ứng chiến thuật, thói quen sẵn có và giao thông.",
        "Người bỏ không có phỏng vấn lần hai nên không gộp với người tham gia đều.",
        "Trả lời ý kiến chỉ số đơn giản khách quan: chúng so được nhưng không giải thích quá trình và người vắng.",
        "Kết bằng theo dõi theo nhóm và thừa nhận chưa chứng minh nguyên nhân duy nhất.",
      ],
    },
  },

  "hsk4-information-order-cohesion-lesson-04": {
    sourceTextIds: [
      SOURCE.volleyballExchangeReading,
      SOURCE.artExchangeListening,
    ],
    grammarApplications: {
      [G(72)]: grammar(
        "Dùng ……甚至…… để thêm một trường hợp tăng tiến mạnh hơn, nhưng chỉ khi trường hợp đó có bằng chứng riêng trong nguồn.",
        "线下交流的名额较少，交通费用甚至会让部分家庭无法参加。",
        "Trao đổi trực tiếp có ít chỗ, và chi phí đi lại thậm chí khiến một số gia đình không thể tham gia.",
        "“甚至” nhấn mức rào cản trong nguồn, không cho biết tỷ lệ gia đình bị loại hoặc rằng mọi hoạt động trực tiếp đều bất công.",
      ),
      [G(73)]: grammar(
        "Dùng 不仅/不光……还/而且…… để liên kết hai tiêu chí thành công mà không ép chúng thành một điểm số.",
        "交流不仅要看比赛胜率，还要看青年表达、参与机会和后续联系。",
        "Giao lưu không chỉ nhìn tỷ lệ thắng mà còn phải nhìn biểu đạt, cơ hội tham gia và liên hệ sau đó.",
        "Cấu trúc mở rộng bộ tiêu chí; không khẳng định các tiêu chí có trọng số bằng nhau hoặc đều đã được đo đáng tin cậy.",
      ),
      [G(74)]: grammar(
        "Dùng ……并且…… để nối một hành động hoặc kết quả bổ sung có cùng chủ thể và cùng phạm vi thời gian.",
        "新方案先在线介绍主题，并且为各地安排小型线下工作坊。",
        "Phương án mới giới thiệu chủ đề trực tuyến trước và đồng thời bố trí workshop trực tiếp nhỏ tại các địa phương.",
        "“并且” nối hai phần của phương án thử nghiệm; không chứng minh mô hình kết hợp đã tốt hơn sau năm đầu.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "排球交流共有六场比赛和四次小组讨论。",
        claimVi:
          "Chương trình giao lưu bóng chuyền gồm sáu trận và bốn cuộc thảo luận nhóm.",
        classification: "fact",
        sourceRef: ref(SOURCE.volleyballExchangeReading, "rp1"),
        rationaleVi:
          "Nguồn đọc nêu trực tiếp hai số lượng và chúng thuộc cùng một dự án giữa hai thành phố.",
        inferenceBoundaryVi:
          "Số hoạt động không tự chứng minh chất lượng giao lưu, phân bố cơ hội hay quan hệ được duy trì.",
      },
      {
        claimHanzi: "线上人数更多，所以线上交流一定比线下更成功。",
        claimVi:
          "Số người online đông hơn nên giao lưu trực tuyến chắc chắn thành công hơn trực tiếp.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.artExchangeListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn cho thấy online phủ rộng, trong khi trực tiếp có hợp tác sâu và tỷ lệ duy trì liên hệ cao hơn; mỗi cách có rào cản khác.",
        inferenceBoundaryVi:
          "Chỉ được so từng chiều như độ phủ, trải nghiệm vật liệu, độ sâu hợp tác và liên hệ; chưa thể xếp hạng chung.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(
          SOURCE.volleyballExchangeReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        promptVi:
          "Viết lại câu chuyện giao lưu bóng chuyền, giữ các bên liên quan, kết quả riêng và bất bình đẳng cơ hội.",
        modelHanzi:
          "两个城市通过六场排球赛和四次讨论交流。体育组织看胜率，教育者看表达，接待家庭看长期联系。客队赢了四场，多数青年也更敢发言；可是翻译主要用于正式讨论，语言较弱者在晚餐中参与较少。",
        modelVi:
          "Hai thành phố giao lưu qua sáu trận bóng chuyền và bốn thảo luận. Tổ chức thể thao nhìn tỷ lệ thắng, nhà giáo dục nhìn biểu đạt, gia đình chủ nhà nhìn liên hệ dài hạn. Đội khách thắng bốn trận và đa số thanh niên tự tin nói hơn, nhưng phiên dịch chủ yếu ở phần chính thức khiến người yếu ngôn ngữ tham gia bữa tối ít hơn.",
        preservedFactsVi: [
          "Ba bên dùng ba tiêu chí thành công khác nhau.",
          "Đội khách thắng bốn trong sáu trận.",
          "Hỗ trợ phiên dịch và cơ hội giao lưu không phân đều.",
        ],
        prohibitedExpansionVi:
          "Không nói đội thắng nên giao lưu thành công toàn diện, mọi thanh niên đều tự tin hơn hoặc quan hệ chắc chắn kéo dài.",
      },
      {
        sourceRef: ref(
          SOURCE.artExchangeListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        promptVi:
          "Paraphrase tranh luận online–trực tiếp, giữ lợi ích, rào cản của từng cách và trạng thái chưa kiểm chứng của phương án kết hợp.",
        modelHanzi:
          "线上艺术交流覆盖更多城市，偏远学生也能参加，出席和交作业较稳定；线下小组合作更久，后续联系比例较高，却受名额与交通费限制。项目因此提出线上介绍加本地工作坊的混合方案，但第一年还不能称它为唯一答案。",
        modelVi:
          "Giao lưu nghệ thuật online phủ nhiều thành phố và cho học sinh vùng xa tham gia, với dự và nộp bài khá ổn; nhóm trực tiếp hợp tác lâu hơn, tỷ lệ liên hệ sau cao hơn nhưng bị giới hạn chỗ và phí đi lại. Dự án vì thế đề xuất giới thiệu online kèm workshop địa phương, song năm đầu chưa thể gọi đây là đáp án duy nhất.",
        preservedFactsVi: [
          "Online mạnh về độ phủ và sự đều đặn tham dự/nộp bài.",
          "Trực tiếp mạnh về thời gian hợp tác và liên hệ sau.",
          "Mô hình kết hợp mới chỉ là phương án cần kiểm chứng.",
        ],
        prohibitedExpansionVi:
          "Không nói online thiếu chiều sâu ở mọi nhóm, trực tiếp luôn tốt hơn hoặc mô hình kết hợp đã chứng minh hiệu quả.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai chương trình giao lưu xác định thành công bằng nhiều chiều, nêu lợi ích, rào cản, giải pháp mới và phần chưa được kiểm chứng.",
      requiredElementsVi: [
        "bốn chiều của giao lưu bóng chuyền",
        "phân bố hỗ trợ ngôn ngữ",
        "online và trực tiếp giải quyết vấn đề khác nhau",
        "hai phương án tiếp theo chưa có kết quả dài hạn",
      ],
      evidenceRefs: [
        ref(SOURCE.volleyballExchangeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.artExchangeListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "排球交流不仅包括六场比赛和四次讨论，还要评价胜率、表达、参与与长期联系。客队赢了四场，多数青年更自信，不过翻译集中在正式活动，语言较弱者参与较少。艺术交流中，线上覆盖广、出席稳定；线下合作更深、后续联系较多，却受名额和交通费限制。两个项目都提出改进：增加双语伙伴与混合球队，并且试行线上介绍加地方工作坊。新方案可能扩大机会，甚至减少门槛，但三个月联系与混合模式效果仍待验证，不能压成一个成功分数。",
      modelVi:
        "Giao lưu bóng chuyền không chỉ có sáu trận và bốn thảo luận mà còn phải đánh giá riêng thắng, biểu đạt, tham gia, liên hệ dài hạn. Đội khách thắng bốn trận, đa số thanh niên tự tin hơn, nhưng phiên dịch tập trung ở hoạt động chính thức nên người yếu ngôn ngữ tham gia ít. Giao lưu nghệ thuật online phủ rộng và dự đều; trực tiếp hợp tác sâu, liên hệ nhiều hơn song bị giới hạn chỗ/phí. Hai dự án sẽ thêm bạn song ngữ, đội hỗn hợp và mô hình online–workshop địa phương. Hiệu quả liên hệ ba tháng và mô hình kết hợp còn chưa kiểm chứng nên không thể nén thành một điểm thành công.",
      prohibitedExpansionVi:
        "Không tuyên bố phương án mới đã xóa bất bình đẳng, không đồng nhất thắng trận với hữu nghị và không xếp online/trực tiếp bằng một chỉ số chung.",
    },
    argument: {
      promptVi:
        "Lập luận liệu chương trình giao lưu hữu nghị nên ưu tiên số người tiếp cận hay độ sâu quan hệ giữa người tham gia.",
      requiredElementsVi: [
        "luận điểm kết hợp độ phủ và độ sâu",
        "kết quả bóng chuyền cùng hỗ trợ ngôn ngữ",
        "lợi thế và rào cản online–trực tiếp",
        "phản biện về khả năng đo số người dễ hơn",
        "giới hạn theo dõi ba tháng và mô hình kết hợp chưa kiểm chứng",
      ],
      evidenceRefs: [
        ref(SOURCE.volleyballExchangeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.artExchangeListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "友好交流不应在覆盖人数与关系深度之间二选一，而要分别设计和报告。排球项目有六场比赛、四次讨论，客队赢了四场，多数青年也更敢发言；可是翻译集中在正式活动，语言较弱者在晚餐中参与较少。艺术交流线上覆盖广、出席稳定，线下合作更久、后续联系更多，却受名额和交通费限制。有人认为应优先覆盖，因为人数清楚、容易报告，也避免资源只给少数人。覆盖确实重要，但只数登录或到场不能说明谁真正表达并保持联系。可以先在线准备，再安排地方工作坊，同时提供双语伙伴和材料包。这个组合只是需要验证的方案；资料还没有完整的三个月联系结果，也没有混合模式第一年的效果。",
      modelVi:
        "Chương trình hữu nghị không nên chọn một giữa độ phủ và độ sâu; cần thiết kế để hai mục tiêu bổ sung và báo riêng. Giao lưu bóng chuyền có sáu trận, bốn thảo luận, đội khách thắng bốn trận, đa số thanh niên tự tin hơn, nhưng phiên dịch tập trung ở phần chính thức nên người yếu ngôn ngữ ít tham gia bữa tối. Giao lưu nghệ thuật online cho học sinh xa vào, dự và nộp bài cao; trực tiếp tạo hợp tác lâu và liên hệ sau nhiều hơn nhưng ít chỗ, phí đi lại loại một số gia đình. Phản biện cho rằng độ phủ rõ, dễ báo cáo và công bằng hơn chương trình nhỏ. Tuy vậy chỉ đếm đăng nhập/có mặt không cho biết ai thật sự trao đổi và duy trì quan hệ. Nên mở bằng online, tăng chiều sâu qua workshop địa phương, kèm bạn song ngữ và bộ vật liệu. Đây mới là thiết kế cần thử; chưa có kết quả ba tháng đầy đủ hay năm đầu của mô hình kết hợp.",
      counterargumentVi:
        "Ưu tiên số người tiếp cận tạo cơ hội rộng, dễ đo và tránh dành phần lớn nguồn lực cho một nhóm nhỏ có điều kiện gặp trực tiếp.",
      conclusionBoundaryVi:
        "Chỉ đề xuất cân bằng nhiều chiều; nguồn chưa chứng minh mô hình kết hợp tạo quan hệ bền hơn hoặc xóa mọi rào cản về ngôn ngữ, chỗ và chi phí.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một thiết kế giao lưu hữu nghị vừa mở rộng tiếp cận vừa tạo quan hệ có chiều sâu và phản hồi ý kiến chỉ nên chọn một mục tiêu.",
      requiredMovesVi: [
        "nêu hai mục tiêu độ phủ và độ sâu",
        "dẫn bất bình đẳng hỗ trợ ngôn ngữ",
        "so lợi thế và rào cản online–trực tiếp",
        "trả lời ý kiến chỉ cần tối đa số người",
        "kết bằng thiết kế thử và giới hạn dữ liệu",
      ],
      evidenceRefs: [
        ref(SOURCE.volleyballExchangeReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.artExchangeListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "友好交流不仅要覆盖更多人，还要让不同成员真正参与。",
        "排球项目中翻译集中在正式讨论，晚餐机会并不平均。",
        "线上扩大覆盖，线下增加合作深度，却各有技术和费用门槛。",
        "回应只看人数：出席不能代替表达、关系与三个月后的联系。",
        "提出线上准备、本地工作坊和双语伙伴，并承认效果仍待验证。",
      ],
      modelOutlineVi: [
        "Giao lưu hữu nghị không chỉ phủ nhiều người mà phải cho các nhóm tham gia thật.",
        "Ở dự án bóng chuyền, phiên dịch tập trung tại phần chính thức nên cơ hội bữa tối không đều.",
        "Online mở rộng độ phủ, trực tiếp tăng chiều sâu nhưng mỗi cách có rào cản công nghệ/chi phí.",
        "Trả lời việc chỉ đếm người: có mặt không thay biểu đạt, quan hệ và liên hệ sau ba tháng.",
        "Đề xuất chuẩn bị online, workshop địa phương, bạn song ngữ và thừa nhận hiệu quả chưa kiểm.",
      ],
    },
  },

  "hsk4-information-order-cohesion-lesson-05": {
    sourceTextIds: [SOURCE.proverbReading, SOURCE.mooncakeListening],
    grammarApplications: {
      [G(75)]: grammar(
        "Dùng 连……也/都……，……更…… để nêu trường hợp tối thiểu hoặc nổi bật rồi tăng cấp hợp lý, không phóng đại khỏi bối cảnh.",
        "连同一句俗语在不同场景里也会改变作用，具体的说话者与听者关系更需要说明。",
        "Ngay cả cùng một tục ngữ cũng đổi tác dụng theo bối cảnh; quan hệ cụ thể giữa người nói và người nghe càng cần được giải thích.",
        "Tăng tiến nhấn nhu cầu giải thích điều kiện; không cho phép kết luận tục ngữ không có nghĩa ổn định nào hoặc mọi người hiểu khác nhau.",
      ),
      [G(76)]: grammar(
        "Dùng 不是……就是…… để trình bày hai khả năng lựa chọn trong một khung hẹp, đồng thời nói rõ khi nguồn còn khả năng thứ ba.",
        "如果只给两个答案，听众不是把月饼看成健康问题，就是把它看成文化问题。",
        "Nếu chỉ cho hai đáp án, người nghe hoặc xem bánh trung thu là vấn đề sức khỏe, hoặc xem nó là vấn đề văn hóa.",
        "Nguồn thực tế phối hợp nhiều lớp; cấu trúc hai lựa chọn ở đây dùng để phê bình nhị phân giả, không khẳng định chỉ tồn tại hai cách hiểu.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "“慢工出细活”在手工学习和事故处理会上可能产生不同作用。",
        claimVi:
          "Câu 'làm chậm cho sản phẩm tinh' có thể tạo tác dụng khác trong học thủ công và họp xử lý sự cố.",
        classification: "fact",
        sourceRef: ref(SOURCE.proverbReading, "rp1", "rp2"),
        rationaleVi:
          "Nguồn đọc đặt cùng câu vào hai tình huống cụ thể: một hỗ trợ luyện tập dài, một có thể thành lý do trì hoãn.",
        inferenceBoundaryVi:
          "Dữ kiện không chứng minh câu tục ngữ luôn tốt trong học tập hoặc luôn xấu trong tình huống khẩn cấp.",
      },
      {
        claimHanzi: "参与者选择小份证明所有传统月饼配方都同样健康。",
        claimVi:
          "Người tham gia chọn phần nhỏ chứng minh mọi công thức bánh trung thu truyền thống đều lành mạnh như nhau.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn chỉ ghi thay đổi lựa chọn khẩu phần ở một cộng đồng, không đo ăn uống dài hạn và nói rõ không chứng minh mọi công thức như nhau.",
        inferenceBoundaryVi:
          "Chỉ được nói mục tiêu sức khỏe và thực hành chia sẻ có thể phối hợp trong khảo sát này.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(
          SOURCE.proverbReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        promptVi:
          "Viết lại hai cách hiểu tục ngữ, giữ vai trò bối cảnh, quyền lực người nói và giới hạn của một lớp học.",
        modelHanzi:
          "“慢工出细活”在手工课上能提醒学生长期练习，在事故会上却可能被用来拖延。作用不是由俗语自动决定，而与场景、说话者权力和听者需要有关。课堂允许尊重其文化意义，也允许批评不合适的使用，但不能代表各地解释。",
        modelVi:
          "“Làm chậm cho sản phẩm tinh” có thể nhắc học sinh luyện lâu trong lớp thủ công nhưng cũng có thể bị dùng để trì hoãn ở họp sự cố. Tác dụng không do câu nói tự quyết mà phụ thuộc bối cảnh, quyền lực người nói và nhu cầu người nghe. Lớp cho phép tôn trọng ý nghĩa văn hóa và phê bình cách dùng không hợp, nhưng không đại diện mọi địa phương.",
        preservedFactsVi: [
          "Cùng tục ngữ được đặt vào hai bối cảnh khác nhau.",
          "Quan hệ người nói–người nghe ảnh hưởng cách dùng.",
          "Thảo luận chỉ diễn ra trong một lớp học.",
        ],
        prohibitedExpansionVi:
          "Không tuyên bố tục ngữ vô nghĩa, nhóm nào hiểu đúng duy nhất hoặc kết quả lớp học đại diện mọi vùng.",
      },
      {
        sourceRef: ref(
          SOURCE.mooncakeListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        promptVi:
          "Paraphrase cuộc trao đổi về bánh trung thu mà không biến sức khỏe và văn hóa thành hai phía loại trừ nhau.",
        modelHanzi:
          "营养师关注糖、盐和份量，文化研究者关注团圆、赠礼与家庭记忆。主持人把选择分成食用量、配方、赠送方式和象征意义。讲座后参与者更愿选小份，也继续与家人分享；不过调查只来自一个社区。",
        modelVi:
          "Chuyên gia dinh dưỡng chú ý đường, muối và khẩu phần; nhà nghiên cứu văn hóa chú ý đoàn viên, quà tặng, ký ức gia đình. Chủ trì chia lựa chọn thành lượng ăn, công thức, cách tặng và ý nghĩa biểu tượng. Sau buổi nói, người tham gia thích phần nhỏ hơn và vẫn chia sẻ gia đình, nhưng khảo sát chỉ từ một cộng đồng.",
        preservedFactsVi: [
          "Hai chuyên gia có mục tiêu khác nhưng có thể phối hợp.",
          "Thảo luận phân vấn đề thành bốn lớp.",
          "Không có đo lường chế độ ăn dài hạn.",
        ],
        prohibitedExpansionVi:
          "Không nói ăn phần nhỏ giải quyết mọi vấn đề sức khỏe, truyền thống không đổi hoặc mọi công thức có dinh dưỡng giống nhau.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách tục ngữ và thực phẩm truyền thống được giải thích theo bối cảnh, vai trò và nhiều lớp lựa chọn; giữ giới hạn lớp học và khảo sát.",
      requiredElementsVi: [
        "hai bối cảnh của tục ngữ",
        "người nói, người nghe và quyền lực",
        "bốn lớp lựa chọn bánh trung thu",
        "một lớp học, một cộng đồng và thiếu theo dõi dài hạn",
      ],
      evidenceRefs: [
        ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "“慢工出细活”在手工学习中鼓励长期练习，在事故处理中却可能成为拖延理由。连同一句俗语也会因场景、说话者权力和听者需要而改变作用，所以尊重传统与批评使用并不矛盾。月饼讨论也不是健康与文化二选一：营养师关注糖盐和份量，研究者关注团圆与记忆，主持人再把选择分为食用量、配方、赠送和象征。参与者更愿选小份且继续分享，但结果只来自一个社区，没有长期饮食数据；课堂讨论也不能代表各地所有理解。",
      modelVi:
        "“Làm chậm cho sản phẩm tinh” khuyến khích luyện lâu trong học thủ công nhưng có thể thành lý do trì hoãn khi xử lý sự cố. Ngay cùng một tục ngữ cũng đổi tác dụng theo bối cảnh, quyền lực người nói và nhu cầu người nghe, nên tôn trọng truyền thống không trái phê bình cách dùng. Bánh trung thu cũng không phải chọn sức khỏe hoặc văn hóa: chuyên gia nhìn đường–muối–khẩu phần, nhà nghiên cứu nhìn đoàn viên–ký ức, chủ trì chia thành bốn lớp lựa chọn. Người tham gia chọn phần nhỏ và vẫn chia sẻ, nhưng khảo sát một cộng đồng không có dữ liệu dài hạn; lớp học cũng không đại diện mọi vùng.",
      prohibitedExpansionVi:
        "Không gán một nghĩa cố định cho mọi tình huống, không dựng đối lập sức khỏe–văn hóa và không mở rộng mẫu nhỏ thành quy luật chung.",
    },
    argument: {
      promptVi:
        "Lập luận liệu khi giới thiệu tục ngữ và tập quán văn hóa, người dạy nên nhấn ý nghĩa truyền thống hay điều kiện sử dụng đương đại.",
      requiredElementsVi: [
        "luận điểm kết hợp ý nghĩa và điều kiện dùng",
        "hai bối cảnh của “慢工出细活”",
        "bốn lớp trong thảo luận bánh trung thu",
        "phản biện về nhu cầu một lời giải thích ngắn, dễ nhớ",
        "giới hạn lớp học, cộng đồng và theo dõi dài hạn",
      ],
      evidenceRefs: [
        ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "介绍俗语与文化习惯时，教师应先说明传统意义，再分析现代使用条件。“慢工出细活”在手工学习中帮助学生尊重长期练习，在事故处理会上却可能支持拖延。实际作用还取决于谁说、对谁说，以及听者承担什么风险。月饼讨论同样说明健康与文化不是两个互相排斥的答案；食用量、配方、赠送方式和象征意义可以分别调整。有人认为固定而简短的解释更容易记，也能让初学者快速接近文化。这适合作为起点，但如果没有场景，学习者可能把建议当成命令，或把差异排成对错。课程可用一个基本意义、两个对比情境，再加关于权力和风险的问题。两份材料只来自一堂课和一个社区，不能规定各地的解释，也不能证明长期健康效果。",
      modelVi:
        "Khi giới thiệu tục ngữ và tập quán, người dạy nên nêu ý nghĩa truyền thống trước rồi buộc phân tích điều kiện dùng hiện nay. “Làm chậm cho sản phẩm tinh” giúp người học thủ công tôn trọng luyện tập dài, nhưng trong họp xử lý sự cố có thể làm chậm hành động cần thiết. Nghĩa thực tế còn tùy ai nói, nói với ai và người nghe chịu rủi ro gì. Bánh trung thu cũng cho thấy sức khỏe và văn hóa không loại trừ nhau: lượng ăn, công thức, cách tặng và biểu tượng điều chỉnh riêng. Phản biện cho rằng giải thích cố định dễ nhớ và giúp người mới tiếp cận nhanh. Điều đó hữu ích ở bước đầu, nhưng bỏ bối cảnh khiến lời khuyên thành mệnh lệnh hoặc biến khác biệt thành đúng–sai. Bài học nên có nghĩa cơ bản, hai tình huống đối chiếu và câu hỏi về quyền lực/rủi ro. Hai nguồn chỉ là một lớp và một cộng đồng, không quy định mọi vùng hay sức khỏe dài hạn.",
      counterargumentVi:
        "Một định nghĩa truyền thống ngắn và ổn định giúp người mới nhớ nhanh, tránh làm bài học văn hóa quá phức tạp hoặc tương đối.",
      conclusionBoundaryVi:
        "Chỉ đề xuất cấu trúc giảng dạy có bối cảnh; nguồn không xác định một nghĩa chuẩn cho mọi vùng hay tác động dinh dưỡng dài hạn của các lựa chọn.",
    },
    spoken: {
      promptVi:
        "Giới thiệu một tục ngữ và bảo vệ cách giải thích có bối cảnh, rồi dùng trường hợp bánh trung thu để phản hồi tư duy hai lựa chọn.",
      requiredMovesVi: [
        "nêu nghĩa cơ bản của tục ngữ",
        "đối chiếu hai tình huống sử dụng",
        "phân tích người nói, người nghe và rủi ro",
        "liên hệ bốn lớp lựa chọn bánh trung thu",
        "kết bằng giới hạn lớp học và khảo sát",
      ],
      evidenceRefs: [
        ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先说明“慢工出细活”重视认真准备和长期练习。",
        "手工学习中它能鼓励耐心，事故会上却可能支持拖延。",
        "判断时要问谁说、对谁说，以及听者承担什么风险。",
        "月饼也不是健康或文化二选一，可分量、配方、赠送和象征。",
        "最后说明一堂课和一个社区不能代表所有解释或长期结果。",
      ],
      modelOutlineVi: [
        "Trước hết giải thích câu tục ngữ coi trọng chuẩn bị kỹ và luyện tập lâu.",
        "Trong học thủ công câu này khuyến khích kiên nhẫn, ở họp sự cố lại có thể hỗ trợ trì hoãn.",
        "Cần hỏi ai nói, nói với ai và người nghe chịu rủi ro gì.",
        "Bánh trung thu cũng không phải chọn sức khỏe hoặc văn hóa, mà tách lượng, công thức, quà và biểu tượng.",
        "Kết rằng một lớp học và một cộng đồng không đại diện mọi diễn giải hay kết quả dài hạn.",
      ],
    },
  },
};

export const buildHsk4InformationOrderCohesionSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4EventAgencyVoiceSummaryArgumentPackBundle(root);
  assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle(prerequisite);
  return buildHsk4SummaryArgumentModulePack({
    root,
    config: HSK4_INFORMATION_ORDER_COHESION_CONFIG,
    content: CONTENT,
    longFormHeadBundle: prerequisite.longFormHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4InformationOrderCohesionSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH,
  );
  const output = serializeHsk4SummaryArgumentModulePack(
    buildHsk4InformationOrderCohesionSummaryArgumentPack(root),
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
        HSK4_INFORMATION_ORDER_COHESION_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      output: serializeHsk4SummaryArgumentModulePack(
        buildHsk4InformationOrderCohesionSummaryArgumentPack(root),
      ),
    }
    : writeHsk4InformationOrderCohesionSummaryArgumentPack(root);
  if (check) {
    const existing = readFileSync(outputPath, "utf8");
    if (existing !== output) {
      throw new Error(
        "HSK4 information/order/cohesion summary-argument draft is stale",
      );
    }
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_INFORMATION_ORDER_COHESION_CONFIG.lessonIds.length
    } HSK4 information/order/cohesion summary-argument lessons at ${
      outputPath
    }.`,
  );
}
