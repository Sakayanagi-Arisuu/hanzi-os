import type { ReaderChapter } from "../readerContentModel";
import { createReaderSamplerChapter as create } from "./readerSamplerFactory";

export const READER_SHELF_CHAPTERS: Record<string, ReaderChapter> = {
  "quan-tra-ben-song-c01": create("quan-tra-ben-song", [
    {
      markedZhHans: "河边茶馆只在有人无法做出[[选择]]时开门。那天傍晚，一名年轻客人走进来，说自己想[[忘记]]过去。老板没有问原因，只放下两个空茶杯。",
      pinyin: "Hébiān cháguǎn zhǐ zài yǒurén wúfǎ zuòchū xuǎnzé shí kāimén. Nà tiān bàngwǎn, yì míng niánqīng kèrén zǒujìnlai, shuō zìjǐ xiǎng wàngjì guòqù. Lǎobǎn méiyǒu wèn yuányīn, zhǐ fàngxià liǎng ge kōng chábēi.",
      vi: "Quán trà bên sông chỉ mở khi có người không thể đưa ra lựa chọn. Chiều ấy, một vị khách trẻ bước vào và nói muốn quên quá khứ. Chủ quán không hỏi lý do, chỉ đặt xuống hai chén trà rỗng.",
    },
    {
      markedZhHans: "他给第一杯倒满热茶，第二杯只放一片叶子。客人问哪一杯能[[帮助]]自己。老板说：‘一杯让你忘，一杯让你[[记得]]为什么不能忘。’",
      pinyin: "Tā gěi dì-yī bēi dǎomǎn rèchá, dì-èr bēi zhǐ fàng yí piàn yèzi. Kèrén wèn nǎ yì bēi néng bāngzhù zìjǐ. Lǎobǎn shuō: ‘Yì bēi ràng nǐ wàng, yì bēi ràng nǐ jìde wèishénme bù néng wàng.’",
      vi: "Ông rót đầy trà nóng vào chén thứ nhất, chén thứ hai chỉ đặt một lá trà. Vị khách hỏi chén nào có thể giúp mình. Chủ quán nói: ‘Một chén khiến cậu quên, một chén khiến cậu nhớ vì sao không thể quên.’",
    },
    {
      markedZhHans: "客人坐到月亮升起，最后没有喝任何一杯。他把一封旧信放在桌上，第一次说出真正的[[问题]]。河水经过窗外，茶馆的门也慢慢消失了。",
      pinyin: "Kèrén zuò dào yuèliang shēngqǐ, zuìhòu méiyǒu hē rènhé yì bēi. Tā bǎ yì fēng jiùxìn fàng zài zhuō shàng, dì-yī cì shuōchū zhēnzhèng de wèntí. Héshuǐ jīngguò chuāngwài, cháguǎn de mén yě mànmàn xiāoshī le.",
      vi: "Vị khách ngồi tới khi trăng lên và cuối cùng không uống chén nào. Cậu đặt lá thư cũ lên bàn, lần đầu nói ra vấn đề thật sự. Nước sông trôi ngoài cửa sổ và cánh cửa quán trà cũng từ từ biến mất.",
    },
  ]),
  "nguoi-ban-bong-c01": create("nguoi-ban-bong", [
    {
      markedZhHans: "卖影子的人每到一座[[城市]]，都会问同一句话：‘你愿意用影子换走最痛苦的记忆吗？’很多人答应了，因为没有影子并不影响白天的生活。",
      pinyin: "Mài yǐngzi de rén měi dào yí zuò chéngshì, dōu huì wèn tóng yí jù huà: ‘Nǐ yuànyì yòng yǐngzi huànzǒu zuì tòngkǔ de jìyì ma?’ Hěn duō rén dāying le, yīnwèi méiyǒu yǐngzi bìng bù yǐngxiǎng báitiān de shēnghuó.",
      vi: "Mỗi khi tới một thành phố, người bán bóng đều hỏi cùng một câu: ‘Bạn có muốn dùng chiếc bóng để đổi đi ký ức đau nhất không?’ Nhiều người đồng ý vì không có bóng không ảnh hưởng cuộc sống ban ngày.",
    },
    {
      markedZhHans: "一天，一个女孩来找他。她脚下没有影子，却清楚地[[记得]]每一件难过的事。商人第一次遇到这种[[问题]]，便问她把影子卖给了谁。",
      pinyin: "Yì tiān, yí ge nǚhái lái zhǎo tā. Tā jiǎoxià méiyǒu yǐngzi, què qīngchu de jìde měi yí jiàn nánguò de shì. Shāngrén dì-yī cì yùdào zhè zhǒng wèntí, biàn wèn tā bǎ yǐngzi mài gěi le shéi.",
      vi: "Một ngày, cô bé tới tìm ông. Dưới chân cô không có bóng nhưng vẫn nhớ rõ mọi chuyện buồn. Lần đầu người thương nhân gặp vấn đề như vậy, bèn hỏi cô đã bán bóng cho ai.",
    },
    {
      markedZhHans: "女孩指着他的箱子说：‘我的影子一直在[[帮助]]别人忘记。’箱里所有影子同时动了起来。商人终于[[明白]]，他带走的痛苦从来没有真正消失。",
      pinyin: "Nǚhái zhǐzhe tā de xiāngzi shuō: ‘Wǒ de yǐngzi yìzhí zài bāngzhù biérén wàngjì.’ Xiāng lǐ suǒyǒu yǐngzi tóngshí dòng le qǐlai. Shāngrén zhōngyú míngbai, tā dàizǒu de tòngkǔ cónglái méiyǒu zhēnzhèng xiāoshī.",
      vi: "Cô bé chỉ chiếc hòm: ‘Bóng của cháu vẫn luôn giúp người khác quên đi.’ Mọi chiếc bóng trong hòm đồng loạt chuyển động. Người thương nhân cuối cùng hiểu rằng nỗi đau ông mang đi chưa từng thật sự biến mất.",
    },
  ]),
  "ba-cau-hoi-cua-da-c01": create("ba-cau-hoi-cua-da", [
    {
      markedZhHans: "山路边有一块会说话的石头。它每天问路人三个[[问题]]：‘你从哪里来？你要去哪里？你为什么这么急？’大人们都说没有[[时间]]回答。",
      pinyin: "Shānlù biān yǒu yí kuài huì shuōhuà de shítou. Tā měitiān wèn lùrén sān ge wèntí: ‘Nǐ cóng nǎli lái? Nǐ yào qù nǎli? Nǐ wèishénme zhème jí?’ Dàrénmen dōu shuō méiyǒu shíjiān huídá.",
      vi: "Bên đường núi có một hòn đá biết nói. Mỗi ngày nó hỏi người qua đường ba câu: ‘Bạn từ đâu tới? Bạn đi đâu? Vì sao vội thế?’ Người lớn đều nói không có thời gian trả lời.",
    },
    {
      markedZhHans: "只有放羊的孩子坐了下来。他说自己从家里来，要去找走失的羊，因为天黑以前[[必须]]回来。石头问：‘如果找不到呢？’孩子想了很久。",
      pinyin: "Zhǐyǒu fàngyáng de háizi zuò le xiàlai. Tā shuō zìjǐ cóng jiālǐ lái, yào qù zhǎo zǒushī de yáng, yīnwèi tiānhēi yǐqián bìxū huílai. Shítou wèn: ‘Rúguǒ zhǎo bú dào ne?’ Háizi xiǎng le hěn jiǔ.",
      vi: "Chỉ cậu bé chăn dê ngồi xuống. Cậu nói mình từ nhà tới, đi tìm con dê lạc vì phải về trước khi tối. Hòn đá hỏi: ‘Nếu không tìm thấy thì sao?’ Cậu bé nghĩ rất lâu.",
    },
    {
      markedZhHans: "孩子回答：‘那我就带一条新的路回家。’石头笑了，身体下面[[出现]]一条小路。路的尽头传来羊叫，三个问题也有了第四个[[答案]]。",
      pinyin: "Háizi huídá: ‘Nà wǒ jiù dài yì tiáo xīn de lù huíjiā.’ Shítou xiào le, shēntǐ xiàmiàn chūxiàn yì tiáo xiǎolù. Lù de jìntóu chuánlái yángjiào, sān ge wèntí yě yǒu le dì-sì ge dá'àn.",
      vi: "Cậu bé trả lời: ‘Vậy cháu sẽ mang một con đường mới về nhà.’ Hòn đá cười, dưới thân xuất hiện một lối nhỏ. Từ cuối đường vọng tiếng dê; ba câu hỏi cũng có đáp án thứ tư.",
    },
  ]),
  "tiem-com-luc-sau-gio-c01": create("tiem-com-luc-sau-gio", [
    {
      markedZhHans: "六点饭馆每天只开两个小时，也只有一张桌子。第一位客人坐下以后，没有看菜单，只说想吃母亲以前做的面。老板[[安静]]地问他还[[记得]]味道吗。",
      pinyin: "Liùdiǎn Fànguǎn měitiān zhǐ kāi liǎng ge xiǎoshí, yě zhǐyǒu yì zhāng zhuōzi. Dì-yī wèi kèrén zuòxià yǐhòu, méiyǒu kàn càidān, zhǐ shuō xiǎng chī mǔqīn yǐqián zuò de miàn. Lǎobǎn ānjìng de wèn tā hái jìde wèidào ma.",
      vi: "Tiệm Cơm Lúc Sáu Giờ mỗi ngày chỉ mở hai tiếng và chỉ có một bàn. Vị khách đầu tiên ngồi xuống, không xem thực đơn mà chỉ nói muốn ăn món mì mẹ từng nấu. Chủ quán lặng lẽ hỏi anh còn nhớ hương vị không.",
    },
    {
      markedZhHans: "客人说记得，可每说一种材料，墙上的旧照片就[[变化]]一次。照片里的母亲从年轻变老，最后坐在这家饭馆的同一张桌前。",
      pinyin: "Kèrén shuō jìde, kě měi shuō yì zhǒng cáiliào, qiáng shàng de jiù zhàopiàn jiù biànhuà yí cì. Zhàopiàn lǐ de mǔqīn cóng niánqīng biàn lǎo, zuìhòu zuò zài zhè jiā fànguǎn de tóng yì zhāng zhuō qián.",
      vi: "Vị khách nói còn nhớ, nhưng mỗi khi kể một nguyên liệu, bức ảnh cũ trên tường lại thay đổi. Người mẹ trong ảnh từ trẻ thành già, cuối cùng ngồi trước chính chiếc bàn này.",
    },
    {
      markedZhHans: "老板端来一碗清汤面，说：‘真正想念的不是味道。’客人吃第一口时，[[听见]]身后有人叫他的小名。他没有回头，只慢慢说了声谢谢。",
      pinyin: "Lǎobǎn duānlái yì wǎn qīngtāngmiàn, shuō: ‘Zhēnzhèng xiǎngniàn de bú shì wèidào.’ Kèrén chī dì-yī kǒu shí, tīngjiàn shēnhòu yǒurén jiào tā de xiǎomíng. Tā méiyǒu huítóu, zhǐ mànmàn shuō le shēng xièxie.",
      vi: "Chủ quán mang ra bát mì nước trong và nói: ‘Thứ anh thật sự nhớ không phải hương vị.’ Khi ăn miếng đầu, vị khách nghe phía sau có người gọi tên ở nhà của mình. Anh không quay lại, chỉ chậm rãi nói cảm ơn.",
    },
  ]),
  "mua-he-o-bac-kinh-c01": create("mua-he-o-bac-kinh", [
    {
      markedZhHans: "安和小雨在北京的旧照相馆一起打工。整理仓库时，他们[[发现]]一台三十年前的相机，里面还有一卷没有洗过的胶片。",
      pinyin: "Ān hé Xiǎoyǔ zài Běijīng de jiù zhàoxiàngguǎn yìqǐ dǎgōng. Zhěnglǐ cāngkù shí, tāmen fāxiàn yì tái sānshí nián qián de xiàngjī, lǐmiàn hái yǒu yì juǎn méiyǒu xǐguo de jiāopiàn.",
      vi: "An và Tiểu Vũ cùng làm thêm tại tiệm ảnh cũ ở Bắc Kinh. Khi dọn kho, họ phát hiện chiếc máy ảnh từ ba mươi năm trước, bên trong còn một cuộn phim chưa rửa.",
    },
    {
      markedZhHans: "第一张照片拍的是同一家店，可门口站着两个和他们很像的年轻人。照片[[后面]]写着：‘请在夏天[[结束]]以前，把相机送回北海。’",
      pinyin: "Dì-yī zhāng zhàopiàn pāi de shì tóng yì jiā diàn, kě ménkǒu zhànzhe liǎng ge hé tāmen hěn xiàng de niánqīngrén. Zhàopiàn hòumian xiězhe: ‘Qǐng zài xiàtiān jiéshù yǐqián, bǎ xiàngjī sònghuí Běihǎi.’",
      vi: "Bức ảnh đầu chụp chính cửa tiệm, nhưng trước cửa có hai người trẻ rất giống họ. Mặt sau ghi: ‘Hãy đưa máy ảnh về Bắc Hải trước khi mùa hè kết thúc.’",
    },
    {
      markedZhHans: "他们带着相机出门，镜头却自己对准胡同的转角。快门响过以后，一条原本封闭的小路[[出现]]了。小雨笑着说，这个夏天也许比计划长得多。",
      pinyin: "Tāmen dàizhe xiàngjī chūmén, jìngtóu què zìjǐ duìzhǔn hútòng de zhuǎnjiǎo. Kuàimén xiǎngguò yǐhòu, yì tiáo yuánběn fēngbì de xiǎolù chūxiàn le. Xiǎoyǔ xiàozhe shuō, zhè ge xiàtiān yěxǔ bǐ jìhuà cháng de duō.",
      vi: "Họ mang máy ảnh ra ngoài nhưng ống kính tự hướng vào góc ngõ. Sau tiếng màn trập, một con đường vốn bị chặn hiện ra. Tiểu Vũ cười nói mùa hè này có lẽ dài hơn kế hoạch rất nhiều.",
    },
  ]),
  "buc-thu-chua-gui-c01": create("buc-thu-chua-gui", [
    {
      markedZhHans: "搬家那天，方宜在旧抽屉里[[发现]]十二封没有寄出的信。前十一封已经发黄，最后一封却很新，上面的日期是下个星期。",
      pinyin: "Bānjiā nà tiān, Fāng Yí zài jiù chōuti lǐ fāxiàn shí'èr fēng méiyǒu jìchū de xìn. Qián shíyī fēng yǐjīng fāhuáng, zuìhòu yì fēng què hěn xīn, shàngmiàn de rìqī shì xià ge xīngqī.",
      vi: "Ngày chuyển nhà, Phương Nghi phát hiện mười hai lá thư chưa gửi trong ngăn kéo cũ. Mười một lá đầu đã ố vàng, còn lá cuối rất mới và ghi ngày tuần sau.",
    },
    {
      markedZhHans: "信都是父亲写的。第一封解释他年轻时为什么离开家，第二封写他怎样[[回来]]，却一直没有勇气[[打开]]母亲留下的盒子。",
      pinyin: "Xìn dōu shì fùqīn xiě de. Dì-yī fēng jiěshì tā niánqīng shí wèishénme líkāi jiā, dì-èr fēng xiě tā zěnyàng huílai, què yìzhí méiyǒu yǒngqì dǎkāi mǔqīn liúxià de hézi.",
      vi: "Tất cả thư đều do cha cô viết. Lá đầu giải thích vì sao ông rời nhà khi trẻ; lá thứ hai kể ông đã trở về thế nào nhưng vẫn không đủ can đảm mở chiếc hộp mẹ để lại.",
    },
    {
      markedZhHans: "方宜读到第十一封时，门铃响了。门外没有人，只有信里提到的那个盒子。盒盖上写着她的[[名字]]，里面传来父亲正在读第十二封信的[[声音]]。",
      pinyin: "Fāng Yí dú dào dì-shíyī fēng shí, ménlíng xiǎng le. Ménwài méiyǒu rén, zhǐyǒu xìn lǐ tídào de nà ge hézi. Hégài shàng xiězhe tā de míngzi, lǐmiàn chuánlái fùqīn zhèngzài dú dì-shí'èr fēng xìn de shēngyīn.",
      vi: "Khi Phương Nghi đọc tới lá thứ mười một, chuông cửa vang. Ngoài cửa không có ai, chỉ có chiếc hộp nhắc trong thư. Trên nắp viết tên cô, bên trong vang giọng cha đang đọc lá thư thứ mười hai.",
    },
  ]),
};
