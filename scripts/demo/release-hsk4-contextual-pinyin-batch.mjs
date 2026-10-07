import {execFileSync} from 'node:child_process';
import {contextualPinyinPlan} from '../content/hsk4-contextual-pinyin.mjs';
for(const {lessonId} of contextualPinyinPlan.lessons){
 const args=['--import','tsx','scripts/demo/release-hsk4-source-pinyin.mjs','--contextual','--lesson='+lessonId];
 execFileSync(process.execPath,args,{stdio:'inherit'});
 if(process.argv.includes('--apply'))execFileSync(process.execPath,[...args,'--apply'],{stdio:'inherit'});
}
