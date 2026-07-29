import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk3LessonBlueprintsBundle,
  loadHsk3LessonBlueprintsBundle,
} from "../../src/content/hsk3LessonBlueprints.mjs";
import {
  HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH,
} from "../../src/content/hsk3PersonalParagraphPack.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

const LESSON_ID =
  "hsk3-personal-life-narratives-identity-transactions";

const VI_GLOSS_BY_SEQUENCE = {
  501: "cô, dì hoặc người phụ nữ cùng thế hệ với cha mẹ",
  510: "làm; giải quyết hoặc tổ chức một việc",
  512: "văn phòng",
  547: "cỏ",
  621: "phương pháp; cách làm",
  632: "phục vụ; dịch vụ",
  689: "cơ hội",
  724: "quyết định; đưa ra quyết định",
  737: "khách; khách hàng",
  772: "danh sách tên",
  798: "kỳ lạ; lạ",
  808: "xin nghỉ",
  836: "nhận; thu",
  841: "chú hoặc cách trẻ gọi người đàn ông cùng thế hệ với cha mẹ",
  848: "bốn mùa",
  866: "đồ ăn giao tận nơi; dịch vụ giao đồ ăn",
  920: "yêu cầu; đòi hỏi",
  970: "theo; chiếu; soi",
  976: "giấy",
  993: "luôn; nhìn chung; tổng",
};

