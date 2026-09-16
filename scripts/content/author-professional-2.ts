import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
const lesson=LESSON_BY_ID.get('professional-2')!;
const rich=getRichLessonContent(lesson.id)!;
const b=(id:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`professional-2:v2:block:${id}`),...fields});
const ex=(id:string,title:string,hanzi:string,pinyin:string,meaningVi:string)=>b(id,{kind:'dialogue',title,hanzi,pinyin,meaningVi});
const dialogue=[
  {speaker:'Bạn A',hanzi:'他是你的老师吗？',pinyin:'Tā shì nǐ de lǎoshī ma?',meaningVi:'Anh ấy là giáo viên của bạn phải không?'},
  {speaker:'Bạn B',hanzi:'不是，他是我的同学。',pinyin:'Bú shì, tā shì wǒ de tóngxué.',meaningVi:'Không, anh ấy là bạn học của tôi.'},
  {speaker:'Bạn A',hanzi:'你们学习汉语吗？',pinyin:'Nǐmen xuéxí Hànyǔ ma?',meaningVi:'Các bạn học tiếng Trung phải không?'},
  {speaker:'Bạn B',hanzi:'是，我们学习汉语，也学习写汉字。',pinyin:'Shì, wǒmen xuéxí Hànyǔ, yě xuéxí xiě Hànzì.',meaningVi:'Đúng, chúng tôi học tiếng Trung, cũng học viết chữ Hán.'},
];
const pages:LessonPageDocument={version:1,art:'campus',pages:[
  {id:'professional-2:v2:mission',title:'Giới thiệu đúng người, nói đúng nội dung học',layout:'scene',stage:'context',blocks:[
    b('mission',{title:'Sau giờ học đầu tiên',body:'Một người bạn mới nhầm bạn học của bạn là giáo viên. Bạn cần sửa lại thông tin và nói lớp mình học gì. Bài này giúp phân biệt người, ngôn ngữ, chữ viết và tên quốc gia; không dùng những từ gần hình thức thay thế lẫn nhau.'}),
    b('support',{title:'Từ hỗ trợ cho tình huống',body:'他 (tā) — anh ấy; 的 (de) — của; 我们 (wǒmen) — chúng tôi/chúng ta; 你们 (nǐmen) — các bạn; 也 (yě) — cũng; 写 (xiě) — viết. 学习 (xuéxí) — học đã được giới thiệu ở bài trước. Có thể quay lại đây khi đọc hội thoại.'}),
  ]},
  {id:'professional-2:v2:talk',title:'Nghe lời đính chính trong lớp',layout:'dialogue',stage:'context',blocks:dialogue.map((turn,i)=>b(`turn-${i}`,{kind:'dialogue',title:turn.speaker,...turn}))},
  {id:'professional-2:v2:people',title:'Giáo viên và bạn học',layout:'split',stage:'understand',blocks:[
    ex('teacher','Vai trò giảng dạy','他是我的老师。','Tā shì wǒ de lǎoshī.','Anh ấy là giáo viên của tôi.'),
    ex('classmate','Quan hệ cùng học','她是我的同学。','Tā shì wǒ de tóngxué.','Cô ấy là bạn học của tôi.'),
    b('person-rule',{title:'Nói quan hệ với mình',body:'我 + 的 + 老师/同学: giáo viên/bạn học của tôi. 同学 không chỉ có nghĩa “người đang học”: nó chỉ quan hệ bạn học, hoặc cách gọi học sinh trong một số tình huống. Ở bài này dùng nghĩa bạn học. 她 (tā) là cô ấy; 他 và 她 phát âm giống nhau nhưng chữ khác.'}),
    b('repair',{kind:'activity',title:'Sửa lời giới thiệu nhầm',body:'Người được nhắc đến là bạn học, không phải giáo viên của bạn. Chọn lời đính chính.',activity:{...emptyLessonActivity(),options:[{id:'right',text:'他不是我的老师，他是我的同学。',feedback:'Đúng: phủ định vai trò bị nhầm và nêu lại quan hệ bạn học.'},{id:'wrong',text:'他是我的老师，他不是我的同学。',feedback:'Câu này khẳng định điều đang bị nhầm và phủ định quan hệ thật.'}],answerIds:['right'],explanation:'不是 (bú shì) phủ định 是. Trật tự: 他 + 不是 + 我的老师；他 + 是 + 我的同学。',hint:''}}),
  ]},
  {id:'professional-2:v2:categories',title:'Quốc gia, ngôn ngữ và chữ viết',layout:'focus',stage:'understand',blocks:[
    b('map',{kind:'diagram',title:'Đặt từ vào đúng nhóm nghĩa',diagram:{type:'comparison',description:'中国 gọi quốc gia; 汉语/中文 có thể gọi tiếng Trung; 汉字 gọi chữ Hán, còn 字 là chữ nói chung. Không gán 中文 chỉ cho chữ viết hoặc 汉语 chỉ cho lời nói.',nodes:[
      {id:'country',label:'中国',pinyin:'Zhōngguó',meaningVi:'Trung Quốc',note:'Tên quốc gia. 中国人 là người Trung Quốc.',x:0,y:0},
      {id:'language',label:'汉语 / 中文',pinyin:'Hànyǔ / Zhōngwén',meaningVi:'tiếng Trung',note:'Trong 我学习… có thể dùng cả hai.',x:1,y:0},
      {id:'character',label:'汉字 / 字',pinyin:'Hànzì / zì',meaningVi:'chữ Hán / chữ',note:'汉字 cụ thể hơn 字; không phải tên quốc gia.',x:2,y:0},
    ]}}),
    ex('country','Thêm 人 để nói quốc tịch','他是中国人。','Tā shì Zhōngguó rén.','Anh ấy là người Trung Quốc.'),
    ex('written-char','Nhận diện một chữ','这个汉字是“人”。','Zhè ge Hànzì shì “rén”.','Chữ Hán này là chữ “人” (người).'),
    b('char-support',{title:'Đọc mẫu mà không đoán từ mới',body:'这 (zhè) — này; 个 (ge) — lượng từ; 这个汉字 là “chữ Hán này”. 人 (rén) — người. 字 có thể gọi một chữ: 一个字 (yí ge zì). Ở đây học ý nghĩa và cách ghép; không bắt buộc viết nét chữ nếu chưa có hướng dẫn nét phù hợp.'}),
  ]},
  {id:'professional-2:v2:language',title:'Nói mình học gì',layout:'focus',stage:'understand',blocks:[
    ex('learn-hanyu','Hai cách gọi ngôn ngữ','我学习汉语。','Wǒ xuéxí Hànyǔ.','Tôi học tiếng Trung.'),
    ex('learn-zhongwen','Cũng đúng trong mẫu này','我学习中文。','Wǒ xuéxí Zhōngwén.','Tôi học tiếng Trung.'),
    ex('write-character','Cụ thể hơn về hoạt động','我学习写汉字。','Wǒ xuéxí xiě Hànzì.','Tôi học viết chữ Hán.'),
    b('not-country',{title:'Đừng bỏ mất chữ làm đổi nghĩa',body:'Trong “tôi học tiếng Trung”, dùng 汉语 hoặc 中文. 我学习中国 không diễn đạt cùng ý, vì 中国 là tên quốc gia. 学习汉字 nói học chữ Hán; thêm 写 nói rõ học viết. Không cần coi 汉语 và 中文 khác nhau tuyệt đối: ở những ngữ cảnh khác cần đọc cả câu.'}),
  ]},
  {id:'professional-2:v2:practice',title:'Tự chọn và ghép câu',layout:'workshop',stage:'practice',blocks:[
    b('choose',{kind:'activity',title:'Phân biệt bằng điều muốn nói',body:'Bạn muốn nói mình đang học viết chữ Hán. Chọn câu rõ đúng ý đó.',activity:{...emptyLessonActivity(),options:[{id:'country',text:'我学习中国。',feedback:'中国 là quốc gia, không phải chữ Hán.'},{id:'writing',text:'我学习写汉字。',feedback:'Đúng. 写汉字 chỉ hoạt động viết chữ Hán.'},{id:'person',text:'我是中国人。',feedback:'Câu này nói quốc tịch, không nói hoạt động học viết.'}],answerIds:['writing'],explanation:'Chọn từ theo nghĩa, không chỉ nhìn chữ 中/汉. 写 là viết; 汉字 là chữ Hán.',hint:''}}),
    b('order',{kind:'activity',title:'Giới thiệu bạn học',body:'Sắp xếp thành “Cô ấy là bạn học của tôi”.',activity:{...emptyLessonActivity(),type:'order',options:[{id:'mate',text:'同学',feedback:''},{id:'she',text:'她',feedback:''},{id:'my',text:'我的',feedback:''},{id:'be',text:'是',feedback:''}],answerIds:['she','be','my','mate'],explanation:'她是我的同学。Tā shì wǒ de tóngxué. 我的 đặt ngay trước 同学.',hint:'Người được giới thiệu + 是 + quan hệ.'}}),
    b('recall',{kind:'activity',title:'Tự nhớ một tên ngôn ngữ',body:'Điền một từ có nghĩa “tiếng Trung”: 我学习___。',activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:['汉语','中文'],explanation:'Cả 汉语 (Hànyǔ) và 中文 (Zhōngwén) đều phù hợp. 中国 là quốc gia; 汉字 là chữ Hán, không khớp ý “tiếng Trung” của yêu cầu.',hint:''}}),
  ]},
  {id:'professional-2:v2:transfer',title:'Đính chính trong buổi làm quen mới',layout:'workshop',stage:'transfer',blocks:[
    b('new-info',{title:'Thông tin dành cho vai của bạn',body:'Trong một buổi sinh hoạt học tiếng Trung, một người nhầm cô gái đi cùng bạn là giáo viên của bạn. Thực ra cô ấy là bạn học. Hãy sửa thông tin và nói bạn học tiếng Trung, đồng thời học viết chữ Hán. Không cần dùng thông tin cá nhân thật.'}),
    b('produce',{kind:'activity',title:'Viết hai hoặc ba câu',body:'Tự viết trước khi mở tiêu chí. Có thể mở lại từ hỗ trợ nếu cần.',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'fix',label:'Phủ định thông tin bị nhầm',guidance:'Dùng 她不是我的老师 để nói cô ấy không phải giáo viên của bạn.'},{id:'person',label:'Nêu đúng quan hệ',guidance:'她是我的同学 nói cô ấy là bạn học của bạn.'},{id:'learn',label:'Nói đúng nội dung học',guidance:'我学习汉语/中文 và 我学习写汉字. Có thể nối ý bằng 也 đứng trước 学习.'}],explanation:'Một phương án: 她不是我的老师，她是我的同学。我学习汉语，也学习写汉字。Tā bú shì wǒ de lǎoshī, tā shì wǒ de tóngxué. Wǒ xuéxí Hànyǔ, yě xuéxí xiě Hànzì. Cô ấy không phải giáo viên của tôi, cô ấy là bạn học. Tôi học tiếng Trung, cũng học viết chữ Hán. Cách diễn đạt khác giữ đúng thông tin vẫn được; đây là tự đối chiếu, chưa phải chấm nói/viết độc lập.',hint:''}}),
  ]},
  {id:'professional-2:v2:recap',title:'Kiểm ý trước khi dùng từ',layout:'focus',stage:'transfer',blocks:[b('recap',{title:'Ba câu hỏi tự kiểm',body:'Đang nói người nào? 老师 hay 同学.\nĐang nói quốc gia, ngôn ngữ hay chữ? 中国 / 汉语、中文 / 汉字、字.\nĐang giới thiệu vai trò hay hoạt động? 是 + người/vai trò; 学习 + nội dung học.\nNếu còn nhầm, quay lại bảng nhóm nghĩa rồi tự đổi câu sang một người khác. Tra từ trong bài hoặc tiếp tục Thử Luyện; việc đọc đủ trang không tự chứng minh thành thạo.'})]},
]};
const studioContent={targetLessonId:lesson.id,titleZh:lesson.chineseTitle,objectiveVi:lesson.objective,conceptVi:'Phân biệt giáo viên/bạn học, quốc gia/ngôn ngữ/chữ viết; dùng từ đúng nội dung muốn nói.',ruleVi:'他/她 + 是/不是 + 我的老师/同学. 我学习 + 汉语/中文; 我学习写汉字 nói rõ học viết chữ.',pitfallVi:'中国 không thay 汉语/中文 để nói ngôn ngữ. 中文 không chỉ dùng cho chữ viết. 汉字 cụ thể hơn 字. 同学 không mặc định là giáo viên.',checkpointVi:'Đính chính cô gái đi cùng là bạn học, không phải giáo viên; nói mình học tiếng Trung và viết chữ Hán.',prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:[
  {pattern:'他/她 + 是/不是 + 我的 + 老师/同学',explanationVi:'是 khẳng định quan hệ, 不是 phủ định; 我的 đặt trước từ chỉ người.',modelExample:{hanzi:'他是我的同学。',pinyin:'Tā shì wǒ de tóngxué.',meaningVi:'Anh ấy là bạn học của tôi.'},guidedPractice:{promptVi:'Nói cô ấy không phải giáo viên của bạn.',modelAnswerHanzi:'她不是我的老师。',modelAnswerPinyin:'Tā bú shì wǒ de lǎoshī.',modelAnswerMeaningVi:'Cô ấy không phải giáo viên của tôi.'}},
  {pattern:'我学习 + 汉语/中文；我学习写汉字',explanationVi:'Nói nội dung học; 写 thêm hoạt động viết, 汉字 là chữ Hán, không phải quốc gia.',modelExample:{hanzi:'我学习中文。',pinyin:'Wǒ xuéxí Zhōngwén.',meaningVi:'Tôi học tiếng Trung.'},guidedPractice:{promptVi:'Nói mình học viết chữ Hán.',modelAnswerHanzi:'我学习写汉字。',modelAnswerPinyin:'Wǒ xuéxí xiě Hànzì.',modelAnswerMeaningVi:'Tôi học viết chữ Hán.'}},
],exercises:[
  {promptVi:'Nói anh ấy là bạn học của bạn.',answer:'他是我的同学。',answerPinyin:'Tā shì wǒ de tóngxué.',answerMeaningVi:'Anh ấy là bạn học của tôi.',distractors:['他是我的老师。','他不是我的同学。'],explanationVi:'同学 là bạn học; 老师 đổi vai trò, 不是 phủ định quan hệ.'},
  {promptVi:'Nói bạn học viết chữ Hán.',answer:'我学习写汉字。',answerPinyin:'Wǒ xuéxí xiě Hànzì.',answerMeaningVi:'Tôi học viết chữ Hán.',distractors:['我学习中国。','我是中国人。'],explanationVi:'写汉字 là viết chữ Hán. 中国 là quốc gia; 中国人 là người Trung Quốc.'},
],lessonPages:pages,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[lesson.id],sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:rich.topics.map(t=>t.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
const errors=validateLessonPages(pages);if(errors.length)throw new Error(errors.join('\n'));
writeFileSync('content/drafts/thien-lo-professional-2-v2.json',JSON.stringify({schemaVersion:1,lessonId:lesson.id,title:lesson.title,objective:lesson.objective,status:'authored-draft-not-published',humanReviewed:false,source:{wordIds:lesson.wordIds,prerequisiteIds:lesson.prerequisiteIds},lessonPages:pages,studioContent},null,2)+'\n');
console.log({lessonId:lesson.id,pages:pages.pages.length,status:'draft'});
