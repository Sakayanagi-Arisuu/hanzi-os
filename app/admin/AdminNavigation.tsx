"use client";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
export function AdminNavigation({children}:{children:ReactNode}) {
  const [open,setOpen]=useState(false);
  return <div className="tv-admin-navigation" data-open={open}><button type="button" className="tv-admin-menu" aria-expanded={open} aria-controls="tv-admin-nav-body" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>} Menu quản trị</button><div id="tv-admin-nav-body">{children}</div></div>;
}
