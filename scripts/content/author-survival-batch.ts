import {writeFileSync} from 'node:fs';
import {survivalManuscripts} from './survival-batch-manuscripts';
import {survivalPractice} from './survival-batch-practice';
import {survivalExamples} from './survival-batch-examples';
import {buildAuthoredBatch} from './build-authored-batch';
const answerReadings:Record<string,[string,string]>={
 'survival-1':['Duìbuqǐ.','Xin lỗi.'],
 'survival-2':['tāmen','chúng nó (vật/động vật)'],
 'survival-3':['Nǐ de míngzi zěnme xiě?','Tên bạn viết thế nào?'],
 'survival-4':['dìdi','em trai'],
 'survival-5':['Tā shì wǒ de péngyou.','Cô ấy là bạn của tôi.'],
 'survival-6':['hǎotīng','hay; dễ nghe'],
 'survival-7':['Wǒ jīntiān méiyǒu shíjiān.','Hôm nay tôi không có thời gian.'],
 'survival-8':['Wǒ wǎnshang zài gěi nǐ dǎ diànhuà ba.','Tối tôi gọi lại cho bạn nhé.'],
 'survival-9':['Wǒ hái méi qǐchuáng.','Tôi vẫn chưa dậy.'],
};
const items=buildAuthoredBatch({manuscripts:survivalManuscripts,practiceByLesson:survivalPractice,examples:survivalExamples,answerReadings});
writeFileSync('content/drafts/thien-lo-survival-batch-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((n,i)=>n+i.lessonPages.pages.length,0),status:'draft-not-published'});
