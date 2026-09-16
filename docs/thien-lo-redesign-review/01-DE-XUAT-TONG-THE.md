# Hồ sơ cải tiến Thiên Lộ — bản 0.2 đã chốt phạm vi

Ngày lập: 11/09/2026. Trạng thái: **NGƯỜI DÙNG ĐÃ CHỐT TÀI LIỆU, BỔ SUNG QUYỀN THÊM BÀI**. Đây là chốt thiết kế/phạm vi, chưa phải nghiệm thu sản phẩm đã triển khai.

Tài liệu này thay thế các mô tả phạm vi chưa đầy đủ ở những lượt trước. Người dùng đã xác nhận nội dung ổn và cho phép thêm bài tùy nhu cầu phủ HSK0–4. Điều kiện chờ duyệt tài liệu đã được đáp ứng; triển khai theo hồ sơ này, không cần xin lại quyền thêm bài trong phạm vi đã chốt. Những sửa đổi web đang dở được giữ nguyên; chưa rollback, commit hoặc deploy.

## 1. Kết quả người dùng thực sự yêu cầu

Nâng cấp **toàn bộ trải nghiệm học trong Thiên Lộ và toàn bộ 217 bài nền HSK0–HSK4 và bổ sung bài mới theo nhu cầu phủ kiến thức**, không chỉ bài Bốn thanh điệu, Hỏi đường hoặc một màn hình minh họa. Người học cần hiểu kiến thức, được hướng dẫn làm, tự làm và sử dụng được trong ngữ cảnh khác. Giao diện phải thể hiện phong cách Ngọc Điện đã chọn: nền ngọc trầm, vàng nhạt, nội dung màu giấy ấm, hình minh họa có ích, header và điều hướng đúng website.

Xưởng phải biên tập và tạo lại được bài học tương đương. Không chấp nhận một số bài đẹp được viết riêng trong code nhưng Xưởng không tái tạo được. Các module học/ôn/lỗi sai/từ/chữ/nói/đọc/thống kê phải sử dụng cùng nguồn nội dung và kết quả học.

Không thể bảo đảm một người đã nắm hoàn toàn tiếng Trung chỉ vì xem hết bài. Thiết kế phải tạo cơ hội học đủ, kiểm tra đúng mục tiêu, chỉ rõ điểm còn thiếu và kiểm tra lại sau thời gian. Đây là yêu cầu về chất lượng trải nghiệm và bằng chứng học, không phải lời hứa thành thạo tuyệt đối.

## 2. Phạm vi đề xuất

| Hạng mục | Phạm vi sau khi duyệt | Không được hiểu nhầm |
|---|---|---|
| Kho bài | Nâng 217 bài nền (HSK0 4, HSK1 40, HSK2 40, HSK3 55, HSK4 78) và thêm bài theo khoảng thiếu HSK0–4, không giới hạn số lượng | 217 là nền bảo toàn, không phải trần số bài |
| Nội dung | Rà và biên soạn lại mục tiêu, kiến thức đầu vào, giải thích, mẫu, luyện, phản hồi, vận dụng, ôn cho từng bài | Không đổi số trang rồi gọi là viết lại nội dung |
| Giao diện bên trong bài | Từ vào bài đến lĩnh hội, thực hành, kết quả và học tiếp; desktop, mobile và ngang | Không chỉ thay màu phần lý thuyết |
| Trang Thiên Lộ chọn bài | Cập nhật mô tả mục tiêu, kiểu bài, thời lượng/tiến độ phù hợp; giữ lộ trình và prerequisite | Không thiết kế lại toàn bộ trang chủ hoặc điều hướng hệ thống |
| Xưởng | Soạn nhiều trang/khối, media, bài tập, đáp án, feedback, rubric, links, preview, phiên bản | Không chỉ ô JSON hoặc nhập đường dẫn ảnh |
| Module liên quan | Sửa đúng điểm tích hợp để nội dung và evidence liên thông | Không tự mở đợt redesign toàn bộ từng module liên quan |
| Dữ liệu cũ | Migration tương thích, giữ ID/tiến độ/ôn/lỗi/saved items/phiên dở/outbox | Không reset tài khoản để nhìn đẹp hơn |
| Xuất bản | Theo quy trình local hiện có, có bản nháp và rollback | Chưa mở production thương mại hoặc public deploy |

