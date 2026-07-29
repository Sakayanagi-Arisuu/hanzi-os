import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "../../src/content/hsk3LessonBlueprints.mjs";
import {
  HSK3_PERSONAL_DOMAIN_PACK_RELATIVE_PATH,
} from "../../src/content/hsk3PersonalDomainPack.mjs";
import {
  assertValidHsk3PersonalParagraphPackBundle,
  loadHsk3PersonalParagraphPackBundle,
} from "../../src/content/hsk3PersonalParagraphPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const DOMAIN_ID = "hsk3-personal-life-narratives";
const LESSON_IDS = [
  `${DOMAIN_ID}-food-shopping`,
  `${DOMAIN_ID}-travel-transport`,
  `${DOMAIN_ID}-health-care`,
  `${DOMAIN_ID}-home-family-leisure`,
];

const VI_GLOSS_BY_SEQUENCE = {
  509: "chuyển nhà",
  515: "no; ăn no",
  519: "bị; được dùng trong câu bị động",
  522: "sổ tay; máy tính xách tay",
  531: "khác; cái khác",
  533: "nhà khách; khách sạn",
  537: "bệnh nhân",
  545: "thực đơn",
  561: "đến muộn",
  562: "xuất phát",
  564: "xuất viện",
  575: "kích thước; lớn nhỏ",
  579: "lo lắng",
  583: "đạt được; nhận được",
  606: "quần đùi; quần ngắn",
  608: "rèn luyện; tập thể dục",
  609: "đối thoại; nói chuyện với nhau",
  631: "vợ chồng",
  633: "gần đây; khu vực lân cận",
  644: "đường sắt cao tốc; tàu cao tốc",
  645: "căn cứ vào; theo",
  662: "sợ; lo sợ",
  663: "rất nhiều",
  664: "rất lâu",
  667: "sông",
  670: "đèn giao thông",
  671: "sau đó; về sau",
  676: "họa sĩ",
  688: "gần như",
  700: "kiểm vé",
  701: "khỏe mạnh; sức khỏe",
  721: "cũ",
  723: "câu",
  729: "vui; vui vẻ",
  730: "xem ra; có vẻ",
  746: "người cao tuổi",
  751: "luyện; tập",
  752: "luyện tập; bài tập",
  754: "lượng từ cho xe cộ",
  758: "hàng xóm",
  759: "du học",
  760: "du học sinh; sinh viên quốc tế",
  762: "ven đường; lề đường",
  763: "ngã đường; giao lộ",
  765: "đường phố",
  782: "khó nghe; không hay",
  792: "đĩa",
  796: "chai; lọ",
  801: "bắt đầu; đứng dậy; lượng từ cho sự việc",
  803: "ô tô; xe hơi",
  820: "ô; dù",
  821: "quét",
  829: "cuộc sống; sinh hoạt",
  830: "tức giận",
  832: "thành phố; thị xã",
  834: "phòng; đơn vị làm việc",
  839: "gầy; chật đối với quần áo",
  847: "tài xế",
  856: "nhảy",
  858: "khá; rất",
  877: "nhà vệ sinh",
  879: "căn phòng; ngôi nhà",
  896: "máy ảnh",
  897: "khu dân cư",
  898: "cẩn thận",
  908: "đi; được; ổn",
  910: "hứng thú; sở thích",
  919: "nuôi; chăm nuôi",
  922: "nhất định; chắc chắn",
  924: "cùng nhau",
  938: "đồ uống",
  943: "du khách",
  944: "trò chơi; chơi",
  948: "có ích; hữu dụng",
  966: "trạm; đứng",
  971: "chăm sóc",
  974: "cho đến",
  986: "cuối tuần",
  989: "nhập viện; nằm viện",
  994: "luôn luôn",
};

