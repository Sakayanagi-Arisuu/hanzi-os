import { ArrowRight, BookOpenText, BrainCircuit, ChartNoAxesCombined, Check, Compass, Headphones, Languages, Mic, PenTool, ShieldCheck, Target } from "lucide-react";
import "./PublicLanding.css";
import { PublicFooter } from "./PublicFooter";
import { GuildLandingMotion } from "./GuildLandingMotion";
import "./GuildTypography.css";

type Props = { onStart?: () => void; startHref?: string };
function Start({ onStart, startHref }: Props) {
  const content = <>Bắt đầu hành trình <ArrowRight size={18} aria-hidden="true" /></>;
  return startHref ? <a className="guild-cta" href={startHref}>{content}</a> : <button className="guild-cta" type="button" onClick={onStart}>{content}</button>;
}
const exploreNotes: Record<string,string> = {
  "/": "Sau khi thiết lập mục tiêu, Thức Tỉnh Điện tập hợp bài đang học và các hoạt động để bạn chọn bước tiếp theo.",
  "/path": "Chọn chặng phù hợp, mở bài đã đủ điều kiện, học kiến thức rồi thực hành. Bài tiếp theo gắn với tiến độ thực tế của bạn.",
  "/review": "Các từ đã học hoặc lưu được đưa vào lịch ôn. Tự nhớ trước khi xem đáp án, rồi đánh giá mức nhớ để lên lịch gặp lại.",
  "/pronunciation": "Chọn bài, nghe mẫu và thử đọc. Micro là tùy chọn; giọng tổng hợp và phản hồi tự động được ghi nhãn theo nguồn.",
  "/characters": "Chọn chữ để xem cấu trúc, thứ tự nét và luyện trong ngữ cảnh. Những cách nhập hỗ trợ giúp bạn tiếp tục khi không thể viết tay.",
  "/assessment": "Chọn mức khảo sát và trả lời các câu theo kỹ năng. Xem gợi ý vùng nên luyện; bạn vẫn chủ động chọn điểm khởi hành.",
  "/reader": "Chọn tác phẩm hoặc bài đọc, mở chương, tra từ ngay khi đọc và lưu từ cần ôn. Tiến độ đọc giúp bạn quay lại đúng chỗ.",
  "/dictionary": "Tra theo chữ Hán, Pinyin hoặc nghĩa; xem mục từ, tra theo bài học và quản lý những từ đã lưu.",
  "/mistakes": "Xem phần cần củng cố, thử lại câu hỏi và đọc giải thích. Gợi ý hỗ trợ việc học nhưng không được tính như tự nhớ độc lập.",
  "/exams": "Chọn mức HSK và bài tự luyện, làm theo phiên rồi xem kết quả. Không dùng kết quả này thay cho chứng chỉ chính thức.",
  "/analytics": "Xem tín hiệu học tập của từng kỹ năng. Hệ thống phân biệt hoạt động, độ phủ và bằng chứng thành thạo; ít dữ liệu sẽ được thể hiện rõ.",
  "/profile": "Đổi mục tiêu và nhịp học, tùy chỉnh hiển thị và âm thanh, quản lý tài khoản, xuất bản sao lưu hoặc nhập lại tiến độ.",
};
const areas = [
  { name: "Học", icon: BookOpenText, detail: "Tiếp thu kiến thức theo lộ trình" },
  { name: "Ôn", icon: BrainCircuit, detail: "Ôn đúng lúc để nhớ lâu" },
  { name: "Nói", icon: Mic, detail: "Nghe và luyện nói từng câu" },
  { name: "Luyện", icon: PenTool, detail: "Rèn kỹ năng qua thực hành" },
  { name: "Hồ sơ", icon: ChartNoAxesCombined, detail: "Theo dõi tiến bộ của bạn" },
];
const features = [
  { name: "Thiên Lộ", subtitle: "Từng bài rõ ràng", text: "Từ Pinyin và câu chào đầu tiên đến hội thoại, đọc hiểu và ngữ pháp. Học kiến thức mới, luyện có hướng dẫn rồi tự kiểm tra điều đã hiểu.", href: "/path", kind: "path", icon: Compass },
  { name: "Ký Ức Trận", subtitle: "Ôn từ đúng lúc", text: "Gặp lại những từ đến hạn theo lịch ôn của bạn. Nhớ chưa chắc? Quay lại luyện thêm, từng chút một, không phải bắt đầu lại từ đầu.", href: "/review", kind: "memory", icon: BrainCircuit },
  { name: "Vạn Âm Điện", subtitle: "Lắng nghe, rồi cất lời", text: "Nghe từ trọng tâm và câu mẫu trước khi tự luyện nói. Bạn chủ động chọn dùng micro và luôn có cách tiếp tục mà không gửi bản thu.", href: "/pronunciation", kind: "voice", icon: Mic },
  { name: "Thần Văn Lô", subtitle: "Khám phá từng nét chữ", text: "Nhìn cấu trúc, xem thứ tự nét, luyện theo mẫu và đưa chữ vào ngữ cảnh. Từ một nét nhỏ, hiểu thêm một chữ Hán.", href: "/characters", kind: "glyph", icon: PenTool },
];
const moreSpaces = [
  { name: "Thức Tỉnh Điện", label: "Học hôm nay", text: "Điểm hẹn mỗi ngày: xem bài đang học và chọn hoạt động tiếp theo trong hành trình của bạn.", href: "/", icon: Compass },
  { name: "Khảo Nghiệm Căn Cơ", label: "Tìm điểm khởi hành", text: "Khảo sát nền tảng để gợi ý nơi bắt đầu. Kết quả là định hướng luyện tập, không phải chứng chỉ HSK.", href: "/assessment", icon: Target },
  { name: "Vạn Quyển Các", label: "Đọc để hiểu sâu", text: "Khám phá thư viện, đọc từng đoạn, tra từ trong ngữ cảnh và tiếp tục từ nơi đã dừng.", href: "/reader", icon: BookOpenText },
  { name: "Tàng Tự Khố", label: "Tra cứu và lưu từ", text: "Tìm chữ giản thể, Pinyin và nghĩa tiếng Việt; khám phá từ theo bài và lưu những mục muốn học lại.", href: "/dictionary", icon: Languages },
  { name: "Nghịch Cảnh Lục", label: "Hiểu lỗi, luyện lại", text: "Quay lại những câu còn vướng, xem giải thích và thử sức lần nữa để củng cố đúng phần còn yếu.", href: "/mistakes", icon: BrainCircuit },
  { name: "Phòng Luyện Đề", label: "Tự luyện theo phiên", text: "Chọn bài luyện HSK, thực hành theo từng phần và xem lại kết quả. Đây là đề tự luyện trong hệ thống.", href: "/exams", icon: Target },
  { name: "Thiên Cơ Kính", label: "Nhìn rõ tiến bộ", text: "Quan sát bằng chứng ở bảy kỹ năng, nhận ra phần đã luyện và phần còn cần thêm cơ hội thực hành.", href: "/analytics", icon: ChartNoAxesCombined },
  { name: "Hồ sơ Hành Giả", label: "Hành trình của riêng bạn", text: "Điều chỉnh mục tiêu, nhịp học, âm thanh và giao diện; quản lý tài khoản, sao lưu và phục hồi tiến độ.", href: "/profile", icon: ShieldCheck },
];
function Preview({ kind }: { kind: string }) {
  if (kind === "path") return <div className="guild-preview"><small>THIÊN LỘ · BÀI HỌC</small><h4>Xin chào đầu tiên</h4>{["Từ vựng", "Nghe câu mẫu", "Luyện tập"].map((s, i) => <div className="guild-preview-row" key={s}><span>{i + 1}</span>{s}<Check size={14} /></div>)}</div>;
  return <div className="guild-preview guild-preview-word"><small>{kind === "voice" ? "NGHE MẪU · TỰ LUYỆN" : kind === "memory" ? "GỌI LẠI TỪ TRÍ NHỚ" : "HÁN TỰ TRONG NGỮ CẢNH"}</small>{kind === "voice" && <div className="guild-mic"><Mic size={32} /></div>}<strong className={kind === "glyph" ? "guild-hanzi-grid" : ""} lang="zh-Hans">{kind === "voice" ? "你好" : kind === "memory" ? "再" : "好"}</strong><span>{kind === "voice" ? "nǐ hǎo" : kind === "memory" ? "zài" : "hǎo"}</span><p>{kind === "voice" ? "Xin chào" : kind === "memory" ? "lại, một lần nữa" : "tốt, đẹp"}</p></div>;
}
export function GuildLanding(props: Props) {
  return <main className="guild-landing" id="top" data-testid="product-overview">
    <GuildLandingMotion />
    <a className="skip-link" href="#landing-main">Bỏ qua đến nội dung chính</a>
    <header className="guild-nav"><a className="guild-brand" href="/welcome"><Languages aria-hidden="true" /> HANZI.OS</a><nav aria-label="Điều hướng trang giới thiệu"><a href="#hanh-trinh">Hành trình</a><a href="#he-thong">Khám phá</a><a href="#cach-hoc">Cách học</a></nav><div><a href="/signin">Đăng nhập</a><Start {...props} /></div></header>
    <section className="guild-hero" id="landing-main"><img className="guild-hero-art" src="/welcome-jade-gate-v2.png" alt="" fetchPriority="high" width="1942" height="809" /><div className="guild-hero-copy"><p className="guild-eyebrow">HANZI.OS · HÀNH TRÌNH HÁN NGỮ</p><h1>Mỗi chữ Hán,<br />một bước <em>trưởng thành.</em></h1><p>Học tiếng Trung theo lộ trình, ôn đúng lúc,<br />luyện từng kỹ năng — theo nhịp của chính bạn.</p><div className="guild-actions"><Start {...props} /><a className="guild-outline" href="#he-thong">Khám phá cách học <Compass size={18} /></a></div><span className="guild-hero-note">Giản thể & Pinyin · Tiếng Việt · Không bắt buộc tài khoản</span></div></section>
    <section className="guild-journey guild-section" id="hanh-trinh"><p className="guild-eyebrow">NĂM VÙNG CHỨC NĂNG · MỘT HÀNH TRÌNH</p><h2>Hành trình của bạn tại HANZI.OS</h2><div>{areas.map(({ name, icon: Icon, detail }) => <article key={name}><span className="guild-icon"><Icon aria-hidden="true" /></span><h3>{name}</h3><p>{detail}</p></article>)}</div></section>
    <section className="guild-section" id="he-thong"><div className="guild-section-heading"><p className="guild-eyebrow">KHÁM PHÁ HỆ THỐNG</p><h2>Một hệ thống, nhiều cách tiến bộ</h2><p>Mỗi nơi một cách luyện. Cùng đưa điều bạn học vào những tình huống có ý nghĩa.</p></div><div className="guild-features">{features.map(({ name, subtitle, text, href, kind, icon: Icon }) => <article className={`guild-feature guild-feature-${kind}`} key={kind}><div className="guild-feature-copy"><Icon aria-hidden="true" size={24} /><h3>{name}</h3><h4>{subtitle}</h4><p>{text}</p><details className="guild-explore"><summary>Khám phá {name} <ArrowRight size={16} aria-hidden="true" /></summary><div><strong>Bắt đầu như thế nào?</strong><p>{exploreNotes[href]}</p><Start {...props} /></div></details></div><Preview kind={kind} /></article>)}</div></section>
    <section className="guild-section guild-directory" aria-labelledby="guild-directory-title"><div className="guild-section-heading"><p className="guild-eyebrow">KHÁM PHÁ TOÀN BỘ HANZI.OS</p><h2 id="guild-directory-title">Mỗi nhu cầu, một nơi để tiếp bước</h2><p>Bên cạnh bốn khu luyện nổi bật, hành trình còn có thư viện, từ điển, luyện đề, luyện lại lỗi và những công cụ giúp bạn hiểu mình hơn.</p></div><div className="guild-directory-grid">{moreSpaces.map(({name,label,text,href,icon:Icon})=><article key={href}><span className="guild-icon"><Icon aria-hidden="true" /></span><div><p className="guild-eyebrow">{label}</p><h3>{name}</h3><p>{text}</p><details className="guild-explore"><summary>Khám phá <span className="sr-only">{name}</span><ArrowRight size={16} aria-hidden="true" /></summary><div><strong>Bạn có thể làm gì?</strong><p>{exploreNotes[href]}</p><Start {...props} /></div></details></div></article>)}</div></section>
    <section className="guild-skills guild-section"><p className="guild-eyebrow">HỌC CÓ CĂN CỨ</p><h2>Bảy kỹ năng, từng bước tiến rõ ràng</h2><p>Theo dõi bằng chứng học tập theo từng kỹ năng. Điểm kinh nghiệm không thay cho mức thành thạo.</p><div>{[{name:"Âm / Pinyin",icon:Languages},{name:"Nghe",icon:Headphones},{name:"Nói",icon:Mic},{name:"Đọc",icon:BookOpenText},{name:"Hán tự",icon:PenTool},{name:"Từ vựng",icon:BrainCircuit},{name:"Ngữ pháp",icon:Target}].map(({name,icon:Icon})=><article key={name}><span className="guild-icon"><Icon aria-hidden="true" /></span><h3>{name}</h3></article>)}</div></section>
    <section className="guild-section" id="cach-hoc"><div className="guild-section-heading"><p className="guild-eyebrow">MỖI NGÀY, THÊM MỘT CHÚT</p><h2>Một buổi học của bạn</h2><p>Không cần vội. Hiểu điều mới, thử dùng và quay lại đúng lúc.</p></div><div className="guild-session">{[{title:"Học mới",text:"Khám phá từ vựng, ngữ pháp và câu nói trong bài học được nối theo lộ trình.",icon:BookOpenText},{title:"Luyện",text:"Nghe, chọn đáp án, đọc và luyện chữ. Nhận giải thích để hiểu vì sao, không chỉ biết đúng hay sai.",icon:PenTool},{title:"Ôn",text:"Gặp lại nội dung đến hạn và những lỗi cần củng cố trong hành trình của riêng bạn.",icon:BrainCircuit}].map(({title,text,icon:Icon},i)=><article key={title}><span className="guild-step-number">{i+1}</span><h3>{title}</h3><p>{text}</p><Icon aria-hidden="true" size={48} /></article>)}</div></section>
    <section className="guild-section guild-faq" id="du-lieu"><div className="guild-section-heading"><p className="guild-eyebrow">TRƯỚC KHI KHỞI HÀNH</p><h2>Câu hỏi thường gặp</h2></div><div>{[
      ["Tôi có thể bắt đầu từ con số 0 không?","Có. Bắt đầu với Pinyin, thanh điệu và câu đầu tiên. Nếu đã học trước, Khảo Nghiệm Căn Cơ giúp gợi ý điểm bắt đầu phù hợp, không thay cho chứng nhận HSK."],
      ["Tôi có bắt buộc tạo tài khoản không?","Không. Bạn có thể học và giữ tiến độ trên thiết bị. Tài khoản là lựa chọn để đồng bộ hành trình; dữ liệu trên thiết bị vẫn cần được sao lưu cẩn thận."],
      ["Micro được sử dụng như thế nào?","Chỉ khi bạn chọn luyện nói và đồng ý. Chấm âm học có thể gửi bản thu đến Microsoft Azure; bạn được thông báo trước và có thể tiếp tục tự luyện không chấm."],
      ["Làm sao theo dõi tiến bộ của mình?","Hồ sơ ghi nhận bài học, hoạt động và bằng chứng từng kỹ năng. Khi chưa đủ dữ liệu, hệ thống không dùng XP hoặc số bài để kết luận bạn đã thành thạo."],
    ].map(([q,a])=><details key={q}><summary>{q}<ArrowRight size={16} aria-hidden="true" /></summary><p>{a}</p></details>)}</div><p className="guild-privacy-note"><ShieldCheck size={18} /> Hành trình thuộc về bạn. <a href="/privacy">Tìm hiểu quyền riêng tư</a></p></section>
    <section className="guild-closing"><div><p className="guild-eyebrow">HÀNH TRÌNH ĐANG ĐỢI BẠN</p><h2>Một cánh cửa mới luôn rộng mở.</h2><p>Bắt đầu từ hôm nay, khám phá thêm một phần thế giới<br />qua từng câu chuyện của chữ Hán.</p><Start {...props} /></div></section>
    <PublicFooter />
  </main>;
}
