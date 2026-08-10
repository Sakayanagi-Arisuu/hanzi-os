import { REFORGE_PRODUCT_CONTRACT } from "../product/reforgeProductContract";
import "./ReforgeProductIntro.css";

const contract = REFORGE_PRODUCT_CONTRACT;

export function ReforgeProductIntro() {
  return (
    <main className="reforge-page">
      <header className="reforge-hero">
        <div className="reforge-brand" aria-label="HANZI.OS Reforge">
          <span aria-hidden="true">汉</span>
          <strong>HANZI.OS</strong>
          <small>REFORGE</small>
        </div>
        <p className="reforge-eyebrow">HỢP ĐỒNG SẢN PHẨM · MAINLAND MANDARIN</p>
        <h1>{contract.northStar}</h1>
        <p className="reforge-lead">
          {contract.audience} {contract.languageScope}
        </p>
        <p className="reforge-local-first">{contract.platformScope}</p>
        <p className="reforge-delivery-status">
          <strong>Trạng thái:</strong> {contract.deliveryStatus}
        </p>
      </header>

      <section className="reforge-section" aria-labelledby="reforge-areas-title">
        <div className="reforge-section-heading">
          <p>KIẾN TRÚC THÔNG TIN</p>
          <h2 id="reforge-areas-title">Năm khu vực, không thêm menu cạnh tranh</h2>
        </div>
        <ol className="reforge-area-grid">
          {contract.areas.map((area, index) => (
            <li data-reforge-area={area.id} key={area.id}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{area.label}</h3>
              <p>{area.purpose}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="reforge-section reforge-flow" aria-labelledby="reforge-flow-title">
        <div className="reforge-section-heading">
          <p>VÒNG HỌC 10–20 PHÚT</p>
          <h2 id="reforge-flow-title">Một đường đi rõ từ lúc mở đến lúc kết phiên</h2>
        </div>
        <ol>
          {contract.dailyFlow.map((step, index) => (
            <li key={step.label}>
              <span aria-hidden="true">{index + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="reforge-closeout">
        <aside aria-labelledby="reforge-boundary-title">
          <h2 id="reforge-boundary-title">Ranh giới nguyên bản</h2>
          <p>{contract.originality}</p>
        </aside>
        <a className="reforge-primary-action" href="/">
          Vào HANZI.OS
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </main>
  );
}
