import type { ReaderChapter } from "../readerContentModel";
import { createReaderShelfChapter as create } from "./readerSamplerFactory";

export const READER_SHELF_CHAPTERS: Record<string, ReaderChapter> = {
  "van-menh-nguoc-dong-c02": create("van-menh-nguoc-dong", 2, [
    {
      markedZhHans: "谢宁把黑签放在灯下，原来的任务慢慢消失，换成了师妹苏遥的名字。可他清楚记得，上一世的苏遥直到十年后才进入山门。",
      pinyin: "Xiè Níng bǎ hēiqiān fàng zài dēng xià, yuánlái de rènwu mànmàn xiāoshī, huàn chéng le shīmèi Sū Yáo de míngzi. Kě tā qīngchu jìde, shàng yí shì de Sū Yáo zhídào shí nián hòu cái jìnrù shānmén.",
      vi: "Tạ Ninh đặt thẻ đen dưới đèn; nhiệm vụ cũ dần biến mất và đổi thành tên sư muội Tô Dao. Nhưng cậu nhớ rõ kiếp trước phải mười năm sau cô mới vào sơn môn.",
    },
    {
      markedZhHans: "他在药园找到七岁的苏遥，她正守着一只受伤的白鸟。白鸟脚上系着同样的黑线，线的另一头指向封闭多年的剑库。",
      pinyin: "Tā zài yàoyuán zhǎodào qī suì de Sū Yáo, tā zhèng shǒuzhe yì zhī shòushāng de báiniǎo. Báiniǎo jiǎo shàng jìzhe tóngyàng de hēixiàn, xiàn de lìng yì tóu zhǐxiàng fēngbì duō nián de jiànkù.",
      vi: "Cậu tìm thấy Tô Dao bảy tuổi trong vườn thuốc, đang trông một con chim trắng bị thương. Chân chim buộc sợi chỉ đen giống hệt, đầu kia hướng về kho kiếm đã đóng nhiều năm.",
    },
  ]),
  "kiem-lo-muoi-bac-c02": create("kiem-lo-muoi-bac", 2, [
    {
      markedZhHans: "第二层石阶没有敌人，只有一位背着孩子的妇人。石门上的字要求顾川独自通过，否则旧剑永远不会认主。",
      pinyin: "Dì-èr céng shíjiē méiyǒu dírén, zhǐyǒu yí wèi bēizhe háizi de fùrén. Shímén shàng de zì yāoqiú Gù Chuān dúzì tōngguò, fǒuzé jiùjiàn yǒngyuǎn bú huì rènzhǔ.",
      vi: "Bậc đá thứ hai không có kẻ địch, chỉ có một phụ nữ đang cõng con. Chữ trên cửa đá yêu cầu Cố Xuyên đi qua một mình, nếu không kiếm cũ sẽ mãi không nhận chủ.",
    },
    {
      markedZhHans: "顾川把剑留在门前，先帮妇人走过风口。第二个圆点没有亮，石门却自己打开：真正的考验，是他愿不愿意放下答案。",
      pinyin: "Gù Chuān bǎ jiàn liú zài mén qián, xiān bāng fùrén zǒuguò fēngkǒu. Dì-èr ge yuándiǎn méiyǒu liàng, shímén què zìjǐ dǎkāi: zhēnzhèng de kǎoyàn, shì tā yuàn-bú-yuànyì fàngxià dá'àn.",
      vi: "Cố Xuyên để kiếm trước cửa rồi giúp hai mẹ con qua cửa gió. Chấm thứ hai không sáng nhưng cửa đá tự mở: khảo nghiệm thật sự là cậu có chịu buông đáp án hay không.",
    },
  ]),
  "dao-mam-giua-tuyet-c02": create("dao-mam-giua-tuyet", 2, [
    {
      markedZhHans: "第二天，药园里只有一小块地方照到太阳。阿木跟着那道光移动木板，发现每次光停下，雪下都会出现一种不同的种子。",
      pinyin: "Dì-èr tiān, yàoyuán lǐ zhǐyǒu yì xiǎokuài dìfang zhào dào tàiyáng. Ā Mù gēnzhe nà dào guāng yídòng mùbǎn, fāxiàn měi cì guāng tíngxià, xuě xià dōu huì chūxiàn yì zhǒng bùtóng de zhǒngzi.",
      vi: "Ngày hôm sau chỉ một khoảng nhỏ trong vườn thuốc có nắng. A Mộc dời tấm ván theo vệt sáng và nhận ra mỗi nơi ánh sáng dừng lại đều có một loại hạt khác dưới tuyết.",
    },
    {
      markedZhHans: "他没有马上把所有种子挖出来，而是画下阳光走过的路线。傍晚，路线连成一个字：等。阿木终于懂得，照顾也包括等待。",
      pinyin: "Tā méiyǒu mǎshàng bǎ suǒyǒu zhǒngzi wā chūlai, érshì huàxià yángguāng zǒuguò de lùxiàn. Bàngwǎn, lùxiàn lián chéng yí ge zì: děng. Ā Mù zhōngyú dǒngde, zhàogù yě bāokuò děngdài.",
      vi: "Cậu không đào tất cả hạt lên ngay mà vẽ lại đường đi của nắng. Chiều xuống, đường ấy nối thành chữ ‘đợi’. A Mộc hiểu rằng chăm sóc cũng bao gồm chờ đợi.",
    },
  ]),
  "tro-lai-truoc-con-mua-c02": create("tro-lai-truoc-con-mua", 2, [
    {
      markedZhHans: "林河沿着湿纸留下的水点走到旧车站。长椅上坐着一个戴帽子的女人，她手里拿着明天才会出版的报纸。",
      pinyin: "Lín Hé yánzhe shīzhǐ liúxià de shuǐdiǎn zǒu dào jiù chēzhàn. Chángyǐ shàng zuòzhe yí ge dài màozi de nǚrén, tā shǒu lǐ názhe míngtiān cái huì chūbǎn de bàozhǐ.",
      vi: "Lâm Hà lần theo những giọt nước từ mảnh giấy tới bến xe cũ. Trên ghế dài là một phụ nữ đội mũ, cầm tờ báo phải tới ngày mai mới phát hành.",
    },
    {
      markedZhHans: "女人抬头时，林河认出那是十年后的妹妹。她说大雨不能被阻止，因为真正要改变的不是天气，而是三个人关门以前说出的那句话。",
      pinyin: "Nǚrén táitóu shí, Lín Hé rènchū nà shì shí nián hòu de mèimei. Tā shuō dàyǔ bù néng bèi zǔzhǐ, yīnwèi zhēnzhèng yào gǎibiàn de bú shì tiānqì, érshì sān ge rén guānmén yǐqián shuōchū de nà jù huà.",
      vi: "Khi người phụ nữ ngẩng đầu, Lâm Hà nhận ra đó là em gái mười năm sau. Cô nói không thể ngăn cơn mưa; điều cần đổi không phải thời tiết mà là câu ba người nói trước khi đóng cửa.",
    },
  ]),
  "nhat-ky-ngay-mai-c02": create("nhat-ky-ngay-mai", 2, [
    {
      markedZhHans: "第二天十一点五十分，周宇还是来到旧体育馆。陈墨站在空荡荡的球场中间，面前放着一本和那本日记完全一样的书。",
      pinyin: "Dì-èr tiān shíyī diǎn wǔshí fēn, Zhōu Yǔ háishi láidào jiù tǐyùguǎn. Chén Mò zhàn zài kōngdàngdàng de qiúchǎng zhōngjiān, miànqián fàngzhe yì běn hé nà běn rìjì wánquán yíyàng de shū.",
      vi: "Mười một giờ năm mươi hôm sau, Châu Dư vẫn tới nhà thể chất cũ. Trần Mặc đứng giữa sân bóng trống, trước mặt là cuốn sách giống hệt quyển nhật ký.",
    },
    {
      markedZhHans: "十二点一到，两本书同时写字。周宇的书说不要救朋友，陈墨的书却说不要相信周宇。两个人第一次明白，明天也许不止有一个版本。",
      pinyin: "Shí'èr diǎn yí dào, liǎng běn shū tóngshí xiězì. Zhōu Yǔ de shū shuō bú yào jiù péngyou, Chén Mò de shū què shuō bú yào xiāngxìn Zhōu Yǔ. Liǎng ge rén dì-yī cì míngbai, míngtiān yěxǔ bù zhǐ yǒu yí ge bǎnběn.",
      vi: "Đúng mười hai giờ, cả hai sách cùng viết. Sách của Châu Dư bảo đừng cứu bạn, còn sách của Trần Mặc bảo đừng tin Châu Dư. Họ hiểu rằng ngày mai có lẽ có nhiều hơn một phiên bản.",
    },
  ]),
  "nguoi-canh-giu-lan-hai-c02": create("nguoi-canh-giu-lan-hai", 2, [
    {
      markedZhHans: "黑衣人说，未来的城不是被敌军打破的，而是被永远关上的大门困死的。许科不相信，直到对方说出只有他知道的童年秘密。",
      pinyin: "Hēiyīrén shuō, wèilái de chéng bú shì bèi díjūn dǎpò de, érshì bèi yǒngyuǎn guānshàng de dàmén kùnsǐ de. Xǔ Kē bù xiāngxìn, zhídào duìfāng shuōchū zhǐyǒu tā zhīdào de tóngnián mìmì.",
      vi: "Người áo đen nói thành trì tương lai không bị quân địch phá mà chết ngạt vì cổng đóng vĩnh viễn. Hứa Kha không tin cho tới khi đối phương nói ra bí mật tuổi thơ chỉ anh biết.",
    },
    {
      markedZhHans: "第三声钟前，许科必须让一队难民进城，也必须找到藏在其中的放火者。他把钥匙分成两半：一半交给过去的自己，一半交给未来的自己。",
      pinyin: "Dì-sān shēng zhōng qián, Xǔ Kē bìxū ràng yí duì nànmín jìnchéng, yě bìxū zhǎodào cáng zài qízhōng de fànghuǒzhě. Tā bǎ yàoshi fēn chéng liǎng bàn: yí bàn jiāogěi guòqù de zìjǐ, yí bàn jiāogěi wèilái de zìjǐ.",
      vi: "Trước tiếng chuông thứ ba, Hứa Kha phải cho một nhóm người tị nạn vào thành và tìm kẻ phóng hỏa ẩn trong đó. Anh bẻ chìa khóa làm đôi: một nửa cho mình quá khứ, một nửa cho mình tương lai.",
    },
  ]),
  "hoc-vien-bay-ngon-lua-c02": create("hoc-vien-bay-ngon-lua", 2, [
    {
      markedZhHans: "入学考试开始后，叶蓝发现第七题周围有一圈黑色的光。别人看见的是普通地图，她却看见地图下面藏着另一条通往禁塔的路。",
      pinyin: "Rùxué kǎoshì kāishǐ hòu, Yè Lán fāxiàn dì-qī tí zhōuwéi yǒu yì quān hēisè de guāng. Biérén kànjiàn de shì pǔtōng dìtú, tā què kànjiàn dìtú xiàmiàn cángzhe lìng yì tiáo tōngwǎng jìntǎ de lù.",
      vi: "Sau khi thi nhập học bắt đầu, Diệp Lam thấy một vòng sáng đen quanh câu bảy. Người khác thấy bản đồ thường, còn cô thấy bên dưới giấu một đường khác tới tháp cấm.",
    },
    {
      markedZhHans: "她没有填写答案，而是在纸上画出隐藏的路线。无色火焰立刻变成银色，监考老师也第一次露出害怕的表情。",
      pinyin: "Tā méiyǒu tiánxiě dá'àn, érshì zài zhǐ shàng huàchū yǐncáng de lùxiàn. Wúsè huǒyàn lìkè biàn chéng yínsè, jiānkǎo lǎoshī yě dì-yī cì lùchū hàipà de biǎoqíng.",
      vi: "Cô không điền đáp án mà vẽ tuyến đường bị giấu. Ngọn lửa không màu lập tức hóa bạc, và giám thị lần đầu để lộ vẻ sợ hãi.",
    },
  ]),
  "phap-su-ca-dem-c02": create("phap-su-ca-dem", 2, [
    {
      markedZhHans: "苏原翻开逾期百年的书，图书馆突然变成一条下雪的街。借书卡上的老人正站在路灯下，反复问每个路人今天是哪一年。",
      pinyin: "Sū Yuán fānkāi yúqī bǎi nián de shū, túshūguǎn tūrán biàn chéng yì tiáo xiàxuě de jiē. Jièshūkǎ shàng de lǎorén zhèng zhàn zài lùdēng xià, fǎnfù wèn měi ge lùrén jīntiān shì nǎ yì nián.",
      vi: "Tô Nguyên mở quyển sách trễ một trăm năm, thư viện chợt biến thành con phố tuyết. Ông lão trên thẻ mượn đứng dưới đèn, liên tục hỏi người qua đường đây là năm nào.",
    },
    {
      markedZhHans: "老人不肯离开书，因为他在等一个没有回来的女孩。苏原在最后一页找到一张新卡，上面的借书人竟然是今天的自己。",
      pinyin: "Lǎorén bù kěn líkāi shū, yīnwèi tā zài děng yí ge méiyǒu huílai de nǚhái. Sū Yuán zài zuìhòu yí yè zhǎodào yì zhāng xīn kǎ, shàngmiàn de jièshūrén jìngrán shì jīntiān de zìjǐ.",
      vi: "Ông không chịu rời sách vì đang đợi một cô gái không trở lại. Ở trang cuối, Tô Nguyên thấy thẻ mới; người mượn trên đó lại chính là cậu hôm nay.",
    },
  ]),
  "thanh-lam-thuc-tinh-c02": create("thanh-lam-thuc-tinh", 2, [
    {
      markedZhHans: "午夜以后，整条街的路灯按顺序亮起，像在给安易指路。她跟到废弃的电站，机器没有声音，屏幕上却出现了她母亲的名字。",
      pinyin: "Wǔyè yǐhòu, zhěng tiáo jiē de lùdēng àn shùnxù liàngqǐ, xiàng zài gěi Ān Yì zhǐlù. Tā gēn dào fèiqì de diànzhàn, jīqì méiyǒu shēngyīn, píngmù shàng què chūxiàn le tā mǔqīn de míngzi.",
      vi: "Sau nửa đêm, đèn cả phố sáng theo thứ tự như dẫn đường cho An Dịch. Cô tới trạm điện bỏ hoang; máy móc không phát tiếng nhưng màn hình hiện tên mẹ cô.",
    },
    {
      markedZhHans: "旧记录显示，二十年前也发生过一次觉醒，只是所有人的记忆都被关闭了。安易听不见城市，可能正因为她从来没有被那次系统改变。",
      pinyin: "Jiù jìlù xiǎnshì, èrshí nián qián yě fāshēngguo yí cì juéxǐng, zhǐshì suǒyǒu rén de jìyì dōu bèi guānbì le. Ān Yì tīngbujiàn chéngshì, kěnéng zhèng yīnwèi tā cónglái méiyǒu bèi nà cì xìtǒng gǎibiàn.",
      vi: "Bản ghi cũ cho thấy hai mươi năm trước từng có một lần thức tỉnh nhưng ký ức mọi người bị khóa. An Dịch không nghe thấy thành phố có lẽ vì chưa từng bị hệ thống khi ấy thay đổi.",
    },
  ]),
  "chuyen-tau-dem-khong-ga-cuoi-c02": create("chuyen-tau-dem-khong-ga-cuoi", 2, [
    {
      markedZhHans: "列车停在名叫五月三十二日的车站。所有乘客都说这个日期不存在，只有李文口袋里的一张旧票写着同样的字。",
      pinyin: "Lièchē tíng zài míngjiào Wǔyuè Sānshí'èr Rì de chēzhàn. Suǒyǒu chéngkè dōu shuō zhège rìqī bù cúnzài, zhǐyǒu Lǐ Wén kǒudài lǐ de yì zhāng jiùpiào xiězhe tóngyàng de zì.",
      vi: "Tàu dừng ở ga mang tên Ngày 32 tháng Năm. Tất cả hành khách bảo ngày này không tồn tại, chỉ tấm vé cũ trong túi Lý Văn có cùng dòng chữ.",
    },
    {
      markedZhHans: "站台上有一个小男孩，手里拿着李文小时候丢失的红伞。男孩问他：如果忘记能让你回家，你愿意忘记谁？",
      pinyin: "Zhàntái shàng yǒu yí ge xiǎo nánhái, shǒu lǐ názhe Lǐ Wén xiǎoshíhou diūshī de hóngsǎn. Nánhái wèn tā: rúguǒ wàngjì néng ràng nǐ huíjiā, nǐ yuànyì wàngjì shéi?",
      vi: "Trên sân ga có một cậu bé cầm chiếc ô đỏ Lý Văn làm mất thuở nhỏ. Cậu hỏi: nếu quên một người có thể giúp anh về nhà, anh chịu quên ai?",
    },
  ]),
  "can-phong-so-bay-c02": create("can-phong-so-bay", 2, [
    {
      markedZhHans: "桌上的钥匙刻着送货员赵新的住址。他把钥匙插进墙上的小门，门后却是自己的房间，只是里面的钟比现在快了七分钟。",
      pinyin: "Zhuō shàng de yàoshi kèzhe sònghuòyuán Zhào Xīn de zhùzhǐ. Tā bǎ yàoshi chā jìn qiáng shàng de xiǎomén, mén hòu què shì zìjǐ de fángjiān, zhǐshì lǐmiàn de zhōng bǐ xiànzài kuài le qī fēnzhōng.",
      vi: "Chìa khóa trên bàn khắc địa chỉ của người giao hàng Triệu Tân. Anh cắm nó vào cửa nhỏ trên tường; phía sau là phòng mình nhưng đồng hồ chạy nhanh hơn hiện tại bảy phút.",
    },
    {
      markedZhHans: "未来的房间里，电话正在响。赵新接起后听见自己的声音：七分钟以后不要坐电梯，也不要让房间里的另一个人出去。",
      pinyin: "Wèilái de fángjiān lǐ, diànhuà zhèngzài xiǎng. Zhào Xīn jiēqǐ hòu tīngjiàn zìjǐ de shēngyīn: qī fēnzhōng yǐhòu bú yào zuò diàntī, yě bú yào ràng fángjiān lǐ de lìng yí ge rén chūqù.",
      vi: "Trong căn phòng tương lai, điện thoại đang reo. Triệu Tân nhấc máy và nghe giọng mình: bảy phút nữa đừng vào thang máy, cũng đừng để người còn lại trong phòng đi ra.",
    },
  ]),
  "nguoi-gui-thu-trong-mua-c02": create("nguoi-gui-thu-trong-mua", 2, [
    {
      markedZhHans: "第十三封信写给陈眠，日期是明天早上。信里说九点会下雨，一位穿黄色雨衣的人会来取走前十二封信。",
      pinyin: "Dì-shísān fēng xìn xiě gěi Chén Mián, rìqī shì míngtiān zǎoshang. Xìn lǐ shuō jiǔ diǎn huì xiàyǔ, yí wèi chuān huángsè yǔyī de rén huì lái qǔzǒu qián shí'èr fēng xìn.",
      vi: "Lá thứ mười ba gửi cho Trần Miên, đề ngày sáng mai. Thư nói chín giờ trời mưa và một người mặc áo mưa vàng sẽ tới lấy mười hai lá trước.",
    },
    {
      markedZhHans: "第二天，来的人竟是小时候的陈眠。小女孩不认识她，只问邮局里有没有一封能寄给失踪母亲的信。",
      pinyin: "Dì-èr tiān, lái de rén jìngrán shì xiǎoshíhou de Chén Mián. Xiǎo nǚhái bú rènshi tā, zhǐ wèn yóujú lǐ yǒu-méiyǒu yì fēng néng jì gěi shīzōng mǔqīn de xìn.",
      vi: "Hôm sau, người tới lại là Trần Miên thuở nhỏ. Cô bé không nhận ra cô, chỉ hỏi bưu điện có lá thư nào gửi được cho người mẹ mất tích không.",
    },
  ]),
  "tram-khong-gian-so-chin-c02": create("tram-khong-gian-so-chin", 2, [
    {
      markedZhHans: "救援队进入九号站后，所有钟都停在零点十二分。电脑记录显示，他们十二分钟前已经进来过一次，还亲手删除了自己的到站记录。",
      pinyin: "Jiùyuánduì jìnrù Jiǔhào Zhàn hòu, suǒyǒu zhōng dōu tíng zài língdiǎn shí'èr fēn. Diànnǎo jìlù xiǎnshì, tāmen shí'èr fēnzhōng qián yǐjīng jìnlai guo yí cì, hái qīnshǒu shānchú le zìjǐ de dàozhàn jìlù.",
      vi: "Sau khi đội cứu hộ vào trạm số chín, mọi đồng hồ dừng ở 0 giờ 12. Máy tính cho thấy họ đã vào đây mười hai phút trước và tự tay xóa bản ghi cập bến.",
    },
    {
      markedZhHans: "江洛在控制室找到一段自己的留言：不要恢复电力，黑暗不是故障，而是门锁。留言结束时，站外的星星同时消失了。",
      pinyin: "Jiāng Luò zài kòngzhìshì zhǎodào yí duàn zìjǐ de liúyán: bú yào huīfù diànlì, hēi'àn bú shì gùzhàng, érshì ménsuǒ. Liúyán jiéshù shí, zhàn wài de xīngxing tóngshí xiāoshī le.",
      vi: "Giang Lạc tìm thấy lời nhắn của chính mình trong phòng điều khiển: đừng khôi phục điện, bóng tối không phải sự cố mà là khóa cửa. Khi lời nhắn hết, các vì sao ngoài trạm cùng biến mất.",
    },
  ]),
  "ky-uc-tren-tang-may-c02": create("ky-uc-tren-tang-may", 2, [
    {
      markedZhHans: "白新走到地图上已经消失的青河街。路口没有路牌，行人也说从来没有这条街，只有她的旧相机还能拍到街里的房子。",
      pinyin: "Bái Xīn zǒu dào dìtú shàng yǐjīng xiāoshī de Qīnghé Jiē. Lùkǒu méiyǒu lùpái, xíngrén yě shuō cónglái méiyǒu zhè tiáo jiē, zhǐyǒu tā de jiù xiàngjī hái néng pāi dào jiē lǐ de fángzi.",
      vi: "Bạch Tân tới phố Thanh Hà đã biến mất trên bản đồ. Giao lộ không biển, người đi đường nói chưa từng có phố ấy; chỉ máy ảnh cũ của cô còn chụp được những căn nhà bên trong.",
    },
    {
      markedZhHans: "照片里，一扇蓝门慢慢打开。门后的女人说自己是第一位记忆工程师，也是白新以为早已去世的母亲。",
      pinyin: "Zhàopiàn lǐ, yí shàn lánmén mànmàn dǎkāi. Mén hòu de nǚrén shuō zìjǐ shì dì-yī wèi jìyì gōngchéngshī, yě shì Bái Xīn yǐwéi zǎoyǐ qùshì de mǔqīn.",
      vi: "Trong ảnh, một cánh cửa xanh từ từ mở. Người phụ nữ sau cửa nói mình là kỹ sư ký ức đầu tiên, đồng thời là mẹ Bạch Tân tưởng đã qua đời từ lâu.",
    },
  ]),
  "doc-gia-cuoi-cung-c02": create("doc-gia-cuoi-cung", 2, [
    {
      markedZhHans: "莫游照着手写信的路线来到城市地下。那里没有网络信号，却有一座仍在工作的档案馆，每扇门都要读出一句手写文字才能打开。",
      pinyin: "Mò Yóu zhàozhe shǒuxiěxìn de lùxiàn láidào chéngshì dìxià. Nàli méiyǒu wǎngluò xìnhào, què yǒu yí zuò réng zài gōngzuò de dàng'ànguǎn, měi shàn mén dōu yào dúchū yí jù shǒuxiě wénzì cái néng dǎkāi.",
      vi: "Mạc Du theo tuyến đường trong thư tay xuống dưới thành phố. Nơi đó không có mạng nhưng có một kho lưu trữ vẫn hoạt động; mỗi cửa chỉ mở khi đọc đúng một câu viết tay.",
    },
    {
      markedZhHans: "最后一道门上写着他的名字，字迹却来自三百年前。门内的管理员告诉他：他不是最后的读者，而是第一个被书选择的新记录者。",
      pinyin: "Zuìhòu yí dào mén shàng xiězhe tā de míngzi, zìjì què láizì sānbǎi nián qián. Mén nèi de guǎnlǐyuán gàosu tā: tā bú shì zuìhòu de dúzhě, érshì dì-yī ge bèi shū xuǎnzé de xīn jìlùzhě.",
      vi: "Cánh cửa cuối ghi tên cậu nhưng nét chữ từ ba trăm năm trước. Người quản lý bên trong nói cậu không phải độc giả cuối cùng mà là người ghi chép mới đầu tiên được sách lựa chọn.",
    },
  ]),
  "kiem-khach-thanh-co-c02": create("kiem-khach-thanh-co", 2, [
    {
      markedZhHans: "三位证人都说自己在钟响以后看见医官离开房间。每句话都是真的，但无名剑客注意到，他们说的不是同一声钟。",
      pinyin: "Sān wèi zhèngrén dōu shuō zìjǐ zài zhōng xiǎng yǐhòu kànjiàn yīguān líkāi fángjiān. Měi jù huà dōu shì zhēn de, dàn Wúmíng Jiànkè zhùyì dào, tāmen shuō de bú shì tóng yì shēng zhōng.",
      vi: "Ba nhân chứng đều nói đã thấy y quan rời phòng sau tiếng chuông. Mọi câu đều thật, nhưng kiếm khách vô danh nhận ra họ không nói về cùng một tiếng chuông.",
    },
    {
      markedZhHans: "他让三人按顺序敲响桌上的杯子。第三个人刚敲完，城楼却传来第四声钟；全城的人同时忘记了刚才的问题。",
      pinyin: "Tā ràng sān rén àn shùnxù qiāoxiǎng zhuō shàng de bēizi. Dì-sān ge rén gāng qiāowán, chénglóu què chuánlái dì-sì shēng zhōng; quán chéng de rén tóngshí wàngjì le gāngcái de wèntí.",
      vi: "Chàng bảo ba người lần lượt gõ cốc trên bàn. Người thứ ba vừa gõ xong, lầu thành vang tiếng chuông thứ tư; cả thành cùng quên câu hỏi vừa rồi.",
    },
  ]),
  "y-quan-ao-xam-c02": create("y-quan-ao-xam", 2, [
    {
      markedZhHans: "宁初让自己整夜不睡，终于和病人一起进入那个梦。梦里的村庄没有颜色，只有山上的一种蓝花在月光下发亮。",
      pinyin: "Níng Chū ràng zìjǐ zhěngyè bú shuì, zhōngyú hé bìngrén yìqǐ jìnrù nà ge mèng. Mèng lǐ de cūnzhuāng méiyǒu yánsè, zhǐyǒu shān shàng de yì zhǒng lánhua zài yuèguāng xià fāliàng.",
      vi: "Ninh Sơ thức suốt đêm và cuối cùng vào giấc mơ cùng bệnh nhân. Ngôi làng trong mơ không màu, chỉ một loài hoa xanh trên núi sáng dưới trăng.",
    },
    {
      markedZhHans: "她把花的样子画在袖子上，醒来后却只剩一半。药方还需要梦里河水的方向，而第八位病人已经三天没有醒来。",
      pinyin: "Tā bǎ huā de yàngzi huà zài xiùzi shàng, xǐnglái hòu què zhǐ shèng yí bàn. Yàofāng hái xūyào mèng lǐ héshuǐ de fāngxiàng, ér dì-bā wèi bìngrén yǐjīng sān tiān méiyǒu xǐnglái.",
      vi: "Cô vẽ hình hoa lên tay áo nhưng tỉnh dậy chỉ còn một nửa. Toa thuốc còn cần hướng nước sông trong mơ, trong khi bệnh nhân thứ tám đã ba ngày chưa tỉnh.",
    },
  ]),
  "ban-do-bien-ai-c02": create("ban-do-bien-ai", 2, [
    {
      markedZhHans: "一个小女孩从地图的空白处走来，怀里抱着半张皮地图。她说自己的村庄没有名字，所以墨水无法把它完全擦掉。",
      pinyin: "Yí ge xiǎo nǚhái cóng dìtú de kòngbái chù zǒu lái, huáilǐ bàozhe bàn zhāng pí dìtú. Tā shuō zìjǐ de cūnzhuāng méiyǒu míngzi, suǒyǐ mòshuǐ wúfǎ bǎ tā wánquán cādiào.",
      vi: "Một cô bé bước ra từ vùng trắng trên bản đồ, ôm nửa tấm bản đồ da. Cô nói làng mình không có tên nên mực không thể xóa sạch hoàn toàn.",
    },
    {
      markedZhHans: "地图师把两张图合在一起，一条新的边界立刻出现。那条线没有分开两个国家，而是把所有消失的地方连成了一条路。",
      pinyin: "Dìtúshī bǎ liǎng zhāng tú hé zài yìqǐ, yì tiáo xīn de biānjiè lìkè chūxiàn. Nà tiáo xiàn méiyǒu fēnkāi liǎng ge guójiā, érshì bǎ suǒyǒu xiāoshī de dìfang lián chéng le yì tiáo lù.",
      vi: "Người vẽ bản đồ ghép hai mảnh lại, một đường biên mới lập tức hiện ra. Nó không chia hai nước mà nối tất cả nơi đã biến mất thành một con đường.",
    },
  ]),
  "quan-tra-ben-song-c02": create("quan-tra-ben-song", 2, [
    {
      markedZhHans: "客人说自己想忘记过去，老板却端来一杯没有糖的苦茶。喝到最后，杯底露出一行字：你真正害怕的是谁记得？",
      pinyin: "Kèrén shuō zìjǐ xiǎng wàngjì guòqù, lǎobǎn què duānlái yì bēi méiyǒu táng de kǔchá. Hē dào zuìhòu, bēidǐ lùchū yì háng zì: nǐ zhēnzhèng hàipà de shì shéi jìde?",
      vi: "Vị khách nói muốn quên quá khứ, chủ quán lại bưng trà đắng không đường. Uống tới đáy, một dòng chữ lộ ra: điều anh thật sự sợ là ai còn nhớ?",
    },
    {
      markedZhHans: "客人沉默很久，终于拿出一封没有寄出的道歉信。他不再问怎么忘记，而是问河对岸的邮局几点关门。",
      pinyin: "Kèrén chénmò hěn jiǔ, zhōngyú náchū yì fēng méiyǒu jìchū de dàoqiànxìn. Tā bú zài wèn zěnme wàngjì, érshì wèn hé duì'àn de yóujú jǐ diǎn guānmén.",
      vi: "Vị khách im lặng rất lâu rồi lấy ra lá thư xin lỗi chưa gửi. Anh không hỏi cách quên nữa mà hỏi bưu điện bên kia sông mấy giờ đóng cửa.",
    },
  ]),
  "nguoi-ban-bong-c02": create("nguoi-ban-bong", 2, [
    {
      markedZhHans: "那天夜里，一道不属于任何人的影子跟着商人回到旅店。影子会在墙上写字，只反复写同一个地址。",
      pinyin: "Nà tiān yèlǐ, yí dào bù shǔyú rènhé rén de yǐngzi gēnzhe shāngrén huídào lǚdiàn. Yǐngzi huì zài qiáng shàng xiězì, zhǐ fǎnfù xiě tóng yí ge dìzhǐ.",
      vi: "Đêm ấy, một chiếc bóng không thuộc về ai theo thương nhân về quán trọ. Nó biết viết lên tường và chỉ lặp đi lặp lại một địa chỉ.",
    },
    {
      markedZhHans: "地址尽头住着一位快乐的老人。老人承认很久以前卖掉了悲伤，却不知道那份悲伤后来一直由女儿带着。",
      pinyin: "Dìzhǐ jìntóu zhùzhe yí wèi kuàilè de lǎorén. Lǎorén chéngrèn hěn jiǔ yǐqián màidiào le bēishāng, què bù zhīdào nà fèn bēishāng hòulái yìzhí yóu nǚ'ér dàizhe.",
      vi: "Cuối địa chỉ là một ông lão vui vẻ. Ông thừa nhận từng bán nỗi buồn từ lâu nhưng không biết về sau con gái đã mang nỗi buồn ấy thay mình.",
    },
  ]),
  "ba-cau-hoi-cua-da-c02": create("ba-cau-hoi-cua-da", 2, [
    {
      markedZhHans: "石头问牧童第二个问题：你要去哪里？牧童说不知道，只知道羊群需要在天黑前找到水。",
      pinyin: "Shítou wèn mùtóng dì-èr ge wèntí: nǐ yào qù nǎli? Mùtóng shuō bù zhīdào, zhǐ zhīdào yángqún xūyào zài tiānhēi qián zhǎodào shuǐ.",
      vi: "Hòn đá hỏi cậu bé câu thứ hai: cậu đi đâu? Cậu nói không biết, chỉ biết đàn cừu cần tìm được nước trước khi trời tối.",
    },
    {
      markedZhHans: "路上的人听见后都笑了，却有人第一次停下来看看天空。原来他们每天说着目的地，却没有一个人记得自己为什么出发。",
      pinyin: "Lù shàng de rén tīngjiàn hòu dōu xiào le, què yǒu rén dì-yī cì tíngxiàlai kànkan tiānkōng. Yuánlái tāmen měitiān shuōzhe mùdìdì, què méiyǒu yí ge rén jìde zìjǐ wèishénme chūfā.",
      vi: "Người trên đường nghe xong đều cười, nhưng có người lần đầu dừng lại nhìn trời. Hóa ra ngày nào họ cũng nói về đích đến mà không ai nhớ vì sao mình khởi hành.",
    },
  ]),
  "tiem-com-luc-sau-gio-c02": create("tiem-com-luc-sau-gio", 2, [
    {
      markedZhHans: "老板按客人的记忆做了一碗萝卜汤。客人喝第一口就说味道不对，因为母亲做汤时总会少放一点盐。",
      pinyin: "Lǎobǎn àn kèrén de jìyì zuò le yì wǎn luóbotāng. Kèrén hē dì-yī kǒu jiù shuō wèidào bú duì, yīnwèi mǔqīn zuò tāng shí zǒng huì shǎo fàng yìdiǎn yán.",
      vi: "Chủ quán nấu bát canh củ cải theo ký ức của khách. Nếm ngụm đầu, anh nói vị chưa đúng vì mẹ anh luôn cho ít muối hơn một chút.",
    },
    {
      markedZhHans: "老板重新端来一碗清淡的汤，碗下压着一张回家的车票。客人这才明白，自己记住的不是味道，而是有人一直等他吃饭。",
      pinyin: "Lǎobǎn chóngxīn duānlái yì wǎn qīngdàn de tāng, wǎn xià yāzhe yì zhāng huíjiā de chēpiào. Kèrén zhè cái míngbai, zìjǐ jìzhù de bú shì wèidào, érshì yǒu rén yìzhí děng tā chīfàn.",
      vi: "Chủ quán bưng bát canh thanh hơn, dưới bát là vé xe về nhà. Vị khách hiểu thứ mình nhớ không phải hương vị mà là luôn có người đợi mình ăn cơm.",
    },
  ]),
  "mua-he-o-bac-kinh-c02": create("mua-he-o-bac-kinh", 2, [
    {
      markedZhHans: "安和小雨放大旧照片，终于看清门上的号码：青云巷四十二号。现在的地图上，青云巷只有四十一座房子。",
      pinyin: "Ān hé Xiǎoyǔ fàngdà jiù zhàopiàn, zhōngyú kànqīng mén shàng de hàomǎ: Qīngyún Xiàng sìshí'èr hào. Xiànzài de dìtú shàng, Qīngyún Xiàng zhǐyǒu sìshíyī zuò fángzi.",
      vi: "An và Tiểu Vũ phóng lớn ảnh cũ, cuối cùng đọc được số cửa: ngõ Thanh Vân số 42. Trên bản đồ hiện tại ngõ chỉ có bốn mươi mốt căn.",
    },
    {
      markedZhHans: "他们走到巷子尽头，发现一面画着窗户的墙。相机快门响起时，墙上的窗突然亮了，里面正有人冲洗同一张照片。",
      pinyin: "Tāmen zǒu dào xiàngzi jìntóu, fāxiàn yí miàn huàzhe chuānghu de qiáng. Xiàngjī kuàimén xiǎngqǐ shí, qiáng shàng de chuāng tūrán liàng le, lǐmiàn zhèng yǒu rén chōngxǐ tóng yì zhāng zhàopiàn.",
      vi: "Họ tới cuối ngõ và thấy bức tường vẽ cửa sổ. Khi màn trập vang, cửa sổ trên tường bỗng sáng; bên trong có người đang rửa chính bức ảnh ấy.",
    },
  ]),
  "buc-thu-chua-gui-c02": create("buc-thu-chua-gui", 2, [
    {
      markedZhHans: "第十二封信没有收件人的名字，只有一个被父亲划掉的地址。方仪查了很久，发现那里曾经是一家照相馆。",
      pinyin: "Dì-shí'èr fēng xìn méiyǒu shōujiànrén de míngzi, zhǐyǒu yí ge bèi fùqīn huádiào de dìzhǐ. Fāng Yí chá le hěn jiǔ, fāxiàn nàli céngjīng shì yì jiā zhàoxiànguǎn.",
      vi: "Lá thứ mười hai không có tên người nhận, chỉ một địa chỉ bị cha gạch. Phương Nghi tra rất lâu và biết nơi ấy từng là một tiệm ảnh.",
    },
    {
      markedZhHans: "旧店主交给她一张全家福，照片里父亲旁边站着一个陌生女孩。背面写着：等方仪长大以后，再告诉她这个妹妹的故事。",
      pinyin: "Jiù diànzhǔ jiāogěi tā yì zhāng quánjiāfú, zhàopiàn lǐ fùqīn pángbiān zhànzhe yí ge mòshēng nǚhái. Bèimiàn xiězhe: děng Fāng Yí zhǎngdà yǐhòu, zài gàosu tā zhège mèimei de gùshi.",
      vi: "Chủ tiệm cũ đưa cô một ảnh gia đình; cạnh cha là cô gái lạ. Mặt sau viết: khi Phương Nghi lớn, hãy kể cho con bé câu chuyện về người em gái này.",
    },
  ]),
};