Phạm vi không bao gồm làm lại authentication, payment, toàn bộ Thiên Cơ Kính hay toàn bộ thư viện sách. Lỗi trang professional-1 phải được điều tra trong phạm vi truy cập Thiên Lộ; ảnh chụp chỉ chứng minh nội dung không xuất hiện, chưa chứng minh nguyên nhân.

## 3. Hiện trạng trung thực tại thời điểm dừng

### Bổ sung đã chốt ở bản 0.2 — thêm bài để phủ kiến thức

- Được thêm bao nhiêu bài cần thiết để phủ kiến thức HSK0–4; không đặt chỉ tiêu số lượng tùy ý và không cần xin phép riêng mỗi bài mới.
- Trước khi thêm, lập ma trận mục tiêu theo cấp: từ vựng, chữ, ngữ pháp, chức năng giao tiếp và kỹ năng nghe/nói/đọc/viết. Ghi rõ nội dung còn thiếu, chỉ giới thiệu, chưa đủ luyện hoặc chưa có vận dụng/ôn. Dùng chuẩn tham chiếu HSK có nguồn và phiên bản xác định; HSK0 là giai đoạn dự bị của sản phẩm, không tự coi là cấp thi chính thức.
- Có thể thêm bài nền tảng, bài cầu nối, bài chuyên sâu hoặc tổng hợp nếu bài cũ chưa đủ rộng/sâu. Mỗi bài mới phải có lý do và đầu ra cụ thể, tránh nhân bản câu/đổi tiêu đề để tăng số bài.
- Mỗi bài mới có ID ổn định, cấp/đơn vị/tiên quyết rõ, vị trí trên Thiên Lộ, hồ sơ nội dung đầy đủ, học liệu và assessment phù hợp, và biên tập được toàn bộ trong Xưởng.
- Từ/chữ/ngữ pháp dùng nguồn dùng chung hoặc bổ sung nguồn mới có provenance. Bài mới phải liên kết các module phù hợp theo mục 10: tra từ/chữ, ôn, lỗi, thống kê; Nói/Đọc có ngữ cảnh đúng khi áp dụng. Không gắn liên kết trang trí hoặc bịa stroke/audio/evidence.
- Không đổi hoặc xóa ID cũ để nhường cho bài mới. Việc chèn prerequisite và thay tổng số bài phải bảo toàn completion/phiên dở; không khóa ngược bài người dùng đã mở. Tỷ lệ lộ trình cần phản ánh mẫu số mới và giải thích phần bổ sung, không sửa thành tích để giữ một tỷ lệ đẹp.
- Inventory nghiệm thu là **217 bài nền được bảo toàn + N bài mới hợp lệ**; N được cập nhật trong phụ lục sau audit, không ấn định trước. Giữ 213 rich nền và bổ sung rich/nội dung tương đương cho bài mới. Chỉ tuyên bố phủ HSK0–4 sau đối chiếu ma trận nội dung và bằng chứng, không suy từ tổng lesson count.

Các mục hiện trạng tiếp theo vẫn mô tả thời điểm tạm dừng bản 0.1; bản 0.2 chưa biến công việc đang dở thành hoàn thành.

### 3.1 Phần đã làm và từng được kiểm

- Có schema trang/khối phiên bản 1; hai bố cục ban đầu là một cột và hai cột.
- Bốn loại khối ban đầu: giải thích, hội thoại/câu mẫu, ảnh, tự diễn đạt và đối chiếu.
- Xưởng có thêm/xóa/đổi thứ tự trang, đưa khối lên, hoàn tác một bước, nạp rich hiện có, preview bằng cùng component người học. Lưu cấu trúc đi trong payload của bài.
- Đường parser/phát hành nhận cấu trúc trang, giữ cấu trúc khi hợp nhất bổ sung ngữ cảnh; projection thay bài giữ lại character links nền.
- Bài rich dùng bộ chuyển đổi chia trang từ nguồn đã có; HSK0 vẫn đi luồng cũ chuyên biệt. Đây là chuyển cách trình bày, chưa phải hoàn tất soạn lại giáo trình.
- Mốc trước có TypeScript/ESLint, 17 test dữ liệu/phát hành và một hành trình Playwright kiểm reader + Xưởng trên ba viewport đạt.
- Có link tra từ theo lesson. Các câu Thử Luyện cũ vẫn giữ đường ghi kết quả hiện có.

Các kết quả kiểm trên là cho **mốc trước**. Chúng không chứng minh bản code mới nhất đang dở đạt, không chứng minh 217 bài có nội dung chuẩn và không chứng minh giao diện đã giống ảnh mẫu.

