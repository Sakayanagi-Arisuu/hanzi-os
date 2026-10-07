# Khép 14 nhóm biên tập dự kiến — bản học local HSK0–4

05/10/2026. Module vẫn IN-REVIEW theo quy ước nghiệm thu: không có xác nhận USER-ACCEPTED và không có human review. Khép danh sách công việc biên tập dự kiến; không dùng số14 hoặc217 để chứng nhận đủ HSK/mastery hay tuyên bố đã đọc từng câu toàn kho trong lượt cuối.

## Mốc cuối

- Hồ sơ189–194: khép lượt đọc300 mục HSK3 cuối và đọc bù đoạn00633–00643; sửa nghĩa/từ loại/ngữ cảnh/mẫu và bản sao word blocks.
- Hồ sơ195–197: đề B còn lại HSK2/3/4, cửa H mới; sửa cue, phương án, giải thích và giữ revisions/forms cũ.
- Hồ sơ198–200: nghĩa/bản sao ngữ liệu còn sót và lượt đọc300 triples HSK1; sửa35 mục/44 mẫu cùng9 bài ở lô106.
- Hồ sơ201: chuyển1.312 mục đã sửa/phát hành vào catalog luyện phiên mới, Ôn/Nói/Lỗi theo version; giữ catalog/phiên/thẻ cũ. Snapshot pin immutable source revisions để Xưởng không ghi đè dữ liệu chấm của phiên dở.
- Hồ sơ202: đọc current bài campus-education và năm yêu cầu nhiệm vụ gia đình trong PDF đã pin; bổ sung3 trang/7 mẫu, câu phân biệt/feedback, đọc ngắn, hỏi–đáp và vận dụng mới. APPLY revision `17163f13-f76a-4a72-845a-581e729e255e` với backup/43 bảng/heads khác/immutable parent/FK.
- Hồ sơ203 JSON: final consistency read-only đủ217 heads, không thiếu/trùng lesson IDs;2.000 vocabulary tuples có nội dung và không còn ba mẫu meta đã khoanh vùng;0 release jobs chờ, family revision khớp receipt,0 FK violations. Đây chỉ là validation nhất quán và triage mẫu đã biết, không phải một vòng rà ngữ nghĩa tự động.

Các hồ sơ trước giữ phạm vi tự rà cụ thể cho Pinyin nền, ngữ liệu HSK1–4, ngữ pháp và vận dụng theo nhóm chủ đề. Lô cũ không replay. Không biến kết quả từng hồ sơ thành lời khẳng định mọi nghĩa phụ hoặc mọi consumer lịch sử đều đã được rà.

## Người học dùng gì

217 bài giữ IDs/inventory4/40/40/55/78; các trang authored và revisions đã bổ sung nằm trong Xưởng. Từ điển đọc published heads; luyện mới dùng snapshot được pin, lỗi mới chấm và hiển thị theo đúng phiên bản câu. Ôn local dùng nghĩa/mẫu mới; thẻ account mới dùng wordVersion mới; thẻ cũ giữ nguyên version/FSRS cùng tham khảo published sau reveal. Nói dùng mẫu mới, giữ bản chất transcript/TTS/tự luyện.

Local Vinext được chạy trực tiếp, không migrations/reset, tại `http://127.0.0.1:3000`. Chỉ xác nhận listener, không thực hiện browser journey mới.

## Giới hạn cần giữ khi bàn giao

- AI-assisted, humanReviewed:false. Không chứng nhận đạt HSK, mastery, độ chính xác đã được người Trung Quốc độc lập duyệt, audio native hay chấm nói/viết độc lập.
- Bản nền/phiên/thẻ account cũ vẫn có ngữ liệu lịch sử để không thay target và đáp án đang pin. Bản tham khảo mới có thể được đọc sau reveal. Hai started forms foundation08.5 được bảo toàn nhưng nằm ngoài resolver package08.7 hiện hành; không tuyên bố đã phục hồi compatibility cho package lịch sử này.
- Browser, timed learner, parity Xưởng, Vitest, typecheck và full check đã bỏ theo yêu cầu; vì vậy không báo những gate này đạt. Validation nội tại, backup và rehearsal rollback vẫn thực hiện. Những con số validator không đo độ sâu sư phạm.
- Không có issue đã xác định trong danh sách khép đang chờ APPLY. Không tuyên bố mọi câu/Pinyin/ảnh/nghĩa phụ trong217 bài được đọc lại toàn bộ trong lượt cuối; phạm vi thực tế phải tra các hồ sơ gốc.
- Giữ tiến độ, FSRS, lỗi, saved items, session, owner/reset scope/outbox; giữ draft editor/Premium/admin/.wrangler/docs/reports/output. Không stage/commit/push/deploy.

Automation `ti-p-t-c-thi-n-l-x-ng-n-h-t-b-i` được xác minh PAUSED trong automation.toml; không có vòng tự chạy tiếp. Goal tool trả goal:null. Không tự bật lại automation hoặc tạo goal mới.
