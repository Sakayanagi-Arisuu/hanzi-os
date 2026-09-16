import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import type {SurvivalManuscript} from './survival-batch-manuscripts';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const id='hsk2-daily-needs-family-lesson-04';
const manuscript:SurvivalManuscript={id,focus:'Nói điều đang cảm thấy, không biến phỏng đoán thành chắc chắn',scene:'Vai B đau đầu từ sáng nay, mắt cũng khó chịu. B không biết nguyên nhân, dự định đi khám; A hỏi thăm và đề nghị đi cùng. Tập nói rõ triệu chứng, thời điểm và bước tiếp theo.',support:'早上 zǎoshang: sáng · 从 có nghĩa từ một mốc · 开始 kāishǐ: bắt đầu · 可能 kěnéng: có thể · 原因 yuányīn: nguyên nhân · 医生 yīshēng: bác sĩ · 陪 péi: đi cùng · 休息 xiūxi: nghỉ. Các câu là tình huống luyện giao tiếp, không dùng để tự chẩn đoán hoặc chọn thuốc.',rule:'Bộ phận + 疼: 我头疼, 我的手疼. 不舒服 rộng hơn đau, chỉ cảm giác không khỏe/khó chịu. 也 thêm một triệu chứng: 眼睛也不舒服.\n从今天早上开始 trả lời mốc bắt đầu, không phải nguyên nhân. 是不是因为…？ hỏi giả thuyết; 可能是，但我不知道 giữ mức chưa chắc chắn. 因为 giới thiệu lý do mà người nói đưa ra, không tự xác minh lý do đó.\n我想去看医生 là dự định đi khám, không phải đã khám. 看医生以后… sắp xếp việc sau khám.',pitfall:'头疼 là đau đầu; 累 là mệt, không đồng nghĩa. Không nghe 可能 rồi kể lại thành chắc chắn. 买药 là mua thuốc, không thay nghĩa của 看医生. Không suy ra thuốc hoặc liều từ triệu chứng trong bài.',dialogue:[
 ['你怎么了？','Nǐ zěnme le?','Bạn bị làm sao?'],
 ['我头疼，眼睛也不舒服。','Wǒ tóuténg, yǎnjing yě bù shūfu.','Tôi đau đầu, mắt cũng khó chịu.'],
 ['什么时候开始的？','Shénme shíhou kāishǐ de?','Bắt đầu từ khi nào?'],
 ['从今天早上开始。','Cóng jīntiān zǎoshang kāishǐ.','Từ sáng nay.'],
 ['是不是因为昨天太累了？','Shì bú shì yīnwèi zuótiān tài lèi le?','Có phải vì hôm qua quá mệt không?'],
 ['可能是，但我不知道。我想去看医生。','Kěnéng shì, dàn wǒ bù zhīdào. Wǒ xiǎng qù kàn yīshēng.','Có thể, nhưng tôi không biết. Tôi muốn đi khám.'],
 ['我陪你去。','Wǒ péi nǐ qù.','Tôi đi cùng bạn.'],
 ['谢谢，看医生以后我想回家休息。','Xièxie, kàn yīshēng yǐhòu wǒ xiǎng huí jiā xiūxi.','Cảm ơn, sau khi khám tôi muốn về nhà nghỉ.'],
 ],question:'B nói 可能是，但我不知道. Cách kể lại nào giữ đúng mức chắc chắn?',choices:[['我不知道原因，可能是昨天太累了。','Đúng: vẫn giữ chưa biết nguyên nhân và chỉ coi mệt hôm qua là khả năng.'],['因为昨天太累了，所以今天头疼。','Câu này khẳng định quan hệ nguyên nhân; mạnh hơn điều B thực sự biết.'],['我已经看过医生了。','Câu này nói đã khám, nhưng B mới nêu dự định đi khám.']],answer:0,transfer:'Đổi vai: tay bạn đau từ chiều hôm qua; bạn không biết nguyên nhân và muốn đi khám chiều nay. Viết ít nhất sáu lượt có hỏi triệu chứng, mốc bắt đầu, nguyên nhân chưa chắc và đề nghị đi cùng. Hỗ trợ: 昨天下午 zuótiān xiàwǔ: chiều hôm qua · 今天下午 jīntiān xiàwǔ: chiều nay.',model:['A：你怎么了？ B：我的手疼。 A：什么时候开始的？ B：从昨天下午开始。 A：你知道原因吗？ B：不知道，我想今天下午去看医生。 A：我陪你去。 B：谢谢。','A: Nǐ zěnme le? B: Wǒ de shǒu téng. A: Shénme shíhou kāishǐ de? B: Cóng zuótiān xiàwǔ kāishǐ. A: Nǐ zhīdào yuányīn ma? B: Bù zhīdào, wǒ xiǎng jīntiān xiàwǔ qù kàn yīshēng. A: Wǒ péi nǐ qù. B: Xièxie.','A: Bạn sao vậy? B: Tay tôi đau. A: Bắt đầu khi nào? B: Từ chiều hôm qua. A: Bạn biết nguyên nhân không? B: Không biết, tôi muốn chiều nay đi khám. A: Tôi đi cùng bạn. B: Cảm ơn.'],criteria:['Triệu chứng là tay đau, không đổi thành đau đầu theo mẫu cũ.','Mốc bắt đầu là chiều hôm qua, dự định khám là chiều nay; không đảo hai mốc.','Giữ chưa biết nguyên nhân; không tự thêm kết luận hoặc chỉ dẫn dùng thuốc.','Các lượt hỏi và đáp nối nhau, có đề nghị đi cùng và cảm ơn.']};
