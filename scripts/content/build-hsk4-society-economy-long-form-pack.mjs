import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4LongFormDomainPack,
  serializeHsk4LongFormDomainPack,
} from "./hsk4-long-form-domain-builder.mjs";
import {
  HSK4_SOCIETY_ECONOMY_DOMAIN_ID,
  HSK4_SOCIETY_ECONOMY_LESSON_IDS,
  HSK4_SOCIETY_ECONOMY_LONG_FORM_CONFIG,
  HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH,
} from "../../src/content/hsk4SocietyEconomyLongFormPack.mjs";
import {
  loadHsk4NatureTechnologyLongFormPackBundle,
} from "../../src/content/hsk4NatureTechnologyLongFormPack.mjs";

const V = (n) => `hsk-vocab-${String(n).padStart(5, "0")}`;
const VI_GLOSS_BY_SEQUENCE = {
  1077: "thành; thành phố", 1252: "công cộng", 1512: "dân tộc",
  1639: "xã hội", 1978: "tài liệu", 1275: "phát thanh",
  1299: "Internet", 1370: "giao lưu", 1669: "thị trường",
  1215: "chịu trách nhiệm", 1182: "đa dạng", 1649: "việc kinh doanh",
  1674: "khu nội thành", 1371: "ngoại ô", 1795: "hoa tươi",
  1325: "kịp thời", 1362: "hạ; giảm", 1581: "cây cầu",
  1971: "chuyển tiếp; chia sẻ lại", 1519: "điểm đến",
  1074: "vượt quá", 1321: "cơ sở; nền tảng", 1383: "ngày nghỉ lễ",
  1609: "nhộn nhịp", 1790: "thu hút", 1463: "lý tưởng",
  1932: "bình thường", 1248: "các loại", 1861: "có lẽ",
  1719: "nói chuyện; bàn luận", 1041: "phát; phát sóng",
  1214: "phức tạp", 1324: "tích lũy", 1793: "giảm xuống",
  1973: "kiếm tiền", 1250: "nhà máy", 1384: "tiết kiệm",
  1683: "trước hết", 1756: "trì hoãn", 1613: "bất kỳ",
  1075: "tốc độ xe", 1143: "đường sá", 1323: "tích cực",
  1386: "giải thích", 1611: "số người", 1682: "thủ đô",
  1578: "trước sau; khoảng quanh", 1972: "cơ hội chuyển biến",
  1792: "cẩn thận", 1900: "hóa ra; ban đầu", 1079: "thành công",
  1363: "hạ thấp", 1396: "kinh tế", 1723: "thảo luận",
  1937: "chính thức", 1326: "cho dù", 1470: "liên hệ",
  1545: "xếp hàng", 1616: "vẫn", 1651: "còn lại",
};
const q = (kind, prompt, options, answer, evidence, rationale, boundary = null) =>
  [kind, prompt, options, answer, evidence, rationale, boundary];
