# HSK2 nhận diện người và kể sự việc

20/09/2026 · AI self-review · humanReviewed:false.
Phạm vi: person-events-environment-01/02; 22 trang, 25 từ theo inventory bài, sáu hoạt động có mục tiêu và nguồn. Đã phát hành local ngày 20/09/2026 sau review.

## Năm pass

1. Mandarin: 比 so sánh hai đối tượng; 最 dùng phạm vi ba người rõ. Không suy thói quen từ ngoại hình. Hồi nhỏ/hiện tại tách nơi ở. Bài sự việc dùng 从…到…/等了 để nói khoảng đợi, phân biệt với giờ đến và số phút muộn. 可能 giữ tính phỏng đoán; thay câu nguồn ngụ ý đổi tàu điện ngầm sẽ chắc chắn không muộn bằng 希望能准时到.
2. Pinyin: 长 cháng khi tóc dài, 个子 gèzi, 头发 tóufa, 得/地 de nhẹ ở hai vị trí khác nhau. 最高 zuì gāo, 比 bǐ; số giờ giữ cách đọc số đếm. Các câu mẫu và transfer đều có Pinyin cùng nghĩa Việt.
3. Tiếng Việt: không dịch điểm đồng hồ thành thời lượng. 8:20–8:50 là đợi 30 phút, 9:00–9:10 là muộn 10 phút. Transfer đổi 13:20–13:40 và 14:00–14:05, model nêu rõ muộn 5 phút.
4. Sư phạm: hồ sơ ba nhân vật dùng diagram biên tập được thay cho suy đoán từ ảnh nền. Lý Mai và Trần Minh trong transfer có quê/nơi ở/môn yêu thích khác nhau. Distractor kiểm nhầm “cao hơn → cao nhất”, đổi thời lượng và biến phỏng đoán thành chắc chắn. Cloze so 比/最 hoặc tính phút; viết chỉ tự đối chiếu rubric, không cấp mastery.
5. Coverage: giữ IDs/tiên quyết/word IDs, grammar/task source IDs hiện hành. Mọi từ có câu/Pinyin/Việt, thay headword 長/高/等/为什么 bằng ví dụ; dùng 时 trong 上课时 thay vì chỉ minh họa thành tố 时间. Không đổi từ điển gốc trong lô này. Tests bảo toàn nguồn, parity Xưởng/reader và logic đáp án đạt.

## Giới hạn

- Diagram là nội dung riêng có thể sửa trong Xưởng; campus art còn chung và được nói rõ không phải căn cứ nhận diện ba nhân vật. Chưa hoàn tất toàn bộ yêu cầu media riêng.
- Các ví dụ từ điển nền chưa đồng bộ theo lô này. Nội dung AI-assisted không thành human-reviewed; số trang không chứng minh đủ HSK hoặc mastery.
- Chỉ phát hành sau validate, rehearsal bảo toàn dữ liệu và review binding khớp nội dung cuối.

## Kết quả giao lên web

Import/release rehearsal và apply đạt, giữ 37/36 bảng được bảo vệ và FK. Hai tests nội dung đạt; Studio exact-document/diagram/feedback đạt 2.3 phút; learner prerequisite/exact runtime/answer/reload/transfer đạt 44.8 giây. Typecheck/ESLint đạt. Backup trước phát hành: `.wrangler/demo-backups/before-authored-thien-lo-batch-release-2026-09-20T14-06-56-500Z.sqlite`. Xưởng cần sửa tìm kiếm LIKE thành instr để mở mã dài; 13 repository tests xác minh. Đây chưa phải USER-ACCEPTED.
