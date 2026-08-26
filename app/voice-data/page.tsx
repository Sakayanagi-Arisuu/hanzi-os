import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Dữ liệu giọng nói | HANZI.OS",
  description:
    "Công bố về hai chế độ nhận dạng chữ và phản hồi âm học trong HANZI.OS.",
  alternates: { canonical: "/voice-data" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/voice-data",
    title: "Dữ liệu giọng nói | HANZI.OS",
    description:
      "Công bố về hai chế độ nhận dạng chữ và phản hồi âm học trong HANZI.OS.",
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
          <span style={styles.kicker}>VOICE DATA NOTICE · 13/08/2026</span>
          <h1 style={styles.title}>Dữ liệu giọng nói</h1>
          <p style={styles.lead}>
            Vạn Âm Điện có hai chế độ tùy chọn và độc lập: nhận dạng chữ bằng
            dịch vụ của trình duyệt, và phản hồi âm học beta bằng Azure Speech.
            Bạn có thể luyện nghe, nhại và tự xác nhận mà không bật chế độ nào.
          </p>
        </header>

        <p role="note" style={styles.notice}>
          Hai chế độ có hai xác nhận riêng trong localStorage. Đồng ý nhận dạng
          chữ không cho phép gửi WAV tới Azure; phản hồi âm học chỉ mở sau khi
          bạn xác nhận riêng cho người học hiện tại. Xác nhận Azure hết hạn sau
          30 ngày và cả hai đều có thể rút ngay trên trang luyện đọc. Lựa chọn
          chưa được đồng bộ giữa các thiết bị.
        </p>

        <section style={styles.section}>
          <h2 style={styles.heading}>1. Nhận dạng chữ của trình duyệt</h2>
          <ol style={styles.list}>
            <li>Bạn chủ động bật nhận dạng chữ và bắt đầu đọc.</li>
            <li>Trình duyệt yêu cầu quyền sử dụng microphone nếu cần.</li>
            <li>
              Web Speech API của trình duyệt thu và xử lý giọng nói; tùy trình
              duyệt, âm thanh có thể được gửi tới dịch vụ nhận dạng bên ngoài thiết bị.
            </li>
            <li>
              Frontend HANZI.OS nhận transcript và độ tin cậy do trình duyệt trả
              về để kiểm tra máy có nghe đủ nội dung câu mẫu hay không.
            </li>
          </ol>
          <p style={styles.copy}>
            Luồng này không gửi tệp âm thanh thô tới máy chủ HANZI.OS. Bản ghi chữ
            và mức khớp chữ có thể được lưu thành bằng chứng cục bộ, nhưng luôn
            mang nhãn <strong>chưa xác minh</strong>, không có điểm phát âm và
            không tăng mức làm chủ kỹ năng.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>2. Phản hồi âm học beta bằng Azure</h2>
          <p style={styles.copy}>
            Chỉ sau xác nhận riêng, trình duyệt mới tạo một đoạn WAV PCM 16 kHz
            mono, tối đa 15 giây. WAV được gửi tới điểm nhận cùng trang của HANZI.OS;
            máy chủ đối chiếu mã hoạt động với câu đã phát hành rồi chuyển tạm
            đoạn ghi, câu mẫu và thông tin kỹ thuật cần thiết tới Microsoft Azure
            Speech Pronunciation Assessment. Khóa Azure chỉ tồn tại phía máy chủ.
          </p>
          <p style={styles.copy}>
            HANZI.OS xử lý WAV trong bộ nhớ để hoàn tất một yêu cầu, không ghi
            tệp âm thanh vào localStorage, IndexedDB, Cache API, hàng đợi đồng bộ hay D1.
            Kết quả Azure hiện chỉ hiển thị trong phiên và không được ghi vào
            tiến độ, XP, Thất Trụ hoặc hồ sơ làm chủ kỹ năng.
          </p>
          <p style={styles.copy}>
            Theo tài liệu Microsoft hiện hành, dữ liệu khách hàng gửi cho
            real-time speech-to-text và pronunciation assessment không được
            Microsoft lưu giữ. Dữ liệu vẫn được Azure xử lý để trả kết quả tại
            vùng của tài nguyên đã cấu hình; điều khoản và chính sách của
            Microsoft áp dụng cho lần xử lý đó. Xem nguồn chính thức về
            {" "}<a
              href="https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security?view=foundry-classic"
              rel="noreferrer"
              style={styles.link}
              target="_blank"
            >dữ liệu Speech-to-Text</a>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Hiểu đúng kết quả beta</h2>
          <p style={styles.copy}>
            Azure trả điểm 0–100 cho độ chính xác âm học, độ trôi chảy, độ đầy đủ
            và điểm phát âm tổng hợp, cùng gợi ý theo từ/âm vị khi có. Đây là phản
            hồi từ mô hình, chưa được HANZI.OS nghiệm chuẩn với người Việt mới học,
            nên không phải chứng nhận “chuẩn bản ngữ” và không được dùng làm bằng
            chứng làm chủ kỹ năng, phần thưởng hay điều kiện mở khóa.
          </p>
          <p style={styles.copy}>
            Với <code>zh-CN</code>, Azure không trả một điểm thanh điệu từ vựng
            riêng; đánh giá prosody cũng chỉ được Microsoft hỗ trợ cho
            <code> en-US</code>. Vì vậy HANZI.OS không diễn giải điểm Azure thành
            “% đúng thanh điệu”. Phản hồi đường cao độ chạy trên thiết bị là một
            tín hiệu luyện tập riêng, không thay thế phép chấm đã nghiệm chuẩn.
            Xem giới hạn theo locale trong
            {" "}<a
              href="https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment"
              rel="noreferrer"
              style={styles.link}
              target="_blank"
            >tài liệu Pronunciation Assessment</a>.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Bạn kiểm soát điều gì?</h2>
          <ul style={styles.list}>
            <li>Bạn vẫn có thể nghe mẫu và tự xác nhận mà không dùng microphone.</li>
            <li>
              Bạn có thể rút riêng quyền nhận dạng chữ hoặc phản hồi âm học, rồi
              thu hồi quyền microphone trong cài đặt site của trình duyệt.
            </li>
            <li>
              Rút quyền ngăn các lượt mới; nó không thể thu hồi một yêu cầu đã
              xử lý xong. HANZI.OS không có bản WAV lưu tại chỗ để xóa sau đó.
            </li>
            <li>
              Rút nhận dạng chữ không tự xóa transcript evidence cũ. Bạn có thể
              xuất hoặc xóa toàn bộ dữ liệu cục bộ trong trang Hồ sơ.
            </li>
            <li>Nếu Azure lỗi, hết quota hoặc quá thời gian, bạn có thể thử lại hoặc dùng cách tự xác nhận; lượt lỗi không tạo bằng chứng học tập.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Giới hạn của bản local/private beta</h2>
          <p style={styles.copy}>
            Điểm nhận phản hồi âm học chỉ được bật trên localhost ở máy phát triển
            và dùng hạn mức Azure Speech F0 của chủ dự án. Chưa có sổ xác nhận
            phía máy chủ, chưa có nghiên cứu nghiệm chuẩn và chưa được
            phép mở công khai. Trước public beta cần rà pháp lý, bảo mật, quota,
            giám sát lỗi, quyền chủ thể dữ liệu và nghiệm chuẩn điểm số.
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
          Cập nhật lần cuối: 13/08/2026 · Phạm vi: Web Speech API và Azure Speech local/private beta.
        </footer>
      </article>
    </main>
  );
}
