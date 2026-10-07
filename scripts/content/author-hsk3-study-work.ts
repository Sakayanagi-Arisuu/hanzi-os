import {writeFileSync} from 'node:fs';
import {buildNarrativeBatch} from './build-narrative-batch';
import {studyWorkNarratives} from './hsk3-study-work-narratives';
import {studyWorkExtensions} from './hsk3-study-work-extensions';

const order=['courses-learning','campus-education','office-tasks','colleague-workplace','career-experience'];
const manuscripts=[...studyWorkNarratives,...studyWorkExtensions].sort((a,b)=>order.indexOf(a.suffix)-order.indexOf(b.suffix));
const items=buildNarrativeBatch({lessonPrefix:'hsk3-study-work-accounts',level:'hsk3',manuscripts,answerReadings:{
 'courses-learning':['Tā néng shuō qīngchu zhè piān gùshi de shùnxù.','Anh kể rõ được thứ tự câu chuyện này.'],
 'campus-education':['Tā gǔlì Xiǎo Yǔ zìjǐ xiàng lǎoshī tíwèn.','Mẹ khuyến khích Tiểu Vũ tự hỏi giáo viên.'],
 'office-tasks':['Cídiǎn zài lùyīnshì de yǐzi shàng.','Từ điển ở trên ghế trong phòng thu.'],
 'colleague-workplace':['Dì sān wèi kèrén de dìzhǐ hái méiyǒu quèrèn.','Địa chỉ khách thứ ba chưa được xác nhận.'],
 'career-experience':['Wánchéng le yì zhāng cǎotú.','Đã hoàn thành một phác thảo.'],
}});
writeFileSync('content/drafts/thien-lo-hsk3-study-work-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({id:i.lessonId,pages:i.lessonPages.pages.length,core:i.coreVocabularyIds.length,retained:i.studioContent.vocabulary.length})));
