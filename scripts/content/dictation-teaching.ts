export const dictationTeaching:Record<string,{rule:string;hanzi:string;pinyin:string;meaningVi:string;prompt:string;answer:string;feedback:string}[]>={
 'hsk2-dictation-lesson-01':[
  {rule:'Chia lời nhắn thành cụm giờ → hành động. 半 sau giờ là nửa giờ. Chép từng cụm rồi kiểm lại, không đoán phút từ thói quen.',hanzi:'十点半见。',pinyin:'Shí diǎn bàn jiàn.',meaningVi:'Hẹn gặp 10:30.',prompt:'Mẫu 十点半见 hẹn lúc mấy giờ? Điền dạng HH:MM.',answer:'10:30',feedback:'十点 là 10 giờ, 半 thêm nửa giờ. 10:00 bỏ mất thông tin.'},
  {rule:'Số + lượng từ + vật là một cụm. Hai quyển dùng 两本; đừng chỉ ghi số mà bỏ tên đồ. 还没 đứng trước hành động để nói vẫn chưa xảy ra hoặc chưa xong.',hanzi:'我还没买三本书。',pinyin:'Wǒ hái méi mǎi sān běn shū.',meaningVi:'Tôi vẫn chưa mua ba quyển sách.',prompt:'Trong 我___买三本书, điền cụm nghĩa “vẫn chưa”.',answer:'还没',feedback:'还没 giữ trạng thái chưa mua. Có 三本书 trong câu không chứng minh đã mua sách.'},
 ],
 'hsk2-dictation-lesson-02':[
  {rule:'在 + nơi chốn đứng trước hành động cho biết làm ở đâu. 从 + mốc là điểm bắt đầu; 往 + hướng là hướng di chuyển. Tách ba phần để không nhầm nơi đợi với nơi đến.',hanzi:'在商店门口等。从这里往前走。',pinyin:'Zài shāngdiàn ménkǒu děng. Cóng zhèlǐ wǎng qián zǒu.',meaningVi:'Đợi ở cửa hàng. Từ đây đi về phía trước.',prompt:'Trong ___这里往前走, điền từ đánh dấu điểm xuất phát.',answer:'从',feedback:'从这里 nói từ đây; 往前 nói về trước. Hai phần có chức năng khác nhau.'},
  {rule:'Yêu cầu chậm hơn dùng 慢一点儿; 有点儿慢 nhận xét hơi chậm. 因为 mở lý do và 所以 mở kết quả; ghi đúng quan hệ ngay cả khi nghe được từng từ.',hanzi:'因为很累，所以我走得很慢。',pinyin:'Yīnwèi hěn lèi, suǒyǐ wǒ zǒu de hěn màn.',meaningVi:'Vì rất mệt nên tôi đi chậm.',prompt:'因为很累，___我走得很慢。 Điền từ mở kết quả.',answer:'所以',feedback:'Mệt là lý do, đi chậm là kết quả. Không đảo hai ý khi ghi chép.'},
 ],
 'hsk2-dictation-lesson-03':[
  {rule:'原来 nói kế hoạch ban đầu; 现在/改成 báo dữ kiện cập nhật. Ghi hai cột cũ–mới để tránh giữ nhầm thông tin đã thay. 改成 + mốc mới nghĩa là đổi sang mốc đó.',hanzi:'原来周一见，现在改成周二。',pinyin:'Yuánlái zhōuyī jiàn, xiànzài gǎi chéng zhōuèr.',meaningVi:'Ban đầu hẹn thứ hai, nay đổi sang thứ ba.',prompt:'Lịch cuối cùng là thứ nào? Điền bằng Hán tự theo câu mẫu.',answer:'周二',feedback:'周一 là lịch cũ. Sau 改成 là 周二, lịch mới.'},
  {rule:'Đọc cả chuỗi trước khi xác nhận. 还没准备好 nói chưa sẵn sàng; 所以 có thể nối nguyên nhân với việc đổi nơi. Một thông báo cuối có thể nhắc lại giờ/nơi để chốt.',hanzi:'房间还没准备好，所以我们在大厅等。',pinyin:'Fángjiān hái méi zhǔnbèi hǎo, suǒyǐ wǒmen zài dàtīng děng.',meaningVi:'Phòng chưa sẵn sàng nên chúng tôi đợi ở sảnh.',prompt:'Theo câu mẫu, nhóm đợi ở đâu? Điền tên nơi chốn bằng Hán tự.',answer:'大厅',feedback:'Phòng là nơi chưa sẵn sàng; sảnh mới là nơi đang đợi. 大厅 (dàtīng) nghĩa là sảnh.'},
 ],
};
export const dictationWordExamples:Record<string,[string,string,string]>={
 'hsk-vocab-00301':['好啊，我们一起去。','Hǎo a, wǒmen yìqǐ qù.','Được thôi, chúng ta cùng đi.'],
 'hsk-vocab-00434':['我的手表在桌子上。','Wǒ de shǒubiǎo zài zhuōzi shàng.','Đồng hồ đeo tay của tôi ở trên bàn.'],
 'hsk-vocab-00334':['我在门口等你。','Wǒ zài ménkǒu děng nǐ.','Tôi đợi bạn ở cửa.'],
 'hsk-vocab-00487':['她丈夫今天在家。','Tā zhàngfu jīntiān zài jiā.','Chồng cô ấy hôm nay ở nhà.'],
 'hsk-vocab-00347':['过马路的时候要小心。','Guò mǎlù de shíhou yào xiǎoxīn.','Khi qua đường phải cẩn thận.'],
 'hsk-vocab-00354':['我想喝一杯红茶。','Wǒ xiǎng hē yì bēi hóngchá.','Tôi muốn uống một cốc trà đen.'],
 'hsk-vocab-00494':['这本书是我自己买的。','Zhè běn shū shì wǒ zìjǐ mǎi de.','Quyển sách này do chính tôi mua.'],
 'hsk-vocab-00367':['老师教我们写汉字。','Lǎoshī jiāo wǒmen xiě Hànzì.','Giáo viên dạy chúng tôi viết chữ Hán.'],
 'hsk-vocab-00374':['我经常坐公交车去学校。','Wǒ jīngcháng zuò gōngjiāochē qù xuéxiào.','Tôi thường đi xe buýt đến trường.'],
 'hsk-vocab-00467':['她的眼睛很大。','Tā de yǎnjing hěn dà.','Mắt cô ấy to.'],
};
