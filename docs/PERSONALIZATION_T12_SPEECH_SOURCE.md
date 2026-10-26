# T12/T16 · link nguồn Nói và đường phục hồi

26/10/2026 · **IN-REVIEW**, chưa USER-ACCEPTED.

- **Người học thấy gì:** link tới bài không tồn tại, tham số nguồn rỗng hoặc bài
  chưa mở không tự đưa sang Bốn thanh điệu. Hiện thông báo nguồn chưa mở được,
  giữ phiên/lượt cũ, cho chọn bài hợp lệ qua kho Nói hoặc về Thiên Lộ.
  Chọn lại bài đưa focus về nội dung chính; reload tiếp tục đúng nguồn.
- **Phạm vi source:** wrapper key theo owner/request, chặn openSpeechSession
  trước thao tác bền vững khi nguồn không khớp hoặc không nằm trong lựa chọn
  hiện có. Không cho trạng thái nguồn thiếu chạy completion/reward. Hủy request,
  recorder và synthetic playback đang có khi nguồn không khả dụng. Bộ chọn
  mission chung và consumer legacy vẫn giữ fallback cũ; route mặc định không
  query giữ hành vi hiện tại. Không đổi nguồn, câu, chấm điểm hoặc reward gate.
- **Lỗi mới từ browser sạch:** E2Ev2 phát hiện lời mời Khảo Nghiệm Căn Cơ che
  nút trong kho Nói. AppShell hoãn lời mời/narration ở route Nói như các phiên
  bài học/Reader/Ôn; không xóa diagnostic hoặc cờ đã hoàn thành, không force-click.
- **Đã kiểm:** targeted 2 file/20 test exit0 về pronunciation mission/reward và
  speech session. Typecheck/lint v2 exit0; buildv1 BUILD_EXIT0,239JS/192private
  markers vắng,advisory+386.9KiB trước guard invitation cuối. Final E2Ev3 **4/4 exit0**,
  typecheck/lintv3 exit0, buildv2 BUILD_EXIT0 với239JS/192private markers vắng.
- **Browser giữ dữ liệu:** guest source preview4325, IDB thật/API guest fixture.
  Trước sửa missing URL mở Bốn thanh điệu/一个人. Sau sửa missing/empty/daily-1
  chưa mở đều có recovery, không nút nghe của bài thay thế. Chọn Bốn thanh điệu
  chủ động → URL boot-1 → focus main/dialog0 → reload nguồn đúng,0/4 cũ giữ.
  Observer chỉ đọc: trước/sau missing và sau recovery/reload đều6speech,
  72workspace,72pending; hash speech không đổi. Không nghe TTS/thu mic/gửi đáp án,
  không claim native/acoustic/account-D1. Proof
  `tmp/personalization-speech-source-proof-v2.json` và ảnh cùng prefix.
- **Viewport thực:**375×667 CTA44px y541..585, nav bắt đầu601;667×375 CTA44px
  y249..293, nav bắt đầu309. Không tràn ngang; content giữa cuộn riêng.
  Số đo v1 đã rơi vào tab nền1280×720 nên không dùng làm mobile evidence;
  v2 dùng tab hiển thị, xác minh innerWidth/Height trước lưu. Viewport reset.
- **Lịch sử kiểm thử:** E2Ev1 dừng trước discovery do testDir=tmp quét artifact
  tích lũy, không có assertion chạy. E2Ev2 3pass/1fail do invitation pointer
  interception thật; giữ trace/log. V3 dùng cùng assertion, thêm invitation0,
  không bỏ kiểm tra hoặc tăng timeout. Fixture nguồn bootstrap guest onboarded
  trên context mới, không thay gate onboarding thật của navigation.
- **Dữ liệu giữ được:** HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78=213/213.
  Không migration/IDs/first answer/FSRS/mistakes/owner/reset/outbox changes.
  Fullv25 CHECK_EXIT0:561file/3610test là mốc navigation trước delta3file này;
  không dùng nó thay gate cuối của Nói. Không sửa docs/reports/output/.wrangler,
  commit/push/deploy/APK, humanReviewed hoặc USER-ACCEPTED.
- **Tiếp theo:** chốt gate slice này; T12 consumer/account/FSRS/Reader/Viết/
  assessment, A02/media, bounded history/recovery lớn và device/human/cohort
  còn mở. Không khép toàn kế hoạch từ source-link fix.

## Chốt kiểm tra

E2Ev3 fresh-context source preview4/4 pass trong49.7s: missing nguồn giữ speechRows0, recovery chọn nguồn rõ ràng rồi reload chỉ1session, blank và locked có CTA. Typecheckv3/lintv3/buildv2 exit0 trên source cuối gồm guard invitation. Binding377/0drift. Fullv25 là mốc trước delta Nói, giữ giới hạn account/native/cohort.

Compiled navigation regression trên build Nói cuối: E2Ev13 7/7 exit0, giữ server-compression warm-only và giới hạn latency/device như navigation handoff. Không nguồn/runtime/test thay đổi sau gate cuối.
