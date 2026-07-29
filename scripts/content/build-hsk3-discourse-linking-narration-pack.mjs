import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHsk3NarrationGrammarModulePack } from "./hsk3-narration-grammar-module-builder.mjs";
import {
  assertValidHsk3ComparisonEvaluationNarrationPackBundle,
  loadHsk3ComparisonEvaluationNarrationPackBundle,
} from "../../src/content/hsk3ComparisonEvaluationNarrationPack.mjs";
import {
  HSK3_DISCOURSE_LINKING_LESSON_IDS,
  HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH,
  HSK3_DISCOURSE_LINKING_PACK_CONFIG,
  HSK3_DISCOURSE_LINKING_TRACK_ID,
} from "../../src/content/hsk3DiscourseLinkingNarrationPack.mjs";

const draft = (
  explanationVi,
  usageBoundaryVi,
  example,
  correction,
  practice,
) => ({
  explanationVi,
  usageBoundaryVi,
  example,
  correction,
  practice,
});

const GRAMMAR_DRAFTS = {
  "hsk3-grammar-row-020": draft(
    "Phó từ liên kết 一边 đặt trước hành động để nêu hai việc diễn ra đồng thời; thường xuất hiện thành cặp 一边……一边…….",
    "Hai hành động phải có thể cùng diễn ra trong ngữ cảnh và thường cùng chủ thể; không dùng để nối hai bước trước–sau.",
    ["演员一边唱歌，一边跟观众交流。",
      "Yǎnyuán yìbiān chànggē, yìbiān gēn guānzhòng jiāoliú.",
      "Diễn viên vừa hát vừa giao lưu với khán giả."],
    ["演员一边唱完歌，然后交流。", "演员先唱完歌，然后跟观众交流。",
      "Yǎnyuán xiān chàngwán gē, ránhòu gēn guānzhòng jiāoliú.",
      "Hai việc có trình tự thì dùng 先……然后, không dùng 一边."],
    ["Nối hai việc đồng thời: 主持人介绍节目；主持人看时间。→ ____。",
      "主持人一边介绍节目，一边看时间。",
      "Zhǔchírén yìbiān jièshào jiémù, yìbiān kàn shíjiān."],
  ),
  "hsk3-grammar-row-029": draft(
    "或 và 或者 nối các lựa chọn ở cấp từ/cụm; 或 thường gọn và thiên văn viết, 或者 thông dụng trong lời nói.",
    "Trong câu hỏi lựa chọn, thường dùng 还是; 或/或者 chủ yếu trình bày các khả năng chứ không ép người nghe chọn ngay.",
    ["观众可以在网上或现场买票，也可以选择下午或者晚上的演出。",
      "Guānzhòng kěyǐ zài wǎngshàng huò xiànchǎng mǎipiào, yě kěyǐ xuǎnzé xiàwǔ huòzhě wǎnshang de yǎnchū.",
      "Khán giả có thể mua vé trực tuyến hoặc tại chỗ, chọn suất chiều hoặc tối."],
    ["你看下午或者晚上的演出？", "你看下午还是晚上的演出？",
      "Nǐ kàn xiàwǔ háishi wǎnshang de yǎnchū?",
      "Câu hỏi trực tiếp giữa hai lựa chọn dùng 还是."],
    ["Điền liên từ nêu khả năng: 可以坐地铁____公共汽车去剧院。",
      "可以坐地铁或者公共汽车去剧院。",
      "Kěyǐ zuò dìtiě huòzhě gōnggòng qìchē qù jùyuàn."],
  ),
  "hsk3-grammar-row-030": draft(
    "Nhóm liên từ 只有、只要、不但、而且、如果、可/可是、然后 mã hóa các quan hệ khác nhau: điều kiện cần/đủ, tăng tiến, giả thiết, chuyển ý và trình tự.",
    "Không thay chúng cho nhau chỉ vì đều nối mệnh đề; phải xác định quan hệ ý trước rồi dùng đủ cặp khi cấu trúc yêu cầu.",
    ["如果演出准时开始，我们先看节目，然后参加交流；可是下雨的话，活动可能改变。",
      "Rúguǒ yǎnchū zhǔnshí kāishǐ, wǒmen xiān kàn jiémù, ránhòu cānjiā jiāoliú; kěshì xiàyǔ de huà, huódòng kěnéng gǎibiàn.",
      "Nếu buổi diễn bắt đầu đúng giờ, chúng tôi xem trước rồi giao lưu; nhưng nếu mưa, hoạt động có thể đổi."],
    ["不但节目开始，然后观众来了。", "节目开始以后，观众不但认真看，而且积极交流。",
      "Jiémù kāishǐ yǐhòu, guānzhòng bùdàn rènzhēn kàn, érqiě jījí jiāoliú.",
      "不但……而且 nối hai ý tăng tiến, không dùng thay cho quan hệ trình tự."],
    ["Chọn quan hệ đúng: ____想了解演员，____可以参加演后的交流。",
      "如果想了解演员，就可以参加演后的交流。",
      "Rúguǒ xiǎng liǎojiě yǎnyuán, jiù kěyǐ cānjiā yǎn hòu de jiāoliú."],
  ),
  "hsk3-grammar-row-044": draft(
    "除了 A（以外），……还/也…… bổ sung thêm ngoài A; kết hợp 都 có thể nêu tất cả đều như nhau sau khi loại trừ hoặc bao gồm phạm vi rõ.",
    "Phải xác định A được bổ sung hay bị loại trừ qua vị ngữ phía sau; không bỏ từ liên kết khiến quan hệ phạm vi mơ hồ.",
    ["除了音乐会以外，艺术节还有舞蹈和戏剧表演。",
      "Chúle yīnyuèhuì yǐwài, yìshùjié hái yǒu wǔdǎo hé xìjù biǎoyǎn.",
      "Ngoài hòa nhạc, liên hoan nghệ thuật còn có múa và kịch."],
    ["除了音乐会以外，艺术节有舞蹈。", "除了音乐会以外，艺术节还有舞蹈。",
      "Chúle yīnyuèhuì yǐwài, yìshùjié hái yǒu wǔdǎo.",
      "还 đánh dấu rõ đây là phần được bổ sung ngoài hòa nhạc."],
    ["Thêm thông tin: ____主舞台____，广场上____有免费表演。",
      "除了主舞台以外，广场上也有免费表演。",
      "Chúle zhǔ wǔtái yǐwài, guǎngchǎng shàng yě yǒu miǎnfèi biǎoyǎn."],
  ),
  "hsk3-grammar-row-082": draft(
    "先……再/然后…… tổ chức hai hay nhiều bước theo thứ tự, với 先 đánh dấu bước trước và 再/然后 dẫn bước sau.",
    "Không dùng cho hành động đồng thời; thứ tự phải khớp diễn biến thực tế của tường thuật.",
    ["我们先在网上买票，然后到剧院取票。",
      "Wǒmen xiān zài wǎngshàng mǎipiào, ránhòu dào jùyuàn qǔpiào.",
      "Chúng tôi mua vé trực tuyến trước rồi đến nhà hát lấy vé."],
    ["我们然后买票，先看演出。", "我们先买票，然后看演出。",
      "Wǒmen xiān mǎipiào, ránhòu kàn yǎnchū.",
      "Mua vé xảy ra trước xem biểu diễn nên trật tự liên từ phải đi theo diễn biến."],
    ["Sắp thứ tự: 进场；出示票。→ ____。",
      "我们先出示票，再进场。",
      "Wǒmen xiān chūshì piào, zài jìnchǎng."],
  ),
  "hsk3-grammar-row-083": draft(
    "或者……或者…… đặt hai phương án hay khả năng ở hai vế song song.",
    "Nếu yêu cầu người nghe lựa chọn trực tiếp thường dùng 是……还是……; mẫu này phù hợp với kế hoạch hoặc các khả năng mở.",
    ["周末我们或者去看戏，或者在家看网上演出。",
      "Zhōumò wǒmen huòzhě qù kàn xì, huòzhě zài jiā kàn wǎngshàng yǎnchū.",
      "Cuối tuần chúng tôi hoặc đi xem kịch, hoặc xem biểu diễn trực tuyến ở nhà."],
    ["你或者去，或者不去？", "你是去看戏，还是在家看演出？",
      "Nǐ shì qù kàn xì, háishi zài jiā kàn yǎnchū?",
      "Khi hỏi người nghe chọn, dùng 是……还是…… tự nhiên hơn."],
    ["Nêu hai phương án: 下雨时，活动____改到室内，____换一天。",
      "下雨时，活动或者改到室内，或者换一天。",
      "Xiàyǔ shí, huódòng huòzhě gǎi dào shìnèi, huòzhě huàn yì tiān."],
  ),
  "hsk3-grammar-row-084": draft(
    "一会儿……一会儿…… mô tả trạng thái hoặc hành động luân phiên trong một khoảng thời gian ngắn.",
    "Không dùng để liệt kê hai giai đoạn hoàn tất chỉ xảy ra một lần; trọng tâm là sự thay đổi qua lại.",
    ["比赛开始后，比分一会儿领先，一会儿相同。",
      "Bǐsài kāishǐ hòu, bǐfēn yíhuìr lǐngxiān, yíhuìr xiāngtóng.",
      "Sau khi trận đấu bắt đầu, tỉ số lúc dẫn trước lúc bằng nhau."],
    ["比赛先开始，一会儿结束。", "比赛先开始，两个小时以后结束。",
      "Bǐsài xiān kāishǐ, liǎng ge xiǎoshí yǐhòu jiéshù.",
      "Bắt đầu rồi kết thúc là trình tự, không phải hai trạng thái luân phiên."],
    ["Điền trạng thái thay đổi: 山里的天气____晴，____下雨。",
      "山里的天气一会儿晴，一会儿下雨。",
      "Shān li de tiānqì yíhuìr qíng, yíhuìr xiàyǔ."],
  ),
  "hsk3-grammar-row-085": draft(
    "又……又…… nối hai đặc điểm hoặc hành động cùng đúng về một chủ thể.",
    "Hai thành phần cần song song về ngữ pháp; không dùng để nối quan hệ nguyên nhân hay thứ tự.",
    ["这道菜又香又辣，很适合喜欢重口味的人。",
      "Zhè dào cài yòu xiāng yòu là, hěn shìhé xǐhuan zhòng kǒuwèi de rén.",
      "Món này vừa thơm vừa cay, hợp với người thích vị đậm."],
    ["这道菜又香而且很辣。", "这道菜又香又辣。",
      "Zhè dào cài yòu xiāng yòu là.",
      "Hai tính từ song song dùng cặp 又……又…… đầy đủ."],
    ["Gộp hai đặc điểm: 汤很热；汤很鲜。→ ____。",
      "这个汤又热又鲜。",
      "Zhège tāng yòu rè yòu xiān."],
  ),
  "hsk3-grammar-row-086": draft(
    "一边……一边…… nối hai hành động đang diễn ra đồng thời, thường do cùng một chủ thể thực hiện.",
    "Không ghép hai hành động không thể đồng thời hoặc hai mốc trước–sau; khi chủ thể khác nhau cần làm quan hệ rõ.",
    ["厨师一边介绍做法，一边准备下一道菜。",
      "Chúshī yìbiān jièshào zuòfǎ, yìbiān zhǔnbèi xià yí dào cài.",
      "Đầu bếp vừa giới thiệu cách làm vừa chuẩn bị món tiếp theo."],
    ["厨师一边做完菜，一边端上桌。", "厨师先做完菜，再端上桌。",
      "Chúshī xiān zuòwán cài, zài duān shàng zhuō.",
      "Phải nấu xong rồi mới bưng lên nên dùng trình tự 先……再."],
    ["Nối hai việc có thể đồng thời: 我们吃菜；我们听介绍。→ ____。",
      "我们一边吃菜，一边听介绍。",
      "Wǒmen yìbiān chī cài, yìbiān tīng jièshào."],
  ),
  "hsk3-grammar-row-087": draft(
    "不但……而且…… nối ý thứ hai tăng thêm về mức độ hoặc thông tin so với ý thứ nhất.",
    "Hai vế phải cùng hướng lập luận; vị trí chủ ngữ cần nhất quán và không dùng 而且 một mình để biểu thị đối lập.",
    ["这场比赛不但过程精彩，而且结果也让人意外。",
      "Zhè chǎng bǐsài bùdàn guòchéng jīngcǎi, érqiě jiéguǒ yě ràng rén yìwài.",
      "Trận đấu không chỉ hấp dẫn về diễn biến mà kết quả còn bất ngờ."],
    ["这场比赛虽然精彩，而且很长。", "这场比赛不但精彩，而且持续了很长时间。",
      "Zhè chǎng bǐsài bùdàn jīngcǎi, érqiě chíxù le hěn cháng shíjiān.",
      "Hai ý cùng tăng thêm dùng 不但……而且, không trộn 虽然 với 而且."],
    ["Thêm ý tăng tiến: 这个活动____介绍菜，____教大家怎么做。",
      "这个活动不但介绍菜，而且教大家怎么做。",
      "Zhège huódòng bùdàn jièshào cài, érqiě jiāo dàjiā zěnme zuò."],
  ),
  "hsk3-grammar-row-088": draft(
    "虽然……可是…… nêu một sự thật nhượng bộ ở vế đầu rồi chuyển sang kết quả hoặc nhận định trái kỳ vọng ở vế sau.",
    "Không bỏ mất quan hệ đối lập; 可是 không có nghĩa nguyên nhân và kết quả sau nó cần thực sự trái với kỳ vọng từ vế đầu.",
    ["虽然主队先得分，可是客队最后赢了比赛。",
      "Suīrán zhǔduì xiān défēn, kěshì kèduì zuìhòu yíng le bǐsài.",
      "Dù đội chủ nhà ghi điểm trước, đội khách cuối cùng thắng."],
    ["虽然下雨，所以比赛继续。", "虽然下雨，可是比赛还是继续了。",
      "Suīrán xiàyǔ, kěshì bǐsài háishi jìxù le.",
      "Mưa mà trận đấu vẫn tiếp tục là quan hệ nhượng bộ, dùng 虽然……可是."],
    ["Hoàn thành chuyển ý: ____菜很辣，____我还是想尝一尝。",
      "虽然菜很辣，可是我还是想尝一尝。",
      "Suīrán cài hěn là, kěshì wǒ háishi xiǎng cháng yì cháng."],
  ),
  "hsk3-grammar-row-089": draft(
    "如果……就…… đặt một tình huống giả định hoặc điều kiện ở vế đầu và kết quả tương ứng ở vế sau.",
    "Điều kiện này không nhất thiết là điều kiện duy nhất; không đổi 如果 thành 只有 nếu chưa có nghĩa 'chỉ khi'.",
    ["如果客队再得一分，就会进入下一场比赛。",
      "Rúguǒ kèduì zài dé yì fēn, jiù huì jìnrù xià yì chǎng bǐsài.",
      "Nếu đội khách thêm một điểm thì sẽ vào trận tiếp theo."],
    ["只有下雨，就改时间。", "如果下雨，就改比赛时间。",
      "Rúguǒ xiàyǔ, jiù gǎi bǐsài shíjiān.",
      "Một khả năng dẫn tới phương án xử lý dùng 如果……就, không dùng cặp 只有……就."],
    ["Nêu phương án: ____没有票，____在网上看比赛。",
      "如果没有票，就在网上看比赛。",
      "Rúguǒ méiyǒu piào, jiù zài wǎngshàng kàn bǐsài."],
  ),
  "hsk3-grammar-row-090": draft(
    "Mệnh đề + 的话， 就…… là cách thường gặp trong khẩu ngữ để đóng khung điều kiện rồi nêu kết quả.",
    "的话 đứng cuối mệnh đề điều kiện, không đặt sau kết quả; 就 có thể lược trong hội thoại nhưng được giữ ở bài này để quan hệ rõ.",
    ["第一次去别人家做客的话，就先问清楚当地的习惯。",
      "Dì-yī cì qù biérén jiā zuòkè de huà, jiù xiān wèn qīngchu dāngdì de xíguàn.",
      "Nếu lần đầu đến nhà người khác, hãy hỏi rõ phong tục địa phương trước."],
    ["第一次的话去做客，就先问习惯。", "第一次去做客的话，就先问清楚当地的习惯。",
      "Dì-yī cì qù zuòkè de huà, jiù xiān wèn qīngchu dāngdì de xíguàn.",
      "的话 đặt sau toàn mệnh đề điều kiện 第一次去做客."],
    ["Điền điều kiện khẩu ngữ: 不知道怎么称呼____，____可以先问朋友。",
      "不知道怎么称呼的话，就可以先问朋友。",
      "Bù zhīdào zěnme chēnghu de huà, jiù kěyǐ xiān wèn péngyou."],
  ),
  "hsk3-grammar-row-091": draft(
    "只有……才…… nêu điều kiện cần: chỉ khi điều kiện ở vế đầu được đáp ứng thì kết quả ở vế sau mới có thể xảy ra.",
    "Đây là điều kiện cần, không phải điều kiện chỉ là đủ; câu này loại trừ các con đường khác nên cần căn cứ phù hợp.",
    ["只有提前了解习惯，才不容易在做客时失礼。",
      "Zhǐyǒu tíqián liǎojiě xíguàn, cái bù róngyì zài zuòkè shí shīlǐ.",
      "Chỉ khi tìm hiểu phong tục trước mới ít dễ thất lễ khi làm khách."],
    ["只有带礼物，就能表示尊重。", "只有了解对方重视什么，才能选择合适的礼物。",
      "Zhǐyǒu liǎojiě duìfāng zhòngshì shénme, cái néng xuǎnzé héshì de lǐwù.",
      "只有 phải đi với 才 và nêu điều kiện thực sự cần cho kết quả đang nói."],
    ["Nêu điều kiện cần: ____主人请你坐，____坐下。",
      "只有主人请你坐，你才坐下。",
      "Zhǐyǒu zhǔrén qǐng nǐ zuò, nǐ cái zuòxia."],
  ),
  "hsk3-grammar-row-092": draft(
    "只要……就…… nêu điều kiện đủ hoặc ngưỡng tối thiểu: hễ đáp ứng điều kiện thì kết quả có thể theo sau.",
    "Không mang nghĩa 'chỉ khi'; ngoài điều kiện này vẫn có thể có cách khác đạt kết quả, và lời hứa tuyệt đối cần tránh nếu thực tế còn ngoại lệ.",
    ["做客时只要认真听主人介绍，就能了解很多习惯。",
      "Zuòkè shí zhǐyào rènzhēn tīng zhǔrén jièshào, jiù néng liǎojiě hěn duō xíguàn.",
      "Khi làm khách, chỉ cần nghe chủ nhà giới thiệu kỹ là có thể hiểu nhiều phong tục."],
    ["只要带礼物，才可以进门。", "只要主人同意，就可以进门。",
      "Zhǐyào zhǔrén tóngyì, jiù kěyǐ jìnmén.",
      "只要 đi với 就; câu chỉ nên đặt ngưỡng đủ phù hợp với tình huống."],
    ["Chọn cặp điều kiện đủ: ____提前告诉主人，主人____能准备得更方便。",
      "只要提前告诉主人，主人就能准备得更方便。",
      "Zhǐyào tíqián gàosu zhǔrén, zhǔrén jiù néng zhǔnbèi de gèng fāngbiàn."],
  ),
  "hsk3-grammar-row-093": draft(
    "为了 + mục đích，…… đặt mục tiêu trước hành động được thực hiện để đạt mục tiêu đó.",
    "Mục đích thường thuộc chủ thể có thể hành động; không dùng 为了 để nối một kết quả ngoài ý muốn.",
    ["为了表示尊重，我们提前了解了当地的称呼和用餐习惯。",
      "Wèile biǎoshì zūnzhòng, wǒmen tíqián liǎojiě le dāngdì de chēnghu hé yòngcān xíguàn.",
      "Để thể hiện tôn trọng, chúng tôi tìm hiểu trước cách xưng hô và ăn uống địa phương."],
    ["为了下雨，我们带了伞。", "因为可能下雨，我们带了伞。",
      "Yīnwèi kěnéng xiàyǔ, wǒmen dài le sǎn.",
      "Mưa là nguyên nhân/dự báo, không phải mục đích có chủ ý nên dùng 因为."],
    ["Nêu mục đích: ____不打扰主人，我们提前说了到达时间。",
      "为了不打扰主人，我们提前说了到达时间。",
      "Wèile bù dǎrǎo zhǔrén, wǒmen tíqián shuō le dàodá shíjiān."],
  ),
  "hsk3-grammar-row-094": draft(
    "……了……（就）…… là câu rút gọn nối sự kiện hoàn tất ở vế đầu với hành động xảy ra ngay hoặc theo thói quen ở vế sau.",
    "了 đánh dấu mốc hoàn tất trong chuỗi, không tự chứng minh quan hệ nhân quả; chủ thể và trình tự phải rõ để tránh hiểu nhầm.",
    ["主人介绍了座位，我们就按顺序坐下。",
      "Zhǔrén jièshào le zuòwèi, wǒmen jiù àn shùnxù zuòxia.",
      "Chủ nhà giới thiệu chỗ ngồi xong, chúng tôi ngồi theo thứ tự."],
    ["我们坐下了主人介绍座位。", "主人介绍了座位，我们就坐下。",
      "Zhǔrén jièshào le zuòwèi, wǒmen jiù zuòxia.",
      "Sự kiện hoàn tất đứng trước; hành động tiếp theo đi sau và có thể dùng 就."],
    ["Nối hai mốc: 客人到齐；主人开始吃饭。→ ____。",
      "客人到齐了，主人就请大家开始吃饭。",
      "Kèrén dào qí le, zhǔrén jiù qǐng dàjiā kāishǐ chīfàn."],
  ),
};

