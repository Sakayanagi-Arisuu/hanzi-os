# Báo cáo kết quả hiện tại của dự án HANZI OS

Học phần Học kỳ doanh nghiệp • Cập nhật ngày 16 tháng 09 năm 2026


## 1 Tổng quan và mức độ hoàn thiện

HANZI.OS là ứng dụng web hỗ trợ người Việt tự học tiếng Trung phổ thông, sử dụng chữ giản thể, Pinyin và giao diện tiếng Việt. Dự án tổ chức việc học theo lộ trình HSK0–HSK4, kết hợp bài học tương tác, ôn tập cách quãng, luyện chữ, luyện nói, đọc hiểu và theo dõi tiến độ trong cùng một hệ thống.

Đến thời điểm báo cáo, dự án đã vượt qua giai đoạn giao diện minh họa: đã có các luồng học và lưu dữ liệu, công cụ biên tập nội dung, kiểm tra tự động và bản chạy local phục vụ trình diễn, kiểm thử. Mức độ phù hợp hiện tại là bản thử nghiệm chức năng đang được hoàn thiện và nghiệm thu từng module; chưa xác nhận sẵn sàng vận hành thương mại hoặc triển khai đại trà.

So với báo cáo tuần 1 và tuần 2, kết quả đã phát triển từ phân tích bài toán và luồng học mẫu sang hệ thống nhiều chức năng có dữ liệu học tập và nội dung phân cấp. Báo cáo này đánh giá bằng chức năng, nội dung và bằng chứng kiểm thử; không quy đổi số bài học hoặc số đầu việc thành tỷ lệ hoàn thiện chung.


## 2 Quy mô nội dung hiện có

| Cấp độ | Bài nền hiện có | Bài có nội dung rich |
| --- | --- | --- |
| HSK0 | 4 | 0 ở nguồn nền |
| HSK1 | 40 | 40 |
| HSK2 | 40 | 40 |
| HSK3 | 55 | 55 |
| HSK4 | 78 | 78 |
| Tổng | 217 | 213 |

Rich là nội dung bài học có cấu trúc mở rộng, không đồng nghĩa đã được chuyên gia nghiệm thu. Theo checkpoint ngày 16/09, 53 bài đã phát hành bản biên soạn lại trong môi trường local; 164 bài nền còn lại chưa có bản soạn lại này. Hai số liệu mô tả hai lớp nội dung, không cộng thành 270 bài.

Kho bài biên soạn lại được ghi nhận có 487 hoạt động, trong đó 30 hoạt động có mục tiêu học tập gắn nguồn, 457 hoạt động còn thiếu liên kết này. Nội dung có AI hỗ trợ vẫn được đánh dấu chưa có người có chuyên môn thẩm định. Số bài hiện có chưa chứng minh bao phủ đầy đủ chuẩn HSK hoặc người học đã đạt HSK4.


## 3 Các chức năng đã triển khai

| Nhóm chức năng | Người dùng hiện có thể thực hiện | Mức độ hiện tại |
| --- | --- | --- |
| Khởi đầu và lộ trình | Tạo hồ sơ, dùng chế độ khách hoặc tài khoản; khảo nghiệm điểm khởi hành; theo dõi và mở bài theo điều kiện tiên quyết. | Đã có luồng chức năng; tiếp tục nghiệm thu. |
| Bài học Thiên Lộ | Đọc từ vựng, Pinyin, nghĩa, ngữ pháp, hội thoại và sơ đồ; trả lời lựa chọn, xếp câu, điền từ; xem phản hồi; tiếp tục phiên sau tải lại. | Bài nền đã có; 53 bài có bản soạn lại local. |
| Ôn tập và lỗi sai | Ôn theo lịch cách quãng FSRS, xem nội dung cần ôn và lỗi sai, thực hiện bài luyện củng cố. | Đã triển khai; liên thông hoạt động trang mới còn cần hoàn thiện. |
| Chữ Hán và từ điển | Tra từ, Pinyin, nghĩa; xem cấu trúc chữ và luyện nét với dữ liệu có nguồn; tra cứu từ trong ngữ cảnh học. | Đã có công cụ; chất lượng ví dụ cần rà tiếp. |
| Luyện nói và phát âm | Tiếp cận bài luyện phát âm, nghe hỗ trợ và thao tác thu âm khi thiết bị cho phép. | Dùng để luyện tập; chưa xác nhận chấm phát âm chuyên môn. |
| Đọc hiểu Vạn Quyển Các | Mở thư viện và chương đọc, tra từ, lưu nội dung và làm câu hỏi đọc hiểu. | Đã có luồng thư viện và công cụ biên tập câu hỏi. |
| Đánh giá và thi thử | Làm bài đánh giá cấp độ HSK1–HSK4; thi thử theo phiên, xem kết quả và tiếp tục phiên đang dở. | Đã triển khai; không thay chứng chỉ HSK chính thức. |
| Hồ sơ và thống kê | Xem hoạt động, tiến độ và lịch sử luyện; duy trì dữ liệu trên thiết bị và sử dụng đồng bộ tài khoản. | Đã có nền và nhật ký hoạt động; chưa đồng nhất mọi hoạt động với mastery. |
| Xưởng và quản trị | Biên tập trang, hoạt động, sơ đồ, nguồn học liệu; xem trước, kiểm định và phát hành nội dung theo quyền. | Đã triển khai phục vụ local; còn giới hạn quản lý media và nghiệm thu nội dung. |

