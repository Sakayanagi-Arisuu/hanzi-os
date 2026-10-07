/** Original listening scripts. No native recording is claimed by this manuscript. */
type DictationItem={id:string;hanzi:string;pinyin:string;meaningVi:string;focus:string;feedback:string};
export type DictationManuscript={lessonId:string;objective:string;context:string;preparation:string;items:DictationItem[];transfer:DictationItem;criteria:string[]};
export const dictationManuscripts:DictationManuscript[]=[{
 lessonId:'hsk2-dictation-lesson-01',objective:'Nghe và ghi đúng mốc giờ, số lượng, phủ định trong cụm ngắn',
 context:'Bạn nhận lời nhắn chuẩn bị buổi học nhóm. Ghi dữ kiện để đến đúng lúc, mang đúng đồ và không nhầm điều đã xong với điều chưa xong.',
 preparation:'Nghe trước khi mở chữ. Lượt đầu ghi giờ hoặc từ khóa; lượt sau hoàn thiện cụm. Có thể nhập Pinyin nếu chưa gõ được chữ, nhưng phải ghi nhận hỗ trợ IME/Pinyin. Âm tổng hợp chỉ là phương án luyện thay thế, không phải bản ghi người bản ngữ hay bằng chứng nghe độc lập.',
 items:[
 {id:'time',hanzi:'八点半开始。',pinyin:'Bā diǎn bàn kāishǐ.',meaningVi:'Bắt đầu lúc 8:30.',focus:'Nghe mốc giờ, không đổi 半 thành số phút khác.',feedback:'八点半 = 8:30. Nếu ghi 8:00 thì đã bỏ 半; nếu ghi 8:15 thì nhầm với 八点一刻.'},
 {id:'quantity',hanzi:'带两本书。',pinyin:'Dài liǎng běn shū.',meaningVi:'Mang hai quyển sách.',focus:'Giữ số 两, lượng từ 本 và vật 书.',feedback:'两本书 là hai quyển sách, không phải hai cái bút. Mất lượng từ là chỗ cần sửa dù vẫn đoán được ý.'},
 {id:'not-yet',hanzi:'还没准备好。',pinyin:'Hái méi zhǔnbèi hǎo.',meaningVi:'Vẫn chưa chuẩn bị xong.',focus:'Nghe phủ định 还没, không suy từ chữ 好 rằng đã xong.',feedback:'还没 làm đổi trạng thái thành chưa. 准备好了 sẽ có nghĩa ngược với đoạn nghe.'},
 {id:'request',hanzi:'请帮我拿书。',pinyin:'Qǐng bāng wǒ ná shū.',meaningVi:'Xin giúp tôi lấy sách.',focus:'Xác định người nhận trợ giúp và đồ cần lấy.',feedback:'我 là người nhờ được giúp; 书 là vật. Không đổi thành tôi lấy sách giúp bạn nếu lời nghe không nói vậy.'},
 ],transfer:{id:'new-details',hanzi:'九点开始，带三本书。',pinyin:'Jiǔ diǎn kāishǐ, dài sān běn shū.',meaningVi:'Bắt đầu lúc 9 giờ, mang ba quyển sách.',focus:'Tự nghe lại trong dữ kiện mới, không chép 8:30/hai quyển.',feedback:'Dữ kiện đã đổi cả giờ lẫn số lượng: 9:00 và ba quyển. Đúng âm/từ của lượt cũ chưa đủ cho lượt này.'},
 criteria:['Giữ đủ giờ, số và lượng từ.','Không bỏ phủ định.','Phân biệt người nhờ và đồ cần lấy.','Sau khi mở mẫu, sửa lỗi và thử lại về sau; không tự nhận điểm nghe độc lập.']
},{
 lessonId:'hsk2-dictation-lesson-02',objective:'Nghe–chép câu đầy đủ, giữ vị trí, quan hệ và mức độ',
 context:'Bạn đến gặp một người bạn ở gần ga. Người đó gửi các câu hướng dẫn liên tiếp; chép đúng giúp tránh đứng sai chỗ hoặc đi sai hướng.',
 preparation:'Mỗi câu xác định ai/làm gì/ở đâu. Nghe cả câu trước, sau đó mới ghi. Không nhìn transcript trong lần thử đầu nếu có thể nghe; luôn có lối mở chữ khi âm thanh không dùng được. Khi mở chữ, hoạt động chuyển sang luyện có hỗ trợ.',
 items:[
 {id:'wait',hanzi:'请在车站门口等我。',pinyin:'Qǐng zài chēzhàn ménkǒu děng wǒ.',meaningVi:'Xin đợi tôi ở cửa ga.',focus:'Nơi đợi là cửa ga, không trong lớp hay trước nhà.',feedback:'在车站门口 là một cụm vị trí. 等我 nói bạn đợi tôi; bỏ 门口 làm vị trí kém chính xác.'},
 {id:'walk',hanzi:'从门口往右走。',pinyin:'Cóng ménkǒu wǎng yòu zǒu.',meaningVi:'Từ cửa đi về phía phải.',focus:'Giữ 从 là điểm xuất phát và 往右 là hướng.',feedback:'Không đổi 右 thành 左; nếu không nghe rõ hướng cần nghe lại, không suy từ hình nền.'},
 {id:'pace',hanzi:'请走慢一点儿。',pinyin:'Qǐng zǒu màn yìdiǎnr.',meaningVi:'Xin đi chậm hơn một chút.',focus:'Nghe yêu cầu thay đổi tốc độ, không đổi thành đi nhanh.',feedback:'慢一点儿 yêu cầu chậm hơn chút. 有点儿慢 là đánh giá hơi chậm, không phải cùng câu nghe.'},
 {id:'reason',hanzi:'因为下雨，所以我来晚了。',pinyin:'Yīnwèi xiàyǔ, suǒyǐ wǒ lái wǎn le.',meaningVi:'Vì trời mưa nên tôi đến muộn.',focus:'Giữ thứ tự nguyên nhân và kết quả.',feedback:'Mưa là lý do, đến muộn là hệ quả. Không đảo thành vì đến muộn nên mưa.'},
 ],transfer:{id:'different-route',hanzi:'请在学校门口等我。从门口往左走。',pinyin:'Qǐng zài xuéxiào ménkǒu děng wǒ. Cóng ménkǒu wǎng zuǒ zǒu.',meaningVi:'Xin đợi tôi ở cửa trường. Từ cửa đi về phía trái.',focus:'Đổi ga thành trường và phải thành trái.',feedback:'Hai dữ kiện mới cần nghe lại: 学校 và 左. Không tự điền câu cũ từ trí nhớ.'},
 criteria:['Giữ đầy đủ mốc vị trí.','Đúng trái/phải, không đoán từ ảnh.','Giữ lời yêu cầu và mức độ.','Giữ nguyên nhân trước hệ quả theo câu nghe.']
},{
 lessonId:'hsk2-dictation-lesson-03',objective:'Ghi chuỗi câu có liên kết và theo dõi điều thay đổi',
 context:'Bạn ghi lời nhắn về một buổi học bị đổi phòng và đổi giờ. Nghe thông báo cập nhật quan trọng hơn việc chép lại dữ kiện cũ quen tai.',
 preparation:'Lượt đầu ghi ý chính và mốc cũ/mới. Lượt tiếp theo chép cả chuỗi, chú ý 但是/所以/还没. Mẫu mở sau khi tự thử; tự đối chiếu chưa phải chấm viết hoặc nghe độc lập. Luyện bằng giọng tổng hợp phải hiển thị đúng nhãn nguồn.',
 items:[
 {id:'old-plan',hanzi:'我们原来准备八点上课，在二楼的教室。',pinyin:'Wǒmen yuánlái zhǔnbèi bā diǎn shàngkè, zài èr lóu de jiàoshì.',meaningVi:'Ban đầu chúng tôi định học lúc 8 giờ, ở lớp tầng hai.',focus:'原来 giới thiệu kế hoạch cũ.',feedback:'8 giờ và tầng hai là kế hoạch ban đầu. Cần nghe phần cập nhật trước khi kết luận nơi/giờ cuối cùng.'},
 {id:'new-time',hanzi:'但是老师今天来晚了，所以改成九点开始。',pinyin:'Dànshì lǎoshī jīntiān lái wǎn le, suǒyǐ gǎi chéng jiǔ diǎn kāishǐ.',meaningVi:'Nhưng hôm nay giáo viên đến muộn nên đổi sang bắt đầu 9 giờ.',focus:'改成 là thay đổi, giờ mới là 9:00.',feedback:'Không giữ 8 giờ làm giờ cuối cùng. 老师 là người đến muộn, không phải toàn bộ học sinh.'},
 {id:'new-room',hanzi:'二楼的教室还没准备好，我们去三楼。',pinyin:'Èr lóu de jiàoshì hái méi zhǔnbèi hǎo, wǒmen qù sān lóu.',meaningVi:'Lớp tầng hai chưa chuẩn bị xong, chúng tôi lên tầng ba.',focus:'Nghe phủ định và theo dõi tầng cũ/tầng mới.',feedback:'还没 nói chưa xong; 三楼 là nơi nhóm chuyển tới. Không đổi thành lớp tầng ba chưa sẵn sàng.'},
 {id:'confirmation',hanzi:'请带书和笔，九点在三楼见。',pinyin:'Qǐng dài shū hé bǐ, jiǔ diǎn zài sān lóu jiàn.',meaningVi:'Xin mang sách và bút, hẹn 9 giờ ở tầng ba.',focus:'Lời xác nhận giữ giờ và tầng sau cập nhật.',feedback:'Câu cuối xác nhận 9 giờ/tầng ba. Cần giữ cả sách và bút, không chỉ một món.'},
 ],transfer:{id:'fresh-update',hanzi:'原来十点在四楼上课，现在改成十点半，在五楼。请带本子。',pinyin:'Yuánlái shí diǎn zài sì lóu shàngkè, xiànzài gǎi chéng shí diǎn bàn, zài wǔ lóu. Qǐng dài běnzi.',meaningVi:'Ban đầu học 10 giờ ở tầng bốn, nay đổi sang 10:30 ở tầng năm. Xin mang vở.',focus:'Ghi giờ/tầng cuối cùng và đồ mới cần mang.',feedback:'Thông báo mới chốt 10:30, tầng năm, mang vở. Không áp giờ/tầng của chuỗi trước.'},
 criteria:['Phân biệt kế hoạch cũ với thông báo cuối.','Giữ phủ định và nguyên nhân.','Ghi đúng giờ/tầng/đồ vật sau cập nhật.','Sau đối chiếu, tự nói lại thông tin cuối; chưa tự nhận mastery.']
}];
