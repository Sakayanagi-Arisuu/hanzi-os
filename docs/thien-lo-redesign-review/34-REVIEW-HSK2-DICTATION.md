# Ba bài nghe–chép HSK2 · review local 22/09/2026

AI-assisted, humanReviewed:false. Chưa có audio người bản ngữ đã duyệt. Browser TTS được ghi nhãn giọng tổng hợp, không tạo điểm nghe/phát âm độc lập. Không tuyên bố đủ HSK bằng số trang.

## Nội dung

- 01: cụm giờ/số lượng/phủ định/yêu cầu giúp chuẩn bị sách; chuyển giao đổi 8:30/hai sách thành 9:00/ba sách.
- 02: nơi đợi, điểm xuất phát/hướng đi, mức độ và nguyên nhân; chuyển giao đổi cửa ga/phải thành cửa trường/trái.
- 03: thông báo đổi giờ/phòng, phân biệt kế hoạch cũ với thông tin chốt; chuyển giao thay 9 giờ/tầng ba thành 10:30/tầng năm, mang vở.

Mỗi bài có ảnh mở đầu riêng, từ vựng giữ ID, hai phần giải thích + ví dụ + cloze hiểu văn bản trước khi nghe, bốn đoạn nghe–chép, một lượt đổi dữ kiện, phản hồi cụ thể và tự kiểm. Sáu cloze gắn nguồn task đúng bài, skill reading: nhìn câu mẫu không được tính là evidence nghe. Bản nháp được đối chiếu chuỗi có bỏ dấu câu/khoảng trắng, không phải chấm bài viết mở.

## Rà năm mặt

1. Accuracy: kiểm giờ nửa giờ, 两本, 还没, 从/往, 慢一点儿, 因为/所以, 原来/改成. Pinyin/Việt khớp mỗi câu. 红茶 là trà đen; 过 guò dùng qua đường, không lẫn trợ từ guo.
2. Level fit: cụm ngắn → câu → chuỗi bốn câu. Mẫu có từ hỗ trợ 原来/改成/大厅 được giải thích; không yêu cầu suy nghĩa chỉ từ tranh. Tranh chỉ là bối cảnh.
3. Pedagogy: hướng dẫn và ví dụ khác câu nghe chính đi trước; feedback chỉ ra thành phần bị mất/đổi; transfer đổi dữ kiện, không chép lại lượt cũ. Có mở chữ khi không nghe được và ghi nhận dùng Pinyin/gợi ý bàn phím.
4. Answer integrity: cloze có đáp án cụ thể, câu hỏi phân biệt đúng dữ kiện. Đối chiếu dictation là tự luyện, không thưởng mastery. Snapshot lượt đầu, lịch sử mở mẫu và trợ giúp phải giữ khi sửa đáp án.
5. Originality: kịch bản/giải thích/tình huống do đợt này biên soạn; giữ mục từ nền có ID; ảnh mới bằng built-in imagegen, nguồn tại review 33. Không sao chép ChineseSkill.

## Phạm vi và giới hạn

Không đổi prerequisite, completion, từ/chữ IDs, FSRS, owner, outbox hoặc phiên cũ. Ảnh/trang/bài tập đều là dữ liệu Xưởng. Ví dụ từ vựng sửa trong bài; không tuyên bố mọi consumer dùng package nền đã nhận sửa tương ứng. Nguồn task trong package cũ vẫn được giữ, chưa tuyên bố nâng toàn bộ Nói/Đọc/assessment. Release local và browser phải ghi kết quả thực tế tại checkpoint; tài liệu review này không tự chứng minh đã phát hành.


## Kết quả phát hành và kiểm

Ngày 22/09 đã import/release local ba bài, giữ 37 bảng khi nhập và 36 bảng/FK khi phát hành. Backup `before-authored-thien-lo-batch-release-2026-09-22T03-21-24-565Z.sqlite`. Tám tests nội dung/session đạt; typecheck/ESLint đạt. Xưởng browser 17.7 giây, learner 33.7 giây: prerequisite bị khóa trước fixture, runtime chính xác, ba ảnh đúng, nghe/nhập/đối chiếu/mở/thu mẫu, reload giữ bản nháp và trợ giúp, sửa đúng. Không xem browser TTS là review giọng bản ngữ. Inventory local lên 81 authored, không phải đủ toàn bộ scope.
