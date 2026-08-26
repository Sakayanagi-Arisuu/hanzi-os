import type { Metadata } from "next";
import type { CSSProperties } from "react";

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

const styles = {
  main: {
    minHeight: "100vh",
    padding: "clamp(20px, 5vw, 64px)",
    color: "#e8f2ef",
    background: "#030708",
  },
  article: {
    width: "min(100%, 860px)",
    margin: "0 auto",
  },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px 18px",
    marginBottom: "40px",
    color: "#9eb8b0",
    fontSize: "14px",
  },
  link: {
    color: "#51f6c1",
    textDecoration: "underline",
    textUnderlineOffset: "4px",
  },
  kicker: {
    color: "#51f6c1",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
  title: {
    margin: "14px 0 12px",
    fontSize: "clamp(38px, 8vw, 68px)",
    lineHeight: 1.02,
  },
  lead: {
    maxWidth: "720px",
    margin: 0,
    color: "#b7ccc6",
    fontSize: "17px",
    lineHeight: 1.75,
  },
  notice: {
    margin: "28px 0 38px",
    padding: "16px 18px",
    color: "#f3c969",
    background: "#211d10",
    border: "1px solid #68572b",
    lineHeight: 1.65,
  },
  section: {
    padding: "28px 0",
    borderTop: "1px solid #1d3933",
  },
  heading: {
    margin: "0 0 12px",
    fontSize: "22px",
  },
  copy: {
    margin: "8px 0 0",
    color: "#a9beb8",
    fontSize: "15px",
    lineHeight: 1.75,
  },
  list: {
    margin: "10px 0 0",
    paddingLeft: "22px",
    color: "#a9beb8",
    fontSize: "15px",
    lineHeight: 1.75,
  },
  footer: {
    paddingTop: "28px",
    color: "#819b94",
    fontSize: "13px",
    borderTop: "1px solid #1d3933",
  },
} satisfies Record<string, CSSProperties>;

