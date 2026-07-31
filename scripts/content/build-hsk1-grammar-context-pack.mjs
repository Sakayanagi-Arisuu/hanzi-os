import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1CurriculumScopeBundle,
  loadHsk1CurriculumScopeBundle,
} from "../../src/content/hsk1CurriculumScope.mjs";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";
import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH =
  "content/drafts/hsk1-grammar-context-2026.07.json";

const GRAMMAR_DRAFTS_BY_ORDINAL = {
  1: {
    explanationVi: "小 đứng trước họ/tên để gọi thân mật; 第 đứng trước số để tạo số thứ tự.",
    example: ["小王是我的同学。", "Xiǎo Wáng shì wǒ de tóngxué.", "Tiểu Vương là bạn học của tôi."],
    guided: ["Nói: Người thứ hai là giáo viên.", "第二个人是老师。", "Dì èr ge rén shì lǎoshī.", "Người thứ hai là giáo viên."],
  },
  2: {
    explanationVi: "们 đánh dấu số nhiều cho đại từ/người; 边 kết hợp với từ chỉ phương hướng để tạo từ vị trí.",
    example: ["我们在这边。", "Wǒmen zài zhèbiān.", "Chúng tôi ở phía này."],
    guided: ["Nói: Họ ở phía bên kia.", "他们在那边。", "Tāmen zài nàbiān.", "Họ ở phía bên kia."],
  },
  3: {
    explanationVi: "Danh từ phương vị 上、下、里、外、前、后 đứng sau danh từ hoặc dùng làm vị trí.",
    example: ["书在桌子上。", "Shū zài zhuōzi shàng.", "Sách ở trên bàn."],
    guided: ["Nói: Mèo ở dưới ghế.", "猫在椅子下。", "Māo zài yǐzi xià.", "Mèo ở dưới ghế."],
  },
  4: {
    explanationVi: "会 nói khả năng đã học được; 能 nhấn mạnh khả năng hoặc điều kiện cho phép.",
    example: ["我会说汉语。", "Wǒ huì shuō Hànyǔ.", "Tôi biết nói tiếng Trung."],
    guided: ["Nói: Anh ấy có thể đến.", "他能来。", "Tā néng lái.", "Anh ấy có thể đến."],
  },
  5: {
    explanationVi: "想 diễn đạt mong muốn/ý định; 要 diễn đạt muốn, cần hoặc dự định mạnh hơn.",
    example: ["我想喝茶。", "Wǒ xiǎng hē chá.", "Tôi muốn uống trà."],
    guided: ["Nói: Tôi muốn mua quyển sách này.", "我要买这本书。", "Wǒ yào mǎi zhè běn shū.", "Tôi muốn mua quyển sách này."],
  },
  6: {
    explanationVi: "可以 diễn đạt được phép hoặc điều kiện cho phép thực hiện hành động.",
    example: ["这里可以坐。", "Zhèlǐ kěyǐ zuò.", "Có thể ngồi ở đây."],
    guided: ["Nói: Bạn có thể vào.", "你可以进来。", "Nǐ kěyǐ jìnlái.", "Bạn có thể vào."],
  },
  7: {
    explanationVi: "Động từ ly hợp có phần động từ và tân ngữ; thành phần thời gian/số lượng thường chen giữa hai phần.",
    example: ["我八点上班，五点下班。", "Wǒ bā diǎn shàngbān, wǔ diǎn xiàbān.", "Tôi đi làm lúc tám giờ, tan làm lúc năm giờ."],
    guided: ["Nói: Tôi bị ốm, phải đi khám bệnh.", "我生病了，要去看病。", "Wǒ shēngbìng le, yào qù kànbìng.", "Tôi bị ốm, phải đi khám bệnh."],
  },
  8: {
    explanationVi: "Đại từ nghi vấn thay đúng vị trí của thông tin cần hỏi, không cần đảo trật tự câu.",
    example: ["你要多少个？", "Nǐ yào duōshao ge?", "Bạn muốn bao nhiêu cái?"],
    guided: ["Hỏi: Bạn sống ở đâu?", "你住在哪里？", "Nǐ zhù zài nǎlǐ?", "Bạn sống ở đâu?"],
  },
  9: {
    explanationVi: "Đại từ nhân xưng làm chủ ngữ, tân ngữ hoặc định ngữ; 们 tạo dạng số nhiều khi phù hợp.",
    example: ["我们都是学生。", "Wǒmen dōu shì xuéshēng.", "Chúng tôi đều là học sinh."],
    guided: ["Nói: Họ quen cô ấy.", "他们认识她。", "Tāmen rènshi tā.", "Họ quen cô ấy."],
  },
  10: {
    explanationVi: "这/那 chỉ gần/xa; các dạng 这里、那里、这些、那些 chỉ nơi hoặc số nhiều.",
    example: ["这些书在这里。", "Zhèxiē shū zài zhèlǐ.", "Những quyển sách này ở đây."],
    guided: ["Nói: Người kia ở bên kia.", "那个人在那边。", "Nà ge rén zài nàbiān.", "Người kia ở bên kia."],
  },
  11: {
    explanationVi: "Số từ HSK1 đứng trước lượng từ; 二 dùng khi đếm thuần, 两 thường dùng trước lượng từ.",
    example: ["我有两本书。", "Wǒ yǒu liǎng běn shū.", "Tôi có hai quyển sách."],
    guided: ["Nói: Nhà anh ấy có ba người.", "他家有三口人。", "Tā jiā yǒu sān kǒu rén.", "Nhà anh ấy có ba người."],
  },
  12: {
    explanationVi: "Lượng từ chuyên dụng đứng giữa số/từ chỉ định và danh từ: 本、个、家、口、块、件、只、元.",
    example: ["这里有三本书。", "Zhèlǐ yǒu sān běn shū.", "Ở đây có ba quyển sách."],
    guided: ["Nói: Tôi mua một bộ quần áo.", "我买一件衣服。", "Wǒ mǎi yí jiàn yīfu.", "Tôi mua một bộ quần áo."],
  },
  13: {
    explanationVi: "杯 vốn là danh từ “cốc” và được mượn làm lượng từ cho đồ uống.",
    example: ["我喝一杯茶。", "Wǒ hē yì bēi chá.", "Tôi uống một cốc trà."],
    guided: ["Nói: Hai cốc sữa.", "两杯牛奶。", "Liǎng bēi niúnǎi.", "Hai cốc sữa."],
  },
  14: {
    explanationVi: "Lượng từ thời gian 日、号、岁、点、分、年、天 đi sau số để tạo ngày, tuổi, giờ và khoảng thời gian.",
    example: ["今天是七月二十八号。", "Jīntiān shì qī yuè èrshíbā hào.", "Hôm nay là ngày 28 tháng 7."],
    guided: ["Nói: Tôi hai mươi tuổi.", "我二十岁。", "Wǒ èrshí suì.", "Tôi hai mươi tuổi."],
  },
  15: {
    explanationVi: "非常、很、太、真、有点儿 bổ nghĩa mức độ; 太 thường đi với 了 khi cảm thán.",
    example: ["今天天气很热。", "Jīntiān tiānqì hěn rè.", "Hôm nay thời tiết rất nóng."],
    guided: ["Nói: Bộ quần áo này đắt quá.", "这件衣服太贵了。", "Zhè jiàn yīfu tài guì le.", "Bộ quần áo này đắt quá."],
  },
  16: {
    explanationVi: "都 khái quát toàn bộ các thành phần đã nêu và thường đứng trước vị ngữ.",
    example: ["我们都是学生。", "Wǒmen dōu shì xuéshēng.", "Chúng tôi đều là học sinh."],
    guided: ["Nói: Những quyển sách này đều rất hay.", "这些书都很好。", "Zhèxiē shū dōu hěn hǎo.", "Những quyển sách này đều rất hay."],
  },
  17: {
    explanationVi: "在/正在 đứng trước động từ để đánh dấu hành động đang diễn ra.",
    example: ["我正在看书。", "Wǒ zhèngzài kàn shū.", "Tôi đang đọc sách."],
    guided: ["Nói: Anh ấy đang ăn cơm.", "他在吃饭。", "Tā zài chīfàn.", "Anh ấy đang ăn cơm."],
  },
  18: {
    explanationVi: "再 đặt trước động từ để nói một hành động sẽ lặp lại trong tương lai.",
    example: ["明天再来。", "Míngtiān zài lái.", "Ngày mai lại đến nhé."],
    guided: ["Nói: Ngày mai xem tiếp.", "明天再看。", "Míngtiān zài kàn.", "Ngày mai xem tiếp."],
  },
  19: {
    explanationVi: "也 thêm một trường hợp tương tự; 还 bổ sung hoặc nói trạng thái vẫn tiếp diễn.",
    example: ["我喜欢茶，也喜欢牛奶。", "Wǒ xǐhuan chá, yě xǐhuan niúnǎi.", "Tôi thích trà và cũng thích sữa."],
    guided: ["Nói: Anh ấy vẫn ở trường.", "他还在学校。", "Tā hái zài xuéxiào.", "Anh ấy vẫn ở trường."],
  },
  20: {
    explanationVi: "不 phủ định hiện tại/thói quen; 没(有) phủ định sự tồn tại hoặc việc đã xảy ra; 不要 dùng để ngăn/cấm.",
    example: ["我不喝茶，也没有书。", "Wǒ bù hē chá, yě méiyǒu shū.", "Tôi không uống trà và cũng không có sách."],
    guided: ["Nói: Đừng nói chuyện.", "不要说话。", "Bú yào shuōhuà.", "Đừng nói chuyện."],
  },
  21: {
    explanationVi: "Giới từ 在 đưa thời gian hoặc nơi chốn lên trước động từ chính.",
    example: ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."],
    guided: ["Nói: Anh ấy ăn cơm ở nhà.", "他在家吃饭。", "Tā zài jiā chīfàn.", "Anh ấy ăn cơm ở nhà."],
  },
  22: {
    explanationVi: "和 đưa người cùng tham gia hành động; 对 đưa đối tượng mà hành động/thái độ hướng tới.",
    example: ["老师对学生说话。", "Lǎoshī duì xuéshēng shuōhuà.", "Giáo viên nói với học sinh."],
    guided: ["Nói: Tôi đi cửa hàng cùng bạn.", "我和朋友去商店。", "Wǒ hé péngyou qù shāngdiàn.", "Tôi đi cửa hàng cùng bạn."],
  },
  23: {
    explanationVi: "Liên từ 和 nối các từ hoặc cụm từ cùng vai trò, không dùng để nối hai mệnh đề hoàn chỉnh.",
    example: ["我买了面包和牛奶。", "Wǒ mǎi le miànbāo hé niúnǎi.", "Tôi đã mua bánh mì và sữa."],
    guided: ["Nói: Bố và mẹ đều ở nhà.", "爸爸和妈妈都在家。", "Bàba hé māma dōu zài jiā.", "Bố và mẹ đều ở nhà."],
  },
  24: {
    explanationVi: "的 nối định ngữ với danh từ trung tâm để biểu thị sở hữu hoặc đặc điểm.",
    example: ["这是我的书。", "Zhè shì wǒ de shū.", "Đây là sách của tôi."],
    guided: ["Nói: Bộ quần áo đẹp.", "漂亮的衣服。", "Piàoliang de yīfu.", "Bộ quần áo đẹp."],
  },
  25: {
    explanationVi: "了 đứng sau động từ để đánh dấu hành động hoàn thành trong ngữ cảnh cụ thể.",
    example: ["我吃了早饭。", "Wǒ chī le zǎofàn.", "Tôi đã ăn sáng."],
    guided: ["Nói: Anh ấy đã mua quyển sách kia.", "他买了那本书。", "Tā mǎi le nà běn shū.", "Anh ấy đã mua quyển sách kia."],
  },
  26: {
    explanationVi: "吧、了、吗、呢 ở cuối câu thể hiện đề nghị, thay đổi, câu hỏi đúng-sai hoặc câu hỏi tiếp nối.",
    example: ["你是学生吗？", "Nǐ shì xuéshēng ma?", "Bạn là học sinh phải không?"],
    guided: ["Nói lời rủ: Chúng ta đi nhé.", "我们走吧。", "Wǒmen zǒu ba.", "Chúng ta đi nhé."],
  },
  27: {
    explanationVi: "喂 là thán từ dùng để mở đầu cuộc gọi hoặc thu hút sự chú ý; cần dùng đúng sắc thái.",
    example: ["喂，请问王老师在吗？", "Wèi, qǐngwèn Wáng lǎoshī zài ma?", "A-lô, cho hỏi thầy Vương có ở đó không?"],
    guided: ["Mở đầu cuộc gọi và chào.", "喂，你好！", "Wèi, nǐ hǎo!", "A-lô, xin chào!"],
  },
  28: {
    explanationVi: "Cụm liên hợp nối các thành phần ngang hàng, thường bằng 和 hoặc liệt kê.",
    example: ["爸爸和妈妈都在家。", "Bàba hé māma dōu zài jiā.", "Bố và mẹ đều ở nhà."],
    guided: ["Nói: Trà và sữa đều ngon.", "茶和牛奶都很好喝。", "Chá hé niúnǎi dōu hěn hǎohē.", "Trà và sữa đều ngon."],
  },
  29: {
    explanationVi: "Cụm chính-phụ đặt thành phần bổ nghĩa trước thành phần trung tâm, thường có 的.",
    example: ["这是我的汉语书。", "Zhè shì wǒ de Hànyǔ shū.", "Đây là sách tiếng Trung của tôi."],
    guided: ["Nói: Bộ quần áo đẹp rất rẻ.", "漂亮的衣服很便宜。", "Piàoliang de yīfu hěn piányi.", "Bộ quần áo đẹp rất rẻ."],
  },
  30: {
    explanationVi: "Cụm động-tân gồm động từ đứng trước đối tượng của hành động, như 吃饭、看书.",
    example: ["我在饭店吃饭。", "Wǒ zài fàndiàn chīfàn.", "Tôi ăn cơm ở nhà hàng."],
    guided: ["Nói: Anh ấy thích xem phim.", "他喜欢看电影。", "Tā xǐhuan kàn diànyǐng.", "Anh ấy thích xem phim."],
  },
  31: {
    explanationVi: "Cụm chủ-vị gồm đối tượng được nói tới và phần miêu tả/trình bày về đối tượng đó.",
    example: ["天气很好。", "Tiānqì hěn hǎo.", "Thời tiết rất đẹp."],
    guided: ["Nói: Tôi rất bận.", "我很忙。", "Wǒ hěn máng.", "Tôi rất bận."],
  },
  32: {
    explanationVi: "Cụm số-lượng gồm số từ cộng lượng từ và thường đứng trước danh từ.",
    example: ["这里有三本书。", "Zhèlǐ yǒu sān běn shū.", "Ở đây có ba quyển sách."],
    guided: ["Nói: Hai cốc trà.", "两杯茶。", "Liǎng bēi chá.", "Hai cốc trà."],
  },
  33: {
    explanationVi: "Cụm giới-tân gồm giới từ và đối tượng đi sau, như 在学校、对学生.",
    example: ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."],
    guided: ["Nói: Anh ấy ngủ ở nhà.", "他在家睡觉。", "Tā zài jiā shuìjiào.", "Anh ấy ngủ ở nhà."],
  },
  34: {
    explanationVi: "Cụm phương vị gồm danh từ/đại từ cộng từ chỉ phương hướng, như 桌子上、房间里.",
    example: ["书在桌子上。", "Shū zài zhuōzi shàng.", "Sách ở trên bàn."],
    guided: ["Nói: Mèo ở dưới ghế.", "猫在椅子下。", "Māo zài yǐzi xià.", "Mèo ở dưới ghế."],
  },
  35: {
    explanationVi: "Danh từ, đại từ hoặc cụm danh từ có thể làm chủ ngữ đứng trước vị ngữ.",
    example: ["我是学生。", "Wǒ shì xuéshēng.", "Tôi là học sinh."],
    guided: ["Nói: Cô ấy là giáo viên.", "她是老师。", "Tā shì lǎoshī.", "Cô ấy là giáo viên."],
  },
  36: {
    explanationVi: "Ở HSK1, danh từ, đại từ, số từ hoặc cụm số-lượng có thể trực tiếp làm vị ngữ trong một số mẫu.",
    example: ["今天星期二。", "Jīntiān xīngqī èr.", "Hôm nay là thứ Ba."],
    guided: ["Nói: Tôi hai mươi tuổi.", "我二十岁。", "Wǒ èrshí suì.", "Tôi hai mươi tuổi."],
  },
  37: {
    explanationVi: "Động từ/cụm động từ hoặc tính từ/cụm tính từ có thể làm vị ngữ; tính từ thường đi với 很.",
    example: ["他学习汉语。", "Tā xuéxí Hànyǔ.", "Anh ấy học tiếng Trung."],
    guided: ["Nói: Thời tiết rất lạnh.", "天气很冷。", "Tiānqì hěn lěng.", "Thời tiết rất lạnh."],
  },
  38: {
    explanationVi: "Danh từ, đại từ hoặc cụm danh từ có thể làm tân ngữ sau động từ.",
    example: ["我喜欢这本书。", "Wǒ xǐhuan zhè běn shū.", "Tôi thích quyển sách này."],
    guided: ["Nói: Anh ấy quen tôi.", "他认识我。", "Tā rènshi wǒ.", "Anh ấy quen tôi."],
  },
  39: {
    explanationVi: "Danh từ/cụm danh từ, tính từ/cụm tính từ và cụm số-lượng có thể làm định ngữ trước danh từ.",
    example: ["我的书在这里。", "Wǒ de shū zài zhèlǐ.", "Sách của tôi ở đây."],
    guided: ["Nói: Tôi mua một bộ quần áo đẹp.", "我买了一件漂亮的衣服。", "Wǒ mǎi le yí jiàn piàoliang de yīfu.", "Tôi đã mua một bộ quần áo đẹp."],
  },
  40: {
    explanationVi: "Phó từ và cụm chỉ thời gian hoặc nơi chốn thường đứng trước động từ để làm trạng ngữ; tính từ chỉ dùng theo kết cấu phù hợp, không áp dụng máy móc.",
    example: ["我今天在家学习。", "Wǒ jīntiān zài jiā xuéxí.", "Hôm nay tôi học ở nhà."],
    guided: ["Nói: Ngày mai anh ấy đi học.", "他明天去上学。", "Tā míngtiān qù shàngxué.", "Ngày mai anh ấy đi học."],
  },
  41: {
    explanationVi: "Bổ ngữ số lượng hành động đứng sau động từ để cho biết hành động xảy ra bao nhiêu lần.",
    example: ["这个电影我看了一次。", "Zhè ge diànyǐng wǒ kàn le yí cì.", "Bộ phim này tôi đã xem một lần."],
    guided: ["Nói: Vui lòng nói lại một lần.", "请再说一次。", "Qǐng zài shuō yí cì.", "Vui lòng nói lại một lần."],
  },
  42: {
    explanationVi: "Câu chủ-vị có vị ngữ động từ dùng động từ/cụm động từ để nói hành động của chủ ngữ.",
    example: ["我学习汉语。", "Wǒ xuéxí Hànyǔ.", "Tôi học tiếng Trung."],
    guided: ["Nói: Anh ấy ăn cơm.", "他吃米饭。", "Tā chī mǐfàn.", "Anh ấy ăn cơm."],
  },
  43: {
    explanationVi: "Câu vị ngữ tính từ miêu tả chủ ngữ; 很 thường làm cầu nối trung tính trước tính từ.",
    example: ["天气很热。", "Tiānqì hěn rè.", "Thời tiết rất nóng."],
    guided: ["Nói: Bộ quần áo này rất đẹp.", "这件衣服很漂亮。", "Zhè jiàn yīfu hěn piàoliang.", "Bộ quần áo này rất đẹp."],
  },
  44: {
    explanationVi: "Câu vị ngữ danh từ dùng danh từ/cụm danh từ để nói ngày, tuổi, giá hoặc thông tin phân loại quen thuộc.",
    example: ["今天星期一。", "Jīntiān xīngqī yī.", "Hôm nay là thứ Hai."],
    guided: ["Nói: Năm nay tôi hai mươi tuổi.", "我今年二十岁。", "Wǒ jīnnián èrshí suì.", "Năm nay tôi hai mươi tuổi."],
  },
  45: {
    explanationVi: "Câu phi chủ-vị không nêu chủ ngữ rõ ràng, thường dùng cho thời tiết, tồn tại hoặc phản ứng ngắn.",
    example: ["下雨了。", "Xiàyǔ le.", "Trời mưa rồi."],
    guided: ["Phản hồi ngắn: Rất tốt!", "很好！", "Hěn hǎo!", "Rất tốt!"],
  },
  46: {
    explanationVi: "Câu hỏi đúng-sai giữ trật tự câu kể và thêm 吗 ở cuối; trả lời thường dùng 是/不是 hoặc động từ.",
    example: ["你是学生吗？", "Nǐ shì xuéshēng ma?", "Bạn là học sinh phải không?"],
    guided: ["Hỏi: Hôm nay anh ấy có đến không?", "他今天来吗？", "Tā jīntiān lái ma?", "Hôm nay anh ấy có đến không?"],
  },
  47: {
    explanationVi: "Câu hỏi đặc chỉ đặt đại từ nghi vấn đúng chỗ của câu trả lời cần tìm.",
    example: ["你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?"],
    guided: ["Hỏi: Bạn sống ở đâu?", "你住在哪儿？", "Nǐ zhù zài nǎr?", "Bạn sống ở đâu?"],
  },
  48: {
    explanationVi: "Câu hỏi chính-phản đặt dạng khẳng định và phủ định cạnh nhau, không thêm 吗.",
    example: ["你是不是老师？", "Nǐ shì bu shì lǎoshī?", "Bạn có phải là giáo viên không?"],
    guided: ["Hỏi: Anh ấy có đi học không?", "他去不去学校？", "Tā qù bu qù xuéxiào?", "Anh ấy có đi học không?"],
  },
  49: {
    explanationVi: "Câu chữ 是 nối chủ ngữ với danh tính, loại hoặc quan hệ tương đương.",
    example: ["他是老师。", "Tā shì lǎoshī.", "Anh ấy là giáo viên."],
    guided: ["Nói: Đây là sách của tôi.", "这是我的书。", "Zhè shì wǒ de shū.", "Đây là sách của tôi."],
  },
  50: {
    explanationVi: "Câu chữ 有 biểu thị chủ thể sở hữu người hoặc vật; phủ định bằng 没有.",
    example: ["我有两本书。", "Wǒ yǒu liǎng běn shū.", "Tôi có hai quyển sách."],
    guided: ["Nói: Nhà anh ấy có ba người.", "他家有三口人。", "Tā jiā yǒu sān kǒu rén.", "Nhà anh ấy có ba người."],
  },
  51: {
    explanationVi: "Mẫu tồn hiện “nơi chốn + 是 + danh từ” xác định người/vật ở một vị trí.",
    example: ["桌子上是一本书。", "Zhuōzi shàng shì yì běn shū.", "Trên bàn là một quyển sách."],
    guided: ["Nói: Phía trước là trường học.", "前边是学校。", "Qiánbiān shì xuéxiào.", "Phía trước là trường học."],
  },
  52: {
    explanationVi: "Mẫu tồn hiện “nơi chốn + 有 + cụm số-lượng + danh từ” giới thiệu thứ đang tồn tại ở đó.",
    example: ["桌子上有一本书。", "Zhuōzi shàng yǒu yì běn shū.", "Trên bàn có một quyển sách."],
    guided: ["Nói: Trong phòng có hai cái ghế.", "房间里有两把椅子。", "Fángjiān lǐ yǒu liǎng bǎ yǐzi.", "Trong phòng có hai cái ghế."],
  },
  53: {
    explanationVi: "Trong câu liên động, hành động sau có thể là mục đích của hành động trước.",
    example: ["我去商店买衣服。", "Wǒ qù shāngdiàn mǎi yīfu.", "Tôi đến cửa hàng để mua quần áo."],
    guided: ["Nói: Anh ấy đến nhà hàng ăn cơm.", "他去饭店吃饭。", "Tā qù fàndiàn chīfàn.", "Anh ấy đến nhà hàng ăn cơm."],
  },
  54: {
    explanationVi: "Trong câu liên động, hành động trước có thể chỉ cách thức/phương tiện của hành động sau.",
    example: ["我坐火车去学校。", "Wǒ zuò huǒchē qù xuéxiào.", "Tôi đi tàu hỏa đến trường."],
    guided: ["Nói: Anh ấy lái xe đến công ty.", "他开车去公司。", "Tā kāichē qù gōngsī.", "Anh ấy lái xe đến công ty."],
  },
  55: {
    explanationVi: "Câu hai tân ngữ có cấu trúc chủ ngữ + động từ + người nhận + vật được chuyển.",
    example: ["老师给我一本书。", "Lǎoshī gěi wǒ yì běn shū.", "Giáo viên cho tôi một quyển sách."],
    guided: ["Nói: Mẹ đưa anh ấy một cốc trà.", "妈妈给他一杯茶。", "Māma gěi tā yì bēi chá.", "Mẹ đưa anh ấy một cốc trà."],
  },
  56: {
    explanationVi: "Mẫu “…，也…” nối hai sự việc song song và bổ sung trường hợp tương tự.",
    example: ["我喜欢看书，也喜欢看电影。", "Wǒ xǐhuan kàn shū, yě xǐhuan kàn diànyǐng.", "Tôi thích đọc sách và cũng thích xem phim."],
    guided: ["Nói: Anh ấy biết nói tiếng Trung và cũng biết viết chữ Hán.", "他会说汉语，也会写汉字。", "Tā huì shuō Hànyǔ, yě huì xiě Hànzì.", "Anh ấy biết nói tiếng Trung và cũng biết viết chữ Hán."],
  },
  57: {
    explanationVi: "Mẫu “…，还…” thêm một sự việc hoặc thành phần nữa ngoài điều đã nói.",
    example: ["我有哥哥，还有妹妹。", "Wǒ yǒu gēge, hái yǒu mèimei.", "Tôi có anh trai và còn có em gái."],
    guided: ["Nói: Tôi thích trà, còn thích sữa.", "我喜欢茶，还喜欢牛奶。", "Wǒ xǐhuan chá, hái xǐhuan niúnǎi.", "Tôi thích trà, còn thích sữa."],
  },
  58: {
    explanationVi: "Trợ từ động thái 了 đặt sau động từ để biểu thị hành động đã hoàn thành.",
    example: ["我吃了早饭。", "Wǒ chī le zǎofàn.", "Tôi đã ăn sáng."],
    guided: ["Nói: Anh ấy đã xem phim.", "他看了电影。", "Tā kàn le diànyǐng.", "Anh ấy đã xem phim."],
  },
  59: {
    explanationVi: "了 ở cuối câu biểu thị tình huống hoặc trạng thái mới đã thay đổi.",
    example: ["天气冷了。", "Tiānqì lěng le.", "Thời tiết trở lạnh rồi."],
    guided: ["Nói: Anh ấy hai mươi tuổi rồi.", "他二十岁了。", "Tā èrshí suì le.", "Anh ấy hai mươi tuổi rồi."],
  },
  60: {
    explanationVi: "Mẫu “在/正在 + động từ” đánh dấu hành động đang diễn ra.",
    example: ["我正在看书。", "Wǒ zhèngzài kàn shū.", "Tôi đang đọc sách."],
    guided: ["Nói: Anh ấy đang ăn cơm.", "他在吃饭。", "Tā zài chīfàn.", "Anh ấy đang ăn cơm."],
  },
  61: {
    explanationVi: "Mẫu “在/正在 + động từ + 呢” nhấn mạnh hành động đang tiếp diễn ở thời điểm nói.",
    example: ["我正在看书呢。", "Wǒ zhèngzài kàn shū ne.", "Tôi đang đọc sách đây."],
    guided: ["Nói: Mẹ đang nấu cơm.", "妈妈在做饭呢。", "Māma zài zuòfàn ne.", "Mẹ đang nấu cơm."],
  },
  62: {
    explanationVi: "Chỉ cần đặt 呢 cuối câu khi ngữ cảnh đã rõ để biểu thị hành động đang diễn ra.",
    example: ["他看书呢。", "Tā kàn shū ne.", "Anh ấy đang đọc sách đấy."],
    guided: ["Nói: Mẹ đang nấu cơm đấy.", "妈妈做饭呢。", "Māma zuòfàn ne.", "Mẹ đang nấu cơm đấy."],
  },
  63: {
    explanationVi: "Giá tiền dùng số + đơn vị 元/块; danh từ hàng hóa có thể đứng trước cụm giá.",
    example: ["这本书十块钱。", "Zhè běn shū shí kuài qián.", "Quyển sách này giá mười tệ."],
    guided: ["Nói: Một cốc trà giá năm tệ.", "一杯茶五元。", "Yì bēi chá wǔ yuán.", "Một cốc trà giá năm tệ."],
  },
  64: {
    explanationVi: "Số thứ tự cơ bản dùng 第 + số từ; lượng từ/danh từ đi sau nếu cần.",
    example: ["他是第二个学生。", "Tā shì dì èr ge xuéshēng.", "Anh ấy là học sinh thứ hai."],
    guided: ["Nói: Đây là quyển sách thứ ba.", "这是第三本书。", "Zhè shì dì sān běn shū.", "Đây là quyển sách thứ ba."],
  },
  65: {
    explanationVi: "Ngày tháng đi theo thứ tự năm + tháng + ngày; thứ trong tuần dùng 星期 + số.",
    example: ["今天是二〇二六年七月二十八日，星期二。", "Jīntiān shì èr líng èr liù nián qī yuè èrshíbā rì, xīngqī èr.", "Hôm nay là thứ Ba, ngày 28 tháng 7 năm 2026."],
    guided: ["Nói: Ngày mai là ngày 29 tháng 7.", "明天是七月二十九日。", "Míngtiān shì qī yuè èrshíjiǔ rì.", "Ngày mai là ngày 29 tháng 7."],
  },
  66: {
    explanationVi: "Giờ đi theo số + 点; phút đi sau 点, 半 là rưỡi và buổi có thể đứng trước giờ.",
    example: ["现在八点半。", "Xiànzài bā diǎn bàn.", "Bây giờ là tám giờ rưỡi."],
    guided: ["Nói: Tôi vào học lúc ba giờ chiều.", "我下午三点上课。", "Wǒ xiàwǔ sān diǎn shàngkè.", "Tôi vào học lúc ba giờ chiều."],
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

export const buildHsk1GrammarContextPack = (root = process.cwd()) => {
  const scopeBundle = loadHsk1CurriculumScopeBundle(root);
  assertValidHsk1CurriculumScopeBundle(scopeBundle);
  const personalBundle = loadHsk1PersonalExchangePackBundle(root);
  assertValidHsk1PersonalExchangePackBundle(personalBundle);
  const communicativeBundle = loadHsk1CommunicativeUnitPacksBundle(root);
  assertValidHsk1CommunicativeUnitPacksBundle(communicativeBundle);
  const inventory = scopeBundle.graphBundle.syllabus.inventory;
  const officialGrammarRows = inventory.grammarRows.filter(
    (item) => item.level === 1,
  );
  const lessons = [
    ...personalBundle.pack.lessons.map((lesson) => ({
      ...lesson,
      unitId: personalBundle.pack.unitId,
    })),
    ...communicativeBundle.collection.packs.flatMap((pack) =>
      pack.lessons.map((lesson) => ({ ...lesson, unitId: pack.unitId }))
    ),
  ];
  const grammarLessonPairs = lessons.flatMap((lesson) =>
    lesson.grammarRowIds.map((grammarRowId) => ({
      grammarRowId,
      lessonId: lesson.lessonId,
      unitId: lesson.unitId,
    }))
  );
  exactPartition(
    "grammar lesson mappings",
    grammarLessonPairs.map((pair) => pair.grammarRowId),
    officialGrammarRows.map((row) => row.id),
  );
  const lessonByGrammarId = new Map(
    grammarLessonPairs.map((pair) => [pair.grammarRowId, pair]),
  );

  const grammarDrafts = officialGrammarRows.map((official) => {
    const draft = GRAMMAR_DRAFTS_BY_ORDINAL[official.ordinal];
    const lessonMapping = lessonByGrammarId.get(official.id);
    if (!draft) throw new Error(`${official.id} grammar draft is missing`);
    return {
      officialGrammarRowId: official.id,
      officialOrdinal: official.ordinal,
      sourcePage: official.sourcePage,
      category: official.category,
      categoryName: official.categoryName,
      detail: official.detail,
      officialContent: official.content,
      unitId: lessonMapping.unitId,
      lessonId: lessonMapping.lessonId,
      explanationViDraft: draft.explanationVi,
      modelExample: {
        hanzi: draft.example[0],
        pinyin: draft.example[1],
        meaningVi: draft.example[2],
      },
      guidedPractice: {
        promptVi: draft.guided[0],
        modelAnswerHanzi: draft.guided[1],
        modelAnswerPinyin: draft.guided[2],
        modelAnswerMeaningVi: draft.guided[3],
      },
      review: {
        machineAssisted: true,
        nativeMandarinReview: "pending",
        vietnameseEditorialReview: "pending",
        grammarPedagogyReview: "pending",
      },
    };
  });
  const practiceItems = grammarDrafts.map((draft) => ({
    itemId: `${draft.lessonId}:${draft.officialGrammarRowId}:guided`,
    lessonId: draft.lessonId,
    officialGrammarRowId: draft.officialGrammarRowId,
    kind: "guided-pattern-production",
    promptVi: draft.guidedPractice.promptVi,
    modelAnswer: {
      hanzi: draft.guidedPractice.modelAnswerHanzi,
      pinyin: draft.guidedPractice.modelAnswerPinyin,
      meaningVi: draft.guidedPractice.modelAnswerMeaningVi,
    },
    scoringPolicy: "self-reveal-only",
    review: "pending",
    measurementEligible: false,
    masteryEligible: false,
  }));
  const lessonsWithGrammar = lessons.filter(
    (lesson) => lesson.grammarRowIds.length > 0,
  );
  const reviewBatches = lessonsWithGrammar.map((lesson) => ({
    batchId: `${lesson.lessonId}:grammar-review-v1`,
    lessonId: lesson.lessonId,
    grammarRowIds: [...lesson.grammarRowIds],
    practiceItemIds: practiceItems.filter(
      (item) => item.lessonId === lesson.lessonId,
    ).map((item) => item.itemId),
    requiredRoles: [
      "native-mandarin-reviewer",
      "vietnamese-editor",
      "grammar-pedagogy-reviewer",
    ],
    state: "pending",
    approvals: [],
  }));

  return {
    schemaVersion: 1,
    packId: "hsk1-grammar-context-2026.07",
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      scopeId: scopeBundle.scope.scopeId,
      scopeSha256: fileSha256(scopeBundle.scopePath),
      syllabusInventorySha256:
        scopeBundle.graphBundle.syllabus.inventorySha256,
      personalExchangePackId: personalBundle.pack.packId,
      personalExchangePackSha256: fileSha256(personalBundle.packPath),
      communicativeCollectionId:
        communicativeBundle.collection.collectionId,
      communicativeCollectionSha256:
        fileSha256(communicativeBundle.collectionPath),
    },
    authorship: {
      method: "ai-assisted-grammar-explanation-and-context-draft",
      assistant: "OpenAI Codex",
      nativeMandarinReviewer: null,
      vietnameseEditor: null,
      grammarPedagogyReviewer: null,
    },
    reviewPolicy: {
      nativeMandarinRequiredForRelease: true,
      vietnameseEditorialRequiredForRelease: true,
      grammarPedagogyReviewRequiredForRelease: true,
      productiveScoringReviewRequiredForMeasurement: true,
    },
    counts: {
      communicativeLessonBlueprints: lessons.length,
      lessonsWithGrammarPractice: lessonsWithGrammar.length,
      grammarDrafts: grammarDrafts.length,
      modelExamples: grammarDrafts.length,
      guidedPracticeItems: practiceItems.length,
      reviewBatches: reviewBatches.length,
      measurementEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      officialGrammarInventoryDraftMapped: true,
      grammarContextDraftComplete: true,
      reviewedGrammarContentComplete: false,
      measurementCoverageComplete: false,
      hsk1Complete: false,
    },
    grammarDrafts,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk1GrammarContextPack = (pack) =>
  `${JSON.stringify(pack)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH);
  const serialized = serializeHsk1GrammarContextPack(
    buildHsk1GrammarContextPack(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 grammar-context pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_GRAMMAR_CONTEXT_PACK_RELATIVE_PATH,
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
