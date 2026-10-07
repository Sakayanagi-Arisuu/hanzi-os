import {writeFileSync} from 'node:fs';
import {buildNarrativeBatch} from './build-narrative-batch';
import {natureNarratives} from './hsk3-nature-narratives';
import {emptyLessonBlock,validateLessonPages,type LessonPageDocument} from '../../src/learning/lessonPages';

const items=buildNarrativeBatch({lessonPrefix:'hsk3-nature-environment-explanations',level:'hsk3',mediaDate:'2026-09-23',manuscripts:natureNarratives,answerReadings:{
 'climate-seasons':['Yīnwèi yùbào shuō míngtiān xiàwǔ yǒu yǔ.','Vì dự báo chiều mai có mưa.'],
 'environment-state':['Lóutī gānjìng le, zhǐxiāng bān zǒu le.','Cầu thang đã sạch, thùng giấy đã được dời đi.'],
 'environment-protection':['Zhù de bù yuǎn de shí’èr wèi tóngshì zhōng.','Trong 12 đồng nghiệp ở không xa.'],
 'landscape-place':['Xiàng dōng zǒu.','Đi về phía đông.'],
 'plants-animals':['Yǒuxiē huā kāi le, yǒuxiē hái méiyǒu kāi.','Một số hoa nở, một số chưa nở.'],
}});
const landscape=items.find(i=>i.lessonId.endsWith('landscape-place'))!;
const id=landscape.lessonId;
const mapPage=(transfer:boolean):LessonPageDocument['pages'][number]=>({
 id:`${id}:v2:${transfer?'new-map':'map'}`,title:transfer?'Bản đồ mới để vận dụng':'Đối chiếu bốn hướng',layout:'focus',stage:transfer?'transfer':'understand',
 blocks:[{...emptyLessonBlock(`${id}:v2:block:${transfer?'new-map':'map'}`),kind:'diagram',title:'Bắc ở trên · mốc giữa là trung tâm du khách',diagram:{type:'map',description:transfer?'Bắc: hồ. Nam: vườn. Đông: phố cổ. Tây: núi. Mọi vị trí so với trung tâm du khách ở giữa. Sơ đồ không có tỷ lệ.':'Bắc: núi. Nam: phố cổ. Đông: vườn. Tây: hồ. Mọi vị trí so với trung tâm du khách ở giữa. Sơ đồ không có tỷ lệ.',nodes:[
 {id:'center',label:'游客中心',pinyin:'yóukè zhōngxīn',meaningVi:'Trung tâm du khách',note:'Mốc tham chiếu',x:1,y:1},
 ...((transfer?[
 ['湖','hú','Hồ',1,0],['花园','huāyuán','Vườn hoa',1,2],['老街','lǎo jiē','Phố cổ',2,1],['山','shān','Núi',0,1],
 ]:[
 ['山','shān','Núi',1,0],['老街','lǎo jiē','Phố cổ',1,2],['花园','huāyuán','Vườn hoa',2,1],['湖','hú','Hồ',0,1],
 ]) as [string,string,string,number,number][]).map(([label,pinyin,meaningVi,x,y],i)=>({id:`place-${i}`,label,pinyin,meaningVi,note:['Bắc','Nam','Đông','Tây'][i],x,y})),
 ]}}],
});
landscape.lessonPages.pages.splice(2,0,mapPage(false));
landscape.lessonPages.pages.splice(landscape.lessonPages.pages.findIndex(p=>p.id.endsWith(':transfer')),0,mapPage(true));
for(const item of items){const errors=validateLessonPages(item.lessonPages);if(errors.length)throw Error(errors.join('\n'));}
writeFileSync('content/drafts/thien-lo-hsk3-nature-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({id:i.lessonId,pages:i.lessonPages.pages.length,retained:i.studioContent.vocabulary.length})));
