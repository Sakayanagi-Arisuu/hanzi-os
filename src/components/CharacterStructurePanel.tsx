import { Combine, Layers3, LoaderCircle, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { loadHanziStrokeData, type HanziStrokeData } from "../characters/hanziStrokeData";

type StructureLayer = "radical" | "body" | "whole";

export function CharacterStructurePanel({
  hanzi,
  displayHanzi,
  contextWord,
  pinyin,
  meaning,
  onReady,
  onComplete,
}: {
  hanzi: string;
  displayHanzi: string;
  contextWord: string;
  pinyin: string;
  meaning: string;
  onReady?: (data: HanziStrokeData) => void;
  onComplete?: () => void;
}) {
  const [data, setData] = useState<HanziStrokeData | null>(null);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [layer, setLayer] = useState<StructureLayer>("radical");
  const [reassembled, setReassembled] = useState(false);
  const [panel, setPanel] = useState("layers");
  const [strokePage, setStrokePage] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    setLayer("radical");
    setReassembled(false);
    setStrokePage(0);
    loadHanziStrokeData(hanzi)
      .then((value) => {
        if (!active) return;
        setData(value);
        onReady?.(value);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Không thể dựng cấu trúc chữ."); });
    return () => { active = false; };
  }, [hanzi, onReady, retryToken]);

  if (error) return (
    <div className="character-mode-state" role="status">
      <Layers3 />
      <strong>Chưa giải được hình thể chữ</strong>
      <p>{error}</p>
      <button type="button" onClick={() => setRetryToken((value) => value + 1)}>Thử tải lại</button>
    </div>
  );
  if (!data) return <div className="character-mode-state" role="status"><LoaderCircle className="is-spinning" /><strong>Đang chiếu X-quang chữ {displayHanzi}</strong></div>;

  const radicalStrokeIds = new Set(data.radStrokes ?? []);
  const chooseLayer = (nextLayer: StructureLayer) => {
    setLayer(nextLayer);
    if (nextLayer === "whole") {
      setReassembled(true);
      onComplete?.();
    }
  };

  return (
    <section className={`character-structure guild-structure${reassembled ? " is-reassembled" : ""}`} data-panel={panel} aria-label={`Nhìn xuyên chữ ${displayHanzi}`}>
      <nav className="guild-structure-tabs" aria-label="Xem cấu trúc"><button type="button" aria-pressed={panel === "layers"} onClick={() => setPanel("layers")}>Phân lớp</button><button type="button" aria-pressed={panel === "glyph"} onClick={() => setPanel("glyph")}>Hình chữ</button><button type="button" aria-pressed={panel === "strokes"} onClick={() => setPanel("strokes")}>Thứ tự nét</button></nav>
      <div className="structure-hologram" data-layer={layer}>
        <span className="structure-orbit" aria-hidden="true" />
        <svg viewBox="0 0 1024 900" role="img" aria-label={`Bản phân lớp ${data.strokes.length} nét của chữ ${displayHanzi}`}>
          <path className="stroke-grid" d="M512 0V900M0 450H1024M0 0L1024 900M1024 0L0 900" />
          <g transform="translate(0 900) scale(1 -1)">
            {data.strokes.map((stroke, index) => (
              <path
                key={index}
                d={stroke}
                className={radicalStrokeIds.has(index) ? "is-radical" : "is-body"}
              />
            ))}
          </g>
        </svg>
        <span className="structure-ghost" aria-hidden="true">{displayHanzi}</span>
      </div>

      <div className="structure-dossier">
        <span><Layers3 size={15} /> KHAI CẤU · HÁN TỰ X-QUANG</span>
        <h2 id="structure-title">Nhìn xuyên chữ {displayHanzi}</h2>
        <p>Chọn từng nhóm nét để quan sát, rồi tái hợp toàn chữ.</p>
        <div className="structure-layer-controls" role="group" aria-label="Các lớp cấu tạo chữ">
          <button type="button" aria-pressed={layer === "radical"} onClick={() => chooseLayer("radical")}><Layers3 /> Nét thuộc bộ <small>{radicalStrokeIds.size || "—"}</small></button>
          <button type="button" aria-pressed={layer === "body"} onClick={() => chooseLayer("body")}><Combine /> Phần còn lại <small>{data.strokes.length - radicalStrokeIds.size}</small></button>
          <button type="button" aria-pressed={layer === "whole"} onClick={() => chooseLayer("whole")}><RefreshCcw /> Tái hợp chữ</button>
        </div>
        <dl>
          <div><dt>Tổng nét</dt><dd>{data.strokes.length}</dd></div>
          <div><dt>Trong từ</dt><dd>{contextWord}</dd></div>
          <div><dt>Cách đọc</dt><dd>{pinyin}</dd></div>
          <div><dt>Nghĩa</dt><dd>{meaning}</dd></div>
        </dl>
        <p className="structure-proof"><ShieldCheck size={16} /> Vàng: nét thuộc bộ. Xanh: phần còn lại.</p>
      </div>
      <aside className="guild-stroke-index guild-panel" aria-label="Thứ tự nét">
        <h3>Thứ tự nét</h3>
        <ol>
          {data.strokes.slice(strokePage * 6, strokePage * 6 + 6).map((_, offset) => { const current = strokePage * 6 + offset; return <li key={current}>
            <svg viewBox="0 0 1024 1024" role="img" aria-label={`Nét ${current + 1}`}>
              <g transform="translate(0 900) scale(1 -1)">
                {data.strokes.slice(0, current + 1).map((stroke, index) => <path key={index} d={stroke} fill={index === current ? "#e0bd78" : "#78b29e"} />)}
              </g>
            </svg>
            <span>{current + 1}</span>
          </li>; })}
        </ol>
        {data.strokes.length > 6 && <nav className="guild-picker-pagination" aria-label="Trang thứ tự nét"><button type="button" disabled={strokePage === 0} onClick={() => setStrokePage(strokePage - 1)} aria-label="Các nét trước">‹</button><span>{strokePage + 1}/{Math.ceil(data.strokes.length / 6)}</span><button type="button" disabled={(strokePage + 1) * 6 >= data.strokes.length} onClick={() => setStrokePage(strokePage + 1)} aria-label="Các nét sau">›</button></nav>}
        <p>Trong từ</p><strong lang="zh-Hans">{contextWord}</strong>
        <p>{pinyin} · {meaning}</p>
      </aside>
    </section>
  );
}
