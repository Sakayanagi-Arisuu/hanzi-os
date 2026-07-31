import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk1VocabularyDraftBundle,
  loadHsk1VocabularyDraftBundle,
} from "../../src/content/hsk1VocabularyDraft.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH =
  "content/drafts/hsk1-communicative-units-2026.07.json";

const VI_GLOSS_BY_SEQUENCE = {
  2: "tám",
  5: "ban ngày",
  6: "một trăm; trăm",
  7: "một nửa; nửa",
  8: "bánh bao",
  9: "cốc; ly",
  10: "quyển; cuốn",
  11: "bên; phía",
  12: "bệnh; ốm",
  16: "món ăn; rau",
  17: "trà",
  18: "hát",
  19: "siêu thị",
  20: "xe",
  21: "ăn",
  22: "taxi",
  23: "mặc",
  27: "đại học",
  28: "sinh viên đại học",
  29: "đến; tới",
  31: "thứ (số thứ tự)",
  33: "giờ; điểm",
  34: "cửa hàng",
  36: "máy tính",
  37: "tivi; truyền hình",
  38: "phim",
  39: "rạp chiếu phim",
  40: "đồ; vật; thứ",
  42: "đọc",
  43: "đọc sách; học",
  46: "nhiều; bao nhiêu",
  47: "bao nhiêu",
  49: "hai",
  50: "cơm; bữa ăn",
  51: "nhà hàng",
  52: "phòng",
  54: "máy bay",
  55: "phút; chia",
  56: "phút (khoảng thời gian)",
  58: "bài hát",
  60: "cái; người (lượng từ phổ biến)",
  62: "công ty",
  63: "công việc; làm việc",
  65: "đắt",
  69: "tiếng Hán",
  70: "chữ Hán",
  72: "ngon",
  75: "vui; thú vị",
  76: "ngày; số",
  77: "uống",
  80: "sau; phía sau",
  81: "về; quay lại",
  83: "tàu hỏa",
  84: "trứng gà",
  85: "mấy; bao nhiêu",
  89: "chiếc; bộ (lượng từ cho quần áo, đồ vật)",
  90: "bánh chẻo",
  93: "năm nay",
  94: "hôm nay",
  95: "chín",
  97: "mở; lái",
  98: "lái xe",
  99: "xem; nhìn",
  100: "đi khám bệnh",
  101: "nhìn thấy",
  103: "tiết học; môn học",
  104: "miệng; người (lượng từ cho gia đình)",
  105: "đồng; tệ; miếng",
  106: "đến",
  107: "giáo viên",
  109: "lạnh",
  110: "trong; bên trong",
  111: "hai (dùng trước lượng từ)",
  112: "số không",
  113: "sáu",
  116: "mua",
  117: "bán",
  118: "bận",
  125: "cơm",
  126: "bánh mì",
  127: "mì sợi",
  128: "năm sau",
  129: "ngày mai",
  131: "nào",
  132: "cái nào",
  133: "ở đâu; nơi nào",
  134: "đâu",
  135: "những cái nào",
  136: "kia; đó",
  137: "bên kia",
  138: "cái kia",
  139: "ở đó",
  140: "chỗ kia",
  141: "những cái kia",
  149: "năm",
  151: "sữa bò",
  157: "rẻ",
  159: "táo",
  160: "bảy",
  162: "một nghìn; nghìn",
  163: "trước; phía trước",
  164: "tiền",
  167: "đi",
  168: "năm ngoái",
  169: "nóng",
  172: "ngày",
  173: "ba",
  174: "cửa hàng",
  175: "trên; lên",
  176: "đi làm",
  177: "vào học; lên lớp",
  178: "buổi sáng",
  179: "đi học",
  180: "ít",
  183: "bị ốm",
  184: "mười",
  185: "lúc; khi",
  186: "thời gian",
  190: "sách",
  191: "hiệu sách",
  192: "nước",
  193: "hoa quả",
  198: "bốn",
  207: "ngày; trời",
  208: "thời tiết",
  209: "nghe",
  210: "nghe thấy",
  211: "bạn học",
  212: "ngoài",
  213: "bên ngoài",
  214: "chơi",
  215: "muộn; tối",
  216: "bữa tối",
  217: "buổi tối",
  220: "vấn đề; câu hỏi",
  223: "năm",
  224: "bữa trưa",
  226: "dưới; xuống",
  227: "mưa",
  228: "tan làm",
  229: "tan học",
  230: "buổi chiều",
  232: "bây giờ",
  236: "giờ (khoảng thời gian)",
  237: "tiểu học",
  238: "học sinh tiểu học",
  239: "một vài",
  240: "viết",
  243: "tuần; thứ",
  244: "Chủ nhật",
  245: "Chủ nhật",
  246: "nghỉ ngơi",
  247: "học",
  248: "học sinh",
  249: "học tập",
  250: "trường học",
  251: "tuyết",
  254: "một",
  255: "quần áo",
  256: "bác sĩ",
  257: "bệnh viện",
  258: "một nửa",
  260: "ghế",
  261: "một chút",
  262: "một số; một ít",
  267: "mưa",
  268: "đồng; tệ",
  269: "tháng",
  271: "ở; đang",
  273: "sớm",
  274: "bữa sáng",
  275: "buổi sáng",
  278: "tìm; tìm tiền thừa",
  279: "đây; này",
  280: "bên này",
  281: "cái này",
  282: "ở đây",
  283: "chỗ này",
  284: "những cái này",
  286: "đang",
  288: "biết",
  289: "Trung Quốc",
  290: "tiếng Trung; chữ Trung",
  291: "buổi trưa",
  292: "trung học",
  293: "học sinh trung học",
  294: "ở; sống",
  295: "bàn",
  296: "chữ",
  297: "hôm qua",
  298: "ngồi; đi bằng",
  299: "làm",
  300: "nấu cơm",
};

