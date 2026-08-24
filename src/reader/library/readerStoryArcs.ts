import type { ReaderChapterSummary } from "./readerContentModel";
import { READER_CONTENT_VERSION } from "./readerContentModel";

type StoryTerm = { zh: string; pinyin: string; vi: string };

export type ReaderStoryProfile = {
  lead: StoryTerm;
  setting: StoryTerm;
  artifact: StoryTerm;
  danger: StoryTerm;
  truth: StoryTerm;
};

const profile = (
  lead: StoryTerm,
  setting: StoryTerm,
  artifact: StoryTerm,
  danger: StoryTerm,
  truth: StoryTerm,
): ReaderStoryProfile => ({ lead, setting, artifact, danger, truth });

export const READER_STORY_PROFILE_BY_ID: Readonly<Record<string, ReaderStoryProfile>> = {
  "jade-lantern-archive": profile(
    { zh: "陆明", pinyin: "Lù Míng", vi: "Lục Minh" },
    { zh: "青灯书阁", pinyin: "Qīngdēng Shūgé", vi: "Thư Các Thanh Đăng" },
    { zh: "铜钥匙", pinyin: "tóng yàoshi", vi: "chìa khóa đồng" },
    { zh: "墨潮", pinyin: "mòcháo", vi: "thủy triều mực" },
    { zh: "每个人的记忆都应该被保留", pinyin: "měi ge rén de jìyì dōu yīnggāi bèi bǎoliú", vi: "ký ức của mỗi người đều đáng được giữ lại" },
  ),
  "van-menh-nguoc-dong": profile(
    { zh: "谢宁", pinyin: "Xiè Níng", vi: "Tạ Ninh" },
    { zh: "试剑山门", pinyin: "Shìjiàn Shānmén", vi: "sơn môn Thí Kiếm" },
    { zh: "黑签", pinyin: "hēiqiān", vi: "thẻ đen" },
    { zh: "旧命运", pinyin: "jiù mìngyùn", vi: "vận mệnh cũ" },
    { zh: "重来不是重复过去", pinyin: "chónglái bú shì chóngfù guòqù", vi: "làm lại không có nghĩa là lặp lại quá khứ" },
  ),
  "kiem-lo-muoi-bac": profile(
    { zh: "顾川", pinyin: "Gù Chuān", vi: "Cố Xuyên" },
    { zh: "十层剑路", pinyin: "shí céng jiànlù", vi: "Kiếm Lộ mười bậc" },
    { zh: "生锈旧剑", pinyin: "shēngxiù jiùjiàn", vi: "thanh kiếm cũ han gỉ" },
    { zh: "无声考验", pinyin: "wúshēng kǎoyàn", vi: "khảo nghiệm không lời" },
    { zh: "放下答案也是前进", pinyin: "fàngxià dá'àn yě shì qiánjìn", vi: "buông một đáp án cũng là tiến lên" },
  ),
  "dao-mam-giua-tuyet": profile(
    { zh: "阿木", pinyin: "Ā Mù", vi: "A Mộc" },
    { zh: "雪山药园", pinyin: "xuěshān yàoyuán", vi: "vườn thuốc núi tuyết" },
    { zh: "会写字的嫩芽", pinyin: "huì xiězì de nènyá", vi: "mầm non biết viết chữ" },
    { zh: "永不停的寒风", pinyin: "yǒng bù tíng de hánfēng", vi: "gió lạnh không ngừng" },
    { zh: "照顾也包括等待", pinyin: "zhàogù yě bāokuò děngdài", vi: "chăm sóc cũng bao gồm chờ đợi" },
  ),
  "tro-lai-truoc-con-mua": profile(
    { zh: "林河", pinyin: "Lín Hé", vi: "Lâm Hà" },
    { zh: "十年前的旧街", pinyin: "shí nián qián de jiùjiē", vi: "con phố cũ mười năm trước" },
    { zh: "湿纸条", pinyin: "shī zhǐtiáo", vi: "mảnh giấy ướt" },
    { zh: "三天后的大雨", pinyin: "sān tiān hòu de dàyǔ", vi: "trận mưa lớn sau ba ngày" },
    { zh: "要改变的是关门前的话", pinyin: "yào gǎibiàn de shì guānmén qián de huà", vi: "thứ phải đổi là lời nói trước khi cánh cửa khép lại" },
  ),
  "nhat-ky-ngay-mai": profile(
    { zh: "周宇", pinyin: "Zhōu Yǔ", vi: "Châu Vũ" },
    { zh: "旧体育馆", pinyin: "jiù tǐyùguǎn", vi: "nhà thể chất cũ" },
    { zh: "明日日记", pinyin: "míngrì rìjì", vi: "nhật ký ngày mai" },
    { zh: "会消失的未来", pinyin: "huì xiāoshī de wèilái", vi: "tương lai có thể biến mất" },
    { zh: "明天从来不只有一个版本", pinyin: "míngtiān cónglái bù zhǐ yǒu yí ge bǎnběn", vi: "ngày mai chưa bao giờ chỉ có một phiên bản" },
  ),
  "nguoi-canh-giu-lan-hai": profile(
    { zh: "许科", pinyin: "Xǔ Kē", vi: "Hứa Khoa" },
    { zh: "北方城门", pinyin: "běifāng chéngmén", vi: "cổng thành phương Bắc" },
    { zh: "一分为二的钥匙", pinyin: "yì fēn wéi èr de yàoshi", vi: "chìa khóa bị chia đôi" },
    { zh: "来自未来的火", pinyin: "láizì wèilái de huǒ", vi: "ngọn lửa từ tương lai" },
    { zh: "守护不等于永远关门", pinyin: "shǒuhù bù děngyú yǒngyuǎn guānmén", vi: "bảo vệ không có nghĩa là đóng cửa mãi mãi" },
  ),
  "hoc-vien-bay-ngon-lua": profile(
    { zh: "叶蓝", pinyin: "Yè Lán", vi: "Diệp Lam" },
    { zh: "七火学院", pinyin: "Qīhuǒ Xuéyuàn", vi: "Học viện Bảy Ngọn Lửa" },
    { zh: "无色火焰", pinyin: "wúsè huǒyàn", vi: "ngọn lửa không màu" },
    { zh: "被改过的魔法阵", pinyin: "bèi gǎiguò de mófǎzhèn", vi: "ma pháp trận bị sửa" },
    { zh: "没有颜色不代表没有力量", pinyin: "méiyǒu yánsè bù dàibiǎo méiyǒu lìliàng", vi: "không có màu không có nghĩa là không có sức mạnh" },
  ),
  "phap-su-ca-dem": profile(
    { zh: "苏原", pinyin: "Sū Yuán", vi: "Tô Nguyên" },
    { zh: "午夜图书馆", pinyin: "wǔyè túshūguǎn", vi: "thư viện lúc nửa đêm" },
    { zh: "百年逾期书", pinyin: "bǎinián yúqī shū", vi: "quyển sách quá hạn trăm năm" },
    { zh: "被困住的时间", pinyin: "bèi kùnzhù de shíjiān", vi: "thời gian bị mắc kẹt" },
    { zh: "归还一本书也可能归还一个人", pinyin: "guīhuán yì běn shū yě kěnéng guīhuán yí ge rén", vi: "trả một cuốn sách đôi khi cũng là trả một con người về đời thật" },
  ),
  "thanh-lam-thuc-tinh": profile(
    { zh: "安易", pinyin: "Ān Yì", vi: "An Dịch" },
    { zh: "蓝城中央塔", pinyin: "Lánchéng Zhōngyāngtǎ", vi: "tháp trung tâm Thành Lam" },
    { zh: "旧收音机", pinyin: "jiù shōuyīnjī", vi: "chiếc radio cũ" },
    { zh: "全城觉醒", pinyin: "quánchéng juéxǐng", vi: "sự thức tỉnh toàn thành phố" },
    { zh: "沉默的人也能听见真相", pinyin: "chénmò de rén yě néng tīngjiàn zhēnxiàng", vi: "người im lặng vẫn có thể nghe thấy sự thật" },
  ),
  "chuyen-tau-dem-khong-ga-cuoi": profile(
    { zh: "李文", pinyin: "Lǐ Wén", vi: "Lý Văn" },
    { zh: "无终夜车", pinyin: "wúzhōng yèchē", vi: "chuyến tàu đêm không ga cuối" },
    { zh: "五月三十二日车票", pinyin: "wǔ yuè sānshí'èr rì chēpiào", vi: "vé tàu ngày 32 tháng Năm" },
    { zh: "不属于自己的记忆", pinyin: "bù shǔyú zìjǐ de jìyì", vi: "ký ức không thuộc về mình" },
    { zh: "回家以前必须知道自己忘了谁", pinyin: "huíjiā yǐqián bìxū zhīdào zìjǐ wàng le shéi", vi: "trước khi về nhà phải biết mình đã quên ai" },
  ),
  "can-phong-so-bay": profile(
    { zh: "赵新", pinyin: "Zhào Xīn", vi: "Triệu Tân" },
    { zh: "七号密室", pinyin: "Qīhào Mìshì", vi: "mật thất số bảy" },
    { zh: "快七分钟的钥匙", pinyin: "kuài qī fēnzhōng de yàoshi", vi: "chìa khóa nhanh hơn bảy phút" },
    { zh: "镜子里的自己", pinyin: "jìngzi lǐ de zìjǐ", vi: "bản thân trong gương" },
    { zh: "失去的时间不会凭空消失", pinyin: "shīqù de shíjiān bú huì píngkōng xiāoshī", vi: "thời gian đánh mất không tự nhiên biến mất" },
  ),
  "nguoi-gui-thu-trong-mua": profile(
    { zh: "陈眠", pinyin: "Chén Mián", vi: "Trần Miên" },
    { zh: "雨中旧邮局", pinyin: "yǔzhōng jiù yóujú", vi: "bưu điện cũ trong mưa" },
    { zh: "第十三封湿信", pinyin: "dì shísān fēng shīxìn", vi: "lá thư ướt thứ mười ba" },
    { zh: "明天才会失踪的人", pinyin: "míngtiān cái huì shīzōng de rén", vi: "người đến ngày mai mới mất tích" },
    { zh: "有些信必须先找到愿意等待的人", pinyin: "yǒuxiē xìn bìxū xiān zhǎodào yuànyì děngdài de rén", vi: "có những lá thư trước tiên phải tìm được người sẵn lòng chờ" },
  ),
  "tram-khong-gian-so-chin": profile(
    { zh: "江洛", pinyin: "Jiāng Luò", vi: "Giang Lạc" },
    { zh: "第九空间站", pinyin: "Dìjiǔ Kōngjiānzhàn", vi: "Trạm Không Gian Số Chín" },
    { zh: "零点十二分记录", pinyin: "língdiǎn shí'èr fēn jìlù", vi: "bản ghi lúc 0 giờ 12" },
    { zh: "被删除的十二年", pinyin: "bèi shānchú de shí'èr nián", vi: "mười hai năm bị xóa" },
    { zh: "黑暗也可能是一把门锁", pinyin: "hēi'àn yě kěnéng shì yì bǎ ménsuǒ", vi: "bóng tối đôi khi chính là một ổ khóa" },
  ),
  "ky-uc-tren-tang-may": profile(
    { zh: "白新", pinyin: "Bái Xīn", vi: "Bạch Tân" },
    { zh: "云端记忆城", pinyin: "yúnduān jìyì chéng", vi: "thành phố ký ức trên mây" },
    { zh: "二十七年旧文件", pinyin: "èrshíqī nián jiù wénjiàn", vi: "hồ sơ cũ hai mươi bảy năm" },
    { zh: "正在消失的街道", pinyin: "zhèngzài xiāoshī de jiēdào", vi: "những con phố đang biến mất" },
    { zh: "保存记忆也是选择现实", pinyin: "bǎocún jìyì yě shì xuǎnzé xiànshí", vi: "lưu một ký ức cũng là chọn một hiện thực" },
  ),
  "doc-gia-cuoi-cung": profile(
    { zh: "莫游", pinyin: "Mò Yóu", vi: "Mạc Du" },
    { zh: "最后图书馆", pinyin: "zuìhòu túshūguǎn", vi: "thư viện cuối cùng" },
    { zh: "祖父的纸书", pinyin: "zǔfù de zhǐshū", vi: "cuốn sách giấy của ông" },
    { zh: "空白电子文字", pinyin: "kòngbái diànzǐ wénzì", vi: "chữ điện tử trắng xóa" },
    { zh: "读者不是终点而是新的记录者", pinyin: "dúzhě bú shì zhōngdiǎn ér shì xīn de jìlùzhě", vi: "độc giả không phải điểm cuối mà là người ghi chép mới" },
  ),
  "kiem-khach-thanh-co": profile(
    { zh: "无名剑客", pinyin: "wúmíng jiànkè", vi: "kiếm khách vô danh" },
    { zh: "真话古城", pinyin: "zhēnhuà gǔchéng", vi: "cổ thành chỉ nói thật" },
    { zh: "七种鞋印", pinyin: "qī zhǒng xiéyìn", vi: "bảy loại dấu giày" },
    { zh: "会让人忘记的钟声", pinyin: "huì ràng rén wàngjì de zhōngshēng", vi: "tiếng chuông làm người ta quên" },
    { zh: "真话放错顺序也会隐藏真相", pinyin: "zhēnhuà fàng cuò shùnxù yě huì yǐncáng zhēnxiàng", vi: "lời thật đặt sai thứ tự vẫn có thể che giấu chân tướng" },
  ),
  "y-quan-ao-xam": profile(
    { zh: "宁初", pinyin: "Níng Chū", vi: "Ninh Sơ" },
    { zh: "梦中边村", pinyin: "mèngzhōng biāncūn", vi: "thôn biên giới trong mơ" },
    { zh: "半张蓝花药方", pinyin: "bàn zhāng lánhuā yàofāng", vi: "nửa phương thuốc hoa lam" },
    { zh: "黑河共同梦", pinyin: "hēihé gòngtóng mèng", vi: "giấc mơ chung về sông đen" },
    { zh: "有些病藏在不愿记得的事里", pinyin: "yǒuxiē bìng cáng zài bù yuàn jìde de shì lǐ", vi: "có những căn bệnh ẩn trong điều ta không muốn nhớ" },
  ),
  "ban-do-bien-ai": profile(
    { zh: "沈青", pinyin: "Shěn Qīng", vi: "Thẩm Thanh" },
    { zh: "边关无名路", pinyin: "biānguān wúmíng lù", vi: "con đường vô danh nơi biên ải" },
    { zh: "半张皮地图", pinyin: "bàn zhāng pí dìtú", vi: "nửa tấm bản đồ da" },
    { zh: "会擦掉村庄的墨", pinyin: "huì cādiào cūnzhuāng de mò", vi: "mực có thể xóa làng mạc" },
    { zh: "边界也能把失去的地方连起来", pinyin: "biānjiè yě néng bǎ shīqù de dìfāng lián qǐlái", vi: "đường biên cũng có thể nối những nơi đã mất" },
  ),
  "quan-tra-ben-song": profile(
    { zh: "茶馆老板", pinyin: "cháguǎn lǎobǎn", vi: "chủ quán trà" },
    { zh: "河边茶馆", pinyin: "hébiān cháguǎn", vi: "quán trà bên sông" },
    { zh: "两只空茶杯", pinyin: "liǎng zhī kōng chábēi", vi: "hai tách trà trống" },
    { zh: "想被忘记的往事", pinyin: "xiǎng bèi wàngjì de wǎngshì", vi: "chuyện cũ muốn bị lãng quên" },
    { zh: "记得原因比忘记痛苦更重要", pinyin: "jìde yuányīn bǐ wàngjì tòngkǔ gèng zhòngyào", vi: "nhớ lý do quan trọng hơn quên nỗi đau" },
  ),
  "nguoi-ban-bong": profile(
    { zh: "影子商人", pinyin: "yǐngzi shāngrén", vi: "người buôn bóng" },
    { zh: "没有影子的城市", pinyin: "méiyǒu yǐngzi de chéngshì", vi: "thành phố không có bóng" },
    { zh: "装满影子的木箱", pinyin: "zhuāngmǎn yǐngzi de mùxiāng", vi: "rương gỗ đầy những chiếc bóng" },
    { zh: "被转交的悲伤", pinyin: "bèi zhuǎnjiāo de bēishāng", vi: "nỗi buồn bị chuyển sang người khác" },
    { zh: "被拿走的痛苦不会真正消失", pinyin: "bèi názǒu de tòngkǔ bú huì zhēnzhèng xiāoshī", vi: "nỗi đau bị lấy đi không thực sự biến mất" },
  ),
  "ba-cau-hoi-cua-da": profile(
    { zh: "牧童", pinyin: "mùtóng", vi: "cậu bé chăn cừu" },
    { zh: "会说话的山路", pinyin: "huì shuōhuà de shānlù", vi: "con đường núi biết nói" },
    { zh: "三个石头问题", pinyin: "sān ge shítou wèntí", vi: "ba câu hỏi của đá" },
    { zh: "人人都说没有时间", pinyin: "rénrén dōu shuō méiyǒu shíjiān", vi: "ai cũng nói mình không có thời gian" },
    { zh: "慢下来才能带一条新路回家", pinyin: "màn xiàlái cáinéng dài yì tiáo xīnlù huíjiā", vi: "chỉ khi chậm lại ta mới mang được một con đường mới về nhà" },
  ),
  "tiem-com-luc-sau-gio": profile(
    { zh: "饭馆老板", pinyin: "fànguǎn lǎobǎn", vi: "chủ tiệm cơm" },
    { zh: "六点饭馆", pinyin: "Liùdiǎn Fànguǎn", vi: "Tiệm Cơm Lúc Sáu Giờ" },
    { zh: "一碗清汤面", pinyin: "yì wǎn qīngtāngmiàn", vi: "một bát mì nước trong" },
    { zh: "说不出口的告别", pinyin: "shuō bù chūkǒu de gàobié", vi: "lời từ biệt không thể nói ra" },
    { zh: "真正想念的从来不只是味道", pinyin: "zhēnzhèng xiǎngniàn de cónglái bù zhǐ shì wèidào", vi: "thứ thật sự nhớ chưa bao giờ chỉ là hương vị" },
  ),
  "mua-he-o-bac-kinh": profile(
    { zh: "安和小雨", pinyin: "Ān hé Xiǎoyǔ", vi: "An và Tiểu Vũ" },
    { zh: "北京旧照相馆", pinyin: "Běijīng jiù zhàoxiàngguǎn", vi: "tiệm ảnh cũ ở Bắc Kinh" },
    { zh: "三十年前的相机", pinyin: "sānshí nián qián de xiàngjī", vi: "chiếc máy ảnh ba mươi năm trước" },
    { zh: "地图上少掉的房子", pinyin: "dìtú shàng shǎodiào de fángzi", vi: "ngôi nhà thiếu trên bản đồ" },
    { zh: "一张照片也能留下城市的时间", pinyin: "yì zhāng zhàopiàn yě néng liúxià chéngshì de shíjiān", vi: "một bức ảnh cũng có thể giữ lại thời gian của thành phố" },
  ),
  "buc-thu-chua-gui": profile(
    { zh: "方宜", pinyin: "Fāng Yí", vi: "Phương Nghi" },
    { zh: "父亲的旧房子", pinyin: "fùqin de jiù fángzi", vi: "ngôi nhà cũ của cha" },
    { zh: "十二封未寄信", pinyin: "shí'èr fēng wèijìxìn", vi: "mười hai lá thư chưa gửi" },
    { zh: "下星期的日期", pinyin: "xià xīngqī de rìqī", vi: "ngày tháng của tuần sau" },
    { zh: "迟到的解释仍然可能找到收件人", pinyin: "chídào de jiěshì réngrán kěnéng zhǎodào shōujiànrén", vi: "lời giải thích muộn vẫn có thể tìm thấy người nhận" },
  ),
};

