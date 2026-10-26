# T11/T13 · tiếp tục 22/10/2026

**IN-REVIEW**. Người dùng yêu cầu tiếp tục đến hết phần có thể triển khai và
kiểm chứng; không chờ test giữa slice. Không tự USER-ACCEPTED/humanReviewed,
không commit/branch/push/deploy/APK. Các giới hạn môi trường vẫn phải báo thật.

## Delta T11

- Archive là terminal revision bất biến, không xóa manifest/receipt/draft cũ.
  Chỉ người học chủ động lưu trữ; không tự archive khi mất quyền nguồn.
- Liệt kê từng session branch, cho chọn lưu trữ một nhánh giữ dữ liệu. Không
  chọn active session theo clock mới nhất. CAS archive kiểm đúng id/revision.
- Account archive chưa ack thì chặn mở phiên mới. SQL chặn successor sau
  archive và LWW overwrite của recovery record; không migration.
- Nháp xung đột được lưu thành recovery riêng, giữ snapshot gốc và IME.
  Retry cùng payload không thêm bản; không thay first response hoặc thành receipt.
- UI đọc lại archive/recovery, giữ nháp trước reload/exit; trạng thái lỗi dùng
  header/footer trong viewport, chỉ phần giữa cuộn. Quota/read/unknown schema
  giữ raw dữ liệu và nháp. Không completion/XP/FSRS/mastery.
- Khác session-id có UI chọn archive. Xung đột cùng id/revision vẫn fail-closed,
  không tự merge hoặc bỏ pending; đây còn là giới hạn resolution riêng.

## Delta T13 và consent

- Bản đồ pilot dùng exact graph/model binding và owner/reset; target/supporting
  skill riêng, exposure khác practice, independent sufficiency vẫn unknown.
- Opt-out không đọc history cho gợi ý. Guest recheck durable preference trước
  trả plan; account client recheck local consent, API đối chiếu server consent
  trước/sau compose. Account opt-out không đọc workspace history.
- Bản đồ là details trong entry cũ, không thêm vùng điều hướng hoặc đổi Path mặc định.
  Đổi goal/focus/ack/opt-out hủy preview cũ; không thay frozen manifest đang chạy.
- Sửa lý do quantity để không nhận là dựa history khi tắt suy luận. Thiếu native
  audio/holdout đã review có lời giải thích và consent đổi nhiệm vụ; không giả evidence.

## Gate và browser

- Archivev25:7file/35test exit0. Archive+mapv28:12file/59test exit0.
- Consentv29:7file/33test exit0; có overlap, không cộng tổng.
- Typecheckv68 exit0 trước delta API consent/copy fallback cuối; cần gate tổng mới.
- v27 fail một test vì fixture dùng origin synthetic trong ca opt-out manual;
  đổi đúng origin manual, không nới gate. v67 dừng do Vite Windows phân giải
  nhầm tên base .ts/.tsx; component đổi thành PilotCompetencyMapPanel.tsx.
  Giữ nguyên log failed/interrupted; không ghi lượt đó pass.
- Origin4331: adapter guest thật + prerequisite fixture; nháp→exit→archive→
  đọc nguyên nháp; hai tab→conflict→giữ riêng và exit→entry đọc nguyên câu.
  Origin4330: runner thật + source fixture; thu hồi nguồn→archive giữ journal.
- Bản đồ opt-out hiển thị unknown; mobile390×844 bodyWidth390, CTA46px
  y786..832, content662px/scroll2173px. Đã reset device metrics sau đo.
  Các mục tiêu quantity/listen/transfer/produce tạo nhiệm vụ khác, nhưng đây
  không phải bốn cohort thật hoặc account adaptive E2E/native/device pass.
- Ảnh/log ở tmp/personalization-archive-*, personalization-real-guest-draft-recovery-v14,
  personalization-map-optout-mobile-v14 và personalization-map-*-fallback-v14.

Fullcheck source tích hợp đang chuẩn bị; fullv11 547file/3507test chỉ áp dụng
source trước delta này. T11 receipt FSRS thật, T13 inference-enabled browser,
T04 apply/rollback, T03 indexed100k, A02 media/native và policy/human/cohort/device
vẫn còn. Không sửa docs/reports/output/.wrangler hoặc dữ liệu origin thật4325/4327.
