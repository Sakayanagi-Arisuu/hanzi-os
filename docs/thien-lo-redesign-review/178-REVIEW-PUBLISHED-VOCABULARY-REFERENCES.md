# Giao ngữ liệu tham khảo đã phát hành cho Ôn/Nói/Lỗi

04/10/2026 · IN-REVIEW.

Thêm PublishedVocabularyReference đọc projection vocabulary hiện hành khi người học mở “Tra ngữ cảnh”. Nối bằng stable word ID, không dò Hán tự để gộp các từ đồng hình/đa nghĩa. Link Từ điển dùng word+view=detail đã có; khi chỉ biết bài gốc dùng lesson đã có. Không hiện hash/revision/backend trong UI.

- Ôn guest/account: ngữ cảnh tham khảo sau reveal qua ReviewMemoryArena.
- Nói: tham khảo từ trọng tâm bằng focusWordId; không đổi câu target của microphone/acoustic/transcript.
- Lỗi local: tham khảo wordId/bài gốc chỉ ở màn giải lỗi sau submit.
- Lỗi account: tham khảo bài gốc của activity khi nhận diện được lesson ID; reader hoặc activity không nhận diện thì không tự đoán.

Component không ghi storage/DB, không đổi lệnh chấm, wordVersion/contentVersion, đáp án, snapshot câu hỏi, FSRS, outbox hoặc tiến độ. Projection/mục từ vẫn đến từ release worker/parser hiện hành; lỗi mạng có thông báo ngắn và đường mở Từ điển. Chỉ đọc source consumer/diff và diff-check, không typecheck/Vitest/browser theo yêu cầu. Chưa coi đã kiểm hành trình UI.

Giới hạn: đây là giao học liệu bổ trợ, chưa thay catalog dùng để chấm hoặc target Nói cũ. Những ví dụ/đáp án foundation đã pin vẫn giữ cho tái dựng phiên. Cần xử lý riêng catalog tương lai nếu phát hiện câu dùng chấm sai; không ghi “mọi consumer đã dùng bản sửa”.
