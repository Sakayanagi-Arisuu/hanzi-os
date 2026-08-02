import { LockKeyhole, PenTool, ShieldCheck } from "lucide-react";

/**
 * Character practice stays fail-closed until the runtime catalog exposes
 * reviewed character metadata and its immutable stroke-data provenance.
 * Released vocabulary is not character-mastery evidence and must not be used
 * as a substitute inventory here.
 */
export function CharactersPage() {
  return (
    <div className="lesson-state-screen character-sealed-zone">
      <div className="sys-sealed-sigil" aria-hidden="true">
        <PenTool size={38} />
        <span /><i />
      </div>
      <span className="system-kicker"><LockKeyhole size={15} /> PHÂN KHU ĐANG PHONG ẤN</span>
      <h1>Thần Văn Lô chưa khai mở</h1>
      <p>Chưa có dữ liệu Hán tự đã phát hành. Nội dung luyện nét độc lập sẽ xuất hiện sau khi vượt cổng biên tập cho metadata và nguồn nét.</p>
      <small className="sys-truth-seal"><ShieldCheck size={15} /> Từ vựng đã phát hành không được dùng thay cho bằng chứng luyện chữ.</small>
    </div>
  );
}