const UNIT_PLANS = [
  {
    unitId: "hsk1-time-place-events",
    lessons: [
      {
        slug: "numbers",
        titleVi: "Số đếm nền tảng",
        objectiveVi: "Đọc và dùng số từ từ không đến hàng nghìn trong câu hỏi đáp ngắn.",
        vocabularySequences: [2, 6, 7, 49, 95, 111, 112, 113, 160, 162, 173, 184, 198, 223, 254],
        grammarOrdinals: [11],
        taskOrdinals: [],
        topicOrdinals: [],
        dialogue: [
          ["A", "你家有几个人？", "Nǐ jiā yǒu jǐ ge rén?", "Nhà bạn có mấy người?"],
          ["B", "我家有四个人。", "Wǒ jiā yǒu sì ge rén.", "Nhà tôi có bốn người."],
          ["A", "你要几个？", "Nǐ yào jǐ ge?", "Bạn muốn mấy cái?"],
          ["B", "我要两个。", "Wǒ yào liǎng ge.", "Tôi muốn hai cái."],
        ],
      },
      {
        slug: "calendar",
        titleVi: "Ngày tháng và năm",
        objectiveVi: "Hỏi, trả lời ngày tháng và xác định năm trước, năm nay, năm sau.",
        vocabularySequences: [31, 76, 93, 94, 128, 129, 149, 168, 172, 207, 269, 297],
        grammarOrdinals: [1, 14, 64, 65],
        taskOrdinals: [2],
        topicOrdinals: [3],
        dialogue: [
          ["A", "今天几月几号？", "Jīntiān jǐ yuè jǐ hào?", "Hôm nay là ngày mấy tháng mấy?"],
          ["B", "今天七月二十八号。", "Jīntiān qī yuè èrshíbā hào.", "Hôm nay là ngày 28 tháng 7."],
          ["A", "明天是几号？", "Míngtiān shì jǐ hào?", "Ngày mai là ngày mấy?"],
          ["B", "明天是二十九号。", "Míngtiān shì èrshíjiǔ hào.", "Ngày mai là ngày 29."],
        ],
      },
      {
        slug: "week-and-day-parts",
        titleVi: "Tuần và các buổi trong ngày",
        objectiveVi: "Xác định thứ trong tuần và các khoảng sáng, trưa, chiều, tối.",
        vocabularySequences: [5, 178, 215, 217, 230, 243, 244, 245, 273, 275, 291],
        grammarOrdinals: [36, 44, 66],
        taskOrdinals: [],
        topicOrdinals: [],
        dialogue: [
          ["A", "今天星期几？", "Jīntiān xīngqī jǐ?", "Hôm nay là thứ mấy?"],
          ["B", "今天星期二。", "Jīntiān xīngqī'èr.", "Hôm nay là thứ Ba."],
          ["A", "你早上忙吗？", "Nǐ zǎoshang máng ma?", "Buổi sáng bạn có bận không?"],
          ["B", "不忙，我下午忙。", "Bù máng, wǒ xiàwǔ máng.", "Không, buổi chiều tôi bận."],
        ],
      },
      {
        slug: "clock-and-duration",
        titleVi: "Giờ và khoảng thời gian",
        objectiveVi: "Hỏi giờ, nói thời điểm và mô tả khoảng thời gian ngắn.",
        vocabularySequences: [29, 33, 55, 56, 80, 163, 185, 186, 232, 236],
        grammarOrdinals: [17, 18, 58, 59, 60, 61, 62],
        taskOrdinals: [],
        topicOrdinals: [],
        dialogue: [
          ["A", "现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"],
          ["B", "现在八点半。", "Xiànzài bā diǎn bàn.", "Bây giờ là tám giờ rưỡi."],
          ["A", "你有时间吗？", "Nǐ yǒu shíjiān ma?", "Bạn có thời gian không?"],
          ["B", "我有十分钟。", "Wǒ yǒu shí fēnzhōng.", "Tôi có mười phút."],
        ],
      },
      {
        slug: "location",
        titleVi: "Vị trí và từ chỉ định",
        objectiveVi: "Hỏi và chỉ vị trí bằng từ để hỏi, từ chỉ định và phương vị.",
        vocabularySequences: [11, 110, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 175, 212, 213, 226, 239, 279, 280, 281, 282, 283, 284],
        grammarOrdinals: [2, 3, 10, 21, 33, 34, 40, 51, 52],
        taskOrdinals: [5],
        topicOrdinals: [7],
        dialogue: [
          ["A", "你在哪里？", "Nǐ zài nǎlǐ?", "Bạn đang ở đâu?"],
          ["B", "我在这里。", "Wǒ zài zhèlǐ.", "Tôi đang ở đây."],
          ["A", "他在哪边？", "Tā zài nǎ biān?", "Anh ấy ở phía nào?"],
          ["B", "他在那边。", "Tā zài nàbiān.", "Anh ấy ở bên kia."],
        ],
      },
      {
        slug: "weather-and-residence",
        titleVi: "Thời tiết và nơi ở",
        objectiveVi: "Mô tả thời tiết hiện tại và nói nơi mình đang sống.",
        vocabularySequences: [109, 169, 208, 227, 251, 267, 271, 286, 294],
        grammarOrdinals: [32],
        taskOrdinals: [4],
        topicOrdinals: [6],
        dialogue: [
          ["A", "今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"],
          ["B", "今天很热，不下雨。", "Jīntiān hěn rè, bù xiàyǔ.", "Hôm nay rất nóng, không mưa."],
          ["A", "你住在哪儿？", "Nǐ zhù zài nǎr?", "Bạn sống ở đâu?"],
          ["B", "我住在这里。", "Wǒ zhù zài zhèlǐ.", "Tôi sống ở đây."],
        ],
      },
    ],
  },
  {
    unitId: "hsk1-daily-life",
    lessons: [
      {
        slug: "quantity-and-money",
        titleVi: "Số lượng và tiền",
        objectiveVi: "Hỏi số lượng, giá tiền và dùng lượng từ trong trao đổi ngắn.",
        vocabularySequences: [46, 47, 60, 85, 104, 105, 164, 180, 258, 261, 262, 268],
        grammarOrdinals: [12, 13, 63],
        taskOrdinals: [9],
        topicOrdinals: [17],
        dialogue: [
          ["A", "这个多少钱？", "Zhè ge duōshao qián?", "Cái này bao nhiêu tiền?"],
          ["B", "五块钱。", "Wǔ kuài qián.", "Năm tệ."],
          ["A", "你要几个？", "Nǐ yào jǐ ge?", "Bạn muốn mấy cái?"],
          ["B", "我要一点儿。", "Wǒ yào yìdiǎnr.", "Tôi muốn một ít."],
        ],
      },
      {
        slug: "food-and-drink",
        titleVi: "Đồ ăn và thức uống",
        objectiveVi: "Gọi món và nói lựa chọn ăn uống trong các bữa hằng ngày.",
        vocabularySequences: [8, 9, 16, 17, 21, 50, 51, 72, 77, 84, 90, 125, 126, 127, 151, 159, 192, 193, 216, 224, 274, 300],
        grammarOrdinals: [7, 25],
        taskOrdinals: [7, 15],
        topicOrdinals: [11, 12, 29, 30],
        dialogue: [
          ["A", "你想吃什么？", "Nǐ xiǎng chī shénme?", "Bạn muốn ăn gì?"],
          ["B", "我想吃米饭。", "Wǒ xiǎng chī mǐfàn.", "Tôi muốn ăn cơm."],
          ["A", "你喝茶吗？", "Nǐ hē chá ma?", "Bạn uống trà không?"],
          ["B", "喝，我也喝牛奶。", "Hē, wǒ yě hē niúnǎi.", "Có, tôi cũng uống sữa."],
        ],
      },
      {
        slug: "shopping-and-clothing",
        titleVi: "Mua sắm và quần áo",
        objectiveVi: "Hỏi giá, đánh giá đắt rẻ và trao đổi khi mua quần áo.",
        vocabularySequences: [19, 23, 34, 40, 65, 89, 116, 117, 157, 174, 255, 278],
        grammarOrdinals: [],
        taskOrdinals: [3],
        topicOrdinals: [4, 5, 16, 18],
        dialogue: [
          ["A", "这件衣服贵吗？", "Zhè jiàn yīfu guì ma?", "Bộ quần áo này đắt không?"],
          ["B", "不贵，很便宜。", "Bú guì, hěn piányi.", "Không đắt, rất rẻ."],
          ["A", "你买吗？", "Nǐ mǎi ma?", "Bạn mua không?"],
          ["B", "买，我找一下钱。", "Mǎi, wǒ zhǎo yíxià qián.", "Có, để tôi tìm tiền."],
        ],
      },
      {
        slug: "health-and-home",
        titleVi: "Sức khỏe và đồ dùng trong nhà",
        objectiveVi: "Nói tình trạng sức khỏe và xác định đồ vật cơ bản trong phòng.",
        vocabularySequences: [12, 52, 100, 183, 256, 257, 260, 295],
        grammarOrdinals: [],
        taskOrdinals: [10],
        topicOrdinals: [19],
        dialogue: [
          ["A", "你怎么了？", "Nǐ zěnme le?", "Bạn bị làm sao?"],
          ["B", "我生病了。", "Wǒ shēngbìng le.", "Tôi bị ốm."],
          ["A", "你去医院吗？", "Nǐ qù yīyuàn ma?", "Bạn có đi bệnh viện không?"],
          ["B", "去，我去看病。", "Qù, wǒ qù kànbìng.", "Có, tôi đi khám bệnh."],
        ],
      },
    ],
  },
  {
    unitId: "hsk1-travel-leisure",
    lessons: [
      {
        slug: "transport",
        titleVi: "Phương tiện và di chuyển",
        objectiveVi: "Nói cách đi, phương tiện và hành động đến hoặc quay về.",
        vocabularySequences: [20, 22, 54, 81, 83, 97, 98, 106, 167, 298],
        grammarOrdinals: [53, 54],
        taskOrdinals: [8],
        topicOrdinals: [13, 14, 15],
        dialogue: [
          ["A", "你怎么去那边？", "Nǐ zěnme qù nàbiān?", "Bạn đến bên kia bằng cách nào?"],
          ["B", "我坐出租车去。", "Wǒ zuò chūzūchē qù.", "Tôi đi taxi đến đó."],
          ["A", "你坐火车回来吗？", "Nǐ zuò huǒchē huílai ma?", "Bạn đi tàu hỏa về phải không?"],
          ["B", "不，我坐飞机回来。", "Bù, wǒ zuò fēijī huílai.", "Không, tôi đi máy bay về."],
        ],
      },
      {
        slug: "media-and-leisure",
        titleVi: "Giải trí và truyền thông",
        objectiveVi: "Nói hoạt động xem, nghe, hát, chơi và nghỉ ngơi.",
        vocabularySequences: [18, 37, 38, 39, 58, 75, 99, 101, 209, 210, 214, 246, 299],
        grammarOrdinals: [41],
        taskOrdinals: [11],
        topicOrdinals: [20],
        dialogue: [
          ["A", "你喜欢看电影吗？", "Nǐ xǐhuan kàn diànyǐng ma?", "Bạn thích xem phim không?"],
          ["B", "喜欢，我也喜欢听歌。", "Xǐhuan, wǒ yě xǐhuan tīng gē.", "Có, tôi cũng thích nghe nhạc."],
          ["A", "星期天你做什么？", "Xīngqītiān nǐ zuò shénme?", "Chủ nhật bạn làm gì?"],
          ["B", "我休息，也看电视。", "Wǒ xiūxi, yě kàn diànshì.", "Tôi nghỉ ngơi và xem tivi."],
        ],
      },
    ],
  },
  {
    unitId: "hsk1-study-work",
    lessons: [
      {
        slug: "school-levels",
        titleVi: "Trường học và cấp học",
        objectiveVi: "Giới thiệu trường, cấp học và vai trò học sinh, sinh viên.",
        vocabularySequences: [27, 28, 179, 237, 238, 248, 250, 292, 293],
        grammarOrdinals: [],
        taskOrdinals: [12],
        topicOrdinals: [23],
        dialogue: [
          ["A", "你在哪个学校上学？", "Nǐ zài nǎ ge xuéxiào shàngxué?", "Bạn học ở trường nào?"],
          ["B", "我在中学上学。", "Wǒ zài zhōngxué shàngxué.", "Tôi học ở trường trung học."],
          ["A", "你是中学生吗？", "Nǐ shì zhōngxuéshēng ma?", "Bạn là học sinh trung học phải không?"],
          ["B", "是，我是中学生。", "Shì, wǒ shì zhōngxuéshēng.", "Vâng, tôi là học sinh trung học."],
        ],
      },
      {
        slug: "people-and-language",
        titleVi: "Con người và tiếng Trung",
        objectiveVi: "Nói vai trò trong lớp và ngôn ngữ đang dùng hoặc đang học.",
        vocabularySequences: [69, 70, 107, 211, 289, 290, 296],
        grammarOrdinals: [],
        taskOrdinals: [],
        topicOrdinals: [24],
        dialogue: [
          ["A", "你是汉语老师吗？", "Nǐ shì Hànyǔ lǎoshī ma?", "Bạn là giáo viên tiếng Trung phải không?"],
          ["B", "不是，我是大学生。", "Bú shì, wǒ shì dàxuéshēng.", "Không, tôi là sinh viên đại học."],
          ["A", "你认识这个汉字吗？", "Nǐ rènshi zhè ge Hànzì ma?", "Bạn biết chữ Hán này không?"],
          ["B", "认识，这是“中国”。", "Rènshi, zhè shì “Zhōngguó”.", "Biết, đây là “Trung Quốc”."],
        ],
      },
      {
        slug: "study-and-materials",
        titleVi: "Học tập và tài liệu",
        objectiveVi: "Nói hoạt động đọc, viết, học và hỏi đáp về tài liệu học.",
        vocabularySequences: [10, 36, 42, 43, 103, 190, 191, 220, 240, 247, 249, 288],
        grammarOrdinals: [55],
        taskOrdinals: [13],
        topicOrdinals: [21, 22, 25],
        dialogue: [
          ["A", "你在看什么？", "Nǐ zài kàn shénme?", "Bạn đang xem gì?"],
          ["B", "我在看汉语书。", "Wǒ zài kàn Hànyǔ shū.", "Tôi đang đọc sách tiếng Trung."],
          ["A", "这个问题你知道吗？", "Zhè ge wèntí nǐ zhīdào ma?", "Bạn biết câu hỏi này không?"],
          ["B", "知道，我写给你。", "Zhīdào, wǒ xiě gěi nǐ.", "Biết, tôi viết cho bạn."],
        ],
      },
      {
        slug: "work-and-schedule",
        titleVi: "Công việc và lịch hằng ngày",
        objectiveVi: "Nói nơi làm việc, thời điểm đi làm, vào học và kết thúc.",
        vocabularySequences: [62, 63, 118, 176, 177, 228, 229],
        grammarOrdinals: [],
        taskOrdinals: [14],
        topicOrdinals: [26, 27, 28],
        dialogue: [
          ["A", "你几点上班？", "Nǐ jǐ diǎn shàngbān?", "Bạn đi làm lúc mấy giờ?"],
          ["B", "我八点上班。", "Wǒ bā diǎn shàngbān.", "Tôi đi làm lúc tám giờ."],
          ["A", "你几点下班？", "Nǐ jǐ diǎn xiàbān?", "Bạn tan làm lúc mấy giờ?"],
          ["B", "我五点下班。", "Wǒ wǔ diǎn xiàbān.", "Tôi tan làm lúc năm giờ."],
        ],
      },
    ],
  },
];

