import './PracticeMilestone.css';

export const PRACTICE_MILESTONE = 1000;

/** A visible practice goal, never a mastery score or catalog coverage claim. */
export function PracticeMilestone({ count, label, compact = false }: { count: number | null; label: string; compact?: boolean }) {
  const value = count === null ? null : Math.max(0, Math.floor(count));
  return <div className={`practice-milestone${compact ? ' is-compact' : ''}`}>
    <div className="practice-milestone-caption"><span>Mốc luyện 1.000 câu</span><strong>{value === null ? '—' : `${value.toLocaleString('vi-VN')} / 1.000`}</strong></div>
    <div className="practice-milestone-track" role="progressbar" aria-label={`${label} · mốc luyện tập, không phải thành thạo`}
      aria-valuemin={0} aria-valuemax={PRACTICE_MILESTONE} aria-valuenow={value === null ? undefined : Math.min(value, PRACTICE_MILESTONE)}
      aria-valuetext={value === null ? 'Chưa tải dữ liệu' : `${value} câu khác nhau đã luyện; ${value >= PRACTICE_MILESTONE ? 'đã đạt mốc 1.000 câu' : 'mốc luyện 1.000 câu'}; không phải điểm thành thạo`}>
      <i style={{ width: `${value === null ? 0 : Math.min(value / PRACTICE_MILESTONE * 100, 100)}%` }} />
    </div>
    {value !== null && value >= PRACTICE_MILESTONE && <small>Đã đạt mốc luyện · tiếp tục củng cố</small>}
  </div>;
}
