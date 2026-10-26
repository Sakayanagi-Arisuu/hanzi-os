"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { BookOpenText, CircleHelp, FileText, House, LibraryBig, ListChecks, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WorkspaceSignOut } from "../../src/components/WorkspaceSignOut";

const destinations = [
  { href: "/studio", label: "Bàn làm việc", icon: House, key: "home" },
  { href: "/studio?mine=1#library-title", label: "Nội dung của tôi", icon: FileText, key: "mine" },
  { href: "/studio/catalog", label: "Kho học liệu", icon: LibraryBig, key: "catalog" },
  { href: "/studio/library", label: "Bài đọc & sách", icon: BookOpenText, key: "library" },
  { href: "/studio/exams", label: "Luyện đề", icon: ListChecks, key: "exams" },
  { href: "/studio/assessment", label: "Khảo nghiệm đầu vào", icon: ListChecks, key: "assessment" },
];

export function StudioShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const query = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = path?.includes("/assessment") ? "assessment" : path?.includes("/library") ? "library" : path?.includes("/exams") ? "exams" : path?.includes("/catalog") ? "catalog" : query.get("mine") || path?.includes("/items/") || query.get("create") ? "mine" : "home";
  return <div className="tv-studio-shell">
    <a className="tv-skip" href="#tv-workspace">Bỏ qua điều hướng</a>
    <header className="tv-mobile-bar"><a href="/studio">漢 · HANZI.OS</a><button type="button" aria-expanded={open} aria-controls="tv-studio-sidebar" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />} Menu biên tập</button></header>
    <aside id="tv-studio-sidebar" className={`tv-sidebar${open ? " is-open" : ""}`}>
      <a className="tv-brand" href="/studio"><span aria-hidden="true">漢</span><div>HANZI.OS<small>THIÊN VĂN · BIÊN TẬP VIỆN</small></div></a>
      <nav aria-label="Điều hướng Biên Tập Viện">{destinations.map(({ href, label, icon: Icon, key }) => <a key={key} href={href} aria-current={active === key ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={20} /><span>{label}</span></a>)}</nav>
      <a className="tv-sidebar-help" href="/studio/catalog#studio-help"><CircleHelp size={20} /> Hướng dẫn biên tập</a>
      <WorkspaceSignOut />
    </aside>
    <div className="tv-workspace" id="tv-workspace" tabIndex={-1}>{children}</div>
  </div>;
}
