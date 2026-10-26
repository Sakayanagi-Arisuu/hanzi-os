"use client";
import { useState, type ReactNode } from "react";

export function UserDirectory({ entries }: { entries: Array<{ id: string; label: string; roles: string; content: ReactNode }> }) {
  const [selected, setSelected] = useState(entries[0]?.id);
  const active = entries.some(entry=>entry.id===selected) ? selected : entries[0]?.id;
  return <div className="tv-user-directory"><nav aria-label="Chọn tài khoản">{entries.map(entry=><button key={entry.id} type="button" aria-pressed={active===entry.id} onClick={()=>setSelected(entry.id)}><span className="tv-user-avatar" aria-hidden="true">{entry.label.slice(0,1).toUpperCase()}</span><span><strong>{entry.label}</strong><small>{entry.roles}</small></span></button>)}</nav><div className="tv-user-detail">{entries.map(entry=><div key={entry.id} hidden={active!==entry.id}>{entry.content}</div>)}</div></div>;
}
