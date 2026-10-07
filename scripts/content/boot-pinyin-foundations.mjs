// Original AI-assisted teaching supplement; no claim of assessed pronunciation.
const block=(id,kind,title,body,hanzi='',pinyin='',meaningVi='')=>({id:`boot-3:foundation:${id}`,kind,title,body,hanzi,pinyin,meaningVi,imageSrc:'',alt:'',provenance:''});
const note=(id,title,body)=>block(id,'explanation',title,body);
const sample=(id,title,body,hanzi,pinyin,meaning)=>block(id,'dialogue',title,body,hanzi,pinyin,meaning);
const page=(id,title,stage,blocks)=>({id:`boot-3:foundation:page:${id}`,title,stage,layout:stage==='understand'?'split':'workshop',blocks});
export const pinyinFoundationPages=[
 page('syllable','Đọc một âm tiết Pinyin','understand',[
  note('parts','Âm đầu + vần + thanh','Trong mā, m là âm đầu, a là vần, dấu ngang chỉ thanh 1. Trong hǎo, h là âm đầu và ao là cả vần: không tách thành hai âm tiết. Có âm tiết không có phụ âm đầu, như ài. Pinyin ghi âm, không phải cách viết thay cho Hán tự.'),
  sample('syllable-example','Tách âm để học, ghép lại khi nói','Đọc hǎo thành một âm tiết; giữ đường thanh trên cả vần ao.','好','hǎo','tốt; ổn'),
  note('limits','Không đọc tên chữ cái tiếng Việt','Các chữ Pinyin không luôn mang âm tiếng Việt. Học theo khẩu hình và cả âm tiết mẫu; nút nghe là giọng tổng hợp để tham khảo, không phải mẫu người bản ngữ hay phép chấm phát âm.')]),
 page('vowels','Sáu nguyên âm đơn: a o e i u ü','understand',[
  note('aoe','a, o, e: thay hình miệng','a: mở miệng, lưỡi thả thấp. o: môi tròn; trong bo/po/mo/fo thường có chuyển tiếp ngắn gần u, không đọc cứng như chữ “ô”. e: môi không tròn, lưỡi lùi; đừng thêm âm i cuối. Chỉ mô tả khẩu hình không thay được nghe mẫu.'),
  note('iu','i, u, ü: vị trí lưỡi và môi','Với i trong mì, lưỡi ở phía trước, môi không tròn. Với u trong lù, môi tròn và lưỡi ở phía sau. Với ü trong lǜ, giữ lưỡi gần vị trí i rồi tròn môi. Không đọc ü thành u. i sau z/c/s và zh/ch/sh/r có cách thể hiện riêng, sẽ học ở trang nhóm âm.'),
  sample('lu','u: đường đi','Giữ môi tròn, lưỡi phía sau.','路','lù','đường'),
  sample('lv','ü: màu xanh lá','Giữ cùng thanh 4 như lù để tập trung vào đổi vần; hai từ khác nghĩa.','绿','lǜ','xanh lá')]),
 page('air','Các cặp b/p, d/t, g/k','understand',[
  note('pairs','Đổi luồng hơi, không đổi thành tiếng hét','b/p đều dùng hai môi; d/t dùng đầu lưỡi gần lợi răng trên; g/k dùng phần sau lưỡi gần ngạc mềm. Trong mỗi cặp, p/t/k bật hơi mạnh hơn b/d/g. b/d/g tiếng Phổ thông không phải b/d/g hữu thanh tiếng Việt. Đặt bàn tay cách miệng vài centimet để tự cảm nhận, không dùng ngọn lửa.'),
  sample('ba','Giữ thanh 1: bā','Đóng hai môi rồi mở, ít hơi hơn p.','八','bā','tám'),
  sample('pa','Giữ thanh 1: pā','Cùng vùng môi, thêm luồng hơi.','趴','pā','nằm sấp'),
  note('remaining-initials','Các âm đầu còn lại cần nhận mặt','m/n là âm mũi; f dùng môi dưới với răng trên; l dùng đầu lưỡi gần lợi răng trên; h tạo tiếng xát ở vùng sau miệng. r tiếng Phổ thông dùng vùng đầu lưỡi nâng, không rung đầu lưỡi như một số cách đọc r tiếng Việt. Học lần lượt, không ép nhớ toàn bảng trong một lượt.')]),
 page('glides','Vần ghép: đi liền trong một âm tiết','understand',[
  note('compound','Giữ một dòng hơi','ai, ei, ao, ou có sự chuyển vị trí miệng trong cùng âm tiết. ia, ie, ua, uo, üe bắt đầu bằng phần lướt ngắn; không tách thành hai tiếng. Khi đọc, ghép cả vần rồi mới thêm thanh.'),
  sample('ai','ai','Không thêm một nhịp ngắt giữa a và i.','爱','ài','yêu'),
  sample('ou','ou','Giữ một âm tiết.','口','kǒu','miệng'),
  sample('ie','ie','Mẫu này cũng dùng nhóm x sẽ học ngay sau phần nền.','写','xiě','viết'),
  note('short-spelling','Ba vần có dạng viết rút gọn','Sau âm đầu, iou viết iu (liú), uei viết ui (shuǐ), uen viết un (lùn). Dạng chữ rút gọn không có nghĩa bỏ phần chuyển âm khi nói. Đây là quy tắc đọc Pinyin, chưa yêu cầu thuộc các từ mới minh họa.')]),
 page('nasals','Đuôi -n và -ng không giống nhau','understand',[
  note('nasal-position','Đổi chỗ khép luồng hơi','Với -n, đầu lưỡi chạm vùng lợi răng trên. Với -ng, phần sau lưỡi nâng về ngạc mềm; đầu lưỡi không cần chạm lợi. Cả hai đều để hơi qua mũi. Không thêm âm g bật ra ở cuối -ng.'),
  sample('jin','Đuôi -n','Đối chiếu cùng âm đầu và thanh 1 với jīng.','金','jīn','vàng; kim loại'),
  sample('jing','Đuôi -ng','Thay vị trí lưỡi cuối âm, không thêm một âm tiết.','京','jīng','kinh đô'),
  note('nasal-families','Nhận các họ vần','Nhóm -n: an, en, in, un/uen, ün, ian, uan, üan. Nhóm -ng: ang, eng, ing, ong, iang, uang, ueng, iong. Chất nguyên âm cũng có thể đổi theo vần: đừng coi mọi cặp chỉ khác một chữ g. Luyện từng cặp theo mẫu rồi ghi lại cặp còn khó.')]),
 page('umlaut','Khi nào ü viết thành u?','understand',[
  note('jqx','Sau j, q, x: bỏ hai chấm, giữ âm ü','Trong ju, qu, xu, chữ u biểu thị ü. Trong jue, que, xue và juan, quan, xuan cũng vậy. Không áp cách đọc u của lù vào qu. Với n/l, phải giữ hai chấm để phân biệt: nü/lü khác nu/lu.'),
  sample('qu','qu có vần ü','Âm q bật hơi; vần vẫn là ü dù chữ viết không có hai chấm.','去','qù','đi'),
  sample('nu','nü giữ hai chấm','Giữ lưỡi phía trước và tròn môi.','女','nǚ','nữ'),
  note('yw','y và w giúp ghi âm tiết không có phụ âm đầu','i đứng riêng viết yi; u viết wu; ü viết yu. Các dạng như ya, ye, you, wa, wo, wei, yuan dùng y/w theo quy tắc chính tả. yu/yue/yuan/yun thuộc họ ü; đừng đọc y như một phụ âm mới rồi ghép thêm một tiếng.')]),
 page('marks','Đặt dấu và giữ ranh giới âm tiết','understand',[
  note('tone-mark','Đặt dấu trên nguyên âm nào?','Có a thì đánh trên a; nếu không có a, ưu tiên o rồi e. Trong iu/ui, đánh trên chữ cuối: liú, shuǐ. Với nguyên âm đơn, đánh ngay trên nó: nǚ, lǜ. Khi i mang dấu thanh, bỏ chấm của i. Thanh nhẹ không mang dấu.'),
  sample('liu','iu: dấu trên u','liú là một âm tiết; không viết líu.','流','liú','chảy'),
  sample('shui','ui: dấu trên i','shuǐ là một âm tiết; không viết shǔi.','水','shuǐ','nước'),
  sample('xian','Dấu nháy giúp tách âm tiết','Xī + ān là hai âm tiết; dấu nháy phân biệt với xiān là một âm tiết. Đặt dấu nháy trước a/o/e khi cần làm rõ ranh giới trong từ.','西安','Xī’ān','Tây An'),
  note('keyboard','Gõ v không phải cách viết Pinyin chuẩn','Một số bộ gõ nhận v thay ü để nhập chữ, nhưng khi viết Pinyin cho người đọc vẫn dùng ü. Có thể ghi Pinyin trên giấy nếu bàn phím chưa hỗ trợ; việc dùng gợi ý bàn phím không phải gọi lại độc lập.')]),
 page('self-check','Tự giải thích trước khi mở mẫu','practice',[
  block('check','reflection','Ba quyết định khác nhau','Không mở lại trang trước: (1) u trong qù đọc theo họ u hay ü? (2) jīn/jīng khác vùng khép cuối âm ở đâu? (3) thanh 3 trong shui phải đặt lên chữ nào? Viết dự đoán và lý do, rồi đối chiếu. Đây là kiểm hiểu ký hiệu, chưa đo khả năng nghe hoặc phát âm.','去；金／京；水','qù; jīn / jīng; shuǐ','(1) ü vì đứng sau q; (2) -n dùng đầu lưỡi gần lợi, -ng dùng phần sau lưỡi; (3) dấu trên i trong ui: shuǐ.')]),
 page('transfer','Mang quy tắc sang một từ mới','transfer',[
  block('transfer','reflection','Tự tách từ 旅行','Bạn gặp 旅行, nghĩa là du lịch, Pinyin lǚxíng. Hãy tách hai âm tiết; giải thích vì sao âm đầu tiên phải giữ hai chấm, dấu thanh đặt ở đâu, và âm thứ hai kết thúc bằng -n hay -ng. Sau đó thử đọc chậm, liền từng âm; có thể ghi điều chưa chắc bằng tiếng Việt. Đối chiếu chỉ giúp tự sửa, không chấm phát âm.','旅行','lǚxíng','lǚ + xíng. Sau l phải giữ ü để phân biệt với u; thanh 3 trên ü, thanh 2 trên i; xíng kết thúc bằng -ng. Nghĩa: du lịch.'),
  note('return','Ôn ngắn trước phần nhóm âm','Ở lần học tiếp theo, thử giải thích qù, shuǐ và lǚxíng trước khi mở lại mẫu. Nếu nhầm, quay lại đúng trang ü, dấu thanh hoặc đuôi mũi; sau đó tiếp phần j/q/x. Không cần ghi nhớ Hán tự mới trong một lượt.')]),
];
export function supplementBootPinyin(source){
 if(source.targetLessonId!=='boot-3'||!source.lessonPages?.pages?.length)throw Error('Expected boot-3 published document');
 if(source.lessonPages.pages.some(page=>page.id.startsWith('boot-3:foundation:')))throw Error('Supplement already present');
 const result=structuredClone(source);
 // Keep every old page/block and all source bindings. Explanation pages precede
 // the original articulation lesson; new recall/transfer follow its own recap.
 result.lessonPages.pages=[...structuredClone(pinyinFoundationPages.filter(p=>p.stage==='understand')),...result.lessonPages.pages,...structuredClone(pinyinFoundationPages.filter(p=>p.stage!=='understand'))];
 result.review={...result.review,humanReviewed:false};
 return result;
}
