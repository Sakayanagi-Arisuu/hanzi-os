// Six complete paragraphs read against their Hanzi; update every current copy.
const readings=[
 ['林然小时候住在老家，每到冬天，', 'Lín Rán xiǎo shíhou zhù zài lǎojiā, měi dào dōngtiān, fùmǔ dōu huì dài tā qù wàipó jiā chī fàn. Nà shí zuò cài zhǔyào shì zhǎngbèi de shì, háizimen zhǐ děng zhe chī xiǎochī hé rè cài. Hòulái yì jiā rén bān dào chéngshì, jiàn miàn de jīhuì biàn shǎo, zhè dùn fàn yě cóng měi yuè yí cì biàn chéng le Chūnjié qiánhòu cái yǒu de jiātíng jùhuì.'],
 ['前年，外婆因为腿不方便，','Qiánnián, wàipó yīnwèi tuǐ bù fāngbiàn, tíchū bú zài zhǔnbèi dà zhuō fàn. Lín Rán dānxīn chuántǒng jiù cǐ zhōngduàn, yúshì jiànyì bǎ jùhuì gǎi chéng gòngtóng zuò fàn de huódòng: fùmǔ fùzé mǎi cài, niánqīngrén zhěnglǐ shípǔ, háizi xǐ cài bǎi zhuō, wàipó zhǐ jiāo dàjiā tiáowèi. Dì yī cì hézuò bìng bù shùnlì, jǐ dào cài zuò wǎn le, kěshì méi rén zài bǎ wàipó dàng chéng wéiyī de chúshī.'],
 ['今年，家人提前在网上分配任务，','Jīnnián, jiārén tíqián zài wǎngshàng fēnpèi rènwu, hái bǎ měi ge rén xuéhuì de yí dào jiāxiāng cài xiě jìn jiātíng shípǔ. Jùhuì cóng “huí qu chī fàn” biàn chéng le “huí qu yìqǐ wánchéng yí jiàn shì”. Biànhuà méiyǒu bǎoliú guòqù de quánbù xíngshì, què ràng bùtóng niánlíng de rén dōu yǒu míngquè juésè, yě ràng háizi zhīdào shíwù, jìyì hé qīnqíng shì zěnyàng lián zài yìqǐ de.'],
 ['周五晚上，小周准备周末旅行时，','Zhōuwǔ wǎnshang, Xiǎo Zhōu zhǔnbèi zhōumò lǚxíng shí, zhǐ kàn le dìtú shàng de jùlí, méiyǒu chá zuìxīn de jiāotōng tōngzhī. Tā zhěnglǐ hǎo yīfu hé zhèngjiàn, jìhuà dì èr tiān qī diǎn chū mén, yǐwéi yí ge xiǎoshí jiù néng dào jīchǎng. Kěshì yè lǐ shì lǐ fābù xiāoxi: jīchǎng fāngxiàng yǒu dàolù wéixiū, zǎo gāofēng kěnéng yánzhòng dǔchē.'],
 ['第二天，他上出租车后才听司机说起维修。','Dì èr tiān, tā shàng chūzūchē hòu cái tīng sījī shuō qǐ wéixiū. Chē kāi le èrshí fēnzhōng jīhū méi dòng, tā chàdiǎnr yǐwéi yídìng gǎn bu shàng fēijī. Sījī jiànyì zài xià yí zhàn huàn dìtiě, Xiǎo Zhōu yìbiān liánxì hángkōng gōngsī, yìbiān chóngxīn zhěnglǐ lùxiàn. Dìtiě suīrán yào huàn liǎng cì, què bì kāi le zuì dǔ de yí duàn lù.'],
 ['他最后在停止登机前十五分钟到达。','Tā zuìhòu zài tíngzhǐ dēng jī qián shíwǔ fēnzhōng dàodá. Huí jiā hòu, Xiǎo Zhōu méiyǒu zhǐ bǎ zhè cì jīnglì jiěshì wéi “yùnqi hǎo”, ér shì bǎ zhǔnbèi guòchéng fēn chéng sān ge shíjiān diǎn: qián yì wǎn chá tōngzhī, chū mén qián bǐjiào lùxiàn, túzhōng bǎoliú huàn chē shíjiān. Cóng nà yǐhòu, tā měi cì lǚxíng dōu àn zhè zhāng shíjiānbiǎo jiǎnchá, zhìjīn méiyǒu zài yù dào tóngyàng de wèntí.']
];
export function correctSourcePinyin26(source){
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
