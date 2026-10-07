import {writeFileSync} from 'node:fs';
import {personalNarratives} from './hsk3-personal-narratives';
import {foodExtension} from './hsk3-personal-food-extension';
import {buildNarrativeBatch} from './build-narrative-batch';
const support:Record<string,string>={
  'identity-transactions':'联系方式 liánxì fāngshì — cách liên hệ; 日期 rìqī — ngày; 修改 xiūgǎi — sửa; 安排 ānpái — sắp xếp.',
  'travel-transport':'耽误 dānwu — làm chậm; 赶上 gǎn shàng — kịp; 打算 dǎsuàn — dự định; 可能 kěnéng — có thể.',
  'health-care':'观察 guānchá — theo dõi; 安排 ānpái — sắp xếp; 结果 jiéguǒ — kết quả; 完全 wánquán — hoàn toàn; 本来 běnlái — vốn dĩ.',
  'home-family-leisure':'市场 shìchǎng — chợ; 散步 sànbù — đi dạo; 不过 búguò — nhưng; 得 děi — phải, trong 得早起.',
  'food-shopping':'既…也… jì…yě… — vừa…vừa…; 剩 shèng — còn lại; 辣 là — cay; 点菜 diǎn cài — gọi món; 顿 dùn — lượng từ bữa ăn; 花钱 huā qián — tiêu tiền.',
 };
const readings:Record<string,[string,string]>={
  'identity-transactions':['Rìqī gǎi hǎo, jīnglǐ quèrèn gōngzuò ānpái méiyǒu wèntí yǐhòu.','Sau khi sửa ngày và quản lý xác nhận lịch công việc không có vấn đề.'],
  'travel-transport':['Xiǎo Ān bā diǎn sìshí fēn dào zhàn, hòulái zuò shàng le jiǔ diǎn de huǒchē.','An đến ga 8:40, sau đó lên được tàu 9 giờ.'],
  'food-shopping':['Yīnwèi lánsè de héshì, érqiě méiyǒu chāochū yùsuàn.','Vì chiếc xanh vừa và không vượt ngân sách.'],
  'health-care':['Xià zhōuyī huílai fùchá.','Thứ Hai tuần sau trở lại tái khám.'],
  'home-family-leisure':['Shēnghuó fāngbiàn duō le, búguò wǎnshang yǒushí yǒu shēngyīn.','Sinh hoạt tiện hơn nhiều nhưng buổi tối đôi lúc có tiếng ồn.'],
 };

const items=buildNarrativeBatch({lessonPrefix:'hsk3-personal-life-narratives',level:'hsk3',manuscripts:personalNarratives,answerReadings:readings,support,extraPages:(id,taskId,m)=>m.suffix==='food-shopping'?foodExtension(id,taskId):[]});
writeFileSync('content/drafts/thien-lo-hsk3-personal-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({id:i.lessonId,pages:i.lessonPages.pages.length,core:i.coreVocabularyIds.length,retained:i.studioContent.vocabulary.length})));

