import type { Metadata } from "next";
import { PublicFooter } from "../../src/components/PublicFooter";
import "../../src/components/PolicyPages.css";

export const metadata: Metadata = {
  title: "Quyền riêng tư | HANZI.OS",
  description:
    "Thông tin minh bạch về dữ liệu được dùng trong bản prototype HANZI.OS.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: "Quyền riêng tư | HANZI.OS",
    description:
      "Thông tin minh bạch về dữ liệu được dùng trong bản prototype HANZI.OS.",
  },
};

export default function PrivacyPage() {
  return (
    <main className="policy-main" id="top">
      <div className="policy-layout"><aside className="policy-toc"><p>TRONG TRANG NÀY</p><nav aria-label="Mục lục"><a href="#section-1"><span>01</span>Dữ liệu trên thiết bị và tài khoản tùy chọn</a><a href="#section-2"><span>02</span>Lưu trữ kỹ thuật và kết nối mạng</a><a href="#section-3"><span>03</span>Microphone và nhận dạng giọng nói</a><a href="#section-4"><span>04</span>Lưu giữ, chia sẻ và xóa</a><a href="#section-5"><span>05</span>Người học nhỏ tuổi và liên hệ</a></nav></aside><article className="policy-article">
        <nav aria-label="Điều hướng pháp lý" className="policy-nav">
          <a href="/welcome" className="policy-link">HANZI.OS</a>
          <a href="/privacy" aria-current="page" className="policy-link">Quyền riêng tư</a>
          <a href="/terms" className="policy-link">Điều khoản</a>
          <a href="/voice-data" className="policy-link">Dữ liệu giọng nói</a>
        </nav>

        <header>
          <span className="policy-kicker">QUYỀN RIÊNG TƯ · 13/08/2026</span>
          <h1 className="policy-title">Quyền riêng tư</h1>
          <p className="policy-lead">
            Trang này mô tả cách bản closed-alpha hiện tại xử lý dữ liệu trên
            thiết bị và, khi bạn chủ động đăng nhập, trong kho đồng bộ cloud.
          </p>
        </header>

        <p role="note" className="policy-notice">
          Đây là bản công bố tạm thời phục vụ prototype, chưa phải chính sách
          đã được tư vấn hoặc phê duyệt pháp lý. Nội dung phải được rà soát và
          bổ sung chủ thể vận hành cùng kênh liên hệ trước public beta.
        </p>

        <section className="policy-section" id="section-1">
          <h2 className="policy-heading">Dữ liệu trên thiết bị và tài khoản tùy chọn</h2>
          <p className="policy-copy">
            Tên hiển thị, mục tiêu học, cấu hình, tiến độ bài học, lỗi sai, XP,
            lịch ôn FSRS, từ đã lưu và learning evidence được ghi vào localStorage;
            checkpoint, outbox và bản ghi lỗi đồng bộ được giữ trong IndexedDB
            theo từng chủ dữ liệu. Evidence phát âm có thể chứa transcript,
            confidence và điểm khớp văn bản do trình duyệt trả về.
          </p>
          <p className="policy-copy">
            Nếu đăng nhập bằng ChatGPT, HANZI.OS nhận email và tên hiển thị do
            hạ tầng đăng nhập chuyển tiếp, tạo mã tài khoản nội bộ và đồng bộ bản
            chiếu tiến độ vào cơ sở dữ liệu D1. Hàng đợi ngoại tuyến được tách theo
            tài khoản và chống gửi chéo khi đổi người dùng. Transcript giọng nói
            là dữ liệu local-only: protocol chủ động loại toàn bộ evidence loại
            speech-transcript trước khi tạo gói cloud.
          </p>
          <p className="policy-copy">
            Closed alpha hiện chỉ nhận email đã xác thực, chưa nhận một provider
            subject bất biến. Nếu email tài khoản ChatGPT thay đổi, dữ liệu cloud
            cũ có thể chưa tự liên kết với identity mới; đây là giới hạn khôi phục
            tài khoản phải được giải quyết trước public beta.
          </p>
          <p className="policy-copy">
            Mỗi tài khoản có vai trò ứng dụng Người học hoặc Quản trị. Quản trị
            viên được xem mã tài khoản, email, trạng thái và vai trò để cấp/thu
            quyền; Cổng Quản Trị không hiển thị tiến độ, câu trả lời hay lịch ôn
            của người học khác. Thay đổi quyền được kiểm tra lại phía máy chủ và
            được lưu trong D1.
          </p>
          <p className="policy-copy">
            Trong luồng học có đăng nhập, máy chủ lưu phiên bài học, câu đọc hiểu
            và khảo sát; phiên bản nội dung/schema; form đã cấp; lựa chọn hoặc câu
            trả lời của người học; thời điểm nhận; khóa idempotency và metadata
            thiết bị cần cho chống gửi trùng. Máy chủ tự đối chiếu đáp án để tạo
            outcome/evidence. Projection gửi về trình duyệt không chứa answer key;
            kết quả khảo sát hiện chỉ là thống kê tổng hợp chưa hiệu chỉnh, không
            phải mastery, HSK, định tuyến hay quyền mở khóa.
          </p>
          <p className="policy-copy">
            Trang Hồ sơ có hai bản xuất: bản phục hồi thiết bị chứa projection
            hiện tại, pending changes và speech evidence local-only; bản xuất
            tài khoản chứa snapshot cloud đã xác nhận cùng các bảng dữ liệu thuộc
            người dùng, gồm graph phiên/attempt assessment. Bản xuất giữ câu trả
            lời của chính người học nhưng loại answer key, lời giải và outcome/
            score từng item; thống kê tổng hợp vẫn mang nhãn chưa hiệu chỉnh.
            Trang này cũng cho phép đặt lại, đăng xuất hoặc xóa tài khoản cùng dữ
            liệu máy chủ. Với người dùng ẩn danh, xóa dữ liệu trình duyệt vẫn có
            thể làm mất tiến độ. Với tài khoản, chỉ tiến độ đã được máy chủ xác
            nhận mới có thể khôi phục sau khi xóa toàn bộ bộ nhớ trình duyệt.
          </p>
        </section>

        <section className="policy-section" id="section-2">
          <h2 className="policy-heading">Lưu trữ kỹ thuật và kết nối mạng</h2>
          <ul className="policy-list">
            <li>
              Service worker và Cache API có thể lưu giao diện, trang đã mở và
              tài nguyên tĩnh để hỗ trợ tải lại hoặc sử dụng hạn chế khi mất mạng.
            </li>
            <li>
              Hạ tầng lưu trữ website và nhà cung cấp mạng có thể xử lý địa chỉ
              IP, user-agent và log truy cập theo chính sách vận hành của họ.
            </li>
            <li>
              Bản closed alpha hiện không cài quảng cáo, analytics bên thứ nhất hay
              cookie theo dõi chéo. localStorage, IndexedDB và cache chỉ phục vụ
              chức năng học, hàng đợi ngoại tuyến và khả năng khôi phục trên thiết bị.
            </li>
            <li>
              API tài khoản và đồng bộ trả chỉ thị private/no-store; service worker
              không cache API, route đăng nhập hoặc tài liệu cá nhân hóa.
            </li>
          </ul>
        </section>

        <section className="policy-section" id="section-3">
          <h2 className="policy-heading">Microphone và nhận dạng giọng nói</h2>
          <p className="policy-copy">
            Vạn Âm Điện có hai chế độ tùy chọn với hai xác nhận riêng. Nhận dạng
            chữ dùng Web Speech API: trình duyệt hoặc nhà cung cấp của trình duyệt
            có thể xử lý âm thanh ngoài thiết bị, còn frontend HANZI.OS chỉ nhận
            transcript và độ tin cậy. Luồng này không tải tệp WAV lên máy chủ
            HANZI.OS.
          </p>
          <p className="policy-copy">
            Phản hồi âm học beta cần một xác nhận tự nguyện độc lập. Sau khi bạn
            đồng ý, một đoạn WAV tối đa 15 giây được gửi qua điểm nhận cùng trang
            rồi chuyển tạm tới Microsoft Azure Speech cùng câu mẫu và thông tin
            kỹ thuật cần thiết. HANZI.OS không lưu WAV sau khi yêu cầu kết thúc;
            kết quả Azure chỉ hiển thị trong phiên, chưa nghiệm chuẩn và không
            tăng mức làm chủ kỹ năng, XP hay điều kiện mở khóa.
            Microsoft công bố rằng dữ liệu gửi cho real-time speech-to-text và
            pronunciation assessment không được họ lưu giữ, nhưng việc xử lý vẫn
            chịu điều khoản và chính sách Microsoft hiện hành.
          </p>
          <p className="policy-copy">
            Azure <code>zh-CN</code> không cung cấp điểm thanh điệu từ vựng riêng;
            vì vậy điểm 0–100 của nhà cung cấp không được trình bày như “% đúng
            thanh điệu” hoặc chứng nhận chuẩn bản ngữ.
          </p>
          <p className="policy-copy">
            Xem công bố riêng tại <a href="/voice-data" className="policy-link">Dữ liệu giọng nói</a>
            {" "}trước khi sử dụng microphone.
          </p>
        </section>

        <section className="policy-section" id="section-4">
          <h2 className="policy-heading">Lưu giữ, chia sẻ và xóa</h2>
          <p className="policy-copy">
            Dữ liệu cục bộ được giữ cho đến khi bạn xóa trong ứng dụng, xóa dữ
            liệu trình duyệt hoặc trình duyệt tự thu hồi bộ nhớ. Dữ liệu cloud
            được giữ đến khi tài khoản bị xóa; API xóa dùng danh tính phía máy chủ
            và xóa các bản ghi phụ thuộc. HANZI.OS không bán dữ liệu học. Việc
            xử lý hoặc lưu giữ âm thanh bởi dịch vụ nhận dạng của trình duyệt nằm
            ngoài quyền kiểm soát của prototype. HANZI.OS không lưu WAV gửi cho
            phản hồi âm học; chính sách xử lý của Azure được công bố riêng tại
            trang Dữ liệu giọng nói.
          </p>
        </section>

        <section className="policy-section" id="section-5">
          <h2 className="policy-heading">Người học nhỏ tuổi và liên hệ</h2>
          <p className="policy-copy">
            Prototype chưa được thiết kế hoặc đánh giá như một dịch vụ dành riêng
            cho trẻ em. Người học nhỏ tuổi nên sử dụng dưới sự hướng dẫn của phụ
            huynh hoặc người giám hộ và không nhập thông tin nhận dạng không cần thiết.
          </p>
          <p className="policy-copy">
            Kênh liên hệ về quyền riêng tư chưa được cấu hình trong prototype.
            Chủ sản phẩm phải thay thế placeholder này bằng thông tin liên hệ có
            người chịu trách nhiệm trước khi mời người dùng bên ngoài.
          </p>
        </section>

        <footer className="policy-footer">
          Cập nhật lần cuối: 13/08/2026 · Phạm vi: closed alpha local-first với đồng bộ tài khoản tùy chọn.
        </footer>
      </article></div><PublicFooter />
    </main>
  );
}
