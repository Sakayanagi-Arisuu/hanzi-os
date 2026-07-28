import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2VocabularyPracticeBundle,
  loadHsk2VocabularyPracticeBundle,
} from "../../src/content/hsk2VocabularyPractice.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH =
  "content/drafts/hsk2-situational-dialogues-2026.07.json";

const TOPIC_PROMPTS = {
  1: ["Miêu tả ngoại hình, trang phục hoặc sinh nhật của một người.", ["Người đó có đặc điểm gì dễ nhận ra?", "Sinh nhật hoặc trang phục của người đó thế nào?"]],
  2: ["Giới thiệu thân phận, thói quen, sở thích và nơi xuất thân.", ["Người đó đến từ đâu và đang làm gì?", "Người đó thường thích làm gì?"]],
  3: ["Kể lại một sự kiện với người tham gia, thời gian, cách thức, địa điểm và nguyên nhân.", ["Sự việc xảy ra khi nào, ở đâu?", "Vì sao tình trạng hoặc kế hoạch thay đổi?"]],
  4: ["Hỏi và mô tả tên, màu sắc, số lượng, vị trí và điểm khác nhau của đồ vật.", ["Đồ vật ở đâu và có màu gì?", "Hai lựa chọn khác nhau ở điểm nào?"]],
  5: ["Giới thiệu thời tiết hiện tại và ảnh hưởng của nó đến kế hoạch.", ["Hôm nay trời nắng, âm u hay mưa?", "Kế hoạch cần giữ nguyên hay thay đổi?"]],
  6: ["Giới thiệu một địa điểm bằng vị trí và các đặc điểm môi trường dễ nhận biết.", ["Địa điểm nằm ở đâu?", "Bên trong hoặc xung quanh có gì?"]],
  7: ["Thực hiện lời xin lỗi, cảm ơn hoặc đáp lời lịch sự đúng tình huống.", ["Bạn cần mở đầu lịch sự thế nào?", "Người nghe nên đáp lại ra sao?"]],
  8: ["Duy trì một tương tác ngắn bằng yêu cầu, hỏi lại và xác nhận.", ["Bạn cần người kia giúp việc gì?", "Bạn sẽ xác nhận đã hiểu thế nào?"]],
  9: ["Nói rõ mong muốn, cảm nhận hoặc lựa chọn cá nhân.", ["Bạn muốn phương án nào?", "Bạn cảm thấy thế nào và vì sao?"]],
  10: ["Trao đổi về món ăn và đồ uống quen thuộc.", ["Bạn muốn ăn món gì?", "Bạn chọn loại đồ uống nào?"]],
  11: ["Nói về thói quen ăn uống thường ngày.", ["Bạn thường ăn ở nhà hay bên ngoài?", "Bạn thường ăn hoặc uống gì?"]],
  12: ["Thực hiện hội thoại gọi món và xác nhận lựa chọn trong bữa ăn.", ["Bạn sẽ gọi món thế nào?", "Bạn cần xác nhận số lượng hoặc đồ uống nào?"]],
  13: ["Hỏi đường tới một địa điểm và nhắc lại tuyến đi để xác nhận.", ["Phải bắt đầu đi từ đâu?", "Địa điểm đích nằm bên trái hay bên phải?"]],
  14: ["Trao đổi cách di chuyển và các chặng trên tuyến đi.", ["Bạn chọn phương tiện nào?", "Bạn cần đi vào, đi ra, lên hay xuống ở đâu?"]],
  15: ["Sắp xếp chuyến đi bằng thời gian, vé, phương tiện và nơi ở.", ["Khi nào bạn xuất phát?", "Bạn đã chuẩn bị vé và khách sạn chưa?"]],
  16: ["Nói cảm nhận về một chuyến đi hoặc cách di chuyển.", ["Đường đi xa hay gần?", "Trải nghiệm nhanh, chậm hay thú vị?"]],
  17: ["Chọn mua sản phẩm theo nhu cầu, giá và tình trạng.", ["Bạn muốn mua sản phẩm nào?", "Giá và tình trạng sản phẩm có phù hợp không?"]],
  18: ["Mô tả màu sắc, kích thước, chất lượng hoặc khác biệt của sản phẩm.", ["Sản phẩm trông thế nào?", "Bạn muốn đổi đặc điểm nào?"]],
  19: ["Mô tả triệu chứng và thời điểm bắt đầu bị bệnh.", ["Bộ phận nào khó chịu?", "Bạn mệt hoặc đau từ khi nào?"]],
  20: ["Trao đổi việc đi khám, mua thuốc và chăm sóc người bệnh.", ["Có cần đi bệnh viện hoặc hiệu thuốc không?", "Người bệnh cần làm gì tiếp theo?"]],
  21: ["Trao đổi về hoạt động giải trí đã làm hoặc muốn thử.", ["Bạn thường chơi môn gì?", "Hoạt động nào thú vị hơn với bạn?"]],
  22: ["Hẹn thời gian, địa điểm và hoạt động cho lúc rảnh.", ["Hai người gặp lúc mấy giờ?", "Sẽ gặp ở đâu và làm gì?"]],
  23: ["Giới thiệu quan hệ giữa các thành viên trong gia đình.", ["Bạn sống cùng những ai?", "Mỗi người có quan hệ gì với bạn?"]],
  24: ["Mô tả cách gia đình phân chia hoặc cùng làm hoạt động hằng ngày.", ["Ai thường nấu ăn hoặc chăm trẻ?", "Gia đình làm gì cùng nhau?"]],
  25: ["Giới thiệu lớp học, môn học, lịch học và tình hình hiện tại.", ["Bạn đang học gì và ở lớp nào?", "Mỗi tuần bạn học bao nhiêu buổi?"]],
  26: ["Kể ngắn quá trình học và một trải nghiệm đáng nhớ.", ["Bạn bắt đầu học từ khi nào?", "Bạn từng gặp khó khăn hoặc tiến bộ gì?"]],
  27: ["Giới thiệu quy mô, phòng học hoặc con người trong trường.", ["Trường và lớp học thế nào?", "Ai học hoặc làm việc ở đó?"]],
  28: ["Trao đổi hoạt động sau giờ học.", ["Bạn làm gì sau khi tan học?", "Bạn làm một mình hay cùng bạn bè?"]],
  29: ["Hỏi và trả lời nơi làm việc, thời gian và nhiệm vụ.", ["Bạn làm việc ở đâu, lúc nào?", "Bạn đang phụ trách việc gì?"]],
  30: ["Kể một trải nghiệm và cảm nhận về công việc.", ["Bạn đã làm công việc này bao lâu?", "Điều gì làm bạn thấy vui hoặc mệt?"]],
  31: ["Giới thiệu nghề nghiệp hoặc tình trạng nghề nghiệp của một người.", ["Người đó làm nghề gì?", "Nơi làm việc có quy mô thế nào?"]],
  32: ["Giới thiệu hoạt động và lời chúc trong một dịp lễ truyền thống.", ["Mọi người làm gì trong dịp đó?", "Bạn sẽ dùng lời chúc nào?"]],
  33: ["Nói ấn tượng về món ăn Trung Quốc.", ["Bạn đã thử món nào?", "Mùi vị hoặc cách ăn có gì đáng nhớ?"]],
  34: ["Hỏi họ tên và dùng cách xưng hô tiếng Trung phù hợp.", ["Bạn hỏi họ một cách lịch sự thế nào?", "Khi nào dùng họ kèm chức danh?"]],
};

