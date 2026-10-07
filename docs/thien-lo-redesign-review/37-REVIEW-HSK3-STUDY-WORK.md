# HSK3 — học tập và công việc

22/09/2026. AI-assisted self-review, humanReviewed:false. Năm bản thảo, 40 trang, 15 hoạt động đọc/viết. Không chấm năng lực độc lập từ tự đối chiếu.

## Phạm vi và rà nội dung

- courses-learning: cách đọc hai lượt, ghi ý chính, kể lại chuyện cũ; không suy đã hiểu mọi bài mới. 才, 把 và phạm vi kết quả được giải thích. Đáp án: kể rõ thứ tự chuyện đang đọc.
- campus-education: gặp mẹ, tham quan, nghe hiệu trưởng, tự hỏi giáo viên, ghi nhận giờ thư viện. Mẹ khuyến khích thay vì hỏi hộ. 5 giờ trong chuyện khác 6 giờ sân thể thao ở vận dụng; chưa đăng ký hoạt động.
- office-tasks: tìm không thấy dưới bàn, nhận manh mối, tìm thấy trên ghế phòng thu, trả trước họp; bảng mượn mới chưa thử. 找/找到 và 可能 được phân biệt. Vận dụng đổi vật, phòng, hạn trả và số lần thử quy trình.
- colleague-workplace: hai người hiểu khác trách nhiệm; hai địa chỉ xác nhận, địa chỉ thứ ba chưa. Vận dụng thay blocker thành chưa kiểm tra chung sau khi đã liên hệ đủ, không sao chép lý do cũ.
- career-experience: tư vấn nhu cầu, vừa nghe vừa phác thảo; ý người bố chưa thay ý con gái. Kế hoạch học năm sau chưa đăng ký và chưa nghỉ việc. Vận dụng chuyển sang ảnh thực đơn, phân biệt nhận xét chủ quán và phản hồi khách.

Hanzi/Pinyin/nghĩa Việt đã đối chiếu theo đoạn và đáp án. Giữ biến điệu 一/不 theo ngữ cảnh; 还给 đọc huán, 还没有 đọc hái. Mẫu viết có dữ kiện riêng, không dùng đoạn đầu làm phiên âm đáp án. Các thuật ngữ chuyên biệt có bảng từ hỗ trợ; người học có thể mở nghĩa/Pinyin. Mức phù hợp là học có hướng dẫn HSK3, không phải chứng nhận toàn bộ văn bản nằm trong từ vựng thi độc lập.

Mỗi choice có một kết luận được văn bản hỗ trợ; distractor phản ánh nhầm thời điểm, người thực hiện, vị trí hoặc phạm vi suy luận. Cloze cố định cấu trúc được yêu cầu: 才、而是、到、然后、一边. Rubric chấp nhận cách diễn đạt khác đúng dữ kiện; chưa có máy chấm viết độc lập.

## Media và Xưởng

Năm ảnh nguyên bản tạo bằng OpenAI built-in imagegen, đã xem trực tiếp: bàn đọc/ghi chú, tham quan trường, từ điển phòng thu, phân công đồng nghiệp, phác thảo trang phục. Full-bleed 3:2, không chứa đáp án giờ/số hoặc dữ liệu cá nhân. Ảnh chỉ làm bối cảnh, không bổ sung sự kiện vào bài đọc. Prompt và nguồn lưu tại `content/drafts/lesson-scenes-hsk3-study-work-2026-09-22.json`.

Các trang/khối dùng schema hiện có: scene, reading, explanation, dialogue example, choice, cloze, rubric. Studio nhận cùng tài liệu; không yêu cầu một renderer riêng cho bài cụ thể. Chưa tuyên bố browser parity trước khi chạy hành trình thực tế.

## Bảo toàn và gate

Giữ năm lesson IDs, toàn bộ vocabulary IDs (71/64/59/60/66), prerequisite, grammar/task/topic IDs; không đổi graph. 40 từ trọng tâm không thay inventory tra/ôn. Mỗi hoạt động gắn đúng task nguồn của bài. Không dùng số trang, ảnh hoặc rubric để tuyên bố mastery/đủ HSK.

Validator/schema/source và bài tập đúng/sai đã đạt trong `authoredHsk3StudyWork.test.ts`; cùng test lô personal: 4/4. Typecheck/ESLint đạt. Công cụ dựng bài dùng chung tạo lại lô personal khớp từng byte trước/sau refactor. Import/release/browser được ghi ở checkpoint sau khi thực sự chạy, không được suy từ review này.
