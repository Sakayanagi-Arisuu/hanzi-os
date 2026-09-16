import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
const lesson=LESSON_BY_ID.get('boot-2')!;
const block=(id:string,value:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`boot-2:v2:${id}`),...value});
const example=(id:string,title:string,hanzi:string,pinyin:string,meaningVi:string)=>block(id,{kind:'dialogue',title,hanzi,pinyin,meaningVi});
const dialogue=[
  {speaker:'Bạn A',hanzi:'你好！',pinyin:'Nǐ hǎo!',meaningVi:'Xin chào!'},
  {speaker:'Bạn B',hanzi:'你好！',pinyin:'Nǐ hǎo!',meaningVi:'Xin chào!'},
];
const objective='Chào và đáp lời chào với một người; phân biệt 我 (tôi) và 你 (bạn), nhận ra 好 trong lời chào và lời hỏi thăm.';
const pages:LessonPageDocument={version:1,art:'campus',pages:[
  {id:'boot-2:v2:meet',title:'Gặp bạn mới trước giờ học',layout:'scene',stage:'context',blocks:[
    block('mission',{title:'Một việc nhỏ bạn sẽ làm được',body:'Một người bạn mới bước đến trước giờ học. Bạn sẽ mở lời chào và đáp lại lời chào. Chưa cần giới thiệu tên hay nhớ một đoạn hội thoại dài. Tranh minh họa bối cảnh; đáp án nằm trong lời nói, không nằm trong tranh.'}),
    example('first-greeting','Câu đầu tiên','你好！','Nǐ hǎo!','Xin chào!'),
    block('access',{title:'Đọc hoặc nghe theo cách phù hợp',body:'Có thể đọc Hán tự, Pinyin và nghĩa cùng lúc. Nút nghe dùng giọng tổng hợp của trình duyệt; nếu thiết bị không phát được âm, tiếp tục bằng chữ. Bài này chưa chấm khả năng phát âm của bạn.'}),
  ]},
  {id:'boot-2:v2:exchange',title:'Lời chào có hai lượt',layout:'dialogue',stage:'context',blocks:dialogue.map((turn,index)=>block(`turn-${index}`,{kind:'dialogue',title:turn.speaker,...turn}))},
  {id:'boot-2:v2:people',title:'Ai là “tôi”, ai là “bạn”?',layout:'focus',stage:'understand',blocks:[
    block('roles',{kind:'diagram',title:'Đổi người nói thì đổi điểm nhìn',diagram:{type:'comparison',description:'我 chỉ người đang nói; 你 chỉ người được nói trực tiếp với. Khi đổi lượt, cùng một người có thể được gọi bằng từ khác. Không gắn 我 cố định với Bạn A.',nodes:[
      {id:'a',label:'A nói: 我 / 你',pinyin:'wǒ / nǐ',meaningVi:'tôi / bạn',note:'我 là A; 你 là B.',x:0,y:0},
      {id:'b',label:'B nói: 我 / 你',pinyin:'wǒ / nǐ',meaningVi:'tôi / bạn',note:'我 là B; 你 là A.',x:1,y:0},
    ]}}),
    block('role-check',{kind:'activity',title:'Theo người đang nói',body:'B đang nói trực tiếp với A. B dùng từ nào để chỉ A?',activity:{...emptyLessonActivity(),options:[{id:'you',text:'你 · nǐ · bạn',feedback:'Đúng. A là người B đang nói với nên B gọi A là 你.'},{id:'me',text:'我 · wǒ · tôi',feedback:'我 sẽ chỉ B, vì B đang nói. Câu hỏi cần chỉ A.'}],answerIds:['you'],explanation:'我 đổi theo người nói; 你 đổi theo người nghe trực tiếp. Đây là nhận diện điểm nhìn, chưa phải kiểm tra tự nhớ chữ.',hint:''}}),
  ]},
  {id:'boot-2:v2:greeting',title:'Hiểu cả cụm, không ghép máy móc',layout:'split',stage:'understand',blocks:[
    example('good','好 trong một từ','好','hǎo','tốt; ổn'),
    example('hello','你好 là lời chào','你好！','Nǐ hǎo!','Xin chào!'),
    block('meaning',{title:'Không dịch từng chữ thành “bạn tốt”',body:'Trong tình huống gặp nhau, 你好 là một lời chào. 好 có nghĩa tốt/ổn, nhưng cả cụm được dùng để chào người đối diện. 我好 không thay được 你好 để chào.'}),
    block('tones',{title:'Điểm nối với bài bốn thanh',body:'Dạng Pinyin từ điển viết nǐ hǎo, cả hai âm có thanh 3. Khi nói liền, âm 你 thường đọc với đường đi lên gần thanh 2 trước thanh 3 của 好. Vẫn viết nǐ hǎo; bài Cặp thanh điệu sẽ luyện kỹ hơn. Không cần cố uốn cả hai âm xuống rồi lên đầy đủ.'}),
  ]},
  {id:'boot-2:v2:respond',title:'Chọn lời đáp phù hợp',layout:'focus',stage:'practice',blocks:[
    block('reply',{kind:'activity',title:'Một người chào bạn: 你好！',body:'Chọn lời đáp chào lại.',activity:{...emptyLessonActivity(),options:[{id:'hello',text:'你好！',feedback:'Đúng. Có thể đáp bằng cùng lời chào 你好.'},{id:'me-good',text:'我好！',feedback:'我好 không phải lời chào đáp lại trong tình huống này. Dùng 你好.'},{id:'reverse',text:'好你！',feedback:'Không đảo hai chữ. Lời chào cố định ở đây là 你好.'}],answerIds:['hello'],explanation:'Chào và đáp lời chào có thể dùng cùng cụm 你好！ Đừng thay 你 bằng 我 chỉ vì đến lượt mình nói.',hint:'Nhớ lời chào trọn cụm.'}}),
    block('assemble',{kind:'activity',title:'Tự xếp lời chào',body:'Xếp hai chữ thành lời chào một người.',activity:{...emptyLessonActivity(),type:'order',options:[{id:'good',text:'好',feedback:''},{id:'you',text:'你',feedback:''}],answerIds:['you','good'],explanation:'你好！ Nǐ hǎo! Đặt 你 trước 好. Có thể thêm dấu chấm than khi viết, không phải thêm một từ.',hint:''}}),
  ]},
  {id:'boot-2:v2:ask',title:'Nhận ra lời hỏi thăm',layout:'focus',stage:'understand',blocks:[
    block('extension',{title:'Một mở rộng có hỗ trợ',body:'吗 (ma) đặt cuối câu để tạo câu hỏi đúng/sai; 很 (hěn) đứng trước 好 trong câu trả lời thông dụng bên dưới. Ở đây 很好 có thể hiểu tự nhiên là “khỏe/ổn”, không nhất thiết nhấn mạnh “rất”. Hai từ này được giới thiệu để bạn hiểu mẫu, chưa yêu cầu nhớ độc lập.'}),
    example('how','Hỏi thăm','你好吗？','Nǐ hǎo ma?','Bạn khỏe không?'),
    example('fine','Đáp lời hỏi thăm','我很好。','Wǒ hěn hǎo.','Tôi khỏe/ổn.'),
    block('usage',{title:'Phân biệt chào với hỏi tình trạng',body:'你好！ dùng để chào. 你好吗？ hỏi người đó có khỏe/ổn không; dùng khi thực sự muốn hỏi thăm, không cần thêm vào mọi lần gặp. Với người lạ trong bối cảnh bài này, một lời 你好 là đủ.'}),
  ]},
  {id:'boot-2:v2:transfer',title:'Đổi sang người bạn khác',layout:'workshop',stage:'transfer',blocks:[
    block('new-situation',{title:'Lần này bạn chủ động mở lời',body:'Ở một buổi sinh hoạt mới, bạn gặp một người chưa quen. Viết lời chào ngắn. Sau đó đổi vai: người đó chào trước, bạn viết lời đáp. Không cần dùng tên hay thông tin cá nhân thật.'}),
    block('your-turn',{kind:'activity',title:'Viết hai lượt của bạn',body:'Ghi “Mở lời: …” và “Đáp lại: …”. Nếu chưa nhập được chữ Trung, có thể viết Pinyin rồi mở hướng dẫn để đối chiếu; cách đó là tự luyện có hỗ trợ.',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'open',label:'Chào người đối diện',guidance:'Mở lời bằng 你好！ (Nǐ hǎo!), không dùng 我好.'},{id:'reply',label:'Đáp lại lời chào',guidance:'Có thể đáp 你好！; không đảo chữ thành 好你.'},{id:'viewpoint',label:'Hiểu 你 chỉ ai',guidance:'Ở mỗi lượt, 你 chỉ người bạn đang nói với. 我 chỉ bản thân người đang nói.'}],explanation:'Một phương án: Mở lời: 你好！ Đáp lại: 你好！ Hai lượt giống nhau vẫn đúng. Mục tiêu là dùng đúng trong tình huống mới, không viết dài. Tự đối chiếu không phải điểm nói hoặc điểm nhớ chữ độc lập.',hint:''}}),
  ]},
  {id:'boot-2:v2:recap',title:'Giữ lại một lời chào dùng được',layout:'focus',stage:'transfer',blocks:[
    block('takeaway',{title:'Ba điều cần nhớ',body:'你好！ — chào và đáp lời chào một người.\n我 — người đang nói; 你 — người được nói với.\n好 — tốt/ổn; trong 你好, hiểu cả cụm là lời chào.\nNếu còn đảo chữ hoặc đổi sai đại từ, quay lại trang “Hiểu cả cụm”. Sau đó vào Thử Luyện; hệ thống giữ riêng kết quả bài tập có chấm và việc đọc trang.'}),
  ]},
]};
const grammar=[{pattern:'你好！ / 你好吗？',explanationVi:'你好 dùng chào. Thêm 吗 tạo lời hỏi thăm tình trạng trong mẫu này, không phải bước bắt buộc của mỗi cuộc gặp.',modelExample:{hanzi:'你好！',pinyin:'Nǐ hǎo!',meaningVi:'Xin chào!'},guidedPractice:{promptVi:'Bạn mới chào bạn bằng 你好. Viết lời đáp chào lại.',modelAnswerHanzi:'你好！',modelAnswerPinyin:'Nǐ hǎo!',modelAnswerMeaningVi:'Xin chào!'}}];
const studioContent={targetLessonId:lesson.id,titleZh:lesson.chineseTitle,objectiveVi:objective,conceptVi:'Dùng 你好 để chào và đáp lời chào. 我 chỉ người nói, 你 chỉ người nghe trực tiếp, 好 nghĩa tốt/ổn.',ruleVi:'Giữ thứ tự 你 + 好 trong lời chào. Khi đổi lượt nói, 我 và 你 đổi điểm nhìn; không đổi 你好 thành 我好.',pitfallVi:'Không dịch lời chào thành bạn tốt; không đảo thành 好你. 你好吗 hỏi thăm, không bắt buộc ở mọi lần gặp.',checkpointVi:'Trong một buổi sinh hoạt mới, chủ động chào rồi đổi vai đáp lời chào; giải thích 你 chỉ ai.',prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar,exercises:[
  {promptVi:'Một người bạn mới chào 你好. Chọn lời đáp chào lại.',answer:'你好！',answerPinyin:'Nǐ hǎo!',answerMeaningVi:'Xin chào!',distractors:['我好！','好你！'],explanationVi:'Dùng lại lời chào 你好. 我好 không phải lời chào; 好你 đảo sai thứ tự.'},
  {promptVi:'Bạn đang nói. Từ nào chỉ chính bạn?',answer:'我',answerPinyin:'wǒ',answerMeaningVi:'tôi',distractors:['你','好'],explanationVi:'我 chỉ người nói. 你 chỉ người được nói với. 好 diễn tả tốt/ổn, không chỉ một người.'},
],lessonPages:pages,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[lesson.id],review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
const errors=validateLessonPages(pages);if(errors.length)throw new Error(errors.join('\n'));
writeFileSync('content/drafts/thien-lo-boot-2-v2.json',JSON.stringify({schemaVersion:1,lessonId:lesson.id,title:lesson.title,objective,status:'authored-draft-not-published',humanReviewed:false,source:{wordIds:lesson.wordIds,prerequisiteIds:lesson.prerequisiteIds},lessonPages:pages,studioContent},null,2)+'\n');
console.log({lessonId:lesson.id,pages:pages.pages.length,status:'draft'});
