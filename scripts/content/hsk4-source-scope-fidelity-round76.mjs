export function correctSourceScope76(source){
 const content=structuredClone(source),changes=[];
 if(!content.targetLessonId?.startsWith('hsk4-'))return {content,changes};
 const fixes=[['胜率和问卷都提高','客队赢了四场，问卷反馈也积极'],['Shènglǜ hé wènjuàn dōu tígāo','Kèduì yíng le sì chǎng, wènjuàn fǎnkuì yě jījí'],['Tỷ lệ thắng và khảo sát tăng nhưng cơ hội giao lưu không phân đều','Đội khách thắng bốn trận và phản hồi khảo sát tích cực, nhưng cơ hội giao lưu không phân đều'],['hiểu cổ tích','hiểu di tích']];
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(typeof x==='string'){let after=x;for(const[a,b]of fixes)after=after.replaceAll(a,b);if(x!==after){v[k]=after;changes.push({path:[...path,k],before:x,after});}}else walk(x,[...path,k]);}};walk(content);
 if(changes.length)content.review={...content.review,humanReviewed:false};return {content,changes};
}
