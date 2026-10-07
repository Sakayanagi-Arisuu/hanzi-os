export function PathBannerSeal() {
  return <svg viewBox="0 0 72 72" aria-hidden="true">
    <circle cx="36" cy="36" r="29" />
    <path d="M19 47c11-4 19-13 23-27M29 51c9-7 15-17 17-29M40 52c7-8 11-17 12-27M20 47l9-1-5-7M30 51l9-3-7-6M41 52l8-5-8-4" />
  </svg>;
}

export function PathBannerInformation({ title, completed, total, finished }: {
  title: string; completed: number; total: number; finished: boolean;
}) {
  return <div className="path-banner-information" aria-live="polite">
    <div className="path-banner-pennant">
      <small>{finished ? "ĐÃ THÔNG QUAN" : "ĐANG TU LUYỆN"}</small>
      <span className="path-banner-rule" aria-hidden="true" />
      <strong>{title}</strong>
      <PathBannerSeal />
    </div>
    <div className="path-banner-medallion">
      <span className="path-banner-count"><strong>{completed}</strong><i>/</i><span>{total}</span></span>
      <small>Bài đã<br />thông qua</small>
    </div>
  </div>;
}
