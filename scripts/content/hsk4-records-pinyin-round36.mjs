const readings=[
 ['海风小区有一间公共房间，位置在大门对面。','Hǎifēng xiǎoqū yǒu yì jiān gōnggòng fángjiān, wèizhì zài dàmén duìmiàn. Wùyè chákàn yùyuēbiǎo hòu biǎoshì, guòqù sān ge yuè píngjūn měi tiān zhǐyǒu liǎng cì dēngjì, yīncǐ jiànyì bǎ fángjiān zū gěi shāngdiàn, zēngjiā xiǎoqū shōurù. Zhè ge shùzì kàn qǐlái zhīchí “lìyòng bù zú” de pànduàn, zhōuwéi jǐ dòng lóu de jūmín què tíchū le bùtóng yìjiàn.'],
 ['居民调查发现，很多老人上午直接去下棋，','Jūmín diàochá fāxiàn, hěn duō lǎorén shàngwǔ zhíjiē qù xià qí, méiyǒu shǐyòng wǎngshàng yùyuē; háizi fàng xué hòu zài ménkǒu dú shū, yě méiyǒu bèi dēngjì. Lìng yì fāngmiàn, fángjiān wǎnshang quèshí cháng kōng zhe, dōngtiān nuǎnqì fèiyong hái hěn gāo. Yě jiù shì shuō, yùyuēbiǎo dīgū le bùfen báitiān shǐyòng, què kěnéng zhǔnquè fǎnyìng le wǎnshang de kòngxián qíngkuàng.'],
 ['双方最后同意先进行四周人工计数，','Shuāngfāng zuìhòu tóngyì xiān jìnxíng sì zhōu réngōng jìshù, fēnbié jìlù shíjiān, huódòng rénshù hé shìfǒu yùyuē, zài tǎolùn yòngtú. Wùyè hái gōngkāi diànfèi hé kěnéng de zūjīn, jūmín zé tíchū wǎnshang kāi fùfèi kèchéng, báitiān bǎoliú miǎnfèi kōngjiān de fāng’àn. Mùqián zhèngjù zhǐ néng shuōmíng yuánlái de dēngjì bù wánzhěng, bù néng zhíjiē zhèngmíng chūzū huò bǎoliú nǎ yì zhǒng xuǎnzé gèng hǎo.'],
 ['社区广播采访了一家理发店。','Shèqū guǎngbò cǎifǎng le yì jiā lǐfàdiàn. Diànzhǔ shuō, zuìjìn cháng yǒu kèrén zài wǔcān hòu késou, yīncǐ tā huáiyí diàn lǐ de máojīn qīngxǐ bù gānjìng. Wèile ānquán, tā lìkè gēnghuàn le qīngxǐ yòngpǐn, hái jiǎnshǎo le měi tiān lǐ fà de rénshù. Liǎng zhōu hòu, kèrén késou de bàogào sìhū shǎo le, tā biàn rènwéi xīn yòngpǐn yǒuxiào.'],
 ['一位顾客提醒，咳嗽也可能与下午的道路施工有关。','Yí wèi gùkè tíxǐng, késou yě kěnéng yǔ xiàwǔ de dàolù shīgōng yǒuguān. Diànmén dǎkāi shí, huīchén huì jìnrù shìnèi; shīgōngduì wǔxiū jiéshù hòu, shēngyīn hé huīchén tóngshí zēngjiā. Guǎngbò jìzhě chákàn jìlù, fāxiàn “késou jiǎnshǎo” de liǎng zhōu zhènghǎo xià yǔ jiào duō, diànmén dà bùfen shíjiān guānbì, érqiě jìlù zhǐ xiě le zhǔdòng fǎnyìng de kèrén.'],
 ['这些信息没有证明清洗用品无效，只说明原来的判断缺少对照。','Zhèxiē xìnxī méiyǒu zhèngmíng qīngxǐ yòngpǐn wúxiào, zhǐ shuōmíng yuánlái de pànduàn quēshǎo duìzhào. Diànzhǔ juédìng tóngshí jìlù ménchuāng zhuàngtài, shīgōng shíjiān, tiānqì hé kèrén fǎnyìng, bìng qǐng kèrén sǎomiáo èrwéimǎ bàogào. Guǎngbò bǎ zhè zhǒng biànhuà chēng wéi yí ge xìnhào: dāng jiéguǒ kěnéng yóu duō ge yuányīn zàochéng shí, xiān bǔchōng zhèngjù, zài pànduàn nǎ xiàng cuòshī zhēnzhèng yǒuxiào.']
];
export function correctRecordsPinyin36(source){
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
