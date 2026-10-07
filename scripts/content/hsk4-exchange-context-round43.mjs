const readings=[
 ['两个城市举办青年排球交流，','Liǎng ge chéngshì jǔbàn qīngnián páiqiú jiāoliú, gòng yǒu liù chǎng bǐsài hé sì cì xiǎozǔ tǎolùn. Tǐyù zǔzhī bǎ dádào shènglǜ mùbiāo dàng chénggōng, jiàoyùzhě guānzhù qīngnián néng fǒu gèng zìxìn de biǎodá, jiēdài jiātíng zé kàn chángqī liánxì. Sān fāng shǐyòng tóng yí xiàngmù, què tíchū bùtóng jiéguǒ.'],
 ['活动结束时，客队赢了四场，','Huódòng jiéshù shí, kèduì yíng le sì chǎng, wènjuàn zhōng duōshù qīngnián yě biǎoshì fāyán gèng zìxìn. Búguò fānyì bāngzhù zhǔyào jízhōng zài zhèngshì tǎolùn, wǎncān shí yǔyán jiào ruò de chéngyuán cānyù jiào shǎo. Shènglǜ hé wènjuàn dōu tígāo, jiāoliú jīhuì què méiyǒu píngjūn fēnpèi.'],
 ['下一届将增加双语伙伴和不计分的混合球队，','Xià yí jiè jiāng zēngjiā shuāngyǔ huǒbàn hé bú jì fēn de hùnhé qiúduì, bìng zài sān ge yuè hòu jìlù liánxì shìfǒu jìxù. Zōnghé píngjià huì fēnbié bàogào bǐsài, biǎodá, cānyù hé guānxi wéichí. Chénggōng bú shì bǎ bùtóng mùbiāo yā chéng yí ge fēnshù, ér shì shuōmíng nǎxiē qúntǐ zài nǎ ge wéidù shòuyì.'],
 ['暑假艺术交流原来完全在线下进行，','Shǔjià yìshù jiāoliú yuánlái wánquán zài xiànxià jìnxíng, xuéshēng gòngtóng huà bìhuà bìng cānguān gōngzuòshì. Yìqíng hòu xiàngmù zhuǎn dào xiànshàng, cānyù chéngshì búduàn zēngjiā, piānyuǎn xuéshēng yě néng jiārù. Fùzérén xīwàng jìxù xiànshàng, yīnwèi rénshù duō; yìshù jiàoshī zé dānxīn cáiliào chùgǎn hé zìrán jiāoliú jiǎnshǎo.'],
 ['两年数据表明，线上出席率高，','Liǎng nián shùjù biǎomíng, xiànshàng chūxílǜ gāo, zuòpǐn tíjiāo yě zhǔnshí; xiànxià xiǎozǔ de hézuò shíjiān gèng cháng, chéngyuán zhījiān jìxù liánxì de bǐlì jiào gāo. Búguò xiànxià míng’é shǎo, érqiě jiāotōng fèiyong páichú le bùfen jiātíng. Liǎng zhǒng fāngshì jiějué bùtóng wèntí, yě zhìzào bùtóng ménkǎn.'],
 ['新方案先在线上介绍主题，','Xīn fāng’àn xiān zài xiànshàng jièshào zhǔtí, zài wèi gèdì tígōng xiǎoxíng xiànxià gōngzuòfāng, bù néng dàochǎngzhě shōu dào cáiliàobāo. Píngjià fēnbié jìlù fùgài, cáiliào tǐyàn, hézuò shēndù hé hòuxù liánxì. Hùnhé móshì zhǐshì dài yànzhèng de guāndiǎn, bù yīng zài dì yī nián jiù bèi chēng wéi wéiyī zhèngquè dá’àn.']
];
const replacements=[
 ['出席和交作业较稳定','出席率高，作品提交准时'],
 ['với dự và nộp bài khá ổn','với tỷ lệ tham dự cao và nộp tác phẩm đúng hạn'],
 ['độ phủ và sự đều đặn tham dự/nộp bài','độ phủ, tỷ lệ tham dự cao và nộp tác phẩm đúng hạn'],
 ['trực tiếp có hợp tác sâu và tỷ lệ duy trì liên hệ cao hơn','trực tiếp có thời gian hợp tác dài hơn và tỷ lệ duy trì liên hệ cao hơn'],
 ['线上扩大覆盖，线下增加合作深度','线上覆盖更广，线下合作时间更长'],
 ['多数青年也更敢发言','问卷中多数青年表示发言更自信'],
 ['多数青年更自信','问卷中多数青年表示发言更自信'],
 ['đa số thanh niên tự tin nói hơn','đa số thanh niên trả lời phiếu cho biết tự tin phát biểu hơn'],
 ['đa số thanh niên tự tin hơn','đa số thanh niên trả lời phiếu cho biết tự tin phát biểu hơn'],
 ['线上覆盖广、出席稳定','线上覆盖广、出席率高'],
 ['线下合作更深、后续联系较多','线下合作时间更长、后续联系比例较高'],
 ['线下合作更久、后续联系更多','线下合作更久、后续联系比例较高'],
 ['online phủ rộng và dự đều; trực tiếp hợp tác sâu, liên hệ nhiều hơn','online phủ rộng và có tỷ lệ dự cao; trực tiếp hợp tác lâu hơn, tỷ lệ giữ liên hệ cao hơn'],
 ['online cho học sinh xa vào, dự và nộp bài cao; trực tiếp tạo hợp tác lâu và liên hệ sau nhiều hơn','online cho học sinh xa tham gia, tỷ lệ dự cao và nộp bài đúng hạn; trực tiếp có thời gian hợp tác lâu và tỷ lệ giữ liên hệ cao hơn'],
 ['却各有技术和费用门槛','但线下受到名额和交通费限制，线上材料触感减少则是教师提出的担心'],
 ['Online mở rộng độ phủ, trực tiếp tăng chiều sâu nhưng mỗi cách có rào cản công nghệ/chi phí.','Online mở rộng độ phủ; trực tiếp có thời gian hợp tác lâu hơn nhưng ít chỗ và tốn đi lại. Giáo viên lo trải nghiệm vật liệu online giảm; nguồn không khảo sát riêng rào cản công nghệ.']
];
export function correctExchangeContext43(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||typeof v[pinyinKey]!=='string')continue;
   const entry=readings.find(([prefix])=>v[hanziKey].startsWith(prefix));
   if(entry&&v[pinyinKey]!==entry[1]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after:entry[1]});v[pinyinKey]=entry[1];}
  }
  for(const [k,x] of Object.entries(v)){
   if(typeof x==='string'&&source.targetLessonId==='hsk4-information-order-cohesion-lesson-04'&&path.includes('activity')){let after=x;for(const[a,b]of replacements)after=after.replaceAll(a,b);if(after!==x){changes.push({path:[...path,k],before:x,after});v[k]=after;}}
   else if(typeof x==='object')walk(x,[...path,k]);
  }
 }walk(content);return {content,changes};
}
