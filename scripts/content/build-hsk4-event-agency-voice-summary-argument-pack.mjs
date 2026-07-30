import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4SummaryArgumentModulePack,
  serializeHsk4SummaryArgumentModulePack,
} from "./hsk4-summary-argument-module-builder.mjs";
import {
  HSK4_EVENT_AGENCY_VOICE_CONFIG,
  HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH,
} from "../../src/content/hsk4EventAgencyVoiceSummaryArgumentPack.mjs";
import {
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
  loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle,
} from "../../src/content/hsk4StanceComparisonRhetoricSummaryArgumentPack.mjs";

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
  stationReading:
    "hsk4-nature-technology-explanation-concept-actor-map:reading-01",
  greenhouseListening:
    "hsk4-nature-technology-explanation-concept-actor-map:listening-01",
  seagrassReading:
    "hsk4-nature-technology-explanation-process-timeline:reading-01",
  trailListening:
    "hsk4-nature-technology-explanation-process-timeline:listening-01",
  publicDataReading:
    "hsk4-society-economy-argument-concept-actor-map:reading-01",
  marketMediaListening:
    "hsk4-society-economy-argument-concept-actor-map:listening-01",
  flowerBusinessReading:
    "hsk4-society-economy-argument-process-timeline:reading-01",
  bridgeTourismListening:
    "hsk4-society-economy-argument-process-timeline:listening-01",
};