const map = (nodes, relations) => ({ nodes, relations });
const D = HSK4_SOCIETY_ECONOMY_DOMAIN_ID;
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
        titleHanzi: "一座城的公共资料由谁来写",
        titleVi: "Ai viết dữ liệu công cộng của một thành phố",
        targetVocabularyIds: [V(1077), V(1252), V(1512), V(1639), V(1978)],
        paragraphs: [
          ["青川城更新公共资料，介绍交通、医疗和少数民族文化。政府部门提供地点与时间，社会组织检查无障碍信息，各民族社区补充名称读法和节日背景。三方都参与，但责任不同。",
            "Thành Thanh Xuyên cập nhật dữ liệu công cộng về giao thông, y tế và văn hóa dân tộc thiểu số. Cơ quan nhà nước cung cấp địa điểm/giờ, tổ chức xã hội kiểm thông tin tiếp cận, cộng đồng dân tộc bổ sung cách đọc tên và bối cảnh lễ. Ba bên tham gia với trách nhiệm khác."],
          ["旧资料把一个节日只写成旅游活动，社区代表认为这会忽略其家庭和历史意义。编辑组先保存原文，再记录修改理由，并请文化研究者核对。社区有解释权，却不能单独改变公交时刻；交通部门也不能替社区定义文化。",
            "Dữ liệu cũ chỉ gọi một lễ là hoạt động du lịch, cộng đồng cho rằng bỏ ý nghĩa gia đình/lịch sử. Nhóm lưu bản cũ, ghi lý do sửa và nhờ nhà nghiên cứu kiểm. Cộng đồng có quyền giải thích nhưng không tự đổi giờ xe; ngành giao thông không định nghĩa văn hóa thay họ."],
          ["新版分别标明资料来源、更新时间和负责人。读者可以看见事实、解释和服务信息来自哪里。这个角色图提高透明度，却不能保证所有描述都已完整；未参与访谈的小社区仍需要后续补充。",
            "Bản mới ghi nguồn, ngày cập nhật và người phụ trách. Người đọc thấy dữ kiện, diễn giải và dịch vụ đến từ đâu. Bản đồ vai trò tăng minh bạch nhưng không bảo đảm mô tả đầy đủ; cộng đồng nhỏ chưa phỏng vấn còn cần bổ sung."],
        ],
        questions: [
          q("main-claim", "Bài đọc giải thích điều gì?", ["Cách nhiều bên cùng viết dữ liệu nhưng không thay quyền của nhau", "Chỉ chính quyền được mô tả văn hóa", "Mọi dữ liệu đã đầy đủ", "Du lịch quyết định giờ xe"], 0, ["rp1", "rp2", "rp3"], "Nguồn phân vai theo loại thông tin."),
          q("supported-detail", "Cộng đồng bổ sung loại thông tin nào?", ["Cách đọc tên và bối cảnh lễ", "Giờ xe chính thức", "Giá thuốc", "Mã đường"], 0, ["rp1", "rp2"], "Đây là phạm vi kiến thức cộng đồng."),
          q("cross-paragraph-evidence", "Chi tiết nào thể hiện tính truy xuất?", ["Lưu bản cũ, lý do sửa và ghi nguồn/người phụ trách", "Chỉ đổi tiêu đề", "Bỏ mọi thông tin cũ", "Không phỏng vấn ai"], 0, ["rp2", "rp3"], "Hai đoạn mô tả lịch sử và provenance."),
          q("bounded-inference", "Có thể suy ra vì sao tách事实 và解释?", ["Để người đọc biết thẩm quyền của từng nguồn", "Để một bên sửa mọi mục", "Để xóa văn hóa khỏi tài liệu", "Để bỏ cập nhật"], 0, ["rp1", "rp3"], "Vai trò gắn với loại nội dung và nguồn.", "Có thể suy ra lợi ích minh bạch, chưa thể nói tài liệu hoàn toàn không thiên lệch."),
          q("scope-limit", "Claim nào vượt nguồn?", ["Bản mới minh bạch hơn", "Mọi cộng đồng đã được đại diện đầy đủ", "Có nhóm chưa phỏng vấn", "Nguồn được ghi"], 1, ["rp3"], "Nguồn nêu khoảng trống đại diện."),
        ],
        noteMap: map([
          ["government", "Nhà nước", "Dịch vụ, địa điểm và thời gian.", ["rp1"]],
          ["social", "Tổ chức xã hội", "Kiểm khả năng tiếp cận.", ["rp1"]],
          ["community", "Cộng đồng", "Tên gọi và bối cảnh văn hóa.", ["rp1", "rp2"]],
          ["process", "Quy trình", "Lưu bản, lý do, kiểm tra.", ["rp2"]],
          ["gap", "Khoảng trống", "Nhóm chưa được phỏng vấn.", ["rp3"]],
        ], [["government", "cùng đóng góp với", "community"], ["social", "kiểm tra", "process"], ["process", "ghi nhận", "community"], ["gap", "giới hạn", "process"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "广播、互联网和地方市场",
        titleVi: "Phát thanh, Internet và thị trường địa phương",
        targetVocabularyIds: [V(1275), V(1299), V(1370), V(1669), V(1215)],
        paragraphs: [
          ["山区市场用广播发布价格和天气，负责人每天早晨核对。互联网平台后来加入图片和在线订单，年轻商户欢迎新渠道，老人仍依靠广播。两种渠道服务同一市场，却覆盖不同人。",
            "Chợ vùng núi dùng phát thanh báo giá/thời tiết, người phụ trách kiểm mỗi sáng. Sau đó nền tảng Internet thêm ảnh và đặt trực tuyến; người trẻ thích kênh mới, người già vẫn dựa phát thanh. Hai kênh phục vụ cùng chợ nhưng phủ nhóm khác."],
          ["一次价格写错后，网上消息被迅速转发，广播却在下一小时完成更正。管理组规定：市场办公室负责原始数据，平台负责显示与修改记录，广播员负责口头确认。商户交流意见，但不能直接改官方价格。",
            "Một lần giá sai bị chia sẻ nhanh trên mạng, phát thanh sửa trong giờ sau. Nhóm quy định văn phòng chợ chịu dữ liệu gốc, nền tảng chịu hiển thị/lịch sử sửa, phát thanh viên chịu xác nhận miệng. Tiểu thương trao đổi nhưng không trực tiếp đổi giá chính thức."],
          ["三个月后，在线订单增加，广播收听没有明显下降。结果说明新渠道可以补充旧渠道，不证明互联网适合每个人。偏远村庄的信号数据仍不完整，下一阶段要分别记录两种渠道的到达率。",
            "Ba tháng sau, đơn trực tuyến tăng, nghe phát thanh không giảm rõ. Kết quả cho thấy kênh mới bổ sung kênh cũ, không chứng minh Internet hợp mọi người. Dữ liệu tín hiệu làng xa còn thiếu; giai đoạn sau ghi tỷ lệ tiếp cận từng kênh."],
        ],
        questions: [
          q("main-claim", "Bài nghe lập bản đồ gì?", ["Vai trò và phạm vi của hai kênh thông tin chợ", "Internet thay hoàn toàn phát thanh", "Người bán tự đổi giá", "Mọi làng có tín hiệu mạnh"], 0, ["lp1", "lp2", "lp3"], "Nguồn phân kênh, trách nhiệm và độ phủ."),
          q("supported-detail", "Ai chịu trách nhiệm dữ liệu giá gốc?", ["Văn phòng chợ", "Mọi tiểu thương", "Người nghe radio", "Khách trực tuyến"], 0, ["lp2"], "Quy định nêu rõ thẩm quyền."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy hai kênh bổ sung nhau?", ["Đơn online tăng nhưng nghe radio không giảm", "Cả hai đều từng sai", "Có ảnh và thời tiết", "Người trẻ dùng điện thoại"], 0, ["lp1", "lp3"], "Các nhóm dùng khác và cùng tồn tại."),
          q("bounded-inference", "Có thể suy ra vì sao cần lịch sử sửa trên nền tảng?", ["Để truy vết thông tin lan nhanh khi có lỗi", "Để xóa giá cũ", "Để thay dữ liệu gốc", "Để ngừng phát thanh"], 0, ["lp2"], "Sự cố chuyển tiếp nhanh đòi dấu sửa.", "Có thể suy ra mục đích truy vết, chưa biết nó ngăn được mọi lỗi."),
          q("scope-limit", "Kết luận nào chưa được chứng minh?", ["Internet bổ sung kênh cũ", "Internet phù hợp mọi cư dân vùng núi", "Tín hiệu vùng xa còn thiếu", "Đơn online tăng"], 1, ["lp3"], "Phạm vi sử dụng còn khác nhau."),
        ],
        noteMap: map([
          ["radio", "Phát thanh", "Giá, thời tiết và người nghe lớn tuổi.", ["lp1"]],
          ["internet", "Internet", "Ảnh, đơn và người dùng trẻ.", ["lp1"]],
          ["source", "Nguồn gốc", "Văn phòng chợ.", ["lp2"]],
          ["incident", "Sự cố", "Giá sai lan nhanh.", ["lp2"]],
          ["gap", "Thiếu", "Độ phủ làng xa.", ["lp3"]],
        ], [["source", "cấp dữ liệu cho", "radio"], ["source", "cấp dữ liệu cho", "internet"], ["incident", "làm rõ trách nhiệm của", "source"], ["gap", "giới hạn", "internet"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh quyền hạn, nguồn dữ liệu và khoảng trống đại diện trong hồ sơ thành phố và hệ thống thông tin chợ.",
      requiredElements: ["ba bên hồ sơ", "provenance sửa đổi", "hai kênh chợ", "trách nhiệm giá", "khoảng trống cộng đồng/tín hiệu"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "城市公共资料由政府、社会组织和民族社区分别提供服务事实、无障碍检查与文化解释，修改还保留来源和理由，但未访谈的小社区仍是缺口。山区市场则由办公室负责原始价格，互联网平台记录显示与修改，广播员口头确认；新旧渠道覆盖不同人，远村信号仍缺数据。两套系统都把参与意见与正式修改权分开，并用来源追踪错误，透明度提高却不等于所有群体都已被完整代表。",
      modelVi: "Dữ liệu thành phố do chính quyền, tổ chức xã hội và cộng đồng dân tộc cung cấp dịch vụ, kiểm tiếp cận và diễn giải văn hóa; sửa đổi giữ nguồn/lý do nhưng nhóm chưa phỏng vấn vẫn thiếu. Chợ vùng núi để văn phòng chịu giá gốc, nền tảng ghi hiển thị/sửa và phát thanh viên xác nhận; kênh phủ khác người, làng xa thiếu tín hiệu. Cả hai tách góp ý khỏi quyền sửa chính thức và truy nguồn lỗi; minh bạch hơn không đồng nghĩa mọi nhóm đã được đại diện đủ.",
    },
  },
  [ID.process]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "鲜花生意从郊区走到市区",
        titleVi: "Kinh doanh hoa từ ngoại ô vào nội thành",
        targetVocabularyIds: [V(1182), V(1649), V(1674), V(1371), V(1795)],
        paragraphs: [
          ["一家郊区花店原来只做附近生意，产品多样却很少进入市区。第一年店主推出周末配送，先用十种耐运输鲜花测试。订单增加，但路线太长，损坏率也高。",
            "Tiệm hoa ngoại ô vốn bán gần, sản phẩm đa dạng nhưng ít vào nội thành. Năm đầu chủ ra mắt giao cuối tuần, thử mười loại chịu vận chuyển. Đơn tăng nhưng tuyến dài, hư hỏng cao."],
          ["第二年，店主与市区两家咖啡店合作设取货点，把配送距离缩短。第三年又增加线上订花和回收花瓶。每次改变前都保留旧路线作比较，而不是同时替换全部流程。",
            "Năm hai hợp tác hai quán nội thành làm điểm nhận, rút khoảng giao. Năm ba thêm đặt online và thu hồi bình. Mỗi đổi giữ tuyến cũ để so, không thay mọi quy trình cùng lúc."],
          ["第四年市区订单超过郊区，但利润没有同样增长，因为取货点和包装增加成本。花店决定按地区分别报告订单、损坏和利润。过程说明扩大市场不等于每个结果都变好，也解释了为什么订单、损坏和利润必须分开观察。",
            "Năm bốn đơn nội thành vượt ngoại ô nhưng lợi nhuận không tăng tương ứng vì điểm nhận/đóng gói tăng phí. Tiệm báo riêng đơn, hư hỏng, lợi nhuận theo vùng. Mở thị trường không đồng nghĩa mọi kết quả tốt; ba chỉ số phải được quan sát riêng."],
        ],
        questions: [
          q("main-claim", "Dòng thời gian cho thấy điều gì?", ["Mở rộng kinh doanh qua thử nhỏ, điểm nhận và đo nhiều kết quả", "Thay toàn bộ quy trình ngày đầu", "Đơn tăng luôn bằng lợi nhuận", "Đóng cửa ngoại ô"], 0, ["rp1", "rp2", "rp3"], "Ba giai đoạn có thử, điều chỉnh, đánh giá."),
          q("supported-detail", "Điểm nhận giải quyết vấn đề gì?", ["Rút ngắn khoảng giao", "Giảm loại hoa", "Xóa đơn nội thành", "Bỏ đóng gói"], 0, ["rp2"], "Đoạn 2 nêu quan hệ trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao tăng đơn chưa đủ chứng minh thành công tài chính?", ["Chi phí điểm nhận và đóng gói tăng", "Hoa có nhiều loại", "Có quán cà phê", "Đơn ngoại ô tồn tại"], 0, ["rp2", "rp3"], "Chi phí mới làm lợi nhuận không đi cùng đơn."),
          q("bounded-inference", "Có thể suy ra lợi ích giữ tuyến cũ?", ["Tạo mốc so cho từng thay đổi", "Ngăn mọi đơn mới", "Bảo đảm lợi nhuận", "Bỏ đo hư hỏng"], 0, ["rp2"], "Thiết kế thay từng bước và giữ đối chiếu.", "Có thể suy ra mục tiêu so sánh, chưa biết tuyến nào luôn tốt hơn."),
          q("scope-limit", "Claim nào quá rộng?", ["Đơn nội thành vượt ngoại ô", "Mọi chỉ số kinh doanh đều cải thiện", "Chi phí mới tăng", "Cần báo theo vùng"], 1, ["rp3"], "Lợi nhuận không tăng tương ứng."),
        ],
        noteMap: map([
          ["start", "Ban đầu", "Chợ ngoại ô, ít vào nội thành.", ["rp1"]],
          ["pilot", "Năm 1", "Giao cuối tuần mười loại.", ["rp1"]],
          ["hub", "Năm 2", "Điểm nhận giảm khoảng.", ["rp2"]],
          ["digital", "Năm 3", "Đặt online và thu bình.", ["rp2"]],
          ["outcome", "Năm 4", "Đơn tăng, lợi nhuận không cùng tăng.", ["rp3"]],
        ], [["start", "được mở rộng qua", "pilot"], ["pilot", "được sửa bằng", "hub"], ["hub", "được mở rộng bởi", "digital"], ["digital", "dẫn tới", "outcome"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一座桥怎样改变新的目的地",
        titleVi: "Một cây cầu làm thay đổi điểm đến mới",
        targetVocabularyIds: [V(1325), V(1362), V(1581), V(1971), V(1519)],
        paragraphs: [
          ["河边村开通新桥后，去市区时间从九十分钟降到四十分钟。网友及时转发美景图片，村子很快成为周末目的地。第一个月游客翻倍，商户认为桥直接带来增长。",
            "Sau cầu mới, thời gian từ làng ven sông vào thành phố giảm 90 xuống 40 phút. Cư dân mạng chia sẻ kịp ảnh đẹp, làng thành điểm đến cuối tuần. Tháng đầu khách gấp đôi, tiểu thương cho rằng cầu trực tiếp tạo tăng trưởng."],
          ["半年记录显示过程更复杂：桥改善交通，图片传播提高知名度，节假日活动也同时开始。雨季没有活动时，游客仍高于从前，却低于节日高峰。三项变化的时间接近，不能只看前后就决定唯一原因。",
            "Hồ sơ nửa năm phức tạp hơn: cầu cải thiện giao thông, ảnh tăng nhận biết, hoạt động lễ bắt đầu cùng lúc. Mùa mưa không hoạt động, khách vẫn hơn trước nhưng dưới đỉnh lễ. Ba thay đổi gần thời gian nên không thể chỉ nhìn trước sau chọn một nguyên nhân."],
          ["村委会下一年将分别记录过桥车辆、网络来源和活动报名，并询问游客选择目的地的理由。现有证据支持桥是重要条件，也支持传播与活动有作用；它不支持“只有桥才带来游客”。",
            "Năm sau làng ghi xe qua cầu, nguồn online, đăng ký hoạt động và hỏi lý do chọn điểm đến. Bằng chứng hỗ trợ cầu là điều kiện quan trọng, truyền thông/hoạt động cũng có vai trò; không hỗ trợ 'chỉ cầu mang khách'."],
        ],
        questions: [
          q("main-claim", "Bài nghe sửa cách giải thích nào?", ["Từ một nguyên nhân sang nhiều thay đổi gần nhau", "Từ nhiều dữ liệu sang không đo", "Từ cầu sang đóng làng", "Từ khách tăng sang khách giảm"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách cầu, truyền thông, hoạt động."),
          q("supported-detail", "Mùa mưa không hoạt động cho kết quả gì?", ["Khách hơn trước nhưng dưới đỉnh lễ", "Không có khách", "Khách gấp đôi mọi ngày", "Cầu đóng"], 0, ["lp2"], "Đây là biến thiên hỗ trợ nhiều yếu tố."),
          q("cross-paragraph-evidence", "Chi tiết nào hỗ trợ cầu vẫn có tác dụng?", ["Thời gian đi giảm và mùa không hoạt động vẫn hơn trước", "Ảnh được chia sẻ", "Có lễ hội", "Người bán có ý kiến"], 0, ["lp1", "lp2"], "Hai nguồn cho điều kiện giao thông bền hơn."),
          q("bounded-inference", "Có thể suy ra mục đích hỏi lý do du khách?", ["Tách vai trò cầu, mạng và hoạt động", "Tăng thời gian đi", "Bỏ đếm xe", "Chứng minh cầu duy nhất"], 0, ["lp3"], "Câu hỏi thêm bằng chứng về cơ chế chọn.", "Có thể suy ra mục tiêu phân rã nguyên nhân, chưa biết phản hồi có chính xác hoàn toàn."),
          q("scope-limit", "Kết luận nào không được hỗ trợ?", ["Cầu là điều kiện quan trọng", "Chỉ cây cầu tạo mọi tăng trưởng", "Truyền thông có thể tác động", "Cần đo nguồn khách"], 1, ["lp3"], "Nguồn bác độc quyền nguyên nhân."),
        ],
        noteMap: map([
          ["bridge", "Cầu", "Giảm thời gian đi.", ["lp1"]],
          ["network", "Mạng", "Tăng nhận biết qua ảnh.", ["lp1", "lp2"]],
          ["events", "Hoạt động", "Tạo đỉnh ngày lễ.", ["lp2"]],
          ["variation", "Biến thiên", "Mùa mưa vẫn hơn cũ nhưng thấp hơn đỉnh.", ["lp2"]],
          ["next", "Đo tiếp", "Xe, nguồn online, đăng ký, lý do.", ["lp3"]],
        ], [["bridge", "góp vào", "variation"], ["network", "góp vào", "variation"], ["events", "góp vào", "variation"], ["next", "sẽ tách", "variation"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán dựng hai tiến trình mở rộng thị trường và điểm đến; nêu mốc, chỉ số, nguyên nhân cạnh tranh và giới hạn.",
      requiredElements: ["bốn năm tiệm hoa", "đơn/lợi nhuận", "cầu và thời gian", "mạng/hoạt động", "đo tiếp"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "花店先试周末配送，再设市区取货点和线上订单；第四年市区订单超过郊区，包装与取货成本却使利润没有同样增长，所以扩大市场要分开看订单、损坏和利润。河边村的新桥把路程缩短，网络图片和节日活动也同时吸引游客；雨季数据说明桥有持续作用，却不能排除传播和活动。两个过程都需要按阶段和指标解释，前后增长不能自动证明一个变化是唯一原因。",
      modelVi: "Tiệm hoa thử giao cuối tuần, lập điểm nhận nội thành rồi thêm online; năm bốn đơn nội thành vượt ngoại ô nhưng chi phí khiến lợi nhuận không tăng tương ứng, nên phải tách đơn, hư hỏng, lợi nhuận. Cầu rút thời gian tới làng, ảnh mạng và hoạt động lễ cũng hút khách; dữ liệu mùa mưa cho thấy cầu có vai trò lâu hơn nhưng không loại truyền thông/hoạt động. Cả hai cần giải thích theo giai đoạn và chỉ số; tăng trước sau không tự chứng minh một thay đổi là nguyên nhân duy nhất.",
    },
  },
  [ID.cause]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "节假日市场为什么特别热闹",
        titleVi: "Vì sao chợ ngày lễ đặc biệt nhộn nhịp",
        targetVocabularyIds: [V(1074), V(1321), V(1383), V(1609), V(1790)],
        paragraphs: [
          ["春江市集在节假日人数超过平日三倍。管理方说著名美食吸引游客，商户认为免费公交是基础，文化团体则强调表演。三种条件同一周出现，很难只凭总人数排序。",
            "Chợ Xuân Giang ngày lễ đông hơn ngày thường ba lần. Quản lý nói món nổi tiếng hút khách, tiểu thương coi xe buýt miễn phí là nền, nhóm văn hóa nhấn biểu diễn. Ba điều kiện cùng tuần nên khó xếp chỉ từ tổng người."],
          ["调查把游客分组：本地居民多为购物，外地游客常提美食和表演，无车家庭更常使用公交。雨天下午表演取消，人数下降但仍高于平日。结果说明各条件影响不同人，并非一个因素解释全部热闹。",
            "Khảo sát chia nhóm: dân địa phương chủ yếu mua sắm, khách xa nhắc món và diễn, gia đình không xe dùng buýt. Chiều mưa hủy diễn, số người giảm nhưng vẫn hơn ngày thường. Điều kiện ảnh hưởng nhóm khác nhau, không một yếu tố giải hết."],
          ["下一次市集将分别记录时段、来源地、交通和活动参与。当前证据支持美食、公交和表演共同作用，却不能说人数越多经济收益必然越高，因为消费金额和管理成本还没计算。",
            "Lần sau ghi thời gian, nơi đến, giao thông, tham gia. Bằng chứng hỗ trợ món, buýt, diễn cùng tác động, chưa nói người càng đông lợi ích kinh tế càng cao vì chưa tính chi tiêu/chi phí."],
        ],
        questions: [
          q("main-claim", "Bài đọc giải thích sự nhộn nhịp thế nào?", ["Nhiều điều kiện tác động các nhóm khác nhau", "Chỉ do món ăn", "Chỉ do xe buýt", "Số người bằng lợi nhuận"], 0, ["rp1", "rp2", "rp3"], "Nguồn phân tầng nhóm và kết quả."),
          q("supported-detail", "Ai dùng xe buýt miễn phí nhiều hơn?", ["Gia đình không có xe", "Mọi khách như nhau", "Chỉ nghệ sĩ", "Chỉ người bán"], 0, ["rp2"], "Khảo sát phân nhóm."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy biểu diễn không phải nguyên nhân duy nhất?", ["Khi hủy diễn, số người vẫn hơn ngày thường", "Có món nổi tiếng", "Chợ ở thành phố", "Có ngày lễ"], 0, ["rp1", "rp2"], "Biến thiên giữ một phần tăng trưởng."),
          q("bounded-inference", "Có thể suy ra vì sao cần ghi chi tiêu và chi phí?", ["Để tách đông người khỏi hiệu quả kinh tế", "Để giảm số khách", "Để bỏ xe buýt", "Để chứng minh biểu diễn"], 0, ["rp3"], "Nguồn nêu khoảng trống giữa attendance và lợi ích.", "Có thể suy ra mục tiêu đánh giá kinh tế, chưa biết lợi ích ròng."),
          q("scope-limit", "Claim nào vượt dữ liệu?", ["Nhiều yếu tố cùng tác động", "Đông gấp ba bảo đảm lợi nhuận gấp ba", "Nhóm khách có lý do khác", "Chưa tính chi phí"], 1, ["rp3"], "Không có dữ liệu lợi nhuận."),
        ],
        noteMap: map([
          ["food", "Ẩm thực", "Thu hút khách xa.", ["rp1", "rp2"]],
          ["transport", "Giao thông", "Hỗ trợ gia đình không xe.", ["rp1", "rp2"]],
          ["show", "Biểu diễn", "Tạo thêm người nhưng có thể hủy.", ["rp1", "rp2"]],
          ["attendance", "Số người", "Ba lần ngày thường.", ["rp1"]],
          ["economy", "Khoảng trống", "Chi tiêu và chi phí chưa tính.", ["rp3"]],
        ], [["food", "góp vào", "attendance"], ["transport", "góp vào", "attendance"], ["show", "góp vào", "attendance"], ["economy", "giới hạn cách đọc", "attendance"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "理想生活是不是少买东西",
        titleVi: "Cuộc sống lý tưởng có phải mua ít đồ",
        targetVocabularyIds: [V(1463), V(1932), V(1248), V(1861), V(1719)],
        paragraphs: [
          ["社区讨论理想生活，有人主张少买各种商品，认为家里更简单；也有人说正常生活需要方便，尤其有孩子或老人时。两方最初只谈个人经验，容易把自己的条件当成所有人的标准。",
            "Cộng đồng bàn cuộc sống lý tưởng: người muốn mua ít cho nhà đơn giản, người nói đời thường cần tiện, nhất là có trẻ/người già. Hai bên ban đầu chỉ nói kinh nghiệm cá nhân, dễ coi điều kiện mình là chuẩn chung."],
          ["主持人请大家谈一件具体物品。独居者也许能共享工具，照顾病人的家庭却需要随时使用；质量好的物品买一次可能比便宜物品反复更换更节约。讨论从“买或不买”转向用途、频率和寿命。",
            "Chủ trì yêu cầu nói một đồ cụ thể. Người ở một mình có thể chia sẻ dụng cụ, gia đình chăm bệnh cần dùng bất kỳ lúc; đồ chất lượng mua một lần có thể tiết kiệm hơn đồ rẻ thay nhiều. Tranh luận chuyển từ mua/không sang công dụng, tần suất, tuổi thọ."],
          ["小组最后提出三问：谁使用、多久使用、有没有共享选择。这个框架没有给出唯一理想答案，而是让不同生活条件可比较。参与者只有一个社区，结论不能代表全社会的消费观念。",
            "Nhóm đưa ba câu hỏi: ai dùng, dùng bao lâu, có chia sẻ không. Khung không cho đáp án lý tưởng duy nhất mà làm điều kiện so được. Người tham gia chỉ một cộng đồng nên không đại diện toàn xã hội."],
        ],
        questions: [
          q("main-claim", "Tranh luận chuyển theo hướng nào?", ["Từ khẩu hiệu mua ít sang đánh giá theo điều kiện sử dụng", "Từ chia sẻ sang mua mọi thứ", "Từ cộng đồng sang thị trường quốc tế", "Từ chất lượng sang chỉ giá"], 0, ["lp1", "lp2", "lp3"], "Nguồn cụ thể hóa tiêu chí."),
          q("supported-detail", "Khi nào sở hữu riêng có lý do mạnh?", ["Gia đình cần dùng ngay để chăm người bệnh", "Đồ không bao giờ dùng", "Luôn có dịch vụ chia sẻ", "Chỉ vì rẻ"], 0, ["lp2"], "Điều kiện truy cập kịp thời được nêu."),
          q("cross-paragraph-evidence", "Vì sao 'mua ít' không phải chuẩn duy nhất?", ["Nhu cầu gia đình và tuổi thọ sản phẩm khác", "Mọi người sống một mình", "Mọi đồ đều giống nhau", "Không ai quan tâm chất lượng"], 0, ["lp1", "lp2"], "Điều kiện và chi phí vòng đời khác nhau."),
          q("bounded-inference", "Có thể suy ra lợi ích ba câu hỏi cuối?", ["Biến quan điểm thành tiêu chí có thể so", "Chứng minh không nên mua gì", "Thay mọi quyết định cá nhân", "Đo kinh tế toàn xã hội"], 0, ["lp2", "lp3"], "Khung gắn người dùng, thời gian, lựa chọn.", "Có thể suy ra lợi ích thảo luận, chưa thể suy ra hành vi mua thực tế."),
          q("scope-limit", "Kết luận nào phù hợp?", ["Không có một đáp án lý tưởng cho mọi điều kiện", "Cả xã hội đã đồng ý mua ít", "Chia sẻ luôn tốt hơn sở hữu", "Đồ đắt luôn bền"], 0, ["lp3"], "Mẫu nhỏ và khung có điều kiện."),
        ],
        noteMap: map([
          ["less", "Góc nhìn mua ít", "Đơn giản và giảm đồ.", ["lp1"]],
          ["convenience", "Góc nhìn tiện lợi", "Trẻ, già, chăm bệnh.", ["lp1", "lp2"]],
          ["quality", "Vòng đời", "Chất lượng có thể giảm thay thế.", ["lp2"]],
          ["criteria", "Ba tiêu chí", "Ai, bao lâu, chia sẻ.", ["lp3"]],
          ["scope", "Phạm vi", "Một cộng đồng.", ["lp3"]],
        ], [["less", "được cân bằng với", "convenience"], ["quality", "mở rộng", "less"], ["criteria", "so sánh", "convenience"], ["scope", "giới hạn", "criteria"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán phân tích điều kiện tạo chợ nhộn nhịp và quan niệm tiêu dùng; nêu nhóm khác nhau, chỉ số còn thiếu và giới hạn.",
      requiredElements: ["ẩm thực/buýt/biểu diễn", "nhóm khách", "attendance vs lợi ích", "mua ít vs tiện", "phạm vi mẫu"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "节日市场的热闹由美食、免费公交和表演共同形成，而且本地人、外地游客和无车家庭受影响不同；人数增加不能直接代表经济收益，因为消费与管理成本未计算。理想生活的讨论也不能只用“少买”判断，独居者可以共享工具，照顾病人的家庭需要及时使用，物品寿命还影响总成本。两份材料都要求按人群、用途和指标解释，单一社区或一次市集不能代表全部经济和生活观念。",
      modelVi: "Chợ lễ nhộn nhịp do món ăn, xe miễn phí và biểu diễn cùng tạo, với dân địa phương, khách xa, gia đình không xe chịu ảnh hưởng khác; đông người không tự là lợi ích kinh tế vì chưa tính chi tiêu/chi phí. Cuộc sống lý tưởng cũng không chỉ đo bằng mua ít: người ở một mình có thể chia sẻ, gia đình chăm bệnh cần dùng kịp, tuổi thọ đồ ảnh hưởng tổng phí. Cả hai cần giải thích theo nhóm, công dụng, chỉ số; một cộng đồng hay một kỳ chợ không đại diện toàn bộ.",
    },
  },
  [ID.compare]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "两个视频账号谁赚得更多",
        titleVi: "Tài khoản video nào kiếm nhiều hơn",
        targetVocabularyIds: [V(1041), V(1214), V(1324), V(1793), V(1973)],
        paragraphs: [
          ["平台比较两个知识视频账号。甲每周播放量高，靠广告赚得多；乙播放较少，却积累了稳定订阅者和课程收入。只看播放，甲明显领先；看收入来源，情况更复杂。",
            "Nền tảng so hai tài khoản kiến thức. A lượt phát tuần cao và kiếm quảng cáo nhiều; B phát ít nhưng tích lũy thuê bao và thu khóa ổn định. Chỉ nhìn lượt phát A dẫn; nhìn nguồn thu phức tạp hơn."],
          ["三个月后，平台改变推荐规则，甲播放下降四成，广告收入也下降；乙播放只下降一成，订阅收入基本不变。甲的强项是快速扩大，乙的强项是收入稳定。两种模式面对规则变化的反应不同。",
            "Ba tháng sau, nền tảng đổi gợi ý, lượt A giảm bốn phần mười và quảng cáo giảm; B chỉ giảm một phần mười, thuê bao gần không đổi. A mạnh mở nhanh, B mạnh ổn định. Hai mô hình phản ứng khác khi luật đổi."],
          ["研究报告同时列播放、总收入、收入波动和制作时间，不宣布唯一赢家。账号目标不同：若要快速传播，甲可能更合适；若要稳定运营，乙有优势。结果不能推广到任何内容领域。",
            "Báo cáo liệt kê lượt phát, tổng thu, dao động, thời gian làm, không chọn người thắng. Mục tiêu khác: truyền nhanh có thể hợp A, vận hành ổn định B có lợi. Không mở ra mọi lĩnh vực nội dung."],
        ],
        questions: [
          q("main-claim", "Bài đọc so sánh hai tài khoản theo điều gì?", ["Nhiều chỉ số và mục tiêu khác nhau", "Chỉ lượt phát", "Chỉ quảng cáo", "Một người thắng mọi mặt"], 0, ["rp1", "rp2", "rp3"], "Nguồn giữ các chiều hiệu suất."),
          q("supported-detail", "Sau đổi quy tắc, điểm ổn định của B là gì?", ["Thu thuê bao gần không đổi", "Lượt phát tăng gấp đôi", "Không làm nội dung", "Quảng cáo tăng"], 0, ["rp2"], "Đây là kết quả trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao lượt phát không đủ để đánh giá thu nhập?", ["Nguồn thu và độ nhạy quy tắc khác nhau", "Cả hai có video", "Có ba tháng", "Nền tảng có quảng cáo"], 0, ["rp1", "rp2"], "Lượt và doanh thu không cùng cấu trúc."),
          q("bounded-inference", "Có thể suy ra vì sao báo thời gian sản xuất?", ["Để thêm chi phí vận hành vào so sánh", "Để tăng lượt phát", "Để bỏ thu nhập", "Để chọn lĩnh vực"], 0, ["rp3"], "Thời gian là đầu vào cạnh kết quả.", "Có thể suy ra mục đích đánh giá hiệu quả, chưa có dữ liệu để chọn tài khoản."),
          q("scope-limit", "Claim nào quá rộng?", ["A truyền nhanh hơn trong mẫu", "Mô hình B tốt hơn mọi loại nội dung", "B ổn định hơn khi đổi quy tắc", "Mục tiêu ảnh hưởng lựa chọn"], 1, ["rp3"], "Nguồn giới hạn lĩnh vực."),
        ],
        noteMap: map([
          ["account-a", "Mô hình A", "Phát cao, quảng cáo, nhạy quy tắc.", ["rp1", "rp2"]],
          ["account-b", "Mô hình B", "Thuê bao ổn định, phát thấp hơn.", ["rp1", "rp2"]],
          ["shock", "Thay đổi", "Quy tắc gợi ý.", ["rp2"]],
          ["metrics", "Chỉ số", "Phát, thu, dao động, thời gian.", ["rp3"]],
          ["scope", "Phạm vi", "Không mọi lĩnh vực.", ["rp3"]],
        ], [["shock", "ảnh hưởng mạnh", "account-a"], ["shock", "ảnh hưởng nhẹ", "account-b"], ["metrics", "so sánh", "account-a"], ["scope", "giới hạn", "metrics"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "工厂节约计划为何推迟",
        titleVi: "Vì sao kế hoạch tiết kiệm nhà máy bị trì hoãn",
        targetVocabularyIds: [V(1250), V(1384), V(1683), V(1756), V(1613)],
        paragraphs: [
          ["工厂计划更换节能机器，首先比较三种设备。采购部门强调价格，生产部门担心停工，安全人员要求任何新机器先测试。三方使用同一个“节约”词，却关注不同成本。",
            "Nhà máy định thay máy tiết kiệm, trước hết so ba thiết bị. Mua hàng nhấn giá, sản xuất lo ngừng việc, an toàn yêu cầu máy mới thử trước. Ba bên cùng nói 'tiết kiệm' nhưng quan tâm chi phí khác."],
          ["原计划六月安装，测试发现一台机器夜班过热，项目推迟两个月。价格最低的设备因此被排除；另一台价格较高，却能在周末分段安装，减少停工。若只比较购买价，结论会不同。",
            "Kế hoạch lắp tháng sáu; thử thấy một máy quá nóng ca đêm, dự án hoãn hai tháng. Máy rẻ nhất bị loại; máy khác đắt hơn nhưng lắp từng phần cuối tuần, giảm ngừng việc. Chỉ so giá mua sẽ ra kết luận khác."],
          ["最终报告分别计算设备价格、停工损失、能源和安全风险。推迟不是计划失败，而是新证据改变选择。不过节能数据来自试运行，全年效果仍需正式使用后验证。",
            "Báo cáo cuối tính giá máy, mất do ngừng, năng lượng, rủi ro. Hoãn không phải thất bại mà bằng chứng mới đổi lựa chọn. Dữ liệu tiết kiệm từ chạy thử, hiệu quả năm cần xác minh sau dùng chính thức."],
        ],
        questions: [
          q("main-claim", "Bài nghe giải thích việc trì hoãn thế nào?", ["Bằng chứng an toàn làm đổi lựa chọn đa chi phí", "Chỉ vì giá tăng", "Không có thiết bị", "Mọi bên phản đối tiết kiệm"], 0, ["lp1", "lp2", "lp3"], "Nguồn theo vai trò, thử nghiệm và quyết định."),
          q("supported-detail", "Vì sao máy rẻ nhất bị loại?", ["Quá nóng trong ca đêm", "Không tiết kiệm giá mua", "Không thể vận chuyển", "Không có màu phù hợp"], 0, ["lp2"], "Thử an toàn phát hiện."),
          q("cross-paragraph-evidence", "Chi phí nào ngoài giá mua được xét?", ["Ngừng việc, năng lượng và an toàn", "Chỉ số người xem", "Quảng cáo và thuê bao", "Khoảng vận chuyển"], 0, ["lp1", "lp3"], "Các vai trò mở rộng khái niệm chi phí."),
          q("bounded-inference", "Có thể suy ra vì sao lắp từng phần cuối tuần được ưu tiên?", ["Giảm tổn thất ngừng sản xuất", "Tăng nhiệt ca đêm", "Bỏ kiểm tra", "Bảo đảm hiệu quả năm"], 0, ["lp2", "lp3"], "Thiết kế lắp phản hồi mối lo sản xuất.", "Có thể suy ra lợi ích dự kiến, chưa có dữ liệu vận hành chính thức."),
          q("scope-limit", "Claim nào chưa được chứng minh?", ["Máy đã qua thử ngắn", "Tiết kiệm năng lượng cả năm chắc chắn đạt", "Giá thấp không phải tiêu chí duy nhất", "An toàn ảnh hưởng chọn"], 1, ["lp3"], "Cần dữ liệu dùng chính thức."),
        ],
        noteMap: map([
          ["purchase", "Mua hàng", "Giá thiết bị.", ["lp1"]],
          ["production", "Sản xuất", "Tổn thất dừng máy.", ["lp1", "lp2"]],
          ["safety", "An toàn", "Thử an toàn trong ca đêm.", ["lp1", "lp2"]],
          ["delay", "Điều chỉnh", "Hoãn và đổi máy.", ["lp2"]],
          ["evidence", "Còn thiếu", "Hiệu quả cả năm.", ["lp3"]],
        ], [["safety", "gây ra", "delay"], ["production", "định hình", "delay"], ["purchase", "được cân bằng với", "production"], ["evidence", "giới hạn", "delay"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh hai mô hình hiệu quả số và công nghiệp; nêu chỉ số, cú sốc, đánh đổi và phạm vi.",
      requiredElements: ["A/B video", "đổi gợi ý", "ba vai trò nhà máy", "thử quá nóng", "dữ liệu dài hạn thiếu"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "两个视频账号分别依靠广告播放和稳定订阅，推荐规则变化使前者下降更多，所以播放量、收入波动和制作时间必须一起比较。工厂选择节能设备时，购买价、停工损失和安全风险也指向不同答案；夜班过热使项目推迟并排除最低价设备。两份材料都表明“效果”不是一个数字，外部规则或测试新证据会改变选择。账号结果不能推广到所有内容，机器全年节能也尚未验证。",
      modelVi: "Hai tài khoản dựa quảng cáo/lượt phát và thuê bao ổn định; đổi gợi ý làm cái đầu giảm mạnh nên cần so lượt, dao động thu, thời gian làm. Nhà máy cũng có giá mua, mất ngừng việc, an toàn cho đáp án khác; quá nóng ca đêm khiến hoãn và loại máy rẻ. Cả hai cho thấy hiệu quả không là một số, quy tắc ngoài hoặc bằng chứng thử có thể đổi chọn. Kết quả tài khoản không mở ra mọi nội dung, tiết kiệm cả năm chưa xác minh.",
    },
  },
  [ID.evidence]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "道路改造后事故肯定减少了吗",
        titleVi: "Sau cải tạo đường, tai nạn chắc chắn giảm chưa",
        targetVocabularyIds: [V(1075), V(1143), V(1323), V(1386), V(1611)],
        paragraphs: [
          ["首都一条道路增加自行车道后，报告事故人数下降两成，媒体积极称改造成功。交通部门解释，车速也下降，可能支持安全改善；但同一时期道路施工使总车流减少。",
            "Một đường thủ đô thêm làn xe đạp, số người tai nạn báo giảm hai phần mười; truyền thông gọi thành công. Giao thông nói tốc độ xe cũng giảm, có thể hỗ trợ an toàn; nhưng cùng lúc thi công làm lưu lượng giảm."],
          ["部门比较改造前后同月份，并查看附近未改道路。目标路段下降仍存在，附近道路变化小；不过轻微事故报告方式也换成了手机系统，主动上报人数可能增加。不同证据指向改善，却仍有测量变化。",
            "Cơ quan so cùng tháng trước/sau và đường gần chưa sửa. Đoạn mục tiêu vẫn giảm, đường gần ít đổi; nhưng báo tai nạn nhẹ đổi sang điện thoại, người tự báo có thể tăng. Bằng chứng hướng cải thiện nhưng đo cũng đổi."],
          ["报告最终写“改造与事故和车速下降同时出现”，不写“肯定造成”。下一年将按车流量计算并保持同一报告方式。积极结果值得继续观察，但基础设施结论需要对照、暴露量和稳定测量。",
            "Báo cáo cuối viết 'cải tạo xuất hiện cùng giảm tai nạn/tốc độ', không viết 'chắc chắn gây'. Năm sau tính theo lưu lượng và giữ cách báo. Kết quả tích cực cần theo dõi, claim hạ tầng cần đối chứng, mức tiếp xúc, đo ổn định."],
        ],
        questions: [
          q("main-claim", "Bài đọc đánh giá claim thành công thế nào?", ["Giữ tín hiệu tích cực nhưng giới hạn nhân quả", "Khẳng định chắc chắn ngay", "Bỏ dữ liệu tốc độ", "Chỉ đọc báo chí"], 0, ["rp1", "rp2", "rp3"], "Nguồn thêm confound và đo."),
          q("supported-detail", "Yếu tố nào làm tổng xe giảm?", ["Thi công đường", "Làn xe đạp", "Ứng dụng điện thoại", "Báo chí"], 0, ["rp1"], "Đây là giải thích cạnh tranh."),
          q("cross-paragraph-evidence", "Chi tiết nào vừa tăng sức mạnh đối chiếu vừa giữ giới hạn kết luận?", ["Đường gần ít đổi, nhưng báo cáo vẫn chỉ nói các thay đổi xuất hiện đồng thời", "Báo chí tích cực và tuyên bố chắc chắn", "Ứng dụng mới chứng minh cải tạo gây giảm", "Số người giảm trên mọi con đường"], 0, ["rp2", "rp3"], "Đường đối chiếu hỗ trợ tín hiệu, còn cách viết cuối vẫn tránh nhân quả tuyệt đối."),
          q("bounded-inference", "Có thể suy ra vì sao tính theo lưu lượng?", ["Điều chỉnh mức phơi nhiễm giao thông", "Tăng số tai nạn", "Bỏ so tháng", "Chứng minh nhân quả tuyệt đối"], 0, ["rp1", "rp3"], "Ít xe có thể tự làm số vụ giảm.", "Có thể suy ra mục tiêu chuẩn hóa exposure, chưa loại hết mọi thay đổi."),
          q("scope-limit", "Câu nào đúng phạm vi?", ["Cải tạo đồng thời với giảm tai nạn và tốc độ", "Cải tạo chắc chắn là nguyên nhân duy nhất", "Cách báo không đổi", "Mọi đường thủ đô giống nhau"], 0, ["rp3"], "Báo cáo dùng ngôn ngữ tương quan."),
        ],
        noteMap: map([
          ["claim", "Claim", "Cải tạo làm an toàn hơn.", ["rp1"]],
          ["support", "Ủng hộ", "Tai nạn và tốc độ giảm.", ["rp1", "rp2"]],
          ["confound", "Nhiễu", "Thi công giảm lưu lượng.", ["rp1"]],
          ["measurement", "Đo thay đổi", "Báo bằng điện thoại.", ["rp2"]],
          ["next", "Tiếp", "Tính theo lưu lượng, giữ cách báo.", ["rp3"]],
        ], [["support", "ủng hộ hẹp", "claim"], ["confound", "làm yếu", "claim"], ["measurement", "làm phức tạp", "support"], ["next", "kiểm tra", "claim"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一次夜间转机的数据",
        titleVi: "Dữ liệu của một lần chuyển chuyến ban đêm",
        targetVocabularyIds: [V(1682), V(1578), V(1972), V(1792), V(1900)],
        paragraphs: [
          ["首都机场调整夜间转机流程，原来旅客前后要经过三次证件检查。新流程合并两次检查，并增加细心引导。首月平均时间缩短十五分钟，于是机场说体验改善。",
            "Sân bay thủ đô chỉnh chuyển chuyến đêm; trước khách qua ba lần giấy tờ. Quy trình mới gộp hai lần và thêm hướng dẫn cẩn thận. Tháng đầu trung bình rút 15 phút, sân bay nói trải nghiệm cải thiện."],
          ["进一步看，国际航班人数当月也较少，正好没有大面积延误。问卷只发给成功转机者，错过航班的人没有进入样本。原来“平均更快”是真的，却不能代表所有旅客。",
            "Xem thêm, khách quốc tế tháng đó ít và không chậm diện rộng. Khảo sát chỉ cho người chuyển thành công, người lỡ không vào mẫu. 'Trung bình nhanh hơn' đúng nhưng không đại diện mọi khách."],
          ["机场决定在高峰月再次比较，并记录错过转机、排队长度和不同语言旅客。现有数据支持正常低流量夜晚更快，不支持任何情况下都改善。样本边界改变了合理结论，也是下次比较的重点。",
            "Sân bay sẽ so lại tháng cao điểm, ghi lỡ chuyến, hàng chờ, khách ngôn ngữ khác. Dữ liệu hỗ trợ đêm lưu lượng thấp nhanh hơn, không hỗ trợ mọi tình huống. Biên mẫu đổi kết luận hợp lý và là trọng tâm so sánh tiếp theo."],
        ],
        questions: [
          q("main-claim", "Bài nghe chỉ ra vấn đề gì của số trung bình?", ["Mẫu chỉ gồm người thành công trong tháng ít khách", "Không có dữ liệu thời gian", "Quy trình không đổi", "Mọi chuyến bị trễ"], 0, ["lp1", "lp2", "lp3"], "Nguồn thêm điều kiện và nhóm bị thiếu."),
          q("supported-detail", "Ai không có trong khảo sát?", ["Người lỡ chuyến", "Người chuyển thành công", "Nhân viên hướng dẫn", "Khách thủ đô"], 0, ["lp2"], "Đây là selection bias."),
          q("cross-paragraph-evidence", "Vì sao chưa đại diện cao điểm?", ["Tháng ít khách và không chậm diện rộng", "Có ba kiểm tra cũ", "Rút 15 phút", "Có chuyến đêm"], 0, ["lp1", "lp2"], "Điều kiện thuận lợi giới hạn phạm vi."),
          q("bounded-inference", "Có thể suy ra vì sao ghi người lỡ chuyến?", ["Bổ sung kết quả xấu bị mẫu cũ loại", "Tăng thời gian chờ", "Bỏ dữ liệu thành công", "Chứng minh mọi người nhanh"], 0, ["lp2", "lp3"], "Mẫu cũ chỉ gồm người thành công.", "Có thể suy ra mục tiêu giảm thiên lệch, chưa biết tỷ lệ lỡ chuyến."),
          q("scope-limit", "Claim hợp lý nhất?", ["Quy trình nhanh hơn trong đêm lưu lượng thấp đã quan sát", "Nhanh hơn ở mọi tình huống", "Không ai lỡ chuyến", "Mọi ngôn ngữ dùng như nhau"], 0, ["lp3"], "Nguồn giới hạn điều kiện."),
        ],
        noteMap: map([
          ["change", "Thay đổi", "Gộp kiểm tra, thêm hướng dẫn.", ["lp1"]],
          ["result", "Kết quả", "Trung bình giảm 15 phút.", ["lp1"]],
          ["conditions", "Điều kiện", "Ít khách, không chậm lớn.", ["lp2"]],
          ["selection", "Thiên lệch mẫu", "Chỉ người thành công.", ["lp2"]],
          ["next", "Đo tiếp", "Cao điểm, lỡ chuyến, hàng, ngôn ngữ.", ["lp3"]],
        ], [["change", "đi trước", "result"], ["conditions", "giới hạn", "result"], ["selection", "giới hạn", "result"], ["next", "sửa", "selection"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán đánh giá hai claim hạ tầng; nêu đối chứng, exposure, selection bias và claim được phép.",
      requiredElements: ["làn xe/tai nạn", "thi công và cách báo", "quy trình chuyển chuyến", "mẫu người thành công", "đo tiếp"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "道路增加自行车道后，事故人数和车速下降，附近未改道路变化较小，这支持安全改善；但施工减少车流、报告系统改变，因此报告只写同时出现，并计划按车流量计算。机场合并检查后，成功转机者平均快十五分钟，可当月人数少，问卷又排除了错过航班的人，所以结论只适用于低流量夜晚。两项基础设施都显示积极信号，却必须处理暴露量、测量变化和样本选择，不能用一次前后比较宣布普遍因果。",
      modelVi: "Sau làn xe, số tai nạn và tốc độ giảm, đường gần ít đổi nên hỗ trợ cải thiện; nhưng thi công giảm lưu lượng và hệ báo đổi, vì vậy chỉ viết đồng thời và sẽ tính theo lưu lượng. Sau gộp kiểm tra, người chuyển thành công nhanh 15 phút, nhưng tháng ít người và khảo sát loại người lỡ, nên claim chỉ cho đêm lưu lượng thấp. Cả hai có tín hiệu tích cực nhưng phải xử lý exposure, thay đổi đo, chọn mẫu; không dùng một so trước/sau tuyên bố nhân quả phổ quát.",
    },
  },
  [ID.viewpoint]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "共享市场怎样算成功",
        titleVi: "Thị trường chia sẻ tính thành công thế nào",
        targetVocabularyIds: [V(1079), V(1363), V(1396), V(1723), V(1937)],
        paragraphs: [
          ["城市正式推出共享工具市场，目标是降低家庭购买和闲置。经济部门把交易次数当成功，环保组织看资源节约，社区代表更关心低收入家庭是否参与。三方讨论的是同一项目，却用不同标准。",
            "Thành phố chính thức ra chợ chia sẻ dụng cụ để giảm mua và đồ nhàn. Kinh tế coi số giao dịch là thành công, môi trường nhìn tiết kiệm tài nguyên, cộng đồng quan tâm gia đình thu nhập thấp có tham gia. Cùng dự án, chuẩn khác."],
          ["六个月内交易增加，但多数发生在收入较高地区；部分工具运输距离很长，未必降低总成本。项目在数量上成功，却在公平和环境上证据不足。团队新增地区、运输和替代购买三个字段。",
            "Sáu tháng giao dịch tăng nhưng chủ yếu vùng thu nhập cao; vài dụng cụ vận chuyển xa, chưa chắc giảm tổng phí. Thành công về số nhưng thiếu bằng chứng công bằng/môi trường. Nhóm thêm vùng, vận chuyển, mua thay thế."],
          ["下一阶段提供社区取货点和低费用会员。结果将分别报告交易、经济节省、资源作用和参与公平。综合观点不是把所有标准混成一个分数，而是承认一个维度改善时其他维度仍需验证。",
            "Giai đoạn sau có điểm nhận cộng đồng và hội viên phí thấp. Báo riêng giao dịch, tiết kiệm kinh tế, tác dụng tài nguyên, công bằng. Tổng hợp không trộn một điểm mà thừa nhận một chiều tốt khi chiều khác còn kiểm."],
        ],
        questions: [
          q("main-claim", "Bài đọc định nghĩa thành công thế nào?", ["Nhiều chiều được báo riêng", "Chỉ số giao dịch duy nhất", "Chỉ ý kiến kinh tế", "Mọi chiều đã đạt"], 0, ["rp1", "rp2", "rp3"], "Nguồn giữ tiêu chuẩn khác nhau."),
          q("supported-detail", "Khoảng trống công bằng là gì?", ["Giao dịch tập trung vùng thu nhập cao", "Không có giao dịch", "Không ai biết công cụ", "Mọi vùng bằng nhau"], 0, ["rp2"], "Dữ liệu phân bố."),
          q("cross-paragraph-evidence", "Vì sao nhiều giao dịch chưa chứng minh môi trường tốt?", ["Vận chuyển xa và chưa biết có thay mua mới", "Có điểm nhận", "Có hội viên", "Thành phố ra mắt"], 0, ["rp2", "rp3"], "Thiếu cơ chế thay thế và chi phí vận chuyển."),
          q("bounded-inference", "Có thể suy ra vai trò điểm nhận cộng đồng?", ["Giảm rào cản địa lý/chi phí tham gia", "Tăng vận chuyển xa", "Bỏ đo công bằng", "Bảo đảm mọi chiều thành công"], 0, ["rp2", "rp3"], "Thiết kế phản hồi phân bố và vận chuyển.", "Có thể suy ra mục tiêu, chưa có kết quả giai đoạn sau."),
          q("scope-limit", "Claim nào được phép?", ["Giao dịch tăng nhưng công bằng/môi trường chưa đủ chứng cứ", "Dự án thành công hoàn toàn", "Mọi giao dịch thay mua mới", "Mọi vùng tham gia như nhau"], 0, ["rp2", "rp3"], "Bài tách chiều."),
        ],
        noteMap: map([
          ["economic", "Kinh tế", "Giao dịch và tiết kiệm.", ["rp1", "rp3"]],
          ["environment", "Môi trường", "Tài nguyên, vận chuyển.", ["rp1", "rp2"]],
          ["equity", "Công bằng", "Phân bố thu nhập.", ["rp1", "rp2"]],
          ["intervention", "Điều chỉnh", "Điểm nhận và phí thấp.", ["rp3"]],
          ["report", "Báo cáo", "Bốn chiều riêng.", ["rp3"]],
        ], [["environment", "được đo trong", "report"], ["equity", "định hình", "intervention"], ["intervention", "sẽ tác động", "economic"], ["report", "không trộn", "equity"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "即使不用排队，联系仍重要",
        titleVi: "Dù không xếp hàng, liên hệ vẫn quan trọng",
        targetVocabularyIds: [V(1326), V(1470), V(1545), V(1616), V(1651)],
        paragraphs: [
          ["一家银行推出无排队手机办理，宣传说即使在家也能完成。年轻用户欢迎速度，老人和小企业仍希望联系工作人员。上线后大厅排队减少一半，但电话等待变长。",
            "Ngân hàng ra dịch vụ điện thoại không xếp hàng, quảng cáo làm ở nhà. Người trẻ thích nhanh, người già/doanh nghiệp nhỏ vẫn muốn liên hệ nhân viên. Sau ra mắt, hàng sảnh giảm nửa nhưng chờ điện thoại dài."],
          ["银行最初只报告大厅变化，员工指出问题只是转到另一渠道。剩下到大厅的人多有复杂材料，平均办理时间反而增加。速度改善对简单业务成立，对复杂业务不能用同一指标。",
            "Ban đầu ngân hàng chỉ báo sảnh; nhân viên nói vấn đề chuyển kênh. Người còn đến sảnh thường hồ sơ phức tạp, thời gian trung bình tăng. Cải thiện tốc độ đúng với việc đơn giản, không dùng cùng chỉ số cho việc phức tạp."],
          ["新方案在手机流程加入回拨预约，并分别报告大厅人数、电话等待、完成率和需要帮助者。无排队不是取消人工联系，而是重新安排渠道。试行刚开始，尚不能说所有用户体验都改善。",
            "Phương án mới thêm hẹn gọi lại, báo riêng người sảnh, chờ điện thoại, hoàn thành, người cần trợ giúp. Không xếp hàng không phải bỏ liên hệ người mà sắp lại kênh. Thử vừa bắt đầu, chưa nói mọi trải nghiệm tốt."],
        ],
        questions: [
          q("main-claim", "Bài nghe tổng hợp hai góc nhìn thế nào?", ["Dịch vụ số nhanh nhưng cần kênh hỗ trợ và chỉ số riêng", "Bỏ mọi nhân viên", "Chỉ đo hàng sảnh", "Mọi việc đều đơn giản"], 0, ["lp1", "lp2", "lp3"], "Nguồn nhìn chuyển tải giữa kênh."),
          q("supported-detail", "Sau số hóa, vấn đề nào tăng?", ["Chờ điện thoại", "Hàng sảnh", "Số nhân viên", "Giá dịch vụ"], 0, ["lp1"], "Đây là chuyển kênh."),
          q("cross-paragraph-evidence", "Vì sao thời gian sảnh tăng không nhất thiết là thất bại?", ["Người còn lại có hồ sơ phức tạp hơn", "Không ai dùng điện thoại", "Sảnh đóng", "Mọi việc giống nhau"], 0, ["lp1", "lp2"], "Composition của mẫu thay đổi."),
          q("bounded-inference", "Có thể suy ra lợi ích hẹn gọi lại?", ["Giữ hỗ trợ mà không buộc chờ liên tục", "Xóa mọi liên hệ", "Tăng hàng sảnh", "Bảo đảm trải nghiệm"], 0, ["lp1", "lp3"], "Nó phản hồi nhu cầu nhân viên và chờ điện thoại.", "Có thể suy ra mục tiêu thiết kế, chưa có kết quả thử."),
          q("scope-limit", "Claim nào quá sớm?", ["Hàng sảnh giảm", "Mọi người dùng đều hài lòng hơn", "Việc phức tạp cần hỗ trợ", "Nhiều chỉ số cần báo"], 1, ["lp3"], "Thử mới bắt đầu."),
        ],
        noteMap: map([
          ["digital", "Kênh số", "Nhanh cho việc đơn giản.", ["lp1", "lp2"]],
          ["human", "Liên hệ người", "Cần cho nhóm và việc phức tạp.", ["lp1", "lp2"]],
          ["shift", "Chuyển tải", "Hàng sảnh giảm, điện thoại tăng.", ["lp1"]],
          ["composition", "Mẫu sảnh", "Hồ sơ còn lại phức tạp.", ["lp2"]],
          ["hybrid", "Phương án", "Hẹn gọi và báo nhiều chỉ số.", ["lp3"]],
        ], [["digital", "làm thay đổi", "shift"], ["shift", "ảnh hưởng", "human"], ["composition", "giải thích", "human"], ["hybrid", "kết hợp", "digital"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán tổng hợp hai đổi mới kinh tế; nêu tiêu chuẩn thành công, phân bố người dùng, chuyển kênh và giới hạn.",
      requiredElements: ["bốn chiều chợ chia sẻ", "phân bố vùng", "dịch vụ số ngân hàng", "chuyển chờ sang điện thoại", "thử nghiệm chưa đủ"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "共享工具市场的交易增加，但主要集中在高收入地区，长距离运输和是否替代购买仍不清楚，因此经济、环境与公平要分别报告。银行手机办理使大厅排队减少，却把部分等待转到电话，留下的大厅业务也更复杂；新方案用回拨预约保留人工联系。两个创新都在一个指标上改善，却改变了参与者或渠道分布。综合评价要跟踪谁受益、成本转到哪里，并等待新措施试行，不能用交易量或大厅人数宣布全面成功。",
      modelVi: "Chợ chia sẻ tăng giao dịch nhưng tập trung vùng thu nhập cao, vận chuyển xa và việc có thay mua mới chưa rõ, nên kinh tế, môi trường, công bằng phải báo riêng. Ngân hàng số giảm hàng sảnh nhưng chuyển phần chờ sang điện thoại và việc còn ở sảnh phức tạp; hẹn gọi giữ hỗ trợ người. Cả hai đổi mới cải thiện một chỉ số nhưng đổi phân bố người/kênh. Đánh giá phải theo ai hưởng lợi, chi phí chuyển đâu và chờ thử mới; không dùng giao dịch hay người sảnh tuyên bố thành công toàn diện.",
    },
  },
};

export const buildHsk4SocietyEconomyLongFormPack = (root = process.cwd()) =>
  buildHsk4LongFormDomainPack({
    root,
    ...HSK4_SOCIETY_ECONOMY_LONG_FORM_CONFIG,
    lessonIds: HSK4_SOCIETY_ECONOMY_LESSON_IDS,
    content: CONTENT,
    vietnameseGlossBySequence: VI_GLOSS_BY_SEQUENCE,
    prerequisitePackBundles: [loadHsk4NatureTechnologyLongFormPackBundle(root)],
  });
export const serializeHsk4SocietyEconomyLongFormPack = (
  pack = buildHsk4SocietyEconomyLongFormPack(),
) => serializeHsk4LongFormDomainPack(pack);

const main = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write") && args.has("--check")) throw new Error("Choose one mode");
  const root = process.cwd();
  const path = resolve(root, HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH);
  const serialized = serializeHsk4SocietyEconomyLongFormPack(
    buildHsk4SocietyEconomyLongFormPack(root),
  );
  if (args.has("--write")) {
    writeFileSync(path, serialized, "utf8");
    console.log(`Wrote ${path}`);
  } else if (args.has("--check")) {
    if (readFileSync(path, "utf8") !== serialized) throw new Error(`${path} is stale`);
    console.log(`${HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH} is current`);
  } else process.stdout.write(serialized);
};
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
