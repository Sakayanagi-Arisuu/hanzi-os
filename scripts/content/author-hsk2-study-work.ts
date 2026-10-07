import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch,type BatchPractice} from './build-authored-batch';
import {studyWorkManuscripts as manuscripts} from './study-work-batch-manuscripts';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const ids=manuscripts.map(m=>m.id);
const practices:BatchPractice[]=[
 {pattern:'做完 ≠ 看懂',example:['做完了，但是没看懂。','Zuòwán le, dànshì méi kàndǒng.','Đã làm xong nhưng chưa hiểu khi đọc.'],prompt:'Đã làm hết nhưng chưa hiểu hai câu: 做完了，但是有两道题___看懂。 Điền 没 hoặc 不.',answers:['没'],explanation:'没看懂 nói chưa đạt kết quả hiểu trong lần đọc; không dùng 不 để kể kết quả chưa đạt của lần này.'},
 {pattern:'下课以后，先…再…',example:['下课以后，先休息，再画画。','Xiàkè yǐhòu, xiān xiūxi, zài huàhuà.','Sau giờ học, nghỉ trước rồi vẽ.'],prompt:'Tan lúc 10:00, vẽ lúc 10:15. 两个活动之间有___分钟。 Điền số phút bằng chữ Hán.',answers:['十五'],explanation:'Khoảng cách 10:00–10:15 là 15 phút, không phải giờ 10 hay giờ 15.'},
 {pattern:'正/正在 + việc đang làm',example:['我正准备下午的课。','Wǒ zhèng zhǔnbèi xiàwǔ de kè.','Tôi đang chuẩn bị tiết chiều.'],prompt:'Trường có 10.000 học sinh: 学校有一___名学生。 Điền 万 hoặc 千.',answers:['万'],explanation:'一万 là 10.000; 一千 là 1.000. 名 đếm người trong mẫu này.'},
 {pattern:'过 + trải nghiệm; 打算 + dự định',example:['我没在中国过过年。','Wǒ méi zài Zhōngguó guòguo nián.','Tôi chưa từng đón Tết ở Trung Quốc.'],prompt:'Chưa từng đón Tết ở Trung Quốc: 我___在中国过过年。 Điền 没 hoặc 不.',answers:['没'],explanation:'没…过 phủ định trải nghiệm. 不 thường không thay 没 trong mẫu nói chưa từng này.'},
 {pattern:'您贵姓？—我姓…',example:['我姓陈，叫陈雨。','Wǒ xìng Chén, jiào Chén Yǔ.','Tôi họ Trần, tên đầy đủ Trần Vũ.'],prompt:'Đáp về họ mình, không tự dùng kính ngữ: 我___李。 Điền 姓 hoặc 贵姓.',answers:['姓'],explanation:'我姓李 tự giới thiệu họ; 贵姓 dùng lịch sự để hỏi họ người khác.'},
];
const readings:[string,string][]=[
 ['Tā zuòwán le liànxí, dàn hái yǒu liǎng dào tí méi kàndǒng.','Đã làm xong nhưng còn hai câu chưa hiểu.'],
 ['Bā diǎn bàn shàngkè, shí diǎn xiàkè, shí diǎn yí kè huàhuà.','8:30 học, 10:00 tan, 10:15 vẽ.'],
 ['Tā zhèng zhǔnbèi xiàwǔ de kè, xuéxiào yǒu yì bǎi èrshí míng lǎoshī.','Đang chuẩn bị tiết chiều; trường có 120 giáo viên.'],
 ['Tā zài péngyou jiā chī le jiǎozi, bú shì shuō měi jiā dōu yíyàng.','Ăn sủi cảo ở nhà bạn, không nói mọi nhà đều giống nhau.'],
 ['Wǒ kěyǐ jiào nín Wáng yīshēng ma?','Tôi có thể gọi ông/bà là bác sĩ Vương không?'],
];
const items=buildAuthoredBatch({level:'hsk2',manuscripts,practiceByLesson:Object.fromEntries(ids.map((id,i)=>[id,practices[i]])),answerReadings:Object.fromEntries(ids.map((id,i)=>[id,readings[i]])),examples:{
 '班':['我们班有二十个学生。','Wǒmen bān yǒu èrshí ge xuésheng.','Lớp chúng tôi có hai mươi học sinh.'],
 '错':['这道题我做错了。','Zhè dào tí wǒ zuòcuò le.','Tôi làm sai câu này.'],
 '教':['王老师教我们汉语。','Wáng lǎoshī jiāo wǒmen Hànyǔ.','Thầy/cô Vương dạy chúng tôi tiếng Trung.'],
 '考':['明天考汉语。','Míngtiān kǎo Hànyǔ.','Ngày mai thi tiếng Trung.'],
 '考试':['考试九点开始。','Kǎoshì jiǔ diǎn kāishǐ.','Bài thi bắt đầu lúc chín giờ.'],
 '题':['这两道题我还没看懂。','Zhè liǎng dào tí wǒ hái méi kàndǒng.','Tôi vẫn chưa hiểu hai câu bài tập này.'],
 '周':['我每周上三次课。','Wǒ měi zhōu shàng sān cì kè.','Tôi học ba buổi mỗi tuần.'],
 '名':['学校有八十名老师。','Xuéxiào yǒu bāshí míng lǎoshī.','Trường có tám mươi giáo viên.'],
 '万':['学校有一万名学生。','Xuéxiào yǒu yí wàn míng xuésheng.','Trường có mười nghìn học sinh.'],
 '意思':['这个词是什么意思？','Zhè ge cí shì shénme yìsi?','Từ này có nghĩa là gì?'],
}});
const facts:[string,string,string,string][][]=[
 [['两年前','liǎng nián qián','Bắt đầu học','Mốc thời gian, không phải tần suất.'],['每周三次','měi zhōu sān cì','Ba buổi mỗi tuần','Lịch học hiện tại.'],['做完／没看懂','zuòwán / méi kàndǒng','Làm xong / chưa hiểu','Hai câu chưa hiểu; cần hỏi cụ thể.']],
 [['下周一','xià zhōu yī','Khai giảng','Ngày, không phải giờ.'],['8:30 → 10:00','bā diǎn bàn → shí diǎn','Học ở tầng hai','Buổi học ngày đầu.'],['10:15','shí diǎn yí kè','Vẽ tại lớp','15 phút sau khi tan.']],
 [['一百二十名老师','yì bǎi èrshí míng lǎoshī','120 giáo viên','Không đổi thành 10.000 giáo viên.'],['一万名学生','yí wàn míng xuésheng','10.000 học sinh','万 = 10.000.'],['正准备','zhèng zhǔnbèi','Đang chuẩn bị','Chưa bắt đầu dạy tiết chiều.']],
 [['去年／北京','qùnián / Běijīng','Trải nghiệm đã có','Ăn sủi cảo ở nhà một người bạn.'],['每家不一定一样','měi jiā bù yídìng yíyàng','Không nhất thiết giống nhau','Không suy mọi gia đình cùng phong tục.'],['明年／打算','míngnián / dǎsuàn','Dự định người nghe','Chưa có trải nghiệm đón Tết ở Trung Quốc.']],
 [['姓／姓名','xìng / xìngmíng','Họ / họ tên đầy đủ','陈 / 陈雨.'],['贵姓','guìxìng','Hỏi họ người khác','Không tự nói 我贵姓.'],['陈老师／王医生','Chén lǎoshī / Wáng yīshēng','Chức danh theo vai trò','Xác nhận cách người đó muốn được gọi.']],
];
for(const [i,item] of items.entries()){
 const rich=getRichLessonContent(item.lessonId)!;
 item.studioContent.objectiveVi=manuscripts[i].focus;
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:facts`,title:['Điểm bắt đầu, tần suất và kết quả','Lịch ngày đầu đi học','Đếm đúng người, kể đúng việc','Trải nghiệm và phạm vi kết luận','Thẻ tên và cách gọi'][i],layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram',title:'Đọc đúng từng loại thông tin',diagram:{type:i===1?'timeline':'comparison',description:'Dữ kiện và quan hệ được ghi bằng chữ; ảnh nền chỉ trang trí. Các thẻ này có thể sửa trong Xưởng.',nodes:facts[i].map(([label,pinyin,meaningVi,note],n)=>({id:`fact-${n}`,label,pinyin,meaningVi,note,x:n,y:0}))}}]});
 for(const page of item.lessonPages.pages)for(const block of page.blocks)if(block.activity){
  const guided=block.id.endsWith(':guided'),produce=block.activity.type==='rubric';
  block.activity.learningTarget={skill:produce?'writing':guided?'grammar':'reading',objective:guided?practices[i].explanation:manuscripts[i].focus,sources:[{kind:guided?'grammar':'task',id:guided?rich.grammar[0].id:rich.tasks[0].id}]};
 }
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];if(errors.length)throw Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-study-work-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(item=>({lesson:item.lessonId,pages:item.lessonPages.pages.length,published:false})));
