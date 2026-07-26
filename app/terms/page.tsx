import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | HANZI.OS",
  description: "Điều khoản tạm thời cho bản prototype HANZI.OS.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/terms",
    title: "Điều khoản sử dụng | HANZI.OS",
    description: "Điều khoản tạm thời cho bản prototype HANZI.OS.",
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

export default function TermsPage() {
  return (
    <main style={styles.main}>
      <article style={styles.article}>
        <nav aria-label="Điều hướng pháp lý" style={styles.nav}>
          <a href="/" style={styles.link}>HANZI.OS</a>
          <a href="/privacy" style={styles.link}>Quyền riêng tư</a>
          <a href="/terms" aria-current="page" style={styles.link}>Điều khoản</a>
          <a href="/voice-data" style={styles.link}>Dữ liệu giọng nói</a>
        </nav>

        <header>
          <span style={styles.kicker}>LEGAL PLACEHOLDER · 20/07/2026</span>
          <h1 style={styles.title}>Điều khoản sử dụng</h1>
          <p style={styles.lead}>
            Các điều khoản dưới đây chỉ mô tả phạm vi sử dụng hợp lý của bản
            prototype HANZI.OS hiện tại.
          </p>
        </header>

        <p role="note" style={styles.notice}>
          Đây là placeholder vận hành, chưa phải điều khoản thương mại đã được
          phê duyệt pháp lý. Chủ thể cung cấp dịch vụ, luật áp dụng, cơ chế giải
          quyết tranh chấp và kênh liên hệ phải được bổ sung trước public beta.
        </p>

        <section style={styles.section}>
          <h2 style={styles.heading}>Phạm vi prototype</h2>
          <p style={styles.copy}>
            HANZI.OS hiện là phần mềm thử nghiệm chạy chủ yếu trong trình duyệt,
            có đăng nhập ChatGPT và đồng bộ cloud tùy chọn cho closed alpha,
            nhưng chưa có thanh toán, gói thuê bao hay cam kết mức dịch vụ.
            Chức năng và dữ liệu mẫu có thể thay đổi hoặc được rút lại trong quá
            trình phát triển.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Mục đích học tập và giới hạn tuyên bố</h2>
          <ul style={styles.list}>
            <li>
              XP, rank, streak và hiệu ứng chỉ hỗ trợ động lực; chúng không phải
              bằng chứng độc lập về năng lực tiếng Trung.
            </li>
            <li>
              Prototype không phải đơn vị tổ chức thi, cấp chứng chỉ hay đại diện
              chính thức của HSK.
            </li>
            <li>
              Nội dung và phạm vi mục tiêu còn giới hạn; không được hiểu là cam
              kết đạt một trình độ, kết quả thi, việc làm hoặc kết quả thương mại.
            </li>
            <li>
              Điểm nhận dạng giọng nói hiện đo mức khớp transcript, không phải
              đánh giá âm học, thanh điệu hay phát âm chuyên môn.
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Dữ liệu và khả năng khôi phục</h2>
          <p style={styles.copy}>
            Tiến độ được ghi cục bộ trước. Người dùng ẩn danh có thể mất dữ liệu
            khi xóa bộ nhớ trình duyệt; người đã đăng nhập chỉ khôi phục được phần
            đã được máy chủ xác nhận. Hàng đợi chưa gửi không thể sống sót nếu bạn
            xóa thủ công toàn bộ dữ liệu trình duyệt. Người dùng nên đồng bộ và
            xuất bản phục hồi thiết bị trước thao tác đó. Bản xuất cloud không có
            speech transcript local-only hoặc thay đổi còn nằm trong outbox.
            Cách xử lý dữ liệu được mô tả tại
            {" "}<a href="/privacy" style={styles.link}>Quyền riêng tư</a>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Sử dụng chấp nhận được</h2>
          <p style={styles.copy}>
            Bạn có thể dùng prototype cho mục đích học và đánh giá nội bộ. Không
            được cố ý phá hoại dịch vụ, vượt qua kiểm soát truy cập, phát tán mã
            độc, giả mạo kết quả hoặc sao chép/phân phối tài sản vượt quá quyền
            được cấp bởi giấy phép tương ứng.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Nội dung và phần mềm bên thứ ba</h2>
          <p style={styles.copy}>
            Prototype dùng thư viện và dữ liệu có giấy phép riêng, bao gồm công
            cụ luyện nét Hán tự và các dependency mã nguồn mở. Quyền đối với từng
            tài sản vẫn thuộc chủ sở hữu hoặc bên cấp phép tương ứng. Không có nội
            dung nào nên được xem là đã qua rà soát ngôn ngữ hoặc pháp lý nếu
            trạng thái phát hành không nói rõ điều đó. Dữ liệu nét chữ được
            self-host từ Make Me a Hanzi/hanzi-writer-data theo Arphic Public
            License; xem <a href="/hanzi-data/NOTICE.txt" style={styles.link}>thông báo nguồn</a>
            {" "}và <a href="/hanzi-data/ARPHICPL.TXT" style={styles.link}>toàn văn giấy phép</a>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Thay đổi, gián đoạn và liên hệ</h2>
          <p style={styles.copy}>
            Bản prototype được cung cấp để thử nghiệm và có thể gặp lỗi, gián đoạn
            hoặc mất khả năng tương thích. Kênh hỗ trợ và chủ thể chịu trách nhiệm
            chưa được cấu hình; placeholder này phải được thay bằng thông tin thật
            trước khi cung cấp dịch vụ cho người dùng bên ngoài.
          </p>
        </section>

        <footer style={styles.footer}>
          Cập nhật lần cuối: 20/07/2026 · Không phải điều khoản thanh toán hoặc cam kết thương mại.
        </footer>
      </article>
    </main>
  );
}
