import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4LongFormDomainPack,
  serializeHsk4LongFormDomainPack,
} from "./hsk4-long-form-domain-builder.mjs";
import {
  HSK4_CULTURE_HISTORY_DOMAIN_ID,
  HSK4_CULTURE_HISTORY_LESSON_IDS,
  HSK4_CULTURE_HISTORY_LONG_FORM_CONFIG,
  HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH,
} from "../../src/content/hsk4CultureHistoryLongFormPack.mjs";
import {
  loadHsk4ArtsSportsExchangeLongFormPackBundle,
} from "../../src/content/hsk4ArtsSportsExchangeLongFormPack.mjs";

const V = (n) => `hsk-vocab-${String(n).padStart(5, "0")}`;
const VI_GLOSS_BY_SEQUENCE = {
  1265: "khích lệ", 1301: "lẫn nhau", 1481: "ngoài ra",
  1804: "ngược lại", 1989: "tôn trọng", 1408: "chính là",
  1517: "mục tiêu", 1844: "muối", 1908: "bánh trung thu",
  1946: "đáng; trị giá", 1015: "bảo đảm", 1266: "khách hàng",
  1378: "gọi là", 1594: "khác biệt", 1947: "đáng",
  1051: "buộc phải", 1231: "kịp", 1448: "rác",
  1731: "nhắc nhở", 1990: "khoảng; trái phải", 1187: "phương pháp",
  1333: "phóng viên", 1368: "tự hào", 1658: "thực tế",
  1985: "tổng kết", 1115: "chào hỏi", 1514: "mẹ và con gái",
  1620: "ngày tháng", 1764: "bữa tối", 1871: "vì thế",
  1048: "bất kể", 1118: "làm phiền", 1189: "phiên dịch",
  1446: "khó khăn", 1873: "ấn tượng", 1082: "trở thành",
  1375: "giáo sư", 1590: "chúc mừng", 1660: "thực ra",
  1803: "so với", 1008: "theo; căn cứ", 1263: "ước tính",
  1548: "phán đoán", 1692: "số lượng", 1944: "kiến thức",
  1227: "cảm giác", 1374: "giáo viên", 1589: "tình hình",
  1766: "thường", 1909: "đọc", 1192: "phản đối",
  1232: "cảm nhận", 1303: "nghi ngờ", 1410: "tổ chức",
  1520: "hiện nay", 1053: "bất kể", 1267: "cố ý",
  1379: "đường phố", 1806: "giống nhau", 1948: "trực tiếp",
};
const q = (kind, prompt, options, answer, evidence, rationale, boundary = null) =>
  [kind, prompt, options, answer, evidence, rationale, boundary];
const map = (nodes, relations) => ({ nodes, relations });
const D = HSK4_CULTURE_HISTORY_DOMAIN_ID;
const ID = {
  concept: `${D}-concept-actor-map`,
  process: `${D}-process-timeline`,
  cause: `${D}-cause-condition-result`,
  compare: `${D}-comparison-variation`,
  evidence: `${D}-claim-evidence-inference`,
  viewpoint: `${D}-viewpoint-synthesis`,
};

