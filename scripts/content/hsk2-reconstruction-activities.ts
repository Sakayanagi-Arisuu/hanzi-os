import {emptyLessonActivity,type LessonActivity} from '../../src/learning/lessonActivities';
import {emptyLessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
type Task={prompt:string;pieces:string[];pinyin:string;meaning:string;feedback:string};
/** Each prompt fixes topic/position where Mandarin otherwise permits alternatives. */
export const reconstructionTasks:Record<string,Task[]>={
 'hsk2-sentence-reconstruction-lesson-01':[
  {prompt:'Dựng câu bắt đầu bằng 酒店: khách sạn không xa ga. Dùng đủ các mảnh.',pieces:['酒店','离车站','不远'],pinyin:'Jiǔdiàn lí chēzhàn bù yuǎn.',meaning:'Khách sạn không xa ga.',feedback:'酒店 là nơi đang nói đến; 离车站 lấy ga làm mốc; 不远 mô tả khoảng cách. Đề yêu cầu bắt đầu bằng 酒店.'},
  {prompt:'Đưa thời gian 下课以后 lên đầu, rồi nêu “tôi về nhà ngay”.',pieces:['下课以后','我','就','回家'],pinyin:'Xiàkè yǐhòu wǒ jiù huí jiā.',meaning:'Sau khi tan học tôi về nhà ngay.',feedback:'Thời gian đặt đầu theo yêu cầu; 我 là chủ thể; 就 trước 回家 nhấn ngay. 我下课以后就回家 cũng có thể dùng, nhưng không theo yêu cầu đặt thời gian đầu của bài này.'},
  {prompt:'Bắt đầu bằng 她, đặt tần suất trước động từ: cô ấy uống một cốc cà phê mỗi ngày.',pieces:['她','每天','喝','一杯咖啡'],pinyin:'Tā měitiān hē yì bēi kāfēi.',meaning:'Cô ấy uống một cốc cà phê mỗi ngày.',feedback:'Chủ thể 她, tần suất 每天, động từ 喝, vật uống 一杯咖啡. Đếm cốc bằng 杯, không bỏ lượng từ.'},
 ],
 'hsk2-sentence-reconstruction-lesson-02':[
  {prompt:'Đặt 旅游以前 ở đầu: trước chuyến du lịch, tôi đã mua xong vé máy bay.',pieces:['旅游以前','我','买好了','机票'],pinyin:'Lǚyóu yǐqián wǒ mǎihǎo le jīpiào.',meaning:'Trước khi du lịch tôi đã mua xong vé máy bay.',feedback:'买好 giữ kết quả mua xong, 了 đi trong mảnh 买好了. Câu này chưa nói chuyến đi đã hoàn tất. Đề cố định thời gian đầu câu.'},
  {prompt:'Dựng lời yêu cầu lịch sự: xin nói chậm hơn một chút. Bắt đầu bằng 请.',pieces:['请','说','慢一点儿'],pinyin:'Qǐng shuō màn yìdiǎnr.',meaning:'Xin nói chậm hơn một chút.',feedback:'请 mở yêu cầu, 说 là hành động, 慢一点儿 là mức cần thay đổi. 有点儿慢 lại đánh giá hơi chậm, khác yêu cầu nói chậm hơn.'},
  {prompt:'Bắt đầu bằng 他: anh ấy ngày nào cũng chạy bộ. Giữ 每天 trước 都.',pieces:['他','每天','都','跑步'],pinyin:'Tā měitiān dōu pǎobù.',meaning:'Anh ấy ngày nào cũng chạy bộ.',feedback:'每天 nêu phạm vi mỗi ngày, 都 nhấn đều, 跑步 là hành động. Đây là thói quen, không chứng minh hiện đang chạy.'},
 ],
 'hsk2-sentence-reconstruction-lesson-03':[
  {prompt:'Xếp hai vế theo thứ tự nhượng bộ trước, kết quả sau: dù mưa nhưng anh ấy vẫn đến.',pieces:['虽然下雨，','但是','他还是来了'],pinyin:'Suīrán xiàyǔ, dànshì tā háishi lái le.',meaning:'Tuy trời mưa nhưng anh ấy vẫn đến.',feedback:'虽然 giới thiệu trở ngại; 但是 nối kết quả trái kỳ vọng. 还是 ở đây là vẫn, không phải câu hỏi lựa chọn.'},
  {prompt:'Bắt đầu bằng 因为: vì mai thi nên tối nay tôi học ở nhà. Xếp nguyên nhân trước kết quả.',pieces:['因为明天考试，','所以','我今晚在家学习'],pinyin:'Yīnwèi míngtiān kǎoshì, suǒyǐ wǒ jīnwǎn zài jiā xuéxí.',meaning:'Vì mai thi nên tối nay tôi học ở nhà.',feedback:'Kỳ thi là lý do chọn học, không phải học gây ra kỳ thi. Giữ hai vế theo yêu cầu để quan hệ rõ.'},
  {prompt:'Dựng lời đề nghị giúp đỡ. Bắt đầu bằng 让, kết thúc bằng 吧.',pieces:['让','我来帮你','吧'],pinyin:'Ràng wǒ lái bāng nǐ ba.',meaning:'Để tôi giúp bạn nhé.',feedback:'我 là người sẽ giúp, 你 là người nhận trợ giúp. Không đảo thành bạn giúp tôi. 吧 làm lời đề nghị.'},
 ],
};
export function buildReconstructionPages(lessonId:string):LessonPageDocument['pages']{
 const tasks=reconstructionTasks[lessonId];
 if(!tasks)throw Error(`Unknown reconstruction lesson: ${lessonId}`);
 return tasks.map((task,index)=>{
  const id=`${lessonId}:v2:reconstruct-${index}`;
  const ordered=task.pieces.map((text,n)=>({id:`piece-${n}`,text,feedback:''}));
  const activity:LessonActivity={...emptyLessonActivity(),type:'order',options:[...ordered.slice(1),ordered[0]],answerIds:ordered.map(o=>o.id),explanation:`${task.feedback}\n${task.pieces.join('')}。\n${task.pinyin}\n${task.meaning}`,hint:'Xác định chủ thể, mốc thời gian và quan hệ giữa các vế trước; nếu mở lại mẫu, ghi nhận đã dùng trợ giúp.',learningTarget:{skill:'grammar',objective:task.prompt,sources:[{kind:'task',id:`hsk2-short-text-task:${lessonId}`}]}};
  return {id,title:`Dựng câu · lượt ${index+1}`,layout:'workshop',stage:'practice',blocks:[{...emptyLessonBlock(`${id}:activity`),kind:'activity',title:'Chọn từng mảnh theo thứ tự',body:task.prompt,activity}]};
 });
}
