# HSK4 Premium — quyết định thương mại và trust boundary

**Trạng thái:** Ví Hanzi và quyền bài HSK4 thử nghiệm trên localhost; thanh toán VND chưa cấu hình, chưa mở bán. Giá niêm yết VNĐ đã cấu hình riêng; cập nhật 07/10/2026.

## Bản đồ triển khai thương mại hóa

| Năng lực | Đã có trên local | Còn trước pilot trả phí |
| --- | --- | --- |
| Quyền học | Chỉ bài Thiên Lộ HSK4 mặc định Premium; admin đổi Free/Premium từng bài, server kiểm nội dung và thao tác học. | Nghiệm thu toàn bộ 78 bài HSK4 phát hành, media và cache trên hosting thật. |
| Gói và vòng đời | Gói tháng/năm, gia hạn chủ động, hết hạn và hoàn đơn tính lại quyền; không xóa tiến độ. | Chính sách giá VND, gia hạn/hoàn và điều khoản được chủ sản phẩm chốt. |
| Ví Hanzi | Admin cấp/thu hồi điểm thử, đặt giá, người học mua/yêu cầu hoàn, admin hoàn hoặc từ chối có lý do; sổ cái và audit nguyên tử. | Kiểm hành trình hai vai trò trên D1 local cô lập và nghiệm thu sản phẩm; ví chưa có giá trị tiền. |
| Vận hành khách hàng | Admin tra đúng tên đăng nhập/mã tài khoản, xem hạn gói, đơn, ví và hỗ trợ theo một người; bảng thử nghiệm có khách mua lại, gói sắp hết hạn và hàng chờ. | Chính sách tranh chấp sau từ chối, SLA hỗ trợ và thông báo hết hạn cần chốt. |
| Tài chính và đối soát | Chỉ có giao dịch thử nghiệm, phân biệt Hanzi và sandbox không thu tiền. | VNPAY/payOS để cuối; cần merchant sandbox, callback/webhook, đơn VND bất biến, đối soát và hoàn tiền provider. Chỉ sau đó mới có báo cáo doanh thu thật. |
| Phát hành | D1 local có backup/restore rehearsal; production gate vẫn fail-closed. | Human review, provenance/license, định danh/recovery, hosted restore, security/privacy độc lập, pilot và vận hành production. |

Không suy tỷ lệ chuyển đổi hoặc doanh thu từ số đơn và tài khoản thử nghiệm. Bảng
quản trị hiện là công cụ vận hành local để kiểm luồng trước khi mở cổng tiền.

## Đối chiếu báo cáo gốc với phạm vi đã chốt

Báo cáo `deliverables/2026-09-19/HANZI_OS_Bao_cao_phan_chuong.pdf`,
Chương 5 (trang 9–10), là **đề xuất thương mại hóa**, không phải chỉ thị triển
khai tự động. Bảng ở mục 5.1.2 đề xuất khóa thêm thư viện, luyện đề và tra cứu;
chỉ thị sau đó của chủ sản phẩm thay thế phần quyền lợi này: **bài học HSK4
trong Thiên Lộ và cửa Phòng Luyện Đề được đánh dấu Premium**. Ôn tập, thư viện, từ điển, chữ Hán, khảo nghiệm,
các khu khác tiếp tục theo quy tắc hiện có; đề luyện kiểm quyền theo từng cửa, không theo cấp HSK4.

Các module nghiệp vụ ở mục 5.2.1 vẫn là hướng cần triển khai trong ranh giới mới:
gói/quyền bài Thiên Lộ HSK4, đơn và thanh toán đã xác minh, gia hạn/hết hạn,
hỗ trợ/hoàn tiền và quản trị kinh doanh. Các chỉ số doanh thu, chuyển đổi, gia
hạn, hoàn tiền trong mục 5.1.4 chỉ được tính từ giao dịch thật đã đối soát; bảng
điều hành sandbox hiện không phải báo cáo doanh thu. Giai đoạn thí điểm trả phí
ở mục 5.2.3 cần pilot và các gate production riêng, không được suy từ test local.

## Phạm vi đã chốt

- HSK0–HSK3 miễn phí và dùng được khi chưa đăng nhập. **Bài Thiên Lộ HSK4 mặc
  định Premium**; admin có thể mở Free từng bài HSK4 trên localhost. Từ điển,
  chữ Hán, khảo nghiệm và khu khác giữ cách dùng bình thường. Cửa Phòng Luyện Đề đánh dấu Premium cần gói còn hiệu lực; admin có thể đổi quyền từng cửa. Server
  kiểm quyền theo bài khi mở/học/nộp bài Thiên Lộ HSK4.
- Hai kỳ hạn đang có trong bản local: 1 tháng và 1 năm. Gia hạn nối tiếp thời
  hạn hiện có; hết hạn hoặc hoàn giao dịch không xóa progress/FSRS/lịch sử.
- Ledger `commerce_sandbox_orders` và nút “Xác nhận không thu tiền” chỉ phục vụ
  thử nghiệm trên localhost. Chúng không phải bằng chứng thanh toán thật.
