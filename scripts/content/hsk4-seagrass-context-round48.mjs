const readings=[
 ['海湾曾有丰富的海草，','Hǎiwān céng yǒu fēngfù de hǎicǎo, hòulái yóuyú chuánzhī hé níshā zēngjiā, fùgài miànjī xiàjiàng. Huánbǎo xiǎozǔ dì yī nián xiān huà hǎiyáng dǐtú, méiyǒu mǎshàng dàliàng zhòng cǎo, yīnwèi tāmen xūyào zhīdào shuǐliú, shēndù hé jiù cǎo de wèizhì. Qìhòu jìlù yě xiǎnshì xiàjì gāowēn niánfen chāyì hěn dà.'],
 ['第二年，他们在三种地点各试种少量海草；','Dì èr nián, tāmen zài sān zhǒng dìdiǎn gè shìzhòng shǎoliàng hǎicǎo; dì sān nián bǎoliú chénghuó zuì hǎo de yì zhǒng fāngfǎ, bìng shèzhì wú zhòngzhíqū zuò bǐjiào. Dì sì nián yí cì qiáng fēng pòhuài le liǎng piàn shìyànqū, xiǎozǔ tiáozhěng gùdìng fāngshì, què méiyǒu shānchú shībài shùjù.'],
 ['第五年，部分区域覆盖增加，','Dì wǔ nián, bùfen qūyù fùgài zēngjiā, xiǎo yú shùliàng yě shàngshēng, dàn lìng yí cè hǎiwān méiyǒu míngxiǎn biànhuà. Xiǎozǔ bǎ guòchéng fēn chéng cèliáng, shìzhòng, bǐjiào, shòusǔn hé tiáozhěng wǔ duàn. Jiéguǒ zhīchí júbù huīfù kěxíng, què bù néng shuōmíng zhěng ge hǎiwān yǐ huīfù, yě bù néng bǎ yú zēngjiā zhǐ guīyīn yú hǎicǎo.'],
 ['森林公园为了让参观更丰富，','Sēnlín gōngyuán wèile ràng cānguān gèng fēngfù, zài bùdào fàngzhì èrwéimǎ. Yóukè tōngguò shǒujī tīng dào dòngwù de shēngyīn, kàn dào jìjié túpiàn. Dì yī jiēduàn zhǐ kàn sǎomiáo cìshù, guǎnlǐfāng rènwéi cìshù gāo jiù dàibiǎo kējì xiàngmù chénggōng, què méiyǒu jìlù yóukè shìfǒu tíngliú huò lǐjiě nèiróng.'],
 ['第二阶段接受教师建议，在三个点增加短问题，','Dì èr jiēduàn jiēshòu jiàoshī jiànyì, zài sān ge diǎn zēngjiā duǎn wèntí, bìng bǎoliú méiyǒu wèntí de liǎng ge diǎn. Jiéguǒ xiǎnshì, yǒu wèntí de diǎn tíngliú gèng jiǔ, dàn shāndǐng shǒujī xìnhào ruò, sǎomiáo shǎo bìng bù yídìng biǎoshì nèiróng chà. Gōngyuán yúshì bǎ bùfen nèiróng xiàzài dào rùkǒu shèbèi.'],
 ['第三阶段将扫描、停留、问题回答和纸质观察表结合。','Dì sān jiēduàn jiāng sǎomiáo, tíngliú, wèntí huídá hé zhǐzhì guānchábiǎo jiéhé. Xiàngmù fāxiàn, kējì biànyú tígōng shēngyīn, què bù néng dàitì guānchá zhēnshí huánjìng; wú xìnhào bǎnběn yě gǎishàn le shāndǐng shǐyòng. Gōngyuán réng yào zài bùtóng jìjié cèshì, dāngqián jiéguǒ zhǐ shìyòng yú zhè tiáo bùdào.']
];
export function correctSeagrass48(source){
 const content=structuredClone(source),changes=[];
 const replace=(v,k,after,path)=>{if(v[k]!==after){changes.push({path:[...path,k],before:v[k],after});v[k]=after;}};
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hk,pk] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hk]!=='string'||typeof v[pk]!=='string')continue;
   const e=readings.find(([p])=>v[hk].startsWith(p));if(e){replace(v,hk,v[hk].replace('游客通过手机看到动物声音和季节图片。','游客通过手机听到动物的声音，看到季节图片。'),path);replace(v,pk,e[1],path);}
  }
  for(const [k,x]of Object.entries(v)){
   if(typeof x==='string'&&x.includes('khách xem âm thanh động vật và ảnh mùa qua điện thoại'))replace(v,k,x.replace('khách xem âm thanh động vật và ảnh mùa qua điện thoại','khách nghe tiếng động vật và xem ảnh theo mùa qua điện thoại'),path);
   else if(typeof x==='object')walk(x,[...path,k]);
  }
 }walk(content);
 if(content.targetLessonId==='hsk4-event-agency-voice-lesson-02'){
  for(const b of content.lessonPages.pages.flatMap(p=>p.blocks))if(b.activity){const old=b.activity.explanation;const after=old.replace('加入短问题、无问题点和纸质观察后，管理者才发现山顶信号会影响扫描。','第二阶段增加短问题和无问题点后，管理者发现山顶信号弱也可能影响扫描；第三阶段又结合了纸质观察。').replace('câu hỏi, điểm đối chứng và phiếu giấy làm lộ ảnh hưởng của tín hiệu','giai đoạn hai thêm câu hỏi và điểm đối chứng, đồng thời nhận ra hạn chế tín hiệu; phiếu giấy được kết hợp ở giai đoạn ba');if(old!==after){changes.push({blockId:b.id,before:old,after});b.activity.explanation=after;}}
 }return {content,changes};
}
