# Nghiên cứu tính năng nền tảng học tiếng Trung

## Kết luận điều hành

Một sản phẩm học tiếng Trung toàn năng phải giải quyết bảy hệ thống có liên hệ nhưng không đồng nhất: âm vị và thanh điệu, pinyin, từ vựng, Hán tự, ngữ pháp, bốn kỹ năng giao tiếp, và năng lực dùng ngôn ngữ trong ngữ cảnh. Gamification chỉ là lớp duy trì hành vi; nó không thể thay thế mô hình học.

HANZI.OS được định vị ở giao điểm của:

1. Lộ trình game hóa và hình thành thói quen.
2. Khóa học Mandarin có hướng dẫn cho người mới.
3. SRS chuyên sâu cho từ, âm, thanh điệu và chữ viết.
4. Graded reader và nội dung thực được kiểm soát độ khó.
5. Từ điển, OCR, reader và công cụ tra cứu liền mạch.
6. Phòng luyện nói có phản hồi tức thời.
7. Hệ thống HSK, analytics, teacher console và content CMS.

## Benchmark sản phẩm

### Hình thành thói quen và lộ trình

[Duolingo](https://www.duolingo.com/learn) kết hợp bài học đọc, viết, nghe, nói với thử thách, nhắc học và cơ chế game. Bài học rút ra là mỗi phiên cần ngắn, mục tiêu rõ và có feedback tức thời, nhưng HANZI.OS không dùng XP làm đại diện duy nhất cho năng lực.

[SuperChinese](https://www.superchinese.com/) nhấn mạnh khóa học có cấu trúc, bài ngắn, phản hồi AI và lộ trình HSK. HANZI.OS kế thừa nguyên tắc có hướng dẫn nhưng đặt thêm mastery gate: nội dung mới chỉ mở sau bằng chứng truy hồi đạt ngưỡng.

### Khóa học Mandarin cho người mới

[HelloChinese](https://www.hellochinese.cc/) công khai ba năng lực đặc biệt phù hợp tiếng Trung: speech recognition, handwriting và spaced repetition. Đây là bằng chứng sản phẩm cho việc phải dạy âm và chữ từ đầu, không gắn thêm sau khóa học chung.

### Viết Hán tự và active recall

[Skritter](https://docs.skritter.com/article/250-spaced-repetition-system) thiết kế thẻ tương tác riêng cho writing, tone và reading, nhấn mạnh active recall thay vì lật thẻ thụ động. HANZI.OS vì vậy duy trì mastery riêng theo chiều đọc, nghĩa, âm, thanh và viết.

### Đọc nội dung vừa sức

[Du Chinese](https://duchinese.net/) dùng graded stories và nhiều chủ đề để biến đọc thành thói quen. [The Chairman's Bao](https://www.thechairmansbao.com/) bổ sung bài báo phân cấp, audio người thật, bài hiểu và từ điển một chạm. HANZI.OS cần một content graph gắn mỗi văn bản với từ, ngữ pháp, cấp độ, audio và câu hỏi hiểu.

### Từ điển và công cụ học tích hợp

[Pleco](https://www.pleco.com/) kết hợp từ điển được cấp phép, OCR, handwriting, audio, flashcard và document reader. Điểm quan trọng là tra từ phải là hành động một chạm trong mọi ngữ cảnh và từ vừa tra phải đi thẳng vào review queue.

## Cơ sở sư phạm

- Meta-analysis về [spaced practice trong học ngôn ngữ thứ hai](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12479) hỗ trợ lịch ôn phân tán thay vì học dồn.
- Tổng quan về [mastery learning](https://pmc.ncbi.nlm.nih.gov/articles/PMC10159400/) hỗ trợ vòng đánh giá, bổ trợ có mục tiêu và tái kiểm tra trước khi tiến tiếp.
- [Nghiên cứu retrieval practice](https://link.springer.com/article/10.1007/s10648-023-09809-2) củng cố việc buộc người học gọi lại đáp án trước khi xem.
- Nghiên cứu về [corrective feedback cho thanh điệu Mandarin](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/effects-of-implicit-versus-explicit-corrective-feedback-on-mandarin-tone-acquisition-in-a-scmc-learning-environment/87E592FC88FC7018E220E0CB6C50434F/share/f394f655d7a7f1fd5bd441c116b63edec8cff298) cho thấy phản hồi phát âm cần cụ thể và gần thời điểm tạo lỗi.
- Một nghiên cứu về [phản hồi có máy tính cho thanh điệu Mandarin](https://scholars.duke.edu/publication/1510695) củng cố hướng phát triển phản hồi cao độ trực quan thay vì chỉ báo đúng/sai.
- Chuẩn của Bộ Giáo dục Trung Quốc mô tả [ba giai đoạn, chín cấp, bốn yếu tố nền và năm kỹ năng](https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html). Hệ thống nội dung phải lưu được âm tiết, chữ, từ, ngữ pháp, nghe, nói, đọc, viết và dịch.
- [CEFR Companion Volume](https://book.coe.int/en/education-and-modern-languages/8150-common-european-framework-of-reference-for-languages-learning-teaching-assessment-companion-volume.html) bổ sung phonological control, online interaction và mediation; đây là lớp tham chiếu hữu ích bên cạnh HSK.

## Ma trận tính năng cần có

| Miền | Foundation hiện có | Production cần bổ sung |
| --- | --- | --- |
| Onboarding | mục tiêu, căn cơ, thời lượng, script và screening chưa hiệu chỉnh | placement được hiệu chỉnh, timezone, nhắc học |
| Curriculum | path và lesson graph | authoring CMS, prerequisite engine, A/B curriculum |
| Vocabulary | từ, pinyin, nghĩa, ví dụ | licensed dictionary, frequency corpus, collocation |
| SRS | FSRS local cho anonymous; authenticated queue/grade authority phía server bind đúng card/word/version/reset/release/session, dùng scheduler không fuzz và durable outbox, không phát XP | xác minh hosted sync/operations và hiệu chỉnh optimizer bằng dữ liệu thực |
| Pronunciation | TTS, browser ASR, tone pairs | pitch contour, phoneme alignment, native audio |
| Hanzi | animation và quiz nét | radicals, etymology, handwriting scoring, traditional |
| Reading | graded reader, tap lookup | audio sync, content pipeline, news/story catalog |
| Speaking | recognition demo | scenario engine, AI roleplay, rubric, safety |
| Assessment | screening local và đường server closed-alpha cho thống kê mô tả `k/n` + Wilson 95%, không routing/mastery | hosted verification, pilot, item calibration, HSK mocks có review, certificates |
| Motivation | XP/streak/rank local là lớp hỗ trợ hành vi, không phải mastery evidence | leagues, guilds, seasons, anti-cheat, economy có ledger authority |
| Commerce | plan placeholder | subscriptions, family, school, regional pricing |
| Operations | registry/version/hash content, readiness matrix, health checks và restore rehearsal cục bộ cho 12 migration `0000`–`0011`/graph 25 bảng | hosted CI/alerts/backup-restore, admin, CMS, moderation, support, experimentation |

“Hiện có” trong bảng chỉ mô tả mã nguồn và phạm vi regression cục bộ, không xác
nhận một dịch vụ hosted đang hoạt động. Ứng viên `foundation-2026.07.6` chưa
được promote, chưa có linguistic approval và không được tính là coverage đã
phát hành.

## Nguyên tắc sản phẩm

1. Âm thanh đi trước hoặc song song với chữ, không để người mới học “câm”.
2. Từng từ có memory state riêng cho nhận diện, nghĩa, nghe, thanh điệu và viết.
3. Mỗi bài mới phải tạo cơ hội dùng lại kiến thức cũ.
4. Pinyin là giàn giáo có thể giảm dần, không phải chế độ bật/tắt toàn cục duy nhất.
5. Sai phải được giải thích theo loại lỗi, không chỉ hiện đáp án.
6. Nội dung văn hóa cần cụ thể, cập nhật và được biên tập bởi người có chuyên môn.
7. Analytics phải trả lời “học gì tiếp theo”, không chỉ vẽ biểu đồ quá khứ.
