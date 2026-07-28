import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import {
  assertValidHsk2CharacterPracticeBundle,
  loadHsk2CharacterPracticeBundle,
} from "../../src/content/hsk2CharacterPractice.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH =
  "content/drafts/hsk2-short-text-production-2026.07.json";

const d = (targetIndexes, hanzi, pinyin, meaningVi) => ({
  targetIndexes,
  hanzi,
  pinyin,
  meaningVi,
});

const r = (
  targetIndexes,
  segments,
  answerHanzi,
  pinyin,
  meaningVi,
) => ({
  targetIndexes,
  segments,
  answerHanzi,
  pinyin,
  meaningVi,
});

const s = (hanzi, pinyin, meaningVi) => ({ hanzi, pinyin, meaningVi });

const p = (
  targetIndexes,
  situationVi,
  requiredElementsVi,
  languageSupport,
  modelSentences,
) => ({
  targetIndexes,
  situationVi,
  requiredElementsVi,
  languageSupport,
  modelSentences,
});

const LESSON_CONTENT = {
  "hsk2-dictation-lesson-01": [
    d([0], "好啊！", "Hǎo a!", "Được thôi!"),
    d([1], "请帮我。", "Qǐng bāng wǒ.", "Xin hãy giúp tôi."),
    d([2], "准备好了。", "Zhǔnbèi hǎo le.", "Đã chuẩn bị xong."),
    d([3], "今天比昨天冷。", "Jīntiān bǐ zuótiān lěng.", "Hôm nay lạnh hơn hôm qua."),
    d([4], "这支笔是我的。", "Zhè zhī bǐ shì wǒ de.", "Chiếc bút này là của tôi."),
    d([5], "我的手表坏了。", "Wǒ de shǒubiǎo huài le.", "Đồng hồ của tôi bị hỏng."),
    d([6], "别着急。", "Bié zháojí.", "Đừng vội."),
    d([7], "我每天跑步。", "Wǒ měitiān pǎobù.", "Tôi chạy bộ mỗi ngày."),
    d([8], "八点到机场。", "Bā diǎn dào jīchǎng.", "Tám giờ đến sân bay."),
    d([9], "请读这个词。", "Qǐng dú zhège cí.", "Hãy đọc từ này."),
    d([10], "我去过两次。", "Wǒ qùguo liǎng cì.", "Tôi đã đi hai lần."),
    d([11, 12], "从这里走，没错。", "Cóng zhèlǐ zǒu, méi cuò.", "Đi từ đây, đúng rồi."),
  ],
  "hsk2-dictation-lesson-02": [
    d([0], "但是我今天很忙。", "Dànshì wǒ jīntiān hěn máng.", "Nhưng hôm nay tôi rất bận."),
    d([1], "请慢慢地走。", "Qǐng mànmàn de zǒu.", "Hãy đi chậm thôi."),
    d([2], "请在门口等我。", "Qǐng zài ménkǒu děng wǒ.", "Hãy đợi tôi ở cửa."),
    d([3], "药店就在前面。", "Yàodiàn jiù zài qiánmiàn.", "Hiệu thuốc ở ngay phía trước."),
    d([4], "我已经听懂了。", "Wǒ yǐjīng tīngdǒng le.", "Tôi đã nghe hiểu rồi."),
    d([5], "别动。", "Bié dòng.", "Đừng cử động."),
    d([6], "我想喝一杯咖啡。", "Wǒ xiǎng hē yì bēi kāfēi.", "Tôi muốn uống một cốc cà phê."),
    d([7], "她丈夫是医生。", "Tā zhàngfu shì yīshēng.", "Chồng cô ấy là bác sĩ."),
    d([8], "请告诉老师。", "Qǐng gàosu lǎoshī.", "Hãy báo cho giáo viên."),
    d([9], "我跟朋友一起去。", "Wǒ gēn péngyou yìqǐ qù.", "Tôi đi cùng bạn."),
    d([10], "我们在饭馆吃饭。", "Wǒmen zài fànguǎn chīfàn.", "Chúng tôi ăn ở nhà hàng."),
    d([11, 12], "我没穿过黑色的裤子。", "Wǒ méi chuānguo hēisè de kùzi.", "Tôi chưa từng mặc quần màu đen."),
  ],
  "hsk2-dictation-lesson-03": [
    d([0], "红茶不太热。", "Hóngchá bú tài rè.", "Trà đen không nóng lắm."),
    d([1], "这朵花很好看。", "Zhè duǒ huā hěn hǎokàn.", "Bông hoa này rất đẹp."),
    d([2], "他会画画。", "Tā huì huàhuà.", "Anh ấy biết vẽ."),
    d([3], "手表已经坏了。", "Shǒubiǎo yǐjīng huài le.", "Đồng hồ đã hỏng rồi."),
    d([4], "我自己来。", "Wǒ zìjǐ lái.", "Tôi tự làm."),
    d([5], "我记得他的名字。", "Wǒ jìde tā de míngzi.", "Tôi nhớ tên anh ấy."),
    d([6], "我坐公交车上班。", "Wǒ zuò gōngjiāochē shàngbān.", "Tôi đi làm bằng xe buýt."),
    d([7], "王老师教我们汉语。", "Wáng lǎoshī jiāo wǒmen Hànyǔ.", "Thầy/cô Vương dạy chúng tôi tiếng Trung."),
    d([8], "请介绍一下自己。", "Qǐng jièshào yíxià zìjǐ.", "Hãy giới thiệu một chút về bản thân."),
    d([9], "请进。", "Qǐng jìn.", "Mời vào."),
    d([10], "我家离学校很近。", "Wǒ jiā lí xuéxiào hěn jìn.", "Nhà tôi rất gần trường."),
    d([11, 12], "我经常觉得眼睛累。", "Wǒ jīngcháng juéde yǎnjing lèi.", "Tôi thường cảm thấy mỏi mắt."),
  ],
  "hsk2-sentence-reconstruction-lesson-01": [
    r([0, 9], ["车站", "不远", "离", "酒店", "。"], "酒店离车站不远。", "Jiǔdiàn lí chēzhàn bù yuǎn.", "Khách sạn không xa nhà ga."),
    r([1], ["就", "我", "下课以后", "回家", "。"], "下课以后我就回家。", "Xiàkè yǐhòu wǒ jiù huí jiā.", "Tan học xong tôi về nhà ngay."),
    r([2], ["一杯", "她", "每天", "咖啡", "喝", "。"], "她每天喝一杯咖啡。", "Tā měitiān hē yì bēi kāfēi.", "Cô ấy uống một cốc cà phê mỗi ngày."),
    r([3], ["考试", "明天", "要", "我们", "。"], "明天我们要考试。", "Míngtiān wǒmen yào kǎoshì.", "Ngày mai chúng tôi phải thi."),
    r([4], ["有点儿", "这条", "长", "裤子", "。"], "这条裤子有点儿长。", "Zhè tiáo kùzi yǒudiǎnr cháng.", "Chiếc quần này hơi dài."),
    r([5], ["公交车", "比", "地铁", "快", "。"], "地铁比公交车快。", "Dìtiě bǐ gōngjiāochē kuài.", "Tàu điện ngầm nhanh hơn xe buýt."),
    r([6], ["篮球", "一起", "周末", "我们", "打", "。"], "周末我们一起打篮球。", "Zhōumò wǒmen yìqǐ dǎ lánqiú.", "Cuối tuần chúng ta cùng chơi bóng rổ."),
    r([7], ["你", "生日", "祝", "快乐", "。"], "祝你生日快乐。", "Zhù nǐ shēngrì kuàilè.", "Chúc bạn sinh nhật vui vẻ."),
    r([8], ["今天", "有点儿", "我", "累", "。"], "我今天有点儿累。", "Wǒ jīntiān yǒudiǎnr lèi.", "Hôm nay tôi hơi mệt."),
    r([10], ["他", "越南", "留学生", "是", "。"], "他是越南留学生。", "Tā shì Yuènán liúxuésheng.", "Anh ấy là du học sinh Việt Nam."),
    r([11], ["在", "我们的", "三楼", "教室", "。"], "我们的教室在三楼。", "Wǒmen de jiàoshì zài sān lóu.", "Lớp học của chúng tôi ở tầng ba."),
    r([12], ["走", "怎么", "这条路", "？"], "这条路怎么走？", "Zhè tiáo lù zěnme zǒu?", "Đi đường này thế nào?"),
  ],
  "hsk2-sentence-reconstruction-lesson-02": [
    r([0, 9], ["机票", "旅游以前", "买好了", "我", "。"], "旅游以前我买好了机票。", "Lǚyóu yǐqián wǒ mǎihǎo le jīpiào.", "Trước khi du lịch tôi đã mua vé máy bay."),
    r([1], ["喜欢", "我", "喝", "绿茶", "。"], "我喜欢喝绿茶。", "Wǒ xǐhuan hē lǜchá.", "Tôi thích uống trà xanh."),
    r([2], ["一点儿", "说", "请", "慢", "。"], "请说慢一点儿。", "Qǐng shuō màn yìdiǎnr.", "Xin hãy nói chậm hơn một chút."),
    r([3], ["跑步", "每天", "他", "都", "。"], "他每天都跑步。", "Tā měitiān dōu pǎobù.", "Anh ấy chạy bộ mỗi ngày."),
    r([4], ["以后", "出门", "下雨了", "。"], "出门以后下雨了。", "Chūmén yǐhòu xiàyǔ le.", "Sau khi ra khỏi nhà thì trời mưa."),
    r([5], ["桌子上", "书", "拿", "请", "的", "。"], "请拿桌子上的书。", "Qǐng ná zhuōzi shàng de shū.", "Hãy lấy quyển sách trên bàn."),
    r([6], ["一只", "树上", "鸟", "有", "。"], "树上有一只鸟。", "Shù shàng yǒu yì zhī niǎo.", "Trên cây có một con chim."),
    r([7], ["药店", "饭馆", "在", "旁边", "。"], "药店在饭馆旁边。", "Yàodiàn zài fànguǎn pángbiān.", "Hiệu thuốc ở cạnh nhà hàng."),
    r([8], ["起来", "跑步", "他", "每天", "早上", "。"], "他每天早上起来跑步。", "Tā měitiān zǎoshang qǐlái pǎobù.", "Sáng nào anh ấy cũng dậy chạy bộ."),
    r([10], ["做饭", "他的", "正在", "妻子", "。"], "他的妻子正在做饭。", "Tā de qīzi zhèngzài zuòfàn.", "Vợ anh ấy đang nấu cơm."),
    r([11], ["事情", "告诉", "请", "这件", "我", "。"], "请告诉我这件事情。", "Qǐng gàosu wǒ zhè jiàn shìqing.", "Hãy nói cho tôi biết việc này."),
    r([12], ["晴天", "明天", "是", "。"], "明天是晴天。", "Míngtiān shì qíngtiān.", "Ngày mai trời nắng."),
  ],
  "hsk2-sentence-reconstruction-lesson-03": [
    r([0], ["有意思", "足球", "篮球", "比", "。"], "足球比篮球有意思。", "Zúqiú bǐ lánqiú yǒuyìsi.", "Bóng đá thú vị hơn bóng rổ."),
    r([1], ["还是", "虽然", "下雨", "来了", "但是", "他", "。"], "虽然下雨，但是他还是来了。", "Suīrán xiàyǔ, dànshì tā háishi lái le.", "Tuy trời mưa nhưng anh ấy vẫn đến."),
    r([2], ["吧", "让我", "帮", "你", "来", "。"], "让我来帮你吧。", "Ràng wǒ lái bāng nǐ ba.", "Để tôi giúp bạn."),
    r([3], ["鱼", "不想", "肉", "想吃", "我", "吃", "。"], "我想吃鱼，不想吃肉。", "Wǒ xiǎng chī yú, bù xiǎng chī ròu.", "Tôi muốn ăn cá, không muốn ăn thịt."),
    r([4], ["很", "这件衣服", "好看", "颜色", "的", "。"], "这件衣服的颜色很好看。", "Zhè jiàn yīfu de yánsè hěn hǎokàn.", "Màu của bộ quần áo này rất đẹp."),
    r([5], ["一下", "学校", "请", "你", "介绍", "。"], "请你介绍一下学校。", "Qǐng nǐ jièshào yíxià xuéxiào.", "Hãy giới thiệu một chút về trường."),
    r([6], ["所以", "运动", "身体", "他", "每天", "。", "很好"], "他每天运动，所以身体很好。", "Tā měitiān yùndòng, suǒyǐ shēntǐ hěn hǎo.", "Anh ấy vận động mỗi ngày nên sức khỏe rất tốt."),
    r([7], ["八点", "电影", "开始", "。"], "电影八点开始。", "Diànyǐng bā diǎn kāishǐ.", "Bộ phim bắt đầu lúc tám giờ."),
    r([8], ["不难", "但是", "这次", "时间有点儿长", "考试", "。"], "这次考试不难，但是时间有点儿长。", "Zhè cì kǎoshì bù nán, dànshì shíjiān yǒudiǎnr cháng.", "Bài thi lần này không khó nhưng thời gian hơi dài."),
    r([9], ["老师", "教室里", "学生", "在", "等", "。"], "学生在教室里等老师。", "Xuésheng zài jiàoshì lǐ děng lǎoshī.", "Học sinh đợi giáo viên trong lớp."),
    r([10], ["舒服多了", "吃药以后", "他", "。"], "吃药以后他舒服多了。", "Chī yào yǐhòu tā shūfu duō le.", "Uống thuốc xong anh ấy dễ chịu hơn nhiều."),
    r([11], ["晚了", "我", "不好意思", "来", "。"], "不好意思，我来晚了。", "Bù hǎoyìsi, wǒ lái wǎn le.", "Xin lỗi, tôi đến muộn."),
  ],
  "hsk2-guided-message-lesson-01": [
    p(
      [0, 1],
      "Nhắn cho bạn chung rằng bạn muốn tặng Tiểu Vương một quyển sách.",
      ["Nêu món quà", "Nhờ báo cho Tiểu Vương", "Chốt thời gian mang quà"],
      ["我想送……", "请你告诉……", "明天……"],
      [
        s("我想送小王一本汉语书。", "Wǒ xiǎng sòng Xiǎo Wáng yì běn Hànyǔ shū.", "Tôi muốn tặng Tiểu Vương một quyển sách tiếng Trung."),
        s("请你告诉他。", "Qǐng nǐ gàosu tā.", "Bạn hãy báo cho cậu ấy."),
        s("我明天把书带来。", "Wǒ míngtiān bǎ shū dài lái.", "Ngày mai tôi sẽ mang sách tới."),
      ],
    ),
    p(
      [2, 3],
      "Nhắn cập nhật rằng trời mưa nhưng bạn vẫn phải đi học.",
      ["Nêu trở ngại", "Nêu việc vẫn thực hiện", "Thông báo hệ quả"],
      ["虽然……但是……", "还是……", "所以……"],
      [
        s("虽然今天下雨，但是我还是要上课。", "Suīrán jīntiān xiàyǔ, dànshì wǒ háishi yào shàngkè.", "Tuy hôm nay mưa nhưng tôi vẫn phải đi học."),
        s("所以我不能跟你去商店。", "Suǒyǐ wǒ bù néng gēn nǐ qù shāngdiàn.", "Vì vậy tôi không thể đi cửa hàng cùng bạn."),
        s("我们明天再见吧。", "Wǒmen míngtiān zài jiàn ba.", "Ngày mai chúng ta gặp lại nhé."),
      ],
    ),
    p(
      [4, 6],
      "Nhắn xin nghỉ vì đau đầu và sức khỏe không tốt.",
      ["Nêu triệu chứng", "Nêu tình trạng sức khỏe", "Nói kế hoạch nghỉ"],
      ["我头疼。", "身体不舒服", "我想……"],
      [
        s("我今天头疼。", "Wǒ jīntiān tóuténg.", "Hôm nay tôi đau đầu."),
        s("我的身体也不太舒服。", "Wǒ de shēntǐ yě bú tài shūfu.", "Sức khỏe của tôi cũng không được tốt."),
        s("我想在家休息一天。", "Wǒ xiǎng zài jiā xiūxi yì tiān.", "Tôi muốn nghỉ ở nhà một ngày."),
      ],
    ),
    p(
      [5, 7],
      "Rủ bạn chọn giữa đá bóng và nhảy múa vào cuối tuần.",
      ["Nêu hai hoạt động", "Đưa ra lựa chọn của bạn", "Hỏi ý kiến người nhận"],
      ["踢足球", "跳舞", "你想……还是……？"],
      [
        s("周末我们可以踢足球，也可以跳舞。", "Zhōumò wǒmen kěyǐ tī zúqiú, yě kěyǐ tiàowǔ.", "Cuối tuần chúng ta có thể đá bóng hoặc nhảy."),
        s("我更想踢足球。", "Wǒ gèng xiǎng tī zúqiú.", "Tôi muốn đá bóng hơn."),
        s("你想做什么？", "Nǐ xiǎng zuò shénme?", "Bạn muốn làm gì?"),
      ],
    ),
    p(
      [8],
      "Nhắn hướng dẫn bạn đi tàu điện ngầm tới điểm hẹn.",
      ["Nêu phương tiện", "Nêu ga xuống", "Nêu thời gian gặp"],
      ["坐地铁", "在……下车", "……点见"],
      [
        s("你可以坐地铁来。", "Nǐ kěyǐ zuò dìtiě lái.", "Bạn có thể đi tàu điện ngầm tới."),
        s("请在学校附近的车站下车。", "Qǐng zài xuéxiào fùjìn de chēzhàn xiàchē.", "Hãy xuống ở ga gần trường."),
        s("我们九点在门口见。", "Wǒmen jiǔ diǎn zài ménkǒu jiàn.", "Chúng ta gặp ở cửa lúc chín giờ."),
      ],
    ),
    p(
      [9],
      "Nhắn báo đau đầu và hỏi vị trí hiệu thuốc.",
      ["Nêu triệu chứng", "Hỏi hiệu thuốc", "Cảm ơn trước"],
      ["我头疼。", "附近有……吗？", "谢谢"],
      [
        s("我从早上开始头疼。", "Wǒ cóng zǎoshang kāishǐ tóuténg.", "Tôi đau đầu từ sáng."),
        s("附近有药店吗？", "Fùjìn yǒu yàodiàn ma?", "Gần đây có hiệu thuốc không?"),
        s("请告诉我怎么走，谢谢。", "Qǐng gàosu wǒ zěnme zǒu, xièxie.", "Hãy chỉ tôi đường đi, cảm ơn."),
      ],
    ),
    p(
      [10],
      "Nhắn cập nhật rằng đã làm xong bài và có thể đi chơi.",
      ["Nêu việc đã hoàn thành", "Nêu thời gian rảnh", "Đề nghị hoạt động"],
      ["已经……完了", "现在有时间", "一起……吧"],
      [
        s("我已经做完作业了。", "Wǒ yǐjīng zuòwán zuòyè le.", "Tôi đã làm xong bài tập."),
        s("现在我有时间。", "Xiànzài wǒ yǒu shíjiān.", "Bây giờ tôi có thời gian."),
        s("我们一起去运动吧。", "Wǒmen yìqǐ qù yùndòng ba.", "Chúng ta cùng đi vận động nhé."),
      ],
    ),
    p(
      [11],
      "Nhắn hỏi lại giá một món đồ trị giá một vạn tệ.",
      ["Nêu món đồ", "Nêu mức giá đã nghe", "Hỏi xác nhận"],
      ["这个……", "一万块", "对吗？"],
      [
        s("我在网上看见一台电脑。", "Wǒ zài wǎngshàng kànjiàn yì tái diànnǎo.", "Tôi thấy một chiếc máy tính trên mạng."),
        s("上面写着一万块。", "Shàngmiàn xiězhe yí wàn kuài.", "Trên đó ghi mười nghìn tệ."),
        s("这个价钱对吗？", "Zhège jiàqian duì ma?", "Giá này đúng không?"),
      ],
    ),
  ],
  "hsk2-guided-message-lesson-02": [
    p(
      [0, 1],
      "Nhắn hỏi đường tới một cửa hàng bạn đã thấy trên mạng.",
      ["Nói đã thấy địa điểm trên mạng", "Hỏi hướng đi", "Nêu điểm xuất phát"],
      ["我在网上看见……", "往哪边走？", "我从……出发"],
      [
        s("我在网上看见一家新书店。", "Wǒ zài wǎngshàng kànjiàn yì jiā xīn shūdiàn.", "Tôi thấy một hiệu sách mới trên mạng."),
        s("从地铁站往哪边走？", "Cóng dìtiě zhàn wǎng nǎ biān zǒu?", "Từ ga tàu điện ngầm đi về phía nào?"),
        s("请把地址告诉我。", "Qǐng bǎ dìzhǐ gàosu wǒ.", "Hãy cho tôi biết địa chỉ."),
      ],
    ),
    p(
      [2, 3],
      "Nhắn nhờ bạn mang giúp quyển sách bạn để quên.",
      ["Nói đã quên đồ", "Nêu nơi để đồ", "Bày tỏ hy vọng được giúp"],
      ["我忘了……", "在……上", "希望你能……"],
      [
        s("我忘了带汉语书。", "Wǒ wàng le dài Hànyǔ shū.", "Tôi quên mang sách tiếng Trung."),
        s("书还在我的桌子上。", "Shū hái zài wǒ de zhuōzi shàng.", "Sách vẫn ở trên bàn của tôi."),
        s("希望你能帮我拿来。", "Xīwàng nǐ néng bāng wǒ ná lái.", "Hy vọng bạn có thể mang giúp tôi."),
      ],
    ),
    p(
      [4, 5],
      "Nhắn giải thích vì sao một vị giáo viên sẽ đến muộn.",
      ["Giới thiệu người", "Nêu nguyên nhân", "Nêu thời gian dự kiến"],
      ["这位老师", "因为……", "……点到"],
      [
        s("这位老师姓王。", "Zhè wèi lǎoshī xìng Wáng.", "Vị giáo viên này họ Vương."),
        s("因为公交车来晚了，他还在车站。", "Yīnwèi gōngjiāochē lái wǎn le, tā hái zài chēzhàn.", "Vì xe buýt đến muộn nên thầy vẫn ở trạm."),
        s("他可能九点到学校。", "Tā kěnéng jiǔ diǎn dào xuéxiào.", "Có thể thầy sẽ đến trường lúc chín giờ."),
      ],
    ),
    p(
      [6, 7],
      "Nhắn rủ bạn tham gia lớp nhảy và hỏi phản hồi.",
      ["Nêu hoạt động", "Nêu thời gian", "Bày tỏ hy vọng"],
      ["一起跳舞", "周……", "希望……"],
      [
        s("周六我们一起去跳舞吧。", "Zhōuliù wǒmen yìqǐ qù tiàowǔ ba.", "Thứ Bảy chúng ta cùng đi nhảy nhé."),
        s("课从下午两点开始。", "Kè cóng xiàwǔ liǎng diǎn kāishǐ.", "Lớp bắt đầu lúc hai giờ chiều."),
        s("希望你有时间参加。", "Xīwàng nǐ yǒu shíjiān cānjiā.", "Hy vọng bạn có thời gian tham gia."),
      ],
    ),
    p(
      [8],
      "Nhắn nhờ người ở cùng giặt quần áo.",
      ["Nêu việc cần giúp", "Nêu lý do", "Cảm ơn"],
      ["请帮我洗……", "因为……", "谢谢"],
      [
        s("请帮我洗一下这件衣服。", "Qǐng bāng wǒ xǐ yíxià zhè jiàn yīfu.", "Hãy giúp tôi giặt bộ quần áo này."),
        s("因为我的手有点儿疼。", "Yīnwèi wǒ de shǒu yǒudiǎnr téng.", "Vì tay tôi hơi đau."),
        s("谢谢你帮忙。", "Xièxie nǐ bāngmáng.", "Cảm ơn bạn đã giúp."),
      ],
    ),
    p(
      [9],
      "Nhắn chọn ảnh có người đang cười cho bài giới thiệu.",
      ["Nêu mục đích", "Mô tả người trong ảnh", "Đưa ra lựa chọn"],
      ["介绍……", "笑得……", "我选……"],
      [
        s("我要用一张照片介绍我的朋友。", "Wǒ yào yòng yì zhāng zhàopiàn jièshào wǒ de péngyou.", "Tôi cần dùng một bức ảnh để giới thiệu bạn mình."),
        s("她在这张照片里笑得很开心。", "Tā zài zhè zhāng zhàopiàn lǐ xiào de hěn kāixīn.", "Trong ảnh này cô ấy cười rất vui."),
        s("所以我选这张。", "Suǒyǐ wǒ xuǎn zhè zhāng.", "Vì vậy tôi chọn bức này."),
      ],
    ),
    p(
      [10],
      "Nhắn hỏi họ và cách xưng hô của giáo viên mới.",
      ["Hỏi họ", "Hỏi cách gọi", "Giữ cách nói lịch sự"],
      ["请问您姓……？", "我可以叫您……吗？", "您好"],
      [
        s("老师，您好，请问您姓什么？", "Lǎoshī, nín hǎo, qǐngwèn nín xìng shénme?", "Thưa thầy/cô, xin chào, xin hỏi thầy/cô họ gì?"),
        s("我可以叫您李老师吗？", "Wǒ kěyǐ jiào nín Lǐ lǎoshī ma?", "Em có thể gọi thầy/cô là thầy/cô Lý không?"),
        s("很高兴认识您。", "Hěn gāoxìng rènshi nín.", "Rất vui được làm quen với thầy/cô."),
      ],
    ),
    p(
      [11],
      "Nhắn xác nhận màu của món đồ cần mua.",
      ["Nêu món đồ", "Nêu màu mong muốn", "Hỏi xác nhận"],
      ["我要买……", "……颜色的", "对吗？"],
      [
        s("我要买一条裤子。", "Wǒ yào mǎi yì tiáo kùzi.", "Tôi muốn mua một chiếc quần."),
        s("请帮我拿黑色的。", "Qǐng bāng wǒ ná hēisè de.", "Hãy lấy giúp tôi chiếc màu đen."),
        s("这个颜色还有吗？", "Zhège yánsè hái yǒu ma?", "Màu này còn không?"),
      ],
    ),
  ],
  "hsk2-picture-description-lesson-01": [
    p(
      [0, 1],
      "Tranh một người dụi mắt, trên bàn có thuốc và cốc nước.",
      ["Nêu nhân vật", "Nêu trạng thái mắt", "Nêu vị trí thuốc"],
      ["他的眼睛……", "桌子上有……", "可能……"],
      [
        s("一个男人坐在桌子旁边。", "Yí ge nánrén zuò zài zhuōzi pángbiān.", "Một người đàn ông ngồi cạnh bàn."),
        s("他的眼睛不太舒服。", "Tā de yǎnjing bú tài shūfu.", "Mắt anh ấy không được dễ chịu."),
        s("桌子上有药和一杯水。", "Zhuōzi shàng yǒu yào hé yì bēi shuǐ.", "Trên bàn có thuốc và một cốc nước."),
      ],
    ),
    p(
      [2, 3],
      "Tranh ông đang đợi ở cửa công viên, cháu đã chạy tới.",
      ["Nêu hai nhân vật", "Nêu vị trí ông", "Dùng 已经 cho diễn biến"],
      ["爷爷在……", "孩子已经……", "他们……"],
      [
        s("爷爷在公园门口等孩子。", "Yéye zài gōngyuán ménkǒu děng háizi.", "Ông đang đợi đứa trẻ ở cửa công viên."),
        s("孩子已经跑到爷爷旁边了。", "Háizi yǐjīng pǎo dào yéye pángbiān le.", "Đứa trẻ đã chạy tới bên ông."),
        s("他们准备一起回家。", "Tāmen zhǔnbèi yìqǐ huí jiā.", "Họ chuẩn bị cùng về nhà."),
      ],
    ),
    p(
      [4, 5],
      "Tranh một người đến muộn đang xin lỗi bạn ở trạm xe.",
      ["Nêu địa điểm", "Nêu lời xin lỗi", "Nêu nguyên nhân"],
      ["不好意思", "因为……", "所以……"],
      [
        s("两个人在车站见面。", "Liǎng ge rén zài chēzhàn jiànmiàn.", "Hai người gặp nhau ở trạm xe."),
        s("来晚的人说“不好意思”。", "Lái wǎn de rén shuō “bù hǎoyìsi”.", "Người đến muộn nói “xin lỗi”."),
        s("因为公交车没来，所以他迟到了。", "Yīnwèi gōngjiāochē méi lái, suǒyǐ tā chídào le.", "Vì xe buýt không đến nên anh ấy đến muộn."),
      ],
    ),
    p(
      [6, 7],
      "Tranh bể bơi ngoài trời khi trời âm u.",
      ["Nêu thời tiết", "Nêu hoạt động", "Nêu nhận xét an toàn"],
      ["今天是阴天", "有人在游泳", "但是……"],
      [
        s("今天是阴天。", "Jīntiān shì yīntiān.", "Hôm nay trời âm u."),
        s("还有一个人在游泳。", "Hái yǒu yí ge rén zài yóuyǒng.", "Vẫn có một người đang bơi."),
        s("但是天气有点儿冷。", "Dànshì tiānqì yǒudiǎnr lěng.", "Nhưng thời tiết hơi lạnh."),
      ],
    ),
    p(
      [8],
      "Tranh một gia đình có va-li và vé trước chuyến đi.",
      ["Nêu nhân vật", "Nêu vật mang theo", "Nêu kế hoạch du lịch"],
      ["一家人", "他们带着……", "准备去旅游"],
      [
        s("一家人在机场门口。", "Yì jiā rén zài jīchǎng ménkǒu.", "Một gia đình đang ở cửa sân bay."),
        s("他们带着三个包。", "Tāmen dàizhe sān ge bāo.", "Họ mang theo ba chiếc túi."),
        s("他们准备去中国旅游。", "Tāmen zhǔnbèi qù Zhōngguó lǚyóu.", "Họ chuẩn bị đi du lịch Trung Quốc."),
      ],
    ),
    p(
      [9],
      "Tranh hiệu thuốc nằm bên phải nhà hàng.",
      ["Nêu hai địa điểm", "Dùng từ chỉ bên phải", "Nêu mốc nhận biết"],
      ["饭馆旁边", "右边", "门口有……"],
      [
        s("这条路上有一家饭馆。", "Zhè tiáo lù shàng yǒu yì jiā fànguǎn.", "Trên con đường này có một nhà hàng."),
        s("药店在饭馆右边。", "Yàodiàn zài fànguǎn yòubian.", "Hiệu thuốc ở bên phải nhà hàng."),
        s("药店门口有绿色的字。", "Yàodiàn ménkǒu yǒu lǜsè de zì.", "Cửa hiệu thuốc có chữ màu xanh."),
      ],
    ),
    p(
      [10],
      "Tranh hai người chọn món cá và thịt trong nhà hàng.",
      ["Nêu địa điểm", "Nêu món cá", "So sánh lựa chọn"],
      ["在饭馆", "桌子上有鱼", "比……更……"],
      [
        s("两个人在饭馆吃饭。", "Liǎng ge rén zài fànguǎn chīfàn.", "Hai người đang ăn ở nhà hàng."),
        s("桌子上有鱼，也有肉。", "Zhuōzi shàng yǒu yú, yě yǒu ròu.", "Trên bàn có cá và cũng có thịt."),
        s("他们觉得鱼比肉更好吃。", "Tāmen juéde yú bǐ ròu gèng hǎochī.", "Họ thấy cá ngon hơn thịt."),
      ],
    ),
    p(
      [11],
      "Tranh nhà ga ở xa, người đi đường xem đồng hồ.",
      ["Nêu vị trí nhân vật", "Nêu khoảng cách", "Nêu quyết định di chuyển"],
      ["离……很远", "看手表", "所以……"],
      [
        s("一个人在路口看手表。", "Yí ge rén zài lùkǒu kàn shǒubiǎo.", "Một người đang xem đồng hồ ở ngã rẽ."),
        s("车站离这里很远。", "Chēzhàn lí zhèlǐ hěn yuǎn.", "Nhà ga rất xa đây."),
        s("所以他准备打车去。", "Suǒyǐ tā zhǔnbèi dǎchē qù.", "Vì vậy anh ấy định đi taxi."),
      ],
    ),
  ],
  "hsk2-picture-description-lesson-02": [
    p(
      [0, 1],
      "Tranh người xuống xe ở trạm rồi chạy tới sân vận động.",
      ["Nêu điểm xuất phát", "Nêu chuyển động", "Nêu mục đích vận động"],
      ["从车站……", "跑到……", "去运动"],
      [
        s("一个人从车站出来。", "Yí ge rén cóng chēzhàn chūlái.", "Một người đi ra từ nhà ga."),
        s("他跑到旁边的运动场。", "Tā pǎo dào pángbiān de yùndòngchǎng.", "Anh ấy chạy tới sân vận động bên cạnh."),
        s("他要跟朋友一起运动。", "Tā yào gēn péngyou yìqǐ yùndòng.", "Anh ấy sẽ vận động cùng bạn."),
      ],
    ),
    p(
      [2, 3],
      "Tranh người chồng mặc quần dài đứng cạnh vợ.",
      ["Nêu quan hệ", "Mô tả quần áo", "So sánh chiều cao"],
      ["她的丈夫", "穿着长裤子", "比……高"],
      [
        s("女人旁边的人是她的丈夫。", "Nǚrén pángbiān de rén shì tā de zhàngfu.", "Người bên cạnh cô gái là chồng cô ấy."),
        s("她丈夫穿着一条很长的裤子。", "Tā zhàngfu chuānzhe yì tiáo hěn cháng de kùzi.", "Chồng cô ấy mặc một chiếc quần rất dài."),
        s("他比妻子高一点儿。", "Tā bǐ qīzi gāo yìdiǎnr.", "Anh ấy cao hơn vợ một chút."),
      ],
    ),
    p(
      [4, 5],
      "Tranh cuối tuần một em nhỏ cầm bóng đứng ở cửa.",
      ["Nêu thời gian", "Dùng 着 mô tả trạng thái", "Nêu hoạt động sắp diễn ra"],
      ["周末", "拿着……", "准备……"],
      [
        s("今天是周末。", "Jīntiān shì zhōumò.", "Hôm nay là cuối tuần."),
        s("一个孩子拿着球站在门口。", "Yí ge háizi názhe qiú zhàn zài ménkǒu.", "Một đứa trẻ cầm bóng đứng ở cửa."),
        s("他准备跟同学去玩。", "Tā zhǔnbèi gēn tóngxué qù wán.", "Em ấy chuẩn bị đi chơi với bạn học."),
      ],
    ),
    p(
      [6, 7],
      "Tranh một người tự chuẩn bị hành lý trước chuyến đi.",
      ["Nêu nhân vật", "Dùng 自己", "Nêu thứ đang chuẩn bị"],
      ["自己……", "正在准备……", "明天……"],
      [
        s("房间里有一个女孩。", "Fángjiān lǐ yǒu yí ge nǚhái.", "Trong phòng có một cô gái."),
        s("她正在自己准备行李。", "Tā zhèngzài zìjǐ zhǔnbèi xíngli.", "Cô ấy đang tự chuẩn bị hành lý."),
        s("她明天要去旅游。", "Tā míngtiān yào qù lǚyóu.", "Ngày mai cô ấy sẽ đi du lịch."),
      ],
    ),
    p(
      [8],
      "Tranh người đi bộ theo biển chỉ đường tới trường.",
      ["Nêu nhân vật", "Nêu hướng đi", "Nêu đích đến"],
      ["往前走", "再往……", "就到……"],
      [
        s("一个学生正在路上走。", "Yí ge xuésheng zhèngzài lù shàng zǒu.", "Một học sinh đang đi trên đường."),
        s("他先往前走，再往左走。", "Tā xiān wǎng qián zǒu, zài wǎng zuǒ zǒu.", "Cậu ấy đi thẳng trước rồi rẽ trái."),
        s("前面就是学校。", "Qiánmiàn jiù shì xuéxiào.", "Phía trước chính là trường học."),
      ],
    ),
    p(
      [9],
      "Tranh hai đội đang chơi bóng đá.",
      ["Nêu địa điểm", "Nêu môn thể thao", "Nêu diễn biến"],
      ["运动场上", "踢足球", "正在……"],
      [
        s("运动场上有两队学生。", "Yùndòngchǎng shàng yǒu liǎng duì xuésheng.", "Trên sân có hai đội học sinh."),
        s("他们正在踢足球。", "Tāmen zhèngzài tī zúqiú.", "Họ đang đá bóng."),
        s("旁边还有老师在看。", "Pángbiān hái yǒu lǎoshī zài kàn.", "Bên cạnh còn có giáo viên đang xem."),
      ],
    ),
    p(
      [10],
      "Tranh ba món đồ có giá khác nhau, người mua chọn món rẻ nhất.",
      ["Nêu ba món đồ", "So sánh giá", "Dùng 最 nêu lựa chọn"],
      ["这三个……", "比……便宜", "最便宜"],
      [
        s("桌子上有三个手表。", "Zhuōzi shàng yǒu sān ge shǒubiǎo.", "Trên bàn có ba chiếc đồng hồ."),
        s("黑色的比红色的便宜。", "Hēisè de bǐ hóngsè de piányi.", "Chiếc màu đen rẻ hơn chiếc màu đỏ."),
        s("他想买最便宜的。", "Tā xiǎng mǎi zuì piányi de.", "Anh ấy muốn mua chiếc rẻ nhất."),
      ],
    ),
    p(
      [11],
      "Tranh hiệu sách ở bên trái quán cà phê.",
      ["Nêu hai địa điểm", "Dùng 左 xác định vị trí", "Nêu người đang đi vào"],
      ["咖啡店", "左边", "走进……"],
      [
        s("路上有一家咖啡店。", "Lù shàng yǒu yì jiā kāfēidiàn.", "Trên đường có một quán cà phê."),
        s("书店在咖啡店左边。", "Shūdiàn zài kāfēidiàn zuǒbian.", "Hiệu sách ở bên trái quán cà phê."),
        s("一个学生正走进书店。", "Yí ge xuésheng zhèng zǒujìn shūdiàn.", "Một học sinh đang đi vào hiệu sách."),
      ],
    ),
  ],
};

