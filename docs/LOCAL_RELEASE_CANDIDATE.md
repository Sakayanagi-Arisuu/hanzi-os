# Local release candidate HSK0–4

Đây là quy trình đóng gói và kiểm tra bản chạy local phục vụ tự học và bảo vệ
đồ án. Nó không phải production release, không chứng minh nội dung đã được
native reviewer duyệt, không hiệu chuẩn assessment và không xác nhận Sites.

## Ba chế độ

```powershell
npm run graduation:candidate:validate
npm run graduation:candidate:run
npm run graduation:candidate:verify
```

- `validate` kiểm tra contract, đủ artifact, đúng test binding và production
  readiness vẫn fail-closed. Chế độ này không chạy lại test.
- `run` chỉ bắt đầu từ clean Git HEAD. Nó chạy `check`, toàn bộ Playwright với
  JSON reporter, Lighthouse local và dependency audit; sau đó hash build cùng
  các tài liệu/artifact đã khai báo và ghi
  `local-release-candidate/evidence-index.json`.
- `verify` kiểm lại hash, build, source revision và kết quả. Sau lần chạy, chỉ
  receipt và hai file ghi tiến độ được phép khác source revision đã test; bất kỳ
  thay đổi code, cấu hình hay content nào khác đều làm candidate stale.

Receipt không ghi timestamp, thời lượng hay log dễ dao động. Với cùng một
source revision và cùng kết quả pass, nội dung JSON là deterministic. Nếu một
gate thất bại hoặc thiếu đúng test case, receipt mới không được phát hành.

## Ma trận nghiệm thu local

Evidence index chỉ ghi `passed` khi báo cáo Playwright chứa đúng một test pass
cho từng khả năng sau:

1. walkthrough UI thật HSK0 → HSK1;
2. mobile layout, command sheet và không tràn ngang;
3. keyboard focus trap/Escape/focus restore;
4. keyboard radiogroup;
5. reduced motion;
6. offline shell;
7. reset tiến độ nhưng giữ durable sync identity;
8. xuất backup thật qua UI, import lại và reload bền vững.

## Ranh giới tuyên bố

`claimBoundary` trong cả contract và receipt luôn đặt production, hosted,
human-review, calibration và Sites evidence về `false`. Receipt còn chụp số gate
production đang pending và số blocker từ manifest fail-closed. Việc bốn gate
local xanh không được dùng để sửa hay vượt `verify:production`.

Sites binding hiện có chỉ được hash như một artifact “đang giữ nguyên”; nó không
được gọi, sửa hay deploy trong quy trình này.
