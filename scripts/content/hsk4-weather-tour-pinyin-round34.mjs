const readings=[
 ['社区运动小组比较了春天两次活动。','Shèqū yùndòng xiǎozǔ bǐjiào le chūntiān liǎng cì huódòng. Dì yī cì zǎochen qìwēn shí’èr shèshìdù, fēng hěn xiǎo, cānjiāzhě chuān máoyī kuài zǒu sìshí fēnzhōng; dì èr cì qìwēn tóngyàng shì shí’èr dù, què yǒu dà fēng hé xiǎo yǔ, xiǎozǔ yuán jìhuà qí chē, hòulái gǎi dào shìnèi zuò lāshēn. Zhǐ kàn wēndù shùzì, liǎng tiān sìhū méiyǒu chābié.'],
 ['活动后，第一次有八成成员表示强度合适，','Huódòng hòu, dì yī cì yǒu bā chéng chéngyuán biǎoshì qiángdù héshì, dì èr cì què zhǐyǒu yíbàn rén xǐhuan línshí gǎibiàn. Niánqīng chéngyuán juéde shìnèi huódòng ānquán dàn bú gòu yǒuqù, jǐ wèi lǎorén zé rènwéi bìmiǎn shīhuá dàolù gèng zhòngyào. Kěxī diàochá méiyǒu jìlù měi ge rén yuánlái de yùndòng xíguàn, yě méiyǒu wèn tāmen shìfǒu dài le fáng yǔ yīfu.'],
 ['负责人因此提出两套方案：风雨小的时候','Fùzérén yīncǐ tíchū liǎng tào fāng’àn: fēngyǔ xiǎo de shíhou bǎoliú hùwài huódòng, tóngshí zhǔnbèi jiào duǎn lùxiàn; tiānqì biànhuà míngxiǎn shí tíqián yì tiān tōngzhī bìng tígōng shìnèi xuǎnzé. Liǎng tào fāng’àn dōu yǐ ānquán wéi jīchǔ, què bù yāoqiú suǒyǒu chéngyuán zuò tóngyàng de xiàngmù. Xiǎozǔ zhǔnbèi fēnbié jìlù niánlíng, jīngyàn hé mǎnyìdù, kànkan chāyì láizì tiānqì, tōngzhī shíjiān háishi gèrén xíguàn.'],
 ['旅行社回顾了两次去南山的行程。','Lǚxíngshè huígù le liǎng cì qù Nánshān de xíngchéng. Chūnjì tuán chéng zǎobān hángbān, dàodá hòu yóu dǎoyóu dài dàjiā cānguān cháyuán, zhǔrén yāoqǐng yóukè pǐncháng xīn chá, bìng shuōmíng cháyè de zhìzuò guòchéng. Chūfā qián, xíngchéngbiǎo xiě de hěn qīngchu, yóukè zhīdào yào zǒu shānlù, yě tíqián zhǔnbèi le héshì de xié.'],
 ['秋季团的路线基本相同，可是航班晚点后，','Qiūjì tuán de lùxiàn jīběn xiāngtóng, kěshì hángbān wǎndiǎn hòu, dǎoyóu zhǐ zài qún lǐ shuō “xiàwǔ huódòng tiáozhěng”, méiyǒu shuōmíng cháyuán cānguān suōduǎn. Jǐ wèi yóukè yǐwéi huódòng bèi qǔxiāo, biàn liú zài jiǔdiàn; lìng yìxiē rén àn yuán shíjiān děng chē, shuāngfāng dōu chǎnshēng le wùhuì. Cháyuán zhǔrén yě àn yuán rénshù zhǔnbèi, zuìhòu shèng xià bù shǎo chádiǎn.'],
 ['旅行社比较后认为，差别不在景点本身，','Lǚxíngshè bǐjiào hòu rènwéi, chābié bú zài jǐngdiǎn běnshēn, ér zài xìnxī shìfǒu jùtǐ, shìfǒu quèrèn shōu dào. Jīnhòu tiáozhěng xíngchéng shí, dǎoyóu yào tóngshí xiě míng “shénme biàn le, wèishénme biàn, yóukè yào zuò shénme”, bìng qǐng měi wèi yóukè huífù. Gōngsī hái huì diànhuà liánxì méiyǒu dú xiāoxi de rén, búguò zhè xiàng bànfǎ shìfǒu néng jiǎnshǎo suǒyǒu wùhuì, hái xūyào gèng duō xíngchéng yànzhèng.']
];
export function correctWeatherTourPinyin34(source){
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
