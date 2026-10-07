const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const q=(prompt,options,answer,explanation)=>({prompt,options,answer,explanation});
export const passiveEvaluationGroups51={
 'hsk4-event-agency-voice-lesson-03':[
 {row:'hsk4-grammar-row-059',title:'叫/让 trong câu bị động và câu sai khiến',
 note:'Câu bị động đặt đối tượng chịu tác động trước: 我的杯子让小王打破了 (cốc của tôi bị Tiểu Vương làm vỡ). 叫/让 thường dùng trong khẩu ngữ, hay với việc không mong muốn; phía sau thường cần người/tác nhân. 被 linh hoạt hơn, có thể không nêu tác nhân: 杯子被打破了. Phân biệt 让 sai khiến/cho phép: 老师让小王读课文 (giáo viên bảo Tiểu Vương đọc). Dựa quan hệ nghĩa để đọc đúng, không coi mọi 让 là bị động. Trong nguồn chỉ biết giá bị chuyển tiếp nhanh, chưa biết chính xác ai; không tự thêm “nhiều tiểu thương” làm người chuyển.',
 examples:[t('我的杯子让小王打破了。','Wǒ de bēizi ràng Xiǎowáng dǎ pò le.','Cốc của tôi bị Tiểu Vương làm vỡ.'),t('我的自行车叫人骑走了。','Wǒ de zìxíngchē jiào rén qí zǒu le.','Xe đạp của tôi bị người ta đi mất rồi.'),t('老师让小王读课文。','Lǎoshī ràng Xiǎowáng dú kèwén.','Giáo viên bảo Tiểu Vương đọc bài khóa.'),t('价格信息被迅速转发了。','Jiàgé xìnxī bèi xùnsù zhuǎnfā le.','Thông tin giá đã bị chuyển tiếp nhanh chóng.')],
 questions:[q('Trong “杯子让小王打破了”, ai làm vỡ cốc?',['Cốc tự làm vỡ Tiểu Vương','Tiểu Vương','Giáo viên'],1,'杯子 là vật chịu tác động, 小王 là người thực hiện sau 让.'),q('让 trong “老师让小王读课文” là gì?',['Bị động: giáo viên bị đọc','Tự đọc','Bảo/để Tiểu Vương đọc'],2,'Giáo viên yêu cầu người khác làm; giáo viên không phải đối tượng của đọc.'),q('Không biết ai làm vỡ cốc. Câu nào tự nhiên mà không bịa người?',['杯子被打破了。','杯子让打破了。','杯子叫小王打破了。'],0,'被 có thể lược tác nhân; câu chọn Tiểu Vương tự thêm người chưa biết.')],
 transfer:'Tình huống mới: em trai vô ý làm rách tờ bản đồ của bạn; giáo viên bảo bạn dùng bản đồ điện tử. Viết một câu bị động 让 và một câu sai khiến 让.',
 model:t('我的地图让弟弟不小心撕破了。老师让我用电子地图。','Wǒ de dìtú ràng dìdi bù xiǎoxīn sī pò le. Lǎoshī ràng wǒ yòng diànzǐ dìtú.','Bản đồ của tôi bị em trai vô ý làm rách. Giáo viên bảo tôi dùng bản đồ điện tử.'),rubric:['Bản đồ chịu tác động; em trai làm rách vô ý.','Giáo viên là người yêu cầu, tôi là người dùng bản đồ.','Không suy em trai cố ý hoặc giáo viên làm rách.']},
 {row:'hsk4-grammar-row-060',title:'表扬/批评 + người + hành động được đánh giá',
 note:'表扬 là biểu dương/khen; 批评 là phê bình. Có thể nêu người được đánh giá rồi hành động/lý do: 老师表扬他按时完成任务. 他 vừa là đối tượng lời khen vừa là người hoàn thành nhiệm vụ. Cũng có thể nói 因为…表扬/批评… để rõ lý do. Không coi lời đánh giá là bằng chứng tự động cho mọi năng lực hay động cơ. Bài nguồn không ghi ban quản lý khen phát thanh viên hoặc chê nền tảng; các mẫu mới dưới đây là tình huống luyện độc lập.',
 examples:[t('老师表扬小林主动帮助同学。','Lǎoshī biǎoyáng Xiǎolín zhǔdòng bāngzhù tóngxué.','Giáo viên khen Tiểu Lâm chủ động giúp bạn.'),t('经理批评他没有按时交报告。','Jīnglǐ pīpíng tā méiyǒu ànshí jiāo bàogào.','Quản lý phê bình anh ấy vì không nộp báo cáo đúng hạn.'),t('因为她及时发现了错误，大家表扬了她。','Yīnwèi tā jíshí fāxiàn le cuòwù, dàjiā biǎoyáng le tā.','Vì cô phát hiện lỗi kịp thời, mọi người đã khen cô.')],
 questions:[q('Trong “老师表扬小林主动帮助同学”, ai giúp bạn?',['Giáo viên','Tiểu Lâm','Người kể không xác định'],1,'小林 là người được khen và cũng là chủ thể hành động giúp.'),q('批评他没有按时交报告 có chứng minh anh cố ý gây hại không?',['Có, phê bình luôn chứng minh cố ý','Có, mọi lần đều vậy','Không; chỉ có hành động không đúng hạn được nêu'],2,'Lý do bị phê bình khác kết luận về động cơ.'),q('Nguồn chỉ phân công trách nhiệm. Có kể ban quản lý đã khen/chê như dữ kiện không?',['Không, nguồn chưa ghi việc đánh giá đó','Có, vì thường sẽ khen','Có, nếu không ghi tên người'],0,'Không thêm sự kiện chỉ để luyện cấu trúc.')],
 transfer:'Trong nhóm mới, trưởng nhóm khen bạn Mai phát hiện lỗi số liệu; cũng nhắc phê bình bạn Nam chưa kiểm nguồn trước khi gửi. Viết hai câu nêu rõ ai được đánh giá vì hành động nào.',
 model:t('组长表扬小梅发现了数据错误，也批评小南没有核对来源就发送了资料。','Zǔzhǎng biǎoyáng Xiǎoméi fāxiàn le shùjù cuòwù, yě pīpíng Xiǎonán méiyǒu héduì láiyuán jiù fāsòng le zīliào.','Trưởng nhóm khen Tiểu Mai phát hiện lỗi số liệu, đồng thời phê bình Tiểu Nam chưa kiểm nguồn đã gửi tài liệu.'),rubric:['Mai phát hiện lỗi; Nam gửi trước khi kiểm nguồn.','Người đánh giá là trưởng nhóm trong cả hai vế.','Không suy Nam cố ý hoặc Mai luôn đúng.']}
 ]
};
export function deepenPassiveEvaluation51(source){
 const groups=passiveEvaluationGroups51[source.targetLessonId];if(!groups)return {content:structuredClone(source),changes:[]};
 const out=structuredClone(source),lessonId=out.targetLessonId;
 if(out.lessonPages.pages.some(p=>p.id.includes(':passive-evaluation-r51:')))throw Error('Do not replay');
 const block=(id,kind,title,body='',value={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 for(const [i,g] of groups.entries()){
  const pageId=`${lessonId}:v2:grammar:${i}`,idx=out.lessonPages.pages.findIndex(p=>p.id===pageId);
  if(idx<0||!out.sourceGrammarIds.includes(g.row))throw Error('Missing original grammar page/source');
  const original=out.lessonPages.pages[idx],rule=original.blocks[0],example=original.blocks[1],write=original.blocks[2];
  if(!rule.id.endsWith(`grammar-rule:${i}`)||!write.activity)throw Error('Unexpected original page');
  const prefix=`${lessonId}:passive-evaluation-r51:${i}`;
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

