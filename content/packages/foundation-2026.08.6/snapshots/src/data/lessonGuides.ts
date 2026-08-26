export type LessonGuide = {
  concept: string;
  rule: string;
  examples: Array<{ chinese: string; pinyin: string; meaning: string }>;
  pitfall: string;
  checkpoint: string;
};

export const LESSON_GUIDES: Record<string, LessonGuide> = {
  "boot-1": {
    concept: "Thanh điệu là một phần của âm tiết, không phải cảm xúc khi nói.",
    rule: "Thanh 1 cao-ngang; thanh 2 đi lên; thanh 3 hạ rồi nhấc; thanh 4 rơi nhanh. Thanh nhẹ ngắn và phụ thuộc âm đứng trước.",
    examples: [
      { chinese: "妈 / 麻 / 马 / 骂", pinyin: "mā / má / mǎ / mà", meaning: "mẹ / cây gai / ngựa / mắng" },
      { chinese: "一 · 二 · 三", pinyin: "yī · èr · sān", meaning: "một · hai · ba" },
    ],
    pitfall: "Đọc thanh 3 quá sâu trong mọi vị trí. Trong lời nói tự nhiên, thanh 3 thường chỉ hạ thấp khi không đứng cuối cụm.",
    checkpoint: "Nghe một âm tiết và nhận ra hướng cao độ trước khi nhìn pinyin.",
  },
  "boot-2": {
    concept: "Lượt thoại đầu tiên chỉ cần đúng đại từ, lời chào và nhịp câu.",
    rule: "你好 ghép 你 (bạn) và 好 (tốt/khỏe). Khi hai thanh 3 đứng cạnh nhau, âm đầu thường đọc gần thanh 2: ní hǎo.",
    examples: [
      { chinese: "你好！", pinyin: "Nǐ hǎo!", meaning: "Xin chào!" },
      { chinese: "我很好。", pinyin: "Wǒ hěn hǎo.", meaning: "Tôi rất khỏe." },
    ],
    pitfall: "Đọc từng chữ tách rời làm câu mất nhịp. Hãy nối cả cụm 你好 thành một đơn vị.",
    checkpoint: "Chào một người và tự xưng bằng 我 mà không nhìn phiên âm.",
  },
  "boot-3": {
    concept: "Âm đầu tiếng Trung thay đổi theo vị trí lưỡi và luồng hơi.",
    rule: "j/q/x đặt mặt lưỡi gần ngạc cứng; zh/ch/sh cuộn đầu lưỡi; z/c/s giữ đầu lưỡi gần răng. q, ch, c bật hơi rõ hơn cặp tương ứng.",
    examples: [
      { chinese: "谢谢", pinyin: "xièxie", meaning: "cảm ơn" },
      { chinese: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc" },
    ],
    pitfall: "Thay q bằng âm 'ch' tiếng Việt hoặc đọc zh giống z. Hãy kiểm tra luồng hơi bằng lòng bàn tay.",
    checkpoint: "Phân biệt được x–sh và z–zh khi chỉ nghe âm thanh.",
  },
  "boot-4": {
    concept: "Thanh điệu thay đổi hình thức trong chuỗi âm nhưng không đổi thanh gốc của từ.",
    rule: "Hai thanh 3 liên tiếp thường thành 2 + 3. 不 đọc bú trước thanh 4; 一 đổi thanh tùy âm đứng sau.",
    examples: [
      { chinese: "你好", pinyin: "ní hǎo", meaning: "xin chào" },
      { chinese: "不是", pinyin: "bú shì", meaning: "không phải" },
    ],
    pitfall: "Viết pinyin theo biến điệu. Từ điển vẫn ghi thanh gốc nǐ hǎo và bù shì.",
    checkpoint: "Nói liền 你好 và 不是 mà không ngắt giữa hai âm tiết.",
  },
  "survival-1": {
    concept: "是 nối chủ thể với danh tính, nghề nghiệp hoặc phân loại.",
    rule: "Cấu trúc: A + 是 + B. Phủ định đặt 不 trước 是: A + 不是 + B.",
    examples: [
      { chinese: "我是学生。", pinyin: "Wǒ shì xuésheng.", meaning: "Tôi là sinh viên." },
      { chinese: "她不是老师。", pinyin: "Tā bú shì lǎoshī.", meaning: "Cô ấy không phải giáo viên." },
    ],
    pitfall: "Dùng 是 trước tính từ: 我是很好. Với tính từ trạng thái, nói 我很好.",
    checkpoint: "Tự giới thiệu vai trò và phủ định một vai trò sai.",
  },
  "survival-2": {
    concept: "吗 biến một câu trần thuật thành câu hỏi có/không.",
    rule: "Giữ nguyên trật tự câu rồi thêm 吗 ở cuối. Trả lời ngắn bằng động từ chính hoặc dạng phủ định của nó.",
    examples: [
      { chinese: "你是学生吗？", pinyin: "Nǐ shì xuésheng ma?", meaning: "Bạn là sinh viên phải không?" },
      { chinese: "是。/ 不是。", pinyin: "Shì. / Bú shì.", meaning: "Phải. / Không phải." },
    ],
    pitfall: "Vừa dùng 吗 vừa đảo trật tự như tiếng Việt. Tiếng Trung không cần đảo chủ ngữ và động từ.",
    checkpoint: "Tạo được một câu hỏi 吗 và trả lời bằng đúng động từ.",
  },
  "survival-3": {
    concept: "Cụm xã giao cần đúng ngữ cảnh và ngữ điệu, không chỉ đúng nghĩa từ.",
    rule: "谢谢 dùng để cảm ơn; 谢谢你 nhấn người được cảm ơn. 再见 dùng khi chia tay và thường đi sau cách xưng hô.",
    examples: [
      { chinese: "谢谢你！", pinyin: "Xièxie nǐ!", meaning: "Cảm ơn bạn!" },
      { chinese: "老师，再见！", pinyin: "Lǎoshī, zàijiàn!", meaning: "Tạm biệt thầy/cô!" },
    ],
    pitfall: "Đọc âm nhẹ thứ hai của 谢谢 thành thanh 4 quá mạnh.",
    checkpoint: "Mở và kết thúc một lượt thoại lịch sự.",
  },
  "survival-4": {
    concept: "Quốc tịch thường được tạo bằng tên quốc gia + 人.",
    rule: "Cấu trúc: 我是 + quốc gia + 人. Khi nói nơi xuất thân, dùng 我来自 + địa điểm.",
    examples: [
      { chinese: "我是越南人。", pinyin: "Wǒ shì Yuènán rén.", meaning: "Tôi là người Việt Nam." },
      { chinese: "我来自越南。", pinyin: "Wǒ láizì Yuènán.", meaning: "Tôi đến từ Việt Nam." },
    ],
    pitfall: "Bỏ 人 khi muốn nói quốc tịch của một người.",
    checkpoint: "Nói được quốc tịch và nơi đến bằng hai cấu trúc khác nhau.",
  },
  "daily-1": {
    concept: "有 diễn đạt sở hữu; số lượng cần lượng từ trước danh từ.",
    rule: "Cấu trúc: Chủ thể + 有 + số + 个 + 人. 个 là lượng từ phổ biến cho người trong mẫu cơ bản.",
    examples: [
      { chinese: "我家有三个人。", pinyin: "Wǒ jiā yǒu sān ge rén.", meaning: "Nhà tôi có ba người." },
      { chinese: "你家有几个人？", pinyin: "Nǐ jiā yǒu jǐ ge rén?", meaning: "Nhà bạn có mấy người?" },
    ],
    pitfall: "Đặt số trực tiếp trước danh từ mà thiếu lượng từ 个.",
    checkpoint: "Nói được số người trong gia đình và hỏi lại người đối diện.",
  },
  "daily-2": {
    concept: "Động từ ăn/uống đứng trước món; chủ ngữ thường được giữ rõ ở giai đoạn đầu.",
    rule: "Cấu trúc: Chủ thể + 吃/喝 + đồ ăn/thức uống. Thêm 吗 cuối câu để hỏi.",
    examples: [
      { chinese: "我吃米饭。", pinyin: "Wǒ chī mǐfàn.", meaning: "Tôi ăn cơm." },
      { chinese: "你喝茶吗？", pinyin: "Nǐ hē chá ma?", meaning: "Bạn uống trà không?" },
    ],
    pitfall: "Đưa món ăn lên trước động từ theo trật tự tiếng Việt hội thoại.",
    checkpoint: "Nói một thứ bạn ăn, một thứ bạn uống và hỏi người khác.",
  },
  "daily-3": {
    concept: "Từ chỉ thời gian thường đứng sau chủ ngữ hoặc ở đầu câu.",
    rule: "今天 có thể đứng đầu câu để đặt bối cảnh. Tiếng Trung không chia động từ theo thời.",
    examples: [
      { chinese: "今天天气很好。", pinyin: "Jīntiān tiānqì hěn hǎo.", meaning: "Hôm nay thời tiết rất đẹp." },
      { chinese: "我今天看书。", pinyin: "Wǒ jīntiān kàn shū.", meaning: "Hôm nay tôi đọc sách." },
    ],
    pitfall: "Đổi hình thức động từ để biểu thị hiện tại như trong một số ngôn ngữ châu Âu.",
    checkpoint: "Đặt 今天 đúng vị trí trong hai mẫu câu khác nhau.",
  },
  "daily-4": {
    concept: "的 nối người/vật sở hữu với danh từ được sở hữu.",
    rule: "Cấu trúc: người sở hữu + 的 + vật. Với quan hệ rất gần, 的 đôi khi được lược bỏ, nhưng người mới nên giữ để rõ cấu trúc.",
    examples: [
      { chinese: "这是我的书。", pinyin: "Zhè shì wǒ de shū.", meaning: "Đây là sách của tôi." },
      { chinese: "老师的书", pinyin: "lǎoshī de shū", meaning: "sách của giáo viên" },
    ],
    pitfall: "Đảo thành 书的我. Thành phần sở hữu luôn đứng trước 的.",
    checkpoint: "Chỉ được ba đồ vật và nói chúng thuộc về ai.",
  },
  "characters-1": {
    concept: "Nét được viết theo hướng và thứ tự, không phải vẽ lại hình tổng thể.",
    rule: "Nguyên tắc nền: trên trước dưới, trái trước phải, ngang trước sổ, ngoài trước trong và đóng khung sau.",
    examples: [
      { chinese: "一", pinyin: "yī", meaning: "một nét ngang từ trái sang phải" },
      { chinese: "人", pinyin: "rén", meaning: "phẩy trước, mác sau" },
    ],
    pitfall: "Viết đúng hình nhưng sai hướng nét; điều này làm chữ khó ổn định khi viết nhanh.",
    checkpoint: "Viết 一, 二, 三 và 人 đúng hướng mà không nhìn hoạt ảnh.",
  },
  "characters-2": {
    concept: "Hán tự được nhớ tốt hơn khi tách thành thành phần có vị trí và chức năng.",
    rule: "亻 thường gợi liên hệ với người; 宀 gợi mái nhà; 女 là thành phần bên trái trong 好.",
    examples: [
      { chinese: "你", pinyin: "nǐ", meaning: "亻 ở trái gợi người" },
      { chinese: "家", pinyin: "jiā", meaning: "宀 ở trên gợi mái nhà" },
    ],
    pitfall: "Ghi nhớ cả chữ như một bức tranh không có cấu trúc.",
    checkpoint: "Chỉ ra được thành phần định vị trong 你, 好 và 家.",
  },
  "characters-3": {
    concept: "Chữ gần hình cần được phân biệt bằng thành phần và vị trí nét chủ chốt.",
    rule: "So sánh theo ba bước: khung tổng thể, bộ/thành phần, nét khác biệt. Luôn gắn khác biệt hình với âm và nghĩa.",
    examples: [
      { chinese: "书 / 看", pinyin: "shū / kàn", meaning: "sách / nhìn, đọc" },
      { chinese: "人 / 入", pinyin: "rén / rù", meaning: "người / vào" },
    ],
    pitfall: "Chỉ nhìn kích thước hoặc kiểu font, vốn thay đổi giữa thiết bị.",
    checkpoint: "Nêu được nét hoặc thành phần làm hai chữ khác nhau.",
  },
  "characters-4": {
    concept: "Viết từ trí nhớ là truy hồi tạo sinh, mạnh hơn việc chép lại.",
    rule: "Nhìn nghĩa → gọi âm → dựng thành phần → viết → so sánh. Chỉ xem gợi ý sau một lần tự thử.",
    examples: [
      { chinese: "我", pinyin: "wǒ", meaning: "tôi" },
      { chinese: "是", pinyin: "shì", meaning: "là" },
    ],
    pitfall: "Chép liên tục khiến tay quen nhưng trí nhớ không tự dựng được chữ.",
    checkpoint: "Viết được ba chữ mục tiêu sau 30 giây không nhìn mẫu.",
  },
};

export const getLessonGuide = (lessonId: string): LessonGuide =>
  LESSON_GUIDES[lessonId] ?? {
    concept: "Dùng từ mới trong một hành động giao tiếp hoàn chỉnh.",
    rule: "Học âm, nghĩa và cấu trúc trong câu; sau đó tự tạo một câu mới thay vì chỉ nhận diện.",
    examples: [
      { chinese: "先理解，再表达。", pinyin: "Xiān lǐjiě, zài biǎodá.", meaning: "Hiểu trước, diễn đạt sau." },
    ],
    pitfall: "Chỉ chọn đúng đáp án quen mắt mà không tự gọi lại từ trí nhớ.",
    checkpoint: "Tự nói hoặc viết một câu mới bằng nội dung vừa học.",
  };
