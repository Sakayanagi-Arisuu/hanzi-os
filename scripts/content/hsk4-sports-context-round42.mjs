const readings=[
 ['青原队第一次参加国际青年赛，','Qīngyuán duì dì yī cì cānjiā guójì qīngniánsài, xiǎozǔsài qián liǎng chǎng biǎoxiàn hěn hǎo, zhīchízhě biàn rènwéi guànjūn hěn jìn. Dì sān chǎng miànduì duìfāng de kuàisù fángshǒu, Qīngyuán duì shīwù zēngjiā, zuìhòu shībài. Sài hòu bàodào bǎ jiéguǒ guīyīn yú “jīngyàn bù zú”, què méiyǒu shuōmíng jùtǐ huánjié.'],
 ['教练组重新看数据：','Jiàoliànzǔ chóngxīn kàn shùjù: qián liǎng chǎng xiūxi chāoguò yì tiān, dì sān chǎng zhǐyǒu shíbā xiǎoshí; zhǔlì duìyuán shàngchǎng shíjiān yě gèng cháng. Lùxiàng tóngshí xiǎnshì, duìfāng gǎibiàn fángshǒu hòu, Qīngyuán duì réng shǐyòng yuánlái de chuánqiú lùxiàn. Tǐnéng, zhǔnbèi shíjiān hé zhànshù fǎnyìng dōu kěnéng yǒuguān, dānyī yuányīn wúfǎ fùgài quánbù zhèngjù.'],
 ['下一阶段，球队将在训练中模拟短休息，','Xià yí jiēduàn, qiúduì jiāng zài xùnliàn zhōng mónǐ duǎn xiūxi, bìng jìlù duì bùtóng fángshǒu de tiáozhěng sùdù. Bàogào bǎ jiélùn gǎi wéi “zài duǎn xiūxi hé zhànshù tiáozhěng jiào màn de tiáojiàn xià shībài”, ér bú shì shuō guójì jīngyàn zìrán juédìng shèngfù. Zhīchí qiúduì kěyǐ bāokuò pīpíng kě gǎijìn huánjié, bìng bù yāoqiú bǎ shībài jiěshì chéng gèrén nénglì bù zú.'],
 ['城市体育部门开设周末运动计划，','Chéngshì tǐyù bùmén kāishè zhōumò yùndòng jìhuà, xīwàng ràng qīngnián jiànlì yǒuyì, bìng zhīchí zhuīqiú yùndòng mèngxiǎng. Dì yī nián bàomíng rénshù hěn gāo, cǎifǎng zhōng yǒu rén shuō xùnliàn gǎibiàn le rénshēng. Xiàngmùzǔ yīncǐ zhǔnbèi bǎ bàomíng zēngzhǎng dàngzuò zhǔyào chénggōng zhèngjù.'],
 ['独立评估发现，常来训练的人本来就更喜欢运动，','Dúlì pínggū fāxiàn, cháng lái xùnliàn de rén běnlái jiù gèng xǐhuan yùndòng, érqiě jiāotōng fāngbiàn de dìqū cānjiā gèng duō. Liù ge yuè hòu, gùdìng cānyùzhě de péngyou shùliàng hé zìwǒ píngjià shàngshēng, dàn zhōngtú tuìchūzhě méiyǒu jiēshòu dì èr cì cǎifǎng. Jiéguǒ yǔ jījí gǎibiàn yízhì, què bù néng shuōmíng jìhuà dāndú zàochéng suǒyǒu biànhuà.'],
 ['部门随后增加交通补助，','Bùmén suíhòu zēngjiā jiāotōng bǔzhù, bìng bǎ tuìchūzhě nàrù liánxì míngdān. Xià yì nián huì bǐjiào bùtóng chūqín cìshù, yuányǒu yùndòng xíguàn hé dìqū tiáojiàn. Xiàngmù réng bǎoliú mèngxiǎng yǔ yǒuqíng mùbiāo, dàn píngjià cóng xuānchuán gùshi zhuǎnxiàng cānyù fēnbù hé chángqī biànhuà.']
];
const replacements=[
 ['Thanh Nguyên thắng hai trận rồi thua trận ba','Thanh Nguyên thể hiện tốt hai trận đầu rồi thua trận ba'],
 ['người tham gia đều báo thêm bạn và tự tin hơn','người tham gia đều có thêm bạn và tự đánh giá cao hơn'],
 ['người bỏ học không hưởng lợi','người rời chương trình không hưởng lợi'],
 ['因此报告把原因限定为休息与战术反应等条件，并计划分别记录调整速度。','因此报告改为描述休息与战术反应等条件，并计划记录调整速度；它还没有分清各因素的作用。'],
 ['Vì vậy báo cáo giới hạn nguyên nhân ở điều kiện nghỉ và phản ứng chiến thuật, đồng thời sẽ ghi riêng tốc độ điều chỉnh.','Vì vậy báo cáo chuyển sang mô tả điều kiện nghỉ và phản ứng chiến thuật, đồng thời sẽ ghi tốc độ điều chỉnh; vẫn chưa tách được tác động từng yếu tố.']
];
export function correctSportsContext42(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||typeof v[pinyinKey]!=='string')continue;
   const entry=readings.find(([prefix])=>v[hanziKey].startsWith(prefix));
   if(entry&&v[pinyinKey]!==entry[1]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after:entry[1]});v[pinyinKey]=entry[1];}
  }
  for(const [k,x] of Object.entries(v)){
   if(typeof x==='string'&&source.targetLessonId==='hsk4-information-order-cohesion-lesson-03'){let after=x;for(const[a,b]of replacements)after=after.replaceAll(a,b);if(after!==x){changes.push({path:[...path,k],before:x,after});v[k]=after;}}
   else if(typeof x==='object')walk(x,[...path,k]);
  }
 }walk(content);return {content,changes};
}
