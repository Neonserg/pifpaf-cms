"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ICONS: Record<string, React.ReactNode> = {
  pages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  media: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="15" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5.5-5-8 7" />
    </svg>
  ),
  forms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M8 8h8M8 11.5h8M8 15h4.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 000-3l1-1.7-1.7-1.7-1.7 1a1.7 1.7 0 00-3 0l-1-1.7-1.7 1.7 1 1.7a1.7 1.7 0 000 3l-1 1.7 1.7 1.7 1.7-1a1.7 1.7 0 003 0l1 1.7 1.7-1.7z" />
    </svg>
  ),
};

const ITEMS = [
  { href: "/admin/pages", key: "pages", label: "Сторінки" },
  { href: "/admin/media", key: "media", label: "Медіатека" },
  { href: "/admin/forms", key: "forms", label: "Форми" },
  { href: "/admin/settings", key: "settings", label: "Налаштування" },
];

export default function RailNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`rail${collapsed ? " collapsed" : ""}`}>
      <div className="rail-head">
        <div className="rail-mark">pp</div>
        <div className="rail-title">
          <b>pifpaf</b>
          <span>{userEmail}</span>
        </div>
      </div>
      <ul className="rail-nav-list">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.key}>
              <Link href={item.href} className={`rail-btn${active ? " active" : ""}`}>
                {ICONS[item.key]}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="rail-foot">
        <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <span>Згорнути</span>
        </button>
      </div>
    </nav>
  );
}
