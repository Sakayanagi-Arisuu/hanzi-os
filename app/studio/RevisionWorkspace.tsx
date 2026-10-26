"use client";
import { useState, type ReactNode } from "react";

export function RevisionWorkspace({ children, previewEnabled = true }: { children: ReactNode; previewEnabled?: boolean }) {
  const [stage, setStage] = useState("edit");
  return <div className="tv-revision-workspace" data-stage={stage}>
    <nav className="tv-stage-tabs" aria-label="Các bước biên tập">{[["edit", "1 · Nội dung"], ["preview", "2 · Xem trước"], ["review", "3 · Kiểm tra & duyệt"], ["history", "Phân công & lịch sử"]].map(([key,label]) => <button key={key} type="button" disabled={key==='preview'&&!previewEnabled} title={key==='preview'&&!previewEnabled?'Quản trị viên đang tắt xem trước trong Cấu hình':undefined} aria-pressed={stage === key} onClick={() => setStage(key)}>{label}</button>)}</nav>
    {!previewEnabled&&<small>Xem trước đang tắt trong Cấu hình quản trị. Bạn vẫn có thể soạn và gửi duyệt.</small>}
    {children}
  </div>;
}
