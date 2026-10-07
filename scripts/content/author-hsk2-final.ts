import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import {manuscripts,practices,examples,answerReadings} from './hsk2-final-manuscripts';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {LESSON_SCENES} from '../../src/learning/lessonPresentation';

const items=buildAuthoredBatch({manuscripts,practiceByLesson:practices,examples,answerReadings,level:'hsk2'});
for(const [index,item]of items.entries()){
 const m=manuscripts[index];const doc=item.lessonPages;const picture=index>=2;
 item.studioContent.objectiveVi=m.focus;
 // These lessons teach reading/writing, with no unrelated shared campus scenes.
 doc.pages[0].layout='focus';doc.pages[1].layout='focus';
 doc.pages[1].title=picture?'Đối chiếu quan sát với câu mô tả':'Đọc tin nhắn theo việc người nhận cần làm';
 if(picture){
  const scene=LESSON_SCENES.find(s=>s.src.endsWith(index===2?'/pond-observation-v1.webp':'/rainy-station-observation-v1.webp'))!;
  for(const page of [doc.pages[0],doc.pages.find(p=>p.id.endsWith(':choice'))!]){
   page.illustration=scene;
   // Instructional media uses the uncropped image block, also editable in Studio.
   page.blocks.unshift({...emptyLessonBlock(`${page.id}:observation`),kind:'image',title:'Quan sát toàn cảnh',imageSrc:scene.src,alt:scene.alt,provenance:scene.provenance});
  }
 }else{
  doc.pages[0].blocks.push({...emptyLessonBlock(`${m.id}:message-facts`),kind:'diagram',title:'Dữ kiện để soạn tin',diagram:{type:'sequence',description:'Dữ kiện giả định; không cần cung cấp thông tin cá nhân thật.',nodes:(index===0?[
   ['小李','Xiǎo Lǐ','Người nhận: Tiểu Lý','Nhờ báo cho Tiểu Vương.'],['今天头疼','jīntiān tóu téng','Hôm nay đau đầu','Hủy buổi đá bóng hôm nay.'],['请告诉小王','qǐng gàosu Xiǎo Wáng','Nhờ báo Tiểu Vương','Chưa báo, không viết 已经.'],
  ]:[['红色的包','hóngsè de bāo','Túi đỏ','Đồ cần mang.'],['右边 → 左边','yòubian → zuǒbian','Phải → trái','Cập nhật vị trí cạnh cửa phòng học.'],['下午五点／车站门口','xiàwǔ wǔ diǎn / chēzhàn ménkǒu','5 giờ chiều / cửa ga','Nơi giao khác nơi quên túi.']]).map(([label,pinyin,meaningVi,note],i)=>({id:`fact-${i}`,label,pinyin,meaningVi,note,x:i,y:0}))}});
 }
 if(index===1){
  const rule=doc.pages.find(p=>p.id.endsWith(':meaning'))!.blocks[0];
  rule.body+='\nKhung nhờ mang đồ: 请 + người + thời gian + 把 + đồ vật + 带到 + nơi đến. 把 đưa đồ vật cần xử lý lên trước hành động; đồ vật ở đây đã xác định là chiếc túi đỏ. Ví dụ đơn giản khác: 请帮我拿书。Không dùng 把 để nối trực tiếp với 是. Đổi giờ dùng 时间改成…; 改成 gǎi chéng nghĩa là đổi thành.';
  item.studioContent.ruleVi=rule.body;item.studioContent.grammar[0].explanationVi=rule.body;
 }
 const rich=getRichLessonContent(item.lessonId)!;
 for(const page of doc.pages)for(const block of page.blocks)if(block.activity){
  // Picture interpretation is contextual reading, not visual proof of Chinese writing mastery.
  block.activity.learningTarget={skill:block.activity.type==='rubric'?'writing':'reading',objective:m.focus,sources:[{kind:'task',id:rich.tasks[0].id}]};
  if(block.activity.type==='rubric')block.body=m.transfer+'\nViết trước khi mở mẫu. Tự đối chiếu từng tiêu chí rồi sửa câu; mẫu không phải đáp án duy nhất.';
 }
 item.studioContent.lessonPages=doc;
 const errors=[...validateLessonPages(doc),...validateLessonActivitySources(item.lessonId,doc)];if(errors.length)throw Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-final-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({id:i.lessonId,pages:i.lessonPages.pages.length})));
