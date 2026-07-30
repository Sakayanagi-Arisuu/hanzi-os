import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4LongFormDomainPack,
  serializeHsk4LongFormDomainPack,
} from "./hsk4-long-form-domain-builder.mjs";
import {
  HSK4_NATURE_TECHNOLOGY_DOMAIN_ID,
  HSK4_NATURE_TECHNOLOGY_LESSON_IDS,
  HSK4_NATURE_TECHNOLOGY_LONG_FORM_CONFIG,
  HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH,
} from "../../src/content/hsk4NatureTechnologyLongFormPack.mjs";
import {
  loadHsk4EducationWorkLongFormPackBundle,
} from "../../src/content/hsk4EducationWorkLongFormPack.mjs";

const V = (n) => `hsk-vocab-${String(n).padStart(5, "0")}`;
const VI_GLOSS_BY_SEQUENCE = {
  1014: "bảo vệ", 1061: "vật liệu", 1130: "thiên nhiên",
  1286: "lạnh giá", 1331: "kỹ thuật; công nghệ", 1532: "có thể",
  1710: "cùng với; theo sự", 1810: "hạng mục", 1949: "thực vật",
  1981: "tự nhiên", 1062: "tham quan", 1204: "phong phú",
  1283: "đại dương", 1305: "bảo vệ môi trường", 1354: "kiến nghị",
  1425: "khoa học công nghệ", 1571: "khí hậu", 1744: "thông qua",
  1888: "do; bởi vì", 1959: "loại; trồng", 1350: "giảm nhẹ",
  1387: "sau này", 1426: "khoa học", 1528: "bên trong",
  1561: "phổ biến", 1633: "hơi; một chút", 1670: "có hay không",
  1843: "khói", 1920: "trách nhiệm", 1956: "ít nhất",
  1095: "cửa sổ", 1278: "quy định", 1420: "cách nhìn",
  1635: "hiếm gặp", 1672: "thế kỷ", 1742: "dừng lại",
  1780: "ô nhiễm", 1816: "hiệu quả", 1846: "nghiên cứu",
  1885: "dầu", 1351: "giảm bớt", 1455: "hổ",
  1529: "nội dung", 1601: "toàn cầu", 1671: "phù hợp",
  1847: "nghiên cứu sinh", 1921: "tăng thêm", 1129: "khoảng chừng",
  1388: "chỉ; chỉ có", 1884: "do; bởi", 1032: "tiêu chuẩn",
  1205: "phong cảnh", 1316: "đạt được", 1355: "sông",
  1603: "thiếu", 1676: "thích nghi", 1745: "thông báo",
  1961: "trọng điểm", 1999: "tác dụng", 1246: "mỗi; các",
};
const q = (kind, prompt, options, answer, evidence, rationale, boundary = null) =>
  [kind, prompt, options, answer, evidence, rationale, boundary];
