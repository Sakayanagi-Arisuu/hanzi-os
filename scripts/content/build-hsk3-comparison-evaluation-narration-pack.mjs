import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHsk3NarrationGrammarModulePack } from "./hsk3-narration-grammar-module-builder.mjs";
import {
  assertValidHsk3EventComplementsNarrationPackBundle,
  loadHsk3EventComplementsNarrationPackBundle,
} from "../../src/content/hsk3EventComplementsNarrationPack.mjs";
import {
  HSK3_COMPARISON_EVALUATION_LESSON_IDS,
  HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH,
  HSK3_COMPARISON_EVALUATION_PACK_CONFIG,
  HSK3_COMPARISON_EVALUATION_TRACK_ID,
} from "../../src/content/hsk3ComparisonEvaluationNarrationPack.mjs";

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
  "hsk3-grammar-row-039": draft(
    "越来越 + tính từ/động từ tâm lý mô tả một đặc điểm thay đổi tăng dần theo thời gian.",
    "Cấu trúc cần một trục biến đổi có thể hiểu được; không dùng để so trực tiếp hai đối tượng tại cùng một thời điểm.",
    ["春天来了，天气越来越暖。",
      "Chūntiān lái le, tiānqì yuèláiyuè nuǎn.",
      "Mùa xuân đến, thời tiết ngày càng ấm."],
    ["今天比昨天越来越暖。", "从昨天到今天，天气越来越暖。",
      "Cóng zuótiān dào jīntiān, tiānqì yuèláiyuè nuǎn.",
      "越来越 nêu quá trình thay đổi; thêm khoảng thời gian thay vì dùng 比 để so hai mốc."],
    ["Điền xu hướng: 雨停以后，天____亮了。",
      "雨停以后，天越来越亮了。",
      "Yǔ tíng yǐhòu, tiān yuèláiyuè liàng le."],
  ),
  "hsk3-grammar-row-040": draft(
    "看起来 nêu ấn tượng hoặc suy đoán dựa trên dấu hiệu người nói đang quan sát.",
    "Đây là nhận định có thể sai, không biến vẻ bề ngoài thành sự thật chắc chắn; khi cần hãy nêu căn cứ.",
    ["云越来越黑，看起来快要下雨了。",
      "Yún yuèláiyuè hēi, kànqǐlai kuàiyào xiàyǔ le.",
      "Mây ngày càng đen, có vẻ sắp mưa."],
    ["看起来一定会下雨。", "云很黑，看起来可能会下雨。",
      "Yún hěn hēi, kànqǐlai kěnéng huì xiàyǔ.",
      "看起来 chỉ suy đoán; 可能 giữ đúng mức độ chắc chắn của quan sát."],
    ["Viết suy đoán có căn cứ: 路上都是水，____。",
      "路上都是水，看起来刚下过雨。",
      "Lùshang dōu shì shuǐ, kànqǐlai gāng xiàguo yǔ."],
  ),
  "hsk3-grammar-row-041": draft(
    "看上去 cũng nêu ấn tượng quan sát được, thường thiên về dáng vẻ trực tiếp của người, vật hoặc cảnh.",
    "Không dùng vẻ ngoài để kết luận phẩm chất hay nguyên nhân bên trong; câu nên giữ phạm vi là ấn tượng hiện tại.",
    ["雨后的山看上去比平时更清楚。",
      "Yǔ hòu de shān kànshangqu bǐ píngshí gèng qīngchu.",
      "Núi sau mưa trông rõ hơn bình thường."],
    ["他看上去就是不认真。", "他今天看上去有点儿累。",
      "Tā jīntiān kànshangqu yǒudiǎnr lèi.",
      "看上去 phù hợp với trạng thái quan sát được; không quy chụp phẩm chất con người."],
    ["Điền ấn tượng thị giác: 雪停了，整个公园____很安静。",
      "雪停了，整个公园看上去很安静。",
      "Xuě tíng le, zhěnggè gōngyuán kànshangqu hěn ānjìng."],
  ),
  "hsk3-grammar-row-043": draft(
    "不怎么样 là cách đánh giá mức độ không tốt hoặc không nổi bật, thường mềm hơn phủ định trực tiếp.",
    "Đây vẫn là nhận xét tiêu cực; cần nêu đối tượng, phương diện hoặc trải nghiệm cụ thể, không dùng để hạ thấp chung chung.",
    ["今天空气质量不怎么样，下午最好少在外面运动。",
      "Jīntiān kōngqì zhìliàng bù zěnmeyàng, xiàwǔ zuìhǎo shǎo zài wàimian yùndòng.",
      "Chất lượng không khí hôm nay không tốt lắm, chiều nên ít vận động ngoài trời."],
    ["这个城市不怎么样。", "这座城市今天的空气质量不怎么样。",
      "Zhè zuò chéngshì jīntiān de kōngqì zhìliàng bù zěnmeyàng.",
      "Thu hẹp nhận xét vào chất lượng không khí hôm nay thay vì đánh giá cả thành phố."],
    ["Thu hẹp phạm vi đánh giá: 这次旅行____（天气）。",
      "这次旅行的天气不怎么样。",
      "Zhè cì lǚxíng de tiānqì bù zěnmeyàng."],
  ),
  "hsk3-grammar-row-049": draft(
    "越 + điều kiện/thay đổi thứ nhất + 越 + kết quả thứ hai biểu thị hai mức độ cùng biến đổi có quan hệ.",
    "Cấu trúc nêu tương quan trong ngữ cảnh, không tự chứng minh quan hệ nhân quả phổ quát.",
    ["雨越下越大，河里的水也越涨越高。",
      "Yǔ yuè xià yuè dà, hé li de shuǐ yě yuè zhǎng yuè gāo.",
      "Mưa càng lúc càng lớn, nước sông cũng dâng càng cao."],
    ["雨越来越下大。", "雨越下越大。",
      "Yǔ yuè xià yuè dà.",
      "Mẫu tương quan lặp 越 quanh hai thành phần: 越下越大."],
    ["Hoàn thành tương quan: 风____，海浪____。",
      "风越刮越大，海浪越变越高。",
      "Fēng yuè guā yuè dà, hǎilàng yuè biàn yuè gāo."],
  ),
  "hsk3-grammar-row-053": draft(
    "在……上/下/中 khoanh phương diện, điều kiện hoặc quá trình để giới hạn một nhận xét hay thay đổi.",
    "Không đồng nhất máy móc với vị trí vật lý: 在保护环境上 là về phương diện bảo vệ, 在这种情况下 là trong điều kiện này.",
    ["这个地区在保护环境上有了进步，在发展中也遇到新问题。",
      "Zhège dìqū zài bǎohù huánjìng shàng yǒu le jìnbù, zài fāzhǎn zhōng yě yùdào xīn wèntí.",
      "Khu vực này tiến bộ về bảo vệ môi trường và cũng gặp vấn đề mới trong phát triển."],
    ["这个地区在环境上保护得好。", "这个地区在保护环境上做得比较好。",
      "Zhège dìqū zài bǎohù huánjìng shàng zuò de bǐjiào hǎo.",
      "Sau 在……上 đặt phương diện hoàn chỉnh 保护环境 rồi mới nêu đánh giá."],
    ["Điền phạm vi: ____，我们还需要听专家的意见。",
      "在这个问题上，我们还需要听专家的意见。",
      "Zài zhège wèntí shàng, wǒmen hái xūyào tīng zhuānjiā de yìjian."],
  ),
  "hsk3-grammar-row-062": draft(
    "Tính từ + 得很 nhấn mức độ cao của một trạng thái, thường dùng trong khẩu ngữ miêu tả.",
    "Không thêm 很 trước tính từ trong cùng mẫu; mức độ phải phù hợp căn cứ trong đoạn, tránh phóng đại vô cớ.",
    ["雨停以后，空气清新得很。",
      "Yǔ tíng yǐhòu, kōngqì qīngxīn de hěn.",
      "Sau khi mưa tạnh, không khí rất trong lành."],
    ["空气很清新得很。", "空气清新得很。",
      "Kōngqì qīngxīn de hěn.",
      "得很 đã làm bổ ngữ mức độ nên không chồng 很 trước tính từ."],
    ["Đổi sang 得很: 今天的风非常凉快。→ ____。",
      "今天的风凉快得很。",
      "Jīntiān de fēng liángkuai de hěn."],
  ),
  "hsk3-grammar-row-063": draft(
    "Tính từ/động từ + 极了 hoặc 坏了 diễn đạt mức độ cực cao; 坏了 thường đi với trạng thái khiến người nói chịu tác động như 累坏了、急坏了.",
    "Hai bổ ngữ mang sắc thái mạnh, không dùng cho mọi nhận xét trung tính; cần giữ chủ thể và tình huống rõ.",
    ["夏天中午热极了，走很远的路会把人累坏了。",
      "Xiàtiān zhōngwǔ rè jí le, zǒu hěn yuǎn de lù huì bǎ rén lèi huài le.",
      "Buổi trưa mùa hè nóng vô cùng; đi xa sẽ làm người ta mệt lả."],
    ["今天非常热极了。", "今天热极了。",
      "Jīntiān rè jí le.",
      "极了 tự biểu thị cực độ nên không chồng 非常 trước tính từ."],
    ["Chọn bổ ngữ phù hợp: 找不到孩子，妈妈急____。",
      "找不到孩子，妈妈急坏了。",
      "Zhǎobudào háizi, māma jí huài le."],
  ),
  "hsk3-grammar-row-073": draft(
    "A 比 B 更/还 + tính từ nhấn A có mức độ cao hơn B, trong đó 更/还 tăng sức nhấn so với câu 比 cơ bản.",
    "Phải xác định cùng một phương diện và điều kiện so sánh; không suy rộng kết quả từ một thời điểm thành quy luật.",
    ["今年春天比去年春天更暖。",
      "Jīnnián chūntiān bǐ qùnián chūntiān gèng nuǎn.",
      "Mùa xuân năm nay ấm hơn mùa xuân năm ngoái."],
    ["今年比去年春天更暖。", "今年春天比去年春天更暖。",
      "Jīnnián chūntiān bǐ qùnián chūntiān gèng nuǎn.",
      "Hai vế cần cùng loại mốc: mùa xuân năm nay và mùa xuân năm ngoái."],
    ["Hoàn thành so sánh cùng điều kiện: 山上____山下____冷。",
      "山上比山下更冷。",
      "Shānshang bǐ shānxià gèng lěng."],
  ),
  "hsk3-grammar-row-074": draft(
    "A 跟 B 一样 xác nhận hai đối tượng giống nhau ở điều đang nói hoặc cùng loại trạng thái.",
    "Nếu cần nêu phương diện, thêm danh từ hoặc tính từ sau 一样; không hiểu là giống nhau về mọi mặt.",
    ["这个社区的办法跟上个社区的办法一样。",
      "Zhège shèqū de bànfǎ gēn shàng ge shèqū de bànfǎ yíyàng.",
      "Cách làm của khu dân cư này giống cách của khu trước."],
    ["这个社区跟上个社区都一样。", "这个社区的办法跟上个社区的办法一样。",
      "Zhège shèqū de bànfǎ gēn shàng ge shèqū de bànfǎ yíyàng.",
      "Nêu rõ đang so cách làm, không kết luận hai khu giống nhau toàn bộ."],
    ["Nêu phương diện được so: 这次活动的安排____上次____。",
      "这次活动的安排跟上次一样。",
      "Zhè cì huódòng de ānpái gēn shàng cì yíyàng."],
  ),
  "hsk3-grammar-row-075": draft(
    "A 跟 B 一样 + tính từ nêu hai đối tượng có cùng mức độ ở đúng tính chất được chỉ ra.",
    "一样 không tự có nghĩa tích cực hay tiêu cực; tính từ sau nó phải gọi tên phương diện so sánh.",
    ["新图书馆跟旧图书馆一样安静。",
      "Xīn túshūguǎn gēn jiù túshūguǎn yíyàng ānjìng.",
      "Thư viện mới yên tĩnh như thư viện cũ."],
    ["新图书馆一样旧图书馆安静。", "新图书馆跟旧图书馆一样安静。",
      "Xīn túshūguǎn gēn jiù túshūguǎn yíyàng ānjìng.",
      "Đối tượng chuẩn đi sau 跟; 一样 đứng trước tính từ được so."],
    ["Điền mẫu ngang bằng: 公共汽车____地铁____方便。",
      "公共汽车跟地铁一样方便。",
      "Gōnggòng qìchē gēn dìtiě yíyàng fāngbiàn."],
  ),
  "hsk3-grammar-row-076": draft(
    "A 不比 B + tính từ phủ định việc A hơn B ở phương diện đó; thường có nghĩa A không hơn B, chứ chưa chắc A kém B.",
    "Không tự đổi 不比 thành 没有……那么; A có thể bằng hoặc kém B và cần thêm chứng cứ nếu muốn kết luận chính xác.",
    ["网上服务很方便，但现场服务不比网上服务慢。",
      "Wǎngshàng fúwù hěn fāngbiàn, dàn xiànchǎng fúwù bù bǐ wǎngshàng fúwù màn.",
      "Dịch vụ trực tuyến tiện, nhưng dịch vụ tại chỗ không chậm hơn dịch vụ trực tuyến."],
    ["现场服务不比网上服务慢，所以一定更快。", "现场服务不比网上服务慢，可能一样快。",
      "Xiànchǎng fúwù bù bǐ wǎngshàng fúwù màn, kěnéng yíyàng kuài.",
      "不比慢 chỉ loại trừ 'chậm hơn'; chưa đủ để khẳng định chắc chắn là nhanh hơn."],
    ["Sửa kết luận quá mức: 甲队不比乙队弱，所以____。",
      "甲队不比乙队弱，但还不能说一定更强。",
      "Jiǎ duì bù bǐ Yǐ duì ruò, dàn hái bù néng shuō yídìng gèng qiáng."],
  ),
  "hsk3-grammar-row-077": draft(
    "A 比 B 多/少/早/晚 + động từ + cụm số lượng nêu chính xác chênh lệch về lượng hoặc thời điểm hành động.",
    "Cụm số lượng là độ chênh, không phải tổng của A; động từ và đơn vị phải dùng được cho cả hai đối tượng.",
    ["社区图书馆比去年早开放一个小时，也多接待一百名读者。",
      "Shèqū túshūguǎn bǐ qùnián zǎo kāifàng yí ge xiǎoshí, yě duō jiēdài yìbǎi míng dúzhě.",
      "Thư viện khu phố mở sớm hơn năm ngoái một giờ và đón nhiều hơn một trăm độc giả."],
    ["我比他一个小时早到。", "我比他早到一个小时。",
      "Wǒ bǐ tā zǎo dào yí ge xiǎoshí.",
      "Từ chỉ chênh lệch 早 đứng trước động từ 到; cụm số lượng theo sau động từ."],
    ["Điền chênh lệch: 今天商店____昨天____关门半个小时。",
      "今天商店比昨天晚关门半个小时。",
      "Jīntiān shāngdiàn bǐ zuótiān wǎn guānmén bàn ge xiǎoshí."],
  ),
};

