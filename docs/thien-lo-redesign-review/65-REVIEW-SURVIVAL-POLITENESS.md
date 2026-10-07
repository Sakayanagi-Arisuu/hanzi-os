# Survival-1 — vai giao tiếp trong vận dụng

AI-assisted self-review, 29/09/2026. `humanReviewed:false`.

Mẫu cũ ghép “谢谢！没关系。明天见！” không phân vai, dễ khiến người học hiểu 没关系 là lời đáp cảm ơn. Revision mới gồm sáu lượt A/B: cảm ơn → đáp cảm ơn; xin lỗi sau va chạm → đáp xin lỗi; hai lời hẹn ngày mai. Nhãn Việt ghi rõ ai giữ cửa, ai va vào ai; Pinyin khớp từng lượt, 不 trong 不客气 đọc bú. Nhiệm vụ nằm ngay trong khối nhập, không buộc nhớ nội dung ở mục trước.

Rà Mandarin/Pinyin/Việt: câu ngắn đúng HSK1, vai và thời điểm rõ. Rà sư phạm/coverage: ba tiêu chí cũ vẫn đúng; 没事 vẫn là biến thể đáp xin lỗi được chấp nhận. Không tạo evidence nói/viết từ việc xem mẫu. Chỉ sửa checkpoint, ngữ cảnh, đề vận dụng và ba dòng mẫu trong grammar/rubric; giữ target, ID, rubric, cảnh riêng và bài tập khác.

`survival-politeness-correction.mjs` là lớp hiệu chỉnh exact-field trên bản thảo lịch sử hoặc head hiện hành. Không ghi đè snapshot `thien-lo-survival-batch-v2.json` hay review hash của các release trước. Generator `author-survival-batch.ts` đã nối lớp này cho lần tái biên soạn tương lai; mẫu khác sẽ fail-closed để rà lại. Release local tạo revision mới, lưu hash trước/sau, giữ package cũ cho phiên đã pin.

Diễn tập rollback và apply đã đạt: một revision phát hành local, 43 bảng bảo vệ, các head khác, package cha và khóa ngoại giữ nguyên. Hai regression test đạt (phạm vi field, target/ảnh giữ nguyên, chặn mẫu bị editor sửa). Browser Xưởng local 3000 đạt: đề đủ ngữ cảnh ngay tại ô viết, chưa lộ mẫu trước khi đối chiếu, đủ nhãn vai sau khi nhập, 375 px không tràn ngang. Chưa kiểm learner resume riêng cho revision này; chỉ xác minh package cha bất biến trong giao dịch phát hành.
