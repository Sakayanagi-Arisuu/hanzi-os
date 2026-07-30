import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4SummaryArgumentModulePack,
  serializeHsk4SummaryArgumentModulePack,
} from "./hsk4-summary-argument-module-builder.mjs";
import {
  HSK4_ARGUMENT_LOGIC_CONCESSION_CONFIG,
  HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH,
} from "../../src/content/hsk4ArgumentLogicConcessionSummaryArgumentPack.mjs";
import {
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle,
  loadHsk4InformationOrderCohesionSummaryArgumentPackBundle,
} from "../../src/content/hsk4InformationOrderCohesionSummaryArgumentPack.mjs";

const G = (n) => `hsk4-grammar-row-${String(n).padStart(3, "0")}`;
const ref = (textId, ...paragraphIds) => ({ textId, paragraphIds });
const grammar = (functionVi, modelHanzi, modelVi, scopeBoundaryVi) => ({
  functionVi,
  modelHanzi,
  modelVi,
  scopeBoundaryVi,
});

const SOURCE = {
  proverbReading:
    "hsk4-culture-history-interpretation-concept-actor-map:reading-01",
  mooncakeListening:
    "hsk4-culture-history-interpretation-concept-actor-map:listening-01",
  pastryShopReading:
    "hsk4-culture-history-interpretation-process-timeline:reading-01",
  lanternFestivalListening:
    "hsk4-culture-history-interpretation-process-timeline:listening-01",
  ancientSiteReading:
    "hsk4-culture-history-interpretation-claim-evidence-inference:reading-01",
  travelogueListening:
    "hsk4-culture-history-interpretation-claim-evidence-inference:listening-01",
  historicalExhibitionReading:
    "hsk4-culture-history-interpretation-viewpoint-synthesis:reading-01",
  historicalStreetListening:
    "hsk4-culture-history-interpretation-viewpoint-synthesis:listening-01",
};

