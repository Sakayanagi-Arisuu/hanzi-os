# Chín hội thoại sinh tồn — giữ đúng cảnh khi chuyển sang lời thoại

30/09/2026 · AI-assisted self-review · `humanReviewed:false`.

Rà lời thoại từng bài và chọn ảnh context hiện hành vì cùng bối cảnh: survival-2 giới thiệu nhóm học sinh; survival-3 hỏi tên/quốc tịch nhân vật giả định; survival-4 giới thiệu gia đình; survival-5 giới thiệu bạn và vật nuôi; survival-6 nhận xét áo; survival-7 nhóm học hẹn tham gia; survival-8 gọi điện/hẹn gọi lại; survival-9 hỏi đã thức dậy chưa. Không dùng hình để suy tuổi/quốc tịch, quan hệ họ hàng, mức độ thành thạo hay giờ chính xác; dữ kiện nằm trong lời thoại.

Tám trang trên dùng ảnh đã có: sửa việc chuyển từ cảnh riêng đúng chủ đề sang ảnh campus/city chung trong cùng tình huống. Chọn đích danh từng trang dialogue, không kế thừa tự động ở renderer. survival-1 dùng ảnh mới `book-return-thanks-v1.webp` vì context quầy thông tin/va chạm và hội thoại trả sách khác tình huống. Ảnh đã xem trực tiếp: người cầm sách đưa cho người đối diện đang cảm ơn, quầy thư viện; không chữ hoặc logo. Built-in imagegen, WebP quality 85; prompt/nguồn ở `lesson-scene-generation-2026-09-30-book.json`, asset trong `public/lessons/ngoc-dien/`, có alt/provenance và xuất hiện trong kho chọn cảnh Xưởng.

Giữ layout dialogue, nút nghe tổng hợp/mở chữ, từng lượt Hanzi/Pinyin/Việt, IDs và target. Plan pin source revision/hash. Guard đối chiếu asset context và câu đầu từng hội thoại; phát hành revision mới, giữ package cũ cho phiên đã pin. Xưởng tiếp tục đổi illustration bằng biểu mẫu có sẵn. Bản thảo lịch sử không bị ghi đè.

Đã rehearsal rollback rồi apply 9 revision; 43 bảng bảo vệ, parent packages, heads khác và FK đạt. Typecheck/targeted ESLint/diff check đạt. Browser local 3000 qua 9 trang, ảnh tải thật đúng src, nghe tổng hợp/mở lời thoại và picker từng lượt ở mobile 375 px đạt. Audit D1 giữ 217 bài, scene chung còn 101 (trước 110). Không tuyên bố đã kiểm âm thanh đầu ra hay learner resume cho cả chín revision trong lượt này.
