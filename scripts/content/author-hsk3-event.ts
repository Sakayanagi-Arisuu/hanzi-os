import {buildGrammarNarrativeBatch,type NarrativeVisual} from './build-grammar-narrative-batch';
import {eventNarratives} from './hsk3-event-narratives';
import {eventDecisions} from './hsk3-event-decisions';

const visuals:Record<string,NarrativeVisual>={
 'lesson-01':{type:'timeline',title:'Đã đạt kết quả hay mới có khả năng?',description:'Hai buổi gặp có kết quả khác nhau. Tách phần đầu đã xong khỏi phần còn lại được dự đoán làm xong ngày mai.',nodes:[
  ['first','第一次：没听懂','dì yī cì: méi tīngdǒng','lần đầu: chưa nghe hiểu','Thầy giải thích thêm một lượt.'],
  ['notes','把重点记下来','bǎ zhòngdiǎn jì xiàlai','ghi lại điểm chính','Trưởng nhóm nhớ ra cách cũ.'],
  ['second','第二次：第一部分写完了','dì èr cì: dì yī bùfen xiěwán le','lần hai: viết xong phần đầu','Kết quả đã đạt.'],
  ['future','明天完得成','míngtiān wán de chéng','ngày mai hoàn thành được','Nhận định về khả năng của phần còn lại.'],
 ]},
 'lesson-02':{type:'comparison',title:'Ba vật, ba vị trí và vai trò',description:'Theo dõi vật được đặt, vật được giao và vật được tìm lại; không suy người làm thất lạc báo cáo.',nodes:[
  ['file','旧文件 → 老师的桌子','jiù wénjiàn → lǎoshī de zhuōzi','tài liệu cũ → bàn thầy','Tiểu Lâm đặt tài liệu.'],
  ['key','钥匙 → 工作人员','yàoshi → gōngzuò rényuán','chìa khóa → nhân viên','Tiểu Lâm giao chìa khóa tủ.'],
  ['report','报告：在柜子里面','bàogào: zài guìzi lǐmian','báo cáo: bên trong tủ','Nhân viên mở tủ, nhóm tìm thấy và mang về.'],
 ]},
 'lesson-03':{type:'timeline',title:'Một tuần thực tập: người, việc và số lần',description:'Ba là số lần sửa, một là số khách mới, hai là số thực tập sinh rời công ty. Không dùng các số này thay cho nhau.',nodes:[
  ['revision','第一天：经理改了三次','dì yī tiān: jīnglǐ gǎi le sān cì','ngày đầu: quản lý sửa ba lần','Báo cáo của người kể được sửa.'],
  ['meeting','拿着文件走进会议室','názhe wénjiàn zǒujìn huìyìshì','cầm tài liệu đi vào phòng họp','Cầm và đi diễn ra đồng thời.'],
  ['client','一位新客户走进来','yí wèi xīn kèhù zǒu jìnlai','một khách mới bước vào','Mọi người đứng lên chào.'],
  ['finish','一周后：走了两名实习生','yì zhōu hòu: zǒu le liǎng míng shíxíshēng','một tuần sau: hai thực tập sinh rời đi','Chưa biết lý do rời công ty.'],
 ]},
};
buildGrammarNarrativeBatch({lessonPrefix:'hsk3-event-complements-voice',level:'hsk3',sourcePack:'hsk3-event-complements-narration-grammar-2026.07',outputFile:'thien-lo-hsk3-event-v2',manuscripts:eventNarratives,decisions:eventDecisions,visuals,answerReadings:{
 'lesson-01':['Dì yī bùfen xiěwán le.','Phần đầu đã viết xong.'],
 'lesson-02':['Guìzi de yàoshi.','Chìa khóa tủ.'],
 'lesson-03':['Jīnglǐ gǎi le sān cì.','Quản lý sửa ba lần.'],
},targets:{
 'lesson-01':{reading:['006','033'],guided:['033'],writing:['005','006','058']},
 'lesson-02':{reading:['068'],guided:['068'],writing:['067','068','069']},
 'lesson-03':{reading:['070'],guided:['072'],writing:['070','072','078','079','081']},
}});
