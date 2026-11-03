# Sự cố điều hướng PC và runtime ngoại tuyến · 03/11/2026

Trạng thái: **IN-REVIEW**. Phạm vi là phục hồi điều hướng PC và xử lý các
điểm chờ chung; không chốt toàn bộ backlog hoặc nghiệm thu thay người dùng.

## Quyết định của người dùng

Khôi phục menu PC cũ, giữ mobile riêng. Menu PC trở lại 10 đường dẫn trực tiếp:
Trang chủ, Thiên Lộ, Ký Ức Trận, Nghịch Cảnh Lục, Vạn Âm Điện, Thần Văn Lô,
Vạn Quyển Các, Phòng Luyện Đề, Tàng Tự Khố, Thiên Cơ Kính. Giữ nguyên nhãn lore
trước thay đổi, footer Hồ sơ/Premium và điều hướng mobile năm vùng.

## Truy nguyên đã xác nhận

- Chat `01a15a87-6dca-7971-9317-81e75fbeda89`, lượt ngày 25/10
  `01a172f6-397b-7e21-b04c-4497f1a7b6ac`: assistant tự chuyển menu 10 mục
  thành năm nhóm khi người dùng chỉ yêu cầu tiếp tục kế hoạch. Thay đổi vào
  commit `79ba221` ngày 26/10; tài liệu T16 chỉ ghi IN-REVIEW, không phải
  bằng chứng người dùng đã duyệt giao diện. Dữ liệu menu khôi phục đối chiếu
  `08e89c7`. Không rollback toàn commit lớn vì chứa dữ liệu/runtime khác.
- Các chat audit liên kết module và T02 có sửa consumer học/ôn; việc đọc một
  phần các chat này không đủ để tuyên bố đã kiểm toàn bộ thay đổi UI ba tuần.
- Local cũ chạy Wrangler từ build production thường. Học liệu chưa được
  promote nên API học trả 409 theo release gate. Local cần chạy chế độ dev
  đúng hướng dẫn TESTING; không đổi humanReviewed hoặc mở gate production.
- Asset service chuyển `/offline.html` sang `/offline` bằng 307 trước Worker.
  Thiếu `assets.run_worker_first` ở cấu hình Vite local, dù cấu hình hosted
  đã có. Sửa tuyến này; không hạ security headers. Đã tái hiện lỗi cài trên
  IAB mới, nên không thể quy hết cho cache Cốc Cốc.
- Projection V1–V4 chờ Web Lock và fetch không có deadline. Provider có
  lifecycle signal nhưng chưa truyền xuống. Thêm deadline 15 giây, hủy khi
  đổi lifecycle và kiểm hủy trước ghi cache; review queue dùng cùng helper.
  Không race/hủy transaction IndexedDB đang ghi.
- Guest đã xác minh bị chuyển về `checking` khi refresh session lỗi mạng
  dù đang online. Regression tái hiện trước sửa. Giữ guest đã có identity
  proof ở `offline`, rồi trở lại `local-only` khi API phục hồi. Cold start,
  account và đổi owner vẫn giữ chốt xác minh hiện có.

## Kiểm chứng và giới hạn

- Targeted ban đầu: 6 file / 64 test; typecheck và lint qua.
- `npm run check` exit 0: 577 file / 3.833 test, content/DB/restore/build qua
  trong `check-final.log`. Typecheck sau delta guest exit 0. Test cold-online
  bổ sung kiểm riêng trong nhóm 69 test; không cộng targeted và full suite
  thành một tổng test mới. Bundle còn advisory vượt 1024 KiB khoảng 399,6 KiB;
  chưa phải bằng chứng tốc độ điều hướng hoặc thiết bị thật.
- Regression guest: fail trước sửa (`checking` thay vì `offline`), sau sửa
  coordinator/bootstrapPrivacy/deadline: 3 file / 69 test qua, gồm cold online
  guest vẫn bị identity-gate và checkpoint nguồn giữ nguyên.
