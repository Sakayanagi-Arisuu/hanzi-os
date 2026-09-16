# Dữ liệu hoạt động cho tài khoản demo local

Cập nhật: 07/09/2026. Đây là dữ liệu kịch bản trình diễn, không phải lịch sử
người học thật hoặc bằng chứng nghiệm thu hiệu quả học tập.

## Bổ sung hồ sơ learner khoảng 1/4 lộ trình

Theo yêu cầu tiếp theo, `learner.demo` có tên hiển thị **Minh An**, không chèn
nhãn mô phỏng trong trải nghiệm. Provenance chỉ lưu trong metadata nội bộ.

- 54/217 bài hoàn tất: 53 phiên mới cộng 1 bài đã hoàn tất trước đó.
- 405 thẻ ôn kích hoạt theo bài đã học, 96 lượt đánh giá qua scheduler thật.
- 100 từ lưu từ vốn từ đã gặp; hàng lỗi sai đọc được 58 mục.
- 6 chương thuộc sách gợi ý HSK0–HSK1, có vị trí đọc và đánh dấu sách.
- 1 kết quả luyện đề HSK1 mới, trả lời theo form bất biến và chấm bằng repository.
- XP tương tác sau nhận thưởng đúng rule: 7.400; không thay số bằng CSS.
- Không tạo bản ghi giọng nói, điểm âm học, hoặc xác nhận viết tay khi không có
  dữ liệu tương ứng; không mở production hoặc nâng trust của học liệu.

```powershell
node --import tsx scripts/demo/seed-learner-journey.mjs --rehearse
node --import tsx scripts/demo/seed-learner-journey.mjs --apply
```

`--finalize` chỉ hoàn tất nhận thưởng và cursor cho dữ liệu đã seed, không tạo
thêm phiên học. Script có backup, transaction, marker chống lặp và giữ nguyên
phiên học cũ. Backup trước áp dụng nằm tại
`.wrangler/demo-backups/before-learner-quarter-2026-09-07T03-18-10-551Z.sqlite`.

Thư viện hiện lưu tiến độ chapter trên browser. Endpoint development-only
`/api/local-demo/reader-progress` cấp dữ liệu đúng learner demo, không trả cho
guest/editor/admin hoặc production. Chỉ nhập khi scope hiện tại chưa có tiến độ
và chưa có từ đọc đã lưu, không thay dữ liệu có sẵn, không hồi sinh sau reset.
Lộ trình tự làm mới khi tab nhận focus; Ctrl+R nạp lại cả hồ sơ tài khoản.

Đã kiểm rehearsal + chạy lại, parser projection V4 phía client, foreign key,
credential/role/session invariants và kiểm thử quyền của endpoint. Việc xác
nhận màn hình Cốc Cốc của người dùng vẫn cần quan sát sau tải lại; công cụ hiện
chỉ kết nối Chrome, không được suy ra rằng đã kiểm trực tiếp Cốc Cốc.

## Tài khoản được sử dụng

| Tài khoản có sẵn | Hồ sơ hiển thị | Dữ liệu trình diễn |
|---|---|---|
| learner.demo | Minh An · Demo | 18 từ lưu, 34 lượt luyện mẫu trong 7 ngày; giữ hàng ôn và lỗi sai hiện có |
| editor.demo | Linh Chi · Biên tập demo | 8 từ lưu, phụ trách 12 hồ sơ nội dung với hạn và mức ưu tiên |
| admin.demo | Quang Minh · Quản trị demo | 8 từ lưu, người duyệt 12 hồ sơ; có hàng duyệt và lịch sử thao tác |

Không đổi mật khẩu, quyền, phiên đăng nhập, completion, XP, mastery hoặc phiên
học dở dang. Từ lưu được hợp nhất, không thay danh sách cũ.

12 hồ sơ gồm 8 mục từ, 3 mẫu ngữ pháp và 1 bản nháp phát âm: 4 nháp (1 bản bị
trả về sửa), 2 đã kiểm định, 3 chờ duyệt, 1 đã duyệt và 2 đã phát hành local.
Có 12 phân công và 34 sự kiện workflow. Hai mục phát hành là phần bổ sung,
không thay ID hoặc nội dung gói học nền tảng.

