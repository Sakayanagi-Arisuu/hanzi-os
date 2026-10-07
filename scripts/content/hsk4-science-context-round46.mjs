const readings=[
 ['北岭保护站研究高山植物怎样适应寒冷。','Běilǐng bǎohùzhàn yánjiū gāoshān zhíwù zěnyàng shìyìng hánlěng. Zhèlǐ de dàzìrán kàn sì wú rén guǎnlǐ, shíjì yǒu yánjiūyuán jìlù kāi huā shíjiān, hùlínyuán jiǎnchá yóukè lùxiàn, fùjìn jūmín bàogào shǎojiàn biànhuà. Sān lèi rén guānchá tóng yí piàn zìrán qūyù, què shǐyòng bùtóng zhīshi.'],
 ['研究员每周固定测量，便于比较年份；','Yánjiūyuán měi zhōu gùdìng cèliáng, biànyú bǐjiào niánfen; hùlínyuán měi tiān xún lù, nénggòu jíshí fāxiàn cǎità; jūmín bú àn biǎo jìlù, què shúxī nǎxiē zhíwù guòqù chángjiàn. Bǎohùzhàn bǎ shùjù, xiànchǎng xíngdòng hé chángqī jìyì fàng zài yì zhāng juésètú shàng, bù bǎ rènhé yì zhǒng xìnxī dàngchéng quánbù shìshí.'],
 ['去年一种花提早开放时，','Qùnián yì zhǒng huā tízǎo kāifàng shí, yánjiūyuán xiān quèrèn wēndù jìlù, hùlínyuán jiǎnchá lùxiàn biànhuà, jūmín bǔchōng guòqù zhàopiàn. Zuìhòu zhǐ néng shuō wēndù yǔ kāifàng shíjiān tóngshí biànhuà, yóukè yǐngxiǎng réng bù quèdìng. Juésètú bāngzhù dàjiā zhīdào shéi tígōng shénme zhèngjù, yě tíxǐng tāmen bú yào yuèguò zhèngjù fànwéi.'],
 ['农业学校建了一座低温温室，','Nóngyè xuéxiào jiàn le yí zuò dīwēn wēnshì, mùbiāo bú shì bǎ shìnèi biàn de hěn rè, ér shì jiǎnshǎo yèjiān rèliàng liúshī. Dì yī ge jìshù xiàngmù gēnghuàn qiángmiàn cáiliào, dì èr xiàng zài wūdǐng jiā kě yídòng bǎowēncéng, dì sān xiàng shǐyòng chuángǎnqì jìlù bùtóng wèizhì wēndù.'],
 ['工程师负责技术设计，教师把数据用于课程，','Gōngchéngshī fùzé jìshù shèjì, jiàoshī bǎ shùjù yòng yú kèchéng, xuéshēng nénggòu gǎibiàn kāiguān shíjiān bìng guānchá jiéguǒ. Suízhe dōngjì dàolái, tuánduì fāxiàn bǎowēncéng zài wú fēng yèwǎn zuòyòng míngxiǎn, dàn dà fēng shí qiángjiǎo réngrán hěn lěng. Dān kàn píngjūn wēndù huì yǐncáng zhèxiē wèizhì chāyì.'],
 ['团队没有说某一种材料解决了全部问题，','Tuánduì méiyǒu shuō mǒu yì zhǒng cáiliào jiějué le quánbù wèntí, ér shì bǎ shèjì, jiàoxué hé wéihù zérèn fēnkāi. Xià yí bù jiāng bǐjiào bùtóng qiángjiǎo cáiliào, bìng bǎoliú yuán chuángǎnqì zuòwéi duìzhào. Zhè ge xiàngmù shuōmíng jìshù bú shì yí ge shèbèi míngchēng, ér shì cáiliào, cèliáng, cāozuò hé juésè gòngtóng xíngchéng de xìtǒng.']
];
export function correctScienceContext46(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||typeof v[pinyinKey]!=='string')continue;
   const entry=readings.find(([prefix])=>v[hanziKey].startsWith(prefix));
   if(entry&&v[pinyinKey]!==entry[1]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after:entry[1]});v[pinyinKey]=entry[1];}
  }
  for(const [k,x] of Object.entries(v))walk(x,[...path,k]);
 }walk(content);
 if(content.targetLessonId==='hsk4-event-agency-voice-lesson-01'){
  for(const b of content.lessonPages.pages.flatMap(p=>p.blocks)){
   if(!b.activity)continue;const before=b.activity.explanation;
   b.activity.explanation=before.replace('只支持透明分工比隐藏行动者更可靠。','但支持明确记录分工和证据来源的建议。').replace('句子使用“把”时，也要保留真正执行动作的主语。','用“把”句改写报告时，要让读者看清谁执行动作；上下文明确时可以省略主语。').replace('Khi dùng câu 把 vẫn phải giữ chủ ngữ thực sự làm hành động.','Khi dùng câu 把 viết lại báo cáo, cần làm rõ ai thực hiện; có thể lược chủ ngữ khi ngữ cảnh đã rõ.');
   if(before!==b.activity.explanation)changes.push({blockId:b.id,before,after:b.activity.explanation});
  }
 }return {content,changes};
}