export default function PrivacyPage() {
  return (
    <main style={styles.main}>
      <article style={styles.article}>
        <nav aria-label="Điều hướng pháp lý" style={styles.nav}>
          <a href="/" style={styles.link}>HANZI.OS</a>
          <a href="/privacy" aria-current="page" style={styles.link}>Quyền riêng tư</a>
          <a href="/terms" style={styles.link}>Điều khoản</a>
          <a href="/voice-data" style={styles.link}>Dữ liệu giọng nói</a>
        </nav>

        <header>
          <span style={styles.kicker}>LEGAL PLACEHOLDER · 13/08/2026</span>
          <h1 style={styles.title}>Quyền riêng tư</h1>
          <p style={styles.lead}>
            Trang này mô tả cách bản closed-alpha hiện tại xử lý dữ liệu trên
            thiết bị và, khi bạn chủ động đăng nhập, trong kho đồng bộ cloud.
          </p>
        </header>

        <p role="note" style={styles.notice}>
          Đây là bản công bố tạm thời phục vụ prototype, chưa phải chính sách
          đã được tư vấn hoặc phê duyệt pháp lý. Nội dung phải được rà soát và
          bổ sung chủ thể vận hành cùng kênh liên hệ trước public beta.
        </p>

        <section style={styles.section}>
          <h2 style={styles.heading}>Dữ liệu trên thiết bị và tài khoản tùy chọn</h2>
          <p style={styles.copy}>
            Tên hiển thị, mục tiêu học, cấu hình, tiến độ bài học, lỗi sai, XP,
            lịch ôn FSRS, từ đã lưu và learning evidence được ghi vào localStorage;
            checkpoint, outbox và bản ghi lỗi đồng bộ được giữ trong IndexedDB
            theo từng chủ dữ liệu. Evidence phát âm có thể chứa transcript,
            confidence và điểm khớp văn bản do trình duyệt trả về.
          </p>
          <p style={styles.copy}>
            Nếu đăng nhập bằng ChatGPT, HANZI.OS nhận email và tên hiển thị do
            hạ tầng đăng nhập chuyển tiếp, tạo mã tài khoản nội bộ và đồng bộ bản
            chiếu tiến độ vào cơ sở dữ liệu D1. Hàng đợi ngoại tuyến được tách theo
            tài khoản và chống gửi chéo khi đổi người dùng. Transcript giọng nói
            là dữ liệu local-only: protocol chủ động loại toàn bộ evidence loại
            speech-transcript trước khi tạo gói cloud.
          </p>
          <p style={styles.copy}>
            Closed alpha hiện chỉ nhận email đã xác thực, chưa nhận một provider
            subject bất biến. Nếu email tài khoản ChatGPT thay đổi, dữ liệu cloud
            cũ có thể chưa tự liên kết với identity mới; đây là giới hạn khôi phục
            tài khoản phải được giải quyết trước public beta.
          </p>
          <p style={styles.copy}>
            Mỗi tài khoản có vai trò ứng dụng Người học hoặc Quản trị. Quản trị
            viên được xem mã tài khoản, email, trạng thái và vai trò để cấp/thu
            quyền; Cổng Quản Trị không hiển thị tiến độ, câu trả lời hay lịch ôn
            của người học khác. Thay đổi quyền được kiểm tra lại phía máy chủ và
            được lưu trong D1.
          </p>
          <p style={styles.copy}>
            Trong luồng học có đăng nhập, máy chủ lưu phiên bài học, câu đọc hiểu
            và khảo sát; phiên bản nội dung/schema; form đã cấp; lựa chọn hoặc câu
            trả lời của người học; thời điểm nhận; khóa idempotency và metadata
            thiết bị cần cho chống gửi trùng. Máy chủ tự đối chiếu đáp án để tạo
            outcome/evidence. Projection gửi về trình duyệt không chứa answer key;
            kết quả khảo sát hiện chỉ là thống kê tổng hợp chưa hiệu chỉnh, không
            phải mastery, HSK, định tuyến hay quyền mở khóa.
          </p>
          <p style={styles.copy}>
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

        <section style={styles.section}>
          <h2 style={styles.heading}>Lưu trữ kỹ thuật và kết nối mạng</h2>
          <ul style={styles.list}>
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

        <section style={styles.section}>
          <h2 style={styles.heading}>Microphone và nhận dạng giọng nói</h2>
          <p style={styles.copy}>
            Vạn Âm Điện có hai chế độ tùy chọn với hai xác nhận riêng. Nhận dạng
            chữ dùng Web Speech API: trình duyệt hoặc nhà cung cấp của trình duyệt
            có thể xử lý âm thanh ngoài thiết bị, còn frontend HANZI.OS chỉ nhận
            transcript và độ tin cậy. Luồng này không tải tệp WAV lên máy chủ
            HANZI.OS.
          </p>
          <p style={styles.copy}>
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
          <p style={styles.copy}>
            Azure <code>zh-CN</code> không cung cấp điểm thanh điệu từ vựng riêng;
            vì vậy điểm 0–100 của nhà cung cấp không được trình bày như “% đúng
            thanh điệu” hoặc chứng nhận chuẩn bản ngữ.
          </p>
          <p style={styles.copy}>
            Xem công bố riêng tại <a href="/voice-data" style={styles.link}>Dữ liệu giọng nói</a>
            {" "}trước khi sử dụng microphone.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Lưu giữ, chia sẻ và xóa</h2>
          <p style={styles.copy}>
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

        <section style={styles.section}>
          <h2 style={styles.heading}>Người học nhỏ tuổi và liên hệ</h2>
          <p style={styles.copy}>
            Prototype chưa được thiết kế hoặc đánh giá như một dịch vụ dành riêng
            cho trẻ em. Người học nhỏ tuổi nên sử dụng dưới sự hướng dẫn của phụ
            huynh hoặc người giám hộ và không nhập thông tin nhận dạng không cần thiết.
          </p>
          <p style={styles.copy}>
            Kênh liên hệ về quyền riêng tư chưa được cấu hình trong prototype.
            Chủ sản phẩm phải thay thế placeholder này bằng thông tin liên hệ có
            người chịu trách nhiệm trước khi mời người dùng bên ngoài.
          </p>
        </section>

        <footer style={styles.footer}>
          Cập nhật lần cuối: 13/08/2026 · Phạm vi: closed alpha local-first với đồng bộ tài khoản tùy chọn.
        </footer>
      </article>
    </main>
  );
}