const TEXTS = [
  {
    textId: `${LESSON_ID}:reading-01`,
    kind: "graded-reading",
    titleHanzi: "小林的请假手续",
    titleVi: "Thủ tục xin nghỉ của Tiểu Lâm",
    audio: null,
    lines: [
      {
        lineId: "r01",
        hanzi:
          "小林在一家公司办公室工作，最近他决定参加一个周末汉语活动。",
        pinyin:
          "Xiǎo Lín zài yì jiā gōngsī bàngōngshì gōngzuò, zuìjìn tā juédìng cānjiā yí ge zhōumò Hànyǔ huódòng.",
        vietnamese:
          "Tiểu Lâm làm việc tại văn phòng một công ty; gần đây anh quyết định tham gia một hoạt động tiếng Trung cuối tuần.",
      },
      {
        lineId: "r02",
        hanzi:
          "活动给年轻人一个练习说汉语的机会，可是时间正好是星期五下午。",
        pinyin:
          "Huódòng gěi niánqīng rén yí ge liànxí shuō Hànyǔ de jīhuì, kěshì shíjiān zhènghǎo shì Xīngqīwǔ xiàwǔ.",
        vietnamese:
          "Hoạt động cho người trẻ một cơ hội luyện nói tiếng Trung, nhưng thời gian lại đúng vào chiều thứ Sáu.",
      },
      {
        lineId: "r03",
        hanzi: "按照公司的要求，他得先在一张纸上写请假的原因。",
        pinyin:
          "Ànzhào gōngsī de yāoqiú, tā děi xiān zài yì zhāng zhǐ shàng xiě qǐngjià de yuányīn.",
        vietnamese:
          "Theo yêu cầu của công ty, trước tiên anh phải viết lý do xin nghỉ lên một tờ giấy.",
      },
      {
        lineId: "r04",
        hanzi: "他不知道该怎么办，就去问办公室的王阿姨。",
        pinyin:
          "Tā bù zhīdào gāi zěnme bàn, jiù qù wèn bàngōngshì de Wáng āyí.",
        vietnamese:
          "Anh không biết nên làm thế nào nên đi hỏi cô Vương ở văn phòng.",
      },
      {
        lineId: "r05",
        hanzi: "王阿姨告诉他，最好的方法是先请组长照着名单检查工作安排。",
        pinyin:
          "Wáng āyí gàosu tā, zuì hǎo de fāngfǎ shì xiān qǐng zǔzhǎng zhàozhe míngdān jiǎnchá gōngzuò ānpái.",
        vietnamese:
          "Cô Vương nói cách tốt nhất là trước tiên nhờ tổ trưởng kiểm tra lịch công việc theo danh sách.",
      },
      {
        lineId: "r06",
        hanzi: "如果没有重要的客人，他就可以把申请交给经理。",
        pinyin:
          "Rúguǒ méiyǒu zhòngyào de kèrén, tā jiù kěyǐ bǎ shēnqǐng jiāo gěi jīnglǐ.",
        vietnamese:
          "Nếu không có khách quan trọng, anh có thể nộp đơn cho quản lý.",
      },
      {
        lineId: "r07",
        hanzi: "经理收到申请以后，很快同意了。",
        pinyin: "Jīnglǐ shōudào shēnqǐng yǐhòu, hěn kuài tóngyì le.",
        vietnamese: "Sau khi nhận được đơn, quản lý nhanh chóng đồng ý.",
      },
      {
        lineId: "r08",
        hanzi: "小林觉得这次办得不难，也明白了公司为什么需要这样的手续。",
        pinyin:
          "Xiǎo Lín juéde zhè cì bàn de bù nán, yě míngbai le gōngsī wèishénme xūyào zhèyàng de shǒuxù.",
        vietnamese:
          "Tiểu Lâm thấy lần này xử lý không khó và cũng hiểu vì sao công ty cần thủ tục như vậy.",
      },
    ],
  },
  {
    textId: `${LESSON_ID}:listening-01`,
    kind: "graded-listening",
    titleHanzi: "一张奇怪的外卖单",
    titleVi: "Một đơn giao đồ ăn kỳ lạ",
    audio: null,
    lines: [
      {
        lineId: "l01",
        hanzi: "周叔叔在小区的服务中心工作，每天都要接待不少客人。",
        pinyin:
          "Zhōu shūshu zài xiǎoqū de fúwù zhōngxīn gōngzuò, měitiān dōu yào jiēdài bù shǎo kèrén.",
        vietnamese:
          "Chú Châu làm việc tại trung tâm dịch vụ của khu dân cư và mỗi ngày đều tiếp khá nhiều khách.",
      },
      {
        lineId: "l02",
        hanzi: "今天上午，他收到一张奇怪的外卖单，名字却不在名单上。",
        pinyin:
          "Jīntiān shàngwǔ, tā shōudào yì zhāng qíguài de wàimài dān, míngzi què bú zài míngdān shàng.",
        vietnamese:
          "Sáng nay, chú nhận một đơn giao đồ ăn kỳ lạ nhưng tên lại không có trong danh sách.",
      },
      {
        lineId: "l03",
        hanzi: "送外卖的人说，客人住在附近，但是没有写房间号。",
        pinyin:
          "Sòng wàimài de rén shuō, kèrén zhù zài fùjìn, dànshì méiyǒu xiě fángjiān hào.",
        vietnamese:
          "Người giao đồ ăn nói khách ở gần đó nhưng không ghi số phòng.",
      },
      {
        lineId: "l04",
        hanzi: "周叔叔没有马上决定收下，而是先照着电话号码联系客人。",
        pinyin:
          "Zhōu shūshu méiyǒu mǎshàng juédìng shōuxià, érshì xiān zhàozhe diànhuà hàomǎ liánxì kèrén.",
        vietnamese:
          "Chú Châu không quyết định nhận ngay mà trước tiên liên lạc với khách theo số điện thoại.",
      },
      {
        lineId: "l05",
        hanzi: "客人解释说，外卖是给在草地上参加“四季摄影活动”的朋友订的。",
        pinyin:
          "Kèrén jiěshì shuō, wàimài shì gěi zài cǎodì shàng cānjiā “Sìjì Shèyǐng Huódòng” de péngyou dìng de.",
        vietnamese:
          "Khách giải thích đồ ăn được đặt cho một người bạn tham gia “Hoạt động nhiếp ảnh Bốn mùa” trên bãi cỏ.",
      },
      {
        lineId: "l06",
        hanzi: "原来活动的办公室不在楼里，而在小区花园旁边。",
        pinyin:
          "Yuánlái huódòng de bàngōngshì bú zài lóu lǐ, ér zài xiǎoqū huāyuán pángbiān.",
        vietnamese:
          "Hóa ra văn phòng của hoạt động không ở trong tòa nhà mà ở cạnh vườn của khu dân cư.",
      },
      {
        lineId: "l07",
        hanzi: "周叔叔请送餐员在纸上补写地点，然后带他过去。",
        pinyin:
          "Zhōu shūshu qǐng sòngcānyuán zài zhǐ shàng bǔxiě dìdiǎn, ránhòu dài tā guòqu.",
        vietnamese:
          "Chú Châu nhờ nhân viên giao đồ ăn bổ sung địa điểm trên giấy rồi dẫn anh ấy qua đó.",
      },
      {
        lineId: "l08",
        hanzi: "这件事看起来很小，却说明服务工作总要先检查清楚。",
        pinyin:
          "Zhè jiàn shì kànqilai hěn xiǎo, què shuōmíng fúwù gōngzuò zǒng yào xiān jiǎnchá qīngchu.",
        vietnamese:
          "Việc này có vẻ nhỏ nhưng cho thấy công việc dịch vụ luôn cần kiểm tra rõ trước.",
      },
    ],
  },
];

