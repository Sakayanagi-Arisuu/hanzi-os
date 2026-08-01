# Prompt chuyển sang phiên Codex mới

Sao chép nguyên khối prompt dưới đây vào task mới:

```text
Tiếp tục phát triển HANZI.OS tại D:\Projects\hanzi-os trên branch
codex/hsk4-graduation.

Trước khi làm, đọc đầy đủ AGENTS.md, docs/IMPLEMENTATION_CHECKPOINT.md,
docs/HSK4_GRADUATION_PLAN.md và docs/CONTENT_DELIVERY_PLAYBOOK.md. Kiểm tra
git status/log để xác nhận checkpoint; không lặp lại lát đã commit và không mở
Sites/production/commerce/CMS.

Mục tiêu hiện tại là bản local-first cho đồ án và tự học chuyên sâu HSK0-4.
Tính năng học cốt lõi đã ổn định; ưu tiên tuyệt đối là đưa nội dung đã authoring
lên runtime và giao diện hiện tại. AI-assisted self-review được phép thay human
review cho local, phải disclosure humanReviewed=false; browser TTS chỉ là
synthetic practice.

Nếu B0 daily-life chưa được commit, hãy hoàn tất targeted checks, npm run check,
luồng E2E daily-1, cập nhật verification thật trong checkpoint và commit trước.
Không tạo lại package foundation-2026.07.8 hoặc nội dung daily-life đã có.

Sau đó triển khai B1 như MỘT LEVEL BATCH: hoàn tất toàn bộ HSK1, không dừng sau
mỗi lesson/unit nhỏ. Dùng 40 HSK1 blueprint hiện có làm danh sách đích; tái dùng
inventory/draft/generator, không xây lại feature hay pipeline. Materialize và
AI-review phần còn thiếu, package/authorize/runtime-wire, đưa đủ 40/40 bài lên
Path/Lesson UI qua shared rich adapter, phủ 300 vocabulary, 246 character, 66
grammar, 15 task, 30 topic và chạy level check HSK1 end-to-end.

Trong lúc làm chỉ chạy validator/test đúng phần đổi; phân loại lỗi thành fixture
cũ, generated drift, content bug hoặc integration bug. Chỉ chạy full check/E2E
một lần khi cả level đã tích hợp và targeted tests xanh. Không lấy số test/số
dòng làm tiến độ.

Báo cáo cho tôi bằng ngôn ngữ non-tech ở các mốc lớn: số bài đã hiện trên UI,
số bài rich, nội dung/từ/ngữ pháp/task đã thêm, lỗi thật còn lại và bước kế.
Luôn báo đồng thời project readiness và learner-visible X/Y cho HSK0-4.

Mỗi commit phải cập nhật cả docs/HSK4_GRADUATION_PLAN.md và
docs/IMPLEMENTATION_CHECKPOINT.md. Xóa staging/export/build artifact không còn
consumer trước commit. Sites để tôi làm cuối cùng.
```

Nếu B0 đã commit và worktree sạch, agent mới bắt đầu thẳng B1. Nếu worktree có
thay đổi, phải đọc diff và tiếp tục chúng, không reset hoặc tạo lại.
