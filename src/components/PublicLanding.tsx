import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  BrainCircuit,
  Languages,
  Map,
  Mic2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ResponsiveHeroBackdrop } from "./ResponsiveHeroBackdrop";

const productAreas: ReadonlyArray<{
  code: string;
  area: string;
  systemName: string;
  description: string;
  details: readonly string[];
  icon: LucideIcon;
}> = [
  {
    code: "01",
    area: "Học",
    systemName: "Thiên Lộ",
    description: "Đi từ Pinyin, thanh điệu và câu đầu tiên đến hội thoại, đọc và viết theo lộ trình HSK0–HSK4.",
    details: ["217 bài trong lộ trình hiện tại", "Bài ngắn có giải thích", "Khảo nghiệm để tìm điểm bắt đầu"],
    icon: Map,
  },
  {
    code: "02",
    area: "Ôn",
    systemName: "Ký Ức Trận · Nghịch Cảnh Lục",
    description: "Ôn nội dung đến hạn và luyện lại đúng những lỗi bạn từng gặp, thay vì lặp mọi thứ như nhau.",
    details: ["Lịch ôn theo trí nhớ", "Hàng đợi lỗi riêng", "Không lấy XP làm độ thành thạo"],
    icon: BrainCircuit,
  },
  {
    code: "03",
    area: "Nói",
    systemName: "Vạn Âm Điện",
    description: "Luyện Pinyin, bốn thanh và nghe–đáp; luôn có đường thay thế khi bạn không muốn dùng micro.",
    details: ["Âm và thanh điệu", "Nghe rồi tự đối chiếu", "Giọng máy luôn được ghi rõ"],
    icon: Mic2,
  },
  {
    code: "04",
    area: "Luyện",
    systemName: "Thần Văn Lô · Vạn Quyển Các · Tàng Tự Khố",
    description: "Mở rộng ngoài bài chính bằng chữ Hán trong ngữ cảnh, kho từ, bài đọc và Phòng Luyện Đề.",
    details: ["11.093 mục từ Trung–Việt", "1.096 chữ có luyện thứ tự nét", "Đọc, tra cứu và luyện đề"],
    icon: BookOpenText,
  },
  {
    code: "05",
    area: "Hồ sơ",
    systemName: "Thiên Cơ Kính · Dữ liệu học",
    description: "Xem tiến độ có bằng chứng, đổi mục tiêu và quản lý dữ liệu học trên thiết bị của chính bạn.",
    details: ["Tiến độ theo từng kỹ năng", "Xuất và nhập dữ liệu", "Tài khoản là tùy chọn"],
    icon: BarChart3,
  },
] as const;

type PublicLandingProps = {
  onStart?: () => void;
  startHref?: string;
};

function StartAction({ onStart, startHref, className }: PublicLandingProps & {
  className?: string;
}) {
  const content = (
    <>
      Kích hoạt HANZI.OS
      <ArrowRight aria-hidden="true" size={19} />
    </>
  );

  if (startHref) {
    return <a className={className} href={startHref}>{content}</a>;
  }

  return (
    <button className={className} type="button" onClick={onStart}>
      {content}
    </button>
  );
}

