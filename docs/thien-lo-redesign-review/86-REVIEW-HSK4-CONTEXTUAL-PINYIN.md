# HSK4 · âm đọc theo ngữ cảnh · 01/10/2026

Trạng thái: IN-REVIEW; AI-assisted, humanReviewed:false.

Rà 10 đoạn nguồn dùng trong 21 bài đang phát hành, tìm 59 trường Pinyin cần sửa. Kế hoạch `content/drafts/hsk4-contextual-pinyin-corrections-v1.json` lưu revision cha và giá trị trước/sau chính xác cho từng consumer.

- 还可以 / 还没: hái chỉ trạng thái tiếp diễn hoặc bổ sung, không phải huán trả lại.
- 时间更长 / 等待变长: cháng chỉ độ dài thời gian, không phải zhǎng tăng trưởng.
- 给自带杯者小额优惠: gěi cho ưu đãi, không phải jǐ.
- 尊重传统: zūnzhòng, không phải zūn chóng.
- 第三场面对: tách chǎng miànduì theo nghĩa trận thứ ba / đối mặt, không ghép thành chǎngmiàn.

Giữ nguyên Hanzi, nghĩa Việt, IDs, đáp án, targets và dữ liệu người học. Những sửa Pinyin nhóm 85 trong revision cha được giữ nguyên. Không thay nguồn lịch sử hoặc tự ghi đã review bởi người.

Đã rehearsal/backup/apply 21 revision, mỗi lượt bảo toàn 43 bảng, parent packages/head khác/FK. Regression bảo toàn mọi trường ngoài Pinyin đạt; typecheck, ESLint, diff check đạt. Browser kiểm đúng 59 trường trong payload và Pinyin hiển thị trên 23 trang nguồn/21 bài; mobile375 không tràn ngang. Lượt browser đầu Network connection lost, chạy lại đạt; không ghi đã sửa runtime. Audit đọc lại không còn bảy mẫu lỗi đã khoanh vùng. Đây không phải review toàn bộ phát âm giáo trình.
