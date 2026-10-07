const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const q=(prompt,options,answer,explanation)=>({prompt,options,answer,explanation});
export const baProcessGroups49={
 'hsk4-event-agency-voice-lesson-02':[
 {row:'hsk4-grammar-row-057',title:'把 + động từ + số lần hoặc thời lượng',
 note:'Sau động từ có thể nêu số lần xử lý đối tượng: 把这篇文章读了两遍 (đọc toàn bài hai lượt). 次 đếm lần nói chung; 遍 nhấn đi hết một lượt từ đầu đến cuối. Thời lượng nói kéo dài bao lâu: 把这件事考虑了三天. Tân ngữ sau 把 cần xác định và động từ phải hợp cách xử lý đó; không áp dụng máy móc với mọi trạng thái. Giữ số lần/thời lượng đúng dữ kiện. Năm năm của dự án cỏ biển không có nghĩa mọi vùng thử được quan sát liên tục năm năm: trồng thử bắt đầu năm hai.',
 examples:[t('我把这篇文章读了两遍。','Wǒ bǎ zhè piān wénzhāng dú le liǎng biàn.','Tôi đọc bài này hai lượt từ đầu đến cuối.'),t('她把这件事考虑了三天。','Tā bǎ zhè jiàn shì kǎolǜ le sān tiān.','Cô ấy cân nhắc việc này trong ba ngày.'),t('请把这个词再写一次。','Qǐng bǎ zhè ge cí zài xiě yí cì.','Hãy viết từ này thêm một lần.')],
 questions:[q('读了两遍 nhấn gì hơn chỉ nêu 两次?',['Hai lượt đọc từ đầu đến cuối','Hai ngày đọc','Hai người đọc'],0,'遍 là lượt hoàn chỉnh qua nội dung; 次 đếm số lần nói chung.'),q('考虑了三天 diễn đạt gì?',['Cân nhắc đúng ba lần','Cân nhắc kéo dài ba ngày','Đã chắc chắn có quyết định tốt'],1,'三天 là thời lượng, không phải số lần hay chất lượng quyết định.'),q('Dự án năm năm, thử trồng từ năm hai. Có căn cứ nói mọi vùng thử được quan sát đủ năm năm không?',['Có, cứ lấy tổng tuổi dự án','Có, vì thử trồng cũng là dự án','Không, nguồn không cho thời lượng đó'],2,'Không lấy thời gian toàn dự án gán cho một công đoạn bắt đầu sau.')],
 transfer:'Tình huống mới: bạn đọc trọn hướng dẫn ba lượt, còn đồng nghiệp cân nhắc đề nghị trong hai ngày. Viết hai câu 把, phân biệt lượt và thời lượng.',
 model:t('我把说明书读了三遍。同事把这个建议考虑了两天。','Wǒ bǎ shuōmíngshū dú le sān biàn. Tóngshì bǎ zhè ge jiànyì kǎolǜ le liǎng tiān.','Tôi đọc hướng dẫn ba lượt. Đồng nghiệp cân nhắc đề nghị này trong hai ngày.'),rubric:['三遍 là ba lượt đọc trọn.','两天 là thời lượng cân nhắc, không phải hai lần.','Không thêm rằng đồng nghiệp đã đồng ý.']},
 {row:'hsk4-grammar-row-058',title:'把 + đối tượng + trạng ngữ + động từ',
 note:'Cách thức có thể đứng sau đối tượng trước động từ: 把名字认真地写下来, 把资料分别保存. 地 nối nhiều cụm miêu tả cách thức, nhưng không gắn 地 máy móc sau mọi phó từ như 分别. Phủ định/khả năng thường đứng trước 把: 不要把、可以把. Một trạng ngữ không thay toàn bộ yêu cầu của câu 把; giữ cụm động từ tự nhiên với kết quả/hướng khi cần. 分别 nhấn xử lý riêng từng phần, không đồng nghĩa gộp dữ liệu thành một điểm.',
 examples:[t('请把名字清楚地写在这里。','Qǐng bǎ míngzi qīngchu de xiě zài zhèlǐ.','Hãy viết tên rõ ràng ở đây.'),t('她把两份资料分别保存了。','Tā bǎ liǎng fèn zīliào fēnbié bǎocún le.','Cô ấy lưu riêng hai tài liệu.'),t('不要把这些记录随便删掉。','Bú yào bǎ zhèxiē jìlù suíbiàn shān diào.','Đừng tùy tiện xóa những bản ghi này.')],
 questions:[q('Chọn vị trí tự nhiên để nhờ viết tên rõ ràng.',['请把名字清楚地写在这里。','请把清楚地名字这里写。','请名字写把清楚。'],0,'Cách thức 清楚地 đứng trước 写, sau đối tượng 名字.'),q('分别保存两份资料 có nghĩa gì?',['Gộp mọi nội dung thành một kết luận','Lưu hai tài liệu riêng','Xóa cả hai tài liệu'],1,'分别 nhấn xử lý từng phần riêng.'),q('Chọn vị trí 不要 phù hợp.',['把不要记录删掉。','把记录删掉不要。','不要把记录删掉。'],2,'Lời ngăn 不要 thường đặt trước 把.')],
 transfer:'Bạn nhờ đồng nghiệp lưu riêng hai hóa đơn và kiểm kỹ ngày tháng, không xóa bản gốc. Viết hai hoặc ba câu 把 theo tình huống mới.',
 model:t('请把这两张发票分别保存，把日期仔细检查一遍，不要把原件删掉。','Qǐng bǎ zhè liǎng zhāng fāpiào fēnbié bǎocún, bǎ rìqī zǐxì jiǎnchá yí biàn, bú yào bǎ yuánjiàn shān diào.','Hãy lưu riêng hai hóa đơn này, kiểm kỹ ngày tháng một lượt, đừng xóa bản gốc.'),rubric:['分别/仔细 đứng trước động từ tương ứng.','不要 trước 把 để ngăn xóa.','Không biến lời nhờ thành việc đã hoàn tất.']}
 ]
};
export function deepenBaProcess49(source){
 const groups=baProcessGroups49[source.targetLessonId];if(!groups)return {content:structuredClone(source),changes:[]};
 const out=structuredClone(source),lessonId=out.targetLessonId;
 if(out.lessonPages.pages.some(p=>p.id.includes(':ba-process-r49:')))throw Error('Do not replay');
 const block=(id,kind,title,body='',value={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 for(const [i,g] of groups.entries()){
  const pageId=`${lessonId}:v2:grammar:${i}`,idx=out.lessonPages.pages.findIndex(p=>p.id===pageId);
  if(idx<0||!out.sourceGrammarIds.includes(g.row))throw Error('Missing original grammar page/source');
  const original=out.lessonPages.pages[idx],rule=original.blocks[0],example=original.blocks[1],write=original.blocks[2];
  if(!rule.id.endsWith(`grammar-rule:${i}`)||!write.activity)throw Error('Unexpected original page');
  const prefix=`${lessonId}:ba-process-r49:${i}`;
  // The existing registry exposes this lesson's authored pattern as one source;
  // syllabus rows above remain editorial mapping, not invented runtime sources.
  const target={objective:g.title,skill:'grammar',sources:structuredClone(write.activity.learningTarget.sources)};
  const teach={...original,title:g.title,blocks:[{...rule,title:g.title,body:g.note},...g.examples.map((e,n)=>block(n===0?example.id:`${prefix}:example:${n}`,'dialogue',`Mẫu ${n+1}`,'',e))]};
  const practice={id:`${prefix}:practice`,title:`Khảo Luyện · ${g.title}`,stage:'practice',layout:'workshop',blocks:g.questions.map((q,n)=>block(`${prefix}:question:${n}`,'activity',`Đối chiếu ${n+1}`,q.prompt,{activity:{type:'choice',options:q.options.map((text,j)=>({id:`o-${j}`,text,feedback:j===q.answer?q.explanation:'Xác định quan hệ ý và đọc lại mẫu tương ứng.'})),answerIds:[`o-${q.answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation:q.explanation,learningTarget:target}}))};
  const transfer={id:`${prefix}:transfer`,title:`Vận dụng · ${g.title}`,stage:'transfer',layout:'workshop',blocks:[{...write,title:'Viết trong tình huống mới',body:g.transfer,activity:{...write.activity,learningTarget:{...target,skill:'writing'},rubric:g.rubric.map((label,n)=>({id:`r-${n}`,label,guidance:label})),explanation:`Một cách diễn đạt:\n${g.model.hanzi}\n${g.model.pinyin}\n${g.model.meaningVi}\nTự đối chiếu, không phải điểm viết độc lập.`}}]};
  out.lessonPages.pages.splice(idx,1,teach,practice,transfer);
  out.grammar[i]={...out.grammar[i],explanationVi:g.note,modelExample:{...g.examples[0],speaker:'A'},guidedPractice:{promptVi:g.transfer,modelAnswerHanzi:g.model.hanzi,modelAnswerPinyin:g.model.pinyin,modelAnswerMeaningVi:g.model.meaningVi}};
 }
 out.review={...out.review,humanReviewed:false};
 return {content:out,changes:[{groups:groups.length,netPages:groups.length*2}]};
}