### 3.2 Phần vừa sửa dở, chưa được nghiệm thu

- Viết lại `LessonPageReader` theo khung Ngọc Điện: hero, thanh chặng, cảnh minh họa, hội thoại ẩn/mở, vùng tự viết và đối chiếu.
- Mở rộng schema thêm `scene`, `dialogue`, `workshop`, chặng học và lựa chọn tranh theo nhóm.
- Bộ chuyển đổi vừa thêm trang nhiệm vụ, nhóm từ theo lô sáu, ba câu tự gọi lại, rồi trang task. Cách chọn tự động này chỉ là bản nháp kỹ thuật, chưa phải thiết kế cuối.
- Chọn họ bài/ảnh hiện dựa từ khóa trong tên và mục tiêu. **Không đủ độ tin cậy để dùng như quyết định biên tập cuối**.
- Xưởng hiện vẫn chỉ có bộ chọn hai bố cục cũ; chưa theo kịp ba bố cục mới và stage/art. Đây là khoảng thiếu cần sửa, không được tuyên bố đã parity.
- Code tham chiếu `/lessons/ngoc-dien/*.webp`, nhưng thư mục đó chưa có khi audit tài liệu. Năm yêu cầu sinh tranh đã gửi trước lệnh dừng; chưa nhập asset vào web hoặc duyệt chất lượng.
- Đã chuyển test thử sang professional-1; chưa có kết quả xác nhận cuối cho lỗi người dùng báo. Không ghi “đã sửa màn trống”.
- Bản nháp tự viết chưa có lưu/khôi phục theo owner + revision; đối chiếu chuỗi với mẫu chỉ hỗ trợ tự học, không phải chấm câu mở.

### 3.3 Phần chưa làm

Chưa soạn và rà sư phạm riêng đủ 217 bài; chưa sản xuất ảnh riêng toàn kho; chưa có full asset manager/upload; chưa có đủ loại bài tập và rubric trong Xưởng; chưa nối evidence từng khối mới vào ôn/lỗi/thống kê; chưa hoàn tất pinned revision cho phiên lĩnh hội; chưa có kiểm thử hình ảnh toàn bộ bố cục; chưa xử lý đầy đủ đầu ra HSK3–4. Full check vẫn có lỗi nguồn HSK1 review stale tồn tại từ trước.

### 3.4 Nội dung đã nhập/phát hành ở lượt trước liên quan đến đợt này

Đã nhập 2.224 bản nháp local: 2.011 mục từ và 213 bộ ngữ cảnh. Đã phát hành 213 bộ bổ sung ngữ cảnh với 6.019 vị trí luyện dựa trên 1.620 câu mẫu nguồn riêng biệt. Không phải 6.019 câu mới độc nhất và không phải 213 bài học đã được viết lại hoàn chỉnh. Kho bài vẫn 217 bài, trong đó 213 rich. Nội dung AI-assisted giữ `humanReviewed:false`.

## 4. Trước và sau cải tiến

| Trước/đang có | Đích sau cải tiến |
|---|---|
| Bài theo khung Hiểu → Từ neo → Vận dụng hoặc chia thành thẻ chữ | Trang và hoạt động được chọn theo mục tiêu từng bài, có trình tự và phản hồi rõ |
| Nội dung dài cuộn nhiều, ít trọng tâm | Mỗi trang một nhiệm vụ chính; phần nâng cao mở khi cần; header/CTA luôn thấy |
| Từ rời hoặc câu mẫu khó liên hệ | Từ nằm trong tình huống, ví dụ và nhiệm vụ; tra từ/chữ trở lại đúng trang |
| Xem mẫu rồi tự đánh giá chung | Luyện có giải thích → tự làm → chuyển tình huống → ôn trì hoãn; báo riêng kết quả |
| Ảnh đẹp có thể chỉ trang trí | Ảnh/bản đồ/timeline/sơ đồ giúp giải bài; không để lộ đáp án |
| Kết thúc dễ bị hiểu là đã thành thạo | Báo đã làm được gì, cần sửa gì và lịch kiểm tra lại |
| Xưởng chủ yếu form cứng | Trình soạn cấu trúc bài, preview dùng chung, kiểm định và phiên bản |

## 5. Thiết kế sư phạm: thống nhất nguyên tắc, linh hoạt cấu trúc