export function PublicLanding({ onStart, startHref }: PublicLandingProps) {
  return (
    <main className="marketing-shell" data-testid="product-overview">
      <a className="skip-link" href="#landing-main">Bỏ qua đến nội dung chính</a>
      <div className="marketing-hero-backdrop" aria-hidden="true">
        <ResponsiveHeroBackdrop priority />
      </div>

      <header className="marketing-header">
        <a className="marketing-brand" href="/welcome" aria-label="HANZI.OS · Trang giới thiệu">
          <span><Languages aria-hidden="true" size={27} /></span>
          <div><strong>HANZI.OS</strong><small>Holographic Mandarin System</small></div>
        </a>
        <nav aria-label="Điều hướng trang giới thiệu">
          <a href="#he-thong">Bên trong hệ thống</a>
          <a href="#cach-hoc">Cách vận hành</a>
          <a href="#du-lieu">Dữ liệu</a>
        </nav>
        <div className="marketing-header-actions">
          <a className="marketing-signin" href="/signin">Đăng nhập</a>
          <StartAction className="marketing-header-cta" onStart={onStart} startHref={startHref} />
        </div>
      </header>

      <section className="marketing-hero" id="landing-main">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">AWAKENING PROTOCOL · HSK0–HSK4 · LOCAL CORE</p>
          <h1>Đánh thức một <em>hệ thống Hán ngữ</em> dành riêng cho bạn.</h1>
          <p className="marketing-lead">
            HANZI.OS biến hành trình học Mandarin thành một giao diện hologram sống động:
            dẫn đường, ghi nhớ, luyện âm và mở rộng kiến thức trong cùng một hệ thống —
            nhưng mọi tác vụ vẫn rõ ràng, dễ dùng bằng tiếng Việt.
          </p>
          <div className="marketing-hero-actions">
            <StartAction className="marketing-primary-cta" onStart={onStart} startHref={startHref} />
            <a className="marketing-secondary-cta" href="#he-thong">Khám phá hệ thống</a>
          </div>
          <ul className="marketing-trust" aria-label="Năng lực chính">
            <li><span aria-hidden="true">◇</span> 217 bài HSK0–HSK4</li>
            <li><span aria-hidden="true">◇</span> Không cần tài khoản</li>
            <li><span aria-hidden="true">◇</span> Giản thể + Pinyin</li>
          </ul>
        </div>

        <aside className="awakening-console" aria-label="Bản đồ năm khu vực của HANZI.OS">
          <header>
            <span><i aria-hidden="true" /> AWAKENING CORE</span>
            <b>ONLINE</b>
          </header>
          <div className="awakening-orbit" aria-hidden="true">
            <i className="awakening-ring awakening-ring-outer" />
            <i className="awakening-ring awakening-ring-inner" />
            <div className="awakening-core">
              <small>MANDARIN</small>
              <strong>觉</strong>
              <span>HSK 0—4</span>
            </div>
            <span className="awakening-node node-learn"><b>01</b> HỌC</span>
            <span className="awakening-node node-review"><b>02</b> ÔN</span>
            <span className="awakening-node node-speak"><b>03</b> NÓI</span>
            <span className="awakening-node node-practice"><b>04</b> LUYỆN</span>
            <span className="awakening-node node-profile"><b>05</b> HỒ SƠ</span>
          </div>
          <dl className="awakening-status">
            <div><dt>Lộ trình</dt><dd>217 bài</dd></div>
            <div><dt>Kho từ</dt><dd>11.093 mục</dd></div>
            <div><dt>Trạng thái</dt><dd>Local-first</dd></div>
          </dl>
          <footer><span>◈</span> Hologram là lớp dẫn đường; bằng chứng học thật mới quyết định tiến độ.</footer>
        </aside>
      </section>

      <section className="marketing-section marketing-system" id="he-thong">
        <div className="marketing-section-heading">
          <p>SYSTEM MAP // 05 KHU VỰC</p>
          <h2>Bên trong HANZI.OS có gì?</h2>
          <span>Mỗi tên gọi thuộc “hệ thống thức tỉnh” đều gắn với một chức năng học cụ thể, không phải menu trang trí.</span>
        </div>
        <div className="marketing-feature-grid">
          {productAreas.map(({ code, area, systemName, description, details, icon: Icon }) => (
            <article key={area}>
              <header><span>{code}</span><Icon aria-hidden="true" size={21} /></header>
              <p className="marketing-area-label">KHU VỰC {area.toUpperCase()}</p>
              <h3>{systemName}</h3>
              <p>{description}</p>
              <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-how" id="cach-hoc">
        <div className="marketing-section-heading">
          <p>AWAKENING LOOP // 10–20 PHÚT</p>
          <h2>Một phiên học có điểm bắt đầu và điểm kết thúc rõ ràng.</h2>
          <span>Khảo nghiệm tìm điểm xuất phát; hệ thống sau đó nối bài mới, ôn đến hạn và một hoạt động ứng dụng thành cùng một nhịp.</span>
        </div>
        <ol className="marketing-steps">
          <li><span>01 · KHẢO</span><strong>Xác định điểm bắt đầu</strong><p>Khảo nghiệm ngắn gợi ý vùng nên luyện; đây không phải chứng nhận hay điểm thi HSK.</p></li>
          <li><span>02 · HỌC</span><strong>Hiểu rồi tự gọi lại</strong><p>Bài ngắn kết hợp giải thích, luyện có hướng dẫn và kiểm tra trí nhớ độc lập.</p></li>
          <li><span>03 · CỦNG CỐ</span><strong>Ôn đúng lúc, dùng ngay</strong><p>Quay lại lỗi và nội dung đến hạn, rồi chuyển kiến thức sang âm, chữ, đọc hoặc luyện đề.</p></li>
        </ol>
      </section>

      <section className="marketing-data" id="du-lieu">
        <div>
          <p>LOCAL-FIRST // PRIVATE CORE</p>
          <h2>Hành trình thuộc về bạn.</h2>
          <span>
            Bạn có thể học ẩn danh và giữ tiến độ ngay trên thiết bị. Tài khoản HANZI.OS chỉ là lựa chọn
            để quản lý hoặc phục hồi hành trình; lõi học không bị khóa sau màn đăng nhập.
          </span>
        </div>
        <ul>
          <li><b aria-hidden="true">01</b><span><strong>Không biến hoạt động thành “mastery”</strong><small>XP, chuỗi ngày, độ phủ và mức thành thạo được trình bày tách biệt.</small></span></li>
          <li><b aria-hidden="true">02</b><span><strong>Không giả danh tài nguyên chính thức</strong><small>Giọng tổng hợp, bài tự luyện và tài liệu tham khảo đều được gắn nhãn trung thực.</small></span></li>
          <li><b aria-hidden="true">03</b><span><strong>Có đường mang dữ liệu đi</strong><small>Hồ sơ hỗ trợ xuất, nhập và phục hồi tiến độ trên thiết bị.</small></span></li>
        </ul>
      </section>

      <section className="marketing-final-cta">
        <p>READY FOR INITIALIZATION?</p>
        <h2>Kích hoạt hồ sơ, làm Khảo Nghiệm Căn Cơ và để hệ thống mở đúng điểm bắt đầu cho bạn.</h2>
        <StartAction className="marketing-primary-cta" onStart={onStart} startHref={startHref} />
      </section>

      <footer className="marketing-footer">
        <div><strong>HANZI.OS</strong><span>Hệ thống thức tỉnh Hán ngữ · UI tiếng Việt · Mainland Mandarin</span></div>
        <nav aria-label="Thông tin pháp lý">
          <a href="/privacy">Quyền riêng tư</a>
          <a href="/terms">Điều khoản</a>
          <a href="/voice-data">Dữ liệu giọng nói</a>
        </nav>
      </footer>
    </main>
  );
}
