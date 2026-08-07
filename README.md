# HANZI.OS

HANZI.OS là nền tảng học tiếng Trung theo phong cách "Thức tỉnh hệ thống", được thiết kế như nền móng cho một sản phẩm thương mại thay vì một trang tĩnh.

## Chạy dự án

```bash
npm install
npm run dev
```

Tạo và chạy build ở chế độ production (không phải bằng chứng đã deploy):

```bash
npm run build
npm run start
```

## Những gì sản phẩm hiện có

- Onboarding chọn mục tiêu, căn cơ, nhịp học và hệ chữ.
- Khảo nghiệm đầu vào cho kết quả sàng lọc mô tả chưa hiệu chỉnh; không tự định tuyến, mở prerequisite hay suy ra HSK/mastery.
- Dashboard thích nghi theo mục tiêu, lỗi mở, lịch FSRS và năng lực yếu nhất.
- Khung lộ trình có release gate; giao diện chỉ hiện nội dung beta/published, không tuyên bố độ phủ HSK vượt phần đã duyệt.
- Lesson engine có bản lĩnh hội trước bài, câu nghe, nghĩa, pinyin, thanh điệu, đọc ngữ cảnh và tự nhập Hán tự.
- Tự lưu từng đáp án và khôi phục đúng câu sau khi tải lại.
- Nghịch Cảnh Lục giữ lỗi cho đến khi tự gọi đúng hai lần liên tiếp.
- Ôn cách quãng bằng FSRS, chỉ kích hoạt từ đã học hoặc chủ động lưu; đường
  authenticated lấy queue và chấm rating phía server, giữ lịch bằng durable
  outbox và không phát XP.
- Speech synthesis và speech recognition có graceful fallback.
- Luyện viết đúng nét bằng Hanzi Writer.
- Graded reader có pinyin, dịch và tra từ tại chỗ.
- Tàng Tự Khố, danh sách từ đã lưu và Thiên Cơ Kính phân tích bảy năng lực.
- PWA cài đặt được, có offline shell và cache dữ liệu nét chữ đã dùng.
- Người dùng ẩn danh giữ dữ liệu cục bộ; mã nguồn closed-alpha cho người dùng đã xác thực có command/evidence chuẩn hóa qua D1, outbox offline và projection đa thiết bị. Đường này đã có kiểm tra cục bộ nhưng chưa được xác minh như một dịch vụ hosted.

## Dữ liệu, đăng nhập và phân quyền

- Chế độ không đăng nhập lưu trạng thái học trong `localStorage`; checkpoint,
  outbox và hàng đợi phục hồi nằm trong `IndexedDB`.
- Tài khoản/đồng bộ phía máy chủ dùng **Cloudflare D1**, tương thích SQLite,
  với schema và migration do Drizzle quản lý. Binding runtime là `DB`.
- Người học có thể tiếp tục ở chế độ guest/local hoặc đăng nhập bằng Google,
  mã email một lần hay passkey; **Sign in with ChatGPT** vẫn là provider phụ
  tương thích. Một `users.id` nội bộ có thể giữ nhiều `auth_identities`, nhưng
  ứng dụng không tự nối tài khoản chỉ vì email giống nhau.
- Phiên first-party dùng cookie `__Host-` HttpOnly/Secure/SameSite và D1 chỉ lưu
  digest. Link/unlink provider cần phiên mới xác minh cùng ceremony của provider
  đích; `/account/security` cho xem và thu hồi phiên/thiết bị.
- Mọi tài khoản có vai trò nền `learner` (Hành Giả). `content_editor` (Quản Khố
  Nội Dung) có quyền draft/validate/submit dành cho Content Studio riêng;
  `admin` (Điều Hành Hệ Thống) mở Cổng Quản Trị để quản lý vai trò, khóa tài
  khoản, phiên, cấu hình allowlist và audit. Cổng này không đọc tiến độ học riêng
  của tài khoản khác. API kiểm tra quyền phía máy chủ; mutation nhạy cảm còn yêu
  cầu xác minh lại bằng phiên Google/email/passkey trong 10 phút.
