"use client";
import { useState, type ReactNode } from "react";
const tabs = [["overview","Tổng quan"],["orders","Đơn hàng"],["accounts","Khách hàng & ví"],["plans","Gói & giá"],["access","Quyền truy cập"],["support","Hỗ trợ & hoàn tiền"],["payments","Thanh toán"]];
export function PremiumWorkspace({ children, initialTab = "overview" }: { children: ReactNode; initialTab?: string }) {
  const [tab, setTab] = useState(tabs.some(([key]) => key === initialTab) ? initialTab : "overview");
  return <div className="tv-premium-workspace" data-tab={tab}><nav className="tv-stage-tabs" aria-label="Quản lý Premium">{tabs.map(([key,label]) => <button key={key} type="button" aria-pressed={tab===key} onClick={()=>{setTab(key);const url=new URL(window.location.href);url.searchParams.set("tab",key);window.history.replaceState(null,"",url);}}>{label}</button>)}</nav>{children}</div>;
}