const ARC_BEATS = [
  { number: 3, titleZh: "藏在光里的线索", titleVi: "Manh mối giấu trong ánh sáng", signal: { zh: "第一条线索", pinyin: "dì yī tiáo xiànsuǒ", vi: "manh mối đầu tiên" } },
  { number: 4, titleZh: "不请自来的同伴", titleVi: "Người đồng hành không mời mà đến", signal: { zh: "陌生同伴的记号", pinyin: "mòshēng tóngbàn de jìhào", vi: "dấu hiệu của người đồng hành lạ" } },
  { number: 5, titleZh: "被改过的地图", titleVi: "Tấm bản đồ bị sửa", signal: { zh: "一条错误的路", pinyin: "yì tiáo cuòwù de lù", vi: "một con đường sai" } },
  { number: 6, titleZh: "夜里的第三个选择", titleVi: "Lựa chọn thứ ba trong đêm", signal: { zh: "第三个答案", pinyin: "dì sān ge dá'àn", vi: "đáp án thứ ba" } },
  { number: 7, titleZh: "从记录中消失的名字", titleVi: "Cái tên biến mất khỏi hồ sơ", signal: { zh: "被删掉的名字", pinyin: "bèi shāndiào de míngzi", vi: "cái tên bị xóa" } },
  { number: 8, titleZh: "必须支付的代价", titleVi: "Cái giá phải trả", signal: { zh: "不能回避的代价", pinyin: "bù néng huíbì de dàijià", vi: "cái giá không thể né tránh" } },
  { number: 9, titleZh: "最后一扇门", titleVi: "Cánh cửa cuối cùng", signal: { zh: "最后的门锁", pinyin: "zuìhòu de ménsuǒ", vi: "ổ khóa cuối cùng" } },
  { number: 10, titleZh: "天亮以后的新路", titleVi: "Con đường mới sau bình minh", signal: { zh: "通向明天的新路", pinyin: "tōngxiàng míngtiān de xīnlù", vi: "con đường mới dẫn tới ngày mai" } },
] as const;

