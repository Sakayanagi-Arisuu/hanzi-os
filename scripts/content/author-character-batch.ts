import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {characterContextReading} from '../../src/learning/characterContextReading';
import {characterContextException} from '../../src/learning/characterContextExceptions';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {characterFocus} from './character-batch-focus';
import {characterFocusContexts} from './character-focus-contexts';
import {characterTransfers} from './character-transfer-manuscripts';

const items=characterFocus.map((f,lessonIndex)=>{
 const lesson=LESSON_BY_ID.get(f.id)!,rich=getRichLessonContent(f.id)!;
 const context=characterFocusContexts[f.id];
 const transfer=characterTransfers[f.id];
 if(!transfer)throw new Error(`Missing transfer manuscript: ${f.id}`);
 if(!context)throw new Error(`Missing whole-expression reading: ${f.id}`);
 const otherContext=rich.characters.find(c=>c.contextWord!==f.context&&c.contextPinyin&&c.contextMeaningVi);
 if(!otherContext)throw new Error(`Missing distinct source example: ${f.id}`);
 const dialogue=[{speaker:'Cụm từ trọng tâm',hanzi:f.context,pinyin:context.pinyin,meaningVi:context.meaning},{speaker:'Từ khác trong bài',hanzi:otherContext.contextWord,pinyin:otherContext.contextPinyin,meaningVi:otherContext.contextMeaningVi}];
 if(!rich.characters.some(c=>c.hanzi===f.target))throw new Error(`Focus outside target inventory: ${f.id}`);
 const b=(id:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`${f.id}:v2:block:${id}`),...fields});
 const pages:LessonPageDocument['pages']=[
  {id:`${f.id}:v2:context`,title:'Nhận chữ trong từ đã học',layout:'scene',stage:'context',blocks:[b('goal',{title:lesson.title,body:'Đọc từ, tìm chữ mục tiêu, phân biệt hình gần giống rồi thử nhớ trong từ khác. Tập trung một cụm mỗi lần; có thể tạm dừng và trở lại. Gõ bằng IME hoặc chép mẫu là trợ giúp, chưa chứng minh tự viết được.'})]},
  {id:`${f.id}:v2:visual`,title:'Nhìn đúng chỗ khác nhau',layout:'split',stage:'understand',blocks:[b('contrast',{kind:'diagram',title:f.pair.join(' / '),diagram:{type:'comparison',description:f.note,nodes:f.pair.map((label,i)=>({id:`compare-${i}`,label,pinyin:'',meaningVi:i===0?'Chữ cần quan sát trong nhóm':'Chữ đối chiếu hình',note:'Không suy nghĩa hoặc thứ tự nét từ hình so sánh.',x:i,y:0}))}})]},
  {id:`${f.id}:v2:examples`,title:'Đọc cả cụm rồi tìm chữ',layout:'split',stage:'understand',blocks:dialogue.map((d,i)=>b(`context-${i}`,{kind:'dialogue',title:d.speaker,hanzi:d.hanzi,pinyin:d.pinyin,meaningVi:d.meaningVi}))},
 ];
 for(let start=0;start<rich.characters.length;start+=4){
  const group=rich.characters.slice(start,start+4);
  pages.push({id:`${f.id}:v2:glyphs-${start}`,title:`Chữ trong từ · cụm ${start/4+1}`,layout:'split',stage:'understand',blocks:group.map(c=>b(c.id,{kind:'dialogue',title:`Chữ mục tiêu: ${c.hanzi}`,hanzi:c.contextWord,pinyin:c.contextPinyin,meaningVi:c.contextMeaningVi,body:`Âm và nghĩa bên dưới thuộc cả từ ${c.contextWord}. ${characterContextReading(c)?`Âm ${c.hanzi} trong từ: ${characterContextReading(c)}.`:'Đọc cả từ; âm riêng của chữ cần đối chiếu theo ngữ cảnh, không tách máy móc.'} ${characterContextException(c)?.note??''} Tìm vị trí ${c.hanzi} trong từ rồi đọc cả từ trước khi sang mục tiếp theo.`}))});
  const target=group[0];
  pages.push({id:`${f.id}:v2:locate-${start}`,title:'Tìm chữ trong từ',layout:'workshop',stage:'practice',blocks:[b(`locate-${start}`,{kind:'activity',title:`Tìm ${target.hanzi} trong ${target.contextWord}`,body:`Nhìn từ ${target.contextWord}, gõ chữ ${target.hanzi} xuất hiện trong từ. Đây là nhận diện có mẫu, không phải nhớ độc lập.`,activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[target.hanzi],explanation:`${target.contextWord} chứa ${target.hanzi}. Âm cả từ: ${target.contextPinyin}; nghĩa cả từ: ${target.contextMeaningVi}.`,hint:''}})]});
 }
 // Delay retrieval until all model groups have been studied. Mask every copy of
 // the target (爸爸, 妈妈) so a repeated character cannot reveal the answer.
 for(let start=0;start<rich.characters.length;start+=4){
  const group=rich.characters.slice(start,start+4);
  pages.push({id:`${f.id}:v2:recall-${start}`,title:`Gọi lại chữ · cụm ${start/4+1}`,layout:'workshop',stage:'practice',blocks:group.map(c=>b(`recall-${c.id}`,{
   kind:'activity',title:'Nhớ chữ từ nghĩa và cách đọc',
   body:`Cụm từ đã học có nghĩa “${c.contextMeaningVi}”, đọc ${c.contextPinyin}: ${c.contextWord.split(c.hanzi).join('□')}. Điền một chữ vào ô vuông; nếu có nhiều ô, chúng dùng cùng một chữ. Thử nhớ trước khi quay lại mẫu. Pinyin và IME vẫn là hỗ trợ; đây không phải kiểm tra viết tay độc lập.`,
   activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:c.hanzi==='做'&&c.contextWord==='做'?['做','作']:[c.hanzi],explanation:`Chữ cần nhớ: ${c.hanzi}. Cụm đầy đủ: ${c.contextWord} · ${c.contextPinyin} · ${c.contextMeaningVi}. ${c.hanzi==='做'&&c.contextWord==='做'?'作 cũng có âm zuò và nghĩa làm nên được chấp nhận trong câu chỉ hỏi nghĩa này. Trong từ cụ thể phải chọn theo cách dùng: 做饭 (nấu ăn), 工作 (làm việc). ':''}${characterContextException(c)?.note??''} Nếu chưa nhớ, đối chiếu hình rồi thử lại ở lần ôn sau.`,hint:''},
  }))});
 }
 const alternatives=[...new Set([...f.pair,...rich.characters.map(c=>c.hanzi)])].filter(c=>c!==f.answer).slice(0,2);
 const options=[...alternatives];
 const answerIndex=lessonIndex % (alternatives.length+1);
 options.splice(answerIndex,0,f.answer);
 const repeatedTarget=f.context.split(f.target).length>2;
 const prompt=`Điền một chữ${repeatedTarget?' (hai ô dùng cùng một chữ)':''} để diễn đạt “${context.meaning}”, đọc ${context.pinyin}: ${f.context.split(f.target).join('____')}.`;
 const focusExplanation=f.note+(f.id==='characters-8'?' 星期天 cũng là chủ nhật, đọc xīngqītiān. Câu này cho âm xīngqīrì nên cần 日.':'');
 pages.push(
  {id:`${f.id}:v2:choice`,title:'Phân biệt trong từ',layout:'focus',stage:'practice',blocks:[b('choice',{kind:'activity',title:'Chọn đúng hình chữ',body:prompt,activity:{...emptyLessonActivity(),options:options.map((text,i)=>({id:`option-${i}`,text,feedback:i===answerIndex?`${f.answer} đúng vị trí trong ${f.context}.`:`${text} không tạo đúng từ ${f.context} trong yêu cầu này.`})),answerIds:[`option-${answerIndex}`],explanation:focusExplanation,hint:''}})]},
  {id:`${f.id}:v2:guided`,title:'Khôi phục chữ còn thiếu',layout:'workshop',stage:'practice',blocks:[b('guided',{kind:'activity',title:'Gõ chữ còn thiếu',body:prompt,activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[f.answer],explanation:`Đáp án ${f.answer}. ${f.meaning}. ${focusExplanation} Vừa thấy mẫu nên lượt này vẫn có hỗ trợ.`,hint:''}})]},
  {id:`${f.id}:v2:transfer`,title:'Dùng chữ trong tình huống mới',layout:'workshop',stage:'transfer',blocks:[b('transfer',{kind:'activity',title:'Tự viết câu rồi đối chiếu',body:transfer.prompt+' Có thể dùng Pinyin nếu chưa nhập được chữ; ghi rõ phần cần trợ giúp.',activity:{...emptyLessonActivity(),type:'rubric',rubric:transfer.criteria.map((guidance,index)=>({id:`transfer-${index}`,label:`Tự kiểm ${index+1}`,guidance})),explanation:`Một phương án: ${transfer.hanzi}\n${transfer.pinyin}\n${transfer.meaning}\nĐối chiếu ý và chữ cần dùng; không bắt buộc giống từng ký tự nếu bạn có cách nói đúng khác. Tự đối chiếu chưa phải điểm viết độc lập.`,hint:''}})]},
  {id:`${f.id}:v2:recap`,title:'Mang chữ sang lần ôn tiếp',layout:'focus',stage:'transfer',blocks:[b('recap',{title:'Từ nhận diện đến tự nhớ',body:`Đối chiếu lại ${f.pair.join('/')} rồi ôn những từ bạn còn nhầm. Quay lại một ngày khác và thử trước khi mở mẫu. Xem hết trang hoặc chọn đúng khi còn mẫu chưa chứng minh đã thuộc chữ.`})]},
 );
 const lessonPages:LessonPageDocument={version:1,art:'reading',pages};
 const errors=validateLessonPages(lessonPages);if(errors.length)throw new Error(`${f.id}: ${errors.join('; ')}`);
 const studioContent={targetLessonId:f.id,titleZh:lesson.chineseTitle,objectiveVi:lesson.objective,conceptVi:'Nhận chữ trong từ và phân biệt hình',ruleVi:f.note,pitfallVi:'Không gán âm hoặc nghĩa cả từ cho một chữ. Nhìn mẫu/IME chưa là nhớ và viết độc lập.',checkpointVi:transfer.prompt,prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:[{pattern:'Nhận diện chữ trong từ',explanationVi:f.note,modelExample:{hanzi:f.context,pinyin:context.pinyin,meaningVi:context.meaning},guidedPractice:{promptVi:prompt,modelAnswerHanzi:f.answer,modelAnswerPinyin:f.pinyin,modelAnswerMeaningVi:f.meaning}}],exercises:[{promptVi:prompt,answer:f.answer,answerPinyin:f.pinyin,answerMeaningVi:f.meaning,distractors:alternatives,explanationVi:f.note}],lessonPages,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[f.id],sourceCharacterIds:rich.characters.map(c=>c.id),sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:[],review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 return {lessonId:f.id,title:lesson.title,level:'hsk1',lessonPages,studioContent,editorialStatus:'draft-needs-review'};
});
writeFileSync('content/drafts/thien-lo-character-batch-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((n,i)=>n+i.lessonPages.pages.length,0),characters:items.reduce((n,i)=>n+i.studioContent.sourceCharacterIds.length,0)});
