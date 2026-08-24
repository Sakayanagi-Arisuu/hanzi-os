import type { ReaderChapter } from "../readerContentModel";
import { createReaderSamplerChapter as create } from "./readerSamplerFactory";

export const READER_SHELF_CHAPTERS: Record<string, ReaderChapter> = {
  "van-menh-nguoc-dong-c01": create("van-menh-nguoc-dong", [
    {
      markedZhHans: "谢宁睁开眼，先[[听见]]试剑台上的钟声，再[[看见]]自己年轻的双手。三十年后的伤口不见了，桌上的日历却停在他失去灵根的那一天。",
      pinyin: "Xiè Níng zhēngkāi yǎn, xiān tīngjiàn shìjiàntái shàng de zhōngshēng, zài kànjiàn zìjǐ niánqīng de shuāngshǒu. Sānshí nián hòu de shāngkǒu bú jiàn le, zhuō shàng de rìlì què tíng zài tā shīqù línggēn de nà yì tiān.",
      vi: "Tạ Ninh mở mắt, trước tiên nghe tiếng chuông trên đài thử kiếm, rồi nhìn thấy đôi tay trẻ của mình. Vết thương ba mươi năm sau đã biến mất, còn cuốn lịch dừng đúng ngày cậu mất linh căn.",
    },
    {
      markedZhHans: "门外的师弟叫他去抽签。谢宁[[记得]]，上一世他抽到第一号，也在众人面前做了最坏的[[选择]]。这一次，他把手伸进木箱，却没有立刻拿出竹签。",
      pinyin: "Mén wài de shīdì jiào tā qù chōuqiān. Xiè Níng jìde, shàng yí shì tā chōu dào dì-yī hào, yě zài zhòngrén miànqián zuò le zuì huài de xuǎnzé. Zhè yí cì, tā bǎ shǒu shēn jìn mùxiāng, què méiyǒu lìkè ná chū zhúqiān.",
      vi: "Sư đệ ngoài cửa gọi cậu đi rút thăm. Tạ Ninh nhớ kiếp trước mình đã rút số một và đưa ra lựa chọn tệ nhất trước mọi người. Lần này, cậu thò tay vào hộp gỗ nhưng không lập tức lấy thẻ tre ra.",
    },
    {
      markedZhHans: "箱底有一张从未出现过的黑签，上面只有一句话：‘七日之内，找回你真正失去的东西。’谢宁终于[[明白]]，回来的不只是[[时间]]，还有一个没人知道的任务。",
      pinyin: "Xiāng dǐ yǒu yì zhāng cóngwèi chūxiànguò de hēiqiān, shàngmiàn zhǐyǒu yí jù huà: ‘Qī rì zhī nèi, zhǎohuí nǐ zhēnzhèng shīqù de dōngxi.’ Xiè Níng zhōngyú míngbai, huílai de bù zhǐshì shíjiān, hái yǒu yí ge méi rén zhīdào de rènwu.",
      vi: "Dưới đáy hộp có một thẻ đen chưa từng xuất hiện, trên đó chỉ có một câu: ‘Trong bảy ngày, hãy tìm lại thứ ngươi thật sự đánh mất.’ Tạ Ninh cuối cùng hiểu rằng thứ quay lại không chỉ là thời gian, mà còn là một nhiệm vụ không ai biết.",
    },
  ]),
  "kiem-lo-muoi-bac-c01": create("kiem-lo-muoi-bac", [
    {
      markedZhHans: "顾川每天给山上的剑门送信，却从来不能走过第一层石阶。那天清晨，他在路边[[发现]]一把生锈的旧剑，剑柄上没有[[名字]]，只有十个很浅的圆点。",
      pinyin: "Gù Chuān měitiān gěi shān shàng de jiànmén sòngxìn, què cónglái bù néng zǒuguò dì-yī céng shíjiē. Nà tiān qīngchén, tā zài lùbiān fāxiàn yì bǎ shēngxiù de jiùjiàn, jiànbǐng shàng méiyǒu míngzi, zhǐyǒu shí ge hěn qiǎn de yuándiǎn.",
      vi: "Mỗi ngày Cố Xuyên đưa thư lên kiếm môn nhưng chưa bao giờ đi qua được bậc đá đầu tiên. Sáng hôm đó, cậu phát hiện một thanh kiếm rỉ bên đường; trên chuôi không có tên, chỉ có mười chấm tròn rất mờ.",
    },
    {
      markedZhHans: "守门弟子笑他没有灵根，叫他把破剑扔掉。顾川没有回答，只把跌倒的老人扶起来。老人站稳时，第一个圆点[[突然]]亮了，旧剑也发出像呼吸一样的[[声音]]。",
      pinyin: "Shǒumén dìzǐ xiào tā méiyǒu línggēn, jiào tā bǎ pòjiàn rēngdiào. Gù Chuān méiyǒu huídá, zhǐ bǎ diēdǎo de lǎorén fú qǐlai. Lǎorén zhànwěn shí, dì-yī ge yuándiǎn tūrán liàng le, jiùjiàn yě fāchū xiàng hūxī yíyàng de shēngyīn.",
      vi: "Đệ tử giữ cổng cười cậu không có linh căn và bảo vứt thanh kiếm hỏng đi. Cố Xuyên không đáp, chỉ đỡ ông lão bị ngã dậy. Khi ông đứng vững, chấm tròn đầu tiên đột nhiên sáng lên và thanh kiếm cũ phát ra âm thanh như hơi thở.",
    },
    {
      markedZhHans: "石阶前出现一行金色的字：‘剑路不问天赋，只问你是否[[继续]]。’顾川握住剑，向前走了一步。第二层石阶从云里慢慢露了出来。",
      pinyin: "Shíjiē qián chūxiàn yì háng jīnsè de zì: ‘Jiànlù bú wèn tiānfù, zhǐ wèn nǐ shìfǒu jìxù.’ Gù Chuān wòzhù jiàn, xiàng qián zǒu le yí bù. Dì-èr céng shíjiē cóng yún lǐ mànmàn lù le chūlai.",
      vi: "Trước bậc đá hiện ra một hàng chữ vàng: ‘Kiếm lộ không hỏi thiên phú, chỉ hỏi ngươi có tiếp tục hay không.’ Cố Xuyên nắm kiếm và bước lên một bước. Bậc đá thứ hai từ từ lộ ra trong mây.",
    },
  ]),
  "dao-mam-giua-tuyet-c01": create("dao-mam-giua-tuyet", [
    {
      markedZhHans: "大雪封山以后，药园里只剩阿木一个人。他每天给冻硬的土地浇温水，师兄们都说这是没有[[答案]]的事。第七天早上，他在雪下[[看见]]一点绿色。",
      pinyin: "Dàxuě fēngshān yǐhòu, yàoyuán lǐ zhǐ shèng Ā Mù yí ge rén. Tā měitiān gěi dòngyìng de tǔdì jiāo wēnshuǐ, shīxiōngmen dōu shuō zhè shì méiyǒu dá'àn de shì. Dì-qī tiān zǎoshang, tā zài xuě xià kànjiàn yìdiǎn lǜsè.",
      vi: "Sau khi tuyết lớn phong núi, vườn thuốc chỉ còn một mình A Mộc. Mỗi ngày cậu tưới nước ấm lên mặt đất đông cứng, các sư huynh đều nói đây là việc không có đáp án. Sáng ngày thứ bảy, cậu nhìn thấy một chấm xanh dưới tuyết.",
    },
    {
      markedZhHans: "嫩叶上写着一个小小的[[问题]]：‘你想让它活，还是想证明自己没有错？’阿木坐了很久。他第一次[[发现]]，自己一直看着书里的方法，却没有看过这片土地。",
      pinyin: "Nènyè shàng xiězhe yí ge xiǎoxiǎo de wèntí: ‘Nǐ xiǎng ràng tā huó, háishi xiǎng zhèngmíng zìjǐ méiyǒu cuò?’ Ā Mù zuò le hěn jiǔ. Tā dì-yī cì fāxiàn, zìjǐ yìzhí kànzhe shū lǐ de fāngfǎ, què méiyǒu kànguo zhè piàn tǔdì.",
      vi: "Trên chiếc lá non có một câu hỏi nhỏ: ‘Ngươi muốn nó sống, hay muốn chứng minh mình không sai?’ A Mộc ngồi rất lâu. Lần đầu cậu phát hiện mình luôn nhìn phương pháp trong sách mà chưa từng nhìn mảnh đất này.",
    },
    {
      markedZhHans: "他移开挡住晨光的木板，又在园边挖出一条水沟。太阳升起时，第二片叶子慢慢[[打开]]。这一次，叶上没有字，只有一滴清亮的水。",
      pinyin: "Tā yíkāi dǎngzhù chénguāng de mùbǎn, yòu zài yuánbiān wā chū yì tiáo shuǐgōu. Tàiyáng shēngqǐ shí, dì-èr piàn yèzi mànmàn dǎkāi. Zhè yí cì, yè shàng méiyǒu zì, zhǐyǒu yì dī qīngliàng de shuǐ.",
      vi: "Cậu dời tấm ván chắn ánh sáng sớm rồi đào một rãnh nước bên vườn. Khi mặt trời lên, chiếc lá thứ hai từ từ mở ra. Lần này trên lá không có chữ, chỉ có một giọt nước trong.",
    },
  ]),
  "tro-lai-truoc-con-mua-c01": create("tro-lai-truoc-con-mua", [
    {
      markedZhHans: "林河醒来时，窗外还是十年前的旧街。墙上的日历写着六月十七日，离那场大雨还有三天。她摸到没有裂痕的手机，终于[[相信]]自己真的回来了。",
      pinyin: "Lín Hé xǐnglái shí, chuāngwài háishi shí nián qián de jiùjiē. Qiáng shàng de rìlì xiězhe liù yuè shíqī rì, lí nà chǎng dàyǔ hái yǒu sān tiān. Tā mō dào méiyǒu lièhén de shǒujī, zhōngyú xiāngxìn zìjǐ zhēn de huílai le.",
      vi: "Khi Lâm Hà tỉnh dậy, ngoài cửa sổ vẫn là con phố cũ mười năm trước. Lịch trên tường ghi ngày 17 tháng 6, còn ba ngày nữa tới trận mưa lớn. Chạm vào chiếc điện thoại chưa nứt, cô cuối cùng tin mình thật sự đã trở lại.",
    },
    {
      markedZhHans: "厨房里，父亲正在做早饭，妹妹还没有离家。林河[[记得]]，上一世自己因为一句生气的话关上了[[门]]，也错过了最后一次解释。她站在门口，却不知道先说什么。",
      pinyin: "Chúfáng lǐ, fùqīn zhèngzài zuò zǎofàn, mèimei hái méiyǒu líjiā. Lín Hé jìde, shàng yí shì zìjǐ yīnwèi yí jù shēngqì de huà guānshàng le mén, yě cuòguò le zuìhòu yí cì jiěshì. Tā zhàn zài ménkǒu, què bù zhīdào xiān shuō shénme.",
      vi: "Trong bếp, cha đang làm bữa sáng và em gái vẫn chưa rời nhà. Lâm Hà nhớ kiếp trước mình đã đóng cửa vì một câu nói tức giận và bỏ lỡ lần giải thích cuối cùng. Cô đứng ở cửa mà không biết nên nói gì trước.",
    },
    {
      markedZhHans: "桌上的天气预报说今天晴天，杯子下面却压着一张湿纸：‘不要阻止那场雨。’字迹和她的一模一样。林河[[决定]]先找到写这句话的人。",
      pinyin: "Zhuō shàng de tiānqì yùbào shuō jīntiān qíngtiān, bēizi xiàmiàn què yāzhe yì zhāng shīzhǐ: ‘Bú yào zǔzhǐ nà chǎng yǔ.’ Zìjì hé tā de yìmúyíyàng. Lín Hé juédìng xiān zhǎodào xiě zhè jù huà de rén.",
      vi: "Dự báo thời tiết trên bàn nói hôm nay trời quang, nhưng dưới chiếc cốc lại có tờ giấy ướt: ‘Đừng ngăn trận mưa ấy.’ Nét chữ giống hệt của cô. Lâm Hà quyết định trước tiên phải tìm người viết câu này.",
    },
  ]),
  "nhat-ky-ngay-mai-c01": create("nhat-ky-ngay-mai", [
    {
      markedZhHans: "周宇的日记每天半夜多出一页。第一页告诉他考试会改时间，第二页提醒他别走东门，两件事后来都真的发生了。到了星期五，纸上只写着他[[朋友]]的名字。",
      pinyin: "Zhōu Yǔ de rìjì měitiān bànyè duō chū yí yè. Dì-yī yè gàosu tā kǎoshì huì gǎi shíjiān, dì-èr yè tíxǐng tā bié zǒu dōngmén, liǎng jiàn shì hòulái dōu zhēn de fāshēng le. Dào le xīngqīwǔ, zhǐ shàng zhǐ xiězhe tā péngyou de míngzi.",
      vi: "Nhật ký của Châu Dư mỗi nửa đêm lại có thêm một trang. Trang đầu báo bài thi sẽ đổi giờ, trang thứ hai nhắc đừng đi cổng đông; cả hai việc sau đó đều xảy ra. Tới thứ sáu, trên giấy chỉ viết tên người bạn của cậu.",
    },
    {
      markedZhHans: "下面还有一句话：‘明天十二点，不要[[帮助]]他。’周宇读了三遍，还是不[[明白]]。窗外的雨刚停，好友陈墨却发来消息，请他明天一定去旧体育馆。",
      pinyin: "Xiàmiàn hái yǒu yí jù huà: ‘Míngtiān shí'èr diǎn, bú yào bāngzhù tā.’ Zhōu Yǔ dú le sān biàn, háishi bù míngbai. Chuāngwài de yǔ gāng tíng, hǎoyǒu Chén Mò què fālái xiāoxi, qǐng tā míngtiān yídìng qù jiù tǐyùguǎn.",
      vi: "Bên dưới còn một câu: ‘Mười hai giờ ngày mai, đừng giúp cậu ấy.’ Châu Dư đọc ba lần vẫn không hiểu. Mưa ngoài cửa sổ vừa dứt thì bạn thân Trần Mặc nhắn rằng ngày mai nhất định phải tới nhà thể chất cũ.",
    },
    {
      markedZhHans: "周宇把日记锁进抽屉。灯关掉以后，抽屉里面又传来写字的[[声音]]。新的一行慢慢出现：‘如果你去了，写下这句话的人就会消失。’",
      pinyin: "Zhōu Yǔ bǎ rìjì suǒ jìn chōuti. Dēng guāndiào yǐhòu, chōuti lǐmiàn yòu chuánlái xiězì de shēngyīn. Xīn de yì háng mànmàn chūxiàn: ‘Rúguǒ nǐ qù le, xiěxià zhè jù huà de rén jiù huì xiāoshī.’",
      vi: "Châu Dư khóa nhật ký vào ngăn kéo. Sau khi tắt đèn, bên trong lại vang lên tiếng viết chữ. Một dòng mới từ từ xuất hiện: ‘Nếu cậu đi, người viết câu này sẽ biến mất.’",
    },
  ]),
  "nguoi-canh-giu-lan-hai-c01": create("nguoi-canh-giu-lan-hai", [
    {
      markedZhHans: "城门的第一声钟响时，许科正好回到二十岁。他[[记得]]今天的每一件事：队长会迟到，北墙会起火，而自己会在夜里[[打开]]不该打开的门。",
      pinyin: "Chéngmén de dì-yī shēng zhōng xiǎng shí, Xǔ Kē zhènghǎo huídào èrshí suì. Tā jìde jīntiān de měi yí jiàn shì: duìzhǎng huì chídào, běiqiáng huì qǐhuǒ, ér zìjǐ huì zài yèlǐ dǎkāi bù gāi dǎkāi de mén.",
      vi: "Khi tiếng chuông đầu tiên ở cổng thành vang lên, Hứa Kha vừa trở lại tuổi hai mươi. Anh nhớ mọi việc hôm nay: đội trưởng sẽ tới muộn, tường bắc sẽ cháy và chính anh sẽ mở cánh cửa không nên mở vào ban đêm.",
    },
    {
      markedZhHans: "这一次，他提前换掉钥匙，也把火药搬到[[安全]]的地方。可是太阳落下时，门外还是出现了一个穿黑衣的人。那个人抬起头，竟然有一张和许科一样的脸。",
      pinyin: "Zhè yí cì, tā tíqián huàndiào yàoshi, yě bǎ huǒyào bān dào ānquán de dìfang. Kěshì tàiyáng luòxià shí, ménwài háishi chūxiàn le yí ge chuān hēiyī de rén. Nà ge rén táiqǐ tóu, jìngrán yǒu yì zhāng hé Xǔ Kē yíyàng de liǎn.",
      vi: "Lần này anh đổi chìa khóa trước và chuyển thuốc nổ tới nơi an toàn. Nhưng khi mặt trời lặn, ngoài cổng vẫn xuất hiện một người áo đen. Người ấy ngẩng đầu, có khuôn mặt giống hệt Hứa Kha.",
    },
    {
      markedZhHans: "黑衣人把一张旧[[地图]]塞进门缝：‘你上一次关错了门。’许科还没来得及问，第二声钟已经响起。地图上，一条从未来回来的路开始发光。",
      pinyin: "Hēiyīrén bǎ yì zhāng jiù dìtú sāi jìn ménfèng: ‘Nǐ shàng yí cì guāncuò le mén.’ Xǔ Kē hái méi láidejí wèn, dì-èr shēng zhōng yǐjīng xiǎngqǐ. Dìtú shàng, yì tiáo cóng wèilái huílai de lù kāishǐ fāguāng.",
      vi: "Người áo đen nhét một tấm bản đồ cũ qua khe cửa: ‘Lần trước ngươi đã đóng nhầm cổng.’ Hứa Kha chưa kịp hỏi thì tiếng chuông thứ hai đã vang. Trên bản đồ, một con đường trở về từ tương lai bắt đầu phát sáng.",
    },
  ]),
};
