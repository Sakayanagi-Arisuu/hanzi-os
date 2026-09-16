import {writeFileSync} from 'node:fs';
import {journeyManuscripts} from './journey-batch-manuscripts';
import {buildAuthoredBatch} from './build-authored-batch';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
const examples:Record<string,[string,string,string]>={
 '去':['我去学校。','Wǒ qù xuéxiào.','Tôi đi đến trường.'],
 '坐':['我坐出租车去学校。','Wǒ zuò chūzūchē qù xuéxiào.','Tôi đi taxi đến trường.'],
 '看':['我在家看电视。','Wǒ zài jiā kàn diànshì.','Tôi xem tivi ở nhà.'],
 '做':['你今天做什么？','Nǐ jīntiān zuò shénme?','Hôm nay bạn làm gì?'],
};
const items=buildAuthoredBatch({manuscripts:journeyManuscripts,practiceByLesson:Object.fromEntries(journeyManuscripts.map(m=>[m.id,m.practice])),answerReadings:Object.fromEntries(journeyManuscripts.map(m=>[m.id,m.answerReading])),examples});
const scenes:[string,string,string][][]=[
 [['家','Jiā','Nhà · người trả lời đang ở đây'],['出租车','Chūzūchē','Taxi · phương tiện của người trả lời'],['学校','Xuéxiào','Trường · người hỏi đang ở đây']],
 [['电影院：看电影','Diànyǐngyuàn: kàn diànyǐng','Ở rạp: xem phim'],['在家：听歌','Zài jiā: tīng gē','Ở nhà: nghe nhạc']],
];
for(const [index,item] of items.entries()){
 item.lessonPages.art='city';
 item.lessonPages.pages.splice(1,0,{id:`${item.lessonId}:v2:visual`,title:index===0?'Xác định điểm nhìn trước khi nói':'Chọn hoạt động và nơi thực hiện',layout:'scene',stage:'context',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:visual`),kind:'diagram',title:'Đọc sơ đồ tình huống',diagram:{type:index===0?'sequence':'comparison',description:index===0?'Người trả lời ở nhà đi taxi đến trường. Người hỏi ở trường dùng 来; người ở nhà nói 去 theo điểm nhìn của mình.':'Hai người chọn hai hoạt động khác nhau. Cột rạp là 看电影, cột ở nhà là 听歌; không đổi hoạt động giữa hai người.',nodes:scenes[index].map(([label,pinyin,meaningVi],i)=>({id:`node-${i}`,label,pinyin,meaningVi,note:'',x:i,y:0}))}}]});
 const errors=validateLessonPages(item.lessonPages);if(errors.length)throw new Error(errors.join('; '));
}
writeFileSync('content/drafts/thien-lo-journey-batch-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((n,i)=>n+i.lessonPages.pages.length,0)});
