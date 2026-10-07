/** Bounded source propagation: do not change Hanzi, answers, IDs or learning targets. */
export const pinyinCorrectionScopes={
 'hsk4-personal-community-analysis-concept-actor-map':{before:'liè chéngyī zhāng biǎo',after:'liè chéng yì zhāng biǎo',count:5},
 'hsk4-precision-reference-quantity-lesson-01':{before:'liè chéngyī zhāng biǎo',after:'liè chéng yì zhāng biǎo',count:3},
 'hsk4-society-economy-argument-viewpoint-synthesis':{before:'jùlí hěn zhǎng',after:'jùlí hěn cháng',count:2},
 'hsk4-structured-written-argument-lesson-03':{before:'liè chéngyī zhāng biǎo',after:'liè chéng yì zhāng biǎo',count:2},
 'hsk4-timed-sectional-rehearsal-lesson-01':{before:'jùlí hěn zhǎng',after:'jùlí hěn cháng',count:2},
};
export function correctHsk4SourcePinyin(source){
 const scope=pinyinCorrectionScopes[source.targetLessonId];if(!scope)throw Error('Unreviewed lesson');
 const content=structuredClone(source);let count=0;
 function walk(value){
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
   if(typeof child==='string'&&child.includes(scope.before)){
    if(!/pinyin$/i.test(key))throw Error('Unexpected non-Pinyin consumer');
    value[key]=child.replaceAll(scope.before,scope.after);count++;
   }else walk(child);
  }
 }
 walk(content);if(count!==scope.count)throw Error('Source consumers changed; re-audit before correction');
 return content;
}
