# Mục tiêu hoạt động 15 bài chữ HSK1 · 29/09/2026

Phạm vi: 356 hoạt động trong `characters-1` đến `characters-15` đã có trang phát hành local. Đây là AI tự rà, `humanReviewed:false`. Kế hoạch exact page/block/source ở `content/drafts/thien-lo-character-activity-targets.json`; script kiểm lại nguồn ký tự thực sự thuộc bài, dạng câu, đáp án và giải thích của từng khối trước khi tạo revision. Không suy từ tên bài hoặc đánh dấu hoàn tất kỹ năng chỉ vì gắn target.

| Nhóm | Số hoạt động | Điều đo được trong bài | Giới hạn |
| --- | ---: | --- | --- |
| Tìm chữ trong từ đang hiện | 65 | Nhìn một từ cụ thể và gõ đúng chữ thành phần, nối exact character ID của bài. | Mẫu có ngay trong yêu cầu, không phải nhớ độc lập. |
| Nhớ chữ từ nghĩa/Pinyin | 246 | Điền chữ vào ô trống của từ đã học, nối exact character ID. | Pinyin, từ đã gặp và IME hỗ trợ; không đo viết tay hoặc recall không hỗ trợ. |
| Chọn hình chữ trong từ | 15 | Phân biệt ký tự đúng với hai hình gây nhiễu theo một từ cụ thể. | Nhận diện có phương án. |
| Gõ lại sau mẫu | 15 | Điền chính ký tự vừa được đối chiếu trong câu chọn. | Prior exposure đã có trong cùng bài. |
| Câu vận dụng tự soát | 15 | Đưa chữ trọng tâm vào tình huống riêng của từng bài và đối chiếu rubric. | Không có chấm viết độc lập; Pinyin được phép để tự học. |

Các câu vận dụng đi qua giao tiếp cá nhân (đại học, hẹn gặp, gia đình, xưng hô), lịch và thời gian, quán ăn/mua sắm, phương tiện, lượng từ và học chữ. Kế hoạch gắn ký tự theo đáp án của từng bài, không gắn toàn bộ inventory 246 chữ vào từng nhiệm vụ. Bài `characters-13` phát hiện câu “làm · zuò: □” chấp nhận cả 做 và 作 nên không thể là bằng chứng riêng cho 做. Revision mới đổi đúng khối ấy sang “nấu cơm · zuòfàn: □饭”, chỉ nhận 做 và giải thích vì sao 作 không thay được trong 做饭. Chữ 做 và từ 做饭 đều có nguồn trong chính bài; page/block ID và các hoạt động khác giữ nguyên.

Script chỉ phát hành khi parent head còn nguyên, bản trang cũ khớp bản thảo, nguồn và kế hoạch hash đúng, validator đạt, không có draft/editor mới. Diễn tập rollback, backup D1 trước apply, giữ immutable parent package, các release head khác, bảng người học và khóa ngoại. Với câu đã sửa, phiên cũ vẫn gắn revision cũ và đáp án cũ; không viết lại lịch sử. Nhãn target chỉ phục vụ biên tập/liên kết học liệu; muốn kết luận năng lực chữ cần item độc lập, điều kiện trợ giúp và lặp lại theo thời gian. Không có stroke data có provenance để đo viết tay.
