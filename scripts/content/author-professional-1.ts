import { writeFileSync } from 'node:fs';
import { emptyLessonBlock, validateLessonPages, type LessonBlock, type LessonPageDocument } from '../../src/learning/lessonPages';
import { emptyLessonActivity } from '../../src/learning/lessonActivities';
import { LESSON_BY_ID } from '../../src/data/curriculum';
import { getRichLessonContent } from '../../src/learning/richLessonContent';

// Original, lesson-specific first editorial version. No automatic human-review claim.
const lesson=LESSON_BY_ID.get('professional-1')!;
const rich=getRichLessonContent(lesson.id)!;
const block=(id:string,data:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`professional-1:v2:${id}`),...data});
const example=(id:string,hanzi:string,pinyin:string,meaningVi:string)=>block(id,{kind:'dialogue',title:'Câu trong tình huống',hanzi,pinyin,meaningVi});
const document:LessonPageDocument={version:1,art:'campus',pages:[
  {id:'professional-1:v2:arrival',title:'Làm quen với bạn học mới',layout:'scene',stage:'context',blocks:[
    block('mission',{title:'Bạn cần nói được gì?',body:'Trong buổi làm quen, hãy nói bạn là học sinh hay sinh viên, học ở đâu và đang học gì. Sau đó hỏi lại người bạn mới bằng một câu ngắn.'}),
    block('prior',{title:'Chuẩn bị trước khi nghe',body:'Bạn đã gặp 我 (wǒ, tôi), 你 (nǐ, bạn), 是 (shì, là), 吗 (ma, trợ từ hỏi). Bài này phân biệt tên nơi học với tên người học. Nếu chưa nhớ, mở Tàng Tự Khố của bài và nghe lại từ cần dùng.'}),
    block('common-words',{title:'Ba từ dùng chung cho mọi cấp học',body:'学校 (xuéxiào) — trường học; 学生 (xuésheng) — học sinh/người học; 上学 (shàngxué) — đi học, theo học. 学校 là nơi; 学生 là người; 上学 là hoạt động. 学生 khi đứng riêng thường đọc nhẹ âm 生; trong 小学生、中学生、大学生 dùng shēng.'}),
    example('general-student','我是学生。','Wǒ shì xuésheng.','Tôi là học sinh.'),
    example('general-school','我在学校上学。','Wǒ zài xuéxiào shàngxué.','Tôi đi học ở trường.'),
  ]},
  {id:'professional-1:v2:listen',title:'Nghe hai người làm quen',layout:'dialogue',stage:'context',blocks:rich.dialogue.map((turn,index)=>block(`turn-${index}`,{kind:'dialogue',title:turn.speaker,...turn}))},
  {id:'professional-1:v2:people-places',title:'Trường học và người học là hai nhóm khác nhau',layout:'focus',stage:'understand',blocks:[
    block('compare',{kind:'diagram',title:'Nhìn phần thêm vào cuối từ',diagram:{type:'comparison',description:'小学, 中学, 大学 gọi cấp trường. Thêm 生 để gọi người đang học ở cấp đó. 学校 gọi trường học nói chung, 学生 gọi học sinh hoặc người học nói chung.',nodes:[
      {id:'primary',label:'小学 → 小学生',pinyin:'xiǎoxué → xiǎoxuéshēng',meaningVi:'tiểu học → học sinh tiểu học',note:'小学生 là người, không phải tòa nhà.',x:0,y:0},
      {id:'secondary',label:'中学 → 中学生',pinyin:'zhōngxué → zhōngxuéshēng',meaningVi:'trung học → học sinh trung học',note:'中学 dùng chung cho trường trung học; không tự giới hạn là một cấp lớp cụ thể.',x:1,y:0},
      {id:'university',label:'大学 → 大学生',pinyin:'dàxué → dàxuéshēng',meaningVi:'đại học → sinh viên đại học',note:'大学生 dùng để giới thiệu vai trò của một người.',x:2,y:0},
    ]}}),
    block('classification',{kind:'activity',title:'Từ nào gọi một người?',body:'Chọn từ có nghĩa là sinh viên đại học.',activity:{...emptyLessonActivity(),options:[{id:'school',text:'大学',feedback:'大学 chỉ trường hoặc bậc đại học. Câu hỏi cần tên người học.'},{id:'student',text:'大学生',feedback:'Đúng. 生 trong 大学生 giúp gọi người học ở đại học.'}],answerIds:['student'],explanation:'大学 gọi trường đại học; 大学生 gọi sinh viên. Ở bài này, nhớ cặp nơi học và người học trước khi ghép câu.',hint:'Quan sát từ có thêm 生.'}}),
  ]},
  {id:'professional-1:v2:patterns',title:'Dùng 是 cho vai trò, 在 cho nơi học',layout:'split',stage:'understand',blocks:[
    example('identity','我是大学生。','Wǒ shì dàxuéshēng.','Tôi là sinh viên đại học.'),
    example('location','我在大学上学。','Wǒ zài dàxué shàngxué.','Tôi học ở trường đại học.'),
    block('rule',{title:'Chọn cấu trúc theo điều muốn nói',body:'我 + 是 + tên người học: giới thiệu mình là ai.\n我 + 在 + nơi học + 上学: nói mình học ở đâu.\nKhông nói 我是大学 nếu muốn nói mình là sinh viên: 大学 là trường, cần dùng 大学生.'}),
    block('repair',{kind:'activity',title:'Sửa đúng ý định của người nói',body:'Bạn muốn nói “Tôi là học sinh trung học”. Chọn câu phù hợp.',activity:{...emptyLessonActivity(),options:[{id:'place',text:'我是中学。',feedback:'Câu này ghép “tôi là” với tên trường. Thêm 生 để gọi người học.'},{id:'person',text:'我是中学生。',feedback:'Đúng. 中学生 là học sinh trung học.'},{id:'wrongverb',text:'我在中学生。',feedback:'中学生 là người; 在 trong mẫu nơi học cần đi với một địa điểm.'}],answerIds:['person'],explanation:'Nói vai trò: 我是中学生。 Nói nơi học: 我在中学上学。Hai câu gần ý nhưng có cấu trúc khác nhau.',hint:''}}),
  ]},
  {id:'professional-1:v2:ask',title:'Hỏi tiếp để cuộc nói chuyện không dừng lại',layout:'split',stage:'understand',blocks:[
    example('question-place','你在哪个学校上学？','Nǐ zài nǎ ge xuéxiào shàngxué?','Bạn học ở trường nào?'),
    example('question-person','你是大学生吗？','Nǐ shì dàxuéshēng ma?','Bạn là sinh viên đại học phải không?'),
    block('subject-support',{title:'Hai từ hỗ trợ cho cuộc làm quen',body:'学习 (xuéxí) — học; 汉语 (Hànyǔ) — tiếng Trung. Hai từ này được giới thiệu ngay tại đây để bạn nói mình đang học gì; không giả định bạn đã học chúng ở bài trước. 上学 nói việc đi học/theo học ở trường; 学习 + nội dung học nói bạn học môn hay ngôn ngữ nào.'}),
    example('subject','我学习汉语。','Wǒ xuéxí Hànyǔ.','Tôi học tiếng Trung.'),
    block('question-note',{title:'Câu hỏi nào cần 吗?',body:'哪个 đã hỏi “nào”: trong mẫu 你在哪个学校上学？ không thêm 吗. Với câu hỏi đúng/sai, thêm 吗 cuối câu: 你是大学生吗？\nĐể hỏi nội dung đang học: 你学习什么？ (Nǐ xuéxí shénme?) — Bạn học gì?'}),
  ]},
  {id:'professional-1:v2:independent',title:'Tự ghép câu theo thông tin đã cho',layout:'workshop',stage:'practice',blocks:[
    block('order',{kind:'activity',title:'Sắp xếp câu',body:'Nói “Tôi học ở trường trung học”. Dùng đủ các mảnh.',activity:{...emptyLessonActivity(),type:'order',options:[{id:'verb',text:'上学',feedback:''},{id:'place',text:'中学',feedback:''},{id:'subject',text:'我',feedback:''},{id:'at',text:'在',feedback:''}],answerIds:['subject','at','place','verb'],explanation:'我在中学上学。 (Wǒ zài zhōngxué shàngxué.) Đặt 在 + nơi học trước hoạt động 上学.',hint:'Chủ ngữ + 在 + nơi học + 上学.'}}),
    block('cloze',{kind:'activity',title:'Tự nhớ từ cần dùng',body:'Điền từ còn thiếu để nói “Tôi là sinh viên đại học”: 我是___。',activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:['大学生'],explanation:'大学生 (dàxuéshēng) là sinh viên đại học. Đại học là 大学; người học đại học là 大学生.',hint:''}}),
  ]},
  {id:'professional-1:v2:transfer',title:'Đổi vai trong một cuộc làm quen mới',layout:'workshop',stage:'transfer',blocks:[
    block('role',{title:'Thông tin mới cho vai của bạn',body:'Bạn đóng vai một sinh viên đại học đang học tiếng Trung. Người bạn mới chưa biết điều đó. Viết hai hoặc ba câu để giới thiệu vai trò, nơi học hoặc nội dung học; kết thúc bằng một câu hỏi về người bạn mới. Không cần dùng thông tin cá nhân thật.'}),
    block('writing',{kind:'activity',title:'Tự tạo lượt nói',body:'Viết lời giới thiệu và câu hỏi của bạn trước khi đối chiếu.',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'role',label:'Nói đúng người học',guidance:'Dùng 大学生 để gọi sinh viên, không dùng 大学 sau 我是.'},{id:'study',label:'Thêm thông tin học tập',guidance:'Dùng 我在大学上学 hoặc 我学习汉语 đúng với thông tin vai.'},{id:'ask',label:'Hỏi lại người đối diện',guidance:'Câu hỏi có thể hỏi trường, vai trò hoặc nội dung học; dùng 吗 chỉ cho câu hỏi đúng/sai.'}],explanation:'Một phương án: 我是大学生。我学习汉语。你学习什么？ (Wǒ shì dàxuéshēng. Wǒ xuéxí Hànyǔ. Nǐ xuéxí shénme?) Tôi là sinh viên đại học. Tôi học tiếng Trung. Bạn học gì? Đây chỉ là một phương án; hãy đối chiếu ý và cấu trúc, không bắt buộc viết giống từng chữ.',hint:'Chọn một câu giới thiệu vai trò, một câu về học tập, rồi hỏi lại.'}}),
  ]},
  {id:'professional-1:v2:wrap',title:'Nhớ ba điều trước khi Thử Luyện',layout:'focus',stage:'transfer',blocks:[
    block('summary',{title:'Tự nhắc mà không nhìn mẫu',body:'1. Trường học và người học khác nhau: 大学 / 大学生.\n2. Vai trò dùng 是; nơi học dùng 在…上学.\n3. Hỏi đúng/sai dùng 吗; câu có 哪个 hoặc 什么 đã có từ hỏi.\nHãy tự nói một lượt giới thiệu ngắn, rồi chuyển sang Thử Luyện. Kết quả tự luyện phía trên không tự có nghĩa là đã thành thạo.'}),
    block('review',{title:'Ôn lại sau bài',body:'Tra các từ của bài trong Tàng Tự Khố khi chưa chắc nghĩa. Các câu Thử Luyện tiếp theo dùng cơ chế ghi kết quả và ôn hiện có. Khi gặp lại từ trong Ký Ức Trận, thử nhớ trước khi mở đáp án; nếu nhầm vai trò với nơi học, quay lại trang “Dùng 是 cho vai trò, 在 cho nơi học”.'}),
  ]},
]};
const errors=validateLessonPages(document);if(errors.length)throw new Error(errors.join('\n'));
const studioContent = {
  targetLessonId:lesson.id,titleZh:lesson.chineseTitle,objectiveVi:lesson.objective,
  conceptVi:'Phân biệt nơi học (学校、小学、中学、大学), người học (学生、小学生、中学生、大学生) và hoạt động 上学.',
  ruleVi:'Dùng 我是 + vai trò để nói mình là ai; dùng 我在 + nơi học + 上学 để nói học ở đâu. Hỏi trường bằng 你在哪个学校上学？; hỏi đúng/sai bằng 你是大学生吗？',
  pitfallVi:'Không dùng 我是大学 để giới thiệu sinh viên. Câu có 哪个 hoặc 什么 trong mẫu đang học không thêm 吗. 学生 gọi người học nói chung, không tự xác định cấp học.',
  checkpointVi:'Không nhìn mẫu: đóng vai một sinh viên học tiếng Trung, giới thiệu vai trò và nội dung học rồi hỏi lại người bạn mới.',
  prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,
  dialogue:rich.dialogue,
  grammar:[
    {pattern:'我是 + 身份 / 我在 + 学校 + 上学',explanationVi:'是 giới thiệu vai trò; 在 + nơi học đặt trước 上学. 大学 là trường; 大学生 là sinh viên.'},
    {pattern:'你在哪个学校上学？ / 你是大学生吗？',explanationVi:'哪个 hỏi trường nào; 吗 hỏi xác nhận đúng/sai. Không thêm 吗 vào câu đã dùng 哪个 để hỏi trong bài này.'},
  ],
  exercises:[
    {promptVi:'Bạn là sinh viên đại học. Chọn câu giới thiệu đúng vai trò.',answer:'我是大学生。',answerPinyin:'Wǒ shì dàxuéshēng.',answerMeaningVi:'Tôi là sinh viên đại học.',distractors:['我是大学。','我是小学生。'],explanationVi:'大学生 là sinh viên; 大学 là trường; 小学生 là học sinh tiểu học, không đúng vai được giao.'},
    {promptVi:'Nói rằng bạn học ở trường trung học.',answer:'我在中学上学。',answerPinyin:'Wǒ zài zhōngxué shàngxué.',answerMeaningVi:'Tôi học ở trường trung học.',distractors:['我是中学上学。','我在大学上学。'],explanationVi:'Dùng 在 + nơi học + 上学. 是 không thay 在 trong cấu trúc này; 大学 đổi nơi học thành đại học.'},
    {promptVi:'Bạn chưa biết người bạn mới học ở trường nào. Chọn câu hỏi để biết trường.',answer:'你在哪个学校上学？',answerPinyin:'Nǐ zài nǎ ge xuéxiào shàngxué?',answerMeaningVi:'Bạn học ở trường nào?',distractors:['你是大学生吗？','你学习什么？'],explanationVi:'哪个学校 hỏi trường nào. Hai câu còn lại hỏi vai trò hoặc nội dung học, chưa trả lời câu hỏi về trường.'},
  ],
  lessonPages:document,
  sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[lesson.id],
  sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:rich.topics.map(t=>t.id),
  review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}},
};
const artifact={schemaVersion:1,status:'authored-draft-not-published',humanReviewed:false,lessonId:lesson.id,title:lesson.title,objective:lesson.objective,source:{wordIds:lesson.wordIds,prerequisiteIds:lesson.prerequisiteIds,grammarIds:rich.grammar.map(g=>g.id),taskIds:rich.tasks.map(t=>t.id),topicIds:rich.topics.map(t=>t.id)},editorialNotes:{scope:'Trường học/cấp học/vai trò, 是 so với 在, hỏi tiếp và nội dung đang học',visual:'Sơ đồ đối chiếu trường/người nguyên bản, ảnh campus là cảnh trang trí dùng chung; không dùng làm đáp án.',remaining:'Cần năm pass nội dung, kiểm prerequisite/word coverage, nhập Xưởng và local release trước khi gọi là bài đã nâng cấp.'},lessonPages:document,studioContent};
writeFileSync(new URL('../../content/drafts/thien-lo-professional-1-v2.json',import.meta.url),JSON.stringify(artifact,null,2)+'\n');
console.log(JSON.stringify({lessonId:lesson.id,pages:document.pages.length,blocks:document.pages.reduce((n,p)=>n+p.blocks.length,0),status:artifact.status}));
