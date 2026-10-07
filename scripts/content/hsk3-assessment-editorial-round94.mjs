import {readFileSync} from 'node:fs';
import {HSK3_LEVEL_CHECK_ITEMS} from '../../src/data/hsk3LevelCheck.ts';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
const edits=[
 ['把方便面放进公共冰箱，晚上才拿出来吃','把水果放进公共冰箱，晚上却只吃方便面'],
 ['大家对话了好久','大家讨论了好久'],['早上发生了大雨','早上下起了大雨'],
 ['先检查卡，再看机器水平','先检查卡，再看机器是不是放平了'],
 ['酒店按身高登记时','酒店登记时'],
 ['下周的月亮节活动','下周的中秋节活动'],
 ['学校放假一天，但参加活动的同学不算休假，要上午回来准备','学校放假一天，参加活动的同学可以下午回来准备'],
 ['有爱人或已经结婚的老师，也可以讲自己的家庭习惯','老师可以和爱人一起参加，也可以讲自己的家庭习惯'],
 ['晚上看见月亮以后，最聪明的回答也不一定只有一个','晚上看见月亮以后，每组可以分享不同的看法，不一定只有一个答案'],
 ['活动终于结束时','活动结束时'],['自己学到的新年和节日知识','自己学到的中秋节知识'],
 ['一个周末汉语活动','一个星期五下午的汉语活动'],
 ['妻子跟他对话，问他为什么生气','妻子问他为什么生气'],
 ['声音很清楚地介绍每天的安排','用清楚的声音介绍每天的安排'],
 ['这个城市的季节变化很清楚','这个城市四季分明'],
 ['东南有一条常见的小吃街','东南有一条热闹的小吃街'],
 ['街角有一座三层旧房子，以前只给别人寄信和办卡','街角有一座三层旧房子，以前是寄信和办卡的地方'],
 ['也能急用电脑','也能在需要时使用电脑'],['每层都有不同帮助','每层都能提供不同的帮助'],
 ['选择帮助语言','选择需要帮助的语言'],
 ['小林刚到村里，就认得了小时候吃过的味道','小林尝了一口，就想起了小时候吃过的味道'],
 ['所以认得味道，却不会做','所以记得味道，却不会做'],
 ['今年新年放假时，王老师和爱人终于决定结婚','王老师和爱人结婚十年了。今年新年假期，他们准备参加妹妹的婚礼'],
 ['每一节活动都有说明','每一项活动都有说明'],
 ['会议没有晚点','会议按时开始'],['录下来的节目文件','会议录音'],
 ['机器里的旧东西','机器里的脏东西'],['新鲜的清水','干净的清水'],
 ['头发也不会常被窗边的风吹乱','窗边的风也小了'],
 ['观众极喜爱这次表演','观众很喜欢这次表演'],
 ['检查座位以下和桌子后面','检查座位下面和桌子后面'],
 ['说出物品特点和比赛得分','说出物品的特点'],
 ['也不会烫到牙','也不容易烫到嘴'],['安娜听进耳朵','安娜认真听了'],
 ['没有感到难看','没有觉得不好意思'],['饭菜和她想的有一点儿差','饭菜和她想象的有一点儿不同'],
 ['他的腿受了伤，水瓶子也被摔坏了，只好住院','他的腿受了伤，只好住院；水瓶子也摔坏了'],
 ['一个不会摔坏的瓶子','一个不容易摔坏的瓶子'],
 ['学生回答问题时要站稳，不能因为脚累就说“不行”','学生回答问题时可以坐着，不明白的地方也可以问老师'],
 ['大家戴着一双手套','每个人都戴着一双手套'],
 ['正式表演极成功','正式表演成功极了'],['可喜爱的艺术','喜欢的艺术'],
 ['第一，吃米饭该用筷子，喝汤用勺子和碗比较方便','第一，这家人吃米饭用筷子，喝汤用勺子和碗比较方便'],
 ['筷子不要向着别人，也不要放进嘴里碰牙，这样不合适','用筷子夹菜时，不要用筷子指着别人'],
 ['不能只动耳朵却不懂得意思','没听懂时可以请对方再说一遍'],
 ['主人没问以前就点啤酒，容易影响一起吃饭的气氛','想喝啤酒时，最好先问主人是否方便'],
 ['海边的人比较关心风浪安全，内地的人或更注意天气变化','我们问的人中，住海边的比较关心风浪；住内地的更注意天气变化'],
 ['安全的比较应该','合理的比较应该'],
];
// Same context in every option: answering now requires the target relation.
const grammar=[
 ['Chọn cách gọi thân mật thông thường một người lớn tuổi họ Vương mà bạn đã quen.','____王昨天给我们讲了老街的历史。',['老','第','很','再'],0,'老加姓氏 là cách gọi người lớn tuổi quen biết; đây là 老王.'],
 ['Mời chính người đang nghe cùng về trường.','时间不早了，____回学校吧。',['他们','你们','咱们','她们'],2,'咱们 bao gồm người nói và người nghe trong lời đề nghị cùng làm.'],
 ['Có tổng cộng mười người, nhưng chỉ ba người mang ảnh.','今天____来了十个人，其中____三个人带了照片。',['一共……只有……','只有……一共……','一共……都……','都……一共……'],0,'一共 nêu tổng số; 只有 giới hạn nhóm mang ảnh ở ba người.'],
 ['Giờ đến là ước lượng, chưa chắc chắn chính xác.','我们____下午三点到宾馆。',['已经','一定','大概','从不'],2,'大概 diễn đạt khoảng/chừng; 一定 khẳng định chắc chắn.'],
 ['Bác sĩ yêu cầu bắt buộc uống thuốc đúng giờ.','医生说她____按时吃药。',['必须','可能','也许','曾经'],0,'必须 diễn đạt điều bắt buộc phải làm, không phải mức có thể xảy ra.'],
 ['Nêu điều kiện: nếu không nghe hiểu thì nghe lại.','听不懂____，可以再听一遍。',['以前','以后','的话','得'],2,'的话 đặt sau điều kiện, nghĩa là nếu/trong trường hợp.'],
 ['Giới hạn nhận xét ở người mới học.','____，每天听新闻是一个新挑战。',['对初学者来说','把初学者来说','被初学者来说','从初学者以后'],0,'对…来说 nghĩa là đối với…; phần sau là nhận xét về nhóm đó.'],
 ['Nêu khoảng thời gian từ lúc tốt nghiệp đến hiện tại.','姐姐大学毕业____，现在在银行工作。',['两年过','两年以前','两年了','两年得'],2,'毕业两年了 là đã hai năm kể từ khi tốt nghiệp, không phải thời lượng học đại học.'],
 ['Kết quả là mọi người đã hiểu nội dung nghe.','说明很清楚，大家都____了。',['听懂','听完','听见','听说'],0,'懂 là kết quả hiểu; nghe xong hoặc nghe thấy không tự chứng minh hiểu.'],
 ['Nêu vị trí đích của việc chuyển ghế.','请把椅子____窗户旁边。',['搬在','搬给','搬到','搬过'],2,'搬到加处所 chỉ chuyển ghế đến vị trí mới cạnh cửa sổ.'],
 ['Nhấn mạnh có ba người rời phòng sau giờ làm.','下班以后，办公室里____三个人。',['走了','来了','有了','坐着'],0,'走了 nêu người rời khỏi địa điểm; 来了 là đến, 坐着 là đang ngồi.'],
 ['Diễn đạt gió càng thổi mạnh thì sóng càng cao.','风____，海浪____。',['刮越大越……变越高越……','越刮大越……越变高越……','越刮越大……越变越高……','刮越越大……变越越高……'],2,'越…越… biểu thị mức độ tăng dần; hai vế đặt gió và sóng trong quan hệ cùng tăng.'],
 ['So sánh hai phương tiện ngang nhau về sự thuận tiện.','公共汽车____地铁____方便。',['跟……一样……','把……一样……','跟……一共……','从……一样……'],0,'跟…一样加形容词 diễn đạt bằng nhau ở tiêu chí so sánh.'],
 ['Phải xuất trình vé trước, sau đó mới vào sân.','我们____出示票，____进场。',['再……先……','已经……以前……','先……再……','虽然……可是……'],2,'先…再… đánh dấu thứ tự hai hành động: xuất trình vé rồi vào sân.'],
 ['Nêu nhượng bộ: món cay nhưng vẫn muốn thử.','____菜很辣，____我还是想尝一尝。',['虽然……可是……','因为……所以……','只有……才……','一……就……'],0,'虽然…可是… diễn đạt nhượng bộ; 还是 cho biết ý định vẫn giữ dù món cay.'],
];
const comprehension={
 'form-a:listening:01':['Thông tin nào phải được bổ sung trước khi đưa người giao đồ ăn tới nơi?', ['Địa điểm giao cụ thể','Giá từng món ăn','Ngày chuyển nhà','Tên máy ảnh'],0,'Người nhận giải thích văn phòng ở cạnh vườn, rồi chú Châu yêu cầu ghi bổ sung địa điểm; không nêu đổi giá món.'],
 'form-a:listening:03':['Cách nào giúp nhóm quyết định hoạt động chung?', ['Hủy buổi gặp','Tổ chức trò chăm sóc cây','Chỉ cho trẻ chơi riêng','Chuyển tới khách sạn'],1,'Một hàng xóm đề xuất trò chăm cây; trẻ viết hướng dẫn, người lớn chuẩn bị chậu, nên hai nhóm cùng tham gia được.'],
 'form-a:listening:05':['Nhóm phân hành lý theo thông tin nào?', ['Màu áo nhân viên','Chiều cao khách','Số phòng và nhãn hành lý','Ngày mua va-li'],2,'小周要求按房间号码分行李; mọi người còn phải đọc nhãn để biết kiện thuộc khách nào.'],
 'form-a:listening:08':['Vì sao Tiểu Mã không nên chuyển tiếp video ngay?', ['Video không có âm thanh','Mọi video động vật đều sai','Người bạn đã mua con cừu','Chữ chú thích gọi con cừu là gấu trúc bị bệnh'],3,'Giáo viên xác nhận con vật là cừu và video có chữ sai. Cần kiểm nguồn; không suy mọi video đều sai.'],
 'form-a:listening:10':['Hộ chiếu được tìm thấy ở đâu?', ['Trên bàn ở khách sạn','Trong va-li quần áo','Trên tàu đã rời ga','Trong quán bán kem'],0,'Khách nhớ khách sạn từng sao hộ chiếu, gọi lại và được báo hộ chiếu trên bàn; nhân viên gửi tới.'],
 'form-a:listening:11':['Điều gì giúp lần nấu thứ hai có độ ngọt phù hợp?', ['Chụp ảnh đẹp hơn','Điều chỉnh lượng gạo và đường','Đổi ngân hàng thanh toán','Chỉ mang món ra bãi cỏ'],1,'Bà giải thích lượng gạo/đường quan trọng hơn ảnh; Mỹ Linh chọn lại nguyên liệu và thử lần nữa.'],
 'form-a:reading:01':['Tiểu Lâm phải làm gì trước khi gửi đơn cho quản lý?', ['Tự nghỉ mà không báo','Đổi sang công ty khác','Nhờ tổ trưởng kiểm tra sắp xếp công việc','Hủy mọi cuộc gặp với khách'],2,'Cô Vương hướng dẫn kiểm tra lịch trước; khi không có khách quan trọng mới chuyển đơn. Đoạn không cho phép tự nghỉ.'],
 'form-a:reading:03':['Ai kiểm tra nước trong nhà vệ sinh?', ['Người chồng','Khách trong nhà nghỉ','Người vợ','Người hàng xóm'],3,'Nguồn phân công người lớn tuổi quét nhà và hàng xóm kiểm tra nước; không được đổi hai việc cho nhau.'],
 'form-a:reading:05':['Điều kiện để được lên tàu làm việc là gì?', ['Học được quy tắc an toàn','Có áo mới','Biết giặt quần áo','Mua sách từ công ty'],0,'只有学会安全规则…才可以… đặt điều kiện cần; đồng nghiệp giúp Trần Hải học từng bước.'],
 'form-a:reading:07':['Ga tàu nằm ở hướng nào?', ['Tây nam','Đông bắc','Tây bắc','Đông nam'],1,'东北有火车站 nêu ga ở đông bắc. Đông nam có phố đồ ăn, không phải ga.'],
 'form-a:reading:10':['Nhận xét nào phù hợp về người được tham gia ngày trải nghiệm?', ['Chỉ người chơi chuyên nghiệp được vào','Chỉ người mua kem mới được chơi','Học sinh trình độ phổ thông sẵn lòng cố gắng cũng được tham gia','Không được thử dụng cụ trước'],2,'Mở đầu chào đón trình độ thông thường, kết thúc nêu không cần trình độ chuyên nghiệp, chỉ cần sẵn lòng cố gắng.'],
 'form-a:reading:11':['Vì sao Tiểu Lâm phải mượn tiền bạn?', ['Ngân hàng không cho đăng ký học','Sách điện tử đắt hơn dự kiến','Bạn muốn mua máy ảnh','Chợ chỉ nhận tiền mặt trong khi anh định dùng thẻ'],3,'Nguồn đối chiếu muốn dùng银行卡 với chợ只能收现金, rồi bạn cho mượn tiền để mua nguyên liệu.'],
 'form-b:listening:03':['Tổng thời gian của năm hoạt động thử, mỗi hoạt động 15 phút, là bao nhiêu?', ['75 phút','15 phút','30 phút','90 phút'],0,'五种活动, 每种一刻钟: 5×15=75 phút cho các hoạt động, không suy thêm thời gian nghỉ hoặc kiểm thiết bị.'],
 'form-b:listening:05':['Nguyên nhân cuối cùng được tìm thấy ở máy giặt là gì?', ['Không có váy để giặt','Một dây nhỏ bị nối sai','Nước uống đã hết','Khách không muốn sửa'],1,'Kỹ sư kiểm tra đến muộn mới tìm thấy一根小线接错了; làm sạch ban đầu chưa khắc phục được máy.'],
 'form-b:listening:08':['Cuộc sống Tiểu Trần thay đổi theo hướng nào?', ['Bỏ hoàn toàn tin tức','Chỉ ngồi ở nhà lâu hơn','Vẫn đọc tin nhưng dành thêm thời gian chơi cầu lông','Trở thành nhà báo chuyên nghiệp'],2,'Đoạn nói现在他还是看报纸和新闻 nhưng不会整晚坐着. Không có dữ kiện bỏ đọc tin hoặc đổi nghề.'],
 'form-b:listening:12':['Giáo viên yêu cầu ghi thêm điều gì để nguồn dễ kiểm tra?', ['Điểm thi toán','Khuôn mặt người nổi tiếng','Giá các bức ảnh','Ngày của tư liệu được so sánh'],3,'Mỗi người phải so sánh hai loại tư liệu và写清楚资料日期. Ghi ngày giúp nhận biết bối cảnh thời gian của nguồn.'],
 'form-b:reading:02':['Vì sao họa sĩ phải nhập viện?', ['Chân bị thương sau khi ngã','Chai nước bị vỡ','Muốn bán tranh','Quên mang ô'],0,'Nguồn đã tách chân bị thương và chai vỡ: nguyên nhân nhập viện là chấn thương, không phải mất chai.'],
 'form-b:reading:04':['Nhóm thay đổi quy trình gì sau việc thất lạc từ điển?', ['Cấm đọc mọi tài liệu','Lập bảng ghi mượn dùng chung','Hủy mọi cuộc họp','Chỉ mua đèn mới'],1,'Kết luận cần ghi lại sau khi mượn; từ đó văn phòng lập共同借用表. Không có lệnh hủy họp.'],
 'form-b:reading:10':['Tỷ số được nêu sau khi đội đổi cách tấn công là gì?', ['10–10','10–12','12–10','14–12'],2,'Nguồn nói比分很快变成了十二比十. Đây là mốc được nêu, không tự khẳng định đó là tỷ số chung cuộc.'],
 'form-b:reading:12':['Vì sao báo cáo không nên chỉ dựa vào lời một người nổi tiếng?', ['Người nổi tiếng luôn nói sai','Ảnh không có ngày','Mọi nơi đều giống nhau','Một tiếng nói không đại diện mọi nhóm và khác biệt trong vùng'],3,'Nguồn đối chiếu nhiều độ tuổi, thành thị/nông thôn và khác biệt nội vùng. Cần thêm nguồn, không kết luận người nổi tiếng luôn sai.'],
};
export function loadAssessment94(){
 const selected=new Set(getHskMockExamDefinition('hsk3','a').bank.map(x=>x.sourceItemVersion));
 const alternate=JSON.parse(readFileSync('content/runtime/hsk-mock-exam-alternate-local.json','utf8')).levels.hsk3.items.filter(x=>selected.has(x.sourceItemVersion));
 return [...HSK3_LEVEL_CHECK_ITEMS,...alternate].map(source=>{
  const x=structuredClone(source),n=Number(x.id.slice(-2));
  for(const [a,b]of edits)x.stimulusText=x.stimulusText.replaceAll(a,b);
  if(x.id.includes(':form-a:')&&x.skill==='grammar'){
   const [prompt,text,options,answer,why]=grammar[n-1];x.promptVi=prompt;x.stimulusText=text;x.options=options.map((text,i)=>({optionId:'ABCD'[i],text}));x.correctOptionId='ABCD'[answer];x.explanationVi=why;
  }else if(x.skill==='vocabulary'){
   x.options=x.options.map(o=>({...o,text:o.text.replace('đưa, cầm; giới từ đưa tân ngữ lên trước động từ','lượng từ cho vật có cán; giới từ 把 đưa tân ngữ lên trước động từ').replace('lớp học; khối lớp','lớp; tập thể học sinh trong một lớp').replace('gần đây; khu vực lân cận','khu vực ở gần; lân cận')}));
   x.explanationVi='Trong câu/mục này, nghĩa phù hợp là “'+x.options.find(o=>o.optionId===x.correctOptionId).text+'”.';
   if(x.id.includes(':form-a:')&&n===4){x.stimulusText='他买了一把伞。';x.promptVi='Chọn chức năng của 把 trong câu.';x.options=[{optionId:'A',text:'Động từ mua'},{optionId:'B',text:'Giới từ trong câu 把'},{optionId:'C',text:'Lượng từ đếm chiếc ô'},{optionId:'D',text:'Từ chỉ phương hướng'}];x.correctOptionId='C';x.explanationVi='一把伞 là một chiếc ô; 把 ở đây là lượng từ, không phải giới từ của câu xử lý tân ngữ.';}
   if(x.id.includes(':form-a:')&&n===11){x.stimulusText='这张卡是我的。';x.promptVi='Chọn nghĩa của 卡 trong câu.';x.options=[{optionId:'A',text:'Người trẻ tuổi'},{optionId:'B',text:'Bị kẹt'},{optionId:'C',text:'Cuộc trò chuyện'},{optionId:'D',text:'Thẻ'}];x.correctOptionId='D';x.explanationVi='这张卡 là chiếc thẻ này; 张 là lượng từ. 卡 đọc kǎ ở nghĩa danh từ, không dùng mẫu này để dạy qiǎ trong 卡住.';}
  }else{
   x.promptVi=x.promptVi.replace('đoạn tám dòng','đoạn văn');
   x.explanationVi='Nội dung xoay quanh “'+x.options.find(o=>o.optionId===x.correctOptionId).text+'”. Các chi tiết phải được đọc trong trình tự toàn đoạn; không suy thêm kết quả ngoài nguồn.';
   if(x.id.includes(':form-a:listening:07')){x.promptVi='Vì sao hoạt động được chuyển vào phòng học?';x.explanationVi='Đoạn mở đầu nêu mưa lớn, rồi giáo viên đổi địa điểm; không có dữ kiện bản đồ mất hoặc vườn quá xa.';}
   if(x.id.includes(':form-b:listening:04')){x.promptVi='Hai khó khăn nào khiến khách phải tham gia họp trực tuyến?';x.explanationVi='Khách bị trễ tàu và chân vừa bị thương; email có địa chỉ video giúp khách họp từ ga.';}
   const c=comprehension[x.id.split(':').slice(1).join(':')];
   if(c){const [prompt,options,answer,why]=c;x.promptVi=prompt;x.options=options.map((text,i)=>({optionId:'ABCD'[i],text}));x.correctOptionId='ABCD'[answer];x.explanationVi=why;}
  }
  // Rewritten Hanzi must never retain an obsolete authoring Pinyin transcript.
  if(x.stimulusText!==source.stimulusText)x.pinyinReference=null;
  if(x.skill==='listening')x.syntheticTtsText=x.stimulusText;
  return x;
 });
}
