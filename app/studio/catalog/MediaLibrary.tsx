"use client";
import { useState } from "react";
import { LessonMediaPicker } from "../LessonMediaPicker";
import type { LessonMediaAsset } from "../../../src/content/lessonMedia";

export function MediaLibrary({ canManage }: { canManage: boolean }) {
  const [selected, setSelected] = useState<LessonMediaAsset | null>(null);
  return <div className="tv-media-library"><LessonMediaPicker kind="image" canManage={canManage} onSelect={setSelected} /><LessonMediaPicker kind="audio" canManage={canManage} onSelect={setSelected} />{selected && <article className="tv-catalog-card" role="status"><h3>{selected.metadata.title}</h3><p>Đã chọn học liệu. Khi soạn bài, dùng “Chọn học liệu” để gắn tệp này vào nội dung.</p><p>Nguồn: {selected.metadata.provenance} · {selected.metadata.license}</p>{selected.mimeType.startsWith("image/") ? <img src={selected.url} alt={selected.metadata.alt} style={{ maxWidth: "100%", maxHeight: 280 }} /> : <audio controls src={selected.url} preload="none" />}</article>}</div>;
}
