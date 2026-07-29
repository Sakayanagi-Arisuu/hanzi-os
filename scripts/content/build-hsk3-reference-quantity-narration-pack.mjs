import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHsk3NarrationGrammarModulePack } from "./hsk3-narration-grammar-module-builder.mjs";
import {
  assertValidHsk3CultureTraditionDomainPackBundle,
  loadHsk3CultureTraditionDomainPackBundle,
} from "../../src/content/hsk3CultureTraditionDomainPack.mjs";
import {
  HSK3_REFERENCE_QUANTITY_LESSON_IDS,
  HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH,
  HSK3_REFERENCE_QUANTITY_PACK_CONFIG,
  HSK3_REFERENCE_QUANTITY_TRACK_ID,
} from "../../src/content/hsk3ReferenceQuantityNarrationPack.mjs";

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
  "hsk3-grammar-row-001": draft(
    "Tiền tố 老 đứng trước một số họ, tên gọi hoặc danh xưng để tạo cách gọi quen thuộc, có sắc thái thân tình hay kính trọng tùy quan hệ.",
    "Không gắn 老 tự do trước mọi tên người; cần học theo cách gọi đã được cộng đồng và quan hệ giao tiếp chấp nhận.",
    ["老王昨天带咱们参观了博物馆。",
      "Lǎo Wáng zuótiān dài zánmen cānguān le bówùguǎn.",
      "Hôm qua bác Vương dẫn chúng tôi tham quan bảo tàng."],
    ["老小王昨天来了。", "老王昨天来了。",
      "Lǎo Wáng zuótiān lái le.",
      "Không chồng hai tiền tố xưng gọi 老 và 小 trước cùng một tên trong ngữ cảnh này."],
    ["回忆 người hướng dẫn quen thuộc: ____昨天给我们讲了老街的历史。",
      "老王昨天给我们讲了老街的历史。",
      "Lǎo Wáng zuótiān gěi wǒmen jiǎng le lǎojiē de lìshǐ."],
  ),
  "hsk3-grammar-row-002": draft(
    "Các hậu tố 家, 子 và 员 tạo danh từ với chức năng khác nhau: 家 thường chỉ chuyên gia, 子 tham gia cấu tạo danh từ, 员 chỉ thành viên hoặc người làm nghề.",
    "Không thể đổi ba hậu tố cho nhau chỉ vì đều đứng sau một hình vị; phải kiểm tra nghĩa và từ vựng cố định.",
    ["那位作家和两名工作人员坐在桌子旁边。",
      "Nà wèi zuòjiā hé liǎng míng gōngzuòrényuán zuò zài zhuōzi pángbiān.",
      "Nhà văn ấy và hai nhân viên ngồi cạnh chiếc bàn."],
    ["她是一位音乐的家。", "她是一位音乐家。",
      "Tā shì yí wèi yīnyuèjiā.",
      "音乐家 là danh từ ghép với hậu tố 家; không chèn 的 giữa thành tố và hậu tố."],
    ["Bổ sung danh từ chỉ nghề: 介绍人是一位年轻的____。",
      "介绍人是一位年轻的画家。",
      "Jièshàorén shì yí wèi niánqīng de huàjiā."],
  ),
  "hsk3-grammar-row-003": draft(
    "Danh từ phương vị như 东、南、西、北、北方 và 中间 xác định vùng hay vị trí tương đối, thường đi với 在, 从, 往 hoặc cấu trúc có 的.",
    "Khi mô tả vị trí tương đối cụ thể, cần dùng dạng phương vị tự nhiên như 北边, 西面 hoặc cụm 在……中间 thay vì ghép tùy ý.",
    ["博物馆在银行和书店中间，西边是一座老桥。",
      "Bówùguǎn zài yínháng hé shūdiàn zhōngjiān, xībian shì yí zuò lǎo qiáo.",
      "Bảo tàng ở giữa ngân hàng và hiệu sách, phía tây là một cây cầu cũ."],
    ["商店在路北。", "商店在路的北边。",
      "Shāngdiàn zài lù de běibian.",
      "Vị trí tương đối với con đường cần cụm phương vị hoàn chỉnh 路的北边."],
    ["Điền vị trí: 车站在公园和学校____。",
      "车站在公园和学校中间。",
      "Chēzhàn zài gōngyuán hé xuéxiào zhōngjiān."],
  ),
  "hsk3-grammar-row-007": draft(
    "Đại từ nghi vấn 怎样 hỏi cách thức, trạng thái hoặc phương án; câu trả lời thường mô tả làm như thế nào chứ không chỉ nêu người hay vật.",
    "Không dùng 怎样 thay cho 什么 khi hỏi danh tính sự vật, và phải đặt nó ở vị trí thành phần cách thức hoặc vị ngữ phù hợp.",
    ["我们应该怎样从东门走到展览厅？",
      "Wǒmen yīnggāi zěnyàng cóng dōngmén zǒu dào zhǎnlǎntīng?",
      "Chúng ta nên đi từ cổng đông tới phòng triển lãm như thế nào?"],
    ["你去学校什么？", "你怎样去学校？",
      "Nǐ zěnyàng qù xuéxiào?",
      "Câu đang hỏi cách đến trường nên dùng 怎样, không dùng 什么 ở cuối."],
    ["Hoàn thành câu hỏi cách thức: 第一次见面时，____介绍自己比较合适？",
      "第一次见面时，怎样介绍自己比较合适？",
      "Dì-yī cì jiànmiàn shí, zěnyàng jièshào zìjǐ bǐjiào héshì?"],
  ),
  "hsk3-grammar-row-008": draft(
    "Đại từ nghi vấn có thể mang nghĩa phi nghi vấn: 疑问代词+都 diễn đạt toàn thể, còn dạng lặp như 谁想来谁来 liên kết cùng một tham chiếu.",
    "Cần có cấu trúc đi kèm làm rõ nghĩa toàn thể hoặc tương ứng; một đại từ nghi vấn đứng riêng vẫn thường tạo câu hỏi.",
    ["今天谁来都可以，想看什么就看什么。",
      "Jīntiān shéi lái dōu kěyǐ, xiǎng kàn shénme jiù kàn shénme.",
      "Hôm nay ai đến cũng được, muốn xem gì thì xem nấy."],
    ["谁来谁不可以参加。", "谁来都可以参加。",
      "Shéi lái dōu kěyǐ cānjiā.",
      "Nghĩa toàn thể “ai đến cũng được” cần 都 sau cụm có đại từ nghi vấn."],
    ["Điền nghĩa toàn thể: 这次活动____参加都欢迎。",
      "这次活动谁参加都欢迎。",
      "Zhè cì huódòng shéi cānjiā dōu huānyíng."],
  ),
  "hsk3-grammar-row-009": draft(
    "Đại từ nghi vấn còn có thể chỉ một đối tượng chưa xác định, như 买点儿什么 hoặc 找个人问问, khi người nói không yêu cầu đáp án cụ thể.",
    "Phải dựa vào ngữ cảnh trần thuật và các từ như 想, 可能, 点儿; nếu ngữ điệu và cấu trúc là câu hỏi thì vẫn là nghi vấn thật.",
    ["参观结束后，我想买点儿什么送给朋友。",
      "Cānguān jiéshù hòu, wǒ xiǎng mǎi diǎnr shénme sòng gěi péngyou.",
      "Sau chuyến tham quan, tôi muốn mua thứ gì đó tặng bạn."],
    ["我想买哪本书。", "我想买点儿什么。",
      "Wǒ xiǎng mǎi diǎnr shénme.",
      "Ngữ cảnh chỉ ý định mua một thứ chưa xác định nên dùng 什么 với 点儿, không dùng 哪 như một mệnh đề bỏ dở."],
    ["Điền nghĩa bất định: 天气冷了，咱们找个地方____吧。",
      "天气冷了，咱们找个地方喝点儿什么吧。",
      "Tiānqì lěng le, zánmen zhǎo ge dìfang hē diǎnr shénme ba."],
  ),
  "hsk3-grammar-row-010": draft(
    "别人 chỉ người khác ngoài tham chiếu đang nói, còn 咱们 thường bao gồm cả người nói lẫn người nghe và tạo lời rủ hoặc quyết định chung.",
    "Không dùng 别人 để thay cho “chúng ta”; phạm vi bao gồm người nghe của 咱们 cũng khác với một số cách dùng 我们 theo vùng và ngữ cảnh.",
    ["别人还在排队，咱们先到旁边看看地图吧。",
      "Biérén hái zài páiduì, zánmen xiān dào pángbiān kànkan dìtú ba.",
      "Người khác vẫn đang xếp hàng, chúng ta sang bên cạnh xem bản đồ trước nhé."],
    ["别人一起走吧。", "咱们一起走吧。",
      "Zánmen yìqǐ zǒu ba.",
      "Lời rủ bao gồm người nói và người nghe cần 咱们, không phải 别人."],
    ["Chọn tham chiếu chung: 时间不早了，____回学校吧。",
      "时间不早了，咱们回学校吧。",
      "Shíjiān bù zǎo le, zánmen huí xuéxiào ba."],
  ),
  "hsk3-grammar-row-011": draft(
    "别的 và 其他 đều mở rộng sang người hoặc vật ngoài mục đã nêu; 别的 thường đứng độc lập hoặc trước danh từ, 其他 thường bổ nghĩa cho danh từ số nhiều.",
    "Tránh ghép 其他 trực tiếp với một số từ theo kiểu 其他一个; hãy dùng 另一个 hoặc 别的 tùy nghĩa và số lượng.",
    ["这封信写完了，我还要整理其他材料和别的照片。",
      "Zhè fēng xìn xiěwán le, wǒ hái yào zhěnglǐ qítā cáiliào hé biéde zhàopiàn.",
      "Viết xong lá thư này, tôi còn phải sắp xếp tài liệu khác và những ảnh khác."],
    ["我还想看其他一个。", "我还想看别的。",
      "Wǒ hái xiǎng kàn biéde.",
      "Khi không nêu danh từ và không chỉ rõ một cá thể, 别的 có thể đứng độc lập tự nhiên hơn."],
    ["Điền phạm vi còn lại: 这两页看完以后，再看____内容。",
      "这两页看完以后，再看其他内容。",
      "Zhè liǎng yè kànwán yǐhòu, zài kàn qítā nèiróng."],
  ),
  "hsk3-grammar-row-012": draft(
    "Lượng từ danh từ chuyên dụng như 把、双、张、封、页、辆、节、所、段、句、公斤 phải kết hợp với loại danh từ phù hợp.",
    "Không chọn lượng từ chỉ dựa vào tiếng Việt; cần học tổ hợp cố định, chẳng hạn 一辆车, 一封信, 一页书 và 一所学校.",
    ["我们收到两封信、三张照片和一页旅行计划。",
      "Wǒmen shōudào liǎng fēng xìn, sān zhāng zhàopiàn hé yí yè lǚxíng jìhuà.",
      "Chúng tôi nhận hai lá thư, ba tấm ảnh và một trang kế hoạch du lịch."],
    ["门口停着一张汽车。", "门口停着一辆汽车。",
      "Ménkǒu tíngzhe yí liàng qìchē.",
      "Xe dùng lượng từ 辆; 张 dùng cho vật có bề mặt như giấy, ảnh hoặc bàn."],
    ["Điền lượng từ: 工作人员给了我一____地图和两____票。",
      "工作人员给了我一张地图和两张票。",
      "Gōngzuòrényuán gěi le wǒ yì zhāng dìtú hé liǎng zhāng piào."],
  ),
  "hsk3-grammar-row-013": draft(
    "Danh từ đồ đựng 碗 và 盘 có thể được mượn làm lượng từ, biểu thị một bát hoặc một đĩa chứa món ăn tương ứng.",
    "Lượng từ mượn nhấn mạnh phần chứa thực tế; không thay bằng lượng từ đồ vật khi muốn đếm số phần món ăn.",
    ["大家先吃了一碗汤，又点了两盘饺子。",
      "Dàjiā xiān chī le yì wǎn tāng, yòu diǎn le liǎng pán jiǎozi.",
      "Mọi người ăn một bát canh rồi gọi thêm hai đĩa bánh chẻo."],
    ["请给我一把汤。", "请给我一碗汤。",
      "Qǐng gěi wǒ yì wǎn tāng.",
      "Phần canh đựng trong bát dùng lượng từ mượn 碗, không dùng 把."],
    ["Hoàn thành phần ăn: 服务员端来两____菜和三____米饭。",
      "服务员端来两盘菜和三碗米饭。",
      "Fúwùyuán duānlai liǎng pán cài hé sān wǎn mǐfàn."],
  ),
  "hsk3-grammar-row-014": draft(
    "Động lượng từ 口、回、遍、声 đếm lượt của hành động theo cách khác nhau: một ngụm, một lần sự việc, một lượt trọn vẹn, một tiếng gọi.",
    "Phải chọn theo cấu trúc sự kiện; 遍 nhấn mạnh làm từ đầu đến cuối, còn 回 thường đếm lần trải nghiệm hay sự việc.",
    ["我把通知读了两遍，又大声叫了一声他的名字。",
      "Wǒ bǎ tōngzhī dú le liǎng biàn, yòu dàshēng jiào le yì shēng tā de míngzi.",
      "Tôi đọc thông báo hai lượt rồi gọi to tên anh ấy một tiếng."],
    ["我看了这本书三声。", "我看了这本书三遍。",
      "Wǒ kàn le zhè běn shū sān biàn.",
      "Đọc trọn cuốn sách theo lượt dùng 遍; 声 chỉ âm thanh phát ra."],
    ["Điền số lượt: 为了记清楚，我把路线说了两____。",
      "为了记清楚，我把路线说了两遍。",
      "Wèile jì qīngchu, wǒ bǎ lùxiàn shuō le liǎng biàn."],
  ),
  "hsk3-grammar-row-015": draft(
    "Lượng từ lặp như 个个、张张 tạo nghĩa phân phối “từng… một” hoặc toàn bộ từng đơn vị, thường đi cùng 都 để nhấn mạnh không bỏ sót.",
    "Không bỏ phần lặp nếu muốn nghĩa phân phối; dạng một lượng từ đơn chỉ là thành phần đếm chưa hoàn chỉnh.",
    ["张张照片都有日期，个个学生都能说出来源。",
      "Zhāngzhāng zhàopiàn dōu yǒu rìqī, gègè xuésheng dōu néng shuōchū láiyuán.",
      "Từng tấm ảnh đều có ngày, từng học sinh đều nói được nguồn."],
    ["个学生都写了名字。", "个个学生都写了名字。",
      "Gègè xuésheng dōu xiě le míngzi.",
      "Nghĩa “từng học sinh đều” cần lặp lượng từ 个个."],
    ["Điền nghĩa phân phối: ____礼物都写着客人的名字。",
      "件件礼物都写着客人的名字。",
      "Jiànjiàn lǐwù dōu xiězhe kèrén de míngzi."],
  ),
  "hsk3-grammar-row-017": draft(
    "Các phó từ phạm vi 就、一块儿、一共、只、到处、只是 giới hạn, gom nhóm hoặc bao quát hành động; vị trí của chúng quyết định phạm vi nghĩa.",
    "Tránh xếp nhiều phó từ tùy ý; cần xác định thành phần nào được giới hạn và quan hệ như 一共 chỉ tổng, 只 chỉ giới hạn.",
    ["我们一共只整理了两箱书，其他地方还到处是材料。",
      "Wǒmen yígòng zhǐ zhěnglǐ le liǎng xiāng shū, qítā dìfang hái dàochù shì cáiliào.",
      "Chúng tôi tổng cộng mới sắp xếp hai thùng sách; chỗ khác vẫn đầy tài liệu."],
    ["我们只一共买了两张票。", "我们一共只买了两张票。",
      "Wǒmen yígòng zhǐ mǎi le liǎng zhāng piào.",
      "一共 nêu tổng thể rồi 只 giới hạn số lượng, nên thứ tự tự nhiên là 一共只."],
    ["Hoàn thành phạm vi: 今天____来了十个人，其中____三个人带了照片。",
      "今天一共来了十个人，其中只有三个人带了照片。",
      "Jīntiān yígòng lái le shí ge rén, qízhōng zhǐyǒu sān ge rén dài le zhàopiàn."],
  ),
  "hsk3-grammar-row-032": draft(
    "Cụm đồng vị đặt hai danh ngữ cùng chỉ một người hoặc vật cạnh nhau, thành phần sau thường giải thích rõ thành phần trước mà không cần 是.",
    "Không biến cụm đồng vị thành hai vị ngữ rời; hai danh ngữ phải cùng tham chiếu và cùng đảm nhiệm một chức năng trong câu.",
    ["我的同学小林负责记录每一封信。",
      "Wǒ de tóngxué Xiǎo Lín fùzé jìlù měi yì fēng xìn.",
      "Bạn học của tôi, Tiểu Lâm, phụ trách ghi chép từng lá thư."],
    ["我的朋友是小王他负责拍照。", "我的朋友小王负责拍照。",
      "Wǒ de péngyou Xiǎo Wáng fùzé pāizhào.",
      "我的朋友 và 小王 cùng chỉ một người nên tạo cụm đồng vị, không cần chen 是 rồi thêm chủ ngữ 他."],
    ["Ghép đồng vị: 我们的老师____给大家介绍了计划。",
      "我们的老师李老师给大家介绍了计划。",
      "Wǒmen de lǎoshī Lǐ lǎoshī gěi dàjiā jièshào le jìhuà."],
  ),
  "hsk3-grammar-row-034": draft(
    "Mẫu số từ+lượng từ lặp, như 一天一天 hay 一站一站, diễn đạt tiến trình lặp đều hoặc từng đơn vị nối tiếp nhau.",
    "Hai vế phải lặp cùng tổ hợp số–lượng; chỉ đặt hai cụm số khác nhau cạnh nhau sẽ chuyển sang nghĩa ước lượng hoặc sai cấu trúc.",
    ["我们一站一站地检查路线，终于到了山脚。",
      "Wǒmen yí zhàn yí zhàn de jiǎnchá lùxiàn, zhōngyú dào le shānjiǎo.",
      "Chúng tôi kiểm tra tuyến đường từng trạm một và cuối cùng tới chân núi."],
    ["我们一天两天向前走。", "我们一天一天地向前走。",
      "Wǒmen yì tiān yì tiān de xiàng qián zǒu.",
      "Tiến trình từng ngày cần lặp nguyên cụm 一天一天 và thường nối trạng ngữ bằng 地."],
    ["Điền tiến trình: 队员____地把行李送上车。",
      "队员一箱一箱地把行李送上车。",
      "Duìyuán yì xiāng yì xiāng de bǎ xíngli sòng shàng chē."],
  ),
  "hsk3-grammar-row-035": draft(
    "Cấu trúc bốn âm tiết 不A不B thường diễn đạt trạng thái vừa phải, không nghiêng về hai cực, như 不冷不热 hoặc 不早不晚.",
    "A và B cần tạo cặp đối lập hoặc hai cực có nghĩa; không nối bằng 和 và không chọn hai tính chất không liên quan.",
    ["出发那天不早不晚，天气也不冷不热。",
      "Chūfā nà tiān bù zǎo bù wǎn, tiānqì yě bù lěng bù rè.",
      "Ngày xuất phát không sớm không muộn, thời tiết cũng không lạnh không nóng."],
    ["天气不冷和不热。", "天气不冷不热。",
      "Tiānqì bù lěng bù rè.",
      "Mẫu cố định 不A不B không dùng liên từ 和 giữa hai vế."],
    ["Hoàn thành đánh giá vừa phải: 这条路____，走起来正合适。",
      "这条路不长不短，走起来正合适。",
      "Zhè tiáo lù bù cháng bù duǎn, zǒuqǐlái zhèng héshì."],
  ),
  "hsk3-grammar-row-054": draft(
    "Động từ, cụm động từ, tính từ hoặc cụm tính từ có thể làm chủ ngữ khi toàn bộ hành động hay tính chất được đưa ra làm chủ đề để nhận xét.",
    "Không thêm một chủ ngữ danh từ thừa làm câu có hai trung tâm; hãy xác định rõ cụm hành động nào đang được đánh giá.",
    ["提前检查地图很重要，慢慢走也比较安全。",
      "Tíqián jiǎnchá dìtú hěn zhòngyào, mànmàn zǒu yě bǐjiào ānquán.",
      "Kiểm tra bản đồ trước rất quan trọng, đi chậm cũng tương đối an toàn."],
    ["我喜欢旅行很有意思。", "旅行很有意思。",
      "Lǚxíng hěn yǒuyìsi.",
      "Khi nhận xét bản thân hoạt động du lịch, cụm động từ 旅行 trực tiếp làm chủ ngữ."],
    ["Biến hành động thành chủ đề: ____能帮助大家少走错路。",
      "出发前看地图能帮助大家少走错路。",
      "Chūfā qián kàn dìtú néng bāngzhù dàjiā shǎo zǒucuò lù."],
  ),
  "hsk3-grammar-row-055": draft(
    "Một cụm chủ–vị hoàn chỉnh có thể làm chủ ngữ của câu lớn hơn, còn vị ngữ bên ngoài đưa ra đánh giá về toàn bộ sự việc đó.",
    "Cần có quan hệ tầng bậc rõ; hai mệnh đề đặt cạnh nhau mà không có vị ngữ đánh giá sẽ dễ thành câu ghép thiếu liên kết.",
    ["大家都按时到让我非常放心。",
      "Dàjiā dōu ànshí dào ràng wǒ fēicháng fàngxīn.",
      "Việc mọi người đều đến đúng giờ khiến tôi rất yên tâm."],
    ["他身体好我很放心。", "他身体好是最重要的。",
      "Tā shēntǐ hǎo shì zuì zhòngyào de.",
      "Cụm chủ–vị 他身体好 phải được toàn câu nhận xét bằng vị ngữ như 是最重要的."],
    ["Hoàn thành đánh giá sự việc: ____让老师很满意。",
      "每个小组都完成计划让老师很满意。",
      "Měi ge xiǎozǔ dōu wánchéng jìhuà ràng lǎoshī hěn mǎnyì."],
  ),
  "hsk3-grammar-row-056": draft(
    "Nhiều định ngữ có thể cùng bổ nghĩa cho một danh từ; thứ tự thường đi từ quan hệ sở hữu, chỉ định/số lượng đến đặc điểm miêu tả gần danh từ.",
    "Không xếp định ngữ theo thứ tự dịch từng chữ; cần giữ cụm sở hữu và mệnh đề có 的 ở vị trí tự nhiên trước số lượng, tính chất.",
    ["这是我昨天借的一本很有用的旅行书。",
      "Zhè shì wǒ zuótiān jiè de yì běn hěn yǒuyòng de lǚxíng shū.",
      "Đây là một cuốn sách du lịch rất hữu ích mà hôm qua tôi mượn."],
    ["这是一本新的我昨天买的书。", "这是我昨天买的一本新书。",
      "Zhè shì wǒ zuótiān mǎi de yì běn xīn shū.",
      "Mệnh đề sở hữu có 的 đứng trước cụm số lượng và tính chất gần danh từ."],
    ["Sắp xếp định ngữ: 导游给我看了____照片。",
      "导游给我看了三张去年拍的老桥照片。",
      "Dǎoyóu gěi wǒ kàn le sān zhāng qùnián pāi de lǎo qiáo zhàopiàn."],
  ),
  "hsk3-grammar-row-095": draft(
    "大概 đặt trước số lượng hoặc mệnh đề để biểu thị ước lượng chưa chính xác, giúp người nói nêu khoảng thay vì khẳng định tuyệt đối.",
    "Tránh dùng đồng thời 大概 và 左右 quanh cùng một số khi không cần, vì hai dấu hiệu ước lượng có thể dư thừa.",
    ["从车站到山脚大概有十公里。",
      "Cóng chēzhàn dào shānjiǎo dàgài yǒu shí gōnglǐ.",
      "Từ ga đến chân núi dài khoảng mười ki-lô-mét."],
    ["大概有十个人左右。", "大概有十个人。",
      "Dàgài yǒu shí ge rén.",
      "大概 đã đánh dấu ước lượng nên không cần thêm 左右 trong câu luyện tập này."],
    ["Điền ước lượng: 我们____下午三点到宾馆。",
      "我们大概下午三点到宾馆。",
      "Wǒmen dàgài xiàwǔ sān diǎn dào bīnguǎn."],
  ),
  "hsk3-grammar-row-096": draft(
    "Hai số liền kề như 三四、五六 có thể đứng cùng nhau để biểu thị khoảng ước lượng giữa hai giá trị gần nhau.",
    "Chỉ dùng các số kề nhau theo trật tự tự nhiên; không thêm 和 vì khi đó câu chuyển thành liệt kê hai số.",
    ["前面还有三四站，大概二十分钟就能到。",
      "Qiánmiàn hái yǒu sān sì zhàn, dàgài èrshí fēnzhōng jiù néng dào.",
      "Phía trước còn khoảng ba bốn trạm, chừng hai mươi phút là tới."],
    ["车上有三和四个人。", "车上有三四个人。",
      "Chē shàng yǒu sān sì ge rén.",
      "Ước lượng bằng hai số liền kề không dùng 和 ở giữa."],
    ["Điền khoảng số: 门口停着____辆旅游车。",
      "门口停着五六辆旅游车。",
      "Ménkǒu tíngzhe wǔ liù liàng lǚyóuchē."],
  ),
};

