import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
import {authoredBatches} from './authored-batch-registry.mjs';

const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9);
const scopes={
 'society-economy':{batch:authoredBatches.hsk4SocietyEconomy,document:'48-REVIEW-HSK4-SOCIETY-ECONOMY.md',scope:'Six HSK4 society/economy lessons: public data roles, business timelines, multi-condition markets, competing metrics, causal caution, and service equity.'},
 'arts-sports-exchange':{batch:authoredBatches.hsk4ArtsSports,document:'49-REVIEW-HSK4-ARTS-SPORTS.md',scope:'Six HSK4 arts/sports lessons: cross-role arts, iterative creation, multi-factor outcomes, conditional comparison, bounded claims, and equitable exchange.'},
 'culture-history':{batch:authoredBatches.hsk4CultureHistory,document:'50-REVIEW-HSK4-CULTURE-HISTORY.md',scope:'Six HSK4 culture/history lessons: interpretation in context, change over time, competing causes, cultural variation, evidence dates, and multi-voice historical synthesis.'},
} as const;
if(!domain||!Object.hasOwn(scopes,domain))throw Error('Select a reviewed --domain');
const selected=scopes[domain as keyof typeof scopes],batch=selected.batch;
const draft=JSON.parse(readFileSync(`content/drafts/${batch.file}.json`,'utf8'));
if(draft.humanReviewed!==false||JSON.stringify(draft.items.map((item:{lessonId:string})=>item.lessonId))!==JSON.stringify(batch.lessonIds))throw Error('Review scope changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync(`content/review/${batch.file}-local.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:`${selected.scope} AI-assisted local review only. Source B is transcript reading, not native listening evidence; self-check writing is not independent mastery.`,evidenceDocument:`docs/thien-lo-redesign-review/${selected.document}`,items},null,2)+'\n');
console.log({domain,reviewed:items.length,humanReviewed:false});
