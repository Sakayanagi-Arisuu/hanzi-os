import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID,WORD_BY_ID} from '../../src/data/curriculum';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';

const lesson=LESSON_BY_ID.get('boot-1')!;
const block=(id:string,value:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`boot-1:v2:block:${id}`),...value});
const example=(id:string,title:string,hanzi:string,pinyin:string,meaningVi:string)=>block(id,{kind:'dialogue',title,hanzi,pinyin,meaningVi});
const tones=[
  {hanzi:'妈',pinyin:'mā',meaningVi:'mẹ',path:'→ 55',rule:'Bắt đầu cao, giữ ngang và đều.'},
  {hanzi:'麻',pinyin:'má',meaningVi:'cây gai',path:'↗ 35',rule:'Bắt đầu vừa, đi lên rõ.'},
  {hanzi:'马',pinyin:'mǎ',meaningVi:'ngựa',path:'↘↗ 214',rule:'Khi đọc riêng: hạ xuống thấp rồi nhấc lên. Trong lời nói liền thường chỉ giữ phần thấp.'},
  {hanzi:'骂',pinyin:'mà',meaningVi:'mắng',path:'↘ 51',rule:'Bắt đầu cao, rơi nhanh và dứt khoát.'},
];
const choice=(id:string,title:string,body:string,options:Array<[string,string]>,answer:number,explanation:string)=>block(id,{kind:'activity',title,body,activity:{...emptyLessonActivity(),options:options.map(([text,feedback],i)=>({id:`answer-${i}`,text,feedback})),answerIds:[`answer-${answer}`],explanation,hint:''}});
const objective='Nhận ra bốn hướng thanh điệu, phân biệt dấu Pinyin và thử đọc theo hướng giọng; biết thanh nhẹ không phải thanh thứ năm.';
const pages:LessonPageDocument={version:1,art:'sound',pages:[
  {id:'boot-1:v2:mission',title:'Một âm, bốn đường giọng',layout:'scene',stage:'context',blocks:[
    block('mission',{title:'Nghe đường giọng trước, nhớ số thanh sau',body:'Cùng âm “ma”, đổi cao độ sẽ đổi từ và nghĩa. Bạn sẽ nhìn đường giọng, nghe mẫu từng âm rồi nhận diện một âm khác. Chưa cần thuộc cách viết các chữ ví dụ.'}),
    block('access',{title:'Học bằng mắt và tai',body:'Dùng nút nghe nếu thiết bị hỗ trợ. Âm mẫu là giọng tổng hợp; nếu không nghe được, theo mũi tên và dấu Pinyin để tiếp tục. Tự đọc không được hệ thống chấm thành điểm phát âm.'}),
  ]},
  {id:'boot-1:v2:map',title:'Bản đồ bốn thanh',layout:'focus',stage:'understand',blocks:[
    block('tone-map',{kind:'diagram',title:'Cao độ tương đối, không phải nốt nhạc',diagram:{type:'comparison',description:'1 là thấp nhất, 5 là cao nhất trong quãng giọng thoải mái của bạn. Các số 55, 35, 214, 51 mô tả hướng đi; không cần bắt chước cao độ tuyệt đối của người đọc.',nodes:tones.map((t,i)=>({id:`tone-${i+1}`,label:`${i+1} · ${t.path}`,pinyin:t.pinyin,meaningVi:`${t.hanzi} — ${t.meaningVi}`,note:t.rule,x:i,y:0}))}}),
  ]},
  {id:'boot-1:v2:level-rise',title:'Giữ ngang hay đi lên?',layout:'split',stage:'understand',blocks:[
    example('tone-1','Thanh 1 · giữ tay ngang','妈','mā','mẹ'),
    example('tone-2','Thanh 2 · đưa tay lên','麻','má','cây gai'),
    block('contrast-12',{title:'Nghe điểm kết thúc',body:'Thanh 1 bắt đầu cao và kết thúc cao, gần như không đổi. Thanh 2 bắt đầu vừa rồi lên cao. Nghe mỗi mẫu, vẽ một đường bằng tay rồi đọc lại; không tăng âm lượng để thay cho tăng cao độ.'}),
  ]},
  {id:'boot-1:v2:low-fall',title:'Hạ thấp hay rơi từ trên cao?',layout:'split',stage:'understand',blocks:[
    example('tone-3','Thanh 3 · tìm phần thấp','马','mǎ','ngựa'),
    example('tone-4','Thanh 4 · rơi dứt khoát','骂','mà','mắng'),
    block('contrast-34',{title:'Điểm xuất phát khác nhau',body:'Thanh 3 đọc riêng có đường xuống thấp rồi nhấc lên. Khi nói liền thường không nhấc đầy đủ; đừng ép mọi âm thanh 3 thành một đường uốn dài. Thanh 4 bắt đầu cao rồi rơi nhanh. Không cần gằn giọng hay hét.'}),
  ]},
  {id:'boot-1:v2:recognize',title:'Nhìn hướng, gọi đúng thanh',layout:'focus',stage:'practice',blocks:[
    choice('fall-check','Tự nhận diện','Đường giọng bắt đầu cao rồi rơi nhanh là thanh nào?',[
      ['Thanh 1','Thanh 1 giữ cao và ngang; không rơi.'],['Thanh 2','Thanh 2 đi lên từ mức vừa.'],['Thanh 3','Thanh 3 chú trọng phần thấp, không bắt đầu cao rồi rơi dứt khoát.'],['Thanh 4','Đúng. Thanh 4 đi từ cao xuống thấp.'],
    ],3,'Thanh 4: 51, cao → thấp. Hãy đối chiếu mà với mǎ ở trang trước nếu còn nhầm.'),
    choice('rise-check','Đổi sang một hướng khác','Đường đi từ mức vừa lên cao là thanh nào?',[
      ['Thanh 2','Đúng: 35, từ vừa lên cao.'],['Thanh 4','Thanh 4 rơi xuống, ngược hướng cần tìm.'],['Thanh 1','Thanh 1 giữ ngang; không đi lên.'],
    ],0,'Nhận diện dựa vào hướng giọng, không dựa vào nghĩa của chữ ví dụ.'),
  ]},
  {id:'boot-1:v2:neutral',title:'Thanh nhẹ: ngắn, nhẹ, tùy âm trước',layout:'split',stage:'understand',blocks:[
    example('mother','Hai âm trong một từ','妈妈','māma','mẹ'),
    block('neutral',{title:'Âm ma thứ hai không có dấu thanh',body:'Trong 妈妈, âm thứ hai thường đọc ngắn và nhẹ hơn. Thanh nhẹ không có một đường cao độ cố định riêng, mà phụ thuộc âm đứng trước. Không gọi đây là thanh 5 và không tự thêm dấu vào mọi âm không dấu.'}),
    block('listening',{title:'Nghe lại rồi thử nhắc',body:'Nghe 妈妈. Chú ý âm đầu rõ, âm sau nhẹ. Nếu giọng tổng hợp chưa thể hiện rõ, dựa vào Pinyin māma; bài này không dùng chất lượng giọng máy để kết luận bạn nghe sai.'}),
  ]},
  ...lesson.wordIds.map((id,i)=>{
    const w=WORD_BY_ID.get(id)!;
    return {id:`boot-1:v2:word-${i}`,title:`Gắn dấu với từ: ${w.simplified}`,layout:'split' as const,stage:'understand' as const,blocks:[
      example(`word-${i}`,'Từ trong bài',w.simplified,w.pinyin,w.meaning),
      block(`word-note-${i}`,{title:'Nhìn từng âm tiết',body:`Đọc Pinyin ${w.pinyin}, gọi hướng giọng theo từng dấu. Nghe mẫu và thử đọc lại. Nghĩa của từ là “${w.meaning}”; bạn chưa cần viết thuộc chữ để hiểu thanh điệu.`}),
    ]};
  }),
  {id:'boot-1:v2:transfer',title:'Đổi âm mà giữ hướng thanh',layout:'workshop',stage:'transfer',blocks:[
    example('new-syllable','Một âm mới để đối chiếu','大','dà','to; lớn'),
    choice('transfer-check','Nhận diện trên âm mới','Dấu trong dà yêu cầu hướng giọng nào?',[
      ['Cao rồi rơi xuống','Đúng: dấu huyền trong Pinyin là thanh 4.'],['Giữ ngang cao','Đó là thanh 1, thường mang dấu ngang.'],['Từ vừa đi lên','Đó là thanh 2, thường mang dấu sắc.'],
    ],0,'Dấu thanh vẫn chỉ cùng hướng giọng dù ma đổi thành da. Không dùng quy tắc thanh điệu tiếng Việt để thay thế Pinyin.'),
    block('self-read',{kind:'activity',title:'Tự đọc rồi tự đối chiếu',body:'Thử đọc mā → má → mǎ → mà, rồi dà. Có thể ghi chú bằng tiếng Việt về cặp dễ nhầm. Không cần microphone.',activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'direction',label:'Giữ đúng hướng',guidance:'Thanh 1 ngang, thanh 2 lên, thanh 3 thấp, thanh 4 rơi.'},{id:'comfort',label:'Không ép giọng',guidance:'Dùng quãng giọng thoải mái; không gằn giọng hoặc hét.'},{id:'transfer',label:'Đổi âm vẫn đọc theo dấu',guidance:'mà và dà đều đi từ cao xuống thấp, dù phụ âm và nghĩa khác nhau.'}],explanation:'Đây là tự đối chiếu, chưa chứng minh phát âm đúng. Nếu chưa chắc một cặp, nghe và xem lại cặp đó trước khi làm Thử Luyện.',hint:''}}),
  ]},
  {id:'boot-1:v2:recap',title:'Mang bốn hướng vào Thử Luyện',layout:'focus',stage:'transfer',blocks:[
    block('recap',{title:'Nhớ hướng thay vì chỉ nhớ số',body:'mā: ngang cao · má: đi lên · mǎ: xuống thấp (đọc riêng có nhấc lên) · mà: rơi nhanh.\nThanh nhẹ ngắn, nhẹ, tùy âm trước; không phải thanh thứ năm.\nThử Luyện kiểm các câu cụ thể bằng đường ghi kết quả hiện có. Xem hết trang hay tự tích rubric không có nghĩa đã thành thạo phát âm.'}),
  ]},
]};
const grammar=[{pattern:'mā / má / mǎ / mà',explanationVi:'Giữ nguyên phụ âm và vần, thay thanh điệu sẽ thay từ và nghĩa. Cao độ là tương đối trong quãng giọng người nói.',modelExample:{hanzi:'妈',pinyin:'mā',meaningVi:'mẹ'},guidedPractice:{promptVi:'Chọn âm ma có hướng cao rồi rơi nhanh.',modelAnswerHanzi:'骂',modelAnswerPinyin:'mà',modelAnswerMeaningVi:'mắng'}}];
const studioContent={targetLessonId:lesson.id,titleZh:lesson.chineseTitle,objectiveVi:objective,conceptVi:'Bốn thanh khác hướng giọng; thanh nhẹ không có cao độ cố định độc lập.',ruleVi:'Thanh 1 ngang cao; thanh 2 đi lên; thanh 3 có phần thấp; thanh 4 rơi từ cao xuống thấp.',pitfallVi:'Không đồng nhất Pinyin với thanh tiếng Việt. Không ép thanh 3 luôn xuống rồi lên đầy đủ trong lời nói liền.',checkpointVi:'Phân biệt bốn đường thanh, rồi nhận ra thanh 4 trên âm dà.',prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue:tones.map((t,i)=>({speaker:`Âm mẫu thanh ${i+1}`,hanzi:t.hanzi,pinyin:t.pinyin,meaningVi:t.meaningVi})),grammar,exercises:[{promptVi:'Chọn âm ma có hướng cao rồi rơi nhanh.',answer:'mà',answerPinyin:'mà',answerMeaningVi:'mắng',distractors:['mā','má','mǎ'],explanationVi:'Thanh 4: cao rồi rơi nhanh. Các phương án còn lại lần lượt là ngang, lên và thấp.'},{promptVi:'Chọn âm ma có hướng từ vừa đi lên.',answer:'má',answerPinyin:'má',answerMeaningVi:'cây gai',distractors:['mā','mà'],explanationVi:'Thanh 2 đi lên; thanh 1 ngang, thanh 4 đi xuống.'}],lessonPages:pages,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[lesson.id],review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
const errors=validateLessonPages(pages);if(errors.length)throw new Error(errors.join('\n'));
writeFileSync('content/drafts/thien-lo-boot-1-v2.json',JSON.stringify({schemaVersion:1,lessonId:lesson.id,title:lesson.title,objective,status:'authored-draft-not-published',humanReviewed:false,source:{wordIds:lesson.wordIds,prerequisiteIds:lesson.prerequisiteIds},lessonPages:pages,studioContent},null,2)+'\n');
console.log({lessonId:lesson.id,pages:pages.pages.length,status:'draft'});