- Ví Hanzi là điểm nội bộ thử nghiệm, không quy đổi VND, không tự nạp/rút.
  Admin cấp/thu hồi có step-up và audit; số dư và lịch sử gắn tài khoản. Admin
  đặt giá Hanzi riêng cho gói tháng/năm; trước khi đặt giá không có thanh toán
  bằng ví. Khi đã đặt giá cho bất kỳ gói nào, API xác nhận không thu tiền bị
  khóa cho cả hai kỳ hạn; kỳ hạn chưa có giá Hanzi không thể mua. Mua ví trừ
  điểm, ghi đơn, sổ cái và audit trong một D1 batch; hoàn
  đơn trả đúng số Hanzi đã trừ và tính lại thời hạn. Đơn và ví được xuất/xóa
  cùng tài khoản, có restore rehearsal.
  Bước trừ ví đối chiếu lại giá gói trong cùng transaction; nếu admin đổi giá
  sau khi người học nhìn thấy, không trừ điểm và yêu cầu tải lại giá. Yêu cầu
  hoàn ghi audit cùng transaction với trạng thái chờ; lỗi audit rollback cả hai.
- `lesson_access_rules` chỉ áp cho bài Thiên Lộ HSK4 có ID trong catalog. Các
  bài hiện có và bài mới khi vào catalog mặc định Premium; admin có thể chọn
  Free/Premium từng bài. Đổi quyền không xóa tiến độ, FSRS hay phiên học.
- Yêu cầu hoàn chỉ tạo trạng thái chờ; quyền còn hiệu lực cho đến khi quản trị
  hoàn giao dịch. Test repository đã xác nhận chuyển `paid` → `refunded` thu hồi
  quyền; browser đã kiểm admin refund thật trong sandbox local và API bài đổi
  200 → 403. Chưa có bằng chứng hoàn tiền qua provider.
- Với đơn Ví Hanzi, admin có thể từ chối yêu cầu hoàn bằng lý do 10–500 ký tự.
  Quyết định và audit ghi cùng transaction; đơn vẫn `paid`, điểm và quyền học
  giữ nguyên. Người học thấy lý do trong lịch sử gói và có thể mở ticket hỗ trợ;
  một đơn chỉ gửi một yêu cầu hoàn. Đơn bị từ chối rời hàng chờ, không thể hoàn
  bằng thao tác quản trị cũ. Đây là quy trình điểm thử, chưa định nghĩa chính sách
  tranh chấp hoặc hoàn VND.
- Admin hoàn sandbox dùng D1 batch để cập nhật ledger và chèn sự kiện audit trong
  cùng transaction. Test cố tình làm audit insert thất bại xác nhận ledger rollback;
  đường cập nhật không audit trước đây đã bị bỏ. Điều này chỉ áp dụng sandbox,
  chưa thay thế đối soát và callback provider thật.
- Bảng tổng hợp quản trị local gộp đơn Ví Hanzi với đơn sandbox không thu tiền
  khi đếm giao dịch, tài khoản, quyền còn hiệu lực, lượt hoàn và 200 giao dịch
  gần đây. Cột phương thức phân biệt hai loại; hàng chờ hoàn Ví Hanzi vẫn tách
  riêng để dùng đúng thao tác trả điểm. Các số này không phải doanh thu VND.
- Hỗ trợ Premium đã có ticket gắn tài khoản, hàng chờ quản trị và phản hồi trên
  trang gói. Phản hồi và audit ghi cùng transaction; browser local đã kiểm
  ticket đổi sang `answered`. Ticket được xuất/xóa cùng tài khoản và có trong restore rehearsal.
  Chưa có SLA, kênh thông báo bên ngoài hoặc quy trình tranh chấp tiền thật.

## Phương thức thanh toán

| Quyết định | Phương án đề xuất | Cần chốt trước tích hợp thật |
| --- | --- | --- |
| Ví Hanzi | Đã có bản local: admin cấp/thu hồi điểm thử, đặt giá Hanzi, người học mua gói và yêu cầu hoàn; admin hoàn điểm. | Người dùng test và nghiệm thu; không cần merchant. |
| VNPAY | Sẽ tích hợp sau: Return URL chỉ hiển thị, IPN đã xác minh mới cấp quyền. | Merchant sandbox, secret, domain và callback; giá VND. |
| VietQR qua payOS | Sẽ tích hợp sau: tạo link/QR từ đơn server, webhook có chữ ký và đối soát mới cấp quyền. | Merchant sandbox, secret, domain và webhook; giá VND. |
| Giá VND | Niêm yết 79.000đ/tháng, 699.000đ/năm; admin chỉnh riêng, có step-up và audit nguyên tử. | Trước thu tiền cần phiên bản giá/số tiền bất biến trên đơn, thuế/phí. |
| Gia hạn | Thanh toán chủ động từng kỳ, không tự trừ tiền; phù hợp bản gói hiện tại và luồng one-time của hai tài liệu API. | Giữ gia hạn chủ động hay mở auto-renew (nếu mở, cần hợp đồng/đồng ý và API riêng). |
| Hoàn tiền | Người học gửi yêu cầu; quản trị viên xác minh lại, xử lý qua provider; chỉ cập nhật quyền khi có kết quả hoàn đã xác minh. | Cửa sổ hoàn, hoàn toàn phần/một phần, cách tính kỳ hạn sau hoàn, kênh hỗ trợ. |