const CONTENT = {
  [`${DOMAIN_ID}-food-shopping`]: {
    texts: [
      {
        kind: "graded-reading",
        titleHanzi: "去河边的市买东西",
        titleVi: "Đi mua đồ ở thành phố ven sông",
        lines: [
          ["王丽周末坐高铁去河边的一座城市买东西。",
            "Wáng Lì zhōumò zuò gāotiě qù hébiān de yí zuò chéngshì mǎi dōngxi.",
            "Cuối tuần, Vương Lệ đi tàu cao tốc tới một thành phố ven sông để mua đồ."],
          ["她的相机太旧了，一条短裤也有点儿瘦，穿着不舒服。",
            "Tā de xiàngjī tài jiù le, yì tiáo duǎnkù yě yǒudiǎnr shòu, chuānzhe bù shūfu.",
            "Máy ảnh của cô quá cũ, một chiếc quần đùi cũng hơi chật nên mặc không thoải mái."],
          ["她总是担心买错，所以先比较了三家商店。",
            "Tā zǒngshì dānxīn mǎi cuò, suǒyǐ xiān bǐjiào le sān jiā shāngdiàn.",
            "Cô luôn lo mua nhầm nên đã so sánh ba cửa hàng trước."],
          ["店员说，相机一定要先试，衣服也要看大小。",
            "Diànyuán shuō, xiàngjī yídìng yào xiān shì, yīfu yě yào kàn dàxiǎo.",
            "Nhân viên nói máy ảnh nhất định phải thử trước, quần áo cũng phải xem kích cỡ."],
          ["王丽用新相机拍了几张河边的照片，又试了两条短裤。",
            "Wáng Lì yòng xīn xiàngjī pāi le jǐ zhāng hébiān de zhàopiàn, yòu shì le liǎng tiáo duǎnkù.",
            "Vương Lệ dùng máy ảnh mới chụp vài tấm ảnh ven sông rồi thử hai chiếc quần đùi."],
          ["第一条颜色好看，可是太瘦；第二条大小正合适。",
            "Dì-yī tiáo yánsè hǎokàn, kěshì tài shòu; dì-èr tiáo dàxiǎo zhèng héshì.",
            "Chiếc thứ nhất màu đẹp nhưng quá chật; chiếc thứ hai vừa đúng kích cỡ."],
          ["虽然价格比她想的高一点儿，她还是决定买下来。",
            "Suīrán jiàgé bǐ tā xiǎng de gāo yìdiǎnr, tā háishi juédìng mǎi xiàlai.",
            "Dù giá cao hơn cô nghĩ một chút, cô vẫn quyết định mua."],
          ["回家的高铁上，她看着照片，心里很开心。",
            "Huí jiā de gāotiě shàng, tā kànzhe zhàopiàn, xīnli hěn kāixīn.",
            "Trên tàu cao tốc về nhà, cô ngắm ảnh và cảm thấy rất vui."],
        ],
        questions: [
          ["main-idea", "Đoạn đọc chủ yếu kể việc gì?",
            ["Vương Lệ so sánh và mua máy ảnh, quần đùi", "Vương Lệ đi làm ở thành phố", "Vương Lệ học chụp ảnh trên tàu", "Vương Lệ trả lại quần áo"], 0,
            "Toàn đoạn theo quá trình đi mua, so sánh, thử và quyết định."],
          ["detail", "Vì sao Vương Lệ so sánh ba cửa hàng?",
            ["Cô muốn tìm nhà hàng", "Cô luôn lo mua nhầm", "Tàu đến muộn", "Cô không mang tiền"], 1,
            "Câu 3 nêu trực tiếp cô lo mua nhầm."],
          ["detail", "Chiếc quần đùi thứ hai thế nào?",
            ["Màu đẹp nhưng chật", "Quá cũ", "Vừa đúng kích cỡ", "Giá rẻ nhất"], 2,
            "Câu 6 nói chiếc thứ hai có kích cỡ phù hợp."],
          ["sequence", "Vương Lệ làm gì trước khi quyết định mua?",
            ["Chụp ảnh và thử quần", "Đi về nhà", "Gọi người bán", "Đổi vé tàu"], 0,
            "Câu 5–7 cho thấy cô thử sản phẩm trước khi quyết định."],
          ["simple-inference", "Có thể suy ra Vương Lệ coi trọng điều gì khi mua đồ?",
            ["Chỉ chọn giá thấp", "Thử và so sánh trước", "Chỉ mua đồ cũ", "Không nghe nhân viên"], 1,
            "Cô so sánh cửa hàng, thử máy và kiểm tra kích cỡ."],
        ],
        noteFields: [
          ["need", "Đồ cần thay", "Máy ảnh cũ và quần đùi chật"],
          ["method", "Cách chọn", "So sánh cửa hàng rồi thử sản phẩm"],
          ["choice", "Lựa chọn", "Máy ảnh mới và chiếc quần vừa kích cỡ"],
          ["feeling", "Cảm xúc", "Vui khi xem ảnh trên tàu về"],
        ],
        summary: {
          skill: "writing",
          promptVi: "Dùng 先、又、虽然…还是… để tóm tắt chuyến mua sắm trong 4–5 câu.",
          requiredElements: ["lý do mua", "cách so sánh", "quyết định", "cảm xúc"],
          modelHanzi: "王丽的相机太旧，短裤也太瘦，所以她去买新的。她先比较商店，又试了相机和短裤。虽然价格高一点儿，她还是买了合适的东西。回家的路上，她很开心。",
          modelPinyin: "Wáng Lì de xiàngjī tài jiù, duǎnkù yě tài shòu, suǒyǐ tā qù mǎi xīn de. Tā xiān bǐjiào shāngdiàn, yòu shì le xiàngjī hé duǎnkù. Suīrán jiàgé gāo yìdiǎnr, tā háishi mǎi le héshì de dōngxi. Huí jiā de lùshang, tā hěn kāixīn.",
          modelVi: "Máy ảnh của Vương Lệ quá cũ và quần đùi quá chật nên cô đi mua đồ mới. Cô so sánh cửa hàng trước rồi thử máy ảnh và quần. Dù giá hơi cao, cô vẫn mua đồ phù hợp. Trên đường về cô rất vui.",
        },
      },
      {
        kind: "graded-listening",
        titleHanzi: "菜单上的小问题",
        titleVi: "Một vấn đề nhỏ trên thực đơn",
        lines: [
          ["从这家店开门起，张经理每天都检查菜单和盘子。",
            "Cóng zhè jiā diàn kāimén qǐ, Zhāng jīnglǐ měitiān dōu jiǎnchá càidān hé pánzi.",
            "Từ khi quán mở cửa, quản lý Trương kiểm tra thực đơn và đĩa mỗi ngày."],
          ["今天一位客人点了菜和饮料，还说自己已经挺饱了。",
            "Jīntiān yí wèi kèrén diǎn le cài hé yǐnliào, hái shuō zìjǐ yǐjīng tǐng bǎo le.",
            "Hôm nay một vị khách gọi món và đồ uống, còn nói mình đã khá no."],
          ["她害怕吃得太多，只想要一个小盘子。",
            "Tā hàipà chī de tài duō, zhǐ xiǎng yào yí ge xiǎo pánzi.",
            "Cô sợ ăn quá nhiều nên chỉ muốn một chiếc đĩa nhỏ."],
          ["服务员很照顾她，把一份菜分成了两小盘。",
            "Fúwùyuán hěn zhàogù tā, bǎ yí fèn cài fēnchéng le liǎng xiǎo pán.",
            "Nhân viên phục vụ rất chu đáo, chia một phần món ăn thành hai đĩa nhỏ."],
          ["可是客人听见店里的音乐以后，觉得有点儿难听。",
            "Kěshì kèrén tīngjiàn diàn lǐ de yīnyuè yǐhòu, juéde yǒudiǎnr nántīng.",
            "Nhưng sau khi nghe nhạc trong quán, khách thấy hơi khó nghe."],
          ["张经理有些担心，马上把声音调小了。",
            "Zhāng jīnglǐ yǒuxiē dānxīn, mǎshàng bǎ shēngyīn tiáo xiǎo le.",
            "Quản lý Trương hơi lo và lập tức giảm âm lượng."],
          ["客人吃完以后不但不害怕变胖，而且说饮料很好喝。",
            "Kèrén chī wán yǐhòu bùdàn bú hàipà biàn pàng, érqiě shuō yǐnliào hěn hǎohē.",
            "Ăn xong, khách không những không lo béo mà còn nói đồ uống rất ngon."],
          ["张经理明白了，照顾客人的感受一定比只看菜单更重要。",
            "Zhāng jīnglǐ míngbai le, zhàogù kèrén de gǎnshòu yídìng bǐ zhǐ kàn càidān gèng zhòngyào.",
            "Quản lý Trương hiểu rằng quan tâm cảm nhận của khách chắc chắn quan trọng hơn chỉ nhìn thực đơn."],
        ],
        questions: [
          ["main-idea", "Bài nghe chủ yếu nói về điều gì?",
            ["Cách quản lý và nhân viên đáp ứng nhu cầu của khách", "Cách nấu một món mới", "Một nhân viên làm vỡ đĩa", "Một khách muốn mua thực đơn"], 0,
            "Các chi tiết đều xoay quanh điều chỉnh phần ăn và âm nhạc theo khách."],
          ["detail", "Vì sao khách muốn đĩa nhỏ?",
            ["Cô đã khá no và sợ ăn nhiều", "Đĩa lớn bị bẩn", "Cô không gọi món", "Cô muốn mang về"], 0,
            "Câu 2–3 nêu cô đã no và sợ ăn quá nhiều."],
          ["detail", "Nhân viên đã làm gì?",
            ["Đổi đồ uống", "Chia món thành hai đĩa nhỏ", "Tắt nhạc", "Thay thực đơn"], 1,
            "Câu 4 nói nhân viên chia một phần thành hai đĩa."],
          ["sequence", "Sau khi khách nói nhạc khó nghe, chuyện gì xảy ra?",
            ["Quản lý giảm âm lượng", "Khách rời quán", "Nhân viên đổi bàn", "Quản lý tăng giá"], 0,
            "Câu 6 nêu quản lý lập tức giảm âm lượng."],
          ["simple-inference", "Bài nghe cho thấy dịch vụ tốt cần điều gì?",
            ["Giữ mọi thứ không thay đổi", "Chú ý cảm nhận cụ thể của khách", "Chỉ giới thiệu món đắt", "Mở nhạc thật lớn"], 1,
            "Câu cuối rút ra việc chăm sóc cảm nhận quan trọng."],
        ],
        noteFields: [
          ["request", "Yêu cầu của khách", "Phần nhỏ vì đã khá no"],
          ["foodAction", "Cách xử lý món", "Chia thành hai đĩa nhỏ"],
          ["soundProblem", "Vấn đề khác", "Âm nhạc hơi khó nghe"],
          ["lesson", "Bài học", "Quan tâm cảm nhận khách hơn chỉ nhìn thực đơn"],
        ],
        summary: {
          skill: "speaking",
          promptVi: "Kể lại hai vấn đề của khách và cách quán xử lý trong 45–60 giây.",
          requiredElements: ["khách đã no", "chia phần ăn", "âm nhạc", "bài học dịch vụ"],
          modelHanzi: "一位客人已经挺饱了，所以只想要小盘子。服务员把一份菜分成两小盘。客人又觉得音乐有点儿难听，经理就把声音调小了。经理明白，服务要照顾客人的感受。",
          modelPinyin: "Yí wèi kèrén yǐjīng tǐng bǎo le, suǒyǐ zhǐ xiǎng yào xiǎo pánzi. Fúwùyuán bǎ yí fèn cài fēnchéng liǎng xiǎo pán. Kèrén yòu juéde yīnyuè yǒudiǎnr nántīng, jīnglǐ jiù bǎ shēngyīn tiáo xiǎo le. Jīnglǐ míngbai, fúwù yào zhàogù kèrén de gǎnshòu.",
          modelVi: "Một vị khách đã khá no nên chỉ muốn đĩa nhỏ. Nhân viên chia một phần thành hai đĩa nhỏ. Khách lại thấy nhạc hơi khó nghe nên quản lý giảm âm lượng. Quản lý hiểu dịch vụ cần quan tâm cảm nhận của khách.",
        },
      },
    ],
  },
  [`${DOMAIN_ID}-travel-transport`]: {
    texts: [
      {
        kind: "graded-reading",
        titleHanzi: "留学生的第一次远行",
        titleVi: "Chuyến đi xa đầu tiên của một du học sinh",
        lines: [
          ["小安是留学生，来中国留学已经半年了。",
            "Xiǎo Ān shì liúxuéshēng, lái Zhōngguó liúxué yǐjīng bànnián le.",
            "Tiểu An là du học sinh và đã tới Trung Quốc du học được nửa năm."],
          ["他好久没有旅行，就在笔记本上写下周末计划。",
            "Tā hǎojiǔ méiyǒu lǚxíng, jiù zài bǐjìběn shàng xiěxia zhōumò jìhuà.",
            "Đã lâu anh không đi du lịch nên ghi kế hoạch cuối tuần vào sổ tay."],
          ["根据网上的信息，他要先坐汽车到火车站，再检票上车。",
            "Gēnjù wǎngshàng de xìnxī, tā yào xiān zuò qìchē dào huǒchēzhàn, zài jiǎnpiào shàng chē.",
            "Theo thông tin trên mạng, anh cần đi ô tô tới ga rồi kiểm vé lên tàu."],
          ["出发那天，一辆汽车在红绿灯前被别的车挡住了。",
            "Chūfā nà tiān, yí liàng qìchē zài hóng-lǜdēng qián bèi bié de chē dǎngzhù le.",
            "Ngày xuất phát, một chiếc ô tô bị xe khác chắn trước đèn giao thông."],
          ["司机说这样等下去不行，就换了一条路。",
            "Sījī shuō zhèyàng děng xiàqu bù xíng, jiù huàn le yì tiáo lù.",
            "Tài xế nói chờ như vậy không ổn nên đổi sang đường khác."],
          ["小安还是迟到了，跑到车站时已经开始检票。",
            "Xiǎo Ān háishi chídào le, pǎo dào chēzhàn shí yǐjīng kāishǐ jiǎnpiào.",
            "Tiểu An vẫn đến muộn; khi chạy tới ga thì đã bắt đầu kiểm vé."],
          ["后来工作人员让他先出示车票，再从旁边的入口进去。",
            "Hòulái gōngzuò rényuán ràng tā xiān chūshì chēpiào, zài cóng pángbiān de rùkǒu jìnqu.",
            "Sau đó nhân viên yêu cầu anh xuất trình vé rồi vào từ lối bên cạnh."],
          ["虽然有点儿紧张，他最后还是顺利出发了。",
            "Suīrán yǒudiǎnr jǐnzhāng, tā zuìhòu háishi shùnlì chūfā le.",
            "Dù hơi căng thẳng, cuối cùng anh vẫn xuất phát thuận lợi."],
        ],
        questions: [
          ["main-idea", "Đoạn đọc kể về việc gì?",
            ["Một du học sinh xử lý việc đến ga muộn", "Một tài xế học ở nước ngoài", "Một nhân viên làm mất vé", "Một chuyến đi bị hủy"], 0,
            "Đoạn theo kế hoạch, tắc đường, đến muộn và lên tàu."],
          ["detail", "Tiểu An viết gì vào sổ tay?",
            ["Danh sách lớp học", "Kế hoạch cuối tuần", "Số điện thoại tài xế", "Tên các du khách"], 1,
            "Câu 2 nói anh ghi kế hoạch cuối tuần."],
          ["cause-effect", "Vì sao tài xế đổi đường?",
            ["Xe bị chắn ở đèn giao thông", "Tiểu An muốn ngắm cảnh", "Ga đổi lối vào", "Xe hết xăng"], 0,
            "Câu 4–5 nối việc bị chắn với quyết định đổi đường."],
          ["sequence", "Nhân viên yêu cầu Tiểu An làm gì trước?",
            ["Vào lối bên cạnh", "Xuất trình vé", "Mua sổ tay", "Gọi tài xế"], 1,
            "Câu 7 dùng 先 để nêu xuất trình vé trước."],
          ["simple-inference", "Tâm trạng cuối đoạn của Tiểu An có thể là gì?",
            ["Nhẹ nhõm vì vẫn kịp đi", "Tức giận vì không được đi", "Buồn vì mất sổ", "Sợ tiếp tục du học"], 0,
            "Anh căng thẳng nhưng cuối cùng xuất phát thuận lợi."],
        ],
        noteFields: [
          ["plan", "Kế hoạch", "Ô tô tới ga rồi kiểm vé lên tàu"],
          ["delay", "Nguyên nhân chậm", "Xe bị chắn ở đèn giao thông"],
          ["solution", "Cách xử lý", "Đổi đường và xuất trình vé"],
          ["result", "Kết quả", "Vẫn xuất phát thuận lợi"],
        ],
        summary: {
          skill: "writing",
          promptVi: "Dùng 根据、被、后来、虽然…还是… để viết lại chuyến đi trong 4–5 câu.",
          requiredElements: ["kế hoạch", "tắc đường", "kiểm vé", "kết quả"],
          modelHanzi: "根据网上的信息，小安要坐汽车去火车站。路上汽车被别的车挡住了，所以他迟到了。后来工作人员让他出示车票。虽然很紧张，他还是顺利出发了。",
          modelPinyin: "Gēnjù wǎngshàng de xìnxī, Xiǎo Ān yào zuò qìchē qù huǒchēzhàn. Lùshang qìchē bèi bié de chē dǎngzhù le, suǒyǐ tā chídào le. Hòulái gōngzuò rényuán ràng tā chūshì chēpiào. Suīrán hěn jǐnzhāng, tā háishi shùnlì chūfā le.",
          modelVi: "Theo thông tin trên mạng, Tiểu An cần đi ô tô tới ga. Trên đường, xe bị xe khác chắn nên anh đến muộn. Sau đó nhân viên yêu cầu anh xuất trình vé. Dù rất căng thẳng, anh vẫn xuất phát thuận lợi.",
        },
      },
      {
        kind: "graded-listening",
        titleHanzi: "游客在路口问路",
        titleVi: "Du khách hỏi đường ở giao lộ",
        lines: [
          ["两位游客站在马路边，看着地图却找不到宾馆。",
            "Liǎng wèi yóukè zhàn zài mǎlùbiān, kànzhe dìtú què zhǎobudào bīnguǎn.",
            "Hai du khách đứng ven đường, nhìn bản đồ nhưng không tìm thấy khách sạn."],
          ["他们走到一个路口，发现路边没有站牌。",
            "Tāmen zǒu dào yí ge lùkǒu, fāxiàn lùbiān méiyǒu zhànpái.",
            "Họ đi tới một giao lộ và thấy ven đường không có biển trạm."],
          ["一位司机停下汽车，问他们要去哪儿。",
            "Yí wèi sījī tíngxià qìchē, wèn tāmen yào qù nǎr.",
            "Một tài xế dừng ô tô và hỏi họ muốn đi đâu."],
          ["游客说，他们根据地图走了好久，还是没看见宾馆。",
            "Yóukè shuō, tāmen gēnjù dìtú zǒu le hǎojiǔ, háishi méi kànjiàn bīnguǎn.",
            "Du khách nói họ đi theo bản đồ đã lâu nhưng vẫn chưa thấy khách sạn."],
          ["司机告诉他们，过了前面的红绿灯，右边就是汽车站。",
            "Sījī gàosu tāmen, guò le qiánmiàn de hóng-lǜdēng, yòubian jiù shì qìchēzhàn.",
            "Tài xế nói qua đèn giao thông phía trước, bên phải là bến xe."],
          ["从车站再走五分钟，宾馆就在第二个路口附近。",
            "Cóng chēzhàn zài zǒu wǔ fēnzhōng, bīnguǎn jiù zài dì-èr ge lùkǒu fùjìn.",
            "Từ bến xe đi thêm năm phút, khách sạn ở gần giao lộ thứ hai."],
          ["一辆公共汽车来了，司机说坐这辆车也行。",
            "Yí liàng gōnggòng qìchē lái le, sījī shuō zuò zhè liàng chē yě xíng.",
            "Một chiếc xe buýt tới; tài xế nói đi chiếc này cũng được."],
          ["游客谢过司机，后来决定走路去，也顺便看看城市。",
            "Yóukè xièguo sījī, hòulái juédìng zǒulù qù, yě shùnbiàn kànkan chéngshì.",
            "Du khách cảm ơn tài xế rồi quyết định đi bộ để tiện ngắm thành phố."],
        ],
        questions: [
          ["main-idea", "Bài nghe nói về tình huống nào?",
            ["Du khách hỏi và nhận chỉ đường tới khách sạn", "Tài xế sửa xe ở ven đường", "Du khách mua vé tàu", "Khách sạn chuyển thành bến xe"], 0,
            "Cuộc hội thoại tập trung vào tìm đường và lựa chọn cách đi."],
          ["detail", "Hai du khách gặp vấn đề gì?",
            ["Không tìm thấy khách sạn", "Không có bản đồ", "Làm mất hành lý", "Đến ga quá sớm"], 0,
            "Câu đầu nói họ có bản đồ nhưng không tìm thấy khách sạn."],
          ["detail", "Bến xe ở đâu?",
            ["Bên trái giao lộ thứ hai", "Bên phải sau đèn giao thông", "Cạnh khách sạn", "Trước con sông"], 1,
            "Câu 5 mô tả vị trí bên phải sau đèn giao thông."],
          ["sequence", "Từ bến xe cần làm gì để tới khách sạn?",
            ["Đi thêm năm phút", "Bắt tàu cao tốc", "Quay lại đèn giao thông", "Đợi tài xế"], 0,
            "Câu 6 nói đi thêm năm phút."],
          ["simple-inference", "Vì sao du khách chọn đi bộ?",
            ["Họ muốn tiện ngắm thành phố", "Xe buýt không chạy", "Tài xế không đồng ý", "Khách sạn rất xa"], 0,
            "Câu cuối nói rõ họ đi bộ để tiện xem thành phố."],
        ],
        noteFields: [
          ["start", "Điểm xuất phát", "Giao lộ không có biển trạm"],
          ["landmark", "Mốc đầu", "Đèn giao thông và bến xe bên phải"],
          ["destination", "Đích", "Gần giao lộ thứ hai, cách bến xe năm phút"],
          ["choice", "Lựa chọn", "Đi bộ để ngắm thành phố"],
        ],
        summary: {
          skill: "speaking",
          promptVi: "Dựa vào các mốc đường, chỉ lại đường cho du khách trong 45–60 giây.",
          requiredElements: ["đèn giao thông", "bến xe", "giao lộ thứ hai", "lựa chọn đi bộ"],
          modelHanzi: "游客在路口找不到宾馆，就问了一位司机。司机说先过红绿灯，右边是汽车站。从车站走五分钟，宾馆就在第二个路口附近。游客后来决定走路去。",
          modelPinyin: "Yóukè zài lùkǒu zhǎobudào bīnguǎn, jiù wèn le yí wèi sījī. Sījī shuō xiān guò hóng-lǜdēng, yòubian shì qìchēzhàn. Cóng chēzhàn zǒu wǔ fēnzhōng, bīnguǎn jiù zài dì-èr ge lùkǒu fùjìn. Yóukè hòulái juédìng zǒulù qù.",
          modelVi: "Du khách không tìm thấy khách sạn ở giao lộ nên hỏi một tài xế. Tài xế nói qua đèn giao thông trước, bên phải là bến xe. Từ bến xe đi năm phút, khách sạn ở gần giao lộ thứ hai. Sau đó du khách quyết định đi bộ.",
        },
      },
    ],
  },
  [`${DOMAIN_ID}-health-care`]: {
    texts: [
      {
        kind: "graded-reading",
        titleHanzi: "画家出院以后",
        titleVi: "Sau khi họa sĩ xuất viện",
        lines: [
          ["一位画家下雨天带着伞去公园画画，不小心摔倒了。",
            "Yí wèi huàjiā xiàyǔ tiān dàizhe sǎn qù gōngyuán huàhuà, bù xiǎoxīn shuāidǎo le.",
            "Một họa sĩ mang ô tới công viên vẽ vào ngày mưa và không cẩn thận bị ngã."],
          ["他的腿受了伤，水瓶子也被摔坏了，只好住院。",
            "Tā de tuǐ shòu le shāng, shuǐ píngzi yě bèi shuāihuài le, zhǐhǎo zhùyuàn.",
            "Chân ông bị thương, chai nước cũng vỡ nên ông phải nhập viện."],
          ["住院的时候，他得到好多病人和医生的照顾。",
            "Zhùyuàn de shíhou, tā dédào hǎoduō bìngrén hé yīshēng de zhàogù.",
            "Trong thời gian nằm viện, ông nhận được sự chăm sóc của nhiều bệnh nhân và bác sĩ."],
          ["他一直问什么时候能出院，还想知道有没有别的治疗方法。",
            "Tā yìzhí wèn shénme shíhou néng chūyuàn, hái xiǎng zhīdào yǒu méiyǒu bié de zhìliáo fāngfǎ.",
            "Ông luôn hỏi khi nào được xuất viện và muốn biết có phương pháp điều trị khác không."],
          ["医生让他先休息，直到腿不疼了再慢慢练习走路。",
            "Yīshēng ràng tā xiān xiūxi, zhídào tuǐ bù téng le zài mànmàn liànxí zǒulù.",
            "Bác sĩ bảo ông nghỉ trước, tới khi chân hết đau rồi mới từ từ tập đi."],
          ["出院以后，他每天锻炼，但是每次都很小心。",
            "Chūyuàn yǐhòu, tā měitiān duànliàn, dànshì měi cì dōu hěn xiǎoxīn.",
            "Sau khi xuất viện, ông tập thể dục hằng ngày nhưng lần nào cũng rất cẩn thận."],
          ["这些练习对恢复健康挺有用，他走得越来越稳。",
            "Zhèxiē liànxí duì huīfù jiànkāng tǐng yǒuyòng, tā zǒu de yuèláiyuè wěn.",
            "Những bài tập này khá hữu ích cho việc hồi phục sức khỏe và ông đi ngày càng vững."],
          ["后来他又去公园画画，这次带了一个不会摔坏的瓶子。",
            "Hòulái tā yòu qù gōngyuán huàhuà, zhè cì dài le yí ge bú huì shuāihuài de píngzi.",
            "Sau đó ông lại tới công viên vẽ, lần này mang một chiếc chai không dễ vỡ."],
        ],
        questions: [
          ["main-idea", "Đoạn đọc chủ yếu nói về điều gì?",
            ["Một họa sĩ bị thương và hồi phục sau khi xuất viện", "Một họa sĩ bán tranh trong bệnh viện", "Bác sĩ học vẽ ở công viên", "Một bệnh nhân làm mất ô"], 0,
            "Đoạn đi từ tai nạn, nằm viện tới luyện tập hồi phục."],
          ["cause-effect", "Vì sao họa sĩ phải nhập viện?",
            ["Ông bị ngã và đau chân", "Ông quên chai nước", "Ông muốn gặp bệnh nhân", "Trời quá nóng"], 0,
            "Câu 1–2 nói ông ngã, chân bị thương nên nhập viện."],
          ["detail", "Bác sĩ dặn ông khi nào mới tập đi?",
            ["Ngay khi nhập viện", "Khi chân không còn đau", "Sau khi mua chai mới", "Trước khi trời mưa"], 1,
            "Câu 5 nói đợi tới khi chân hết đau."],
          ["detail", "Điều gì giúp ông đi vững hơn?",
            ["Các bài luyện tập", "Chiếc ô", "Việc vẽ tranh", "Một chai nước"], 0,
            "Câu 7 nói các bài tập hữu ích cho hồi phục."],
          ["simple-inference", "Lần sau họa sĩ đã thay đổi điều gì?",
            ["Chuẩn bị đồ khó vỡ hơn", "Không mang nước", "Không nghe bác sĩ", "Ngừng vẽ hoàn toàn"], 0,
            "Câu cuối nêu ông mang chai không dễ vỡ."],
        ],
        noteFields: [
          ["accident", "Tai nạn", "Ngã khi mang ô đi vẽ"],
          ["hospital", "Ở bệnh viện", "Được bác sĩ và bệnh nhân chăm sóc"],
          ["advice", "Lời dặn", "Hết đau rồi mới tập đi từ từ"],
          ["recovery", "Kết quả", "Tập hằng ngày và đi ngày càng vững"],
        ],
        summary: {
          skill: "writing",
          promptVi: "Dùng 只好、直到…再…、以后、越来越 để tóm tắt quá trình hồi phục.",
          requiredElements: ["tai nạn", "nằm viện", "lời dặn", "hồi phục"],
          modelHanzi: "画家在公园摔倒了，只好住院。医生让他直到腿不疼了再练习走路。出院以后，他每天小心地锻炼。练习很有用，他走得越来越稳。",
          modelPinyin: "Huàjiā zài gōngyuán shuāidǎo le, zhǐhǎo zhùyuàn. Yīshēng ràng tā zhídào tuǐ bù téng le zài liànxí zǒulù. Chūyuàn yǐhòu, tā měitiān xiǎoxīn de duànliàn. Liànxí hěn yǒuyòng, tā zǒu de yuèláiyuè wěn.",
          modelVi: "Họa sĩ ngã ở công viên nên phải nhập viện. Bác sĩ bảo đợi tới khi chân hết đau rồi mới tập đi. Sau khi xuất viện, ông tập luyện cẩn thận mỗi ngày. Bài tập rất hữu ích và ông đi ngày càng vững.",
        },
      },
      {
        kind: "graded-listening",
        titleHanzi: "一块儿练得更健康",
        titleVi: "Cùng tập để khỏe hơn",
        lines: [
          ["社区里有一个健康练习班，每天早上大家一块儿锻炼。",
            "Shèqū lǐ yǒu yí ge jiànkāng liànxí bān, měitiān zǎoshang dàjiā yíkuàir duànliàn.",
            "Trong cộng đồng có một lớp luyện sức khỏe; mỗi sáng mọi người cùng tập."],
          ["老师先让大家练走路，再练轻轻地跳。",
            "Lǎoshī xiān ràng dàjiā liàn zǒulù, zài liàn qīngqīng de tiào.",
            "Giáo viên cho mọi người tập đi trước rồi tập nhảy nhẹ."],
          ["一位刚出院的病人说，自己还不敢跳。",
            "Yí wèi gāng chūyuàn de bìngrén shuō, zìjǐ hái bù gǎn tiào.",
            "Một bệnh nhân vừa xuất viện nói mình vẫn chưa dám nhảy."],
          ["老师告诉他，可以做别的练习，不必跟大家完全一样。",
            "Lǎoshī gàosu tā, kěyǐ zuò bié de liànxí, búbì gēn dàjiā wánquán yíyàng.",
            "Giáo viên nói ông có thể làm bài tập khác, không cần hoàn toàn giống mọi người."],
          ["旁边的人给他一个装水的瓶子，还提醒他小心。",
            "Pángbiān de rén gěi tā yí ge zhuāng shuǐ de píngzi, hái tíxǐng tā xiǎoxīn.",
            "Người bên cạnh đưa ông một chiếc chai đựng nước và nhắc ông cẩn thận."],
          ["他从慢慢走开始，练了好多天，觉得方法挺有用。",
            "Tā cóng mànmàn zǒu kāishǐ, liàn le hǎoduō tiān, juéde fāngfǎ tǐng yǒuyòng.",
            "Ông bắt đầu bằng đi chậm, tập nhiều ngày và thấy phương pháp khá hữu ích."],
          ["直到这个周末，他才第一次跟大家一块儿跳了几下。",
            "Zhídào zhège zhōumò, tā cái dì-yī cì gēn dàjiā yíkuàir tiào le jǐ xià.",
            "Mãi tới cuối tuần này, lần đầu ông mới nhảy vài cái cùng mọi người."],
          ["他很开心，也明白健康需要合适的练习，不能着急。",
            "Tā hěn kāixīn, yě míngbai jiànkāng xūyào héshì de liànxí, bù néng zháojí.",
            "Ông rất vui và hiểu sức khỏe cần bài tập phù hợp, không thể nóng vội."],
        ],
        questions: [
          ["main-idea", "Bài nghe chủ yếu nói về điều gì?",
            ["Một bệnh nhân tập dần theo khả năng", "Một giáo viên phải nhập viện", "Cộng đồng tổ chức thi nhảy", "Một người làm mất chai nước"], 0,
            "Diễn biến tập trung vào việc điều chỉnh bài tập và tiến bộ dần."],
          ["detail", "Vì sao bệnh nhân chưa dám nhảy?",
            ["Ông vừa xuất viện", "Ông không thích lớp", "Ông không có giày", "Giáo viên không cho phép"], 0,
            "Câu 3 nêu ông vừa xuất viện."],
          ["detail", "Giáo viên khuyên điều gì?",
            ["Phải tập giống hệt mọi người", "Có thể làm bài tập khác phù hợp", "Chỉ uống nước", "Ngừng tập tới năm sau"], 1,
            "Câu 4 nói ông có thể chọn bài tập khác."],
          ["sequence", "Ông bắt đầu bằng hoạt động nào?",
            ["Đi chậm", "Nhảy cao", "Chạy nhanh", "Vẽ tranh"], 0,
            "Câu 6 nói ông bắt đầu từ đi chậm."],
          ["simple-inference", "Bài nghe truyền đạt quan niệm sức khỏe nào?",
            ["Cần tiến dần với bài tập phù hợp", "Càng tập nhanh càng tốt", "Ai cũng phải tập giống nhau", "Chỉ tập vào cuối tuần"], 0,
            "Câu cuối nhấn mạnh phù hợp và không nóng vội."],
        ],
        noteFields: [
          ["condition", "Tình trạng", "Vừa xuất viện, chưa dám nhảy"],
          ["adaptation", "Điều chỉnh", "Làm bài khác và bắt đầu đi chậm"],
          ["support", "Hỗ trợ", "Nước, lời nhắc và giáo viên hướng dẫn"],
          ["progress", "Tiến bộ", "Cuối tuần có thể nhảy vài cái"],
        ],
        summary: {
          skill: "speaking",
          promptVi: "Kể lại quá trình tập từ lúc chưa dám nhảy tới khi tham gia được.",
          requiredElements: ["vừa xuất viện", "bài tập thay thế", "luyện nhiều ngày", "kết quả"],
          modelHanzi: "一位病人刚出院，还不敢跳。老师让他先做别的练习，他就从慢慢走开始。练了好多天以后，他觉得这个方法很有用。到了周末，他终于能跟大家一块儿跳几下了。",
          modelPinyin: "Yí wèi bìngrén gāng chūyuàn, hái bù gǎn tiào. Lǎoshī ràng tā xiān zuò bié de liànxí, tā jiù cóng mànmàn zǒu kāishǐ. Liàn le hǎoduō tiān yǐhòu, tā juéde zhège fāngfǎ hěn yǒuyòng. Dào le zhōumò, tā zhōngyú néng gēn dàjiā yíkuàir tiào jǐ xià le.",
          modelVi: "Một bệnh nhân vừa xuất viện và chưa dám nhảy. Giáo viên cho ông làm bài khác trước nên ông bắt đầu bằng đi chậm. Sau nhiều ngày luyện, ông thấy cách này hữu ích. Tới cuối tuần, cuối cùng ông có thể nhảy vài cái cùng mọi người.",
        },
      },
    ],
  },
  [`${DOMAIN_ID}-home-family-leisure`]: {
    texts: [
      {
        kind: "graded-reading",
        titleHanzi: "搬进新小区",
        titleVi: "Chuyển vào khu dân cư mới",
        lines: [
          ["一对夫妻周末搬家，搬进了一个安静的小区。",
            "Yí duì fūqī zhōumò bānjiā, bānjìn le yí ge ānjìng de xiǎoqū.",
            "Một cặp vợ chồng chuyển nhà vào cuối tuần, tới một khu dân cư yên tĩnh."],
          ["新屋子大小合适，有客厅、卧室和一个卫生间。",
            "Xīn wūzi dàxiǎo héshì, yǒu kètīng, wòshì hé yí ge wèishēngjiān.",
            "Nhà mới có kích thước phù hợp, có phòng khách, phòng ngủ và một nhà vệ sinh."],
          ["附近有宾馆、商店和公园，生活很方便。",
            "Fùjìn yǒu bīnguǎn, shāngdiàn hé gōngyuán, shēnghuó hěn fāngbiàn.",
            "Gần đó có khách sạn, cửa hàng và công viên nên sinh hoạt rất thuận tiện."],
          ["他们刚开始整理，邻居和一位老人就来帮忙。",
            "Tāmen gāng kāishǐ zhěnglǐ, línjū hé yí wèi lǎorén jiù lái bāngmáng.",
            "Họ vừa bắt đầu dọn thì hàng xóm và một người cao tuổi tới giúp."],
          ["老人帮他们扫屋子，邻居检查了卫生间的水。",
            "Lǎorén bāng tāmen sǎo wūzi, línjū jiǎnchá le wèishēngjiān de shuǐ.",
            "Người cao tuổi giúp quét nhà, hàng xóm kiểm tra nước trong nhà vệ sinh."],
          ["丈夫发现一个箱子几乎打不开，有点儿生气。",
            "Zhàngfu fāxiàn yí ge xiāngzi jīhū dǎbukāi, yǒudiǎnr shēngqì.",
            "Người chồng thấy một chiếc thùng gần như không mở được nên hơi tức."],
          ["妻子跟他对话，问他为什么生气，两个人一起想出了办法。",
            "Qīzi gēn tā duìhuà, wèn tā wèishénme shēngqì, liǎng ge rén yìqǐ xiǎngchū le bànfǎ.",
            "Người vợ nói chuyện và hỏi vì sao chồng tức giận; hai người cùng nghĩ ra cách."],
          ["看来，有热心的邻居，搬家也能变成开心的经历。",
            "Kànlái, yǒu rèxīn de línjū, bānjiā yě néng biànchéng kāixīn de jīnglì.",
            "Xem ra, có hàng xóm nhiệt tình thì chuyển nhà cũng có thể thành trải nghiệm vui."],
        ],
        questions: [
          ["main-idea", "Đoạn đọc kể về việc gì?",
            ["Một cặp vợ chồng chuyển nhà và được hàng xóm giúp", "Một khách sạn sửa nhà vệ sinh", "Một người cao tuổi bán nhà", "Hai người tranh cãi rồi chuyển đi"], 0,
            "Toàn đoạn mô tả nhà mới, việc dọn và sự giúp đỡ."],
          ["detail", "Khu vực gần nhà có gì?",
            ["Khách sạn, cửa hàng và công viên", "Nhà ga và bệnh viện", "Trường học và sân bay", "Chỉ có công viên"], 0,
            "Câu 3 liệt kê ba địa điểm."],
          ["detail", "Người cao tuổi đã giúp việc gì?",
            ["Quét nhà", "Mở thùng", "Kiểm tra nước", "Mua đồ"], 0,
            "Câu 5 nói người cao tuổi giúp quét nhà."],
          ["cause-effect", "Vì sao người chồng hơi tức giận?",
            ["Thùng gần như không mở được", "Nhà quá nhỏ", "Hàng xóm đến muộn", "Không có nhà vệ sinh"], 0,
            "Câu 6 nối trực tiếp chiếc thùng với cảm xúc."],
          ["simple-inference", "Thái độ cuối đoạn đối với hàng xóm là gì?",
            ["Biết ơn và tích cực", "Lo sợ", "Không tin tưởng", "Thờ ơ"], 0,
            "Câu cuối gọi hàng xóm nhiệt tình và trải nghiệm vui."],
        ],
        noteFields: [
          ["home", "Nhà mới", "Kích thước phù hợp, đủ phòng và nhà vệ sinh"],
          ["area", "Khu vực", "Có khách sạn, cửa hàng và công viên"],
          ["help", "Sự giúp đỡ", "Hàng xóm quét nhà và kiểm tra nước"],
          ["lesson", "Ấn tượng", "Hàng xóm tốt làm chuyển nhà vui hơn"],
        ],
        summary: {
          skill: "writing",
          promptVi: "Dùng 刚…就…、以后、看来 để tóm tắt ngày chuyển nhà.",
          requiredElements: ["nhà mới", "hàng xóm giúp", "vấn đề chiếc thùng", "ấn tượng"],
          modelHanzi: "一对夫妻搬进了新小区。他们刚开始整理，邻居就来帮忙。丈夫打不开箱子，生气了，跟妻子对话以后找到了解决办法。看来，热心的邻居让搬家轻松多了。",
          modelPinyin: "Yí duì fūqī bānjìn le xīn xiǎoqū. Tāmen gāng kāishǐ zhěnglǐ, línjū jiù lái bāngmáng. Zhàngfu dǎbukāi xiāngzi, shēngqì le, gēn qīzi duìhuà yǐhòu zhǎodào le jiějué bànfǎ. Kànlái, rèxīn de línjū ràng bānjiā qīngsōng duō le.",
          modelVi: "Một cặp vợ chồng chuyển vào khu dân cư mới. Họ vừa bắt đầu dọn thì hàng xóm tới giúp. Người chồng không mở được thùng và tức giận, nhưng sau khi nói chuyện với vợ đã tìm ra cách. Xem ra hàng xóm nhiệt tình khiến việc chuyển nhà nhẹ nhàng hơn.",
        },
      },
      {
        kind: "graded-listening",
        titleHanzi: "周末的共同兴趣",
        titleVi: "Sở thích chung cuối tuần",
        lines: [
          ["小区里的老人和孩子周末常常一起做游戏。",
            "Xiǎoqū lǐ de lǎorén hé háizi zhōumò chángcháng yìqǐ zuò yóuxì.",
            "Người cao tuổi và trẻ em trong khu dân cư thường cùng chơi trò chơi vào cuối tuần."],
          ["一位老人对养花有兴趣，孩子们却更喜欢养小动物。",
            "Yí wèi lǎorén duì yǎng huā yǒu xìngqù, háizimen què gèng xǐhuan yǎng xiǎo dòngwù.",
            "Một người cao tuổi thích trồng hoa, còn trẻ em thích nuôi động vật nhỏ hơn."],
          ["大家对话了好久，还是没有决定做什么。",
            "Dàjiā duìhuà le hǎojiǔ, háishi méiyǒu juédìng zuò shénme.",
            "Mọi người nói chuyện rất lâu nhưng vẫn chưa quyết định làm gì."],
          ["后来一个邻居说，可以设计一个照顾植物的游戏。",
            "Hòulái yí ge línjū shuō, kěyǐ shèjì yí ge zhàogù zhíwù de yóuxì.",
            "Sau đó một hàng xóm nói có thể thiết kế trò chăm sóc cây."],
          ["孩子写句子介绍怎么养，老人准备大小不同的花盆。",
            "Háizi xiě jùzi jièshào zěnme yǎng, lǎorén zhǔnbèi dàxiǎo bùtóng de huāpén.",
            "Trẻ em viết câu giới thiệu cách trồng, người cao tuổi chuẩn bị chậu hoa kích cỡ khác nhau."],
          ["游戏开始以后，大家几乎忘了吃午饭。",
            "Yóuxì kāishǐ yǐhòu, dàjiā jīhū wàng le chī wǔfàn.",
            "Sau khi trò chơi bắt đầu, mọi người gần như quên ăn trưa."],
          ["有人把土扫到一起，有人把花搬进活动室。",
            "Yǒurén bǎ tǔ sǎo dào yìqǐ, yǒurén bǎ huā bānjìn huódòngshì.",
            "Có người quét đất lại một chỗ, có người chuyển hoa vào phòng hoạt động."],
          ["看来，共同的兴趣让不同年龄的人生活得更有意思。",
            "Kànlái, gòngtóng de xìngqù ràng bùtóng niánlíng de rén shēnghuó de gèng yǒuyìsi.",
            "Xem ra sở thích chung khiến cuộc sống của người ở các độ tuổi khác nhau thú vị hơn."],
        ],
        questions: [
          ["main-idea", "Bài nghe nói về điều gì?",
            ["Người già và trẻ em tạo một trò chơi chăm cây", "Một gia đình chuyển tới khách sạn", "Trẻ em làm hỏng phòng hoạt động", "Hàng xóm ngừng nuôi động vật"], 0,
            "Diễn biến từ sở thích khác nhau tới trò chơi chung chăm cây."],
          ["detail", "Người cao tuổi có sở thích gì?",
            ["Trồng hoa", "Nuôi cá", "Viết câu", "Chơi bóng"], 0,
            "Câu 2 nói người cao tuổi thích trồng hoa."],
          ["sequence", "Ai đưa ra ý tưởng trò chơi?",
            ["Một hàng xóm", "Một đứa trẻ", "Người quản lý khách sạn", "Một cặp vợ chồng"], 0,
            "Câu 4 nêu một hàng xóm đề xuất."],
          ["detail", "Trẻ em phụ trách việc gì?",
            ["Viết câu giới thiệu cách trồng", "Chuẩn bị chậu", "Quét đất", "Chuyển nhà"], 0,
            "Câu 5 nói trẻ em viết câu."],
          ["simple-inference", "Thông điệp của bài nghe là gì?",
            ["Sở thích chung có thể kết nối nhiều lứa tuổi", "Mọi người nên có cùng một tuổi", "Chỉ trẻ em nên chơi", "Nuôi động vật luôn tốt hơn trồng cây"], 0,
            "Câu cuối nêu tác dụng của sở thích chung."],
        ],
        noteFields: [
          ["different", "Sở thích ban đầu", "Người già thích hoa, trẻ em thích động vật"],
          ["idea", "Ý tưởng chung", "Trò chơi chăm sóc cây"],
          ["roles", "Phân công", "Trẻ viết câu, người già chuẩn bị chậu"],
          ["meaning", "Ý nghĩa", "Kết nối người ở nhiều độ tuổi"],
        ],
        summary: {
          skill: "speaking",
          promptVi: "Kể lại cách mọi người biến sở thích khác nhau thành hoạt động chung.",
          requiredElements: ["sở thích khác nhau", "đề xuất", "phân công", "ý nghĩa"],
          modelHanzi: "老人喜欢养花，孩子更喜欢养小动物。大家对话以后，邻居建议做照顾植物的游戏。孩子写句子，老人准备花盆，其他人一起整理。这个共同兴趣让不同年龄的人更亲近。",
          modelPinyin: "Lǎorén xǐhuan yǎng huā, háizi gèng xǐhuan yǎng xiǎo dòngwù. Dàjiā duìhuà yǐhòu, línjū jiànyì zuò zhàogù zhíwù de yóuxì. Háizi xiě jùzi, lǎorén zhǔnbèi huāpén, qítā rén yìqǐ zhěnglǐ. Zhège gòngtóng xìngqù ràng bùtóng niánlíng de rén gèng qīnjìn.",
          modelVi: "Người cao tuổi thích trồng hoa, trẻ em thích nuôi động vật nhỏ hơn. Sau khi trao đổi, hàng xóm đề nghị làm trò chăm cây. Trẻ em viết câu, người cao tuổi chuẩn bị chậu, những người khác cùng dọn. Sở thích chung này khiến các lứa tuổi gần nhau hơn.",
        },
      },
    ],
  },
};

