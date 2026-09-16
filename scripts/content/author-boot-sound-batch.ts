import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';

type Page=LessonPageDocument['pages'][number];
function manuscript(id:string){
 const lesson=LESSON_BY_ID.get(id)!;
 const pages:Page[]=[];
 const b=(key:string,values:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`${id}:v2:block:${key}`),...values});
 const note=(key:string,title:string,body:string)=>b(key,{title,body});
 const example=(key:string,title:string,hanzi:string,pinyin:string,meaningVi:string,body='')=>b(key,{kind:'dialogue',title,hanzi,pinyin,meaningVi,body});
 const page=(key:string,title:string,stage:Page['stage'],layout:Page['layout'],blocks:LessonBlock[])=>pages.push({id:`${id}:v2:${key}`,title,stage,layout,blocks});
 const choice=(key:string,title:string,body:string,choices:string[],answer:number,feedback:string[],explanation:string)=>b(key,{kind:'activity',title,body,activity:{...emptyLessonActivity(),options:choices.map((text,index)=>({id:`answer-${index}`,text,feedback:feedback[index]})),answerIds:[`answer-${answer}`],explanation}});
 const diagram=(key:string,title:string,description:string,rows:Array<[string,string,string]>)=>b(key,{kind:'diagram',title,diagram:{type:'comparison',description,nodes:rows.map(([label,meaningVi,note],index)=>({id:`row-${index}`,label,pinyin:'',meaningVi,note,x:index,y:0}))}});
 let objective:string,rule:string,pitfall:string;
 if(id==='boot-3'){
  objective='Xác định vị trí lưỡi của j/q/x, zh/ch/sh, z/c/s; phân biệt bật hơi với vị trí lưỡi và luyện một cụm cảm ơn.';
  rule='Trong từng nhóm, j/zh/z là âm tắc-xát không bật hơi mạnh, q/ch/c bật hơi, x/sh/s là âm xát. Giữ riêng vị trí lưỡi và luồng hơi khi so sánh.';
  pitfall='Không lấy chữ cái tiếng Việt làm cách đọc Pinyin; không cuộn lưỡi quá mức hoặc coi bật hơi là hét to.';
  page('mission','Hai điều cần nghe và cảm nhận','context','scene',[
   note('mission','Vị trí lưỡi và luồng hơi','Bạn muốn nói 谢谢 rõ hơn. Trước hết tìm nhóm âm x, sau đó so với sh và s. Bài cho biết cách đặt lưỡi và tự quan sát; không tự chấm phát âm từ việc bạn bấm đúng lựa chọn.'),
   example('thanks','Cụm đích','谢谢！','Xièxie!','Cảm ơn!','Âm x xuất hiện ở cả hai âm tiết. Âm tiết thứ hai nhẹ. Nghe cả cụm nếu thiết bị có giọng tổng hợp; có thể học bằng chữ khi không nghe được.'),
  ]);
  page('positions','Ba vùng đặt lưỡi','understand','split',[
   diagram('positions','Định vị trước khi bật hơi','Mô tả hướng dẫn, không phải hình giải phẫu. Giữ hàm thư giãn, không dùng lực ép lưỡi.',[
    ['j / q / x','Mặt trước lưỡi gần ngạc cứng','Đầu lưỡi hướng gần mặt sau răng dưới; không uốn đầu lưỡi lên như zh.'],
    ['zh / ch / sh','Đầu lưỡi nâng về phía sau lợi trên','Nâng vừa đủ, không cuộn sâu hoặc chạm ngạc mềm.'],
    ['z / c / s','Đầu lưỡi gần mặt sau răng trên','Vùng tiếp xúc phía trước hơn nhóm zh/ch/sh.'],
   ]),
   note('vowels','Chữ i không luôn là cùng một nguyên âm','i trong ji/qi/xi khác phần âm sau zhi/chi/shi và zi/ci/si. Không ghép một âm “i” tiếng Việt vào tất cả. Khi luyện vị trí lưỡi, dùng cả âm tiết mẫu thay vì tách chữ cái để đoán.'),
  ]);
  page('air','Bật hơi không phải nói to','understand','focus',[
   diagram('air','Giữ một nhóm, đổi luồng hơi','Đặt lòng bàn tay cách miệng một khoảng thoải mái. Quan sát luồng hơi thoát lúc mở âm, không đo bằng độ lớn giọng.',[
    ['j → q','Không bật hơi mạnh → bật hơi','Giữ vùng mặt trước lưỡi; q có luồng hơi rõ hơn j.'],
    ['zh → ch','Không bật hơi mạnh → bật hơi','Giữ vùng đầu lưỡi nâng; ch có luồng hơi rõ hơn zh.'],
    ['z → c','Không bật hơi mạnh → bật hơi','Giữ vùng đầu lưỡi phía trước; c có luồng hơi rõ hơn z.'],
   ]),
   note('friction','x, sh, s là âm xát','Luồng khí đi qua khe hẹp tạo tiếng xát. Không gọi x là phiên bản bật hơi của j; cặp bật hơi trong nhóm này là j/q. Tương tự, so zh/ch và z/c.'),
  ]);
  page('examples','Nhận nhóm trong từ','understand','split',[
   example('ji','j trong một từ ngắn','鸡','jī','gà','Giới thiệu âm đầu j; chưa yêu cầu nhớ chữ mới.'),
   example('qi','q có bật hơi','七','qī','bảy','So jī/qī cùng thanh 1 để tập trung vào luồng hơi; hai từ khác nghĩa.'),
   example('xi','x là âm xát','西','xī','tây','Cùng vùng lưỡi với j/q nhưng không có chặn rồi bật như j/q.'),
   example('china','zh trong từ quen thuộc','中国','Zhōngguó','Trung Quốc','zh ở đầu âm tiết thứ nhất. Không đọc như z chỉ vì cùng bắt đầu bằng chữ z.'),
   example('eat','ch trong từ','吃','chī','ăn','Chú ý đầu lưỡi nâng và luồng hơi.'),
   example('four','s ở phía trước','四','sì','bốn','So vị trí s với sh; không dùng riêng khác biệt thanh điệu để kết luận âm đầu.'),
  ]);
  page('identify','Tìm nhóm mà không nhìn bảng','practice','focus',[
   choice('group','Vị trí của x','Khi chuẩn bị nói 谢谢 xièxie, chọn hướng đặt lưỡi phù hợp cho x.',['Cuộn sâu đầu lưỡi','Mặt trước lưỡi gần ngạc cứng','Mím hai môi'],1,['Đây không phải cách tạo x; cuộn sâu còn gây căng.','Đúng vùng của j/q/x. Giữ đầu lưỡi gần răng dưới.','Mím môi không tạo vị trí của x.'],'x dùng vùng mặt trước lưỡi gần ngạc cứng; khác sh ở vùng đầu lưỡi nâng.'),
   choice('aspiration','Cặp nào khác chủ yếu ở bật hơi?','Giữ trong nhóm j/q/x. Chọn cặp so sánh luồng hơi phù hợp.',['j và q','j và sh','x và s'],0,['Đúng: cùng vùng tạo âm, q bật hơi rõ hơn j.','Khác cả vị trí lưỡi và cách tạo âm.','Đây là hai âm xát ở hai vùng lưỡi khác nhau.'],'Đọc jī/qī nhẹ nhàng với cùng thanh điệu; không hét để tạo q.'),
   choice('front','Phân biệt z và zh','Điểm cần đổi khi chuyển từ z sang zh là gì?',['Chỉ tăng âm lượng','Đổi từ thanh 1 sang thanh 4','Nâng đầu lưỡi về phía sau hơn'],2,['Âm lượng không xác định vùng tạo âm.','Thanh điệu và âm đầu là hai đặc điểm khác nhau.','Đúng: thay vùng đặt đầu lưỡi.'],'Không đồng nhất Pinyin zh với một chữ cái tiếng Việt.'),
  ]);
  page('rehearse','Tự quan sát rồi trở lại mẫu','practice','workshop',[
   b('self-observe',{kind:'activity',title:'Thử một cặp âm',body:'Đọc jī rồi qī, đặt tay trước miệng. Ghi bạn cảm nhận luồng hơi ở âm nào; nếu chưa nghe/đọc được, viết lại hướng đặt lưỡi và đánh dấu cần mẫu âm. Đây là ghi nhận của bạn, không phải điểm phát âm.',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'place',label:'Vị trí',guidance:'Giữ vùng mặt trước lưỡi gần ngạc cứng cho cả hai.'},{id:'air',label:'Luồng hơi',guidance:'q có hơi bật rõ hơn; không thay bằng tăng âm lượng.'},{id:'support',label:'Trợ giúp',guidance:'Nếu chưa phân biệt được, mở lại mẫu hoặc nhờ người nói Mandarin phản hồi.'}],explanation:'Mục tiêu: jī ít bật hơi, qī bật hơi rõ. Tự cảm nhận hoặc nghe TTS chưa chứng minh đã phát âm chuẩn; có thể cần mẫu người nói và phản hồi riêng.'}}),
  ]);
  page('transfer','Nói cảm ơn trong tình huống mới','transfer','workshop',[
   b('transfer',{kind:'activity',title:'Một người nhặt giúp bạn cuốn sách',body:'Bạn muốn cảm ơn. Tự nói hoặc viết lời cảm ơn, rồi ghi âm đầu cần chú ý và vị trí lưỡi của nó. Có thể dùng Pinyin nếu chưa gõ được chữ.',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'meaning',label:'Ý định',guidance:'Dùng 谢谢 để cảm ơn.'},{id:'initial',label:'Âm đầu',guidance:'Cả hai âm tiết dùng x, không thay bằng sh hoặc s.'},{id:'rhythm',label:'Nhịp',guidance:'Âm tiết thứ hai nhẹ; giữ câu tự nhiên, không gằn cả hai âm.'}],explanation:'Một phương án: 谢谢！ Xièxie! — Cảm ơn! x dùng mặt trước lưỡi gần ngạc cứng. Tự đối chiếu cách đặt lưỡi và ý nghĩa; website chưa chấm chất lượng phát âm của lượt này.'}}),
  ]);
 }else{
  objective='Phân biệt thanh gốc với cách đọc liền cụm; vận dụng 3+3, 不 trước thanh 4 và 一 theo âm sau trong các ví dụ ngắn.';
  rule='Hai thanh 3 trong một cụm thường đọc gần 2+3. 不 trước thanh 4 đọc bú. 一 trước thanh 4 đọc yí, trước thanh 1/2/3 đọc yì; khi đọc số riêng hoặc thứ tự giữ yī.';
  pitfall='Không đổi chữ hoặc thanh từ điển khi mô tả cách đọc thực tế; không áp một quy tắc máy móc cho mọi ranh giới cụm hoặc chuỗi ba thanh 3.';
  page('mission','Một từ, hai cách ghi để học','context','scene',[
   example('hello','Từ đã gặp','你好','nǐ hǎo','xin chào','Thanh gốc 3+3; khi nói liền trong lời chào thường nghe gần ní hǎo (2+3). Đây là cùng từ, không phải đổi nghĩa.'),
   note('notation','Phân biệt nhãn từ và hướng dẫn nói','Trong bài này, dòng Pinyin của ví dụ giữ thanh từ điển. Phần giải thích ghi cách đọc liền cụm. Cả hai cách ghi có mục đích riêng; không coi một ghi chú biến điệu là lỗi chính tả trong mọi tài liệu.'),
  ]);
  page('third','Hai thanh 3 đi cùng nhau','understand','split',[
   diagram('third','3 + 3 → gần 2 + 3','Quy tắc cho hai âm tiết thuộc cùng cụm nói. Thanh cuối có thể chỉ hạ thấp trong lời nói nối tiếp.',[['你好','nǐ hǎo → ní hǎo','xin chào'],['很好','hěn hǎo → hén hǎo','rất tốt / rất khỏe theo ngữ cảnh'],['可以','kě yǐ → ké yǐ','có thể / được phép']]),
   note('third-limit','Không kéo mọi thanh 3 thành một đường võng sâu','Trước thanh 1/2/4, thanh 3 thường hạ thấp mà không nhấc đầy đủ. Chuỗi ba thanh 3 còn phụ thuộc cách chia cụm; bài này chưa yêu cầu dự đoán mọi chuỗi dài.'),
  ]);
  page('bu','不 trước thanh 4','understand','split',[
   example('not','Đọc liền 不是','不是','bù shì','không phải','是 shì là thanh 4 nên 不 đọc bú: bú shì. Giữ chữ 不 và thanh gốc bù khi tra từ.'),
   example('bad','Trước thanh 3 giữ bù','不好','bù hǎo','không tốt','好 hǎo là thanh 3, nên không áp quy tắc bú trước thanh 4.'),
   example('dont','Một ví dụ nữa','不要','bù yào','đừng; không muốn, tùy câu','要 yào là thanh 4: đọc liền bú yào. Hiểu cả câu để chọn nghĩa; không phải mọi 不要 đều là mệnh lệnh.'),
  ]);
  page('yi','一 nhìn thanh của âm sau','understand','focus',[
   diagram('yi','Ba trường hợp cần phân biệt','Nhìn ngay âm tiết sau 一 trong cụm. Đây là hướng dẫn đọc liền, không đổi thanh gốc yī.',[['Trước thanh 4','yí','一个: yī gè → yí gè khi giữ gè thanh 4 trong mẫu.'],['Trước thanh 1 / 2 / 3','yì','一天 yì tiān; 一年 yì nián; 一本 yì běn.'],['Số riêng / số thứ tự','yī','Đếm 一、二、三 hoặc 第一 dì yī giữ thanh 1.']]),
   note('neutral','Không đoán từ một âm nhẹ chưa rõ nguồn','个 có thể đọc nhẹ trong lời nói. Mẫu này ghi rõ gè thanh 4 để học quy tắc trước; không dùng TTS của từng thiết bị làm trọng tài cho mọi biến thể.'),
  ]);
  page('examples','Đọc cả cụm và giữ nghĩa','understand','split',[
   example('day','Trước thanh 1','一天','yī tiān','một ngày','Cách đọc liền: yì tiān.'),
   example('year','Trước thanh 2','一年','yī nián','một năm','Cách đọc liền: yì nián.'),
   example('book','Trước thanh 3','一本书','yī běn shū','một quyển sách','Cách đọc liền: yì běn shū. 本 là lượng từ của sách; không bỏ 本.'),
   example('first','Số thứ tự','第一','dì yī','thứ nhất','Giữ yī thanh 1 trong số thứ tự; không đổi vì 第 là thanh 4 đứng trước.'),
  ]);
  page('apply','Tự chọn trước khi xem giải thích','practice','focus',[
   choice('bu-check','Thanh nào điều khiển 不?','Đọc liền 不是. Chọn cách đọc của 不 trong cụm này.',['bù','bú','bū'],1,['Đây là thanh gốc, nhưng trước shì thanh 4 thường đọc bú.','Đúng: 不 đứng trước thanh 4.','Không có quy tắc đổi 不 thành thanh 1 ở đây.'],'不是: bù shì ở thanh gốc, bú shì khi đọc liền.'),
   choice('yi-check','Một quyển sách','Chọn cách đọc liền cụm 一本书 trong mẫu này.',['yí běn shū','yī běn shū','yì běn shū'],2,['yí áp dụng trước thanh 4; běn là thanh 3.','Đây là thanh từ điển; yêu cầu đang hỏi cách đọc liền.','Đúng: trước běn thanh 3, 一 đọc yì.'],'Nhìn âm sau 一: běn. 不 và 一 có quy tắc riêng, không hoán đổi.'),
   choice('ordinal','Thứ nhất','Trong 第一, 一 đọc thế nào?',['yī','yí','yì'],0,['Đúng: số thứ tự giữ yī.','Không áp quy tắc trước thanh 4 vào số thứ tự này.','Không đổi thành thanh 4 trong 第一.'],'第 đứng trước không quyết định biến điệu của 一; 第一 là trường hợp giữ thanh gốc.'),
   choice('third-check','Đổi đúng âm tiết','Đọc liền 可以 kě yǐ. Chọn cách đọc gần đúng theo quy tắc hai thanh 3.',['kě yí','ké yǐ','kè yì'],1,['Quy tắc này đổi âm tiết đầu, không phải âm tiết sau.','Đúng: âm đầu gần thanh 2, âm sau vẫn thuộc thanh 3.','Không đổi hai âm thành thanh 4.'],'Có thể dùng ké yǐ để ghi chú cách nói; dạng tra từ vẫn kě yǐ.'),
  ]);
  page('transfer','Chuyển quy tắc sang cụm mới','transfer','workshop',[
   b('transfer',{kind:'activity',title:'Mời bạn cùng luyện',body:'Bạn gặp từ mới 一起, nghĩa là “cùng nhau”, thanh từ điển yī qǐ. Chưa nghe mẫu: hãy dự đoán cách đọc liền và giải thích dựa trên thanh nào. Sau đó so với 第一 (thứ nhất).',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'after',label:'Âm sau',guidance:'起 qǐ có thanh 3.'},{id:'change',label:'Cách đọc',guidance:'一 trước thanh 3 đọc yì: yì qǐ.'},{id:'exception',label:'Số thứ tự',guidance:'第一 đọc dì yī; không áp cách đổi của 一起 vào mọi chỗ có 一.'}],explanation:'一起: thanh từ điển yī qǐ; nói liền yì qǐ vì qǐ là thanh 3. 第一: dì yī, giữ thanh 1. Nghĩa: cùng nhau / thứ nhất. Đây là kiểm tra vận dụng quy tắc sang từ mới, chưa là điểm phát âm.'}}),
  ]);
 }
 page('recap','Mang sang lần luyện tiếp','transfer','focus',[note('recap','Tự kiểm trước khi vào Thử Luyện',id==='boot-3'?'Không nhìn bảng: nêu vùng lưỡi của ba nhóm, tìm cặp bật hơi trong từng nhóm, rồi nói 谢谢. Nếu còn nhầm, mở đúng trang vị trí hoặc luồng hơi. Lần ôn sau thử trước khi mở mẫu.':'Không nhìn bảng: giải thích 你好, 不是, 一本书 và 第一. Nếu nhầm, quay lại đúng quy tắc thay vì học thuộc một đáp án. Lần ôn sau thử với một cụm khác và ghi thanh gốc riêng cách đọc.')]);
 const lessonPages:LessonPageDocument={version:1,art:'sound',pages};
 const errors=validateLessonPages(lessonPages);if(errors.length)throw new Error(`${id}: ${errors.join('; ')}`);
 const models=pages.flatMap(p=>p.blocks).filter(b=>b.kind==='dialogue');
 // The legacy structured practice contract expects Mandarin answers. Keep
 // metalinguistic Vietnamese choices in editable lessonPages, with separate
 // language examples for downstream practice consumers.
 const exercises=id==='boot-3'?[
  {promptVi:'Chọn lời cảm ơn có âm đầu x ở cả hai âm tiết.',answer:'谢谢',answerPinyin:'xièxie',answerMeaningVi:'cảm ơn',distractors:['你好','再见'],explanationVi:'谢谢 dùng x ở cả hai âm tiết; 你好 là lời chào, 再见 là tạm biệt. Nhận dạng chữ chưa chứng minh nghe phân biệt được âm.'},
  {promptVi:'Chọn từ có âm đầu q bật hơi. Từ hỗ trợ: 七 qī = bảy; 鸡 jī = gà; 西 xī = tây.',answer:'七',answerPinyin:'qī',answerMeaningVi:'bảy',distractors:['鸡','西'],explanationVi:'七 có q bật hơi; 鸡 có j không bật hơi mạnh, 西 có x là âm xát. Đây là đối chiếu có Pinyin.'},
 ]:[
  {promptVi:'Cụm nào có 不 đứng ngay trước thanh 4? Hỗ trợ: 是 shì, 好 hǎo, 来 lái.',answer:'不是',answerPinyin:'bù shì',answerMeaningVi:'không phải',distractors:['不好','不来'],explanationVi:'是 thanh 4 nên 不是 đọc liền bú shì; dòng Pinyin đáp án giữ thanh gốc. 好 thanh 3 và 来 thanh 2 không kích hoạt quy tắc này.'},
  {promptVi:'Cụm nào giữ 一 thanh 1 vì là số thứ tự? Hỗ trợ: 第一 dì yī = thứ nhất; 一年 yī nián = một năm; 一本 yī běn = một quyển.',answer:'第一',answerPinyin:'dì yī',answerMeaningVi:'thứ nhất',distractors:['一年','一本'],explanationVi:'第一 giữ yī. Trong 一年 và 一本, 一 đọc yì khi nói liền theo mẫu.'},
 ];
 const studioContent={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:objective,conceptVi:objective,ruleVi:rule,pitfallVi:pitfall,checkpointVi:pages.find(p=>p.id.endsWith(':transfer'))!.blocks[0].body,prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue:models.map(m=>({speaker:m.title,hanzi:m.hanzi,pinyin:m.pinyin,meaningVi:m.meaningVi})),grammar:[{pattern:id==='boot-3'?'j/q/x · zh/ch/sh · z/c/s':'3+3 · 不 · 一',explanationVi:rule,modelExample:{hanzi:models[0].hanzi,pinyin:models[0].pinyin,meaningVi:models[0].meaningVi},guidedPractice:{promptVi:exercises[0].promptVi,modelAnswerHanzi:exercises[0].answer,modelAnswerPinyin:exercises[0].answerPinyin,modelAnswerMeaningVi:exercises[0].answerMeaningVi}}],exercises,lessonPages,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id],review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 return {lessonId:id,title:lesson.title,level:'hsk0',lessonPages,studioContent,editorialStatus:'draft-needs-review'};
}
const items=['boot-3','boot-4'].map(manuscript);
writeFileSync('content/drafts/thien-lo-boot-sound-batch-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((n,i)=>n+i.lessonPages.pages.length,0)});