const CONTENT = {
  "hsk4-event-agency-voice-lesson-01": {
    sourceTextIds: [SOURCE.stationReading, SOURCE.greenhouseListening],
    grammarApplications: {
      [G(55)]: grammar(
        "Dùng 把 với chuỗi động tác để đặt đối tượng bằng chứng lên trước và làm rõ tác nhân đã xử lý nó ra sao.",
        "研究员把温度记录查了又查，才说明花期与温度同时发生了变化。",
        "Nhà nghiên cứu kiểm tra đi kiểm tra lại hồ sơ nhiệt độ rồi mới nói mùa hoa và nhiệt độ cùng thay đổi.",
        "Câu chỉ nêu hành động kiểm tra và sự đồng thời; không biến người nghiên cứu thành người đã chứng minh quan hệ nhân quả.",
      ),
      [G(56)]: grammar(
        "Dùng 把……动词+了 để đánh dấu một thay đổi đã hoàn tất đối với đối tượng, đồng thời gọi đúng chủ thể thực hiện.",
        "温室团队把设计、教学和维护的责任分开了，但还没有解决墙角低温问题。",
        "Nhóm nhà kính đã tách trách nhiệm thiết kế, giảng dạy và bảo trì, nhưng chưa giải quyết vấn đề lạnh ở góc tường.",
        "Việc tách trách nhiệm đã hoàn tất không đồng nghĩa vấn đề kỹ thuật cũng đã được giải quyết.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "保护站把研究员、护林员和居民的证据放在同一张角色图上。",
        claimVi:
          "Trạm bảo vệ đặt bằng chứng của nhà nghiên cứu, kiểm lâm và cư dân lên cùng một bản đồ vai trò.",
        classification: "fact",
        sourceRef: ref(SOURCE.stationReading, "rp1", "rp2"),
        rationaleVi:
          "Hai đoạn đầu nêu trực tiếp ba nhóm, loại quan sát và việc trạm đặt chúng vào cùng bản đồ vai trò.",
        inferenceBoundaryVi:
          "Dữ kiện không nói ba loại tri thức có độ chính xác bằng nhau hoặc nhóm nào có quyền quyết định cuối cùng.",
      },
      {
        claimHanzi:
          "低温温室里只要使用传感器，任何材料问题都会被工程师解决。",
        claimVi:
          "Trong nhà kính nhiệt độ thấp, chỉ cần dùng cảm biến thì mọi vấn đề vật liệu đều sẽ được kỹ sư giải quyết.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.greenhouseListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn chỉ cho cảm biến ghi chênh lệch vị trí và nhóm còn phải thử vật liệu; không hề bảo đảm giải quyết mọi vấn đề.",
        inferenceBoundaryVi:
          "Có thể nói đo lường hỗ trợ phát hiện vấn đề, không thể nói một thiết bị tự tạo ra giải pháp hay kỹ sư là tác nhân duy nhất.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.stationReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại cách ba nhóm tạo bằng chứng và giới hạn kết luận về hoa nở sớm, giữ rõ ai quan sát việc gì.",
        modelHanzi:
          "研究员核对温度，护林员检查游客路线，居民提供旧照片。三方证据让保护站看到温度与花期同时变化，但游客是否造成影响仍然不能确定。",
        modelVi:
          "Nhà nghiên cứu đối chiếu nhiệt độ, kiểm lâm kiểm tra tuyến khách và cư dân cung cấp ảnh cũ. Bằng chứng ba bên giúp trạm thấy nhiệt độ và mùa hoa cùng đổi, nhưng vẫn chưa xác định được khách du lịch có gây tác động hay không.",
        preservedFactsVi: [
          "Ba nhóm cung cấp ba loại bằng chứng khác nhau.",
          "Nhiệt độ và mùa hoa được mô tả là cùng thay đổi.",
          "Tác động của khách du lịch vẫn chưa chắc chắn.",
        ],
        prohibitedExpansionVi:
          "Không gán quan hệ nhân quả cho nhiệt độ hay khách, không nói một nhóm đã chứng minh toàn bộ hiện tượng.",
      },
      {
        sourceRef: ref(SOURCE.greenhouseListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase hệ thống nhà kính bằng câu chủ động rõ tác nhân, giữ điều kiện gió và phần việc chưa hoàn thành.",
        modelHanzi:
          "工程师设计材料和保温层，教师把测量用于课程，学生调整开关时间。无风夜晚保温效果明显，大风时墙角仍冷，所以团队还要比较材料并保留原传感器作对照。",
        modelVi:
          "Kỹ sư thiết kế vật liệu và lớp giữ nhiệt, giáo viên đưa phép đo vào môn học, sinh viên điều chỉnh giờ đóng mở. Đêm lặng gió cho hiệu quả rõ, nhưng góc tường vẫn lạnh khi gió mạnh, nên nhóm còn phải so vật liệu và giữ cảm biến cũ làm đối chứng.",
        preservedFactsVi: [
          "Kỹ sư, giáo viên và sinh viên đảm nhiệm các hành động khác nhau.",
          "Hiệu quả thay đổi theo điều kiện gió.",
          "Nhóm còn một thử nghiệm vật liệu có đối chứng.",
        ],
        prohibitedExpansionVi:
          "Không nói lớp giữ nhiệt hiệu quả trong mọi điều kiện hoặc dự án đã tìm ra vật liệu tốt nhất.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai dự án phân công tác nhân, xử lý bằng chứng và giới hạn kết luận; phải nêu ít nhất một việc đã làm và một việc còn bỏ ngỏ.",
      requiredElementsVi: [
        "ba nguồn bằng chứng tại trạm bảo vệ",
        "kết luận giới hạn về hoa và nhiệt độ",
        "ba vai trò trong nhà kính",
        "điều kiện gió và thử nghiệm tiếp theo",
      ],
      evidenceRefs: [
        ref(SOURCE.stationReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.greenhouseListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "保护站让研究员记录温度和花期，让护林员检查游客路线，也请居民提供长期记忆与旧照片。三类证据被放进同一张角色图后，团队只能确认温度与开放时间同时变化，不能确定游客影响。低温温室也把责任分开：工程师设计，教师使用数据教学，学生改变操作时间。保温层在无风夜晚效果明显，大风时墙角仍冷。两个项目都说明，明确谁收集、谁操作和谁解释证据，可以防止把一次观察写成完整答案；材料比较与影响判断仍待后续完成。",
      modelVi:
        "Trạm bảo vệ giao nhà nghiên cứu ghi nhiệt độ và mùa hoa, kiểm lâm kiểm tuyến khách, cư dân cung cấp ký ức dài hạn và ảnh cũ. Bản đồ vai trò chỉ cho phép xác nhận nhiệt độ và mùa hoa cùng đổi, chưa xác định tác động khách. Nhà kính cũng tách kỹ sư thiết kế, giáo viên dùng dữ liệu và sinh viên đổi thao tác. Lớp giữ nhiệt hiệu quả khi lặng gió nhưng góc tường còn lạnh lúc gió mạnh. Cả hai cho thấy gọi đúng người thu thập, thao tác và diễn giải giúp tránh biến một quan sát thành đáp án toàn diện; so vật liệu và xét tác động còn phải tiếp tục.",
      prohibitedExpansionVi:
        "Không nói nhiệt độ gây hoa nở sớm, cảm biến giải quyết vấn đề hoặc một vai trò có toàn quyền kết luận.",
    },
    argument: {
      promptVi:
        "Lập luận: một dự án khoa học cộng đồng nên giao quyền kết luận cho chuyên gia hay phân chia quyền diễn giải giữa nhiều tác nhân?",
      requiredElementsVi: [
        "luận điểm phân biệt chuyên môn và quyền kết luận",
        "vai trò của nghiên cứu viên, kiểm lâm và cư dân",
        "vai trò kỹ sư, giáo viên và sinh viên",
        "phản biện về trách nhiệm chuyên gia",
        "giới hạn từ hai dự án địa phương",
      ],
      evidenceRefs: [
        ref(SOURCE.stationReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.greenhouseListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "科学项目需要专家负责方法，却不应让一种声音代替现场证据。保护站中，研究员能够比较温度记录，护林员看到路线变化，居民补充旧照片。把三类材料合在一起后，团队仍只说温度和花期同时变化，没有把游客写成确定原因。温室项目也显示工程师、教师和学生承担不同任务：设计决定测什么，教学和操作帮助发现墙角在大风时仍冷。有人认为只有专家作结论，责任才清楚，也能避免个人记忆影响判断。这个担心合理，测量方法和报告应由受训人员核查；但是，核查不等于删除护林员、居民或学生观察。更好的制度是标出每项证据的提供者、方法和限制，再由明确负责的团队综合说明。两份材料都来自单一地点，不能证明这种分工适合所有项目，只支持透明分工比隐藏行动者更可靠。",
      modelVi:
        "Dự án khoa học cần chuyên gia chịu trách nhiệm phương pháp, nhưng không nên để một tiếng nói chuyên môn thay mọi bằng chứng hiện trường. Ở trạm núi, nhà nghiên cứu so nhiệt độ, kiểm lâm thấy thay đổi tuyến hằng ngày, cư dân bổ sung ảnh cũ; tổng hợp vẫn chỉ cho phép nói nhiệt độ và mùa hoa cùng đổi. Nhà kính cũng cho thấy thiết kế, dạy học và thao tác phát hiện các mặt khác nhau. Ý kiến giao chuyên gia kết luận để rõ trách nhiệm là hợp lý, nên phương pháp và báo cáo phải được người có đào tạo kiểm. Tuy nhiên, kiểm không có nghĩa xóa quan sát của cộng đồng. Cần ghi người cung cấp, phương pháp và giới hạn rồi để nhóm chịu trách nhiệm tổng hợp. Hai địa điểm chưa chứng minh mô hình phù hợp mọi dự án.",
      counterargumentVi:
        "Giao một chuyên gia toàn quyền kết luận có thể làm trách nhiệm rõ hơn và giảm ảnh hưởng của ký ức hay quan sát không chuẩn hóa.",
      conclusionBoundaryVi:
        "Chỉ đề xuất cơ chế phân vai và kiểm chứng minh bạch; hai nguồn không xác định mô hình quản trị tối ưu cho mọi dự án khoa học.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một quy tắc giúp người nghe nhận ra tác nhân bị ẩn khi báo cáo kết quả khoa học cộng đồng.",
      requiredMovesVi: [
        "gọi tên người thu thập từng loại bằng chứng",
        "tách người thao tác khỏi người diễn giải",
        "đối đáp ý kiến chỉ chuyên gia mới đáng tin",
        "nêu một kết luận chưa được phép đưa ra",
      ],
      evidenceRefs: [
        ref(SOURCE.stationReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.greenhouseListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先问报告中的记录、检查和旧照片分别由谁提供。",
        "再区分工程师设计、教师使用数据和学生改变操作。",
        "专家应核查方法，但不能把其他人的现场证据写成自己的发现。",
        "句子使用“把”时，也要保留真正执行动作的主语。",
        "目前不能说游客造成花期变化，也不能说材料问题已经解决。",
      ],
      modelOutlineVi: [
        "Trước hết hỏi ai cung cấp hồ sơ, kiểm tra và ảnh cũ.",
        "Tách việc kỹ sư thiết kế, giáo viên dùng dữ liệu và sinh viên thao tác.",
        "Chuyên gia nên kiểm phương pháp nhưng không nhận bằng chứng hiện trường của người khác thành phát hiện riêng.",
        "Khi dùng câu 把 vẫn phải giữ chủ ngữ thực sự làm hành động.",
        "Hiện chưa thể nói khách gây đổi mùa hoa hay vấn đề vật liệu đã được giải quyết.",
      ],
    },
  },

  "hsk4-event-agency-voice-lesson-02": {
    sourceTextIds: [SOURCE.seagrassReading, SOURCE.trailListening],
    grammarApplications: {
      [G(57)]: grammar(
        "Dùng 把 với bổ ngữ thời lượng hoặc động lượng để nói chính xác một đối tượng đã được theo dõi hay xử lý bao lâu, bao nhiêu lần.",
        "环保小组把三类试验区连续观察了五年，仍没有说整个海湾已经恢复。",
        "Nhóm môi trường theo dõi liên tục ba loại vùng thử suốt năm năm nhưng vẫn không nói toàn vịnh đã phục hồi.",
        "Thời lượng dài làm mạnh bằng chứng về vùng quan sát, không tự mở rộng phạm vi sang toàn bộ vịnh.",
      ),
      [G(58)]: grammar(
        "Dùng 把 với trạng ngữ trước động từ để bảo toàn cách thức xử lý bằng chứng khi paraphrase.",
        "公园把扫描、停留、回答和纸质观察分别记录下来，避免只用扫描次数判断效果。",
        "Công viên ghi riêng lượt quét, thời gian dừng, câu trả lời và quan sát giấy để tránh chỉ dùng lượt quét phán hiệu quả.",
        "“分别” phải giữ các chỉ số tách biệt; không được gộp chúng thành một điểm thành công duy nhất.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "海草小组经历测量、试种、比较、受损和调整，部分区域第五年覆盖增加。",
        claimVi:
          "Nhóm cỏ biển trải qua đo, trồng thử, so sánh, hư hại và điều chỉnh; năm thứ năm độ phủ tăng ở một số vùng.",
        classification: "fact",
        sourceRef: ref(SOURCE.seagrassReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Ba đoạn mô tả trực tiếp chuỗi năm năm và giới hạn kết quả ở một số khu vực.",
        inferenceBoundaryVi:
          "Không được chuyển phục hồi cục bộ thành toàn vịnh hoặc quy toàn bộ mức tăng cá nhỏ cho cỏ biển.",
      },
      {
        claimHanzi:
          "增加二维码问题以后，科技已经代替游客观察自然环境。",
        claimVi:
          "Sau khi thêm câu hỏi mã QR, công nghệ đã thay thế việc khách quan sát môi trường tự nhiên.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.trailListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn nói ngược lại rằng công nghệ cung cấp âm thanh tiện lợi nhưng không thay quan sát môi trường thật.",
        inferenceBoundaryVi:
          "Chỉ có thể nói câu hỏi liên quan thời gian dừng ở các điểm thử; chưa chứng minh hiểu sâu hay hiệu quả ở mùa khác.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.seagrassReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại tiến trình năm năm, giữ lần lượt các hành động, thất bại và phạm vi kết quả cuối.",
        modelHanzi:
          "小组先画海底图，再在三类地点少量试种并保留无种植区。强风破坏试验后，他们调整固定方式而不删除失败数据。第五年只有部分区域增加覆盖。",
        modelVi:
          "Nhóm trước hết lập bản đồ đáy, rồi trồng ít ở ba loại nơi và giữ vùng không trồng. Sau khi gió mạnh phá thử nghiệm, họ đổi cách cố định mà không xóa dữ liệu thất bại. Năm thứ năm chỉ một số vùng tăng độ phủ.",
        preservedFactsVi: [
          "Lập bản đồ diễn ra trước khi trồng thử.",
          "Có vùng không trồng để so sánh.",
          "Dữ liệu thất bại được giữ và kết quả chỉ cục bộ.",
        ],
        prohibitedExpansionVi:
          "Không rút chuỗi năm năm thành một lần trồng thành công hay nói toàn vịnh và số cá đã phục hồi vì cỏ.",
      },
      {
        sourceRef: ref(SOURCE.trailListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase ba giai đoạn đánh giá đường mòn, không đổi lượt quét thành mức hiểu và phải giữ yếu tố tín hiệu.",
        modelHanzi:
          "公园起初只数二维码扫描，后来加入短问题和对照点，最后同时记录停留、回答与纸质观察。山顶信号弱会减少扫描，因此扫描少不能直接说明内容差。",
        modelVi:
          "Ban đầu công viên chỉ đếm lượt quét mã; sau đó thêm câu hỏi ngắn và điểm đối chứng, cuối cùng ghi cả thời gian dừng, câu trả lời và phiếu giấy. Tín hiệu yếu trên đỉnh làm giảm lượt quét nên ít quét không trực tiếp cho thấy nội dung kém.",
        preservedFactsVi: [
          "Ba giai đoạn dùng bộ chỉ số ngày càng rộng.",
          "Có các điểm không thêm câu hỏi để so.",
          "Tín hiệu yếu là một cách giải thích cho ít lượt quét.",
        ],
        prohibitedExpansionVi:
          "Không nói câu hỏi gây hiểu biết lâu dài hoặc kết quả áp dụng ngoài đường mòn và các mùa chưa thử.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai chuỗi can thiệp theo thời gian, chỉ rõ đối tượng được xử lý, bằng chứng đối chứng và giới hạn của kết quả.",
      requiredElementsVi: [
        "năm bước phục hồi cỏ biển",
        "vùng không trồng và dữ liệu thất bại",
        "ba giai đoạn đánh giá đường mòn",
        "tác động tín hiệu và phạm vi một đường mòn",
      ],
      evidenceRefs: [
        ref(SOURCE.seagrassReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.trailListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "海草小组用五年完成画图、少量试种、设置无种植区、记录风灾和调整固定方式。第五年部分区域覆盖增加，小鱼也变多，但海湾另一侧没有明显变化，鱼的变化也不能只归因于海草。森林公园起初把扫描次数当作成功信号，第二阶段增加短问题与对照点，第三阶段同时记录停留、回答和纸质观察。山顶信号弱会影响扫描，无信号版本改善了使用。两项工作都通过保留对照和失败信息修正早期判断，结果只支持局部恢复和这条步道上的改进。",
      modelVi:
        "Nhóm cỏ biển dùng năm năm để lập bản đồ, trồng thử ít, đặt vùng không trồng, ghi thiệt hại do gió và đổi cách cố định. Năm thứ năm một số vùng tăng độ phủ, cá nhỏ cũng tăng nhưng phía khác không đổi và chưa thể quy cá cho cỏ. Công viên ban đầu xem lượt quét là tín hiệu thành công, rồi thêm câu hỏi và điểm đối chứng, cuối cùng ghi thời gian dừng, trả lời và phiếu giấy. Tín hiệu đỉnh núi ảnh hưởng lượt quét và bản không tín hiệu cải thiện sử dụng. Hai việc đều giữ đối chứng và thất bại để sửa nhận định; kết quả chỉ cục bộ.",
      prohibitedExpansionVi:
        "Không nói phục hồi toàn vịnh, quan hệ nhân quả với cá, mức hiểu lâu dài hoặc hiệu quả ở mọi đường mòn.",
    },
    argument: {
      promptVi:
        "Lập luận: khi một dự án trải qua nhiều giai đoạn, thất bại và dữ liệu đối chứng có nên được trình bày ngang với kết quả tích cực?",
      requiredElementsVi: [
        "luận điểm về giá trị của thất bại",
        "thử nghiệm và vùng đối chứng cỏ biển",
        "chỉ số và điểm đối chứng đường mòn",
        "phản biện về độ rõ của thông điệp",
        "giới hạn không khái quát ngoài nguồn",
      ],
      evidenceRefs: [
        ref(SOURCE.seagrassReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.trailListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "报告项目时，失败和对照应与结果一起出现，因为它们解释结论能够走多远。海草小组没有删除强风破坏两片试验区的数据，还保留无种植区；因此第五年的覆盖增加只能支持部分地点可恢复，不能代表整个海湾。步道最初只数扫描，容易把技术使用写成学习成功。加入短问题、无问题点和纸质观察后，管理者才发现山顶信号会影响扫描。有人担心展示太多失败会让公众看不懂，会削弱项目支持。我同意报告需要清楚主线，但清楚不等于只保留好消息。可以按“行动—比较—结果—限制”组织，把关键失败放在它改变决定的位置。这样既说明团队采取了什么，也让读者看见结果受地点、天气和信号限制。两项本地项目不能证明所有失败都同样重要，只表明影响解释的失败与对照不能被隐藏。",
      modelVi:
        "Khi báo cáo dự án nhiều giai đoạn, thất bại và đối chứng nên xuất hiện cùng kết quả tốt vì chúng cho biết kết luận đi xa đến đâu. Nhóm cỏ biển giữ dữ liệu hai vùng bị gió phá và vùng không trồng, nên độ phủ tăng chỉ hỗ trợ phục hồi cục bộ. Đường mòn ban đầu chỉ đếm quét, dễ đồng nhất dùng công nghệ với học; câu hỏi, điểm đối chứng và phiếu giấy làm lộ ảnh hưởng của tín hiệu. Lo rằng quá nhiều thất bại khiến công chúng khó hiểu là hợp lý, nhưng có thể trình bày theo hành động–so sánh–kết quả–giới hạn. Hai dự án địa phương không chứng minh mọi thất bại đều quan trọng như nhau; chỉ những thất bại đổi cách hiểu bằng chứng phải được giữ.",
      counterargumentVi:
        "Đưa quá nhiều dữ liệu thất bại và đối chứng vào báo cáo có thể làm thông điệp khó hiểu và khiến công chúng đánh giá thấp thành quả thật.",
      conclusionBoundaryVi:
        "Chỉ yêu cầu công bố thất bại và đối chứng có ảnh hưởng trực tiếp đến diễn giải; không đòi mọi chi tiết kỹ thuật có trọng số ngang nhau.",
    },
    spoken: {
      promptVi:
        "Bảo vệ cách kể một dự án nhiều giai đoạn mà không biến hành động cuối cùng thành nguyên nhân duy nhất của kết quả.",
      requiredMovesVi: [
        "nêu thứ tự hành động và tác nhân",
        "chỉ một dữ liệu thất bại hoặc đối chứng",
        "giải thích vì sao chỉ số đầu tiên chưa đủ",
        "giới hạn kết luận theo địa điểm và thời gian",
      ],
      evidenceRefs: [
        ref(SOURCE.seagrassReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.trailListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "海草项目先测量，再试种、比较，受损后才调整固定方式。",
        "无种植区和风灾数据使部分覆盖增加不能代表全海湾。",
        "步道只数扫描时，没有测停留、回答或真实观察。",
        "信号弱也会让扫描减少，所以技术内容不是唯一行动者。",
        "结论分别限于五年中的部分区域和仍需跨季节测试的一条步道。",
      ],
      modelOutlineVi: [
        "Dự án cỏ biển đo trước, rồi trồng thử, so sánh và chỉ đổi cách cố định sau thiệt hại.",
        "Vùng không trồng và dữ liệu gió khiến tăng độ phủ không đại diện toàn vịnh.",
        "Khi chỉ đếm quét, đường mòn chưa đo thời gian dừng, câu trả lời hay quan sát thật.",
        "Tín hiệu yếu cũng giảm quét nên nội dung công nghệ không phải tác nhân duy nhất.",
        "Kết luận giới hạn ở vài vùng trong năm năm và một đường mòn còn cần thử qua mùa.",
      ],
    },
  },

  "hsk4-event-agency-voice-lesson-03": {
    sourceTextIds: [SOURCE.publicDataReading, SOURCE.marketMediaListening],
    grammarApplications: {
      [G(59)]: grammar(
        "Dùng câu bị động với 叫/让 để nêu người hoặc vật chịu tác động và tác nhân gây ra sự việc, tránh xóa trách nhiệm.",
        "错误的网上价格让许多商户迅速转发出去，市场办公室随后说明了数据来源。",
        "Giá sai trên mạng bị nhiều tiểu thương nhanh chóng chuyển tiếp; sau đó văn phòng chợ giải thích nguồn dữ liệu.",
        "Câu chỉ mô tả đường lan truyền và phản hồi; không quy lỗi cố ý cho người chuyển tiếp hay nền tảng.",
      ),
      [G(60)]: grammar(
        "Dùng cấu trúc kiêm ngữ với động từ biểu dương/phê bình để nói rõ ai được đánh giá vì hành động nào, không nhập đánh giá vào dữ kiện.",
        "管理组批评平台没有保留清楚的修改记录，也表扬广播员及时确认更正消息。",
        "Nhóm quản lý phê bình nền tảng vì không giữ lịch sử sửa rõ, đồng thời biểu dương phát thanh viên đã xác nhận tin đính chính kịp thời.",
        "Lời khen/chê là đánh giá của nhóm quản lý, không phải bằng chứng tự thân rằng toàn bộ kênh tốt hay xấu.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "新版公共资料标明来源、更新时间和负责人，并保留不同参与者的责任边界。",
        claimVi:
          "Bản dữ liệu công mới ghi nguồn, ngày cập nhật, người phụ trách và giữ ranh giới trách nhiệm của các bên.",
        classification: "fact",
        sourceRef: ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn nêu trực tiếp vai trò ba bên, ví dụ quyền hạn và ba trường thông tin của bản mới.",
        inferenceBoundaryVi:
          "Minh bạch hơn không chứng minh mọi cộng đồng đã được đại diện đầy đủ; nguồn nói vẫn còn nhóm chưa phỏng vấn.",
      },
      {
        claimHanzi:
          "在线订单增加证明互联网已经让广播失去市场作用。",
        claimVi:
          "Đơn trực tuyến tăng chứng minh Internet đã khiến phát thanh mất vai trò ở chợ.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.marketMediaListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Sau ba tháng đơn online tăng nhưng lượng nghe phát thanh không giảm rõ, nên diễn giải loại bỏ kênh cũ trái nguồn.",
        inferenceBoundaryVi:
          "Có thể nói hai kênh bổ sung nhau trong giai đoạn quan sát; chưa biết tỷ lệ tiếp cận ở làng xa vì dữ liệu tín hiệu còn thiếu.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại quy trình sửa thông tin lễ hội, giữ chủ thể đề nghị, người kiểm và giới hạn quyền của từng bên.",
        modelHanzi:
          "社区代表指出旧资料忽略节日的家庭和历史意义，编辑组保存原文并记录修改理由，文化研究者负责核对。社区能解释文化，却不能改公交时间；交通部门也不能替社区定义文化。",
        modelVi:
          "Đại diện cộng đồng chỉ ra dữ liệu cũ bỏ ý nghĩa gia đình và lịch sử; nhóm biên tập giữ bản cũ, ghi lý do sửa, nhà nghiên cứu văn hóa kiểm tra. Cộng đồng có thể giải thích văn hóa nhưng không đổi giờ xe; ngành giao thông cũng không định nghĩa văn hóa thay cộng đồng.",
        preservedFactsVi: [
          "Cộng đồng khởi phát yêu cầu sửa cách mô tả lễ hội.",
          "Nhóm biên tập lưu vết và nhà nghiên cứu kiểm tra.",
          "Quyền văn hóa và quyền dịch vụ không thay thế nhau.",
        ],
        prohibitedExpansionVi:
          "Không nói cộng đồng tự xuất bản mọi thay đổi hay cơ quan nhà nước mất trách nhiệm với dữ liệu dịch vụ.",
      },
      {
        sourceRef: ref(SOURCE.marketMediaListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase sự cố giá và cách chia trách nhiệm, không gán lỗi cố ý hoặc nói kênh mới thay kênh cũ.",
        modelHanzi:
          "价格错误在网上被快速转发，广播在下一小时更正。此后办公室提供原始数据，平台保存显示和修改记录，广播员口头确认。三个月内在线订单增加，但广播收听没有明显下降。",
        modelVi:
          "Giá sai được chuyển nhanh trên mạng và phát thanh đính chính trong giờ tiếp theo. Sau đó văn phòng cung cấp dữ liệu gốc, nền tảng giữ hiển thị/lịch sử sửa, phát thanh viên xác nhận miệng. Trong ba tháng, đơn online tăng nhưng nghe phát thanh không giảm rõ.",
        preservedFactsVi: [
          "Tin sai lan trên mạng và phát thanh sửa trong giờ sau.",
          "Ba chủ thể nhận ba trách nhiệm cụ thể.",
          "Đơn online và lượng nghe phát thanh có xu hướng khác nhau.",
        ],
        prohibitedExpansionVi:
          "Không nói nền tảng cố ý viết sai, phát thanh sửa ngay lập tức hoặc Internet đã thay thế phát thanh.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai hệ thống thông tin công bằng cách nêu ai tạo, ai kiểm, ai truyền và ai có quyền sửa loại dữ liệu nào.",
      requiredElementsVi: [
        "ba vai trò trong dữ liệu thành phố",
        "quy trình sửa mô tả lễ hội",
        "ba trách nhiệm sau sự cố giá",
        "kết quả ba tháng và dữ liệu còn thiếu",
      ],
      evidenceRefs: [
        ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.marketMediaListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "青川城更新资料时，政府提供服务地点与时间，社会组织检查无障碍信息，社区解释名称和节日。旧资料被质疑后，编辑组存原文、记理由，请研究者核对；社区不能改公交时间，交通部门也不能替社区定义文化。山区市场网上价格出错后，责任分给办公室、平台和广播员，分别管理原始数据、修改记录与口头确认。三个月后在线订单增加，广播收听却没有明显下降。两套系统都用来源和负责人追踪信息，但未受访社区与偏远村信号数据仍不完整。",
      modelVi:
        "Khi Thanh Xuyên cập nhật dữ liệu công, chính quyền cung cấp địa điểm/giờ dịch vụ, tổ chức xã hội kiểm tiếp cận, cộng đồng giải thích tên và lễ hội. Khi bản cũ bị chất vấn, nhóm biên tập giữ nguyên văn, ghi lý do và nhờ nhà nghiên cứu kiểm; cộng đồng không đổi giờ xe, ngành giao thông không định nghĩa văn hóa. Sau lỗi giá ở chợ núi, trách nhiệm lại chia cho văn phòng về dữ liệu gốc, nền tảng về lịch sử sửa và phát thanh viên về xác nhận miệng. Ba tháng sau đơn online tăng mà nghe phát thanh không giảm rõ. Nguồn và người chịu trách nhiệm được theo dõi, nhưng cộng đồng chưa phỏng vấn và tín hiệu làng xa còn thiếu.",
      prohibitedExpansionVi:
        "Không nói hệ thống đã đại diện mọi nhóm, nền tảng gây lỗi có chủ ý hoặc Internet phù hợp với tất cả người dùng.",
    },
    argument: {
      promptVi:
        "Lập luận: khi thông tin công bị sai hoặc bị phản đối, trách nhiệm nên thuộc về một đơn vị xuất bản hay được chia theo từng hành động trong chuỗi?",
      requiredElementsVi: [
        "luận điểm về trách nhiệm theo hành động",
        "quyền hạn của ba bên tại thành phố",
        "sự cố và phân vai tại chợ",
        "phản biện về đầu mối duy nhất",
        "giới hạn về nhóm chưa được ghi nhận",
      ],
      evidenceRefs: [
        ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.marketMediaListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "公共信息需要一个接受意见的窗口，但修改责任应按行动分开，不能全推给出版者。在青川城，政府掌握服务时间和地点，社会组织检查无障碍信息，社区解释文化，研究者核对修改。若只交给一个单位，它可能越过权限：交通部门不能定义节日，社区也不能自己改变车次。市场价格出错时，办公室提供原始数据，平台显示并保存修改记录，广播员口头确认。有人认为单一负责人能让公众知道向谁投诉，也能更快纠错。我同意需要统一入口，不过入口必须公开谁生产、传播、检查和批准每项信息。这样既能追查错误，也不会把责任随意推给所有转发者。两份材料没有覆盖小社区和信号较弱的村庄，因此只支持分层责任，不能确定共同的法律制度。",
      modelVi:
        "Thông tin công cần một đầu mối nhận phản hồi, nhưng trách nhiệm sửa phải được chia theo hành động chứ không dồn hết cho nơi xuất bản. Ở Thanh Xuyên, cơ quan nhà nước biết giờ/địa điểm, tổ chức xã hội kiểm tiếp cận, cộng đồng giải thích văn hóa và nhà nghiên cứu kiểm bản sửa; một đơn vị dễ vượt quyền. Sự cố giá chợ cho thấy chuỗi văn phòng tạo dữ liệu, nền tảng hiển thị/lưu lịch sử và phát thanh viên xác nhận. Đầu mối duy nhất giúp công chúng biết nơi phản ánh là phản biện hợp lý, nhưng đầu mối đó nên công khai ai tạo, truyền, kiểm và duyệt từng trường. Hai nguồn còn thiếu cộng đồng nhỏ và làng tín hiệu yếu nên chỉ hỗ trợ trách nhiệm phân tầng, không xác định cơ cấu pháp lý chung.",
      counterargumentVi:
        "Một đơn vị xuất bản chịu toàn bộ trách nhiệm sẽ giúp người dân dễ khiếu nại, tránh đổ lỗi qua lại và có thể sửa thông tin nhanh hơn.",
      conclusionBoundaryVi:
        "Chỉ đề xuất một cửa tiếp nhận kết hợp dấu vết trách nhiệm theo hành động; nguồn không đủ quyết định trách nhiệm pháp lý hay mô hình quản trị toàn quốc.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một cách dùng thể chủ động và bị động để báo sự cố thông tin mà vẫn truy được trách nhiệm.",
      requiredMovesVi: [
        "nêu đối tượng chịu tác động của tin sai",
        "gọi tên người tạo, truyền, kiểm và sửa",
        "phân biệt phê bình với dữ kiện",
        "trả lời đề xuất chỉ cần một đầu mối",
      ],
      evidenceRefs: [
        ref(SOURCE.publicDataReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.marketMediaListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "先用被动句说明错误价格被快速转发，但不要隐藏传播者和数据来源。",
        "再用主动句分别指出办公室、平台、广播员和编辑组的行动。",
        "管理组的表扬或批评属于评价，修改记录和时间才是可核事实。",
        "一个入口方便公众联系，但后台仍要保存分层责任。",
        "未访谈社区和偏远村数据不完整，因此不能声称所有人已被代表。",
      ],
      modelOutlineVi: [
        "Dùng câu bị động nêu giá sai bị chuyển nhanh nhưng không giấu người truyền và nguồn dữ liệu.",
        "Sau đó dùng câu chủ động chỉ riêng hành động của văn phòng, nền tảng, phát thanh viên và nhóm biên tập.",
        "Khen/chê của nhóm quản lý là đánh giá; lịch sử sửa và thời gian mới là dữ kiện kiểm được.",
        "Một cửa liên hệ tiện cho công chúng nhưng hậu trường vẫn cần trách nhiệm phân tầng.",
        "Cộng đồng chưa phỏng vấn và dữ liệu làng xa còn thiếu nên chưa thể nói mọi người đã được đại diện.",
      ],
    },
  },

  "hsk4-event-agency-voice-lesson-04": {
    sourceTextIds: [SOURCE.flowerBusinessReading, SOURCE.bridgeTourismListening],
    grammarApplications: {
      [G(61)]: grammar(
        "Dùng cấu trúc 选/收+người+做/当/为+vai trò để xác định người được chọn và chức năng được giao, không biến vai trò thành kết quả.",
        "花店选一名员工做市区数据负责人，分别报告订单、损坏和利润。",
        "Tiệm hoa chọn một nhân viên làm người phụ trách dữ liệu nội thành, báo riêng đơn hàng, hư hỏng và lợi nhuận.",
        "Việc được chọn làm người phụ trách chỉ xác định nhiệm vụ; không chứng minh dữ liệu đã đầy đủ hay kinh doanh đã có lãi.",
      ),
      [G(62)]: grammar(
        "Dùng 使/让+đại từ/người+động từ để nêu tác động khiến một chủ thể hành động, đồng thời tránh khẳng định đó là nguyên nhân duy nhất.",
        "新桥使游客更快到达村子，也让商户重新安排周末服务，但传播和节日活动同时发生。",
        "Cầu mới khiến khách đến làng nhanh hơn và khiến tiểu thương sắp lại dịch vụ cuối tuần, nhưng truyền thông và hoạt động lễ cũng diễn ra cùng lúc.",
        "Câu nêu tác động hợp lý của cầu lên thời gian và hành động, không được rút thành cầu là nguyên nhân duy nhất khiến khách tăng.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi:
          "花店进入市区后订单超过郊区，但取货点和包装成本使利润没有同样增长。",
        claimVi:
          "Sau khi tiệm hoa vào nội thành, đơn vượt ngoại ô nhưng chi phí điểm nhận và đóng gói khiến lợi nhuận không tăng tương ứng.",
        classification: "fact",
        sourceRef: ref(SOURCE.flowerBusinessReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn nêu trực tiếp tiến trình bốn năm, mức đơn và nguyên nhân chi phí làm lợi nhuận không tăng tương ứng.",
        inferenceBoundaryVi:
          "Không thể từ đó nói mở rộng thất bại hoàn toàn; đơn, hư hỏng và lợi nhuận phải được đánh giá riêng theo vùng.",
      },
      {
        claimHanzi:
          "游客翻倍说明新桥是村子成为周末目的地的唯一原因。",
        claimVi:
          "Khách tăng gấp đôi cho thấy cầu mới là nguyên nhân duy nhất khiến làng trở thành điểm đến cuối tuần.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.bridgeTourismListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Hồ sơ nửa năm cho thấy cầu, ảnh trên mạng và hoạt động lễ xuất hiện gần nhau; nguồn bác bỏ nguyên nhân duy nhất.",
        inferenceBoundaryVi:
          "Có thể gọi cầu là điều kiện quan trọng vì giảm thời gian đi, nhưng cần tách phương tiện, nguồn mạng, hoạt động và lý do khách.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.flowerBusinessReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Viết lại bốn năm mở rộng của tiệm hoa, giữ tác nhân của từng thay đổi và ba chỉ số kết quả tách biệt.",
        modelHanzi:
          "店主先测试周末配送，再与两家咖啡店设置取货点，后来增加线上订花和花瓶回收。市区订单最终超过郊区，但成本上升使利润没有同步增长。",
        modelVi:
          "Chủ tiệm trước hết thử giao cuối tuần, rồi cùng hai quán cà phê đặt điểm nhận, sau đó thêm đặt hoa online và thu hồi bình. Cuối cùng đơn nội thành vượt ngoại ô, nhưng chi phí tăng khiến lợi nhuận không tăng đồng bộ.",
        preservedFactsVi: [
          "Các thay đổi diễn ra theo thứ tự qua nhiều năm.",
          "Tuyến cũ được giữ để so chứ không thay toàn bộ cùng lúc.",
          "Đơn tăng và lợi nhuận không tăng tương ứng.",
        ],
        prohibitedExpansionVi:
          "Không nói hợp tác quán cà phê tự tạo lợi nhuận hoặc mở rộng thị trường cải thiện mọi kết quả.",
      },
      {
        sourceRef: ref(SOURCE.bridgeTourismListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Paraphrase tác động của cầu cùng các yếu tố đồng thời, giữ số thời gian và kế hoạch thu thập dữ liệu năm sau.",
        modelHanzi:
          "新桥把进城时间从九十分钟缩短到四十分钟，网络图片和节日活动也在相近时间吸引游客。村委会将分别记录车辆、网络来源、报名和游客理由，以判断各因素的作用。",
        modelVi:
          "Cầu mới rút thời gian vào thành phố từ chín mươi xuống bốn mươi phút; ảnh mạng và hoạt động lễ cũng thu hút khách gần cùng thời điểm. Làng sẽ ghi riêng xe, nguồn mạng, đăng ký và lý do của khách để xét vai trò từng yếu tố.",
        preservedFactsVi: [
          "Thời gian đi giảm từ chín mươi xuống bốn mươi phút.",
          "Ba thay đổi diễn ra gần nhau.",
          "Kế hoạch năm sau tách bốn loại dữ liệu.",
        ],
        prohibitedExpansionVi:
          "Không nói kế hoạch thu thập tương lai đã chứng minh trọng số nhân quả hoặc cầu là yếu tố duy nhất.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách các tác nhân mở rộng thị trường và điểm đến, nêu chuỗi hành động, kết quả tách biệt và nguyên nhân chưa thể kết luận.",
      requiredElementsVi: [
        "các bước mở rộng của tiệm hoa",
        "đơn, hư hỏng và lợi nhuận tách biệt",
        "cầu, truyền thông và hoạt động đồng thời",
        "kế hoạch ghi dữ liệu theo tác nhân",
      ],
      evidenceRefs: [
        ref(SOURCE.flowerBusinessReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.bridgeTourismListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "花店先测试周末配送，同市区咖啡店设置取货点，增加线上订花和花瓶回收。第四年市区订单超过郊区，取货与包装成本却使利润没有同样增长，因此店主决定按地区分开报告订单、损坏和利润。河边村的新桥把进城时间从九十分钟缩短到四十分钟；网络图片和节日活动也提高了村子知名度。半年资料支持桥是重要条件，却不能把游客增加只归因于桥。村委会下一年将分别记录车辆、网络来源、活动报名和游客理由，再判断各行动的作用。",
      modelVi:
        "Tiệm hoa ngoại ô thử giao cuối tuần, hợp tác quán cà phê làm điểm nhận, rồi thêm đặt online và thu hồi bình. Năm bốn đơn nội thành vượt ngoại ô nhưng phí điểm nhận/đóng gói khiến lợi nhuận không tăng tương ứng, nên chủ tiệm báo riêng đơn, hư hỏng và lợi nhuận theo vùng. Cầu làng rút thời gian từ chín mươi xuống bốn mươi phút, nhưng ảnh mạng và hoạt động lễ cũng cùng tăng nhận biết. Dữ liệu nửa năm chỉ hỗ trợ cầu là điều kiện quan trọng, không phải nguyên nhân duy nhất. Năm sau làng sẽ ghi riêng xe, nguồn mạng, đăng ký và lý do khách.",
      prohibitedExpansionVi:
        "Không đồng nhất đơn với lợi nhuận, không gán toàn bộ khách tăng cho cầu hoặc coi dữ liệu tương lai là kết quả đã có.",
    },
    argument: {
      promptVi:
        "Lập luận: khi nhiều tác nhân cùng thay đổi một thị trường địa phương, người quản lý nên đánh giá thành công theo một kết quả chính hay một bộ chỉ số phân vai?",
      requiredElementsVi: [
        "luận điểm về bộ chỉ số phân vai",
        "chuỗi quyết định của tiệm hoa",
        "cầu, truyền thông và hoạt động lễ",
        "phản biện về một chỉ số dễ hiểu",
        "giới hạn về quan hệ nhân quả",
      ],
      evidenceRefs: [
        ref(SOURCE.flowerBusinessReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.bridgeTourismListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "多个行动者同时改变市场时，一个主要结果容易传播，却不足以分配责任或选择下一步。花店的市区订单超过郊区，但取货点和包装提高了成本，所以企业必须按地区分别看订单、损坏和利润。若只因订单表扬负责人，报告就会隐藏路线与包装的影响。河边村的新桥缩短了路程，网络图片和节日活动也在相近时间提高关注，第一个月游客翻倍不能确定唯一行动者。有人认为只看订单或游客能帮助管理者快速决定，也便于公众理解。我同意可以选择主要目标，但必须同时报告各组负责的条件和成本：花店记录损坏与利润，村子记录车辆、网络来源、报名和游客理由。两项案例没有给出最佳权重，只说明一个数字不能独自决定功劳或责任。",
      modelVi:
        "Khi nhiều tác nhân cùng đổi thị trường, một kết quả chính dễ truyền đạt nhưng không đủ giao trách nhiệm hay chọn bước sau. Tiệm hoa có đơn nội thành vượt ngoại ô nhưng điểm nhận và đóng gói tăng phí, nên cần tách đơn, hư hỏng và lợi nhuận theo vùng. Ở làng ven sông, cầu rút thời gian, trong khi ảnh mạng và hoạt động lễ cùng tăng chú ý; khách tăng gấp đôi chưa xác định tác nhân duy nhất. Một chỉ số giúp quyết định nhanh và dễ hiểu là phản biện hợp lý, nhưng nên đi cùng chỉ số điều kiện và chi phí do từng nhóm kiểm. Hai trường hợp chưa cho trọng số tối ưu; chúng chỉ cho thấy một con số không đủ quy công hay trách nhiệm.",
      counterargumentVi:
        "Chọn một chỉ số chính như đơn hàng hoặc lượt khách giúp nhà quản lý ra quyết định nhanh, tránh bảng đo phức tạp và truyền thông rõ hơn.",
      conclusionBoundaryVi:
        "Chỉ đề xuất mục tiêu chính kèm chỉ số điều kiện và chi phí; hai nguồn không xác định công thức chấm thành công hay trọng số nhân quả.",
    },
    spoken: {
      promptVi:
        "Bảo vệ cách quy công và giao trách nhiệm khi một kết quả xuất hiện sau nhiều hành động gần nhau.",
      requiredMovesVi: [
        "lập bản đồ tác nhân và hành động",
        "tách đầu ra khỏi chi phí hoặc điều kiện",
        "đáp lại yêu cầu chọn một chỉ số duy nhất",
        "nêu dữ liệu cần thu thêm trước kết luận",
      ],
      evidenceRefs: [
        ref(SOURCE.flowerBusinessReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.bridgeTourismListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "花店老板、咖啡店和线上渠道分别改变配送、取货和订购。",
        "市区订单增加时，包装与取货成本让利润没有同步提高。",
        "新桥缩短时间，网络传播和节日活动也在相近时期发生。",
        "一个主要指标可以保留，但必须配合成本、条件和责任数据。",
        "村委会还要记录车辆、网络来源、活动报名和游客理由，才能比较作用。",
      ],
      modelOutlineVi: [
        "Chủ tiệm, quán cà phê và kênh online lần lượt đổi giao hàng, nhận hàng và đặt hàng.",
        "Khi đơn nội thành tăng, phí đóng gói/điểm nhận khiến lợi nhuận không tăng cùng.",
        "Cầu rút thời gian nhưng truyền thông mạng và lễ hội cũng xảy ra gần lúc đó.",
        "Có thể giữ một chỉ số chính nhưng phải kèm dữ liệu chi phí, điều kiện và trách nhiệm.",
        "Làng còn cần ghi xe, nguồn mạng, đăng ký và lý do khách mới so được tác động.",
      ],
    },
  },
};

export const buildHsk4EventAgencyVoiceSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const prior =
    loadHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(root);
  assertValidHsk4StanceComparisonRhetoricSummaryArgumentPackBundle(prior);
  return buildHsk4SummaryArgumentModulePack({
    root,
    config: HSK4_EVENT_AGENCY_VOICE_CONFIG,
    content: CONTENT,
    longFormHeadBundle: prior.longFormHeadBundle,
    prerequisitePackBundles: [prior],
  });
};

export const writeHsk4EventAgencyVoiceSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH,
  );
  const output = serializeHsk4SummaryArgumentModulePack(
    buildHsk4EventAgencyVoiceSummaryArgumentPack(root),
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
        HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      output: serializeHsk4SummaryArgumentModulePack(
        buildHsk4EventAgencyVoiceSummaryArgumentPack(root),
      ),
    }
    : writeHsk4EventAgencyVoiceSummaryArgumentPack(root);
  if (check) {
    const existing = readFileSync(outputPath, "utf8");
    if (existing !== output) {
      throw new Error(
        "HSK4 event/agency/voice summary-argument draft is stale",
      );
    }
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_EVENT_AGENCY_VOICE_CONFIG.lessonIds.length
    } HSK4 event/agency/voice summary-argument lessons at ${outputPath}.`,
  );
}
