import type { Metadata } from "next";
import { PublicFooter } from "../../src/components/PublicFooter";
import "../../src/components/PolicyPages.css";

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

export default function TermsPage() {
  return (
    <main className="policy-main" id="top">
      <div className="policy-layout"><aside className="policy-toc"><p>TRONG TRANG NÀY</p><nav aria-label="Mục lục"><a href="#section-1"><span>01</span>Phạm vi prototype</a><a href="#section-2"><span>02</span>Mục đích học tập và giới hạn tuyên bố</a><a href="#section-3"><span>03</span>Dữ liệu và khả năng khôi phục</a><a href="#section-4"><span>04</span>Sử dụng chấp nhận được</a><a href="#section-5"><span>05</span>Nội dung và phần mềm bên thứ ba</a><a href="#section-6"><span>06</span>Thay đổi, gián đoạn và liên hệ</a></nav></aside><article className="policy-article">
        <nav aria-label="Điều hướng pháp lý" className="policy-nav">
          <a href="/welcome" className="policy-link">HANZI.OS</a>
          <a href="/privacy" className="policy-link">Quyền riêng tư</a>
          <a href="/terms" aria-current="page" className="policy-link">Điều khoản</a>
          <a href="/voice-data" className="policy-link">Dữ liệu giọng nói</a>
        </nav>

        <header>
          <span className="policy-kicker">THÔNG TIN SỬ DỤNG · 20/07/2026</span>
          <h1 className="policy-title">Điều khoản sử dụng</h1>
          <p className="policy-lead">
            Các điều khoản dưới đây chỉ mô tả phạm vi sử dụng hợp lý của bản
            prototype HANZI.OS hiện tại.
          </p>
        </header>

        <p role="note" className="policy-notice">
          Đây là placeholder vận hành, chưa phải điều khoản thương mại đã được
          phê duyệt pháp lý. Chủ thể cung cấp dịch vụ, luật áp dụng, cơ chế giải
          quyết tranh chấp và kênh liên hệ phải được bổ sung trước public beta.
        </p>

        <section className="policy-section" id="section-1">
          <h2 className="policy-heading">Phạm vi prototype</h2>
          <p className="policy-copy">
            HANZI.OS hiện là phần mềm thử nghiệm chạy chủ yếu trong trình duyệt,
            có đăng nhập ChatGPT và đồng bộ cloud tùy chọn cho closed alpha,
            nhưng chưa có thanh toán, gói thuê bao hay cam kết mức dịch vụ.
            Chức năng và dữ liệu mẫu có thể thay đổi hoặc được rút lại trong quá
            trình phát triển.
          </p>
        </section>

        <section className="policy-section" id="section-2">
          <h2 className="policy-heading">Mục đích học tập và giới hạn tuyên bố</h2>
          <ul className="policy-list">
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

        <section className="policy-section" id="section-3">
          <h2 className="policy-heading">Dữ liệu và khả năng khôi phục</h2>
          <p className="policy-copy">
            Tiến độ được ghi cục bộ trước. Người dùng ẩn danh có thể mất dữ liệu
            khi xóa bộ nhớ trình duyệt; người đã đăng nhập chỉ khôi phục được phần
            đã được máy chủ xác nhận. Hàng đợi chưa gửi không thể sống sót nếu bạn
            xóa thủ công toàn bộ dữ liệu trình duyệt. Người dùng nên đồng bộ và
            xuất bản phục hồi thiết bị trước thao tác đó. Bản xuất cloud không có
            speech transcript local-only hoặc thay đổi còn nằm trong outbox.
            Cách xử lý dữ liệu được mô tả tại
            {" "}<a href="/privacy" className="policy-link">Quyền riêng tư</a>.
          </p>
        </section>

        <section className="policy-section" id="section-4">
          <h2 className="policy-heading">Sử dụng chấp nhận được</h2>
          <p className="policy-copy">
            Bạn có thể dùng prototype cho mục đích học và đánh giá nội bộ. Không
            được cố ý phá hoại dịch vụ, vượt qua kiểm soát truy cập, phát tán mã
            độc, giả mạo kết quả hoặc sao chép/phân phối tài sản vượt quá quyền
            được cấp bởi giấy phép tương ứng.
          </p>
        </section>

        <section className="policy-section" id="section-5">
          <h2 className="policy-heading">Nội dung và phần mềm bên thứ ba</h2>
          <p className="policy-copy">
            Prototype dùng thư viện và dữ liệu có giấy phép riêng, bao gồm công
            cụ luyện nét Hán tự và các dependency mã nguồn mở. Quyền đối với từng
            tài sản vẫn thuộc chủ sở hữu hoặc bên cấp phép tương ứng. Không có nội
            dung nào nên được xem là đã qua rà soát ngôn ngữ hoặc pháp lý nếu
            trạng thái phát hành không nói rõ điều đó. Dữ liệu nét chữ được
            self-host từ Make Me a Hanzi/hanzi-writer-data theo Arphic Public
            License; xem <a href="/hanzi-data/NOTICE.txt" className="policy-link">thông báo nguồn</a>
            {" "}và <a href="/hanzi-data/ARPHICPL.TXT" className="policy-link">toàn văn giấy phép</a>.
          </p>
        </section>

        <section className="policy-section" id="section-6">
          <h2 className="policy-heading">Thay đổi, gián đoạn và liên hệ</h2>
          <p className="policy-copy">
            Bản prototype được cung cấp để thử nghiệm và có thể gặp lỗi, gián đoạn
            hoặc mất khả năng tương thích. Kênh hỗ trợ và chủ thể chịu trách nhiệm
            chưa được cấu hình; placeholder này phải được thay bằng thông tin thật
            trước khi cung cấp dịch vụ cho người dùng bên ngoài.
          </p>
        </section>

        <footer className="policy-footer">
          Cập nhật lần cuối: 20/07/2026 · Không phải điều khoản thanh toán hoặc cam kết thương mại.
        </footer>
      </article></div><PublicFooter />
    </main>
  );
}
