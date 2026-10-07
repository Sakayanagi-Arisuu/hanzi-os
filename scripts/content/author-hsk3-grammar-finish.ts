import './author-hsk3-event';
import './author-hsk3-comparison';
import './author-hsk3-discourse';
import {readFileSync,writeFileSync} from 'node:fs';
const items=['event','comparison','discourse'].flatMap(group=>JSON.parse(readFileSync(`content/drafts/thien-lo-hsk3-${group}-v2.json`,'utf8')).items);
if(items.length!==9||new Set(items.map(item=>item.lessonId)).size!==9)throw Error('Expected nine distinct manuscripts');
writeFileSync('content/drafts/thien-lo-hsk3-grammar-finish-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({combined:items.length});