Không làm 217 bộ code khác nhau. Cũng không ép 217 bài vào một chuỗi ba bước. Dùng bộ khối và họ bố cục dùng chung; mỗi bài có bản thiết kế riêng chọn khối, trình tự, nội dung, độ khó và minh họa. Bài có nhiều mục tiêu phải chia thành các cụm học rõ hoặc phiên ngắn; không nhồi hàng chục trang vô nghĩa.

### Họ bài và trình tự tham khảo

| Họ | Trình tự có thể dùng | Học liệu phù hợp | Cách kiểm |
|---|---|---|---|
| Phát âm/Pinyin | Nghe đối chiếu → tạo âm → phân biệt → đọc cụm → tự nghe lại | Khẩu hình đã kiểm, đường thanh, âm có nguồn, cặp âm | Phân biệt nghe; không tự suy điểm phát âm từ STT |
| Giao tiếp | Tình huống → hiểu lượt thoại → mẫu cần dùng → đổi vai → ngữ cảnh mới | Tranh bối cảnh, hội thoại, bản đồ/thực đơn/lịch | Đúng mục đích giao tiếp, đủ thông tin, câu phù hợp |
| Ngữ pháp | Hai cách dùng đối chiếu → quy tắc → sửa lỗi → tự tạo câu → đổi ngữ cảnh | Sơ đồ trật tự câu, timeline, ví dụ/phản ví dụ | Đúng quan hệ nghĩa và cấu trúc, có giải thích lỗi |
| Từ và chữ | Gặp trong câu → nghĩa/cách dùng → phân biệt dễ nhầm → gọi lại → dùng trong câu | Cặp từ, cấu tạo chữ, tình huống | Tách nhận diện, nhớ nghĩa, tự viết và sử dụng |
| Đọc hiểu | Mục đích đọc → đọc tổng thể → tìm bằng chứng → suy luận → tóm lược | Văn bản phân đoạn, ghi chú, đánh dấu câu chứng minh | Không chấp nhận suy luận không có căn cứ trong bài |
| Viết/trình bày | Đề bài → mẫu có phân tích → dàn ý → bản nháp → sửa → đầu ra mới | Dàn ý, bảng nối ý, bản sửa có giải thích | Rubric nội dung, mạch ý, ngôn ngữ; không chỉ exact match |
| Tổng hợp/kiểm tra | Nêu phạm vi → làm độc lập → kết quả → kế hoạch bù thiếu | Item đủ điều kiện, ngữ liệu mới đúng cấp | Không trộn hint/reveal vào điểm độc lập |

Một bài có thể phối hợp nhiều họ. Phân loại phụ lục là sơ bộ, phải rà theo nguồn; ví dụ `boot-2` là lời chào, không nên bị ép thành bài khẩu hình chỉ vì nằm trong HSK0.

### Yêu cầu theo cấp

- **HSK0:** nghe/âm và giao tiếp đầu tiên; khối lượng ngắn, hỗ trợ trực quan rõ; không thêm thuật ngữ ngữ pháp nặng.
- **HSK1:** tình huống cụ thể, câu ngắn, mục tiêu nhỏ; giải thích từ/cấu trúc bằng tiếng Việt dễ hiểu.
- **HSK2:** nối 2–4 câu, hỏi tiếp, kể chuỗi việc, dùng bổ ngữ/aspect đúng ngữ cảnh; không chỉ tăng số từ.
- **HSK3:** đoạn và mạch thông tin, ý chính/chi tiết, tóm lược, kể lại, viết có khung.
- **HSK4:** văn bản dài hơn, suy luận có bằng chứng, paraphrase, tổng hợp, lập luận và phản hồi; bài nhiều chặng phải có điểm nghỉ/lưu phiên.

### Hồ sơ biên soạn bắt buộc cho từng bài

1. ID ổn định, vị trí lộ trình, cấp, tiên quyết và revision.
2. 1–3 mục tiêu chính quan sát được; mục tiêu phụ và nội dung chỉ tham khảo tách rõ.
3. Kiến thức đầu vào, cách phát hiện thiếu và link ôn nhanh.
4. Từ/chữ/cấu trúc đích; phần mới và phần đã gặp; tham chiếu source IDs.
5. Dàn trang có lý do sư phạm, hành động chính mỗi trang, dự kiến tải nhận thức/thời lượng.
6. Ngữ liệu Hanzi/Pinyin/nghĩa Việt đã đối chiếu; audio/transcript và nguồn.
7. Luyện có hướng dẫn, lỗi thường gặp, đáp án sai hợp lý và giải thích tại sao.
8. Item tự làm, điều kiện trợ giúp, đáp án thay thế, rubric khi câu mở.
9. Tình huống chuyển giao đủ mới nhưng không vượt kiến thức đã học.
10. Tóm tắt, nội dung cần ôn, lịch ôn và liên kết module.
11. Brief từng hình/sơ đồ, alt, caption, nguồn/quyền dùng và kiểm đáp án vô tình.
12. Checklist năm pass nội dung, trạng thái review thật và kiểm nghiệm giao diện.

