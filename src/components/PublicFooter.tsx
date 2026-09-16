import Link from "next/link";
import "./PublicFooter.css";
import "./GuildTypography.css";

export function PublicFooter() {
  return <footer className="public-footer">
    <div className="public-footer-main">
      <div className="public-footer-brand"><Link href="/welcome"><span lang="zh-Hans">汉</span> HANZI.OS</Link><p>Học sâu hơn. Hiểu xa hơn.<br />Một hành trình Hán ngữ theo nhịp của bạn.</p><small>Giản thể · Pinyin · Tiếng Việt</small></div>
      <nav aria-label="Khám phá HANZI.OS"><h2>Hành trình</h2><Link href="/welcome#hanh-trinh">Cách bắt đầu</Link><Link href="/welcome#he-thong">Các không gian học</Link><Link href="/welcome#cach-hoc">Một buổi học</Link><Link href="/welcome#du-lieu">Câu hỏi thường gặp</Link></nav>
      <nav aria-label="Chính sách HANZI.OS"><h2>Minh bạch & quyền riêng tư</h2><Link href="/terms">Điều khoản sử dụng</Link><Link href="/privacy">Quyền riêng tư</Link><Link href="/voice-data">Dữ liệu giọng nói</Link><Link href="/signin">Tài khoản của bạn</Link></nav>
      <div className="public-footer-note"><span>HÀNH TRÌNH THUỘC VỀ BẠN</span><p>Bắt đầu không cần tài khoản. Chủ động với dữ liệu, nhịp học và cách luyện tập.</p><Link href="/privacy">Tìm hiểu cách dữ liệu được lưu →</Link></div>
    </div>
    <div className="public-footer-bottom"><span>HANZI.OS · Hệ thống thức tỉnh Hán ngữ</span><span>Học mỗi ngày, mở thêm một chân trời.</span><a href="#top">Về đầu trang ↑</a></div>
  </footer>;
}
