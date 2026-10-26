# T16 · điều hướng năm vùng người học

26/10/2026 · **IN-REVIEW**, chưa USER-ACCEPTED.

- **Người học thấy gì:** desktop và mobile dùng cùng thứ tự Học, Ôn, Nói,
  Luyện, Hồ sơ. Lore giữ trong mô tả/accessible label. Luyện mở các công cụ
  phụ; mọi destination cũ vẫn truy cập được, không thay route hay dữ liệu.
  Menu giữ focus, Escape trả về đúng nút mở trên desktop/mobile; chọn lại
  chính trang hiện tại đóng menu và đưa focus tới nội dung chính.
- **Sửa từ hành trình thật:** Alt+S khi menu đang mở không tạo thêm hộp thoại.
  Lời mời Khảo Nghiệm Căn Cơ tạm ẩn và hoãn narration khi menu/hộp hệ thống mở,
  tránh che link Reader; không đánh dấu đã làm hoặc xóa tiến độ khảo nghiệm.
- **Đã kiểm:** pure navigation 4 test; lượt targeted cuối 3 file/12 test exit0
  gồm dictionary selection và mistake support. Typecheck v2 exit0 sau runtime
  cuối; final v3/lint v4 exit0. Build v3 BUILD_EXIT0,
  239 JS/192 private markers vắng, asset advisory +386.5 KiB.
  Compiled E2E v10 **6/6, exit0**: onboarding thật → keyboard/Alt+S/Escape
  → Reader/focus main; từng trang path/lesson/reader/profile không tràn ngang;
  reduced motion không chặn thao tác. Không force-click, skip hoặc tăng timeout.
- **Giới hạn E2E:** giữ log/trace mọi lần. v1 dùng nhầm preview đã onboarding;
  v2 sai cwd harness; v3–v4 selector setup cũ; v5 phát hiện invitation chặn
  pointer (đã sửa). v6 selector CTA bài cũ; dùng navigation ba chặng thực tế.
  v7 ghép nhiều journey vượt 30s; tách test độc lập, giữ mọi assertion.
  v8–v9 landing cold server vượt 5s trước menu. v10 chỉ làm nóng cache Brotli
  phía harness (269 assets/1328ms); browser contexts/cache/storage vẫn mới.
  Không dùng v10 tuyên bố cold-start/performance hoặc native/device đạt.
- **Browser source thật:** desktop/mobile focus wrap, Escape, same-route main,
  rail thu gọn còn 5 controls ≥45px; reduced motion không animation.
  375×667 menu y16..601. 667×375 menu y16..309, close 44×44 ở y34.5..78.5;
  nội dung giữa 196px/scrollHeight352, cuộn156 đưa mục cuối về y228..292;
  close giữ nguyên, nav mobile bắt đầu309, bodyWidth667. Viewport reset.
  Proof `tmp/personalization-navigation-{keyboard-proof-v2,landscape-v1}.json`
  và ảnh/log cùng prefix. Preview guest4325 dùng storage thật/API giả lập guest,
  không phải account-D1 hoặc production.
- **Dữ liệu giữ được:** không migration/storage clear, đổi IDs, source,
  scoring, owner/reset, FSRS, mistakes, first answer, pending/outbox hoặc grant.
  HSK0 4/4 rich0/4; HSK1–4 rich40/40/55/78 =213/213. Binding376/0drift.
  Fullv23 đã CHECK_EXIT0:560file/3606test trước navigation; fullv24 CHECK_EXIT1 vì manifest tham chiếu tên test cũ; đã giữ lại tên nghiệm thu, candidate validator exit0. Fullv25 đang chạy
  trên source cuối. Không sửa runtime/test giữa gate.
- **Tiếp theo:** chốt gate cuối, tiếp consumer T12/runner T05 theo dependency.
  Account media, bounded history/storage, recovery lớn, Android/native,
  reviewed content và cohort/recall còn mở; không khép toàn kế hoạch.

## Gate cuối điều hướng

E2Ev11 tới Reader nhưng tổng journey vượt30s trên host chậm. Tách keyboard/AltS/Escape và tool/focus-wrap/Reader/overflow thành hai test độc lập với onboarding thật, giữ đủ mọi assertion và timeout cũ. E2Ev12 **7/7 exit0**; server compression warmed như v10, không client-cache/learning-data seed. Fullv24 thất bại precheck do acceptance manifest tham chiếu tên test ổn định; khôi phục tên, không chỉnh manifest hoặc baseline; candidate validator exit0. Typecheckv3/lintv4 exit0 trước assertion/split cuối; fullv25 kiểm test source cuối.

Audit consumer kế tiếp tái hiện `/pronunciation?lesson=source-no-longer-present-fixture` mở nhầm Bốn thanh điệu. Bằng chứng `tmp/personalization-speech-source-before-v1.{txt,png}`; chưa sửa trong gate fullv25. Không gọi Nói/source toàn module đã đạt.

## Chốt gate navigation

Fullv25 CHECK_EXIT0:561file/3610test; typecheck/global lint/content/DB/restore42migration61table/build qua;239JS/192private markers vắng,asset advisory+386.6KiB. Source/runtime/test giữ nguyên suốt gate. Sau đó delta Nói3file kiểm riêng trong T12_SPEECH_SOURCE; không gán fullv25 cho source delta đó. E2Ev12 navigation cuối7/7 vẫn giữ.

Sau AppShell thêm guard Nói, compiled navigation E2Ev13 7/7 exit0 trên build cuối, không source runtime/test mới sau đó. Fullv25 vẫn chỉ là mốc trước delta Nói; final typecheck/lint/build và speech E2E được ghi riêng.