Phương án VNPAY/MoMo và giá VND ở bản tài liệu trước đã được yêu cầu mới thay
thế. Giá niêm yết VNĐ được chủ sản phẩm ủy quyền chọn ngày 07/10/2026; chưa có chính sách hoàn tiền thật. Giá Hanzi do admin
đặt chỉ dùng trong local test. Cần merchant sandbox, secret ngoài Git và domain
callback trước khi kiểm hai cổng tiền thật.

Nguồn tích hợp dự kiến: [VNPAY PAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
và [payOS](https://payos.vn/docs/). Adapter phải chuyển đơn vị theo từng
provider và chỉ xử lý kết quả đã xác minh từ server/webhook.

## Threat model riêng cho commerce

| Rủi ro | Control bắt buộc |
| --- | --- |
| Browser tự nhận đã trả tiền hoặc giả Return URL | Không có API public `pay` trên production. Return URL chỉ để hiển thị; quyền chỉ sinh từ callback/IPN đã kiểm chữ ký và đối chiếu với đơn server. |
| Giả callback hoặc sửa số tiền/gói | Xác minh chữ ký trên đúng canonical payload/provider secret; đối chiếu merchant, order ID, amount, currency, trạng thái và price version đã lưu. Secret không gửi client, không lưu Git/log. |
| Callback lặp, đến trễ hoặc đảo thứ tự | Unique provider event/transaction ID, chuyển trạng thái compare-and-set và audit trong cùng transaction; không cấp hai kỳ hạn cho một giao dịch. |
| Sai chủ sở hữu hoặc quyền còn sau hoàn | Tất cả đọc/ghi đơn theo server-resolved user ID; entitlement tính từ ledger verified, hoàn tiền/chargeback verified mới thu hồi kỳ hạn; không xóa dữ liệu học. |
| Đổi URL đề HSK4 sang cấp miễn phí | Khi ghi đáp án/nộp đề, đối chiếu cấp độ và form của phiên server với URL trước khi mở ngân hàng câu hỏi hoặc xử lý kết quả. |
| Lộ nội dung bài Thiên Lộ HSK4 qua asset/cache | Rich lesson và enhancement gắn với bài ở route kiểm quyền, `Cache-Control: no-store`, service worker bỏ qua `/api`; scan marker bài sau build và test guest/account/hết hạn. Catalog nền, từ điển, chữ Hán và khảo nghiệm vẫn công khai. |
| Lộ dữ liệu hỗ trợ/thanh toán | Chỉ lưu mã giao dịch, số tiền, trạng thái và dấu vết cần đối soát; không lưu số thẻ hay credential provider. Export/delete/retention cho order, event và ticket phải có test. |
| Hoàn tiền sai hoặc audit thiếu | Admin step-up, quyết định và kết quả provider có audit; nếu provider/audit lỗi thì fail-closed, có trạng thái chờ đối soát và thao tác retry idempotent. |

Media trong package phát hành được phân loại theo nơi sử dụng: media chỉ thuộc
bài học Thiên Lộ HSK4 cần quyền theo bài trước khi đọc byte và dùng cache
`private, no-store`; media của bài HSK4 được admin mở Free có thể đọc mà không
cần gói nhưng vẫn không cache công khai. Media của khu khác vẫn công khai. Package
thiếu cấp độ/loại nội dung không tự mở media. Chưa có media bài HSK4 phát hành
trong D1 local để kiểm browser end-to-end cho trường hợp này.
Client đóng màn bài Thiên Lộ HSK4 tại hạn do server cấp bằng thời gian trôi qua đơn điệu,
không dựa vào giờ hệ thống của thiết bị hay chờ poll định kỳ. Thu hồi do hoàn
tiền vẫn cần callback/provider thật và kiểm end-to-end trước production.
Catalog nền và kho từ tham chiếu HSK4 được phép dùng công khai theo phạm vi vừa
chốt. Chỉ payload bài Thiên Lộ HSK4 cần đứng sau API kiểm quyền; gate bundle
kiểm marker rich lesson, không áp cho từ điển hoặc đề luyện.

## Ranh giới production

`verify:production` hiện chặn 23 điều kiện chưa có evidence, gồm human review
nội dung, nguồn/license, định danh/recovery, hosted restore, security/privacy
review độc lập và vận hành. Không dùng test local, đơn sandbox hoặc tài liệu này
để tuyên bố đã mở bán. Chỉ triển khai provider sau khi bốn quyết định trên được
chốt; chỉ mở quyền production sau khi callback, ledger, export/delete, cache,
refund, support và các gate production liên quan được chứng minh end-to-end.