export const readerArcBeat = (chapterNumber: number) => {
  const beat = ARC_BEATS.find((candidate) => candidate.number === chapterNumber);
  if (!beat) throw new Error(`Reader arc beat missing for chapter ${chapterNumber}.`);
  return beat;
};

export const createReaderArcSummaries = (
  seriesId: string,
  relatedLessonIds: string[],
  fromChapter = 3,
): ReaderChapterSummary[] => {
  const story = READER_STORY_PROFILE_BY_ID[seriesId];
  if (!story) throw new Error(`Reader story profile missing for ${seriesId}.`);
  return ARC_BEATS.filter((beat) => beat.number >= fromChapter).map((beat) => {
    const chapterId = `${seriesId}-c${String(beat.number).padStart(2, "0")}`;
    return {
      chapterId,
      version: `${READER_CONTENT_VERSION}:${chapterId}:1`,
      seriesId,
      chapterNumber: beat.number,
      titleZh: `${beat.titleZh}：${story.artifact.zh}`,
      titleVi: `${beat.titleVi} · ${story.artifact.vi}`,
      hookVi: `${story.lead.vi} lần theo ${beat.signal.vi} ở ${story.setting.vi}, trong khi ${story.danger.vi} đã đến gần hơn một bước.`,
      estimatedMinutes: 7,
      relatedLessonIds,
      publicationStatus: "released-local",
      reviewStatus: "ai-assisted-draft",
      humanReviewed: false,
      rightsManifestId: `reader-chapter:${chapterId}`,
    };
  });
};

