// Editorial links describe the content actually taught. They do not certify full row coverage.
const rows={
 'hsk1-time-place-events-01-numbers':[11,32],
 'hsk1-time-place-events-03-week-and-day-parts':[36,44,65],
 'hsk1-time-place-events-04-clock-and-duration':[14,36,44,66],
 'hsk1-time-place-events-06-weather-and-residence':[17,21,37,43,60]
};
export function alignGrammarSources78(source){
 const content=structuredClone(source),numbers=rows[content.targetLessonId];if(!numbers)return {content,changes:[]};
 const next=numbers.map(n=>`hsk1-grammar-row-${String(n).padStart(3,'0')}`),before=content.sourceGrammarIds;
 if(JSON.stringify(before)===JSON.stringify(next))return {content,changes:[]};
 content.sourceGrammarIds=next;content.review={...content.review,humanReviewed:false};
 return {content,changes:[{path:['sourceGrammarIds'],before,after:next}]};
}
