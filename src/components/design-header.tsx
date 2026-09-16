"use client";
import Link from "next/link";
import { useState } from "react";
import { DesignIcon } from "./design-icons";
const links = [
  { href: "/knowledge", label: "מפת הקשרים" },
  { href: "/seder-hadorot?mode=alpha", label: "חכמים ואישים" },
  { href: "/seder-hadorot", label: "סדר הדורות" },
  { href: "/map", label: "מפת תולדות" },
  { href: "/periods", label: "תקופות" },
];
export function DesignHeader() {
  const [open, setOpen] = useState(false);
  return <header className="td-header">
    <div className="td-header-inner">
      <Link className="td-logo" href="/" onClick={() => setOpen(false)} aria-label="תולדות — דף הבית">תולדות<span>אנשים. מקומות. דורות.</span></Link>
      <nav className="td-desktop-nav" aria-label="ניווט ראשי">{links.map(link => <Link prefetch={false} key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="td-header-actions">
        <Link href="/search" className="td-search-link" aria-label="חיפוש"><DesignIcon kind="search"/><span>חיפוש</span></Link>
        <button type="button" className="td-menu-toggle" aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><DesignIcon kind="menu"/></button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" className="td-mobile-nav" aria-label="ניווט בנייד" onKeyDown={e => { if(e.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".td-menu-toggle")?.focus(); } }}>
      {links.map(link => <Link prefetch={false} key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<DesignIcon kind="arrow"/></Link>)}
    </nav>}
  </header>;
}
