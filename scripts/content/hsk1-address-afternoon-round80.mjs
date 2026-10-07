const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const b=(id,kind,title,body='',extra={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...extra});
export function deepenAddressAfternoon80(source){
 const content=structuredClone(source),changes=[];
 if(!content.lessonPages&&content.hanzi==='下午'&&content.sourceVocabularyIds?.[0]==='hsk-vocab-00230'){
  if(content.examples?.[0]?.hanzi!=='不忙，我下午忙。')throw Error('Source example changed');
  content.examples=[t('我上午不忙，下午很忙。','Wǒ shàngwǔ bù máng, xiàwǔ hěn máng.','Buổi sáng tôi không bận, buổi chiều tôi bận.')];
  content.review={humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}};
  changes.push({field:'examples',scope:'Self-contained context, not an orphaned reply.'});return {content,changes};
 }
 if(content.targetLessonId!=='survival-5')return {content,changes};
 const prefix='survival-5:r80',pages=content.lessonPages.pages;
 if(pages.some(p=>p.id.startsWith(prefix)))throw Error('Do not replay');
 const target={objective:'Hiểu 小 trước họ trong cách gọi quen thuộc và 小朋友 chỉ trẻ em; chọn cách gọi hợp hoàn cảnh.',skill:'vocabulary',sources:[{id:'hsk-vocab-00235',kind:'vocabulary'}]};
 const page=(key,title,stage,blocks)=>({id:`${prefix}:page:${key}`,title,stage,layout:'workshop',blocks});
 const q=(n,prompt,options,answer,explanation)=>b(`${prefix}:q:${n}`,'activity',`Khảo Luyện ${n+1}`,prompt,{activity:{type:'choice',options:options.map((text,i)=>({id:`o-${i}`,text,feedback:i===answer?explanation:'Xem lại quan hệ người nói/nghe và ý nghĩa của 小 trong mẫu.'})),answerIds:[`o-${answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation,learningTarget:target}});
 const added=[page('teach','小王 và 小朋友: cách gọi người','understand',[
  b(`${prefix}:note`,'explanation','小 không luôn nghĩa kích thước nhỏ','小 trước họ tạo cách gọi quen thuộc như 小王, thường do người lớn tuổi/có vai trên gọi người trẻ hơn hoặc giữa người quen. Đây không phải quy tắc cứ biết họ là thêm 小, và không nên tự dùng để gọi người lạ/giáo viên. 小朋友 là cách nói/gọi trẻ em, không tự nghĩa là người yêu hay bạn thân thấp bé. Khác với 小猫 (mèo nhỏ), 小 trong cách gọi 小王 không cho biết chiều cao. 王 Wáng là họ Vương; 老师 lǎoshī là giáo viên.'),
  b(`${prefix}:example:0`,'dialogue','Người quen gọi người trẻ hơn','',t('小王，你认识那个小朋友吗？','Xiǎo Wáng, nǐ rènshi nàge xiǎopéngyou ma?','Tiểu Vương, cháu/cậu có quen em nhỏ kia không?')),
  b(`${prefix}:example:1`,'dialogue','Chào giáo viên','',t('王老师，您好！','Wáng lǎoshī, nín hǎo!','Em chào thầy/cô Vương!'))
 ]),page('practice','Chọn cách gọi theo quan hệ','practice',[
  q(0,'Người lớn gọi một người trẻ họ Vương mà mình quen là 小王. Có thể suy người đó thấp bé không?',['Có, 小 luôn nói chiều cao','Không, đây là cách gọi quen thuộc','Đây chắc chắn là người yêu'],1,'小 trước họ là cách gọi; không đủ dữ kiện để suy chiều cao hoặc quan hệ yêu đương.'),
  q(1,'Bạn lần đầu chào giáo viên họ Vương. Mẫu nào phù hợp nhất trong tình huống này?',['小王，你好！','王老师，您好！','小朋友，你好！'],1,'Họ + 老师 cùng 您好 phù hợp khi học sinh chào giáo viên mới gặp.'),
  q(2,'Người nói chỉ một đứa trẻ và gọi 那个小朋友. Nghĩa nào phù hợp?',['Người yêu kia','Bạn nhỏ/em nhỏ kia','Quyển sách nhỏ kia'],1,'小朋友 chỉ trẻ em; không phải danh xưng cho người yêu.')
 ]),page('transfer','Giới thiệu một em nhỏ mới gặp','transfer',[
  b(`${prefix}:produce`,'activity','Viết lời chào và câu hỏi','Bạn lần đầu gặp cô giáo họ Lý (李 Lǐ). Chào cô lịch sự rồi hỏi tên một em nhỏ ở phía kia. Không tự gọi cô là 小李.',{activity:{type:'rubric',options:[],answerIds:[],acceptedAnswers:[],hint:'',explanation:'Một cách diễn đạt:\n李老师，您好！那个小朋友叫什么名字？\nLǐ lǎoshī, nín hǎo! Nàge xiǎopéngyou jiào shénme míngzi?\nEm chào cô Lý! Em nhỏ kia tên là gì?\nTự đối chiếu chưa phải điểm nói/viết độc lập.',rubric:[{id:'r-0',label:'李老师 và 您好 phù hợp vai học sinh.',guidance:'Không tự dùng 小李 khi mới gặp giáo viên.'},{id:'r-1',label:'小朋友 chỉ em nhỏ kia.',guidance:'Không suy tuổi cụ thể, chiều cao hoặc quan hệ yêu đương.'},{id:'r-2',label:'叫什么名字 hỏi tên.',guidance:'Không tự đặt tên cho em nhỏ.'}],learningTarget:{...target,skill:'writing'}}})
 ])];
 pages.splice(pages.findIndex(p=>p.stage==='practice'),0,...added);
 content.sourceGrammarIds=[...new Set([...content.sourceGrammarIds,'hsk1-grammar-row-001'])];
 content.review={...content.review,humanReviewed:false};changes.push({netPages:3,grammar:'Small address prefix taught in social context.'});return {content,changes};
}
