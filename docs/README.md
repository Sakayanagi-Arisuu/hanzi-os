# Bản đồ tài liệu HANZI.OS

Cập nhật: **10/08/2026**.

Tài liệu hiện hành được giữ ngắn để mỗi phiên làm việc bắt đầu từ cùng một trạng
thái. Git history là nơi tra cứu kế hoạch và runbook cũ; không tạo thêm backlog
song song trong `docs/`.

## Đọc trước khi sửa

1. [`IMPLEMENTATION_CHECKPOINT.md`](IMPLEMENTATION_CHECKPOINT.md) — module đang
   được người dùng kiểm thử, điều đã xác nhận và blocker thật.
2. [`PRODUCT_VISION.md`](PRODUCT_VISION.md) — phạm vi, UX đích và cổng hoàn thành.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — trách nhiệm của thư mục, module và lớp
   lưu trữ hiện tại.
4. [`TESTING.md`](TESTING.md) — cách chạy local và nghiệm thu từng module.

## Tài liệu chuyên môn còn sống

| Tài liệu | Dùng khi nào |
| --- | --- |
| [`CHINESESKILL_BENCHMARK.md`](CHINESESKILL_BENCHMARK.md) | So capability và ngưỡng chất lượng; không dùng để sao chép sản phẩm. |
| [`HSK4_GRADUATION_PLAN.md`](HSK4_GRADUATION_PLAN.md) | Kiểm inventory, số lesson và invariant migration HSK0–HSK4. |
| [`CONTENT_DELIVERY_PLAYBOOK.md`](CONTENT_DELIVERY_PLAYBOOK.md) | Soạn, kiểm và phát hành nội dung. |
| [`MASTERY_SYSTEM.md`](MASTERY_SYSTEM.md) | Thay đổi evidence, FSRS, coverage, XP hoặc báo tiến độ học. |
| [`THREAT_MODEL.md`](THREAT_MODEL.md) | Thay đổi auth, API, D1, import/export, sync hoặc quyền. |
| [`adr/0001-d1-closed-alpha.md`](adr/0001-d1-closed-alpha.md) | Bối cảnh quyết định D1 closed-alpha; là ADR lịch sử, không phải roadmap. |

## Quy ước tiến độ

- Làm và nghiệm thu **một module người học nhìn thấy tại một thời điểm**.
- Người dùng test module đang mở trước khi chuyển sang module kế tiếp.
- Không dùng số task, số test, số file hoặc snapshot `96/100` cũ làm phần trăm
  hoàn thiện sản phẩm.
- Luôn báo riêng số nội dung còn mở được: HSK0 `4/4` (rich `0/4`), HSK1
  `40/40`, HSK2 `40/40`, HSK3 `55/55`, HSK4 `78/78`; rich HSK1–4
  `213/213`, trừ khi audit/migration có bằng chứng làm số đó thay đổi.

## Tài sản không phải tài liệu sản phẩm

`docs/reports/` và `output/` là artifact do người dùng sở hữu. Không sửa, di
chuyển, xóa, stage hoặc commit chúng. Build output, report thử và cache cũng
không được đưa vào Git.
