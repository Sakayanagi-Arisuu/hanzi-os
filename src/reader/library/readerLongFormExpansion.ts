import { authorReaderParagraph } from "./chapterAuthoring";
import type { ReaderChapter } from "./readerContentModel";
import {
  readerArcBeat,
  READER_STORY_PROFILE_BY_ID,
} from "./readerStoryArcs";

export const READER_LONG_FORM_MIN_HANZI = 900;
export const READER_LONG_FORM_MAX_HANZI = 1_300;

const countHanzi = (value: string) =>
  [...value].filter((character) => /\p{Script=Han}/u.test(character)).length;

const phaseFor = (chapterNumber: number) => {
  if (chapterNumber === 1) {
    return {
      zh: "被重新打开的第一天",
      pinyin: "bèi chóngxīn dǎkāi de dì yī tiān",
      vi: "ngày đầu tiên vừa được mở lại",
    };
  }
  if (chapterNumber === 2) {
    return {
      zh: "第二个不该出现的记号",
      pinyin: "dì èr ge bù gāi chūxiàn de jìhào",
      vi: "dấu hiệu thứ hai lẽ ra không nên xuất hiện",
    };
  }
  return readerArcBeat(chapterNumber).signal;
};

export const createReaderLongFormExpansion = (
  seriesId: string,
  chapterNumber: number,
) => {
  const story = READER_STORY_PROFILE_BY_ID[seriesId];
  if (!story) return [];
  const { lead, setting, artifact, danger, truth } = story;
  const phase = phaseFor(chapterNumber);
  return [
    {
      markedZhHans: `风从${setting.zh}的高处落下来，带着石头、旧木和雨水混在一起的气味。${lead.zh}站在原地听了很久，确定远处的脚步不是记忆里的回声。`,
      pinyin: `Fēng cóng ${setting.pinyin} de gāochù luò xiàlái, dài zhe shítou, jiùmù hé yǔshuǐ hùn zài yìqǐ de qìwèi. ${lead.pinyin} zhàn zài yuándì tīng le hěn jiǔ, quèdìng yuǎnchù de jiǎobù bú shì jìyì lǐ de huíshēng.`,
      vi: `Gió đổ xuống từ nơi cao của ${setting.vi}, mang theo mùi đá, gỗ cũ và nước mưa hòa lẫn. ${lead.vi} đứng yên nghe rất lâu, xác nhận tiếng chân xa kia không phải tiếng vọng trong ký ức.`,
    },
    {
      markedZhHans: `他把${artifact.zh}翻到背面，发现一道昨天还没有的细痕。细痕围着${phase.zh}转了一圈，像有人故意留下一个只能慢慢读懂的问题。`,
      pinyin: `Tā bǎ ${artifact.pinyin} fāndào bèimiàn, fāxiàn yí dào zuótiān hái méiyǒu de xìhén. Xìhén wéi zhe ${phase.pinyin} zhuǎn le yì quān, xiàng yǒu rén gùyì liúxià yí ge zhǐ néng mànmàn dúdǒng de wèntí.`,
      vi: `Cậu lật mặt sau ${artifact.vi} và thấy một vết mảnh hôm qua chưa hề có. Vết ấy chạy quanh ${phase.vi}, như có người cố ý để lại câu hỏi chỉ có thể hiểu nếu đọc thật chậm.`,
    },
    {
      markedZhHans: `守门的老人说，最近没有陌生人经过。可他说话时一直看着左边的灯，右手却把一张登记纸压在袖子下面。${lead.zh}没有揭穿他，只问今晚几点换灯。`,
      pinyin: `Shǒumén de lǎorén shuō, zuìjìn méiyǒu mòshēngrén jīngguò. Kě tā shuōhuà shí yìzhí kàn zhe zuǒbiān de dēng, yòushǒu què bǎ yì zhāng dēngjìzhǐ yā zài xiùzi xiàmiàn. ${lead.pinyin} méiyǒu jiēchuān tā, zhǐ wèn jīnwǎn jǐ diǎn huàn dēng.`,
      vi: `Ông lão giữ cổng nói gần đây không có người lạ đi qua. Nhưng lúc nói ông cứ nhìn ngọn đèn bên trái, còn tay phải giấu một tờ đăng ký dưới tay áo. ${lead.vi} không vạch trần, chỉ hỏi tối nay mấy giờ thay đèn.`,
    },
    {
      markedZhHans: `回答是三更，可墙上的灯油只够烧到二更。这个小小的矛盾比大声的警告更可靠，因为撒谎的人常常记得故事，却忘了日常的细节。`,
      pinyin: `Huídá shì sāngēng, kě qiáng shàng de dēngyóu zhǐ gòu shāo dào èrgēng. Zhège xiǎoxiǎo de máodùn bǐ dàshēng de jǐnggào gèng kěkào, yīnwèi sāhuǎng de rén chángcháng jìde gùshi, què wàng le rìcháng de xìjié.`,
      vi: `Câu trả lời là canh ba, nhưng dầu đèn trên tường chỉ đủ cháy tới canh hai. Mâu thuẫn nhỏ ấy đáng tin hơn lời cảnh báo lớn, vì người nói dối thường nhớ câu chuyện nhưng quên chi tiết đời thường.`,
    },
    {
      markedZhHans: `${lead.zh}沿着灯影走过三道门，在第三道门后找到半个湿脚印。鞋底沾着${setting.zh}北边才有的白沙，说明来人没有走公开的山路。`,
      pinyin: `${lead.pinyin} yán zhe dēngyǐng zǒuguò sān dào mén, zài dì sān dào mén hòu zhǎodào bàn ge shī jiǎoyìn. Xiédǐ zhān zhe ${setting.pinyin} běibiān cái yǒu de báishā, shuōmíng láirén méiyǒu zǒu gōngkāi de shānlù.`,
      vi: `${lead.vi} theo bóng đèn qua ba cánh cửa và tìm thấy nửa dấu chân ướt sau cửa thứ ba. Đế giày dính thứ cát trắng chỉ có phía bắc ${setting.vi}, chứng tỏ người kia không đi đường núi công khai.`,
    },
    {
      markedZhHans: `上一段人生里，${lead.zh}会立刻追上去，用最快的办法换一个明确答案。现在他先画下脚印的位置，又把风向、钟声和灯火的变化写在同一页上。`,
      pinyin: `Shàng yí duàn rénshēng lǐ, ${lead.pinyin} huì lìkè zhuī shàngqu, yòng zuì kuài de bànfǎ huàn yí ge míngquè dá'àn. Xiànzài tā xiān huàxià jiǎoyìn de wèizhi, yòu bǎ fēngxiàng, zhōngshēng hé dēnghuǒ de biànhuà xiě zài tóng yí yè shàng.`,
      vi: `Ở đời trước, ${lead.vi} hẳn đã đuổi theo ngay, dùng cách nhanh nhất đổi lấy đáp án rõ ràng. Lần này cậu đánh dấu vị trí dấu chân, rồi ghi hướng gió, tiếng chuông và biến đổi ánh đèn trên cùng một trang.`,
    },
    {
      markedZhHans: `纸上的四条记录看起来互不相关，放在一起却指向一条废弃的小路。路口没有门，只有一块被雨洗得发白的石头，石缝里卡着一根新断的黑线。`,
      pinyin: `Zhǐ shàng de sì tiáo jìlù kàn qǐlái hù bù xiāngguān, fàng zài yìqǐ què zhǐxiàng yì tiáo fèiqì de xiǎolù. Lùkǒu méiyǒu mén, zhǐ yǒu yí kuài bèi yǔ xǐ de fābái de shítou, shífèng lǐ kǎ zhe yì gēn xīn duàn de hēixiàn.`,
      vi: `Bốn ghi chép trông không liên quan, nhưng đặt cạnh nhau lại cùng chỉ tới một lối nhỏ bỏ hoang. Đầu đường không có cổng, chỉ có tảng đá bạc màu vì mưa; trong khe đá mắc một sợi chỉ đen vừa đứt.`,
    },
    {
      markedZhHans: `${artifact.zh}靠近黑线时轻轻发热，${danger.zh}的声音也从地下传来。那声音没有威胁他，只是一遍又一遍地念出他曾经最想改变的那个夜晚。`,
      pinyin: `${artifact.pinyin} kàojìn hēixiàn shí qīngqīng fārè, ${danger.pinyin} de shēngyīn yě cóng dìxià chuánlái. Nà shēngyīn méiyǒu wēixié tā, zhǐ shì yí biàn yòu yí biàn de niànchū tā céngjīng zuì xiǎng gǎibiàn de nàge yèwǎn.`,
      vi: `Khi ${artifact.vi} đến gần sợi chỉ đen, nó khẽ nóng lên; âm thanh của ${danger.vi} cũng vọng từ dưới đất. Nó không đe dọa mà cứ lặp đi lặp lại đêm cậu từng muốn thay đổi nhất.`,
    },
    {
      markedZhHans: `他停下脚步，不是因为害怕，而是终于听出每次重复都有一个字不一样。那些变化连起来，正好组成返回${setting.zh}旧井的方向。`,
      pinyin: `Tā tíngxià jiǎobù, bú shì yīnwèi hàipà, ér shì zhōngyú tīngchū měi cì chóngfù dōu yǒu yí ge zì bù yíyàng. Nàxiē biànhuà lián qǐlái, zhènghǎo zǔchéng fǎnhuí ${setting.pinyin} jiùjǐng de fāngxiàng.`,
      vi: `Cậu dừng chân không phải vì sợ, mà vì cuối cùng nghe ra mỗi lần lặp có một chữ khác đi. Những thay đổi nối lại vừa khéo thành chỉ dẫn về chiếc giếng cũ của ${setting.vi}.`,
    },
    {
      markedZhHans: `井边的水没有倒影，只有几段被打乱的过去。${lead.zh}看见自己做过的正确决定，也看见那些决定后来怎样伤害了没有被问过的人。`,
      pinyin: `Jǐngbiān de shuǐ méiyǒu dàoyǐng, zhǐ yǒu jǐ duàn bèi dǎluàn de guòqù. ${lead.pinyin} kànjiàn zìjǐ zuòguò de zhèngquè juédìng, yě kànjiàn nàxiē juédìng hòulái zěnyàng shānghài le méiyǒu bèi wènguò de rén.`,
      vi: `Nước bên giếng không phản chiếu hình người, chỉ hiện vài mảnh quá khứ bị đảo lộn. ${lead.vi} thấy những quyết định đúng mình từng đưa ra, và thấy chúng về sau đã làm tổn thương người chưa từng được hỏi ý.`,
    },
    {
      markedZhHans: `这一次他没有伸手改动水里的画面，而是把看见的事完整记下。承认一个选择有代价，并不等于否定当时努力活下去的自己。`,
      pinyin: `Zhè yí cì tā méiyǒu shēnshǒu gǎidòng shuǐ lǐ de huàmiàn, ér shì bǎ kànjiàn de shì wánzhěng jìxià. Chéngrèn yí ge xuǎnzé yǒu dàijià, bìng bù děngyú fǒudìng dāngshí nǔlì huó xiàqu de zìjǐ.`,
      vi: `Lần này cậu không đưa tay sửa hình ảnh trong nước mà ghi lại trọn vẹn điều đã thấy. Thừa nhận một lựa chọn có cái giá của nó không đồng nghĩa phủ nhận bản thân từng cố sống sót khi ấy.`,
    },
    {
      markedZhHans: `${truth.zh}。这句话过去像一句安慰，现在却成了可以检查行动的规则：如果新选择仍让别人失去说话的机会，那就不算真正的新路。`,
      pinyin: `${truth.pinyin}. Zhè jù huà guòqù xiàng yí jù ānwèi, xiànzài què chéng le kěyǐ jiǎnchá xíngdòng de guīzé: rúguǒ xīn xuǎnzé réng ràng biérén shīqù shuōhuà de jīhuì, nà jiù bú suàn zhēnzhèng de xīnlù.`,
      vi: `${truth.vi}. Trước kia câu này giống một lời an ủi, giờ nó thành quy tắc để kiểm tra hành động: nếu lựa chọn mới vẫn khiến người khác mất quyền lên tiếng, đó chưa phải con đường mới thật sự.`,
    },
    {
      markedZhHans: `${lead.zh}回到守门老人面前，把自己找到的证据分成三份：能公开的、需要保护当事人的，以及还不能确定真假的。老人看完以后，终于把袖中的登记纸放到桌上。`,
      pinyin: `${lead.pinyin} huídào shǒumén lǎorén miànqián, bǎ zìjǐ zhǎodào de zhèngjù fēn chéng sān fèn: néng gōngkāi de, xūyào bǎohù dāngshìrén de, yǐjí hái bù néng quèdìng zhēn jiǎ de. Lǎorén kànwán yǐhòu, zhōngyú bǎ xiùzhōng de dēngjìzhǐ fàng dào zhuō shàng.`,
      vi: `${lead.vi} trở lại trước ông lão giữ cổng và chia bằng chứng thành ba phần: có thể công khai, cần bảo vệ người liên quan, và chưa thể xác định thật giả. Xem xong, ông lão cuối cùng đặt tờ đăng ký trong tay áo lên bàn.`,
    },
    {
      markedZhHans: `登记纸的中间被整齐地割掉一行，刀口很新，纸角却盖着多年前的旧灰。有人最近删去一个很早就被写下的名字，还故意让时间看起来相反。`,
      pinyin: `Dēngjìzhǐ de zhōngjiān bèi zhěngqí de gēdiào yì háng, dāokǒu hěn xīn, zhǐjiǎo què gài zhe duōnián qián de jiùhuī. Yǒu rén zuìjìn shānqù yí ge hěn zǎo jiù bèi xiěxià de míngzi, hái gùyì ràng shíjiān kàn qǐlái xiāngfǎn.`,
      vi: `Giữa tờ đăng ký bị cắt ngay ngắn một dòng; vết dao rất mới nhưng góc giấy phủ lớp bụi cũ nhiều năm. Có người gần đây xóa một cái tên đã được viết từ lâu, còn cố ý khiến trình tự thời gian trông đảo ngược.`,
    },
    {
      markedZhHans: `就在这时，远处的钟提前响了一声。${setting.zh}所有的鸟同时飞起，${artifact.zh}上的细痕也合成一扇门的形状，门后传来第二个人的呼吸。`,
      pinyin: `Jiù zài zhè shí, yuǎnchù de zhōng tíqián xiǎng le yì shēng. ${setting.pinyin} suǒyǒu de niǎo tóngshí fēiqǐ, ${artifact.pinyin} shàng de xìhén yě héchéng yí shàn mén de xíngzhuàng, mén hòu chuánlái dì èr ge rén de hūxī.`,
      vi: `Đúng lúc ấy, tiếng chuông xa vang sớm một nhịp. Mọi con chim ở ${setting.vi} đồng loạt bay lên; vết mảnh trên ${artifact.vi} cũng khép thành hình cánh cửa, phía sau vọng ra hơi thở của người thứ hai.`,
    },
    {
      markedZhHans: `${lead.zh}没有立即开门。他先把今天的记录交给一个可信的人，又在门外留下只有自己看得懂的标记。重来一次给他的不是预知所有答案，而是多一次不让证据消失的机会。`,
      pinyin: `${lead.pinyin} méiyǒu lìjí kāimén. Tā xiān bǎ jīntiān de jìlù jiāogěi yí ge kěxìn de rén, yòu zài ménwài liúxià zhǐ yǒu zìjǐ kàn de dǒng de jìhào. Chónglái yí cì gěi tā de bú shì yùzhī suǒyǒu dá'àn, ér shì duō yí cì bù ràng zhèngjù xiāoshī de jīhuì.`,
      vi: `${lead.vi} không mở cửa ngay. Cậu giao ghi chép hôm nay cho người đáng tin, rồi để lại ngoài cửa một dấu hiệu chỉ mình hiểu. Làm lại một lần không cho cậu biết trước mọi đáp án, mà cho thêm cơ hội không để bằng chứng biến mất.`,
    },
    {
      markedZhHans: `夜色落下时，${danger.zh}暂时退到更深的地方。${lead.zh}收好${artifact.zh}，推开那扇只开了一半的门，知道这一章真正的问题才刚刚出现。`,
      pinyin: `Yèsè luòxià shí, ${danger.pinyin} zànshí tuì dào gèng shēn de dìfāng. ${lead.pinyin} shōuhǎo ${artifact.pinyin}, tuīkāi nà shàn zhǐ kāi le yí bàn de mén, zhīdào zhè yì zhāng zhēnzhèng de wèntí cái gānggāng chūxiàn.`,
      vi: `Khi đêm xuống, ${danger.vi} tạm lùi vào nơi sâu hơn. ${lead.vi} cất ${artifact.vi}, đẩy cánh cửa mới mở một nửa và biết vấn đề thật sự của chương này chỉ vừa xuất hiện.`,
    },
  ];
};

export const ensureReaderLongFormChapter = (chapter: ReaderChapter) => {
  const currentCount = countHanzi(chapter.paragraphs.map((paragraph) => paragraph.zhHans).join(""));
  if (currentCount >= READER_LONG_FORM_MIN_HANZI) return chapter;
  const expansion = createReaderLongFormExpansion(chapter.seriesId, chapter.chapterNumber);
  if (expansion.length === 0) return chapter;
  const paragraphs = [...chapter.paragraphs];
  let hanziCount = currentCount;
  for (const input of expansion) {
    if (hanziCount >= READER_LONG_FORM_MIN_HANZI) break;
    const paragraph = authorReaderParagraph({
      paragraphId: `${chapter.chapterId}-p${String(paragraphs.length + 1).padStart(2, "0")}`,
      ...input,
    });
    paragraphs.push(paragraph);
    hanziCount += countHanzi(paragraph.zhHans);
  }
  return {
    ...chapter,
    paragraphs,
    estimatedMinutes: Math.max(12, chapter.estimatedMinutes),
  };
};
