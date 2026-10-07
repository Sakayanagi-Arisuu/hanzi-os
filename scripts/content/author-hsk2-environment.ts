import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch,type BatchPractice} from './build-authored-batch';
import {environmentManuscripts as manuscripts} from './environment-batch-manuscripts';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const [objects,weather,place]=manuscripts.map(m=>m.id);
const practiceByLesson:Record<string,BatchPractice>={
 [objects]:{pattern:'A 比 B + tính từ',example:['红色的比绿色的长。','Hóngsè de bǐ lǜsè de cháng.','Áo đỏ dài hơn áo xanh lá.'],prompt:'Áo đỏ 70 cm, áo xanh lá 65 cm. 红色的比绿色的___。 Điền 长 hoặc 短.',answers:['长'],explanation:'70 cm lớn hơn 65 cm nên áo đỏ dài hơn. 短 sẽ đảo quan hệ.'},
 [weather]:{pattern:'如果…就…',example:['如果下雨，我们就去图书馆。','Rúguǒ xiàyǔ, wǒmen jiù qù túshūguǎn.','Nếu mưa thì chúng ta đến thư viện.'],prompt:'Giữ ý “có thể mưa”, chưa chắc chắn: 明天下午___下雨。 Điền 可能 hoặc 一定.',answers:['可能'],explanation:'可能 giữ mức chưa chắc chắn của dự báo; 一定 làm tăng mức khẳng định sai thông tin.'},
 [place]:{pattern:'Nơi + 有 + vật; vật + 在 + nơi',example:['房间里有一张床。','Fángjiān lǐ yǒu yì zhāng chuáng.','Trong phòng có một giường.'],prompt:'Giới thiệu đồ trong phòng: 房间里___一张床。 Điền 有 hoặc 在.',answers:['有'],explanation:'Nơi + 有 + vật giới thiệu sự tồn tại. Muốn dùng 在 phải đổi trật tự: 床在房间里.'},
};
const items=buildAuthoredBatch({level:'hsk2',manuscripts,practiceByLesson,examples:{
 '那样':['我不想买那样的衣服。','Wǒ bù xiǎng mǎi nàyàng de yīfu.','Tôi không muốn mua kiểu áo như thế.'],
 '床':['房间里有两张床。','Fángjiān lǐ yǒu liǎng zhāng chuáng.','Trong phòng có hai giường.'],
 '间':['我想租一间房。','Wǒ xiǎng zū yì jiān fáng.','Tôi muốn thuê một phòng.'],
 '面':['房子对面有一所学校。','Fángzi duìmiàn yǒu yì suǒ xuéxiào.','Đối diện nhà có một trường học.'],
},answerReadings:{
 [objects]:['Lǜsè de héshì, chángdù hé jiàgé dōu kěyǐ.','Áo xanh lá phù hợp về cả chiều dài và giá.'],
 [weather]:['Míngtiān xiàwǔ kěnéng xiàyǔ; rúguǒ xiàyǔ, wǒmen jiù qù túshūguǎn.','Chiều mai có thể mưa; nếu mưa chúng ta đến thư viện.'],
 [place]:['Zhuōzi zài chuānghu pángbiān, shāngdiàn zài fángzi pángbiān.','Bàn cạnh cửa sổ, cửa hàng cạnh nhà.'],
}});
const facts:Record<string,[string,string,string,string][] >={
 [objects]:[['红色','hóngsè','70 cm · 120 tệ','Vượt cả hai giới hạn.'],['绿色','lǜsè','65 cm · 100 tệ','Đáp ứng chiều dài tối đa 65 cm, giá tối đa 110 tệ.']],
 [weather]:[['今天','jīntiān','Âm u, hơi lạnh','Hiện trạng quan sát.'],['明天上午','míngtiān shàngwǔ','Dự báo quang/nắng','Hẹn ra công viên lúc 9:00.'],['明天下午','míngtiān xiàwǔ','Có thể mưa','Nếu mưa: đến thư viện; không coi dự báo là chắc chắn.']],
 [place]:[['房子／学校','fángzi / xuéxiào','Nhà đối diện trường','Hai bên đường.'],['商店／房子','shāngdiàn / fángzi','Cửa hàng cạnh nhà','Cùng phía đường, không nằm trong phòng.'],['桌子／窗户','zhuōzi / chuānghu','Bàn cạnh cửa sổ','Bên trong phòng có thêm một giường.']],
};
for(const item of items){
 const rich=getRichLessonContent(item.lessonId)!;
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:facts`,title:'Đối chiếu dữ kiện trước khi quyết định',layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram',title:item.lessonId===objects?'Hai món, hai tiêu chí':item.lessonId===weather?'Hiện trạng và dự báo':'Mỗi quan hệ có mốc riêng',diagram:{type:item.lessonId===weather?'timeline':'comparison',description:'Thẻ dữ kiện biên tập được. Ảnh nền chỉ trang trí, không cung cấp dữ kiện khác.',nodes:facts[item.lessonId].map(([label,pinyin,meaningVi,note],i)=>({id:`fact-${i}`,label,pinyin,meaningVi,note,x:i,y:0}))}}]});
 for(const page of item.lessonPages.pages)for(const block of page.blocks)if(block.activity){
 const guided=block.id.endsWith(':guided');
 block.activity.learningTarget={skill:'grammar',objective:guided?practiceByLesson[item.lessonId].explanation:manuscripts.find(m=>m.id===item.lessonId)!.focus,sources:[{kind:guided?'grammar':'task',id:guided?rich.grammar[0].id:rich.tasks[0].id}]};
 }
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];if(errors.length)throw Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-environment-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(item=>({lesson:item.lessonId,pages:item.lessonPages.pages.length,published:false})));
