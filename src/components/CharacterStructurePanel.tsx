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

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    setLayer("radical");
    setReassembled(false);
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
    <section className={`character-structure${reassembled ? " is-reassembled" : ""}`} aria-labelledby="structure-title">
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
        <p>Chạm từng lớp để quan sát nhóm nét đã có chỉ mục trong nguồn, rồi tái hợp toàn chữ. Đây là phân lớp hình thể, không phải diễn giải ngữ nguyên.</p>
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
        <p className="structure-proof"><ShieldCheck size={16} /> Hình học nét tự host từ hanzi-writer-data@2.0.1. Màu vàng chỉ phản ánh chỉ mục radical có trong nguồn đã ghim.</p>
      </div>
    </section>
  );
}