Các chức năng trên được tổ chức trong năm vùng người học: Học, Ôn, Nói, Luyện và Hồ sơ. Chủ đề hệ thống và tu luyện tạo bản sắc giao diện; tác vụ vẫn cần nhãn rõ ràng để người học sử dụng được.


## 4 Kết quả kỹ thuật và quá trình triển khai

Dự án dùng React và TypeScript với runtime Vinext tương thích cấu trúc Next, tổ chức theo các miền chức năng trong một ứng dụng. Thư mục app quản lý route và API; src chứa giao diện, nghiệp vụ học tập và đồng bộ; content quản lý nguồn, bản nháp và nội dung phát hành; db và drizzle quản lý dữ liệu và migration; scripts và e2e phục vụ kiểm định và kiểm thử.

Kiến trúc local-first dùng localStorage và IndexedDB để giữ tiến độ, phiên học và hàng đợi gửi dữ liệu. Phía tài khoản có API và cơ sở dữ liệu D1. Các lớp đồng bộ kiểm tra chủ sở hữu dữ liệu, trạng thái đặt lại và tính chống ghi trùng để hạn chế mất hoặc ghi nhận lặp kết quả khi tải lại và thử gửi lại.

| Mốc | Kết quả được ghi nhận |
| --- | --- |
| 18/07 đến đầu 08/2026 | Hình thành ứng dụng; bổ sung nền dữ liệu, đồng bộ, quản trị nội dung và bài thi thử. |
| 10/08/2026 | Chuyển sang cải tiến từng module và chờ người dùng kiểm thử; thu gọn quy trình và xử lý vấn đề chuyển route. |
| 24–26/08/2026 | Mở rộng thư viện đọc, luyện chữ, tra cứu, thi thử có khả năng tiếp tục phiên và thống kê. |
| 07–10/09/2026 | Tích hợp hành trình học; cải tiến giao diện ôn tập, phát âm và luyện lỗi sai. |
| 11–16/09/2026 | Mở rộng Xưởng, bài học theo trang, biên soạn nội dung riêng, ghi lần trả lời đầu và hàng đợi đồng bộ hoạt động. |


## 5 Kiểm thử và bằng chứng kết quả

Dự án có validator nội dung, kiểm tra kiểu TypeScript, test đơn vị và tích hợp bằng Vitest, kiểm thử hành trình bằng Playwright. Các checkpoint ghi lại cả trường hợp lỗi và lần kiểm lại, thay vì chỉ liệt kê giao diện đã làm.

Trong lượt rà soát ngày 16/09, kiểm tra TypeScript đạt. Bộ kiểm tra tổng dừng do hồ sơ review HSK4 chưa đồng bộ với dữ liệu hiện tại. Vì vậy, các kết quả kiểm thử theo module trước đây không được xem là bằng chứng toàn bộ phiên bản hiện tại đã vượt qua mọi cổng kiểm tra.

Lượt chạy test riêng ghi nhận 2.446 test đạt, 40 test lỗi và 25 test bỏ qua. Các lỗi cần được phân loại và xử lý trước khi nghiệm thu phiên bản; số test đạt không được dùng để suy ra phần trăm hoàn thiện sản phẩm.

