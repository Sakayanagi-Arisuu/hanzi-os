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
| [`CLOUDFLARE_HOSTING.md`](CLOUDFLARE_HOSTING.md) | Hosting Workers/D1 độc lập máy cá nhân và cài PWA/APK trực tiếp, không cần CH Play. |
| [`ANDROID_APP.md`](ANDROID_APP.md) | Mã đóng gói Android/TWA, toolchain, khóa ký, liên kết website và nghiệm thu APK cài trực tiếp. |
| [`MOBILE_AUTH_SETUP.md`](MOBILE_AUTH_SETUP.md) | Google Android, GitHub và tài khoản HANZI hosted: cấu hình còn thiếu, gate lifecycle và kiểm trên thiết bị. |
| [`EDITOR_ADMIN_THIEN_VAN.md`](EDITOR_ADMIN_THIEN_VAN.md) | Kiểm thử Editor/Admin mẫu C, đối chiếu chức năng quản lý và khoảng trống còn thật. |
| [`CHINESESKILL_BENCHMARK.md`](CHINESESKILL_BENCHMARK.md) | So capability và ngưỡng chất lượng; không dùng để sao chép sản phẩm. |
| [`HSK4_GRADUATION_PLAN.md`](HSK4_GRADUATION_PLAN.md) | Kiểm inventory, số lesson và invariant migration HSK0–HSK4. |
| [`CONTENT_DELIVERY_PLAYBOOK.md`](CONTENT_DELIVERY_PLAYBOOK.md) | Soạn, kiểm và phát hành nội dung. |
| [`MASTERY_SYSTEM.md`](MASTERY_SYSTEM.md) | Thay đổi evidence, FSRS, coverage, XP hoặc báo tiến độ học. |
| [`THREAT_MODEL.md`](THREAT_MODEL.md) | Thay đổi auth, API, D1, import/export, sync hoặc quyền. |
| [`OPERATIONS_AUDIT.md`](OPERATIONS_AUDIT.md) | Evidence rà soát Premium/Xưởng/Admin/liên kết, lỗi tái hiện và điều kiện nghiệm thu vận hành ngày 12/10/2026. |
| [`SYSTEM_INTEGRATION_AUDIT.md`](SYSTEM_INTEGRATION_AUDIT.md) | Audit liên kết web/app ngày 17/10/2026; sửa Thiên Lộ → Nghịch Cảnh, owner/outbox/lịch sử và giới hạn kiểm chứng từng module. |
| [`PERSONALIZATION_IMPLEMENTATION_PLAN.md`](PERSONALIZATION_IMPLEMENTATION_PLAN.md) | Kế hoạch cá nhân hóa v2; prompt chung mục 7 và từng task mục 8, giữ avatar/history/recovery/audit toàn hệ thống. |
| [`PERSONALIZATION_T00_BASELINE.md`](PERSONALIZATION_T00_BASELINE.md) | Baseline T00 ngày 18/10/2026: inventory/authority/contracts/pilot/rollback và handoff; kèm inventory/fixture JSON có hash nguồn và validator đọc-only. |
| [`PERSONALIZATION_T01_EVENTS.md`](PERSONALIZATION_T01_EVENTS.md) | T01 objective lesson attempt → lưu bền → projection lịch sử guest/account; contract, transaction, source delta T00, test và giới hạn. |
| [`PERSONALIZATION_T02_LESSONS.md`](PERSONALIZATION_T02_LESSONS.md) | T02 slice lessons rich-page, first response/support/exposure; handoff và source bindings trong JSON delta cùng tên. IN-REVIEW. |
| [`PERSONALIZATION_T02_REVIEW.md`](PERSONALIZATION_T02_REVIEW.md) | T02 slice FSRS review, pending/receipt/history/personalization; coverage hiện hành đủ 10 slice, giới hạn fixture và source bindings trong REVIEW_DELTA.json. IN-REVIEW, chưa toàn T02. |
| [`PERSONALIZATION_A02_ACCOUNT_AVATAR.md`](PERSONALIZATION_A02_ACCOUNT_AVATAR.md) | Avatar account private: encoder/API/CAS/retry/remove/restore; bằng chứng local và giới hạn session/native. IN-REVIEW. |
| [`PERSONALIZATION_EXECUTION.md`](PERSONALIZATION_EXECUTION.md) | Sổ thực thi liên tục theo quyền người dùng; trạng thái và gate mới nhất, không tự nghiệm thu. |
| [`PERSONALIZATION_T16_NAVIGATION.md`](PERSONALIZATION_T16_NAVIGATION.md) | Năm vùng Học/Ôn/Nói/Luyện/Hồ sơ; keyboard, dialog, mobile/landscape và giới hạn cold-server QA. IN-REVIEW. |
| [`PERSONALIZATION_T16_DICTIONARY_SOURCE.md`](PERSONALIZATION_T16_DICTIONARY_SOURCE.md) | Link mục từ giữ exact ID/stable alias; thiếu nguồn không mở nhầm mục khác, có đường phục hồi và kiểm mobile. IN-REVIEW. |
| [`PERSONALIZATION_T02_MISTAKE_SUPPORT.md`](PERSONALIZATION_T02_MISTAKE_SUPPORT.md) | Gợi ý/TTS trong Nghịch Cảnh Lục commit trước mở; retry, lỗi lưu, assistance guard và guest history. IN-REVIEW. |
| [`PERSONALIZATION_T14_LONG_TERM.md`](PERSONALIZATION_T14_LONG_TERM.md) | Nhịp quay lại và gợi ý tự nguyện, consent/authority và giới hạn diagnostic/skip. IN-REVIEW. |
| [`PERSONALIZATION_T18_PROTOCOL.md`](PERSONALIZATION_T18_PROTOCOL.md) | Protocol và harness replay synthetic với frozen artifact/verifier; chưa cohort/recall hoặc claim hiệu quả. |
| [`PERSONALIZATION_T06_T07_PILOT.md`](PERSONALIZATION_T06_T07_PILOT.md) | Graph năng lực và sáu contextual practice units từ source thật, chưa measurement/release. |
| [`PERSONALIZATION_T08_T11_PILOT.md`](PERSONALIZATION_T08_T11_PILOT.md) | Draft/model/shadow composer/journal/server planning, scale delta và giới hạn renderer/account/device. |
| [`PERSONALIZATION_T12_SPEECH_SOURCE.md`](PERSONALIZATION_T12_SPEECH_SOURCE.md) | Nói: explicit source không mở nhầm bài; recovery, no fallback session, owner/query lifecycle, invitation/mobile và dữ liệu giữ được. IN-REVIEW. |
| [`PERSONALIZATION_T12_CONSUMERS.md`](PERSONALIZATION_T12_CONSUMERS.md) | Audit consumer adaptive hiện có, liên kết cố ý chưa mở và gaps history/source/FSRS; chưa nghiệm thu toàn T12. |
| [`PERSONALIZATION_T17_PWA.md`](PERSONALIZATION_T17_PWA.md) | Sửa redirect tài nguyên cài PWA ở Worker/Assets, root activation và tải lại khi server dừng; giới hạn account/device còn mở. |
| [`PERSONALIZATION_T11_T13_CONTINUATION.md`](PERSONALIZATION_T11_T13_CONTINUATION.md) | Archive, giữ nháp xung đột, bản đồ descriptive và consent; gates và phần chưa hoàn tất. |
| [`PREMIUM_COMMERCE.md`](PREMIUM_COMMERCE.md) | Chốt giá/cổng/hoàn tiền và kiểm threat boundary của HSK4 Premium trước thanh toán thật. |
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