const NARRATIVES = {
  [HSK3_COMPARISON_EVALUATION_LESSON_IDS[0]]: {
    titleHanzi: "山里两天的天气",
    titleVi: "Thời tiết hai ngày trên núi",
    lines: [
      ["第一天上山时，天气越来越冷。",
        "Dì-yī tiān shàngshān shí, tiānqì yuèláiyuè lěng.",
        "Ngày đầu lên núi, thời tiết ngày càng lạnh."],
      ["云越变越黑，看起来快要下雨了。",
        "Yún yuè biàn yuè hēi, kànqǐlai kuàiyào xiàyǔ le.",
        "Mây càng lúc càng đen, có vẻ sắp mưa."],
      ["山顶看上去比山下更远，我们决定先休息。",
        "Shāndǐng kànshangqu bǐ shānxià gèng yuǎn, wǒmen juédìng xiān xiūxi.",
        "Đỉnh núi trông xa hơn từ chân núi nên chúng tôi nghỉ trước."],
      ["下午的天气不怎么样，雨也越下越大。",
        "Xiàwǔ de tiānqì bù zěnmeyàng, yǔ yě yuè xià yuè dà.",
        "Thời tiết buổi chiều không tốt lắm, mưa càng lúc càng lớn."],
      ["第二天比第一天更暖，雨后的山也更清楚。",
        "Dì-èr tiān bǐ dì-yī tiān gèng nuǎn, yǔ hòu de shān yě gèng qīngchu.",
        "Ngày thứ hai ấm hơn ngày đầu và núi sau mưa cũng rõ hơn."],
      ["我们只比较这两天，没有说这里的天气总是这样。",
        "Wǒmen zhǐ bǐjiào zhè liǎng tiān, méiyǒu shuō zhèli de tiānqì zǒngshì zhèyàng.",
        "Chúng tôi chỉ so hai ngày, không nói thời tiết nơi đây luôn như vậy."],
    ],
    eventOrderVi: [
      "Trời lạnh dần khi lên núi",
      "Quan sát dấu hiệu sắp mưa",
      "Mưa lớn khiến nhóm nghỉ",
      "So sánh có giới hạn với ngày thứ hai",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-039",
      "hsk3-grammar-row-040",
      "hsk3-grammar-row-041",
      "hsk3-grammar-row-043",
      "hsk3-grammar-row-049",
    ],
    retellingPromptVi:
      "Kể lại thời tiết hai ngày theo bốn mốc, dùng 越来越, 越……越…… và hai mẫu ấn tượng nhưng không biến quan sát thành quy luật.",
  },
  [HSK3_COMPARISON_EVALUATION_LESSON_IDS[1]]: {
    titleHanzi: "河边环境的变化",
    titleVi: "Sự thay đổi môi trường ven sông",
    lines: [
      ["这个地区以前在保护环境上做得不够。",
        "Zhège dìqū yǐqián zài bǎohù huánjìng shàng zuò de bú gòu.",
        "Trước đây khu vực này làm chưa đủ về bảo vệ môi trường."],
      ["河边夏天热极了，空气质量也不怎么样。",
        "Hébiān xiàtiān rè jí le, kōngqì zhìliàng yě bù zěnmeyàng.",
        "Ven sông mùa hè nóng vô cùng, chất lượng không khí cũng không tốt lắm."],
      ["在治理过程中，社区增加了树木和垃圾箱。",
        "Zài zhìlǐ guòchéng zhōng, shèqū zēngjiā le shùmù hé lājīxiāng.",
        "Trong quá trình cải thiện, khu phố tăng cây xanh và thùng rác."],
      ["一年以后，河边比以前更干净，空气也清新得很。",
        "Yì nián yǐhòu, hébiān bǐ yǐqián gèng gānjìng, kōngqì yě qīngxīn de hěn.",
        "Một năm sau ven sông sạch hơn trước, không khí cũng rất trong lành."],
      ["不过，在下大雨的情况下，这里还会出现垃圾。",
        "Búguò, zài xià dàyǔ de qíngkuàng xià, zhèli hái huì chūxiàn lājī.",
        "Tuy vậy, khi mưa lớn, nơi đây vẫn xuất hiện rác."],
      ["所以评价变化时，既要说进步，也要说明条件和问题。",
        "Suǒyǐ píngjià biànhuà shí, jì yào shuō jìnbù, yě yào shuōmíng tiáojiàn hé wèntí.",
        "Vì vậy khi đánh giá thay đổi phải nói cả tiến bộ lẫn điều kiện và vấn đề."],
    ],
    eventOrderVi: [
      "Nêu hạn chế trước cải thiện",
      "Mô tả biện pháp của khu phố",
      "So sánh kết quả sau một năm",
      "Giữ lại điều kiện và vấn đề còn tồn tại",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-053",
      "hsk3-grammar-row-062",
      "hsk3-grammar-row-063",
      "hsk3-grammar-row-073",
    ],
    retellingPromptVi:
      "Kể lại thay đổi ven sông, dùng 在……上/中/下, một bổ ngữ mức độ và một câu 比 có cùng điều kiện so sánh.",
  },
  [HSK3_COMPARISON_EVALUATION_LESSON_IDS[2]]: {
    titleHanzi: "比较两种社区服务",
    titleVi: "So sánh hai hình thức dịch vụ cộng đồng",
    lines: [
      ["社区今年同时保留了网上服务和现场服务。",
        "Shèqū jīnnián tóngshí bǎoliú le wǎngshàng fúwù hé xiànchǎng fúwù.",
        "Năm nay khu phố cùng duy trì dịch vụ trực tuyến và tại chỗ."],
      ["两种服务的申请办法一样，但帮助方式不完全一样。",
        "Liǎng zhǒng fúwù de shēnqǐng bànfǎ yíyàng, dàn bāngzhù fāngshì bù wánquán yíyàng.",
        "Cách đăng ký của hai dịch vụ giống nhau nhưng cách hỗ trợ không hoàn toàn giống."],
      ["网上服务跟现场服务一样方便，也能节省时间。",
        "Wǎngshàng fúwù gēn xiànchǎng fúwù yíyàng fāngbiàn, yě néng jiéshěng shíjiān.",
        "Dịch vụ trực tuyến tiện như tại chỗ và cũng tiết kiệm thời gian."],
      ["现场服务不比网上服务慢，而且适合需要说明的人。",
        "Xiànchǎng fúwù bù bǐ wǎngshàng fúwù màn, érqiě shìhé xūyào shuōmíng de rén.",
        "Dịch vụ tại chỗ không chậm hơn trực tuyến và phù hợp với người cần giải thích."],
      ["今年服务点比去年早开门半个小时，多接待了两百人。",
        "Jīnnián fúwùdiǎn bǐ qùnián zǎo kāimén bàn ge xiǎoshí, duō jiēdài le liǎngbǎi rén.",
        "Năm nay điểm dịch vụ mở sớm hơn năm ngoái nửa giờ và đón thêm hai trăm người."],
      ["这些数据只说明时间和人数，不能证明一种服务在所有方面更好。",
        "Zhèxiē shùjù zhǐ shuōmíng shíjiān hé rénshù, bù néng zhèngmíng yì zhǒng fúwù zài suǒyǒu fāngmiàn gèng hǎo.",
        "Các số liệu chỉ nói về thời gian và số người, không chứng minh một dịch vụ tốt hơn về mọi mặt."],
    ],
    eventOrderVi: [
      "Giới thiệu hai hình thức dịch vụ",
      "So điểm giống và khác",
      "Đối chiếu tốc độ theo phạm vi",
      "Nêu chênh lệch số liệu và giới hạn kết luận",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-074",
      "hsk3-grammar-row-075",
      "hsk3-grammar-row-076",
      "hsk3-grammar-row-077",
    ],
    retellingPromptVi:
      "So sánh hai dịch vụ theo bốn mốc, dùng hai mẫu 一样, một mẫu 不比 và một chênh lệch số lượng mà không kết luận quá dữ liệu.",
  },
};

