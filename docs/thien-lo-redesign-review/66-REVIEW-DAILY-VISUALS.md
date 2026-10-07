# Bốn bài đời sống — quyết định hình theo trang

29/09/2026 · AI-assisted self-review · `humanReviewed:false`.

| Bài | Cảnh mở đầu và hội thoại | Trang hiểu bằng sơ đồ |
|---|---|---|
| daily-1 | Quầy táo: khách hỏi người bán; không ghi giá hoặc số lượng làm đáp án | So sánh một quả/ba tệ và hai quả/sáu tệ, bố cục focus |
| daily-2 | Quán ăn sáng đã có: gọi bánh bao/trứng và nước; hội thoại cùng tình huống | Chuỗi gọi món giữ nguyên, focus |
| daily-3 | Cửa hàng áo: chọn áo và nhận tiền thừa; không đọc mệnh giá từ tranh | Giá 20, đưa 30, trả 10 giữ nguyên, focus |
| daily-4 | Phòng chờ khám có bác sĩ, bàn và ghế; cùng ngữ cảnh hội thoại | Phân loại người/nơi/đồ vật giữ nguyên, focus |

Ba ảnh mới đã xem trực tiếp: `apple-market-prices-v1.webp`, `shirt-shop-change-v1.webp`, `clinic-waiting-room-v1.webp` trong `public/lessons/ngoc-dien/`. Full bleed 1536×1024, WebP quality 85 từ bản PNG gốc; built-in OpenAI imagegen. Prompt và đường dẫn gốc tại `content/drafts/lesson-scene-generation-2026-09-29-daily.json`. Không dùng stock/benchmark. Ảnh tiền thừa có đồng xu nhưng không dùng tranh để suy ra tổng tiền; số liệu học nằm trong ngữ liệu/sơ đồ. Tranh phòng khám chỉ là bối cảnh, không hướng dẫn điều trị.

Mỗi ảnh được chọn đích danh cho trang context và dialogue vì hai trang cùng tình huống. Không có quy tắc kế thừa ảnh ngầm qua toàn bài. Các trang sơ đồ chỉ đổi layout scene → focus, giữ toàn bộ node, label, Pinyin, nghĩa và ID. Trang từ, quy tắc, hoạt động, vận dụng và recap giữ nguyên; không thêm ảnh trang trí vào nơi không giúp học. Bốn quyết định này không chứng minh toàn kho đã hoàn tất media.

Xưởng dùng illustration và layout có sẵn trong schema: chọn/thay ảnh, sửa alt/provenance, sửa node sơ đồ và đổi bố cục mà không phải sửa code renderer. Plan pin revision/hash nguồn; release phải từ chối nháp mới của editor, giữ package cha/heads khác/43 bảng học, diễn tập rollback trước apply. Không cập nhật review lịch sử thành human review.

Đã diễn tập rollback và apply cả bốn revision: 43 bảng bảo vệ, package cha, head khác và FK đạt. Hai regression test giữ nguyên toàn bộ learning fields và từ chối ghi đè tranh editor đạt; targeted ESLint đạt. Browser Xưởng local 3000 kiểm tám trang context/dialogue: đúng src, ảnh tải thật, desktop và 375 px hiển thị; bốn trang visual không còn jade-scene và hiện sơ đồ focus. Audit D1: 35 bài có page art, 125 scene còn chung (trước 136), 217 bài nền còn nguyên. Bộ đếm pending visual review của script hiện luôn là tổng bài; chưa phản ánh bốn quyết định này và không được dùng làm phần trăm hoàn thiện.
