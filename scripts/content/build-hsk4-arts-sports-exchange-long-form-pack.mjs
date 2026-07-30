import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHsk4LongFormDomainPack,
  serializeHsk4LongFormDomainPack,
} from "./hsk4-long-form-domain-builder.mjs";
import {
  HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID,
  HSK4_ARTS_SPORTS_EXCHANGE_LESSON_IDS,
  HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_CONFIG,
  HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH,
} from "../../src/content/hsk4ArtsSportsExchangeLongFormPack.mjs";
import {
  loadHsk4SocietyEconomyLongFormPackBundle,
} from "../../src/content/hsk4SocietyEconomyLongFormPack.mjs";

const V = (n) => `hsk-vocab-${String(n).padStart(5, "0")}`;
const VI_GLOSS_BY_SEQUENCE = {
  1050: "bộ; tác phẩm", 1202: "chia thành", 1554: "bài; thiên",
  1752: "hình; sơ đồ", 1850: "biểu diễn ca hát", 1013: "tuyệt; giỏi",
  1373: "huấn luyện viên", 1591: "đội bóng", 1687: "thua",
  1917: "tạm dừng", 1251: "công phu; võ thuật", 1274: "ánh sáng",
  1555: "mảnh; vùng", 1791: "mảnh; chi tiết", 1851: "buổi diễn",
  1005: "sắp xếp", 1222: "vội; kịp", 1415: "tụ họp",
  1689: "quen thuộc", 1979: "cẩn thận", 1036: "thể hiện; biểu hiện",
  1174: "đối phương", 1280: "quốc tế", 1652: "thất bại",
  1939: "ủng hộ", 1057: "bộ phận", 1218: "thay đổi; sửa",
  1506: "ước mơ", 1610: "đời người", 1893: "tình hữu nghị",
  1063: "tham gia thi đấu", 1149: "thấp", 1329: "kế hoạch",
  1725: "đặc điểm", 1977: "đúng giờ", 1258: "tổng cộng; cùng",
  1508: "miễn phí", 1542: "chụp; quay", 1799: "trực tuyến",
  1941: "sau đó", 1065: "sân thể thao", 1184: "trẻ em",
  1219: "thay đổi", 1399: "kinh nghiệm", 1686: "bị thương",
  1111: "đồng ý; hứa", 1259: "chung", 1617: "vẫn",
  1868: "ý kiến", 1976: "chính xác", 1073: "trận; buổi",
  1114: "đạt tới", 1546: "bóng chuyền", 1587: "thanh niên",
  1983: "tự tin", 1045: "không ngừng", 1332: "tiếp tục",
  1690: "kỳ nghỉ hè", 1800: "ngoại tuyến", 1870: "nghệ thuật",
};
const q = (kind, prompt, options, answer, evidence, rationale, boundary = null) =>
  [kind, prompt, options, answer, evidence, rationale, boundary];
