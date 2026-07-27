import { PenTool } from "lucide-react";

/**
 * Character practice stays fail-closed until the runtime catalog exposes
 * reviewed character metadata and its immutable stroke-data provenance.
 * Released vocabulary is not character-mastery evidence and must not be used
 * as a substitute inventory here.
 */
export function CharactersPage() {
  return (
    <div className="lesson-state-screen">
      <PenTool size={44} />
      <h1>Chưa có dữ liệu Hán tự đã phát hành</h1>
      <p>Nội dung luyện nét sẽ xuất hiện sau khi vượt cổng biên tập.</p>
    </div>
  );
}