## 6. Chuẩn giao diện Ngọc Điện

Giữ header/sidebar của HANZI.OS, danh tính và số liệu lấy từ state thật. Không dùng số XP/ngày/ôn trong ảnh làm dữ liệu. Phần bên trong bài dùng tông ngọc trầm, viền xanh xám/vàng nhẹ, thẻ giấy ngà, hình đương đại phù hợp học tiếng Trung. Lore vẫn có mô tả chức năng dễ hiểu.

Khung màn học gồm: đường về Thiên Lộ; tên/mục tiêu bài và minh họa banner; thanh chặng; vùng nội dung giữa; thanh hành động dưới. Chỉ vùng giữa cuộn. Trên mobile giảm trang trí và chuyển cột, không thu cả desktop thành chữ nhỏ. Chọn trang/chặng phải có nhãn rõ và không làm mất bản nháp.

Các màn bắt buộc: vào bài/kiến thức đầu vào; học mẫu; giải thích; luyện có feedback; tự làm; vận dụng; kết quả; ôn/sửa lỗi; tiếp tục phiên; trạng thái không tải được/thiếu asset/khóa bài. Không chỉ vẽ trạng thái mọi thứ đều thành công.

Các bố cục cần có trong registry: cảnh+nhiệm vụ, hội thoại+giải thích, đối chiếu hai cột, đọc dài+ghi chú, bản đồ/timeline có dữ liệu, vùng tự viết+rubric, luyện âm, kết quả. Biên tập viên chọn chúng trong Xưởng. Hình mẫu không phải ảnh nền cả màn; chữ/nút/câu hỏi phải là thành phần web thực có thể truy cập và sửa.

Để giống bộ ảnh: phải khớp phân cấp thị giác, tỷ lệ vùng, minh họa, khoảng trắng, thẻ hội thoại và thanh chặng; thay màu CSS đơn thuần không đạt. Nội dung cụ thể thay theo bài, không sao chép câu Hỏi đường cho tất cả.

## 7. Bài mẫu đầy đủ để chốt hành vi

Bài **Hỏi đường trong khuôn viên** là storyboard mẫu, chưa được gán ID cụ thể. Có thể ánh xạ vào bài nền phù hợp hoặc tạo bài mới nếu audit cho thấy cần; ghi rõ mục tiêu, nguồn và vị trí lộ trình. Không đổi tên/ID bài cũ tùy tiện. Chi tiết từng trang và biến thể nằm trong tài liệu 02.

Mục tiêu: hỏi địa điểm lịch sự và mô tả vị trí bằng 在…旁边. Cần biết cách gọi địa điểm và đọc câu ngắn. Ví dụ câu hỏi `请问，图书馆在哪儿？` và câu trả lời `图书馆在食堂旁边。`.

Sáu trang minh họa gồm: gặp tình huống, hiểu mẫu, sửa lỗi có hướng dẫn, tự làm, vận dụng bản đồ mới, kết quả/ôn. Số sáu là của bài mẫu này, không là số trang bắt buộc toàn kho. Các trạng thái feedback có thể ở cùng trang, không tăng trang chỉ để tăng số lượng.

## 8. Hình minh họa toàn kho

Phạm vi là **mỗi bài đều được quyết định học liệu thị giác phù hợp**, không bắt buộc mỗi trang có tranh và không dùng năm tranh chung để tuyên bố đã minh họa đủ 217 bài. Tranh bối cảnh riêng cần khi bối cảnh có ý nghĩa; sơ đồ/timeline/bảng/đối chiếu là lựa chọn tốt hơn cho nội dung trừu tượng. Có thể dùng lại nhân vật và hệ thẩm mỹ, nhưng không lặp ảnh không liên quan.

