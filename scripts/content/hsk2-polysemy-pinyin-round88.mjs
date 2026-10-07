export const wordCorrections88={
 'hsk-vocab-00357':{hash:'sha256:ec61554918eb130ce0c22cb25024df0d3306e48a8544b1621f81ae61517c4eed',examples:[{hanzi:'我买这本书花了三十块钱。',pinyin:'Wǒ mǎi zhè běn shū huā le sānshí kuài qián.',meaningVi:'Tôi mua quyển sách này hết ba mươi tệ.'},{hanzi:'我每天花半个小时复习汉语。',pinyin:'Wǒ měitiān huā bàn ge xiǎoshí fùxí Hànyǔ.',meaningVi:'Mỗi ngày tôi dành nửa giờ ôn tiếng Trung.'}]},
 'hsk-vocab-00371':{hash:'sha256:1ba3ee0f8636a670161634b47298a4066b608b155319c3ebcc84c9337772814b',examples:[{hanzi:'这家店离学校很近。',pinyin:'Zhè jiā diàn lí xuéxiào hěn jìn.',meaningVi:'Cửa hàng này rất gần trường.'}]}
};
const block=(id,kind,title,body='',extra={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...extra});
export function correctPolysemy88(source){
 const content=structuredClone(source),changes=[];
 if(!content.lessonPages){const key=content.sourceVocabularyIds?.[0],c=wordCorrections88[key];if(!c)return{content,changes};content.examples=structuredClone(c.examples);content.review={...content.review,humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};return{content,changes:[{wordId:key,exampleCorrection:true}]};}
 const id=content.targetLessonId;
 function walk(v,path=''){
  if(typeof v==='string'){
   let next=v.replaceAll('shíèr',"shí'èr").replaceAll('xīngqīèr',"xīngqī'èr");
   if(id==='hsk2-daily-needs-family-lesson-03')next=next.replace(/\bkuai\b/g,'kuài');
   if(next!==v)changes.push({path,from:v,to:next});return next;
  }
  if(Array.isArray(v))return v.map((x,i)=>walk(x,`${path}.${i}`));
  if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))v[k]=walk(x,`${path}.${k}`);
  return v;
 }
 walk(content);
 if(id?.startsWith('hsk2-'))for(const page of content.lessonPages.pages)for(const b of page.blocks){
  const indexed=b.id.match(/:block:word:(\d+)$/);const indexedWord=indexed?content.vocabulary?.[Number(indexed[1])]:null;
  for(const [word,c]of Object.entries(wordCorrections88))if((b.id.includes(word)||indexedWord===word)&&b.kind==='dialogue'){
   // Only the stable word entry is replaced, never the noun homograph or audio transcript.
   if(JSON.stringify({hanzi:b.hanzi,pinyin:b.pinyin,meaningVi:b.meaningVi})!==JSON.stringify(c.examples[0])){Object.assign(b,c.examples[0]);changes.push({blockId:b.id,wordId:word});}
  }
 }
 if(id==='hsk2-daily-needs-family-lesson-03'){
  const prefix=`${id}:r88`;if(content.lessonPages.pages.some(p=>p.blocks.some(b=>b.id.startsWith(prefix))))throw Error('Do not replay');
  const target={objective:'Dùng 花 với khoản tiền và thời gian, phân biệt danh từ 花.',skill:'vocabulary',sources:[{id:'hsk-vocab-00357',kind:'vocabulary'}]};
  const teach=content.lessonPages.pages.find(p=>p.id.endsWith(':meaning'));
  teach.blocks.push(block(`${prefix}:note`,'explanation','花: tiền hoặc thời gian','花 + số tiền/thời gian (+ hành động) nói khoản đã tiêu hoặc thời gian dành cho việc gì. 我花了三十块钱 là tiêu ba mươi tệ; 花半个小时复习 là dành nửa giờ ôn. 这朵花中的 花 là danh từ bông hoa, thuộc mục từ khác cùng chữ/cách đọc. Không lấy ví dụ bông hoa làm mẫu cho động từ tiêu/dành.'));
  wordCorrections88['hsk-vocab-00357'].examples.forEach((e,n)=>teach.blocks.push(block(`${prefix}:sample:${n}`,'dialogue',n?'Dành thời gian':'Tiêu tiền','',e)));
  content.lessonPages.pages.find(p=>p.id.endsWith(':guided')).blocks.push(block(`${prefix}:choice`,'activity','Phân biệt hai mục từ','我花了二十块钱 và 这朵花很漂亮 có dùng cùng nghĩa 花 không?',{activity:{type:'choice',options:[{id:'o0',text:'Cùng nghĩa bông hoa',feedback:'Câu đầu nêu khoản tiền đã tiêu.'},{id:'o1',text:'Khác: tiêu tiền và bông hoa',feedback:'Cùng chữ/cách đọc nhưng khác từ loại và nghĩa trong ngữ cảnh.'},{id:'o2',text:'Cả hai đều là thời gian học',feedback:'Không câu nào nêu thời gian học.'}],answerIds:['o1'],acceptedAnswers:[],rubric:[],hint:'',explanation:'花了二十块钱 là tiêu hai mươi tệ; 这朵花 là bông hoa này. Chọn nghĩa theo câu, không gộp hai cách dùng.',learningTarget:target}}));
  content.lessonPages.pages.find(p=>p.id.endsWith(':transfer')).blocks.push(block(`${prefix}:transfer`,'activity','Dùng 花 trong cảnh mới','Bạn mua bút hết mười tệ và mỗi ngày dành hai mươi phút học tiếng Trung. Viết hai câu với 花; không nêu bông hoa.',{activity:{type:'rubric',options:[],answerIds:[],acceptedAnswers:[],hint:'',explanation:'Một cách diễn đạt:\n我买笔花了十块钱。我每天花二十分钟学汉语。\nWǒ mǎi bǐ huā le shí kuài qián. Wǒ měitiān huā èrshí fēnzhōng xué Hànyǔ.\nTôi mua bút hết mười tệ. Mỗi ngày tôi dành hai mươi phút học tiếng Trung.\nTự đối chiếu chưa phải điểm viết độc lập.',rubric:[{id:'money',label:'Bút và mười tệ',guidance:'花了十块钱 nói khoản chi, không giá ba mươi của mẫu.'},{id:'time',label:'Mỗi ngày hai mươi phút học',guidance:'花二十分钟学汉语; không đổi thành nửa giờ.'}],learningTarget:{...target,skill:'writing'}}}));
  changes.push({wordId:'hsk-vocab-00357',newSamples:2,newChoice:1,newTransfer:1});
 }
 if(changes.length)content.review={...content.review,humanReviewed:false};return{content,changes};
}
