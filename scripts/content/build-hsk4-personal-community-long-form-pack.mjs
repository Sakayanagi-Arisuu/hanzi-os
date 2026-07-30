import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4LongFormDomainPack,
  serializeHsk4LongFormDomainPack,
} from "./hsk4-long-form-domain-builder.mjs";
import {
  HSK4_PERSONAL_COMMUNITY_DOMAIN_ID,
  HSK4_PERSONAL_COMMUNITY_LESSON_IDS,
  HSK4_PERSONAL_COMMUNITY_LONG_FORM_CONFIG,
  HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH,
} from "../../src/content/hsk4PersonalCommunityLongFormPack.mjs";

const V = (sequence) =>
  `hsk-vocab-${String(sequence).padStart(5, "0")}`;

const VI_GLOSS_BY_SEQUENCE = {
  1033: "bảng; biểu; bề mặt ngoài",
  1069: "tra tìm; tìm kiếm",
  1307: "trả lời; hồi đáp",
  1369: "cảnh sát giao thông",
  1632: "đến tận nơi; đến nhà",
  1442: "đồ ăn nhanh",
  1489: "hành khách; du khách",
  1504: "món ngon; ẩm thực",
  1794: "tươi; tươi mới",
  1957: "bữa ăn Trung Quốc; món Trung",
  1210: "cha mẹ",
  1340: "gia đình",
  1456: "quê nhà",
  1812: "món ăn vặt; đặc sản ăn nhanh",
  1312: "hoạt động",
  1490: "du lịch; chuyến đi",
  1169: "tắc đường",
  1372: "giao thông",
  1070: "suýt nữa",
  1930: "sắp xếp; chỉnh lý",
  1285: "kỳ nghỉ đông",
  1341: "quê hương",
  1173: "đội; hàng người",
  1677: "thu phí",
  1713: "tất cả",
  1427: "ho; khụ",
  1640: "độ C",
  1821: "tâm trạng",
  1856: "hình thành; nuôi thành",
  1962: "coi trọng",
  1573: "nhiệt độ không khí",
  1498: "áo len",
  1429: "đáng tiếc; tiếc là",
  1748: "giống nhau; tương tự",
  1606: "nhưng lại; trái lại",
  1138: "hướng dẫn viên",
  1289: "chuyến bay",
  1068: "lá trà; trà khô",
  1858: "mời",
  1786: "hiểu lầm",
  1035: "biểu thị; cho biết",
  1067: "xem; kiểm tra",
  1175: "đối diện",
  1963: "xung quanh",
  1678: "thu nhập",
  1428: "ho; cơn ho",
  1460: "cắt tóc",
  1497: "khăn mặt",
  1785: "bữa trưa",
  1822: "tín hiệu",
  1211: "cha và con gái",
  1357: "tương lai",
  1462: "lễ phép; phép lịch sự",
  1290: "lợi ích; điểm tốt",
  1824: "lòng tin; sự tự tin",
  1397: "Kinh kịch",
  1433: "lớp học",
  1247: "các vị; mọi người",
  1644: "xin; đăng ký",
  1680: "nghe đài; đón nghe",
};

const q = (
  kind,
  prompt,
  options,
  answer,
  evidence,
  rationale,
  boundary = null,
) => [kind, prompt, options, answer, evidence, rationale, boundary];

const map = (nodes, relations) => ({ nodes, relations });

const ID = {
  concept: `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-concept-actor-map`,
  process: `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-process-timeline`,
  cause: `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-cause-condition-result`,
  compare: `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-comparison-variation`,
  evidence: `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-claim-evidence-inference`,
  viewpoint: `${HSK4_PERSONAL_COMMUNITY_DOMAIN_ID}-viewpoint-synthesis`,
};

