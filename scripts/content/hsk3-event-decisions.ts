export type EventGrammarDecision={row:string;title:string;prompt:string;answer:string;answerPinyin:string;answerVi:string;feedback:string;example?:[string,string,string];boundary?:string};
const rows:Array<[string,string,string,string,string,string,string]>=[
 ['005','Chèn số lần trong 见面','Gặp nhau ba lần: 我们见了三次___。','面','miàn','mặt; cùng 见 tạo 见面','见面 là động–tân ly hợp; số lần nằm giữa 见 và 面.'],
 ['006','Làm được, chưa phải đã xong','Việc không nhiều nên hôm nay làm xong được: 任务不多，我们今天完___成。','得','de','được','完得成 biểu thị khả năng; 完成了 mới nêu việc đã hoàn thành.'],
 ['027','Đổi góc nhìn sang vật','Thầy đã mang tài liệu cũ đi. Giữ đúng tác nhân: 旧文件___老师拿走了。','被','bèi','được/bị','被 đặt vật chịu tác động làm chủ ngữ, 老师 vẫn là người mang đi.'],
 ['033','Kết quả nghe hiểu','Đã nghe và hiểu yêu cầu: 我们听___了要求。','懂','dǒng','hiểu','听懂 có kết quả hiểu; 听了 chỉ xác nhận đã nghe.'],
 ['057','Đóng cửa sổ lại','Trước khi rời lớp, đóng cửa sổ lại: 请把窗户关___。','上','shàng','lại','关上 nêu kết quả đóng, không phải tắt thiết bị điện.'],
 ['058','Nhớ ra, không phải chuyển động','Trưởng nhóm nhớ ra cách lần trước: 组长想___了上次的办法。','起','qǐ','ra','想起 là nhớ ra; 起 trong tổ hợp này không có nghĩa đứng dậy.'],
 ['059','Bắt đầu thảo luận','Nghe có vấn đề, mọi người bắt đầu bàn: 大家讨论___。','起来','qǐlai','bắt đầu','讨论起来 chỉ sự khởi phát, không nói đã giải quyết xong.'],
 ['060','Tiếp tục từ hiện tại','Mong tiếp tục giữ thói quen tốt: 希望你能坚持___。','下去','xiàqu','tiếp tục','下去 hướng tới việc tiếp diễn; 坚持下来 nhìn lại quá trình duy trì.'],
 ['061','Không đạt kết quả trong điều kiện hiện tại','Âm lượng quá nhỏ nên không nghe rõ: 声音太小，我听___清。','不','bu','không','听不清 đặt 不 giữa động từ và bổ ngữ; không đồng nghĩa không muốn nghe.'],
 ['067','Vị trí sau khi chuyển vật','Chuyển ghế tới cạnh cửa sổ: 请把椅子搬___窗户旁边。','到','dào','tới','搬到 nêu đích chuyển ghế; vị trí sau 把 là vật được chuyển.'],
 ['068','Vật và người nhận','Giao chìa khóa cho nhân viên: 小林把钥匙交___了工作人员。','给','gěi','cho','钥匙 là vật sau 把; 工作人员 là người nhận sau 给.'],
 ['069','Xử lý đến kết quả rõ','Sửa lỗi cho đúng: 我们把错误改___了。','正','zhèng','đúng','改正错误 là sửa lỗi cho đúng; 写清楚 diễn đạt viết cho rõ, không ghép 改清楚错误.'],
 ['070','Tác nhân trong câu bị động','Quản lý đã sửa báo cáo ba lần. Điền người thực hiện: 报告被___改了三次。','经理','jīnglǐ','quản lý','Người sau 被 là tác nhân; 三次 là số lần, không phải số người.'],
 ['071','Bị động lược người thực hiện','Tài liệu đã bị xóa, chưa biết ai xóa: 文件___删掉了。','被','bèi','bị','Câu không nêu tác nhân; không được tự suy là quản lý xóa.'],
 ['072','Cầm tài liệu trong khi đi','Vừa cầm tài liệu vừa vào phòng: 经理拿___文件走进会议室。','着','zhe','đang; đi kèm','拿着 là trạng thái đồng thời với 走进, không phải hai việc nối tiếp.'],
 ['078','Giới thiệu người mới xuất hiện','Hai học viên vừa bước vào lớp; giữ nơi chốn đầu câu: 教室里___两名新同学。','走进来了','zǒu jìnlai le','đã bước vào','Nơi chốn + hành động xuất hiện + số lượng/người mới; 两名新同学 đứng sau động từ trong mẫu này.'],
 ['079','Nêu người rời một nơi','Ba người rời văn phòng: 办公室里___三个人。','走了','zǒu le','đã rời đi','走了 chỉ sự rời đi; không có dữ kiện sa thải hoặc lý do.'],
 ['081','Lặp động từ để gắn bổ ngữ','Điền phần lặp trong khung: 小林说汉语___很流利。','说得','shuō de','nói (rất…)','说汉语说得… giữ tân ngữ sau lần 说 đầu; bổ ngữ mức độ theo lần 说 thứ hai.'],
];
export const eventDecisions:EventGrammarDecision[]=rows.map(([row,title,prompt,answer,answerPinyin,answerVi,feedback])=>({row,title,prompt,answer,answerPinyin,answerVi,feedback}));
const corrections:Record<string,Pick<EventGrammarDecision,'example'|'boundary'>>={
 '006':{example:['任务不多，我们今天完得成。','Rènwu bù duō, wǒmen jīntiān wán de chéng.','Việc không nhiều, hôm nay chúng tôi hoàn thành được.']},
 '057':{example:['听到铃声以后，我们关上窗户，离开了教室。','Tīngdào língshēng yǐhòu, wǒmen guānshàng chuānghu, líkāi le jiàoshì.','Nghe thấy chuông, chúng tôi đóng cửa sổ rồi rời lớp.']},
 '069':{example:['我们把错误改正了，也把旧资料拿回来了。','Wǒmen bǎ cuòwù gǎizhèng le, yě bǎ jiù zīliào ná huílai le.','Chúng tôi sửa đúng lỗi và mang tài liệu cũ trở lại.']},
 '078':{example:['会议室里走进来了一位新客户，大家马上站起来。','Huìyìshì lǐ zǒu jìnlai le yí wèi xīn kèhù, dàjiā mǎshàng zhàn qǐlai.','Một khách mới bước vào phòng họp; mọi người lập tức đứng lên.'],boundary:'Trong mẫu tồn hiện này, nơi chốn đứng đầu và người mới xuất hiện đứng sau động từ. Câu chủ–vị với người đứng đầu cũng có thể đúng, nhưng cách tổ chức thông tin khác.'},
 '079':{example:['项目结束后，公司里走了两名实习生。','Xiàngmù jiéshù hòu, gōngsī lǐ zǒu le liǎng míng shíxíshēng.','Sau khi dự án kết thúc, hai thực tập sinh rời công ty.']},
 '081':{example:['她写报告写得很认真，也学汉语学了两年。','Tā xiě bàogào xiě de hěn rènzhēn, yě xué Hànyǔ xué le liǎng nián.','Cô viết báo cáo rất cẩn thận và cũng đã học tiếng Trung hai năm.'],boundary:'Khi giữ tân ngữ giữa hai lần động từ, lần thứ hai nhận bổ ngữ: 写报告写得很认真. 她工作很认真 vẫn là câu đúng trong cấu trúc khác; không gắn nhãn sai cho câu đó.'},
};
for(const decision of eventDecisions)Object.assign(decision,corrections[decision.row]);
