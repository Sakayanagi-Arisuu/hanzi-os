import type { Metadata } from "next";
import { PublicFooter } from "../../src/components/PublicFooter";
import "../../src/components/PolicyPages.css";

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

export default function VoiceDataPage() {
  return (
    <main className="policy-main" id="top">
      <div className="policy-layout"><aside className="policy-toc"><p>TRONG TRANG NÀY</p><nav aria-label="Mục lục"><a href="#section-1"><span>01</span>Nhận dạng chữ của trình duyệt</a><a href="#section-2"><span>02</span>Phản hồi âm học beta bằng Azure</a><a href="#section-3"><span>03</span>Hiểu đúng kết quả beta</a><a href="#section-4"><span>04</span>Bạn kiểm soát điều gì?</a><a href="#section-5"><span>05</span>Giới hạn của bản local/private beta</a><a href="#section-6"><span>06</span>Liên hệ</a></nav></aside><article className="policy-article">
        <nav aria-label="Điều hướng pháp lý" className="policy-nav">
          <a href="/welcome" className="policy-link">HANZI.OS</a>
          <a href="/privacy" className="policy-link">Quyền riêng tư</a>
          <a href="/terms" className="policy-link">Điều khoản</a>
          <a href="/voice-data" aria-current="page" className="policy-link">Dữ liệu giọng nói</a>
        </nav>

        <header>
          <span className="policy-kicker">MINH BẠCH DỮ LIỆU · 13/08/2026</span>
          <h1 className="policy-title">Dữ liệu giọng nói</h1>
          <p className="policy-lead">
            Vạn Âm Điện có hai chế độ tùy chọn và độc lập: nhận dạng chữ bằng
            dịch vụ của trình duyệt, và phản hồi âm học beta bằng Azure Speech.
            Bạn có thể luyện nghe, nhại và tự xác nhận mà không bật chế độ nào.
          </p>
        </header>

        <p role="note" className="policy-notice">
          Hai chế độ có hai xác nhận riêng trong localStorage. Đồng ý nhận dạng
          chữ không cho phép gửi WAV tới Azure; phản hồi âm học chỉ mở sau khi
          bạn xác nhận riêng cho người học hiện tại. Xác nhận Azure hết hạn sau
          30 ngày và cả hai đều có thể rút ngay trên trang luyện đọc. Lựa chọn
          chưa được đồng bộ giữa các thiết bị.
        </p>

        <section className="policy-section" id="section-1">
          <h2 className="policy-heading">1. Nhận dạng chữ của trình duyệt</h2>
          <ol className="policy-list">
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
          <p className="policy-copy">
            Luồng này không gửi tệp âm thanh thô tới máy chủ HANZI.OS. Bản ghi chữ
            và mức khớp chữ có thể được lưu thành bằng chứng cục bộ, nhưng luôn
            mang nhãn <strong>chưa xác minh</strong>, không có điểm phát âm và
            không tăng mức làm chủ kỹ năng.
          </p>
        </section>

        <section className="policy-section" id="section-2">
          <h2 className="policy-heading">2. Phản hồi âm học beta bằng Azure</h2>
          <p className="policy-copy">
            Chỉ sau xác nhận riêng, trình duyệt mới tạo một đoạn WAV PCM 16 kHz
            mono, tối đa 15 giây. WAV được gửi tới điểm nhận cùng trang của HANZI.OS;
            máy chủ đối chiếu mã hoạt động với câu đã phát hành rồi chuyển tạm
            đoạn ghi, câu mẫu và thông tin kỹ thuật cần thiết tới Microsoft Azure
            Speech Pronunciation Assessment. Khóa Azure chỉ tồn tại phía máy chủ.
          </p>
          <p className="policy-copy">
            HANZI.OS xử lý WAV trong bộ nhớ để hoàn tất một yêu cầu, không ghi
            tệp âm thanh vào localStorage, IndexedDB, Cache API, hàng đợi đồng bộ hay D1.
            Kết quả Azure hiện chỉ hiển thị trong phiên và không được ghi vào
            tiến độ, XP, Thất Trụ hoặc hồ sơ làm chủ kỹ năng.
          </p>
          <p className="policy-copy">
            Theo tài liệu Microsoft hiện hành, dữ liệu khách hàng gửi cho
            real-time speech-to-text và pronunciation assessment không được
            Microsoft lưu giữ. Dữ liệu vẫn được Azure xử lý để trả kết quả tại
            vùng của tài nguyên đã cấu hình; điều khoản và chính sách của
            Microsoft áp dụng cho lần xử lý đó. Xem nguồn chính thức về
            {" "}<a
              href="https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security?view=foundry-classic"
              rel="noreferrer"
              className="policy-link"
              target="_blank"
            >dữ liệu Speech-to-Text</a>.
          </p>
        </section>

        <section className="policy-section" id="section-3">
          <h2 className="policy-heading">Hiểu đúng kết quả beta</h2>
          <p className="policy-copy">
            Azure trả điểm 0–100 cho độ chính xác âm học, độ trôi chảy, độ đầy đủ
            và điểm phát âm tổng hợp, cùng gợi ý theo từ/âm vị khi có. Đây là phản
            hồi từ mô hình, chưa được HANZI.OS nghiệm chuẩn với người Việt mới học,
            nên không phải chứng nhận “chuẩn bản ngữ” và không được dùng làm bằng
            chứng làm chủ kỹ năng, phần thưởng hay điều kiện mở khóa.
          </p>
          <p className="policy-copy">
            Với <code>zh-CN</code>, Azure không trả một điểm thanh điệu từ vựng
            riêng; đánh giá prosody cũng chỉ được Microsoft hỗ trợ cho
            <code> en-US</code>. Vì vậy HANZI.OS không diễn giải điểm Azure thành
            “% đúng thanh điệu”. Phản hồi đường cao độ chạy trên thiết bị là một
            tín hiệu luyện tập riêng, không thay thế phép chấm đã nghiệm chuẩn.
            Xem giới hạn theo locale trong
            {" "}<a
              href="https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment"
              rel="noreferrer"
              className="policy-link"
              target="_blank"
            >tài liệu Pronunciation Assessment</a>.
          </p>
        </section>

        <section className="policy-section" id="section-4">
          <h2 className="policy-heading">Bạn kiểm soát điều gì?</h2>
          <ul className="policy-list">
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

        <section className="policy-section" id="section-5">
          <h2 className="policy-heading">Giới hạn của bản local/private beta</h2>
          <p className="policy-copy">
            Điểm nhận phản hồi âm học chỉ được bật trên localhost ở máy phát triển
            và dùng hạn mức Azure Speech F0 của chủ dự án. Chưa có sổ xác nhận
            phía máy chủ, chưa có nghiên cứu nghiệm chuẩn và chưa được
            phép mở công khai. Trước public beta cần rà pháp lý, bảo mật, quota,
            giám sát lỗi, quyền chủ thể dữ liệu và nghiệm chuẩn điểm số.
          </p>
        </section>

        <section className="policy-section" id="section-6">
          <h2 className="policy-heading">Liên hệ</h2>
          <p className="policy-copy">
            Kênh liên hệ cho dữ liệu giọng nói chưa được cấu hình. Chủ sản phẩm
            phải thay placeholder này bằng thông tin liên hệ có người chịu trách
            nhiệm trước public beta. Xem thêm <a href="/privacy" className="policy-link">Quyền riêng tư</a>.
          </p>
        </section>

        <footer className="policy-footer">
          Cập nhật lần cuối: 13/08/2026 · Phạm vi: Web Speech API và Azure Speech local/private beta.
        </footer>
      </article></div><PublicFooter />
    </main>
  );
}
