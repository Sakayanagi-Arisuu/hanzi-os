# T14 · nhịp quay lại pilot · 23/10/2026

**IN-REVIEW**, mới là nền composer; chưa hoàn tất T14 hoặc toàn kế hoạch.

- `longTermPractice.ts` đọc model đúng graph/binding/owner/reset/cutoff. Chỉ
  inference được bật và không có mục tiêu chỉ định mới dùng thời gian hoạt động.
  Sau ít nhất 7 ngày kể từ occurrence cuối hợp lệ, gợi ý tự động chuyển về
  phần mở đầu ngắn, tối đa 300 giây gồm chuyển bước. Đây là quy tắc UX có thể
  đổi, chưa phải ngưỡng quên được hiệu chuẩn. Không phạt nghỉ hoặc ép diagnostic.
- Thời gian unknown/cold start/pending không được suy thành nghỉ lâu. Sync muộn
  dùng occurrence, không dùng receivedAt để làm giả ngày học mới. Lựa chọn thủ
  công/opt-out giữ nguyên. Chặn clock tương lai và scope/binding khác.
- Composer vẫn lọc prerequisite/entitlement/source/offline trước chọn; không
  thêm FSRS schedule, completion, XP, mastery hoặc quyền skip. Không đổi schema
  manifest: phiên cũ đã đóng dấu vẫn xác minh và resume được.
- Pilot hiện chỉ exposure/self-review, prior exposure và humanReviewed:false.
  Diagnostic/delayed recall tiếp tục cần item mới đã thẩm định; không tái dùng
  mẫu cũ để tuyên bố kiểm chứng độc lập. Chưa có skip hợp lệ hoặc đủ HSK.
- Entry có lựa chọn “Gợi ý từ lịch sử · tự nguyện”, chỉ bật khi Hồ sơ đã cho
  phép suy luận. Request intent:null là lựa chọn automatic rõ ràng; thiếu field
  hoặc client tự nhận origin suy luận vẫn bị từ chối. Guest dùng consent durable;
  account tiếp tục đối chiếu consent server trước/sau compose. Không thay mặc
  định quantity hoặc frozen manifest. Chưa có efficacy/account/device dài hạn.

Gate: v1 có 1 fixture fail vì sửa owner nhưng không tái tạo identity của event;
giữ log fail, sửa fixture qua factory thật. v2 6 file/42 test TEST_EXIT=0,
gồm long-term/composer/map/guest adapter/server pilot/session compatibility.
v3 sau nối entry 7 file/48 test TEST_EXIT=0; typecheckv70/LINTv2 exit0.
Fullv13 CHECK_EXIT=0:550file/3531test, restore42migration61table/build qua.
Gate này trước CSS low-height: CSS riêng có regression4test và buildv14 exit0.

Browser4334: AppShell thật, prerequisite evidence fixture có nhãn riêng; automatic
plan→start→exposure1→reload→resume2/2→exposure2→close→Path→map. Target grammar
exposure, target listening unknown/supporting reading riêng. Không mastery.
Browser4333: opt-out trong Hồ sơ→save→hard reload→automatic disabled, manual
vẫn chọn được; source thiếu prerequisite vẫn fallback. Mobile390×844 theme dark
body390/header102..167/footer709..778 trên nav. Không D1/account/native proof.

Tiếp theo: bộ probe/measurement/skip chờ nội dung và policy được
review. T04 apply/rollback, T03 indexed paging, A02/native và các hành trình T12
khác vẫn còn. Không thay inventory, dữ liệu học, .wrangler hoặc release policy.