export const buildHsk3ComparisonEvaluationNarrationPack = (
  root = process.cwd(),
) => {
  const eventBundle = loadHsk3EventComplementsNarrationPackBundle(root);
  assertValidHsk3EventComplementsNarrationPackBundle(eventBundle);
  return buildHsk3NarrationGrammarModulePack({
    root,
    packId: HSK3_COMPARISON_EVALUATION_PACK_CONFIG.packId,
    trackId: HSK3_COMPARISON_EVALUATION_TRACK_ID,
    lessonIds: HSK3_COMPARISON_EVALUATION_LESSON_IDS,
    grammarDrafts: GRAMMAR_DRAFTS,
    narratives: NARRATIVES,
    prerequisitePackBundles: [eventBundle],
    completedNarrationGrammarModules:
      HSK3_COMPARISON_EVALUATION_PACK_CONFIG.completedNarrationGrammarModules,
    completedNarrationGrammarLessons:
      HSK3_COMPARISON_EVALUATION_PACK_CONFIG.completedNarrationGrammarLessons,
  });
};

export const serializeHsk3ComparisonEvaluationNarrationPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3ComparisonEvaluationNarrationPack(
    buildHsk3ComparisonEvaluationNarrationPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error(
        "Checked HSK3 comparison/evaluation narration pack is stale",
      );
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH,
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