export const createReaderArcParagraphs = (seriesId: string, chapterNumber: number) => {
  const story = READER_STORY_PROFILE_BY_ID[seriesId];
  if (!story) throw new Error(`Reader story profile missing for ${seriesId}.`);
  const beat = readerArcBeat(chapterNumber);
  const { lead, setting, artifact, danger, truth } = story;
  const signal = beat.signal;
  return [
    {
      markedZhHans: `天亮以前，${lead.zh}带着${artifact.zh}回到${setting.zh}。昨夜留下的光变成一条细线，指向没有人注意过的角落。`,
      pinyin: `Tiānliàng yǐqián, ${lead.pinyin} dài zhe ${artifact.pinyin} huídào ${setting.pinyin}. Zuóyè liúxià de guāng biàn chéng yì tiáo xìxiàn, zhǐxiàng méiyǒu rén zhùyì guò de jiǎoluò.`,
      vi: `Trước bình minh, ${lead.vi} mang ${artifact.vi} trở lại ${setting.vi}. Ánh sáng còn sót từ đêm qua hóa thành một sợi chỉ mảnh, trỏ tới góc chưa ai chú ý.`,
    },
    {
      markedZhHans: `${artifact.zh}上慢慢显出${signal.zh}，旁边还有一句警告：不要相信最容易找到的路。${lead.zh}没有马上向前，而是先记下光移动的方向。`,
      pinyin: `${artifact.pinyin} shàng mànmàn xiǎnchū ${signal.pinyin}, pángbiān hái yǒu yí jù jǐnggào: bú yào xiāngxìn zuì róngyì zhǎodào de lù. ${lead.pinyin} méiyǒu mǎshàng xiàng qián, ér shì xiān jìxià guāng yídòng de fāngxiàng.`,
      vi: `${signal.vi} dần hiện trên ${artifact.vi}, bên cạnh là lời cảnh báo: đừng tin con đường dễ tìm nhất. ${lead.vi} chưa tiến lên ngay mà ghi lại hướng ánh sáng di chuyển.`,
    },
    {
      markedZhHans: `走廊深处传来${danger.zh}的声音，每一次靠近，墙上的旧记录就少一行。${lead.zh}终于明白，敌人想拿走的不是东西，而是人们做过选择的证据。`,
      pinyin: `Zǒuláng shēnchù chuánlái ${danger.pinyin} de shēngyīn, měi yí cì kàojìn, qiáng shàng de jiù jìlù jiù shǎo yì háng. ${lead.pinyin} zhōngyú míngbai, dírén xiǎng názǒu de bú shì dōngxi, ér shì rénmen zuòguò xuǎnzé de zhèngjù.`,
      vi: `Từ sâu trong hành lang vọng lại âm thanh của ${danger.vi}; mỗi lần nó tiến gần, hồ sơ cũ trên tường lại mất một dòng. ${lead.vi} hiểu thứ kẻ địch muốn lấy không phải đồ vật, mà là bằng chứng con người từng lựa chọn.`,
    },
    {
      markedZhHans: `${lead.zh}想起一路上学到的事实：${truth.zh}。如果为了安全删掉所有痛苦，那么留下来的故事也不再属于原来的人。`,
      pinyin: `${lead.pinyin} xiǎngqǐ yílù shàng xuédào de shìshí: ${truth.pinyin}. Rúguǒ wèile ānquán shāndiào suǒyǒu tòngkǔ, nàme liúxiàlái de gùshi yě bú zài shǔyú yuánlái de rén.`,
      vi: `${lead.vi} nhớ lại sự thật học được trên đường: ${truth.vi}. Nếu vì an toàn mà xóa mọi đau khổ, câu chuyện còn lại cũng không còn thuộc về con người ban đầu.`,
    },
    {
      markedZhHans: `在${setting.zh}最安静的地方，${signal.zh}突然分成两半。一半指向出口，另一半指向${danger.zh}后面的黑门，没有任何规则说明哪边正确。`,
      pinyin: `Zài ${setting.pinyin} zuì ānjìng de dìfāng, ${signal.pinyin} tūrán fēn chéng liǎng bàn. Yí bàn zhǐxiàng chūkǒu, lìng yí bàn zhǐxiàng ${danger.pinyin} hòumiàn de hēimén, méiyǒu rènhé guīzé shuōmíng nǎbiān zhèngquè.`,
      vi: `Ở nơi tĩnh lặng nhất của ${setting.vi}, ${signal.vi} bất ngờ tách đôi. Một nửa chỉ ra lối thoát, nửa kia chỉ tới cánh cửa đen sau ${danger.vi}; không quy tắc nào nói phía nào đúng.`,
    },
    {
      markedZhHans: `${lead.zh}把${artifact.zh}放在两条路中间，拒绝只选一个答案。微光没有熄灭，反而在地面画出第三条路，路边写着所有被删掉的名字。`,
      pinyin: `${lead.pinyin} bǎ ${artifact.pinyin} fàng zài liǎng tiáo lù zhōngjiān, jùjué zhǐ xuǎn yí ge dá'àn. Wēiguāng méiyǒu xīmiè, fǎn'ér zài dìmiàn huàchū dì sān tiáo lù, lùbiān xiězhe suǒyǒu bèi shāndiào de míngzi.`,
      vi: `${lead.vi} đặt ${artifact.vi} giữa hai con đường và từ chối chỉ chọn một đáp án. Ánh sáng không tắt mà vẽ ra lối thứ ba, dọc đường ghi mọi cái tên từng bị xóa.`,
    },
    {
      markedZhHans: `${danger.zh}追到门前时，${lead.zh}大声读出那些名字。每读一个，黑门就亮起一格，直到${signal.zh}变成一把完整的钥匙。`,
      pinyin: `${danger.pinyin} zhuīdào mén qián shí, ${lead.pinyin} dàshēng dúchū nàxiē míngzi. Měi dú yí ge, hēimén jiù liàngqǐ yì gé, zhídào ${signal.pinyin} biàn chéng yì bǎ wánzhěng de yàoshi.`,
      vi: `Khi ${danger.vi} đuổi tới cửa, ${lead.vi} đọc lớn những cái tên ấy. Mỗi tên được đọc làm một ô trên cửa đen sáng lên, cho tới khi ${signal.vi} hóa thành chiếc chìa khóa hoàn chỉnh.`,
    },
    {
      markedZhHans: `门开以后，外面并不是终点，而是一条通向更远地方的新路。${lead.zh}收好${artifact.zh}，把${signal.zh}写进记录，然后在下一次钟声以前继续前进。`,
      pinyin: `Mén kāi yǐhòu, wàimiàn bìng bú shì zhōngdiǎn, ér shì yì tiáo tōngxiàng gèng yuǎn dìfāng de xīnlù. ${lead.pinyin} shōuhǎo ${artifact.pinyin}, bǎ ${signal.pinyin} xiě jìn jìlù, ránhòu zài xià yí cì zhōngshēng yǐqián jìxù qiánjìn.`,
      vi: `Sau cánh cửa không phải điểm cuối mà là con đường mới dẫn xa hơn. ${lead.vi} cất ${artifact.vi}, ghi ${signal.vi} vào hồ sơ rồi tiếp tục tiến lên trước tiếng chuông kế tiếp.`,
    },
  ];
};
