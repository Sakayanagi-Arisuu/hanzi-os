import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import {referenceManuscripts as manuscripts} from './reference-batch-manuscripts';
import {buildGrammarPages} from './build-grammar-pages';
import {referenceDecisions} from './hsk2-reference-decisions';
import {referenceWordExamples} from './hsk2-reference-word-examples';
import {buildReconstructionPages} from './hsk2-reconstruction-activities';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const readings:[string,string][]=[
 ['Sān wèi lǎoshī yígòng mǎi liù bāo chá.','Ba giáo viên mua tổng sáu gói trà.'],
 ['Tā qùguo Běijīng liǎng cì, jīntiān gěi māma dǎ diànhuà.','Đã đến Bắc Kinh hai lần, hôm nay gọi cho mẹ.'],
 ['Hóng de shì Méi de, bái de shì Lán de; fàn zuòhǎo le.','Áo đỏ của Mai, trắng của Lan; cơm đã xong.'],
 ['Jiějie èrshísān suì; bān lǐ yǒu sānshí duō míng xuésheng.','Chị 23 tuổi; lớp hơn ba mươi học sinh.'],
 ['Jiǔdiàn lí chēzhàn bù yuǎn, míngtiān wǒ yào kǎoshì.','Khách sạn không xa ga; mai tôi thi.'],
 ['Jīpiào mǎihǎo le, xíngli hái méi shōushi.','Vé đã mua xong, hành lý chưa xếp.'],
 ['Tā juéde zúqiú gèng yǒuyìsi; yīnwèi míngtiān kǎoshì, suǒyǐ jīnwǎn xuéxí.','Theo anh ấy bóng đá thú vị hơn; vì mai thi nên tối nay học.'],
];
const items=buildAuthoredBatch({level:'hsk2',manuscripts,examples:{},answerReadings:Object.fromEntries(manuscripts.map((m,i)=>[m.id,readings[i]])),practiceByLesson:Object.fromEntries(manuscripts.map(m=>{
 const g=getRichLessonContent(m.id)!.grammar[0];
 const d=referenceDecisions.find(d=>d.row===g.id);
 return [m.id,{pattern:d?.title??m.focus,example:[g.modelExample.hanzi,g.modelExample.pinyin,g.modelExample.meaningVi] as [string,string,string],prompt:d?.prompt??'Theo mẫu trong ngữ cảnh, điền từ còn thiếu: 我___汉语。 Điền 学.',answers:d?.answers??['学'],explanation:d?.feedback??'学汉语 nói học tiếng Trung; phần sắp xếp riêng sẽ luyện chuỗi câu.'}];
}))});
const facts:[string,string,string,string][][]=[
 [['学校对面','xuéxiào duìmiàn','Hiệu sách đối diện trường','Bệnh viện bên trái theo người nhìn vào trường.'],['三位／两包','sān wèi / liǎng bāo','3 giáo viên · mỗi người 2 gói','Tổng 6 gói; chưa biết số lá.'],['自己','zìjǐ','Chính họ tự chọn','Không có người chọn thay.']],
 [['两次','liǎng cì','Hai lần đến Bắc Kinh','Chưa biết tổng thời lượng ở đó.'],['8:00 → 17:00','bā diǎn → shíqī diǎn','Khoảng làm việc hôm nay','Gọi mẹ sau khi làm.'],['今天比昨天冷','jīntiān bǐ zuótiān lěng','Hôm nay lạnh hơn','Không đảo hai ngày.']],
 [['红的／白的','hóng de / bái de','Áo đỏ của Mai / trắng của Lan','的 thay áo vì đã có ngữ cảnh.'],['昨天买的','zuótiān mǎi de','Mai mua áo đỏ hôm qua','Mốc mua không áp cho áo trắng.'],['饭做好了','fàn zuòhǎo le','Cơm đã xong','Chưa biết người nấu.']],
 [['20 → 23','èrshí → èrshísān','Chị hơn An 3 tuổi','Chị 23, không phải 3.'],['1.60 → 1.70 米','yì diǎn liù → yì diǎn qī mǐ','Chị cao hơn 10 cm','Chênh lệch khác chiều cao toàn bộ.'],['三楼／三十多名','sān lóu / sānshí duō míng','Tầng 3 / hơn 30 học sinh','Không biết chính xác 35.']],
 [['酒店／车站','jiǔdiàn / chēzhàn','Khách sạn không xa ga','Chưa biết số phút.'],['明天','míngtiān','Thi ngày mai','Chưa phải đã thi xong.'],['下课以后','xiàkè yǐhòu','Tan học rồi về nhà','Xác định mốc trước khi xếp.']],
 [['机票买好了','jīpiào mǎihǎo le','Vé đã mua xong','Chuyến đi tuần sau, chưa kết thúc.'],['行李还没收拾','xíngli hái méi shōushi','Hành lý chưa xếp','Không suy mọi việc đều xong.'],['慢一点儿','màn yìdiǎnr','Xin nói chậm hơn','Yêu cầu thay đổi, không phải đánh giá hơi chậm.']],
 [['我觉得','wǒ juéde','Quan điểm cá nhân','Minh thích bóng đá hơn.'],['虽然／但是','suīrán / dànshì','Mưa nhưng vẫn đến','Nhượng bộ, không phải nguyên nhân.'],['因为／所以','yīnwèi / suǒyǐ','Mai thi nên tối học','Không đảo lý do và hệ quả.']],
];
for(const [i,item] of items.entries()){
 const rich=getRichLessonContent(item.lessonId)!;
 const reconstruction=item.lessonId.includes('sentence-reconstruction');
 item.studioContent.objectiveVi=manuscripts[i].focus;
 // Keep the manuscript explanation for reconstruction; grammar lessons use every source row.
 item.lessonPages.pages=item.lessonPages.pages.filter(p=>!p.id.endsWith(':guided')&&(reconstruction||!p.id.endsWith(':meaning')));
 const teaching=reconstruction?buildReconstructionPages(item.lessonId):buildGrammarPages(item.lessonId,referenceDecisions);
 const factsPage={id:`${item.lessonId}:v2:facts`,title:'Giữ đúng đối tượng và quan hệ',layout:'focus' as const,stage:'understand' as const,blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram' as const,title:manuscripts[i].focus,diagram:{type:'comparison' as const,description:'Thẻ dữ kiện sửa được trong Xưởng; ảnh nền chỉ trang trí, không cung cấp thêm đáp án.',nodes:facts[i].map(([label,pinyin,meaningVi,note],n)=>({id:`fact-${n}`,label,pinyin,meaningVi,note,x:n,y:0}))}}]};
 item.lessonPages.pages.splice(2,0,factsPage);
 // Explain reconstruction before asking the learner to manipulate pieces.
 const insertion=reconstruction?item.lessonPages.pages.findIndex(p=>p.id.endsWith(':meaning'))+1:3;
 item.lessonPages.pages.splice(insertion,0,...teaching);
 for(const page of item.lessonPages.pages)for(const block of page.blocks){
  for(const [wordId,example] of Object.entries(referenceWordExamples))if(block.id.endsWith(`word-${wordId}`))[block.hanzi,block.pinyin,block.meaningVi]=example;
  if(block.activity&&!block.activity.learningTarget)block.activity.learningTarget={skill:block.activity.type==='rubric'?'writing':'reading',objective:manuscripts[i].focus,sources:[{kind:'task',id:rich.tasks[0].id}]};
 }
 if(!reconstruction)item.studioContent.grammar=rich.grammar.map(g=>({pattern:referenceDecisions.find(d=>d.row===g.id)!.title,explanationVi:referenceDecisions.find(d=>d.row===g.id)!.note,modelExample:g.modelExample,guidedPractice:g.guidedPractice}));
 item.studioContent.lessonPages=item.lessonPages;
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];if(errors.length)throw Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-reference-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({lesson:i.lessonId,pages:i.lessonPages.pages.length,activities:i.lessonPages.pages.flatMap(p=>p.blocks).filter(b=>b.activity).length})));
