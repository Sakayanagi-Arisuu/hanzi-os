import {expect,it} from 'vitest';
import {activeLearnerZone,learnerPrimaryZones,learnerToolDestinations} from './learnerNavigation';

it('exposes the same five functional zones in canonical order with lore retained',()=>{
 expect(learnerPrimaryZones.map(zone=>zone.label)).toEqual(['Học','Ôn','Nói','Luyện','Hồ sơ']);
 expect(new Set(learnerPrimaryZones.map(zone=>zone.id)).size).toBe(5);
 expect(learnerPrimaryZones.every(zone=>zone.lore.length>0)).toBe(true);
 expect(learnerPrimaryZones.filter(zone=>zone.to===null).map(zone=>zone.id)).toEqual(['practice']);
});

it('preserves all former destinations, assessment, profile and premium without external or duplicate tool routes',()=>{
 const destinations=new Set([...learnerPrimaryZones.flatMap(zone=>zone.to?[zone.to]:[]),...learnerToolDestinations.map(item=>item.to)]);
 expect([...destinations].sort()).toEqual(['/','/analytics','/assessment','/characters','/dictionary','/exams','/mistakes','/path','/profile','/profile/premium','/pronunciation','/reader','/review'].sort());
 expect(new Set(learnerToolDestinations.map(item=>item.to)).size).toBe(learnerToolDestinations.length);
 expect(learnerToolDestinations.every(item=>item.description&&item.to.startsWith('/')&&!item.to.startsWith('//'))).toBe(true);
});

it('keeps the active zone for nested sessions, recovery, history and account routes',()=>{
 const cases={learn:['/','/path','/path/practice','/lesson/daily-1'],review:['/review','/mistakes'],speak:['/pronunciation','/pronunciation/quest/one'],
 practice:['/reader/series/one/chapter/two','/characters/session?resume=1','/exams/history','/dictionary?view=detail&word=chi','/assessment/placement/hsk1'],
 profile:['/profile','/profile/premium','/analytics','/account/security']};
 for(const [zone,paths] of Object.entries(cases))for(const path of paths)expect(activeLearnerZone(path)).toBe(zone);
});

it('does not match similar prefixes, administrative routes or untrusted external paths',()=>{
 for(const path of ['/readerish','/reviews','/profiles','/admin','https://example.invalid/path','//example.invalid/path',''])expect(activeLearnerZone(path)).toBeNull();
});
