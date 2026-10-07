# Mục tiêu hoạt động 9 bài giao tiếp sinh tồn HSK1 · 29/09/2026

Phạm vi: 27 hoạt động trong `survival-1..9` đã có trang phát hành local. Kế hoạch exact lesson/block/source ở `content/drafts/thien-lo-survival-activity-targets.json`. Đây là AI tự rà, `humanReviewed:false`; target là liên kết biên tập chứ không phải chứng cứ thành thạo.

Đã đọc prompt, đáp án/phương án nhiễu, phản hồi và mẫu đối chiếu từng bài. Chín câu chọn phân biệt lời xin lỗi, đại từ nhóm vật, cách hỏi viết tên, vai gia đình, bạn bè, đánh giá âm thanh, phủ định 有, hẹn gọi lại và trạng thái chưa dậy. Chín câu điền khớp 不客气, 她们, 写, 姐姐, 只, 好听, 没有, 再, 还没. Chín rubric vận dụng giữ nhiệm vụ tình huống riêng của mỗi bài; Pinyin/từ hỗ trợ và tự đối chiếu không tạo điểm viết/nói độc lập.

Không gán vocabulary ID bừa cho 写, 再 hay cụm 还没 vì chúng không có exact vocabulary source trong các bài tương ứng. 写 nối mẫu nghi vấn `hsk1-grammar-row-008`; 再 và 还没 nối nhiệm vụ giao tiếp của chính bài. Các trường hợp còn lại nối nguồn từ vựng thực sự thuộc lesson. Mọi source đi qua validator. Bản gắn target không sửa văn bản, đáp án, rubric hay ID. Revision cũ và phiên người học đã pin vẫn giữ; rehearsal rollback, backup D1, so sánh bảng người học, release head khác và khóa ngoại trước apply.

Các mẫu rubric vẫn cần vòng rà ngữ liệu riêng trước khi có thể công bố mức bảo đảm sư phạm cao: chẳng hạn lượt `谢谢！没关系。` trong mẫu survival-1 cần ngữ cảnh xin lỗi để không làm người mới học tưởng 没关系 là lời đáp cảm ơn. Target này không tự xác nhận toàn bộ nội dung bài đạt chất lượng cuối cùng.
