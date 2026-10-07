import { describe, expect, it } from 'vitest';
import { RELEASED_LESSONS, WORD_BY_ID } from '../data/curriculum';
import { getRichLessonContent } from './richLessonContent';
import { getPremiumRichLesson } from '../server/premiumRichLesson';
import { lessonPagesFromRich, validateLessonPages, safeLessonImage, emptyLessonBlock, isEditableLessonPageDocument, type LessonPageDocument } from './lessonPages';
import { mergePublishedStudioLessonEnhancement } from '../content/publishedStudioClient';

describe('editable lesson pages',()=>{
  it('preserves per-page scene provenance and rejects unsafe or uncredited illustrations',()=>{
    const doc:LessonPageDocument={version:1,pages:[{id:'scene',title:'Gặp ở ga',layout:'scene',illustration:{src:'/lessons/ngoc-dien/station-meeting-v1.webp',alt:'Hai bạn ở cửa ga',provenance:'Original AI-assisted HANZI.OS'},blocks:[{...emptyLessonBlock('context'),body:'Bạn nhận lời nhắn hẹn gặp.'}]}]};
    expect(validateLessonPages(doc)).toEqual([]);
    expect(isEditableLessonPageDocument(JSON.parse(JSON.stringify(doc)))).toBe(true);
    for(const src of ['https://example.com/a.png','/../a.webp','//example.com/a.webp']){
      const invalid={...doc,pages:[{...doc.pages[0],illustration:{...doc.pages[0].illustration!,src}}]};
      expect(validateLessonPages(invalid).length).toBeGreaterThan(0);
      expect(isEditableLessonPageDocument(invalid)).toBe(false);
    }
    doc.pages[0].illustration={...doc.pages[0].illustration!,caption:'Hẹn ở cửa ga.',focalX:35,focalY:60};
    expect(validateLessonPages(doc)).toEqual([]);
    expect(isEditableLessonPageDocument(JSON.parse(JSON.stringify(doc)))).toBe(true);
    for(const fields of [{focalX:-1},{focalY:101},{caption:42}]){
      const invalid={...doc,pages:[{...doc.pages[0],illustration:{...doc.pages[0].illustration!,...fields}}]};
      expect(validateLessonPages(invalid).length).toBeGreaterThan(0);
      expect(isEditableLessonPageDocument(invalid)).toBe(false);
    }
    doc.pages[0].illustration!.provenance='';
    expect(validateLessonPages(doc).length).toBeGreaterThan(0);
  });

  it('keeps dictation editable while requiring complete, matching listening material for release',()=>{
    const block={...emptyLessonBlock('dictation'),kind:'dictation' as const,body:'Nghe rồi chép giờ bắt đầu.',hanzi:'八点开始。',pinyin:'Bā diǎn kāishǐ.',meaningVi:'Bắt đầu lúc tám giờ.'};
    const doc:LessonPageDocument={version:1,pages:[{id:'listen',title:'Nghe giờ',layout:'workshop',blocks:[block]}]};
    expect(validateLessonPages(doc)).toEqual([]);
    const unfinished={...doc,pages:[{...doc.pages[0],blocks:[{...block,hanzi:''}]}]};
    expect(isEditableLessonPageDocument(unfinished)).toBe(true);
    expect(validateLessonPages(unfinished).length).toBeGreaterThan(0);
    const media={src:'/api/content/media/11111111-1111-4111-8111-111111111111.mp3',mimeType:'audio/mpeg',metadata:{title:'Giờ bắt đầu',alt:'',caption:'',provenance:'Original',license:'HANZI.OS',sourceKind:'synthetic' as const,transcript:block.hanzi,focalX:50,focalY:50,humanReviewed:false as const}};
    doc.pages[0].blocks[0]={...block,media};
    expect(validateLessonPages(doc)).toEqual([]);
    media.metadata.transcript='九点开始。';
    expect(validateLessonPages(doc)).toContain('Âm thanh nghe–chép phải có lời thoại khớp đáp án.');
  });

  it('validates audio transcript and rejects mismatched asset formats',()=>{
    const rich=RELEASED_LESSONS.map(l=>getRichLessonContent(l.id)).find(Boolean)!;
    const doc=lessonPagesFromRich(rich);
    const media={src:'/api/content/media/11111111-1111-4111-8111-111111111111.mp3',mimeType:'audio/mpeg',metadata:{title:'Lời chào',alt:'',caption:'',provenance:'Original',license:'HANZI.OS',sourceKind:'synthetic' as const,transcript:'你好。',focalX:50,focalY:50,humanReviewed:false as const}};
    const block=doc.pages[0].blocks[0];block.kind='audio';block.media=media;
    expect(validateLessonPages(doc)).toEqual([]);
    block.media={...media,src:media.src.replace('.mp3','.png')};expect(validateLessonPages(doc).length).toBeGreaterThan(0);
    block.media={...media,metadata:{...media.metadata,transcript:''}};expect(validateLessonPages(doc).length).toBeGreaterThan(0);
  });
  it('projects every rich lesson without inventing or losing dialogue',()=>{
    let count=0;
    for(const lesson of RELEASED_LESSONS){
      const rich=getRichLessonContent(lesson.id)??getPremiumRichLesson(lesson.id);if(!rich)continue;count++;
      const doc=lessonPagesFromRich(rich);expect(validateLessonPages(doc),lesson.id).toEqual([]);
      const words=lesson.wordIds.map(id=>WORD_BY_ID.get(id)).filter(w=>!!w);
      expect(doc.pages.flatMap(p=>p.blocks).filter(b=>b.kind==='dialogue').map(b=>[b.hanzi,b.pinyin,b.meaningVi])).toEqual([
        ...rich.dialogue.map(d=>[d.hanzi,d.pinyin,d.meaningVi]),
        ...rich.grammar.map(g=>[g.modelExample.hanzi,g.modelExample.pinyin,g.modelExample.meaningVi]),
        ...words.map(w=>[w.example,w.examplePinyin,w.exampleMeaning]),
      ]);
      expect(doc.pages.filter(p=>p.stage==='transfer')).toHaveLength(rich.tasks.length);
    }
    expect(count).toBe(213);
  });
  it('rejects duplicate identity and unsafe assets',()=>{
    const rich=RELEASED_LESSONS.map(l=>getRichLessonContent(l.id)).find(Boolean)!;
    const doc=lessonPagesFromRich(rich);doc.pages.push(doc.pages[0]);expect(validateLessonPages(doc).length).toBeGreaterThan(0);
    for(const path of ['//evil/a.png','/../a.png','https://example.com/a.png','javascript:alert(1)'])expect(safeLessonImage(path)).toBe(false);
    expect(safeLessonImage('/lessons/campus.webp')).toBe(true);
  });
  it('keeps authored pages and character links when published enhancements merge',()=>{
    const rich=RELEASED_LESSONS.map(l=>getRichLessonContent(l.id)).find(Boolean)!;
    const current={...rich,lessonPages:lessonPagesFromRich(rich)};
    const merged=mergePublishedStudioLessonEnhancement(current,{dialogue:[],grammar:[],topics:[],tasks:[]});
    expect(merged?.lessonPages).toEqual(current.lessonPages);expect(merged?.characters).toEqual(current.characters);
  });
});
