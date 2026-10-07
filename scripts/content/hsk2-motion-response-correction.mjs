/** Answer the location question explicitly; preserve the speaker outside the door. */
export function correctHsk2MotionResponse(source) {
 if(source.targetLessonId!=='hsk2-travel-leisure-lesson-02')throw Error('Wrong lesson');
 const content=structuredClone(source);
 const page=content.lessonPages.pages.find(p=>p.id==='hsk2-travel-leisure-lesson-02:v2:dialogue');
 const turns=[content.dialogue,page?.blocks];
 for(const sequence of turns){
  if(sequence?.[5]?.hanzi!=='然后在哪儿找你？'||sequence[6]?.hanzi!=='对，出来以后到我这里来。'||sequence[6]?.pinyin!=='Duì, chūlái yǐhòu dào wǒ zhèlǐ lái.'||sequence[6]?.meaningVi!=='Đúng, ra ngoài rồi đến chỗ tôi.')throw Error('Preserve edited dialogue');
  Object.assign(sequence[6],{hanzi:'我还在门外等你，出来以后到我这里来。',pinyin:'Wǒ hái zài mén wài děng nǐ, chūlái yǐhòu dào wǒ zhèlǐ lái.',meaningVi:'Tôi vẫn đợi bạn ngoài cửa; ra ngoài rồi đến chỗ tôi.'});
 }
 return content;
}
