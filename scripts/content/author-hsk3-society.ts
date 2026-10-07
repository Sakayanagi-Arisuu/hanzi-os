import {writeFileSync} from 'node:fs';
import {buildNarrativeBatch} from './build-narrative-batch';
import {societyNarratives} from './hsk3-society-narratives';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import type {LessonDiagram} from '../../src/learning/lessonDiagram';

const prefix='hsk3-society-arts-sports-reports';
const answerReadings:Record<string,[string,string]>={
  'modern-life':['Yéye píngrì yòng shǒujī, zhōumò hái kàn bàozhǐ.','Ông dùng điện thoại ngày thường và vẫn đọc báo cuối tuần.'],
  'city-development':['Gōngzuò rényuán xià ge yuè wèn dàjiā yòng de fāng bù fāngbiàn.','Tháng sau nhân viên mới hỏi mọi người sử dụng có tiện không.'],
  'arts-activities':['Zhōusì liàn le liǎng biàn, yě liú shíjiān xiūxi.','Thứ Năm cô tập hai lượt và vẫn dành thời gian nghỉ.'],
  'sports-introduction':['Xiǎo Dīng liàn le jǐ ge láihuí, méiyǒu cānjiā bǐsài.','Tiểu Đinh đánh qua lại vài lượt và không thi đấu.'],
  'competition-report':['Jiǎ duì shí’èr fēn, Yǐ duì shí fēn, Jiǎ duì yíng le.','Đội A có 12 điểm, đội B 10 điểm; A thắng.'],
};
const visuals:Record<string,{title:string;diagram:LessonDiagram}>={
  'modern-life':{title:'Bốn chặng của thói quen',diagram:{type:'timeline',description:'Mốc thời gian của đúng gia đình trong bài: đọc báo hằng ngày → báo đổi lịch → tập đọc điện thoại → dùng hai cách ở hai thời điểm. Sơ đồ không nói mọi gia đình đều như vậy.',nodes:[
    {id:'before',label:'以前',pinyin:'yǐqián',meaningVi:'trước đây',note:'Báo giấy mỗi sáng.',x:0,y:0},
    {id:'change',label:'后来',pinyin:'hòulái',meaningVi:'sau đó',note:'Báo chuyển sang mỗi tuần một số.',x:0,y:1},
    {id:'learn',label:'刚开始',pinyin:'gāng kāishǐ',meaningVi:'lúc mới bắt đầu',note:'Đọc điện thoại chậm; cháu giúp.',x:0,y:2},
    {id:'now',label:'现在',pinyin:'xiànzài',meaningVi:'bây giờ',note:'Ngày thường điện thoại, cuối tuần báo.',x:0,y:3},
  ]}},
  'city-development':{title:'Ba tầng và hai mốc thời gian',diagram:{type:'comparison',description:'Công năng hiện có sau khi mở cửa tuần trước: tầng một làm thẻ, tầng hai đọc sách, tầng ba học. Hỏi cư dân về hiệu quả là kế hoạch tháng sau, không phải công năng tầng mới.',nodes:[
    {id:'floor1',label:'一层',pinyin:'yì céng',meaningVi:'tầng một',note:'Làm thẻ · đã mở.',x:0,y:0},
    {id:'floor2',label:'二层',pinyin:'èr céng',meaningVi:'tầng hai',note:'Đọc sách · đã mở.',x:1,y:0},
    {id:'floor3',label:'三层',pinyin:'sān céng',meaningVi:'tầng ba',note:'Phòng học nhỏ · đã mở.',x:2,y:0},
  ]}},
  'arts-activities':{title:'Từ tổng duyệt đến biểu diễn',diagram:{type:'timeline',description:'Tách ý định tập thêm vào thứ Tư khỏi việc đã thực hiện: nghỉ thứ Tư, tập hai lượt thứ Năm, biểu diễn thứ Sáu. Không có điểm số hoặc giải thưởng trong nguồn.',nodes:[
    {id:'wed',label:'周三',pinyin:'Zhōusān',meaningVi:'thứ Tư',note:'Tổng duyệt; muốn tập thêm nhưng được khuyên nghỉ.',x:0,y:0},
    {id:'thu',label:'周四',pinyin:'Zhōusì',meaningVi:'thứ Năm',note:'Tập hai lượt và có thời gian nghỉ.',x:0,y:1},
    {id:'fri',label:'周五',pinyin:'Zhōuwǔ',meaningVi:'thứ Sáu',note:'Biểu diễn hoàn thành, bạn chụp ảnh.',x:0,y:2},
  ]}},
  'sports-introduction':{title:'Các bước của buổi thử quần vợt',diagram:{type:'sequence',description:'Buổi trải nghiệm dành cho người mới: đăng ký → chọn vợt → nghe huấn luyện viên → tập theo cặp. Tuần sau mới là dự định của Tiểu Đinh; không có thi đấu.',nodes:[
    {id:'register',label:'报名',pinyin:'bàomíng',meaningVi:'đăng ký',note:'Chỉ ghi tên.',x:0,y:0},
    {id:'choose',label:'选择球拍',pinyin:'xuǎnzé qiúpāi',meaningVi:'chọn vợt',note:'Chọn vợt phù hợp.',x:1,y:0},
    {id:'learn',label:'听教练讲',pinyin:'tīng jiàoliàn jiǎng',meaningVi:'nghe huấn luyện viên',note:'Học cách cầm vợt.',x:2,y:0},
    {id:'practice',label:'两人一组练习',pinyin:'liǎng rén yì zǔ liànxí',meaningVi:'tập theo cặp',note:'Đánh qua lại vài lượt.',x:3,y:0},
  ]}},
  'competition-report':{title:'Tỉ số đầu và cuối trận',diagram:{type:'comparison',description:'A–B: hết hiệp đầu 6–8; sau đó A thêm 6, B thêm 2; chung cuộc 12–10. Đây là dữ liệu hư cấu của một trận, không phải thành tích dài hạn.',nodes:[
    {id:'half',label:'上半场结束',pinyin:'shàng bàn chǎng jiéshù',meaningVi:'hết hiệp đầu',note:'A 6 · B 8.',x:0,y:0},
    {id:'added',label:'后来',pinyin:'hòulái',meaningVi:'sau đó',note:'A thêm 6 · B thêm 2.',x:1,y:0},
    {id:'final',label:'比赛结束',pinyin:'bǐsài jiéshù',meaningVi:'kết thúc trận',note:'A 12 · B 10; A thắng.',x:2,y:0},
  ]}},
};
const items=buildNarrativeBatch({lessonPrefix:prefix,level:'hsk3',manuscripts:societyNarratives,answerReadings});
for(const item of items){
  const suffix=item.lessonId.slice(prefix.length+1),visual=visuals[suffix];
  if(!visual)throw Error(`Missing visual decision: ${item.lessonId}`);
  item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:diagram`,title:visual.title,layout:'focus',stage:'understand',blocks:[{
    ...emptyLessonBlock(`${item.lessonId}:v2:block:diagram`),kind:'diagram',title:visual.title,diagram:visual.diagram,
  }]});
  item.studioContent.lessonPages=item.lessonPages;
  const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];
  if(errors.length)throw Error(`${item.lessonId}: ${errors.join('; ')}`);
}
writeFileSync('content/drafts/thien-lo-hsk3-society-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({lessonId:i.lessonId,pages:i.lessonPages.pages.length,activities:i.lessonPages.pages.flatMap(p=>p.blocks.filter(b=>b.activity)).length,core:i.coreVocabularyIds.length})));