const NARRATIVES = {
  [HSK3_REFERENCE_QUANTITY_LESSON_IDS[0]]: {
    titleHanzi: "第一次参观城市博物馆",
    titleVi: "Lần đầu tham quan bảo tàng thành phố",
    lines: [
      ["昨天老王带咱们去城市博物馆，别人还在门口排队。",
        "Zuótiān Lǎo Wáng dài zánmen qù chéngshì bówùguǎn, biérén hái zài ménkǒu páiduì.",
        "Hôm qua bác Vương dẫn chúng tôi tới bảo tàng thành phố, người khác còn đang xếp hàng ở cửa."],
      ["博物馆在银行和书店中间，西边有一座老桥。",
        "Bówùguǎn zài yínháng hé shūdiàn zhōngjiān, xībian yǒu yí zuò lǎo qiáo.",
        "Bảo tàng ở giữa ngân hàng và hiệu sách, phía tây có một cây cầu cũ."],
      ["一位作家和两名工作人员先告诉我们应该怎样参观。",
        "Yí wèi zuòjiā hé liǎng míng gōngzuòrényuán xiān gàosu wǒmen yīnggāi zěnyàng cānguān.",
        "Một nhà văn và hai nhân viên trước tiên nói chúng tôi nên tham quan thế nào."],
      ["展厅里谁问问题都可以，想看什么就看什么。",
        "Zhǎntīng lǐ shéi wèn wèntí dōu kěyǐ, xiǎng kàn shénme jiù kàn shénme.",
        "Trong phòng trưng bày ai hỏi cũng được, muốn xem gì thì xem nấy."],
      ["参观结束后，我想买点儿什么送给朋友。",
        "Cānguān jiéshù hòu, wǒ xiǎng mǎi diǎnr shénme sòng gěi péngyou.",
        "Sau tham quan tôi muốn mua thứ gì đó tặng bạn."],
      ["老王说时间不早了，咱们先回学校，下次再来。",
        "Lǎo Wáng shuō shíjiān bù zǎo le, zánmen xiān huí xuéxiào, xià cì zài lái.",
        "Bác Vương nói đã muộn, chúng ta về trường trước và lần sau quay lại."],
    ],
    eventOrderVi: [
      "Đến bảo tàng và xác định vị trí",
      "Nghe người hướng dẫn nêu cách tham quan",
      "Tự do hỏi và xem triển lãm",
      "Chọn về trường và hẹn quay lại",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-001",
      "hsk3-grammar-row-003",
      "hsk3-grammar-row-008",
      "hsk3-grammar-row-010",
    ],
    retellingPromptVi:
      "Kể lại chuyến tham quan theo bốn mốc, dùng ít nhất ba mẫu quy chiếu đã chỉ định rồi tự đối chiếu với mẫu.",
  },
  [HSK3_REFERENCE_QUANTITY_LESSON_IDS[1]]: {
    titleHanzi: "整理旅行材料",
    titleVi: "Sắp xếp tài liệu chuyến đi",
    lines: [
      ["我的同学小林收到两封信、三张照片和一页旅行计划。",
        "Wǒ de tóngxué Xiǎo Lín shōudào liǎng fēng xìn, sān zhāng zhàopiàn hé yí yè lǚxíng jìhuà.",
        "Bạn học Tiểu Lâm nhận hai lá thư, ba tấm ảnh và một trang kế hoạch chuyến đi."],
      ["他先把通知读了两遍，又叫了一声其他同学的名字。",
        "Tā xiān bǎ tōngzhī dú le liǎng biàn, yòu jiào le yì shēng qítā tóngxué de míngzi.",
        "Cậu đọc thông báo hai lượt rồi gọi tên những bạn khác một tiếng."],
      ["大家一块儿整理材料，一共只用了两个箱子。",
        "Dàjiā yíkuàir zhěnglǐ cáiliào, yígòng zhǐ yòng le liǎng ge xiāngzi.",
        "Mọi người cùng sắp xếp tài liệu và tổng cộng chỉ dùng hai thùng."],
      ["张张照片都有日期，封封信都写着不同的地址。",
        "Zhāngzhāng zhàopiàn dōu yǒu rìqī, fēngfēng xìn dōu xiězhe bùtóng de dìzhǐ.",
        "Từng tấm ảnh đều có ngày, từng lá thư đều ghi địa chỉ khác nhau."],
      ["中午他们吃了一碗汤和两盘饺子，再检查别的内容。",
        "Zhōngwǔ tāmen chī le yì wǎn tāng hé liǎng pán jiǎozi, zài jiǎnchá biéde nèiróng.",
        "Buổi trưa họ ăn một bát canh, hai đĩa bánh chẻo rồi kiểm tra nội dung khác."],
      ["最后，小林把到处找到的材料按地点放好。",
        "Zuìhòu, Xiǎo Lín bǎ dàochù zhǎodào de cáiliào àn dìdiǎn fànghǎo.",
        "Cuối cùng Tiểu Lâm xếp gọn tài liệu tìm thấy khắp nơi theo địa điểm."],
    ],
    eventOrderVi: [
      "Nhận thư, ảnh và kế hoạch",
      "Đọc thông báo rồi gọi các bạn",
      "Cùng phân loại từng tài liệu",
      "Xếp tài liệu theo địa điểm",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-012",
      "hsk3-grammar-row-014",
      "hsk3-grammar-row-015",
      "hsk3-grammar-row-032",
    ],
    retellingPromptVi:
      "Kể lại quá trình sắp xếp theo đúng bốn bước, dùng lượng từ danh từ, động lượng từ và ít nhất một cấu trúc phân phối.",
  },
  [HSK3_REFERENCE_QUANTITY_LESSON_IDS[2]]: {
    titleHanzi: "一站一站去山里",
    titleVi: "Đi từng trạm vào vùng núi",
    lines: [
      ["出发前看地图很重要，我们大概早上八点离开学校。",
        "Chūfā qián kàn dìtú hěn zhòngyào, wǒmen dàgài zǎoshang bā diǎn líkāi xuéxiào.",
        "Xem bản đồ trước khi đi rất quan trọng; chúng tôi rời trường khoảng tám giờ sáng."],
      ["门口停着五六辆车，我们坐上老师昨天选的一辆小车。",
        "Ménkǒu tíngzhe wǔ liù liàng chē, wǒmen zuòshàng lǎoshī zuótiān xuǎn de yí liàng xiǎochē.",
        "Ở cửa có khoảng năm sáu xe; chúng tôi lên chiếc xe nhỏ thầy chọn hôm qua."],
      ["路上不早不晚，天气也不冷不热，大家都很轻松。",
        "Lùshang bù zǎo bù wǎn, tiānqì yě bù lěng bù rè, dàjiā dōu hěn qīngsōng.",
        "Trên đường không sớm không muộn, thời tiết không lạnh không nóng nên mọi người rất thoải mái."],
      ["我们一站一站地检查路线，前面还有三四站。",
        "Wǒmen yí zhàn yí zhàn de jiǎnchá lùxiàn, qiánmiàn hái yǒu sān sì zhàn.",
        "Chúng tôi kiểm tra tuyến từng trạm một, phía trước còn khoảng ba bốn trạm."],
      ["每个人都按时到让老师很放心，慢慢走也比较安全。",
        "Měi ge rén dōu ànshí dào ràng lǎoshī hěn fàngxīn, mànmàn zǒu yě bǐjiào ānquán.",
        "Việc ai cũng đến đúng giờ khiến thầy yên tâm; đi chậm cũng tương đối an toàn."],
      ["中午我们终于看见了那座有两百年历史的老桥。",
        "Zhōngwǔ wǒmen zhōngyú kànjiàn le nà zuò yǒu liǎngbǎi nián lìshǐ de lǎo qiáo.",
        "Buổi trưa chúng tôi cuối cùng thấy cây cầu cổ có lịch sử hai trăm năm."],
    ],
    eventOrderVi: [
      "Xem bản đồ và rời trường",
      "Chọn xe trong số xe ở cửa",
      "Kiểm tra tuyến từng trạm",
      "Đến cây cầu cổ an toàn",
    ],
    targetGrammarRowIds: [
      "hsk3-grammar-row-034",
      "hsk3-grammar-row-035",
      "hsk3-grammar-row-054",
      "hsk3-grammar-row-095",
      "hsk3-grammar-row-096",
    ],
    retellingPromptVi:
      "Kể lại hành trình theo bốn mốc, dùng mẫu tiến trình lặp, một cách ước lượng và một cụm hành động hoặc chủ–vị làm chủ ngữ.",
  },
};

