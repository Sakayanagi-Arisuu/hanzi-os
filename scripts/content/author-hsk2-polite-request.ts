import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID,WORD_BY_ID} from '../../src/data/curriculum';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity,type LessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const id='hsk2-daily-needs-family-lesson-01';
const lesson=LESSON_BY_ID.get(id)!,rich=getRichLessonContent(id)!;
const b=(key:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`${id}:v2:block:${key}`),...fields});
const ex=(key:string,title:string,hanzi:string,pinyin:string,meaningVi:string)=>b(key,{kind:'dialogue',title,hanzi,pinyin,meaningVi});
const target=(objective:string,kind:'task'|'grammar'='task')=>({skill:'grammar' as const,objective,sources:[{kind,id:kind==='task'?rich.tasks[0].id:rich.grammar[0].id}]});
const activity=(key:string,title:string,body:string,value:Partial<LessonActivity>)=>b(key,{kind:'activity',title,body,activity:{...emptyLessonActivity(),...value}});
const choice=(key:string,title:string,body:string,options:Array<[string,string]>,answer:number,objective:string)=>activity(key,title,body,{options:options.map(([text,feedback],i)=>({id:`c${i}`,text,feedback})),answerIds:[`c${answer}`],explanation:options[answer][1],learningTarget:target(objective)});
const dialogue=[
 ['A','不好意思，你能帮我一个忙吗？','Bù hǎoyìsi, nǐ néng bāng wǒ yí ge máng ma?','Ngại quá, bạn giúp tôi một việc được không?'],
 ['B','可以，你想让我做什么？','Kěyǐ, nǐ xiǎng ràng wǒ zuò shénme?','Được, bạn muốn tôi làm gì?'],
 ['A','我的手疼，请帮我打开门。','Wǒ de shǒu téng, qǐng bāng wǒ dǎkāi mén.','Tay tôi đau, bạn mở cửa giúp tôi nhé.'],
 ['B','这扇门，还是那扇门？','Zhè shàn mén, háishi nà shàn mén?','Cửa này hay cửa kia?'],
 ['A','这扇门，谢谢。','Zhè shàn mén, xièxie.','Cửa này, cảm ơn bạn.'],
 ['B','别拿东西了，让我来吧。','Bié ná dōngxi le, ràng wǒ lái ba.','Đừng cầm đồ nữa, để tôi làm cho.'],
 ['A','好啊，谢谢你帮忙。','Hǎo a, xièxie nǐ bāngmáng.','Được, cảm ơn bạn đã giúp.'],
];
const vocabulary:Record<string,[string,string,string]>={
 '啊':['好啊，我们一起去。','Hǎo a, wǒmen yìqǐ qù.','Được đấy, chúng ta cùng đi.'],
 '帮':['请帮我拿书。','Qǐng bāng wǒ ná shū.','Bạn cầm sách giúp tôi nhé.'],
 '帮忙':['谢谢你来帮忙。','Xièxie nǐ lái bāngmáng.','Cảm ơn bạn đã đến giúp.'],
 '别':['别关门，我还没进去。','Bié guān mén, wǒ hái méi jìnqu.','Đừng đóng cửa, tôi còn chưa vào.'],
 '不错':['这个办法不错。','Zhège bànfǎ búcuò.','Cách này khá tốt.'],
 '不好意思':['不好意思，请问洗手间在哪儿？','Bù hǎoyìsi, qǐngwèn xǐshǒujiān zài nǎr?','Xin lỗi làm phiền, cho hỏi nhà vệ sinh ở đâu?'],
 '打':['请帮我打个电话。','Qǐng bāng wǒ dǎ ge diànhuà.','Bạn gọi một cuộc điện thoại giúp tôi nhé.'],
 '打开':['请打开这本书。','Qǐng dǎkāi zhè běn shū.','Hãy mở cuốn sách này.'],
 '告诉':['请告诉我你的名字。','Qǐng gàosu wǒ nǐ de míngzi.','Hãy cho tôi biết tên bạn.'],
 '跟':['请跟我来。','Qǐng gēn wǒ lái.','Mời đi theo tôi.'],
 '还是':['你想喝水还是喝茶？','Nǐ xiǎng hē shuǐ háishi hē chá?','Bạn muốn uống nước hay uống trà?'],
 '让':['让我看看。','Ràng wǒ kànkan.','Để tôi xem nào.'],
 '希望':['我希望明天能见到你。','Wǒ xīwàng míngtiān néng jiàndào nǐ.','Tôi hy vọng ngày mai gặp được bạn.'],
 '笑':['他听了以后笑了。','Tā tīng le yǐhòu xiào le.','Sau khi nghe, anh ấy cười.'],
};
const doc:LessonPageDocument={version:1,art:'campus',pages:[
 {id:`${id}:v2:context`,title:'Nhờ giúp khi đang cầm đồ',layout:'scene',stage:'context',blocks:[
  b('situation',{title:'Một việc cần nói rõ',body:'Bạn đang đứng trước hai cánh cửa, tay đau và cần người quen mở cửa này. Bạn cần mở lời, nói việc cụ thể, xác nhận khi họ hỏi lại và cảm ơn. Người giúp không tự biết bạn muốn mở cửa nào.'}),
  b('support',{title:'Từ hỗ trợ cho tình huống',body:'手 shǒu: tay · 疼 téng: đau · 门 mén: cửa · 扇 shàn: lượng từ cho cửa · 这 zhè: này · 那 nà: kia.\nCác từ hỗ trợ được giải thích để hiểu câu; chưa yêu cầu nhớ độc lập ngay. Pinyin dùng biến điệu trong câu khi thích hợp. Giọng nghe là tổng hợp.'}),
 ]},
 {id:`${id}:v2:dialogue`,title:'Nghe mục đích của từng lượt',layout:'dialogue',stage:'context',blocks:dialogue.map(([speaker,hanzi,pinyin,meaningVi],i)=>ex(`turn-${i}`,`${speaker} · lượt ${i+1}`,hanzi,pinyin,meaningVi))},
 {id:`${id}:v2:chain`,title:'Một lời nhờ chưa đủ thông tin',layout:'focus',stage:'understand',blocks:[
  b('chain',{kind:'diagram',title:'Theo dõi chuỗi trao đổi',diagram:{type:'sequence',description:'Các lượt sau giải quyết thông tin còn thiếu của lượt trước; không cần nói đủ mọi bước nếu tình huống đã rõ.',nodes:[
   {id:'open',label:'不好意思',pinyin:'bù hǎoyìsi',meaningVi:'mở lời khi làm phiền',note:'Mở lời lịch sự; chưa nói việc cần giúp.',x:0,y:0},
   {id:'ask',label:'帮我打开门',pinyin:'bāng wǒ dǎkāi mén',meaningVi:'mở cửa giúp tôi',note:'Nêu người nhận giúp và việc cần làm.',x:1,y:0},
   {id:'clarify',label:'这扇门还是那扇门？',pinyin:'Zhè shàn mén háishi nà shàn mén?',meaningVi:'cửa này hay cửa kia?',note:'Hỏi rõ trước khi hành động.',x:2,y:0},
   {id:'confirm',label:'这扇门，谢谢。',pinyin:'Zhè shàn mén, xièxie.',meaningVi:'cửa này, cảm ơn',note:'Xác nhận lựa chọn và cảm ơn.',x:3,y:0},
  ]}}),
  choice('intent','Ai đang cần giúp?','A nói 你能帮我一个忙吗？ A đang làm gì?',[
   ['Nhờ B giúp một việc','Đúng: 我 là người cần được giúp, 你 là người được hỏi.'],
   ['Đề nghị giúp B','Nếu A đề nghị tự làm giúp, có thể nói 让我来吧.'],
   ['Đã nói rõ cửa cần mở','Lượt này chưa nêu việc cụ thể hoặc cửa nào.'],
  ],0,'Nhận diện người nhờ và người giúp trong lượt mở lời bằng câu viết.'),
 ]},
 {id:`${id}:v2:help-pattern`,title:'帮 và 帮忙 đặt người ở đâu?',layout:'split',stage:'understand',blocks:[
  ex('help-example','Người + việc','你能帮我拿书吗？','Nǐ néng bāng wǒ ná shū ma?','Bạn cầm sách giúp tôi được không?'),
  b('help-rule',{title:'Hai cấu trúc dùng được',body:'帮 + người + hành động: 帮我拿书 (cầm sách giúp tôi).\n帮 + người + 一个忙: 帮我一个忙 (giúp tôi một việc).\n帮忙 thường đứng như một cụm: 来帮忙 (đến giúp), 谢谢你帮忙 (cảm ơn bạn đã giúp). Không ghép máy móc thành 帮忙我.\nMở lời 你能…吗？ tạo câu hỏi nhờ giúp; 请… là lời đề nghị/yêu cầu lịch sự, vẫn cần chọn giọng và quan hệ phù hợp.'}),
  activity('help-order','Xếp câu nhờ giúp','Xếp đúng mẫu: Bạn + có thể + giúp tôi + cầm sách + không?',{type:'order',options:[{id:'q',text:'吗',feedback:''},{id:'help',text:'帮我',feedback:''},{id:'you',text:'你',feedback:''},{id:'action',text:'拿书',feedback:''},{id:'can',text:'能',feedback:''}],answerIds:['you','can','help','action','q'],explanation:'你能帮我拿书吗？Nǐ néng bāng wǒ ná shū ma? Người được giúp 我 đứng ngay sau 帮; việc cần làm là 拿书.',learningTarget:target('Sắp xếp một yêu cầu có người nhận giúp và hành động cụ thể.','grammar')}),
 ]},
 {id:`${id}:v2:clarify`,title:'Hỏi lại và xác nhận một lựa chọn',layout:'focus',stage:'practice',blocks:[
  ex('or-example','Đưa hai lựa chọn','这扇门，还是那扇门？','Zhè shàn mén, háishi nà shàn mén?','Cửa này hay cửa kia?'),
  b('or-rule',{title:'还是 trong câu hỏi lựa chọn',body:'A 还是 B đưa ra hai phương án để người nghe chọn. Trong câu hỏi lựa chọn này không thêm 吗 ở cuối. 还是 còn có cách dùng khác, nhưng bài này chỉ luyện câu hỏi lựa chọn.\nTrả lời phải xác định một phương án: 这扇门. Chỉ nói 可以 (được) chưa giúp người hỏi biết cửa nào.'}),
  choice('confirm','Nói rõ lựa chọn','Bạn muốn cửa ở gần mình. Người kia hỏi 这扇门，还是那扇门？ Chọn câu xác nhận.',[
   ['可以。','Đồng ý nhưng chưa xác nhận cửa nào.'],
   ['这扇门，谢谢。','Đúng: xác nhận cửa này, phù hợp thông tin gần mình.'],
   ['我希望明天去。','Câu này nói mong muốn ngày mai đi, không trả lời lựa chọn cửa.'],
  ],1,'Chọn phản hồi giải quyết thông tin thiếu của câu hỏi lựa chọn.'),
  activity('or-cloze','Điền đúng theo yêu cầu','Điền đúng từ dùng để hỏi lựa chọn A hay B trong mẫu vừa học: 你喝水___喝茶？',{type:'cloze',acceptedAnswers:['还是'],explanation:'你喝水还是喝茶？Nǐ hē shuǐ háishi hē chá? Bạn uống nước hay trà? Mục này yêu cầu đúng từ hỏi lựa chọn, không hỏi câu kể nối bằng 和.',learningTarget:target('Dùng 还是 để hỏi giữa hai phương án trong mẫu có ràng buộc.','grammar')}),
 ]},
 {id:`${id}:v2:respond`,title:'Giúp được, chưa giúp được và mong muốn',layout:'split',stage:'understand',blocks:[
  ex('offer','Đề nghị làm giúp','让我来吧。','Ràng wǒ lái ba.','Để tôi làm cho.'),
  ex('decline','Chưa thể giúp ngay','不好意思，我现在没时间。','Bù hǎoyìsi, wǒ xiànzài méi shíjiān.','Xin lỗi, bây giờ tôi không có thời gian.'),
  ex('wish','Bày tỏ điều mong đợi','我希望明天能见到你。','Wǒ xīwàng míngtiān néng jiàndào nǐ.','Tôi hy vọng ngày mai gặp được bạn.'),
  b('response-rule',{title:'Không đánh đồng ý muốn với lời nhờ',body:'让我来吧 đề nghị tự làm thay, còn 我希望… nói điều mong đợi. Mong muốn không bảo đảm người khác đã đồng ý giúp. Nếu không giúp được, nói rõ giới hạn bằng câu ngắn.\n别 + hành động: đừng làm việc đó. 别拿东西了 yêu cầu dừng cầm đồ; không phải câu “tôi không muốn cầm”. 不错 nghĩa là khá tốt, không dùng thay cho 不好意思 khi mở lời làm phiền.'}),
 ]},
 ...[0,5,10].map(offset=>({id:`${id}:v2:words-${offset}`,title:`Từ trong ngữ cảnh · ${Math.floor(offset/5)+1}`,layout:'split' as const,stage:'understand' as const,blocks:lesson.wordIds.slice(offset,offset+5).map(wordId=>{const w=WORD_BY_ID.get(wordId)!;const example=vocabulary[w.simplified];if(!example)throw new Error(`Missing example ${wordId}`);return ex(`word-${wordId}`,`${w.simplified} · ${w.meaning}`,...example);})})),
 {id:`${id}:v2:transfer`,title:'Đổi sang lời nhờ gọi điện',layout:'workshop',stage:'transfer',blocks:[
  b('transfer-role',{title:'Thông tin mới',body:'Điện thoại của bạn không dùng được. Bạn cần nhờ người quen gọi cho giáo viên, không phải gọi cho bạn học. Viết cuộc trao đổi ít nhất sáu lượt: mở lời → đồng ý/hỏi việc → nói nhờ gọi điện → hỏi gọi giáo viên hay bạn học → xác nhận giáo viên → đồng ý và cảm ơn.\nHỗ trợ: 电话 diànhuà: điện thoại · 老师 lǎoshī: giáo viên · 同学 tóngxué: bạn học · 不能用 bù néng yòng: không dùng được. Có thể ghi Pinyin nếu chưa nhập được chữ; đó là trợ giúp, chưa chứng minh viết chữ độc lập.'}),
  activity('transfer-write','Viết trước khi xem một phương án','Viết các lượt A/B theo thông tin mới. Đừng chép hội thoại mở cửa.',{type:'rubric',rubric:[
   {id:'request',label:'Nêu việc cần giúp',guidance:'Lời nhờ có 打电话, người cần được giúp và mở lời phù hợp; không chỉ nói giúp tôi chung chung.'},
   {id:'clarify',label:'Hỏi lại có hai phương án',guidance:'Người giúp hỏi 老师还是同学; người nhờ xác nhận 老师, không trả lời 可以 thay cho lựa chọn.'},
   {id:'cohesion',label:'Các lượt nối nhau',guidance:'Người nhờ và người giúp không đổi vai giữa chừng; phản hồi trả lời đúng câu hỏi ngay trước.'},
   {id:'close',label:'Kết thúc có xác nhận',guidance:'Có lời nhận giúp và cảm ơn; câu khác mẫu vẫn có thể đúng nếu giữ thông tin tình huống.'},
  ],explanation:'Một phương án:\nA: 不好意思，你能帮我一个忙吗？\nB: 可以，什么事？\nA: 我的电话不能用，请帮我打个电话。\nB: 给老师打，还是给同学打？\nA: 给老师打。\nB: 好，让我来吧。\nA: 谢谢你帮忙。\n\nBù hǎoyìsi, nǐ néng bāng wǒ yí ge máng ma? / Kěyǐ, shénme shì? / Wǒ de diànhuà bù néng yòng, qǐng bāng wǒ dǎ ge diànhuà. / Gěi lǎoshī dǎ, háishi gěi tóngxué dǎ? / Gěi lǎoshī dǎ. / Hǎo, ràng wǒ lái ba. / Xièxie nǐ bāngmáng.\n\nNgại quá, giúp tôi một việc được không? / Được, việc gì? / Điện thoại tôi không dùng được, gọi giúp tôi một cuộc nhé. / Gọi giáo viên hay bạn học? / Gọi giáo viên. / Được, để tôi làm cho. / Cảm ơn bạn đã giúp.\nĐây là tự đối chiếu nội dung, không chấm điểm nói hoặc viết độc lập.',learningTarget:target('Tự viết chuỗi nhờ giúp, hỏi rõ và xác nhận với thông tin mới; chỉ rubric tự đối chiếu.')}),
 ]},
 {id:`${id}:v2:recap`,title:'Mang sang lần giao tiếp tiếp theo',layout:'focus',stage:'transfer',blocks:[b('recap',{title:'Tự kiểm không nhìn mẫu',body:'Bạn có phân biệt được ai nhờ, ai giúp không? Có nói được việc cần làm sau 帮我 không? Người kia hỏi A 还是 B thì bạn xác nhận một phương án như thế nào?\nỞ lần ôn sau, đổi người nhận cuộc gọi thành bạn học và thử lại trước khi mở mẫu. Tra từ trong Tàng Tự Khố, tiếp tục Thử Luyện theo lộ trình. Xem hết trang hay tích rubric không có nghĩa đã thành thạo nói/viết.'})]},
]};
const errors=[...validateLessonPages(doc),...validateLessonActivitySources(id,doc)];if(errors.length)throw new Error(errors.join('\n'));
const objective='Nhờ giúp một việc cụ thể, hỏi lại bằng hai lựa chọn, xác nhận và kết thúc lịch sự trong chuỗi ít nhất sáu lượt.';
const content={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:objective,conceptVi:'Các lượt nói bổ sung thông tin còn thiếu của lời nhờ.',ruleVi:'帮 + người + việc; 帮 + người + 一个忙; A 还是 B để hỏi lựa chọn; 让我来吧 để đề nghị làm giúp.',pitfallVi:'Không nói 帮忙我; không đáp 可以 khi câu hỏi cần chọn người hoặc đồ vật; 希望 chưa phải lời đồng ý.',checkpointVi:'Đổi từ mở cửa sang nhờ gọi cho giáo viên, xác nhận đúng người nhận cuộc gọi.',prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue:dialogue.map(([speaker,hanzi,pinyin,meaningVi])=>({speaker,hanzi,pinyin,meaningVi})),grammar:[{pattern:'帮 + người + hành động',explanationVi:'Nêu rõ người nhận giúp và việc phải làm.',modelExample:{hanzi:'你能帮我拿书吗？',pinyin:'Nǐ néng bāng wǒ ná shū ma?',meaningVi:'Bạn cầm sách giúp tôi được không?'},guidedPractice:{promptVi:'Nhờ mở cửa này giúp mình.',modelAnswerHanzi:'请帮我打开这扇门。',modelAnswerPinyin:'Qǐng bāng wǒ dǎkāi zhè shàn mén.',modelAnswerMeaningVi:'Bạn mở cửa này giúp tôi nhé.'}}],exercises:[{promptVi:'Bạn muốn mở cửa gần mình. Người kia hỏi 这扇门还是那扇门？ Chọn lời xác nhận.',answer:'这扇门，谢谢。',answerPinyin:'Zhè shàn mén, xièxie.',answerMeaningVi:'Cửa này, cảm ơn.',distractors:['可以。','我希望明天去。'],explanationVi:'Cần chọn cửa này; đồng ý chung chung chưa xác định cửa.'}],lessonPages:doc,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id],sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:rich.topics.map(t=>t.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
writeFileSync('content/drafts/thien-lo-hsk2-polite-request-v2.json',JSON.stringify({schemaVersion:1,lessonId:id,level:'hsk2',title:lesson.title,objective,humanReviewed:false,status:'authored-draft-not-published',lessonPages:doc,studioContent:content},null,2)+'\n');
console.log({lessonId:id,pages:doc.pages.length,activities:doc.pages.flatMap(p=>p.blocks).filter(b=>b.activity).length,vocabulary:lesson.wordIds.length,published:false});