const map = (nodes, relations) => ({ nodes, relations });
const D = HSK4_ARTS_SPORTS_EXCHANGE_DOMAIN_ID;
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
        titleHanzi: "社区艺术档案怎样分类",
        titleVi: "Hồ sơ nghệ thuật cộng đồng được phân loại thế nào",
        targetVocabularyIds: [V(1050), V(1202), V(1554), V(1752), V(1850)],
        paragraphs: [
          ["海桥社区整理十年艺术档案，最初只按活动日期放在一起。新小组把材料分为舞台、文字和视觉三类：一部短剧和一次演唱归入舞台，一篇评论归入文字，一张图则进入视觉目录。分类依据是主要表达形式，不是作品价值。",
            "Cộng đồng Hải Kiều sắp xếp hồ sơ nghệ thuật mười năm, trước đây chỉ gom theo ngày. Nhóm mới chia tài liệu thành sân khấu, chữ viết và thị giác: một vở ngắn cùng một lần ca hát vào sân khấu, một bài phê bình vào chữ, một hình vào mục thị giác. Tiêu chí là hình thức chính, không phải giá trị."],
          ["问题出现在综合作品。一部关于河流的演出同时有诗、现场演唱和投影图，三个负责人都希望收入自己的目录。小组保留一个主要类别，再增加两个交叉标签，并记录是谁作出判断。这样既能查找，也不会假装作品只有一种形式。",
            "Vấn đề xuất hiện ở tác phẩm tổng hợp. Một buổi diễn về dòng sông có thơ, hát trực tiếp và hình chiếu; ba người phụ trách đều muốn đưa vào mục của mình. Nhóm giữ một loại chính, thêm hai nhãn chéo và ghi ai quyết định. Cách này giúp tìm kiếm mà không giả vờ tác phẩm chỉ có một hình thức."],
          ["六个月后，读者找到资料的时间缩短，但视觉目录的使用增长最多。报告没有说图比文章或演唱更重要，因为展览入口正好放在视觉页。下一轮将调整入口位置，并让创作者说明自己怎样理解作品形式。",
            "Sáu tháng sau, thời gian tìm hồ sơ giảm nhưng mục thị giác tăng dùng nhiều nhất. Báo cáo không nói hình quan trọng hơn bài viết hay ca hát vì lối vào triển lãm nằm ngay trang thị giác. Vòng sau sẽ đổi vị trí lối vào và cho tác giả tự giải thích hình thức tác phẩm."],
        ],
        questions: [
          q("main-claim", "Bài đọc trình bày nguyên tắc phân loại nào?", ["Một loại chính kèm nhãn chéo và người chịu trách nhiệm", "Mỗi tác phẩm chỉ có một hình thức", "Hình ảnh luôn có giá trị cao nhất", "Chỉ xếp theo ngày"], 0, ["rp1", "rp2", "rp3"], "Nguồn tách tiêu chí phân loại khỏi đánh giá giá trị."),
          q("supported-detail", "Tác phẩm tổng hợp được xử lý ra sao?", ["Giữ loại chính và thêm hai nhãn chéo", "Xóa khỏi hồ sơ", "Chia thành ba bản sao độc lập", "Chỉ hỏi người xem"], 0, ["rp2"], "Đoạn hai mô tả quy trình trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao lượt dùng mục thị giác chưa chứng minh hình quan trọng hơn?", ["Vị trí lối vào ảnh hưởng lượt dùng và phân loại không phải xếp hạng", "Mọi tác phẩm đều có hình", "Không có bài viết", "Ca hát bị dừng"], 0, ["rp1", "rp3"], "Hai đoạn đặt mục đích phân loại cạnh yếu tố giao diện."),
          q("bounded-inference", "Có thể suy ra lợi ích ghi người ra quyết định?", ["Cho phép truy lại phán đoán khi tác phẩm có nhiều hình thức", "Bảo đảm mọi người đồng ý", "Xếp hạng người sáng tác", "Loại bỏ nhãn chéo"], 0, ["rp2"], "Bản ghi gắn quyết định với trách nhiệm.", "Có thể suy ra mục tiêu truy vết, chưa thể nói người ghi luôn phán đoán đúng."),
          q("scope-limit", "Kết luận nào vượt quá nguồn?", ["Thời gian tìm giảm trong sáu tháng", "Hình ảnh là hình thức nghệ thuật quan trọng nhất", "Lối vào có thể ảnh hưởng lượt dùng", "Cần hỏi cách tác giả hiểu tác phẩm"], 1, ["rp3"], "Nguồn nêu một yếu tố thiết kế cạnh tranh."),
        ],
        noteMap: map([
          ["stage", "Sân khấu", "Kịch và hoạt động biểu diễn ca hát.", ["rp1"]],
          ["writing", "Chữ viết", "Bài bình luận và văn bản.", ["rp1"]],
          ["visual", "Thị giác", "Hình và tài liệu trình chiếu.", ["rp1", "rp2"]],
          ["hybrid", "Tổng hợp", "Một loại chính với nhãn chéo.", ["rp2"]],
          ["limit", "Giới hạn", "Vị trí lối vào tác động lượt dùng.", ["rp3"]],
        ], [["stage", "giao với", "hybrid"], ["visual", "giao với", "hybrid"], ["writing", "giao với", "hybrid"], ["limit", "giới hạn cách đọc", "visual"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一场跨界晚会由谁负责",
        titleVi: "Ai chịu trách nhiệm cho đêm diễn liên lĩnh vực",
        targetVocabularyIds: [V(1013), V(1373), V(1591), V(1687), V(1917)],
        paragraphs: [
          ["青年中心准备艺术体育晚会，邀请球队表演节奏训练，也请歌手和舞蹈团参加。导演管整场顺序，教练保证动作安全，音响组控制音乐。第一次彩排后观众说节奏很棒，却分不清谁能决定暂停节目。",
            "Trung tâm thanh niên chuẩn bị đêm nghệ thuật–thể thao, mời đội bóng biểu diễn bài tập nhịp cùng ca sĩ và đoàn múa. Đạo diễn quản thứ tự, huấn luyện viên giữ an toàn, nhóm âm thanh điều khiển nhạc. Sau buổi ráp đầu, khán giả khen nhịp tuyệt nhưng không rõ ai được quyền tạm dừng tiết mục."],
          ["第二次彩排中，一名队员差点摔倒。教练立刻暂停动作，导演随后调整灯光和节目长度。双方约定：安全问题由教练先停，艺术节奏由导演修改，技术故障由音响组报告。球队即使在比赛中输了，也不影响它在晚会中的创作意见。",
            "Ở buổi ráp thứ hai, một thành viên suýt ngã. Huấn luyện viên lập tức dừng động tác; đạo diễn sau đó đổi ánh sáng và độ dài. Hai bên thống nhất: an toàn do huấn luyện viên dừng trước, nhịp nghệ thuật do đạo diễn sửa, lỗi kỹ thuật do nhóm âm thanh báo. Việc đội bóng từng thua trận không làm mất ý kiến sáng tạo trong đêm diễn."],
          ["正式演出顺利完成，观众评价也提高。不过中心只调查了到场者，没有询问因票价或时间不能来的人。负责人认为角色图解决了现场决策，却不能证明跨界晚会适合所有社区成员。",
            "Buổi diễn chính thức hoàn tất suôn sẻ và đánh giá khán giả tăng. Tuy nhiên trung tâm chỉ khảo sát người có mặt, không hỏi người không đến vì giá vé hay thời gian. Người phụ trách cho rằng bản đồ vai trò giải quyết quyết định tại chỗ nhưng chưa chứng minh đêm liên lĩnh vực hợp mọi thành viên cộng đồng."],
        ],
        questions: [
          q("main-claim", "Bài nghe làm rõ điều gì?", ["Quyền quyết định khác nhau giữa an toàn, nghệ thuật và kỹ thuật", "Huấn luyện viên quản mọi phần", "Đội thua không được biểu diễn", "Khán giả quyết định dừng"], 0, ["lp1", "lp2", "lp3"], "Nguồn lập bản đồ vai trò theo loại vấn đề."),
          q("supported-detail", "Ai được dừng trước khi có nguy cơ an toàn?", ["Huấn luyện viên", "Khán giả", "Người bán vé", "Ca sĩ"], 0, ["lp2"], "Thỏa thuận nêu thẩm quyền rõ ràng."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy đánh giá tích cực có phạm vi hẹp?", ["Người có mặt khen nhưng người không thể đến không được hỏi", "Đội bóng từng thua", "Có nhóm âm thanh", "Đạo diễn đổi ánh sáng"], 0, ["lp1", "lp3"], "Mẫu phản hồi loại nhóm vắng mặt."),
          q("bounded-inference", "Có thể suy ra vì sao thành tích thi đấu không quyết định ý kiến sáng tạo?", ["Vai trò trong buổi diễn khác vai trò trong trận đấu", "Đội luôn biểu diễn hay nhất", "Huấn luyện viên là đạo diễn", "Khán giả không quan tâm"], 0, ["lp1", "lp2"], "Nguồn phân quyền theo nhiệm vụ hiện tại.", "Có thể suy ra nguyên tắc phân vai, chưa thể đánh giá chất lượng sáng tạo của đội."),
          q("scope-limit", "Claim nào chưa được chứng minh?", ["Quy trình dừng an toàn rõ hơn", "Đêm diễn phù hợp mọi thành viên cộng đồng", "Người tham dự đánh giá cao hơn", "Ba nhóm có trách nhiệm khác nhau"], 1, ["lp3"], "Nhóm không tham dự chưa được khảo sát."),
        ],
        noteMap: map([
          ["director", "Đạo diễn", "Điều chỉnh nhịp và thứ tự nghệ thuật.", ["lp1", "lp2"]],
          ["coach", "Huấn luyện viên", "Dừng trước khi có nguy cơ an toàn.", ["lp1", "lp2"]],
          ["sound", "Âm thanh", "Kiểm soát nhạc và báo lỗi kỹ thuật.", ["lp1", "lp2"]],
          ["team", "Đội bóng", "Đóng góp động tác và ý kiến sáng tạo.", ["lp1", "lp2"]],
          ["sample", "Mẫu phản hồi", "Chỉ gồm những người đã đến xem.", ["lp3"]],
        ], [["coach", "bảo vệ", "team"], ["director", "phối hợp với", "sound"], ["team", "tham gia dưới", "director"], ["sample", "giới hạn đánh giá", "director"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh cách phân loại tác phẩm và phân quyền trong đêm diễn; nêu nhãn chéo, trách nhiệm, bằng chứng và giới hạn mẫu.",
      requiredElements: ["ba loại hồ sơ", "tác phẩm tổng hợp", "ba vai trò đêm diễn", "quyền dừng an toàn", "giới hạn giao diện/mẫu"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "社区艺术档案按舞台、文字和视觉分为主要类别，综合作品再加交叉标签，并记录判断者，所以分类帮助查找却不等于价值排名。跨界晚会也把责任分开：教练先处理安全暂停，导演修改艺术节奏，音响组报告技术故障，球队的比赛输赢不取消创作意见。两种做法都让复杂合作可以追踪，但使用数据受视觉入口位置影响，晚会反馈又只来自到场者，因此不能据此宣布某种艺术最重要或活动适合所有居民。",
      modelVi: "Hồ sơ cộng đồng chia sân khấu, chữ viết và thị giác, tác phẩm tổng hợp thêm nhãn chéo và ghi người phán đoán; phân loại giúp tìm chứ không xếp giá trị. Đêm liên lĩnh vực cũng tách trách nhiệm: huấn luyện viên dừng vì an toàn, đạo diễn sửa nhịp, âm thanh báo lỗi; thắng thua của đội không xóa ý kiến sáng tạo. Cả hai tăng khả năng truy vết, nhưng lượt dùng bị vị trí lối vào tác động và phản hồi đêm diễn chỉ từ người có mặt, nên chưa thể tuyên bố loại hình nào quan trọng nhất hay hoạt động hợp mọi cư dân.",
    },
  },
  [ID.process]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "皮影创作者怎样完成一部新作",
        titleVi: "Người sáng tạo múa bóng hoàn thành tác phẩm mới thế nào",
        targetVocabularyIds: [V(1251), V(1274), V(1555), V(1791), V(1851)],
        paragraphs: [
          ["林师傅准备一部关于海鸟的皮影戏。第一个月，他先观察鸟飞的功夫和速度，把动作画成一片片草图；随后选择能透光的皮料，并把翅膀关节切得很细。这个阶段只测试动作，不安排公开演出。",
            "Nghệ nhân Lâm chuẩn bị một vở múa bóng về chim biển. Tháng đầu ông quan sát công phu và tốc độ bay, vẽ động tác thành từng mảnh phác thảo; sau đó chọn da cho ánh sáng xuyên qua và cắt khớp cánh rất nhỏ. Giai đoạn này chỉ thử chuyển động, chưa xếp buổi diễn công khai."],
          ["第二个月，灯光师发现蓝光使影子边缘不清，林师傅便放大片尺寸，减少过细的装饰。第三个月，音乐组按动作重新写节奏，学校观众参加小型试演。孩子看懂了飞行，却没看懂海鸟为什么离开家。",
            "Tháng hai, kỹ thuật ánh sáng thấy đèn xanh làm viền bóng không rõ; nghệ nhân tăng kích thước mảnh và giảm trang trí quá nhỏ. Tháng ba, nhóm nhạc viết lại nhịp theo động tác, học sinh dự diễn thử nhỏ. Trẻ hiểu cảnh bay nhưng chưa hiểu vì sao chim rời nhà."],
          ["最后一个月，团队增加两场短对话，并用不同光线区分白天和夜晚。正式演出后，动作理解率提高，故事理解也改善。这个过程显示创作不是直线：材料、光、观众反馈会让前一步反复修改。",
            "Tháng cuối, nhóm thêm hai đoạn thoại ngắn và dùng ánh sáng khác để phân biệt ngày đêm. Sau buổi diễn chính thức, mức hiểu động tác và cốt truyện đều tốt hơn. Quá trình cho thấy sáng tạo không đi thẳng: vật liệu, ánh sáng và phản hồi khán giả khiến bước trước phải sửa lại."],
        ],
        questions: [
          q("main-claim", "Dòng thời gian sáng tác cho thấy điều gì?", ["Vật liệu, ánh sáng và phản hồi khiến các bước được lặp sửa", "Chỉ cần phác thảo đầu tiên", "Biểu diễn trước khi thử", "Chi tiết càng nhỏ càng tốt"], 0, ["rp1", "rp2", "rp3"], "Nguồn mô tả chu kỳ thử và sửa."),
          q("supported-detail", "Vì sao phải tăng kích thước mảnh?", ["Đèn xanh làm viền bóng không rõ", "Nhạc quá nhanh", "Không có khán giả", "Da không xuyên sáng"], 0, ["rp2"], "Ánh sáng tạo ra lỗi quan sát."),
          q("cross-paragraph-evidence", "Chi tiết nào cho thấy hiểu động tác chưa đồng nghĩa hiểu truyện?", ["Trẻ hiểu bay nhưng chưa hiểu lý do rời nhà, nên nhóm thêm thoại", "Cánh được cắt nhỏ", "Có buổi diễn chính thức", "Nhạc viết theo động tác"], 0, ["rp2", "rp3"], "Hai giai đoạn tách hai loại hiểu."),
          q("bounded-inference", "Có thể suy ra vai trò của diễn thử trường học?", ["Phát hiện khoảng trống nghĩa trước buổi chính thức", "Chứng minh mọi trẻ hiểu", "Thay thế nhóm sáng tác", "Xóa nhu cầu ánh sáng"], 0, ["rp2", "rp3"], "Phản hồi dẫn tới thay đổi nội dung.", "Có thể suy ra chức năng chẩn đoán, chưa thể đại diện mọi nhóm khán giả."),
          q("scope-limit", "Claim nào quá rộng?", ["Tác phẩm này được sửa qua bốn tháng", "Mọi tác phẩm múa bóng phải theo đúng bốn bước", "Ánh sáng ảnh hưởng viền bóng", "Đối thoại giúp làm rõ truyện trong mẫu"], 1, ["rp1", "rp3"], "Nguồn chỉ mô tả một quy trình cụ thể."),
        ],
        noteMap: map([
          ["observe", "Quan sát", "Ghi động tác và tạo các mảnh phác thảo.", ["rp1"]],
          ["material", "Vật liệu", "Da xuyên sáng và khớp cánh nhỏ.", ["rp1"]],
          ["light", "Ánh sáng", "Làm lộ vấn đề đường viền.", ["rp2"]],
          ["audience", "Diễn thử", "Tách hiểu động tác khỏi hiểu truyện.", ["rp2"]],
          ["revision", "Sửa cuối", "Thêm thoại và phân biệt ngày đêm.", ["rp3"]],
        ], [["observe", "dẫn tới", "material"], ["light", "sửa", "material"], ["audience", "kích hoạt", "revision"], ["revision", "hoàn thiện", "material"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "巡回演出为何改变安排",
        titleVi: "Vì sao chuyến lưu diễn thay đổi lịch trình",
        targetVocabularyIds: [V(1005), V(1222), V(1415), V(1689), V(1979)],
        paragraphs: [
          ["一个青年剧团安排四城巡回演出，每到一城还举办创作者聚会。团队对前两座城市很熟悉，便把装台和见面会放在同一天。首站火车晚点，演员赶到剧场后只剩三小时，聚会因此缩短。",
            "Một đoàn kịch trẻ sắp xếp lưu diễn bốn thành phố, mỗi nơi có thêm buổi gặp người sáng tạo. Nhóm quen hai thành phố đầu nên đặt dựng sân khấu và gặp mặt cùng ngày. Tàu chặng đầu muộn; diễn viên vội đến nhà hát chỉ còn ba giờ, nên buổi gặp bị rút ngắn."],
          ["第二站虽然准时，技术人员却发现当地电源不同。团队仔细检查后借到设备，演出没有延误，但原定讨论再次被压缩。负责人意识到“熟悉城市”不等于熟悉每个剧场，交通和技术都需要单独留时间。",
            "Chặng hai đúng giờ nhưng kỹ thuật phát hiện nguồn điện địa phương khác. Nhóm kiểm tra cẩn thận rồi mượn thiết bị, buổi diễn không chậm song thảo luận lại bị rút. Người phụ trách nhận ra quen thành phố không đồng nghĩa quen từng nhà hát; giao thông và kỹ thuật cần thời gian riêng."],
          ["后两站把聚会改到第二天，并增加设备清单和两小时缓冲。演出与交流都按计划完成，不过样本只有两站，且没有遇到恶劣天气。新安排值得保留试用，不能据此保证任何巡演都不会延误。",
            "Hai chặng sau chuyển gặp mặt sang ngày thứ hai, thêm danh sách thiết bị và hai giờ dự phòng. Biểu diễn lẫn trao đổi hoàn thành đúng kế hoạch, nhưng mẫu chỉ hai chặng và không gặp thời tiết xấu. Lịch mới đáng tiếp tục thử, chưa bảo đảm mọi lưu diễn không trễ."],
        ],
        questions: [
          q("main-claim", "Bài nghe mô tả thay đổi quy trình nào?", ["Tách ngày giao lưu và thêm kiểm tra cùng thời gian dự phòng", "Bỏ mọi buổi gặp", "Chỉ chọn thành phố quen", "Không kiểm tra thiết bị"], 0, ["lp1", "lp2", "lp3"], "Hai sự cố tạo lịch mới."),
          q("supported-detail", "Sự cố kỹ thuật ở chặng hai là gì?", ["Nguồn điện nhà hát khác", "Không có diễn viên", "Tàu bị hủy", "Khán giả đến muộn"], 0, ["lp2"], "Đoạn hai nêu nguyên nhân trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao 'quen thành phố' chưa đủ cho kế hoạch?", ["Chặng đầu có trễ tàu và chặng hai có nguồn điện khác", "Đoàn đã có bốn thành phố", "Có buổi gặp người sáng tạo", "Hai chặng sau đúng giờ"], 0, ["lp1", "lp2"], "Hai loại rủi ro độc lập xuất hiện."),
          q("bounded-inference", "Có thể suy ra mục đích danh sách thiết bị?", ["Phát hiện khác biệt kỹ thuật trước giờ diễn", "Thay thế mọi nhân viên", "Bảo đảm thời tiết tốt", "Làm buổi gặp ngắn hơn"], 0, ["lp2", "lp3"], "Danh sách phản hồi sự cố nguồn điện.", "Có thể suy ra mục tiêu phòng ngừa, chưa thể bảo đảm không còn lỗi thiết bị."),
          q("scope-limit", "Kết luận nào được phép?", ["Lịch mới thành công ở hai chặng thời tiết thuận lợi", "Lịch mới ngăn mọi trì hoãn", "Mọi nhà hát có nguồn điện giống nhau", "Thành phố quen không cần chuẩn bị"], 0, ["lp3"], "Nguồn giới hạn số chặng và điều kiện."),
        ],
        noteMap: map([
          ["plan", "Kế hoạch đầu", "Dựng sân khấu và gặp mặt cùng ngày.", ["lp1"]],
          ["traffic", "Giao thông", "Tàu muộn làm giảm thời gian.", ["lp1"]],
          ["technical", "Kỹ thuật", "Nguồn điện khác cần thiết bị mới.", ["lp2"]],
          ["change", "Lịch mới", "Tách ngày và thêm khoảng dự phòng.", ["lp3"]],
          ["scope", "Phạm vi", "Hai chặng không có thời tiết xấu.", ["lp3"]],
        ], [["traffic", "làm yếu", "plan"], ["technical", "làm yếu", "plan"], ["change", "phản hồi", "technical"], ["scope", "giới hạn", "change"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán tổng hợp hai quy trình sáng tạo và lưu diễn; nêu bước thử, phản hồi, thay đổi lịch và giới hạn khái quát.",
      requiredElements: ["mảnh bóng/ánh sáng", "diễn thử trẻ em", "trễ tàu", "nguồn điện khác", "phạm vi thử mới"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "皮影作品先观察动作、选择材料，再用灯光和学校试演检查效果。蓝光让边缘不清，孩子只看懂飞行却不懂离家原因，因此团队放大影片并增加对话。巡回剧团也从晚点和电源差异中修改安排，把聚会移到第二天，增加设备清单与缓冲时间。两种过程都不是直线，而是由具体证据返回前一步。不过皮影反馈来自一所学校，新巡演安排只在两站和好天气下试过，所以经验可以继续验证，不能变成所有创作或巡演的固定答案。",
      modelVi: "Tác phẩm múa bóng quan sát động tác, chọn vật liệu rồi dùng ánh sáng và diễn thử trường học để kiểm tra. Đèn xanh làm viền mờ; trẻ hiểu bay nhưng chưa hiểu rời nhà, nên nhóm tăng mảnh và thêm thoại. Đoàn lưu diễn cũng sửa lịch từ trễ tàu và khác nguồn điện, chuyển gặp mặt sang ngày sau, thêm danh sách cùng dự phòng. Cả hai quy trình quay lại bước trước theo bằng chứng. Tuy vậy, phản hồi múa bóng chỉ từ một trường và lịch mới chỉ thử hai chặng thời tiết tốt, nên kinh nghiệm cần kiểm tiếp chứ không thành đáp án chung.",
    },
  },
  [ID.cause]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "一次国际比赛失败由什么造成",
        titleVi: "Điều gì tạo nên thất bại ở một giải quốc tế",
        targetVocabularyIds: [V(1036), V(1174), V(1280), V(1652), V(1939)],
        paragraphs: [
          ["青原队第一次参加国际青年赛，小组赛前两场表现很好，支持者便认为冠军很近。第三场面对对方的快速防守，青原队失误增加，最后失败。赛后报道把结果归因于“经验不足”，却没有说明具体环节。",
            "Đội Thanh Nguyên lần đầu dự giải trẻ quốc tế, thể hiện tốt hai trận vòng bảng nên người ủng hộ cho rằng chức vô địch đã gần. Trận ba gặp phòng thủ nhanh của đối phương, đội tăng lỗi và cuối cùng thất bại. Báo sau trận quy kết 'thiếu kinh nghiệm' nhưng không chỉ rõ khâu nào."],
          ["教练组重新看数据：前两场休息超过一天，第三场只有十八小时；主力队员上场时间也更长。录像同时显示，对方改变防守后，青原队仍使用原来的传球路线。体能、准备时间和战术反应都可能有关，单一原因无法覆盖全部证据。",
            "Ban huấn luyện xem lại dữ liệu: hai trận đầu nghỉ hơn một ngày, trận ba chỉ 18 giờ; cầu thủ chính cũng thi đấu lâu hơn. Video còn cho thấy khi đối phương đổi phòng thủ, đội vẫn dùng đường chuyền cũ. Thể lực, thời gian chuẩn bị và phản ứng chiến thuật đều có thể liên quan; một nguyên nhân không phủ hết bằng chứng."],
          ["下一阶段，球队将在训练中模拟短休息，并记录对不同防守的调整速度。报告把结论改为“在短休息和战术调整较慢的条件下失败”，而不是说国际经验自然决定胜负。支持球队可以包括批评可改进环节，并不要求把失败解释成个人能力不足。",
            "Giai đoạn sau, đội sẽ mô phỏng nghỉ ngắn và ghi tốc độ điều chỉnh trước các kiểu phòng thủ. Báo cáo sửa kết luận thành 'thất bại trong điều kiện nghỉ ngắn và đổi chiến thuật chậm', không nói kinh nghiệm quốc tế tự quyết thắng thua. Ủng hộ đội có thể gồm phê bình điểm sửa được, không cần quy thất bại cho năng lực cá nhân."],
        ],
        questions: [
          q("main-claim", "Bài đọc sửa cách giải thích thất bại thế nào?", ["Từ nhãn chung sang nhiều điều kiện có thể kiểm tra", "Từ dữ liệu sang cảm xúc người hâm mộ", "Từ chiến thuật sang may mắn duy nhất", "Từ giải quốc tế sang giải địa phương"], 0, ["rp1", "rp2", "rp3"], "Nguồn tách điều kiện thể lực và chiến thuật."),
          q("supported-detail", "Thời gian nghỉ trước trận ba là bao lâu?", ["Mười tám giờ", "Hai ngày", "Một tuần", "Ba giờ"], 0, ["rp2"], "Đây là dữ kiện trực tiếp."),
          q("cross-paragraph-evidence", "Chi tiết nào khiến nhãn 'thiếu kinh nghiệm' chưa đủ?", ["Nghỉ ngắn và không đổi đường chuyền khi đối phương đổi phòng thủ", "Người hâm mộ muốn vô địch", "Đây là giải quốc tế", "Đội đã thắng hai trận"], 0, ["rp1", "rp2"], "Hai đoạn chỉ ra cơ chế cụ thể hơn."),
          q("bounded-inference", "Có thể suy ra vì sao mô phỏng nghỉ ngắn?", ["Kiểm tra vai trò thể lực trong điều kiện tương tự", "Bảo đảm đội sẽ vô địch", "Loại bỏ chiến thuật", "Tăng thời gian thi đấu chính"], 0, ["rp2", "rp3"], "Can thiệp khớp với điều kiện quan sát.", "Có thể suy ra mục tiêu kiểm tra, chưa thể tách hoàn toàn mọi yếu tố."),
          q("scope-limit", "Claim nào quá rộng?", ["Đội thất bại trong một trận có nghỉ ngắn", "Thiếu kinh nghiệm quốc tế luôn quyết định thắng thua", "Phản ứng chiến thuật chậm có thể liên quan", "Ủng hộ có thể gồm phê bình"], 1, ["rp3"], "Báo cáo chủ động giới hạn điều kiện."),
        ],
        noteMap: map([
          ["result", "Kết quả", "Thất bại ở trận quốc tế thứ ba.", ["rp1"]],
          ["rest", "Nghỉ ngắn", "Chỉ có mười tám giờ hồi phục.", ["rp2"]],
          ["tactic", "Chiến thuật", "Đường chuyền không đổi theo đối phương.", ["rp2"]],
          ["test", "Kiểm tra mới", "Mô phỏng nghỉ và ghi tốc độ điều chỉnh.", ["rp3"]],
          ["claim", "Claim hẹp", "Kết quả gắn với điều kiện quan sát.", ["rp3"]],
        ], [["rest", "có thể góp vào", "result"], ["tactic", "có thể góp vào", "result"], ["test", "kiểm tra", "rest"], ["claim", "giới hạn", "result"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "社区运动怎样改变青年生活",
        titleVi: "Thể thao cộng đồng thay đổi đời sống thanh niên thế nào",
        targetVocabularyIds: [V(1057), V(1218), V(1506), V(1610), V(1893)],
        paragraphs: [
          ["城市体育部门开设周末运动计划，希望让青年建立友谊，并支持追求运动梦想。第一年报名人数很高，采访中有人说训练改变了人生。项目组因此准备把报名增长当作主要成功证据。",
            "Bộ phận thể thao thành phố mở chương trình cuối tuần, mong thanh niên xây tình hữu nghị và theo đuổi ước mơ vận động. Năm đầu đăng ký cao; phỏng vấn có người nói tập luyện thay đổi đời mình. Nhóm dự án vì thế định dùng tăng đăng ký làm bằng chứng thành công chính."],
          ["独立评估发现，常来训练的人本来就更喜欢运动，而且交通方便的地区参加更多。六个月后，固定参与者的朋友数量和自我评价上升，但中途退出者没有接受第二次采访。结果与积极改变一致，却不能说明计划单独造成所有变化。",
            "Đánh giá độc lập thấy người đến đều vốn thích thể thao hơn, và vùng thuận giao thông tham gia nhiều. Sáu tháng sau, người tham gia đều tăng số bạn và tự đánh giá, nhưng người bỏ giữa chừng không được phỏng vấn lần hai. Kết quả phù hợp thay đổi tích cực nhưng chưa nói chương trình tự gây mọi thay đổi."],
          ["部门随后增加交通补助，并把退出者纳入联系名单。下一年会比较不同出勤次数、原有运动习惯和地区条件。项目仍保留梦想与友情目标，但评价从宣传故事转向参与分布和长期变化。",
            "Bộ phận sau đó thêm hỗ trợ đi lại và đưa người bỏ cuộc vào danh sách liên hệ. Năm sau sẽ so số lần tham dự, thói quen vận động sẵn có và điều kiện vùng. Dự án vẫn giữ mục tiêu ước mơ/tình bạn nhưng đánh giá chuyển từ câu chuyện quảng bá sang phân bố tham gia và thay đổi dài hạn."],
        ],
        questions: [
          q("main-claim", "Bài nghe phân biệt điều gì?", ["Mục tiêu ý nghĩa với bằng chứng về tác động", "Ước mơ với thể thao quốc tế", "Đăng ký với giá vé", "Tình bạn với thất bại"], 0, ["lp1", "lp2", "lp3"], "Nguồn giữ mục tiêu nhưng nâng thiết kế đánh giá."),
          q("supported-detail", "Nhóm nào thiếu ở phỏng vấn lần hai?", ["Người bỏ giữa chừng", "Người tham gia đều", "Nhân viên bộ phận", "Huấn luyện viên quốc tế"], 0, ["lp2"], "Đây là khoảng trống chọn mẫu."),
          q("cross-paragraph-evidence", "Vì sao tăng đăng ký chưa đủ chứng minh thay đổi công bằng?", ["Vùng giao thông thuận tham gia nhiều và sau đó phải thêm trợ cấp", "Có câu chuyện ước mơ", "Chương trình diễn ra cuối tuần", "Bộ phận có danh sách"], 0, ["lp2", "lp3"], "Phân bố địa lý dẫn tới can thiệp tiếp cận."),
          q("bounded-inference", "Có thể suy ra mục đích liên hệ người bỏ cuộc?", ["Giảm thiên lệch chỉ nghe người ở lại", "Buộc họ quay lại", "Xóa dữ liệu người tham gia", "Chứng minh tác động ngay"], 0, ["lp2", "lp3"], "Mẫu cũ thiếu kết quả của nhóm rời chương trình.", "Có thể suy ra mục tiêu sửa selection bias, chưa biết họ có trả lời hay không."),
          q("scope-limit", "Kết luận nào được hỗ trợ?", ["Người tham gia đều báo thay đổi tích cực trong mẫu", "Chương trình thay đổi cuộc đời mọi thanh niên", "Đăng ký cao chứng minh quan hệ nhân quả", "Trợ cấp chắc chắn xóa mọi chênh lệch"], 0, ["lp2"], "Nguồn chỉ cho kết quả nhóm được theo dõi."),
        ],
        noteMap: map([
          ["goals", "Mục tiêu", "Ước mơ thể thao và tình hữu nghị.", ["lp1"]],
          ["uptake", "Tham gia", "Cao nhưng lệch về vùng thuận giao thông.", ["lp1", "lp2"]],
          ["selection", "Thiên lệch", "Người bỏ cuộc thiếu ở phỏng vấn sau.", ["lp2"]],
          ["access", "Tiếp cận", "Thêm trợ cấp giao thông.", ["lp3"]],
          ["evaluation", "Đánh giá", "So thói quen, vùng và mức tham dự.", ["lp3"]],
        ], [["uptake", "không đủ chứng minh", "goals"], ["selection", "giới hạn", "evaluation"], ["access", "phản hồi", "uptake"], ["evaluation", "kiểm tra", "goals"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán đánh giá hai claim thể thao; nêu điều kiện thất bại, selection bias, can thiệp tiếp theo và giới hạn nhân quả.",
      requiredElements: ["nghỉ ngắn", "phản ứng chiến thuật", "đăng ký cộng đồng", "người bỏ cuộc", "kế hoạch kiểm tra"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "国际青年赛的失败不能只写成“经验不足”，因为第三场休息更短、主力时间更长，球队也没有及时回应对方防守。报告因此把结论限制在这些条件，并用模拟训练继续检查。社区运动计划同样不能用报名和成功故事宣布改变所有青年：参加者原来更爱运动，交通方便地区更多，中途退出者又缺少第二次采访。项目增加交通补助并联系退出者。两份材料都保留支持与梦想，但把宣传性原因改成可观察、可比较而且有范围的证据。",
      modelVi: "Thất bại giải trẻ không thể chỉ viết là 'thiếu kinh nghiệm' vì trận ba nghỉ ngắn hơn, cầu thủ chính lâu hơn và đội không phản ứng kịp phòng thủ đối phương. Báo cáo giới hạn claim theo các điều kiện và tiếp tục kiểm bằng mô phỏng. Chương trình cộng đồng cũng không thể dùng đăng ký cùng chuyện thành công để nói đổi mọi thanh niên: người vào vốn thích vận động, vùng thuận giao thông đông hơn, người bỏ cuộc thiếu phỏng vấn sau. Dự án thêm trợ cấp và liên hệ nhóm rời. Cả hai giữ tinh thần ủng hộ/ước mơ nhưng thay nguyên nhân quảng bá bằng bằng chứng quan sát, so sánh và có phạm vi.",
    },
  },
  [ID.compare]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "两种参赛计划怎样比较",
        titleVi: "Hai kế hoạch thi đấu được so sánh thế nào",
        targetVocabularyIds: [V(1063), V(1149), V(1329), V(1725), V(1977)],
        paragraphs: [
          ["两所学校准备参加城市接力赛。甲校计划让最快的四人固定参赛，训练强度高，但所有人都准时到场。乙校的特点是轮换八人，个人速度较低，却能在有人生病时替换。赛前预测只按平均速度，认为甲校一定领先。",
            "Hai trường chuẩn bị dự giải tiếp sức thành phố. Trường A định cố định bốn người nhanh nhất, tập cường độ cao và mọi người đến đúng giờ. Đặc điểm trường B là luân phiên tám người, tốc độ cá nhân thấp hơn nhưng có thể thay khi ai ốm. Dự báo trước giải chỉ theo tốc độ trung bình nên cho A chắc chắn dẫn."],
          ["比赛当天气温很高，甲校第三棒速度下降，没有替补；乙校按计划换上休息充分的队员。甲校前半程更快，乙校后半程更稳定，最后两队时间只差三秒。一个平均值没有表现出体力分配和替补能力。",
            "Ngày thi trời nóng; chặng ba A giảm tốc và không có dự bị, B theo kế hoạch thay người nghỉ đủ. A nhanh hơn nửa đầu, B ổn định hơn nửa sau, cuối cùng chỉ lệch ba giây. Một giá trị trung bình không thể hiện phân bổ thể lực và khả năng dự bị."],
          ["报告分别列最快速度、后半程变化、替补人数和到场纪律。若比赛短且条件稳定，甲校模式可能有优势；若赛程长或缺席风险高，乙校更有弹性。结果来自一次炎热天气，不能宣布轮换永远更好。",
            "Báo cáo liệt kê tốc độ nhanh nhất, thay đổi nửa sau, số dự bị và kỷ luật có mặt. Nếu giải ngắn, điều kiện ổn định, mô hình A có thể lợi; nếu dài hoặc rủi ro vắng cao, B linh hoạt hơn. Kết quả từ một ngày nóng nên chưa tuyên bố luân phiên luôn tốt."],
        ],
        questions: [
          q("main-claim", "Bài đọc so hai kế hoạch theo những chiều nào?", ["Tốc độ, thể lực, dự bị và điều kiện", "Chỉ tốc độ trung bình", "Chỉ số người đến", "Màu đồng phục"], 0, ["rp1", "rp2", "rp3"], "Nguồn giữ nhiều chỉ số và điều kiện."),
          q("supported-detail", "Điều gì xảy ra ở chặng ba của trường A?", ["Tốc độ giảm và không có người thay", "Đến muộn", "Bỏ cuộc trước giải", "Đổi tám người"], 0, ["rp2"], "Đây là biến cố trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao dự báo trung bình bỏ sót lợi thế của B?", ["B có dự bị và ổn định hơn ở nửa sau nóng", "B có tốc độ cá nhân thấp", "Hai đội cùng tham gia", "A đến đúng giờ"], 0, ["rp1", "rp2"], "Cấu trúc đội tương tác với điều kiện trận."),
          q("bounded-inference", "Có thể suy ra khi nào mô hình A phù hợp hơn?", ["Khi giải ngắn và điều kiện ổn định", "Khi nhiều người ốm", "Khi cần thay liên tục", "Trong mọi thời tiết"], 0, ["rp2", "rp3"], "A mạnh tốc độ đầu nhưng ít dự phòng.", "Có thể suy ra phạm vi từ dữ liệu và báo cáo, chưa có nhiều giải để ước lượng chắc chắn."),
          q("scope-limit", "Claim nào vượt nguồn?", ["Hai đội chỉ lệch ba giây", "Luân phiên luôn tốt hơn cố định", "Ngày nóng ảnh hưởng thể lực", "Mục tiêu khác dẫn lựa chọn khác"], 1, ["rp3"], "Nguồn chỉ có một điều kiện thi đấu."),
        ],
        noteMap: map([
          ["fixed", "Đội cố định", "Nhanh đầu nhưng không có người thay.", ["rp1", "rp2"]],
          ["rotation", "Đội luân phiên", "Chậm cá nhân nhưng có dự phòng.", ["rp1", "rp2"]],
          ["weather", "Điều kiện", "Ngày nóng làm thể lực quan trọng hơn.", ["rp2"]],
          ["metrics", "Chỉ số", "Tốc độ, biến thiên, dự bị và kỷ luật.", ["rp3"]],
          ["scope", "Phạm vi", "Một cuộc đua trong thời tiết nóng.", ["rp3"]],
        ], [["weather", "ảnh hưởng mạnh", "fixed"], ["weather", "làm lộ lợi thế", "rotation"], ["metrics", "so sánh", "fixed"], ["scope", "giới hạn", "metrics"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "线上与线下观赛课的差异",
        titleVi: "Khác biệt giữa lớp xem thi đấu online và trực tiếp",
        targetVocabularyIds: [V(1258), V(1508), V(1542), V(1799), V(1941)],
        paragraphs: [
          ["体育馆开设两种观赛分析课：线上课免费，共有一百二十人报名；线下课收费，共三十人。两班都先看比赛录像，再学习拍下关键画面。报名数字让组织者认为线上课效果更好。",
            "Nhà thi đấu mở hai lớp phân tích xem trận: lớp trực tuyến miễn phí có tổng cộng 120 người đăng ký, lớp trực tiếp thu phí có 30 người. Cả hai xem video rồi học chụp khung hình then chốt. Số đăng ký khiến tổ chức cho rằng online hiệu quả hơn."],
          ["四周之后，线上课平均只完成一半任务，线下课完成率较高，而且讨论时间更长。不过线下学员本来就愿意付费，也住得离体育馆更近；两组不能直接当成随机比较。线上录像回看次数高，说明它在时间安排上更方便。",
            "Sau bốn tuần, lớp online trung bình chỉ hoàn thành nửa nhiệm vụ; lớp trực tiếp hoàn thành cao hơn và thảo luận lâu hơn. Nhưng học viên trực tiếp vốn sẵn sàng trả phí và ở gần nhà thi đấu; hai nhóm không phải so ngẫu nhiên. Lượt xem lại video online cao, cho thấy thuận tiện hơn về thời gian."],
          ["下一期将让同一批学员先后体验两种方式，并分别报告完成、讨论、回看和交通成本。当前数据支持线上扩大入口、线下增加持续互动，却不支持用一个“效果”分数排列全部学习价值。",
            "Kỳ sau sẽ cho cùng nhóm trải nghiệm lần lượt hai cách và báo riêng hoàn thành, thảo luận, xem lại, chi phí đi lại. Dữ liệu hiện hỗ trợ online mở rộng lối vào, trực tiếp tăng tương tác liên tục; chưa hỗ trợ dùng một điểm 'hiệu quả' xếp toàn bộ giá trị học."],
        ],
        questions: [
          q("main-claim", "Bài nghe so hai lớp theo cách nào?", ["Tách tiếp cận, hoàn thành, tương tác và chi phí", "Chỉ đếm đăng ký", "Chỉ xem học phí", "Khẳng định online thắng"], 0, ["lp1", "lp2", "lp3"], "Nguồn phân rã khái niệm hiệu quả."),
          q("supported-detail", "Lợi thế thời gian của lớp online thể hiện ở đâu?", ["Lượt xem lại video cao", "Thảo luận dài hơn", "Học viên ở gần", "Có thu phí"], 0, ["lp2"], "Đây là bằng chứng trực tiếp."),
          q("cross-paragraph-evidence", "Vì sao tỷ lệ hoàn thành chưa đủ xếp hai hình thức?", ["Nhóm tự chọn khác nhau và mỗi hình thức mạnh ở một chiều", "Cả hai xem video", "Có 150 người tổng cộng", "Học viên biết chụp"], 0, ["lp2", "lp3"], "Selection và outcome đa chiều cùng giới hạn."),
          q("bounded-inference", "Có thể suy ra lợi ích thiết kế cho cùng nhóm trải nghiệm hai cách?", ["Giảm khác biệt sẵn có giữa hai nhóm", "Bảo đảm mọi người hoàn thành", "Xóa chi phí giao thông", "Làm online thu phí"], 0, ["lp2", "lp3"], "Thiết kế mới đối chiếu trong cùng người.", "Có thể suy ra giảm confound cá nhân, chưa loại được hiệu ứng thứ tự."),
          q("scope-limit", "Claim nào được phép?", ["Online có lối vào rộng hơn trong kỳ này", "Online tốt hơn mọi chiều học tập", "Trực tiếp phù hợp mọi người", "Học phí gây hoàn thành cao"], 0, ["lp1", "lp3"], "Nguồn chỉ hỗ trợ một chiều tiếp cận."),
        ],
        noteMap: map([
          ["online", "Trực tuyến", "Miễn phí, đông và có nhiều lượt xem lại.", ["lp1", "lp2"]],
          ["offline", "Trực tiếp", "Hoàn thành và thảo luận cao hơn.", ["lp1", "lp2"]],
          ["selection", "Tự chọn", "Khác về trả phí và khoảng cách.", ["lp2"]],
          ["design", "Thiết kế mới", "Cùng nhóm trải nghiệm hai hình thức.", ["lp3"]],
          ["outcomes", "Kết quả", "Báo riêng bốn chiều hiệu quả.", ["lp3"]],
        ], [["selection", "giới hạn so sánh", "online"], ["selection", "giới hạn so sánh", "offline"], ["design", "giảm", "selection"], ["outcomes", "so sánh", "online"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán so sánh hai cặp mô hình thể thao; nêu metric, điều kiện, self-selection và thiết kế kiểm tra tiếp.",
      requiredElements: ["đội cố định/luân phiên", "thời tiết nóng", "lớp online/offline", "tự chọn nhóm", "nhiều chỉ số"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "接力赛中，固定四人的队伍前半程快，却在炎热天气下缺少替补；轮换队个人速度较低，后半程更稳定，所以选择要看赛程和缺席风险，不能用一次比赛宣布轮换永远更好。观赛课也有不同优势：线上免费、报名和回看多，线下完成率与讨论较高，但学员在付费意愿和距离上本来不同。下一期让同一批人体验两种方式，可以减少组间差异。两份材料都要求分开报告速度、稳定、参与、互动和成本，而不是用一个平均值排唯一赢家。",
      modelVi: "Trong tiếp sức, đội cố định nhanh nửa đầu nhưng thiếu dự bị dưới trời nóng; đội luân phiên chậm cá nhân mà ổn định nửa sau, nên chọn theo độ dài và rủi ro vắng, không dùng một trận nói luân phiên luôn hơn. Lớp xem trận cũng có lợi thế khác: online miễn phí, đăng ký/xem lại nhiều; trực tiếp hoàn thành và thảo luận cao, nhưng học viên vốn khác về trả phí/khoảng cách. Cho cùng nhóm trải nghiệm cả hai sẽ giảm khác biệt nhóm. Cả hai tài liệu yêu cầu báo riêng tốc độ, ổn định, tham gia, tương tác, chi phí thay vì một trung bình chọn người thắng.",
    },
  },
  [ID.evidence]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "体育名人到访改变了儿童运动吗",
        titleVi: "Chuyến thăm của vận động viên nổi tiếng có đổi vận động trẻ em không",
        targetVocabularyIds: [V(1065), V(1184), V(1219), V(1399), V(1686)],
        paragraphs: [
          ["一名著名运动员到学校操场分享比赛经验，并带儿童完成安全练习。活动后一周，参加课间运动的人数增加三成，校报说名人到访改变了学生习惯。当天没有人受伤，教师也观察到孩子更愿意尝试新项目。",
            "Một vận động viên nổi tiếng đến sân trường chia sẻ kinh nghiệm thi đấu và hướng dẫn trẻ em tập an toàn. Một tuần sau, số người vận động giờ nghỉ tăng ba phần mười; báo trường nói chuyến thăm đổi thói quen. Hôm đó không ai bị thương và giáo viên thấy trẻ sẵn sàng thử môn mới hơn."],
          ["进一步检查发现，学校同周也重新开放了修好的操场，并把体育器材放到容易借的位置。四周后，运动人数仍高于活动前，却低于第一周。没有参加见面会的低年级学生也增加活动，说明环境变化可能共同发挥作用。",
            "Kiểm tra thêm thấy cùng tuần trường mở lại sân đã sửa và đặt dụng cụ ở vị trí dễ mượn. Sau bốn tuần, số vận động vẫn cao hơn trước nhưng thấp hơn tuần đầu. Học sinh nhỏ không dự gặp mặt cũng tăng hoạt động, cho thấy thay đổi môi trường có thể cùng tác động."],
          ["学校把结论改为“名人活动、操场开放和器材便利与增长同时出现”。下一学期将分班安排不同日期的分享，并保持器材政策不变。现有证据支持短期兴趣提升，不足以准确计算名人活动的独立效果。",
            "Trường sửa kết luận thành 'hoạt động người nổi tiếng, mở sân và dụng cụ thuận tiện xuất hiện cùng tăng trưởng'. Học kỳ sau sẽ xếp ngày chia sẻ khác nhau theo lớp và giữ chính sách dụng cụ. Bằng chứng hỗ trợ hứng thú ngắn hạn, chưa đủ tính chính xác tác động riêng của buổi gặp."],
        ],
        questions: [
          q("main-claim", "Bài đọc đánh giá claim thay đổi thói quen thế nào?", ["Giữ tín hiệu tích cực nhưng thêm các thay đổi xảy ra cùng lúc", "Chứng minh người nổi tiếng là nguyên nhân duy nhất", "Bỏ dữ liệu sân trường", "Nói hoạt động gây chấn thương"], 0, ["rp1", "rp2", "rp3"], "Nguồn thêm confound môi trường."),
          q("supported-detail", "Thay đổi môi trường nào xảy ra cùng tuần?", ["Mở lại sân và làm dụng cụ dễ mượn", "Đóng sân", "Thu hồi mọi dụng cụ", "Giảm giờ nghỉ"], 0, ["rp2"], "Đây là hai can thiệp đồng thời."),
          q("cross-paragraph-evidence", "Chi tiết nào làm yếu claim nguyên nhân duy nhất?", ["Nhóm không dự gặp mặt cũng tăng vận động khi sân và dụng cụ đổi", "Không ai bị thương hôm đó", "Vận động viên có kinh nghiệm", "Số tuần là bốn"], 0, ["rp1", "rp2"], "Nhóm ít tiếp xúc vẫn thay đổi."),
          q("bounded-inference", "Có thể suy ra mục đích xếp ngày chia sẻ khác nhau theo lớp?", ["Tạo biến thiên thời điểm để so với nền sân và dụng cụ ổn định", "Bảo đảm mọi trẻ thích thể thao", "Loại bỏ giáo viên", "Tăng chấn thương"], 0, ["rp2", "rp3"], "Thiết kế giữ một số điều kiện chung và thay thời điểm.", "Có thể suy ra mục tiêu tách tác động, chưa phải thử nghiệm ngẫu nhiên hoàn chỉnh."),
          q("scope-limit", "Claim nào phù hợp nhất?", ["Hứng thú vận động tăng ngắn hạn khi nhiều thay đổi cùng xuất hiện", "Một buổi gặp đổi vĩnh viễn mọi trẻ", "Mở sân không có vai trò", "Không ai sẽ bị thương sau này"], 0, ["rp1", "rp3"], "Nguồn giữ thời gian và nhiều nguyên nhân."),
        ],
        noteMap: map([
          ["visit", "Chuyến thăm", "Chia sẻ kinh nghiệm và bài tập an toàn.", ["rp1"]],
          ["outcome", "Kết quả", "Vận động tăng mạnh trong tuần đầu.", ["rp1", "rp2"]],
          ["facility", "Môi trường", "Sân mở lại và dụng cụ dễ mượn.", ["rp2"]],
          ["comparison", "Nhóm gián tiếp", "Học sinh không dự cũng tăng vận động.", ["rp2"]],
          ["next", "Thiết kế tiếp", "Thay ngày chia sẻ, giữ chính sách dụng cụ.", ["rp3"]],
        ], [["visit", "có thể góp vào", "outcome"], ["facility", "có thể góp vào", "outcome"], ["comparison", "làm yếu độc quyền của", "visit"], ["next", "kiểm tra", "visit"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "一段冠军采访可以相信到什么程度",
        titleVi: "Có thể tin một cuộc phỏng vấn nhà vô địch đến mức nào",
        targetVocabularyIds: [V(1111), V(1259), V(1617), V(1868), V(1976)],
        paragraphs: [
          ["纪录片采访一位退役冠军，他答应公开训练日记，并说自己成功主要来自每天四小时练习。编辑希望准确呈现经历，也邀请前队友提供共同记忆。冠军的意见很清楚：天赋重要，但纪律更重要。",
            "Phim tài liệu phỏng vấn một nhà vô địch đã giải nghệ; ông đồng ý công khai nhật ký tập và nói thành công chủ yếu từ bốn giờ tập mỗi ngày. Biên tập muốn trình bày chính xác nên mời đồng đội cũ cung cấp ký ức chung. Ý kiến nhà vô địch rõ: tài năng quan trọng nhưng kỷ luật quan trọng hơn."],
          ["日记显示训练时间在不同年份变化很大，受伤阶段甚至完全停止。两名前队友仍然记得教练调整计划和家庭帮助，但他们对每天具体小时数意见不同。材料支持长期纪律的重要性，不支持每一天都练四小时。",
            "Nhật ký cho thấy giờ tập thay đổi mạnh theo năm, giai đoạn bị thương thậm chí dừng hẳn. Hai đồng đội vẫn nhớ huấn luyện viên đổi kế hoạch và gia đình hỗ trợ, nhưng ý kiến khác nhau về số giờ cụ thể mỗi ngày. Tài liệu hỗ trợ kỷ luật dài hạn, không hỗ trợ ngày nào cũng tập bốn giờ."],
          ["影片最后保留冠军的原话，同时在画面上标出日记范围和记忆差异。观众可以理解个人总结怎样形成，也能看见它不是完整统计。口述经验有解释价值，却需要文件和其他证人限定准确程度。",
            "Phim cuối giữ lời nguyên văn của nhà vô địch, đồng thời ghi phạm vi nhật ký và khác biệt ký ức trên màn hình. Khán giả hiểu tổng kết cá nhân hình thành ra sao và thấy nó không phải thống kê đầy đủ. Kinh nghiệm kể miệng có giá trị giải thích nhưng cần tài liệu và nhân chứng giới hạn độ chính xác."],
        ],
        questions: [
          q("main-claim", "Bài nghe xử lý lời kể nhà vô địch thế nào?", ["Giữ giá trị giải thích và đối chiếu bằng tài liệu cùng nhân chứng", "Loại bỏ toàn bộ lời kể", "Tin chính xác mọi con số", "Chỉ hỏi một đồng đội"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách ý nghĩa khỏi độ chính xác số."),
          q("supported-detail", "Nhật ký cho thấy điều gì ở giai đoạn bị thương?", ["Có lúc dừng tập hoàn toàn", "Vẫn tập bốn giờ mỗi ngày", "Không có huấn luyện viên", "Đổi môn thi đấu"], 0, ["lp2"], "Bằng chứng trực tiếp trái claim tuyệt đối."),
          q("cross-paragraph-evidence", "Điều gì hỗ trợ kỷ luật nhưng giới hạn con số bốn giờ?", ["Nhiều nguồn nhớ nỗ lực dài hạn nhưng nhật ký và ký ức khác về giờ cụ thể", "Nhà vô địch nói rõ", "Có bộ phim", "Gia đình xuất hiện"], 0, ["lp1", "lp2"], "Tính nhất quán khái niệm khác độ chính xác số."),
          q("bounded-inference", "Có thể suy ra vì sao phim giữ nguyên lời kể?", ["Để người xem thấy cách nhân vật tự diễn giải bên cạnh chú thích kiểm chứng", "Để biến lời kể thành thống kê", "Để bỏ nhật ký", "Để đồng đội đồng ý"], 0, ["lp1", "lp3"], "Hình thức trình bày đặt lời kể cạnh giới hạn.", "Có thể suy ra mục tiêu minh bạch diễn giải, chưa biết người xem sẽ hiểu giống nhau."),
          q("scope-limit", "Kết luận nào được hỗ trợ?", ["Kỷ luật dài hạn quan trọng trong câu chuyện này", "Mọi nhà vô địch phải tập đúng bốn giờ mỗi ngày", "Ký ức luôn chính xác hơn nhật ký", "Chấn thương không ảnh hưởng luyện tập"], 0, ["lp2", "lp3"], "Nguồn bác tính đều đặn tuyệt đối."),
        ],
        noteMap: map([
          ["claim", "Lời kể", "Thành công nhờ bốn giờ tập mỗi ngày.", ["lp1"]],
          ["diary", "Nhật ký", "Giờ tập thay đổi và có giai đoạn dừng.", ["lp2"]],
          ["witness", "Đồng đội", "Nhớ kỷ luật nhưng khác con số.", ["lp1", "lp2"]],
          ["supported", "Được hỗ trợ", "Kỷ luật dài hạn có vai trò.", ["lp2"]],
          ["presentation", "Cách trình bày", "Giữ nguyên lời kèm phạm vi bằng chứng.", ["lp3"]],
        ], [["diary", "giới hạn", "claim"], ["witness", "hỗ trợ hẹp", "supported"], ["presentation", "đặt cạnh", "claim"], ["supported", "không đồng nghĩa", "claim"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán đánh giá hai câu chuyện người nổi tiếng; nêu confound, tài liệu đối chiếu, claim được hỗ trợ và thiết kế tiếp.",
      requiredElements: ["chuyến thăm trường", "sân/dụng cụ", "lời kể bốn giờ", "nhật ký/đồng đội", "giới hạn nhân quả/chính xác"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "运动名人到校后，儿童活动人数增加，但同一周操场重新开放、器材也更容易借，没有参加见面会的学生同样增加运动。因此证据支持短期兴趣，却不能准确计算名人活动的独立效果，学校要用不同日期继续比较。退役冠军说每天训练四小时，日记和队友都支持长期纪律，却显示训练时间变化、受伤时还会停止。纪录片保留原话并标明证据范围。两份材料都尊重个人故事的启发作用，同时用环境变化、文件和其他观察者限制因果与数字准确性。",
      modelVi: "Sau khi vận động viên đến trường, số trẻ vận động tăng, nhưng cùng tuần sân mở lại, dụng cụ dễ mượn và học sinh không dự gặp mặt cũng tăng. Bằng chứng hỗ trợ hứng thú ngắn hạn, chưa tính chính xác tác động riêng; trường sẽ so ngày khác nhau. Nhà vô địch nói tập bốn giờ mỗi ngày; nhật ký và đồng đội hỗ trợ kỷ luật dài hạn nhưng cho thấy giờ thay đổi, khi bị thương còn dừng. Phim giữ lời nguyên văn và ghi phạm vi bằng chứng. Cả hai tôn trọng sức gợi của câu chuyện cá nhân nhưng dùng môi trường, tài liệu và người quan sát khác để giới hạn nhân quả cùng độ chính xác số.",
    },
  },
  [ID.viewpoint]: {
    texts: [
      {
        kind: "long-form-reading",
        titleHanzi: "青年排球交流怎样算成功",
        titleVi: "Trao đổi bóng chuyền thanh niên tính thành công thế nào",
        targetVocabularyIds: [V(1073), V(1114), V(1546), V(1587), V(1983)],
        paragraphs: [
          ["两个城市举办青年排球交流，共有六场比赛和四次小组讨论。体育组织把达到胜率目标当成功，教育者关注青年能否更自信地表达，接待家庭则看长期联系。三方使用同一项目，却提出不同结果。",
            "Hai thành phố tổ chức trao đổi bóng chuyền thanh niên gồm sáu trận và bốn thảo luận nhóm. Tổ chức thể thao coi đạt mục tiêu tỷ lệ thắng là thành công, nhà giáo dục chú ý thanh niên có tự tin phát biểu hơn không, gia đình chủ nhà nhìn liên hệ dài hạn. Ba bên dùng cùng dự án nhưng nêu kết quả khác."],
          ["活动结束时，客队赢了四场，问卷中多数青年也表示发言更自信。不过翻译帮助主要集中在正式讨论，晚餐时语言较弱的成员参与较少。胜率和问卷都提高，交流机会却没有平均分配。",
            "Cuối hoạt động, đội khách thắng bốn trận; đa số thanh niên trong khảo sát cũng nói tự tin phát biểu hơn. Tuy nhiên hỗ trợ phiên dịch tập trung ở thảo luận chính thức; lúc ăn tối thành viên yếu ngôn ngữ tham gia ít. Tỷ lệ thắng và khảo sát tăng nhưng cơ hội giao lưu không phân đều."],
          ["下一届将增加双语伙伴和不计分的混合球队，并在三个月后记录联系是否继续。综合评价会分别报告比赛、表达、参与和关系维持。成功不是把不同目标压成一个分数，而是说明哪些群体在哪个维度受益。",
            "Kỳ sau sẽ thêm bạn đồng hành song ngữ và đội hỗn hợp không tính điểm, rồi ghi sau ba tháng liên hệ có tiếp tục không. Đánh giá tổng hợp báo riêng thi đấu, biểu đạt, tham gia và duy trì quan hệ. Thành công không ép mục tiêu khác thành một điểm mà nêu nhóm nào hưởng lợi ở chiều nào."],
        ],
        questions: [
          q("main-claim", "Bài đọc đề xuất cách đánh giá nào?", ["Báo riêng thi đấu, tự tin, tham gia và quan hệ", "Chỉ dùng tỷ lệ thắng", "Chỉ hỏi gia đình", "Trộn thành một điểm"], 0, ["rp1", "rp2", "rp3"], "Nguồn giữ nhiều mục tiêu và nhóm."),
          q("supported-detail", "Nhóm nào tham gia ít hơn trong bữa tối?", ["Thành viên yếu ngôn ngữ", "Đội thắng", "Gia đình chủ nhà", "Người phiên dịch"], 0, ["rp2"], "Đây là khoảng trống tiếp cận."),
          q("cross-paragraph-evidence", "Vì sao thắng nhiều chưa đủ chứng minh trao đổi thành công toàn diện?", ["Mục tiêu gồm biểu đạt/quan hệ và cơ hội không phân đều", "Có sáu trận", "Đội khách thắng bốn", "Có bốn thảo luận"], 0, ["rp1", "rp2"], "Kết quả thi đấu chỉ là một chiều."),
          q("bounded-inference", "Có thể suy ra mục đích đội hỗn hợp không tính điểm?", ["Tạo tương tác hợp tác ngoài cạnh tranh thắng thua", "Bảo đảm mọi người giữ liên hệ", "Tăng tỷ lệ thắng đội khách", "Bỏ bóng chuyền"], 0, ["rp2", "rp3"], "Can thiệp hướng tới phân bố giao lưu.", "Có thể suy ra mục tiêu thiết kế, chưa có dữ liệu kỳ sau để xác nhận hiệu quả."),
          q("scope-limit", "Claim nào quá sớm?", ["Đa số người trả lời báo tự tin hơn", "Bạn đồng hành chắc chắn tạo quan hệ dài hạn", "Cơ hội bữa tối chưa đều", "Cần theo dõi ba tháng"], 1, ["rp3"], "Can thiệp mới chưa được thử."),
        ],
        noteMap: map([
          ["sport", "Thi đấu", "Sáu trận và mục tiêu tỷ lệ thắng.", ["rp1", "rp2"]],
          ["expression", "Biểu đạt", "Tự tin hơn theo bảng hỏi.", ["rp1", "rp2"]],
          ["access", "Tham gia", "Nhóm yếu ngôn ngữ ít trao đổi tự nhiên.", ["rp2"]],
          ["relationship", "Quan hệ", "Cần theo dõi liên hệ sau ba tháng.", ["rp1", "rp3"]],
          ["intervention", "Thiết kế mới", "Bạn song ngữ và đội hỗn hợp.", ["rp3"]],
        ], [["access", "giới hạn", "expression"], ["intervention", "phản hồi", "access"], ["relationship", "mở rộng", "sport"], ["sport", "không thay thế", "expression"]]),
      },
      {
        kind: "long-form-listening",
        titleHanzi: "暑假艺术交流应在线上还是线下",
        titleVi: "Trao đổi nghệ thuật hè nên online hay trực tiếp",
        targetVocabularyIds: [V(1045), V(1332), V(1690), V(1800), V(1870)],
        paragraphs: [
          ["暑假艺术交流原来完全在线下进行，学生共同画壁画并参观工作室。疫情后项目转到线上，参与城市不断增加，偏远学生也能加入。负责人希望继续线上，因为人数多；艺术教师则担心材料触感和自然交流减少。",
            "Trao đổi nghệ thuật hè vốn hoàn toàn trực tiếp: học sinh cùng vẽ tranh tường và thăm xưởng. Sau dịch, dự án chuyển online; thành phố tham gia không ngừng tăng, học sinh xa cũng vào được. Người phụ trách muốn tiếp tục online vì đông, giáo viên nghệ thuật lo cảm giác vật liệu và giao lưu tự nhiên giảm."],
          ["两年数据表明，线上出席率高，作品提交也准时；线下小组的合作时间更长，成员之间继续联系的比例较高。不过线下名额少，而且交通费用排除了部分家庭。两种方式解决不同问题，也制造不同门槛。",
            "Dữ liệu hai năm cho thấy online có tỷ lệ dự cao và nộp tác phẩm đúng hạn; nhóm trực tiếp hợp tác lâu hơn, tỷ lệ tiếp tục liên hệ cao hơn. Nhưng chỗ trực tiếp ít và phí đi lại loại một số gia đình. Hai cách giải quyết vấn đề khác và tạo rào cản khác."],
          ["新方案先在线上介绍主题，再为各地提供小型线下工作坊，不能到场者收到材料包。评价分别记录覆盖、材料体验、合作深度和后续联系。混合模式只是待验证的观点，不应在第一年就被称为唯一正确答案。",
            "Phương án mới giới thiệu chủ đề online trước, rồi cung cấp workshop trực tiếp nhỏ ở từng nơi; người không đến nhận bộ vật liệu. Đánh giá ghi riêng độ phủ, trải nghiệm vật liệu, độ sâu hợp tác và liên hệ sau. Mô hình kết hợp mới là quan điểm cần kiểm, chưa nên gọi đáp án đúng duy nhất ngay năm đầu."],
        ],
        questions: [
          q("main-claim", "Bài nghe tổng hợp hai quan điểm thế nào?", ["Giữ lợi thế tiếp cận của online và chiều sâu của trực tiếp để thử mô hình kết hợp", "Chọn online là đáp án duy nhất", "Đóng mọi workshop", "Chỉ đếm số thành phố"], 0, ["lp1", "lp2", "lp3"], "Nguồn tách ưu điểm, rào cản và thử mới."),
          q("supported-detail", "Rào cản của hoạt động trực tiếp là gì?", ["Chỗ ít và chi phí đi lại", "Không có vật liệu", "Không ai liên lạc", "Nộp luôn muộn"], 0, ["lp2"], "Đoạn hai nêu giới hạn tiếp cận."),
          q("cross-paragraph-evidence", "Vì sao không thể chọn một hình thức chỉ theo số người?", ["Online phủ rộng nhưng trực tiếp có hợp tác và liên hệ sâu hơn", "Cả hai diễn ra hè", "Có tác phẩm nghệ thuật", "Thành phố tăng"], 0, ["lp1", "lp2"], "Các outcome khác nhau không cùng thứ hạng."),
          q("bounded-inference", "Có thể suy ra vai trò của bộ vật liệu gửi về?", ["Giữ một phần trải nghiệm vật liệu cho người không đến workshop", "Bảo đảm hợp tác sâu", "Loại bỏ online", "Giảm số thành phố"], 0, ["lp1", "lp3"], "Thiết kế phản hồi thiếu tiếp xúc vật liệu.", "Có thể suy ra mục tiêu tiếp cận, chưa biết bộ gửi về có tương đương hướng dẫn trực tiếp."),
          q("scope-limit", "Kết luận nào phù hợp?", ["Mô hình kết hợp cần được đánh giá theo nhiều chiều", "Mô hình kết hợp chắc chắn tốt nhất", "Online không tạo tác phẩm", "Trực tiếp phù hợp mọi gia đình"], 0, ["lp3"], "Nguồn gọi đây là phương án chờ kiểm."),
        ],
        noteMap: map([
          ["online", "Trực tuyến", "Phủ rộng và nộp tác phẩm thuận lợi.", ["lp1", "lp2"]],
          ["offline", "Trực tiếp", "Có vật liệu, hợp tác và liên hệ sâu.", ["lp1", "lp2"]],
          ["barrier", "Rào cản", "Chỗ ít và chi phí đi lại.", ["lp2"]],
          ["hybrid", "Kết hợp", "Giới thiệu online với workshop địa phương.", ["lp3"]],
          ["evaluation", "Đánh giá", "Bốn chiều được báo cáo riêng.", ["lp3"]],
        ], [["barrier", "giới hạn", "offline"], ["hybrid", "kết hợp", "online"], ["hybrid", "kết hợp", "offline"], ["evaluation", "kiểm tra", "hybrid"]]),
      },
    ],
    synthesis: {
      promptVi: "Viết 120–220 chữ Hán tổng hợp hai chương trình giao lưu; nêu mục tiêu khác nhau, phân bố cơ hội, phương án kết hợp và giới hạn chưa kiểm.",
      requiredElements: ["bóng chuyền/thảo luận", "nhóm yếu ngôn ngữ", "online/offline nghệ thuật", "rào cản đi lại", "đánh giá nhiều chiều"],
      evidenceRefs: [[0, "rp2"], [0, "rp3"], [1, "lp2"], [1, "lp3"]],
      modelHanzi: "青年排球交流同时追求比赛、表达和长期关系。客队赢了四场，多数问卷也报告更自信，但语言较弱者在非正式晚餐中参与较少，因此下一届要试双语伙伴和混合球队，并跟踪三个月。暑假艺术交流中，线上覆盖广、提交方便，线下却有更深的材料体验与持续联系，同时交通和名额形成门槛。新方案把线上介绍、地方工作坊和材料包结合起来。两个项目都应分别报告谁参加、在哪个目标上受益，并把新设计当作待验证方案，而不是提前宣布全面成功。",
      modelVi: "Trao đổi bóng chuyền cùng theo đuổi thi đấu, biểu đạt và quan hệ lâu dài. Đội khách thắng bốn, đa số khảo sát tự tin hơn, nhưng người yếu ngôn ngữ ít tham gia bữa tối; kỳ sau thử bạn song ngữ, đội hỗn hợp và theo dõi ba tháng. Trao đổi nghệ thuật hè online phủ rộng/nộp thuận, trực tiếp có vật liệu và liên hệ sâu hơn nhưng bị chỗ/đi lại cản. Phương án mới ghép giới thiệu online, workshop địa phương, bộ vật liệu. Cả hai phải báo ai tham gia, lợi ở mục tiêu nào và coi thiết kế mới là giả thuyết cần kiểm, không tuyên bố thành công toàn diện trước dữ liệu.",
    },
  },
};

export const buildHsk4ArtsSportsExchangeLongFormPack = (
  root = process.cwd(),
) =>
  buildHsk4LongFormDomainPack({
    root,
    ...HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_CONFIG,
    lessonIds: HSK4_ARTS_SPORTS_EXCHANGE_LESSON_IDS,
    content: CONTENT,
    vietnameseGlossBySequence: VI_GLOSS_BY_SEQUENCE,
    prerequisitePackBundles: [
      loadHsk4SocietyEconomyLongFormPackBundle(root),
    ],
  });

export const serializeHsk4ArtsSportsExchangeLongFormPack = (
  pack = buildHsk4ArtsSportsExchangeLongFormPack(),
) => serializeHsk4LongFormDomainPack(pack);

const main = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write") && args.has("--check")) {
    throw new Error("Choose one mode");
  }
  const root = process.cwd();
  const path = resolve(
    root,
    HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH,
  );
  const serialized = serializeHsk4ArtsSportsExchangeLongFormPack(
    buildHsk4ArtsSportsExchangeLongFormPack(root),
  );
  if (args.has("--write")) {
    writeFileSync(path, serialized, "utf8");
    console.log(`Wrote ${path}`);
  } else if (args.has("--check")) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`${path} is stale`);
    }
    console.log(
      `${HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH} is current`,
    );
  } else {
    process.stdout.write(serialized);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