const CONTENT = {
  [ID.concept]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "同一句俗语为何有相反解释",
        titleVi: "Vì sao cùng một tục ngữ có diễn giải trái ngược",
        targetVocabularyIds: [V(1265), V(1301), V(1481), V(1804), V(1989)],
        paragraphs: [
          ["语言课讨论“慢工出细活”。一组认为它鼓励认真准备，另一组相反，担心它被用来反对及时行动。教师要求两组互相引用具体情境，而不是只重复自己的态度；另外还要说明谁说、对谁说。",
            "Lớp ngôn ngữ bàn câu 'làm chậm cho sản phẩm tinh'. Một nhóm cho rằng nó khích lệ chuẩn bị kỹ, nhóm khác ngược lại lo câu này bị dùng để phản đối hành động kịp thời. Giáo viên yêu cầu hai nhóm dẫn tình huống cụ thể của nhau, không chỉ lặp thái độ; ngoài ra phải nói ai nói với ai."],
          ["在学习手工时，这句话帮助学生尊重长期练习；在事故处理会上，同样的话却可能成为拖延理由。俗语本身没有自动决定行动，它的作用来自场景、说话者权力和听者需要。解释差异不是谁不懂中文，而是使用条件不同。",
            "Khi học thủ công, câu này giúp học sinh tôn trọng luyện tập dài; trong họp xử lý sự cố, cùng câu có thể thành lý do trì hoãn. Tục ngữ không tự quyết hành động; tác dụng đến từ bối cảnh, quyền lực người nói và nhu cầu người nghe. Khác biệt diễn giải không phải ai không hiểu tiếng Trung mà do điều kiện dùng khác."],
          ["课程最后建立角色图：说话者提出价值，听者判断风险，主持人记录场景。学生可以接受俗语的文化意义，也可以批评不合适的使用。尊重传统与分析权力并不相反，但一次课堂讨论不能代表各地所有理解。",
            "Cuối khóa lập bản đồ vai trò: người nói nêu giá trị, người nghe đánh giá rủi ro, chủ trì ghi bối cảnh. Học sinh có thể nhận ý nghĩa văn hóa và phê bình cách dùng không hợp. Tôn trọng truyền thống không trái phân tích quyền lực, nhưng một lớp không đại diện mọi cách hiểu địa phương."],
        ],
        questions: [
          q("main-claim", "Bài đọc giải thích nghĩa tục ngữ phụ thuộc vào đâu?", ["Bối cảnh, vai trò người nói và nhu cầu người nghe", "Một nghĩa cố định cho mọi lúc", "Số chữ trong câu", "Tuổi của giáo viên"], 0, ["rp1", "rp2", "rp3"], "Nguồn đặt câu nói trong quan hệ sử dụng."),
          q("supported-detail", "Trong tình huống nào câu nói có thể thành lý do trì hoãn?", ["Họp xử lý sự cố", "Học thủ công", "Đọc từ điển", "Buổi liên hoan"], 0, ["rp2"], "Đoạn hai nêu đối chiếu trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao hai cách hiểu không nhất thiết loại trừ nhau?", ["Câu nói khích lệ kỹ lưỡng ở một cảnh nhưng gây trì hoãn ở cảnh khác", "Hai nhóm dùng cùng sách", "Giáo viên ghi chép", "Có một tục ngữ"], 0, ["rp1", "rp2"], "Điều kiện khác làm đổi chức năng."),
          q("bounded-inference", "Có thể suy ra lợi ích ghi ai nói với ai?", ["Làm rõ quyền lực và rủi ro trong diễn giải", "Chứng minh một nhóm đúng mãi", "Xóa nghĩa văn hóa", "Thay thế tình huống"], 0, ["rp1", "rp3"], "Bản đồ vai trò gắn lời với quan hệ.", "Có thể suy ra mục tiêu phân tích ngữ dụng, chưa thể biết đầy đủ ý định nội tâm."),
          q("scope-limit", "Claim nào vượt nguồn?", ["Một lớp tìm thấy nhiều cách hiểu", "Mọi vùng đều hiểu tục ngữ giống lớp này", "Tôn trọng và phê bình có thể cùng tồn tại", "Bối cảnh làm đổi chức năng"], 1, ["rp3"], "Nguồn chủ động giới hạn đại diện."),
        ],
        noteMap: map([
          ["speaker", "Người nói", "Đưa giá trị và có vị trí quyền lực.", ["rp1", "rp3"]],
          ["listener", "Người nghe", "Đánh giá nhu cầu và rủi ro.", ["rp1", "rp3"]],
          ["craft", "Thủ công", "Chậm giúp luyện tập kỹ.", ["rp2"]],
          ["emergency", "Sự cố", "Chậm có thể thành trì hoãn.", ["rp2"]],
          ["scope", "Phạm vi", "Một lớp không đại diện mọi vùng.", ["rp3"]],
        ], [["speaker", "tác động tới", "listener"], ["craft", "ủng hộ một cách hiểu của", "speaker"], ["emergency", "đảo chức năng của", "speaker"], ["scope", "giới hạn", "listener"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "月饼里的盐与文化价值",
        titleVi: "Muối trong bánh trung thu và giá trị văn hóa",
        targetVocabularyIds: [V(1408), V(1517), V(1844), V(1908), V(1946)],
        paragraphs: [
          ["社区健康讲座讨论月饼。营养师的目标就是减少过量糖和盐，建议看配料与份量；文化研究者关注团圆、赠礼和家庭记忆，认为月饼的价值不能只用营养数字计算。两人讨论同一种食物，却承担不同任务。",
            "Buổi sức khỏe cộng đồng bàn bánh trung thu. Mục tiêu của chuyên gia dinh dưỡng chính là giảm quá nhiều đường/muối, khuyên xem thành phần và khẩu phần; nhà nghiên cứu văn hóa chú ý đoàn viên, quà tặng, ký ức gia đình, cho rằng giá trị bánh không chỉ tính bằng số dinh dưỡng. Hai người bàn một món nhưng nhiệm vụ khác."],
          ["听众最初以为双方互相反对。主持人请营养师说明“少吃”不等于取消节日，也请研究者承认传统配方会随健康知识变化。讨论把选择分为食用量、配方、赠送方式和象征意义四层。",
            "Người nghe ban đầu tưởng hai bên đối lập. Chủ trì yêu cầu chuyên gia nói 'ăn ít' không phải hủy lễ, và nhà nghiên cứu thừa nhận công thức truyền thống đổi theo kiến thức sức khỏe. Thảo luận chia lựa chọn thành lượng ăn, công thức, cách tặng và ý nghĩa biểu tượng."],
          ["讲座后，参与者更愿意选择小份，也没有减少与家人分享。结果支持健康目标和文化实践可以协调，但问卷只在一个社区完成，且没有测量长期饮食。角色图解决概念冲突，不证明所有配方都同样健康。",
            "Sau buổi nói chuyện, người tham gia sẵn sàng chọn phần nhỏ hơn mà không giảm chia sẻ gia đình. Kết quả hỗ trợ mục tiêu sức khỏe và thực hành văn hóa có thể phối hợp, nhưng khảo sát chỉ ở một cộng đồng và chưa đo ăn uống dài hạn. Bản đồ vai trò giải quyết xung đột khái niệm, không chứng minh mọi công thức đều khỏe như nhau."],
        ],
        questions: [
          q("main-claim", "Bài nghe phân biệt hai vai trò nào?", ["Đánh giá dinh dưỡng và diễn giải giá trị văn hóa", "Bán bánh và vận chuyển", "Dạy chữ và thi đấu", "Nấu ăn và y tế cấp cứu"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách nhiệm vụ rồi phối hợp."),
          q("supported-detail", "Thảo luận chia lựa chọn thành bao nhiêu tầng?", ["Bốn", "Hai", "Sáu", "Một"], 0, ["lp2"], "Đoạn hai liệt kê bốn tầng."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy giảm khẩu phần không xóa chia sẻ?", ["Người tham gia chọn phần nhỏ hơn nhưng vẫn chia sẻ với gia đình", "Có muối trong công thức", "Nhà nghiên cứu tham dự", "Buổi nói chuyện ở cộng đồng"], 0, ["lp1", "lp3"], "Mục tiêu sức khỏe và văn hóa được theo dõi riêng."),
          q("bounded-inference", "Có thể suy ra vì sao tách lượng ăn khỏi ý nghĩa?", ["Cho phép sửa hành vi sức khỏe mà không phủ nhận biểu tượng", "Bảo đảm mọi bánh khỏe", "Xóa quà tặng", "Tăng muối"], 0, ["lp1", "lp2"], "Bốn tầng tránh đánh đồng hai loại claim.", "Có thể suy ra lợi ích khái niệm, chưa có bằng chứng dinh dưỡng dài hạn."),
          q("scope-limit", "Kết luận nào quá rộng?", ["Hai mục tiêu có thể phối hợp trong mẫu", "Mọi công thức bánh đều tốt cho sức khỏe", "Khảo sát chỉ một cộng đồng", "Chưa đo dài hạn"], 1, ["lp3"], "Nguồn không đồng nhất mọi công thức."),
        ],
        noteMap: map([
          ["nutrition", "Dinh dưỡng", "Đường, muối và lượng ăn.", ["lp1", "lp2"]],
          ["culture", "Văn hóa", "Đoàn viên, quà và ký ức.", ["lp1", "lp2"]],
          ["moderator", "Chủ trì", "Tách các tầng lựa chọn.", ["lp2"]],
          ["outcome", "Kết quả", "Phần nhỏ hơn, chia sẻ không giảm.", ["lp3"]],
          ["limit", "Giới hạn", "Một cộng đồng và thiếu đo dài hạn.", ["lp3"]],
        ], [["moderator", "phối hợp", "nutrition"], ["moderator", "phối hợp", "culture"], ["outcome", "hỗ trợ hẹp", "nutrition"], ["limit", "giới hạn", "outcome"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh cách diễn giải tục ngữ và món ăn truyền thống; nêu vai trò, bối cảnh, giá trị và giới hạn.",
      requiredElements: ["hai bối cảnh tục ngữ", "người nói/người nghe", "dinh dưỡng bánh", "ý nghĩa đoàn viên", "giới hạn mẫu"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "“慢工出细活”在手工学习中鼓励认真，在事故处理中却可能成为拖延理由，所以解释要记录谁对谁说、场景和权力，尊重俗语不等于接受所有使用。月饼讨论也分角色：营养师关心糖、盐和份量，文化研究者关心团圆、赠礼与记忆。主持人把食用量、配方、赠送和象征分开，使参与者选择小份时仍可分享。两份材料都说明传统意义不是固定命令，而要在具体需要中解释；课堂和问卷范围有限，不能代表所有地区或证明所有配方健康。",
      modelVi: "Câu 'làm chậm cho sản phẩm tinh' khích lệ kỹ trong học thủ công nhưng có thể thành trì hoãn khi xử lý sự cố, nên cần ghi ai nói với ai, bối cảnh và quyền lực; tôn trọng tục ngữ không có nghĩa chấp nhận mọi cách dùng. Bánh trung thu cũng tách vai: dinh dưỡng quan tâm đường, muối, khẩu phần; văn hóa nhìn đoàn viên, quà, ký ức. Chủ trì tách lượng ăn, công thức, tặng và biểu tượng, giúp chọn phần nhỏ vẫn chia sẻ. Cả hai cho thấy truyền thống không là mệnh lệnh cố định; lớp học và khảo sát hẹp, không đại diện mọi vùng hay chứng minh mọi công thức khỏe.",
    },
  },
  [ID.process]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "一家传统点心店怎样改变",
        titleVi: "Một tiệm bánh truyền thống thay đổi thế nào",
        targetVocabularyIds: [V(1015), V(1266), V(1378), V(1594), V(1947)],
        paragraphs: [
          ["老街有一家叫作“春和”的点心店，三代人使用同一配方。年轻顾客减少后，店主保证保留核心味道，同时记录他们不购买的原因。访谈显示，包装太大、成分不清和营业时间短各自影响不同人。",
            "Phố cũ có tiệm bánh tên Xuân Hòa, ba thế hệ dùng cùng công thức. Khi khách trẻ giảm, chủ bảo đảm giữ vị lõi và ghi lý do họ không mua. Phỏng vấn cho thấy gói quá lớn, thành phần không rõ và giờ bán ngắn ảnh hưởng các nhóm khác nhau."],
          ["第二年，店里先推出小包装并标明原料，之后延长周末时间。销售恢复，但传统顾客担心品牌变得普通。店主用两种颜色区别经典和改良产品，并邀请老人比较味道，而不是把所有变化一次完成。",
            "Năm hai, tiệm ra gói nhỏ và ghi nguyên liệu, sau đó kéo dài giờ cuối tuần. Bán hàng hồi phục nhưng khách truyền thống lo thương hiệu trở nên bình thường. Chủ dùng hai màu phân biệt sản phẩm kinh điển và cải tiến, mời người lớn tuổi so vị, không làm mọi thay đổi cùng lúc."],
          ["第三年数据显示，小包装吸引新顾客，经典产品销量基本不变。团队认为改变值得继续，却只对这家店和三年观察负责。过程不是“传统或现代”的一次选择，而是保留、试验、区分和再次测量。",
            "Dữ liệu năm ba cho thấy gói nhỏ hút khách mới, doanh số dòng kinh điển gần không đổi. Nhóm cho rằng thay đổi đáng tiếp tục nhưng chỉ chịu trách nhiệm cho một tiệm và ba năm quan sát. Quá trình không phải chọn một lần 'truyền thống hay hiện đại' mà là giữ, thử, phân biệt và đo lại."],
        ],
        questions: [
          q("main-claim", "Dòng thời gian của tiệm thể hiện cách đổi nào?", ["Giữ lõi, thử từng thay đổi, phân biệt dòng và đo lại", "Thay toàn bộ công thức ngay", "Bỏ khách cũ", "Chỉ đổi tên"], 0, ["rp1", "rp2", "rp3"], "Nguồn mô tả chu kỳ kiểm soát."),
          q("supported-detail", "Hai màu bao bì dùng để làm gì?", ["Phân biệt sản phẩm kinh điển và cải tiến", "Tăng lượng đường", "Giảm giờ mở cửa", "Đổi tên tiệm"], 0, ["rp2"], "Đây là chức năng trực tiếp."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy thu hút khách mới chưa làm mất khách cũ trong mẫu?", ["Gói nhỏ hút khách mới còn dòng kinh điển gần không đổi", "Tiệm có ba thế hệ", "Người già nếm thử", "Có nguyên liệu"], 0, ["rp2", "rp3"], "Thiết kế phân dòng và kết quả doanh số liên kết."),
          q("bounded-inference", "Có thể suy ra lợi ích thay đổi từng bước?", ["Dễ gắn kết quả với từng can thiệp hơn", "Bảo đảm mọi tiệm thành công", "Xóa phản đối", "Không cần phỏng vấn"], 0, ["rp1", "rp2"], "Quá trình giữ mốc so và thứ tự.", "Có thể suy ra lợi ích truy nguyên, chưa loại được mọi thay đổi thị trường."),
          q("scope-limit", "Claim nào vượt nguồn?", ["Thay đổi đáng tiếp tục ở tiệm này", "Mọi tiệm truyền thống nên sao chép đúng quy trình", "Dòng kinh điển không giảm rõ trong ba năm", "Gói nhỏ hút khách mới"], 1, ["rp3"], "Nguồn giới hạn một tiệm."),
        ],
        noteMap: map([
          ["baseline", "Ban đầu", "Công thức cũ và khách trẻ giảm.", ["rp1"]],
          ["reasons", "Nguyên nhân", "Gói, thông tin và giờ bán.", ["rp1"]],
          ["changes", "Thử nghiệm", "Gói nhỏ, nhãn và giờ cuối tuần.", ["rp2"]],
          ["separation", "Phân dòng", "Màu khác cho cổ điển và cải tiến.", ["rp2"]],
          ["outcome", "Năm ba", "Khách mới tăng, dòng cũ ổn định.", ["rp3"]],
        ], [["reasons", "dẫn tới", "changes"], ["separation", "làm rõ", "changes"], ["changes", "được đo bằng", "outcome"], ["baseline", "so với", "outcome"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "节日灯会为何不得不改时间",
        titleVi: "Vì sao lễ hội đèn buộc phải đổi thời gian",
        targetVocabularyIds: [V(1051), V(1231), V(1448), V(1731), V(1990)],
        paragraphs: [
          ["河城灯会原来晚上八点左右开始，游客赶上下班后入场。近年人数增加，清洁队发现夜里垃圾集中，末班车也过于拥挤。交通部门提醒主办方，若不改变散场方式，安全风险会继续上升。",
            "Lễ hội đèn Hà Thành vốn bắt đầu khoảng tám giờ tối để khách kịp đến sau giờ làm. Gần đây người tăng, đội vệ sinh thấy rác tập trung ban đêm và chuyến xe cuối quá đông. Giao thông nhắc ban tổ chức rằng nếu không đổi cách tan hội, rủi ro an toàn sẽ tăng."],
          ["第二年，灯会不得不提前一小时，并把表演分成两轮。主办方增加垃圾回收点，车站也延长服务。早到家庭增加，但部分夜班工人赶不上第一轮；一个问题缓解时，另一个群体受到影响。",
            "Năm hai, lễ hội buộc phải sớm một giờ và chia biểu diễn hai lượt. Ban tổ chức thêm điểm thu rác, ga kéo dài phục vụ. Gia đình đến sớm tăng nhưng một số người làm ca đêm không kịp lượt đầu; khi một vấn đề giảm, nhóm khác bị ảnh hưởng."],
          ["第三年保留两轮，并允许晚班工人预约第二轮。垃圾量按每千人计算后下降，末班车拥挤也减轻。不过天气比前一年好，不能把全部改善都归给时间调整。节日变化包含安全、清洁和参与公平三条线。",
            "Năm ba giữ hai lượt và cho người ca đêm đặt lượt sau. Rác tính theo mỗi nghìn người giảm, chuyến cuối bớt đông. Tuy nhiên thời tiết tốt hơn năm trước nên chưa thể quy toàn bộ cải thiện cho đổi giờ. Thay đổi lễ hội gồm ba tuyến: an toàn, vệ sinh và công bằng tham gia."],
        ],
        questions: [
          q("main-claim", "Bài nghe trình bày quá trình cân bằng nào?", ["An toàn, vệ sinh và cơ hội tham gia", "Chỉ tăng số đèn", "Chỉ giảm khách", "Bỏ giao thông công cộng"], 0, ["lp1", "lp2", "lp3"], "Nguồn theo ba outcome."),
          q("supported-detail", "Ai có thể không kịp lượt đầu?", ["Người làm ca đêm", "Gia đình đến sớm", "Đội vệ sinh", "Nhân viên ga"], 0, ["lp2"], "Đây là tác động phân bố."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy phương án được sửa sau phản hồi?", ["Người ca đêm lỡ lượt đầu nên năm ba có đặt lượt sau", "Rác xuất hiện", "Lễ bắt đầu buổi tối", "Thời tiết tốt"], 0, ["lp2", "lp3"], "Hai năm nối vấn đề với điều chỉnh."),
          q("bounded-inference", "Có thể suy ra vì sao tính rác theo mỗi nghìn người?", ["Điều chỉnh theo số khách khi so các năm", "Tăng lượng rác", "Bỏ dọn dẹp", "Đếm thời tiết"], 0, ["lp1", "lp3"], "Số người thay đổi giữa các kỳ.", "Có thể suy ra mục tiêu chuẩn hóa, chưa loại ảnh hưởng của loại rác hay thời tiết."),
          q("scope-limit", "Kết luận nào quá rộng?", ["Ùn chuyến cuối giảm trong năm ba", "Đổi giờ gây ra toàn bộ cải thiện", "Thời tiết là yếu tố cạnh tranh", "Có ba mục tiêu cần theo dõi"], 1, ["lp3"], "Nguồn nêu thời tiết khác."),
        ],
        noteMap: map([
          ["baseline", "Lịch cũ", "Khoảng tám giờ và một lượt.", ["lp1"]],
          ["risks", "Rủi ro", "Rác tập trung và chuyến cuối đông.", ["lp1"]],
          ["first-change", "Năm hai", "Sớm hơn và chia hai lượt.", ["lp2"]],
          ["access-gap", "Khoảng trống", "Người ca đêm lỡ lượt đầu.", ["lp2"]],
          ["second-change", "Năm ba", "Đặt lượt sau và đo chuẩn hóa.", ["lp3"]],
        ], [["risks", "làm đổi", "baseline"], ["first-change", "phản hồi", "risks"], ["access-gap", "sửa tiếp bởi", "second-change"], ["second-change", "mở rộng", "first-change"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán tổng hợp hai quá trình đổi truyền thống; nêu dữ liệu đầu vào, thử từng bước, nhóm bị ảnh hưởng và phạm vi.",
      requiredElements: ["tiệm ba thế hệ", "gói/dòng sản phẩm", "giờ lễ hội", "người ca đêm", "giới hạn khái quát"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "传统点心店没有一次换掉配方，而是根据顾客意见先试小包装、原料标签和周末时间，再用颜色区别经典与改良产品。三年后新顾客增加，经典销量基本稳定，但结论只适用于一家店。灯会也从垃圾和末班车风险出发，提前时间并分两轮；夜班工人赶不上后，又增加第二轮预约。按人数计算的垃圾和拥挤改善，不过天气也更好。两种传统都通过保留核心、分步试验和观察不同群体来变化，不能把局部经验写成所有店铺或节日的固定办法。",
      modelVi: "Tiệm truyền thống không thay công thức một lần mà dựa ý kiến khách để thử gói nhỏ, nhãn nguyên liệu, giờ cuối tuần, rồi dùng màu phân biệt dòng cũ/mới. Sau ba năm khách mới tăng, dòng kinh điển gần ổn, nhưng chỉ là một tiệm. Lễ hội đèn từ rác và chuyến cuối đông đã sớm giờ, chia hai lượt; khi người ca đêm lỡ thì thêm đặt lượt sau. Rác chuẩn hóa và ùn giảm nhưng thời tiết cũng tốt. Cả hai truyền thống đổi bằng giữ lõi, thử từng bước và quan sát nhóm khác nhau, không biến kinh nghiệm cục bộ thành công thức cho mọi tiệm/lễ.",
    },
  },
  [ID.cause]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "传统戏曲观众为何增加",
        titleVi: "Vì sao khán giả hí khúc truyền thống tăng",
        targetVocabularyIds: [V(1187), V(1333), V(1368), V(1658), V(1985)],
        paragraphs: [
          ["青州剧院用新方法推广传统戏曲：演出前提供十分钟角色介绍，周末票价降低，并邀请记者拍后台。观众人数半年内增加，演员为年轻人感到骄傲。最初总结把增长全部归给角色介绍。",
            "Nhà hát Thanh Châu dùng phương pháp mới quảng bá hí khúc: giới thiệu nhân vật mười phút trước diễn, giảm vé cuối tuần và mời phóng viên quay hậu trường. Khán giả tăng trong nửa năm, diễn viên tự hào về người trẻ. Tổng kết đầu quy toàn bộ tăng trưởng cho phần giới thiệu."],
          ["实际日期表明，角色介绍、降价和报道在同一月开始。问卷中，新观众既提到听懂故事，也提到低价和短视频。老观众人数基本不变，增长主要来自学生。三个条件时间接近，无法只选一个原因。",
            "Ngày thực tế cho thấy giới thiệu nhân vật, giảm giá và đưa tin bắt đầu cùng tháng. Trong khảo sát, khách mới nhắc cả hiểu truyện, vé rẻ và video ngắn. Khách cũ gần không đổi; tăng chủ yếu từ học sinh. Ba điều kiện gần thời gian nên chưa chọn một nguyên nhân."],
          ["下一季剧院将在不同周轮换介绍和票价优惠，并分别记录视频来源。报告改写为“多项措施与学生观众增加同时出现”。这支持继续试验，也尊重戏曲价值，但不能证明任何一种方法单独造成复兴。",
            "Mùa sau nhà hát luân phiên giới thiệu và ưu đãi vé theo tuần, ghi riêng nguồn video. Báo cáo sửa thành 'nhiều biện pháp xuất hiện cùng tăng khán giả học sinh'. Điều này hỗ trợ thử tiếp và tôn trọng giá trị hí khúc, nhưng chưa chứng minh một phương pháp riêng gây phục hưng."],
        ],
        questions: [
          q("main-claim", "Bài đọc sửa giải thích tăng khán giả ra sao?", ["Từ một nguyên nhân sang nhiều biện pháp cùng thời điểm", "Từ học sinh sang khách cũ", "Từ dữ liệu sang tự hào", "Từ hí khúc sang phim"], 0, ["rp1", "rp2", "rp3"], "Nguồn thêm giá và truyền thông."),
          q("supported-detail", "Nhóm nào tạo phần lớn tăng trưởng?", ["Học sinh", "Khán giả cũ", "Phóng viên", "Diễn viên"], 0, ["rp2"], "Đoạn hai nêu phân bố."),
          q("cross-paragraph-evidence", "Vì sao chưa thể gán tăng trưởng riêng cho phần giới thiệu?", ["Giảm giá và video bắt đầu cùng lúc, khách mới nhắc cả ba", "Diễn viên tự hào", "Có cuối tuần", "Khách cũ không đổi"], 0, ["rp1", "rp2"], "Can thiệp trùng thời điểm và phản hồi đa nguyên nhân."),
          q("bounded-inference", "Có thể suy ra lợi ích luân phiên biện pháp theo tuần?", ["Tạo biến thiên để so đóng góp tương đối", "Bảo đảm hí khúc phục hưng", "Xóa khách cũ", "Không cần khảo sát"], 0, ["rp2", "rp3"], "Thiết kế mới tách thời điểm.", "Có thể suy ra mục tiêu phân rã nguyên nhân, chưa phải thử nghiệm ngẫu nhiên đầy đủ."),
          q("scope-limit", "Claim nào quá rộng?", ["Khán giả học sinh tăng trong mẫu", "Giới thiệu nhân vật một mình gây phục hưng", "Nhiều biện pháp cùng xuất hiện", "Cần thử tiếp"], 1, ["rp3"], "Nguồn bác nguyên nhân duy nhất."),
        ],
        noteMap: map([
          ["intro", "Giới thiệu", "Mười phút giải thích nhân vật.", ["rp1"]],
          ["price", "Giá vé", "Ưu đãi cuối tuần.", ["rp1", "rp2"]],
          ["media", "Truyền thông", "Phóng viên và video hậu trường.", ["rp1", "rp2"]],
          ["outcome", "Kết quả", "Khán giả học sinh tăng.", ["rp2"]],
          ["next", "Kiểm tra", "Luân phiên biện pháp theo tuần.", ["rp3"]],
        ], [["intro", "có thể góp vào", "outcome"], ["price", "có thể góp vào", "outcome"], ["media", "có thể góp vào", "outcome"], ["next", "tách", "intro"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一顿地方晚餐怎样成为传统",
        titleVi: "Một bữa tối địa phương trở thành truyền thống thế nào",
        targetVocabularyIds: [V(1115), V(1514), V(1620), V(1764), V(1871)],
        paragraphs: [
          ["山村每年秋收后举行共同晚餐，主持人说习俗已有两百年。母女家庭负责迎客和打招呼，年轻人按旧日期准备。游客因此把晚餐看成从未变化的古老传统。",
            "Làng núi tổ chức bữa tối chung sau thu hoạch mỗi năm; chủ trì nói phong tục có hai trăm năm. Các gia đình mẹ-con gái đón khách và chào hỏi, người trẻ chuẩn bị theo ngày cũ. Du khách vì thế xem bữa tối như truyền thống cổ chưa từng đổi."],
          ["村史记录却显示，共同晚餐约八十年前才出现，最初是灾后共享粮食；固定日期是四十年前交通改善后确定的。母女迎客也不是唯一形式，过去由不同家庭轮流。传统连续存在，但具体做法分阶段形成。",
            "Lịch sử làng cho thấy bữa tối chung xuất hiện khoảng 80 năm trước, ban đầu để chia lương thực sau thiên tai; ngày cố định chỉ định 40 năm trước khi giao thông tốt hơn. Mẹ-con gái đón khách cũng không phải hình thức duy nhất; trước đây các gia đình luân phiên. Truyền thống liên tục nhưng cách cụ thể hình thành theo giai đoạn."],
          ["村民决定在介绍牌上同时写口述记忆和档案日期，并恢复轮流迎客。这个选择不否定晚餐的文化意义，而是把“古老”拆成起源、变化和当代认同。一个村的记录不能代表所有地方传统。",
            "Dân làng quyết định bảng giới thiệu ghi cả ký ức kể miệng và ngày trong hồ sơ, đồng thời khôi phục luân phiên đón khách. Lựa chọn không phủ nhận ý nghĩa bữa tối mà tách 'cổ xưa' thành nguồn gốc, thay đổi và đồng thuận hiện nay. Hồ sơ một làng không đại diện mọi truyền thống địa phương."],
        ],
        questions: [
          q("main-claim", "Bài nghe giải thích truyền thống theo cách nào?", ["Liên tục về ý nghĩa nhưng thực hành hình thành theo nhiều giai đoạn", "Mọi chi tiết tồn tại hai trăm năm", "Hồ sơ xóa ký ức", "Chỉ ngày tháng quan trọng"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách nguồn gốc, thay đổi và nhận diện."),
          q("supported-detail", "Bữa tối chung bắt đầu khoảng khi nào?", ["Khoảng tám mươi năm trước", "Hai trăm năm trước chính xác", "Mười năm trước", "Bốn mươi ngày trước"], 0, ["lp2"], "Đây là mốc trong hồ sơ."),
          q("cross-paragraph-evidence", "Chi tiết nào bác ý tưởng phong tục không đổi?", ["Ngày cố định và cách đón khách xuất hiện hoặc thay đổi ở các giai đoạn khác", "Có khách du lịch", "Có bữa tối", "Người trẻ chuẩn bị"], 0, ["lp1", "lp2"], "Lời kể hiện tại đối chiếu hồ sơ."),
          q("bounded-inference", "Có thể suy ra vì sao bảng ghi cả ký ức và ngày tháng?", ["Giữ ý nghĩa cộng đồng và minh bạch bằng chứng lịch sử", "Chứng minh mọi ký ức sai", "Bỏ thực hành hiện nay", "Xóa khách du lịch"], 0, ["lp2", "lp3"], "Hai nguồn có chức năng khác.", "Có thể suy ra mục tiêu diễn giải đa nguồn, chưa giải quyết mọi bất đồng ký ức."),
          q("scope-limit", "Claim nào được hỗ trợ?", ["Thực hành làng này đã thay đổi theo thời gian", "Mọi truyền thống địa phương có cùng lịch sử", "Mẹ-con gái luôn là nhóm duy nhất", "Ngày cố định có hai trăm năm"], 0, ["lp2", "lp3"], "Nguồn giới hạn một làng."),
        ],
        noteMap: map([
          ["oral", "Ký ức kể", "Câu chuyện hai trăm năm.", ["lp1"]],
          ["origin", "Nguồn gốc", "Chia lương thực khoảng tám mươi năm.", ["lp2"]],
          ["date", "Ngày cố định", "Hình thành khoảng bốn mươi năm.", ["lp2"]],
          ["roles", "Vai trò", "Gia đình đón khách từng luân phiên.", ["lp1", "lp2"]],
          ["display", "Diễn giải", "Ghi cả ký ức và hồ sơ.", ["lp3"]],
        ], [["origin", "phát triển thành", "date"], ["roles", "thay đổi cùng", "date"], ["display", "kết hợp", "oral"], ["display", "kết hợp", "origin"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán đánh giá hai claim phục hưng và truyền thống; nêu biện pháp trùng thời điểm, mốc lịch sử, nguồn và giới hạn.",
      requiredElements: ["ba biện pháp hí khúc", "khán giả học sinh", "bữa tối làng", "ký ức/hồ sơ", "claim có phạm vi"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "戏曲剧院同时增加角色介绍、降低周末票价并发布后台视频，学生观众随后增加。新观众提到多种理由，所以报告只能说多项措施同时出现，并用分周轮换继续检查，不能把复兴归给一个办法。山村晚餐也不是所有细节都延续两百年：档案显示共同晚餐、固定日期和迎客角色在不同阶段形成。村民把口述记忆与档案日期一起展示。两份材料都保留文化自豪和传统认同，同时区分原因、时间与证据范围，避免把宣传总结当成唯一历史事实。",
      modelVi: "Nhà hát cùng lúc thêm giới thiệu nhân vật, giảm vé cuối tuần và đăng video hậu trường; sau đó khán giả học sinh tăng. Khách mới nhắc nhiều lý do, nên báo cáo chỉ nói các biện pháp cùng xuất hiện và luân phiên theo tuần để kiểm, không quy phục hưng cho một cách. Bữa tối làng cũng không có mọi chi tiết suốt 200 năm: hồ sơ cho thấy bữa chung, ngày cố định, vai đón khách hình thành ở các giai đoạn. Dân ghi cả ký ức và ngày hồ sơ. Cả hai giữ tự hào/nhận diện truyền thống nhưng tách nguyên nhân, thời gian và phạm vi bằng chứng, không coi tổng kết quảng bá là sự thật duy nhất.",
    },
  },
  [ID.compare]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "两种拜访礼仪怎样比较",
        titleVi: "Hai kiểu lễ nghi thăm hỏi được so sánh thế nào",
        targetVocabularyIds: [V(1048), V(1118), V(1189), V(1446), V(1873)],
        paragraphs: [
          ["交流手册比较两个地区的家庭拜访。甲地不论关系多近，第一次到访前都先确认时间，突然来可能被认为打扰；乙地熟人可临时进门，但要在门口说明来意。手册由翻译和当地家庭共同写成，希望减少错误印象。",
            "Sổ giao lưu so thăm gia đình ở hai vùng. Vùng A bất kể thân đến đâu, lần đầu đều xác nhận giờ; đến bất ngờ có thể bị coi làm phiền. Vùng B người quen có thể ghé nhưng phải nói mục đích ở cửa. Sổ do phiên dịch và gia đình địa phương cùng viết để giảm ấn tượng sai."],
          ["试用后，外地访客在甲地更少迟到，却把乙地的灵活理解成“没有规则”。乙地家庭则觉得手册过分强调自由，没有写清长辈休息时间。困难不是哪个地区更有礼貌，而是同一行为在关系和时间条件下意义不同。",
            "Sau thử, khách ngoài vùng ít trễ ở A hơn nhưng hiểu linh hoạt của B thành 'không có quy tắc'. Gia đình B thấy sổ nhấn tự do quá mức, không ghi rõ giờ nghỉ người lớn tuổi. Khó khăn không phải vùng nào lịch sự hơn mà cùng hành vi có nghĩa khác theo quan hệ và thời gian."],
          ["新版增加“初次/熟人”“白天/休息时间”两个维度，并保留当地家庭的原话。相比列出一个固定禁令，条件表更能帮助判断，但它仍不能替代到访时询问主人。礼仪比较应说明差异，不能把差异排成文明高低。",
            "Bản mới thêm hai chiều 'lần đầu/người quen' và 'ban ngày/giờ nghỉ', giữ lời gia đình địa phương. So với một cấm đoán cố định, bảng điều kiện giúp phán đoán hơn nhưng chưa thay việc hỏi chủ nhà. So sánh lễ nghi phải nêu khác biệt, không xếp khác biệt thành văn minh cao thấp."],
        ],
        questions: [
          q("main-claim", "Bài đọc đề xuất cách so lễ nghi nào?", ["Theo quan hệ và thời gian, không xếp hạng văn minh", "Một cấm đoán cho mọi nơi", "Chỉ theo lời khách", "Bỏ hỏi chủ nhà"], 0, ["rp1", "rp2", "rp3"], "Nguồn chuyển từ luật cố định sang điều kiện."),
          q("supported-detail", "Bản mới thêm hai chiều nào?", ["Quan hệ và thời gian", "Giá và khoảng cách", "Tuổi và nghề", "Ngôn ngữ và thức ăn"], 0, ["rp3"], "Đoạn ba liệt kê trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao mô tả vùng B là 'không có quy tắc' sai?", ["Linh hoạt chỉ cho người quen và vẫn có điều kiện giờ nghỉ/mục đích", "Vùng B không có gia đình", "Phiên dịch không viết", "Khách luôn đến muộn"], 0, ["rp1", "rp2"], "Hai đoạn nêu điều kiện bị bỏ sót."),
          q("bounded-inference", "Có thể suy ra lợi ích giữ lời gia đình địa phương?", ["Giảm việc phiên dịch áp nhãn khái quát lên thực hành", "Bảo đảm không hiểu lầm", "Xóa bảng điều kiện", "Chọn vùng lịch sự hơn"], 0, ["rp1", "rp3"], "Nguồn địa phương được giữ cạnh diễn giải.", "Có thể suy ra tăng tính truy xuất, chưa đảm bảo mọi gia đình đồng ý."),
          q("scope-limit", "Claim nào quá rộng?", ["Bảng điều kiện hữu ích hơn cấm đoán trong thử nghiệm", "Mọi gia đình vùng A và B hành xử giống hệt", "Hỏi chủ nhà vẫn cần", "Không nên xếp hạng văn minh"], 1, ["rp3"], "Nguồn không đại diện từng gia đình."),
        ],
        noteMap: map([
          ["region-a", "Vùng A", "Lần đầu phải xác nhận thời gian.", ["rp1"]],
          ["region-b", "Vùng B", "Người quen linh hoạt nhưng nêu mục đích.", ["rp1"]],
          ["misread", "Hiểu sai", "Linh hoạt bị đọc thành không quy tắc.", ["rp2"]],
          ["dimensions", "Điều kiện", "Quan hệ và giờ trong ngày.", ["rp3"]],
          ["limit", "Giới hạn", "Vẫn cần hỏi chủ nhà cụ thể.", ["rp3"]],
        ], [["misread", "làm sai", "region-b"], ["dimensions", "làm rõ", "region-a"], ["dimensions", "làm rõ", "region-b"], ["limit", "giới hạn", "dimensions"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "庆祝方式如何成为跨文化问题",
        titleVi: "Cách chúc mừng trở thành vấn đề liên văn hóa ra sao",
        targetVocabularyIds: [V(1082), V(1375), V(1590), V(1660), V(1803)],
        paragraphs: [
          ["大学国际班完成项目后，一组学生主张公开庆祝，另一组只想给教授写感谢信。公开活动成为多数意见，与小型表达相比看起来更热情。组织者实际上没有先问不愿上台的学生为什么沉默。",
            "Lớp quốc tế đại học hoàn thành dự án; một nhóm muốn chúc mừng công khai, nhóm khác chỉ muốn viết thư cảm ơn giáo sư. Hoạt động công khai trở thành ý kiến đa số và trông nhiệt tình hơn so với biểu đạt nhỏ. Tổ chức thực ra chưa hỏi vì sao người không muốn lên sân khấu im lặng."],
          ["访谈发现，部分学生担心语言，有人认为成绩属于全组，不应突出个人；也有人只是当天有工作。沉默既可能来自礼仪观点，也可能来自实际时间。把所有人解释成“害羞文化”会忽略不同原因。",
            "Phỏng vấn thấy một số lo ngôn ngữ, có người cho rằng thành tích thuộc cả nhóm không nên nổi cá nhân, người khác chỉ bận việc hôm đó. Im lặng có thể từ quan điểm lễ nghi hoặc thời gian thực tế. Giải thích mọi người là 'văn hóa nhút nhát' bỏ qua nguyên nhân khác."],
          ["班级最后允许舞台发言、共同署名信和匿名留言三种方式，并分别记录参与。公开庆祝人数最高，匿名留言也收到重要意见。比较结果说明选择增加了表达，不说明三种方式有固定文化归属。",
            "Lớp cuối cùng cho ba cách: phát biểu sân khấu, thư ký tên chung và nhắn ẩn danh, ghi riêng tham gia. Chúc mừng công khai đông nhất, nhắn ẩn danh cũng nhận ý kiến quan trọng. Kết quả cho thấy thêm lựa chọn tăng biểu đạt, không nói ba cách thuộc văn hóa cố định."],
        ],
        questions: [
          q("main-claim", "Bài nghe phê bình cách giải thích nào?", ["Gắn mọi im lặng với một nhãn văn hóa", "Cho nhiều cách biểu đạt", "Ghi số người tham gia", "Viết thư cho giáo sư"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách lễ nghi, ngôn ngữ và thời gian."),
          q("supported-detail", "Một lý do thực tế khiến sinh viên không tham dự là gì?", ["Có công việc hôm đó", "Không hoàn thành dự án", "Không biết giáo sư", "Không có lớp"], 0, ["lp2"], "Đây là điều kiện không thuộc văn hóa."),
          q("cross-paragraph-evidence", "Vì sao đa số sân khấu chưa đại diện mọi ý kiến?", ["Người im lặng có lý do khác và kênh ẩn danh vẫn nhận ý kiến quan trọng", "Sân khấu đông", "Có giáo sư", "Dự án kết thúc"], 0, ["lp1", "lp3"], "Kênh khác làm lộ tiếng nói bị thiếu."),
          q("bounded-inference", "Có thể suy ra lợi ích ba cách biểu đạt?", ["Giảm chi phí tham gia khác nhau mà không gán nhãn văn hóa", "Bảo đảm mọi người nói", "Xóa khác biệt", "Chỉ tăng sân khấu"], 0, ["lp2", "lp3"], "Lựa chọn phản hồi nhiều lý do.", "Có thể suy ra tăng cơ hội biểu đạt, chưa biết cách nào phù hợp từng cá nhân lâu dài."),
          q("scope-limit", "Claim nào được hỗ trợ?", ["Ba kênh thu được nhiều loại phản hồi hơn", "Mỗi kênh thuộc cố định một nền văn hóa", "Người im lặng đều nhút nhát", "Công khai luôn tốt nhất"], 0, ["lp3"], "Nguồn bác gắn cố định."),
        ],
        noteMap: map([
          ["public", "Công khai", "Phát biểu sân khấu và đa số ban đầu.", ["lp1", "lp3"]],
          ["letter", "Thư chung", "Biểu đạt tập thể tới giáo sư.", ["lp1", "lp3"]],
          ["anonymous", "Ẩn danh", "Thu nhận ý kiến không lên sân khấu.", ["lp3"]],
          ["reasons", "Lý do", "Ngôn ngữ, quan điểm nhóm và công việc.", ["lp2"]],
          ["claim", "Giới hạn", "Kênh không thuộc văn hóa cố định.", ["lp3"]],
        ], [["reasons", "định hình", "public"], ["letter", "bổ sung", "public"], ["anonymous", "bổ sung", "public"], ["claim", "giới hạn", "reasons"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh hai tình huống lễ nghi; nêu điều kiện quan hệ, nhiều nguyên nhân im lặng, thiết kế lựa chọn và giới hạn.",
      requiredElements: ["hai vùng thăm hỏi", "quan hệ/thời gian", "ba cách chúc mừng", "lý do im lặng", "không xếp hạng/gắn nhãn"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "家庭拜访手册发现，甲地第一次到访要确认时间，乙地熟人可以临时来却仍要说明目的；“关系”和“休息时间”比一个固定禁令更准确，而且不能把差异排成文明高低。国际班的庆祝也不能把沉默都叫作害羞文化，因为语言、集体观念和工作时间都可能有关。班级提供舞台发言、共同署名信和匿名留言后，不同意见更容易出现。两种做法都用条件和多种入口代替文化标签，同时承认手册与活动选择仍不能代表每个家庭或个人。",
      modelVi: "Sổ thăm hỏi thấy vùng A lần đầu phải xác nhận giờ, vùng B người quen có thể ghé nhưng vẫn nêu mục đích; 'quan hệ' và 'giờ nghỉ' chính xác hơn một cấm đoán, không xếp khác biệt thành văn minh cao thấp. Chúc mừng lớp quốc tế cũng không thể gọi mọi im lặng là văn hóa nhút nhát vì ngôn ngữ, quan niệm tập thể và giờ làm đều có thể liên quan. Khi có sân khấu, thư chung, nhắn ẩn danh, ý kiến khác dễ xuất hiện. Cả hai dùng điều kiện và nhiều lối vào thay nhãn văn hóa, đồng thời thừa nhận sổ hay lựa chọn hoạt động chưa đại diện từng gia đình/cá nhân.",
    },
  },
  [ID.evidence]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "古城遗址的年代怎样判断",
        titleVi: "Niên đại di tích thành cổ được phán đoán thế nào",
        targetVocabularyIds: [V(1008), V(1263), V(1548), V(1692), V(1944)],
        paragraphs: [
          ["考古队按照土层位置、木材样本和旧地图判断古城遗址年代。第一份报告估计主城墙有九百年，因为底层砖样式相似。地方宣传随后把“估计”写成确定知识，并扩大到整个遗址。",
            "Đội khảo cổ căn cứ lớp đất, mẫu gỗ và bản đồ cũ để phán đoán niên đại thành cổ. Báo cáo đầu ước tính tường chính khoảng 900 năm vì kiểu gạch lớp đáy tương tự. Truyền thông địa phương sau đó biến 'ước tính' thành kiến thức chắc chắn và mở ra toàn di tích."],
          ["新测量发现，不同区域砖的数量和材料不一样：主墙木材约八百六十年，东门多次重建，市场区更晚。旧地图只标出城墙，不记录修复日期。证据支持城市长期存在，却不支持所有建筑同一年完成。",
            "Đo mới thấy số lượng và vật liệu gạch khác theo khu: gỗ tường chính khoảng 860 năm, cổng đông xây lại nhiều lần, khu chợ muộn hơn. Bản đồ cũ chỉ ghi tường, không ghi ngày sửa. Bằng chứng hỗ trợ thành phố tồn tại lâu nhưng không hỗ trợ mọi công trình hoàn thành cùng năm."],
          ["修订报告为每个区域给出范围、证据类型和不确定度，并解释取样位置。九百年成为主墙的近似说法，不再是全城标签。更精确的判断来自增加证据，不是把估计写得更肯定。",
            "Báo cáo sửa cho mỗi khu một khoảng, loại bằng chứng và độ bất định, giải thích vị trí lấy mẫu. '900 năm' thành cách nói gần đúng của tường chính, không còn nhãn toàn thành. Phán đoán chính xác hơn đến từ thêm bằng chứng, không phải viết ước tính chắc hơn."],
        ],
        questions: [
          q("main-claim", "Bài đọc sửa claim niên đại thế nào?", ["Từ một con số toàn thành sang phạm vi theo khu và bằng chứng", "Từ bản đồ sang không đo", "Từ di tích sang món ăn", "Từ 900 sang 9000"], 0, ["rp1", "rp2", "rp3"], "Nguồn phân tầng xây dựng."),
          q("supported-detail", "Khu nào được xây lại nhiều lần?", ["Cổng đông", "Tường chính", "Khu chợ", "Bản đồ"], 0, ["rp2"], "Đây là chi tiết trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao con số 900 năm không thể gắn toàn di tích?", ["Các khu có vật liệu và lịch xây khác, trong khi ước tính đầu dựa tường chính", "Có nhiều viên gạch", "Bản đồ cũ tồn tại", "Đội khảo cổ viết báo cáo"], 0, ["rp1", "rp2"], "Phạm vi mẫu và đa giai đoạn khác nhau."),
          q("bounded-inference", "Có thể suy ra lợi ích ghi vị trí lấy mẫu?", ["Cho biết bằng chứng áp dụng cho khu vực nào", "Bảo đảm không còn sai số", "Xóa bản đồ", "Làm di tích cổ hơn"], 0, ["rp2", "rp3"], "Vị trí quyết định phạm vi claim.", "Có thể suy ra tăng truy xuất, chưa thể loại mọi sai số đo."),
          q("scope-limit", "Claim nào phù hợp?", ["Tường chính khoảng tám đến chín trăm năm theo mẫu", "Mọi phần được xây chính xác cùng ngày", "Bản đồ ghi mọi lần sửa", "Số lớn hơn luôn đúng hơn"], 0, ["rp2", "rp3"], "Nguồn giữ khoảng và khu."),
        ],
        noteMap: map([
          ["initial", "Ước tính đầu", "Khoảng chín trăm năm từ tường chính.", ["rp1"]],
          ["main-wall", "Tường chính", "Mẫu gỗ khoảng tám trăm sáu mươi năm.", ["rp2"]],
          ["east-gate", "Cổng đông", "Có nhiều lần xây lại.", ["rp2"]],
          ["market", "Khu chợ", "Giai đoạn muộn hơn.", ["rp2"]],
          ["revision", "Báo cáo sửa", "Phạm vi và bất định theo khu.", ["rp3"]],
        ], [["initial", "được thu hẹp bởi", "main-wall"], ["east-gate", "khác", "main-wall"], ["market", "khác", "main-wall"], ["revision", "tổng hợp", "east-gate"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "阅读旧游记能了解古迹吗",
        titleVi: "Đọc du ký cũ có giúp hiểu cổ tích không",
        targetVocabularyIds: [V(1227), V(1374), V(1589), V(1766), V(1909)],
        paragraphs: [
          ["一位教师带学生阅读百年前的寺庙游记。作者写钟声往往让人感觉平静，也描述院子非常宽。学生开始把游记当成当时情况的直接记录，并按文字画出完整平面图。",
            "Một giáo viên cho học sinh đọc du ký ngôi chùa trăm năm trước. Tác giả viết tiếng chuông thường làm người ta cảm giác yên tĩnh và tả sân rất rộng. Học sinh bắt đầu coi du ký là ghi chép trực tiếp tình hình thời đó, vẽ sơ đồ đầy đủ theo chữ."],
          ["教师提醒，游记选择作者注意的事，也可能夸张感受。同期维修清单证明院子存在，却没有尺寸；另一位游客说节日当天很拥挤。不同来源共同支持某些空间和活动，但对大小与气氛并不一致。",
            "Giáo viên nhắc du ký chọn điều tác giả chú ý và có thể phóng đại cảm nhận. Danh sách sửa chữa cùng thời chứng minh sân tồn tại nhưng không có kích thước; du khách khác nói ngày lễ rất đông. Nguồn khác cùng hỗ trợ một số không gian/hoạt động nhưng không thống nhất về độ lớn và không khí."],
          ["学生修改作品，把确定、可能和个人感受分成三层，并在每条后写来源。阅读旧游记能提供视角，不能单独重建完整古迹。比较文本和档案使知识更丰富，也让空白更清楚。",
            "Học sinh sửa sản phẩm, chia ba tầng chắc chắn, có thể và cảm nhận cá nhân, ghi nguồn sau mỗi ý. Đọc du ký cũ cho góc nhìn, không thể một mình dựng lại cổ tích đầy đủ. So văn bản với hồ sơ làm kiến thức phong phú hơn và khoảng trống rõ hơn."],
        ],
        questions: [
          q("main-claim", "Bài nghe hướng dẫn dùng du ký thế nào?", ["Dùng như một góc nhìn và đối chiếu với nguồn khác", "Dùng như sơ đồ chính xác tuyệt đối", "Bỏ cảm nhận tác giả", "Không đọc văn bản cũ"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách mô tả, cảm nhận và hồ sơ."),
          q("supported-detail", "Danh sách sửa chữa chứng minh điều gì?", ["Sân tồn tại", "Kích thước sân chính xác", "Chuông luôn yên tĩnh", "Mọi ngày đều đông"], 0, ["lp2"], "Bằng chứng có phạm vi hẹp."),
          q("cross-paragraph-evidence", "Vì sao không thể vẽ sơ đồ hoàn chỉnh chỉ từ du ký?", ["Tác giả chọn và cảm nhận, còn hồ sơ thiếu kích thước và nguồn khác khác khí cảnh", "Du ký đã cũ", "Có giáo viên", "Học sinh đọc"], 0, ["lp1", "lp2"], "Hai đoạn chỉ ra selection và thiếu dữ liệu."),
          q("bounded-inference", "Có thể suy ra lợi ích ba tầng chắc/có thể/cảm nhận?", ["Ngăn ý kiến cá nhân bị trình bày như sự kiện chắc chắn", "Bảo đảm sơ đồ đầy đủ", "Loại bỏ tác giả", "Tăng kích thước sân"], 0, ["lp2", "lp3"], "Phân tầng khớp độ mạnh bằng chứng.", "Có thể suy ra tăng minh bạch, chưa giải quyết mọi xung đột nguồn."),
          q("scope-limit", "Claim nào được hỗ trợ?", ["Du ký cung cấp một góc nhìn về trải nghiệm", "Du ký đủ tái dựng toàn bộ chùa", "Sân chắc chắn rất rộng", "Không khí luôn yên tĩnh"], 0, ["lp1", "lp3"], "Nguồn giữ vai trò góc nhìn."),
        ],
        noteMap: map([
          ["travelogue", "Du ký", "Mô tả sân và cảm giác chuông.", ["lp1"]],
          ["selection", "Lựa chọn", "Tác giả chỉ ghi điều mình chú ý.", ["lp2"]],
          ["repair", "Hồ sơ sửa", "Xác nhận sân nhưng không có kích thước.", ["lp2"]],
          ["other-visitor", "Nguồn khác", "Mô tả ngày lễ đông.", ["lp2"]],
          ["layers", "Ba tầng", "Chắc chắn, có thể và cảm nhận.", ["lp3"]],
        ], [["selection", "giới hạn", "travelogue"], ["repair", "hỗ trợ hẹp", "travelogue"], ["other-visitor", "đối chiếu", "travelogue"], ["layers", "tổ chức", "repair"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán đánh giá hai cách biết về cổ tích; nêu phạm vi mẫu, nhiều nguồn, độ bất định và claim được phép.",
      requiredElements: ["tường/cổng/khu chợ", "ước tính niên đại", "du ký", "hồ sơ sửa/du khách khác", "phân tầng độ chắc"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "古城最初用主墙砖估计九百年，却被宣传成全城年代。新证据显示主墙、东门和市场区分属不同阶段，所以报告按区域写范围、样本和不确定度。旧寺游记也只能提供作者视角：维修清单确认院子却没有尺寸，另一位游客对气氛的描述又不同。学生因此把确定、可能和个人感受分层，并标注来源。两份材料都说明历史知识来自多种有限证据的比较；更准确不是语气更肯定，而是清楚说明样本位置、来源差异和仍然不知道的部分。",
      modelVi: "Thành cổ ban đầu dùng gạch tường chính ước 900 năm nhưng truyền thông biến thành tuổi toàn thành. Bằng chứng mới cho thấy tường, cổng đông, khu chợ thuộc giai đoạn khác, nên báo cáo ghi khoảng, mẫu, bất định theo khu. Du ký chùa cũng chỉ là góc nhìn tác giả: hồ sơ sửa xác nhận sân nhưng không có kích thước, du khách khác tả không khí khác. Học sinh chia chắc, có thể, cảm nhận và ghi nguồn. Cả hai cho thấy kiến thức lịch sử đến từ so nhiều bằng chứng hữu hạn; chính xác hơn không phải giọng chắc hơn mà là nêu vị trí mẫu, khác biệt nguồn và phần chưa biết.",
    },
  },
  [ID.viewpoint]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "历史人物纪念展该讲什么",
        titleVi: "Triển lãm tưởng niệm nhân vật lịch sử nên kể gì",
        targetVocabularyIds: [V(1192), V(1232), V(1303), V(1410), V(1520)],
        paragraphs: [
          ["城市准备举办一位改革者纪念展。目前方案突出他建设学校的贡献，支持者希望观众感受勇气；反对者指出他也赞成过有争议的政策，并怀疑展览会不会回避责任。双方争论的不是同一事实，而是选择哪些事实。",
            "Thành phố chuẩn bị tổ chức triển lãm một nhà cải cách. Phương án hiện nay nhấn đóng góp xây trường; người ủng hộ muốn khách cảm nhận dũng khí, người phản đối chỉ ra ông từng ủng hộ chính sách gây tranh cãi và nghi ngờ triển lãm né trách nhiệm. Hai bên không tranh cùng một sự kiện mà tranh chọn sự kiện nào."],
          ["策展组检查书信、政策记录和同时代批评，发现贡献与限制都能找到证据。个人动机有些无法确定，后来的影响也由多人共同造成。展览若只称英雄会遗漏争议，若只称失败也会忽略教育改变。",
            "Nhóm giám tuyển kiểm thư, hồ sơ chính sách và phê bình cùng thời, thấy cả đóng góp lẫn giới hạn đều có bằng chứng. Một số động cơ cá nhân không xác định được; ảnh hưởng sau do nhiều người cùng tạo. Nếu chỉ gọi anh hùng sẽ bỏ tranh cãi, chỉ gọi thất bại sẽ bỏ thay đổi giáo dục."],
          ["最终展览按“选择—当时批评—后果—未知”组织，并邀请观众写自己的判断和证据。综合观点不是平均赞美与反对，而是让每个评价可追到来源。一个展览仍是选择，不是历史本身。",
            "Triển lãm cuối tổ chức theo 'lựa chọn–phê bình lúc đó–hệ quả–chưa biết', mời khách viết phán đoán và bằng chứng. Quan điểm tổng hợp không phải chia đều khen/chê mà khiến mỗi đánh giá truy được nguồn. Một triển lãm vẫn là lựa chọn, không phải bản thân lịch sử."],
        ],
        questions: [
          q("main-claim", "Bài đọc đề xuất cách kể nhân vật lịch sử nào?", ["Đặt lựa chọn, phê bình, hệ quả và phần chưa biết cạnh nhau", "Chỉ gọi anh hùng", "Chỉ gọi thất bại", "Bỏ nguồn"], 0, ["rp1", "rp2", "rp3"], "Nguồn tổ chức nhiều mặt theo chứng cứ."),
          q("supported-detail", "Loại nguồn nào được nhóm kiểm tra?", ["Thư, hồ sơ chính sách và phê bình cùng thời", "Chỉ bảng hỏi hiện nay", "Chỉ truyền thuyết", "Không có nguồn"], 0, ["rp2"], "Đoạn hai liệt kê trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao nhãn đơn 'anh hùng' hoặc 'thất bại' đều thiếu?", ["Nguồn có cả đóng góp giáo dục và chính sách gây tranh cãi", "Triển lãm diễn ra trong thành phố", "Có khách tham quan", "Nhân vật viết thư"], 0, ["rp1", "rp2"], "Hai mặt đều có bằng chứng."),
          q("bounded-inference", "Có thể suy ra mục đích mục 'chưa biết'?", ["Ngăn khoảng trống động cơ bị lấp bằng phỏng đoán", "Xóa mọi đánh giá", "Chứng minh nhân vật vô tội", "Bỏ hậu quả"], 0, ["rp2", "rp3"], "Nguồn nêu động cơ không xác định.", "Có thể suy ra mục tiêu minh bạch bất định, chưa thể biết khách sẽ diễn giải ra sao."),
          q("scope-limit", "Claim nào đúng?", ["Triển lãm là một lựa chọn có nguồn, không phải toàn bộ lịch sử", "Triển lãm chứa mọi sự thật", "Mọi hệ quả do một người gây", "Động cơ đều đã rõ"], 0, ["rp3"], "Nguồn giới hạn bản chất giám tuyển."),
        ],
        noteMap: map([
          ["contribution", "Đóng góp", "Xây trường và thay đổi giáo dục.", ["rp1", "rp2"]],
          ["controversy", "Tranh cãi", "Ủng hộ chính sách gây phản đối.", ["rp1", "rp2"]],
          ["sources", "Nguồn", "Thư, hồ sơ và phê bình cùng thời.", ["rp2"]],
          ["unknown", "Chưa biết", "Một số động cơ không xác định.", ["rp2", "rp3"]],
          ["curation", "Giám tuyển", "Tổ chức claim theo nguồn.", ["rp3"]],
        ], [["sources", "hỗ trợ", "contribution"], ["sources", "hỗ trợ", "controversy"], ["unknown", "giới hạn", "curation"], ["curation", "đặt cạnh", "controversy"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "同一条历史街道有几种记忆",
        titleVi: "Cùng một phố lịch sử có bao nhiêu ký ức",
        targetVocabularyIds: [V(1053), V(1267), V(1379), V(1806), V(1948)],
        paragraphs: [
          ["老城更新一条历史街道。商户直接称它是繁荣中心，居民不管搬来多久都记得日常生活，导游则强调战争事件。三种记忆谈同一地点，却不完全相同；有人怀疑规划方故意只保留适合旅游的故事。",
            "Phố cổ cải tạo một đường lịch sử. Tiểu thương trực tiếp gọi đây là trung tâm thịnh vượng, cư dân bất kể đến lâu hay mới đều nhớ đời sống thường ngày, hướng dẫn viên nhấn sự kiện chiến tranh. Ba ký ức nói cùng nơi nhưng không hoàn toàn giống; có người nghi quy hoạch cố ý chỉ giữ câu chuyện hợp du lịch."],
          ["项目组收集店铺账本、居民照片和官方档案。旅游版本并非虚构，但它省略了搬迁和普通工作；居民记忆丰富，也会因年代不同出现冲突。相同街道不能只用一个声音代表，来源多也不等于自动一致。",
            "Nhóm dự án thu sổ cửa hàng, ảnh cư dân và hồ sơ chính thức. Phiên bản du lịch không hư cấu nhưng bỏ di dời và lao động thường; ký ức cư dân phong phú song xung đột theo thời kỳ. Cùng một con phố không thể do một tiếng nói đại diện; nhiều nguồn cũng không tự đồng nhất."],
          ["新版路线设置商业、生活、战争三条线，并在冲突处注明来源和日期。参观者可选择顺序，最后比较遗漏。这个设计让记忆并存，却仍受未保存照片和未受访居民限制；多声部不是完整历史的保证。",
            "Tuyến mới đặt ba mạch thương mại, đời sống, chiến tranh, ghi nguồn/ngày tại chỗ xung đột. Khách chọn thứ tự và cuối cùng so phần bỏ sót. Thiết kế cho ký ức cùng tồn tại nhưng vẫn bị giới hạn bởi ảnh không lưu và cư dân chưa phỏng vấn; nhiều tiếng nói không bảo đảm lịch sử đầy đủ."],
        ],
        questions: [
          q("main-claim", "Bài nghe tổng hợp ký ức con phố thế nào?", ["Giữ ba mạch và ghi nguồn tại chỗ xung đột", "Chọn du lịch duy nhất", "Xóa ký ức cư dân", "Trộn mọi nguồn thành một"], 0, ["lp1", "lp2", "lp3"], "Nguồn cho phép bất đồng có provenance."),
          q("supported-detail", "Phiên bản du lịch bỏ sót điều gì?", ["Di dời và lao động thường ngày", "Mọi sự kiện chiến tranh", "Tên đường", "Cửa hàng"], 0, ["lp2"], "Đoạn hai nêu khoảng trống."),
          q("cross-paragraph-evidence", "Vì sao nhiều nguồn chưa đồng nghĩa lịch sử đầy đủ?", ["Ký ức xung đột và vẫn có ảnh/người chưa được lưu hay hỏi", "Có ba tuyến", "Khách chọn thứ tự", "Phố được cải tạo"], 0, ["lp2", "lp3"], "Đa nguồn vẫn có thiếu hụt."),
          q("bounded-inference", "Có thể suy ra lợi ích để khách chọn thứ tự?", ["Cho thấy cách sắp xếp có thể ảnh hưởng diễn giải", "Bảo đảm mọi khách đồng ý", "Xóa xung đột", "Thay thế nguồn"], 0, ["lp1", "lp3"], "Ba tuyến không bị ép vào một trình tự.", "Có thể suy ra mục tiêu phản tư, chưa biết thứ tự tác động bao nhiêu."),
          q("scope-limit", "Claim nào phù hợp?", ["Thiết kế mới làm nhiều ký ức hiện diện hơn", "Thiết kế chứa toàn bộ lịch sử phố", "Nguồn luôn giống nhau", "Cư dân nào cũng đã được hỏi"], 0, ["lp3"], "Nguồn nêu các khoảng trống."),
        ],
        noteMap: map([
          ["commerce", "Thương mại", "Sổ cửa hàng và câu chuyện phồn vinh.", ["lp1", "lp2"]],
          ["daily-life", "Đời sống", "Ảnh và ký ức cư dân.", ["lp1", "lp2"]],
          ["war", "Chiến tranh", "Hồ sơ và tuyến du lịch.", ["lp1", "lp3"]],
          ["conflict", "Xung đột", "Nguồn và thời kỳ không hoàn toàn giống.", ["lp2", "lp3"]],
          ["gaps", "Khoảng trống", "Ảnh mất và người chưa phỏng vấn.", ["lp3"]],
        ], [["commerce", "khác trọng tâm với", "daily-life"], ["war", "khác trọng tâm với", "daily-life"], ["conflict", "được ghi giữa", "commerce"], ["gaps", "giới hạn", "conflict"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán tổng hợp hai cách trình bày lịch sử; nêu nguồn, bất đồng, phần chưa biết, nhiều tiếng nói và giới hạn.",
      requiredElements: ["nhà cải cách", "đóng góp/tranh cãi", "ba ký ức phố", "ghi nguồn xung đột", "giám tuyển không phải toàn lịch sử"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "改革者纪念展既有建设学校的贡献，也有争议政策和无法确定的动机。策展组按选择、当时批评、后果与未知组织资料，让评价追到书信和政策记录，而不是平均赞美与反对。历史街道同样包含商业、居民生活和战争记忆；账本、照片与档案有不同重点，部分材料和受访者仍缺失。新路线把三条线并列，并在冲突处注明来源。两种展示都承认历史解释需要选择，多声部能减少单一故事，却不能保证已经包含全部事实或所有人的经验。",
      modelVi: "Triển lãm nhà cải cách có cả đóng góp xây trường, chính sách tranh cãi và động cơ chưa xác định. Nhóm tổ chức theo lựa chọn, phê bình cùng thời, hệ quả, phần chưa biết để đánh giá truy tới thư/hồ sơ, không chia đều khen chê. Phố lịch sử cũng có ký ức thương mại, đời sống, chiến tranh; sổ, ảnh, hồ sơ khác trọng tâm và vẫn thiếu vật liệu/người. Tuyến mới đặt ba mạch cạnh nhau, ghi nguồn nơi xung đột. Cả hai thừa nhận diễn giải cần lựa chọn; nhiều tiếng nói giảm câu chuyện đơn nhưng không bảo đảm đã có toàn bộ sự kiện hay kinh nghiệm.",
    },
  },
};

export const buildHsk4CultureHistoryLongFormPack = (root = process.cwd()) =>
  buildHsk4LongFormDomainPack({
    root,
    ...HSK4_CULTURE_HISTORY_LONG_FORM_CONFIG,
    lessonIds: HSK4_CULTURE_HISTORY_LESSON_IDS,
    content: CONTENT,
    vietnameseGlossBySequence: VI_GLOSS_BY_SEQUENCE,
    prerequisitePackBundles: [
      loadHsk4ArtsSportsExchangeLongFormPackBundle(root),
    ],
  });

export const serializeHsk4CultureHistoryLongFormPack = (
  pack = buildHsk4CultureHistoryLongFormPack(),
) => serializeHsk4LongFormDomainPack(pack);

const main = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write") && args.has("--check")) {
    throw new Error("Choose one mode");
  }
  const root = process.cwd();
  const path = resolve(root, HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH);
  const serialized = serializeHsk4CultureHistoryLongFormPack(
    buildHsk4CultureHistoryLongFormPack(root),
  );
  if (args.has("--write")) {
    writeFileSync(path, serialized, "utf8");
    console.log(`Wrote ${path}`);
  } else if (args.has("--check")) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`${path} is stale`);
    }
    console.log(`${HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH} is current`);
  } else {
    process.stdout.write(serialized);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
