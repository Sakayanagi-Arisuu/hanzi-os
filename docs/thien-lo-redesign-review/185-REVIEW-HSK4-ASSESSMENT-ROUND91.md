# HSK4 · lô91 · bộ đánh giá cho phiên mới

05/10/2026 · IN-REVIEW · humanReviewed:false.

Đọc 72 câu form A (nghe/đọc/từ vựng/ngữ pháp) và 36 câu nghe/đọc form B dùng trong đề chuẩn A, gồm nguồn, lựa chọn, đáp án và lời giải. Output form B từng bị cắt ở giữa đã đọc lại riêng câu 07–12. Không gọi 36 câu từ vựng/ngữ pháp form B hoặc assessment HSK1–3 đã rà.

Phát hành 108 exam_item và một exam_form cửa G gồm 100 câu, cơ cấu 45 nghe/40 đọc/15 chọn cấu trúc được module hiện hành xếp ở phần viết. Giữ rõ đây là luyện local: nghe synthetic TTS và viết chọn đáp án không chứng minh kỹ năng nghe native/viết tự do; không cấp mastery/chứng nhận. Cửa G dùng thứ tự nguồn của đề chuẩn A nhưng pin revisions mới. Không sửa JSON bank cũ, form versions/IDs cũ hoặc phiên đang làm.

Sửa lời giải nghe lấy nhầm phạm vi nguồn đọc; bỏ dữ kiện sáu tuần không có ở triển lãm và một mùa không có ở camera; phân biệt thử nghiệm đã làm với kế hoạch hai môn học/hai tháng. Thay lời giải chung có grammar row IDs bằng giải thích cấu trúc cụ thể; thêm cue vào đề để phân biệt quan hệ ý nghĩa. Sửa câu 不是一定 bằng ví dụ 不是…而是… đầy đủ, nhiễu mơ hồ ở hai câu và từ 增加运输距离 thành 把运输距离…纳入评价, tránh dạy tăng quãng đường như một phương pháp đánh giá.

Hai lỗi giao nội dung được phát hiện bằng validation nội tại: validator exam_item dùng nhầm giới hạn tối đa hai ký tự cho Hanzi; resolver đề lấy public package đã bỏ đáp án/lời giải. Đã sửa giới hạn như các trường văn bản chuẩn và đọc đúng private source revision ở server sau khi kiểm release/hash/workflow. Public runtime tiếp tục loại đáp án/lời giải; không mở chúng cho người học trước chấm. Không đổi API/UI hoặc catalog nền.

Hai rehearsal trước rollback vì resolver chưa ghép được đề. Rehearsal sau và APPLY hoàn tất109 revisions, giữ43 bảng, old heads, form A, FK; so sánh resolver blueprint với bản ghép hiện tại và xác nhận package công khai không có đáp án. Không browser/timed learner/parity/Vitest/typecheck/full check. Chưa khẳng định đã đi qua UI cửa G; consumer catalog/session ở app/api/exams dùng resolver đã sửa.

Receipt: 185-REVIEW-HSK4-ASSESSMENT-ROUND91.json. Backup: .wrangler/demo-backups/before-hsk4-assessment-editorial-round91-2026-10-05T03-56-17-125Z.sqlite. Plan: content/drafts/thien-lo-hsk4-assessment-editorial-round91.json. Blueprint: hsk-mock-editorial-a12b7f7f-443c-446e-a069-de24b78a2259. Đã APPLY, không replay.

Các cửa A–F vẫn giữ ngữ liệu cũ để bảo toàn phiên/ID; không gọi mọi assessment HSK4 đã sửa. HSK1–3, phần nghĩa/độ sâu HSK1/HSK3, mẫu/Pinyin còn lại và catalog luyện tương lai vẫn mở. Automation chưa dừng vì phạm vi chưa hoàn tất.
