// Exact reviewed phrases only; never substitute a polyphonic character globally.
export const pinyinEdits8=[
 {hanzi:'不应突出个人',from:'bù yìng túchū gèrén',to:'bù yīng túchū gèrén'},
 {hanzi:'混成一个分数',from:'hǔnchéng',to:'hùn chéng'},
 {hanzi:'共同署名信和匿名留言',from:'gòngtóng shǔmíng xìnhé nìmíng liúyán',to:'gòngtóng shǔmíng xìn hé nìmíng liúyán'},
 {hanzi:'困难不是',from:'Kùn nàn',to:'Kùnnan'},
];
export function correctContextualPinyin8(source){
 const content=structuredClone(source);const changes=[];
 function walk(value,path=[]){if(!value||typeof value!=='object')return;
  if(typeof value.hanzi==='string'&&typeof value.pinyin==='string')for(const e of pinyinEdits8)if(value.hanzi.includes(e.hanzi)&&value.pinyin.includes(e.from)){
   changes.push({path:[...path,'pinyin'],before:value.pinyin,after:value.pinyin.replace(e.from,e.to)});value.pinyin=value.pinyin.replace(e.from,e.to);
  }
  for(const [key,child] of Object.entries(value))walk(child,[...path,key]);
 }
 walk(content);return {content,changes};
}