const COMPREHENSION_ITEMS = [
  {
    itemId: `${LESSON_ID}:reading-01:q01`,
    textId: `${LESSON_ID}:reading-01`,
    kind: "main-idea",
    skill: "reading",
    promptVi: "Đoạn văn chủ yếu nói về việc gì?",
    optionsVi: [
      "Tiểu Lâm tìm hiểu và hoàn thành thủ tục xin nghỉ",
      "Tiểu Lâm đổi sang một công ty mới",
      "Công ty tổ chức lớp tiếng Trung cuối tuần",
      "Tổ trưởng từ chối tiếp khách",
    ],
    correctOptionIndex: 0,
    rationaleVi:
      "Các câu 3–8 lần lượt nêu yêu cầu, cách hỏi, kiểm tra và kết quả xin nghỉ.",
  },
  {
    itemId: `${LESSON_ID}:reading-01:q02`,
    textId: `${LESSON_ID}:reading-01`,
    kind: "detail",
    skill: "reading",
    promptVi: "Vì sao Tiểu Lâm cần xin nghỉ?",
    optionsVi: [
      "Vì anh bị ốm",
      "Vì hoạt động tiếng Trung diễn ra vào chiều thứ Sáu",
      "Vì anh phải tiếp một vị khách",
      "Vì văn phòng chuyển địa điểm",
    ],
    correctOptionIndex: 1,
    rationaleVi: "Câu 2 nói thời gian hoạt động đúng vào chiều thứ Sáu.",
  },
  {
    itemId: `${LESSON_ID}:reading-01:q03`,
    textId: `${LESSON_ID}:reading-01`,
    kind: "sequence",
    skill: "reading",
    promptVi: "Theo cô Vương, bước nào cần làm trước?",
    optionsVi: [
      "Nộp đơn thẳng cho quản lý",
      "Gọi cho khách hàng",
      "Nhờ tổ trưởng kiểm tra lịch công việc",
      "Đổi ngày hoạt động",
    ],
    correctOptionIndex: 2,
    rationaleVi: "Câu 5 dùng 先 để đánh dấu bước kiểm tra lịch trước.",
  },
  {
    itemId: `${LESSON_ID}:reading-01:q04`,
    textId: `${LESSON_ID}:reading-01`,
    kind: "reference",
    skill: "reading",
    promptVi: "“这样的手续” ở câu cuối chỉ thủ tục nào?",
    optionsVi: [
      "Đăng ký lớp tiếng Trung",
      "Tiếp khách tại văn phòng",
      "Xin nghỉ và kiểm tra sắp xếp công việc",
      "Lập danh sách người trẻ",
    ],
    correctOptionIndex: 2,
    rationaleVi:
      "Cụm này quy chiếu toàn bộ các bước xin nghỉ vừa kể ở các câu trước.",
  },
  {
    itemId: `${LESSON_ID}:reading-01:q05`,
    textId: `${LESSON_ID}:reading-01`,
    kind: "simple-inference",
    skill: "reading",
    promptVi: "Có thể suy ra điều gì về công ty?",
    optionsVi: [
      "Công ty không cho nhân viên nghỉ",
      "Công ty cần biết công việc có bị ảnh hưởng trước khi duyệt",
      "Công ty chỉ làm việc vào cuối tuần",
      "Công ty bắt mọi khách viết đơn",
    ],
    correctOptionIndex: 1,
    rationaleVi:
      "Việc kiểm tra khách và lịch công việc trước khi duyệt cho thấy công ty quan tâm ảnh hưởng công việc.",
  },
  {
    itemId: `${LESSON_ID}:listening-01:q01`,
    textId: `${LESSON_ID}:listening-01`,
    kind: "main-idea",
    skill: "listening",
    promptVi: "Bài nghe kể về tình huống nào?",
    optionsVi: [
      "Một đơn giao đồ ăn thiếu thông tin địa điểm",
      "Một khách hàng muốn chuyển nhà",
      "Một hoạt động nhiếp ảnh bị hủy",
      "Một văn phòng tuyển nhân viên mới",
    ],
    correctOptionIndex: 0,
    rationaleVi:
      "Vấn đề bắt đầu từ đơn giao đồ ăn thiếu tên/phòng và kết thúc khi xác định được địa điểm.",
  },
  {
    itemId: `${LESSON_ID}:listening-01:q02`,
    textId: `${LESSON_ID}:listening-01`,
    kind: "detail",
    skill: "listening",
    promptVi: "Điều gì khiến đơn giao đồ ăn có vẻ kỳ lạ?",
    optionsVi: [
      "Món ăn quá đắt",
      "Tên trên đơn không có trong danh sách",
      "Người giao hàng đến quá muộn",
      "Khách không có số điện thoại",
    ],
    correctOptionIndex: 1,
    rationaleVi: "Câu 2 nêu trực tiếp tên không nằm trong danh sách.",
  },
  {
    itemId: `${LESSON_ID}:listening-01:q03`,
    textId: `${LESSON_ID}:listening-01`,
    kind: "sequence",
    skill: "listening",
    promptVi: "Chú Châu làm gì trước khi nhận đơn?",
    optionsVi: [
      "Dẫn người giao hàng tới vườn",
      "Bổ sung địa điểm lên giấy",
      "Liên lạc với khách theo số điện thoại",
      "Tìm tên người giao hàng trong danh sách",
    ],
    correctOptionIndex: 2,
    rationaleVi: "Câu 4 dùng 先 để nêu hành động liên lạc trước.",
  },
  {
    itemId: `${LESSON_ID}:listening-01:q04`,
    textId: `${LESSON_ID}:listening-01`,
    kind: "detail",
    skill: "listening",
    promptVi: "Đồ ăn được đặt cho ai?",
    optionsVi: [
      "Một người bạn đang tham gia hoạt động nhiếp ảnh",
      "Nhân viên của trung tâm dịch vụ",
      "Khách đang ở trong tòa nhà",
      "Người quản lý khu dân cư",
    ],
    correctOptionIndex: 0,
    rationaleVi: "Câu 5 nói đồ ăn dành cho người bạn tham gia hoạt động.",
  },
  {
    itemId: `${LESSON_ID}:listening-01:q05`,
    textId: `${LESSON_ID}:listening-01`,
    kind: "simple-inference",
    skill: "listening",
    promptVi: "Người nói muốn nhấn mạnh phẩm chất nào trong công việc dịch vụ?",
    optionsVi: [
      "Luôn quyết định thật nhanh",
      "Kiểm tra thông tin rõ ràng trước khi xử lý",
      "Không nhận các đơn giao đồ ăn",
      "Chỉ giúp khách quen",
    ],
    correctOptionIndex: 1,
    rationaleVi: "Câu cuối rút ra bài học phải kiểm tra rõ trước.",
  },
];

