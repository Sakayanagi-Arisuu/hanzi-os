const fixes=[
 ['卡住',/kǎ zhù/g,'qiǎ zhù'],
 ['行程',/háng chéng/g,'xíngchéng'],
 ['空调',/kòngtiáo/g,'kōngtiáo'],
 ['质量',/zhí liàng/g,'zhìliàng'],
 ['将',/jiàng zài/g,'jiāng zài'],
 ['成为',/cheng wéi/g,'chéngwéi'],
 ['写得',/xiě dé/g,'xiě de'],
 ['变得',/biàn dé/g,'biàn de']
];
export function correctContextReading65(source){
 const content=structuredClone(source),changes=[];if(!content.targetLessonId?.startsWith('hsk4-'))return {content,changes};
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;
  for(const[hk,pk]of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hk]!=='string'||typeof v[pk]!=='string')continue;
   const before=v[pk];let after=before;for(const[h,wrong,right]of fixes)if(v[hk].includes(h))after=after.replace(wrong,right);
   if(after!==before){v[pk]=after;changes.push({path:[...path,pk],hanzi:v[hk],before,after});}
  }
  for(const[k,x]of Object.entries(v)){
   if(typeof x==='string'&&(k==='meaningVi'||k==='modelAnswerMeaningVi')&&x.includes('không thể một mình dựng lại cổ tích đầy đủ')){const after=x.replace('không thể một mình dựng lại cổ tích đầy đủ','không thể chỉ dựa vào đó tái dựng đầy đủ di tích');v[k]=after;changes.push({path:[...path,k],before:x,after});}
   else walk(x,[...path,k]);
  }
 };walk(content);return {content,changes};
}
