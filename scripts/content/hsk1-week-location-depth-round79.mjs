const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const b=(id,kind,title,body='',extra={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...extra});
export function deepenWeekLocation79(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!['hsk1-time-place-events-03-week-and-day-parts','hsk1-time-place-events-05-location'].includes(id))return {content,changes};
 const prefix=`${id}:r79`,pages=content.lessonPages.pages;
 if(pages.some(p=>p.id.startsWith(prefix)))throw Error('Do not replay');
 const page=(key,title,stage,blocks)=>({id:`${prefix}:page:${key}`,title,stage,layout:'workshop',blocks});
 const target={objective:id.endsWith('location')?'Phân biệt vị trí của vật, xác định vật ở một nơi và giới thiệu số lượng vật tại nơi đó.':'Hỏi và trả lời thứ trong tuần bằng vị ngữ danh từ; phủ định với 不是.',skill:'grammar',sources:[{id:id.endsWith('location')?'hsk1-grammar-row-051':'hsk1-grammar-row-044',kind:'grammar'}]};
 const q=(n,prompt,options,answer,explanation)=>b(`${prefix}:q:${n}`,'activity',`Khảo Luyện ${n+1}`,prompt,{activity:{type:'choice',options:options.map((text,i)=>({id:`o-${i}`,text,feedback:i===answer?explanation:'Đối chiếu yêu cầu của câu với mẫu vừa học.'})),answerIds:[`o-${answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation,learningTarget:target}});
 const transfer=(prompt,model,criteria)=>b(`${prefix}:produce`,'activity','Tự viết rồi đối chiếu',prompt,{activity:{type:'rubric',options:[],answerIds:[],acceptedAnswers:[],rubric:criteria.map((label,i)=>({id:`r-${i}`,label,guidance:label})),hint:'',explanation:`Một cách diễn đạt:\n${model.hanzi}\n${model.pinyin}\n${model.meaningVi}\nCó thể dùng cách nói khác giữ đúng dữ kiện. Tự đối chiếu chưa phải đánh giá viết/nói độc lập.`,learningTarget:{...target,skill:'writing'}}});
 let added;
 if(id.endsWith('location')){
  added=[page('teach','在 · 是 · 有: ba câu hỏi khác nhau','understand',[
   b(`${prefix}:note`,'explanation','Xác định hay giới thiệu?','书在桌子上 trả lời sách ở đâu: đồ vật đã biết đứng trước 在. 桌子上是我的书 xác định đồ trên bàn là sách của tôi: nơi chốn đứng trước 是, rồi đến vật được nhận diện. 桌子上有两本书 giới thiệu ở nơi đó có hai quyển sách, chưa nói là sách của ai. Số lượng gồm số + lượng từ + danh từ: 两本书, 三个杯子. Không đổi mọi 有 thành 是: muốn báo có bao nhiêu vật, dùng 有. Phủ định có/không có dùng 没有, không dùng 不有.'),
   b(`${prefix}:support`,'explanation','Từ hỗ trợ','桌子 zhuōzi: bàn; 书 shū: sách; 本 běn: lượng từ cho sách; 杯子 bēizi: cốc; 个 ge: lượng từ dùng cho cốc trong bài; 两 liǎng: hai trước lượng từ; 三 sān: ba; 我的 wǒ de: của tôi.'),
   b(`${prefix}:example:0`,'dialogue','Tìm sách','',t('书在桌子上。','Shū zài zhuōzi shàng.','Sách ở trên bàn.')),
   b(`${prefix}:example:1`,'dialogue','Nhận diện đồ trên bàn','',t('桌子上是我的书。','Zhuōzi shàng shì wǒ de shū.','Trên bàn là sách của tôi.')),
   b(`${prefix}:example:2`,'dialogue','Báo số lượng','',t('桌子上有两本书，没有杯子。','Zhuōzi shàng yǒu liǎng běn shū, méiyǒu bēizi.','Trên bàn có hai quyển sách, không có cốc.'))
  ]),page('practice','Chọn theo mục đích nói','practice',[
   q(0,'Bạn được hỏi sách ở đâu. Chọn câu định vị sách.',['书在桌子上。','桌子上有两本书。','桌子上是我的书。'],0,'书 đứng trước 在: xác định vị trí của sách, không chuyển sang báo số lượng hoặc chủ sở hữu.'),
   q(1,'Người nghe chỉ vào đồ trên bàn hỏi đó là gì. Bạn xác định đó là sách của mình.',['桌子上是我的书。','桌子上有三个杯子。','我在桌子上。'],0,'Nơi chốn + 是 + vật được nhận diện: đồ trên bàn là sách của tôi.'),
   q(2,'Phiếu kiểm đồ chỉ ghi trên bàn có hai quyển sách, chưa ghi chủ sở hữu. Chọn câu giữ đúng thông tin.',['桌子上是我的书。','桌子上有两本书。','书有桌子上。'],1,'有 giới thiệu sự tồn tại và số lượng. 不 được tự thêm sách là của tôi.'),
   q(3,'Trên bàn không có cốc: chọn câu đúng.',['桌子上不有杯子。','桌子上没有杯子。','桌子上没是杯子。'],1,'Phủ định 有 bằng 没有. Câu này không xác định vật là gì.')
  ]),page('transfer','Kiểm đồ trong phòng mới','transfer',[transfer('Phòng mới: trên bàn có ba cái cốc; sách của bạn ở trong phòng. Viết một câu báo số lượng cốc và một câu xác định vị trí sách. Không tự thêm số sách hoặc chủ sở hữu cốc.',t('桌子上有三个杯子。我的书在房间里。','Zhuōzi shàng yǒu sān ge bēizi. Wǒ de shū zài fángjiān lǐ.','Trên bàn có ba cái cốc. Sách của tôi ở trong phòng.'),['Nơi chốn + 有 + 三个杯子 để báo số lượng.','我的书 đứng trước 在 để xác định vị trí sách.','Không thêm số sách hoặc nói cốc là của mình.'])])];
 }else{
  const word=pages.flatMap(p=>p.blocks).find(x=>x.id.endsWith(':word-hsk-vocab-00230'));
  if(!word||word.hanzi!=='不忙，我下午忙。')throw Error('Source example changed');
  Object.assign(word,t('我上午不忙，下午很忙。','Wǒ shàngwǔ bù máng, xiàwǔ hěn máng.','Buổi sáng tôi không bận, buổi chiều tôi bận.'));
  changes.push({field:word.id,scope:'Replace orphaned reply with self-contained afternoon contrast.'});
  added=[page('teach','今天星期几？: câu không cần 是','understand',[
   b(`${prefix}:note`,'explanation','Danh từ làm vị ngữ','Để nói thứ hoặc ngày tháng trong câu ngắn, tiếng Trung có thể đặt cụm danh từ/số trực tiếp sau chủ ngữ: 今天星期一. Không phải mọi câu đều cần 是. 今天是星期一 cũng đúng; khác biệt không phải có 是 là sai. Khi phủ định thông tin về thứ, dùng 不是: 今天不是星期天. Không suy từ mẫu này rằng có thể bỏ 是 trong mọi câu nhận diện: 我是老师 vẫn cần 是 trong mẫu cơ bản.'),
   b(`${prefix}:example:0`,'dialogue','Lịch giả định: thứ hai','',t('今天星期几？今天星期一。','Jīntiān xīngqī jǐ? Jīntiān xīngqīyī.','Hôm nay thứ mấy? Hôm nay thứ hai.')),
   b(`${prefix}:example:1`,'dialogue','Phủ định và sửa lại','',t('今天不是星期天，是星期一。','Jīntiān bú shì xīngqītiān, shì xīngqīyī.','Hôm nay không phải chủ nhật, mà là thứ hai.'))
  ]),page('practice','Đọc thứ và phủ định đúng','practice',[
   q(0,'Lịch giả định ghi thứ hai. Cặp nào đều nói đúng thông tin?',['今天星期一。／今天是星期一。','今天星期天。／今天是星期一。','今天星期二。／今天星期天。'],0,'Hai cách nói có/không có 是 đều đúng ở mẫu ngày/thứ này. 星期一 là thứ hai.'),
   q(1,'Hôm nay không phải chủ nhật: chọn mẫu cơ bản đúng.',['今天不星期天。','今天不是星期天。','今天没星期天。'],1,'Dùng 不是 để phủ định thông tin về thứ. Không lấy việc câu khẳng định bỏ 是 để bỏ 是 cả trong phủ định.'),
   q(2,'Bạn muốn hỏi hôm nay thứ mấy, không hỏi số cốc.',['今天星期几？','今天有几个杯子？','你在哪儿？'],0,'星期几 hỏi thứ trong tuần; 几个杯子 hỏi số cốc, 哪儿 hỏi nơi chốn.')
  ]),page('transfer','Sửa một cuộc hẹn nhầm thứ','transfer',[transfer('Lịch mới ghi hôm nay thứ sáu. Bạn nhầm tưởng hôm nay chủ nhật. Viết câu sửa lại và nói chiều thứ sáu mình có lớp; không tự chuyển cuộc hẹn sang ngày mai.',t('今天不是星期天，是星期五。我星期五下午上课。','Jīntiān bú shì xīngqītiān, shì xīngqīwǔ. Wǒ xīngqīwǔ xiàwǔ shàngkè.','Hôm nay không phải chủ nhật, mà là thứ sáu. Chiều thứ sáu tôi có lớp.'),['星期五 là thứ sáu; không lấy ngày thật làm đáp án.','Phủ định bằng 不是; có thể tách thành 今天不是星期天。今天星期五。','Giữ 星期五下午上课, không thêm đổi ngày hẹn.'])])];
 }
 const at=pages.findIndex(p=>p.stage==='practice');pages.splice(at<0?pages.length-1:at,0,...added);
 changes.push({netPages:added.length});content.review={...content.review,humanReviewed:false};return {content,changes};
}