const NOTE_GRIDS = [
  {
    itemId: `${LESSON_ID}:reading-01:note-grid`,
    textId: `${LESSON_ID}:reading-01`,
    skill: "reading",
    promptVi: "Điền bốn ô ghi chú trước khi tóm tắt đoạn đọc.",
    fields: [
      { key: "goal", labelVi: "Mục tiêu của Tiểu Lâm", modelVi: "Tham gia hoạt động tiếng Trung và xin nghỉ chiều thứ Sáu" },
      { key: "requirement", labelVi: "Yêu cầu của công ty", modelVi: "Viết lý do, kiểm tra lịch công việc và khách quan trọng" },
      { key: "helper", labelVi: "Người hướng dẫn", modelVi: "Cô Vương ở văn phòng" },
      { key: "result", labelVi: "Kết quả", modelVi: "Quản lý nhận đơn và đồng ý" },
    ],
  },
  {
    itemId: `${LESSON_ID}:listening-01:note-grid`,
    textId: `${LESSON_ID}:listening-01`,
    skill: "listening",
    promptVi: "Nghe và điền bốn ô theo diễn biến sự việc.",
    fields: [
      { key: "problem", labelVi: "Vấn đề", modelVi: "Đơn giao đồ ăn thiếu thông tin địa điểm" },
      { key: "check", labelVi: "Cách kiểm tra", modelVi: "Liên hệ khách theo số điện thoại" },
      { key: "destination", labelVi: "Điểm đến thật", modelVi: "Văn phòng hoạt động cạnh vườn khu dân cư" },
      { key: "lesson", labelVi: "Bài học", modelVi: "Cần kiểm tra rõ trước khi xử lý" },
    ],
  },
];

