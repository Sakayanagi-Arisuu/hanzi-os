const readings=[
 ['语言课讨论“慢工出细活”。','Yǔyánkè tǎolùn “màn gōng chū xì huó”. Yì zǔ rènwéi tā gǔlì rènzhēn zhǔnbèi, lìng yì zǔ xiāngfǎn, dānxīn tā bèi yòng lái fǎnduì jíshí xíngdòng. Jiàoshī yāoqiú liǎng zǔ hùxiāng yǐnyòng jùtǐ qíngjìng, ér bú shì zhǐ chóngfù zìjǐ de tàidu; lìngwài hái yào shuōmíng shéi shuō, duì shéi shuō.'],
 ['在学习手工时，这句话帮助学生尊重长期练习；','Zài xuéxí shǒugōng shí, zhè jù huà bāngzhù xuéshēng zūnzhòng chángqī liànxí; zài shìgù chǔlǐhuì shàng, tóngyàng de huà què kěnéng chéngwéi tuōyán lǐyóu. Súyǔ běnshēn méiyǒu zìdòng juédìng xíngdòng, tā de zuòyòng láizì chǎngjǐng, shuōhuàzhě quánlì hé tīngzhě xūyào. Jiěshì chāyì bú shì shéi bù dǒng Zhōngwén, ér shì shǐyòng tiáojiàn bùtóng.'],
 ['课程最后建立角色图：','Kèchéng zuìhòu jiànlì juésètú: shuōhuàzhě tíchū jiàzhí, tīngzhě pànduàn fēngxiǎn, zhǔchírén jìlù chǎngjǐng. Xuéshēng kěyǐ jiēshòu súyǔ de wénhuà yìyì, yě kěyǐ pīpíng bù héshì de shǐyòng. Zūnzhòng chuántǒng yǔ fēnxī quánlì bìng bù xiāngfǎn, dàn yí cì kètáng tǎolùn bù néng dàibiǎo gèdì suǒyǒu lǐjiě.'],
 ['社区健康讲座讨论月饼。','Shèqū jiànkāng jiǎngzuò tǎolùn yuèbǐng. Yíngyǎngshī de mùbiāo jiù shì jiǎnshǎo guòliàng táng hé yán, jiànyì kàn pèiliào yǔ fènliàng; wénhuà yánjiūzhě guānzhù tuányuán, zènglǐ hé jiātíng jìyì, rènwéi yuèbǐng de jiàzhí bù néng zhǐ yòng yíngyǎng shùzì jìsuàn. Liǎng rén tǎolùn tóng yì zhǒng shíwù, què chéngdān bùtóng rènwu.'],
 ['听众最初以为双方互相反对。','Tīngzhòng zuìchū yǐwéi shuāngfāng hùxiāng fǎnduì. Zhǔchírén qǐng yíngyǎngshī shuōmíng “shǎo chī” bù děngyú qǔxiāo jiérì, yě qǐng yánjiūzhě chéngrèn chuántǒng pèifāng huì suí jiànkāng zhīshi biànhuà. Tǎolùn bǎ xuǎnzé fēn wéi shíyòngliàng, pèifāng, zèngsòng fāngshì hé xiàngzhēng yìyì sì céng.'],
 ['讲座后，参与者更愿意选择小份，','Jiǎngzuò hòu, cānyùzhě gèng yuànyì xuǎnzé xiǎo fèn, yě méiyǒu jiǎnshǎo yǔ jiārén fēnxiǎng. Jiéguǒ zhīchí jiànkāng mùbiāo hé wénhuà shíjiàn kěyǐ xiétiáo, dàn wènjuàn zhǐ zài yí ge shèqū wánchéng, qiě méiyǒu cèliáng chángqī yǐnshí. Juésètú jiějué gàiniàn chōngtū, bù zhèngmíng suǒyǒu pèifāng dōu tóngyàng jiànkāng.']
];
const replacements=[
 ['连同一句俗语也会因场景','同一句俗语也会因场景'],
 ['月饼也不是健康或文化二选一，可分量、配方、赠送和象征。','月饼也不是健康或文化二选一，可以分别考虑食用量、配方、赠送方式和象征意义。'],
 ['Người tham gia chọn phần nhỏ và vẫn chia sẻ','Người tham gia sẵn sàng chọn phần nhỏ hơn và vẫn chia sẻ'],
 ['Nguồn chỉ ghi thay đổi lựa chọn khẩu phần ở một cộng đồng','Nguồn chỉ ghi người tham gia sẵn sàng chọn phần nhỏ hơn ở một cộng đồng'],
 ['“làm chậm cho sản phẩm tinh”','“làm kỹ, không vội thì sản phẩm tinh xảo”'],
 ['“Làm chậm cho sản phẩm tinh”','“Làm kỹ, không vội thì sản phẩm tinh xảo”']
];
export function correctCultureContext45(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||typeof v[pinyinKey]!=='string')continue;
   const entry=readings.find(([prefix])=>v[hanziKey].startsWith(prefix));
   if(entry&&v[pinyinKey]!==entry[1]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after:entry[1]});v[pinyinKey]=entry[1];}
  }
  for(const [k,x] of Object.entries(v)){
   if(typeof x==='string'&&source.targetLessonId==='hsk4-information-order-cohesion-lesson-05'&&(path.includes('activity')||k==='body')){let after=x;for(const[a,b]of replacements)after=after.replaceAll(a,b);if(after!==x){changes.push({path:[...path,k],before:x,after});v[k]=after;}}
   else if(typeof x==='object')walk(x,[...path,k]);
  }
 }walk(content);return {content,changes};
}