Một bài có thể cần ảnh mở tình huống, sơ đồ giải thích và bản đồ chuyển giao khác nhau. Số asset cuối phải lập từ dàn bài đã rà, không ước lượng tùy tiện. Phụ lục từng bài sẽ ghi brief, số asset cần, nguồn, trạng thái và đường dẫn sau sản xuất.

Ảnh AI là nguyên liệu cần kiểm, không nguồn tri thức tự động đúng. Hán tự/Pinyin quan trọng hiển thị bằng text thật. Kiểm vị trí bản đồ, khẩu hình, văn hóa, đồ vật và đáp án vô tình. Không dùng tranh ghi sẵn từ cần nhớ trong lượt tự làm. Không gọi TTS là giọng bản ngữ.

## 9. Xưởng sau cải tạo

Ba vùng: danh sách trang bên trái; canvas/preview ở giữa; thuộc tính bên phải. Có chế độ tập trung và mobile preview. Thao tác: thêm trang theo họ, thêm khối, nhân bản, đổi thứ tự bằng chuột/bàn phím, xóa có undo, xem điều kiện qua trang, lưu nháp và kiểm bài.

Khối phải biên tập được: tiêu đề/giải thích; hội thoại nhiều vai; từ/chữ liên kết; ảnh/audio; sơ đồ dữ liệu; chọn đáp án; ghép/sắp xếp; điền/viết; ghi chú; rubric; feedback; kết quả và module links. Mỗi khối có trường phù hợp, không một textarea chung cho mọi loại.

Media manager cần upload/chọn/thay, preview, alt/caption, focal point, provenance/license, trạng thái review, nơi đang dùng. Không chỉ nhận đường dẫn `/…webp`. Asset đang được bài phát hành dùng không được xóa trực tiếp. Audio có transcript và nhãn nguồn; không mở thu âm/chấm phát âm vượt khả năng hiện có.

Đáp án/rubric cần editor riêng: lựa chọn đúng/sai, giải thích theo lỗi, đáp án chấp nhận được, hỗ trợ nào làm giảm độ độc lập, chặn item không đủ điều kiện. Với câu mở, exact match chỉ là gợi ý so sánh, không thẩm định toàn bộ tính đúng.

Preview dùng đúng renderer của người học với payload sắp lưu; không có bản demo được viết tay khác payload. Lưu/mở lại/nhân bản/phát hành phải giữ layout, stage, media, links, rubric và metadata. Bản phát hành bất biến; bản sửa là revision mới. Phiên đang học ghim revision, đổi nội dung không phá phiên dở.

Biên tập viên có thể lưu bản chưa hoàn chỉnh; lỗi nội dung được đánh dấu và chặn gửi duyệt/phát hành. Không bắt phải hoàn thiện tất cả trường mới lưu được công việc dở. Human review không được tự gán thật chỉ vì AI đã tự kiểm.

## 10. Hợp đồng liên kết module

| Module | Nội dung nhận từ Thiên Lộ | Hành vi cần có | Điều cấm suy diễn |
|---|---|---|---|
| Tàng Tự Khố | wordIds và ngữ cảnh bài | Tra đúng từ, lưu từ, quay về đúng trang | Từ đã mở không đồng nghĩa nhớ |
| Thần Văn Lô | characterIds, từ/câu có chữ đó | Nhận diện/cấu tạo; viết khi có stroke nguồn | Nhìn chữ không là viết độc lập |
| Vạn Âm Điện | tình huống/câu đích/audio nguồn | Luyện tiếp đúng mục tiêu, có lối quay lại | Transcript không là điểm thanh điệu |
| Vạn Quyển Các | văn bản/cấp/chủ đề đã mapping | Đọc mở rộng có kiểm độ khó | Cùng keyword chưa đủ chứng minh phù hợp |
| Ký Ức Trận | item học đủ điều kiện và attempt thật | Lịch ôn, lần ôn trì hoãn, về phần giải thích | Completion không tự cấp recall |
| Nghịch Cảnh Lục | lỗi theo item/kỹ năng/revision | Sửa đúng lỗi, thử lại và đóng theo rule | Xem lời giải không là sửa lỗi thành công |
| Thiên Cơ Kính/Thất Trụ | evidence đúng kỹ năng + trợ giúp/thời gian | Hai bảng cùng nguồn, phân biệt coverage và chất lượng | XP/số lượt/tỷ lệ bài không là mastery |
| Thiên Lộ | completion/checkpoint thật | Mở đúng bài tiếp theo, nhắc phần thiếu | Không đổi prerequisite theo hình thức |

