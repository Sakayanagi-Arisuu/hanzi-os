import type { CSSProperties } from "react";
import { Link } from "react-router";
import type {
  ReviewForecastDay,
  ReviewMemoryDistribution,
} from "../learning/reviewPresentation";

type MemoryReviewLobbyProps = {
  activatedCount: number;
  dueCount: number;
  forecast: readonly ReviewForecastDay[];
  distribution: ReviewMemoryDistribution;
  onStart?: () => void;
  reviewedToday: number;
};

const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

export function MemoryReviewLobby({
  activatedCount,
  dueCount,
  forecast,
  distribution,
  onStart,
  reviewedToday,
}: MemoryReviewLobbyProps) {
  const maximum = Math.max(1, ...forecast.map((day) => day.count));
  const stable = percent(distribution.stable, distribution.total);
  const consolidating = percent(distribution.consolidating, distribution.total);
  const newCards = distribution.total > 0 ? Math.max(0, 100 - stable - consolidating) : 0;
  const donutStyle = {
    "--memory-stable": `${stable * 3.6}deg`,
    "--memory-consolidating": `${(stable + consolidating) * 3.6}deg`,
  } as CSSProperties;

  return (
    <div className="memory-experience memory-lobby">
      <section className="memory-lobby-hero" aria-labelledby="memory-lobby-title">
        <span>MEM-01 · KÝ ỨC TRẬN</span>
        <h1 id="memory-lobby-title">SẢNH KÝ ỨC</h1>
        <p>Khai mở trí nhớ. Tôi luyện ý chí.</p>
      </section>

      <section className="memory-lobby-dashboard" aria-label="Lịch ôn tập thực tế">
        <article className="memory-stat-card memory-due-card">
          <h2><span className="memory-heading-symbol" aria-hidden="true">日</span> Lịch ôn hôm nay</h2>
          <strong>{dueCount}</strong>
          <p>thẻ đến hạn</p>
          <span className="memory-card-watermark" aria-hidden="true">忆</span>
        </article>

        <article className="memory-stat-card memory-forecast-card">
          <h2><span className="memory-heading-symbol" aria-hidden="true">卦</span> Dự báo 7 ngày tới</h2>
          <div className="memory-forecast" aria-label="Số thẻ tới lịch theo ngày">
            {forecast.map((day) => (
              <div key={day.label} className={day.label === "Hôm nay" ? "today" : ""}>
                <span>{day.label}</span>
                <strong>{day.count}</strong>
                <i style={{
                  "--forecast-height": day.count === 0
                    ? "4%"
                    : `${Math.max(12, (day.count / maximum) * 100)}%`,
                } as CSSProperties} />
              </div>
            ))}
          </div>
        </article>

        <article className="memory-stat-card memory-distribution-card">
          <h2><span className="memory-heading-symbol" aria-hidden="true">环</span> Phân bố lịch ký ức</h2>
          <div className="memory-distribution-body">
            <div className={`memory-donut ${distribution.total === 0 ? "is-empty" : ""}`} style={donutStyle} aria-hidden="true">记</div>
            <dl>
              <div><dt><i className="stable" />Ổn định cao</dt><dd>{stable}%</dd></div>
              <div><dt><i className="consolidating" />Đang củng cố</dt><dd>{consolidating}%</dd></div>
              <div><dt><i className="new" />Mới kích hoạt</dt><dd>{newCards}%</dd></div>
            </dl>
          </div>
        </article>
      </section>

      <section className="memory-lobby-totals" aria-label="Tổng quan phiên ôn">
        <div><i className="memory-total-symbol" aria-hidden="true">刻</i><strong>{dueCount}</strong><span>Đến hạn<br />ôn ngay</span></div>
        <div><i className="memory-total-symbol" aria-hidden="true">简</i><strong>{activatedCount}</strong><span>Thẻ đã<br />kích hoạt</span></div>
        <div><i className="memory-total-symbol" aria-hidden="true">轮</i><strong>{reviewedToday}</strong><span>Ôn lại<br />hôm nay</span></div>
      </section>

      {dueCount > 0 && onStart ? (
        <button className="memory-primary-cta" type="button" onClick={onStart}>
          <span aria-hidden="true">✦</span> Bắt đầu ôn
        </button>
      ) : (
        <Link className="memory-primary-cta" to="/path" viewTransition>
          <span aria-hidden="true">✦</span> {activatedCount > 0 ? "Tiếp tục Thiên Lộ" : "Học để kích hoạt ký ức"}
        </Link>
      )}
      {dueCount === 0 && (
        <p className="memory-empty-note" role="status">
          {activatedCount > 0
            ? "Bạn đã ôn hết thẻ đến hạn. Lịch ôn tiếp theo sẽ xuất hiện tại đây."
            : "Chưa có thẻ tới lịch. Học hoặc lưu từ cần nhớ để bắt đầu Ký Ức Trận."}
        </p>
      )}
    </div>
  );
}