const NARRATIVES = {
  [HSK3_DISCOURSE_LINKING_LESSON_IDS[0]]: {
    titleHanzi: "第一次参加艺术节",
    titleVi: "Lần đầu dự liên hoan nghệ thuật",
    lines: [
      ["周末我们或者坐地铁，或者坐公共汽车去艺术节。",
        "Zhōumò wǒmen huòzhě zuò dìtiě, huòzhě zuò gōnggòng qìchē qù yìshùjié.",
        "Cuối tuần chúng tôi hoặc đi tàu điện, hoặc đi xe buýt tới liên hoan."],
      ["我们先在网上买票，然后到剧院取票。",
        "Wǒmen xiān zài wǎngshàng mǎipiào, ránhòu dào jùyuàn qǔpiào.",
        "Chúng tôi mua vé trực tuyến trước rồi đến nhà hát lấy vé."],
      ["除了音乐会以外，广场上还有舞蹈和戏剧表演。",
        "Chúle yīnyuèhuì yǐwài, guǎngchǎng shàng hái yǒu wǔdǎo hé xìjù biǎoyǎn.",
        "Ngoài hòa nhạc, quảng trường còn có múa và kịch."],
      ["主持人一边介绍节目，一边提醒大家注意时间。",
        "Zhǔchírén yìbiān jièshào jiémù, yìbiān tíxǐng dàjiā zhùyì shíjiān.",
        "Người dẫn vừa giới thiệu tiết mục vừa nhắc mọi người chú ý giờ."],
      ["如果想了解演员，就可以参加演出后的交流。",
        "Rúguǒ xiǎng liǎojiě yǎnyuán, jiù kěyǐ cānjiā yǎnchū hòu de jiāoliú.",
        "Nếu muốn hiểu thêm về nghệ sĩ thì có thể dự phần giao lưu sau diễn."],
      ["活动选择很多，可是我们按自己的时间只参加了两项。",
        "Huódòng xuǎnzé hěn duō, kěshì wǒmen àn zìjǐ de shíjiān zhǐ cānjiā le liǎng xiàng.",
        "Hoạt động có nhiều lựa chọn, nhưng theo thời gian chúng tôi chỉ dự hai mục."],
    ],
    eventOrderVi: [
      "Chọn cách đi",
      "Mua rồi lấy vé",
      "Khám phá các loại biểu diễn",
      "Chọn hoạt động theo thời gian thực tế",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-020",
      "hsk3-grammar-row-029",
      "hsk3-grammar-row-030",
      "hsk3-grammar-row-044",
      "hsk3-grammar-row-082",
      "hsk3-grammar-row-083",
    ],
    retellingPromptVi:
      "Kể lại chuyến đi liên hoan theo bốn mốc, dùng một cặp lựa chọn, một chuỗi 先……然后 và hai quan hệ liên kết khác nhau.",
  },
  [HSK3_DISCOURSE_LINKING_LESSON_IDS[1]]: {
    titleHanzi: "比赛以后介绍家乡菜",
    titleVi: "Giới thiệu món quê sau trận đấu",
    lines: [
      ["比赛开始后，比分一会儿领先，一会儿相同。",
        "Bǐsài kāishǐ hòu, bǐfēn yíhuìr lǐngxiān, yíhuìr xiāngtóng.",
        "Sau khi trận đấu bắt đầu, tỉ số lúc dẫn trước lúc bằng nhau."],
      ["两队又认真又冷静，观众也一直为他们加油。",
        "Liǎng duì yòu rènzhēn yòu lěngjìng, guānzhòng yě yìzhí wèi tāmen jiāyóu.",
        "Hai đội vừa nghiêm túc vừa bình tĩnh, khán giả luôn cổ vũ."],
      ["虽然主队先得分，可是客队最后赢了。",
        "Suīrán zhǔduì xiān défēn, kěshì kèduì zuìhòu yíng le.",
        "Dù đội chủ nhà ghi điểm trước, đội khách cuối cùng thắng."],
      ["比赛以后，厨师一边准备菜，一边介绍家乡的做法。",
        "Bǐsài yǐhòu, chúshī yìbiān zhǔnbèi cài, yìbiān jièshào jiāxiāng de zuòfǎ.",
        "Sau trận, đầu bếp vừa chuẩn bị món vừa giới thiệu cách làm quê nhà."],
      ["这道菜不但又香又辣，而且还有一个节日故事。",
        "Zhè dào cài bùdàn yòu xiāng yòu là, érqiě hái yǒu yí ge jiérì gùshi.",
        "Món này không chỉ vừa thơm vừa cay mà còn có một câu chuyện lễ hội."],
      ["如果有人不能吃辣，就可以先尝旁边清淡的菜。",
        "Rúguǒ yǒu rén bù néng chī là, jiù kěyǐ xiān cháng pángbiān qīngdàn de cài.",
        "Nếu ai không ăn cay được thì có thể thử món thanh đạm bên cạnh trước."],
    ],
    eventOrderVi: [
      "Tỉ số thay đổi trong trận",
      "Kết quả trái kỳ vọng ban đầu",
      "Đầu bếp trình bày món quê",
      "Nêu đặc điểm, câu chuyện và phương án thay thế",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-084",
      "hsk3-grammar-row-085",
      "hsk3-grammar-row-086",
      "hsk3-grammar-row-087",
      "hsk3-grammar-row-088",
      "hsk3-grammar-row-089",
    ],
    retellingPromptVi:
      "Kể lại trận đấu rồi phần giới thiệu món ăn, dùng đủ một quan hệ luân phiên, đồng thời, tăng tiến, nhượng bộ và giả thiết.",
  },
  [HSK3_DISCOURSE_LINKING_LESSON_IDS[2]]: {
    titleHanzi: "第一次去朋友家做客",
    titleVi: "Lần đầu đến nhà bạn làm khách",
    lines: [
      ["第一次去朋友家做客的话，就应该先了解当地习惯。",
        "Dì-yī cì qù péngyou jiā zuòkè de huà, jiù yīnggāi xiān liǎojiě dāngdì xíguàn.",
        "Nếu lần đầu đến nhà bạn làm khách, nên tìm hiểu phong tục trước."],
      ["为了表示尊重，我们提前问了合适的称呼和到达时间。",
        "Wèile biǎoshì zūnzhòng, wǒmen tíqián wèn le héshì de chēnghu hé dàodá shíjiān.",
        "Để thể hiện tôn trọng, chúng tôi hỏi trước cách xưng hô và giờ đến."],
      ["只有主人请我们进门，我们才走进去。",
        "Zhǐyǒu zhǔrén qǐng wǒmen jìnmén, wǒmen cái zǒu jìnqu.",
        "Chỉ khi chủ nhà mời, chúng tôi mới bước vào."],
      ["只要认真听主人介绍，就能了解很多家庭习惯。",
        "Zhǐyào rènzhēn tīng zhǔrén jièshào, jiù néng liǎojiě hěn duō jiātíng xíguàn.",
        "Chỉ cần nghe chủ nhà giới thiệu kỹ là có thể hiểu nhiều nếp nhà."],
      ["主人介绍了座位，我们就按顺序坐下。",
        "Zhǔrén jièshào le zuòwèi, wǒmen jiù àn shùnxù zuòxia.",
        "Chủ nhà giới thiệu chỗ ngồi xong, chúng tôi ngồi theo thứ tự."],
      ["这些做法来自这次做客的经验，不代表每个地区都完全一样。",
        "Zhèxiē zuòfǎ láizì zhè cì zuòkè de jīngyàn, bù dàibiǎo měi ge dìqū dōu wánquán yíyàng.",
        "Các cách này đến từ lần làm khách này, không đại diện mọi vùng đều giống hệt."],
    ],
    eventOrderVi: [
      "Tìm hiểu phong tục trước chuyến thăm",
      "Hỏi cách xưng hô và giờ đến",
      "Vào nhà theo lời mời và nghe giới thiệu",
      "Giới hạn nhận xét trong trải nghiệm cụ thể",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-090",
      "hsk3-grammar-row-091",
      "hsk3-grammar-row-092",
      "hsk3-grammar-row-093",
      "hsk3-grammar-row-094",
    ],
    retellingPromptVi:
      "Kể lại chuyến thăm theo bốn mốc, phân biệt điều kiện giả định, cần và đủ, rồi dùng một câu mục đích và một chuỗi ……了……就…….",
  },
};