Mỗi attempt mới cần định danh lesson/page/block/item/revision, kỹ năng, thời điểm, kết quả, hint/reveal/prior exposure/IME và provenance. Lặp cùng item không tăng unique coverage. Bằng chứng mockup tuyệt đối không ghi vào learner thật.

## 11. Đánh giá, kết quả và ôn

Tách bốn câu hỏi: đã hiểu ý chưa; tự gọi lại được không; dùng được trong tình huống khác không; còn nhớ sau thời gian không. Không dồn thành một thanh “100% tiếng Trung”. Độ đủ mẫu và phân tán thời gian quyết định độ tin cậy, không chỉ một câu đúng.

Ở bài: feedback nói đúng phần nào, sai chỗ nào, vì sao và hành động sửa. Cho làm lại với item tương đương; lượt đã xem đáp án được gắn trợ giúp. Không công bố mastery khi chỉ tự đối chiếu. Khi tự viết có nhiều đáp án, dùng rubric hoặc evaluator đã kiểm; nếu chưa có, UI nói rõ chưa chấm và không ghi điểm khách quan.

Màn kết quả báo từng mục tiêu, số câu có ý nghĩa, phần cần luyện, nút chính sửa điểm thiếu hoặc học tiếp, lịch ôn. Các con số 2/2 và 2/3 trên ảnh chỉ minh họa. Quy tắc mở bài 70% hiện có cần được audit theo item/skill; thay đổi ngưỡng là quyết định riêng trong nội dung đã duyệt, không tự gán 80/90/100% tùy ý.

## 12. Bảo toàn dữ liệu và phiên học

Giữ stable lesson/vocabulary/character IDs và source graph. Nếu tách một bài thành nhiều trang, completion bài vẫn gắn ID cũ. Được tạo ID bài mới trong phạm vi mở rộng đã chốt; nếu chia nội dung bài cũ thành các bài bổ sung, giữ ID/completion cũ và có migration tương thích cùng regression test. Quyền thêm bài không cho phép xóa dữ liệu hoặc ID cũ.

Giữ completion, điểm/XP hiện có, streak/ngày đăng nhập, saved items, FSRS, mistakes, owner/reset scope, session và outbox. Guest/account chung UI nhưng storage đúng owner. Không ghi nháp của người này sang người khác; đổi tài khoản phải đổi scope. Lưu trang, câu nháp, trạng thái hint và revision để reload tiếp đúng chỗ; lỗi lưu cần báo mà không xóa state.

Nội dung mới có thể cần reassessment, nhưng không âm thầm xóa thành tích cũ. Bản cũ được giữ cho phiên đang học và rollback. Phát hành local có backup và kiểm dữ liệu ngoài nội dung không thay đổi. Không xóa `.wrangler`, `docs/reports` hay `output`.

## 13. Lỗi màn trống professional-1

Hiện chỉ xác nhận từ ảnh người dùng rằng route này không có nội dung học xuất hiện. Request HTML local từng trả HTTP 200 không chứng minh app hoạt động. Chưa có kết luận lỗi từ mạng, lazy import, bootstrap, trạng thái tài khoản, dữ liệu bài hay renderer.

Sau khi tài liệu được duyệt, cần tái hiện với route, tài khoản và dữ liệu đang có; đọc lỗi console/network/runtime; kiểm guest/account, reload và phiên dở. Không yêu cầu người dùng xóa dữ liệu/cookie để che lỗi. Nghiệm thu khi có màn học hoặc trạng thái lỗi phục hồi rõ, không nền trống. Nếu không điều khiển được Cốc Cốc, báo đúng browser đã kiểm; không nói đã kiểm Cốc Cốc từ kết quả Chromium khác.

## 14. Kế hoạch triển khai sau khi chốt

| Giai đoạn | Đầu ra | Phạm vi | Điều kiện qua |
|---|---|---|---|
| 0. Chốt tài liệu | Phạm vi, mẫu, chuẩn nội dung và ưu tiên | Toàn module | Người dùng chốt phiên bản tài liệu |
| 1. Ổn định nền | Xử lý màn trống, schema/migration, renderer/Studio parity, media | Nền chung + bài đại diện | Không mất dữ liệu; một bài soạn–phát hành–học trọn luồng |
| 2. Mẫu đại diện | Bài đầy đủ cho các họ âm/giao tiếp/ngữ pháp/đọc/viết | Chọn ID thật từ phụ lục trước khi làm | Người dùng test mẫu; không giới hạn phạm vi cuối vào mẫu |
| 3. Biên soạn toàn kho | Dàn bài, ngữ liệu, bài tập, minh họa, rubric và links | 217 bài nền + bài mới theo audit, theo lô cấp/đơn vị | Mỗi bài có checklist; không batch tự động rồi gọi đã review |
| 4. Phát hành từng lô | Revision trong Xưởng và learner dùng được | Lô đã qua gate | Rollback, dữ liệu bảo toàn, browser đạt |
| 5. Nghiệm thu module | Báo cáo đủ inventory, UX, liên kết và tồn đọng | Toàn Thiên Lộ | Người dùng xác nhận, mới USER-ACCEPTED |

