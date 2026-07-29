import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHsk3NarrationGrammarModulePack } from "./hsk3-narration-grammar-module-builder.mjs";
import {
  assertValidHsk3ModalityTimeNarrationPackBundle,
  loadHsk3ModalityTimeNarrationPackBundle,
} from "../../src/content/hsk3ModalityTimeNarrationPack.mjs";
import {
  HSK3_EVENT_COMPLEMENTS_LESSON_IDS,
  HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH,
  HSK3_EVENT_COMPLEMENTS_PACK_CONFIG,
  HSK3_EVENT_COMPLEMENTS_TRACK_ID,
} from "../../src/content/hsk3EventComplementsNarrationPack.mjs";

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
  "hsk3-grammar-row-005": draft(
    "Động–tân ly hợp như 放假、见面、结婚、洗澡 có thể tách để chèn số lần, thời lượng hoặc định ngữ của tân tố.",
    "Không coi cả cụm như động từ thường khi thêm tân ngữ hay bổ ngữ; nói 见了两次面 chứ không đặt người sau toàn cụm 见面.",
    ["放假前我们见了两次面，讨论班级活动。",
      "Fàngjià qián wǒmen jiàn le liǎng cì miàn, tǎolùn bānjí huódòng.",
      "Trước kỳ nghỉ chúng tôi gặp nhau hai lần để bàn hoạt động lớp."],
    ["昨天我见面了老师。", "昨天我跟老师见了面。",
      "Zuótiān wǒ gēn lǎoshī jiàn le miàn.",
      "Người gặp đi với 跟; trợ từ 了 được đặt giữa động và tân tố ly hợp 见了面."],
    ["Điền số lần: 为了完成作业，我们____。",
      "为了完成作业，我们见了三次面。",
      "Wèile wánchéng zuòyè, wǒmen jiàn le sān cì miàn."],
  ),
  "hsk3-grammar-row-006": draft(
    "Các động–bổ ly hợp 离开、完成、分开 cho phép chèn 得/不 để biểu thị khả năng như 离得开、完不成、分不开.",
    "Khi dùng dạng khả năng, không giữ nguyên toàn từ rồi thêm 得/不 ở cuối; thành phần khả năng nằm giữa động và bổ.",
    ["任务很多，但我们今天完得成，也离得开学校。",
      "Rènwu hěn duō, dàn wǒmen jīntiān wán de chéng, yě lí de kāi xuéxiào.",
      "Nhiệm vụ nhiều nhưng hôm nay chúng tôi hoàn thành được và có thể rời trường."],
    ["今天的工作完成不了。", "今天的工作完不成。",
      "Jīntiān de gōngzuò wán bù chéng.",
      "Dạng khả năng phủ định của 完成 đặt 不 giữa 完 và 成: 完不成."],
    ["Điền khả năng: 两个问题关系太近，暂时____。",
      "两个问题关系太近，暂时分不开。",
      "Liǎng ge wèntí guānxi tài jìn, zànshí fēn bu kāi."],
  ),
  "hsk3-grammar-row-027": draft(
    "把 dẫn đối tượng chịu xử lý trước động từ và kết quả; 被 đưa đối tượng chịu tác động lên làm chủ ngữ rồi có thể nêu tác nhân.",
    "Hai cấu trúc đổi góc nhìn chứ không tự đổi thời; động từ thường cần thành phần kết quả, hướng, số lượng hoặc trạng thái rõ.",
    ["组长把计划改好了，旧文件被老师拿走了。",
      "Zǔzhǎng bǎ jìhuà gǎihǎo le, jiù wénjiàn bèi lǎoshī názǒu le.",
      "Trưởng nhóm sửa xong kế hoạch; tài liệu cũ bị thầy mang đi."],
    ["我把计划修改。", "我把计划修改好了。",
      "Wǒ bǎ jìhuà xiūgǎi hǎo le.",
      "Câu 把 cần nêu kết quả xử lý, ở đây dùng 修改好了."],
    ["Đổi góc nhìn: 老师拿走了旧文件。→ ____。",
      "旧文件被老师拿走了。",
      "Jiù wénjiàn bèi lǎoshī názǒu le."],
  ),
  "hsk3-grammar-row-033": draft(
    "Cụm động–bổ nối động từ với thành phần cho biết kết quả, hướng, mức độ hoặc khả năng, làm sự kiện trong tường thuật rõ đích hơn.",
    "Không tách bổ ngữ khỏi động từ bằng tân ngữ sai vị trí; trật tự cụ thể phụ thuộc loại bổ ngữ và cấu trúc có 把 hay không.",
    ["大家终于听懂了要求，也写完了第一部分。",
      "Dàjiā zhōngyú tīngdǒng le yāoqiú, yě xiěwán le dì-yī bùfen.",
      "Cuối cùng mọi người hiểu yêu cầu và viết xong phần đầu."],
    ["我听要求懂了。", "我听懂要求了。",
      "Wǒ tīngdǒng yāoqiú le.",
      "Bổ ngữ kết quả 懂 đứng ngay sau động từ 听 trước tân ngữ 要求."],
    ["Điền kết quả: 说明很清楚，大家都____了。",
      "说明很清楚，大家都听懂了。",
      "Shuōmíng hěn qīngchu, dàjiā dōu tīngdǒng le."],
  ),
  "hsk3-grammar-row-057": draft(
    "Bổ ngữ kết quả 到、住、走、上 biểu thị đạt được, giữ lại, loại khỏi vị trí hoặc đóng/gắn hoàn tất sau động từ.",
    "Chọn bổ ngữ theo kết quả thực tế: 听到 là nghe thấy, 记住 là nhớ được, 拿走 là mang đi, 关上 là đóng lại.",
    ["我听到铃声以后记住了时间，关上电脑就离开。",
      "Wǒ tīngdào língshēng yǐhòu jìzhù le shíjiān, guānshàng diànnǎo jiù líkāi.",
      "Sau khi nghe chuông tôi nhớ giờ, đóng máy tính rồi rời đi."],
    ["请把这个名字记到。", "请把这个名字记住。",
      "Qǐng bǎ zhège míngzi jìzhù.",
      "Mục tiêu là giữ tên trong trí nhớ nên dùng 记住, không dùng 记到."],
    ["Điền kết quả: 离开教室以前，请把窗户____。",
      "离开教室以前，请把窗户关上。",
      "Líkāi jiàoshì yǐqián, qǐng bǎ chuānghu guānshàng."],
  ),
  "hsk3-grammar-row-058": draft(
    "Bổ ngữ hướng 出、起、下 có nghĩa mở rộng thành kết quả: 看出 nhận ra, 想起 nhớ ra, 写下 ghi lại.",
    "Không hiểu máy móc là chuyển động ra/lên/xuống; cần học nghĩa kết quả của từng tổ hợp động–bổ trong ngữ cảnh.",
    ["她看出了问题，想起老师的话，就把原因写了下来。",
      "Tā kànchū le wèntí, xiǎngqǐ lǎoshī de huà, jiù bǎ yuányīn xiě le xiàlai.",
      "Cô nhận ra vấn đề, nhớ lời thầy rồi ghi nguyên nhân lại."],
    ["我想出了昨天的事。", "我想起了昨天的事。",
      "Wǒ xiǎngqǐ le zuótiān de shì.",
      "Nhớ lại một việc đã có dùng 想起; 想出 thường là nghĩ ra giải pháp mới."],
    ["Điền kết quả: 请把讨论中的重点____。",
      "请把讨论中的重点记下来。",
      "Qǐng bǎ tǎolùn zhōng de zhòngdiǎn jì xiàlai."],
  ),
  "hsk3-grammar-row-059": draft(
    "Động từ+上/起来 có thể chỉ hành động bắt đầu: 唱起来 là bắt đầu hát, 爱上 là bắt đầu yêu thích.",
    "Không phải mọi động từ đều ghép tự do; 起来 thường nhấn sự khởi phát có thể quan sát, 上 thường tạo tổ hợp từ vựng cụ thể.",
    ["找到原因以后，大家又讨论起来，也喜欢上了这个项目。",
      "Zhǎodào yuányīn yǐhòu, dàjiā yòu tǎolùn qǐlai, yě xǐhuanshàng le zhège xiàngmù.",
      "Sau khi tìm ra nguyên nhân, mọi người bắt đầu bàn lại và cũng dần thích dự án."],
    ["大家起来讨论了。", "大家讨论起来了。",
      "Dàjiā tǎolùn qǐlai le.",
      "Bắt đầu hành động dùng động từ+起来, không đặt 起来 trước động từ."],
    ["Điền sự khởi phát: 听到音乐，孩子们都跳____了。",
      "听到音乐，孩子们都跳起来了。",
      "Tīngdào yīnyuè, háizimen dōu tiào qǐlai le."],
  ),
  "hsk3-grammar-row-060": draft(
    "Động từ+下去/下来 có thể diễn đạt hành động tiếp tục hoặc được duy trì đến hiện tại, như 说下去 và 坚持下来.",
    "下去 thường nhìn về sự tiếp diễn phía trước; 下来 thường nhìn lại quá trình đã duy trì thành công.",
    ["虽然任务很难，大家还是做了下去，最后坚持下来了。",
      "Suīrán rènwu hěn nán, dàjiā háishi zuò le xiàqu, zuìhòu jiānchí xiàlai le.",
      "Dù nhiệm vụ khó, mọi người vẫn làm tiếp và cuối cùng kiên trì được."],
    ["请继续说起来。", "请继续说下去。",
      "Qǐng jìxù shuō xiàqu.",
      "Tiếp tục nói về phía trước dùng 说下去; 起来 thiên về bắt đầu nói."],
    ["Điền sự duy trì: 这个习惯很好，希望你能坚持____。",
      "这个习惯很好，希望你能坚持下去。",
      "Zhège xíguàn hěn hǎo, xīwàng nǐ néng jiānchí xiàqu."],
  ),
  "hsk3-grammar-row-061": draft(
    "Bổ ngữ khả năng động từ+得/不+động từ hoặc tính từ nêu hành động có thể đạt kết quả hay mức độ trong điều kiện hiện tại.",
    "Khác với 能+động từ, cấu trúc này đặt 得/不 giữa động và bổ, như 听得懂、写不完.",
    ["声音太小，我听不清；字很大，我看得见。",
      "Shēngyīn tài xiǎo, wǒ tīng bu qīng; zì hěn dà, wǒ kàn de jiàn.",
      "Âm thanh quá nhỏ tôi nghe không rõ; chữ lớn nên tôi nhìn thấy được."],
    ["我听懂不了他说的话。", "我听不懂他说的话。",
      "Wǒ tīngbudǒng tā shuō de huà.",
      "Phủ định khả năng dùng 听不懂, không dùng dạng kết quả+不了 trong bài này."],
    ["Điền khả năng: 今天任务太多，我们可能____。",
      "今天任务太多，我们可能做不完。",
      "Jīntiān rènwu tài duō, wǒmen kěnéng zuò bu wán."],
  ),
  "hsk3-grammar-row-067": draft(
    "Câu 把 với động từ+在/到+địa điểm nêu việc chuyển hoặc đặt một đối tượng xác định tới vị trí kết quả.",
    "Tân ngữ sau 把 phải xác định và động từ cần chỉ rõ nơi đến; không để câu kết thúc ngay sau động từ chung chung.",
    ["组长把新报告放在老师的桌子上。",
      "Zǔzhǎng bǎ xīn bàogào fàng zài lǎoshī de zhuōzi shàng.",
      "Trưởng nhóm đặt báo cáo mới lên bàn giáo viên."],
    ["组长把报告在桌子上放。", "组长把报告放在桌子上。",
      "Zǔzhǎng bǎ bàogào fàng zài zhuōzi shàng.",
      "Sau tân ngữ của 把 là động từ 放 rồi mới đến 在+địa điểm."],
    ["Điền vị trí kết quả: 请把椅子____窗户旁边。",
      "请把椅子搬到窗户旁边。",
      "Qǐng bǎ yǐzi bān dào chuānghu pángbiān."],
  ),
  "hsk3-grammar-row-068": draft(
    "Câu 把 có hai tân ngữ dùng động từ chuyển giao: chủ thể 把 vật thể động từ（给）người nhận.",
    "Cần phân biệt vật được chuyển sau 把 và người nhận sau động từ; không đảo hai vai nếu không đổi nghĩa.",
    ["小林把修改后的文件交给了老师。",
      "Xiǎo Lín bǎ xiūgǎi hòu de wénjiàn jiāo gěi le lǎoshī.",
      "Tiểu Lâm giao tài liệu đã sửa cho giáo viên."],
    ["小林把老师交给了文件。", "小林把文件交给了老师。",
      "Xiǎo Lín bǎ wénjiàn jiāo gěi le lǎoshī.",
      "文件 là vật chịu chuyển giao nên đứng sau 把; 老师 là người nhận."],
    ["Điền chuyển giao: 我____钥匙____了工作人员。",
      "我把钥匙交给了工作人员。",
      "Wǒ bǎ yàoshi jiāo gěi le gōngzuòrényuán."],
  ),
  "hsk3-grammar-row-069": draft(
    "Câu 把 với bổ ngữ kết quả, hướng hoặc trạng thái nhấn mạnh đối tượng đã được xử lý đến một kết quả cụ thể.",
    "Động từ không đứng trơ; cần kết quả như 写清楚、拿回来、准备好 để hoàn chỉnh thông tin xử lý.",
    ["我们把错误改清楚了，也把旧资料拿回来了。",
      "Wǒmen bǎ cuòwù gǎi qīngchu le, yě bǎ jiù zīliào ná huílai le.",
      "Chúng tôi sửa lỗi cho rõ và cũng mang tài liệu cũ về."],
    ["我把工作完成。", "我把工作完成了。",
      "Wǒ bǎ gōngzuò wánchéng le.",
      "Sự xử lý đã hoàn tất cần dấu hiệu kết quả/hoàn thành 了 sau 完成."],
    ["Điền kết quả: 大家终于____教室____干净了。",
      "大家终于把教室打扫干净了。",
      "Dàjiā zhōngyú bǎ jiàoshì dǎsǎo gānjìng le."],
  ),
  "hsk3-grammar-row-070": draft(
    "Câu bị động có tác nhân dùng chủ ngữ chịu tác động+被+tác nhân+động từ+thành phần khác để nêu sự việc từ góc nhìn kết quả.",
    "被 thường đi với tác động đã xảy ra và cần động từ đủ thông tin; không đặt đối tượng chịu tác động lại sau động từ.",
    ["我的第一份报告被经理改了三次。",
      "Wǒ de dì-yī fèn bàogào bèi jīnglǐ gǎi le sān cì.",
      "Báo cáo đầu tiên của tôi bị quản lý sửa ba lần."],
    ["我被经理报告改了。", "我的报告被经理改了。",
      "Wǒ de bàogào bèi jīnglǐ gǎi le.",
      "报告 là đối tượng chịu tác động nên làm chủ ngữ trước 被."],
    ["Đổi sang bị động: 客户取消了会议。→ ____。",
      "会议被客户取消了。",
      "Huìyì bèi kèhù qǔxiāo le."],
  ),
  "hsk3-grammar-row-071": draft(
    "Câu bị động có thể lược tác nhân khi không biết, không quan trọng hoặc đã rõ, theo mẫu chủ ngữ+被+động từ+thành phần khác.",
    "Dù lược tác nhân, động từ vẫn cần kết quả hoặc thông tin hoàn chỉnh; 被 không thể đứng ngay trước một vị ngữ thiếu.",
    ["办公室的门被关上了，电脑也被拿走了。",
      "Bàngōngshì de mén bèi guānshàng le, diànnǎo yě bèi názǒu le.",
      "Cửa văn phòng đã bị đóng, máy tính cũng bị mang đi."],
    ["电脑被拿。", "电脑被拿走了。",
      "Diànnǎo bèi názǒu le.",
      "Khi lược tác nhân, bổ ngữ kết quả/hướng 走 và 了 vẫn làm sự kiện hoàn chỉnh."],
    ["Điền bị động không tác nhân: 昨天的文件____删掉了。",
      "昨天的文件被删掉了。",
      "Zuótiān de wénjiàn bèi shāndiào le."],
  ),
  "hsk3-grammar-row-072": draft(
    "Mẫu động từ1+着+động từ2 diễn đạt tư thế hoặc hành động thứ nhất đi kèm khi hành động chính thứ hai diễn ra.",
    "Động từ có 着 thường là nền đồng thời chứ không phải hai sự kiện nối tiếp; nếu có thứ tự trước–sau cần dùng liên kết khác.",
    ["经理拿着文件走进会议室，笑着向大家问好。",
      "Jīnglǐ názhe wénjiàn zǒujìn huìyìshì, xiàozhe xiàng dàjiā wènhǎo.",
      "Quản lý cầm tài liệu đi vào phòng họp và mỉm cười chào mọi người."],
    ["经理拿文件着走进来。", "经理拿着文件走进来。",
      "Jīnglǐ názhe wénjiàn zǒujìnlai.",
      "着 đứng sau động từ nền 拿 và trước tân ngữ 文件."],
    ["Điền hành động kèm: 她____雨伞走出了办公室。",
      "她拿着雨伞走出了办公室。",
      "Tā názhe yǔsǎn zǒuchū le bàngōngshì."],
  ),
  "hsk3-grammar-row-078": draft(
    "Câu tồn hiện chỉ xuất hiện đặt nơi chốn trước, rồi động từ+kết quả/hướng+了+số lượng+người/vật mới xuất hiện.",
    "Danh ngữ mới thường không xác định và đứng sau động từ; không mở câu bằng đối tượng mới như câu chủ–vị thông thường.",
    ["门口走进来了一位新客户，大家马上站起来。",
      "Ménkǒu zǒujìnlai le yí wèi xīn kèhù, dàjiā mǎshàng zhàn qǐlai.",
      "Ở cửa có một khách hàng mới bước vào, mọi người lập tức đứng lên."],
    ["一位客户门口走进来了。", "门口走进来了一位客户。",
      "Ménkǒu zǒujìnlai le yí wèi kèhù.",
      "Câu tồn hiện đặt địa điểm 门口 trước rồi mới giới thiệu khách mới sau động từ."],
    ["Điền sự xuất hiện: 教室里____两名新同学。",
      "教室里走进来了两名新同学。",
      "Jiàoshì lǐ zǒujìnlai le liǎng míng xīn tóngxué."],
  ),
  "hsk3-grammar-row-079": draft(
    "Câu tồn hiện chỉ biến mất đặt nơi chốn trước, rồi động từ+kết quả+了+số lượng+người/vật đã rời hoặc không còn.",
    "Trọng tâm là thay đổi số lượng tại nơi đó, không phải kể hành động chủ ý của một chủ ngữ xác định.",
    ["项目结束后，公司里离开了两名实习生。",
      "Xiàngmù jiéshù hòu, gōngsī lǐ líkāi le liǎng míng shíxíshēng.",
      "Sau khi dự án kết thúc, công ty có hai thực tập sinh rời đi."],
    ["两名实习生公司里离开了。", "公司里离开了两名实习生。",
      "Gōngsī lǐ líkāi le liǎng míng shíxíshēng.",
      "Để nhấn sự thay đổi tại công ty, địa điểm đứng đầu và danh ngữ số lượng đứng sau."],
    ["Điền sự biến mất: 下班以后，办公室里____三个人。",
      "下班以后，办公室里走了三个人。",
      "Xiàbān yǐhòu, bàngōngshì lǐ zǒu le sān ge rén."],
  ),
  "hsk3-grammar-row-081": draft(
    "Câu lặp động từ có dạng chủ ngữ+động từ+tân ngữ+động từ+bổ ngữ, dùng lần lặp thứ hai để gắn mức độ hoặc thời lượng.",
    "Không đặt bổ ngữ trực tiếp sau tân ngữ mà thiếu động từ lặp; nói 工作做得很认真, không nói 工作很认真 trong cấu trúc này.",
    ["她做工作做得很认真，也学汉语学了两年。",
      "Tā zuò gōngzuò zuò de hěn rènzhēn, yě xué Hànyǔ xué le liǎng nián.",
      "Cô làm việc rất nghiêm túc và học tiếng Trung được hai năm."],
    ["他写报告很快。", "他写报告写得很快。",
      "Tā xiě bàogào xiě de hěn kuài.",
      "Khi gắn bổ ngữ mức độ với cụm có tân ngữ, lặp động từ 写 trước 得很快."],
    ["Điền mức độ: 小林说汉语____很流利。",
      "小林说汉语说得很流利。",
      "Xiǎo Lín shuō Hànyǔ shuō de hěn liúlì."],
  ),
};