const DIALOGUES = {
  "hsk2-person-events-environment-lesson-01": {
    scenarioVi: "Hai bạn mới quen hỏi tiếp về ngoại hình thời nhỏ và sở thích hiện nay.",
    taskInstructionVi: "Đóng vai hai người mới quen; duy trì ít nhất sáu lượt để hỏi ngoại hình, lai lịch hoặc sở thích và có một câu hỏi tiếp nối.",
    functions: ["describe-personal-background", "ask-follow-up", "state-habit-or-interest"],
    usedVocabularyIds: ["hsk-vocab-00302", "hsk-vocab-00344", "hsk-vocab-00462"],
    turns: [
      ["A", "你个子很高，你小时候也这么高吗？", "Nǐ gèzi hěn gāo, nǐ xiǎoshíhou yě zhème gāo ma?", "Bạn cao thật, hồi nhỏ bạn cũng cao thế này à?"],
      ["B", "没有，我小时候个子不高。", "Méiyǒu, wǒ xiǎoshíhou gèzi bù gāo.", "Không, hồi nhỏ tôi không cao."],
      ["A", "你有什么爱好？", "Nǐ yǒu shénme àihào?", "Bạn có sở thích gì?"],
      ["B", "我最喜欢踢足球。", "Wǒ zuì xǐhuan tī zúqiú.", "Tôi thích đá bóng nhất."],
      ["A", "你常跟谁一起踢？", "Nǐ cháng gēn shéi yìqǐ tī?", "Bạn thường đá cùng ai?"],
      ["B", "我常跟同学一起踢。", "Wǒ cháng gēn tóngxué yìqǐ tī.", "Tôi thường đá cùng bạn học."],
    ],
  },
  "hsk2-person-events-environment-lesson-02": {
    scenarioVi: "Một người hỏi nguyên nhân bạn đến muộn và cùng chọn cách tránh lặp lại.",
    taskInstructionVi: "Hỏi và trả lời sáu lượt về một sự việc; phải nêu thời gian, nguyên nhân, trạng thái và một phương án tiếp theo.",
    functions: ["ask-event-cause", "report-event-state", "propose-next-action"],
    usedVocabularyIds: ["hsk-vocab-00334", "hsk-vocab-00382", "hsk-vocab-00439", "hsk-vocab-00454"],
    turns: [
      ["A", "你为什么来晚了？", "Nǐ wèishénme lái wǎn le?", "Tại sao bạn đến muộn?"],
      ["B", "我在车站等公交车，但是车没来。", "Wǒ zài chēzhàn děng gōngjiāochē, dànshì chē méi lái.", "Tôi đợi xe buýt ở nhà ga nhưng xe không đến."],
      ["A", "你等了多长时间？", "Nǐ děng le duō cháng shíjiān?", "Bạn đã đợi bao lâu?"],
      ["B", "我等了半个小时。", "Wǒ děng le bàn ge xiǎoshí.", "Tôi đã đợi nửa tiếng."],
      ["A", "下次你可能怎么来？", "Xià cì nǐ kěnéng zěnme lái?", "Lần sau bạn có thể đến bằng cách nào?"],
      ["B", "我可能坐地铁，所以不会晚了。", "Wǒ kěnéng zuò dìtiě, suǒyǐ bú huì wǎn le.", "Có thể tôi sẽ đi tàu điện ngầm, vì vậy sẽ không muộn nữa."],
    ],
  },
  "hsk2-person-events-environment-lesson-03": {
    scenarioVi: "Khách chọn giữa hai bộ quần áo có màu và độ dài khác nhau.",
    taskInstructionVi: "Đóng vai khách và người bán; hỏi tên hoặc đặc điểm, so sánh hai lựa chọn rồi xác nhận món muốn lấy.",
    functions: ["ask-object-feature", "compare-options", "confirm-selection"],
    usedVocabularyIds: ["hsk-vocab-00355", "hsk-vocab-00396", "hsk-vocab-00406", "hsk-vocab-00466"],
    turns: [
      ["A", "你想买哪件衣服？", "Nǐ xiǎng mǎi nǎ jiàn yīfu?", "Bạn muốn mua bộ quần áo nào?"],
      ["B", "我想看看红色的。", "Wǒ xiǎng kànkan hóngsè de.", "Tôi muốn xem bộ màu đỏ."],
      ["A", "绿色的也不错，你觉得呢？", "Lǜsè de yě búcuò, nǐ juéde ne?", "Bộ màu xanh lá cũng khá đấy, bạn thấy sao?"],
      ["B", "红色的比绿色的好看。", "Hóngsè de bǐ lǜsè de hǎokàn.", "Bộ màu đỏ đẹp hơn bộ màu xanh lá."],
      ["A", "你要什么样的颜色？", "Nǐ yào shénme yàng de yánsè?", "Bạn muốn màu sắc như thế nào?"],
      ["B", "就要红色的，不要那么长的。", "Jiù yào hóngsè de, bú yào nàme cháng de.", "Tôi lấy bộ màu đỏ, không lấy bộ dài đến thế."],
    ],
  },
  "hsk2-person-events-environment-lesson-04": {
    scenarioVi: "Hai người xem thời tiết hôm nay và ngày mai để đổi kế hoạch vận động.",
    taskInstructionVi: "Giới thiệu thời tiết qua sáu lượt; nêu ít nhất hai trạng thái thời tiết và tác động của chúng lên kế hoạch.",
    functions: ["describe-weather", "ask-weather-change", "adjust-plan"],
    usedVocabularyIds: ["hsk-vocab-00420", "hsk-vocab-00475"],
    turns: [
      ["A", "今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"],
      ["B", "今天是阴天，有点儿冷。", "Jīntiān shì yīntiān, yǒudiǎnr lěng.", "Hôm nay trời âm u, hơi lạnh."],
      ["A", "明天会下雨吗？", "Míngtiān huì xiàyǔ ma?", "Ngày mai có mưa không?"],
      ["B", "不会，明天是晴天。", "Bú huì, míngtiān shì qíngtiān.", "Không, ngày mai trời nắng."],
      ["A", "那我们明天去运动，好吗？", "Nà wǒmen míngtiān qù yùndòng, hǎo ma?", "Vậy ngày mai chúng ta đi vận động nhé?"],
      ["B", "好，天气晴的时候一起去。", "Hǎo, tiānqì qíng de shíhou yìqǐ qù.", "Được, lúc trời nắng chúng ta cùng đi."],
    ],
  },
  "hsk2-person-events-environment-lesson-05": {
    scenarioVi: "Một người giới thiệu căn phòng và vị trí các tiện ích xung quanh.",
    taskInstructionVi: "Giới thiệu một địa điểm trong sáu lượt; phải có vị trí, ít nhất hai vật hoặc đặc điểm và một câu hỏi xác nhận.",
    functions: ["locate-place", "describe-interior", "describe-surroundings"],
    usedVocabularyIds: ["hsk-vocab-00321", "hsk-vocab-00366", "hsk-vocab-00403"],
    turns: [
      ["A", "你住的地方怎么样？", "Nǐ zhù de dìfang zěnmeyàng?", "Nơi bạn sống thế nào?"],
      ["B", "我住在学校对面的一间房里。", "Wǒ zhù zài xuéxiào duìmiàn de yì jiān fáng lǐ.", "Tôi sống trong một căn phòng đối diện trường."],
      ["A", "房间里有什么？", "Fángjiān lǐ yǒu shénme?", "Trong phòng có gì?"],
      ["B", "有一张床和一张桌子。", "Yǒu yì zhāng chuáng hé yì zhāng zhuōzi.", "Có một chiếc giường và một chiếc bàn."],
      ["A", "外面有商店吗？", "Wàimiàn yǒu shāngdiàn ma?", "Bên ngoài có cửa hàng không?"],
      ["B", "有，商店就在房间对面。", "Yǒu, shāngdiàn jiù zài fángjiān duìmiàn.", "Có, cửa hàng ở ngay đối diện căn phòng."],
    ],
  },
  "hsk2-daily-needs-family-lesson-01": {
    scenarioVi: "Một người lịch sự nhờ bạn mở cửa vì tay bị đau.",
    taskInstructionVi: "Duy trì sáu lượt giao tiếp lịch sự gồm mở lời, nhờ giúp, hỏi lại, giải thích và đáp lời phù hợp.",
    functions: ["make-polite-request", "clarify-request", "offer-help"],
    usedVocabularyIds: ["hsk-vocab-00305", "hsk-vocab-00313", "hsk-vocab-00329", "hsk-vocab-00455"],
    turns: [
      ["A", "不好意思，你能帮我一个忙吗？", "Bù hǎoyìsi, nǐ néng bāng wǒ yí ge máng ma?", "Xin lỗi, bạn có thể giúp tôi một việc không?"],
      ["B", "可以，你希望我帮你做什么？", "Kěyǐ, nǐ xīwàng wǒ bāng nǐ zuò shénme?", "Được, bạn muốn tôi giúp việc gì?"],
      ["A", "请帮我打开门。", "Qǐng bāng wǒ dǎkāi mén.", "Xin hãy giúp tôi mở cửa."],
      ["B", "好。你为什么自己不打开？", "Hǎo. Nǐ wèishénme zìjǐ bù dǎkāi?", "Được. Tại sao bạn không tự mở?"],
      ["A", "我的手疼。", "Wǒ de shǒu téng.", "Tay tôi bị đau."],
      ["B", "那你别拿东西了，让我来吧。", "Nà nǐ bié ná dōngxi le, ràng wǒ lái ba.", "Vậy bạn đừng cầm đồ nữa, để tôi làm."],
    ],
  },
  "hsk2-daily-needs-family-lesson-02": {
    scenarioVi: "Hai người hỏi thói quen ăn ngoài, chọn món và đồ uống.",
    taskInstructionVi: "Hỏi đáp sáu lượt về thói quen ăn uống; phải chọn món, đồ uống và xác nhận nơi hoặc thời điểm dùng bữa.",
    functions: ["ask-dining-habit", "choose-food", "choose-drink"],
    usedVocabularyIds: ["hsk-vocab-00339", "hsk-vocab-00374", "hsk-vocab-00395", "hsk-vocab-00493"],
    turns: [
      ["A", "你经常在饭馆吃饭吗？", "Nǐ jīngcháng zài fànguǎn chīfàn ma?", "Bạn có thường ăn ở nhà hàng không?"],
      ["B", "不，我常在家吃，今天没准备晚饭。", "Bù, wǒ cháng zài jiā chī, jīntiān méi zhǔnbèi wǎnfàn.", "Không, tôi thường ăn ở nhà, hôm nay chưa chuẩn bị bữa tối."],
      ["A", "你喜欢吃肉还是鱼？", "Nǐ xǐhuan chī ròu háishi yú?", "Bạn thích ăn thịt hay cá?"],
      ["B", "我更喜欢鱼。", "Wǒ gèng xǐhuan yú.", "Tôi thích cá hơn."],
      ["A", "喝红茶还是绿茶？", "Hē hóngchá háishi lǜchá?", "Uống trà đen hay trà xanh?"],
      ["B", "绿茶，谢谢。", "Lǜchá, xièxie.", "Trà xanh, cảm ơn."],
    ],
  },
  "hsk2-daily-needs-family-lesson-03": {
    scenarioVi: "Khách xem quần và hỏi thêm về giá, đồng hồ trong cửa hàng.",
    taskInstructionVi: "Đóng vai mua sắm trong sáu lượt; mô tả ít nhất hai đặc điểm, hỏi giá và quyết định lấy hoặc không lấy.",
    functions: ["describe-product", "ask-price", "decide-purchase"],
    usedVocabularyIds: ["hsk-vocab-00357", "hsk-vocab-00360", "hsk-vocab-00383", "hsk-vocab-00434"],
    turns: [
      ["A", "这条裤子怎么样？", "Zhè tiáo kùzi zěnmeyàng?", "Chiếc quần này thế nào?"],
      ["B", "颜色不错，但是有点儿长。", "Yánsè búcuò, dànshì yǒudiǎnr cháng.", "Màu khá đẹp nhưng hơi dài."],
      ["A", "你要拿这条吗？", "Nǐ yào ná zhè tiáo ma?", "Bạn lấy chiếc này không?"],
      ["B", "先看看价钱。这条要花多少钱？", "Xiān kànkan jiàqian. Zhè tiáo yào huā duōshao qián?", "Xem giá trước đã. Chiếc này tốn bao nhiêu tiền?"],
      ["A", "一百块。你的手表也是在这个商场买的吗？", "Yì bǎi kuài. Nǐ de shǒubiǎo yě shì zài zhège shāngchǎng mǎi de ma?", "Một trăm tệ. Đồng hồ của bạn cũng mua ở trung tâm này à?"],
      ["B", "是，不过手表已经坏了。", "Shì, búguò shǒubiǎo yǐjīng huài le.", "Đúng, nhưng đồng hồ đã hỏng rồi."],
    ],
  },
  "hsk2-daily-needs-family-lesson-04": {
    scenarioVi: "Một người mô tả triệu chứng và được chỉ tới hiệu thuốc.",
    taskInstructionVi: "Đóng vai người bệnh và người hỏi thăm; dùng sáu lượt để nêu triệu chứng, nguyên nhân có thể và bước chăm sóc tiếp theo.",
    functions: ["report-symptoms", "ask-cause", "recommend-care"],
    usedVocabularyIds: ["hsk-vocab-00440", "hsk-vocab-00445", "hsk-vocab-00467", "hsk-vocab-00468", "hsk-vocab-00469", "hsk-vocab-00476"],
    turns: [
      ["A", "你怎么了？", "Nǐ zěnme le?", "Bạn bị làm sao?"],
      ["B", "我头疼，眼睛也不舒服。", "Wǒ tóuténg, yǎnjing yě bù shūfu.", "Tôi đau đầu, mắt cũng khó chịu."],
      ["A", "是不是因为昨天太累了？", "Shì bú shì yīnwèi zuótiān tài lèi le?", "Có phải vì hôm qua quá mệt không?"],
      ["B", "可能是。附近有药店吗？", "Kěnéng shì. Fùjìn yǒu yàodiàn ma?", "Có thể. Gần đây có hiệu thuốc không?"],
      ["A", "前面就有一家药店，我陪你去买药。", "Qiánmiàn jiù yǒu yì jiā yàodiàn, wǒ péi nǐ qù mǎi yào.", "Phía trước có một hiệu thuốc, tôi đi mua thuốc cùng bạn."],
      ["B", "谢谢，买药以后我就回家休息。", "Xièxie, mǎi yào yǐhòu wǒ jiù huí jiā xiūxi.", "Cảm ơn, mua thuốc xong tôi sẽ về nhà nghỉ."],
    ],
  },
  "hsk2-daily-needs-family-lesson-05": {
    scenarioVi: "Một người giới thiệu các thành viên sống cùng và việc nhà thường ngày.",
    taskInstructionVi: "Giới thiệu gia đình trong sáu lượt; nêu quan hệ của ít nhất ba người và hai hoạt động thường ngày.",
    functions: ["identify-family-relations", "describe-family-routine", "ask-follow-up"],
    usedVocabularyIds: ["hsk-vocab-00409", "hsk-vocab-00417", "hsk-vocab-00470", "hsk-vocab-00480", "hsk-vocab-00494"],
    turns: [
      ["A", "你跟谁一起住？", "Nǐ gēn shéi yìqǐ zhù?", "Bạn sống cùng ai?"],
      ["B", "我跟妻子、孩子，还有爷爷奶奶一起住。", "Wǒ gēn qīzi, háizi, hái yǒu yéye nǎinai yìqǐ zhù.", "Tôi sống cùng vợ, con và ông bà."],
      ["A", "你奶奶每天做饭吗？", "Nǐ nǎinai měitiān zuòfàn ma?", "Bà bạn nấu cơm hằng ngày à?"],
      ["B", "有时她做，有时我自己做。", "Yǒushí tā zuò, yǒushí wǒ zìjǐ zuò.", "Có khi bà nấu, có khi tôi tự nấu."],
      ["A", "你妻子和爷爷做什么？", "Nǐ qīzi hé yéye zuò shénme?", "Vợ và ông bạn làm gì?"],
      ["B", "妻子看孩子，爷爷常跟孩子玩。", "Qīzi kàn háizi, yéye cháng gēn háizi wán.", "Vợ tôi trông con, ông thường chơi với đứa trẻ."],
    ],
  },
  "hsk2-travel-leisure-lesson-01": {
    scenarioVi: "Người đi đường hỏi vị trí hiệu thuốc và nhắc lại các mốc.",
    taskInstructionVi: "Hỏi và chỉ đường trong sáu lượt; nêu điểm xuất phát, hai mốc hoặc hướng và xác nhận xa gần.",
    functions: ["ask-directions", "give-route", "confirm-distance"],
    usedVocabularyIds: ["hsk-vocab-00324", "hsk-vocab-00389", "hsk-vocab-00413", "hsk-vocab-00450", "hsk-vocab-00482"],
    turns: [
      ["A", "请问，药店怎么走？", "Qǐngwèn, yàodiàn zěnme zǒu?", "Xin hỏi, đi đến hiệu thuốc thế nào?"],
      ["B", "从这里往前走，到第二个路口往右边走。", "Cóng zhèlǐ wǎng qián zǒu, dào dì èr ge lùkǒu wǎng yòubian zǒu.", "Từ đây đi thẳng, đến ngã rẽ thứ hai thì đi sang phải."],
      ["A", "药店在路的哪边？", "Yàodiàn zài lù de nǎ biān?", "Hiệu thuốc ở phía nào của đường?"],
      ["B", "在饭馆旁边，门口有红色的字。", "Zài fànguǎn pángbiān, ménkǒu yǒu hóngsè de zì.", "Ở cạnh nhà hàng, cửa có chữ màu đỏ."],
      ["A", "离这里远吗？", "Lí zhèlǐ yuǎn ma?", "Có xa đây không?"],
      ["B", "不远，走路十分钟就到。", "Bù yuǎn, zǒulù shí fēnzhōng jiù dào.", "Không xa, đi bộ mười phút là tới."],
    ],
  },
  "hsk2-travel-leisure-lesson-02": {
    scenarioVi: "Một người hỏi từng chặng để đi vào trung tâm thương mại và lên tầng hai.",
    taskInstructionVi: "Thực hành sáu lượt chỉ tuyến; dùng ít nhất ba bổ ngữ hướng để mô tả đi vào, lên, xuống hoặc đi ra.",
    functions: ["sequence-route-steps", "use-directional-complements", "confirm-return-route"],
    usedVocabularyIds: ["hsk-vocab-00320", "hsk-vocab-00373", "hsk-vocab-00427", "hsk-vocab-00458"],
    turns: [
      ["A", "我怎么去二楼？", "Wǒ zěnme qù èr lóu?", "Tôi lên tầng hai thế nào?"],
      ["B", "从这个门进去，再往前走。", "Cóng zhège mén jìnqu, zài wǎng qián zǒu.", "Đi vào từ cửa này rồi đi thẳng."],
      ["A", "到前面以后呢？", "Dào qiánmiàn yǐhòu ne?", "Sau khi đến phía trước thì sao?"],
      ["B", "从右边的楼梯上去。", "Cóng yòubian de lóutī shàngqu.", "Đi lên bằng cầu thang bên phải."],
      ["A", "回来时也从这里下来吗？", "Huílái shí yě cóng zhèlǐ xiàlái ma?", "Khi về cũng đi xuống từ đây phải không?"],
      ["B", "对，下楼以后从左边的门出去。", "Duì, xià lóu yǐhòu cóng zuǒbian de mén chūqù.", "Đúng, xuống tầng rồi đi ra cửa bên trái."],
    ],
  },
  "hsk2-travel-leisure-lesson-03": {
    scenarioVi: "Hai người xác nhận vé, phương tiện, khách sạn cho chuyến đi.",
    taskInstructionVi: "Trao đổi sáu lượt về chuyến đi; chốt thời gian, phương tiện, vé, nơi ở và một cảm nhận về quãng đường.",
    functions: ["confirm-travel-plan", "state-transport", "describe-trip-feeling"],
    usedVocabularyIds: ["hsk-vocab-00335", "hsk-vocab-00363", "hsk-vocab-00364", "hsk-vocab-00375", "hsk-vocab-00394"],
    turns: [
      ["A", "你准备什么时候去旅游？", "Nǐ zhǔnbèi shénme shíhou qù lǚyóu?", "Bạn định khi nào đi du lịch?"],
      ["B", "下周，我已经买好机票了。", "Xià zhōu, wǒ yǐjīng mǎihǎo jīpiào le.", "Tuần sau, tôi đã mua vé máy bay rồi."],
      ["A", "你怎么去机场？", "Nǐ zěnme qù jīchǎng?", "Bạn đi sân bay thế nào?"],
      ["B", "我坐地铁去，不打车。", "Wǒ zuò dìtiě qù, bù dǎchē.", "Tôi đi tàu điện ngầm, không đi taxi."],
      ["A", "酒店离车站远吗？", "Jiǔdiàn lí chēzhàn yuǎn ma?", "Khách sạn có xa nhà ga không?"],
      ["B", "不远，从车站走十分钟。", "Bù yuǎn, cóng chēzhàn zǒu shí fēnzhōng.", "Không xa, đi từ nhà ga mười phút."],
    ],
  },
  "hsk2-travel-leisure-lesson-04": {
    scenarioVi: "Hai người so sánh các môn thể thao và hẹn cùng vận động.",
    taskInstructionVi: "Trao đổi sáu lượt về hoạt động giải trí; nêu ít nhất hai hoạt động, một so sánh và một lời hẹn.",
    functions: ["ask-leisure-preference", "compare-activities", "make-activity-plan"],
    usedVocabularyIds: ["hsk-vocab-00387", "hsk-vocab-00415", "hsk-vocab-00478", "hsk-vocab-00479", "hsk-vocab-00497"],
    turns: [
      ["A", "周末你喜欢什么运动？", "Zhōumò nǐ xǐhuan shénme yùndòng?", "Cuối tuần bạn thích môn thể thao nào?"],
      ["B", "我喜欢跑步，也喜欢游泳。", "Wǒ xǐhuan pǎobù, yě xǐhuan yóuyǒng.", "Tôi thích chạy bộ, cũng thích bơi."],
      ["A", "你会踢足球吗？", "Nǐ huì tī zúqiú ma?", "Bạn biết đá bóng không?"],
      ["B", "会，足球比篮球有意思。", "Huì, zúqiú bǐ lánqiú yǒuyìsi.", "Có, bóng đá thú vị hơn bóng rổ."],
      ["A", "明天一起去运动吧？", "Míngtiān yìqǐ qù yùndòng ba?", "Ngày mai cùng đi vận động nhé?"],
      ["B", "好，我们先跑步，再踢足球。", "Hǎo, wǒmen xiān pǎobù, zài tī zúqiú.", "Được, chúng ta chạy bộ trước rồi đá bóng."],
    ],
  },
  "hsk2-travel-leisure-lesson-05": {
    scenarioVi: "Hai người hẹn giờ và điểm gặp trước khi đi chơi.",
    taskInstructionVi: "Duy trì sáu lượt để sắp xếp thời gian rảnh; phải xác nhận giờ, điểm gặp và hoạt động chung.",
    functions: ["ask-availability", "set-meeting-place", "confirm-plan"],
    usedVocabularyIds: ["hsk-vocab-00418", "hsk-vocab-00471", "hsk-vocab-00473", "hsk-vocab-00486"],
    turns: [
      ["A", "你几点起来？", "Nǐ jǐ diǎn qǐlái?", "Bạn thức dậy lúc mấy giờ?"],
      ["B", "七点。吃早饭以后有时间。", "Qī diǎn. Chī zǎofàn yǐhòu yǒu shíjiān.", "Bảy giờ. Ăn sáng xong tôi có thời gian."],
      ["A", "那一会儿一起去打球吗？", "Nà yíhuìr yìqǐ qù dǎqiú ma?", "Vậy lát nữa cùng đi chơi bóng không?"],
      ["B", "好，我们在哪儿见？", "Hǎo, wǒmen zài nǎr jiàn?", "Được, chúng ta gặp ở đâu?"],
      ["A", "九点在车站见，我站在门口等你。", "Jiǔ diǎn zài chēzhàn jiàn, wǒ zhàn zài ménkǒu děng nǐ.", "Chín giờ gặp ở nhà ga, tôi đứng ở cửa đợi bạn."],
      ["B", "好，一会儿见。", "Hǎo, yíhuìr jiàn.", "Được, lát nữa gặp."],
    ],
  },
  "hsk2-study-work-culture-lesson-01": {
    scenarioVi: "Hai người hỏi quá trình học tiếng Trung và bài thi gần nhất.",
    taskInstructionVi: "Giới thiệu việc học qua sáu lượt; nêu thời điểm bắt đầu, tần suất, trải nghiệm và một khó khăn cụ thể.",
    functions: ["describe-study-history", "state-study-frequency", "report-learning-difficulty"],
    usedVocabularyIds: ["hsk-vocab-00342", "hsk-vocab-00381", "hsk-vocab-00472", "hsk-vocab-00492"],
    turns: [
      ["A", "你从什么时候开始学汉语？", "Nǐ cóng shénme shíhou kāishǐ xué Hànyǔ?", "Bạn bắt đầu học tiếng Trung từ khi nào?"],
      ["B", "我从高中开始学，已经学了两年。", "Wǒ cóng gāozhōng kāishǐ xué, yǐjīng xué le liǎng nián.", "Tôi bắt đầu học từ cấp ba, đã học hai năm."],
      ["A", "你每周上几次课？", "Nǐ měi zhōu shàng jǐ cì kè?", "Mỗi tuần bạn học mấy buổi?"],
      ["B", "每周三次，老师教得很好。", "Měi zhōu sān cì, lǎoshī jiāo de hěn hǎo.", "Mỗi tuần ba buổi, giáo viên dạy rất tốt."],
      ["A", "上周的考试难吗？", "Shàng zhōu de kǎoshì nán ma?", "Bài thi tuần trước khó không?"],
      ["B", "有几道题我没看懂，但已经做完了。", "Yǒu jǐ dào tí wǒ méi kàndǒng, dàn yǐjīng zuòwán le.", "Có vài câu tôi không hiểu, nhưng đã làm xong."],
    ],
  },
  "hsk2-study-work-culture-lesson-02": {
    scenarioVi: "Một học sinh giới thiệu trường và hoạt động vẽ sau giờ học.",
    taskInstructionVi: "Trao đổi sáu lượt về trường; mô tả phòng học, lịch bắt đầu và ít nhất một hoạt động sau giờ học.",
    functions: ["describe-school", "confirm-school-schedule", "describe-after-class-activity"],
    usedVocabularyIds: ["hsk-vocab-00359", "hsk-vocab-00368", "hsk-vocab-00369", "hsk-vocab-00379", "hsk-vocab-00435"],
    turns: [
      ["A", "请介绍一下你的学校吧。", "Qǐng jièshào yíxià nǐ de xuéxiào ba.", "Hãy giới thiệu một chút về trường của bạn."],
      ["B", "学校不大，但是教室很新。", "Xuéxiào bú dà, dànshì jiàoshì hěn xīn.", "Trường không lớn nhưng lớp học rất mới."],
      ["A", "你们什么时候开学？", "Nǐmen shénme shíhou kāixué?", "Các bạn khi nào khai giảng?"],
      ["B", "下周一开始上课。", "Xià zhōuyī kāishǐ shàngkè.", "Thứ Hai tuần sau bắt đầu học."],
      ["A", "下课以后你做什么？", "Xiàkè yǐhòu nǐ zuò shénme?", "Sau giờ học bạn làm gì?"],
      ["B", "我从书包里拿出本子画画。", "Wǒ cóng shūbāo lǐ náchū běnzi huàhuà.", "Tôi lấy vở từ cặp ra để vẽ."],
    ],
  },
  "hsk2-study-work-culture-lesson-03": {
    scenarioVi: "Một giáo viên giới thiệu nơi làm việc, quy mô và việc đang làm.",
    taskInstructionVi: "Trao đổi sáu lượt về công việc; nêu nơi làm, quy mô, nhiệm vụ hiện tại và một cảm nhận.",
    functions: ["ask-workplace", "describe-current-task", "state-work-feeling"],
    usedVocabularyIds: ["hsk-vocab-00404", "hsk-vocab-00432", "hsk-vocab-00491"],
    turns: [
      ["A", "你在哪儿工作？", "Nǐ zài nǎr gōngzuò?", "Bạn làm việc ở đâu?"],
      ["B", "我在一所学校工作。", "Wǒ zài yì suǒ xuéxiào gōngzuò.", "Tôi làm việc ở một trường học."],
      ["A", "学校有多少名老师？", "Xuéxiào yǒu duōshao míng lǎoshī?", "Trường có bao nhiêu giáo viên?"],
      ["B", "有一百多名老师。", "Yǒu yì bǎi duō míng lǎoshī.", "Có hơn một trăm giáo viên."],
      ["A", "你现在忙什么事情？", "Nǐ xiànzài máng shénme shìqing?", "Hiện bạn bận việc gì?"],
      ["B", "我正准备下午的汉语课，跟学生一起学习很快乐。", "Wǒ zhèng zhǔnbèi xiàwǔ de Hànyǔ kè, gēn xuésheng yìqǐ xuéxí hěn kuàilè.", "Tôi đang chuẩn bị tiết tiếng Trung buổi chiều; học cùng học sinh rất vui."],
    ],
  },
  "hsk2-study-work-culture-lesson-04": {
    scenarioVi: "Một du học sinh kể lần đầu đón năm mới và so sánh với sinh nhật.",
    taskInstructionVi: "Giới thiệu năm mới hoặc món ăn truyền thống qua sáu lượt; nêu trải nghiệm, hoạt động chung và một điểm khác biệt văn hóa.",
    functions: ["describe-festival-experience", "name-traditional-food", "compare-customs"],
    usedVocabularyIds: ["hsk-vocab-00349", "hsk-vocab-00385", "hsk-vocab-00430", "hsk-vocab-00446"],
    turns: [
      ["A", "你在中国过过年吗？", "Nǐ zài Zhōngguó guòguo nián ma?", "Bạn đã từng đón năm mới ở Trung Quốc chưa?"],
      ["B", "过过。第一次过年时，我还是外国学生。", "Guòguo. Dì yí cì guònián shí, wǒ háishi wàiguó xuésheng.", "Rồi. Lần đầu đón năm mới, tôi vẫn là du học sinh."],
      ["A", "你觉得中国年怎么样？", "Nǐ juéde Zhōngguó nián zěnmeyàng?", "Bạn thấy năm mới Trung Quốc thế nào?"],
      ["B", "很快乐，大家一起吃饭、吃饺子。", "Hěn kuàilè, dàjiā yìqǐ chīfàn, chī jiǎozi.", "Rất vui, mọi người cùng ăn cơm và sủi cảo."],
      ["A", "过年跟过生日一样吗？", "Guònián gēn guò shēngrì yíyàng ma?", "Đón năm mới có giống tổ chức sinh nhật không?"],
      ["B", "不一样，过年是大家的节日，生日是一个人的。", "Bù yíyàng, guònián shì dàjiā de jiérì, shēngrì shì yí ge rén de.", "Không giống; năm mới là ngày lễ của mọi người, sinh nhật là của một người."],
    ],
  },
  "hsk2-study-work-culture-lesson-05": {
    scenarioVi: "Hai người hỏi họ tên và xác nhận cách gọi một giáo viên.",
    taskInstructionVi: "Thực hành sáu lượt hỏi họ tên và xưng hô; phải dùng một cách hỏi lịch sự, một chức danh và giải thích cách gọi.",
    functions: ["ask-surname-politely", "state-full-name", "confirm-form-of-address"],
    usedVocabularyIds: ["hsk-vocab-00464", "hsk-vocab-00465", "hsk-vocab-00474", "hsk-vocab-00489"],
    turns: [
      ["A", "您好，请问您贵姓？", "Nín hǎo, qǐngwèn nín guìxìng?", "Xin chào, xin hỏi quý danh của ông/bà?"],
      ["B", "我姓王，姓名是王小明。", "Wǒ xìng Wáng, xìngmíng shì Wáng Xiǎomíng.", "Tôi họ Vương, họ tên là Vương Tiểu Minh."],
      ["A", "我可以叫您王老师吗？", "Wǒ kěyǐ jiào nín Wáng lǎoshī ma?", "Tôi có thể gọi ông/bà là thầy/cô Vương không?"],
      ["B", "可以，中文常这样称呼老师。", "Kěyǐ, Zhōngwén cháng zhèyàng chēnghu lǎoshī.", "Được, tiếng Trung thường gọi giáo viên như vậy."],
      ["A", "“贵姓”是什么意思？", "“Guìxìng” shì shénme yìsi?", "“Quý tính” có nghĩa là gì?"],
      ["B", "是很有礼貌地问别人的姓。", "Shì hěn yǒu lǐmào de wèn biéren de xìng.", "Là cách lịch sự để hỏi họ của người khác."],
    ],
  },
};

