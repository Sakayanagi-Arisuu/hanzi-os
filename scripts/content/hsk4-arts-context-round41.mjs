const readings=[
 ['海桥社区整理十年艺术档案，','Hǎiqiáo shèqū zhěnglǐ shí nián yìshù dàng’àn, zuìchū zhǐ àn huódòng rìqī fàng zài yìqǐ. Xīn xiǎozǔ bǎ cáiliào fēn wéi wǔtái, wénzì hé shìjué sān lèi: yí bù duǎnjù hé yí cì yǎnchàng guī rù wǔtái, yì piān pínglùn guī rù wénzì, yì zhāng tú zé jìnrù shìjué mùlù. Fēnlèi yījù shì zhǔyào biǎodá xíngshì, bú shì zuòpǐn jiàzhí.'],
 ['问题出现在综合作品。','Wèntí chūxiàn zài zōnghé zuòpǐn. Yí bù guānyú héliú de yǎnchū tóngshí yǒu shī, xiànchǎng yǎnchàng hé tóuyǐngtú, sān ge fùzérén dōu xīwàng shōurù zìjǐ de mùlù. Xiǎozǔ bǎoliú yí ge zhǔyào lèibié, zài zēngjiā liǎng ge jiāochā biāoqiān, bìng jìlù shì shéi zuò chū pànduàn. Zhèyàng jì néng cházhǎo, yě bú huì jiǎzhuāng zuòpǐn zhǐyǒu yì zhǒng xíngshì.'],
 ['六个月后，读者找到资料的时间缩短，','Liù ge yuè hòu, dúzhě zhǎo dào zīliào de shíjiān suōduǎn, dàn shìjué mùlù de shǐyòng zēngzhǎng zuì duō. Bàogào méiyǒu shuō tú bǐ wénzhāng huò yǎnchàng gèng zhòngyào, yīnwèi zhǎnlǎn rùkǒu zhènghǎo fàng zài shìjué yè. Xià yì lún jiāng tiáozhěng rùkǒu wèizhì, bìng ràng chuàngzuòzhě shuōmíng zìjǐ zěnyàng lǐjiě zuòpǐn xíngshì.'],
 ['青年中心准备艺术体育晚会，','Qīngnián zhōngxīn zhǔnbèi yìshù tǐyù wǎnhuì, yāoqǐng qiúduì biǎoyǎn jiézòu xùnliàn, yě qǐng gēshǒu hé wǔdǎotuán cānjiā. Dǎoyǎn guǎn zhěng chǎng shùnxù, jiàoliàn bǎozhèng dòngzuò ānquán, yīnxiǎngzǔ kòngzhì yīnyuè. Dì yī cì cǎipái hòu guānzhòng shuō jiézòu hěn bàng, què fēn bu qīng shéi néng juédìng zàntíng jiémù.'],
 ['第二次彩排中，一名队员差点摔倒。','Dì èr cì cǎipái zhōng, yì míng duìyuán chàdiǎn shuāi dǎo. Jiàoliàn lìkè zàntíng dòngzuò, dǎoyǎn suíhòu tiáozhěng dēngguāng hé jiémù chángdù. Shuāngfāng yuēdìng: ānquán wèntí yóu jiàoliàn xiān tíng, yìshù jiézòu yóu dǎoyǎn xiūgǎi, jìshù gùzhàng yóu yīnxiǎngzǔ bàogào. Qiúduì jíshǐ zài bǐsài zhōng shū le, yě bù yǐngxiǎng tā zài wǎnhuì zhōng de chuàngzuò yìjiàn.'],
 ['正式演出顺利完成，观众评价也提高。','Zhèngshì yǎnchū shùnlì wánchéng, guānzhòng píngjià yě tígāo. Búguò zhōngxīn zhǐ diàochá le dàochǎngzhě, méiyǒu xúnwèn yīn piàojià huò shíjiān bù néng lái de rén. Fùzérén rènwéi juésètú jiějué le xiànchǎng juécè, què bù néng zhèngmíng kuàjiè wǎnhuì shìhé suǒyǒu shèqū chéngyuán.']
];
const incorrect='Việc đội bóng từng thua trận không làm mất ý kiến sáng tạo trong đêm diễn.';
const corrected='Ngay cả nếu đội bóng thua trận, điều đó cũng không ảnh hưởng đến ý kiến sáng tạo của đội trong đêm diễn.';
export function correctArtsContext41(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||typeof v[pinyinKey]!=='string')continue;
   const entry=readings.find(([prefix])=>v[hanziKey].startsWith(prefix));
   if(entry&&v[pinyinKey]!==entry[1]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after:entry[1]});v[pinyinKey]=entry[1];}
  }
  for(const [k,x] of Object.entries(v)){
   if(typeof x==='string'&&x.includes(incorrect)){const after=x.replaceAll(incorrect,corrected);changes.push({path:[...path,k],before:x,after});v[k]=after;}
   else if(typeof x==='object')walk(x,[...path,k]);
  }
 }walk(content);
 if(content.targetLessonId==='hsk4-information-order-cohesion-lesson-02'){
  const b=content.lessonPages.pages.flatMap(p=>p.blocks).find(b=>b.id.endsWith(':defense'));
  if(!b?.activity)throw Error('Missing defense');
  const before=b.activity.explanation;
  b.activity.explanation=before.replace('彩排中队员差点摔倒，证明安全暂停权必须独立。','彩排中队员差点摔倒，教练先暂停动作；这支持事先明确安全暂停权的建议。').replace('Sự cố suýt ngã ở buổi ráp cho thấy quyền dừng an toàn phải độc lập.','Khi thành viên suýt ngã, huấn luyện viên dừng động tác trước; điều đó hỗ trợ đề nghị quy định rõ quyền dừng vì an toàn.').replace('使用增长受入口影响，观众调查也没有包括缺席者。','使用增长可能受入口位置影响，观众调查也没有包括缺席者。').replace('Lượt dùng chịu ảnh hưởng lối vào và khảo sát không gồm người vắng.','Lượt dùng có thể chịu ảnh hưởng vị trí lối vào; khảo sát không gồm người vắng.');
  if(before!==b.activity.explanation)changes.push({blockId:b.id,before,after:b.activity.explanation});
 }
 return {content,changes};
}