const NARRATIVES = {
  [HSK3_EVENT_COMPLEMENTS_LESSON_IDS[0]]: {
    titleHanzi: "放假前完成班级项目",
    titleVi: "Hoàn thành dự án lớp trước kỳ nghỉ",
    lines: [
      ["放假前我们见了两次面，想把班级项目完成。",
        "Fàngjià qián wǒmen jiàn le liǎng cì miàn, xiǎng bǎ bānjí xiàngmù wánchéng.",
        "Trước kỳ nghỉ chúng tôi gặp hai lần, muốn hoàn thành dự án lớp."],
      ["第一次大家没听懂要求，老师又说明了一遍。",
        "Dì-yī cì dàjiā méi tīngdǒng yāoqiú, lǎoshī yòu shuōmíng le yí biàn.",
        "Lần đầu mọi người chưa hiểu yêu cầu nên thầy giải thích lại."],
      ["组长看出了问题，想起上次的办法，把重点记了下来。",
        "Zǔzhǎng kànchū le wèntí, xiǎngqǐ shàng cì de bànfǎ, bǎ zhòngdiǎn jì le xiàlai.",
        "Trưởng nhóm nhận ra vấn đề, nhớ cách lần trước và ghi lại trọng điểm."],
      ["我们终于听懂了，也把第一部分写完了。",
        "Wǒmen zhōngyú tīngdǒng le, yě bǎ dì-yī bùfen xiěwán le.",
        "Cuối cùng chúng tôi hiểu và viết xong phần đầu."],
      ["旧文件被老师拿走，新报告被放在桌子上。",
        "Jiù wénjiàn bèi lǎoshī názǒu, xīn bàogào bèi fàng zài zhuōzi shàng.",
        "Tài liệu cũ được thầy mang đi, báo cáo mới được đặt trên bàn."],
      ["离开教室以前，我们关上电脑，记住了交作业的时间。",
        "Líkāi jiàoshì yǐqián, wǒmen guānshàng diànnǎo, jìzhù le jiāo zuòyè de shíjiān.",
        "Trước khi rời lớp, chúng tôi đóng máy và nhớ thời gian nộp bài."],
    ],
    eventOrderVi: [
      "Gặp nhau trước kỳ nghỉ",
      "Nhận ra chưa hiểu yêu cầu",
      "Ghi trọng điểm và hoàn thành phần đầu",
      "Sắp tài liệu rồi rời lớp",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-005",
      "hsk3-grammar-row-027",
      "hsk3-grammar-row-033",
      "hsk3-grammar-row-057",
      "hsk3-grammar-row-058",
    ],
    retellingPromptVi:
      "Kể lại dự án theo bốn mốc, dùng một động từ ly hợp, một câu 把/被 và ít nhất hai bổ ngữ kết quả.",
  },
  [HSK3_EVENT_COMPLEMENTS_LESSON_IDS[1]]: {
    titleHanzi: "找回一份重要报告",
    titleVi: "Tìm lại một báo cáo quan trọng",
    lines: [
      ["发现报告不见以后，大家马上讨论起来。",
        "Fāxiàn bàogào bú jiàn yǐhòu, dàjiā mǎshàng tǎolùn qǐlai.",
        "Sau khi phát hiện báo cáo biến mất, mọi người lập tức bắt đầu bàn."],
      ["声音太小，后面的同学听不清，但讨论还是继续下去。",
        "Shēngyīn tài xiǎo, hòumian de tóngxué tīng bu qīng, dàn tǎolùn háishi jìxù xiàqu.",
        "Âm thanh nhỏ, bạn phía sau nghe không rõ nhưng thảo luận vẫn tiếp tục."],
      ["小林把旧文件放在老师桌上，又把钥匙交给工作人员。",
        "Xiǎo Lín bǎ jiù wénjiàn fàng zài lǎoshī zhuō shàng, yòu bǎ yàoshi jiāo gěi gōngzuòrényuán.",
        "Tiểu Lâm đặt tài liệu cũ lên bàn thầy rồi giao chìa khóa cho nhân viên."],
      ["工作人员把门打开，大家终于把报告找回来了。",
        "Gōngzuòrényuán bǎ mén dǎkāi, dàjiā zhōngyú bǎ bàogào zhǎo huílai le.",
        "Nhân viên mở cửa và mọi người cuối cùng tìm lại được báo cáo."],
      ["组长把经过写清楚，也把责任分给了每个人。",
        "Zǔzhǎng bǎ jīngguò xiě qīngchu, yě bǎ zérèn fēn gěi le měi ge rén.",
        "Trưởng nhóm viết rõ diễn biến và chia trách nhiệm cho từng người."],
      ["经历这件事以后，大家坚持把检查步骤做了下去。",
        "Jīnglì zhè jiàn shì yǐhòu, dàjiā jiānchí bǎ jiǎnchá bùzhòu zuò le xiàqu.",
        "Sau sự việc, mọi người kiên trì tiếp tục các bước kiểm tra."],
    ],
    eventOrderVi: [
      "Phát hiện báo cáo mất và bắt đầu bàn",
      "Kiểm tra tài liệu, bàn và chìa khóa",
      "Mở cửa rồi tìm lại báo cáo",
      "Ghi diễn biến và duy trì quy trình kiểm tra",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-059",
      "hsk3-grammar-row-060",
      "hsk3-grammar-row-061",
      "hsk3-grammar-row-067",
      "hsk3-grammar-row-068",
      "hsk3-grammar-row-069",
    ],
    retellingPromptVi:
      "Kể lại việc tìm báo cáo, dùng bổ ngữ bắt đầu–tiếp tục–khả năng và ba kết quả xử lý trong câu 把.",
  },
  [HSK3_EVENT_COMPLEMENTS_LESSON_IDS[2]]: {
    titleHanzi: "实习第一周",
    titleVi: "Tuần đầu thực tập",
    lines: [
      ["实习第一天，我的报告被经理改了三次。",
        "Shíxí dì-yī tiān, wǒ de bàogào bèi jīnglǐ gǎi le sān cì.",
        "Ngày thực tập đầu, báo cáo của tôi bị quản lý sửa ba lần."],
      ["办公室的门被关上以后，经理拿着文件走进会议室。",
        "Bàngōngshì de mén bèi guānshàng yǐhòu, jīnglǐ názhe wénjiàn zǒujìn huìyìshì.",
        "Sau khi cửa văn phòng được đóng, quản lý cầm tài liệu vào phòng họp."],
      ["门口走进来了一位新客户，大家都站起来欢迎他。",
        "Ménkǒu zǒujìnlai le yí wèi xīn kèhù, dàjiā dōu zhàn qǐlai huānyíng tā.",
        "Ở cửa có một khách mới bước vào, mọi người đứng lên chào."],
      ["项目结束后，公司里离开了两名实习生。",
        "Xiàngmù jiéshù hòu, gōngsī lǐ líkāi le liǎng míng shíxíshēng.",
        "Sau dự án, công ty có hai thực tập sinh rời đi."],
      ["我做工作做得很认真，写报告也写得越来越快。",
        "Wǒ zuò gōngzuò zuò de hěn rènzhēn, xiě bàogào yě xiě de yuèláiyuè kuài.",
        "Tôi làm việc rất nghiêm túc và viết báo cáo ngày càng nhanh."],
      ["一周后，我被安排负责新任务，也更明白自己的责任。",
        "Yì zhōu hòu, wǒ bèi ānpái fùzé xīn rènwu, yě gèng míngbai zìjǐ de zérèn.",
        "Một tuần sau tôi được xếp phụ trách nhiệm vụ mới và hiểu rõ trách nhiệm hơn."],
    ],
    eventOrderVi: [
      "Báo cáo đầu bị sửa",
      "Quan sát quản lý và khách mới",
      "Thấy nhân sự thay đổi sau dự án",
      "Cải thiện công việc và nhận nhiệm vụ mới",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-070",
      "hsk3-grammar-row-071",
      "hsk3-grammar-row-072",
      "hsk3-grammar-row-078",
      "hsk3-grammar-row-079",
      "hsk3-grammar-row-081",
    ],
    retellingPromptVi:
      "Kể lại tuần thực tập theo bốn mốc, dùng hai loại câu bị động, một câu tồn hiện và một câu lặp động từ.",
  },
};

export const buildHsk3EventComplementsNarrationPack = (
  root = process.cwd(),
) => {
  const modalityBundle = loadHsk3ModalityTimeNarrationPackBundle(root);
  assertValidHsk3ModalityTimeNarrationPackBundle(modalityBundle);
  return buildHsk3NarrationGrammarModulePack({
    root,
    packId: HSK3_EVENT_COMPLEMENTS_PACK_CONFIG.packId,
    trackId: HSK3_EVENT_COMPLEMENTS_TRACK_ID,
    lessonIds: HSK3_EVENT_COMPLEMENTS_LESSON_IDS,
    grammarDrafts: GRAMMAR_DRAFTS,
    narratives: NARRATIVES,
    prerequisitePackBundles: [modalityBundle],
    completedNarrationGrammarModules:
      HSK3_EVENT_COMPLEMENTS_PACK_CONFIG.completedNarrationGrammarModules,
    completedNarrationGrammarLessons:
      HSK3_EVENT_COMPLEMENTS_PACK_CONFIG.completedNarrationGrammarLessons,
  });
};

export const serializeHsk3EventComplementsNarrationPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3EventComplementsNarrationPack(
    buildHsk3EventComplementsNarrationPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK3 event/complements narration pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH,
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