const GUIDED_SUMMARIES = [
  {
    itemId: `${LESSON_ID}:reading-01:summary`,
    textId: `${LESSON_ID}:reading-01`,
    skill: "writing",
    promptVi:
      "Dùng các từ 先、如果、以后 để tóm tắt thủ tục xin nghỉ trong 4–5 câu.",
    requiredElements: ["lý do xin nghỉ", "bước kiểm tra", "kết quả"],
    modelHanzi:
      "小林想参加汉语活动，所以需要请假。他先写请假的原因，再请组长检查工作安排。如果没有重要客人，他就把申请交给经理。经理收到申请以后同意了。",
    modelPinyin:
      "Xiǎo Lín xiǎng cānjiā Hànyǔ huódòng, suǒyǐ xūyào qǐngjià. Tā xiān xiě qǐngjià de yuányīn, zài qǐng zǔzhǎng jiǎnchá gōngzuò ānpái. Rúguǒ méiyǒu zhòngyào kèrén, tā jiù bǎ shēnqǐng jiāo gěi jīnglǐ. Jīnglǐ shōudào shēnqǐng yǐhòu tóngyì le.",
    modelVi:
      "Tiểu Lâm muốn tham gia hoạt động tiếng Trung nên cần xin nghỉ. Anh viết lý do trước rồi nhờ tổ trưởng kiểm tra lịch công việc. Nếu không có khách quan trọng, anh nộp đơn cho quản lý. Sau khi nhận đơn, quản lý đồng ý.",
  },
  {
    itemId: `${LESSON_ID}:listening-01:summary`,
    textId: `${LESSON_ID}:listening-01`,
    skill: "speaking",
    promptVi:
      "Dựa vào ghi chú, kể lại vấn đề–cách kiểm tra–kết quả trong 45–60 giây.",
    requiredElements: ["đơn thiếu thông tin", "liên hệ khách", "xác định địa điểm", "bài học"],
    modelHanzi:
      "周叔叔收到一张没有写清地点的外卖单。他没有马上收下，而是先联系客人。客人说外卖要送到花园旁边的活动办公室。周叔叔让送餐员补写地点，并带他过去。这件事说明服务工作要先检查清楚。",
    modelPinyin:
      "Zhōu shūshu shōudào yì zhāng méiyǒu xiě qīng dìdiǎn de wàimài dān. Tā méiyǒu mǎshàng shōuxià, érshì xiān liánxì kèrén. Kèrén shuō wàimài yào sòng dào huāyuán pángbiān de huódòng bàngōngshì. Zhōu shūshu ràng sòngcānyuán bǔxiě dìdiǎn, bìng dài tā guòqu. Zhè jiàn shì shuōmíng fúwù gōngzuò yào xiān jiǎnchá qīngchu.",
    modelVi:
      "Chú Châu nhận một đơn giao đồ ăn không ghi rõ địa điểm. Chú chưa nhận ngay mà liên hệ khách trước. Khách nói cần giao đến văn phòng hoạt động cạnh vườn. Chú nhờ người giao bổ sung địa điểm rồi dẫn anh ấy tới đó. Việc này cho thấy công việc dịch vụ cần kiểm tra rõ trước.",
  },
];

