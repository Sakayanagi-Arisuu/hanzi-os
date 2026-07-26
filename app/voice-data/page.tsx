import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Dữ liệu giọng nói | HANZI.OS",
  description:
    "Công bố riêng về microphone và Web Speech API trong bản prototype HANZI.OS.",
  alternates: { canonical: "/voice-data" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/voice-data",
    title: "Dữ liệu giọng nói | HANZI.OS",
    description:
      "Công bố riêng về microphone và Web Speech API trong bản prototype HANZI.OS.",
  },
};

const styles = {
  main: {
    minHeight: "100vh",
    padding: "clamp(20px, 5vw, 64px)",
    color: "#e8f2ef",
    background: "#030708",
  },
  article: { width: "min(100%, 860px)", margin: "0 auto" },
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
  section: { padding: "28px 0", borderTop: "1px solid #1d3933" },
  heading: { margin: "0 0 12px", fontSize: "22px" },
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

export default function VoiceDataPage() {
  return (
    <main style={styles.main}>
      <article style={styles.article}>
        <nav aria-label="Điều hướng pháp lý" style={styles.nav}>
          <a href="/" style={styles.link}>HANZI.OS</a>
          <a href="/privacy" style={styles.link}>Quyền riêng tư</a>
          <a href="/terms" style={styles.link}>Điều khoản</a>
          <a href="/voice-data" aria-current="page" style={styles.link}>Dữ liệu giọng nói</a>
        </nav>

        <header>
          <span style={styles.kicker}>VOICE DATA NOTICE · 22/07/2026</span>
          <h1 style={styles.title}>Dữ liệu giọng nói</h1>
          <p style={styles.lead}>
            Đây là công bố riêng cho chức năng microphone và nhận dạng giọng nói
            trong bản prototype hiện tại.
          </p>
        </header>

        <p role="note" style={styles.notice}>
          Prototype lưu receipt đồng ý gồm phiên bản chính sách, mục đích, chế độ
          xử lý và thời điểm đồng ý trong localStorage của trình duyệt này, đồng
          thời có nút rút đồng ý. Receipt sai cấu trúc hoặc thuộc chính sách cũ
          không mở microphone. Chưa có consent ledger
          phía máy chủ hoặc đồng bộ lựa chọn giữa các thiết bị. Nếu bạn không muốn
          nhà cung cấp nhận dạng xử lý giọng nói, đừng đồng ý và hãy từ chối quyền
          microphone.
        </p>

        <section style={styles.section}>
          <h2 style={styles.heading}>Điều gì xảy ra khi bạn ghi âm?</h2>
          <ol style={styles.list}>
            <li>Bạn chủ động bấm nút ghi âm trong trang luyện phát âm.</li>
            <li>Trình duyệt có thể yêu cầu quyền sử dụng microphone.</li>
            <li>
              Web Speech API của trình duyệt thu và xử lý giọng nói; tùy trình
              duyệt, âm thanh có thể được gửi tới dịch vụ nhận dạng bên ngoài thiết bị.
            </li>
            <li>
              Frontend HANZI.OS nhận transcript và độ tin cậy do trình duyệt trả
              về để tính mức khớp văn bản với câu mẫu.
            </li>
          </ol>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Prototype hiện lưu gì?</h2>
          <p style={styles.copy}>
            Mã ứng dụng hiện không truy cập tệp âm thanh thô và không tải âm thanh
            lên backend HANZI.OS. Ứng dụng có lưu transcript, confidence, điểm khớp
            văn bản và phương pháp chấm dưới dạng learning evidence cục bộ trong
            localStorage. Bản ghi này được đánh dấu là unverified, không phải bằng
            chứng mastery phát âm đã xác minh. Kể cả khi bạn đăng nhập, lớp tạo
            gói đồng bộ loại evidence speech-transcript trước khi ghi outbox và
            backend cũng từ chối payload chứa loại evidence này.
          </p>
          <p style={styles.copy}>
            Nhà cung cấp trình duyệt có thể có cách truyền, lưu giữ hoặc dùng dữ
            liệu khác. HANZI.OS prototype không kiểm soát được chính sách đó; hãy
            kiểm tra cài đặt và chính sách của trình duyệt bạn dùng.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Điểm số không phải chấm phát âm</h2>
          <p style={styles.copy}>
            Điểm hiện tại kết hợp độ giống transcript và confidence do trình
            duyệt cung cấp. Nó không phân tích tín hiệu âm thanh, cao độ, thanh
            điệu, âm đầu hay âm cuối và không được dùng làm bằng chứng mastery
            phát âm đã được xác minh.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Lựa chọn và rút quyền</h2>
          <ul style={styles.list}>
            <li>Bạn vẫn có thể nghe mẫu và luyện nhại mà không dùng ghi âm.</li>
            <li>
              Bạn có thể dùng nút rút đồng ý trong trang phát âm và thu hồi quyền
              microphone trong cài đặt site của trình duyệt bất kỳ lúc nào.
            </li>
            <li>
              Vì HANZI.OS không giữ bản âm thanh phía máy chủ trong prototype,
              hiện không có bản âm thanh trên backend HANZI.OS để yêu cầu xóa.
            </li>
            <li>
              Rút đồng ý ngăn lần ghi mới nhưng không tự xóa evidence transcript
              đã lưu. Bạn có thể xuất hoặc xóa toàn bộ dữ liệu cục bộ trong trang
              Hồ sơ.
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Điều kiện trước khi lên production</h2>
          <p style={styles.copy}>
            Nếu bổ sung pipeline speech phía máy chủ, HANZI.OS phải triển khai
            consent riêng có phiên bản, mô tả nhà xử lý, mục đích, thời hạn lưu,
            lựa chọn opt-in, cơ chế rút consent và xóa dữ liệu end-to-end trước
            khi nhận audio. Các khả năng đó chưa được triển khai trong prototype.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Liên hệ</h2>
          <p style={styles.copy}>
            Kênh liên hệ cho dữ liệu giọng nói chưa được cấu hình. Chủ sản phẩm
            phải thay placeholder này bằng thông tin liên hệ có người chịu trách
            nhiệm trước public beta. Xem thêm <a href="/privacy" style={styles.link}>Quyền riêng tư</a>.
          </p>
        </section>

        <footer style={styles.footer}>
          Cập nhật lần cuối: 22/07/2026 · Phạm vi: Web Speech API trong prototype.
        </footer>
      </article>
    </main>
  );
}
