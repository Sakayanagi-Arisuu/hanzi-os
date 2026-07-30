import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4IntegrationStagePack,
  serializeHsk4IntegrationStagePack,
} from "./hsk4-integration-stage-builder.mjs";
import {
  HSK4_TIMED_SECTIONAL_REHEARSAL_CONFIG,
  HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH,
} from "../../src/content/hsk4TimedSectionalRehearsalIntegrationPack.mjs";
import {
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle,
  loadHsk4StructuredSpokenDefenseIntegrationPackBundle,
} from "../../src/content/hsk4StructuredSpokenDefenseIntegrationPack.mjs";

const readingRef = (textId) => ({
  textId,
  paragraphIds: ["rp1", "rp2", "rp3"],
});
const listeningRef = (textId) => ({
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
  reading: {
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
  writing: {
    unit: "hanzi",
    minimum: 180,
    maximum: 260,
    requiredSections: 5,
    revisionPasses: 2,
    minimumSources: 2,
  },
};

const supportingSkills = {
  listening: ["writing"],
  reading: ["writing"],
  speaking: ["listening"],
  writing: ["reading"],
};
const timeLimits = {
  listening: 180,
  reading: 180,
  speaking: 300,
  writing: 600,
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
}) => ({
  kind,
  primarySkill,
  supportingSkills: supportingSkills[primarySkill],
  promptVi,
  evidenceRefs,
  modelHanzi,
  modelVi,
  requiredMovesVi,
  scopeBoundaryVi,
  responseContract: responseContracts[primarySkill],
  timeLimitSeconds: timeLimits[primarySkill],
});

const SOURCE = {
  societyViewpointReading:
    "hsk4-society-economy-argument-viewpoint-synthesis:reading-01",
  societyViewpointListening:
    "hsk4-society-economy-argument-viewpoint-synthesis:listening-01",
  artsComparisonReading:
    "hsk4-arts-sports-exchange-critique-comparison-variation:reading-01",
  artsComparisonListening:
    "hsk4-arts-sports-exchange-critique-comparison-variation:listening-01",
  artsViewpointReading:
    "hsk4-arts-sports-exchange-critique-viewpoint-synthesis:reading-01",
  artsViewpointListening:
    "hsk4-arts-sports-exchange-critique-viewpoint-synthesis:listening-01",
  cultureComparisonReading:
    "hsk4-culture-history-interpretation-comparison-variation:reading-01",
  cultureComparisonListening:
    "hsk4-culture-history-interpretation-comparison-variation:listening-01",
  cultureViewpointReading:
    "hsk4-culture-history-interpretation-viewpoint-synthesis:reading-01",
  cultureViewpointListening:
    "hsk4-culture-history-interpretation-viewpoint-synthesis:listening-01",
  personalViewpointReading:
    "hsk4-personal-community-analysis-viewpoint-synthesis:reading-01",
  personalViewpointListening:
    "hsk4-personal-community-analysis-viewpoint-synthesis:listening-01",
};

const CONTENT = {
  "hsk4-timed-sectional-rehearsal-lesson-01": {
    sourceTextIds: [
      SOURCE.societyViewpointReading,
      SOURCE.societyViewpointListening,
      SOURCE.artsComparisonReading,
      SOURCE.artsComparisonListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Sau một lượt nghe, ghi bốn đến sáu note tách các chỉ số bị một kết luận đơn giản che khuất trong dịch vụ ngân hàng và lớp phân tích thi đấu.",
        evidenceRefs: [
          listeningRef(SOURCE.societyViewpointListening),
          listeningRef(SOURCE.artsComparisonListening),
        ],
        modelHanzi:
          "银行大厅排队减半，但电话等待变长，复杂业务办理也更久。线上课报名多、回看方便，线下课完成率和讨论时间较高；两组原有付费意愿与交通条件不同，不能用一个效果分数排序。",
        modelVi:
          "Hàng chờ sảnh ngân hàng giảm một nửa nhưng chờ điện thoại dài hơn và nghiệp vụ phức tạp lâu hơn. Lớp online đăng ký nhiều, xem lại thuận tiện; lớp trực tiếp hoàn thành/thảo luận cao hơn. Khác biệt sẵn có về trả phí và giao thông ngăn việc xếp bằng một điểm hiệu quả.",
        requiredMovesVi: [
          "Ghi hai chỉ số của dịch vụ ngân hàng.",
          "Ghi hai chỉ số của hai lớp học.",
          "Nêu một khác biệt mẫu so sánh.",
          "Khóa kết luận dùng một điểm duy nhất.",
        ],
        scopeBoundaryVi:
          "Note chỉ chứng minh hiểu nguồn nghe; thao tác ghi không tạo writing evidence và kết quả không đại diện mọi người dùng ngân hàng hoặc mô hình lớp học.",
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        promptVi:
          "Đọc hai văn bản và lập bảng bốn đến sáu note về mục tiêu, nhóm hưởng lợi, chỉ số bị thiếu và điều kiện làm thay đổi lựa chọn.",
        evidenceRefs: [
          readingRef(SOURCE.societyViewpointReading),
          readingRef(SOURCE.artsComparisonReading),
        ],
        modelHanzi:
          "共享市场的交易增加主要出现在高收入地区，运输距离也可能削弱环保收益。接力赛中，甲校前半程快，乙校在炎热和替补风险下更稳定。两个案例都要求按目标、群体和条件分别报告结果。",
        modelVi:
          "Giao dịch thị trường chia sẻ tăng chủ yếu ở vùng thu nhập cao, còn vận chuyển có thể giảm lợi ích môi trường. Trong tiếp sức, trường A nhanh nửa đầu, trường B ổn định hơn khi nóng và có rủi ro thay người. Cả hai phải báo theo mục tiêu, nhóm và điều kiện.",
        requiredMovesVi: [
          "Ghi mục tiêu khác nhau của thị trường.",
          "Ghi nhóm tham gia chưa đồng đều.",
          "So điều kiện hai kế hoạch thi đấu.",
          "Nêu giới hạn của một kết quả duy nhất.",
        ],
        scopeBoundaryVi:
          "Không suy ra thị trường chia sẻ thất bại toàn diện hoặc xoay vòng luôn tốt hơn; cả hai nguồn chỉ hỗ trợ kết luận có điều kiện.",
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "speaking",
        promptVi:
          "Chuẩn bị và nói trong thời gian giới hạn để bảo vệ một bảng chỉ số đa chiều cho dịch vụ số và lớp học, rồi phản hồi yêu cầu chỉ giữ một con số dễ truyền thông.",
        evidenceRefs: [
          listeningRef(SOURCE.societyViewpointListening),
          listeningRef(SOURCE.artsComparisonListening),
        ],
        modelHanzi:
          "一个数字便于宣传，却会隐藏问题转移。银行应同时报告大厅人数、电话等待、完成率和需要帮助者；课程应报告报名、完成、讨论、回看和交通成本。反对者担心指标太多，我建议先按目标分成“入口、持续参与、复杂支持”三组，而不是删除关键差异。现有材料没有证明哪种组合最优。",
        modelVi:
          "Một số dễ truyền thông nhưng che việc vấn đề chuyển kênh. Ngân hàng cần báo sảnh, điện thoại, hoàn tất, người cần trợ giúp; lớp học báo đăng ký, hoàn thành, thảo luận, xem lại, giao thông. Lo ngại quá nhiều chỉ số có thể giải bằng ba nhóm “tiếp cận, duy trì, hỗ trợ phức tạp”, không xóa khác biệt. Nguồn chưa chứng minh tổ hợp tối ưu.",
        requiredMovesVi: [
          "Nêu luận điểm chống một chỉ số duy nhất.",
          "Dẫn ít nhất hai chỉ số mỗi nguồn.",
          "Phản hồi lo ngại quá nhiều chỉ số.",
          "Kết bằng giới hạn chưa kiểm chứng.",
        ],
        scopeBoundaryVi:
          "Bản nói chỉ dùng hai nguồn nghe đã lộ để rehearsal; bản thu và rubric nháp không được dùng như speaking score hoặc listening mastery.",
      }),
      prompt({
        kind: "timed-skill-separated-mock-rehearsal",
        primarySkill: "writing",
        promptVi:
          "Viết 180–260 chữ Hán đề xuất cách đánh giá một chương trình công cộng có nhiều mục tiêu; dùng thị trường chia sẻ và hai kế hoạch tiếp sức, có phản biện cùng giới hạn.",
        evidenceRefs: [
          readingRef(SOURCE.societyViewpointReading),
          readingRef(SOURCE.artsComparisonReading),
        ],
        modelHanzi:
          "评价一个多目标项目时，我主张先按目标和受益群体分开指标，再作有条件的综合判断。共享工具市场六个月内交易增加，可是多数交易发生在高收入地区，长距离运输也未必减少总成本。因此，交易次数必须与经济节省、资源作用和参与公平并列。接力赛也说明平均速度不够：甲校前半程快，乙校在炎热天气中靠替补保持稳定，两队最后只差三秒。有人认为指标越多越难决定，我同意报告需要清楚，所以可以先列共同底线，再按情境列补充指标。不过，清楚不等于删掉分布、成本和风险。较合理的报告应说明谁在哪个维度受益、什么条件改变结果、哪些数据仍缺失。两个案例都来自有限时间和场景，不能证明这套框架适合所有公共项目。",
        modelVi:
          "Khi đánh giá chương trình nhiều mục tiêu, nên tách chỉ số theo mục tiêu/nhóm hưởng lợi rồi tổng hợp có điều kiện. Thị trường chia sẻ tăng giao dịch nhưng tập trung vùng thu nhập cao và vận chuyển xa chưa chắc giảm chi phí; phải đặt giao dịch cạnh tiết kiệm, tài nguyên, công bằng. Tiếp sức cho thấy tốc độ trung bình chưa đủ: A nhanh nửa đầu, B ổn định nhờ thay người lúc nóng, cách nhau ba giây. Có thể dùng chuẩn lõi và chỉ số bổ sung để báo cáo dễ hiểu, nhưng không xóa phân bố, chi phí, rủi ro. Hai trường hợp hẹp không chứng minh khung phù hợp mọi dự án.",
        requiredMovesVi: [
          "Nêu luận điểm đánh giá đa chiều.",
          "Dùng bằng chứng của thị trường chia sẻ.",
          "Dùng bằng chứng của cuộc tiếp sức.",
          "Phản hồi yêu cầu báo cáo đơn giản.",
          "Giới hạn phạm vi hai trường hợp.",
        ],
        scopeBoundaryVi:
          "Bài viết dùng nguồn đã lộ và model reveal để sửa, nên không phải form bí mật, không hiệu chuẩn cut score và không cấp writing mastery.",
      }),
    ],
  },
  "hsk4-timed-sectional-rehearsal-lesson-02": {
    sourceTextIds: [
      SOURCE.artsViewpointReading,
      SOURCE.artsViewpointListening,
      SOURCE.cultureComparisonReading,
      SOURCE.cultureComparisonListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Nghe hai nguồn và ghi bốn đến sáu note phân biệt lợi ích tiếp cận, độ sâu tương tác, rào cản tham gia và kết luận chưa thể gọi là tối ưu.",
        evidenceRefs: [
          listeningRef(SOURCE.artsViewpointListening),
          listeningRef(SOURCE.cultureComparisonListening),
        ],
        modelHanzi:
          "线上艺术交流覆盖城市多，也让偏远学生参加；线下合作更深、后续联系更多，却受名额和交通限制。国际班提供舞台、共同署名信和匿名留言，增加表达选择，但不能把三种方式固定归给某种文化。",
        modelVi:
          "Trao đổi nghệ thuật online phủ nhiều thành phố và cho học sinh xa tham gia; trực tiếp hợp tác sâu/liên hệ tiếp nhiều hơn nhưng hạn chế chỗ và giao thông. Lớp quốc tế cho sân khấu, thư chung, tin ẩn danh, tăng lựa chọn nhưng không gán cố định ba cách cho văn hóa.",
        requiredMovesVi: [
          "Ghi lợi ích tiếp cận của hình thức online.",
          "Ghi độ sâu và rào cản trực tiếp.",
          "Ghi ba cách biểu đạt của lớp quốc tế.",
          "Khóa kết luận văn hóa cố định.",
        ],
        scopeBoundaryVi:
          "Không gọi mô hình kết hợp là đáp án duy nhất và không giải thích mọi im lặng bằng văn hóa; cả hai nguồn nêu nhiều nguyên nhân và cần kiểm tra tiếp.",
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        promptVi:
          "Đọc hai nguồn rồi ghi bốn đến sáu note về tiêu chí thành công, điều kiện quan hệ/thời gian, ngoại lệ và thông tin người tham gia vẫn cần hỏi trực tiếp.",
        evidenceRefs: [
          readingRef(SOURCE.artsViewpointReading),
          readingRef(SOURCE.cultureComparisonReading),
        ],
        modelHanzi:
          "交流项目同时看胜率、表达、参与和长期联系，翻译机会却分配不均。家庭拜访要区分初次或熟人、白天或休息时间；条件表比固定禁令好，但仍需询问主人。两份材料都反对把差异排成单一高低。",
        modelVi:
          "Chương trình giao lưu xét thắng, biểu đạt, tham gia, liên hệ dài hạn nhưng hỗ trợ phiên dịch chưa đều. Thăm gia đình phải tách lần đầu/người quen, ban ngày/giờ nghỉ; bảng điều kiện hơn lệnh cấm nhưng vẫn phải hỏi chủ nhà. Cả hai chống xếp khác biệt thành một thứ bậc.",
        requiredMovesVi: [
          "Ghi đủ bốn chiều thành công giao lưu.",
          "Nêu nhóm có cơ hội chưa đồng đều.",
          "Ghi hai chiều điều kiện lễ nghi.",
          "Nêu việc vẫn phải hỏi trực tiếp.",
        ],
        scopeBoundaryVi:
          "Không kết luận mọi mục tiêu quan trọng như nhau trong mọi dự án hoặc mọi gia đình của một vùng dùng cùng một quy tắc thăm hỏi.",
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "speaking",
        promptVi:
          "Bảo vệ thiết kế nhiều kênh tham gia cho một hoạt động giao lưu và phản hồi ý kiến rằng một hình thức công khai duy nhất mới tạo được tinh thần chung.",
        evidenceRefs: [
          listeningRef(SOURCE.artsViewpointListening),
          listeningRef(SOURCE.cultureComparisonListening),
        ],
        modelHanzi:
          "共同目标不要求所有人用同一种方式参加。艺术交流中，线上扩大覆盖，线下增加材料体验和合作深度；国际班中，舞台发言、共同署名信和匿名留言让语言、时间与礼仪条件不同的人表达。统一公开活动确实容易形成可见气氛，但也可能让不能到场或不愿上台的人消失。较好的设计是共享主题、多种入口，并分别记录覆盖、互动和后续联系。",
        modelVi:
          "Mục tiêu chung không đòi mọi người tham gia cùng một cách. Online mở tiếp cận, trực tiếp tăng trải nghiệm/hợp tác; sân khấu, thư chung, ẩn danh cho người khác điều kiện ngôn ngữ, thời gian, lễ nghi biểu đạt. Một sự kiện công khai tạo không khí nhìn thấy nhưng có thể xóa người không đến/không lên sân khấu. Nên có chủ đề chung, nhiều cửa vào và đo riêng tiếp cận, tương tác, liên hệ.",
        requiredMovesVi: [
          "Nêu nguyên tắc mục tiêu chung nhiều kênh.",
          "Dẫn lợi ích và rào cản hai nguồn.",
          "Phản hồi lợi ích của hình thức công khai.",
          "Nêu chỉ số theo dõi riêng.",
        ],
        scopeBoundaryVi:
          "Không tuyên bố nhiều lựa chọn tự động tạo công bằng hoặc mô hình lai chắc chắn tốt; nguồn chỉ hỗ trợ thử và đo các rào cản khác nhau.",
      }),
      prompt({
        kind: "timed-skill-separated-mock-rehearsal",
        primarySkill: "writing",
        promptVi:
          "Viết 180–260 chữ Hán đề xuất hướng dẫn cho một chương trình giao lưu liên văn hóa: giữ tiêu chí chung nhưng điều chỉnh theo quan hệ, thời gian và cơ hội tham gia.",
        evidenceRefs: [
          readingRef(SOURCE.artsViewpointReading),
          readingRef(SOURCE.cultureComparisonReading),
        ],
        modelHanzi:
          "跨文化交流需要共同目标，但不等于统一行为。指南可分成“核心原则”和“情境选择”两层。排球交流中，体育组织看胜率，教育者看表达，接待家庭看长期联系；翻译只集中在正式讨论时，语言较弱者在晚餐中参与较少。因此，核心原则应包括安全、尊重和可理解的信息，评价则分别记录比赛、表达、参与与关系。家庭拜访材料也说明，初次或熟人、白天或休息时间会改变同一行为的意义。甲地重视提前确认，乙地熟人可以临时来，却仍要说明来意。反对者可能认为条件太多会让人无所适从，所以指南可以先给简短底线，再提供条件表，并提醒到访时询问主人。两个案例不能代表所有地区，只支持“共同原则加情境确认”比文明高低排名更可靠。",
        modelVi:
          "Giao lưu liên văn hóa cần mục tiêu chung nhưng không đồng nghĩa hành vi thống nhất. Hướng dẫn nên có “nguyên tắc lõi” và “lựa chọn theo bối cảnh”. Trao đổi bóng chuyền có tiêu chí thắng, biểu đạt, liên hệ; phiên dịch chưa đều, nên đánh giá tách thi đấu, biểu đạt, tham gia, quan hệ. Thăm hỏi cho thấy lần đầu/người quen và ngày/giờ nghỉ đổi ý nghĩa hành vi. Có thể cho chuẩn ngắn rồi bảng điều kiện và nhắc hỏi chủ nhà. Hai ca không đại diện mọi vùng; chỉ hỗ trợ nguyên tắc chung cộng xác nhận bối cảnh.",
        requiredMovesVi: [
          "Nêu cấu trúc hai tầng của hướng dẫn.",
          "Dùng bằng chứng từ giao lưu thể thao.",
          "Dùng bằng chứng từ lễ nghi thăm hỏi.",
          "Phản hồi lo ngại điều kiện quá phức tạp.",
          "Giới hạn phạm vi văn hóa và địa điểm.",
        ],
        scopeBoundaryVi:
          "Không biến hướng dẫn thành quy tắc quốc gia cố định, không xếp lễ nghi thành văn minh cao thấp và không coi số người tham gia là toàn bộ thành công.",
      }),
    ],
  },
  "hsk4-timed-sectional-rehearsal-lesson-03": {
    sourceTextIds: [
      SOURCE.cultureViewpointReading,
      SOURCE.cultureViewpointListening,
      SOURCE.personalViewpointReading,
      SOURCE.personalViewpointListening,
    ],
    promptUnits: [
      prompt({
        kind: "source-evidence-check",
        primarySkill: "listening",
        promptVi:
          "Nghe hai nguồn và ghi bốn đến sáu note tách sự kiện kiểm tra được, diễn giải nhóm, giá trị văn hóa, chi phí nguồn lực và phần còn thiếu đại diện.",
        evidenceRefs: [
          listeningRef(SOURCE.cultureViewpointListening),
          listeningRef(SOURCE.personalViewpointListening),
        ],
        modelHanzi:
          "历史街道有商业、生活和战争三种记忆，来源多却不自动一致，未保存照片和未受访居民仍是限制。京剧班保存学习与社区记忆，但报名少、宣传窄、空间有限；六周体验只能帮助本中心决定。",
        modelVi:
          "Phố lịch sử có ký ức thương mại, đời sống, chiến tranh; nhiều nguồn không tự thống nhất và ảnh/người chưa phỏng vấn vẫn là giới hạn. Lớp Kinh kịch giữ học tập/ký ức nhưng ít đăng ký, quảng bá hẹp, không gian hữu hạn; thử sáu tuần chỉ giúp trung tâm này quyết định.",
        requiredMovesVi: [
          "Ghi ba tuyến ký ức của con phố.",
          "Nêu giới hạn nguồn lịch sử.",
          "Ghi giá trị và chi phí lớp Kinh kịch.",
          "Giới hạn phạm vi thử sáu tuần.",
        ],
        scopeBoundaryVi:
          "Không suy ra mọi ký ức đúng như nhau, lớp ít người chắc chắn phải giữ hoặc hủy, hay kết quả một trung tâm đại diện toàn thành phố.",
      }),
      prompt({
        kind: "source-evidence-check",
        primarySkill: "reading",
        promptVi:
          "Đọc hai nguồn rồi ghi bốn đến sáu note về lựa chọn thông tin, câu hỏi hai phía, thỏa hiệp có thể đảo ngược và giới hạn của kết quả cuối.",
        evidenceRefs: [
          readingRef(SOURCE.cultureViewpointReading),
          readingRef(SOURCE.personalViewpointReading),
        ],
        modelHanzi:
          "纪念展选择贡献、争议、后果和未知，并让评价追到书信与政策记录。父女先提出培训、费用、风险和证据问题，再形成保留学籍、三个月服务和每月报告的安排。两种结果都是透明选择，不是完整历史或普遍家庭答案。",
        modelVi:
          "Triển lãm chọn đóng góp, tranh luận, hậu quả, điều chưa biết và truy đánh giá về thư/hồ sơ. Cha con hỏi đào tạo, chi phí, rủi ro, bằng chứng rồi chọn giữ chỗ học, phục vụ ba tháng, báo hàng tháng. Cả hai là lựa chọn minh bạch, không phải lịch sử đầy đủ hay đáp án gia đình phổ quát.",
        requiredMovesVi: [
          "Ghi cấu trúc bốn phần triển lãm.",
          "Nêu nguồn kiểm tra đánh giá.",
          "Ghi câu hỏi của cả cha và con.",
          "Nêu tính có điều kiện của thỏa hiệp.",
        ],
        scopeBoundaryVi:
          "Không gọi triển lãm là toàn bộ lịch sử và không biến thỏa hiệp của một gia đình thành lộ trình phù hợp cho mọi học sinh.",
      }),
      prompt({
        kind: "timed-rehearsal",
        primarySkill: "speaking",
        promptVi:
          "Trong phần nói có thời gian, bảo vệ một quy trình ra quyết định công khai cho nội dung văn hóa và trả lời phản biện rằng nhiều tiếng nói chỉ gây rối.",
        evidenceRefs: [
          listeningRef(SOURCE.cultureViewpointListening),
          listeningRef(SOURCE.personalViewpointListening),
        ],
        modelHanzi:
          "多种声音会增加信息量，但删除差异不等于更准确。历史街道可以先列共同日期和档案，再分别标明商户、居民与导游的解释；京剧课程也可以先承认文化记忆和空间成本，再用公开体验记录谁参加、为什么继续。反对者担心观众混乱，我建议用分层标签和明确期限组织信息。未采访者与短期试验仍要写在结论里。",
        modelVi:
          "Nhiều tiếng nói tăng thông tin, nhưng xóa khác biệt không làm chính xác hơn. Phố lịch sử có thể liệt kê ngày/hồ sơ chung rồi đánh nhãn diễn giải của thương nhân, cư dân, hướng dẫn; lớp Kinh kịch thừa nhận ký ức và chi phí rồi dùng trải nghiệm công khai ghi ai tham gia/vì sao tiếp tục. Lo ngại rối được xử lý bằng tầng nhãn và thời hạn rõ. Người chưa phỏng vấn/thử ngắn vẫn phải ghi.",
        requiredMovesVi: [
          "Nêu lợi ích và rủi ro nhiều tiếng nói.",
          "Dẫn cơ chế ghi nguồn của phố lịch sử.",
          "Dẫn cơ chế thử của lớp Kinh kịch.",
          "Phản hồi lo ngại gây rối.",
        ],
        scopeBoundaryVi:
          "Không nói đa thanh bảo đảm lịch sử đầy đủ hoặc sáu tuần chứng minh nhu cầu dài hạn; quy trình chỉ làm lựa chọn và giới hạn nhìn thấy được.",
      }),
      prompt({
        kind: "timed-skill-separated-mock-rehearsal",
        primarySkill: "writing",
        promptVi:
          "Viết 180–260 chữ Hán lập luận về một quy trình quyết định minh bạch: phải chọn tuyến chính nhưng vẫn giữ phản biện, câu hỏi và khả năng sửa quyết định.",
        evidenceRefs: [
          readingRef(SOURCE.cultureViewpointReading),
          readingRef(SOURCE.personalViewpointReading),
        ],
        modelHanzi:
          "公共决定常常需要一条主线，但主线必须让证据、反对意见和未知保持可见。我建议采用“问题—来源—暂时选择—复查条件”四步。纪念展空间有限，不能展示改革者的一切；策展组因此同时呈现学校贡献、有争议政策、当时批评和无法确定的动机，并让评价追到书信和政策记录。父女讨论将来时，也从各说计划转向提出培训、费用、风险与证据问题，最后选择保留入学资格、参加三个月项目和每月报告。有人担心保留太多反对意见会使决定不坚定，可是明确复查条件并不等于拒绝选择。相反，它说明什么新证据会改变安排。两个案例只支持透明、可修改的程序，不能证明同一主线或期限适合所有展览与家庭。",
        modelVi:
          "Quyết định công thường cần tuyến chính nhưng phải giữ bằng chứng, phản đối và điều chưa biết nhìn thấy. Quy trình bốn bước: câu hỏi–nguồn–lựa chọn tạm–điều kiện xem lại. Triển lãm hữu hạn nên trình bày đóng góp, chính sách tranh cãi, phê bình, động cơ chưa chắc và truy về hồ sơ. Cha con chuyển từ kế hoạch riêng sang hỏi đào tạo, phí, rủi ro, bằng chứng rồi giữ chỗ học, dự án ba tháng, báo tháng. Giữ phản biện không phải không quyết; điều kiện xem lại cho biết bằng chứng nào đổi quyết định. Hai ca không chứng minh một tuyến/thời hạn cho mọi nơi.",
        requiredMovesVi: [
          "Nêu quy trình quyết định bốn bước.",
          "Dùng bằng chứng từ triển lãm.",
          "Dùng bằng chứng từ đối thoại gia đình.",
          "Phản hồi lo ngại quyết định thiếu dứt khoát.",
          "Nêu giới hạn khả năng khái quát.",
        ],
        scopeBoundaryVi:
          "Bài rehearsal không phải form đánh giá độc lập vì nguồn và model nằm trong repository; mọi điểm, cut score và mastery claim vẫn bị khóa.",
      }),
    ],
  },
};