- Danh sách quản trị viên khởi tạo được cấu hình bằng biến máy chủ
  `HANZI_OS_ADMIN_EMAILS` (nhiều email cách nhau bằng dấu phẩy). Ví dụ local
  PowerShell trước khi chạy dev:

```powershell
$env:HANZI_OS_ADMIN_EMAILS="you@example.com"
npm run dev
```

Migration phân quyền nền B9 là `drizzle/0014_gigantic_diamondback.sql`.
Không đưa biến quản trị vào mã client hoặc commit email thật vào repo.

Migration auth hiện hành là `drizzle/0015_good_green_goblin.sql`. Local email
OTP có thể bật riêng trên `localhost` bằng `AUTH_DEV_EMAIL_OTP=1`; mã thử chỉ
được trả về trong chế độ đó. Google cần `GOOGLE_CLIENT_ID`, callback chính xác
trong `GOOGLE_REDIRECT_URI` và, với confidential client, `GOOGLE_CLIENT_SECRET`.
Passkey mặc định lấy origin/hostname hiện tại; có thể khóa tường minh bằng
`AUTH_ALLOWED_ORIGIN` và `AUTH_RP_ID`. Không commit các secret này.

Migration kiểm soát hiện hành là `drizzle/0016_yielding_rawhide_kid.sql`. Chỉ
bốn khóa không bí mật được phép vào `system_settings`; `audit_events` có trigger
chặn sửa/xóa, còn trigger role/status bảo vệ quản trị viên hoạt động cuối cùng.

## Tài liệu sản phẩm

- [Nghiên cứu tính năng](docs/FEATURE_RESEARCH.md)
- [Đặc tả sản phẩm](docs/PRODUCT_REQUIREMENTS.md)
- [Kiến trúc kỹ thuật](docs/ARCHITECTURE.md)
- [Hệ thống nội dung](docs/CONTENT_SYSTEM.md)
- [Mô hình làm chủ và thích ứng](docs/MASTERY_SYSTEM.md)
- [Kế hoạch đồ án HSK0-4 đang hoạt động](docs/HSK4_GRADUATION_PLAN.md)
- [Checkpoint triển khai hiện tại](docs/IMPLEMENTATION_CHECKPOINT.md)
- [Playbook đưa nội dung lên giao diện](docs/CONTENT_DELIVERY_PLAYBOOK.md)
- [Prompt chuyển sang phiên Codex mới](docs/NEXT_SESSION_PROMPT.md)
- [Walkthrough demo local HSK0 → HSK1](docs/HSK01_LOCAL_DEMO.md)
- [Đóng gói và kiểm chứng local release candidate](docs/LOCAL_RELEASE_CANDIDATE.md)
- [Kế hoạch nâng cấp production đang tạm hoãn](docs/PRODUCTION_UPGRADE_PLAN.md)

## Ranh giới của bản foundation

Đây là một vertical slice giàu tính năng cho trải nghiệm học cốt lõi. Mã nguồn
Phase 1 đã bổ sung nền đăng nhập ChatGPT tùy chọn, D1 schema có version,
local-first outbox, idempotency, hòa giải đa thiết bị, account export schema v7,
xóa tài khoản và RBAC ba vai trò. Restore rehearsal cục bộ hiện áp dụng 17
migration `0000`–`0016` trên graph 32 bảng, gồm cả FSRS card/review log, Reader session
versioned và trigger khóa outbox vào đúng reset epoch. Những kiểm tra này không
thay thế hosted
provisioning, hosted backup/restore hoặc kiểm chứng đa thiết bị trên dịch vụ
thật. Người dùng ẩn danh vẫn giữ hồ sơ cục bộ. Thanh toán, CMS biên tập, audio
bản quyền, AI tutor server và chấm phát âm theo cao độ vẫn cần các phase
production tiếp theo. Transcript giọng nói luôn local-only và không đi vào
đường D1.

Package local hiện tại là `foundation-2026.08.5`. Runtime giao 217 lesson: 4 bài
cầu nối HSK0 và đủ 213/213 bài HSK1-4; cả 213 bài HSK1-4 dùng rich Lesson UI.
Đây là nội dung AI-assisted cho tự học local, không phải release production,
human/native review hay chứng nhận HSK chính thức.
