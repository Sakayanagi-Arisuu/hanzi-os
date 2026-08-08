# Content Release Worker

Đây là deploy boundary duy nhất cho M5. Worker đọc transactional outbox trong
cùng D1 của modular monolith, tạo package/manifest bất biến và cập nhật runtime
head sau khi toàn bộ digest đã khớp.

`wrangler.jsonc` cố ý dùng database ID placeholder và không chứa secret. Repo
không deploy worker, Sites hoặc production trong milestone này. Khi chạy thủ
công, `/drain` chỉ mở nếu binding secret `CONTENT_RELEASE_DRAIN_TOKEN` tồn tại;
scheduled handler không nhận dữ liệu từ client.

Delivery là at-least-once. Lease hết hạn được thu hồi, lỗi tạm thời đi qua
retry/backoff, còn poison hoặc lỗi fence đi vào trạng thái `dead`. Admin có
quyền `content:publish` mới replay được qua API có correlation/audit; replay
được dedupe theo event nguồn. Package theo revision và completion theo causation
được dedupe; không có tuyên bố exactly-once.