const pickDistinct = (lexemes, targetIndex, field) => {
  const target = lexemes[targetIndex][field];
  const results = [];
  for (let offset = 1; offset < lexemes.length * 2 && results.length < 3; offset += 1) {
    const value = lexemes[(targetIndex + offset) % lexemes.length][field];
    if (value !== target && !results.includes(value)) results.push(value);
  }
  if (results.length !== 3) {
    throw new Error(`Cannot create ${field} distractors`);
  }
  return results;
};

export const buildHsk3PersonalParagraphPack = (root = process.cwd()) => {
  const blueprintBundle = loadHsk3LessonBlueprintsBundle(root);
  assertValidHsk3LessonBlueprintsBundle(blueprintBundle);
  const lesson = blueprintBundle.pack.lessons.find(
    (candidate) => candidate.lessonId === LESSON_ID,
  );
  if (!lesson) throw new Error(`Missing HSK3 lesson ${LESSON_ID}`);
  const vocabularyById = new Map(
    blueprintBundle.vocabularyBundle.draft.entries.map((entry) => [
      entry.officialId,
      entry,
    ]),
  );
  const lexemes = lesson.inventoryMappings.vocabularyIds.map((officialId) => {
    const source = vocabularyById.get(officialId);
    const vietnameseGlossDraft = VI_GLOSS_BY_SEQUENCE[source?.sequence];
    if (!source || !vietnameseGlossDraft) {
      throw new Error(`${officialId} source or Vietnamese gloss is missing`);
    }
    return {
      officialId,
      sequence: source.sequence,
      simplified: source.simplified,
      pinyin: source.officialPinyin,
      officialPartOfSpeech: source.officialPartOfSpeech,
      vietnameseGlossDraft,
      sourceLineSha256: [
        ...new Set(source.sourceMatches.map(
          (match) => match.sourceLineSha256,
        )),
      ],
      sourceSenseReview: "pending",
      mandarinLinguisticReview: "pending",
      vietnameseEditorialReview: "pending",
    };
  });
  const combinedHanzi = TEXTS.flatMap((text) =>
    text.lines.map((line) => line.hanzi)
  ).join("");
  for (const lexeme of lexemes) {
    if (!combinedHanzi.includes(lexeme.simplified)) {
      throw new Error(`${lexeme.officialId} is absent from the authored texts`);
    }
  }
  const vocabularyPracticeItems = lexemes.flatMap((lexeme, index) => {
    const pinyinDistractors = pickDistinct(lexemes, index, "pinyin");
    const hanziDistractors = pickDistinct(lexemes, index, "simplified");
    const glossDistractors = pickDistinct(
      lexemes,
      index,
      "vietnameseGlossDraft",
    );
    const common = {
      lessonId: LESSON_ID,
      officialVocabularyId: lexeme.officialId,
      review: "pending",
      releaseEligible: false,
      measurementEligible: false,
      masteryEligible: false,
    };
    return [
      {
        ...common,
        itemId: `${LESSON_ID}:${lexeme.officialId}:meaning`,
        kind: "meaning-selection",
        prompt: lexeme.simplified,
        options: [
          glossDistractors[0],
          lexeme.vietnameseGlossDraft,
          glossDistractors[1],
          glossDistractors[2],
        ],
        correctAnswer: lexeme.vietnameseGlossDraft,
        scoringPolicy: "automatic-draft-only",
      },
      {
        ...common,
        itemId: `${LESSON_ID}:${lexeme.officialId}:pinyin`,
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
        ...common,
        itemId: `${LESSON_ID}:${lexeme.officialId}:listening`,
        kind: "listening-selection",
        prompt: "Chọn từ bạn nghe được.",
        audio: null,
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
  const practiceState = {
    review: "pending",
    releaseEligible: false,
    measurementEligible: false,
    masteryEligible: false,
    scoringPolicy: "source-exposed-practice-only",
  };
  const comprehensionItems = COMPREHENSION_ITEMS.map((item) => ({
    ...item,
    audio: item.skill === "listening" ? null : undefined,
    ttsDisclosure:
      item.skill === "listening" ? "synthetic-browser-voice" : undefined,
    ...practiceState,
  }));
  const noteGrids = NOTE_GRIDS.map((item) => ({
    ...item,
    audio: item.skill === "listening" ? null : undefined,
    ttsDisclosure:
      item.skill === "listening" ? "synthetic-browser-voice" : undefined,
    responseMode: "learner-notes-with-model-reveal",
    ...practiceState,
  }));
  const guidedSummaries = GUIDED_SUMMARIES.map((item) => ({
    ...item,
    responseMode: "self-record-or-write-with-model-reveal",
    reviewedRubric: null,
    ...practiceState,
  }));
  const allPracticeIds = [
    ...vocabularyPracticeItems,
    ...comprehensionItems,
    ...noteGrids,
    ...guidedSummaries,
  ].map((item) => item.itemId);
  const audioDependentItems =
    vocabularyPracticeItems.filter((item) =>
      item.kind === "listening-selection"
    ).length
    + comprehensionItems.filter((item) => item.skill === "listening").length
    + noteGrids.filter((item) => item.skill === "listening").length
    + guidedSummaries.filter((item) => item.skill === "speaking").length;
  return {
    schemaVersion: 1,
    packId: "hsk3-personal-paragraph-identity-2026.07",
    level: 3,
    lessonId: LESSON_ID,
    state: "ai-assisted-content-draft",
    learnerVisible: false,
    releaseEligible: false,
    derivedArtifactLicense: "CC-BY-SA-4.0",
    source: {
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      vocabularyDraftId:
        blueprintBundle.vocabularyBundle.draft.draftId,
      vocabularyDraftSha256: fileSha256(
        blueprintBundle.vocabularyBundle.draftPath,
      ),
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
      lessonVocabularyDrafted: true,
      lessonVocabularyAppearsInAuthoredText: true,
      paragraphPracticeDrafted: true,
      reviewedContentComplete: false,
      assessmentCoverageComplete: false,
      hsk3Complete: false,
    },
    counts: {
      lessons: 1,
      vocabularyDrafts: lexemes.length,
      authoredTexts: TEXTS.length,
      authoredTextLines: TEXTS.flatMap((text) => text.lines).length,
      vocabularyPracticeItems: vocabularyPracticeItems.length,
      comprehensionItems: comprehensionItems.length,
      readingComprehensionItems: comprehensionItems.filter(
        (item) => item.skill === "reading",
      ).length,
      listeningComprehensionItems: comprehensionItems.filter(
        (item) => item.skill === "listening",
      ).length,
      noteGridItems: noteGrids.length,
      guidedSummaryItems: guidedSummaries.length,
      authoredPracticeItems: allPracticeIds.length,
      audioDependentItems,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 1,
      approvals: 0,
      releaseEligibleItems: 0,
    },
    lexemes,
    texts: TEXTS,
    vocabularyPracticeItems,
    comprehensionItems,
    noteGrids,
    guidedSummaries,
    reviewBatches: [{
      batchId: `${LESSON_ID}:content-review-v1`,
      lessonId: LESSON_ID,
      lexemeIds: lexemes.map((lexeme) => lexeme.officialId),
      textIds: TEXTS.map((text) => text.textId),
      practiceItemIds: allPracticeIds,
      requiredRoles: [
        "native-mandarin-reviewer",
        "vietnamese-editor",
        "assessment-editor",
        "audio-rights-reviewer",
      ],
      state: "pending",
      approvals: [],
    }],
  };
};

export const serializeHsk3PersonalParagraphPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3PersonalParagraphPack(
    buildHsk3PersonalParagraphPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 personal paragraph pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH,
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