const exactPartition = (label, actual, expected) => {
  if (
    actual.length !== new Set(actual).size
    || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} is not an exact lesson partition`);
  }
};

const mapInventoryIds = (items, values, field, label) => values.map((value) => {
  const item = items.find((candidate) => candidate[field] === value);
  if (!item) throw new Error(`${label} ${value} is missing`);
  return item.id;
});

const pickDistinctDistractors = ({ lessonLexemes, targetIndex, field }) => {
  const targetValue = lessonLexemes[targetIndex][field];
  const distractors = [];
  for (
    let offset = 1;
    offset < lessonLexemes.length * 2 && distractors.length < 3;
    offset += 1
  ) {
    const candidate = lessonLexemes[
      (targetIndex + offset) % lessonLexemes.length
    ][field];
    if (candidate !== targetValue && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }
  if (distractors.length !== 3) {
    throw new Error(
      `Cannot create three distinct ${field} distractors for ${lessonLexemes[targetIndex].officialId}`,
    );
  }
  return distractors;
};

export const buildHsk1CommunicativeUnitPacks = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  assertValidHsk1CurriculumScopeBundle(scopeBundle);
  const vocabularyBundle = loadHsk1VocabularyDraftBundle(root);
  assertValidHsk1VocabularyDraftBundle(vocabularyBundle);
  const inventory = scopeBundle.graphBundle.syllabus.inventory;
  const vocabulary = inventory.vocabulary.filter((item) => item.level === 1);
  const tasks = inventory.tasks.filter((item) => item.level === 1);
  const topics = inventory.topics.filter((item) => item.level === 1);
  const grammarRows = inventory.grammarRows.filter((item) => item.level === 1);

  const packs = UNIT_PLANS.map((unitPlan) => {
    const unitScope = scopeBundle.scope.unitScopes.find(
      (unit) => unit.unitId === unitPlan.unitId,
    );
    if (!unitScope) throw new Error(`${unitPlan.unitId} scope is missing`);
    const lessonVocabularyIds = unitPlan.lessons.flatMap((lesson) =>
      mapInventoryIds(
        vocabulary,
        lesson.vocabularySequences,
        "sequence",
        "vocabulary sequence",
      )
    );
    const lessonTaskIds = unitPlan.lessons.flatMap((lesson) =>
      mapInventoryIds(tasks, lesson.taskOrdinals, "ordinal", "task ordinal")
    );
    const lessonTopicIds = unitPlan.lessons.flatMap((lesson) =>
      mapInventoryIds(topics, lesson.topicOrdinals, "ordinal", "topic ordinal")
    );
    const lessonGrammarIds = unitPlan.lessons.flatMap((lesson) =>
      mapInventoryIds(
        grammarRows,
        lesson.grammarOrdinals,
        "ordinal",
        "grammar ordinal",
      )
    );
    exactPartition(
      `${unitPlan.unitId} vocabulary`,
      lessonVocabularyIds,
      unitScope.vocabularyIds,
    );
    exactPartition(`${unitPlan.unitId} tasks`, lessonTaskIds, unitScope.taskIds);
    exactPartition(`${unitPlan.unitId} topics`, lessonTopicIds, unitScope.topicIds);
    exactPartition(
      `${unitPlan.unitId} grammar`,
      lessonGrammarIds,
      unitScope.grammarRowIds,
    );

    const lexemes = unitScope.vocabularyIds.map((officialId) => {
      const official = vocabulary.find((item) => item.id === officialId);
      const sourceDraft = vocabularyBundle.draft.entries.find(
        (item) => item.officialId === officialId,
      );
      const vietnameseGlossDraft = VI_GLOSS_BY_SEQUENCE[official.sequence];
      if (!vietnameseGlossDraft) {
        throw new Error(`${officialId} Vietnamese gloss draft is missing`);
      }
      return {
        officialId,
        simplified: official.word,
        pinyin: official.pinyin,
        officialPartOfSpeech: official.partOfSpeech,
        vietnameseGlossDraft,
        sourceLineSha256: [
          ...new Set(sourceDraft.sourceMatches.map(
            (source) => source.sourceLineSha256,
          )),
        ],
        review: {
          machineAssisted: true,
          mandarinLinguisticReview: "pending",
          vietnameseEditorialReview: "pending",
        },
      };
    });
    const lessons = unitPlan.lessons.map((plan, index) => ({
      lessonId: `${unitPlan.unitId}:${String(index + 1).padStart(2, "0")}-${plan.slug}`,
      sequence: index + 1,
      titleVi: plan.titleVi,
      objectiveVi: plan.objectiveVi,
      prerequisiteLessonIds: index === 0
        ? []
        : [
            `${unitPlan.unitId}:${String(index).padStart(2, "0")}-${unitPlan.lessons[index - 1].slug}`,
          ],
      taskIds: mapInventoryIds(tasks, plan.taskOrdinals, "ordinal", "task ordinal"),
      topicIds: mapInventoryIds(topics, plan.topicOrdinals, "ordinal", "topic ordinal"),
      vocabularyIds: mapInventoryIds(
        vocabulary,
        plan.vocabularySequences,
        "sequence",
        "vocabulary sequence",
      ),
      grammarRowIds: mapInventoryIds(
        grammarRows,
        plan.grammarOrdinals,
        "ordinal",
        "grammar ordinal",
      ),
      modelDialogue: {
        audio: null,
        audioPolicy: "browser-tts-practice-only",
        turns: plan.dialogue.map(([speaker, hanzi, pinyin, meaningVi]) => ({
          speaker,
          hanzi,
          pinyin,
          meaningVi,
        })),
        review: "pending",
      },
      practiceBlueprint: {
        vocabularyTarget: "all-lesson-vocabulary",
        grammarTarget: "all-lesson-grammar",
        requiredKinds: [
          "meaning-recall",
          "pinyin-recognition",
          "listening-selection",
        ],
        authoredItemCount: plan.vocabularySequences.length * 3,
        grantsMastery: false,
      },
    }));
    const lexemeById = new Map(
      lexemes.map((lexeme) => [lexeme.officialId, lexeme]),
    );
    const practiceItems = lessons.flatMap((lesson) => {
      const lessonLexemes = lesson.vocabularyIds.map(
        (officialId) => lexemeById.get(officialId),
      );
      return lessonLexemes.flatMap((lexeme, index) => {
        const pinyinDistractors = pickDistinctDistractors({
          lessonLexemes,
          targetIndex: index,
          field: "pinyin",
        });
        const hanziDistractors = pickDistinctDistractors({
          lessonLexemes,
          targetIndex: index,
          field: "simplified",
        });
        const base = {
          lessonId: lesson.lessonId,
          officialVocabularyId: lexeme.officialId,
          review: "pending",
          measurementEligible: false,
          masteryEligible: false,
        };
        return [
          {
            ...base,
            itemId: `${lesson.lessonId}:${lexeme.officialId}:meaning`,
            kind: "meaning-recall",
            prompt: lexeme.simplified,
            answer: lexeme.vietnameseGlossDraft,
            scoringPolicy: "self-reveal-only",
          },
          {
            ...base,
            itemId: `${lesson.lessonId}:${lexeme.officialId}:pinyin`,
            kind: "pinyin-recognition",
            prompt: lexeme.simplified,
            options: [
              pinyinDistractors[0],
              lexeme.pinyin,
              pinyinDistractors[1],
              pinyinDistractors[2],
            ],
            correctAnswer: lexeme.pinyin,
            scoringPolicy: "automatic-draft-only",
          },
          {
            ...base,
            itemId: `${lesson.lessonId}:${lexeme.officialId}:listening`,
            kind: "listening-selection",
            prompt: "Chọn từ bạn nghe được.",
            ttsText: lexeme.simplified,
            ttsDisclosure: "synthetic-browser-voice",
            options: [
              hanziDistractors[0],
              lexeme.simplified,
              hanziDistractors[1],
              hanziDistractors[2],
            ],
            correctAnswer: lexeme.simplified,
            scoringPolicy: "automatic-draft-only",
          },
        ];
      });
    });
    const reviewBatches = lessons.map((lesson) => ({
      batchId: `${lesson.lessonId}:review-v1`,
      lessonId: lesson.lessonId,
      practiceItemIds: practiceItems.filter(
        (item) => item.lessonId === lesson.lessonId,
      ).map((item) => item.itemId),
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
      ],
      state: "pending",
      approvals: [],
    }));

    return {
      unitId: unitPlan.unitId,
      lexemes,
      lessons,
      practiceItems,
      reviewBatches,
      counts: {
        lessons: lessons.length,
        vocabularyDrafts: lexemes.length,
        taskBlueprintMappings:
          new Set(lessons.flatMap((lesson) => lesson.taskIds)).size,
        topicBlueprintMappings:
          new Set(lessons.flatMap((lesson) => lesson.topicIds)).size,
        grammarBlueprintMappings:
          new Set(lessons.flatMap((lesson) => lesson.grammarRowIds)).size,
        dialogueTurns: lessons.reduce(
          (total, lesson) => total + lesson.modelDialogue.turns.length,
          0,
        ),
        authoredPracticeItems: practiceItems.length,
        reviewBatches: reviewBatches.length,
        releaseEligibleItems: 0,
      },
    };
  });

  const sum = (field) =>
    packs.reduce((total, pack) => total + pack.counts[field], 0);
  return {
    schemaVersion: 1,
    collectionId: "hsk1-communicative-units-2026.07",
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      vocabularyDraftId: vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(vocabularyBundle.draftPath),
      attribution: "content/sources/cc-cedict-2026-07-28/ATTRIBUTION.md",
    },
    authorship: {
      method: "ai-assisted-translation-and-curriculum-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      assessmentReviewRequiredForRelease: true,
      dialoguePinyinReviewRequiredForRelease: true,
    },
    counts: {
      units: packs.length,
      lessons: sum("lessons"),
      vocabularyDrafts: sum("vocabularyDrafts"),
      taskBlueprintMappings: sum("taskBlueprintMappings"),
      topicBlueprintMappings: sum("topicBlueprintMappings"),
      grammarBlueprintMappings: sum("grammarBlueprintMappings"),
      dialogueTurns: sum("dialogueTurns"),
      authoredPracticeItems: sum("authoredPracticeItems"),
      meaningRecallItems: packs.reduce(
        (total, pack) => total + pack.practiceItems.filter(
          (item) => item.kind === "meaning-recall",
        ).length,
        0,
      ),
      pinyinRecognitionItems: packs.reduce(
        (total, pack) => total + pack.practiceItems.filter(
          (item) => item.kind === "pinyin-recognition",
        ).length,
        0,
      ),
      listeningSelectionItems: packs.reduce(
        (total, pack) => total + pack.practiceItems.filter(
          (item) => item.kind === "listening-selection",
        ).length,
        0,
      ),
      reviewBatches: sum("reviewBatches"),
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      communicativeUnitBlueprintsMapped: true,
      vocabularyPracticeDraftComplete: true,
      authoredPracticeCoverageComplete: false,
      reviewedContentComplete: false,
      hsk1Complete: false,
    },
    packs,
  };
};

export const serializeHsk1CommunicativeUnitPacks = (collection) =>
  `${JSON.stringify(collection)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH);
  const serialized = serializeHsk1CommunicativeUnitPacks(
    buildHsk1CommunicativeUnitPacks(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 communicative-unit packs are stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_COMMUNICATIVE_UNIT_PACKS_RELATIVE_PATH,
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
