const readings=[
 ['新居民搬进明河社区后，','Xīn jūmín bān jìn Mínghé shèqū hòu, chángcháng bù zhīdào gāi qù nǎlǐ bàn shì. Shèqū zhōngxīn bǎ yīliáo, xiūlǐ, jiāotōng zīxún hé lǎorén zhàogù děng fúwù liè chéng yì zhāng biǎo, bìng zài měi xiàng fúwù hòu xiě míng fùzérén de xìngmíng hé liánxì fāngshì. Jūmín kěyǐ xiān cházhǎo xūyào de xiàngmù, zài juédìng zàixiàn liúyán háishi dào fúwùtái shuōmíng qíngkuàng.'],
 ['表上看起来只有几个名字，','Biǎo shàng kàn qǐ lái zhǐyǒu jǐ ge míngzi, shíjì gōngzuò què yóu duō fāng hézuò wánchéng. Gōngzuò rényuán shōu dào wèntí hòu xiān fēnlèi, zài qǐng zhìyuànzhě huífù yìbān zīxún; rúguǒ shèjí dàolù ānquán, jiù zhuǎn gěi jiāojǐng. Rúguǒ lǎorén xíngdòng bú biàn, wéixiū rényuán huò yīshēng hái kěyǐ yùyuē shàng mén. Zhèyàng, měi ge rén de juésè bùtóng, dàn xìnxī bú huì tíng zài yí ge rén shǒu lǐ.'],
 ['三个月后，中心发现大多数问题','Sān ge yuè hòu, zhōngxīn fāxiàn dàduōshù wèntí néng zài yì tiān nèi dédào huífù, búguò yě yǒu jūmín bǎ jǐnjí qiúzhù xiě chéng pǔtōng liúyán. Yúshì zhōngxīn zài biǎo shàng zēngjiā le “jǐnjí chéngdù” hé “shìfǒu xūyào shàng mén” liǎng lán, bìng ānpái zhíbān rényuán diànhuà quèrèn. Xīn bànfǎ méiyǒu jiǎnshǎo cānyùzhě, què ràng jūmín gèng róngyì kàn qīng shéi fùzé pànduàn, shéi fùzé chǔlǐ, shéi fùzé jìxù gēnjìn.'],
 ['长途车站过去只有两家快餐店，','Chángtú chēzhàn guòqù zhǐyǒu liǎng jiā kuàicāndiàn, xǔduō lǚkè wèile gǎn chē, zhǐ néng mǎi yǐjīng zhuāng hǎo de tàocān. Chēzhàn jīnglǐ fāxiàn, lǎorén hé dài háizi de jiātíng chángcháng chī bu wán, ér xūyào qīngdàn yǐnshí de rén yě hěn nán zhǎo dào héshì de zhōngcān. Yǒu rén yīncǐ xuǎnzé bù chī wǔfàn, yě yǒu rén bǎ méi chī wán de shípǐn zhíjiē rēng diào.'],
 ['后来，车站邀请三类人一起讨论：','Hòulái, chēzhàn yāoqǐng sān lèi rén yìqǐ tǎolùn: lǚkè dàibiǎo shuōmíng shíjiān hé jiàgé yāoqiú, chúshī jièshào nǎxiē měishí néng tíqián zhǔnbèi, wèishēng rényuán zé tíxǐng dàjiā xiān cài hé rè cài bù néng zài chángwēn xià fàng tài jiǔ. Tāmen zuìhòu juédìng shèzhì xiǎo fèn chuāngkǒu, bìng bǎ měi fèn cài de zhǔyào cáiliào, zhòngliàng hé zhìzuò shíjiān xiě zài diànzǐpái shàng.'],
 ['试行一个月后，窗口前排队的人','Shìxíng yí ge yuè hòu, chuāngkǒu qián pái duì de rén bǐ yùxiǎng de duō, dàn shípǐn làngfèi míngxiǎn jiǎnshǎo. Jīnglǐ méiyǒu yīncǐ rèndìng fāng’àn yǐjīng wánměi, yīnwèi diàochá zhǐ fùgài gōngzuòrì zhōngwǔ, yě méiyǒu jìlù lǚkè shìfǒu zhēnzhèng xǐhuan zhèxiē kǒuwèi. Chēzhàn zhǔnbèi zài zhōumò jìxù shōují yìjiàn, zài juédìng shìfǒu zēngjiā wǎncān hé dìfang tèsè cài.']
];
export function correctServicePinyin30(source){
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
