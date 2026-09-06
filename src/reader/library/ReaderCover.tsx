import type { ReaderSeries } from "./readerContentModel";

export function ReaderCover({ series, compact = false, catalog = false }: {
  series: ReaderSeries;
  compact?: boolean;
  catalog?: boolean;
}) {
  return (
    <figure className={`reader-cover ${compact ? "reader-cover--compact" : ""} ${catalog ? "reader-cover--catalog" : ""}`}>
      {series.coverAsset.kind === "image" && series.coverAsset.src ? (
        <img
          src={series.coverAsset.src}
          alt={series.coverAsset.altVi}
          width={720}
          height={1080}
          decoding="async"
        />
      ) : (
        <div
          className={`reader-cover-art ${series.coverAsset.kind === "art-directed" ? "reader-cover-art--generated" : ""}`}
          data-cover-tone={series.coverAsset.tone}
          role="img"
          aria-label={series.coverAsset.altVi}
        >
          {series.coverAsset.kind === "art-directed" && series.coverAsset.src && (
            <img
              className="reader-cover-art__image"
              src={series.coverAsset.src}
              alt=""
              aria-hidden="true"
              width={720}
              height={1080}
              loading={catalog ? "lazy" : "eager"}
              decoding="async"
            />
          )}
          <span className="reader-cover-art__eyebrow">HANZI.OS · {series.source.sourceType === "licensed-third-party" ? "LICENSED" : series.source.sourceType === "legacy-hanzi-os" ? "LEGACY" : "ORIGINAL"}</span>
          <span className="reader-cover-art__zh" lang="zh-Hans">{series.titleZh}</span>
          <strong>{series.titleVi}</strong>
          <span className="reader-cover-art__seal" aria-hidden="true">阅</span>
        </div>
      )}
      <span className="reader-cover-spine" aria-hidden="true" />
    </figure>
  );
}