const CONTENT = {
  [ID.concept]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "一张社区服务表背后的合作",
        titleVi: "Sự phối hợp đằng sau một bảng dịch vụ cộng đồng",
        targetVocabularyIds: [
          V(1033), V(1069), V(1307), V(1369), V(1632),
        ],
        paragraphs: [
          [
            "新居民搬进明河社区后，常常不知道该去哪里办事。社区中心把医疗、修理、交通咨询和老人照顾等服务列成一张表，并在每项服务后写明负责人的姓名和联系方式。居民可以先查找需要的项目，再决定在线留言还是到服务台说明情况。",
            "Sau khi chuyển đến khu Minh Hà, cư dân mới thường không biết phải giải quyết công việc ở đâu. Trung tâm cộng đồng lập một bảng gồm dịch vụ y tế, sửa chữa, tư vấn giao thông và chăm sóc người cao tuổi, đồng thời ghi rõ người phụ trách cùng cách liên hệ. Cư dân tra mục cần thiết trước rồi chọn nhắn trực tuyến hoặc trình bày tại quầy.",
          ],
          [
            "表上看起来只有几个名字，实际工作却由多方合作完成。工作人员收到问题后先分类，再请志愿者回复一般咨询；如果涉及道路安全，就转给交警。如果老人行动不便，维修人员或医生还可以预约上门。这样，每个人的角色不同，但信息不会停在一个人手里。",
            "Trên bảng chỉ có vài cái tên nhưng công việc thực tế do nhiều bên phối hợp. Nhân viên phân loại yêu cầu, tình nguyện viên trả lời tư vấn thông thường, còn vấn đề an toàn đường bộ được chuyển cho cảnh sát giao thông. Nếu người cao tuổi đi lại khó khăn, thợ sửa chữa hoặc bác sĩ có thể hẹn đến tận nhà; vai trò khác nhau nhưng thông tin không bị giữ ở một người.",
          ],
          [
            "三个月后，中心发现大多数问题能在一天内得到回复，不过也有居民把紧急求助写成普通留言。于是中心在表上增加了“紧急程度”和“是否需要上门”两栏，并安排值班人员电话确认。新办法没有减少参与者，却让居民更容易看清谁负责判断、谁负责处理、谁负责继续跟进。",
            "Ba tháng sau, trung tâm nhận thấy phần lớn vấn đề được hồi đáp trong một ngày, nhưng một số cư dân vẫn ghi yêu cầu khẩn như lời nhắn thường. Vì vậy bảng được thêm hai cột “mức khẩn cấp” và “có cần đến tận nơi không”, kèm người trực gọi xác nhận. Cách mới không giảm số người tham gia mà làm rõ ai đánh giá, ai xử lý và ai theo dõi tiếp.",
          ],
        ],
        questions: [
          q("main-claim", "Mục đích chính của bài đọc là gì?", [
            "Giải thích cách nhiều vai trò phối hợp qua một bảng dịch vụ",
            "Khuyên cư dân tự sửa mọi thiết bị trong nhà",
            "So sánh giá nhà giữa ba khu dân cư",
            "Mô tả công việc hằng ngày của một cảnh sát",
          ], 0, ["rp1", "rp2", "rp3"],
          "Cả ba đoạn lần lượt giới thiệu bảng, cơ chế phối hợp và cách cải tiến phân vai."),
          q("supported-detail", "Trường hợp nào được chuyển cho cảnh sát giao thông?", [
            "Yêu cầu sửa đồ điện",
            "Vấn đề liên quan đến an toàn đường bộ",
            "Đăng ký chăm sóc người cao tuổi",
            "Lời nhắn hỏi giờ mở cửa",
          ], 1, ["rp2"],
          "Đoạn 2 nói rõ yêu cầu về an toàn đường bộ được chuyển cho giao警."),
          q("cross-paragraph-evidence", "Hai chi tiết nào cùng cho thấy hệ thống có bước phân loại trước khi xử lý?", [
            "Cư dân chuyển nhà và trung tâm mở cửa",
            "Bảng ghi người phụ trách; nhân viên chia yêu cầu theo loại và mức khẩn",
            "Bác sĩ đến nhà; cư dân gọi bạn bè",
            "Tình nguyện viên trực đường; cảnh sát sửa nhà",
          ], 1, ["rp1", "rp2", "rp3"],
          "Đoạn 1 gắn dịch vụ với người phụ trách; đoạn 2–3 bổ sung phân loại và mức khẩn."),
          q("bounded-inference", "Có thể suy ra hợp lý điều gì về bảng dịch vụ sau lần sửa đổi?", [
            "Nó thay thế hoàn toàn mọi nhân viên",
            "Nó giúp chuyển trách nhiệm rõ hơn giữa các bên",
            "Nó chỉ dành cho người cao tuổi",
            "Nó bảo đảm mọi việc luôn xong ngay lập tức",
          ], 1, ["rp2", "rp3"],
          "Việc thêm cột và xác nhận qua điện thoại làm rõ trách nhiệm theo từng bước.",
          "Nguồn chỉ cho phép kết luận về độ rõ của quy trình, không chứng minh mọi yêu cầu đều được giải quyết ngay."),
          q("scope-limit", "Kết luận nào vượt quá dữ liệu của bài?", [
            "Phần lớn câu hỏi được hồi đáp trong một ngày",
            "Một số trường hợp cần dịch vụ đến tận nhà",
            "Mọi cộng đồng trong thành phố đều dùng đúng mô hình này",
            "Trung tâm đã thêm cột về mức khẩn cấp",
          ], 2, ["rp1", "rp3"],
          "Bài chỉ mô tả một cộng đồng, không cung cấp dữ liệu cho toàn thành phố."),
        ],
        noteMap: map([
          ["need", "Nhu cầu", "Cư dân mới cần biết nơi và người giải quyết từng việc.", ["rp1"]],
          ["intake", "Tiếp nhận", "Bảng dịch vụ và nhân viên tiếp nhận giúp xác định loại yêu cầu.", ["rp1", "rp2"]],
          ["routing", "Chuyển việc", "Tình nguyện viên, cảnh sát, bác sĩ hoặc thợ nhận phần phù hợp.", ["rp2"]],
          ["gap", "Khoảng trống", "Yêu cầu khẩn đôi khi bị ghi như lời nhắn thường.", ["rp3"]],
          ["revision", "Điều chỉnh", "Thêm mức khẩn, nhu cầu đến nhà và cuộc gọi xác nhận.", ["rp3"]],
        ], [
          ["need", "được tiếp nhận qua", "intake"],
          ["intake", "dẫn đến", "routing"],
          ["gap", "làm phát sinh", "revision"],
          ["revision", "làm rõ", "routing"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "车站里的午餐选择",
        titleVi: "Lựa chọn bữa trưa trong nhà ga",
        targetVocabularyIds: [
          V(1442), V(1489), V(1504), V(1794), V(1957),
        ],
        paragraphs: [
          [
            "长途车站过去只有两家快餐店，许多旅客为了赶车，只能买已经装好的套餐。车站经理发现，老人和带孩子的家庭常常吃不完，而需要清淡饮食的人也很难找到合适的中餐。有人因此选择不吃午饭，也有人把没吃完的食品直接扔掉。",
            "Bến xe đường dài trước đây chỉ có hai cửa hàng đồ ăn nhanh; nhiều hành khách vì vội lên xe chỉ có thể mua suất đóng sẵn. Người cao tuổi, gia đình có trẻ nhỏ thường ăn không hết, còn người cần đồ thanh đạm khó tìm món Trung phù hợp. Có người bỏ bữa, có người vứt phần thức ăn thừa.",
          ],
          [
            "后来，车站邀请三类人一起讨论：旅客代表说明时间和价格要求，厨师介绍哪些美食能提前准备，卫生人员则提醒大家鲜菜和热菜不能在常温下放太久。他们最后决定设置小份窗口，并把每份菜的主要材料、重量和制作时间写在电子牌上。",
            "Sau đó, bến xe mời ba nhóm cùng thảo luận: đại diện hành khách nêu yêu cầu về thời gian và giá, đầu bếp giới thiệu món ngon có thể chuẩn bị trước, còn nhân viên vệ sinh nhắc rằng rau tươi và món nóng không được để lâu ở nhiệt độ thường. Họ quyết định mở quầy phần nhỏ và ghi nguyên liệu, trọng lượng, thời gian chế biến trên bảng điện tử.",
          ],
          [
            "试行一个月后，窗口前排队的人比预想的多，但食品浪费明显减少。经理没有因此认定方案已经完美，因为调查只覆盖工作日中午，也没有记录旅客是否真正喜欢这些口味。车站准备在周末继续收集意见，再决定是否增加晚餐和地方特色菜。",
            "Sau một tháng thử nghiệm, số người xếp hàng đông hơn dự kiến nhưng lãng phí thực phẩm giảm rõ. Quản lý không coi phương án đã hoàn hảo vì khảo sát mới phủ buổi trưa ngày thường và chưa ghi nhận hành khách có thực sự thích hương vị không. Bến xe sẽ tiếp tục lấy ý kiến cuối tuần trước khi quyết định thêm bữa tối và món địa phương.",
          ],
        ],
        questions: [
          q("main-claim", "Bài nghe chủ yếu trình bày điều gì?", [
            "Quá trình thiết kế và đánh giá quầy phần ăn nhỏ ở nhà ga",
            "Cách một đầu bếp tham gia cuộc thi ẩm thực",
            "Lịch chạy mới của xe đường dài",
            "Lý do nhà ga đóng toàn bộ quầy ăn",
          ], 0, ["lp1", "lp2", "lp3"],
          "Ba đoạn đi từ vấn đề, vai trò các bên đến thử nghiệm và giới hạn kết quả."),
          q("supported-detail", "Nhân viên vệ sinh đóng góp thông tin gì?", [
            "Giá vé của từng chuyến xe",
            "Thời gian bảo quản rau tươi và món nóng",
            "Số ghế còn trống trên xe",
            "Tên của tất cả hành khách",
          ], 1, ["lp2"],
          "Đoạn 2 nêu cảnh báo về việc để rau tươi và món nóng ở nhiệt độ thường."),
          q("cross-paragraph-evidence", "Chi tiết nào nối đúng vấn đề ban đầu với giải pháp?", [
            "Suất đóng sẵn bị thừa; quầy mới bán phần nhỏ và ghi rõ thông tin",
            "Hành khách đi xa; nhà ga đổi màu biển",
            "Người già đến ga; đầu bếp bán đồ uống",
            "Có hai cửa hàng; nhà ga tăng giá vé",
          ], 0, ["lp1", "lp2"],
          "Đoạn 1 nêu phần ăn không phù hợp, đoạn 2 đưa ra phần nhỏ và thông tin minh bạch."),
          q("bounded-inference", "Có thể suy ra thái độ của quản lý đối với kết quả thử nghiệm như thế nào?", [
            "Thận trọng vì dữ liệu còn giới hạn",
            "Hoàn toàn thất vọng vì không ai mua",
            "Chắc chắn mọi hành khách đều thích",
            "Không quan tâm đến lãng phí",
          ], 0, ["lp3"],
          "Quản lý ghi nhận kết quả tích cực nhưng vẫn yêu cầu dữ liệu cuối tuần và khẩu vị.",
          "Có thể suy ra sự thận trọng, nhưng chưa thể suy ra phương án cuối cùng sẽ được mở rộng."),
          q("scope-limit", "Nhận định nào chưa được bài nghe chứng minh?", [
            "Lãng phí thực phẩm đã giảm trong tháng thử nghiệm",
            "Khảo sát mới tập trung vào buổi trưa ngày thường",
            "Quầy phần nhỏ phù hợp với mọi nhà ga trên cả nước",
            "Nhà ga dự định lấy thêm ý kiến cuối tuần",
          ], 2, ["lp3"],
          "Nguồn chỉ nói về một nhà ga và một thời gian thử nghiệm ngắn."),
        ],
        noteMap: map([
          ["problem", "Vấn đề", "Suất ăn cố định gây khó chọn và tạo thức ăn thừa.", ["lp1"]],
          ["traveler", "Góc nhìn hành khách", "Cần nhanh, đúng giá và có phần phù hợp.", ["lp2"]],
          ["kitchen", "Góc nhìn bếp", "Chọn món có thể chuẩn bị trước nhưng vẫn bảo đảm độ tươi.", ["lp2"]],
          ["trial", "Thử nghiệm", "Mở quầy phần nhỏ với bảng nguyên liệu và thời gian.", ["lp2"]],
          ["limit", "Giới hạn dữ liệu", "Chưa có cuối tuần và chưa đo mức thích hương vị.", ["lp3"]],
        ], [
          ["problem", "được phản hồi bởi", "trial"],
          ["traveler", "định hình", "trial"],
          ["kitchen", "giới hạn", "trial"],
          ["limit", "ngăn khái quát quá mức từ", "trial"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán so sánh cách hai nguồn phân vai người tham gia để giải quyết một vấn đề cộng đồng; dùng ít nhất hai dẫn chứng từ mỗi nguồn và nêu một giới hạn.",
      requiredElements: [
        "vấn đề ở nguồn đọc",
        "vai trò và bước chuyển việc",
        "vấn đề ở nguồn nghe",
        "vai trò của ba nhóm",
        "một giới hạn không được khái quát quá mức",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi:
        "两个社区方案都不是由一个人完成的。社区服务表先把居民的问题分类，再由志愿者、交警、医生或维修人员处理；发现紧急留言容易被忽略后，中心又增加了确认步骤。车站则让旅客、厨师和卫生人员共同设计小份窗口，并用电子牌公开材料和时间。两种做法都重视分工和反馈，不过证据只来自一个社区和一个月的工作日试行，不能说明所有地方都适用。",
      modelVi:
        "Cả hai phương án cộng đồng đều không do một người hoàn thành. Bảng dịch vụ phân loại vấn đề rồi chuyển cho tình nguyện viên, cảnh sát, bác sĩ hoặc thợ; khi nhận ra lời nhắn khẩn dễ bị bỏ sót, trung tâm thêm bước xác nhận. Nhà ga để hành khách, đầu bếp và nhân viên vệ sinh cùng thiết kế quầy phần nhỏ, đồng thời công khai nguyên liệu và thời gian. Cả hai coi trọng phân công và phản hồi, nhưng bằng chứng chỉ từ một cộng đồng và một tháng thử nghiệm ngày thường nên không thể khẳng định phù hợp mọi nơi.",
    },
  },
  [ID.process]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "一顿家乡饭怎样变成家庭活动",
        titleVi: "Một bữa cơm quê trở thành hoạt động gia đình như thế nào",
        targetVocabularyIds: [
          V(1210), V(1340), V(1456), V(1812), V(1312),
        ],
        paragraphs: [
          [
            "林然小时候住在老家，每到冬天，父母都会带他去外婆家吃饭。那时做菜主要是长辈的事，孩子们只等着吃小吃和热菜。后来一家人搬到城市，见面的机会变少，这顿饭也从每月一次变成了春节前后才有的家庭聚会。",
            "Khi còn nhỏ ở quê nhà, cứ mùa đông Lâm Nhiên lại theo cha mẹ đến nhà bà ngoại ăn cơm. Khi ấy nấu nướng là việc của người lớn, trẻ con chỉ chờ món ăn vặt và món nóng. Sau khi cả nhà chuyển lên thành phố, dịp gặp nhau ít dần và bữa cơm hàng tháng chỉ còn vào quanh Tết.",
          ],
          [
            "前年，外婆因为腿不方便，提出不再准备大桌饭。林然担心传统就此中断，于是建议把聚会改成共同做饭的活动：父母负责买菜，年轻人整理食谱，孩子洗菜摆桌，外婆只教大家调味。第一次合作并不顺利，几道菜做晚了，可是没人再把外婆当成唯一的厨师。",
            "Hai năm trước, vì chân không thuận tiện, bà ngoại đề nghị không chuẩn bị mâm cơm lớn nữa. Lo truyền thống bị ngắt, Lâm Nhiên đề xuất biến buổi gặp thành hoạt động nấu chung: cha mẹ mua đồ, người trẻ sắp công thức, trẻ em rửa rau bày bàn, bà chỉ hướng dẫn nêm nếm. Lần đầu chưa trôi chảy và vài món bị muộn, nhưng không ai còn xem bà là đầu bếp duy nhất.",
          ],
          [
            "今年，家人提前在网上分配任务，还把每个人学会的一道家乡菜写进家庭食谱。聚会从“回去吃饭”变成了“回去一起完成一件事”。变化没有保留过去的全部形式，却让不同年龄的人都有明确角色，也让孩子知道食物、记忆和亲情是怎样连在一起的。",
            "Năm nay, gia đình phân việc trực tuyến từ trước và ghi món quê mỗi người học được vào sổ công thức chung. Buổi tụ họp đổi từ “về ăn cơm” thành “về cùng hoàn thành một việc”. Sự thay đổi không giữ nguyên mọi hình thức cũ nhưng trao vai trò rõ cho các thế hệ và giúp trẻ hiểu món ăn, ký ức, tình thân liên kết ra sao.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc tập trung vào quá trình thay đổi nào?", [
            "Từ bữa cơm do người lớn chuẩn bị thành hoạt động cả nhà cùng làm",
            "Từ sống ở thành phố trở về quê vĩnh viễn",
            "Từ nấu món quê sang chỉ mua đồ ăn nhanh",
            "Từ gặp nhau hằng năm sang không còn liên lạc",
          ], 0, ["rp1", "rp2", "rp3"],
          "Dòng thời gian cho thấy hình thức và vai trò trong bữa cơm dần thay đổi."),
          q("supported-detail", "Vì sao gia đình phải nghĩ lại cách tổ chức bữa cơm?", [
            "Ngoại không còn tiện đứng nấu một mình",
            "Trẻ em không thích về quê",
            "Cha mẹ muốn bán công thức",
            "Thành phố cấm tụ họp",
          ], 0, ["rp2"],
          "Đoạn 2 nêu chân ngoại không thuận tiện và đề nghị ngừng chuẩn bị mâm lớn."),
          q("cross-paragraph-evidence", "Chi tiết nào thể hiện rõ nhất sự chuyển vai qua thời gian?", [
            "Trẻ chỉ chờ ăn; sau đó mọi lứa tuổi đều nhận nhiệm vụ",
            "Mùa đông lạnh; năm nay trời ấm",
            "Gia đình sống ở quê; ngoại chuyển nhà",
            "Có món ăn vặt; gia đình mua bàn mới",
          ], 0, ["rp1", "rp2", "rp3"],
          "Ba đoạn đối chiếu trẻ chỉ chờ ăn với việc phân công và lưu công thức."),
          q("bounded-inference", "Có thể suy ra điều gì về cách gia đình giữ truyền thống?", [
            "Họ giữ ý nghĩa chung bằng cách thay đổi hình thức",
            "Họ coi mọi thay đổi là mất truyền thống",
            "Họ chỉ quan tâm món ăn có đắt hay không",
            "Họ đã quay lại đúng cách làm cũ",
          ], 0, ["rp2", "rp3"],
          "Gia đình không giữ toàn bộ hình thức cũ nhưng vẫn duy trì ký ức và sự tham gia.",
          "Nguồn hỗ trợ kết luận về gia đình này, không chứng minh mọi truyền thống đều phải thay đổi giống vậy."),
          q("scope-limit", "Nhận định nào không phù hợp với dòng thời gian trong bài?", [
            "Lần hợp tác đầu còn có món làm muộn",
            "Năm nay mọi người phân việc trước",
            "Từ nhỏ Lâm Nhiên luôn là người nấu chính",
            "Vai trò của ngoại đã chuyển từ nấu chính sang hướng dẫn",
          ], 2, ["rp1", "rp2", "rp3"],
          "Đoạn 1 nói trẻ chỉ chờ ăn, nên không thể nói Lâm Nhiên luôn nấu chính."),
        ],
        noteMap: map([
          ["past", "Giai đoạn đầu", "Người lớn nấu, trẻ chờ ăn; gặp mỗi tháng.", ["rp1"]],
          ["change", "Điều kiện thay đổi", "Chuyển thành phố và ngoại khó đứng nấu.", ["rp1", "rp2"]],
          ["proposal", "Đề xuất", "Biến bữa cơm thành hoạt động nấu chung.", ["rp2"]],
          ["trial", "Lần thử", "Có món muộn nhưng vai trò đã được chia.", ["rp2"]],
          ["current", "Hiện tại", "Phân việc trước và lưu công thức gia đình.", ["rp3"]],
        ], [
          ["past", "bị thay đổi bởi", "change"],
          ["change", "dẫn đến", "proposal"],
          ["proposal", "được thử qua", "trial"],
          ["trial", "được ổn định thành", "current"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一次差点儿错过的旅行",
        titleVi: "Một chuyến đi suýt bị bỏ lỡ",
        targetVocabularyIds: [
          V(1490), V(1169), V(1372), V(1070), V(1930),
        ],
        paragraphs: [
          [
            "周五晚上，小周准备周末旅行时，只看了地图上的距离，没有查最新的交通通知。他整理好衣服和证件，计划第二天七点出门，以为一个小时就能到机场。可是夜里市里发布消息：机场方向有道路维修，早高峰可能严重堵车。",
            "Tối thứ Sáu, khi chuẩn bị chuyến du lịch cuối tuần, Tiểu Chu chỉ xem khoảng cách trên bản đồ mà không kiểm tra thông báo giao thông mới. Anh sắp quần áo, giấy tờ và định sáng hôm sau ra khỏi nhà lúc bảy giờ, nghĩ một tiếng là đến sân bay. Nhưng đêm đó thành phố báo tuyến ra sân bay đang sửa và giờ cao điểm có thể tắc nặng.",
          ],
          [
            "第二天，他上出租车后才听司机说起维修。车开了二十分钟几乎没动，他差点儿以为一定赶不上飞机。司机建议在下一站换地铁，小周一边联系航空公司，一边重新整理路线。地铁虽然要换两次，却避开了最堵的一段路。",
            "Sáng hôm sau, lên taxi anh mới nghe tài xế nói về việc sửa đường. Xe chạy hai mươi phút gần như không nhúc nhích, khiến anh suýt nghĩ chắc chắn lỡ chuyến bay. Tài xế đề nghị đổi sang tàu điện ở ga kế; Tiểu Chu vừa liên hệ hãng bay vừa sắp lại lộ trình. Tàu điện phải đổi hai lần nhưng tránh đoạn tắc nhất.",
          ],
          [
            "他最后在停止登机前十五分钟到达。回家后，小周没有只把这次经历解释为“运气好”，而是把准备过程分成三个时间点：前一晚查通知，出门前比较路线，途中保留换车时间。从那以后，他每次旅行都按这张时间表检查，至今没有再遇到同样的问题。",
            "Cuối cùng anh đến trước khi đóng cửa lên máy bay mười lăm phút. Về nhà, Tiểu Chu không chỉ coi đó là may mắn mà chia quá trình chuẩn bị thành ba mốc: kiểm tra thông báo từ tối trước, so lộ trình trước khi đi, chừa thời gian đổi phương tiện. Từ đó anh dùng bảng thời gian này cho mỗi chuyến và chưa lặp lại vấn đề.",
          ],
        ],
        questions: [
          q("main-claim", "Dòng diễn biến chính của bài nghe là gì?", [
            "Chuẩn bị thiếu thông tin, gặp tắc đường, đổi tuyến rồi sửa quy trình",
            "Mua vé sai ngày rồi hủy toàn bộ chuyến đi",
            "Đi tàu điện từ đầu và đến quá sớm",
            "Tài xế đưa khách về quê bằng đường mới",
          ], 0, ["lp1", "lp2", "lp3"],
          "Ba đoạn tương ứng với chuẩn bị, khủng hoảng trên đường và bài học sau chuyến."),
          q("supported-detail", "Điều gì giúp Tiểu Chu tránh đoạn đường tắc nhất?", [
            "Đổi sang tàu điện ở ga kế",
            "Chờ taxi quay lại",
            "Đi bộ đến sân bay",
            "Đổi chuyến sang ngày khác",
          ], 0, ["lp2"],
          "Tài xế đề nghị đổi tàu điện và tuyến này tránh đoạn tắc nhất."),
          q("cross-paragraph-evidence", "Hai hành động nào cho thấy cách chuẩn bị sau chuyến đi đã khác trước?", [
            "Trước chỉ xem khoảng cách; sau kiểm thông báo và so nhiều tuyến",
            "Trước mang giấy tờ; sau bỏ giấy tờ ở nhà",
            "Trước đi cuối tuần; sau không bao giờ đi nữa",
            "Trước dùng taxi; sau chỉ chọn máy bay",
          ], 0, ["lp1", "lp3"],
          "Đoạn 1 mô tả thiếu bước kiểm tra; đoạn 3 thêm các mốc kiểm tra cụ thể."),
          q("bounded-inference", "Có thể suy ra Tiểu Chu hiểu nguyên nhân sự cố như thế nào?", [
            "Không chỉ do tắc đường mà còn do quy trình chuẩn bị thiếu",
            "Hoàn toàn do tài xế cố ý đi chậm",
            "Chỉ vì sân bay đóng sớm",
            "Không có điều gì cần rút kinh nghiệm",
          ], 0, ["lp1", "lp3"],
          "Anh biến trải nghiệm thành quy trình ba mốc thay vì chỉ gọi đó là may mắn.",
          "Có thể kết luận anh nhận ra thiếu sót chuẩn bị, nhưng không biết quy trình mới hiệu quả với mọi tuyến."),
          q("scope-limit", "Nguồn không cho phép khẳng định điều nào?", [
            "Tiểu Chu đến trước giờ đóng cửa lên máy bay",
            "Đường ra sân bay đang sửa",
            "Tàu điện luôn nhanh hơn taxi trong mọi hoàn cảnh",
            "Anh dùng bảng kiểm cho các chuyến sau",
          ], 2, ["lp2", "lp3"],
          "Bài chỉ so sánh hai lựa chọn trong một sự cố cụ thể."),
        ],
        noteMap: map([
          ["plan", "Kế hoạch ban đầu", "Ra đi lúc bảy giờ dựa trên khoảng cách bản đồ.", ["lp1"]],
          ["warning", "Thông tin bị bỏ lỡ", "Thông báo sửa đường và nguy cơ tắc giờ cao điểm.", ["lp1"]],
          ["crisis", "Sự cố", "Taxi gần như không di chuyển và có nguy cơ lỡ chuyến.", ["lp2"]],
          ["reroute", "Điều chỉnh", "Đổi sang tàu điện và sắp lại lộ trình.", ["lp2"]],
          ["routine", "Quy trình mới", "Kiểm thông báo, so tuyến và chừa thời gian đổi xe.", ["lp3"]],
        ], [
          ["plan", "không tính đến", "warning"],
          ["warning", "tạo ra", "crisis"],
          ["crisis", "buộc phải", "reroute"],
          ["reroute", "được rút thành", "routine"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán dựng hai dòng thời gian: sự thay đổi của bữa cơm gia đình và quy trình chuẩn bị chuyến đi; chỉ ra bước ngoặt, phản ứng và điều không thể khái quát.",
      requiredElements: [
        "trạng thái ban đầu của bữa cơm",
        "bước ngoặt và phân vai mới",
        "thiếu sót trước chuyến đi",
        "đổi tuyến và bảng kiểm mới",
        "giới hạn của hai trường hợp",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp2"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "第一条时间线从长辈做饭、孩子等着吃开始。外婆行动不便成为转折点，家人把聚会改成共同做饭，后来又提前分工并保存食谱。第二条时间线从小周只看距离开始，道路维修和堵车使他临时换乘地铁；回家后，他把教训整理成三个检查时间点。两个故事都说明经验能推动流程改变，但它们只记录一个家庭和一次旅行，不能证明同样办法适合所有人。",
      modelVi:
        "Dòng thời gian thứ nhất bắt đầu từ việc người lớn nấu còn trẻ chờ ăn. Việc bà ngoại đi lại khó trở thành bước ngoặt; gia đình đổi sang cùng nấu, rồi phân việc trước và lưu công thức. Dòng thứ hai bắt đầu khi Tiểu Chu chỉ xem khoảng cách; sửa đường và tắc xe buộc anh đổi tàu điện, sau đó rút kinh nghiệm thành ba mốc kiểm tra. Hai câu chuyện đều cho thấy trải nghiệm thúc đẩy thay đổi quy trình, nhưng chỉ ghi lại một gia đình và một chuyến đi nên không chứng minh cách đó phù hợp mọi người.",
    },
  },
  [ID.cause]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "寒假景区收费变化的原因",
        titleVi: "Nguyên nhân thay đổi cách thu phí ở điểm du lịch kỳ nghỉ đông",
        targetVocabularyIds: [
          V(1285), V(1341), V(1173), V(1677), V(1713),
        ],
        paragraphs: [
          [
            "去年寒假，青山镇的古桥吸引了很多游客。古桥原来不收费，大家可以自由进入，可是停车场很小，入口也只有一条路。中午以后，等候参观的队越来越长，有些人为了拍照走到危险的位置，附近居民回家的路也常被挡住。",
            "Kỳ nghỉ đông năm ngoái, cây cầu cổ ở thị trấn Thanh Sơn thu hút rất nhiều du khách. Nơi này vốn miễn phí và ra vào tự do, nhưng bãi xe nhỏ, lối vào chỉ có một. Sau buổi trưa, hàng người chờ dài dần; có người bước tới vị trí nguy hiểm để chụp ảnh, còn đường về nhà của cư dân thường bị chặn.",
          ],
          [
            "镇里最初提出向所有游客收费，希望用门票收入增加管理人员。部分居民反对，因为古桥也是他们日常经过的地方。经过两次公开讨论，管理方改为预约分时进入：外地游客支付小额服务费，本地居民凭证件免费，老人和儿童每天还有不收费的固定时段。",
            "Ban đầu thị trấn đề xuất thu phí tất cả du khách để dùng tiền vé tăng nhân viên quản lý. Một số cư dân phản đối vì cây cầu cũng là lối đi hằng ngày. Sau hai cuộc thảo luận công khai, ban quản lý chuyển sang đặt lịch theo khung giờ: khách ngoài vùng trả phí dịch vụ nhỏ, cư dân địa phương miễn phí bằng giấy tờ, người già và trẻ em có giờ miễn phí cố định.",
          ],
          [
            "新办法实行后，队伍变短，危险位置也有人提醒，但问题没有完全消失。节日期间预约很快满了，一些临时回家乡的人无法进入。管理方因此说明，收费只是支持管理的条件之一，真正起作用的是人数限制、现场引导和居民参与；明年还要增加临时名额并重新评估。",
            "Sau khi áp dụng, hàng chờ ngắn hơn và vị trí nguy hiểm có người nhắc, nhưng vấn đề chưa hết. Ngày lễ, lịch nhanh chóng kín khiến một số người bất chợt về quê hương không thể vào. Ban quản lý giải thích thu phí chỉ là một điều kiện hỗ trợ; tác động thật còn đến từ giới hạn số người, hướng dẫn tại chỗ và sự tham gia của cư dân; năm sau sẽ thêm suất và đánh giá lại.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc phân tích mối quan hệ nào?", [
            "Từ quá tải nhiều nguyên nhân đến giải pháp thu phí có điều kiện",
            "Từ một cây cầu mới đến việc đóng cửa vĩnh viễn",
            "Từ kỳ nghỉ hè đến kế hoạch xây khách sạn",
            "Từ giá vé tàu đến thu nhập của hướng dẫn viên",
          ], 0, ["rp1", "rp2", "rp3"],
          "Nguồn tách nguyên nhân quá tải, điều kiện thực hiện và hệ quả chưa hoàn toàn."),
          q("supported-detail", "Vì sao cư dân phản đối đề xuất thu phí tất cả mọi người?", [
            "Cầu là lối đi hằng ngày của họ",
            "Họ muốn phá bỏ cây cầu",
            "Bãi xe không thuộc thị trấn",
            "Khách du lịch không chụp ảnh",
          ], 0, ["rp2"],
          "Đoạn 2 nêu trực tiếp cây cầu là tuyến sinh hoạt thường ngày."),
          q("cross-paragraph-evidence", "Cặp chi tiết nào phân biệt nguyên nhân trực tiếp và điều kiện hỗ trợ?", [
            "Hàng dài và lối nhỏ gây quá tải; phí chỉ hỗ trợ thêm người quản lý",
            "Khách chụp ảnh; mùa đông lạnh",
            "Cư dân về nhà; trẻ em miễn phí",
            "Đặt lịch; cây cầu có lịch sử",
          ], 0, ["rp1", "rp2", "rp3"],
          "Đoạn 1 cho nguyên nhân quá tải; đoạn 2–3 cho thấy phí là công cụ chứ không phải nguyên nhân duy nhất."),
          q("bounded-inference", "Có thể suy ra vì sao phương án cuối không thu phí đồng loạt?", [
            "Cần cân bằng quản lý du lịch với nhu cầu sinh hoạt địa phương",
            "Thị trấn không cần bất kỳ nhân viên nào",
            "Mọi du khách đều phản đối trả tiền",
            "Cầu chỉ dành cho trẻ em",
          ], 0, ["rp2", "rp3"],
          "Quy định phân nhóm phản ánh quyền đi lại của cư dân và nhu cầu kiểm soát khách.",
          "Nguồn cho thấy một thỏa hiệp địa phương, không chứng minh đây là mô hình tối ưu cho mọi di tích."),
          q("scope-limit", "Nhận định nào đơn giản hóa quá mức kết quả?", [
            "Hàng chờ đã ngắn hơn",
            "Phí là nguyên nhân duy nhất làm tình hình tốt hơn",
            "Ngày lễ vẫn có người không đặt được chỗ",
            "Năm sau sẽ tiếp tục đánh giá",
          ], 1, ["rp3"],
          "Đoạn 3 nói rõ giới hạn người, hướng dẫn và cư dân cùng tạo tác động."),
        ],
        noteMap: map([
          ["background", "Điều kiện nền", "Lối vào và bãi xe nhỏ trong mùa đông đông khách.", ["rp1"]],
          ["direct", "Vấn đề trực tiếp", "Hàng dài, vị trí nguy hiểm và chặn đường cư dân.", ["rp1"]],
          ["proposal", "Đề xuất đầu", "Thu phí tất cả để tăng người quản lý.", ["rp2"]],
          ["condition", "Điều chỉnh điều kiện", "Đặt giờ và miễn phí theo nhóm.", ["rp2"]],
          ["outcome", "Hệ quả và phần còn lại", "Hàng ngắn hơn nhưng ngày lễ vẫn thiếu suất.", ["rp3"]],
        ], [
          ["background", "làm tăng", "direct"],
          ["direct", "dẫn tới", "proposal"],
          ["proposal", "được sửa thành", "condition"],
          ["condition", "tạo ra nhưng chưa giải quyết hết", "outcome"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "从一次咳嗽到健康习惯",
        titleVi: "Từ một cơn ho đến thói quen sức khỏe",
        targetVocabularyIds: [
          V(1427), V(1640), V(1821), V(1856), V(1962),
        ],
        paragraphs: [
          [
            "去年十二月，陈老师连续几天咳，早晨测体温只有三十六点八摄氏度，因此他认为没有发烧就不用休息。他照常上课，晚上还准备材料，结果咳得更厉害，心情也因为睡不好而变差。医生检查后说，问题虽然不严重，但疲劳和干燥空气会让症状持续。",
            "Tháng mười hai năm ngoái, thầy Trần ho nhiều ngày; nhiệt độ sáng chỉ 36,8 độ C nên thầy nghĩ không sốt thì không cần nghỉ. Thầy vẫn dạy và chuẩn bị tài liệu buổi tối, khiến ho nặng hơn, tâm trạng xấu đi vì thiếu ngủ. Bác sĩ nói bệnh không nghiêm trọng nhưng mệt mỏi và không khí khô làm triệu chứng kéo dài.",
          ],
          [
            "医生没有只给药，而是提出三个条件：每天记录睡眠和咳嗽次数，教室保持一定湿度，连续说话四十分钟后休息。学校也调整了两节课，请同事代课。陈老师一开始觉得麻烦，后来发现记录让他看见哪一天休息少、症状就明显增加。",
            "Bác sĩ không chỉ kê thuốc mà đưa ba điều kiện: ghi giấc ngủ và số lần ho, giữ độ ẩm lớp học, nghỉ sau bốn mươi phút nói liên tục. Trường đổi hai tiết và nhờ đồng nghiệp dạy thay. Ban đầu thầy thấy phiền, sau nhận ra bảng ghi cho thấy ngày nghỉ ít thì triệu chứng tăng rõ.",
          ],
          [
            "两周后，他基本恢复，却继续保留记录和休息安排。陈老师说，这次经历使他养成了重视早期信号的习惯，但他没有把一次恢复当成医学证明。记录只反映他个人的情况，若以后高烧或呼吸困难，仍要及时就医，而不能只靠原来的办法。",
            "Hai tuần sau, thầy gần hồi phục nhưng vẫn giữ việc ghi chép và nghỉ. Trải nghiệm giúp thầy hình thành thói quen coi trọng dấu hiệu sớm, song thầy không xem một lần hồi phục là bằng chứng y học. Ghi chép chỉ phản ánh cá nhân; nếu sốt cao hoặc khó thở vẫn phải đi khám chứ không chỉ dựa cách cũ.",
          ],
        ],
        questions: [
          q("main-claim", "Bài nghe giải thích quá trình nào?", [
            "Một triệu chứng kéo dài dẫn đến điều chỉnh và hình thành thói quen",
            "Một giáo viên đổi nghề vì không thích lớp học",
            "Một bác sĩ xây trường mới",
            "Một nghiên cứu chứng minh thuốc không cần thiết",
          ], 0, ["lp1", "lp2", "lp3"],
          "Nguồn đi từ nguyên nhân duy trì triệu chứng đến điều kiện phục hồi và thói quen."),
          q("supported-detail", "Bảng ghi chép giúp thầy Trần nhận ra điều gì?", [
            "Ngày nghỉ ít thì triệu chứng tăng",
            "Mọi học sinh đều bị ho",
            "Độ C không dùng được",
            "Thuốc luôn làm tâm trạng xấu",
          ], 0, ["lp2"],
          "Đoạn 2 nêu quan hệ quan sát giữa nghỉ ít và triệu chứng rõ hơn."),
          q("cross-paragraph-evidence", "Yếu tố nào vừa là nguyên nhân duy trì vừa là mục tiêu điều chỉnh?", [
            "Thiếu nghỉ ngơi",
            "Tên của bác sĩ",
            "Số lượng học sinh",
            "Màu của lớp học",
          ], 0, ["lp1", "lp2"],
          "Đoạn 1 nói mệt mỏi kéo dài triệu chứng; đoạn 2 thêm nghỉ và đổi tiết."),
          q("bounded-inference", "Có thể suy ra thái độ của thầy đối với dữ liệu cá nhân?", [
            "Dùng để điều chỉnh nhưng không coi là bằng chứng chung",
            "Tin rằng dữ liệu cá nhân thay thế bác sĩ",
            "Không bao giờ xem lại ghi chép",
            "Cho rằng nhiệt độ luôn không quan trọng",
          ], 0, ["lp2", "lp3"],
          "Thầy dùng ghi chép để thấy mẫu nhưng nói rõ giới hạn cá nhân và dấu hiệu cần khám.",
          "Có thể kết luận thầy dùng dữ liệu thận trọng; không thể suy ra hiệu quả y khoa cho người khác."),
          q("scope-limit", "Khuyến nghị nào KHÔNG xuất hiện trong nguồn?", [
            "Đi khám nếu sốt cao hoặc khó thở",
            "Giữ độ ẩm lớp học",
            "Nghỉ sau thời gian nói liên tục",
            "Mọi người bị ho đều chỉ cần ghi chép ở nhà",
          ], 3, ["lp2", "lp3"],
          "Nguồn ngược lại cảnh báo không được thay thế việc đi khám bằng cách cũ."),
        ],
        noteMap: map([
          ["symptom", "Dấu hiệu", "Ho kéo dài nhưng chưa sốt.", ["lp1"]],
          ["background", "Yếu tố nền", "Thiếu ngủ, mệt và không khí khô.", ["lp1"]],
          ["conditions", "Điều kiện can thiệp", "Ghi chép, độ ẩm và nghỉ giọng.", ["lp2"]],
          ["result", "Kết quả", "Gần hồi phục sau hai tuần.", ["lp3"]],
          ["boundary", "Giới hạn", "Một trường hợp không thay thế bằng chứng hay khám bệnh.", ["lp3"]],
        ], [
          ["background", "kéo dài", "symptom"],
          ["conditions", "hỗ trợ", "result"],
          ["symptom", "thúc đẩy", "conditions"],
          ["boundary", "giới hạn cách hiểu", "result"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán phân biệt nguyên nhân trực tiếp, điều kiện hỗ trợ, kết quả và giới hạn trong hai nguồn về quản lý điểm du lịch và sức khỏe cá nhân.",
      requiredElements: [
        "điều kiện nền ở cây cầu",
        "biện pháp thu phí/đặt lịch",
        "yếu tố kéo dài cơn ho",
        "ba điều kiện điều chỉnh",
        "giới hạn kết luận của cả hai",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "古桥的问题来自入口小、游客多和现场行为不安全，收费只为增加管理资源，预约、人数限制和居民参与也起作用。实行后队伍变短，但节日名额不足仍未解决。陈老师的咳嗽不严重，却因疲劳和空气干燥持续；记录、休息和调整环境帮助他恢复。两个结果都由多个条件共同形成，而且一个景区的试行和一个人的记录都不能证明办法对所有情况有效。",
      modelVi:
        "Vấn đề cây cầu đến từ lối nhỏ, đông khách và hành vi thiếu an toàn; thu phí chỉ tạo nguồn lực quản lý, còn đặt lịch, giới hạn người và cư dân cùng góp tác dụng. Hàng chờ ngắn hơn nhưng thiếu suất ngày lễ chưa hết. Cơn ho của thầy Trần không nặng song kéo dài vì mệt và không khí khô; ghi chép, nghỉ và điều chỉnh môi trường hỗ trợ hồi phục. Cả hai kết quả do nhiều điều kiện cùng tạo ra, và một thử nghiệm điểm du lịch hay một ghi chép cá nhân không chứng minh hiệu quả cho mọi trường hợp.",
    },
  },
  [ID.compare]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "同样的气温，不同的运动选择",
        titleVi: "Cùng nhiệt độ, lựa chọn vận động khác nhau",
        targetVocabularyIds: [
          V(1573), V(1498), V(1429), V(1748), V(1606),
        ],
        paragraphs: [
          [
            "社区运动小组比较了春天两次活动。第一次早晨气温十二摄氏度，风很小，参加者穿毛衣快走四十分钟；第二次气温同样是十二度，却有大风和小雨，小组原计划骑车，后来改到室内做拉伸。只看温度数字，两天似乎没有差别。",
            "Nhóm vận động cộng đồng so sánh hai hoạt động mùa xuân. Lần đầu buổi sáng 12 độ C, ít gió, người tham gia mặc áo len đi nhanh bốn mươi phút. Lần hai cũng 12 độ nhưng gió lớn, mưa nhỏ; kế hoạch đạp xe được đổi thành giãn cơ trong nhà. Chỉ nhìn nhiệt độ thì hai ngày tưởng không khác.",
          ],
          [
            "活动后，第一次有八成成员表示强度合适，第二次却只有一半人喜欢临时改变。年轻成员觉得室内活动安全但不够有趣，几位老人则认为避免湿滑道路更重要。可惜调查没有记录每个人原来的运动习惯，也没有问他们是否带了防雨衣服。",
            "Sau hoạt động, lần đầu tám phần mười thành viên cho rằng cường độ phù hợp, còn lần hai chỉ một nửa thích thay đổi đột ngột. Người trẻ thấy trong nhà an toàn nhưng kém thú vị; vài người cao tuổi coi tránh đường trơn quan trọng hơn. Tiếc là khảo sát không ghi thói quen vận động ban đầu hay việc có mang đồ mưa.",
          ],
          [
            "负责人因此提出两套方案：风雨小的时候保留户外活动，同时准备较短路线；天气变化明显时提前一天通知并提供室内选择。两套方案都以安全为基础，却不要求所有成员做同样的项目。小组准备分别记录年龄、经验和满意度，看看差异来自天气、通知时间还是个人习惯。",
            "Người phụ trách đề xuất hai phương án: mưa gió nhẹ thì giữ hoạt động ngoài trời nhưng chuẩn bị tuyến ngắn; thời tiết thay đổi rõ thì báo trước một ngày và cho lựa chọn trong nhà. Cả hai đặt an toàn làm nền nhưng không buộc mọi người cùng một bài. Nhóm sẽ ghi tuổi, kinh nghiệm, mức hài lòng để xem khác biệt do thời tiết, thời gian báo hay thói quen.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc muốn chỉ ra điều gì qua hai buổi hoạt động?", [
            "Cùng nhiệt độ vẫn có thể cần phương án khác vì điều kiện và người tham gia",
            "Mọi hoạt động ngoài trời đều nguy hiểm",
            "Người cao tuổi không nên vận động",
            "Áo len quyết định toàn bộ mức hài lòng",
          ], 0, ["rp1", "rp2", "rp3"],
          "Bài đối chiếu điều kiện giống/khác, phản ứng nhóm và phương án linh hoạt."),
          q("supported-detail", "Điểm khác biệt rõ giữa hai ngày là gì?", [
            "Nhiệt độ",
            "Gió và mưa",
            "Số thành viên của cộng đồng",
            "Địa điểm sinh sống",
          ], 1, ["rp1"],
          "Nhiệt độ giống nhau nhưng ngày thứ hai có gió lớn và mưa nhỏ."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy phản ứng không giống nhau giữa các nhóm?", [
            "Người trẻ thiếu hứng thú; một số người già ưu tiên tránh đường trơn",
            "Mọi người đều chọn đi xe đạp",
            "Tất cả đều mặc cùng một áo len",
            "Không ai quan tâm an toàn",
          ], 0, ["rp2", "rp3"],
          "Đoạn 2 nêu ưu tiên khác nhau; đoạn 3 tránh buộc mọi người cùng một dự án."),
          q("bounded-inference", "Có thể suy ra vì sao nhóm muốn ghi thêm tuổi và kinh nghiệm?", [
            "Để kiểm tra nguồn tạo ra khác biệt thay vì quy hết cho thời tiết",
            "Để loại người lớn tuổi khỏi nhóm",
            "Để bán quần áo chống mưa",
            "Để chứng minh hoạt động trong nhà luôn tốt hơn",
          ], 0, ["rp2", "rp3"],
          "Khảo sát cũ thiếu biến cá nhân nên nhóm muốn tách các khả năng giải thích.",
          "Nguồn chỉ nói họ sẽ thu thập thêm; chưa có kết quả để kết luận biến nào quan trọng nhất."),
          q("scope-limit", "Khái quát nào bị bài đọc bác bỏ?", [
            "Cùng nhiệt độ nghĩa là điều kiện vận động hoàn toàn giống nhau",
            "Gió mưa có thể ảnh hưởng kế hoạch",
            "Thông báo sớm có thể giúp lựa chọn",
            "Các nhóm tuổi có thể có ưu tiên khác",
          ], 0, ["rp1", "rp2"],
          "Hai ngày cùng nhiệt độ nhưng khác gió, mưa, hoạt động và phản ứng."),
        ],
        noteMap: map([
          ["constant", "Điểm giống", "Cùng nhiệt độ mười hai độ C.", ["rp1"]],
          ["variation", "Điểm khác", "Gió, mưa và loại hoạt động.", ["rp1"]],
          ["responses", "Phản ứng", "Người trẻ và người già nhấn mạnh lợi ích khác nhau.", ["rp2"]],
          ["missing", "Dữ liệu thiếu", "Thói quen và đồ chống mưa chưa được ghi.", ["rp2"]],
          ["design", "Thiết kế mới", "Hai phương án và thêm biến cá nhân.", ["rp3"]],
        ], [
          ["constant", "không loại bỏ", "variation"],
          ["variation", "liên quan tới", "responses"],
          ["missing", "giới hạn cách giải thích", "responses"],
          ["missing", "được bổ sung trong", "design"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "两次旅行中的信息差",
        titleVi: "Chênh lệch thông tin trong hai chuyến đi",
        targetVocabularyIds: [
          V(1138), V(1289), V(1068), V(1858), V(1786),
        ],
        paragraphs: [
          [
            "旅行社回顾了两次去南山的行程。春季团乘早班航班，到达后由导游带大家参观茶园，主人邀请游客品尝新茶，并说明茶叶的制作过程。出发前，行程表写得很清楚，游客知道要走山路，也提前准备了合适的鞋。",
            "Công ty du lịch nhìn lại hai chuyến tới Nam Sơn. Đoàn mùa xuân đi chuyến bay sớm, được hướng dẫn viên đưa thăm đồi trà; chủ nhà mời khách nếm trà mới và giải thích quy trình làm lá trà. Lịch trình trước chuyến rõ ràng, khách biết phải đi đường núi và chuẩn bị giày phù hợp.",
          ],
          [
            "秋季团的路线基本相同，可是航班晚点后，导游只在群里说“下午活动调整”，没有说明茶园参观缩短。几位游客以为活动被取消，便留在酒店；另一些人按原时间等车，双方都产生了误会。茶园主人也按原人数准备，最后剩下不少茶点。",
            "Đoàn mùa thu có tuyến gần như giống, nhưng sau khi chuyến bay trễ, hướng dẫn viên chỉ nhắn “điều chỉnh hoạt động chiều” mà không nói chuyến thăm đồi trà bị rút ngắn. Một số khách tưởng bị hủy nên ở khách sạn; người khác chờ xe theo giờ cũ, tạo hiểu lầm. Chủ đồi trà chuẩn bị theo số cũ nên dư nhiều đồ.",
          ],
          [
            "旅行社比较后认为，差别不在景点本身，而在信息是否具体、是否确认收到。今后调整行程时，导游要同时写明“什么变了、为什么变、游客要做什么”，并请每位游客回复。公司还会电话联系没有读消息的人，不过这项办法是否能减少所有误会，还需要更多行程验证。",
            "Sau so sánh, công ty cho rằng khác biệt không nằm ở điểm đến mà ở thông tin có cụ thể và được xác nhận hay không. Từ nay khi đổi lịch, hướng dẫn viên phải ghi “điều gì đổi, vì sao, khách cần làm gì” và yêu cầu phản hồi. Công ty sẽ gọi người chưa đọc tin, nhưng việc này có giảm mọi hiểu lầm hay không vẫn cần thêm chuyến để kiểm chứng.",
          ],
        ],
        questions: [
          q("main-claim", "So sánh hai chuyến đi nhằm làm rõ yếu tố nào?", [
            "Chất lượng và xác nhận thông tin khi lịch trình thay đổi",
            "Giá của các loại trà",
            "Khác biệt giữa máy bay và tàu",
            "Khả năng nấu ăn của hướng dẫn viên",
          ], 0, ["lp1", "lp2", "lp3"],
          "Hai tuyến gần giống nhưng kết quả khác do cách truyền đạt và xác nhận."),
          q("supported-detail", "Vì sao một số khách mùa thu ở lại khách sạn?", [
            "Họ hiểu rằng hoạt động đã bị hủy",
            "Họ không thích uống trà",
            "Họ làm mất hộ chiếu",
            "Họ chưa mua vé máy bay",
          ], 0, ["lp2"],
          "Tin nhắn mơ hồ khiến họ nghĩ hoạt động bị hủy."),
          q("cross-paragraph-evidence", "Cặp chi tiết nào tạo đối chiếu mạnh nhất?", [
            "Lịch xuân cụ thể giúp chuẩn bị; tin thu mơ hồ tạo hai cách hiểu",
            "Hai đoàn đều tới Nam Sơn; cả hai đều ở khách sạn",
            "Chủ nhà có trà; công ty có điện thoại",
            "Máy bay có ghế; đường núi có cây",
          ], 0, ["lp1", "lp2"],
          "Đoạn 1 cho thông tin đủ và chuẩn bị đúng; đoạn 2 cho thông tin thiếu và hiểu lầm."),
          q("bounded-inference", "Có thể suy ra vì sao công ty yêu cầu khách trả lời tin nhắn?", [
            "Để biết thông tin đã tới người nhận",
            "Để bán thêm trà",
            "Để thay thế hoàn toàn hướng dẫn viên",
            "Để bảo đảm chuyến bay không bao giờ trễ",
          ], 0, ["lp3"],
          "Xác nhận phản hồi giải quyết khoảng trống “đã gửi nhưng chưa biết đã nhận”.",
          "Nguồn cho phép suy ra mục đích xác nhận, nhưng chưa chứng minh biện pháp loại bỏ mọi hiểu lầm."),
          q("scope-limit", "Kết luận nào thận trọng nhất theo nguồn?", [
            "Quy tắc mới có lý do rõ nhưng còn cần kiểm chứng qua nhiều chuyến",
            "Quy tắc mới chắc chắn chấm dứt mọi sai sót",
            "Mọi hướng dẫn viên trước đây đều làm việc kém",
            "Điểm du lịch mùa thu không nên mở cửa",
          ], 0, ["lp3"],
          "Đoạn cuối nói trực tiếp cần thêm hành trình để xác minh hiệu quả."),
        ],
        noteMap: map([
          ["spring", "Chuyến xuân", "Lịch cụ thể, khách chuẩn bị đúng.", ["lp1"]],
          ["autumn", "Chuyến thu", "Tin điều chỉnh thiếu chi tiết.", ["lp2"]],
          ["effects", "Hệ quả khác biệt", "Khách chia hai cách hiểu và đồ ăn bị dư.", ["lp2"]],
          ["explanation", "Giải thích", "Độ cụ thể và xác nhận nhận tin.", ["lp3"]],
          ["test", "Cách thử tiếp", "Tin ba phần, yêu cầu trả lời và gọi người chưa đọc.", ["lp3"]],
        ], [
          ["spring", "được đối chiếu với", "autumn"],
          ["autumn", "gây ra", "effects"],
          ["explanation", "giải thích", "effects"],
          ["explanation", "dẫn tới", "test"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán so sánh biến số giống, biến số khác và ngoại lệ trong hai nguồn; giải thích vì sao không được quy mọi kết quả cho một yếu tố.",
      requiredElements: [
        "nhiệt độ giống nhưng gió mưa khác",
        "phản ứng khác giữa người tham gia",
        "tuyến du lịch gần giống",
        "độ cụ thể của thông tin khác",
        "dữ liệu còn thiếu hoặc cần kiểm chứng",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp2"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "运动小组的两天都有十二度，但风雨、活动地点和成员反应不同，因此不能只用气温解释满意度；原来的调查还缺少运动习惯等资料。两次南山旅行的路线基本相同，春季通知具体，游客准备充分；秋季消息模糊，便出现不同理解。两份材料都用相似条件突出关键差异，也承认年龄、经验和更多行程尚未验证，所以结论只能说明可能因素，不能说某一个因素决定全部结果。",
      modelVi:
        "Hai ngày vận động đều 12 độ nhưng khác mưa gió, địa điểm và phản ứng, nên không thể chỉ dùng nhiệt độ giải thích hài lòng; khảo sát cũ còn thiếu thói quen vận động. Hai chuyến Nam Sơn gần cùng tuyến, nhưng thông báo mùa xuân cụ thể giúp chuẩn bị đầy đủ, còn tin mùa thu mơ hồ tạo nhiều cách hiểu. Cả hai nguồn dùng điều kiện tương tự để làm nổi biến khác biệt, đồng thời thừa nhận tuổi, kinh nghiệm và thêm hành trình chưa được kiểm chứng; vì vậy kết luận chỉ nêu yếu tố có thể liên quan chứ không coi một yếu tố quyết định mọi kết quả.",
    },
  },
  [ID.evidence]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "小区公共房间真的利用不足吗",
        titleVi: "Phòng sinh hoạt chung có thật sự chưa được tận dụng?",
        targetVocabularyIds: [
          V(1035), V(1067), V(1175), V(1963), V(1678),
        ],
        paragraphs: [
          [
            "海风小区有一间公共房间，位置在大门对面。物业查看预约表后表示，过去三个月平均每天只有两次登记，因此建议把房间租给商店，增加小区收入。这个数字看起来支持“利用不足”的判断，周围几栋楼的居民却提出了不同意见。",
            "Khu Hải Phong có một phòng sinh hoạt chung đối diện cổng. Sau khi xem bảng đặt chỗ, ban quản lý cho biết ba tháng qua trung bình chỉ có hai lượt đăng ký mỗi ngày, nên đề nghị cho cửa hàng thuê để tăng thu nhập khu. Con số có vẻ ủng hộ nhận định “chưa tận dụng”, nhưng cư dân quanh đó đưa ý kiến khác.",
          ],
          [
            "居民调查发现，很多老人上午直接去下棋，没有使用网上预约；孩子放学后在门口读书，也没有被登记。另一方面，房间晚上确实常空着，冬天暖气费用还很高。也就是说，预约表低估了部分白天使用，却可能准确反映了晚上的空闲情况。",
            "Khảo sát cư dân thấy nhiều người già buổi sáng đến chơi cờ trực tiếp mà không đặt trên mạng; trẻ đọc sách ở cửa sau giờ học cũng không được ghi. Mặt khác, buổi tối phòng thường trống và chi phí sưởi mùa đông cao. Như vậy, bảng đặt chỗ đánh giá thấp một phần sử dụng ban ngày nhưng có thể phản ánh đúng thời gian trống buổi tối.",
          ],
          [
            "双方最后同意先进行四周人工计数，分别记录时间、活动人数和是否预约，再讨论用途。物业还公开电费和可能的租金，居民则提出晚上开付费课程、白天保留免费空间的方案。目前证据只能说明原来的登记不完整，不能直接证明出租或保留哪一种选择更好。",
            "Hai bên thống nhất đếm thủ công bốn tuần, tách thời gian, số người và có đặt chỗ hay không rồi mới bàn công dụng. Ban quản lý công khai tiền điện và tiền thuê dự kiến; cư dân đề xuất tối mở lớp có phí, ban ngày giữ không gian miễn phí. Hiện bằng chứng chỉ cho thấy ghi chép cũ chưa đầy đủ, chưa chứng minh cho thuê hay giữ lại tốt hơn.",
          ],
        ],
        questions: [
          q("main-claim", "Luận điểm trung tâm của bài đọc là gì?", [
            "Dữ liệu đặt chỗ chưa đủ để quyết định công dụng phòng chung",
            "Mọi phòng chung đều phải cho thuê",
            "Cư dân không bao giờ dùng phòng vào ban ngày",
            "Tiền điện là thông tin duy nhất cần xem",
          ], 0, ["rp1", "rp2", "rp3"],
          "Bài kiểm tra luận điểm “sử dụng ít” bằng dữ liệu bổ sung và nêu giới hạn quyết định."),
          q("supported-detail", "Chi tiết nào cho thấy bảng đặt chỗ thiếu dữ liệu ban ngày?", [
            "Người già và trẻ sử dụng mà không đăng ký",
            "Phòng nằm đối diện cổng",
            "Mùa đông có tiền sưởi",
            "Ban quản lý muốn tăng thu nhập",
          ], 0, ["rp2"],
          "Đoạn 2 nêu hai nhóm sử dụng không xuất hiện trong bảng."),
          q("cross-paragraph-evidence", "Bằng chứng nào vừa ủng hộ vừa hạn chế nhận định “sử dụng ít”?", [
            "Số đăng ký thấp nhưng có người dùng không đăng ký",
            "Phòng có cửa và có bàn",
            "Cư dân sống gần và ban quản lý có văn phòng",
            "Có lớp học và có cửa hàng",
          ], 0, ["rp1", "rp2"],
          "Đăng ký trung bình thấp ủng hộ luận điểm, còn quan sát không đăng ký làm yếu nó."),
          q("bounded-inference", "Có thể suy ra mục đích của việc đếm thủ công bốn tuần?", [
            "Kiểm tra độ đầy đủ của dữ liệu trước khi chọn phương án",
            "Chứng minh ngay rằng cư dân luôn đúng",
            "Tăng tiền thuê mà không thông báo",
            "Ngăn mọi người vào phòng",
          ], 0, ["rp2", "rp3"],
          "Cách đếm mới đo cả sử dụng không đặt trước và theo thời gian.",
          "Mục đích là cải thiện bằng chứng; kết quả chưa có nên chưa được suy ra phương án thắng."),
          q("scope-limit", "Kết luận nào vượt nguồn?", [
            "Dữ liệu cũ chưa đầy đủ",
            "Buổi tối thường có thời gian trống",
            "Phương án kết hợp chắc chắn mang lại lợi ích cao nhất",
            "Hai bên muốn thu thêm dữ liệu",
          ], 2, ["rp2", "rp3"],
          "Phương án kết hợp mới chỉ là đề xuất, chưa có kết quả so sánh."),
        ],
        noteMap: map([
          ["claim", "Luận điểm đầu", "Phòng ít dùng nên có thể cho thuê.", ["rp1"]],
          ["support", "Bằng chứng ủng hộ", "Trung bình hai đăng ký và buổi tối trống.", ["rp1", "rp2"]],
          ["counter", "Bằng chứng phản bác", "Có sử dụng ban ngày không được đăng ký.", ["rp2"]],
          ["gap", "Khoảng trống", "Chưa đo theo thời gian, số người và cách vào.", ["rp2"]],
          ["next", "Bước kiểm tra", "Đếm bốn tuần và công khai chi phí/lợi ích.", ["rp3"]],
        ], [
          ["support", "ủng hộ một phần", "claim"],
          ["counter", "làm yếu", "claim"],
          ["gap", "được xử lý bởi", "next"],
          ["next", "sẽ kiểm tra lại", "claim"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一家理发店的“午后信号”",
        titleVi: "“Tín hiệu buổi chiều” của một tiệm cắt tóc",
        targetVocabularyIds: [
          V(1428), V(1460), V(1497), V(1785), V(1822),
        ],
        paragraphs: [
          [
            "社区广播采访了一家理发店。店主说，最近常有客人在午餐后咳嗽，因此他怀疑店里的毛巾清洗不干净。为了安全，他立刻更换了清洗用品，还减少了每天理发的人数。两周后，客人咳嗽的报告似乎少了，他便认为新用品有效。",
            "Đài cộng đồng phỏng vấn một tiệm cắt tóc. Chủ tiệm nói gần đây khách thường ho sau bữa trưa nên nghi khăn mặt chưa giặt sạch. Để an toàn, ông đổi chất giặt và giảm số người cắt tóc mỗi ngày. Hai tuần sau, báo cáo ho có vẻ ít đi nên ông cho rằng chất mới hiệu quả.",
          ],
          [
            "一位顾客提醒，咳嗽也可能与下午的道路施工有关。店门打开时，灰尘会进入室内；施工队午休结束后，声音和灰尘同时增加。广播记者查看记录，发现“咳嗽减少”的两周正好下雨较多，店门大部分时间关闭，而且记录只写了主动反映的客人。",
            "Một khách nhắc rằng ho có thể liên quan công trình đường buổi chiều. Khi cửa mở, bụi bay vào; sau giờ nghỉ trưa của đội thi công, tiếng ồn và bụi cùng tăng. Phóng viên xem ghi chép và thấy hai tuần “giảm ho” trùng lúc mưa nhiều, cửa phần lớn đóng, trong khi sổ chỉ ghi người chủ động báo.",
          ],
          [
            "这些信息没有证明清洗用品无效，只说明原来的判断缺少对照。店主决定同时记录门窗状态、施工时间、天气和客人反映，并请客人扫描二维码报告。广播把这种变化称为一个信号：当结果可能由多个原因造成时，先补充证据，再判断哪项措施真正有效。",
            "Thông tin này không chứng minh chất giặt vô hiệu mà chỉ cho thấy phán đoán ban đầu thiếu đối chiếu. Chủ tiệm sẽ ghi trạng thái cửa, giờ thi công, thời tiết và phản ánh, đồng thời mời khách quét mã báo cáo. Đài gọi thay đổi này là tín hiệu: khi kết quả có thể do nhiều nguyên nhân, hãy bổ sung bằng chứng rồi mới đánh giá biện pháp nào thật sự hiệu quả.",
          ],
        ],
        questions: [
          q("main-claim", "Bài nghe muốn minh họa nguyên tắc nào?", [
            "Cần kiểm tra nguyên nhân cạnh tranh trước khi kết luận biện pháp hiệu quả",
            "Mọi cơn ho đều do khăn bẩn",
            "Tiệm cắt tóc phải đóng cửa vào buổi chiều",
            "Mưa luôn tốt cho mọi hoạt động kinh doanh",
          ], 0, ["lp1", "lp2", "lp3"],
          "Nguồn đối chiếu phán đoán đầu với yếu tố thi công, thời tiết và dữ liệu thiếu."),
          q("supported-detail", "Hai tuần khách báo ho ít hơn còn có đặc điểm gì?", [
            "Mưa nhiều và cửa thường đóng",
            "Công trình đã kết thúc hoàn toàn",
            "Tiệm không dùng khăn mặt",
            "Không có khách nào ăn trưa",
          ], 0, ["lp2"],
          "Đoạn 2 nêu hai yếu tố trùng thời gian với kết quả."),
          q("cross-paragraph-evidence", "Vì sao kết quả chưa chứng minh chất giặt mới là nguyên nhân?", [
            "Cùng lúc số khách, thời tiết và trạng thái cửa đều thay đổi",
            "Chủ tiệm không biết cắt tóc",
            "Phóng viên không đến cửa hàng",
            "Khách không bao giờ ho",
          ], 0, ["lp1", "lp2"],
          "Đoạn 1 có nhiều thay đổi; đoạn 2 bổ sung thời tiết và bụi thi công."),
          q("bounded-inference", "Có thể suy ra mã QR nhằm cải thiện điều gì?", [
            "Thu thập phản hồi rộng hơn thay vì chỉ chờ người chủ động nói",
            "Bán thêm dịch vụ cắt tóc",
            "Thay thế mọi ghi chép khác",
            "Đo chính xác lượng bụi trong không khí",
          ], 0, ["lp2", "lp3"],
          "Sổ cũ chỉ ghi người tự báo; mã QR tạo thêm kênh phản hồi.",
          "Có thể suy ra mục tiêu giảm thiên lệch báo cáo, nhưng mã QR không tự đo được bụi hay quan hệ nhân quả."),
          q("scope-limit", "Nguồn đã chứng minh chắc chắn điều nào sau đây?", [
            "Chất giặt mới gây giảm ho",
            "Bụi công trình là nguyên nhân duy nhất",
            "Phán đoán ban đầu chưa có đối chứng đủ",
            "Mọi khách đều sẽ dùng mã QR",
          ], 2, ["lp2", "lp3"],
          "Đoạn 3 chỉ xác nhận thiếu đối chiếu, không xác nhận nguyên nhân cuối."),
        ],
        noteMap: map([
          ["claim", "Nhận định đầu", "Chất giặt mới làm giảm ho.", ["lp1"]],
          ["observed", "Kết quả quan sát", "Báo cáo ho giảm trong hai tuần.", ["lp1"]],
          ["alternatives", "Giải thích khác", "Bụi thi công, mưa và cửa đóng.", ["lp2"]],
          ["bias", "Thiên lệch dữ liệu", "Chỉ ghi khách chủ động phản ánh.", ["lp2"]],
          ["test", "Thiết kế ghi mới", "Theo dõi nhiều biến và mở kênh QR.", ["lp3"]],
        ], [
          ["observed", "được dùng để ủng hộ", "claim"],
          ["alternatives", "cạnh tranh với", "claim"],
          ["bias", "làm yếu", "observed"],
          ["alternatives", "được kiểm tra qua", "test"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán đánh giá hai luận điểm “phòng chung ít được dùng” và “chất giặt mới làm giảm ho”; phân loại bằng chứng ủng hộ, phản bác và dữ liệu còn thiếu.",
      requiredElements: [
        "luận điểm về phòng chung",
        "dùng không đăng ký",
        "luận điểm về chất giặt",
        "các nguyên nhân cạnh tranh",
        "bước thu dữ liệu tiếp theo",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp2"], [1, "lp1"], [1, "lp2"]],
      modelHanzi:
        "物业用平均每天两次预约支持“公共房间利用不足”，晚上常空着也提供了一部分证据；但是老人和孩子白天不预约就使用，说明登记低估了实际人数。理发店把咳嗽减少归因于新清洗用品，可同一时期人数减少、雨多、店门关闭，施工灰尘也可能变化。两个论点都有观察支持，却都缺少完整对照。四周人工计数和同时记录天气、门窗、施工及更多客人反映，才能帮助比较不同解释。",
      modelVi:
        "Ban quản lý dùng trung bình hai lượt đặt mỗi ngày để ủng hộ “phòng chung chưa được tận dụng”, và việc buổi tối thường trống cũng là một phần bằng chứng; nhưng người già và trẻ dùng ban ngày không đặt trước cho thấy sổ đánh giá thấp thực tế. Tiệm cắt tóc quy việc giảm ho cho chất giặt mới, song cùng lúc số khách giảm, mưa nhiều, cửa đóng và bụi công trình có thể thay đổi. Cả hai luận điểm có quan sát hỗ trợ nhưng thiếu đối chứng đầy đủ. Đếm thủ công bốn tuần và ghi đồng thời thời tiết, cửa, thi công cùng phản hồi rộng hơn mới giúp so các cách giải thích.",
    },
  },
  [ID.viewpoint]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "父女对“将来”的两种安排",
        titleVi: "Hai cách nhìn của cha và con gái về tương lai",
        targetVocabularyIds: [
          V(1211), V(1357), V(1462), V(1290), V(1824),
        ],
        paragraphs: [
          [
            "高三学生小雨想在毕业后用半年参加志愿服务，再申请大学。父亲认为先入学更稳定，担心间隔半年会影响学习信心。父女第一次谈话时都只说明自己的计划：小雨强调服务经验的好处，父亲强调按正常时间入学，结果两人觉得对方没有认真听。",
            "Học sinh cuối cấp Tiểu Vũ muốn dành nửa năm làm tình nguyện rồi mới nộp đại học. Cha cho rằng nhập học trước ổn định hơn và lo khoảng nghỉ ảnh hưởng sự tự tin học tập. Lần nói đầu, mỗi người chỉ trình bày kế hoạch: cô nhấn lợi ích trải nghiệm, cha nhấn lịch nhập học bình thường, khiến cả hai thấy người kia không lắng nghe.",
          ],
          [
            "第二次谈话前，他们各自写下三个问题。父亲想知道项目是否有培训、费用从哪里来、结束后怎样准备考试；小雨则问父亲最担心的风险是什么，以及什么证据能让他放心。谈话中，小雨承认自己还没有算清费用，父亲也承认志愿服务可能帮助她了解将来的专业方向。",
            "Trước lần hai, họ tự viết ba câu hỏi. Cha muốn biết dự án có đào tạo không, tiền từ đâu, kết thúc sẽ chuẩn bị thi thế nào; Tiểu Vũ hỏi rủi ro cha lo nhất và bằng chứng nào khiến ông yên tâm. Cô thừa nhận chưa tính rõ chi phí, còn cha thừa nhận tình nguyện có thể giúp cô hiểu hướng chuyên ngành tương lai.",
          ],
          [
            "最后的安排不是任何一方原来的答案：小雨先申请学校并保留入学资格，再参加三个月项目；每月向家里报告学习计划和费用。父亲负责一起检查合同，却不替她决定具体工作。他们把礼貌理解为准确回应对方的担心，而不是表面同意。这个结果适合他们，却未必适合所有家庭。",
            "Thỏa thuận cuối không giống đáp án ban đầu của bên nào: Tiểu Vũ nộp trường và giữ quyền nhập học rồi tham gia dự án ba tháng; mỗi tháng báo kế hoạch học và chi phí. Cha cùng kiểm tra hợp đồng nhưng không quyết định thay công việc cụ thể. Họ hiểu lễ phép là trả lời đúng lo lắng của nhau, không phải đồng ý bề ngoài. Kết quả hợp với họ nhưng chưa chắc hợp mọi gia đình.",
          ],
        ],
        questions: [
          q("main-claim", "Bài đọc tổng hợp hai góc nhìn bằng cách nào?", [
            "Biến lo lắng của mỗi bên thành câu hỏi rồi xây phương án có điều kiện",
            "Cho người cha quyết định toàn bộ",
            "Cho con gái bỏ kế hoạch học tập",
            "Tránh nhắc đến chi phí và rủi ro",
          ], 0, ["rp1", "rp2", "rp3"],
          "Ba đoạn đi từ hai lập trường, trao đổi câu hỏi đến thỏa thuận có điều kiện."),
          q("supported-detail", "Tiểu Vũ thừa nhận thiếu thông tin nào?", [
            "Chi phí của kế hoạch",
            "Tên của cha",
            "Ngày tốt nghiệp",
            "Địa chỉ trường phổ thông",
          ], 0, ["rp2"],
          "Đoạn 2 nói cô chưa tính rõ chi phí."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy cả hai góc nhìn đều thay đổi?", [
            "Tiểu Vũ rút dự án xuống ba tháng; cha thừa nhận lợi ích và không quyết định thay",
            "Cả hai giữ nguyên hoàn toàn kế hoạch đầu",
            "Cha không còn hỏi gì; con gái không nộp trường",
            "Hai người chỉ đồng ý trên bề mặt",
          ], 0, ["rp2", "rp3"],
          "Đoạn 2 mở ra nhượng bộ; đoạn 3 thể hiện thay đổi cụ thể của cả hai."),
          q("bounded-inference", "Có thể suy ra định nghĩa “lễ phép” của họ nhấn mạnh điều gì?", [
            "Hiểu và đáp lại mối quan tâm thật của người kia",
            "Luôn nghe theo người lớn",
            "Không được nêu ý kiến trái nhau",
            "Chỉ dùng lời nói nhẹ nhàng",
          ], 0, ["rp2", "rp3"],
          "Họ đặt câu hỏi và trả lời lo lắng thay vì giả vờ đồng ý.",
          "Nguồn cho phép mô tả cách hiểu của gia đình này, không thiết lập một định nghĩa duy nhất cho mọi gia đình."),
          q("scope-limit", "Kết luận nào phù hợp nhất với giới hạn nguồn?", [
            "Phương án là một thỏa thuận riêng, không phải công thức chung",
            "Mọi học sinh nên nghỉ đúng ba tháng",
            "Mọi phụ huynh phải ký hợp đồng thay con",
            "Tình nguyện luôn tốt hơn đại học",
          ], 0, ["rp3"],
          "Câu cuối giới hạn rõ tính áp dụng của kết quả."),
        ],
        noteMap: map([
          ["daughter", "Góc nhìn con", "Muốn trải nghiệm và định hướng chuyên ngành.", ["rp1", "rp2"]],
          ["father", "Góc nhìn cha", "Ưu tiên ổn định, chi phí và việc học.", ["rp1", "rp2"]],
          ["shared", "Thông tin cùng xem", "Đào tạo, hợp đồng, tiền và kế hoạch thi.", ["rp2"]],
          ["compromise", "Phương án chung", "Giữ quyền nhập học, dự án ba tháng và báo cáo.", ["rp3"]],
          ["boundary", "Giới hạn", "Phù hợp gia đình này, không phải công thức chung.", ["rp3"]],
        ], [
          ["daughter", "được kiểm tra qua", "shared"],
          ["father", "được kiểm tra qua", "shared"],
          ["shared", "hình thành", "compromise"],
          ["boundary", "giới hạn", "compromise"],
        ]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "社区课堂要不要继续教京剧",
        titleVi: "Lớp cộng đồng có nên tiếp tục dạy Kinh kịch?",
        targetVocabularyIds: [
          V(1397), V(1433), V(1247), V(1644), V(1680),
        ],
        paragraphs: [
          [
            "社区文化中心请各位居民讨论下一季课堂。京剧班的老师希望继续开课，因为老学员不仅学习唱法，还收听历史节目、整理人物故事。可是报名人数只有十二人，比书法班少很多。中心担心教室和老师时间有限，提出暂停京剧班。",
            "Trung tâm văn hóa cộng đồng mời cư dân bàn chương trình kỳ tới. Giáo viên lớp Kinh kịch muốn tiếp tục vì học viên không chỉ học hát mà còn nghe chương trình lịch sử và sắp xếp chuyện nhân vật. Tuy nhiên chỉ có mười hai người đăng ký, ít hơn lớp thư pháp; trung tâm lo phòng và giờ giáo viên có hạn nên đề nghị tạm dừng.",
          ],
          [
            "年轻居民有两种意见。一些人认为人数少就说明需求低，资源应该给更多人申请的课程；另一些人说，京剧学习需要较长时间，不能只看一季人数，而且课堂保存了社区老人熟悉的文化记忆。老学员也承认课程宣传主要靠纸张通知，很多年轻人根本不知道可以旁听。",
            "Cư dân trẻ có hai ý kiến. Một số cho rằng ít người nghĩa là nhu cầu thấp và tài nguyên nên dành cho khóa có nhiều người xin hơn. Nhóm khác nói học Kinh kịch cần thời gian dài, không thể chỉ nhìn một kỳ, và lớp giữ ký ức văn hóa quen thuộc với người cao tuổi. Học viên cũ cũng thừa nhận quảng bá chủ yếu bằng giấy nên nhiều người trẻ không biết được nghe thử.",
          ],
          [
            "中心最后没有直接决定保留或取消，而是安排六周公开体验：前两周可以旁听，之后再正式申请；老师同时记录出席、年龄和继续学习的原因。若人数仍少，中心会考虑与邻近社区合办。这个方案承认文化价值，也承认空间成本，但六周结果只能帮助本中心选择，不能代表全市居民的兴趣。",
            "Trung tâm chưa quyết định giữ hay hủy mà tổ chức trải nghiệm mở sáu tuần: hai tuần đầu được nghe thử, sau đó mới đăng ký chính thức; giáo viên ghi số tham dự, tuổi và lý do học tiếp. Nếu vẫn ít, trung tâm cân nhắc phối hợp khu bên cạnh. Phương án thừa nhận giá trị văn hóa lẫn chi phí không gian, nhưng kết quả sáu tuần chỉ giúp trung tâm này, không đại diện sở thích toàn thành phố.",
          ],
        ],
        questions: [
          q("main-claim", "Bài nghe tổng hợp tranh luận theo hướng nào?", [
            "Đặt số người, giá trị văn hóa và chi phí vào một thử nghiệm có giới hạn",
            "Khẳng định lớp đông luôn có giá trị hơn",
            "Bắt mọi cư dân học Kinh kịch",
            "Chuyển toàn bộ lớp học sang radio",
          ], 0, ["lp1", "lp2", "lp3"],
          "Nguồn trình bày các bên rồi thiết kế thử nghiệm thay vì chốt ngay."),
          q("supported-detail", "Hạn chế nào của cách tuyển học viên hiện tại được nêu?", [
            "Chủ yếu quảng bá bằng thông báo giấy",
            "Không có giáo viên",
            "Không ai được đăng ký",
            "Lớp chỉ mở ở thành phố khác",
          ], 0, ["lp2"],
          "Học viên cũ nói nhiều người trẻ không biết vì cách quảng bá hạn chế."),
          q("cross-paragraph-evidence", "Hai loại bằng chứng nào tạo căng thẳng trong quyết định?", [
            "Số đăng ký thấp và giá trị văn hóa dài hạn",
            "Màu phòng học và tuổi tòa nhà",
            "Tên giáo viên và giá vé xe",
            "Số radio và số bút",
          ], 0, ["lp1", "lp2"],
          "Đoạn 1 nêu số lượng/chi phí; đoạn 2 nêu thời gian học và ký ức văn hóa."),
          q("bounded-inference", "Có thể suy ra vì sao hai tuần đầu cho phép nghe thử?", [
            "Giảm rào cản thông tin trước khi đo nhu cầu chính thức",
            "Thay thế toàn bộ sáu tuần học",
            "Loại người cao tuổi khỏi lớp",
            "Chứng minh ngay sở thích toàn thành phố",
          ], 0, ["lp2", "lp3"],
          "Quảng bá cũ khiến nhiều người không biết; nghe thử mở cơ hội tiếp cận trước đăng ký.",
          "Có thể suy ra mục tiêu cải thiện tiếp cận, nhưng chưa biết nó sẽ làm số học viên tăng."),
          q("scope-limit", "Kết quả sáu tuần không thể đại diện cho điều gì?", [
            "Quyết định của trung tâm này",
            "Sở thích của toàn thành phố",
            "Số người đến nghe thử tại đây",
            "Lý do người tham gia muốn học tiếp",
          ], 1, ["lp3"],
          "Đoạn cuối nêu trực tiếp giới hạn toàn thành phố."),
        ],
        noteMap: map([
          ["teacher", "Góc nhìn giáo viên", "Giá trị kỹ năng và hiểu lịch sử.", ["lp1"]],
          ["center", "Góc nhìn trung tâm", "Số ít, phòng và thời gian có hạn.", ["lp1"]],
          ["residents", "Góc nhìn cư dân", "Nhu cầu số đông đối chiếu ký ức văn hóa.", ["lp2"]],
          ["information", "Thiếu thông tin", "Quảng bá giấy làm người trẻ khó tiếp cận.", ["lp2"]],
          ["trial", "Thử nghiệm giới hạn", "Nghe thử, đăng ký, ghi lý do và có thể hợp tác.", ["lp3"]],
        ], [
          ["teacher", "xung đột một phần với", "center"],
          ["residents", "mở rộng tranh luận giữa", "teacher"],
          ["information", "làm yếu cách đọc", "center"],
          ["trial", "kiểm tra các góc nhìn của", "residents"],
        ]),
      },
    ],
    synthesis: {
      promptVi:
        "Viết 120–220 chữ Hán tổng hợp hai tranh luận mà không xóa khác biệt giữa các bên; trình bày dữ kiện chung, phương án thỏa hiệp và giới hạn áp dụng.",
      requiredElements: [
        "mục tiêu của con gái và lo lắng của cha",
        "thông tin hai bên cùng kiểm tra",
        "giá trị và chi phí lớp Kinh kịch",
        "thiếu sót quảng bá",
        "giới hạn của hai phương án",
      ],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi:
        "父女争论的共同事实是小雨要继续升学，但双方对时间和风险的看法不同。通过询问培训、费用和学习计划，他们形成了保留入学资格、参加三个月项目的条件方案。京剧课堂的争论也不能只看一个数字：报名少和空间成本是真实问题，文化记忆、学习周期及宣传不足同样重要，所以中心先做六周体验。两个方案都保留不同观点并增加可检查的信息，但只适合当前家庭或社区，不能直接推广给所有人。",
      modelVi:
        "Dữ kiện chung trong tranh luận cha con là Tiểu Vũ vẫn tiếp tục học, nhưng hai bên khác cách nhìn về thời gian và rủi ro. Bằng việc hỏi về đào tạo, chi phí và kế hoạch học, họ tạo phương án có điều kiện: giữ quyền nhập học và tham gia dự án ba tháng. Tranh luận lớp Kinh kịch cũng không thể chỉ nhìn một con số: ít đăng ký và chi phí không gian là thật, nhưng ký ức văn hóa, thời gian học dài và quảng bá thiếu cũng quan trọng, nên trung tâm thử sáu tuần. Cả hai giữ khác biệt và thêm dữ liệu kiểm tra được, song chỉ phù hợp gia đình hoặc cộng đồng hiện tại.",
    },
  },
};

export const buildHsk4PersonalCommunityLongFormPack = (
  root = process.cwd(),
) => buildHsk4LongFormDomainPack({
  root,
  ...HSK4_PERSONAL_COMMUNITY_LONG_FORM_CONFIG,
  lessonIds: HSK4_PERSONAL_COMMUNITY_LESSON_IDS,
  content: CONTENT,
  vietnameseGlossBySequence: VI_GLOSS_BY_SEQUENCE,
  prerequisitePackBundles: [],
});

export const serializeHsk4PersonalCommunityLongFormPack = (
  pack = buildHsk4PersonalCommunityLongFormPack(),
) => serializeHsk4LongFormDomainPack(pack);

const parseMode = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write") && args.has("--check")) {
    throw new Error("Choose either --write or --check");
  }
  if (args.has("--write")) return "write";
  if (args.has("--check")) return "check";
  return "print";
};

const main = () => {
  const mode = parseMode();
  const root = process.cwd();
  const outputPath = resolve(
    root,
    HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH,
  );
  const serialized = serializeHsk4PersonalCommunityLongFormPack(
    buildHsk4PersonalCommunityLongFormPack(root),
  );
  if (mode === "write") {
    writeFileSync(outputPath, serialized, "utf8");
    console.log(`Wrote ${outputPath}`);
    return;
  }
  if (mode === "check") {
    const existing = readFileSync(outputPath, "utf8");
    if (existing !== serialized) {
      throw new Error(
        `${HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH} is stale`,
      );
    }
    console.log(
      `${HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH} is current`,
    );
    return;
  }
  process.stdout.write(serialized);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
