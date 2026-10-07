const readings=[
 ['高三学生小雨想在毕业后用半年参加志愿服务，','Gāosān xuéshēng Xiǎoyǔ xiǎng zài bìyè hòu yòng bàn nián cānjiā zhìyuàn fúwù, zài shēnqǐng dàxué. Fùqīn rènwéi xiān rùxué gèng wěndìng, dānxīn jiàngé bàn nián huì yǐngxiǎng xuéxí xìnxīn. Fùnǚ dì yī cì tánhuà shí dōu zhǐ shuōmíng zìjǐ de jìhuà: Xiǎoyǔ qiángdiào fúwù jīngyàn de hǎochu, fùqīn qiángdiào àn zhèngcháng shíjiān rùxué, jiéguǒ liǎng rén juéde duìfāng méiyǒu rènzhēn tīng.'],
 ['第二次谈话前，他们各自写下三个问题。','Dì èr cì tánhuà qián, tāmen gèzì xiě xià sān ge wèntí. Fùqīn xiǎng zhīdào xiàngmù shìfǒu yǒu péixùn, fèiyong cóng nǎlǐ lái, jiéshù hòu zěnyàng zhǔnbèi kǎoshì; Xiǎoyǔ zé wèn fùqīn zuì dānxīn de fēngxiǎn shì shénme, yǐjí shénme zhèngjù néng ràng tā fàngxīn. Tánhuà zhōng, Xiǎoyǔ chéngrèn zìjǐ hái méiyǒu suàn qīng fèiyong, fùqīn yě chéngrèn zhìyuàn fúwù kěnéng bāngzhù tā liǎojiě jiānglái de zhuānyè fāngxiàng.'],
 ['最后的安排不是任何一方原来的答案：','Zuìhòu de ānpái bú shì rènhé yì fāng yuánlái de dá’àn: Xiǎoyǔ xiān shēnqǐng xuéxiào bìng bǎoliú rùxué zīgé, zài cānjiā sān ge yuè xiàngmù; měi yuè xiàng jiā lǐ bàogào xuéxí jìhuà hé fèiyong. Fùqīn fùzé yìqǐ jiǎnchá hétong, què bù tì tā juédìng jùtǐ gōngzuò. Tāmen bǎ lǐmào lǐjiě wéi zhǔnquè huíyìng duìfāng de dānxīn, ér bú shì biǎomiàn tóngyì. Zhè ge jiéguǒ shìhé tāmen, què wèibì shìhé suǒyǒu jiātíng.'],
 ['学生会本来计划在十月举行校园读书夜，','Xuéshēnghuì běnlái jìhuà zài shí yuè jǔxíng xiàoyuán dúshūyè, dì yī tiáo xiāoxi zhǐ xiě le rìqī hé “huānyíng cānjiā”. Sān tiān hòu, bàomíng rénshù hěn shǎo, yǒu rén yǐwéi huódòng zhǐshì tīng lǎoshī jiǎng huà, yě yǒu rén bù zhīdào kěyǐ dài zìjǐ de shū. Zǔzhīzhě méiyǒu fàngqì, ér shì fǎngwèn le shí míng xuéshēng, liǎojiě tāmen zuì xiǎng zhīdào de xìnxī.'],
 ['第二条消息增加了时间表：','Dì èr tiáo xiāoxi zēngjiā le shíjiānbiǎo: xiān jiāohuàn shū, zài fēn xiǎozǔ lǎngdú, zuìhòu tuījiàn yì běn shū; hái shuōmíng bú yuàn lǎngdú de rén kěyǐ zhǐ tīng. Bàomíng hěn kuài zēngjiā, dàn huódòng dàngtiān túrán xià yǔ, yuánlái de yuànzi bù néng shǐyòng. Zǔzhīzhě bǎ huódòng yí dào sān ge jiàoshì, bìng yòng xiàoyuán guǎngbō gàosu dàjiā xīn de dìdiǎn.'],
 ['活动结束后，参加者说最难忘的不是人数，','Huódòng jiéshù hòu, cānjiāzhě shuō zuì nánwàng de bú shì rénshù, ér shì kěyǐ xuǎnzé lǎngdú huò qīngtīng, yě néng rènshi bùtóng zhuānyè de tóngxué. Zǔzhīzhě zǒngjié le liǎng xiàng yōudiǎn: jùtǐ xiāoxi jiàngdī le bù quèdìnggǎn, bèiyòng jiàoshì shǐ biànhuà méiyǒu zhōngduàn huódòng. Búguò fǎnkuì láizì yuànyì tiánxiě wènjuàn de rén, bù néng shuōmíng méi cānjiāzhě wèishénme quēxí.']
];
export function correctDialoguePinyin38(source){
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
