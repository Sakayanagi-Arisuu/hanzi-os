/** Apply only reviewed, exact-field character lesson corrections to a new revision. */
export function applyCharacterTargetCorrections(document,corrections){
 const copy=structuredClone(document);
 for(const [blockId,change] of Object.entries(corrections)){
  const blocks=copy.pages.flatMap(page=>page.blocks.filter(block=>block.id===blockId));
  if(blocks.length!==1||blocks[0].kind!=='activity'||blocks[0].activity?.type!=='cloze')throw Error(`Missing cloze for correction: ${blockId}`);
  const block=blocks[0];
  for(const field of ['body','explanation','acceptedAnswers']){
   const actual=field==='body'?block.body:block.activity[field];
   if(JSON.stringify(actual)!==JSON.stringify(change.before[field]))throw Error(`Published correction source changed: ${blockId}:${field}`);
  }
  block.body=change.after.body;
  block.activity.explanation=change.after.explanation;
  block.activity.acceptedAnswers=structuredClone(change.after.acceptedAnswers);
 }
 return copy;
}
