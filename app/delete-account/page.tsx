import type { Metadata } from 'next';
import { PublicFooter } from '../../src/components/PublicFooter';
import { publicOperator } from '../../src/server/publicOperator';
import '../../src/components/PolicyPages.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Xóa tài khoản và dữ liệu | HANZI.OS',
  description: 'Cách yêu cầu xóa tài khoản HANZI.OS ngay trên trình duyệt, kể cả khi đã gỡ ứng dụng.',
  alternates: { canonical: '/delete-account' } };

export default async function DeleteAccountPage() {
  const operator = await publicOperator();
  return <main className="policy-main"><div className="policy-layout">
    <aside className="policy-toc"><p>HANZI.OS</p><nav aria-label="Quyền dữ liệu">
      <a href="/privacy">Quyền riêng tư</a><a href="/voice-data">Dữ liệu giọng nói</a><a href="/profile">Hồ sơ trên web</a>
    </nav></aside>
    <article className="policy-article"><header><span className="policy-kicker">QUYỀN KIỂM SOÁT DỮ LIỆU</span>
      <h1 className="policy-title">Xóa tài khoản HANZI.OS</h1>
      <p className="policy-lead">Bạn có thể thực hiện trên trình duyệt này, kể cả khi đã gỡ ứng dụng Android.</p>
    </header>
    <section className="policy-section"><h2 className="policy-heading">Thực hiện trên web</h2>
      <ol className="policy-list"><li><a className="policy-link" href="/signin?returnTo=%2Fprofile">Đăng nhập tài khoản cần xóa</a>.</li>
        <li>Mở <a className="policy-link" href="/profile">Hồ sơ</a>, tìm <strong>Đặt lại hoặc xóa dữ liệu</strong>.</li>
        <li>Hoàn tất đồng bộ hoặc xuất bản phục hồi theo hướng dẫn để giữ các phần chưa gửi.</li>
        <li>Chọn <strong>Xóa tài khoản và dữ liệu máy chủ</strong>, đọc thông tin và xác nhận.</li></ol>
      <p className="policy-copy">Thao tác cần kết nối máy chủ. Đặt lại tiến độ và đăng xuất là các thao tác riêng, không xóa tài khoản.</p>
      <p className="policy-copy">Bạn có thể được yêu cầu đăng nhập lại để xác nhận. Nếu dịch vụ chưa sẵn sàng hoặc kết nối bị ngắt, mở lại Hồ sơ trên cùng thiết bị để kiểm tra kết quả. Dữ liệu trên thiết bị được giữ đến khi máy chủ xác nhận đã xóa.</p>
    </section>
    <section className="policy-section"><h2 className="policy-heading">Dữ liệu nào bị xóa?</h2>
      <p className="policy-copy">Tài khoản, phiên đăng nhập và dữ liệu học gắn tài khoản trên máy chủ được xóa theo quan hệ dữ liệu của tài khoản. Các tệp phục hồi bạn đã tải xuống và dữ liệu còn ở thiết bị khác cần được bạn quản lý riêng.</p>
      <p className="policy-copy">Với tài khoản HANZI.OS dùng email và mật khẩu, thông tin đăng nhập tại dịch vụ xác thực cũng được xóa. Nếu tài khoản còn gắn hồ sơ quản trị, biên tập hoặc thanh toán, hãy liên hệ hỗ trợ để xử lý; quy trình tự xóa sẽ giữ các hồ sơ đó.</p>
      <p className="policy-copy">Hệ thống giữ trạng thái yêu cầu trong khi xử lý và giữ xác nhận xóa trong 31 ngày sau khi hoàn tất để thiết bị nhận kết quả. Trạng thái này không chứa mật khẩu hoặc tiến độ học.</p>
      <p className="policy-copy">Xem <a className="policy-link" href="/privacy#section-4">chính sách lưu giữ và xóa dữ liệu</a> trước khi xác nhận. Thao tác xóa không thể hoàn tác từ giao diện.</p>
    </section>
    <section className="policy-section"><h2 className="policy-heading">Không đăng nhập được?</h2>
      {operator ? <p className="policy-copy">Liên hệ {operator.name} qua <a className="policy-link" href={`mailto:${operator.email}?subject=Yeu%20cau%20xoa%20tai%20khoan%20HANZI.OS`}>{operator.email}</a> để yêu cầu hỗ trợ xóa tài khoản. Cung cấp tên đăng nhập hoặc email tài khoản; không gửi mật khẩu hay mã xác thực. Chủ dịch vụ cần xác minh quyền sở hữu trước khi xử lý.</p>
        : <p className="policy-copy">Kênh hỗ trợ công khai chưa được cấu hình trong bản thử nghiệm này. Bạn vẫn có thể dùng quy trình tự xóa trên web khi đăng nhập được.</p>}
    </section></article></div><PublicFooter /></main>;
}
