import {execFileSync} from 'node:child_process';
import {pinyinCorrectionScopes} from '../content/hsk4-pinyin-source-corrections.mjs';
for(const lessonId of Object.keys(pinyinCorrectionScopes)){
 execFileSync(process.execPath,['--import','tsx','scripts/demo/release-hsk4-source-pinyin.mjs','--lesson='+lessonId],{stdio:'inherit'});
 if(process.argv.includes('--apply'))execFileSync(process.execPath,['--import','tsx','scripts/demo/release-hsk4-source-pinyin.mjs','--lesson='+lessonId,'--apply'],{stdio:'inherit'});
}
