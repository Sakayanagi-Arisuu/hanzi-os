import type { ReaderChapter } from "../readerContentModel";
import { createReaderSamplerChapter as create } from "./readerSamplerFactory";

export const READER_SHELF_CHAPTERS: Record<string, ReaderChapter> = {
  "hoc-vien-bay-ngon-lua-c01": create("hoc-vien-bay-ngon-lua", [
    {
      markedZhHans: "觉醒礼上，六座火台先后亮起红、蓝、白、金、紫、黑六种颜色。轮到叶蓝时，水晶里只[[出现]]一点没有颜色的[[光]]，礼堂马上安静下来。",
      pinyin: "Juéxǐnglǐ shàng, liù zuò huǒtái xiānhòu liàngqǐ hóng, lán, bái, jīn, zǐ, hēi liù zhǒng yánsè. Lún dào Yè Lán shí, shuǐjīng lǐ zhǐ chūxiàn yìdiǎn méiyǒu yánsè de guāng, lǐtáng mǎshàng ānjìng xiàlai.",
      vi: "Trong lễ thức tỉnh, sáu đài lửa lần lượt sáng màu đỏ, lam, trắng, vàng, tím và đen. Tới lượt Diệp Lam, trong thủy tinh chỉ xuất hiện một đốm sáng không màu, cả lễ đường lập tức im lặng.",
    },
    {
      markedZhHans: "老师说这是失败，叫她离开。叶蓝刚走到[[出口]]，小小的火光忽然指向考试用的魔法阵。她[[看见]]阵里的七个符号有一个正在慢慢变成假的。",
      pinyin: "Lǎoshī shuō zhè shì shībài, jiào tā líkāi. Yè Lán gāng zǒu dào chūkǒu, xiǎoxiǎo de huǒguāng hūrán zhǐxiàng kǎoshì yòng de mófǎzhèn. Tā kànjiàn zhèn lǐ de qī ge fúhào yǒu yí ge zhèngzài mànmàn biànchéng jiǎ de.",
      vi: "Giáo viên nói đây là thất bại và bảo cô rời đi. Diệp Lam vừa tới lối ra thì đốm lửa nhỏ bỗng chỉ vào pháp trận dùng cho kỳ thi. Cô nhìn thấy một trong bảy ký hiệu trong trận đang từ từ biến thành giả.",
    },
    {
      markedZhHans: "她伸手碰到水晶，整座学院的灯同时熄灭。黑暗里，一个陌生的[[声音]]说：‘第七种火终于回来了。第一项[[任务]]：找出改动法阵的人。’",
      pinyin: "Tā shēnshǒu pèngdào shuǐjīng, zhěng zuò xuéyuàn de dēng tóngshí xīmiè. Hēi'àn lǐ, yí ge mòshēng de shēngyīn shuō: ‘Dì-qī zhǒng huǒ zhōngyú huílai le. Dì-yī xiàng rènwu: zhǎochū gǎidòng fǎzhèn de rén.’",
      vi: "Cô đưa tay chạm thủy tinh, đèn trong toàn học viện đồng loạt tắt. Trong bóng tối, một giọng xa lạ nói: ‘Ngọn lửa thứ bảy cuối cùng đã trở lại. Nhiệm vụ đầu tiên: tìm kẻ đã sửa pháp trận.’",
    },
  ]),
  "phap-su-ca-dem-c01": create("phap-su-ca-dem", [
    {
      markedZhHans: "苏原第一次值夜班，[[图书馆]]里只剩钟声和翻书声。零点以后，归还箱自己[[打开]]，里面躺着一本很厚的蓝皮书，借书日期是一百年前。",
      pinyin: "Sū Yuán dì-yī cì zhí yèbān, túshūguǎn lǐ zhǐ shèng zhōngshēng hé fānshūshēng. Língdiǎn yǐhòu, guīhuánxiāng zìjǐ dǎkāi, lǐmiàn tǎngzhe yì běn hěn hòu de lánpí shū, jièshū rìqī shì yìbǎi nián qián.",
      vi: "Trong ca đêm đầu tiên của Tô Nguyên, thư viện chỉ còn tiếng chuông và tiếng lật sách. Sau nửa đêm, hộp trả sách tự mở; bên trong là một cuốn bìa xanh rất dày, có ngày mượn từ một trăm năm trước.",
    },
    {
      markedZhHans: "系统里没有这本书，也没有借书人的[[名字]]。苏原刚碰到封面，书页就变成一扇小[[门]]。门后有个女孩拍着玻璃，嘴里一直说：‘别把我放回原来的书架。’",
      pinyin: "Xìtǒng lǐ méiyǒu zhè běn shū, yě méiyǒu jièshūrén de míngzi. Sū Yuán gāng pèngdào fēngmiàn, shūyè jiù biànchéng yí shàn xiǎo mén. Mén hòu yǒu ge nǚhái pāizhe bōli, zuǐ lǐ yìzhí shuō: ‘Bié bǎ wǒ fànghuí yuánlái de shūjià.’",
      vi: "Trong hệ thống không có cuốn sách này, cũng không có tên người mượn. Tô Nguyên vừa chạm bìa, trang sách biến thành một cánh cửa nhỏ. Phía sau có cô gái đập lên kính, liên tục nói: ‘Đừng đưa tôi về giá sách cũ.’",
    },
    {
      markedZhHans: "墙上的[[地图]]亮起一排从未见过的书架。值班规则同时多出一句：‘逾期的不是书，是里面的[[时间]]。’苏原拿起钥匙，走向地下二层。",
      pinyin: "Qiáng shàng de dìtú liàngqǐ yì pái cóngwèi jiànguo de shūjià. Zhíbān guīzé tóngshí duō chū yí jù: ‘Yúqī de bú shì shū, shì lǐmiàn de shíjiān.’ Sū Yuán náqǐ yàoshi, zǒuxiàng dìxià èr céng.",
      vi: "Tấm bản đồ trên tường sáng lên một dãy giá sách chưa từng thấy. Nội quy trực ban đồng thời xuất hiện thêm câu: ‘Thứ quá hạn không phải sách, mà là thời gian bên trong.’ Tô Nguyên cầm chìa khóa đi xuống tầng hầm thứ hai.",
    },
  ]),
  "thanh-lam-thuc-tinh-c01": create("thanh-lam-thuc-tinh", [
    {
      markedZhHans: "停电一夜以后，蓝城变得非常[[安静]]。早上六点，所有路灯突然同时亮起，并用同一个[[声音]]叫出安宜的名字。街上的人都听见了，只有她没有。",
      pinyin: "Tíngdiàn yí yè yǐhòu, Lánchéng biànde fēicháng ānjìng. Zǎoshang liù diǎn, suǒyǒu lùdēng tūrán tóngshí liàngqǐ, bìng yòng tóng yí ge shēngyīn jiàochū Ān Yí de míngzi. Jiē shàng de rén dōu tīngjiàn le, zhǐyǒu tā méiyǒu.",
      vi: "Sau một đêm mất điện, Thành Lam trở nên vô cùng yên tĩnh. Sáu giờ sáng, mọi đèn đường bỗng đồng loạt sáng và gọi tên An Dịch bằng cùng một giọng. Tất cả người trên phố đều nghe thấy, chỉ cô là không.",
    },
    {
      markedZhHans: "有人能听懂水，有人能让金属移动，学校很快宣布[[城市]]已经觉醒。安宜仍然没有能力，可她修理的旧收音机却写出一句话：‘请[[帮助]]我们关掉中央塔。’",
      pinyin: "Yǒurén néng tīngdǒng shuǐ, yǒurén néng ràng jīnshǔ yídòng, xuéxiào hěn kuài xuānbù chéngshì yǐjīng juéxǐng. Ān Yí réngrán méiyǒu nénglì, kě tā xiūlǐ de jiù shōuyīnjī què xiěchū yí jù huà: ‘Qǐng bāngzhù wǒmen guāndiào zhōngyāngtǎ.’",
      vi: "Có người hiểu được nước, có người làm kim loại di chuyển; nhà trường nhanh chóng tuyên bố thành phố đã thức tỉnh. An Dịch vẫn không có năng lực, nhưng chiếc radio cũ cô sửa lại viết ra câu: ‘Xin hãy giúp chúng tôi tắt tháp trung tâm.’",
    },
    {
      markedZhHans: "她抬头望向城中心，塔顶的蓝光正在一明一暗。收音机又写道：‘别人听见元素，你能听见我们。’机器里的字开始倒数，留给她的[[时间]]只有十二小时。",
      pinyin: "Tā táitóu wàngxiàng chéng zhōngxīn, tǎdǐng de lánguāng zhèngzài yì míng yí àn. Shōuyīnjī yòu xiědào: ‘Biérén tīngjiàn yuánsù, nǐ néng tīngjiàn wǒmen.’ Jīqì lǐ de zì kāishǐ dàoshǔ, liú gěi tā de shíjiān zhǐyǒu shí'èr xiǎoshí.",
      vi: "Cô ngẩng nhìn trung tâm thành phố, ánh lam trên đỉnh tháp đang chớp tắt. Radio viết tiếp: ‘Người khác nghe nguyên tố, cô nghe được chúng tôi.’ Những con chữ trong máy bắt đầu đếm ngược; cô chỉ còn mười hai giờ.",
    },
  ]),
  "chuyen-tau-dem-khong-ga-cuoi-c01": create("chuyen-tau-dem-khong-ga-cuoi", [
    {
      markedZhHans: "李文赶上最后一班地铁时，站台已经没有别人。车门关闭以后，他才[[发现]]车厢里的[[地图]]没有终点，下一站写着‘你忘记的星期三’。",
      pinyin: "Lǐ Wén gǎnshàng zuìhòu yì bān dìtiě shí, zhàntái yǐjīng méiyǒu biérén. Chēmén guānbì yǐhòu, tā cái fāxiàn chēxiāng lǐ de dìtú méiyǒu zhōngdiǎn, xià yí zhàn xiězhe ‘Nǐ wàngjì de Xīngqīsān’.",
      vi: "Khi Lý Văn kịp chuyến tàu điện cuối, sân ga đã không còn ai. Sau khi cửa đóng, cậu mới phát hiện bản đồ trong toa không có điểm cuối; ga tiếp theo ghi ‘Thứ Tư mà bạn đã quên’.",
    },
    {
      markedZhHans: "车上坐着六个人，每个人手里都有一张旧照片。对面的老人问李文：‘你[[记得]]为什么回家吗？’他正要回答，却发现手机里所有家人的[[名字]]都不见了。",
      pinyin: "Chē shàng zuòzhe liù ge rén, měi ge rén shǒu lǐ dōu yǒu yì zhāng jiù zhàopiàn. Duìmiàn de lǎorén wèn Lǐ Wén: ‘Nǐ jìde wèishénme huíjiā ma?’ Tā zhèng yào huídá, què fāxiàn shǒujī lǐ suǒyǒu jiārén de míngzi dōu bú jiàn le.",
      vi: "Trên tàu có sáu người, ai cũng cầm một tấm ảnh cũ. Ông lão đối diện hỏi Lý Văn: ‘Cậu nhớ vì sao mình về nhà không?’ Cậu vừa định trả lời thì phát hiện tên mọi người thân trong điện thoại đều biến mất.",
    },
    {
      markedZhHans: "广播说：‘请在到站以前找出不属于你的记忆。’隧道外没有墙，只有一座下着雪的[[城市]]。列车减速时，李文在照片上看见了小时候的自己。",
      pinyin: "Guǎngbō shuō: ‘Qǐng zài dàozhàn yǐqián zhǎochū bù shǔyú nǐ de jìyì.’ Suìdào wài méiyǒu qiáng, zhǐyǒu yí zuò xiàzhe xuě de chéngshì. Lièchē jiǎnsù shí, Lǐ Wén zài zhàopiàn shàng kànjiàn le xiǎoshíhou de zìjǐ.",
      vi: "Loa thông báo nói: ‘Hãy tìm ký ức không thuộc về bạn trước khi tới ga.’ Ngoài đường hầm không có tường, chỉ có một thành phố đang tuyết rơi. Khi tàu giảm tốc, Lý Văn nhìn thấy mình lúc nhỏ trong bức ảnh.",
    },
  ]),
  "can-phong-so-bay-c01": create("can-phong-so-bay", [
    {
      markedZhHans: "周城送完最后一份外卖，电梯却没有回到一楼。数字从六跳到七，门外是一条从未见过的走廊。可这座[[楼]]明明只有六层。",
      pinyin: "Zhōu Chéng sòngwán zuìhòu yí fèn wàimài, diàntī què méiyǒu huídào yì lóu. Shùzì cóng liù tiào dào qī, ménwài shì yì tiáo cóngwèi jiànguo de zǒuláng. Kě zhè zuò lóu míngmíng zhǐyǒu liù céng.",
      vi: "Châu Thành giao xong suất ăn cuối nhưng thang máy không trở về tầng một. Con số nhảy từ sáu sang bảy; ngoài cửa là hành lang chưa từng thấy. Nhưng tòa nhà này rõ ràng chỉ có sáu tầng.",
    },
    {
      markedZhHans: "走廊尽头只有一个[[房间]]。桌上放着还热的饭，订单上的[[名字]]正是周城。墙上的钟停在七点，而他的手机显示已经过了零点。",
      pinyin: "Zǒuláng jìntóu zhǐyǒu yí ge fángjiān. Zhuō shàng fàngzhe hái rè de fàn, dìngdān shàng de míngzi zhèng shì Zhōu Chéng. Qiáng shàng de zhōng tíng zài qī diǎn, ér tā de shǒujī xiǎnshì yǐjīng guò le língdiǎn.",
      vi: "Cuối hành lang chỉ có một căn phòng. Trên bàn là phần cơm còn nóng; tên trên đơn chính là Châu Thành. Đồng hồ tường dừng ở bảy giờ, còn điện thoại cho thấy đã qua nửa đêm.",
    },
    {
      markedZhHans: "他转身要走，[[出口]]却变成一面镜子。镜中的自己没有动，只抬手指向桌下。那里放着一把钥匙和一张纸：‘第七个房间只为丢失的时间[[打开]]。’",
      pinyin: "Tā zhuǎnshēn yào zǒu, chūkǒu què biànchéng yí miàn jìngzi. Jìng zhōng de zìjǐ méiyǒu dòng, zhǐ táishǒu zhǐxiàng zhuō xià. Nàli fàngzhe yì bǎ yàoshi hé yì zhāng zhǐ: ‘Dì-qī ge fángjiān zhǐ wèi diūshī de shíjiān dǎkāi.’",
      vi: "Cậu quay người định đi nhưng lối ra đã biến thành gương. Bản thân trong gương không cử động, chỉ giơ tay chỉ dưới bàn. Ở đó có một chìa khóa và tờ giấy: ‘Căn phòng thứ bảy chỉ mở cho thời gian bị đánh mất.’",
    },
  ]),
  "nguoi-gui-thu-trong-mua-c01": create("nguoi-gui-thu-trong-mua", [
    {
      markedZhHans: "陈眠第一天在旧邮局值班，天空还没有下雨，门口却放着一封湿信。信封上没有寄件人的[[名字]]，收件地址则是一条已经消失的街。",
      pinyin: "Chén Mián dì-yī tiān zài jiù yóujú zhíbān, tiānkōng hái méiyǒu xiàyǔ, ménkǒu què fàngzhe yì fēng shīxìn. Xìnfēng shàng méiyǒu jìjiànrén de míngzi, shōujiàn dìzhǐ zé shì yì tiáo yǐjīng xiāoshī de jiē.",
      vi: "Ngày đầu Trần Miên trực ở bưu điện cũ, trời chưa mưa nhưng trước cửa lại có một lá thư ướt. Phong bì không có tên người gửi; địa chỉ nhận là một con phố đã biến mất.",
    },
    {
      markedZhHans: "老邮差说，每逢大雨，这样的信就会[[回来]]。陈眠[[打开]]抽屉，里面整齐地放着十二封同样的信。每个收件人都在收到信以前失踪了。",
      pinyin: "Lǎo yóuchāi shuō, měi féng dàyǔ, zhèyàng de xìn jiù huì huílai. Chén Mián dǎkāi chōuti, lǐmiàn zhěngqí de fàngzhe shí'èr fēng tóngyàng de xìn. Měi ge shōujiànrén dōu zài shōudào xìn yǐqián shīzōng le.",
      vi: "Người đưa thư già nói cứ mưa lớn là những lá thư như vậy quay lại. Trần Miên mở ngăn kéo và thấy mười hai lá tương tự được xếp ngay ngắn. Mọi người nhận đều mất tích trước khi thư tới.",
    },
    {
      markedZhHans: "窗外终于传来雨声，第十三封信从投递口滑进来。上面写着陈眠的[[名字]]，寄出时间是明天早上。她还没拆信，邮局的[[门]]已经从外面锁上了。",
      pinyin: "Chuāngwài zhōngyú chuánlái yǔshēng, dì-shísān fēng xìn cóng tóudìkǒu huájìnlai. Shàngmiàn xiězhe Chén Mián de míngzi, jìchū shíjiān shì míngtiān zǎoshang. Tā hái méi chāixìn, yóujú de mén yǐjīng cóng wàimiàn suǒshàng le.",
      vi: "Ngoài cửa sổ cuối cùng vang tiếng mưa; lá thư thứ mười ba trượt qua khe. Trên đó ghi tên Trần Miên, thời gian gửi là sáng mai. Cô chưa mở thư thì cửa bưu điện đã bị khóa từ bên ngoài.",
    },
  ]),
};