const CONTENT = {
  "hsk4-argument-logic-concession-lesson-01": {
    sourceTextIds: [SOURCE.proverbReading, SOURCE.mooncakeListening],
    grammarApplications: {
      [G(77)]: grammar(
        "Dùng 尽管……但是/可是…… để thừa nhận một dữ kiện đối lập trước khi nêu luận điểm chính, không xóa dữ kiện đã nhượng bộ.",
        "尽管月饼有重要的团圆意义，但是营养建议仍要求说明糖、盐和食用量。",
        "Dù bánh trung thu có ý nghĩa đoàn viên quan trọng, khuyến nghị dinh dưỡng vẫn cần nói rõ đường, muối và lượng ăn.",
        "Vế nhượng bộ phải còn hiệu lực; không được viết ý nghĩa văn hóa như thể nó không tồn tại.",
      ),
      [G(78)]: grammar(
        "Dùng 然而 để chuyển từ bằng chứng ủng hộ sang giới hạn hoặc bằng chứng trái chiều ở cấp diễn ngôn.",
        "俗语能鼓励认真准备，然而在紧急场景中，同一句话也可能被用来拖延行动。",
        "Tục ngữ có thể khuyến khích chuẩn bị kỹ; tuy nhiên trong tình huống khẩn, cùng câu đó cũng có thể bị dùng để trì hoãn.",
        "Hai vế phải thực sự tạo tương phản có căn cứ, không dùng liên từ để tạo kịch tính giả.",
      ),
      [G(79)]: grammar(
        "Dùng 不过 để bổ sung ngoại lệ hoặc thu hẹp kết luận sau một nhận định.",
        "参加者愿意选择小份月饼，不过问卷只来自一个社区，也没有长期饮食记录。",
        "Người tham gia sẵn sàng chọn bánh phần nhỏ; tuy vậy phiếu chỉ từ một cộng đồng và không có ghi ăn uống dài hạn.",
        "Ngoại lệ phải giới hạn đúng claim trước đó, không phủ nhận dữ kiện quan sát được.",
      ),
      [G(80)]: grammar(
        "Dùng X是X，就是/不过…… để công nhận một đặc điểm rồi nêu vấn đề còn lại.",
        "传统是传统，就是具体做法仍要根据健康知识和使用场景调整。",
        "Truyền thống là truyền thống, chỉ là cách thực hành cụ thể vẫn phải điều chỉnh theo kiến thức sức khỏe và bối cảnh sử dụng.",
        "Cấu trúc phân biệt công nhận giá trị với chấp nhận mọi cách làm; không biến thành phủ nhận truyền thống.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "同一句俗语在手工学习和事故处理场景中承担不同作用。",
        claimVi:
          "Cùng một tục ngữ đảm nhiệm chức năng khác nhau trong học thủ công và xử lý sự cố.",
        classification: "fact",
        sourceRef: ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Nguồn trực tiếp đối chiếu hai bối cảnh và vai của người nói/nghe.",
        inferenceBoundaryVi:
          "Có thể nêu chức năng khác trong hai tình huống, chưa thể đại diện mọi cách hiểu vùng miền.",
      },
      {
        claimHanzi: "选择小份月饼证明传统配方已经变得健康。",
        claimVi:
          "Chọn bánh phần nhỏ chứng minh công thức truyền thống đã trở nên lành mạnh.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn theo dõi lựa chọn khẩu phần và chia sẻ, không đo thành phần của mọi công thức hoặc sức khỏe dài hạn.",
        inferenceBoundaryVi:
          "Chỉ được nói mục tiêu sức khỏe và thực hành văn hóa có thể phối hợp trong mẫu hẹp.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Paraphrase hai cách dùng tục ngữ, giữ người nói, bối cảnh và giới hạn đại diện.",
        modelHanzi:
          "“慢工出细活”在手工学习中可以支持认真练习，在事故处理中却可能成为拖延理由。它的作用取决于场景、说话者权力和听者需要，一次课堂讨论不能代表各地所有解释。",
        modelVi:
          "“Làm chậm cho sản phẩm tinh” có thể hỗ trợ luyện tập kỹ trong học thủ công nhưng có thể thành lý do trì hoãn khi xử lý sự cố. Chức năng phụ thuộc bối cảnh, quyền lực người nói và nhu cầu người nghe; một thảo luận lớp không đại diện mọi cách hiểu.",
        preservedFactsVi: [
          "Hai bối cảnh tạo hai chức năng khác nhau.",
          "Vai trò người nói/nghe ảnh hưởng diễn giải.",
          "Nguồn tự giới hạn phạm vi một lớp.",
        ],
        prohibitedExpansionVi:
          "Không kết luận tục ngữ tốt hoặc xấu trong mọi trường hợp, hay một nhóm hiểu đúng tuyệt đối.",
      },
      {
        sourceRef: ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Viết lại cách buổi thảo luận phối hợp mục tiêu dinh dưỡng và văn hóa, không tuyên bố tác động dài hạn.",
        modelHanzi:
          "营养师关注糖、盐和食用量，文化研究者关注团圆、赠礼与记忆。主持人把配方、份量和象征意义分开后，参加者愿意选小份并继续分享，但调查范围只有一个社区。",
        modelVi:
          "Chuyên gia dinh dưỡng chú ý đường, muối, khẩu phần; nhà nghiên cứu chú ý đoàn viên, quà tặng, ký ức. Khi chủ trì tách công thức, lượng ăn và biểu tượng, người tham gia sẵn sàng chọn phần nhỏ mà vẫn chia sẻ, nhưng khảo sát chỉ ở một cộng đồng.",
        preservedFactsVi: [
          "Hai chuyên gia có nhiệm vụ khác nhau.",
          "Chọn phần nhỏ không đồng nghĩa hủy chia sẻ.",
          "Khảo sát có phạm vi cộng đồng hẹp.",
        ],
        prohibitedExpansionVi:
          "Không nói mọi công thức đều lành mạnh hoặc hành vi được duy trì lâu dài.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách hai nguồn bảo tồn giá trị văn hóa đồng thời đặt điều kiện cho cách sử dụng cụ thể.",
      requiredElementsVi: [
        "hai bối cảnh dùng tục ngữ",
        "vai người nói/nghe",
        "dinh dưỡng và biểu tượng bánh",
        "điều kiện và giới hạn phạm vi",
      ],
      evidenceRefs: [
        ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "俗语材料说明，“慢工出细活”在手工学习中鼓励认真，在事故处理中却可能拖延，因此解释要记录场景、说话者和听者。月饼讨论也把价值分层：营养师关注糖、盐和份量，研究者关注团圆、赠礼与记忆。参加者选择小份后仍与家人分享。两份材料都没有要求取消传统，而是主张保留文化意义，同时检查具体使用是否符合当下需要。不过，课堂和社区问卷范围有限，不能代表所有地区或证明长期效果。",
      modelVi:
        "Nguồn tục ngữ cho thấy cùng câu khuyến khích sự kỹ lưỡng trong học thủ công nhưng có thể trì hoãn khi xử lý sự cố, nên phải ghi bối cảnh và vai người nói/nghe. Nguồn bánh tách dinh dưỡng khỏi đoàn viên, quà tặng, ký ức; người tham gia chọn phần nhỏ vẫn chia sẻ. Cả hai giữ ý nghĩa văn hóa nhưng kiểm tra cách dùng theo nhu cầu hiện tại. Lớp học và phiếu cộng đồng không đại diện mọi vùng hay tác động dài hạn.",
      prohibitedExpansionVi:
        "Không biến điều chỉnh có điều kiện thành lời kêu gọi bỏ truyền thống hoặc tuyên bố mọi truyền thống đều thích nghi được.",
    },
    argument: {
      promptVi:
        "Lập luận: bảo tồn truyền thống có đòi hỏi giữ nguyên cách thực hành trong mọi bối cảnh không?",
      requiredElementsVi: [
        "luận điểm phân biệt giá trị và cách thực hành",
        "bằng chứng tục ngữ",
        "bằng chứng bánh trung thu",
        "phản biện về nguy cơ làm loãng truyền thống",
        "kết luận nêu phạm vi và điều kiện",
      ],
      evidenceRefs: [
        ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "保护传统不等于在所有场景中复制同一种做法，而应说明要保存的价值，再检查具体使用的后果。“慢工出细活”能够鼓励手工学习者认真准备，可是在事故处理中也可能被用来拖延；尊重俗语并不要求接受不合适的运用。月饼同样承载团圆、赠礼和家庭记忆，但参加者选择小份仍能分享，说明调整食用量不一定取消象征意义。反对者担心不断修改会使传统只剩名称，这个担心提醒我们不能随意删除核心关系和记忆。因此，每次调整都应公开保留什么、改变什么、由谁决定，并观察受影响群体。现有课堂和社区调查只支持“价值与做法可以分开讨论”，还不能证明所有传统都适合改变，也不能确定哪种配方长期最健康。",
      modelVi:
        "Bảo tồn truyền thống không phải sao chép một cách làm trong mọi bối cảnh; cần nêu giá trị muốn giữ và kiểm tra hậu quả sử dụng. Tục ngữ có thể khuyến khích kỹ lưỡng nhưng cũng bị dùng để trì hoãn; tôn trọng không có nghĩa chấp nhận mọi cách dùng. Bánh mang đoàn viên và ký ức, nhưng chọn phần nhỏ vẫn chia sẻ. Phản biện rằng sửa liên tục làm truyền thống rỗng nhắc ta không xóa quan hệ và ký ức cốt lõi. Mỗi điều chỉnh phải công khai cái giữ, cái đổi, ai quyết định và theo dõi nhóm chịu tác động. Hai nguồn hẹp không chứng minh mọi truyền thống đều đổi được.",
      counterargumentVi:
        "Nếu thay đổi công thức, ngôn ngữ hay nghi thức thường xuyên, truyền thống có thể mất tính liên tục và chỉ còn nhãn gọi.",
      conclusionBoundaryVi:
        "Chỉ kết luận giá trị và cách thực hành có thể phân tích riêng; chưa đưa ra quy tắc chung cho mọi truyền thống.",
    },
    spoken: {
      promptVi:
        "Bảo vệ một quy tắc ba câu hỏi để quyết định điều gì nên giữ và điều gì có thể đổi trong thực hành truyền thống.",
      requiredMovesVi: [
        "xác định giá trị cốt lõi",
        "nêu hậu quả theo bối cảnh",
        "trả lời lo ngại mất truyền thống",
        "nêu giới hạn hai nguồn",
      ],
      evidenceRefs: [
        ref(SOURCE.proverbReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.mooncakeListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "第一问：传统要保存的是价值、关系还是固定动作？",
        "第二问：同一做法在当前场景中帮助谁、妨碍谁？",
        "第三问：改变后能否继续表达核心意义？",
        "俗语和月饼都说明保留意义不等于拒绝调整。",
        "两个案例范围有限，决定还要听取当地实践者意见。",
      ],
      modelOutlineVi: [
        "Câu một: truyền thống giữ giá trị, quan hệ hay động tác cố định?",
        "Câu hai: cách làm hiện tại giúp ai và cản ai trong bối cảnh này?",
        "Câu ba: sau thay đổi còn biểu đạt được ý nghĩa cốt lõi không?",
        "Tục ngữ và bánh đều cho thấy giữ ý nghĩa không đồng nghĩa từ chối điều chỉnh.",
        "Hai trường hợp hẹp; quyết định còn cần tiếng nói người thực hành địa phương.",
      ],
    },
  },

  "hsk4-argument-logic-concession-lesson-02": {
    sourceTextIds: [SOURCE.pastryShopReading, SOURCE.lanternFestivalListening],
    grammarApplications: {
      [G(81)]: grammar(
        "Dùng 否则 để nêu hệ quả nếu điều kiện hoặc biện pháp trước không được đáp ứng; hệ quả phải có cơ sở.",
        "老店要记录配方与师傅经验，否则改变以后就无法说明哪些传统被保留。",
        "Tiệm cũ cần ghi công thức và kinh nghiệm thợ; nếu không, sau thay đổi sẽ không giải thích được truyền thống nào được giữ.",
        "“否则” không chứng minh hệ quả chắc chắn nếu nguồn chỉ nêu rủi ro; cần dùng mức độ phù hợp.",
      ),
      [G(82)]: grammar(
        "Dùng 要是……就…… để trình bày một giả thiết và hệ quả kiểm tra được.",
        "要是灯会提前公布新时间，居民就更容易重新安排出行。",
        "Nếu lễ hội đèn công bố giờ mới sớm, cư dân sẽ dễ sắp xếp lại việc đi lại hơn.",
        "Giả thiết phải được đánh dấu; không viết kết quả dự kiến như dữ kiện đã xảy ra.",
      ),
      [G(83)]: grammar(
        "Dùng 要是……就……否则…… để đối chiếu hai nhánh hành động, giữ cả điều kiện lẫn hệ quả.",
        "要是商店试做小批新产品，就能比较反馈，否则只能凭印象判断。",
        "Nếu cửa hàng thử mẻ nhỏ sản phẩm mới thì có thể so phản hồi; nếu không chỉ còn phán đoán bằng ấn tượng.",
        "Hai nhánh là phương án lập luận, không tự chứng minh thử nghiệm sẽ thành công.",
      ),
      [G(84)]: grammar(
        "Dùng 不管……都/也…… để nêu nguyên tắc giữ ổn định qua nhiều điều kiện, nhưng không xóa ngoại lệ hợp lý.",
        "不管灯会是否改时间，主办方都要说明安全依据和交通安排。",
        "Dù lễ hội có đổi giờ hay không, ban tổ chức đều phải giải thích căn cứ an toàn và sắp xếp giao thông.",
        "Phạm vi “dù” phải được liệt kê hoặc hiểu rõ; không tạo quy tắc tuyệt đối ngoài bối cảnh.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "传统点心店通过记录、试做和顾客反馈逐步改变产品。",
        claimVi:
          "Tiệm bánh truyền thống thay đổi sản phẩm từng bước qua ghi chép, thử làm và phản hồi khách.",
        classification: "fact",
        sourceRef: ref(SOURCE.pastryShopReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Ba giai đoạn và tác nhân được mô tả trực tiếp trong nguồn đọc.",
        inferenceBoundaryVi:
          "Có thể mô tả quy trình tiệm này, chưa thể nói mọi tiệm truyền thống nên làm giống hệt.",
      },
      {
        claimHanzi: "灯会改时间说明主办方不重视传统。",
        claimVi:
          "Lễ hội đèn đổi giờ cho thấy ban tổ chức không coi trọng truyền thống.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.lanternFestivalListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Nguồn nêu điều kiện an toàn, thời tiết, giao thông và cách truyền đạt; không nêu thái độ coi thường.",
        inferenceBoundaryVi:
          "Chỉ được đánh giá căn cứ và quá trình đổi giờ, không gán động cơ nội tâm.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.pastryShopReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Paraphrase quá trình đổi tiệm bánh, phân biệt phần giữ, phần thử và kết quả quan sát.",
        modelHanzi:
          "老店先记录原配方与制作经验，再小批试做口味和包装，最后根据顾客反馈决定继续哪些改变。材料显示传统知识被整理并参与试验，但没有证明新产品一定能长期成功。",
        modelVi:
          "Tiệm trước ghi công thức cũ và kinh nghiệm làm, rồi thử mẻ nhỏ hương vị/bao bì, cuối cùng dùng phản hồi để quyết định thay đổi nào tiếp tục. Nguồn cho thấy tri thức truyền thống được hệ thống hóa và tham gia thử nghiệm, không chứng minh sản phẩm mới sẽ thành công dài hạn.",
        preservedFactsVi: [
          "Có ghi bản cũ trước khi thay đổi.",
          "Thử nghiệm diễn ra ở mẻ nhỏ.",
          "Phản hồi hỗ trợ quyết định bước sau.",
        ],
        prohibitedExpansionVi:
          "Không tuyên bố doanh thu hoặc tính bền vững dài hạn nếu nguồn không đo.",
      },
      {
        sourceRef: ref(SOURCE.lanternFestivalListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Viết lại lý do đổi giờ và cách giảm gián đoạn, không gán thái độ với truyền thống.",
        modelHanzi:
          "灯会因天气、安全和交通条件不得不调整时间。主办方通过提前通知、更新路线并解释依据来减少影响，这说明做法改变是风险管理，不等于取消节日意义。",
        modelVi:
          "Lễ hội đèn phải điều chỉnh giờ do thời tiết, an toàn và giao thông. Ban tổ chức báo sớm, cập nhật tuyến và giải thích căn cứ để giảm ảnh hưởng; điều này cho thấy đổi cách làm là quản lý rủi ro, không đồng nghĩa hủy ý nghĩa lễ hội.",
        preservedFactsVi: [
          "Có nhiều điều kiện dẫn đến đổi giờ.",
          "Ban tổ chức có biện pháp thông tin và tuyến đường.",
        ],
        prohibitedExpansionVi:
          "Không nói mọi người đều chấp nhận hoặc lễ hội an toàn tuyệt đối sau điều chỉnh.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt hai quá trình thay đổi truyền thống, nêu điều kiện kích hoạt, bước thử/điều chỉnh và giới hạn kết quả.",
      requiredElementsVi: [
        "ghi và thử ở tiệm bánh",
        "phản hồi khách",
        "điều kiện đổi giờ lễ hội",
        "thông báo, an toàn và giới hạn",
      ],
      evidenceRefs: [
        ref(SOURCE.pastryShopReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.lanternFestivalListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "传统点心店没有一次换掉旧做法，而是先记录配方和师傅经验，再小批试做新口味与包装，最后参考顾客反馈。灯会改时间也不是随意决定：天气、安全和交通条件触发调整，主办方随后更新通知与路线并解释依据。两份材料都把改变分成条件、行动和复查，使传统内容与具体做法可以分别处理。它们支持渐进试验和公开说明，不过没有长期销售、全面满意度或零事故数据，不能保证每次调整都成功。",
      modelVi:
        "Tiệm bánh không thay toàn bộ ngay mà ghi công thức/kinh nghiệm, thử mẻ nhỏ rồi tham khảo phản hồi. Lễ hội đổi giờ do thời tiết, an toàn, giao thông; ban tổ chức cập nhật thông báo, tuyến và giải thích căn cứ. Cả hai tách điều kiện, hành động, đánh giá lại, nhờ đó nội dung truyền thống và cách làm được xử lý riêng. Chúng ủng hộ thử dần và giải thích công khai, nhưng không có bán hàng dài hạn, hài lòng toàn diện hay dữ liệu không sự cố.",
      prohibitedExpansionVi:
        "Không biến quy trình hợp lý thành bảo đảm kết quả hoặc mô hình bắt buộc cho mọi phong tục.",
    },
    argument: {
      promptVi:
        "Lập luận: khi an toàn hoặc nhu cầu mới xuất hiện, thay đổi truyền thống nên diễn ra nhanh hay qua thử nghiệm từng bước?",
      requiredElementsVi: [
        "phân biệt tình huống khẩn và thay đổi có thể thử",
        "quy trình tiệm bánh",
        "điều kiện lễ hội",
        "phản biện về chi phí/chậm trễ",
        "kết luận có tiêu chí và mốc đánh giá",
      ],
      evidenceRefs: [
        ref(SOURCE.pastryShopReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.lanternFestivalListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "改变传统的速度应由风险决定：安全威胁明确时先采取可逆措施，其他变化则适合小规模试验。点心店先记录旧配方，再试做小批产品并收集反馈，这减少了一次性失去经验的风险。灯会面对天气、交通和安全条件，不能等完整调查后才改时间，但主办方仍应解释依据、更新路线并在活动后复查。有人认为分阶段会增加成本，也可能让顾客和居民长期不确定。确实如此，所以试验必须有明确期限、负责人和停止条件；紧急调整也应注明何时恢复或重新决定。依据两份材料，合理原则不是“越慢越尊重”或“越快越现代”，而是让行动速度匹配风险和可逆性。现有资料没有长期销售与事故比较，尚不能确定最佳期限。",
      modelVi:
        "Tốc độ thay đổi nên theo rủi ro: khi nguy cơ an toàn rõ, áp dụng biện pháp đảo ngược trước; thay đổi khác nên thử nhỏ. Tiệm bánh ghi công thức, thử mẻ nhỏ, lấy phản hồi để giảm nguy cơ mất kinh nghiệm. Lễ hội không thể chờ nghiên cứu đầy đủ mới đổi giờ, nhưng vẫn phải giải thích, cập nhật tuyến và đánh giá sau. Phản biện rằng thử từng bước tốn kém và gây bất định là thật, nên thử nghiệm phải có hạn, người chịu trách nhiệm và điều kiện dừng. Nguyên tắc không phải càng chậm càng tôn trọng hay càng nhanh càng hiện đại, mà tốc độ phù hợp rủi ro và khả năng đảo ngược.",
      counterargumentVi:
        "Thử nghiệm từng bước kéo dài bất định và tăng chi phí; đôi khi quyết định dứt khoát giúp cộng đồng thích nghi nhanh hơn.",
      conclusionBoundaryVi:
        "Chỉ đề xuất nguyên tắc theo rủi ro/khả năng đảo ngược; nguồn không xác định thời hạn tối ưu cho mọi phong tục.",
    },
    spoken: {
      promptVi:
        "Trình bày một ma trận quyết định nhanh/chậm và đảo ngược/khó đảo ngược cho hai trường hợp.",
      requiredMovesVi: [
        "xác định mức rủi ro",
        "xác định khả năng đảo ngược",
        "nêu quy trình thông báo và đánh giá",
        "trả lời lo ngại kéo dài bất định",
      ],
      evidenceRefs: [
        ref(SOURCE.pastryShopReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.lanternFestivalListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "风险高且可逆时，先临时调整并马上说明依据。",
        "风险较低且可逆时，先小批试做和收集反馈。",
        "难以逆转的改变要先保存配方、记录和责任。",
        "灯会重视及时通知，点心店重视试验期限。",
        "为避免长期不确定，每项措施都要有复查日期。",
      ],
      modelOutlineVi: [
        "Rủi ro cao và đảo ngược được: điều chỉnh tạm, giải thích ngay.",
        "Rủi ro thấp hơn và đảo ngược được: thử mẻ nhỏ, lấy phản hồi.",
        "Thay đổi khó đảo ngược phải lưu công thức, hồ sơ và trách nhiệm trước.",
        "Lễ hội chú trọng thông báo kịp; tiệm bánh chú trọng thời hạn thử.",
        "Mọi biện pháp cần ngày đánh giá lại để tránh bất định kéo dài.",
      ],
    },
  },

  "hsk4-argument-logic-concession-lesson-03": {
    sourceTextIds: [SOURCE.ancientSiteReading, SOURCE.travelogueListening],
    grammarApplications: {
      [G(85)]: grammar(
        "Dùng 无论……都/也…… để nêu một thủ tục bằng chứng giữ nguyên qua nhiều khả năng.",
        "无论遗物来自哪一层，研究者都要记录位置、材料和不确定性。",
        "Dù di vật đến từ tầng nào, nhà nghiên cứu đều phải ghi vị trí, vật liệu và độ bất định.",
        "Nguyên tắc thủ tục không có nghĩa mọi khả năng dẫn đến cùng kết luận lịch sử.",
      ),
      [G(86)]: grammar(
        "Dùng 既然……就…… khi tiền đề đã được các bên chấp nhận; không đưa giả thuyết chưa chắc vào vị trí tiền đề.",
        "既然旧游记写于作者访问之后，我们就应把它当作个人记录，而不是现场档案。",
        "Vì du ký cũ được viết sau chuyến thăm, ta nên coi nó là ghi chép cá nhân chứ không phải hồ sơ tại chỗ.",
        "Tiền đề phải có bằng chứng; nếu còn tranh cãi, cần dùng ngôn ngữ giả thuyết thay vì 既然.",
      ),
      [G(87)]: grammar(
        "Dùng （由于）……因此…… để nêu quan hệ nhân quả được hỗ trợ và tách khỏi trùng hợp.",
        "由于两个样品的年代不同，因此单靠其中一个不能确定整座遗址的时期。",
        "Do niên đại hai mẫu khác nhau, chỉ dựa một mẫu không thể xác định thời kỳ của toàn di tích.",
        "Nguyên nhân chỉ hỗ trợ kết luận phương pháp; không tự xác định niên đại chính xác.",
      ),
      [G(88)]: grammar(
        "Dùng ……好…… để nêu mục đích của hành động thu thập hoặc trình bày bằng chứng.",
        "展板把考古记录和游记分开，好让参观者比较证据的来源与限制。",
        "Bảng trưng bày tách ghi chép khảo cổ và du ký để khách có thể so nguồn và giới hạn bằng chứng.",
        "Mục đích được nêu không chứng minh người xem thực tế đạt kết quả đó.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "研究者用地层、材料和多个样品共同判断古城遗址年代。",
        claimVi:
          "Nhà nghiên cứu dùng tầng đất, vật liệu và nhiều mẫu để cùng phán đoán niên đại thành cổ.",
        classification: "fact",
        sourceRef: ref(SOURCE.ancientSiteReading, "rp1", "rp2", "rp3"),
        rationaleVi:
          "Các loại bằng chứng và việc giữ bất định được nêu trực tiếp.",
        inferenceBoundaryVi:
          "Có thể mô tả phương pháp và khoảng niên đại, không tạo một năm chính xác nếu nguồn không có.",
      },
      {
        claimHanzi: "旧游记写得生动，所以其中每个古迹细节都完全可靠。",
        claimVi:
          "Du ký cũ viết sinh động nên mọi chi tiết di tích trong đó hoàn toàn đáng tin.",
        classification: "interpretation",
        sourceRef: ref(SOURCE.travelogueListening, "lp1", "lp2", "lp3"),
        rationaleVi:
          "Sự sinh động là đặc điểm văn bản; nguồn yêu cầu đối chiếu thời điểm, mục đích và bằng chứng vật chất.",
        inferenceBoundaryVi:
          "Du ký có thể cung cấp góc nhìn và giả thuyết, không thay thế hồ sơ khảo cổ.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(SOURCE.ancientSiteReading, "rp1", "rp2", "rp3"),
        promptVi:
          "Paraphrase cách xác định niên đại, giữ nhiều loại bằng chứng và khoảng bất định.",
        modelHanzi:
          "古城年代不是由一件遗物决定的。研究者把地层位置、材料特征和多个样品结果放在一起比较，因此只能提出有范围的判断，并保留样品差异带来的不确定性。",
        modelVi:
          "Niên đại thành cổ không do một di vật quyết định. Nhà nghiên cứu so vị trí tầng đất, đặc điểm vật liệu và kết quả nhiều mẫu, nên chỉ đưa phán đoán có khoảng và giữ độ bất định do khác biệt mẫu.",
        preservedFactsVi: [
          "Có hơn một loại bằng chứng.",
          "Các mẫu không hoàn toàn đồng nhất.",
          "Kết luận có phạm vi thay vì một mốc tuyệt đối.",
        ],
        prohibitedExpansionVi:
          "Không tạo niên đại chính xác hoặc nói tranh luận đã kết thúc.",
      },
      {
        sourceRef: ref(SOURCE.travelogueListening, "lp1", "lp2", "lp3"),
        promptVi:
          "Viết lại giá trị và giới hạn của du ký cũ trong nghiên cứu di tích.",
        modelHanzi:
          "旧游记保存了作者看到或听到的景象，可帮助研究者提出地点、用途和变化的假设。但文本受写作时间、个人目的和记忆影响，必须与地图、遗物和其他记录互相核对。",
        modelVi:
          "Du ký cũ lưu cảnh tác giả thấy hoặc nghe, giúp đặt giả thuyết về địa điểm, công dụng và thay đổi. Nhưng văn bản chịu ảnh hưởng thời điểm viết, mục đích cá nhân và ký ức, nên phải đối chiếu bản đồ, di vật và ghi chép khác.",
        preservedFactsVi: [
          "Du ký có giá trị gợi giả thuyết.",
          "Thời điểm, mục đích và ký ức tạo giới hạn.",
          "Cần đối chiếu nguồn khác.",
        ],
        prohibitedExpansionVi:
          "Không coi du ký là lời chứng trực tiếp hoàn hảo hoặc bác bỏ toàn bộ giá trị của nó.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt thứ bậc và chức năng của bằng chứng khảo cổ với du ký trong việc hiểu di tích.",
      requiredElementsVi: [
        "tầng đất, vật liệu và mẫu",
        "khoảng bất định",
        "giá trị gợi giả thuyết của du ký",
        "đối chiếu và giới hạn nguồn",
      ],
      evidenceRefs: [
        ref(SOURCE.ancientSiteReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.travelogueListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "判断古城年代时，研究者比较地层位置、材料特征和多个样品，而不是让一件遗物决定整座遗址。样品结果有差异，所以结论保留时间范围。旧游记则保存作者所见、所闻和当时解释，能帮助提出地点、用途或变化的假设；然而，它受写作时间、个人目的与记忆影响。两类材料功能不同：考古记录提供可复查的物质关系，游记补充历史视角。只有互相核对地图、遗物和其他记录，才能缩小解释，但仍不能消除全部不确定性。",
      modelVi:
        "Khi xác định niên đại thành cổ, nhà nghiên cứu so tầng đất, vật liệu và nhiều mẫu chứ không để một di vật quyết định toàn di tích. Mẫu khác nhau nên kết luận giữ khoảng thời gian. Du ký lưu điều tác giả thấy/nghe và cách giải thích lúc đó, giúp đặt giả thuyết, nhưng chịu thời điểm viết, mục đích, ký ức. Khảo cổ cho quan hệ vật chất có thể kiểm tra; du ký bổ sung góc nhìn. Đối chiếu bản đồ, di vật và ghi khác thu hẹp diễn giải nhưng không xóa hết bất định.",
      prohibitedExpansionVi:
        "Không xếp một nguồn là vô giá trị hoặc tuyệt đối đáng tin, và không tuyên bố niên đại ngoài khoảng nguồn.",
    },
    argument: {
      promptVi:
        "Lập luận: trong giới thiệu di tích cho công chúng, lời kể sinh động có nên được đặt ngang hàng với bằng chứng khảo cổ?",
      requiredElementsVi: [
        "phân biệt chức năng hai loại nguồn",
        "bằng chứng phương pháp khảo cổ",
        "giá trị và giới hạn du ký",
        "phản biện về khả năng thu hút công chúng",
        "đề xuất cách ghi nhãn mức chắc chắn",
      ],
      evidenceRefs: [
        ref(SOURCE.ancientSiteReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.travelogueListening, "lp1", "lp2", "lp3"),
      ],
      modelHanzi:
        "在公共介绍中，生动叙述可以与考古材料同时出现，但不应被标成同等强度的证据。遗址年代判断依靠地层、材料和多个样品的关系，结果还能被其他研究者复查；旧游记则提供作者的视角，帮助提出地点、用途和变化的假设，却受到写作时间、目的与记忆影响。有人担心如果展览只讲方法和不确定性，参观者会失去兴趣，因此需要故事。我同意故事能建立理解，但吸引力不能替代来源说明。展览可用游记开场，再明确标注“个人记录”“待核对解释”，并把相关地图、样品和不同结论放在旁边。这样既保留历史声音，也让观众看见证据层级。两份材料没有测试展示效果，所以我们只能提出透明标注原则，不能断言哪种叙事最能教育公众。",
      modelVi:
        "Trong giới thiệu công chúng, lời kể sinh động có thể xuất hiện cùng khảo cổ nhưng không được gắn cùng độ mạnh bằng chứng. Niên đại dựa tầng đất, vật liệu, nhiều mẫu và có thể kiểm tra lại; du ký cho góc nhìn và giả thuyết nhưng chịu thời điểm, mục đích, ký ức. Phản biện rằng chỉ nói phương pháp sẽ làm khách mất hứng là hợp lý: câu chuyện giúp tiếp cận, nhưng hấp dẫn không thay nhãn nguồn. Có thể mở bằng du ký, ghi rõ “ghi chép cá nhân/diễn giải cần đối chiếu” và đặt cạnh bản đồ, mẫu, kết luận khác. Nguồn chưa đo hiệu quả trưng bày nên chỉ hỗ trợ nguyên tắc minh bạch.",
      counterargumentVi:
        "Câu chuyện cá nhân sinh động giúp công chúng nhớ di tích; phân cấp quá nhiều có thể làm triển lãm khô và khó hiểu.",
      conclusionBoundaryVi:
        "Chỉ đề xuất trình bày song song có nhãn độ chắc chắn; chưa chứng minh thiết kế nào tạo học tập tốt nhất.",
    },
    spoken: {
      promptVi:
        "Bảo vệ thiết kế một bảng triển lãm kết hợp du ký và khảo cổ mà không đánh đồng mức bằng chứng.",
      requiredMovesVi: [
        "nêu nhãn cho mỗi loại nguồn",
        "dẫn một bằng chứng khảo cổ",
        "dẫn một giá trị của du ký",
        "trả lời lo ngại bảng quá khó hiểu",
      ],
      evidenceRefs: [
        ref(SOURCE.ancientSiteReading, "rp1", "rp2", "rp3"),
        ref(SOURCE.travelogueListening, "lp1", "lp2", "lp3"),
      ],
      modelOutlineHanzi: [
        "标题先区分“物质证据”和“个人历史记录”。",
        "考古部分展示地层、材料、样品和时间范围。",
        "游记部分展示作者视角以及需要核对的问题。",
        "用颜色标注已支持、可能和未知三种状态。",
        "故事负责引入，证据标签负责防止误解。",
      ],
      modelOutlineVi: [
        "Tiêu đề trước hết tách “bằng chứng vật chất” và “ghi chép lịch sử cá nhân”.",
        "Phần khảo cổ trình bày tầng đất, vật liệu, mẫu và khoảng thời gian.",
        "Phần du ký trình bày góc nhìn tác giả và câu hỏi cần đối chiếu.",
        "Dùng màu ghi ba trạng thái: được hỗ trợ, có thể, chưa biết.",
        "Câu chuyện làm phần dẫn; nhãn bằng chứng ngăn hiểu sai.",
      ],
    },
  },

  "hsk4-argument-logic-concession-lesson-04": {
    sourceTextIds: [
      SOURCE.historicalExhibitionReading,
      SOURCE.historicalStreetListening,
    ],
    grammarApplications: {
      [G(89)]: grammar(
        "Dùng 即使……也…… để giữ luận điểm qua một điều kiện nhượng bộ giả định, không bỏ qua chi tiết trái chiều.",
        "即使纪念展空间有限，也应说明哪些人物经历和争议没有被展示。",
        "Dù không gian triển lãm tưởng niệm có hạn, vẫn nên nói rõ trải nghiệm và tranh luận nào chưa được trưng bày.",
        "Vế nhượng bộ không cho phép coi giới hạn là không quan trọng; cần ghi tác động của nó.",
      ),
      [G(90)]: grammar(
        "Dùng 就是……也…… để nhấn một nguyên tắc trong điều kiện cực đoan, tránh tuyên bố đạo đức vượt nguồn.",
        "就是选择一种主要叙述，也要标出其他群体保存的不同记忆。",
        "Ngay cả khi chọn một tường thuật chính, vẫn phải đánh dấu ký ức khác do các nhóm khác lưu giữ.",
        "Nguyên tắc áp dụng cho thiết kế đang bàn, không tự trở thành nghĩa vụ phổ quát cho mọi trưng bày.",
      ),
      [G(91)]: grammar(
        "Dùng câu phức rút gọn không dấu nối khi quan hệ logic đã rõ, nhưng phải tránh làm mất tác nhân hoặc bằng chứng.",
        "材料越单一，历史人物越容易被讲成没有矛盾的英雄。",
        "Tư liệu càng đơn nhất, nhân vật lịch sử càng dễ bị kể thành anh hùng không mâu thuẫn.",
        "Quan hệ rút gọn vẫn là claim cần bằng chứng; hình thức ngắn không làm nó chắc chắn hơn.",
      ),
      [G(92)]: grammar(
        "Dùng 不……也…… để nêu kết quả vẫn có thể đạt khi thiếu một điều kiện, nhưng phải giữ điều kiện thay thế.",
        "展览不增加结论，也可以通过标注来源让观众看见不同解释。",
        "Triển lãm không cần thêm kết luận vẫn có thể giúp người xem thấy diễn giải khác bằng cách ghi nguồn.",
        "Không được xóa điều kiện thay thế “ghi nguồn”; thiếu một yếu tố không nghĩa không cần phương pháp nào.",
      ),
    },
    sourceAudits: [
      {
        claimHanzi: "纪念展在有限空间中选择了人物经历、作品和不同评价。",
        claimVi:
          "Triển lãm tưởng niệm chọn trải nghiệm, tác phẩm và các đánh giá khác nhau của nhân vật trong không gian hạn chế.",
        classification: "fact",
        sourceRef: ref(
          SOURCE.historicalExhibitionReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        rationaleVi:
          "Nguồn trực tiếp mô tả quyết định chọn nội dung và phần bị giới hạn.",
        inferenceBoundaryVi:
          "Có thể nói triển lãm thực hiện lựa chọn, chưa thể nói nó đại diện toàn bộ đời nhân vật.",
      },
      {
        claimHanzi: "一条街有多种记忆，说明历史事实完全由个人决定。",
        claimVi:
          "Một con phố có nhiều ký ức chứng tỏ sự thật lịch sử hoàn toàn do cá nhân quyết định.",
        classification: "interpretation",
        sourceRef: ref(
          SOURCE.historicalStreetListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        rationaleVi:
          "Nguồn phân biệt trải nghiệm nhóm và hồ sơ chung; đa góc nhìn không xóa sự kiện có thể kiểm tra.",
        inferenceBoundaryVi:
          "Có thể kết luận ý nghĩa và ký ức khác nhau, không kết luận mọi dữ kiện đều tương đối.",
      },
    ],
    paraphrases: [
      {
        sourceRef: ref(
          SOURCE.historicalExhibitionReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        promptVi:
          "Paraphrase vấn đề tuyển chọn của triển lãm, giữ giới hạn không gian và các góc nhìn bị bỏ sót.",
        modelHanzi:
          "纪念展必须在有限空间中选择人物经历、作品和评价。选择主线能帮助观众理解，但策展人还要说明未展示的时期、争议和来源，避免把部分叙述当成完整一生。",
        modelVi:
          "Triển lãm phải chọn trải nghiệm, tác phẩm và đánh giá trong không gian hạn chế. Tuyến chính giúp người xem hiểu, nhưng giám tuyển phải nói giai đoạn, tranh luận và nguồn chưa trưng bày để tránh coi một phần là cả cuộc đời.",
        preservedFactsVi: [
          "Không gian khiến việc tuyển chọn không tránh được.",
          "Có nhiều loại tư liệu và đánh giá.",
          "Phần không trưng bày tạo giới hạn.",
        ],
        prohibitedExpansionVi:
          "Không kết luận triển lãm cố ý che giấu hoặc đã bao quát toàn bộ nhân vật.",
      },
      {
        sourceRef: ref(
          SOURCE.historicalStreetListening,
          "lp1",
          "lp2",
          "lp3",
        ),
        promptVi:
          "Viết lại quan hệ giữa ký ức nhóm và hồ sơ lịch sử chung của con phố.",
        modelHanzi:
          "同一条街在居民、商户和参观者的记忆中意义不同，这些叙述补充了生活经验。它们需要与地图、日期和公共记录核对，多种记忆并不表示可查事实可以任意改变。",
        modelVi:
          "Cùng một phố mang ý nghĩa khác trong ký ức cư dân, người buôn và khách; các lời kể bổ sung trải nghiệm đời sống. Chúng cần đối chiếu bản đồ, ngày tháng và hồ sơ công; nhiều ký ức không có nghĩa dữ kiện kiểm tra được thay đổi tùy ý.",
        preservedFactsVi: [
          "Nhiều nhóm lưu ký ức khác nhau.",
          "Ký ức bổ sung trải nghiệm nhưng cần đối chiếu.",
          "Có hồ sơ chung làm điểm kiểm tra.",
        ],
        prohibitedExpansionVi:
          "Không dùng đa ký ức để phủ nhận sự kiện hoặc ép một nhóm đại diện cho tất cả.",
      },
    ],
    summary: {
      promptVi:
        "Tóm tắt cách triển lãm và ký ức đường phố xử lý nhiều góc nhìn mà vẫn giữ sự kiện kiểm tra được.",
      requiredElementsVi: [
        "giới hạn tuyển chọn triển lãm",
        "phần bị bỏ sót và nhãn nguồn",
        "nhiều nhóm ký ức",
        "đối chiếu hồ sơ chung",
      ],
      evidenceRefs: [
        ref(
          SOURCE.historicalExhibitionReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        ref(
          SOURCE.historicalStreetListening,
          "lp1",
          "lp2",
          "lp3",
        ),
      ],
      modelHanzi:
        "纪念展受空间限制，只能选择人物的部分经历、作品和评价；主线有助理解，却要标出未展示的时期、争议和来源。同一条历史街道也有居民、商户与参观者保存的不同记忆，它们补充生活经验，但仍需与地图、日期和公共记录核对。两份材料都区分“可查事件”和“群体解释”：前者不能随意改变，后者可以并列呈现。透明说明谁在讲、依据什么和遗漏什么，比假装只有一个完整故事更可靠。",
      modelVi:
        "Triển lãm bị giới hạn không gian nên chỉ chọn một phần trải nghiệm, tác phẩm, đánh giá; tuyến chính giúp hiểu nhưng phải ghi giai đoạn, tranh luận, nguồn chưa hiện. Phố lịch sử có ký ức khác của cư dân, người buôn, khách; chúng bổ sung trải nghiệm nhưng cần đối chiếu bản đồ, ngày, hồ sơ. Hai nguồn tách sự kiện có thể kiểm tra khỏi diễn giải nhóm: sự kiện không tùy ý đổi, diễn giải có thể đặt cạnh nhau. Minh bạch ai kể, dựa gì và bỏ gì đáng tin hơn giả vờ có một chuyện hoàn chỉnh.",
      prohibitedExpansionVi:
        "Không kết luận mọi diễn giải đều đúng như nhau hoặc một triển lãm có thể chứa toàn bộ lịch sử.",
    },
    argument: {
      promptVi:
        "Lập luận: sản phẩm lịch sử công cộng nên có một câu chuyện chính hay nhiều câu chuyện song song?",
      requiredElementsVi: [
        "lợi ích của tuyến chính",
        "rủi ro bỏ sót trong triển lãm",
        "giá trị nhiều ký ức phố",
        "phản biện về quá tải và mâu thuẫn",
        "đề xuất tầng thông tin và nhãn nguồn",
      ],
      evidenceRefs: [
        ref(
          SOURCE.historicalExhibitionReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        ref(
          SOURCE.historicalStreetListening,
          "lp1",
          "lp2",
          "lp3",
        ),
      ],
      modelHanzi:
        "历史产品可以有一条帮助理解的主线，但必须让其他有证据的叙述保持可见。纪念展空间有限，选择主要经历和作品能降低认知负担；如果不标出遗漏的时期、争议和来源，观众却容易把选择后的故事当成完整人生。历史街道的居民、商户和参观者保存不同记忆，这些声音补充公共记录无法呈现的生活经验。反对者会说，多条叙述互相矛盾，使观众不知道相信什么。解决办法不是删除差异，而是分层：第一层列共同日期和事件，第二层标明各群体解释，第三层提供来源与未解决问题。这样主线负责导航，证据标签负责限制。两份材料没有比较观众学习结果，所以不能断言层级设计最好，只能说它比隐藏选择更透明。",
      modelVi:
        "Sản phẩm lịch sử có thể có tuyến chính để dễ hiểu nhưng phải giữ các tường thuật có bằng chứng khác ở trạng thái nhìn thấy. Triển lãm hạn chế không gian; chọn trải nghiệm và tác phẩm giảm tải, song nếu không ghi phần bỏ sót, người xem dễ coi lựa chọn là cả đời nhân vật. Ký ức cư dân, người buôn, khách bổ sung kinh nghiệm mà hồ sơ công không có. Phản biện rằng nhiều chuyện mâu thuẫn gây rối nên được giải bằng tầng thông tin: tầng một sự kiện/ngày chung, tầng hai diễn giải nhóm, tầng ba nguồn và câu hỏi mở. Nguồn chưa đo kết quả học nên chỉ hỗ trợ minh bạch, không chứng minh thiết kế tối ưu.",
      counterargumentVi:
        "Một câu chuyện chính rõ ràng giúp công chúng hiểu và nhớ; nhiều giọng nói mâu thuẫn có thể gây quá tải hoặc hoài nghi mọi thứ.",
      conclusionBoundaryVi:
        "Chỉ đề xuất mô hình tầng thông tin cho hai bối cảnh; chưa có bằng chứng thực nghiệm về hiệu quả học tập của người xem.",
    },
    spoken: {
      promptVi:
        "Bảo vệ cấu trúc ba tầng cho một sản phẩm lịch sử công cộng và trả lời lo ngại nhiều giọng gây rối.",
      requiredMovesVi: [
        "nêu ba tầng",
        "phân biệt sự kiện và diễn giải",
        "dẫn triển lãm và ký ức phố",
        "nêu giới hạn chưa đo người xem",
      ],
      evidenceRefs: [
        ref(
          SOURCE.historicalExhibitionReading,
          "rp1",
          "rp2",
          "rp3",
        ),
        ref(
          SOURCE.historicalStreetListening,
          "lp1",
          "lp2",
          "lp3",
        ),
      ],
      modelOutlineHanzi: [
        "第一层列日期、地点和可核对的共同事件。",
        "第二层并列居民、商户、参观者和策展人的解释。",
        "第三层提供来源、遗漏和仍有争议的问题。",
        "主线帮助导航，多种记忆补充经验而不改写事实。",
        "尚未测量观众学习，所以需要试展和反馈。",
      ],
      modelOutlineVi: [
        "Tầng một liệt kê ngày, nơi và sự kiện chung có thể kiểm tra.",
        "Tầng hai đặt cạnh diễn giải của cư dân, người buôn, khách, giám tuyển.",
        "Tầng ba cung cấp nguồn, phần bỏ sót và câu hỏi còn tranh luận.",
        "Tuyến chính dẫn đường; nhiều ký ức bổ sung trải nghiệm nhưng không sửa dữ kiện.",
        "Chưa đo học tập người xem nên cần triển lãm thử và phản hồi.",
      ],
    },
  },
};

export const buildHsk4ArgumentLogicConcessionSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4InformationOrderCohesionSummaryArgumentPackBundle(root);
  assertValidHsk4InformationOrderCohesionSummaryArgumentPackBundle(
    prerequisite,
  );
  return buildHsk4SummaryArgumentModulePack({
    root,
    config: HSK4_ARGUMENT_LOGIC_CONCESSION_CONFIG,
    content: CONTENT,
    longFormHeadBundle: prerequisite.longFormHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4ArgumentLogicConcessionSummaryArgumentPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH,
  );
  const output = serializeHsk4SummaryArgumentModulePack(
    buildHsk4ArgumentLogicConcessionSummaryArgumentPack(root),
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
    HSK4_ARGUMENT_LOGIC_CONCESSION_SUMMARY_ARGUMENT_RELATIVE_PATH,
  );
  const output = serializeHsk4SummaryArgumentModulePack(
    buildHsk4ArgumentLogicConcessionSummaryArgumentPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error(
        "HSK4 argument/logic/concession summary-argument draft is stale",
      );
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_ARGUMENT_LOGIC_CONCESSION_CONFIG.lessonIds.length
    } HSK4 argument/logic/concession summary-argument lessons at ${
      outputPath
    }.`,
  );
}
