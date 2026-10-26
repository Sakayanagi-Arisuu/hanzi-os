import {expect,it} from 'vitest';
import {selectDictionaryEntry} from './dictionarySelection';

const first={id:'first',sourceStableKey:'legacy-first'},second={id:'second',sourceStableKey:'legacy-second'};
const select=(overrides:Partial<Parameters<typeof selectDictionaryEntry>[0]>={})=>selectDictionaryEntry({words:[first,second],results:[first,second],detail:true,requestedWordId:'second',selectedId:'first',...overrides});

it('does not substitute a saved or first result when an explicit detail source is missing, empty or filtered',()=>{
  expect(select({requestedWordId:'removed-source'})).toBeUndefined();
  expect(select({requestedWordId:''})).toBeUndefined();
  expect(select({results:[first]})).toBe(second);
  expect(select({words:[],results:[first]})).toBeUndefined();
});

it('resolves a delayed source when it arrives, without requiring or mutating another selection',()=>{
  const before=Object.freeze([first]);
  expect(select({words:before})).toBeUndefined();
  expect(select({words:Object.freeze([...before,second])})).toBe(second);
  expect(before).toEqual([first]);
});

it('preserves stable aliases, gives exact IDs priority and refuses ambiguous aliases',()=>{
  expect(select({requestedWordId:'legacy-second'})).toBe(second);
  const alias={id:'alias-row',sourceStableKey:'second'};
  expect(select({words:[alias,second]})).toBe(second);
  expect(select({words:[second,{id:'duplicate-alias',sourceStableKey:'legacy-second'}],requestedWordId:'legacy-second'})).toBeUndefined();
});

it('keeps ordinary search and detail without an explicit source on their previous selection path',()=>{
  expect(select({detail:false,requestedWordId:'removed-source',selectedId:'second'})).toBe(second);
  expect(select({detail:false,requestedWordId:'second',results:[first]})).toBe(first);
  expect(select({requestedWordId:null,selectedId:'second'})).toBe(second);
  expect(select({requestedWordId:null,selectedId:'absent'})).toBe(first);
});
