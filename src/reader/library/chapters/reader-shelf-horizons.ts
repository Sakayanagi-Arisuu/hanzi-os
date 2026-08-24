import type { ReaderChapter } from "../readerContentModel";
import { createReaderSamplerChapter as create } from "./readerSamplerFactory";

export const READER_SHELF_CHAPTERS: Record<string, ReaderChapter> = {
  "tram-khong-gian-so-chin-c01": create("tram-khong-gian-so-chin", [
    {
      markedZhHans: "第九空间站失去联系十二年后，地球[[突然]]收到一段求救信号。队长江洛把[[声音]]放慢，听见一个孩子说：‘姐姐，请不要再把我留在这里。’",
      pinyin: "Dì-jiǔ kōngjiānzhàn shīqù liánxì shí'èr nián hòu, Dìqiú tūrán shōudào yí duàn qiújiù xìnhào. Duìzhǎng Jiāng Luò bǎ shēngyīn fàngmàn, tīngjiàn yí ge háizi shuō: ‘Jiějie, qǐng bú yào zài bǎ wǒ liú zài zhèli.’",
      vi: "Mười hai năm sau khi trạm không gian số chín mất liên lạc, Trái Đất đột nhiên nhận được tín hiệu cầu cứu. Đội trưởng Giang Lạc làm chậm âm thanh và nghe một đứa trẻ nói: ‘Chị ơi, xin đừng bỏ em lại đây nữa.’",
    },
    {
      markedZhHans: "那是江洛小时候的声音，可她从没去过太空。救援船靠近旧站时，导航[[地图]]上没有任何[[入口]]，站里的灯却一个接一个地亮了起来。",
      pinyin: "Nà shì Jiāng Luò xiǎoshíhou de shēngyīn, kě tā cóng méi qùguo tàikōng. Jiùyuánchuán kàojìn jiùzhàn shí, dǎoháng dìtú shàng méiyǒu rènhé rùkǒu, zhàn lǐ de dēng què yí ge jiē yí ge de liàng le qǐlai.",
      vi: "Đó là giọng Giang Lạc khi còn nhỏ, nhưng cô chưa từng lên không gian. Khi tàu cứu hộ áp sát trạm cũ, bản đồ dẫn đường không có lối vào nào, còn đèn trong trạm lần lượt sáng lên.",
    },
    {
      markedZhHans: "主屏幕出现一行旧记录：‘第九站不是地方，是被删除的[[时间]]。’气闸自动[[打开]]，里面飘出一只纸船，上面写着全体船员的名字。",
      pinyin: "Zhǔ píngmù chūxiàn yì háng jiù jìlù: ‘Dì-jiǔ zhàn bú shì dìfang, shì bèi shānchú de shíjiān.’ Qìzhá zìdòng dǎkāi, lǐmiàn piāochū yì zhī zhǐchuán, shàngmiàn xiězhe quántǐ chuányuán de míngzi.",
      vi: "Màn hình chính hiện một dòng ghi chép cũ: ‘Trạm số chín không phải nơi chốn, mà là thời gian bị xóa.’ Cửa khí tự mở, một chiếc thuyền giấy bay ra, trên đó viết tên toàn bộ thủy thủ.",
    },
  ]),
  "ky-uc-tren-tang-may-c01": create("ky-uc-tren-tang-may", [
    {
      markedZhHans: "白新在云端档案馆修复一份坏掉的记忆。文件夹没有主人，却用她的[[名字]]保存了二十七年，比她本人还大三岁。她[[决定]]先看最早的一段。",
      pinyin: "Bái Xīn zài yúnduān dàng'ànguǎn xiūfù yí fèn huàidiào de jìyì. Wénjiànjiā méiyǒu zhǔrén, què yòng tā de míngzi bǎocún le èrshíqī nián, bǐ tā běnrén hái dà sān suì. Tā juédìng xiān kàn zuì zǎo de yí duàn.",
      vi: "Bạch Tân sửa một ký ức hỏng trong kho lưu trữ đám mây. Thư mục không có chủ nhưng đã lưu bằng tên cô suốt hai mươi bảy năm, lớn hơn cô ba tuổi. Cô quyết định xem đoạn sớm nhất.",
    },
    {
      markedZhHans: "画面里，她站在一条陌生的街上，手里拿着旧[[地图]]。视频结束的同时，办公室窗外那条街真的消失了，导航上只剩一块没有名字的空地。",
      pinyin: "Huàmiàn lǐ, tā zhàn zài yì tiáo mòshēng de jiē shàng, shǒu lǐ názhe jiù dìtú. Shìpín jiéshù de tóngshí, bàngōngshì chuāngwài nà tiáo jiē zhēn de xiāoshī le, dǎoháng shàng zhǐ shèng yí kuài méiyǒu míngzi de kòngdì.",
      vi: "Trong hình, cô đứng trên một con phố lạ và cầm tấm bản đồ cũ. Đúng lúc video kết thúc, con phố ngoài cửa sổ văn phòng thật sự biến mất; bản đồ chỉ còn một khoảng trống không tên.",
    },
    {
      markedZhHans: "系统问她是否[[继续]]播放。白新关闭窗口，屏幕却自己写道：‘你不是在看[[过去]]，你正在选择哪一个过去留下来。’下一段记忆开始自动下载。",
      pinyin: "Xìtǒng wèn tā shìfǒu jìxù bōfàng. Bái Xīn guānbì chuāngkǒu, píngmù què zìjǐ xiědào: ‘Nǐ bú shì zài kàn guòqù, nǐ zhèngzài xuǎnzé nǎ yí ge guòqù liú xiàlai.’ Xià yí duàn jìyì kāishǐ zìdòng xiàzài.",
      vi: "Hệ thống hỏi cô có tiếp tục phát không. Bạch Tân đóng cửa sổ nhưng màn hình tự viết: ‘Cô không xem quá khứ; cô đang chọn quá khứ nào được ở lại.’ Đoạn ký ức tiếp theo bắt đầu tự tải.",
    },
  ]),
  "doc-gia-cuoi-cung-c01": create("doc-gia-cuoi-cung", [
    {
      markedZhHans: "城市里的电子文字一夜之间全部变成空白。机器仍能读出内容，人们却只[[看见]]没有意义的线。莫游打开祖父留下的[[书]]，发现纸上的字还在。",
      pinyin: "Chéngshì lǐ de diànzǐ wénzì yí yè zhījiān quánbù biànchéng kòngbái. Jīqì réng néng dúchū nèiróng, rénmen què zhǐ kànjiàn méiyǒu yìyì de xiàn. Mò Yóu dǎkāi zǔfù liúxià de shū, fāxiàn zhǐ shàng de zì hái zài.",
      vi: "Chỉ sau một đêm, mọi chữ điện tử trong thành phố biến thành khoảng trắng. Máy vẫn đọc được nội dung, còn con người chỉ thấy những đường vô nghĩa. Mạc Du mở cuốn sách ông để lại và phát hiện chữ trên giấy vẫn còn.",
    },
    {
      markedZhHans: "书里夹着一封手写信：‘如果你能读到这里，去找最后的[[图书馆]]。’信后画着一张[[地图]]，终点正是已经关闭多年的地下车站。",
      pinyin: "Shū lǐ jiāzhe yì fēng shǒuxiě xìn: ‘Rúguǒ nǐ néng dú dào zhèli, qù zhǎo zuìhòu de túshūguǎn.’ Xìn hòu huàzhe yì zhāng dìtú, zhōngdiǎn zhèng shì yǐjīng guānbì duōnián de dìxià chēzhàn.",
      vi: "Trong sách kẹp một lá thư viết tay: ‘Nếu cháu đọc được tới đây, hãy tìm thư viện cuối cùng.’ Sau thư có bản đồ, đích đến là ga ngầm đã đóng nhiều năm.",
    },
    {
      markedZhHans: "莫游刚走出家门，所有屏幕同时显示同一句话：‘请交出纸书，恢复[[世界]]的正常秩序。’他把书藏进外套，朝车站的[[入口]]跑去。",
      pinyin: "Mò Yóu gāng zǒuchū jiāmén, suǒyǒu píngmù tóngshí xiǎnshì tóng yí jù huà: ‘Qǐng jiāochū zhǐshū, huīfù shìjiè de zhèngcháng zhìxù.’ Tā bǎ shū cáng jìn wàitào, cháo chēzhàn de rùkǒu pǎo qù.",
      vi: "Mạc Du vừa ra khỏi nhà, mọi màn hình đồng loạt hiện câu: ‘Hãy giao nộp sách giấy để khôi phục trật tự bình thường của thế giới.’ Cậu giấu sách vào áo và chạy về lối vào nhà ga.",
    },
  ]),
  "kiem-khach-thanh-co-c01": create("kiem-khach-thanh-co", [
    {
      markedZhHans: "无名剑客走进古城时，守门人先告诉他一条[[奇怪]]的规矩：城里的人只能说真话。当天夜里，县官死在锁着的[[房间]]中，六个证人都说自己没有杀人。",
      pinyin: "Wúmíng jiànkè zǒujìn gǔchéng shí, shǒuménrén xiān gàosu tā yì tiáo qíguài de guīju: chéng lǐ de rén zhǐ néng shuō zhēnhuà. Dàngtiān yèlǐ, xiànguān sǐ zài suǒzhe de fángjiān zhōng, liù ge zhèngrén dōu shuō zìjǐ méiyǒu shārén.",
      vi: "Khi kiếm khách vô danh vào cổ thành, người giữ cổng nói trước một quy tắc kỳ lạ: người trong thành chỉ có thể nói thật. Đêm đó, huyện quan chết trong căn phòng khóa kín; sáu nhân chứng đều nói mình không giết người.",
    },
    {
      markedZhHans: "每句话都是真的，可放在一起却没有[[答案]]。剑客检查窗户，在地上[[发现]]七种不同的鞋印。第七个人从没出现在证人的名单里。",
      pinyin: "Měi jù huà dōu shì zhēn de, kě fàng zài yìqǐ què méiyǒu dá'àn. Jiànkè jiǎnchá chuānghu, zài dìshang fāxiàn qī zhǒng bùtóng de xiéyìn. Dì-qī ge rén cóng méi chūxiàn zài zhèngrén de míngdān lǐ.",
      vi: "Mỗi câu đều thật, nhưng ghép lại lại không có đáp án. Kiếm khách kiểm tra cửa sổ và phát hiện bảy loại dấu giày trên đất. Người thứ bảy chưa từng xuất hiện trong danh sách nhân chứng.",
    },
    {
      markedZhHans: "他问守门人：‘城外的人也不能说谎吗？’老人第一次没有回答，只指向城墙[[后面]]。月光下，一扇小门正在慢慢[[打开]]。",
      pinyin: "Tā wèn shǒuménrén: ‘Chéngwài de rén yě bù néng shuōhuǎng ma?’ Lǎorén dì-yī cì méiyǒu huídá, zhǐ zhǐxiàng chéngqiáng hòumian. Yuèguāng xià, yí shàn xiǎomén zhèngzài mànmàn dǎkāi.",
      vi: "Chàng hỏi người giữ cổng: ‘Người ngoài thành cũng không thể nói dối sao?’ Lần đầu ông lão không trả lời, chỉ về phía sau tường thành. Dưới trăng, một cánh cửa nhỏ đang từ từ mở.",
    },
  ]),
  "y-quan-ao-xam-c01": create("y-quan-ao-xam", [
    {
      markedZhHans: "宁初到边村的第一晚，七个病人说自己做了同一个梦。他们都梦见一条黑色的[[河]]，也都在醒来以后[[忘记]]家人的脸。",
      pinyin: "Níng Chū dào biāncūn de dì-yī wǎn, qī ge bìngrén shuō zìjǐ zuò le tóng yí ge mèng. Tāmen dōu mèngjiàn yì tiáo hēisè de hé, yě dōu zài xǐnglái yǐhòu wàngjì jiārén de liǎn.",
      vi: "Đêm đầu Ninh Sơ tới làng biên, bảy bệnh nhân nói họ có cùng một giấc mơ. Tất cả đều mơ thấy con sông đen và đều quên mặt người nhà sau khi tỉnh.",
    },
    {
      markedZhHans: "她检查了水和食物，没有[[发现]]毒。最小的病人却在纸上画出一座桥，说桥对面有人一直叫他的[[名字]]。这正是前六个人没有说出的部分。",
      pinyin: "Tā jiǎnchá le shuǐ hé shíwù, méiyǒu fāxiàn dú. Zuì xiǎo de bìngrén què zài zhǐ shàng huàchū yí zuò qiáo, shuō qiáo duìmiàn yǒurén yìzhí jiào tā de míngzi. Zhè zhèng shì qián liù ge rén méiyǒu shuōchū de bùfen.",
      vi: "Cô kiểm tra nước và thức ăn nhưng không phát hiện độc. Bệnh nhân nhỏ nhất vẽ một cây cầu trên giấy và nói bên kia có người liên tục gọi tên mình. Đây chính là phần sáu người trước không kể.",
    },
    {
      markedZhHans: "半夜，宁初也睡着了。她站在梦里的桥上，看见一名穿灰衣的女子向她递来药箱。女子说：‘病不在身体里，[[答案]]在你不愿记得的事里。’",
      pinyin: "Bànyè, Níng Chū yě shuìzháo le. Tā zhàn zài mèng lǐ de qiáo shàng, kànjiàn yì míng chuān huīyī de nǚzǐ xiàng tā dìlái yàoxiāng. Nǚzǐ shuō: ‘Bìng bú zài shēntǐ lǐ, dá'àn zài nǐ bù yuàn jìde de shì lǐ.’",
      vi: "Nửa đêm Ninh Sơ cũng ngủ thiếp đi. Cô đứng trên cây cầu trong mơ và thấy một người phụ nữ áo xám đưa hòm thuốc. Người ấy nói: ‘Bệnh không ở trong cơ thể; đáp án nằm trong điều cô không muốn nhớ.’",
    },
  ]),
  "ban-do-bien-ai-c01": create("ban-do-bien-ai", [
    {
      markedZhHans: "沈青每天为边关画[[地图]]。一个早晨，她[[发现]]家乡的位置变成了空白，村名、道路和小河都像从纸上被擦掉了。",
      pinyin: "Shěn Qīng měitiān wèi biānguān huà dìtú. Yí ge zǎochén, tā fāxiàn jiāxiāng de wèizhi biànchéng le kòngbái, cūnmíng, dàolù hé xiǎohé dōu xiàng cóng zhǐ shàng bèi cādiào le.",
      vi: "Mỗi ngày Thẩm Thanh vẽ bản đồ vùng biên. Một sáng, cô phát hiện vị trí quê nhà biến thành khoảng trắng; tên làng, con đường và dòng sông nhỏ như bị xóa khỏi giấy.",
    },
    {
      markedZhHans: "快马送来的信说，村子真的不见了，原地只剩一片雾。师父让她[[忘记]]这件事，因为地图上的边界不能改变。沈青却拿起笔，在空白处画了一条新路。",
      pinyin: "Kuàimǎ sònglái de xìn shuō, cūnzi zhēn de bú jiàn le, yuándì zhǐ shèng yí piàn wù. Shīfu ràng tā wàngjì zhè jiàn shì, yīnwèi dìtú shàng de biānjiè bù néng gǎibiàn. Shěn Qīng què náqǐ bǐ, zài kòngbái chù huà le yì tiáo xīnlù.",
      vi: "Thư ngựa trạm nói ngôi làng thật sự biến mất, chỗ cũ chỉ còn sương. Sư phụ bảo cô quên chuyện này vì ranh giới trên bản đồ không thể đổi. Nhưng Thẩm Thanh cầm bút vẽ một con đường mới trong khoảng trống.",
    },
    {
      markedZhHans: "墨还没干，墙上就[[出现]]一扇门。门外传来熟悉的鸡鸣，也传来陌生的战鼓。沈青收好地图，[[决定]]亲自走进那条没人画过的路。",
      pinyin: "Mò hái méi gān, qiáng shàng jiù chūxiàn yí shàn mén. Ménwài chuánlái shúxī de jīmíng, yě chuánlái mòshēng de zhàngǔ. Shěn Qīng shōuhǎo dìtú, juédìng qīnzì zǒujìn nà tiáo méi rén huàguo de lù.",
      vi: "Mực chưa khô thì trên tường đã xuất hiện một cánh cửa. Ngoài cửa vang tiếng gà quen thuộc lẫn trống trận xa lạ. Thẩm Thanh cất bản đồ và quyết định tự bước vào con đường chưa ai từng vẽ.",
    },
  ]),
};