const examples:Record<string,[string,string,string]>={
 '累':['我今天很累。','Wǒ jīntiān hěn lèi.','Hôm nay tôi rất mệt.'],
 '身体':['你最近身体怎么样？','Nǐ zuìjìn shēntǐ zěnmeyàng?','Dạo này sức khỏe bạn thế nào?'],
 '手':['我的手有点儿疼。','Wǒ de shǒu yǒudiǎnr téng.','Tay tôi hơi đau.'],
 '舒服':['我今天不太舒服。','Wǒ jīntiān bú tài shūfu.','Hôm nay tôi không được khỏe lắm.'],
 '疼':['你的头还疼吗？','Nǐ de tóu hái téng ma?','Đầu bạn còn đau không?'],
 '头':['我头疼，想休息一下。','Wǒ tóuténg, xiǎng xiūxi yíxià.','Tôi đau đầu, muốn nghỉ một lát.'],
 '洗':['吃饭以前我先洗手。','Chīfàn yǐqián wǒ xiān xǐ shǒu.','Trước khi ăn tôi rửa tay trước.'],
 '洗手间':['请问，洗手间在哪儿？','Qǐngwèn, xǐshǒujiān zài nǎr?','Cho hỏi nhà vệ sinh ở đâu?'],
 '眼睛':['她的眼睛不舒服。','Tā de yǎnjing bù shūfu.','Mắt cô ấy khó chịu.'],
 '药':['我想问医生，这是什么药。','Wǒ xiǎng wèn yīshēng, zhè shì shénme yào.','Tôi muốn hỏi bác sĩ đây là thuốc gì.'],
 '药店':['医院旁边有一家药店。','Yīyuàn pángbiān yǒu yì jiā yàodiàn.','Bên cạnh bệnh viện có một hiệu thuốc.'],
 '因为':['因为我不舒服，所以今天不去上班。','Yīnwèi wǒ bù shūfu, suǒyǐ jīntiān bú qù shàngbān.','Vì tôi không khỏe nên hôm nay không đi làm.'],
};
const items=buildAuthoredBatch({level:'hsk2',manuscripts:[manuscript],examples,practiceByLesson:{[id]:{pattern:'从 + mốc thời gian + 开始',example:['从今天早上开始。','Cóng jīntiān zǎoshang kāishǐ.','Bắt đầu từ sáng nay.'],prompt:'Điền đúng từ chỉ điểm bắt đầu theo mẫu: ___今天早上开始。 (Bắt đầu từ sáng nay.)',answers:['从'],explanation:'从 nêu mốc bắt đầu. 因为 đưa ra nguyên nhân, không trả lời từ lúc nào.'}},answerReadings:{[id]:['Wǒ bù zhīdào yuányīn, kěnéng shì zuótiān tài lèi le.','Tôi không biết nguyên nhân, có thể là hôm qua quá mệt.']}});
const item=items[0],rich=getRichLessonContent(id)!;
item.lessonPages.pages.splice(1,0,{id:`${id}:v2:facts`,title:'Phân biệt ba loại thông tin',layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${id}:v2:block:facts`),kind:'diagram',title:'Triệu chứng · thời gian · phỏng đoán',diagram:{type:'comparison',description:'Hai thông tin B nêu và một giả thuyết A hỏi. Không biến câu hỏi về nguyên nhân thành chẩn đoán.',nodes:[
 {id:'symptom',label:'头疼，眼睛不舒服',pinyin:'tóuténg, yǎnjing bù shūfu',meaningVi:'đau đầu, mắt khó chịu',note:'B tự mô tả cảm giác.',x:0,y:0},
 {id:'onset',label:'今天早上',pinyin:'jīntiān zǎoshang',meaningVi:'sáng nay',note:'Mốc bắt đầu, không phải nguyên nhân.',x:1,y:0},
 {id:'cause',label:'可能是昨天太累了',pinyin:'kěnéng shì zuótiān tài lèi le',meaningVi:'có thể là hôm qua quá mệt',note:'Chưa chắc chắn; B nói không biết.',x:2,y:0},
 ]}}]});
for(const page of item.lessonPages.pages)for(const block of page.blocks)if(block.activity)block.activity.learningTarget={skill:'grammar',objective:block.id.endsWith(':guided')?'Dùng 从 để nêu mốc bắt đầu theo mẫu.':block.id.endsWith(':produce')?'Tự viết chuỗi hỏi thăm với triệu chứng, thời gian và mức chắc chắn đúng; rubric tự đối chiếu.':'Giữ mức chưa chắc chắn khi kể lại phỏng đoán nguyên nhân.',sources:[{kind:block.id.endsWith(':guided')?'grammar':'task',id:block.id.endsWith(':guided')?rich.grammar[0].id:rich.tasks[0].id}]};
const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(id,item.lessonPages)];if(errors.length)throw new Error(errors.join('\n'));
writeFileSync('content/drafts/thien-lo-hsk2-health-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:1,pages:item.lessonPages.pages.length,published:false});