const pickDistinct = (lexemes, index, field) => {
  const target = lexemes[index][field];
  const values = [];
  for (let offset = 1; offset < lexemes.length * 2 && values.length < 3; offset += 1) {
    const candidate = lexemes[(index + offset) % lexemes.length][field];
    if (candidate !== target && !values.includes(candidate)) {
      values.push(candidate);
    }
  }
  if (values.length !== 3) throw new Error(`Missing ${field} distractors`);
  return values;
};

const makePracticeState = () => ({
  review: "pending",
  releaseEligible: false,
  measurementEligible: false,
  masteryEligible: false,
});

export const buildHsk3PersonalDomainPack = (root = process.cwd()) => {
  const blueprintBundle = loadHsk3LessonBlueprintsBundle(root);
  assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  const priorLessonBundle = loadHsk3PersonalParagraphPackBundle(root);
  assertValidHsk3PersonalParagraphPackBundle(priorLessonBundle);
  const vocabularyById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const lessonPacks = LESSON_IDS.map((lessonId) => {
    const blueprint = blueprintBundle.pack.lessons.find(
      (candidate) => candidate.lessonId === lessonId,
    );
    const content = CONTENT[lessonId];
    if (!blueprint || !content) throw new Error(`${lessonId} input is missing`);
    const lexemes = blueprint.inventoryMappings.vocabularyIds.map(
      (officialId) => {
        const source = vocabularyById.get(officialId);
        const gloss = VI_GLOSS_BY_SEQUENCE[source?.sequence];
        if (!source || !gloss) {
          throw new Error(`${officialId} source or Vietnamese gloss is missing`);
        }
        return {
          officialId,
          sequence: source.sequence,
          simplified: source.simplified,
          pinyin: source.officialPinyin,
          officialPartOfSpeech: source.officialPartOfSpeech,
          vietnameseGlossDraft: gloss,
          sourceLineSha256: [
            ...new Set(source.sourceMatches.map(
              (match) => match.sourceLineSha256,
            )),
          ],
          sourceSenseReview: "pending",
          mandarinLinguisticReview: "pending",
          vietnameseEditorialReview: "pending",
        };
      },
    );
    const texts = content.texts.map((sourceText, textIndex) => {
      const suffix = sourceText.kind === "graded-reading"
        ? "reading-01"
        : "listening-01";
      const textId = `${lessonId}:${suffix}`;
      return {
        textId,
        kind: sourceText.kind,
        titleHanzi: sourceText.titleHanzi,
        titleVi: sourceText.titleVi,
        audio: null,
        lines: sourceText.lines.map(([hanzi, pinyin, vietnamese], index) => ({
          lineId: `${textIndex === 0 ? "r" : "l"}${String(index + 1).padStart(2, "0")}`,
          hanzi,
          pinyin,
          vietnamese,
        })),
      };
    });
    const combinedHanzi = texts.flatMap((text) =>
      text.lines.map((line) => line.hanzi)
    ).join("");
    for (const lexeme of lexemes) {
      if (!combinedHanzi.includes(lexeme.simplified)) {
        throw new Error(`${lessonId} text misses ${lexeme.officialId}`);
      }
    }
    const vocabularyPracticeItems = lexemes.flatMap((lexeme, index) => {
      const pinyin = pickDistinct(lexemes, index, "pinyin");
      const hanzi = pickDistinct(lexemes, index, "simplified");
      const gloss = pickDistinct(lexemes, index, "vietnameseGlossDraft");
      const common = {
        lessonId,
        officialVocabularyId: lexeme.officialId,
        ...makePracticeState(),
        scoringPolicy: "automatic-draft-only",
      };
      return [
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:meaning`,
          kind: "meaning-selection",
          prompt: lexeme.simplified,
          options: [gloss[0], lexeme.vietnameseGlossDraft, gloss[1], gloss[2]],
          correctAnswer: lexeme.vietnameseGlossDraft,
        },
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:pinyin`,
          kind: "pinyin-recognition",
          prompt: lexeme.simplified,
          options: [pinyin[0], lexeme.pinyin, pinyin[1], pinyin[2]],
          correctAnswer: lexeme.pinyin,
        },
        {
          ...common,
          itemId: `${lessonId}:${lexeme.officialId}:listening`,
          kind: "listening-selection",
          prompt: "Chọn từ bạn nghe được.",
          audio: null,
          ttsText: lexeme.simplified,
          ttsDisclosure: "synthetic-browser-voice",
          options: [hanzi[0], lexeme.simplified, hanzi[1], hanzi[2]],
          correctAnswer: lexeme.simplified,
        },
      ];
    });
    const comprehensionItems = content.texts.flatMap((sourceText, textIndex) => {
      const text = texts[textIndex];
      const skill = text.kind === "graded-reading" ? "reading" : "listening";
      return sourceText.questions.map(
        ([kind, promptVi, optionsVi, correctOptionIndex, rationaleVi], index) => ({
          itemId: `${text.textId}:q${String(index + 1).padStart(2, "0")}`,
          lessonId,
          textId: text.textId,
          kind,
          skill,
          promptVi,
          optionsVi,
          correctOptionIndex,
          rationaleVi,
          audio: skill === "listening" ? null : undefined,
          ttsDisclosure:
            skill === "listening" ? "synthetic-browser-voice" : undefined,
          ...makePracticeState(),
          scoringPolicy: "source-exposed-practice-only",
        }),
      );
    });
    const noteGrids = content.texts.map((sourceText, textIndex) => {
      const text = texts[textIndex];
      const skill = text.kind === "graded-reading" ? "reading" : "listening";
      return {
        itemId: `${text.textId}:note-grid`,
        lessonId,
        textId: text.textId,
        skill,
        promptVi: skill === "reading"
          ? "Điền bốn ô ghi chú trước khi tóm tắt đoạn đọc."
          : "Nghe và điền bốn ô theo diễn biến sự việc.",
        fields: sourceText.noteFields.map(([key, labelVi, modelVi]) => ({
          key,
          labelVi,
          modelVi,
        })),
        audio: skill === "listening" ? null : undefined,
        ttsDisclosure:
          skill === "listening" ? "synthetic-browser-voice" : undefined,
        responseMode: "learner-notes-with-model-reveal",
        ...makePracticeState(),
        scoringPolicy: "source-exposed-practice-only",
      };
    });
    const guidedSummaries = content.texts.map((sourceText, textIndex) => ({
      itemId: `${texts[textIndex].textId}:summary`,
      lessonId,
      textId: texts[textIndex].textId,
      ...sourceText.summary,
      responseMode: "self-record-or-write-with-model-reveal",
      reviewedRubric: null,
      ...makePracticeState(),
      scoringPolicy: "source-exposed-practice-only",
    }));
    const practiceItemIds = [
      ...vocabularyPracticeItems,
      ...comprehensionItems,
      ...noteGrids,
      ...guidedSummaries,
    ].map((item) => item.itemId);
    return {
      lessonId,
      blueprintTitleVi: blueprint.titleVi,
      lexemes,
      texts,
      vocabularyPracticeItems,
      comprehensionItems,
      noteGrids,
      guidedSummaries,
      reviewBatch: {
        batchId: `${lessonId}:content-review-v1`,
        lessonId,
        lexemeIds: lexemes.map((lexeme) => lexeme.officialId),
        textIds: texts.map((text) => text.textId),
        practiceItemIds,
        requiredRoles: [
          "native-mandarin-reviewer",
          "vietnamese-editor",
          "assessment-editor",
          "audio-rights-reviewer",
        ],
        state: "pending",
        approvals: [],
      },
    };
  });
  const all = (field) => lessonPacks.flatMap((lesson) => lesson[field]);
  const vocabularyItems = all("vocabularyPracticeItems");
  const comprehensionItems = all("comprehensionItems");
  const noteGrids = all("noteGrids");
  const guidedSummaries = all("guidedSummaries");
  const authoredPracticeItems =
    vocabularyItems.length + comprehensionItems.length
    + noteGrids.length + guidedSummaries.length;
  const audioDependentItems =
    vocabularyItems.filter((item) => item.kind === "listening-selection").length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteGrids.filter((item) => item.skill === "listening").length
    + guidedSummaries.filter((item) => item.skill === "speaking").length;
  return {
    schemaVersion: 1,
    packId: "hsk3-personal-paragraph-domain-2026.07",
    level: 3,
    domainId: DOMAIN_ID,
    state: "ai-assisted-content-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      vocabularyDraftId: blueprintBundle.vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(
        blueprintBundle.vocabularyBundle.draftPath,
      ),
      priorLessonPackId: priorLessonBundle.pack.packId,
      priorLessonPackSha256: fileSha256(priorLessonBundle.packPath),
      attribution:
        "content/sources/cc-cedict-debian-2026-04-03/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-paragraph-and-practice-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      assessmentEditor: null,
      audioRightsReviewer: null,
    },
    audioPolicy: {
      committedAudio: false,
      browserTtsPreviewOnly: true,
      reviewedHumanOrLicensedAudioRequiredForRelease: true,
      browserAsrCanScoreSpeakingMastery: false,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      audioRightsRequiredWhereAudioDependent: true,
      sourceExposedPracticeCannotCalibrateAssessment: true,
    },
    coverageClaims: {
      remainingPersonalDomainLessonDraftsComplete: true,
      personalDomainLessonDraftsCompleteWithPriorPack: true,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk3Complete: false,
    },
    counts: {
      lessons: lessonPacks.length,
      personalDomainLessonsWithPriorPack: lessonPacks.length + 1,
      vocabularyDrafts: all("lexemes").length,
      authoredTexts: all("texts").length,
      authoredTextLines: all("texts").flatMap((text) => text.lines).length,
      vocabularyPracticeItems: vocabularyItems.length,
      comprehensionItems: comprehensionItems.length,
      readingComprehensionItems: comprehensionItems.filter(
        (item) => item.skill === "reading",
      ).length,
      listeningComprehensionItems: comprehensionItems.filter(
        (item) => item.skill === "listening",
      ).length,
      noteGridItems: noteGrids.length,
      guidedSummaryItems: guidedSummaries.length,
      authoredPracticeItems,
      audioDependentItems,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: lessonPacks.length,
      approvals: 0,
      releaseEligibleItems: 0,
    },
    lessons: lessonPacks,
    reviewBatches: lessonPacks.map((lesson) => lesson.reviewBatch),
  };
};

export const serializeHsk3PersonalDomainPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_PERSONAL_DOMAIN_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3PersonalDomainPack(
    buildHsk3PersonalDomainPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 personal domain pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_PERSONAL_DOMAIN_PACK_RELATIVE_PATH,
    mode: process.argv.includes("--write")
      ? "write"
      : process.argv.includes("--check")
        ? "check"
        : "stdout",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
