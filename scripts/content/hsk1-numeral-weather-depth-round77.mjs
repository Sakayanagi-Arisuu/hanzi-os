const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const block=(id,kind,title,body='',rest={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...rest});
const questions=(prefix,target,rows)=>rows.map(([prompt,options,answer,explanation],n)=>block(`${prefix}:q:${n}`,'activity',`Khảo Luyện ${n+1}`,prompt,{activity:{type:'choice',options:options.map((text,i)=>({id:`o-${i}`,text,feedback:i===answer?explanation:'Đọc lại vị trí từ và thông tin trong đề.'})),answerIds:[`o-${answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation,learningTarget:target}}));
const transfer=(prefix,target,prompt,model,criteria)=>block(`${prefix}:transfer-block`,'activity','Vận dụng trong tình huống mới',prompt,{activity:{type:'rubric',options:[],answerIds:[],acceptedAnswers:[],hint:'',explanation:`Một cách diễn đạt:\n${model.hanzi}\n${model.pinyin}\n${model.meaningVi}\nTự đối chiếu sau khi viết; mẫu không phải điểm nói/viết độc lập.`,rubric:criteria.map((label,i)=>({id:`r-${i}`,label,guidance:label})),learningTarget:{...target,skill:'writing'}}});
export function deepenNumeralWeather77(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!['hsk1-time-place-events-01-numbers','hsk1-time-place-events-06-weather-and-residence'].includes(id))return {content,changes};
 if(content.lessonPages.pages.some(p=>p.id.includes(':r77:')))throw Error('Do not replay');
 const prefix=`${id}:r77`,pages=content.lessonPages.pages;
 const page=(key,title,stage,blocks)=>({id:`${prefix}:${key}`,title,stage,layout:'workshop',blocks});
 if(id.endsWith('01-numbers')){
  const target={objective:'Đọc số lượng có hàng trống và nói một nửa với 半; giữ khác biệt giữa số lượng và mã.',skill:'grammar',sources:[{id:'hsk-vocab-00006',kind:'vocabulary'},{id:'hsk-vocab-00112',kind:'vocabulary'},{id:'hsk-vocab-00007',kind:'vocabulary'}]};
  for(const s of target.sources)if(!content.sourceVocabularyIds.includes(s.id))throw Error('Missing source');
  const added=[page('teach','Số lượng có 零 và một nửa với 半','understand',[
   block(`${prefix}:note`,'explanation','Đọc hàng trống, không đọc mã','Trong số lượng 103, không có hàng chục nên dùng 零: 一百零三. 1002 có hàng trăm/chục trống, chỉ đọc một 零: 一千零二. Mã 103 đọc từng chữ số 一零三. Không đọc mỗi số 0 riêng trong số lượng. 半个苹果 là nửa quả táo; 一个半苹果 là một quả rưỡi, thứ tự khác nhau.'),
   block(`${prefix}:example:0`,'dialogue','Một trăm lẻ ba','',t('一百零三。','Yì bǎi líng sān.','Một trăm lẻ ba.')),
   block(`${prefix}:example:1`,'dialogue','Một nghìn lẻ hai','',t('一千零二。','Yì qiān líng èr.','Một nghìn lẻ hai.')),
   block(`${prefix}:example:2`,'dialogue','Nửa và một rưỡi','',t('半个苹果，一个半苹果。','Bàn ge píngguǒ, yí ge bàn píngguǒ.','Nửa quả táo, một quả táo rưỡi.'))
  ]),page('practice','Khảo Luyện · hàng trống và nửa','practice',questions(prefix,target,[
   ['Số lượng 103 đọc theo cách nào?',['一零三','一百零三','一百三十'],1,'一百零三 là103; 一零三 là đọc mã, 一百三十 là130.'],
   ['Số lượng1002 đọc thế nào?',['一千零零二','一零零二','一千零二'],2,'Một hoặc nhiều hàng trống giữa các hàng đọc một 零; không đọc từng0 như mã.'],
   ['Bạn chỉ ăn nửa quả táo, chọn cụm đúng.',['半个苹果','一个半苹果','两个苹果'],0,'半 trước lượng từ: nửa quả. 一个半 là một quả rưỡi.']
  ])),page('transfer','Vận dụng · kiểm hàng và chia táo','transfer',[transfer(prefix,target,'Phiếu mới ghi203 quyển sách; bạn chỉ ăn nửa quả táo. Viết số lượng sách và phần táo. Đây là số lượng, không phải mã phòng.',t('二百零三本书，半个苹果。','Èr bǎi líng sān běn shū, bàn ge píngguǒ.','Hai trăm lẻ ba quyển sách, nửa quả táo.'),['Đọc203 theo hàng: 二百/两百零三, không 二零三 như mã.','Giữ 本 cho sách.','半个 là nửa quả, không 一个半.'])])];
  const idx=pages.findIndex(p=>p.stage==='practice');pages.splice(idx<0?pages.length-1:idx,0,...added);changes.push({groups:2,netPages:3});
 }else{
  const support=pages.flatMap(p=>p.blocks).find(b=>b.id.endsWith(':block:support'));if(!support)throw Error('Missing support');
  const before=support.body;support.body=support.body.replace('很 (hěn) — từ nối/nhấn trong câu tính từ.','很 (hěn) — phó từ đứng trước tính từ; trong câu miêu tả trung tính có thể không cần dịch là “rất”. Không phải từ “là” 是.');changes.push({before,after:support.body});
  const target={objective:'Miêu tả lạnh/nóng với tính từ, phân biệt 很冷 và 不冷; không thêm 是 trước 冷/热.',skill:'grammar',sources:[{id:'hsk-vocab-00109',kind:'vocabulary'},{id:'hsk-vocab-00169',kind:'vocabulary'}]};
  const examples=[block(`${prefix}:note`,'explanation','很 trong câu tính từ','今天天气很冷 là câu miêu tả trời lạnh. Trong lời nói trung tính, 很 thường đứng trước tính từ và không nhất thiết nhấn mức “rất”; khi có nhấn giọng/ngữ cảnh, có thể mang nghĩa rất. Không dùng 天气是冷 để làm mẫu câu miêu tả cơ bản. Phủ định đơn giản: 今天不冷. Không thêm 很 vào giữa 不 và 冷 khi chỉ nói không lạnh.'),block(`${prefix}:example:0`,'dialogue','Miêu tả và phủ định','',t('今天很冷，昨天不冷。','Jīntiān hěn lěng, zuótiān bù lěng.','Hôm nay lạnh, hôm qua không lạnh.'))];
  const added=[page('practice','Khảo Luyện · câu miêu tả thời tiết','practice',[...examples,...questions(prefix,target,[['Cảnh giả định hôm nay lạnh, mẫu miêu tả cơ bản nào?',['今天天气是冷。','今天天气很冷。','今天在冷天气是。'],1,'Tính từ làm vị ngữ với 很; không cần 是 trong mẫu miêu tả cơ bản.'],['Hôm nay không lạnh: chọn mẫu đúng.',['今天很不冷。','今天是冷不。','今天不冷。'],2,'不 đứng trước 冷 để phủ định đơn giản.'],['很冷 có luôn phải dịch nhấn mạnh “rất lạnh” không?',['Có trong mọi câu','Không, còn tùy ngữ cảnh và nhấn giọng','很 luôn là từ là'],1,'很 có thể dùng trong miêu tả trung tính, không đồng nhất với 是.']])]),page('transfer','Vận dụng · thời tiết hai ngày','transfer',[transfer(prefix,target,'Cảnh mới: hôm qua nóng; hôm nay không nóng. Viết hai câu với 很 và 不, không tự thêm mưa.',t('昨天很热，今天不热。','Zuótiān hěn rè, jīntiān bú rè.','Hôm qua nóng, hôm nay không nóng.'),['很 đứng trước 热 trong câu miêu tả.','不热 phủ định hôm nay; không thêm 是.','Không thêm mưa hoặc dữ kiện chưa cho.'])])];
  const idx=pages.findIndex(p=>p.stage==='practice');pages.splice(idx<0?pages.length-1:idx,0,...added);changes.push({netPages:2});
 }
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