- Build offline local trước delta guest qua; generated `dist/server/wrangler.json`
  chứa `run_worker_first: ["/offline.html"]`. Preview 4174 có service worker
  `activated`; thao tác Cập nhật ứng dụng reload về landing thành công.
- IAB guest local đã mở onboarding, khảo nghiệm, Thiên Lộ đủ 217 bài,
  sảnh Ôn, Luyện lỗi, Nói, Viết (dữ liệu nét sẵn sàng), danh sách thư viện.
  Đây là smoke màn hình, không phải hoàn thành mọi phiên học/account end-to-end.
- Trong lúc build/check, dev có API session chậm hơn 12 giây, lỗi worker
  `Network connection lost`, và HMR context lỗi sau đổi provider. Luyện đề
  từng báo chưa tải catalog. Các quan sát này không được tính là browser pass.
  Cần kiểm lại trên runtime ổn định sau gate, không chữa bằng xóa browser data.
- Bỏ watch các artifact tmp/output/reports/.wrangler/test-results/Android;
  chưa có phép đo để quy nguyên nhân hoặc tuyên bố tăng tốc khởi động.
- Không tự động kiểm được profile Cốc Cốc gốc. IAB là browser storage riêng.
- Sau restart, API `/api/exams/catalog` trả 200, 31 bộ, accessAvailable=true;
  hai lượt khoảng 35 và 27 giây. Không suy từ HTTP thành pass toàn hành trình luyện đề.
- `verify-production-readiness.mjs` tiếp tục exit 1 với các blocker release thật;
  không có thay đổi mở production hoặc tự xác nhận linguistic/cohort review.
- Kiểm trực quan tiếp bị chặn vì công cụ báo Local browser use disabled in
  Work settings. Không đổi setting hoặc thay công cụ để vượt giới hạn này.

## Bổ sung: catalog vượt timeout khi server đang hoạt động

- Catalog đọc 375 revision nguồn bằng từng truy vấn D1; warm request vẫn mất
  14,3 giây, các lần khác 20–33 giây, vượt timeout client12giây. Đo tách gói
  phát hành chỉ252ms; thử8request song song vẫn21,2giây nên không giữ cách đó.
- Đổi đọc revision theo lô tối đa100 bind, giữ thứ tự đầu vào, kiểm thiếu nguồn
  và query failure. Loader giữ nguyên itemType, published/archived, content SHA
  và SHA tính lại; không cache bỏ kiểm chứng, không nới quyền hoặc timeout.
- Sau sửa, dev1448/621/631ms; qua preview4174 1252/1026/996ms,31bộ,
  accessAvailable=true,19bộ khóa. Không xuất answerIndex/correctAnswer/answerKey/
  correctOptionId/explanationVi/sourceLessonId trong response đã kiểm.
- Targeted3file/22test, gồm SQLite thật với205revision, thứ tự/duplicate,
  missing/query failure, nguồn archived và digest/state/type sai bị từ chối.
  Typecheck cuối exit0; lint4file nguồn/test exit0.
  Đây là đo API local, không benchmark thiết bị hoặc pass phiên luyện đề.
- Thay đổi chỉ ở server nên preview4174 đang dùng API dev mới qua proxy;
  bundle UI vẫn là build1718a4d. Không cần đổi UI để áp dụng bản sửa đọc này.
- Browser vẫn báo `Local browser use is disabled in Work settings` khi kiểm lại.
  Không tìm đường vòng qua native/CLI. Mobile/account/offline end-to-end còn mở.

## Bảo toàn dữ liệu

Không migration/reset/xóa D1 hoặc browser storage. Backup SQLite trước restart
nằm trong `tmp/incident-offline-20261102/`, integrity_check OK, 43 migrations.
Không sửa/stage docs/reports, output hoặc artifact người dùng.
Stable IDs, FSRS, completion, streak, saved items, resume, outbox và owner/reset
không đổi schema. Inventory nguồn giữ HSK0 4/4 (rich 0/4), HSK1–4 rich
40/40/55/78 = 213/213. Không suy thành human review hoặc hiệu quả học đã đo.
