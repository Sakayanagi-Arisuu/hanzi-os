# Thiên Lộ và Xưởng — Ngọc Điện

Trạng thái: IN-REVIEW. Đây là thiết kế đề xuất, chưa phải bản triển khai hoặc kho bài đã biên soạn lại. Bộ ảnh gồm sáu trang của một bài giao tiếp và một màn hình trình soạn. Danh mục 217 bài là kế hoạch theo nguồn thật; chưa có ảnh riêng cho cả 217 bài.

## Quyết định thiết kế

Không bắt mọi bài đi qua Hiểu → Từ neo → Vận dụng. Dùng các họ bố cục theo mục tiêu học, có quyền đổi số trang, thứ tự và khối trong Xưởng. Các họ là điểm khởi đầu, không phải khuôn bắt buộc. Giữ header và điều hướng người học hiện có; Xưởng giữ header Biên Tập Viện riêng.

Mỗi bài cần: mục tiêu quan sát được, kiểm tra kiến thức đầu vào, giải thích và ví dụ đủ dùng, luyện với phản hồi cụ thể, tự làm không nhìn mẫu, tình huống chuyển giao và lịch ôn. Các thành phần này có thể gộp hoặc tách thành trang tùy bài. Hoàn thành phiên không đồng nghĩa thành thạo.

## Bài mẫu: Hỏi đường trong khuôn viên

1. Gặp tình huống: nghe câu hỏi, xác định người nói cần gì; transcript mở tùy chọn và ghi nhận hỗ trợ.
2. Hiểu mẫu: 请问，图书馆在哪儿？ / Qǐngwèn, túshūguǎn zài nǎr? / Xin hỏi, thư viện ở đâu? — 图书馆在食堂旁边。 / Túshūguǎn zài shítáng pángbiān. / Thư viện ở cạnh nhà ăn. Người học xác định 食堂 là nơi làm mốc.
3. Luyện sửa lỗi: đối chiếu 是 và 在, giải thích nguyên nhân trước khi thử lại. Đây là lượt có trợ giúp.
4. Tự làm: tự đặt câu hỏi lịch sự, không hiện mẫu, từ đích hoặc biển hiệu chữ Trung trong tranh. Hỗ trợ IME/hint/reveal phải được ghi lại; không dùng lượt đó làm evidence recall độc lập.
5. Vận dụng: hỏi quán cà phê rồi trả lời dựa trên bản đồ mới; nhà thể thao bên tây, quán cà phê bên cạnh phía đông. Từ mới được cung cấp nên đánh giá khả năng chuyển mẫu câu, không gọi là recall toàn bộ từ vựng. Thu âm chỉ để tự nghe.
6. Kết quả: báo riêng hiểu, tự làm, chuyển giao; mở đúng lỗi cần sửa và hẹn ôn. Các số 2/2, 2/3 trong ảnh là dữ liệu minh họa, không ghi vào tài khoản.

## Xưởng phải tạo lại được toàn bộ bài

Trình soạn ba vùng: danh sách trang; preview người học; thuộc tính khối đang chọn. Cho thêm/nhân bản/đổi thứ tự/xóa có hoàn tác. Chọn bố cục từ registry: hội thoại, đối chiếu, bản đồ, đọc có bằng chứng, dàn ý, câu hỏi, kết quả. Không cho HTML hoặc mã thực thi tùy ý.

Schema đề xuất có version, stable lessonId, revision, objectives, prerequisites, pages[]. Mỗi trang có stable pageId, layoutKey, blocks[], next/branch và điều kiện qua trang. Khối có stable blockId, type, sourceRefs, nội dung Hanzi/Pinyin/nghĩa Việt, assetRef, visibility, assessment và feedback. Item đánh giá có ID riêng, kỹ năng, đáp án chấp nhận được, giải thích đáp án sai, mức trợ giúp và điều kiện retry. Hệ thống phải từ chối vòng nhánh không có lối thoát.

Preview và màn học dùng chung renderer/schema/asset registry. Chỉnh form rồi lưu/mở lại không được rơi trường lạ hoặc mất character links. Cần migration có version và giữ bản gốc; đặc biệt sửa đường projection hiện đang trả characters rỗng khi thay bài. Bản đã phát hành bất biến; phiên đang học ghim revision cho tới khi kết thúc.

Quản lý media trong Xưởng: upload/chọn/thay ảnh, crop/focal point, alt, caption, provenance/license, trạng thái kiểm duyệt; hỗ trợ âm thanh và transcript đồng bộ. Hán tự và Pinyin học tập dùng text thật đè lên minh họa, không lấy chữ vẽ trong raster làm nguồn học. Asset AI giữ humanReviewed:false tới khi có người review thật.

## Liên kết các module

Một nội dung nguồn có ID chung. Tàng Tự Khố nhận wordIds; Thần Văn Lộ nhận characterIds có stroke provenance; Vạn Âm Điện nhận tình huống/câu đích; Vạn Quyển Các chỉ gắn văn bản đã kiểm độ khó và chủ đề. Ký Ức Trận lên lịch theo item/kết quả thật; Nghịch Cảnh Lục lưu loại lỗi và đường về trang sửa. Thiên Cơ Kính nhận evidence theo kỹ năng, item duy nhất, thời điểm, revision, hint/reveal/IME. Không tăng coverage khi lặp cùng item; không biến STT thành điểm phát âm. Mọi đường đi có quay về bài đang học.

## Điều kiện triển khai sau duyệt

- Bắt đầu một bài xuyên suốt Xưởng → lưu → duyệt → phát hành local → học → sửa lỗi → ôn → thống kê, rồi mới mở rộng theo họ bài.
- Test round-trip mọi khối, preview/runtime parity, migration/rollback, revision ghim cho phiên dở dang, links không mồ côi và evidence trợ giúp.
- Kiểm desktop/mobile/landscape: header và CTA nằm trong viewport, vùng giữa cuộn, touch 44px, bàn phím/focus và reduced motion. Kiểm tương phản bằng code; ảnh concept không chứng minh WCAG.
- Giữ 217 bài, 213 rich, stable IDs, completion, FSRS, saved items, streak, owner scope và outbox. Không thay dữ liệu người học bằng kết quả minh họa.
- Rà từng bài về Hanzi/Pinyin/nghĩa, độ khó, kiến thức đầu vào, đáp án thay thế, distractor, tính đúng tranh/bản đồ và gợi ý vô tình. Chỉ sau đó mới sản xuất đủ asset và phát hành từng lô.

## Giới hạn của ảnh cần xử lý khi dựng thật

Ảnh sinh bằng công cụ imagegen tích hợp là mockup: có thể sai dấu, chữ nhỏ hoặc nhãn. Trang 05 phải ghi rõ hai vai (bạn hỏi / bạn cùng lớp trả lời), không dùng hai nhãn Bạn gây nhập nhằng. Header Xưởng thực tế có Tài khoản/Cổng Quản Trị theo quyền; các shortcut trong ảnh là đề xuất. Nội dung chuẩn trong tài liệu/schema có ưu tiên hơn chữ raster. Đây chưa phải review sư phạm toàn kho.