const expectedPromptCount = (lesson) =>
  lesson.assessmentPlan.minimumPromptUnits;

const targetCharactersFor = (characterBundle, lesson) => {
  const byId = new Map(
    characterBundle.pack.characters.map((item) => [
      item.officialCharacterId,
      item,
    ]),
  );
  return lesson.inventoryMappings.recognitionCharacterIds.map((id) => {
    const character = byId.get(id);
    if (!character) throw new Error(`Missing character draft ${id}`);
    return {
      officialCharacterId: id,
      character: character.character,
      primaryContext: character.primaryContext,
      contextState: character.contextState,
    };
  });
};

const targetRefs = (targetCharacters, indexes) =>
  indexes.map((index) => {
    const target = targetCharacters[index];
    if (!target) throw new Error(`Missing target character index ${index}`);
    return {
      officialCharacterId: target.officialCharacterId,
      character: target.character,
    };
  });

const buildPrompt = (lesson, targetCharacters, item, index) => {
  const itemId =
    `${lesson.lessonId}:production-${String(index + 1).padStart(2, "0")}`;
  const targetCharacterRefs = targetRefs(
    targetCharacters,
    item.targetIndexes,
  );
  const base = {
    itemId,
    lessonId: lesson.lessonId,
    targetCharacterRefs,
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    evidencePolicy: {
      responseMode: "self-reveal-revision-only",
      reviewedRubricRequiredForScoring: true,
      measurementEligible: false,
      masteryEligible: false,
    },
  };

  if (lesson.trackId === "hsk2-dictation") {
    return {
      ...base,
      kind: "reviewed-audio-dictation",
      instructionVi:
        "Nghe tối đa ba lần, chép lại bằng chữ Hán rồi mới mở đáp án để tự sửa.",
      stimulus: {
        hanzi: item.hanzi,
        pinyin: item.pinyin,
        meaningVi: item.meaningVi,
        audio: null,
        browserTtsPolicy: "draft-preview-only",
      },
      revisionChecklistVi: [
        "Đối chiếu từng chữ, không chỉ đối chiếu nghĩa.",
        "Khoanh chữ sai hoặc thiếu và chép lại cả cụm một lần.",
        "Không tự ghi điểm nghe khi audio được duyệt chưa tồn tại.",
      ],
    };
  }

  if (lesson.trackId === "hsk2-sentence-reconstruction") {
    return {
      ...base,
      kind: "ordered-sentence-reconstruction",
      instructionVi:
        "Sắp xếp tất cả mảnh thành câu hoàn chỉnh rồi viết lại câu trước khi mở đáp án.",
      segments: item.segments,
      modelAnswer: {
        hanzi: item.answerHanzi,
        pinyin: item.pinyin,
        meaningVi: item.meaningVi,
      },
      revisionChecklistVi: [
        "Đã dùng đủ mọi mảnh đúng một lần.",
        "Trật tự thời gian, chủ ngữ, động từ và bổ ngữ hợp lý.",
        "Chép lại câu đúng sau khi tìm được lỗi.",
      ],
    };
  }

  const kind = lesson.trackId === "hsk2-guided-message"
    ? "three-sentence-guided-message"
    : "guided-picture-description";
  return {
    ...base,
    kind,
    instructionVi: kind === "three-sentence-guided-message"
      ? "Viết đúng ba câu để hoàn thành tình huống; dùng ý bắt buộc nhưng không chép nguyên mẫu trước khi tự viết."
      : "Quan sát mô tả cảnh, nói hoặc viết ít nhất ba câu; nêu đủ chi tiết bắt buộc trước khi mở mẫu.",
    situationVi: item.situationVi,
    requiredElementsVi: item.requiredElementsVi,
    languageSupport: item.languageSupport,
    modelResponse: {
      sentences: item.modelSentences,
      reviewState: "pending",
    },
    revisionChecklistVi: [
      "Đủ ba ý bắt buộc và quan hệ giữa các câu rõ ràng.",
      "Tự kiểm tra trật tự từ, lượng từ và từ nối.",
      "Mẫu chỉ dùng để sửa bài, không tạo điểm hay mastery.",
    ],
  };
};