export const buildHsk3DiscourseLinkingNarrationPack = (
  root = process.cwd(),
) => {
  const comparisonBundle =
    loadHsk3ComparisonEvaluationNarrationPackBundle(root);
  assertValidHsk3ComparisonEvaluationNarrationPackBundle(comparisonBundle);
  return buildHsk3NarrationGrammarModulePack({
    root,
    packId: HSK3_DISCOURSE_LINKING_PACK_CONFIG.packId,
    trackId: HSK3_DISCOURSE_LINKING_TRACK_ID,
    lessonIds: HSK3_DISCOURSE_LINKING_LESSON_IDS,
    grammarDrafts: GRAMMAR_DRAFTS,
    narratives: NARRATIVES,
    prerequisitePackBundles: [comparisonBundle],
    completedNarrationGrammarModules:
      HSK3_DISCOURSE_LINKING_PACK_CONFIG.completedNarrationGrammarModules,
    completedNarrationGrammarLessons:
      HSK3_DISCOURSE_LINKING_PACK_CONFIG.completedNarrationGrammarLessons,
  });
};

export const serializeHsk3DiscourseLinkingNarrationPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3DiscourseLinkingNarrationPack(
    buildHsk3DiscourseLinkingNarrationPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 discourse-linking narration pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH,
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