Mốc gần nhất ngày 16/09 ghi nhận hai bài HSK2 về hướng chuyển động và hẹn giờ: kiểm tra nguồn và đáp án, mở bản biên tập, đối chiếu nội dung người học, trả lời và tải lại để giữ lựa chọn. Các mốc trước đã kiểm phiên học ở nhiều kích thước màn hình và thử sai rồi sửa đúng nhưng vẫn giữ lần trả lời đầu.

Các lần phát hành nội dung local được ghi nhận có sao lưu, chạy thử giao dịch, kiểm khóa ngoại và đối chiếu bảng dữ liệu ngoài phạm vi thay đổi. Đây là bằng chứng cho những hành trình đã kiểm; chưa phải kết luận toàn bộ hệ thống không còn lỗi hoặc mọi module đã được người dùng nghiệm thu.


## 6 Những phần chưa hoàn thiện

Nội dung học chưa đồng đều về chiều sâu. Phần lớn bài nền chưa được biên soạn lại theo cấu trúc mới; các hoạt động còn thiếu mục tiêu và liên kết nguồn cần được bổ sung. Một số ảnh còn dùng chung, ví dụ và nghĩa theo ngữ cảnh cần rà soát tiếp. Nội dung AI hỗ trợ cần giáo viên hoặc người có chuyên môn thẩm định trước khi khẳng định chất lượng sư phạm.

Đánh giá năng lực cần tiếp tục hoàn thiện. Điểm kinh nghiệm, chuỗi ngày học, số câu làm và số bài hoàn thành chỉ phản ánh hoạt động. Việc kết luận thành thạo phải dựa trên bài làm độc lập, đủ mẫu và phân tán theo thời gian; câu có gợi ý, xem đáp án hoặc hỗ trợ nhập liệu phải được phân biệt.

Âm thanh và luyện nói còn giới hạn. Giọng tổng hợp của trình duyệt là phương án hỗ trợ; văn bản nhận dạng từ giọng nói không tự chứng minh độ đúng của phát âm hoặc thanh điệu. Dự án chưa có căn cứ để tuyên bố hệ thống đánh giá phát âm đạt chất lượng chuyên môn.

Độ ổn định và tích hợp còn cần nghiệm thu. Hàng đợi kết quả đã có cơ chế gửi lại và đối chiếu phiên bản nội dung, nhưng xử lý một số xung đột và liên thông từ hoạt động mới sang ôn tập, lỗi sai, thống kê còn mở. Cần kiểm tra hồi quy toàn hệ thống sau các thay đổi gần đây.

Khả năng vận hành thực tế chưa được xác nhận. Bản hiện tại ưu tiên chạy local và trình diễn; chưa có kết quả thí điểm với doanh nghiệp, số liệu hiệu quả học tập, kiểm thử tải thực tế hoặc cam kết vận hành. Những tính năng dành riêng cho doanh nghiệp chưa được xác định trong phạm vi báo cáo này.


## 7 Đánh giá kết quả hiện tại

Kết quả chính của HANZI.OS là một ứng dụng học tiếng Trung có nhiều luồng sử dụng thực, kho bài theo cấp độ, cơ chế lưu tiến độ và công cụ quản lý nội dung. Dự án thể hiện được quá trình phân tích yêu cầu, tổ chức kiến trúc, xây dựng giao diện, xử lý dữ liệu và kiểm thử trong một sản phẩm web có thể trình diễn.

Dự án đang ở giai đoạn hoàn thiện chất lượng nội dung và tích hợp, chưa đóng nghiệm thu toàn bộ. Kết quả hiện tại là cơ sở để giảng viên đánh giá sản phẩm đã thực hiện; hướng phát triển tiếp theo sẽ được lựa chọn riêng sau khi thống nhất mục tiêu học phần.


## Tài liệu đối chiếu

Báo cáo tiến độ HANZI.OS tuần 1 và tuần 2; sổ IMPLEMENTATION_CHECKPOINT cập nhật đến 16/09/2026; tài liệu ARCHITECTURE và TESTING; cấu trúc mã nguồn và lịch sử Git. Mốc commit gần nhất trước đợt rà soát: 99bde15 ngày 10/09/2026. Các kết quả sau mốc này được đối chiếu thêm với thay đổi trong workspace và checkpoint triển khai.
