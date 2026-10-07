import {writeFileSync} from 'node:fs';
import {buildNarrativeBatch} from './build-narrative-batch';
import {cultureNarratives} from './hsk3-culture-narratives';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import type {LessonDiagram} from '../../src/learning/lessonDiagram';

const prefix='hsk3-culture-tradition-descriptions';
const answerReadings:Record<string,[string,string]>={
  'regional-cuisine':['Xiǎo Lín xuǎn shǎo táng mǐfàn, Xiǎo Wáng xuǎn jiā là de cài.','Tiểu Lâm chọn cơm ít đường; Tiểu Vương chọn món thêm cay.'],
  'tableware-etiquette':['Xiān wèn, duìfāng tóngyì hòu cái yòng gōngkuài jiā cài.','Hỏi trước; sau khi được đồng ý mới dùng đũa chung gắp thức ăn.'],
  'festivals-customs':['Xiān chī fàn, zài dào wàimiàn kàn yuèliang.','Ăn trước rồi ra ngoài ngắm trăng.'],
  'regional-differences':['Qīng Zhèn èrshí fēnzhōng, Sōng Cūn yí ge xiǎoshí.','Thị trấn Thanh hai mươi phút; làng Tùng một giờ.'],
  'customs-comparison':['Liǎng ge rén qù zuò kè yǐqián dōu yuē le shíjiān.','Cả hai đều hẹn giờ trước khi đi làm khách.'],
};
const visualRows:Record<string,{type:LessonDiagram['type'];title:string;description:string;nodes:Array<[string,string,string,string]>}>={
  'regional-cuisine':{type:'comparison',title:'Hai khẩu vị, hai lựa chọn',description:'Bảng chỉ ghi sở thích và món được chọn của Tiểu Lâm, Tiểu Vương trong bữa ăn giả định; không so sánh ẩm thực các vùng.',nodes:[['ask','先问','hỏi trước','Tiểu Chu hỏi khẩu vị trước khi nấu.'],['lin','小林','Tiểu Lâm','Thích ngọt, không ăn nhiều đường → cơm ít đường.'],['wang','小王','Tiểu Vương','Thích cay, không thích cơm ngọt → món thêm cay.']]},
  'tableware-etiquette':{type:'sequence',title:'Hỏi trước khi giúp',description:'Quy trình của đúng bữa ăn ở nhà dì Trần: hỏi → được đồng ý → dùng đũa gắp chung. Hai đôi đũa có công dụng khác nhau.',nodes:[['private','自己的筷子','đũa riêng','Dùng với bát riêng.'],['shared','公筷','đũa chung','Dùng lấy thức ăn từ đĩa chung.'],['ask','先问','hỏi trước','Tiểu Phương đề nghị giúp.'],['agree','说“好”','đồng ý','Người được hỏi đồng ý rồi mới gắp.']]},
  'festivals-customs':{type:'timeline',title:'Lịch gặp của gia đình Tiểu Vũ',description:'Thứ Sáu mua đồ; tối thứ Bảy khách đến, ăn rồi ngắm trăng. Một khách chọn trái cây thay bánh. Đây chỉ là lịch một gia đình.',nodes:[['fri','星期五','thứ Sáu','Mua trái cây và hai loại bánh.'],['arrival','周六晚上','tối thứ Bảy','Khách đến.'],['meal','先吃饭','ăn trước','Một khách không ăn bánh.'],['moon','再看月亮','ngắm trăng sau','Mọi người ra ngoài.']]},
  'regional-differences':{type:'comparison',title:'Hai địa điểm trong một tuần',description:'Chỉ so sánh quãng đường từ ga và thời tiết tuần này. Bảng không suy ra khí hậu hoặc an toàn của mọi vùng.',nodes:[['qing','青镇','thị trấn Thanh','Từ ga 20 phút · ban ngày khá nóng · mang nước.'],['song','松村','làng Tùng','Từ ga 1 giờ · sáng tối khá lạnh · mang áo khoác.']]},
  'customs-comparison':{type:'comparison',title:'Điểm chung và điểm khác của hai lần làm khách',description:'Hai lời kể đều hẹn giờ trước. A uống trà, không ăn tối; B ăn tối và được hỏi về thức ăn. Mẫu hai người không đại diện một nền văn hóa.',nodes:[['same','都先约时间','đều hẹn trước','Điểm chung được cả hai nguồn xác nhận.'],['a','朋友甲','bạn A','Đến nhà hàng xóm, uống trà; không có bữa tối.'],['b','朋友乙','bạn B','Đến nhà bạn học, được mời ăn tối.']]},
};
const diagramPinyin:Record<string,string[]>={
  'regional-cuisine':['xiān wèn','Xiǎo Lín','Xiǎo Wáng'],
  'tableware-etiquette':['zìjǐ de kuàizi','gōngkuài','xiān wèn','shuō hǎo'],
  'festivals-customs':['Xīngqīwǔ','Zhōuliù wǎnshang','xiān chī fàn','zài kàn yuèliang'],
  'regional-differences':['Qīng Zhèn','Sōng Cūn'],
  'customs-comparison':['dōu xiān yuē shíjiān','péngyou Jiǎ','péngyou Yǐ'],
};
const items=buildNarrativeBatch({lessonPrefix:prefix,level:'hsk3',manuscripts:cultureNarratives,answerReadings});
for(const item of items){
  const suffix=item.lessonId.slice(prefix.length+1),v=visualRows[suffix];
  if(!v)throw Error(`Missing visual decision: ${item.lessonId}`);
  const diagram:LessonDiagram={type:v.type,description:v.description,nodes:v.nodes.map(([id,label,meaningVi,note],i)=>({id,label,pinyin:diagramPinyin[suffix][i],meaningVi,note,x:v.type==='timeline'?0:i,y:v.type==='timeline'?i:0}))};
  item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:diagram`,title:v.title,layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:diagram`),kind:'diagram',title:v.title,diagram}]});
  item.studioContent.lessonPages=item.lessonPages;
  const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];
  if(errors.length)throw Error(`${item.lessonId}: ${errors.join('; ')}`);
}
writeFileSync('content/drafts/thien-lo-hsk3-culture-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({lessonId:i.lessonId,pages:i.lessonPages.pages.length,activities:i.lessonPages.pages.flatMap(p=>p.blocks.filter(b=>b.activity)).length,core:i.coreVocabularyIds.length})));