Chưa ấn định lịch hoàn thành hoặc số tranh trước khi dàn bài được rà. Không lấy năm ảnh nhóm hay 1.371 trang kế hoạch sơ bộ làm thước đo hoàn thành. Có thể triển khai từng lô để kiểm soát chất lượng nhưng phạm vi cuối gồm toàn bộ 217 bài nền và các bài mới cần thiết để phủ HSK0–4.

## 15. Checklist nghiệm thu bắt buộc

### Nội dung

- Mỗi bài có mục tiêu rõ, kiến thức đầu vào, mẫu đủ đúng, luyện và vận dụng đúng cấp.
- Hanzi giản thể, Pinyin, nghĩa Việt, collocation/lượng từ tự nhiên; không placeholder hoặc câu chung giả làm nội dung riêng.
- Mỗi câu hỏi có đáp án/rubric hợp lệ, distractor hợp lý, feedback có ích; item mới không lộ đáp án qua tranh/title/hint.
- Kiểm unique content và source coverage; không gọi task placement là câu mới độc nhất.
- Năm pass: Mandarin, Pinyin, Việt, sư phạm, coverage/provenance; human review chỉ ghi khi có thật.

### Giao diện và chức năng

- So sánh screenshot thực với mẫu Ngọc Điện theo tỷ lệ/phân cấp/asset, không chỉ màu.
- 375px, desktop 1366/1440 và ngang; CTA/header trong viewport, không tràn ngang, touch tối thiểu 44px, focus/keyboard/reduced motion.
- Mọi trạng thái chính hoạt động: nạp, học, sai, sửa, hint, reload, offline tạm thời, hết bài, kết quả và học tiếp.
- Xưởng tạo lại được từng họ; lưu/mở lại/preview/phát hành không mất trường; form có validation rõ.

### Dữ liệu và release

- Inventory bảo toàn 217 bài nền/213 rich; mọi bài mới được kê riêng với ID, cấp, mục tiêu, lý do bổ sung và liên kết hợp lệ. Migration bảo toàn dữ liệu có test.
- Kiểm contract release→consumer, rollback và pinned revision; không trộn owner.
- Evidence aided/independent đúng; links bài–từ–chữ–ôn–lỗi–analytics không mồ côi.
- TypeScript, targeted tests, E2E hành trình thật, full check; lỗi HSK1 stale phải xử lý hoặc ghi blocker rõ trước kết luận module đạt.

## 16. Quyết định cần người dùng chốt qua tài liệu

1. Đã xác nhận phạm vi là toàn bộ 217 bài nền, thêm bài không giới hạn theo nhu cầu phủ HSK0–4 và Xưởng đầy đủ, triển khai theo lô có test.
2. Chọn Ngọc Điện làm nền thẩm mỹ, cho phép bố cục khác nhau theo họ bài.
3. Chốt sáu trang mẫu giao tiếp và điều chỉnh cách học/feedback nếu cần.
4. Chốt chính sách ảnh: từng bài có brief riêng, dùng sơ đồ thay tranh khi hợp lý; không cam kết mọi trang phải có tranh.
5. Chốt ranh giới chấm điểm: tự đối chiếu không tự thành mastery; câu mở/âm cần công cụ và gate đúng.
6. Chọn ưu tiên mẫu thật đầu tiên; đề xuất xử lý professional-1 trước, rồi mẫu âm/giao tiếp/đọc/viết theo ID phù hợp.

Bạn có thể góp ý theo số mục, ví dụ “Mục 9: cần kéo thả ảnh trực tiếp”. Mỗi sửa đổi được ghi trong nhật ký. **Hồ sơ đã được chốt kèm bổ sung bản 0.2; việc nghiệm thu module vẫn cần xác nhận sau triển khai và test.**