export const buildHsk2ShortTextProduction = (root = process.cwd()) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  const characterBundle = loadHsk2CharacterPracticeBundle(root);
  assertValidHsk2CharacterPracticeBundle(characterBundle);
  const lessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "short-text-production",
  );

  const authoredLessons = lessons.map((lesson) => {
    const content = LESSON_CONTENT[lesson.lessonId];
    if (!content) throw new Error(`Missing production content ${lesson.lessonId}`);
    if (content.length !== expectedPromptCount(lesson)) {
      throw new Error(
        `${lesson.lessonId} must author ${expectedPromptCount(lesson)} prompts`,
      );
    }
    const targetCharacters = targetCharactersFor(characterBundle, lesson);
    return {
      lessonId: lesson.lessonId,
      trackId: lesson.trackId,
      titleVi: lesson.titleVi,
      objectiveVi: lesson.objectiveVi,
      minimumPromptUnits: lesson.assessmentPlan.minimumPromptUnits,
      targetCharacters,
      prompts: content.map((item, index) =>
        buildPrompt(lesson, targetCharacters, item, index)
      ),
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        writingPedagogyReview: "pending",
        assessmentReview: "pending",
        audioRightsReview: lesson.trackId === "hsk2-dictation"
          ? "blocked-no-audio"
          : "not-applicable",
      },
    };
  });

  const prompts = authoredLessons.flatMap((lesson) => lesson.prompts);
  const modelSentenceCount = prompts.reduce((count, item) => {
    if (item.kind === "reviewed-audio-dictation") return count + 1;
    if (item.kind === "ordered-sentence-reconstruction") return count + 1;
    return count + item.modelResponse.sentences.length;
  }, 0);
  const reviewBatches = authoredLessons.map((lesson) => ({
    batchId: `${lesson.lessonId}:short-text-production-review-v1`,
    lessonId: lesson.lessonId,
    promptIds: lesson.prompts.map((item) => item.itemId),
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "writing-pedagogy-reviewer",
      "assessment-editor",
      ...(lesson.trackId === "hsk2-dictation"
        ? ["audio-rights-reviewer"]
        : []),
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk2-short-text-production-2026.07",
    level: 2,
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
      characterPracticePackId: characterBundle.pack.packId,
      characterPracticePackSha256: fileSha256(characterBundle.packPath),
    },
    authorship: {
      method: "ai-assisted-bounded-production-authoring",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      writingPedagogyReviewer: null,
      assessmentEditor: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      writingPedagogyReviewRequiredForRelease: true,
      assessmentReviewRequiredForScoring: true,
      reviewedAudioRequiredForDictation: true,
      reviewedRubricRequiredForWritingMastery: true,
    },
    mappingPolicy: {
      lessonCardinality: "exactly-ten-short-text-blueprints",
      promptMinimumsComeFromBlueprint: true,
      targetCharactersCoveredExactlyOncePerLesson: true,
      recognitionDoesNotInferWriting: true,
      selfRevealDoesNotGrantMastery: true,
    },
    counts: {
      lessons: authoredLessons.length,
      promptUnits: prompts.length,
      dictationPrompts: prompts.filter(
        (item) => item.kind === "reviewed-audio-dictation",
      ).length,
      reconstructionPrompts: prompts.filter(
        (item) => item.kind === "ordered-sentence-reconstruction",
      ).length,
      guidedMessagePrompts: prompts.filter(
        (item) => item.kind === "three-sentence-guided-message",
      ).length,
      pictureDescriptionPrompts: prompts.filter(
        (item) => item.kind === "guided-picture-description",
      ).length,
      modelSentences: modelSentenceCount,
      targetCharacterPromptMappings: new Set(prompts.flatMap(
        (item) => item.targetCharacterRefs.map(
          (target) => target.officialCharacterId,
        ),
      )).size,
      audioDependentPrompts: prompts.filter(
        (item) => item.kind === "reviewed-audio-dictation",
      ).length,
      reviewedAudioPrompts: 0,
      reviewBatches: reviewBatches.length,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      promptMinimumCoverageComplete: true,
      targetCharacterDraftCoverageComplete: true,
      reviewedContentComplete: false,
      reviewedAudioComplete: false,
      scoredWritingCoverageComplete: false,
      writingMasteryCoverageComplete: false,
      hsk2Complete: false,
    },
    lessons: authoredLessons,
    reviewBatches,
  };
};

export const serializeHsk2ShortTextProduction = (pack) =>
  `${JSON.stringify(pack, null, 2)}\n`;

const main = () => {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const outputPath = join(
    process.cwd(),
    HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH,
  );
  const serialized = serializeHsk2ShortTextProduction(
    buildHsk2ShortTextProduction(),
  );
  if (check) {
    const current = readFileSync(outputPath, "utf8");
    if (current !== serialized) {
      throw new Error("Checked HSK2 short-text production pack is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_SHORT_TEXT_PRODUCTION_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
