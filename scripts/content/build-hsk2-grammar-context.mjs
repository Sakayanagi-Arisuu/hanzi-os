import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2LessonBlueprintsBundle,
  loadHsk2LessonBlueprintsBundle,
} from "../../src/content/hsk2LessonBlueprints.mjs";
import { fileSha256 } from "../../src/content/hskSyllabusInventory.mjs";

export const HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH =
  "content/drafts/hsk2-grammar-context-2026.07.json";

const GRAMMAR_DRAFTS_BY_ORDINAL = {
  1: {
    explanationVi: "面 kết hợp với từ chỉ phương hướng để tạo danh từ vị trí như 对面, 前面, 后面; cụm vị trí thường đứng sau địa điểm được quy chiếu.",
    example: ["学校对面有一家书店。", "Xuéxiào duìmiàn yǒu yì jiā shūdiàn.", "Đối diện trường học có một hiệu sách."],
    guided: ["Dùng 后面 để nói: Phía sau bệnh viện có một quán cà phê.", "医院后面有一家咖啡店。", "Yīyuàn hòumiàn yǒu yì jiā kāfēidiàn.", "Phía sau bệnh viện có một quán cà phê."],
  },
  2: {
    explanationVi: "左 và 右 là danh từ phương vị chỉ bên trái và bên phải; có thể đi với 边 hoặc 面 và làm trung tâm của cụm vị trí.",
    example: ["医院在学校左边。", "Yīyuàn zài xuéxiào zuǒbian.", "Bệnh viện ở bên trái trường học."],
    guided: ["Dùng 右边 để nói: Nhà vệ sinh ở bên phải lớp học.", "洗手间在教室右边。", "Xǐshǒujiān zài jiàoshì yòubian.", "Nhà vệ sinh ở bên phải lớp học."],
  },
  3: {
    explanationVi: "Lặp động từ biểu thị hành động ngắn, nhẹ hoặc thử làm; các dạng thường gặp là AA, A一A, A了A và ABAB.",
    example: ["你先看看这本书。", "Nǐ xiān kànkan zhè běn shū.", "Bạn hãy xem thử quyển sách này trước."],
    guided: ["Dùng dạng ABAB để rủ: Chúng ta nghỉ một chút nhé.", "我们休息休息吧。", "Wǒmen xiūxi xiūxi ba.", "Chúng ta nghỉ một chút nhé."],
  },
  4: {
    explanationVi: "可能 đứng trước vị ngữ để nêu một khả năng chưa chắc chắn; phủ định thường là 可能不, không dùng để khẳng định năng lực đã học được.",
    example: ["他今天可能不来。", "Tā jīntiān kěnéng bù lái.", "Hôm nay có thể anh ấy không đến."],
    guided: ["Dùng 可能 để nói: Ngày mai có thể trời mưa.", "明天可能下雨。", "Míngtiān kěnéng xiàyǔ.", "Ngày mai có thể trời mưa."],
  },
  5: {
    explanationVi: "帮忙, 游泳, 跳舞 và 跑步 là động từ ly hợp; bổ ngữ thời lượng hoặc số lần có thể chen giữa hai thành tố theo từng mẫu.",
    example: ["我昨天跳了两个小时舞。", "Wǒ zuótiān tiào le liǎng ge xiǎoshí wǔ.", "Hôm qua tôi đã nhảy hai tiếng."],
    guided: ["Dùng 帮忙 để nói: Bạn có thể giúp tôi một việc không?", "你能帮我一个忙吗？", "Nǐ néng bāng wǒ yí ge máng ma?", "Bạn có thể giúp tôi một việc không?"],
  },
  6: {
    explanationVi: "为什么 hỏi nguyên nhân và đứng tại vị trí của thành phần cần hỏi; câu trả lời thường dùng 因为 để đưa ra lý do.",
    example: ["你为什么学汉语？", "Nǐ wèishénme xué Hànyǔ?", "Tại sao bạn học tiếng Trung?"],
    guided: ["Hỏi: Tại sao hôm nay anh ấy không đi làm?", "他今天为什么不上班？", "Tā jīntiān wèishénme bù shàngbān?", "Tại sao hôm nay anh ấy không đi làm?"],
  },
  7: {
    explanationVi: "自己 là đại từ phản thân, quy chiếu về chủ thể phù hợp trong câu và nhấn mạnh người đó tự thực hiện hoặc tự chịu tác động.",
    example: ["我自己做晚饭。", "Wǒ zìjǐ zuò wǎnfàn.", "Tôi tự nấu bữa tối."],
    guided: ["Dùng 自己 để nói: Cô ấy tự mua vé.", "她自己买票。", "Tā zìjǐ mǎi piào.", "Cô ấy tự mua vé."],
  },
  8: {
    explanationVi: "这么/这样 chỉ cách thức hoặc mức độ gần ngữ cảnh, 那么/那样 chỉ xa; 每 phân phối lần lượt cho từng người, vật hoặc thời điểm.",
    example: ["每个人都有自己的名字。", "Měi ge rén dōu yǒu zìjǐ de míngzi.", "Mỗi người đều có tên riêng."],
    guided: ["Dùng 这样 để nói: Làm như thế này khá tốt.", "这样做很不错。", "Zhèyàng zuò hěn búcuò.", "Làm như thế này khá tốt."],
  },
  9: {
    explanationVi: "Lặp tính từ tạo sắc thái miêu tả sinh động hoặc tăng mức độ; dạng AA thường dùng với tính từ đơn, AABB với tính từ hai âm tiết.",
    example: ["房间干干净净的。", "Fángjiān gāngānjìngjìng de.", "Căn phòng sạch sẽ tinh tươm."],
    guided: ["Lặp 慢 để nhắc: Bạn nói chậm chậm thôi.", "你慢慢说。", "Nǐ mànmàn shuō.", "Bạn nói chậm chậm thôi."],
  },
  10: {
    explanationVi: "万 là đơn vị mười nghìn; 好多 biểu thị số lượng nhiều không xác định, còn 多 có thể hỏi hoặc nêu phần vượt quá một mốc số.",
    example: ["这个学校有一万多人。", "Zhège xuéxiào yǒu yí wàn duō rén.", "Trường học này có hơn mười nghìn người."],
    guided: ["Dùng 好多 để nói: Hiệu sách có rất nhiều sách.", "书店里有好多书。", "Shūdiàn lǐ yǒu hǎoduō shū.", "Hiệu sách có rất nhiều sách."],
  },
  11: {
    explanationVi: "条, 位, 间 và 名 là lượng từ chuyên dụng: 条 cho vật dài, 位 lịch sự cho người, 间 cho phòng và 名 cho thành viên/người có tư cách.",
    example: ["教室里有三位老师。", "Jiàoshì lǐ yǒu sān wèi lǎoshī.", "Trong lớp học có ba giáo viên."],
    guided: ["Chọn 间 để nói: Chúng tôi đặt hai phòng.", "我们订了两间房。", "Wǒmen dìng le liǎng jiān fáng.", "Chúng tôi đã đặt hai phòng."],
  },
  12: {
    explanationVi: "包 vốn là danh từ chỉ gói nhưng có thể mượn làm lượng từ cho vật được đóng thành gói, đặt giữa số từ và danh từ.",
    example: ["我买了一包茶。", "Wǒ mǎi le yì bāo chá.", "Tôi đã mua một gói trà."],
    guided: ["Dùng 包 để nói: Trên bàn có hai gói thuốc.", "桌子上有两包药。", "Zhuōzi shàng yǒu liǎng bāo yào.", "Trên bàn có hai gói thuốc."],
  },
  13: {
    explanationVi: "次 là động lượng từ đếm số lần hành động xảy ra; thường đứng sau động từ hoặc sau tân ngữ nơi chốn tùy cấu trúc.",
    example: ["我去过北京两次。", "Wǒ qùguo Běijīng liǎng cì.", "Tôi đã từng đến Bắc Kinh hai lần."],
    guided: ["Dùng 次 để nói: Hôm nay tôi gọi cho anh ấy ba lần.", "今天我给他打了三次电话。", "Jīntiān wǒ gěi tā dǎ le sān cì diànhuà.", "Hôm nay tôi đã gọi cho anh ấy ba lần."],
  },
  14: {
    explanationVi: "多, 好 và 最 đứng trước tính từ để biểu thị mức độ; 最 đánh dấu mức cao nhất trong phạm vi so sánh được hiểu từ ngữ cảnh.",
    example: ["这件衣服最好看。", "Zhè jiàn yīfu zuì hǎokàn.", "Bộ quần áo này đẹp nhất."],
    guided: ["Dùng 多 để cảm thán: Hôm nay trời đẹp biết bao!", "今天的天气多好啊！", "Jīntiān de tiānqì duō hǎo a!", "Hôm nay trời đẹp biết bao!"],
  },
  15: {
    explanationVi: "一起 đứng trước động từ để nói nhiều chủ thể cùng thực hiện một hành động; chủ thể tập thể phải xuất hiện hoặc được hiểu rõ.",
    example: ["我们一起去吃饭吧。", "Wǒmen yìqǐ qù chīfàn ba.", "Chúng ta cùng đi ăn nhé."],
    guided: ["Dùng 一起 để nói: Cuối tuần họ cùng chơi bóng.", "周末他们一起打球。", "Zhōumò tāmen yìqǐ dǎqiú.", "Cuối tuần họ cùng chơi bóng."],
  },
  16: {
    explanationVi: "已经 nêu việc đã xảy ra, 还 nêu trạng thái vẫn tiếp diễn; 有时 chỉ thỉnh thoảng, 快/快要 báo sắp xảy ra và 正 đánh dấu đúng lúc đang diễn ra.",
    example: ["我正吃饭呢。", "Wǒ zhèng chīfàn ne.", "Tôi đang ăn cơm đây."],
    guided: ["Dùng 已经 để nói: Anh ấy đã về nhà rồi.", "他已经回家了。", "Tā yǐjīng huí jiā le.", "Anh ấy đã về nhà rồi."],
  },
  17: {
    explanationVi: "常 và 经常 là phó từ tần suất, đứng trước động từ hoặc cụm vị ngữ để diễn đạt hành động xảy ra thường xuyên.",
    example: ["我经常坐地铁上班。", "Wǒ jīngcháng zuò dìtiě shàngbān.", "Tôi thường đi tàu điện ngầm đi làm."],
    guided: ["Dùng 常 để nói: Cô ấy thường gọi cho mẹ.", "她常给妈妈打电话。", "Tā cháng gěi māma dǎ diànhuà.", "Cô ấy thường gọi cho mẹ."],
  },
  18: {
    explanationVi: "别 đứng trước động từ để tạo mệnh lệnh phủ định hoặc lời khuyên không làm việc gì; cuối câu thường có 了 hoặc 了 nhé tùy sắc thái.",
    example: ["别在这里停车。", "Bié zài zhèlǐ tíngchē.", "Đừng đỗ xe ở đây."],
    guided: ["Dùng 别 để nhắc: Đừng quên cầm vé máy bay.", "别忘了拿机票。", "Bié wàng le ná jīpiào.", "Đừng quên cầm vé máy bay."],
  },
  19: {
    explanationVi: "再 thường đặt hành động sau một mốc hoặc hành động khác; 就 nêu hành động xảy ra ngay, sớm hoặc theo điều kiện đã nói.",
    example: ["吃完饭我们再走。", "Chīwán fàn wǒmen zài zǒu.", "Ăn xong rồi chúng ta hãy đi."],
    guided: ["Dùng 就 để nói: Tôi tan học lúc năm giờ rồi về nhà ngay.", "我五点下课就回家。", "Wǒ wǔ diǎn xiàkè jiù huí jiā.", "Tôi tan học lúc năm giờ rồi về nhà ngay."],
  },
  20: {
    explanationVi: "都 và 就 có thể tạo sắc thái nhấn mạnh theo ngữ cảnh; 还是 trong câu trần thuật thường đưa ra lựa chọn hoặc lời khuyên được xem là phù hợp hơn.",
    example: ["你还是坐地铁去吧。", "Nǐ háishi zuò dìtiě qù ba.", "Bạn vẫn nên đi tàu điện ngầm thì hơn."],
    guided: ["Dùng 都…了 để nhấn mạnh: Đã mười giờ rồi.", "都十点了。", "Dōu shí diǎn le.", "Đã mười giờ rồi."],
  },
  21: {
    explanationVi: "从 đưa ra điểm bắt đầu về thời gian hoặc nơi chốn; mẫu 从…到… nêu trọn khoảng hoặc tuyến từ điểm đầu đến điểm cuối.",
    example: ["我从八点工作到五点。", "Wǒ cóng bā diǎn gōngzuò dào wǔ diǎn.", "Tôi làm việc từ tám giờ đến năm giờ."],
    guided: ["Dùng 从 để nói: Chúng tôi đi từ trường đến nhà ga.", "我们从学校走到车站。", "Wǒmen cóng xuéxiào zǒu dào chēzhàn.", "Chúng tôi đi từ trường đến nhà ga."],
  },
  22: {
    explanationVi: "往 đưa ra hướng hoặc tuyến chuyển động, đứng trước từ chỉ phương hướng/nơi chốn rồi mới đến động từ chuyển động.",
    example: ["往前走五分钟就到了。", "Wǎng qián zǒu wǔ fēnzhōng jiù dào le.", "Đi thẳng về phía trước năm phút là tới."],
    guided: ["Dùng 往右 để chỉ đường: Đi về bên phải.", "往右边走。", "Wǎng yòubian zǒu.", "Đi về bên phải."],
  },
  23: {
    explanationVi: "从 cũng có thể giới thiệu hướng, tuyến hoặc nguồn của chuyển động, giúp xác định hành động đi từ phía hay con đường nào.",
    example: ["他从门口进来了。", "Tā cóng ménkǒu jìnlái le.", "Anh ấy đã đi vào từ cửa."],
    guided: ["Dùng 从 để nói: Xe buýt đi qua từ con đường này.", "公交车从这条路开过去。", "Gōngjiāochē cóng zhè tiáo lù kāi guòqu.", "Xe buýt chạy qua từ con đường này."],
  },
  24: {
    explanationVi: "给 làm giới từ đưa người nhận hoặc đối tượng hưởng lợi ra trước động từ; cấu trúc cơ bản là 给 + người + động từ.",
    example: ["我给妈妈打电话。", "Wǒ gěi māma dǎ diànhuà.", "Tôi gọi điện cho mẹ."],
    guided: ["Dùng 给 để nói: Xin hãy mở cửa cho tôi.", "请给我开门。", "Qǐng gěi wǒ kāimén.", "Xin hãy mở cửa cho tôi."],
  },
  25: {
    explanationVi: "比 đưa chuẩn so sánh B vào mẫu A比B+vị ngữ; không thêm 很 ngay trước tính từ trong mẫu so sánh cơ bản.",
    example: ["今天比昨天冷。", "Jīntiān bǐ zuótiān lěng.", "Hôm nay lạnh hơn hôm qua."],
    guided: ["Dùng 比 để nói: Em gái tôi cao hơn tôi.", "我妹妹比我高。", "Wǒ mèimei bǐ wǒ gāo.", "Em gái tôi cao hơn tôi."],
  },
  26: {
    explanationVi: "跟 làm giới từ giới thiệu người cùng tham gia hoặc đối tượng giao tiếp; cụm 跟 + người đứng trước động từ.",
    example: ["我跟老师说了这件事。", "Wǒ gēn lǎoshī shuō le zhè jiàn shì.", "Tôi đã nói việc này với giáo viên."],
    guided: ["Dùng 跟 để nói: Cuối tuần tôi đi xem phim cùng bạn.", "周末我跟朋友去看电影。", "Zhōumò wǒ gēn péngyou qù kàn diànyǐng.", "Cuối tuần tôi đi xem phim cùng bạn."],
  },
  27: {
    explanationVi: "因为 đưa nguyên nhân ra trước sự việc chính; khi dùng như thành phần giới thiệu lý do, vế kết quả có thể không cần 所以.",
    example: ["因为下雨，我们没出去。", "Yīnwèi xiàyǔ, wǒmen méi chūqù.", "Vì trời mưa nên chúng tôi đã không ra ngoài."],
    guided: ["Dùng 因为 để nói: Vì bị ốm nên hôm nay cô ấy xin nghỉ.", "因为生病，她今天请假了。", "Yīnwèi shēngbìng, tā jīntiān qǐngjià le.", "Vì bị ốm nên hôm nay cô ấy xin nghỉ."],
  },
  28: {
    explanationVi: "跟 làm liên từ nối hai từ hoặc cụm từ có chức năng ngang hàng, tương đương 'và'; không dùng một mình để nối hai mệnh đề hoàn chỉnh.",
    example: ["我买了苹果跟别的水果。", "Wǒ mǎi le píngguǒ gēn bié de shuǐguǒ.", "Tôi đã mua táo và các loại trái cây khác."],
    guided: ["Dùng 跟 nối hai danh từ: Bố và mẹ đều ở nhà.", "爸爸跟妈妈都在家。", "Bàba gēn māma dōu zài jiā.", "Bố và mẹ đều ở nhà."],
  },
  29: {
    explanationVi: "但/但是 nối ý chuyển hướng; 虽然 thường đi với 但是, 因为 thường đi với 所以; 还是 trong câu hỏi đưa ra lựa chọn.",
    example: ["虽然很累，但是他还在工作。", "Suīrán hěn lèi, dànshì tā hái zài gōngzuò.", "Mặc dù rất mệt nhưng anh ấy vẫn đang làm việc."],
    guided: ["Dùng 因为…所以…: Vì trời lạnh nên tôi không ra ngoài.", "因为天气冷，所以我不出去。", "Yīnwèi tiānqì lěng, suǒyǐ wǒ bù chūqù.", "Vì trời lạnh nên tôi không ra ngoài."],
  },
  30: {
    explanationVi: "地 nối trạng ngữ với động từ, còn 得 nối động từ với bổ ngữ miêu tả mức độ hoặc trạng thái của hành động.",
    example: ["他高兴地说：“你写得很好。”", "Tā gāoxìng de shuō: “Nǐ xiě de hěn hǎo.”", "Anh ấy vui vẻ nói: “Bạn viết rất tốt.”"],
    guided: ["Dùng 得 để nói: Cô ấy chạy rất nhanh.", "她跑得很快。", "Tā pǎo de hěn kuài.", "Cô ấy chạy rất nhanh."],
  },
  31: {
    explanationVi: "过 đặt sau động từ để đánh dấu trải nghiệm đã từng có trước thời điểm nói; phủ định trải nghiệm dùng 没(有)…过.",
    example: ["我去过上海。", "Wǒ qùguo Shànghǎi.", "Tôi đã từng đến Thượng Hải."],
    guided: ["Dùng 没…过 để nói: Tôi chưa từng ăn món này.", "我没吃过这个菜。", "Wǒ méi chīguo zhège cài.", "Tôi chưa từng ăn món này."],
  },
  32: {
    explanationVi: "着 đặt sau động từ để biểu thị trạng thái đang được duy trì hoặc hành động làm nền; không đồng nhất với 在 đang tiến hành.",
    example: ["门开着。", "Mén kāizhe.", "Cửa đang mở."],
    guided: ["Dùng 着 để nói: Trên giường có một em bé đang ngồi.", "床上坐着一个小孩儿。", "Chuáng shàng zuòzhe yí ge xiǎoháir.", "Trên giường có một em bé đang ngồi."],
  },
  33: {
    explanationVi: "呢, 吧, 的 và 啊 là trợ từ ngữ khí: 呢 duy trì chủ đề/hỏi trạng thái, 吧 đề nghị, 的 xác nhận và 啊 tăng sắc thái cảm thán hoặc nhắc.",
    example: ["你在找什么呢？", "Nǐ zài zhǎo shénme ne?", "Bạn đang tìm gì vậy?"],
    guided: ["Dùng 吧 để đề nghị: Chúng ta nghỉ một lát nhé.", "我们休息一会儿吧。", "Wǒmen xiūxi yíhuìr ba.", "Chúng ta nghỉ một lát nhé."],
  },
  34: {
    explanationVi: "Cụm động–bổ gồm động từ và thành phần sau nó nêu kết quả, hướng, trạng thái hoặc mức độ; ý nghĩa chỉ hoàn chỉnh khi đọc cả cụm.",
    example: ["这本书我看完了。", "Zhè běn shū wǒ kànwán le.", "Tôi đã đọc xong quyển sách này."],
    guided: ["Dùng bổ ngữ kết quả 懂: Tôi đã nghe hiểu lời giáo viên.", "我听懂老师的话了。", "Wǒ tīngdǒng lǎoshī de huà le.", "Tôi đã nghe hiểu lời giáo viên."],
  },
  35: {
    explanationVi: "Cụm chữ 的 lược bỏ danh từ đã rõ, giữ lại định ngữ + 的 để đại diện cho người hoặc vật được nhắc tới.",
    example: ["红的是我的，白的是他的。", "Hóng de shì wǒ de, bái de shì tā de.", "Cái màu đỏ là của tôi, cái màu trắng là của anh ấy."],
    guided: ["Dùng cụm 的 để nói: Cái lớn là của tôi.", "大的是我的。", "Dà de shì wǒ de.", "Cái lớn là của tôi."],
  },
  36: {
    explanationVi: "Cụm liên động đặt nhiều động từ chung một chủ ngữ theo thứ tự mục đích hoặc thời gian, thường không cần liên từ ở giữa.",
    example: ["我去商店买东西。", "Wǒ qù shāngdiàn mǎi dōngxi.", "Tôi đến cửa hàng mua đồ."],
    guided: ["Tạo chuỗi liên động: Anh ấy đến trường học.", "他去学校学习。", "Tā qù xuéxiào xuéxí.", "Anh ấy đến trường học."],
  },
  37: {
    explanationVi: "Cụm kiêm ngữ có một danh ngữ vừa làm tân ngữ của động từ trước vừa làm chủ thể của động từ sau, thường gặp sau 请, 叫, 让.",
    example: ["老师请我读这个问题。", "Lǎoshī qǐng wǒ dú zhège wèntí.", "Giáo viên mời tôi đọc câu hỏi này."],
    guided: ["Dùng 让: Mẹ bảo em trai nấu cơm.", "妈妈让弟弟做饭。", "Māma ràng dìdi zuòfàn.", "Mẹ bảo em trai nấu cơm."],
  },
  38: {
    explanationVi: "什么的 đặt sau một vài ví dụ để nói còn những thứ tương tự chưa liệt kê hết, mang sắc thái khẩu ngữ.",
    example: ["我喜欢红茶、咖啡什么的。", "Wǒ xǐhuan hóngchá, kāfēi shénme de.", "Tôi thích trà đen, cà phê và những thứ tương tự."],
    guided: ["Dùng 什么的: Cuối tuần tôi thường đọc sách, nghe hát các kiểu.", "周末我常看书、听歌什么的。", "Zhōumò wǒ cháng kànshū, tīng gē shénme de.", "Cuối tuần tôi thường đọc sách, nghe hát các kiểu."],
  },
  39: {
    explanationVi: "还是……吧 dùng trong câu trần thuật để khuyên chọn phương án được cho là hợp lý hơn sau khi cân nhắc.",
    example: ["下雨了，我们还是坐车吧。", "Xiàyǔ le, wǒmen háishi zuò chē ba.", "Trời mưa rồi, chúng ta vẫn nên đi xe thì hơn."],
    guided: ["Dùng mẫu để khuyên: Muộn rồi, bạn vẫn nên về nhà đi.", "太晚了，你还是回家吧。", "Tài wǎn le, nǐ háishi huí jiā ba.", "Muộn rồi, bạn vẫn nên về nhà đi."],
  },
  40: {
    explanationVi: "要/快要/就要……了 báo một sự việc sắp xảy ra; 快要 nhấn mạnh rất gần, còn 就要 thường đi được với mốc thời gian cụ thể.",
    example: ["火车快要开了。", "Huǒchē kuàiyào kāi le.", "Tàu hỏa sắp chạy rồi."],
    guided: ["Dùng 就要…了: Còn mười phút nữa là vào học.", "还有十分钟就要上课了。", "Hái yǒu shí fēnzhōng jiùyào shàngkè le.", "Còn mười phút nữa là vào học."],
  },
  41: {
    explanationVi: "都……了 nhấn mạnh thời gian, số lượng hoặc mức độ đã đạt một mốc thường cao, muộn hoặc đáng chú ý so với kỳ vọng.",
    example: ["都十点了，你怎么还不睡？", "Dōu shí diǎn le, nǐ zěnme hái bù shuì?", "Đã mười giờ rồi, sao bạn vẫn chưa ngủ?"],
    guided: ["Dùng 都…了: Con đã mười tuổi rồi.", "孩子都十岁了。", "Háizi dōu shí suì le.", "Đứa trẻ đã mười tuổi rồi."],
  },
  42: {
    explanationVi: "Trong câu có chủ ngữ chịu tác động, đối tượng bị xử lý được đưa lên đầu câu làm chủ đề; tác nhân có thể không cần nêu.",
    example: ["饭做好了。", "Fàn zuòhǎo le.", "Cơm đã nấu xong rồi."],
    guided: ["Đưa đối tượng lên đầu: Vé đã mua xong rồi.", "票买好了。", "Piào mǎihǎo le.", "Vé đã mua xong rồi."],
  },
  43: {
    explanationVi: "Cụm danh từ có thể làm vị ngữ để nêu ngày tháng, tuổi, giá, số lượng hoặc đặc điểm phân loại mà không cần 是.",
    example: ["今天星期一。", "Jīntiān xīngqīyī.", "Hôm nay là thứ Hai."],
    guided: ["Dùng vị ngữ danh từ: Em trai tôi hai mươi tuổi.", "我弟弟二十岁。", "Wǒ dìdi èrshí suì.", "Em trai tôi hai mươi tuổi."],
  },
  44: {
    explanationVi: "Động từ, cụm động từ hoặc cụm chủ–vị đứng trước 的 để bổ nghĩa cho danh từ, cho biết hành động hay đặc điểm liên quan.",
    example: ["我昨天买的书在桌子上。", "Wǒ zuótiān mǎi de shū zài zhuōzi shàng.", "Quyển sách tôi mua hôm qua ở trên bàn."],
    guided: ["Tạo định ngữ bằng cụm chủ–vị: Đây là món mẹ tôi làm.", "这是我妈妈做的菜。", "Zhè shì wǒ māma zuò de cài.", "Đây là món mẹ tôi làm."],
  },
  45: {
    explanationVi: "错, 懂, 好, 会 và 完 đứng sau động từ để nêu kết quả: làm sai, hiểu được, hoàn tất tốt, học được hoặc hoàn thành.",
    example: ["老师说的话我听懂了。", "Lǎoshī shuō de huà wǒ tīngdǒng le.", "Tôi đã nghe hiểu lời giáo viên nói."],
    guided: ["Dùng 完 để nói: Tôi đã viết xong chữ Hán.", "我写完汉字了。", "Wǒ xiěwán Hànzì le.", "Tôi đã viết xong chữ Hán."],
  },
  46: {
    explanationVi: "Động từ + 来/去 là bổ ngữ hướng đơn: 来 chỉ chuyển động về phía người nói hoặc điểm quy chiếu, 去 chỉ rời xa.",
    example: ["老师走来了。", "Lǎoshī zǒulái le.", "Giáo viên đi về phía này."],
    guided: ["Chọn 去 để nói: Anh ấy chạy về phía kia.", "他跑去了。", "Tā pǎoqù le.", "Anh ấy chạy về phía kia."],
  },
  47: {
    explanationVi: "上, 下, 进, 出, 过 và 回 đứng sau động từ để nêu hướng cơ bản của chuyển động: lên, xuống, vào, ra, qua hoặc về.",
    example: ["学生们走进教室。", "Xuéshengmen zǒujìn jiàoshì.", "Các học sinh đi vào lớp học."],
    guided: ["Dùng 回 để nói: Anh ấy đã chạy về nhà.", "他跑回家了。", "Tā pǎohuí jiā le.", "Anh ấy đã chạy về nhà."],
  },
  48: {
    explanationVi: "Bổ ngữ hướng phức kết hợp hướng không gian với 来/去 để đồng thời chỉ tuyến chuyển động và quan hệ với điểm nhìn.",
    example: ["孩子从房间里跑出来了。", "Háizi cóng fángjiān lǐ pǎo chūlái le.", "Đứa trẻ đã chạy từ trong phòng ra đây."],
    guided: ["Dùng 进去 để nói: Anh ấy đã chạy vào trong.", "他跑进去了。", "Tā pǎo jìnqu le.", "Anh ấy đã chạy vào trong."],
  },
  49: {
    explanationVi: "Mẫu động từ + 得 + cụm tính từ miêu tả trạng thái hoặc mức độ thực hiện hành động; khi phủ định, 不 đứng trong phần bổ ngữ.",
    example: ["她汉语说得很好。", "Tā Hànyǔ shuō de hěn hǎo.", "Cô ấy nói tiếng Trung rất tốt."],
    guided: ["Dùng 得 để nói: Anh ấy chạy không nhanh.", "他跑得不快。", "Tā pǎo de bú kuài.", "Anh ấy chạy không nhanh."],
  },
  50: {
    explanationVi: "Bổ ngữ thời lượng đứng sau động từ hoặc tân ngữ để nêu hành động kéo dài bao lâu; vị trí thay đổi theo loại tân ngữ.",
    example: ["我学了两年汉语。", "Wǒ xué le liǎng nián Hànyǔ.", "Tôi đã học tiếng Trung hai năm."],
    guided: ["Nêu thời lượng: Hôm qua cô ấy ngủ tám tiếng.", "她昨天睡了八个小时。", "Tā zuótiān shuì le bā ge xiǎoshí.", "Hôm qua cô ấy ngủ tám tiếng."],
  },
  51: {
    explanationVi: "Tính từ có thể đi với cụm số lượng phía sau để nêu mức chênh lệch hoặc kích thước cụ thể, thường xuất hiện trong câu so sánh.",
    example: ["这条裤子长一点儿。", "Zhè tiáo kùzi cháng yìdiǎnr.", "Chiếc quần này dài hơn một chút."],
    guided: ["Dùng tính từ + lượng: Năm nay em trai lớn thêm một tuổi.", "弟弟今年大一岁。", "Dìdi jīnnián dà yí suì.", "Năm nay em trai lớn thêm một tuổi."],
  },
  52: {
    explanationVi: "Trong câu chủ–vị làm vị ngữ, toàn bộ cụm chủ–vị phía sau miêu tả chủ đề phía trước, như sức khỏe, tóc, mắt hoặc một bộ phận.",
    example: ["他身体很好。", "Tā shēntǐ hěn hǎo.", "Sức khỏe anh ấy rất tốt."],
    guided: ["Dùng chủ–vị làm vị ngữ: Cô gái này mắt rất to.", "这个女孩眼睛很大。", "Zhège nǚhái yǎnjing hěn dà.", "Cô gái này có đôi mắt rất to."],
  },
  53: {
    explanationVi: "Câu hỏi lựa chọn dùng 还是 nối hai phương án; người nghe phải chọn một phương án thay vì chỉ trả lời có hoặc không.",
    example: ["你喝茶还是喝咖啡？", "Nǐ hē chá háishi hē kāfēi?", "Bạn uống trà hay uống cà phê?"],
    guided: ["Tạo câu hỏi lựa chọn: Bạn đi xe buýt hay tàu điện ngầm?", "你坐公交车还是坐地铁？", "Nǐ zuò gōngjiāochē háishi zuò dìtiě?", "Bạn đi xe buýt hay tàu điện ngầm?"],
  },
  54: {
    explanationVi: "Câu cầu khiến với 别 yêu cầu hoặc khuyên người nghe không thực hiện hành động; chủ ngữ 你 thường được lược bỏ.",
    example: ["别说话，请听老师说。", "Bié shuōhuà, qǐng tīng lǎoshī shuō.", "Đừng nói chuyện, hãy nghe giáo viên nói."],
    guided: ["Tạo lời nhắc: Đừng quên viết tên.", "别忘了写名字。", "Bié wàng le xiě míngzi.", "Đừng quên viết tên."],
  },
  55: {
    explanationVi: "Câu 是 dùng để giải thích thân phận, thuộc tính hoặc đặc trưng của chủ thể; phần sau 是 cung cấp thông tin nhận diện.",
    example: ["她是新来的汉语老师。", "Tā shì xīn lái de Hànyǔ lǎoshī.", "Cô ấy là giáo viên tiếng Trung mới đến."],
    guided: ["Dùng 是 để giới thiệu đặc trưng: Đây là món tôi thích nhất.", "这是我最喜欢的菜。", "Zhè shì wǒ zuì xǐhuan de cài.", "Đây là món tôi thích nhất."],
  },
  56: {
    explanationVi: "Câu 有 có thể nêu số lượng, chiều dài, chiều sâu hoặc mức đã đạt; cụm số lượng đứng sau 有 làm thông tin đo lường.",
    example: ["这个男孩儿有一米五高。", "Zhège nánháir yǒu yì mǐ wǔ gāo.", "Cậu bé này cao một mét rưỡi."],
    guided: ["Dùng 有 để nói chiều cao đã đạt: Cô bé cao một mét.", "这个女孩儿有一米高。", "Zhège nǚháir yǒu yì mǐ gāo.", "Cô bé này cao một mét."],
  },
  57: {
    explanationVi: "Câu tồn hiện với 处所 + động từ + 着 + danh ngữ giới thiệu người/vật đang hiện diện trong một trạng thái tại nơi đó.",
    example: ["门口站着三位老师。", "Ménkǒu zhànzhe sān wèi lǎoshī.", "Ở cửa có ba giáo viên đang đứng."],
    guided: ["Dùng mẫu tồn hiện: Trong lớp có mười học sinh đang ngồi.", "教室里坐着十名学生。", "Jiàoshì lǐ zuòzhe shí míng xuésheng.", "Trong lớp có mười học sinh đang ngồi."],
  },
  58: {
    explanationVi: "Mẫu A比B+形容词 nêu A có mức độ tính chất cao hoặc thấp hơn B; tính từ đứng trực tiếp sau chuẩn so sánh.",
    example: ["今天比昨天热。", "Jīntiān bǐ zuótiān rè.", "Hôm nay nóng hơn hôm qua."],
    guided: ["So sánh hai vật: Chiếc áo này đắt hơn chiếc kia.", "这件衣服比那件贵。", "Zhè jiàn yīfu bǐ nà jiàn guì.", "Chiếc áo này đắt hơn chiếc kia."],
  },
  59: {
    explanationVi: "Sau tính từ trong câu 比 có thể thêm bổ ngữ số lượng hoặc mức độ để nêu chính xác chênh lệch giữa A và B.",
    example: ["姐姐比我大三岁。", "Jiějie bǐ wǒ dà sān suì.", "Chị gái lớn hơn tôi ba tuổi."],
    guided: ["Nêu chênh lệch: Quyển sách này đắt hơn quyển kia mười tệ.", "这本书比那本贵十块钱。", "Zhè běn shū bǐ nà běn guì shí kuài qián.", "Quyển sách này đắt hơn quyển kia mười tệ."],
  },
  60: {
    explanationVi: "Mẫu A有/没有B这么/那么+形容词 so sánh mức độ ngang bằng hoặc không bằng; 没有 thường nêu A kém B về tính chất.",
    example: ["他没有我这么忙。", "Tā méiyǒu wǒ zhème máng.", "Anh ấy không bận bằng tôi."],
    guided: ["Dùng 有…那么 để hỏi: Căn phòng này có lớn bằng căn kia không?", "这个房间有那个房间那么大吗？", "Zhège fángjiān yǒu nàge fángjiān nàme dà ma?", "Căn phòng này có lớn bằng căn kia không?"],
  },
  61: {
    explanationVi: "So sánh cách thực hiện hành động dùng A比B+动词+得+形容词 hoặc A+动词+得+比B+形容词.",
    example: ["他跑得比我快。", "Tā pǎo de bǐ wǒ kuài.", "Anh ấy chạy nhanh hơn tôi."],
    guided: ["So sánh kỹ năng: Cô ấy nói tiếng Trung hay hơn tôi.", "她汉语说得比我好。", "Tā Hànyǔ shuō de bǐ wǒ hǎo.", "Cô ấy nói tiếng Trung hay hơn tôi."],
  },
  62: {
    explanationVi: "Mẫu 是……的 nhấn mạnh thời gian, địa điểm, cách thức hoặc người thực hiện của một sự việc đã xác định, không dùng để kể sự việc mới.",
    example: ["我是去年开始学汉语的。", "Wǒ shì qùnián kāishǐ xué Hànyǔ de.", "Chính năm ngoái tôi bắt đầu học tiếng Trung."],
    guided: ["Nhấn mạnh phương tiện: Chúng tôi đến bằng tàu hỏa.", "我们是坐火车来的。", "Wǒmen shì zuò huǒchē lái de.", "Chúng tôi đến bằng tàu hỏa."],
  },
  63: {
    explanationVi: "Câu kiêm ngữ với 请/叫/让 có cấu trúc chủ ngữ + động từ sai khiến + người nhận lệnh + hành động; người nhận là chủ thể của hành động sau.",
    example: ["老师让我们写汉字。", "Lǎoshī ràng wǒmen xiě Hànzì.", "Giáo viên bảo chúng tôi viết chữ Hán."],
    guided: ["Dùng 请: Tôi mời bạn ngồi xuống.", "我请你坐下。", "Wǒ qǐng nǐ zuòxia.", "Tôi mời bạn ngồi xuống."],
  },
  64: {
    explanationVi: "Câu hai tân ngữ với động từ + 给 đặt người nhận trước vật được trao; động từ thường biểu thị trao, gửi hoặc tặng.",
    example: ["他送给我一本书。", "Tā sònggěi wǒ yì běn shū.", "Anh ấy tặng tôi một quyển sách."],
    guided: ["Dùng 给 trong câu hai tân ngữ: Mẹ tặng em trai một quyển sách.", "妈妈送给弟弟一本书。", "Māma sònggěi dìdi yì běn shū.", "Mẹ tặng em trai một quyển sách."],
  },
  65: {
    explanationVi: "Câu phức lựa chọn dùng （是）……，还是…… để đặt hai tình huống hoặc phán đoán làm phương án cần chọn.",
    example: ["是你去，还是我去？", "Shì nǐ qù, háishi wǒ qù?", "Bạn đi hay tôi đi?"],
    guided: ["Tạo câu chọn nguyên nhân: Là xe hỏng hay là bạn đến muộn?", "是车坏了，还是你来晚了？", "Shì chē huài le, háishi nǐ lái wǎn le?", "Là xe hỏng hay là bạn đến muộn?"],
  },
  66: {
    explanationVi: "虽然……但是…… nối một sự thật nhượng bộ với kết quả trái kỳ vọng; trong khẩu ngữ có thể lược một liên từ nhưng quan hệ vẫn phải rõ.",
    example: ["虽然下雨，但是我们还是去了。", "Suīrán xiàyǔ, dànshì wǒmen háishi qù le.", "Mặc dù trời mưa nhưng chúng tôi vẫn đi."],
    guided: ["Nối hai vế: Tuy món này đắt nhưng rất ngon.", "虽然这个菜很贵，但是很好吃。", "Suīrán zhège cài hěn guì, dànshì hěn hǎochī.", "Tuy món này đắt nhưng rất ngon."],
  },
  67: {
    explanationVi: "因为……所以…… nối nguyên nhân với kết quả; 因为 mở vế lý do và 所以 mở vế hệ quả, trật tự thông tin thường là nguyên nhân trước.",
    example: ["因为明天考试，所以我今天晚上要学习。", "Yīnwèi míngtiān kǎoshì, suǒyǐ wǒ jīntiān wǎnshang yào xuéxí.", "Vì ngày mai thi nên tối nay tôi phải học."],
    guided: ["Nối nguyên nhân–kết quả: Vì anh ấy bị ốm nên không đi làm.", "因为他生病了，所以没去上班。", "Yīnwèi tā shēngbìng le, suǒyǐ méi qù shàngbān.", "Vì anh ấy bị ốm nên không đi làm."],
  },
  68: {
    explanationVi: "一……就…… nêu hành động hoặc kết quả xảy ra ngay sau điều kiện/hành động đầu; hai vị trí 一 và 就 đánh dấu quan hệ kế tiếp chặt.",
    example: ["我一下课就回家。", "Wǒ yí xiàkè jiù huí jiā.", "Tôi vừa tan học là về nhà ngay."],
    guided: ["Dùng mẫu: Anh ấy vừa đến nhà là gọi điện cho mẹ.", "他一到家就给妈妈打电话。", "Tā yí dào jiā jiù gěi māma dǎ diànhuà.", "Anh ấy vừa đến nhà là gọi điện cho mẹ."],
  },
  69: {
    explanationVi: "Động từ + 着 có thể nêu trạng thái là kết quả của một hành động và đang tiếp tục, như cửa mở, đèn sáng hoặc vật được treo.",
    example: ["门开着呢。", "Mén kāizhe ne.", "Cửa vẫn đang mở."],
    guided: ["Dùng 着 nêu trạng thái: Anh ấy đang mặc quần áo màu đỏ.", "他穿着红色衣服。", "Tā chuānzhe hóngsè yīfu.", "Anh ấy đang mặc quần áo màu đỏ."],
  },
  70: {
    explanationVi: "Động từ + 着 cũng biểu thị một hành động đang duy trì làm nền cho hành động khác; hai hành động có thể cùng diễn ra.",
    example: ["他听着歌写汉字。", "Tā tīngzhe gē xiě Hànzì.", "Anh ấy vừa nghe hát vừa viết chữ Hán."],
    guided: ["Dùng 着 cho hành động nền: Cô ấy cười và nói với tôi.", "她笑着跟我说话。", "Tā xiàozhe gēn wǒ shuōhuà.", "Cô ấy cười và nói chuyện với tôi."],
  },
  71: {
    explanationVi: "Động từ + 过 đánh dấu trạng thái trải nghiệm, cho biết sự việc từng xảy ra ít nhất một lần nhưng không nhấn mạnh thời điểm cụ thể.",
    example: ["你吃过中国饺子吗？", "Nǐ chīguo Zhōngguó jiǎozi ma?", "Bạn đã từng ăn sủi cảo Trung Quốc chưa?"],
    guided: ["Trả lời phủ định bằng 没…过: Tôi chưa từng xem bộ phim đó.", "我没看过那个电影。", "Wǒ méi kànguo nàge diànyǐng.", "Tôi chưa từng xem bộ phim đó."],
  },
  72: {
    explanationVi: "Trong một số chuỗi quen thuộc như tầng, lớp hoặc tuyến, số từ + lượng từ có thể biểu thị thứ tự mà không cần 第; phải dựa vào danh từ và ngữ cảnh.",
    example: ["我家住三楼。", "Wǒ jiā zhù sān lóu.", "Nhà tôi ở tầng ba."],
    guided: ["Dùng số + lượng từ để nói thứ tự tầng: Lớp học ở tầng năm.", "教室在五楼。", "Jiàoshì zài wǔ lóu.", "Lớp học ở tầng năm."],
  },
  73: {
    explanationVi: "几 đặt trước lượng từ để nêu số lượng ước chừng nhỏ hoặc phần lẻ chưa xác định, như 十几个人 hay 几十块钱.",
    example: ["教室里有十几个学生。", "Jiàoshì lǐ yǒu shí jǐ ge xuésheng.", "Trong lớp có hơn mười học sinh."],
    guided: ["Dùng 几 nêu ước lượng: Chiếc áo này giá vài chục tệ.", "这件衣服几十块钱。", "Zhè jiàn yīfu jǐshí kuài qián.", "Chiếc áo này giá vài chục tệ."],
  },
  74: {
    explanationVi: "Mẫu số từ + 多 + lượng từ nêu số lượng vượt một mốc tròn nhưng chưa tới mốc kế tiếp, thường gặp với 十, 百, 千.",
    example: ["这个班有三十多名学生。", "Zhège bān yǒu sānshí duō míng xuésheng.", "Lớp này có hơn ba mươi học sinh."],
    guided: ["Dùng số + 多 + lượng từ: Trường học có hơn một trăm người.", "学校有一百多人。", "Xuéxiào yǒu yì bǎi duō rén.", "Trường học có hơn một trăm người."],
  },
  75: {
    explanationVi: "Mẫu số từ + lượng từ + 多 nêu lượng vượt con số đã nói một phần nhỏ, như 三岁多 hoặc 五公里多.",
    example: ["这个孩子三岁多了。", "Zhège háizi sān suì duō le.", "Đứa trẻ này hơn ba tuổi."],
    guided: ["Dùng số + lượng từ + 多: Anh ấy đã sống ở Trung Quốc hơn một năm.", "他在中国住了一年多。", "Tā zài Zhōngguó zhù le yì nián duō.", "Anh ấy đã sống ở Trung Quốc hơn một năm."],
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

export const buildHsk2GrammarContext = (root = process.cwd()) => {
  const blueprintBundle = loadHsk2LessonBlueprintsBundle(root);
  assertValidHsk2LessonBlueprintsBundle(blueprintBundle);
  const inventory = blueprintBundle.scopeBundle.graphBundle.syllabus.inventory;
  const officialGrammarRows = inventory.grammarRows.filter(
    (item) => item.level === 2,
  );
  const sentenceChainLessons = blueprintBundle.pack.lessons.filter(
    (lesson) => lesson.blueprintKind === "sentence-chain",
  );
  const grammarLessonPairs = sentenceChainLessons.flatMap((lesson) =>
    lesson.inventoryMappings.grammarRowIds.map((grammarRowId) => ({
      grammarRowId,
      lessonId: lesson.lessonId,
      unitId: lesson.unitId,
      trackId: lesson.trackId,
    }))
  );
  exactPartition(
    "HSK2 grammar lesson mappings",
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
      trackId: lessonMapping.trackId,
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
    releaseEligible: false,
  }));
  const reviewBatches = sentenceChainLessons.map((lesson) => ({
    batchId: `${lesson.lessonId}:grammar-review-v1`,
    lessonId: lesson.lessonId,
    grammarRowIds: [...lesson.inventoryMappings.grammarRowIds],
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
    packId: "hsk2-grammar-context-2026.07",
    level: 2,
    state: "ai-assisted-draft",
    learnerVisible: false,
    releaseEligible: false,
    source: {
      scopeId: blueprintBundle.scopeBundle.scope.scopeId,
      syllabusInventorySha256:
        blueprintBundle.scopeBundle.graphBundle.syllabus.inventorySha256,
      lessonBlueprintPackId: blueprintBundle.pack.packId,
      lessonBlueprintPackSha256: fileSha256(blueprintBundle.packPath),
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
      lessonBlueprints: blueprintBundle.pack.lessons.length,
      sentenceChainLessons: sentenceChainLessons.length,
      grammarDrafts: grammarDrafts.length,
      modelExamples: grammarDrafts.length,
      guidedPracticeItems: practiceItems.length,
      reviewBatches: reviewBatches.length,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    },
    coverageClaims: {
      officialGrammarInventoryDraftMapped: true,
      grammarContextDraftComplete: true,
      reviewedGrammarContentComplete: false,
      measurementCoverageComplete: false,
      hsk2Complete: false,
    },
    grammarDrafts,
    practiceItems,
    reviewBatches,
  };
};

export const serializeHsk2GrammarContext = (pack) =>
  `${JSON.stringify(pack, null, 2)}\n`;

const main = () => {
  const root = process.cwd();
  const outputPath = join(root, HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH);
  const serialized = serializeHsk2GrammarContext(
    buildHsk2GrammarContext(root),
  );
  if (process.argv.includes("--write")) {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (process.argv.includes("--check")) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK2 grammar-context pack is stale");
    }
  } else {
    process.stdout.write(serialized);
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH,
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
