export function correctBroadcastPinyin40(source){
 const content=structuredClone(source),changes=[];
 function walk(v,path=[]){if(!v||typeof v!=='object')return;
  for(const [hanziKey,pinyinKey] of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof v[hanziKey]!=='string'||!v[hanziKey].includes('广播')||typeof v[pinyinKey]!=='string')continue;
   const after=v[pinyinKey].replaceAll('guǎngbò','guǎngbō').replaceAll('Guǎngbò','Guǎngbō');
   if(after!==v[pinyinKey]){changes.push({path:[...path,pinyinKey],before:v[pinyinKey],after});v[pinyinKey]=after;}
  }
  for(const [k,x] of Object.entries(v))walk(x,[...path,k]);
 }walk(content);return {content,changes};
}
