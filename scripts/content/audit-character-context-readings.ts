import {writeFileSync} from 'node:fs';
import {RELEASED_RICH_LESSONS} from '../../src/learning/richLessonContent';
import {characterContextReading} from '../../src/learning/characterContextReading';
import {characterContextException} from '../../src/learning/characterContextExceptions';
const lessons=RELEASED_RICH_LESSONS.filter(l=>l.lessonId.startsWith('characters-')).map(l=>({lessonId:l.lessonId,characters:l.characters.map(c=>({id:c.id,hanzi:c.hanzi,contextWord:c.contextWord,contextPinyin:c.contextPinyin,readingInContext:characterContextReading(c),editorialNote:characterContextException(c)?.note??null,status:characterContextException(c)?'explicit-editorial-context':characterContextReading(c)?'source-aligned':'needs-context-review'}))}));
const report={schemaVersion:1,scope:'HSK1 character lessons; exact context alignment, not pronunciation/mastery validation',lessons};
writeFileSync('docs/thien-lo-redesign-review/character-context-audit.json',JSON.stringify(report,null,2)+'\n');
console.log({lessons:lessons.length,characters:lessons.reduce((n,l)=>n+l.characters.length,0),needsReview:lessons.flatMap(l=>l.characters).filter(c=>c.status==='needs-context-review').length});
