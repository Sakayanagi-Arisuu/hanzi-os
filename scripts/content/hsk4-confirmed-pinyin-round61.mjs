// Pronunciations whose Mainland reading is unambiguous in these paired texts.
// This correction scan is not a claim that all other Pinyin has been reviewed.
const fixes=[
 ['档案',/dǎng['’]?àn/g,'dàng’àn'],
 ['综合',/zònghé/g,'zōnghé'],
 ['冲突',/chōngtú/g,'chōngtū'],
 ['日期',/rìqí/g,'rìqī'],
 ['发现',/fǎ xiàn/g,'fāxiàn'],
 ['垃圾',/lèsè/g,'lājī'],
 ['拥挤',/yǒngjǐ/g,'yōngjǐ'],
 ['广播',/guǎngbò/g,'guǎngbō']
];
export function correctConfirmedPinyin61(source){
 const content=structuredClone(source),changes=[];
 if(!content.targetLessonId?.startsWith('hsk4-'))return {content,changes};
 const walk=(value,path=[])=>{if(!value||typeof value!=='object')return;
  for(const[hk,pk]of [['hanzi','pinyin'],['modelAnswerHanzi','modelAnswerPinyin'],['answer','answerPinyin']]){
   if(typeof value[hk]!=='string'||typeof value[pk]!=='string')continue;
   const before=value[pk];let after=before;
   for(const[hanzi,wrong,right]of fixes)if(value[hk].includes(hanzi))after=after.replace(wrong,right);
   if(after!==before){value[pk]=after;changes.push({path:[...path,pk],hanzi:value[hk],before,after});}
  }
  for(const[k,v]of Object.entries(value))walk(v,[...path,k]);
 };walk(content);return {content,changes};
}