Nội dung ví dụ được soạn mới có provenance demo, `humanReviewed: false`.
Lượt luyện có metadata synthetic, prior exposure và `mastery_eligible=0`;
không dùng chúng làm minh chứng thành thạo. Không tạo lịch sử đăng nhập giả.

## Chạy an toàn

Yêu cầu Node 24 hỗ trợ `node:sqlite`, dependencies của dự án đã có và đúng ba
tài khoản demo trong D1 local. Không có tham số kết nối remote.

```powershell
node --test scripts/demo/local-demo-database.test.mjs
node --import tsx scripts/demo/seed-demo-workspace.mjs --inspect
node --import tsx scripts/demo/seed-demo-workspace.mjs --rehearse
node --import tsx scripts/demo/seed-demo-workspace.mjs --apply
```

`--inspect` chỉ đọc. `--rehearse` chạy trên bản sao, thử lại chống trùng.
`--apply` cũng phải vượt rehearsal trước, rồi áp dụng một transaction local.
Chạy lại không bổ sung trùng hoặc ghi đè hồ sơ demo đã được sửa sau seed.
Mốc thời gian là thời điểm khởi tạo lần đầu, không tự làm mới lịch sử mỗi lần chạy.

Bản sao trước khi áp dụng thành công:
`.wrangler/demo-backups/before-demo-workspace-2026-09-07T02-50-45-986Z.sqlite`.
Backup chứa dữ liệu tài khoản riêng tư: không commit, upload hoặc chia sẻ.
Nếu cần phục hồi, dừng server trước, sao lưu trạng thái mới nhất rồi thực hiện
khôi phục SQLite có kiểm soát từ bản sao; không chép đè DB đang mở hoặc xóa WAL.

## Đã kiểm

- Rehearsal hai lượt: không tăng revision, attempts hoặc sửa learning document ở lượt hai.
- Không lỗi foreign key; các bảng bảo vệ và evidence mastery không đổi.
- Đọc projection V4 thành công cho cả ba tài khoản theo policy development.
- Hàng ôn learner đọc được 4 thẻ; hàng lỗi đọc được 5 mục.
- Worker hoàn tất kiểm định/phát hành, không retry/dead-letter.
- Browser thật với phiên editor có sẵn: tên hồ sơ mới, 12 phiên bản, trạng thái,
  phân công, hạn và 2 bản phát hành đã hiển thị.
- Dashboard quản trị được kiểm qua repository trên DB local; không đổi phiên
  trình duyệt editor để giả định đã kiểm UI admin/learner.

Mở `http://localhost:3000/studio` cho editor và `http://localhost:3000/admin`
cho admin; learner dùng trang chủ, từ đã lưu, Ôn và Nghịch Cảnh Lục.

## Thiên Cơ Kính — ngày truy cập (11/09/2026)

Theo yêu cầu điều chỉnh nhịp tu luyện cho kịch bản 25% Thiên Lộ:
`node scripts/demo/seed-analytics-access.mjs --rehearse` thử transaction rồi rollback;
`--apply` backup trước khi thêm ngày truy cập vào learner_access_days.
Chỉ learner.demo: 32 ngày khác nhau từ lịch sử learning_attempts hiện có;
cộng ngày truy cập thật hiện tại là 33 ngày. Mỗi ngày tính một lần, múi giờ Việt Nam.
Provenance `demo-quarter-path-2026-09` nằm trong bảng riêng, không giả tạo
phiên đăng nhập, điểm âm học, evidence, mastery hay thay tiến độ 54/217.
Bộ ghi nhận tiếp tục tăng theo ngày truy cập thực tế trên mọi route learner.
Thất Trụ đọc số câu/lượt có sẵn (6 kỹ năng), Nói chưa có lượt lưu thì hiển thị 0;
bản chép lời tương lai chỉ được tính là luyện tập trên thiết bị, không là điểm phát âm.
