import {emptyLessonBlock,type LessonBlock} from '../lessonPages';
import {emptyLessonActivity} from '../lessonActivities';
import {captureLessonPageFirstAttempt} from '../lessonPageAttempt';
import type {LessonReadingSession} from '../lessonReadingSession';

export const pageHistoryFixture=():LessonReadingSession=>{
  const activities:LessonBlock[]=(['choice','order','cloze','rubric'] as const).map(type=>({...emptyLessonBlock(type),kind:'activity',body:'Tự luyện',
    activity:{...emptyLessonActivity(),type,options:[{id:'one',text:'在',feedback:'Vị trí'},{id:'two',text:'是',feedback:'Giới thiệu'}],
      answerIds:type==='order'?['one','two']:['one'],acceptedAnswers:['在'],explanation:'Đối chiếu vị trí.',
      rubric:[{id:'meaning',label:'Ý nghĩa',guidance:'Kiểm tra ý chính.'}]}}));
  const blocks:LessonBlock[]=[...activities,
    {...emptyLessonBlock('reflection'),kind:'reflection',body:'Tự diễn đạt.',hanzi:'在'},
    {...emptyLessonBlock('dictation'),kind:'dictation',body:'Nghe chép.',hanzi:'在',pinyin:'zài',meaningVi:'Ở'},
    {...emptyLessonBlock('reading'),kind:'reading',reading:{instruction:'Đọc.',notePrompt:'Ghi chú.',paragraphs:[{id:'para',hanzi:'在',pinyin:'zài',meaningVi:'Ở'}]}},
    {...emptyLessonBlock('dialogue'),kind:'dialogue',hanzi:'在',pinyin:'zài',meaningVi:'Ở'},
    {...emptyLessonBlock('explanation'),body:'Giải thích.'},
    {...emptyLessonBlock('image'),kind:'image',imageSrc:'/images/test.webp',alt:'Minh họa',provenance:'Fixture nguyên bản'},
    {...emptyLessonBlock('diagram'),kind:'diagram',diagram:{type:'sequence',description:'Trình tự',nodes:[0,1].map(index=>({id:`node-${index}`,label:'在',pinyin:'zài',meaningVi:'Ở',note:'',x:index,y:0}))}},
    {...emptyLessonBlock('audio'),kind:'audio',media:{src:'/api/content/media/00000000-0000-0000-0000-000000000000.mp3',mimeType:'audio/mpeg',metadata:{title:'Âm fixture',alt:'',caption:'',provenance:'Fixture',license:'Test',sourceKind:'synthetic',transcript:'在',focalX:50,focalY:50,humanReviewed:false}}}];
  return {version:1,lessonId:'boot-1',index:0,blockIndex:0,showTranscript:false,document:{version:1,pages:[{id:'page',title:'Bài fixture',layout:'workshop',blocks}]},
    drafts:Object.fromEntries(blocks.filter(block=>['activity','reflection','dictation','reading'].includes(block.kind)).map(block=>[block.id,
      captureLessonPageFirstAttempt({text:'错',answerIds:block.id==='choice'?['two']:block.id==='order'?['two','one']:[],revealed:false,compared:false},'2026-10-18T03:00:00.000Z')])),
    observations:blocks.map(block=>({pageId:'page',blockId:block.id,action:'view',occurredAt:'2026-10-18T02:59:00.000Z'}))};
};