const map = (nodes, relations) => ({ nodes, relations });
const D = HSK4_NATURE_TECHNOLOGY_DOMAIN_ID;
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
        titleHanzi: "高山植物保护站的角色图",
        titleVi: "Bản đồ vai trò tại trạm bảo vệ thực vật núi cao",
        targetVocabularyIds: [V(1014), V(1130), V(1286), V(1949), V(1981)],
        paragraphs: [
          ["北岭保护站研究高山植物怎样适应寒冷。这里的大自然看似无人管理，实际有研究员记录开花时间，护林员检查游客路线，附近居民报告少见变化。三类人观察同一片自然区域，却使用不同知识。",
            "Trạm Bắc Lĩnh nghiên cứu cách thực vật núi cao thích nghi lạnh giá. Thiên nhiên có vẻ không do ai quản, nhưng nhà nghiên cứu ghi mùa hoa, kiểm lâm kiểm tuyến khách, cư dân báo thay đổi hiếm. Ba nhóm quan sát cùng vùng bằng loại tri thức khác nhau."],
          ["研究员每周固定测量，便于比较年份；护林员每天巡路，能够及时发现踩踏；居民不按表记录，却熟悉哪些植物过去常见。保护站把数据、现场行动和长期记忆放在一张角色图上，不把任何一种信息当成全部事实。",
            "Nhà nghiên cứu đo cố định hàng tuần để so các năm; kiểm lâm tuần đường hằng ngày để phát hiện giẫm đạp; cư dân không ghi theo bảng nhưng nhớ loài từng phổ biến. Trạm đặt dữ liệu, hành động hiện trường và ký ức dài hạn vào một bản đồ vai trò, không coi loại nào là toàn bộ."],
          ["去年一种花提早开放时，研究员先确认温度记录，护林员检查路线变化，居民补充过去照片。最后只能说温度与开放时间同时变化，游客影响仍不确定。角色图帮助大家知道谁提供什么证据，也提醒他们不要越过证据范围。",
            "Năm ngoái một loài hoa nở sớm, nhà nghiên cứu kiểm nhiệt độ, kiểm lâm xem tuyến, cư dân bổ sung ảnh cũ. Kết luận chỉ nói nhiệt độ và mùa nở cùng thay đổi, tác động du khách chưa rõ. Bản đồ cho biết ai cung cấp bằng chứng nào và nhắc không vượt phạm vi."],
        ],
        questions: [
          q("main-claim", "Bài đọc làm rõ điều gì?", ["Ba vai trò bổ sung bằng chứng khác nhau cho bảo tồn", "Chỉ nghiên cứu viên có thông tin", "Cư dân quyết định mọi kết luận", "Khách du lịch quản lý trạm"], 0, ["rp1", "rp2", "rp3"], "Ba đoạn phân vai, loại dữ liệu và cách phối hợp."),
          q("supported-detail", "Kiểm lâm đóng góp gì?", ["Kiểm tra tuyến và phát hiện giẫm đạp", "Đo nhiệt độ mỗi tuần", "Viết mọi báo cáo khoa học", "Trồng lại toàn bộ núi"], 0, ["rp1", "rp2"], "Nguồn gắn kiểm lâm với quan sát hiện trường hằng ngày."),
          q("cross-paragraph-evidence", "Những nguồn nào được dùng khi hoa nở sớm?", ["Nhiệt độ, tuyến đường và ảnh cũ", "Chỉ lời kể du khách", "Giá vé và bản đồ xe", "Dự báo thành phố khác"], 0, ["rp2", "rp3"], "Đoạn cuối huy động đúng ba loại bằng chứng đã phân vai."),
          q("bounded-inference", "Có thể suy ra lợi ích của bản đồ vai trò là gì?", ["Làm rõ nguồn và giới hạn của từng kết luận", "Thay thế mọi đo lường", "Chứng minh du khách gây thay đổi", "Loại kiến thức cư dân"], 0, ["rp2", "rp3"], "Bản đồ nối vai trò với bằng chứng và giữ kết luận trong phạm vi.", "Có thể suy ra lợi ích tổ chức bằng chứng, chưa thể suy ra nguyên nhân hoa nở sớm."),
          q("scope-limit", "Kết luận nào vượt nguồn?", ["Nhiệt độ và mùa nở cùng thay đổi", "Du khách chắc chắn là nguyên nhân duy nhất", "Cư dân có ảnh quá khứ", "Kiểm lâm kiểm tuyến"], 1, ["rp3"], "Tác động du khách được ghi là chưa xác định."),
        ],
        noteMap: map([
          ["research", "Nghiên cứu viên", "Đo định kỳ và so theo năm.", ["rp1", "rp2"]],
          ["ranger", "Kiểm lâm", "Theo dõi tuyến và tác động hiện trường.", ["rp1", "rp2"]],
          ["resident", "Cư dân", "Cung cấp ký ức và ảnh dài hạn.", ["rp1", "rp3"]],
          ["event", "Hiện tượng", "Một loài hoa nở sớm.", ["rp3"]],
          ["limit", "Giới hạn", "Chưa xác định tác động du khách.", ["rp3"]],
        ], [["research", "cùng giải thích", "event"], ["ranger", "cùng kiểm tra", "event"], ["resident", "bổ sung bối cảnh cho", "event"], ["limit", "giới hạn cách đọc", "event"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一座低温温室用了哪些技术",
        titleVi: "Nhà kính nhiệt độ thấp dùng những công nghệ nào",
        targetVocabularyIds: [V(1061), V(1331), V(1532), V(1710), V(1810)],
        paragraphs: [
          ["农业学校建了一座低温温室，目标不是把室内变得很热，而是减少夜间热量流失。第一个技术项目更换墙面材料，第二项在屋顶加可移动保温层，第三项使用传感器记录不同位置温度。",
            "Trường nông nghiệp xây nhà kính nhiệt độ thấp, mục tiêu không phải làm thật nóng mà giảm thất thoát nhiệt ban đêm. Hạng mục một thay vật liệu tường, hạng mục hai thêm lớp giữ nhiệt di động trên mái, hạng mục ba dùng cảm biến ghi nhiệt ở các vị trí."],
          ["工程师负责技术设计，教师把数据用于课程，学生能够改变开关时间并观察结果。随着冬季到来，团队发现保温层在无风夜晚作用明显，但大风时墙角仍然很冷。单看平均温度会隐藏这些位置差异。",
            "Kỹ sư thiết kế công nghệ, giáo viên dùng dữ liệu cho môn học, sinh viên đổi giờ đóng mở và quan sát. Khi mùa đông tới, lớp giữ nhiệt hiệu quả rõ vào đêm lặng gió, nhưng góc tường vẫn lạnh khi gió mạnh. Chỉ nhìn nhiệt trung bình sẽ che khác biệt vị trí."],
          ["团队没有说某一种材料解决了全部问题，而是把设计、教学和维护责任分开。下一步将比较不同墙角材料，并保留原传感器作为对照。这个项目说明技术不是一个设备名称，而是材料、测量、操作和角色共同形成的系统。",
            "Nhóm không nói một vật liệu giải mọi vấn đề mà tách trách nhiệm thiết kế, dạy và bảo trì. Bước sau so vật liệu góc tường và giữ cảm biến cũ làm đối chứng. Dự án cho thấy công nghệ không chỉ là tên thiết bị, mà là hệ vật liệu, đo, thao tác và vai trò."],
        ],
        questions: [
          q("main-claim", "Bài nghe định nghĩa hệ thống công nghệ theo cách nào?", ["Sự kết hợp vật liệu, đo lường, vận hành và vai trò", "Chỉ một loại cảm biến", "Chỉ nhiệt độ trung bình", "Một thiết bị không cần người dùng"], 0, ["lp1", "lp2", "lp3"], "Nguồn theo dõi nhiều hạng mục và người tham gia."),
          q("supported-detail", "Điều gì bị nhiệt độ trung bình che khuất?", ["Góc tường lạnh khi gió mạnh", "Tên của học sinh", "Giá vật liệu", "Số lớp học"], 0, ["lp2"], "Đoạn 2 nêu khác biệt vị trí."),
          q("cross-paragraph-evidence", "Cặp chi tiết nào cho thấy đo lường ảnh hưởng thiết kế tiếp?", ["Cảm biến thấy góc lạnh; nhóm sẽ so vật liệu góc", "Mái có lớp phủ; giáo viên có lớp", "Mùa đông tới; sinh viên đến trường", "Tường có vật liệu; nhà kính có cây"], 0, ["lp2", "lp3"], "Phát hiện theo vị trí dẫn tới thử vật liệu mới."),
          q("bounded-inference", "Có thể suy ra vì sao giữ cảm biến cũ làm đối chứng?", ["Để so thay đổi mà vẫn có mốc đo nhất quán", "Để ngừng đo góc tường", "Để thay giáo viên", "Để tăng nhiệt trung bình"], 0, ["lp3"], "Giữ hệ đo giúp so vật liệu qua cùng cơ sở.", "Có thể suy ra mục đích so sánh, chưa biết vật liệu mới sẽ tốt hơn."),
          q("scope-limit", "Nguồn chưa chứng minh điều gì?", ["Lớp giữ nhiệt hữu ích trong một số điều kiện", "Một vật liệu đã giải quyết mọi thất thoát", "Gió tạo khác biệt vị trí", "Sinh viên được thay giờ vận hành"], 1, ["lp2", "lp3"], "Bài chủ động bác claim giải quyết toàn bộ."),
        ],
        noteMap: map([
          ["goal", "Mục tiêu", "Giảm thất thoát nhiệt ban đêm.", ["lp1"]],
          ["components", "Hạng mục", "Tường, mái và cảm biến.", ["lp1"]],
          ["roles", "Vai trò", "Kỹ sư, giáo viên và sinh viên.", ["lp2"]],
          ["finding", "Phát hiện", "Gió làm góc tường lạnh.", ["lp2"]],
          ["next", "Bước tiếp", "So vật liệu góc bằng hệ đo cũ.", ["lp3"]],
        ], [["components", "phục vụ", "goal"], ["roles", "vận hành", "components"], ["finding", "định hình", "next"], ["next", "kiểm tra lại", "goal"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh bản đồ vai trò của trạm bảo tồn và hệ thống nhà kính; nêu loại bằng chứng, trách nhiệm và giới hạn nguyên nhân.",
      requiredElements: ["ba vai trò bảo tồn", "ba nguồn bằng chứng", "hạng mục nhà kính", "vai trò vận hành", "giới hạn kết luận"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "高山保护站把研究员的定期数据、护林员的现场检查和居民的长期记忆放在同一角色图中。花提前开放时，三类证据帮助缩小解释范围，却没有证明游客是原因。低温温室也由材料、传感器和操作组成，工程师设计、教师教学、学生调整；位置数据发现大风时墙角仍冷，推动下一轮材料比较。两份材料都说明技术与保护依靠多角色和多证据，现有观察只能提出条件，不能直接确定唯一原因。",
      modelVi: "Trạm bảo tồn đặt dữ liệu định kỳ của nhà nghiên cứu, kiểm tra hiện trường của kiểm lâm và ký ức dài hạn của cư dân vào cùng bản đồ. Khi hoa nở sớm, ba nguồn thu hẹp cách giải thích nhưng không chứng minh du khách là nguyên nhân. Nhà kính cũng gồm vật liệu, cảm biến và thao tác với kỹ sư, giáo viên, sinh viên; dữ liệu vị trí phát hiện góc lạnh khi gió và dẫn đến so vật liệu. Cả hai phụ thuộc nhiều vai trò/bằng chứng; quan sát hiện có chỉ nêu điều kiện chứ chưa xác định nguyên nhân duy nhất.",
    },
  },
  [ID.process]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "海草恢复的五年过程",
        titleVi: "Quá trình năm năm phục hồi cỏ biển",
        targetVocabularyIds: [V(1283), V(1305), V(1571), V(1888), V(1959)],
        paragraphs: [
          ["海湾曾有丰富的海草，后来由于船只和泥沙增加，覆盖面积下降。环保小组第一年先画海洋底图，没有马上大量种草，因为他们需要知道水流、深度和旧草的位置。气候记录也显示夏季高温年份差异很大。",
            "Vịnh từng có cỏ biển phong phú, sau giảm do tàu và bùn tăng. Năm đầu nhóm môi trường lập bản đồ đáy, chưa trồng nhiều vì cần biết dòng, độ sâu và cỏ cũ. Hồ sơ khí hậu cũng cho thấy mùa hè nóng khác nhiều giữa các năm."],
          ["第二年，他们在三种地点各试种少量海草；第三年保留成活最好的一种方法，并设置无种植区作比较。第四年一次强风破坏了两片试验区，小组调整固定方式，却没有删除失败数据。",
            "Năm hai, họ thử ít cỏ ở ba loại nơi; năm ba giữ cách sống tốt nhất và lập vùng không trồng để so. Năm bốn, gió mạnh phá hai vùng thử; nhóm đổi cách cố định nhưng không xóa dữ liệu thất bại."],
          ["第五年，部分区域覆盖增加，小鱼数量也上升，但另一侧海湾没有明显变化。小组把过程分成测量、试种、比较、受损和调整五段。结果支持局部恢复可行，却不能说明整个海湾已恢复，也不能把鱼增加只归因于海草。",
            "Năm năm, độ phủ tăng ở một số vùng và cá nhỏ cũng tăng, nhưng phía khác không đổi rõ. Nhóm chia quá trình thành đo, thử trồng, so, hư hại và điều chỉnh. Kết quả hỗ trợ phục hồi cục bộ khả thi, chưa nói toàn vịnh hồi phục hay cá tăng chỉ do cỏ."],
        ],
        questions: [
          q("main-claim", "Dòng thời gian thể hiện cách phục hồi nào?", ["Đo trước, thử nhỏ, so sánh rồi điều chỉnh qua thất bại", "Trồng toàn vịnh ngay năm đầu", "Xóa dữ liệu vùng hỏng", "Chỉ đếm cá vào năm cuối"], 0, ["rp1", "rp2", "rp3"], "Năm giai đoạn được mô tả xuyên ba đoạn."),
          q("supported-detail", "Vì sao năm đầu chưa trồng nhiều?", ["Cần lập bản đồ điều kiện và vị trí cũ", "Không có vùng biển", "Không muốn bảo vệ môi trường", "Cá đã quá nhiều"], 0, ["rp1"], "Nhóm cần dữ liệu nền trước thử nghiệm."),
          q("cross-paragraph-evidence", "Điều gì cho thấy thiết kế có so sánh?", ["Có ba nơi thử và vùng không trồng", "Có năm năm và nhiều cá", "Có gió và bùn", "Có tàu và bản đồ"], 0, ["rp1", "rp2"], "Đoạn 2 mô tả thử nhiều nơi và đối chứng."),
          q("bounded-inference", "Có thể suy ra vì sao không xóa dữ liệu thất bại?", ["Để hiểu điều kiện làm phương pháp không bền", "Để chứng minh mọi nơi thành công", "Để tăng số cá trên giấy", "Để bỏ vùng so sánh"], 0, ["rp2", "rp3"], "Thất bại là một mốc dẫn tới điều chỉnh và giới hạn kết luận.", "Có thể suy ra giá trị học từ thất bại, chưa biết cách cố định mới chịu được mọi cơn gió."),
          q("scope-limit", "Claim nào vượt kết quả năm năm?", ["Một số vùng tăng độ phủ", "Toàn bộ vịnh đã phục hồi", "Một phía chưa đổi rõ", "Cá nhỏ tăng ở vùng nhất định"], 1, ["rp3"], "Nguồn giới hạn kết quả ở khu vực."),
        ],
        noteMap: map([
          ["baseline", "Năm 1", "Bản đồ và khí hậu nền.", ["rp1"]],
          ["pilot", "Năm 2", "Thử ít ở ba loại nơi.", ["rp2"]],
          ["comparison", "Năm 3", "Giữ cách tốt và vùng đối chứng.", ["rp2"]],
          ["shock", "Năm 4", "Gió phá vùng thử, đổi cách cố định.", ["rp2"]],
          ["outcome", "Năm 5", "Phục hồi cục bộ, giới hạn toàn vịnh.", ["rp3"]],
        ], [["baseline", "định hình", "pilot"], ["pilot", "tạo ra", "comparison"], ["shock", "sửa", "comparison"], ["comparison", "hỗ trợ đọc", "outcome"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一条自然步道怎样使用科技",
        titleVi: "Một đường mòn thiên nhiên dùng công nghệ như thế nào",
        targetVocabularyIds: [V(1062), V(1204), V(1354), V(1425), V(1744)],
        paragraphs: [
          ["森林公园为了让参观更丰富，在步道放置二维码。游客通过手机看到动物声音和季节图片。第一阶段只看扫描次数，管理方认为次数高就代表科技项目成功，却没有记录游客是否停留或理解内容。",
            "Công viên rừng đặt mã QR để chuyến tham quan phong phú hơn; khách xem âm thanh động vật và ảnh mùa qua điện thoại. Giai đoạn đầu chỉ xem lượt quét, quản lý coi cao là thành công nhưng không ghi thời gian dừng hay mức hiểu."],
          ["第二阶段接受教师建议，在三个点增加短问题，并保留没有问题的两个点。结果显示，有问题的点停留更久，但山顶手机信号弱，扫描少并不一定表示内容差。公园于是把部分内容下载到入口设备。",
            "Giai đoạn hai nhận kiến nghị giáo viên, thêm câu ngắn ở ba điểm và giữ hai điểm không câu. Điểm có câu được dừng lâu hơn, nhưng đỉnh núi tín hiệu yếu nên ít quét không hẳn nội dung kém. Công viên tải một phần nội dung ở thiết bị lối vào."],
          ["第三阶段将扫描、停留、问题回答和纸质观察表结合。项目发现，科技便于提供声音，却不能代替观察真实环境；无信号版本也改善了山顶使用。公园仍要在不同季节测试，当前结果只适用于这条步道。",
            "Giai đoạn ba kết hợp lượt quét, thời gian dừng, trả lời và phiếu quan sát. Công nghệ tiện cung cấp âm thanh nhưng không thay quan sát thật; bản không cần tín hiệu cải thiện dùng ở đỉnh. Công viên vẫn cần thử theo mùa; kết quả chỉ cho đường này."],
        ],
        questions: [
          q("main-claim", "Quá trình đánh giá công nghệ thay đổi ra sao?", ["Từ một chỉ số sang nhiều chỉ số và bản dùng khi mất tín hiệu", "Từ nhiều dữ liệu sang chỉ lượt quét", "Từ đường mòn sang lớp học kín", "Từ quan sát thật sang cấm nhìn rừng"], 0, ["lp1", "lp2", "lp3"], "Ba giai đoạn mở rộng đo và sửa điều kiện truy cập."),
          q("supported-detail", "Vì sao ít quét ở đỉnh chưa chắc là nội dung kém?", ["Tín hiệu điện thoại yếu", "Không có khách tham quan", "Ảnh sai mùa", "Đường mòn đóng cửa"], 0, ["lp2"], "Đoạn 2 nêu biến hạ tầng."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy lượt quét không đủ?", ["Không đo hiểu và bị tín hiệu ảnh hưởng", "Mã nằm trên đường", "Có ảnh mùa và âm thanh", "Giáo viên đưa kiến nghị"], 0, ["lp1", "lp2"], "Hai đoạn nêu thiếu đo lường và nhiễu."),
          q("bounded-inference", "Có thể suy ra vai trò của điểm không có câu hỏi?", ["Làm mốc so tác động câu hỏi", "Thay toàn bộ nội dung", "Tăng tín hiệu núi", "Đếm số cây"], 0, ["lp2"], "Giữ điểm không câu giúp so thời gian dừng.", "Có thể suy ra mục đích so sánh, chưa thể kết luận câu hỏi cải thiện học tập dài hạn."),
          q("scope-limit", "Kết luận nào phù hợp nhất?", ["Thiết kế mới hữu ích trên đường này nhưng cần thử mùa khác", "Mọi công viên phải dùng cùng QR", "Công nghệ thay hoàn toàn thiên nhiên", "Lượt quét luôn đo hiểu biết"], 0, ["lp3"], "Đoạn cuối ghi rõ phạm vi và bước thử."),
        ],
        noteMap: map([
          ["phase1", "Giai đoạn 1", "QR và chỉ số lượt quét.", ["lp1"]],
          ["gap", "Khoảng trống", "Không đo dừng/hiểu, tín hiệu yếu.", ["lp1", "lp2"]],
          ["phase2", "Giai đoạn 2", "Câu hỏi và điểm so sánh.", ["lp2"]],
          ["access", "Điều chỉnh truy cập", "Nội dung tải ở lối vào.", ["lp2"]],
          ["phase3", "Giai đoạn 3", "Nhiều chỉ số và giới hạn theo mùa.", ["lp3"]],
        ], [["phase1", "bộc lộ", "gap"], ["gap", "dẫn tới", "phase2"], ["gap", "dẫn tới", "access"], ["phase2", "được mở rộng thành", "phase3"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán dựng hai tiến trình thử–so–sửa của phục hồi cỏ biển và đường mòn số; nêu mốc thất bại, dữ liệu và giới hạn.",
      requiredElements: ["baseline cỏ biển", "thử/đối chứng", "gió và kết quả cục bộ", "ba giai đoạn QR", "giới hạn địa điểm/mùa"],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi: "海草项目先画底图，再小范围试种并保留无种植区；强风破坏试验后，团队调整固定方法，第五年只报告局部覆盖增加。步道科技最初只看扫描次数，后来加入问题、比较点和无信号内容，最后同时分析停留与回答。两个过程都通过小规模比较和失败数据修改设计，也都限制结论：海湾另一侧没有明显变化，步道还未跨季节测试，因此不能宣布全面恢复或普遍有效。",
      modelVi: "Dự án cỏ biển lập bản đồ, thử nhỏ và giữ vùng không trồng; sau khi gió phá, nhóm đổi cách cố định và năm năm chỉ báo tăng cục bộ. Công nghệ đường mòn ban đầu chỉ xem lượt quét, sau thêm câu hỏi, điểm so, nội dung không tín hiệu và cuối cùng phân tích dừng/trả lời. Cả hai sửa thiết kế nhờ so nhỏ và dữ liệu thất bại, đồng thời giới hạn claim: phía khác vịnh không đổi, đường mòn chưa thử qua mùa nên chưa thể nói hồi phục toàn diện hay hiệu quả phổ quát.",
    },
  },
  [ID.cause]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "厨房烟为什么进入教室",
        titleVi: "Vì sao khói bếp đi vào lớp học",
        targetVocabularyIds: [V(1350), V(1528), V(1561), V(1843), V(1920)],
        paragraphs: [
          ["学校食堂旁的教室普遍在中午闻到烟。最初大家认为厨师开火太大，但检查发现厨房内的排风机工作正常。问题在刮南风时更明显，烟从屋顶出口吹回走廊，再通过开着的窗进入教室。",
            "Lớp cạnh bếp trường thường ngửi khói trưa. Ban đầu mọi người nghĩ lửa quá lớn, nhưng kiểm tra thấy quạt hút trong bếp bình thường. Vấn đề rõ khi gió nam thổi khói từ cửa xả mái về hành lang rồi qua cửa sổ mở vào lớp."],
          ["学校采取三项措施：把出口加高、午餐高峰关闭走廊一侧窗户，并在教室放传感器。烟味报告明显减少，但关闭窗户也使二氧化碳稍微增加。后勤部门因此承担调整通风时间的责任，而不是只要求厨房减少做饭。",
            "Trường nâng cửa xả, đóng cửa sổ hành lang lúc cao điểm và đặt cảm biến. Báo mùi giảm rõ nhưng đóng cửa làm CO2 hơi tăng. Hậu cần chịu trách nhiệm chỉnh giờ thông gió, không chỉ yêu cầu bếp nấu ít."],
          ["一个月数据支持风向和建筑路径共同影响烟进入，却不能证明所有气味都来自食堂。学校今后会在无做饭时也测量，并比较其他风向。措施减轻了当前问题，但新条件带来通风权衡，需要继续负责监测。",
            "Dữ liệu tháng hỗ trợ gió và đường tòa nhà cùng ảnh hưởng khói, chưa chứng minh mọi mùi từ bếp. Trường sẽ đo cả khi không nấu và so hướng gió khác. Biện pháp giảm vấn đề hiện tại nhưng tạo đánh đổi thông gió, cần tiếp tục theo dõi."],
        ],
        questions: [
          q("main-claim", "Bài đọc giải thích nguyên nhân theo cách nào?", ["Kết hợp nguồn khói, hướng gió và đường đi trong tòa nhà", "Chỉ do đầu bếp", "Chỉ do cảm biến", "Không liên quan thông gió"], 0, ["rp1", "rp2", "rp3"], "Nguồn sửa giả thuyết đơn bằng nhiều điều kiện."),
          q("supported-detail", "Tác dụng phụ của đóng cửa sổ là gì?", ["CO2 tăng nhẹ", "Khói tăng gấp đôi", "Bếp ngừng hoạt động", "Cảm biến hỏng"], 0, ["rp2"], "Đoạn 2 nêu đánh đổi trực tiếp."),
          q("cross-paragraph-evidence", "Bằng chứng nào làm yếu giả thuyết 'lửa quá lớn'?", ["Quạt bình thường và vấn đề thay theo gió", "Bếp nấu bữa trưa", "Có lớp cạnh bếp", "Có mùi trong hành lang"], 0, ["rp1", "rp3"], "Hai chi tiết chỉ về điều kiện vận chuyển khói."),
          q("bounded-inference", "Có thể suy ra vì sao đo lúc không nấu?", ["Kiểm tra có nguồn mùi khác ngoài bếp", "Tăng mùi trong lớp", "Bỏ đo gió", "Chứng minh mọi mùi từ bếp"], 0, ["rp3"], "Đo không nấu tạo điều kiện kiểm tra nguồn thay thế.", "Có thể suy ra mục đích kiểm tra, chưa có kết quả về nguồn khác."),
          q("scope-limit", "Kết luận nào vượt dữ liệu?", ["Biện pháp giảm báo mùi trong tháng", "Mọi mùi ở trường đều do bếp", "Đóng cửa ảnh hưởng CO2", "Gió nam liên quan vấn đề"], 1, ["rp2", "rp3"], "Nguồn chủ động để mở khả năng nguồn khác."),
        ],
        noteMap: map([
          ["observation", "Quan sát", "Mùi khói trưa ở lớp cạnh bếp.", ["rp1"]],
          ["rejected", "Giả thuyết yếu", "Chỉ do lửa lớn.", ["rp1"]],
          ["path", "Đường nguyên nhân", "Gió–cửa xả–hành lang–cửa sổ.", ["rp1"]],
          ["intervention", "Can thiệp", "Nâng xả, đóng cửa, cảm biến.", ["rp2"]],
          ["tradeoff", "Đánh đổi", "Mùi giảm nhưng CO2 tăng.", ["rp2", "rp3"]],
        ], [["rejected", "được thay bởi", "path"], ["path", "định hình", "intervention"], ["intervention", "tạo ra", "tradeoff"], ["tradeoff", "cần theo dõi từ", "observation"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "城市降温计划的条件",
        titleVi: "Các điều kiện của kế hoạch giảm nóng đô thị",
        targetVocabularyIds: [V(1387), V(1426), V(1633), V(1670), V(1956)],
        paragraphs: [
          ["城市科学小组发现，夏夜市中心温度至少比郊外高两度。他们讨论是否多种树，但卫星图显示最热地点既缺树，也有大量深色屋顶。仅增加一种措施可能稍微降温，却未必解决不同街区的问题。",
            "Nhóm khoa học thành phố thấy đêm hè trung tâm nóng hơn ngoại ô ít nhất hai độ. Họ bàn có trồng thêm cây không, nhưng ảnh vệ tinh cho thấy điểm nóng vừa thiếu cây vừa nhiều mái tối. Chỉ thêm một biện pháp có thể giảm chút nhưng chưa chắc giải mọi khu."],
          ["计划选择四个街区：两个增加树荫，一个把屋顶改成浅色，一个同时使用两种办法。所有地点都保留温度和用电记录，并询问居民是否真正使用新的阴凉空间。科学小组强调，温度下降和生活改善不是完全相同的结果。",
            "Kế hoạch chọn bốn khu: hai tăng bóng cây, một đổi mái sáng, một dùng cả hai. Mọi nơi giữ nhiệt và điện, hỏi cư dân có dùng bóng mát mới không. Nhóm nhấn giảm nhiệt và cải thiện đời sống không hoàn toàn cùng kết quả."],
          ["今后两年将比较季节、成本和维护。树需要时间成长，浅色屋顶效果较快却要定期重做；低收入街区还需要公共空间而不只是私人屋顶。当前计划是比较条件的试验，不是宣布某种办法在全市普遍最好。",
            "Hai năm tới sẽ so mùa, chi phí và bảo trì. Cây cần lớn; mái sáng tác dụng nhanh nhưng phải làm lại; khu thu nhập thấp cần không gian công chứ không chỉ mái tư. Kế hoạch là thử so điều kiện, không tuyên bố một cách tốt nhất toàn thành phố."],
        ],
        questions: [
          q("main-claim", "Kế hoạch giảm nóng được thiết kế để làm gì?", ["So biện pháp dưới nhiều điều kiện và nhiều loại kết quả", "Chỉ trồng cây toàn thành phố", "Chỉ đo ảnh vệ tinh", "Bỏ dữ liệu điện"], 0, ["lp1", "lp2", "lp3"], "Ba đoạn nêu vấn đề đa nguyên nhân, nhóm thử và thời gian."),
          q("supported-detail", "Vì sao phải hỏi cư dân về bóng mát?", ["Giảm nhiệt chưa chắc đồng nghĩa không gian được sử dụng", "Để thay đo nhiệt", "Để chọn màu mái", "Để biết tên mọi người"], 0, ["lp2"], "Nguồn tách kết quả vật lý và trải nghiệm."),
          q("cross-paragraph-evidence", "Hai biện pháp khác nhau ở điểm thời gian nào?", ["Cây lớn chậm; mái sáng tác dụng nhanh hơn", "Cả hai luôn có tốc độ giống nhau", "Mái không cần bảo trì", "Cây chỉ dùng mùa đông"], 0, ["lp2", "lp3"], "Đoạn cuối nêu tiến độ và bảo trì khác."),
          q("bounded-inference", "Có thể suy ra vì sao một khu dùng cả hai biện pháp?", ["Để quan sát khả năng kết hợp thay vì chỉ tác động riêng", "Để bỏ nhóm so", "Để tăng nhiệt", "Để tránh hỏi cư dân"], 0, ["lp1", "lp2"], "Thiết kế có nhóm riêng và nhóm kết hợp cho so sánh.", "Có thể suy ra mục tiêu thử kết hợp, chưa biết hiệu quả cộng thêm."),
          q("scope-limit", "Nguồn không cho phép nói điều gì?", ["Các điểm nóng có hơn một đặc điểm", "Một biện pháp đã được chứng minh tốt nhất toàn thành phố", "Cần theo dõi hai năm", "Bảo trì khác theo giải pháp"], 1, ["lp3"], "Kế hoạch chưa có kết quả và giới hạn claim."),
        ],
        noteMap: map([
          ["problem", "Vấn đề", "Đêm trung tâm nóng hơn.", ["lp1"]],
          ["conditions", "Điều kiện", "Thiếu cây và mái tối.", ["lp1"]],
          ["design", "Thiết kế", "Nhóm cây, mái và kết hợp.", ["lp2"]],
          ["outcomes", "Kết quả", "Nhiệt, điện và sử dụng thực.", ["lp2"]],
          ["time", "Thời gian/chi phí", "Hai năm, tăng trưởng và bảo trì.", ["lp3"]],
        ], [["conditions", "góp vào", "problem"], ["design", "kiểm tra", "conditions"], ["outcomes", "đánh giá", "design"], ["time", "giới hạn", "outcomes"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán phân tích nguyên nhân, điều kiện, can thiệp và đánh đổi trong vấn đề khói trường học và nóng đô thị.",
      requiredElements: ["đường đi của khói", "can thiệp và CO2", "nhiều đặc điểm điểm nóng", "nhóm biện pháp", "giới hạn nguyên nhân/kết quả"],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi: "教室烟味不只是火大造成，南风把屋顶出口的烟吹回走廊，再通过窗户进入。加高出口和关闭窗户减少报告，却使二氧化碳稍增，因此还要测无做饭时和其他风向。城市高温也同时与缺树和深色屋顶有关，试验分别比较树荫、浅色屋顶和组合，并观察温度、用电与空间使用。两项计划都承认多原因和措施代价，短期变化不能证明唯一原因或全市普遍效果。",
      modelVi: "Mùi khói lớp không chỉ do lửa lớn; gió nam đưa khói cửa xả mái về hành lang rồi qua cửa sổ. Nâng xả và đóng cửa giảm báo mùi nhưng làm CO2 tăng nhẹ, nên còn phải đo lúc không nấu và hướng gió khác. Nóng đô thị cũng liên quan thiếu cây lẫn mái tối; thử nghiệm so bóng cây, mái sáng, kết hợp và theo dõi nhiệt, điện, sử dụng. Cả hai thừa nhận nhiều nguyên nhân và chi phí can thiệp; thay đổi ngắn hạn chưa chứng minh nguyên nhân duy nhất hay hiệu quả phổ quát.",
    },
  },
  [ID.compare]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "两扇节能窗的不同效果",
        titleVi: "Hiệu quả khác nhau của hai loại cửa sổ tiết kiệm năng lượng",
        targetVocabularyIds: [V(1095), V(1278), V(1420), V(1816), V(1846)],
        paragraphs: [
          ["研究小组在两栋相同年代的楼安装节能窗。一栋按规定使用双层玻璃，另一栋使用可自动遮阳的窗。居民看法不同：有人重视冬季保温，有人更关心夏季阳光和室内亮度。",
            "Nhóm nghiên cứu lắp cửa tiết kiệm ở hai tòa cùng tuổi. Một dùng kính hai lớp theo quy định, một dùng che nắng tự động. Cư dân khác quan điểm: người coi trọng giữ ấm đông, người quan tâm nắng hè và ánh sáng."],
          ["冬季数据中，双层窗减少热量流失的效果稳定；自动遮阳窗在晴天也不错，但阴天差异小。夏季时，遮阳窗使下午温度下降更多，却有居民觉得房间变暗。两种窗都有效，只是指标和季节不同。",
            "Dữ liệu đông: kính hai lớp giảm thất thoát ổn định; che tự động tốt ngày nắng nhưng ít khác ngày âm. Mùa hè, che làm chiều mát hơn nhưng có cư dân thấy tối. Cả hai hiệu quả theo chỉ số và mùa khác."],
          ["小组没有用全年平均数决定唯一优胜者，而是分别报告能耗、温度、亮度和满意度。下一步还要比较维护费用。研究说明“效果好”必须说明针对什么目标和条件，否则同一个结论会隐藏重要差异。",
            "Nhóm không dùng trung bình năm chọn một người thắng, mà báo năng lượng, nhiệt, sáng, hài lòng riêng. Bước sau so chi phí bảo trì. Nghiên cứu cho thấy “hiệu quả tốt” phải nói mục tiêu/điều kiện, nếu không kết luận che khác biệt quan trọng."],
        ],
        questions: [
          q("main-claim", "Bài đọc dùng hai cửa sổ để chỉ ra điều gì?", ["Hiệu quả phụ thuộc mục tiêu, mùa và chỉ số", "Một loại luôn tốt hơn", "Cư dân không quan tâm ánh sáng", "Quy định cấm kính hai lớp"], 0, ["rp1", "rp2", "rp3"], "Nguồn đối chiếu kết quả theo điều kiện."),
          q("supported-detail", "Nhược điểm được cư dân nêu về che tự động là gì?", ["Phòng có thể tối hơn", "Mất nhiệt đông nhiều hơn chắc chắn", "Không hoạt động ngày nắng", "Không có cửa"], 0, ["rp2"], "Đoạn 2 nêu cảm nhận ánh sáng."),
          q("cross-paragraph-evidence", "Vì sao không dùng một trung bình để chọn?", ["Mùa và chỉ số cho kết quả khác", "Hai tòa khác thế kỷ", "Không có dữ liệu nhiệt", "Cư dân không trả lời"], 0, ["rp2", "rp3"], "Nhiều kết quả cần báo riêng."),
          q("bounded-inference", "Có thể suy ra vai trò của chi phí bảo trì trong bước sau?", ["Bổ sung một tiêu chí chưa có vào đánh giá", "Thay mọi chỉ số hiệu quả", "Chứng minh một cửa thắng", "Bỏ ý kiến cư dân"], 0, ["rp3"], "Chi phí là chiều đánh giá còn thiếu.", "Có thể suy ra mục tiêu mở rộng so sánh, chưa biết loại nào rẻ hơn."),
          q("scope-limit", "Claim nào quá rộng?", ["Kính hai lớp ổn định trong dữ liệu đông", "Che tự động tốt hơn mọi mặt quanh năm", "Che giảm nhiệt chiều hè nhiều hơn", "Cần nói rõ mục tiêu"], 1, ["rp2", "rp3"], "Bằng chứng có lợi ích và đánh đổi."),
        ],
        noteMap: map([
          ["double", "Kính hai lớp", "Giữ nhiệt đông ổn định.", ["rp1", "rp2"]],
          ["shade", "Che tự động", "Giảm nóng hè nhưng có thể tối.", ["rp1", "rp2"]],
          ["metrics", "Chỉ số", "Năng lượng, nhiệt, sáng, hài lòng.", ["rp3"]],
          ["conditions", "Điều kiện", "Mùa và thời tiết.", ["rp2"]],
          ["next", "Thiếu", "Chi phí bảo trì.", ["rp3"]],
        ], [["conditions", "làm thay đổi", "double"], ["conditions", "làm thay đổi", "shade"], ["metrics", "so sánh", "double"], ["next", "bổ sung đánh giá", "metrics"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "停止用油之后，污染下降了吗",
        titleVi: "Sau khi ngừng dùng dầu, ô nhiễm có giảm không",
        targetVocabularyIds: [V(1635), V(1672), V(1742), V(1780), V(1885)],
        paragraphs: [
          ["一座工厂从上世纪起使用燃料油。去年停止用油，改成电加热。附近监测站发现黑烟变得少见，某种空气污染下降三成，于是有人说能源更换解决了全部环境问题。",
            "Một nhà máy dùng dầu từ thế kỷ trước. Năm ngoái ngừng dầu, chuyển điện. Trạm gần đó thấy khói đen hiếm và một chất ô nhiễm giảm ba phần mười, nên có người nói đổi năng lượng giải mọi vấn đề."],
          ["进一步比较显示，工厂本地排放确实下降，但用电在高峰期来自远处燃煤电站；同时生产量也减少了一成。若只看厂门口，效果明显；若计算整个电力来源和生产变化，解释就更复杂。",
            "So thêm cho thấy phát thải tại chỗ giảm, nhưng điện cao điểm từ nhà máy than xa; sản lượng cũng giảm một phần mười. Chỉ nhìn cổng thì hiệu quả rõ, tính nguồn điện và sản lượng thì phức tạp."],
          ["研究人员提出两种口径：本地空气质量和全系统排放。前者已有改善证据，后者仍需电力数据。停止用油是重要变化，却不能单独回答全球或全地区污染是否下降。报告将同时保留两种结果。",
            "Nhà nghiên cứu dùng hai phạm vi: chất lượng không khí địa phương và phát thải toàn hệ. Cái đầu có bằng chứng cải thiện, cái sau cần dữ liệu điện. Ngừng dầu quan trọng nhưng không tự trả lời ô nhiễm toàn vùng/toàn cầu; báo cáo giữ cả hai."],
        ],
        questions: [
          q("main-claim", "Bài nghe phân biệt hai phạm vi nào?", ["Ô nhiễm địa phương và phát thải toàn hệ thống", "Mùa đông và mùa hè", "Công nhân và cư dân", "Dầu và nước"], 0, ["lp1", "lp2", "lp3"], "Nguồn sửa claim toàn bộ bằng hai phạm vi."),
          q("supported-detail", "Yếu tố nào ngoài đổi nhiên liệu cũng thay đổi?", ["Sản lượng giảm một phần mười", "Nhà máy chuyển địa điểm", "Trạm ngừng đo", "Không còn dùng điện"], 0, ["lp2"], "Đây là biến cạnh tranh."),
          q("cross-paragraph-evidence", "Bằng chứng nào hỗ trợ cải thiện địa phương nhưng chưa đủ cho toàn hệ?", ["Khói đen ít và chất ô nhiễm gần nhà máy giảm", "Điện đến từ xa", "Nhà máy tồn tại lâu", "Báo cáo có hai mục"], 0, ["lp1", "lp3"], "Đo địa phương hỗ trợ claim hẹp."),
          q("bounded-inference", "Có thể suy ra vì sao cần dữ liệu nguồn điện?", ["Để tính phát thải chuyển ra ngoài địa điểm", "Để tăng sản lượng", "Để đo khói tại cổng", "Để quay lại dùng dầu"], 0, ["lp2", "lp3"], "Điện xa có thể mang phát thải ngoài phạm vi đo gần.", "Có thể suy ra mục tiêu tính toàn hệ, chưa biết tổng phát thải tăng hay giảm."),
          q("scope-limit", "Kết luận nào được phép?", ["Không khí gần nhà máy có dấu hiệu cải thiện", "Mọi ô nhiễm toàn cầu đã được giải quyết", "Điện không có phát thải", "Sản lượng không thay đổi"], 0, ["lp1", "lp3"], "Claim hẹp có dữ liệu, claim rộng còn thiếu."),
        ],
        noteMap: map([
          ["change", "Thay đổi", "Dầu sang điện.", ["lp1"]],
          ["local", "Kết quả địa phương", "Khói hiếm và một chất giảm.", ["lp1"]],
          ["confound", "Biến khác", "Sản lượng giảm.", ["lp2"]],
          ["upstream", "Nguồn ngoài", "Điện than ở xa.", ["lp2"]],
          ["scopes", "Hai phạm vi", "Địa phương và toàn hệ.", ["lp3"]],
        ], [["change", "đi trước", "local"], ["confound", "làm phức tạp", "local"], ["upstream", "được tính trong", "scopes"], ["scopes", "giới hạn cách hiểu", "local"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh cách phạm vi và chỉ số làm thay đổi kết luận về cửa sổ tiết kiệm và chuyển từ dầu sang điện.",
      requiredElements: ["hai loại cửa", "mùa/chỉ số/đánh đổi", "đổi dầu sang điện", "phạm vi địa phương/toàn hệ", "dữ liệu còn thiếu"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "双层窗在冬季保温较稳定，自动遮阳窗在夏季降温更多，却可能降低亮度；如果只用全年平均数，就会隐藏季节、目标和满意度差异。工厂停止用油后，厂门口黑烟和一种污染下降，但生产量也变少，电力还可能来自远处燃煤电站。两份材料都表明范围决定结论：局部指标可以支持局部改善，不能自动扩大为全年最佳或全系统减排；维护费用和电力来源仍需补充。",
      modelVi: "Kính hai lớp giữ nhiệt đông ổn định, che tự động giảm nóng hè nhiều hơn nhưng có thể giảm sáng; trung bình năm sẽ che mùa, mục tiêu, hài lòng. Sau khi ngừng dầu, khói và một chất tại cổng giảm nhưng sản lượng cũng giảm, điện có thể từ than xa. Hai nguồn cho thấy phạm vi quyết định kết luận: chỉ số cục bộ hỗ trợ cải thiện cục bộ, không tự mở rộng thành tốt nhất quanh năm hay giảm phát thải toàn hệ; chi phí bảo trì và nguồn điện còn thiếu.",
    },
  },
  [ID.evidence]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "全球老虎数量增加了吗",
        titleVi: "Số lượng hổ toàn cầu có tăng không",
        targetVocabularyIds: [V(1129), V(1455), V(1601), V(1921), V(1884)],
        paragraphs: [
          ["一篇科普内容写道，某地区相机记录到的老虎大约增加二成，因此“全球老虎正在恢复”。这个数字由保护区的相机照片计算，照片次数增加是事实，但它首先说明该区域被记录到的活动增加。",
            "Một bài phổ biến nói ảnh camera hổ ở một vùng tăng khoảng hai phần mười nên “hổ toàn cầu hồi phục”. Số từ ảnh khu bảo tồn; lượt ảnh tăng là thật nhưng trước hết chỉ nói hoạt động được ghi ở vùng đó tăng."],
          ["研究生检查方法后发现，相机数量也增加，位置更靠近水源。团队用相同相机和位置重新计算，增长变成约一成。附近另一保护区没有同样变化。证据仍支持本区可能有改善，却不支持直接扩大到全球。",
            "Nghiên cứu sinh thấy số camera tăng và đặt gần nước hơn. Tính lại cùng camera/vị trí, tăng còn khoảng một phần mười. Khu bên không có thay đổi giống. Bằng chứng vẫn hỗ trợ vùng này có thể cải thiện, không mở ra toàn cầu."],
          ["编辑把标题改成“一个保护区记录到更多老虎活动”，并说明照片不能区分个体时会重复计算。今后还要结合足迹、遗传样本和相邻地区数据。修正没有否定保护成果，而是让结论与测量范围一致。",
            "Biên tập đổi tiêu đề thành “một khu ghi nhiều hoạt động hổ hơn”, nói ảnh có thể đếm lặp khi không phân cá thể. Sau cần dấu chân, gen và vùng lân cận. Sửa không phủ nhận bảo tồn mà làm claim khớp phạm vi đo."],
        ],
        questions: [
          q("main-claim", "Bài đọc sửa claim ban đầu theo hướng nào?", ["Từ toàn cầu sang hoạt động ghi nhận tại một khu", "Từ một khu sang mọi loài", "Từ camera sang không cần dữ liệu", "Từ tăng sang tuyệt chủng"], 0, ["rp1", "rp2", "rp3"], "Nguồn thu hẹp phạm vi và nêu lỗi đo."),
          q("supported-detail", "Điều gì làm con số đầu khó so?", ["Số và vị trí camera thay đổi", "Không có ảnh nào", "Hổ không xuất hiện", "Bài không có tiêu đề"], 0, ["rp2"], "Thiết bị đo thay đổi cùng kết quả."),
          q("cross-paragraph-evidence", "Bằng chứng nào chống mở rộng toàn cầu?", ["Khu lân cận không đổi và mẫu chỉ một khu", "Có nhiều ảnh hơn", "Tiêu đề do biên tập viết", "Có nước trong khu"], 0, ["rp1", "rp2"], "Phạm vi và khác biệt khu bên hạn chế claim."),
          q("bounded-inference", "Có thể suy ra vì sao cần mẫu di truyền?", ["Giúp phân biệt cá thể và giảm đếm lặp", "Thay mọi camera", "Chứng minh tăng toàn cầu", "Đo lượng nước"], 0, ["rp3"], "Nguồn nêu ảnh có thể lặp cá thể rồi đề xuất gen.", "Có thể suy ra mục đích nhận diện tốt hơn, chưa biết kết quả quần thể."),
          q("scope-limit", "Kết luận hợp lý nhất là gì?", ["Một khu ghi hoạt động hổ nhiều hơn sau chuẩn hóa", "Hổ toàn cầu chắc chắn tăng hai phần mười", "Mọi khu đều cải thiện", "Camera đếm chính xác từng cá thể"], 0, ["rp2", "rp3"], "Claim được thu hẹp đúng dữ liệu."),
        ],
        noteMap: map([
          ["claim", "Claim đầu", "Hổ toàn cầu phục hồi.", ["rp1"]],
          ["data", "Dữ liệu", "Ảnh tăng ở một khu.", ["rp1"]],
          ["measurement", "Thay đổi đo", "Số/vị trí camera đổi.", ["rp2"]],
          ["counter", "Đối chứng địa lý", "Khu bên không đổi.", ["rp2"]],
          ["revision", "Claim sửa", "Hoạt động ghi nhận tăng tại một khu.", ["rp3"]],
        ], [["data", "được dùng cho", "claim"], ["measurement", "làm yếu", "data"], ["counter", "giới hạn", "claim"], ["revision", "thay thế", "claim"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "减少一次性杯子的研究",
        titleVi: "Nghiên cứu giảm cốc dùng một lần",
        targetVocabularyIds: [V(1351), V(1388), V(1529), V(1671), V(1847)],
        paragraphs: [
          ["研究生小组测试三种提示内容是否适合减少一次性杯子。第一家餐厅仅放“请保护环境”，第二家说明每个杯子的废物量，第三家给自带杯者小额优惠。四周后，第三家一次性杯子使用下降最多。",
            "Nhóm nghiên cứu sinh thử ba nội dung nhắc giảm cốc một lần. Quán một chỉ ghi “hãy bảo vệ môi trường”, quán hai nêu lượng rác mỗi cốc, quán ba giảm nhẹ giá cho người mang cốc. Bốn tuần, quán ba giảm dùng nhiều nhất."],
          ["若直接比较，优惠似乎最有效；但是第三家本来就有更多固定顾客，天气也更凉，外带饮料减少。小组随后按每天顾客数计算，并查看试验前四周。调整后差异仍存在，但幅度变小。",
            "So trực tiếp, ưu đãi có vẻ tốt nhất; nhưng quán ba vốn nhiều khách cố định, thời tiết mát hơn và đồ mang đi giảm. Nhóm tính theo số khách/ngày và xem bốn tuần trước. Sau chỉnh, khác biệt còn nhưng nhỏ hơn."],
          ["报告内容写成“在本次条件下，优惠与较大下降相关”，而不是“优惠必然导致减少”。下一步将在同一家餐厅轮换三种提示，避免地点差异。研究支持继续试验，却还不适合给所有餐厅统一结论。",
            "Báo cáo viết “trong điều kiện lần này, ưu đãi liên quan mức giảm lớn hơn”, không viết “ưu đãi tất yếu gây giảm”. Bước sau luân phiên ba nhắc trong cùng quán để tránh khác địa điểm. Nghiên cứu hỗ trợ thử tiếp, chưa hợp kết luận chung mọi quán."],
        ],
        questions: [
          q("main-claim", "Bài nghe đánh giá hiệu quả lời nhắc như thế nào?", ["Ghi nhận liên hệ nhưng kiểm tra yếu tố gây nhiễu và giới hạn nhân quả", "Khẳng định ưu đãi luôn thắng", "Không dùng dữ liệu trước", "Chỉ hỏi ý kiến khách"], 0, ["lp1", "lp2", "lp3"], "Nguồn đi từ kết quả thô đến điều chỉnh và claim hẹp."),
          q("supported-detail", "Yếu tố nào khác giữa quán ba?", ["Nhiều khách cố định và thời tiết mát", "Không bán đồ uống", "Không có lời nhắc", "Chỉ mở một ngày"], 0, ["lp2"], "Đây là các giải thích cạnh tranh."),
          q("cross-paragraph-evidence", "Điều gì làm mức khác biệt nhỏ đi?", ["Chuẩn hóa theo khách và so giai đoạn trước", "Đổi nội dung báo cáo", "Tăng ưu đãi", "Bỏ quán một"], 0, ["lp2", "lp3"], "Điều chỉnh phân tích làm claim thận trọng hơn."),
          q("bounded-inference", "Có thể suy ra lợi ích luân phiên trong cùng quán?", ["Giảm khác biệt cố hữu giữa địa điểm", "Loại mọi tác động thời gian", "Bảo đảm nhân quả tuyệt đối", "Không cần số khách"], 0, ["lp2", "lp3"], "Cùng địa điểm kiểm soát một nguồn khác biệt.", "Có thể suy ra giảm nhiễu địa điểm, nhưng vẫn cần xem mùa và thứ tự."),
          q("scope-limit", "Câu nào phản ánh đúng báo cáo?", ["Ưu đãi liên quan mức giảm lớn hơn trong điều kiện thử", "Ưu đãi tất yếu giảm cốc ở mọi quán", "Lời nhắc chung không có tác dụng ở đâu", "Khách cố định là nguyên nhân duy nhất"], 0, ["lp3"], "Báo cáo dùng ngôn ngữ liên hệ và phạm vi."),
        ],
        noteMap: map([
          ["design", "Thiết kế đầu", "Ba thông điệp ở ba quán.", ["lp1"]],
          ["raw", "Kết quả thô", "Quán ưu đãi giảm nhiều nhất.", ["lp1"]],
          ["confounds", "Nhiễu", "Khách cố định, thời tiết, mang đi.", ["lp2"]],
          ["adjusted", "Kết quả chỉnh", "Khác biệt còn nhưng nhỏ.", ["lp2"]],
          ["next", "Thiết kế tiếp", "Luân phiên trong cùng quán.", ["lp3"]],
        ], [["design", "tạo ra", "raw"], ["confounds", "làm phức tạp", "raw"], ["adjusted", "thu hẹp", "raw"], ["next", "giảm", "confounds"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán đánh giá claim về hổ và cốc dùng một lần; nêu thay đổi đo, nhiễu, claim sửa và dữ liệu tiếp theo.",
      requiredElements: ["claim hổ toàn cầu", "camera/vùng so", "ba thông điệp", "nhiễu quán/thời tiết", "claim liên hệ có giới hạn"],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "老虎报道把一个保护区照片增加扩大成全球恢复，但相机数量和位置改变，邻区也没有同样结果；修正后的结论只说本区记录到更多活动，并计划加入个体识别数据。杯子试验中，优惠餐厅下降最多，可固定顾客、天气和外带量也不同；按顾客数和试验前数据调整后，差异变小，因此报告只写“相关”。两项研究都保留积极信号，同时用测量变化、比较范围和替代解释限制因果结论。",
      modelVi: "Bài hổ mở rộng ảnh tăng ở một khu thành hồi phục toàn cầu, nhưng số/vị trí camera đổi và khu bên không giống; claim sửa chỉ nói hoạt động ghi tăng và sẽ thêm dữ liệu nhận diện cá thể. Trong thử cốc, quán ưu đãi giảm nhiều nhất nhưng khách cố định, thời tiết, mang đi khác; sau chuẩn hóa, khác biệt nhỏ nên báo cáo chỉ nói “liên quan”. Cả hai giữ tín hiệu tích cực nhưng dùng thay đổi đo, phạm vi so và giải thích thay thế để giới hạn nhân quả.",
    },
  },
  [ID.viewpoint]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "河流监测成果的三个标准",
        titleVi: "Ba tiêu chuẩn đánh giá kết quả quan trắc sông",
        targetVocabularyIds: [V(1032), V(1316), V(1355), V(1961), V(1999)],
        paragraphs: [
          ["科研团队宣布获得一项江河水质监测成果：新传感器每小时上传数据。工程师把稳定性作为重点，认为连续运行是主要标准；环保人员更关心数据能否及时发现污染；地方居民则问结果是否容易理解。",
            "Nhóm nghiên cứu công bố cảm biến nước sông gửi dữ liệu mỗi giờ. Kỹ sư coi ổn định là trọng điểm và tiêu chuẩn chính; nhân viên môi trường quan tâm phát hiện ô nhiễm kịp; cư dân hỏi kết quả có dễ hiểu không."],
          ["三个月试验中，设备九成时间正常，曾提前发现一次短期变化，网页却只有专业图表。由此，工程标准基本达到，预警作用有一个案例，公众沟通仍然不足。三个观点使用同一数据，却回答不同问题。",
            "Ba tháng thử: thiết bị chạy chín phần mười thời gian, sớm phát hiện một biến động ngắn, nhưng web chỉ có biểu đồ chuyên môn. Chuẩn kỹ thuật cơ bản đạt, cảnh báo có một ca, giao tiếp công chúng còn thiếu. Ba quan điểm dùng cùng dữ liệu cho câu hỏi khác."],
          ["下一阶段保留技术测试，同时增加简单说明和居民反馈。团队不会把“上传成功”直接写成“河流变干净”，因为监测工具的作用是更快提供信息，不是自己消除污染。成果评价将分别报告稳定、预警和可理解性。",
            "Giai đoạn sau giữ thử kỹ thuật, thêm giải thích đơn giản và phản hồi dân. Nhóm không viết “gửi thành công” thành “sông sạch” vì công cụ có tác dụng cung cấp thông tin nhanh, không tự loại ô nhiễm. Đánh giá báo riêng ổn định, cảnh báo, dễ hiểu."],
        ],
        questions: [
          q("main-claim", "Bài đọc tổng hợp kết quả theo cách nào?", ["Tách ba tiêu chuẩn kỹ thuật, cảnh báo và dễ hiểu", "Chỉ xem số lần tải", "Nói cảm biến tự làm sạch sông", "Chỉ dùng ý kiến cư dân"], 0, ["rp1", "rp2", "rp3"], "Ba góc nhìn được giữ thành ba báo cáo."),
          q("supported-detail", "Điểm yếu của giao tiếp hiện tại là gì?", ["Web chỉ có biểu đồ chuyên môn", "Thiết bị không gửi dữ liệu", "Không có sông", "Không ai đo ổn định"], 0, ["rp2"], "Nguồn nêu trực tiếp khoảng trống dễ hiểu."),
          q("cross-paragraph-evidence", "Chi tiết nào phân biệt công cụ và kết quả môi trường?", ["Cảm biến cung cấp thông tin nhưng không tự loại ô nhiễm", "Thiết bị chạy ba tháng", "Có một trang web", "Cư dân có câu hỏi"], 0, ["rp2", "rp3"], "Đoạn cuối giới hạn tác dụng bằng bằng chứng trước."),
          q("bounded-inference", "Có thể suy ra vì sao báo riêng ba tiêu chuẩn?", ["Tránh một thành công che hai khoảng trống khác", "Tăng số cảm biến", "Bỏ phản hồi cư dân", "Chứng minh sông sạch"], 0, ["rp1", "rp2"], "Cùng dữ liệu cho ba câu hỏi và kết quả không đồng đều.", "Có thể suy ra mục tiêu minh bạch, chưa biết giai đoạn sau cải thiện bao nhiêu."),
          q("scope-limit", "Kết luận nào vượt nguồn?", ["Thiết bị hoạt động phần lớn thời gian", "Một cảnh báo sớm đã xảy ra", "Cảm biến đã làm toàn bộ sông sạch", "Trang web cần dễ hiểu hơn"], 2, ["rp2", "rp3"], "Công cụ đo không phải can thiệp làm sạch."),
        ],
        noteMap: map([
          ["engineering", "Chuẩn kỹ thuật", "Hoạt động ổn định.", ["rp1", "rp2"]],
          ["warning", "Chuẩn cảnh báo", "Phát hiện thay đổi sớm.", ["rp1", "rp2"]],
          ["public", "Chuẩn công chúng", "Dễ hiểu và phản hồi.", ["rp1", "rp2"]],
          ["tool", "Vai trò công cụ", "Cung cấp thông tin nhanh.", ["rp3"]],
          ["boundary", "Giới hạn", "Không tự làm sạch sông.", ["rp3"]],
        ], [["engineering", "đánh giá một mặt của", "tool"], ["warning", "đánh giá một mặt của", "tool"], ["public", "đánh giá một mặt của", "tool"], ["boundary", "giới hạn claim về", "tool"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "风景区预警通知怎样适应不同人",
        titleVi: "Thông báo cảnh báo khu thắng cảnh thích nghi với nhiều nhóm",
        targetVocabularyIds: [V(1205), V(1246), V(1603), V(1676), V(1745)],
        paragraphs: [
          ["山谷风景区测试暴雨预警。原通知只有长短信，各个入口同时发送。管理方认为信息完整，但老人说字太多，外国游客缺少图形提示，山里信号弱时短信还会晚到。",
            "Khu thắng cảnh thung lũng thử cảnh báo mưa. Thông báo cũ là SMS dài gửi mọi cổng. Quản lý thấy đủ, nhưng người già nói chữ nhiều, khách nước ngoài thiếu hình, trong núi tín hiệu yếu nên tin đến muộn."],
          ["新方案使用三层：第一层是颜色和动作，第二层是短句，第三层链接详细内容；入口喇叭和电子牌同时通知。试验中，多数游客更快选择路线，但少数色觉不同者仅看颜色仍会困难。",
            "Phương án mới ba lớp: màu+hành động, câu ngắn, link chi tiết; loa và bảng cùng báo. Thử nghiệm, đa số chọn tuyến nhanh hơn nhưng một số người nhận màu khác vẫn khó nếu chỉ nhìn màu."],
          ["团队增加图形和声音，不要求所有人用同一通道。成果是通知形式更能适应不同需要，不是暴雨风险消失。由于试验只在白天进行，夜间照明和喇叭范围仍缺数据，下一季必须继续验证。",
            "Nhóm thêm hình và âm, không buộc mọi người cùng kênh. Kết quả là hình thức thích nghi nhu cầu hơn, không phải rủi ro mưa biến mất. Thử chỉ ban ngày nên đêm và phạm vi loa còn thiếu, mùa sau phải xác minh."],
        ],
        questions: [
          q("main-claim", "Nguồn tổng hợp nhu cầu thành thiết kế nào?", ["Thông tin nhiều lớp và nhiều kênh có dự phòng", "Chỉ SMS dài", "Chỉ màu sắc", "Không cần nội dung chi tiết"], 0, ["lp1", "lp2", "lp3"], "Các khoảng trống dẫn tới nhiều lớp/kênh."),
          q("supported-detail", "Ngoại lệ nào xuất hiện trong thử nghiệm?", ["Người nhận màu khác vẫn khó nếu chỉ dùng màu", "Mọi người đều bỏ tuyến", "Không ai nhận thông báo", "Loa chỉ dùng ban đêm"], 0, ["lp2"], "Đây là biến thể cần bổ sung hình/âm."),
          q("cross-paragraph-evidence", "Hai điều kiện nào khiến một kênh không đủ?", ["Tín hiệu yếu và nhu cầu tiếp nhận khác nhau", "Cảnh đẹp và nhiều cổng", "Tin nhắn có chữ và liên kết", "Có mưa và ban ngày"], 0, ["lp1", "lp2"], "Hạ tầng và khả năng tiếp nhận cùng đòi dự phòng."),
          q("bounded-inference", "Có thể suy ra vì sao giữ tầng nội dung chi tiết?", ["Người cần thêm bối cảnh vẫn có thể truy cập", "Để mọi người đọc trước màu", "Để bỏ câu ngắn", "Để thay loa"], 0, ["lp2"], "Thiết kế ba tầng cho mức thông tin khác nhau.", "Có thể suy ra mục tiêu linh hoạt, chưa biết tỷ lệ người dùng từng tầng."),
          q("scope-limit", "Kết quả không chứng minh điều gì?", ["Thông báo mới dễ thích nghi hơn", "Rủi ro mưa đã biến mất", "Thử ban ngày thiếu dữ liệu đêm", "Cần nhiều kênh"], 1, ["lp3"], "Nguồn phân biệt công cụ cảnh báo và nguy cơ."),
        ],
        noteMap: map([
          ["old", "Thiết kế cũ", "SMS dài một kênh.", ["lp1"]],
          ["needs", "Nhu cầu khác", "Tuổi, ngôn ngữ, tín hiệu.", ["lp1"]],
          ["layers", "Ba lớp", "Màu/hành động, câu, chi tiết.", ["lp2"]],
          ["channels", "Nhiều kênh", "Tin, loa, bảng, hình/âm.", ["lp2", "lp3"]],
          ["gaps", "Còn thiếu", "Ban đêm và phạm vi loa.", ["lp3"]],
        ], [["needs", "làm yếu", "old"], ["needs", "định hình", "layers"], ["channels", "dự phòng cho", "layers"], ["gaps", "giới hạn đánh giá", "channels"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán tổng hợp các góc nhìn và tiêu chuẩn trong quan trắc sông và cảnh báo mưa; phân biệt công cụ, kết quả và giới hạn.",
      requiredElements: ["ba tiêu chuẩn cảm biến", "kết quả ba tháng", "nhu cầu cảnh báo khác nhau", "thiết kế nhiều lớp/kênh", "claim không được mở rộng"],
      evidenceRefs: [[0, "rp1"], [0, "rp3"], [1, "lp1"], [1, "lp3"]],
      modelHanzi: "河流传感器对工程师、环保人员和居民有不同价值，因此成果要分别报告稳定运行、预警作用和公众可理解性；设备上传成功只能说明信息更快，不能说河流已变干净。暴雨通知也要同时回应长文字、语言差异、色觉和弱信号，采用颜色、短句、详细内容及多种通道。两个项目都通过多标准适应不同使用者，也都保留限制：公众页面仍需改进，夜间预警尚未测试，工具改善不等于环境风险消失。",
      modelVi: "Cảm biến sông có giá trị khác với kỹ sư, môi trường và cư dân nên phải báo riêng ổn định, cảnh báo, dễ hiểu; gửi dữ liệu thành công chỉ nói thông tin nhanh hơn, không nói sông sạch. Cảnh báo mưa phải đáp chữ dài, khác ngôn ngữ, nhận màu và tín hiệu yếu bằng màu, câu ngắn, chi tiết và nhiều kênh. Cả hai dùng nhiều tiêu chuẩn để thích nghi người dùng, đồng thời giữ giới hạn: trang công chúng còn cần sửa, cảnh báo đêm chưa thử, công cụ cải thiện không đồng nghĩa rủi ro biến mất.",
    },
  },
};

export const buildHsk4NatureTechnologyLongFormPack = (root = process.cwd()) =>
  buildHsk4LongFormDomainPack({
    root,
    ...HSK4_NATURE_TECHNOLOGY_LONG_FORM_CONFIG,
    lessonIds: HSK4_NATURE_TECHNOLOGY_LESSON_IDS,
    content: CONTENT,
    vietnameseGlossBySequence: VI_GLOSS_BY_SEQUENCE,
    prerequisitePackBundles: [loadHsk4EducationWorkLongFormPackBundle(root)],
  });
export const serializeHsk4NatureTechnologyLongFormPack = (
  pack = buildHsk4NatureTechnologyLongFormPack(),
) => serializeHsk4LongFormDomainPack(pack);

const main = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write") && args.has("--check")) throw new Error("Choose one mode");
  const root = process.cwd();
  const path = resolve(root, HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH);
  const serialized = serializeHsk4NatureTechnologyLongFormPack(
    buildHsk4NatureTechnologyLongFormPack(root),
  );
  if (args.has("--write")) {
    writeFileSync(path, serialized, "utf8");
    console.log(`Wrote ${path}`);
  } else if (args.has("--check")) {
    if (readFileSync(path, "utf8") !== serialized) throw new Error(`${path} is stale`);
    console.log(`${HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH} is current`);
  } else process.stdout.write(serialized);
};
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
