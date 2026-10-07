const readings=[
 ['去年寒假，青山镇的古桥','Qùnián hánjià, Qīngshān Zhèn de gǔqiáo xīyǐn le hěn duō yóukè. Gǔqiáo yuánlái bù shōu fèi, dàjiā kěyǐ zìyóu jìnrù, kěshì tíngchēchǎng hěn xiǎo, rùkǒu yě zhǐyǒu yì tiáo lù. Zhōngwǔ yǐhòu, děnghòu cānguān de duì yuè lái yuè cháng, yǒuxiē rén wèile pāi zhào zǒu dào wēixiǎn de wèizhì, fùjìn jūmín huí jiā de lù yě cháng bèi dǎng zhù.'],
 ['镇里最初提出向所有游客收费，','Zhèn lǐ zuìchū tíchū xiàng suǒyǒu yóukè shōu fèi, xīwàng yòng ménpiào shōurù zēngjiā guǎnlǐ rényuán. Bùfen jūmín fǎnduì, yīnwèi gǔqiáo yě shì tāmen rìcháng jīngguò de dìfang. Jīngguò liǎng cì gōngkāi tǎolùn, guǎnlǐfāng gǎi wéi yùyuē fēn shí jìnrù: wàidì yóukè zhīfù xiǎo’é fúwùfèi, běndì jūmín píng zhèngjiàn miǎnfèi, lǎorén hé értóng měi tiān hái yǒu bù shōu fèi de gùdìng shíduàn.'],
 ['新办法实行后，队伍变短，','Xīn bànfǎ shíxíng hòu, duìwu biàn duǎn, wēixiǎn wèizhì yě yǒu rén tíxǐng, dàn wèntí méiyǒu wánquán xiāoshī. Jiérì qījiān yùyuē hěn kuài mǎn le, yìxiē línshí huí jiāxiāng de rén wúfǎ jìnrù. Guǎnlǐfāng yīncǐ shuōmíng, shōufèi zhǐshì zhīchí guǎnlǐ de tiáojiàn zhī yī, zhēnzhèng qǐ zuòyòng de shì rénshù xiànzhì, xiànchǎng yǐndǎo hé jūmín cānyù; míngnián hái yào zēngjiā línshí míng’é bìng chóngxīn pínggū.'],
 ['去年十二月，陈老师连续几天咳，','Qùnián shí’èr yuè, Chén lǎoshī liánxù jǐ tiān ké, zǎochen cè tǐwēn zhǐyǒu sānshíliù diǎn bā shèshìdù, yīncǐ tā rènwéi méiyǒu fā shāo jiù bú yòng xiūxi. Tā zhàocháng shàng kè, wǎnshang hái zhǔnbèi cáiliào, jiéguǒ ké de gèng lìhai, xīnqíng yě yīnwèi shuì bù hǎo ér biàn chà. Yīshēng jiǎnchá hòu shuō, wèntí suīrán bù yánzhòng, dàn píláo hé gānzào kōngqì huì ràng zhèngzhuàng chíxù.'],
 ['医生没有只给药，而是提出三个条件：','Yīshēng méiyǒu zhǐ gěi yào, ér shì tíchū sān ge tiáojiàn: měi tiān jìlù shuìmián hé késou cìshù, jiàoshì bǎochí yídìng shīdù, liánxù shuō huà sìshí fēnzhōng hòu xiūxi. Xuéxiào yě tiáozhěng le liǎng jié kè, qǐng tóngshì dài kè. Chén lǎoshī yì kāishǐ juéde máfan, hòulái fāxiàn jìlù ràng tā kàn jiàn nǎ yì tiān xiūxi shǎo, zhèngzhuàng jiù míngxiǎn zēngjiā.'],
 ['两周后，他基本恢复，却继续保留记录','Liǎng zhōu hòu, tā jīběn huīfù, què jìxù bǎoliú jìlù hé xiūxi ānpái. Chén lǎoshī shuō, zhè cì jīnglì shǐ tā yǎngchéng le zhòngshì zǎoqī xìnhào de xíguàn, dàn tā méiyǒu bǎ yí cì huīfù dàng chéng yīxué zhèngmíng. Jìlù zhǐ fǎnyìng tā gèrén de qíngkuàng, ruò yǐhòu gāoshāo huò hūxī kùnnan, réng yào jíshí jiù yī, ér bù néng zhǐ kào yuánlái de bànfǎ.']
];
export function correctBridgeHealthPinyin32(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||typeof v[pinyinKey]!=='string')continue;
   const entry=readings.find(([prefix])=>v[hanziKey].startsWith(prefix));
   if(entry&&v[pinyinKey]!==entry[1]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after:entry[1]});v[pinyinKey]=entry[1];}
  }
  for(const [k,x] of Object.entries(v))walk(x,[...path,k]);
 }walk(content);return {content,changes};
}