export const buildHsk3ReferenceQuantityNarrationPack = (
  root = process.cwd(),
) => {
  const paragraphBundle = loadHsk3CultureTraditionDomainPackBundle(root);
  assertValidHsk3CultureTraditionDomainPackBundle(paragraphBundle);
  return buildHsk3NarrationGrammarModulePack({
    root,
    packId: HSK3_REFERENCE_QUANTITY_PACK_CONFIG.packId,
    trackId: HSK3_REFERENCE_QUANTITY_TRACK_ID,
    lessonIds: HSK3_REFERENCE_QUANTITY_LESSON_IDS,
    grammarDrafts: GRAMMAR_DRAFTS,
    narratives: NARRATIVES,
    prerequisitePackBundles: [paragraphBundle],
    completedNarrationGrammarModules:
      HSK3_REFERENCE_QUANTITY_PACK_CONFIG.completedNarrationGrammarModules,
    completedNarrationGrammarLessons:
      HSK3_REFERENCE_QUANTITY_PACK_CONFIG.completedNarrationGrammarLessons,
  });
};

export const serializeHsk3ReferenceQuantityNarrationPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const outputPath = resolve(
    process.cwd(),
    HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH,
  );
  const serialized = serializeHsk3ReferenceQuantityNarrationPack(
    buildHsk3ReferenceQuantityNarrationPack(),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error(
        "Checked HSK3 reference/quantity narration pack is stale",
      );
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH,
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
