import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import {grammarManuscripts as manuscripts} from './grammar-batch-manuscripts';
import {buildGrammarPages} from './build-grammar-pages';
import {grammarDecisions} from './hsk2-grammar-decisions';
import {grammarWordExamples} from './hsk2-grammar-word-examples';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const readings:[string,string][]=[
 ['Tā zhèngzài děng péngyou, péngyou kěnéng chídào.','Đang đợi bạn, bạn có thể muộn.'],
 ['Mén kāizhe, ménkǒu zhànzhe sān wèi lǎoshī.','Cửa mở, ba giáo viên đứng ở cửa.'],
 ['Yīnwèi xiàyǔ, suǒyǐ méi chūqù; suīrán lèi, dànshì hái xiǎng kàn shū.','Vì mưa nên không ra ngoài; tuy mệt vẫn muốn đọc.'],
 ['Yīnwèi míngtiān kǎoshì, tā jīnwǎn zài jiā fùxí.','Vì mai thi nên tối nay ôn ở nhà.'],
 ['Nán dúwán le, dànshì hái méi kàndǒng.','Nam đọc xong nhưng chưa hiểu.'],
 ['Nǐmen jìnlái ba!','Các em vào đây nhé!'],
];
const items=buildAuthoredBatch({level:'hsk2',manuscripts,examples:{},answerReadings:Object.fromEntries(manuscripts.map((m,i)=>[m.id,readings[i]])),practiceByLesson:Object.fromEntries(manuscripts.map(m=>{
 const grammar=getRichLessonContent(m.id)!.grammar[0];
 const decision=grammarDecisions.find(d=>d.row===grammar.id)!;
 return [m.id,{pattern:decision.title,example:[grammar.modelExample.hanzi,grammar.modelExample.pinyin,grammar.modelExample.meaningVi] as [string,string,string],prompt:decision.prompt,answers:decision.answers,explanation:decision.feedback}];
}))});
const facts:[string,string,string,string][][]=[
 [['经常／正','jīngcháng / zhèng','Thường / đang','Thói quen đi tàu; hiện đợi ở cửa ga.'],['已经／就要','yǐjīng / jiùyào','Đã / sắp','Đã mua vé; 10 phút nữa vào lớp.'],['过／可能','guo / kěnéng','Trải nghiệm / khả năng','Bạn chưa từng đến; có thể muộn.']],
 [['着','zhe','Trạng thái','Cửa mở, ba giáo viên đứng.'],['两年','liǎng nián','Thời lượng','Không phải mốc giờ hoặc chứng nhận năng lực.'],['一次','yí cì','Một lần trải nghiệm','Không chứng minh thường ăn hay thích ăn.']],
 [['因为／所以','yīnwèi / suǒyǐ','Lý do → kết quả','Mưa → không ra ngoài.'],['虽然／但是','suīrán / dànshì','Nhượng bộ','Mệt → vẫn muốn đọc.'],['再／是…的','zài / shì…de','Thứ tự / nhấn chi tiết','Ăn rồi về; bắt đầu học năm ngoái tại Hà Nội.']],
 [['还是','háishi','Lựa chọn','Nhà hay thư viện → chọn nhà.'],['因为／虽然','yīnwèi / suīrán','Lý do / nhượng bộ','Mai thi nên ôn; tuy mệt vẫn ôn.'],['一…就…','yī…jiù…','Nối tiếp ngay','Về tới nhà là đọc, đang nói dự định.']],
 [['老师／南','lǎoshī / Nán','Người mời / người đọc','Giáo viên trong lớp; Nam từ cửa vào.'],['读完／没看懂','dúwán / méi kàndǒng','Đọc xong / chưa hiểu','Hai kết quả không đồng nhất.'],['出去／往右','chūqù / wǎng yòu','Ra / đi phải','Hướng của Nam khi rời lớp đến thư viện.']],
 [['安在外面','Ān zài wàimiàn','An ở ngoài','Gọi Bình trong lớp ra phía mình: 出来.'],['老师在里面','lǎoshī zài lǐmiàn','Giáo viên ở trong','Gọi hai bạn vào phía mình: 进来.'],['平 → 安','Píng → Ān','Bình tặng An sách','Bình cho; An nhận; sách là vật.']],
];
for(const [i,item] of items.entries()){
 const rich=getRichLessonContent(item.lessonId)!;
 item.studioContent.objectiveVi=manuscripts[i].focus;
 // Replace the single-template grammar/guided pages with complete source-specific instruction.
 item.lessonPages.pages=item.lessonPages.pages.filter(p=>!p.id.endsWith(':meaning')&&!p.id.endsWith(':guided'));
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:facts`,title:'Đọc cảnh trước khi chọn cấu trúc',layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram',title:manuscripts[i].focus,diagram:{type:'comparison',description:'Thẻ dữ kiện là căn cứ làm bài; hình nền chỉ trang trí. Điểm nhìn được nêu riêng khi chuyển động.',nodes:facts[i].map(([label,pinyin,meaningVi,note],n)=>({id:`fact-${n}`,label,pinyin,meaningVi,note,x:n,y:0}))}}]},...buildGrammarPages(item.lessonId,grammarDecisions));
 for(const page of item.lessonPages.pages)for(const block of page.blocks){
  for(const [wordId,example] of Object.entries(grammarWordExamples))if(block.id.endsWith(`word-${wordId}`)){
   [block.hanzi,block.pinyin,block.meaningVi]=example;
  }
  if(block.activity&&!block.activity.learningTarget)block.activity.learningTarget={skill:block.activity.type==='rubric'?'writing':'reading',objective:manuscripts[i].focus,sources:[{kind:'task',id:rich.tasks[0].id}]};
 }
 item.studioContent.grammar=rich.grammar.map(g=>({pattern:grammarDecisions.find(d=>d.row===g.id)!.title,explanationVi:grammarDecisions.find(d=>d.row===g.id)!.note,modelExample:g.modelExample,guidedPractice:g.guidedPractice}));
 item.studioContent.lessonPages=item.lessonPages;
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];if(errors.length)throw Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-grammar-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({lesson:i.lessonId,pages:i.lessonPages.pages.length,activities:i.lessonPages.pages.flatMap(p=>p.blocks).filter(b=>b.activity).length})));
