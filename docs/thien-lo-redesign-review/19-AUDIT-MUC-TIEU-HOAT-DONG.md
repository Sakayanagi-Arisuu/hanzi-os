# Mục tiêu hoạt động trong các bài đã phát hành local

Nguồn: release heads đọc từ D1 local; chạy lại bằng `npx tsx scripts/content/audit-page-activity-targets.mjs`. Không sửa database.

53 bài có trang biên soạn, 487 hoạt động; 30 có mục tiêu và nguồn được validator xác minh, 457 còn thiếu. Đây không phải số bài hoàn tất hoặc độ phủ HSK.

| Bài | Hoạt động | Có mục tiêu | Thiếu mục tiêu |
|---|---:|---:|---:|
| boot-1 | 4 | 4 | 0 |
| boot-2 | 4 | 0 | 4 |
| boot-3 | 5 | 0 | 5 |
| boot-4 | 5 | 0 | 5 |
| characters-1 | 25 | 0 | 25 |
| characters-10 | 23 | 0 | 23 |
| characters-11 | 23 | 0 | 23 |
| characters-12 | 22 | 0 | 22 |
| characters-13 | 28 | 0 | 28 |
| characters-14 | 21 | 0 | 21 |
| characters-15 | 20 | 0 | 20 |
| characters-2 | 23 | 0 | 23 |
| characters-3 | 23 | 0 | 23 |
| characters-4 | 23 | 0 | 23 |
| characters-5 | 23 | 0 | 23 |
| characters-6 | 23 | 0 | 23 |
| characters-7 | 27 | 0 | 27 |
| characters-8 | 26 | 0 | 26 |
| characters-9 | 26 | 0 | 26 |
| daily-1 | 3 | 0 | 3 |
| daily-2 | 3 | 0 | 3 |
| daily-3 | 3 | 0 | 3 |
| daily-4 | 3 | 0 | 3 |
| hsk1-time-place-events-01-numbers | 3 | 0 | 3 |
| hsk1-time-place-events-02-calendar | 3 | 0 | 3 |
| hsk1-time-place-events-03-week-and-day-parts | 3 | 0 | 3 |
| hsk1-time-place-events-04-clock-and-duration | 3 | 0 | 3 |
| hsk1-time-place-events-05-location | 3 | 0 | 3 |
| hsk1-time-place-events-06-weather-and-residence | 3 | 0 | 3 |
| hsk2-daily-needs-family-lesson-01 | 5 | 5 | 0 |
| hsk2-daily-needs-family-lesson-02 | 3 | 3 | 0 |
| hsk2-daily-needs-family-lesson-03 | 3 | 3 | 0 |
| hsk2-daily-needs-family-lesson-04 | 3 | 3 | 0 |
| hsk2-daily-needs-family-lesson-05 | 3 | 3 | 0 |
| hsk2-travel-leisure-lesson-01 | 3 | 3 | 0 |
| hsk2-travel-leisure-lesson-02 | 3 | 3 | 0 |
| hsk2-travel-leisure-lesson-05 | 3 | 3 | 0 |
| hsk3-cohesion-reconstruction-lesson-01 | 5 | 0 | 5 |
| journey-1 | 3 | 0 | 3 |
| journey-2 | 3 | 0 | 3 |
| professional-1 | 5 | 0 | 5 |
| professional-2 | 5 | 0 | 5 |
| professional-3 | 5 | 0 | 5 |
| professional-4 | 4 | 0 | 4 |
| survival-1 | 3 | 0 | 3 |
| survival-2 | 3 | 0 | 3 |
| survival-3 | 3 | 0 | 3 |
| survival-4 | 3 | 0 | 3 |
| survival-5 | 3 | 0 | 3 |
| survival-6 | 3 | 0 | 3 |
| survival-7 | 3 | 0 | 3 |
| survival-8 | 3 | 0 | 3 |
| survival-9 | 3 | 0 | 3 |

## Cách xử lý

- File JSON đi kèm giữ page/block IDs, câu yêu cầu, kiểu hoạt động, revision hiện hành và nguồn thực sự thuộc bài; không chứa đáp án người học.
- Gán mục tiêu sau khi đọc câu hỏi, đáp án và hỗ trợ đi trước; không suy skill từ choice/cloze/rubric hoặc tiêu đề.
- Ví dụ boot-1 nhận diện hướng thanh qua mô tả/Pinyin là kiến thức phát âm bằng thị giác, không phải bằng chứng nghe hoặc chất lượng phát âm.
- Mục tiêu hợp lệ vẫn chưa đủ mastery: cần phiên, điều kiện hỗ trợ, item độc lập và kiểm lại theo thời gian. Rubric tự đối chiếu giữ self-review.
- Chỉnh qua revision mới trong Xưởng, giữ ID, phiên bản đã pin và các kết quả cũ; không sửa ngầm đáp án của revision đã phát hành.
- Trước nối Nghịch Cảnh Lục/ôn, phải giữ được đúng câu hỏi/đáp án/feedback của revision gốc và xác định nguồn bài phù hợp. Trường hợp chưa có target cần bổ sung biên tập; không gán bừa để tăng chỉ số.

Các bài chưa có trang authored và các hoạt động reflection/reading ngoài activity vẫn thuộc phạm vi cải tiến; audit này không thay thế kiểm 217 bài nền.