const exactPartition = (label, actual, expected) => {
  if (
    actual.length !== new Set(actual).size
    || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`${label} is not an exact partition`);
  }
};

export const buildHsk2SituationalDialogues = (root = process.cwd()) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  const vocabularyBundle = loadHsk2VocabularyPracticeBundle(root);
  assertValidHsk2VocabularyPracticeBundle(vocabularyBundle);
  const inventory = blueprintBundle.scopeBundle.graphBundle.syllabus.inventory;
  const officialTasks = inventory.tasks.filter((item) => item.level === 2);
  const officialTopics = inventory.topics.filter((item) => item.level === 2);
  const situationalLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "situational-dialogue",
  );
  exactPartition(
    "dialogue definitions",
    Object.keys(DIALOGUES),
    situationalLessons.map((lesson) => lesson.lessonId),
  );
  const lessonById = new Map(
    situationalLessons.map((lesson) => [lesson.lessonId, lesson]),
  );
  const taskLessonById = new Map(situationalLessons.flatMap((lesson) =>
    lesson.inventoryMappings.taskIds.map((taskId) => [taskId, lesson])
  ));
  const topicLessonById = new Map(situationalLessons.flatMap((lesson) =>
    lesson.inventoryMappings.topicIds.map((topicId) => [topicId, lesson])
  ));
  const lexemeById = new Map(
    vocabularyBundle.pack.lexemes.map((lexeme) => [lexeme.officialId, lexeme]),
  );

  const lessonDialogues = situationalLessons.map((lesson) => {
    const draft = DIALOGUES[lesson.lessonId];
    return {
      lessonId: lesson.lessonId,
      trackId: lesson.trackId,
      titleVi: lesson.titleVi,
      officialTaskIds: [...lesson.inventoryMappings.taskIds],
      officialTopicIds: [...lesson.inventoryMappings.topicIds],
      scenarioVi: draft.scenarioVi,
      taskInstructionVi: draft.taskInstructionVi,
      targetFunctions: [...draft.functions],
      usedVocabularyIds: [...draft.usedVocabularyIds],
      modelDialogue: {
        audio: null,
        audioPolicy: "reviewed-human-or-licensed-recording-required",
        turns: draft.turns.map(([speaker, hanzi, pinyin, meaningVi]) => ({
          speaker,
          hanzi,
          pinyin,
          meaningVi,
        })),
        review: "pending",
      },
      evidencePolicy: {
        observedSkills: ["listening", "speaking", "reading"],
        minimumTurns: 6,
        followUpRequired: true,
        confirmationRequired: true,
        reviewedRubricRequired: true,
        grantsMastery: false,
      },
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        taskPedagogyReview: "pending",
        audioRightsReview: "blocked-no-audio",
      },
    };
  });

  const topicDrafts = officialTopics.map((official) => {
    const lesson = topicLessonById.get(official.id);
    const prompt = TOPIC_PROMPTS[official.ordinal];
    if (!lesson || !prompt) {
      throw new Error(`${official.id} topic prompt mapping is missing`);
    }
    return {
      officialTopicId: official.id,
      officialOrdinal: official.ordinal,
      sourcePage: official.sourcePage,
      domain: official.domain,
      group: official.group,
      officialTopic: official.topic,
      lessonId: lesson.lessonId,
      trackId: lesson.trackId,
      promptViDraft: prompt[0],
      supportQuestionsVi: prompt[1],
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        taskPedagogyReview: "pending",
      },
    };
  });

  const dialogueByLessonId = new Map(
    lessonDialogues.map((dialogue) => [dialogue.lessonId, dialogue]),
  );
  const taskDrafts = officialTasks.map((official) => {
    const lesson = taskLessonById.get(official.id);
    const dialogue = dialogueByLessonId.get(lesson?.lessonId);
    if (!lesson || !dialogue) {
      throw new Error(`${official.id} task dialogue mapping is missing`);
    }
    return {
      officialTaskId: official.id,
      officialOrdinal: official.ordinal,
      sourcePage: official.sourcePage,
      officialTitle: official.title,
      officialBulletCount: official.bulletCount,
      lessonId: lesson.lessonId,
      trackId: lesson.trackId,
      relatedTopicIds: [...lesson.inventoryMappings.topicIds],
      instructionViDraft: dialogue.taskInstructionVi,
      targetFunctions: [...dialogue.targetFunctions],
      evidencePolicy: { ...dialogue.evidencePolicy },
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        taskPedagogyReview: "pending",
      },
    };
  });

  const practiceItems = lessonDialogues.map((dialogue) => ({
    itemId: `${dialogue.lessonId}:guided-roleplay-v1`,
    lessonId: dialogue.lessonId,
    officialTaskIds: [...dialogue.officialTaskIds],
    officialTopicIds: [...dialogue.officialTopicIds],
    kind: "six-turn-guided-roleplay-self-check",
    instructionVi: dialogue.taskInstructionVi,
    successChecklist: [
      "Hoàn thành ít nhất sáu lượt luân phiên.",
      "Có ít nhất một câu hỏi tiếp nối và một lượt xác nhận.",
      "Tự sửa câu trước khi xem lại hội thoại mẫu.",
    ],
    modelDialogue: dialogue.modelDialogue.turns,
    scoringPolicy: "self-reveal-only",
    review: "pending",
    measurementEligible: false,
    masteryEligible: false,
    releaseEligible: false,
  }));

  const reviewBatches = lessonDialogues.map((dialogue) => ({
    batchId: `${dialogue.lessonId}:situational-review-v1`,
    lessonId: dialogue.lessonId,
    taskIds: [...dialogue.officialTaskIds],
    topicIds: [...dialogue.officialTopicIds],
    dialogueIds: [dialogue.lessonId],
    practiceItemIds: [`${dialogue.lessonId}:guided-roleplay-v1`],
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "task-pedagogy-reviewer",
      "audio-rights-reviewer",
    ],
    state: "pending",
    approvals: [],
  }));

  for (const dialogue of lessonDialogues) {
    const lesson = lessonById.get(dialogue.lessonId);
    const text = dialogue.modelDialogue.turns.map((turn) => turn.hanzi).join("");
    for (const vocabularyId of dialogue.usedVocabularyIds) {
      const lexeme = lexemeById.get(vocabularyId);
      if (
        !lexeme
        || !lesson.inventoryMappings.vocabularyIds.includes(vocabularyId)
        || !text.includes(lexeme.simplified)
      ) {
        throw new Error(
          `${dialogue.lessonId} does not use mapped vocabulary ${vocabularyId}`,
        );
      }
    }
  }

  return {
    schemaVersion: 1,
    packId: "hsk2-situational-dialogues-2026.07",
    level: 2,
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      syllabusInventorySha256:
        blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256,
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      vocabularyPracticePackId: vocabularyBundle.pack.packId,
      vocabularyPracticePackSha256: fileSha256(vocabularyBundle.packPath),
    },
    authorship: {
      method: "ai-assisted-six-turn-dialogue-and-task-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      taskPedagogyReviewer: null,
      audioRightsReviewer: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      taskPedagogyReviewRequiredForRelease: true,
      reviewedHumanOrLicensedAudioRequiredForListening: true,
      reviewedRubricRequiredForMeasurement: true,
    },
    counts: {
      situationalLessons: lessonDialogues.length,
      officialTaskDrafts: taskDrafts.length,
      officialTopicDrafts: topicDrafts.length,
      modelDialogueTurns: lessonDialogues.reduce(
        (sum, dialogue) => sum + dialogue.modelDialogue.turns.length,
        0,
      ),
      guidedRoleplayItems: practiceItems.length,
      audioDependentDialogues: lessonDialogues.length,
      reviewedAudioDialogues: 0,
      reviewBatches: reviewBatches.length,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      officialTaskInventoryDraftMapped: true,
      officialTopicInventoryDraftMapped: true,
      situationalDialogueDraftComplete: true,
      reviewedTaskContentComplete: false,
      measurementCoverageComplete: false,
      hsk2Complete: false,
    },
    lessonDialogues,
    taskDrafts,
    topicDrafts,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk2SituationalDialogues = (pack) =>
  `${JSON.stringify(pack, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH);
  const serialized = serializeHsk2SituationalDialogues(
    buildHsk2SituationalDialogues(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 situational-dialogue pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_SITUATIONAL_DIALOGUES_RELATIVE_PATH,
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