export const buildHsk4TimedSectionalRehearsalIntegrationPack = (
  root = process.cwd(),
) => {
  const prerequisite =
    loadHsk4StructuredSpokenDefenseIntegrationPackBundle(root);
  assertValidHsk4StructuredSpokenDefenseIntegrationPackBundle(
    prerequisite,
  );
  return buildHsk4IntegrationStagePack({
    root,
    config: HSK4_TIMED_SECTIONAL_REHEARSAL_CONFIG,
    content: CONTENT,
    summaryArgumentHeadBundle: prerequisite.summaryArgumentHeadBundle,
    prerequisitePackBundles: [prerequisite],
  });
};

export const writeHsk4TimedSectionalRehearsalIntegrationPack = (
  root = process.cwd(),
) => {
  const outputPath = resolve(
    root,
    HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4TimedSectionalRehearsalIntegrationPack(root),
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
    HSK4_TIMED_SECTIONAL_REHEARSAL_INTEGRATION_RELATIVE_PATH,
  );
  const output = serializeHsk4IntegrationStagePack(
    buildHsk4TimedSectionalRehearsalIntegrationPack(root),
  );
  if (check) {
    if (readFileSync(outputPath, "utf8") !== output) {
      throw new Error(
        "HSK4 timed sectional-rehearsal integration draft is stale",
      );
    }
  } else {
    writeFileSync(outputPath, output, "utf8");
  }
  console.log(
    `${check ? "Verified" : "Wrote"} ${
      HSK4_TIMED_SECTIONAL_REHEARSAL_CONFIG.lessonIds.length
    } HSK4 timed sectional-rehearsal integration lessons at ${
      outputPath
    }.`,
  );
}
