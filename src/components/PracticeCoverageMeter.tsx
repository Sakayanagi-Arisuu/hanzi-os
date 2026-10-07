import { formatPracticePercent } from "../learning/practicePercent";
import "./PracticeMilestone.css";

export function PracticeCoverageMeter({ value, label }: {
  value: { covered: number | null; total: number | null; percent: number | null };
  label: string;
}) {
  const description = value.covered === null || value.total === null
    ? "Chưa tải được kho câu luyện"
    : `${value.covered.toLocaleString("vi-VN")} / ${value.total.toLocaleString("vi-VN")} câu đã luyện`;
  return <div className="practice-milestone is-compact" data-testid="practice-coverage">
    <div className="practice-milestone-caption"><strong>{formatPracticePercent(value.percent)}</strong></div>
    <div className="practice-milestone-track" role="progressbar" aria-label={`${label} · tiến độ luyện`}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value.percent ?? undefined}
      aria-valuetext={`${description}; không phải mức thành thạo`}>
      <i style={{ width: `${value.percent ?? 0}%` }} />
    </div>
  </div>;
}
